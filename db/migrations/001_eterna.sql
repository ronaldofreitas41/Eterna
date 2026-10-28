-- Eterna: esquema inicial (PostgreSQL / Neon).
--
-- As permissões ficam na aplicação: toda consulta do painel passa por requireOwnedWedding (lib/panel.ts),
-- e as ações de convidados validam convite, campanha, grupo e consentimento (lib/guest-actions.ts).
-- O banco garante integridade (chaves, limites e formatos) e apaga tudo em cascata ao excluir um casamento.

-- ---------------------------------------------------------------------------
-- Contas
-- ---------------------------------------------------------------------------

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and char_length(email) between 3 and 254),
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table sessions (
  -- Guardamos só o hash SHA-256 do token; o token em si fica apenas no cookie do navegador.
  token_hash text primary key,
  user_id uuid not null references users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_user_id_idx on sessions (user_id);
create index sessions_expires_at_idx on sessions (expires_at);

create table password_resets (
  token_hash text primary key,
  user_id uuid not null references users (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);
create index password_resets_user_id_idx on password_resets (user_id);

-- ---------------------------------------------------------------------------
-- Casamentos
-- ---------------------------------------------------------------------------

create table weddings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  -- Reservado para domínios próprios (ex.: helenaerafael.com.br), resolvidos no proxy.
  custom_domain text unique,
  is_demo boolean not null default false,
  plan text not null default 'essencial' check (plan in ('essencial', 'premium', 'destination')),
  partner_one text not null check (char_length(partner_one) between 1 and 80),
  partner_two text not null check (char_length(partner_two) between 1 and 80),
  wedding_date date,
  city text not null default '' check (char_length(city) <= 120),
  venue text not null default '' check (char_length(venue) <= 160),
  published boolean not null default false,
  published_version_id uuid,
  phase text not null default 'auto' check (phase in ('auto', 'antes', 'durante', 'depois')),
  live_notice text not null default '' check (char_length(live_notice) <= 500),
  mission text not null default '' check (char_length(mission) <= 300),
  capsule_open_date date,
  accepting_contributions boolean not null default true,
  open_rsvp boolean not null default true,
  logistics_public boolean not null default false,
  cover_file_id uuid,
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index weddings_owner_id_idx on weddings (owner_id);

-- Arquivos enviados (fotos, capa, referências). Guardados no próprio banco nesta versão;
-- servidos por /api/arquivos/[id], que verifica quem pode ver cada um.
create table files (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  kind text not null check (kind in ('photo', 'memory', 'cover', 'reference')),
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  size integer not null check (size between 1 and 4194304),
  data bytea not null,
  created_at timestamptz not null default now()
);
create index files_wedding_id_idx on files (wedding_id);

alter table weddings add constraint weddings_cover_file_fk foreign key (cover_file_id) references files (id) on delete set null;
create index weddings_cover_file_id_idx on weddings (cover_file_id);

-- Rascunho do design (tema, seções e textos). Validado na aplicação (lib/design.ts).
create table wedding_drafts (
  wedding_id uuid primary key references weddings (id) on delete cascade,
  style text not null default '' check (char_length(style) <= 400),
  design jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table site_versions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  label text not null default '' check (char_length(label) <= 120),
  source text not null default 'manual' check (source in ('manual', 'estudio', 'publicacao', 'restauracao')),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index site_versions_wedding_id_idx on site_versions (wedding_id, created_at desc);

alter table weddings add constraint weddings_published_version_fk
  foreign key (published_version_id) references site_versions (id) on delete set null;
create index weddings_published_version_id_idx on weddings (published_version_id);

create table wedding_logistics (
  wedding_id uuid primary key references weddings (id) on delete cascade,
  address text not null default '' check (char_length(address) <= 300),
  accommodation text not null default '' check (char_length(accommodation) <= 4000),
  transport text not null default '' check (char_length(transport) <= 4000)
);

create table schedule_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  day date,
  starts_at time not null,
  title text not null check (char_length(title) between 1 and 120),
  location text not null default '' check (char_length(location) <= 160),
  description text not null default '' check (char_length(description) <= 1000),
  position integer not null default 0
);
create index schedule_items_wedding_id_idx on schedule_items (wedding_id);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  done boolean not null default false,
  due_date date,
  created_at timestamptz not null default now()
);
create index tasks_wedding_id_idx on tasks (wedding_id);

-- ---------------------------------------------------------------------------
-- Convidados
-- ---------------------------------------------------------------------------

create table guest_groups (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  max_party_size integer not null default 1 check (max_party_size between 1 and 20),
  sees_logistics boolean not null default false,
  message text not null default '' check (char_length(message) <= 2000),
  position integer not null default 0
);
create index guest_groups_wedding_id_idx on guest_groups (wedding_id);

create table guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  group_id uuid references guest_groups (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  contact text not null default '' check (char_length(contact) <= 160),
  invite_token uuid not null unique default gen_random_uuid(),
  attending boolean,
  party_size integer not null default 0 check (party_size between 0 and 20),
  companions text not null default '' check (char_length(companions) <= 500),
  rsvp_message text not null default '' check (char_length(rsvp_message) <= 1000),
  responded_at timestamptz,
  created_at timestamptz not null default now()
);
create index guests_wedding_id_idx on guests (wedding_id);
create index guests_group_id_idx on guests (group_id);

create table rsvps (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  contact text not null default '' check (char_length(contact) <= 160),
  attending boolean not null,
  party_size integer not null default 1 check (party_size between 0 and 20),
  message text not null default '' check (char_length(message) <= 1000),
  created_at timestamptz not null default now()
);
create index rsvps_wedding_id_idx on rsvps (wedding_id);

-- ---------------------------------------------------------------------------
-- Construir Juntos
-- ---------------------------------------------------------------------------

create table story_chapters (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  intro text not null default '' check (char_length(intro) <= 1000),
  position integer not null default 0
);
create index story_chapters_wedding_id_idx on story_chapters (wedding_id);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  prompt text not null default '' check (char_length(prompt) <= 600),
  kind text not null default 'memory' check (kind in ('memory', 'photo', 'advice', 'capsule', 'story')),
  audience text not null default 'invited' check (audience in ('everyone', 'invited', 'groups')),
  group_ids uuid[] not null default '{}',
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index campaigns_wedding_id_idx on campaigns (wedding_id);

create table contributions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  campaign_id uuid references campaigns (id) on delete set null,
  guest_id uuid references guests (id) on delete set null,
  chapter_id uuid references story_chapters (id) on delete set null,
  kind text not null default 'memory' check (kind in ('memory', 'photo', 'advice', 'capsule', 'story')),
  title text not null default '' check (char_length(title) <= 160),
  author_name text not null check (char_length(author_name) between 1 and 80),
  relation text not null default '' check (char_length(relation) <= 80),
  body text not null default '' check (char_length(body) <= 4000),
  display_title text check (char_length(display_title) <= 160),
  display_body text check (char_length(display_body) <= 4000),
  photo_file_id uuid references files (id) on delete set null,
  consent boolean not null check (consent),
  status text not null default 'pending' check (status in ('pending', 'published', 'private', 'rejected', 'capsule')),
  ai_chapter_id uuid references story_chapters (id) on delete set null,
  ai_note text not null default '' check (char_length(ai_note) <= 300),
  created_at timestamptz not null default now(),
  check (body <> '' or photo_file_id is not null)
);
create index contributions_wedding_id_idx on contributions (wedding_id);
create index contributions_campaign_id_idx on contributions (campaign_id);
create index contributions_guest_id_idx on contributions (guest_id);
create index contributions_chapter_id_idx on contributions (chapter_id);
create index contributions_ai_chapter_id_idx on contributions (ai_chapter_id);
create index contributions_photo_file_id_idx on contributions (photo_file_id);

