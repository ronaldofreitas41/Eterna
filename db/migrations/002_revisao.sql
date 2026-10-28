-- Sincronização entre aparelhos: cada casamento tem um número de revisão que sobe a cada alteração
-- (no próprio casamento ou em qualquer tabela ligada a ele). As telas abertas consultam esse número
-- e se atualizam quando ele muda.

alter table weddings add column revision bigint not null default 0;

-- Alterações diretas no casamento.
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if tg_table_name = 'weddings' then
    new.revision := old.revision + 1;
  end if;
  return new;
end;
$$;

-- Alterações nas tabelas ligadas ao casamento.
create function bump_wedding_revision() returns trigger language plpgsql as $$
begin
  update weddings set revision = revision + 1
   where id = (case when tg_op = 'DELETE' then old.wedding_id else new.wedding_id end);
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'wedding_drafts', 'site_versions', 'wedding_logistics', 'schedule_items', 'tasks', 'guest_groups',
    'guests', 'rsvps', 'story_chapters', 'campaigns', 'contributions', 'photos', 'design_references', 'studio_messages'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on %I for each row execute function bump_wedding_revision()',
      t || '_bump_revision', t
    );
  end loop;
end;
$$;
