// Linhas das tabelas do PostgreSQL (ver db/migrations).

export type PhaseSetting = "auto" | "antes" | "durante" | "depois";
export type SitePhase = Exclude<PhaseSetting, "auto">;
export type Plan = "essencial" | "premium" | "destination";

export type Wedding = {
  id: string;
  owner_id: string;
  slug: string;
  custom_domain: string | null;
  is_demo: boolean;
  plan: Plan;
  partner_one: string;
  partner_two: string;
  wedding_date: string | null;
  city: string;
  venue: string;
  published: boolean;
  published_version_id: string | null;
  phase: PhaseSetting;
  live_notice: string;
  mission: string;
  capsule_open_date: string | null;
  accepting_contributions: boolean;
  open_rsvp: boolean;
  logistics_public: boolean;
  cover_file_id: string | null;
  onboarding_done: boolean;
  created_at: string;
  updated_at: string;
};

export type WeddingDraft = { wedding_id: string; style: string; design: unknown; updated_at: string };

export type SiteVersion = {
  id: string;
  wedding_id: string;
  label: string;
  source: "manual" | "estudio" | "publicacao" | "restauracao";
  snapshot: unknown;
  created_at: string;
};

export type Logistics = { wedding_id: string; address: string; accommodation: string; transport: string };

export type ScheduleItem = {
  id: string;
  wedding_id: string;
  day: string | null;
  starts_at: string;
  title: string;
  location: string;
  description: string;
  position: number;
};

export type Task = { id: string; wedding_id: string; title: string; done: boolean; due_date: string | null; created_at: string };

export type GuestGroup = {
  id: string;
  wedding_id: string;
  name: string;
  max_party_size: number;
  sees_logistics: boolean;
  message: string;
  position: number;
};

export type Guest = {
  id: string;
  wedding_id: string;
  group_id: string | null;
  name: string;
  contact: string;
  invite_token: string;
  attending: boolean | null;
  party_size: number;
  companions: string;
  rsvp_message: string;
  responded_at: string | null;
  created_at: string;
};

export type Rsvp = {
  id: string;
  wedding_id: string;
  name: string;
  contact: string;
  attending: boolean;
  party_size: number;
  message: string;
  created_at: string;
};

export type Chapter = { id: string; wedding_id: string; title: string; intro: string; position: number };

export type ContributionKind = "memory" | "photo" | "advice" | "capsule" | "story";
export type ContributionStatus = "pending" | "published" | "private" | "rejected" | "capsule";
export type Audience = "everyone" | "invited" | "groups";

export type Campaign = {
  id: string;
  wedding_id: string;
  title: string;
  prompt: string;
  kind: ContributionKind;
  audience: Audience;
  group_ids: string[];
  active: boolean;
  position: number;
  created_at: string;
};

export type Contribution = {
  id: string;
  wedding_id: string;
  campaign_id: string | null;
  guest_id: string | null;
  chapter_id: string | null;
  kind: ContributionKind;
  title: string;
  author_name: string;
  relation: string;
  body: string;
  display_title: string | null;
  display_body: string | null;
  photo_file_id: string | null;
  consent: boolean;
  status: ContributionStatus;
  ai_chapter_id: string | null;
  ai_note: string;
  created_at: string;
};

export type Photo = {
  id: string;
  wedding_id: string;
  file_id: string;
  uploader_name: string;
  caption: string;
  consent: boolean;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export type DesignReference = {
  id: string;
  wedding_id: string;
  file_id: string | null;
  url: string | null;
  note: string;
  position: number;
  created_at: string;
};

export type StudioMessage = {
  id: string;
  wedding_id: string;
  role: "user" | "assistant";
  content: string;
  proposals: unknown;
  simulated: boolean;
  created_at: string;
};

export type Invitation = {
  wedding_id: string;
  guest: {
    name: string;
    attending: boolean | null;
    party_size: number;
    companions: string;
    rsvp_message: string;
    responded_at: string | null;
  };
  group: { id: string; name: string; max_party_size: number; message: string } | null;
  max_party_size: number;
  logistics: { address: string; accommodation: string; transport: string } | null;
};

export const KIND_LABELS: Record<ContributionKind, string> = {
  memory: "Lembrança",
  photo: "Fotografia",
  advice: "Conselho",
  capsule: "Cápsula do tempo",
  story: "História",
};