create table photos (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  file_id uuid not null unique references files (id) on delete cascade,
  uploader_name text not null default '' check (char_length(uploader_name) <= 80),
  caption text not null default '' check (char_length(caption) <= 300),
  consent boolean not null check (consent),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index photos_wedding_id_idx on photos (wedding_id);

-- ---------------------------------------------------------------------------
-- Estúdio criativo
-- ---------------------------------------------------------------------------

create table design_references (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  file_id uuid unique references files (id) on delete cascade,
  url text check (url ~ '^https://' and char_length(url) <= 1000),
  note text not null default '' check (char_length(note) <= 300),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check ((file_id is null) <> (url is null))
);
create index design_references_wedding_id_idx on design_references (wedding_id);

create table studio_messages (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 6000),
  proposals jsonb,
  simulated boolean not null default false,
  created_at timestamptz not null default now()
);
create index studio_messages_wedding_id_idx on studio_messages (wedding_id, created_at);

-- ---------------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------------

create function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger weddings_touch_updated_at before update on weddings
  for each row execute function touch_updated_at();
create trigger drafts_touch_updated_at before update on wedding_drafts
  for each row execute function touch_updated_at();

-- A versão publicada e a capa precisam pertencer ao mesmo casamento.
create function check_wedding_refs() returns trigger language plpgsql as $$
begin
  if new.published_version_id is not null and not exists (
    select 1 from site_versions v where v.id = new.published_version_id and v.wedding_id = new.id
  ) then
    raise exception 'versão publicada inválida';
  end if;
  if new.cover_file_id is not null and not exists (
    select 1 from files f where f.id = new.cover_file_id and f.wedding_id = new.id
  ) then
    raise exception 'capa inválida';
  end if;
  return new;
end;
$$;

create trigger weddings_check_refs before insert or update of published_version_id, cover_file_id on weddings
  for each row execute function check_wedding_refs();
