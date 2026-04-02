// Compress raw API objects into compact, Claude-friendly summaries

export interface CompactDeal {
  id: number;
  title: string;
  status: string;
  stage_id: number | null;
  pipeline_id: number | null;
  value: number | null;
  currency: string | null;
  person_id: number | null;
  org_id: number | null;
  owner_id: number | null;
  expected_close_date: string | null;
  update_time: string | null;
  custom_fields_resolved?: Array<{ key: string; label: string; value: unknown; display_value: string }>;
}

export interface CompactPerson {
  id: number;
  name: string;
  emails: string[];
  phones: string[];
  org_id: number | null;
  owner_id: number | null;
  update_time: string | null;
  custom_fields_resolved?: Array<{ key: string; label: string; value: unknown; display_value: string }>;
}

export interface CompactOrganization {
  id: number;
  name: string;
  address: string | null;
  owner_id: number | null;
  update_time: string | null;
  custom_fields_resolved?: Array<{ key: string; label: string; value: unknown; display_value: string }>;
}

export interface CompactActivity {
  id: number;
  subject: string;
  type: string;
  done: boolean;
  due_date: string | null;
  due_time: string | null;
  deal_id: number | null;
  person_id: number | null;
  org_id: number | null;
  user_id: number | null;
  update_time: string | null;
}

export interface CompactNote {
  id: number;
  content: string;
  deal_id: number | null;
  person_id: number | null;
  org_id: number | null;
  lead_id: string | null;
  user_id: number | null;
  pinned_to_deal_flag: boolean;
  pinned_to_person_flag: boolean;
  pinned_to_organization_flag: boolean;
  update_time: string | null;
}

function extractEmails(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((e: Record<string, unknown>) => e.value as string)
    .filter((v): v is string => typeof v === "string" && v.length > 0);
}

function extractPhones(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((p: Record<string, unknown>) => p.value as string)
    .filter((v): v is string => typeof v === "string" && v.length > 0);
}

export function compactDeal(raw: Record<string, unknown>): CompactDeal {
  return {
    id: raw.id as number,
    title: (raw.title as string) ?? "",
    status: (raw.status as string) ?? "open",
    stage_id: (raw.stage_id as number) ?? null,
    pipeline_id: (raw.pipeline_id as number) ?? null,
    value: (raw.value as number) ?? null,
    currency: (raw.currency as string) ?? null,
    person_id: (raw.person_id as number) ?? null,
    org_id: (raw.org_id as number) ?? null,
    owner_id: (raw.owner_id as number) ?? (raw.user_id as number) ?? null,
    expected_close_date: (raw.expected_close_date as string) ?? null,
    update_time: (raw.update_time as string) ?? null,
  };
}

export function compactPerson(raw: Record<string, unknown>): CompactPerson {
  return {
    id: raw.id as number,
    name: (raw.name as string) ?? "",
    emails: extractEmails(raw.emails ?? raw.email),
    phones: extractPhones(raw.phones ?? raw.phone),
    org_id: (raw.org_id as number) ?? null,
    owner_id: (raw.owner_id as number) ?? (raw.user_id as number) ?? null,
    update_time: (raw.update_time as string) ?? null,
  };
}

export function compactOrganization(raw: Record<string, unknown>): CompactOrganization {
  return {
    id: raw.id as number,
    name: (raw.name as string) ?? "",
    address: (raw.address as string) ?? null,
    owner_id: (raw.owner_id as number) ?? (raw.user_id as number) ?? null,
    update_time: (raw.update_time as string) ?? null,
  };
}

export function compactActivity(raw: Record<string, unknown>): CompactActivity {
  return {
    id: raw.id as number,
    subject: (raw.subject as string) ?? "",
    type: (raw.type as string) ?? "",
    done: (raw.done as boolean) ?? false,
    due_date: (raw.due_date as string) ?? null,
    due_time: (raw.due_time as string) ?? null,
    deal_id: (raw.deal_id as number) ?? null,
    person_id: (raw.person_id as number) ?? null,
    org_id: (raw.org_id as number) ?? null,
    user_id: (raw.user_id as number) ?? null,
    update_time: (raw.update_time as string) ?? null,
  };
}

export interface CompactNoteComment {
  uuid: string;
  content: string;
  user_id: number | null;
  updater_id: number | null;
  active_flag: boolean;
  add_time: string | null;
  update_time: string | null;
}

export function compactNoteComment(raw: Record<string, unknown>): CompactNoteComment {
  return {
    uuid: (raw.uuid as string) ?? "",
    content: (raw.content as string) ?? "",
    user_id: (raw.user_id as number) ?? null,
    updater_id: (raw.updater_id as number) ?? null,
    active_flag: (raw.active_flag as boolean) ?? true,
    add_time: (raw.add_time as string) ?? null,
    update_time: (raw.update_time as string) ?? null,
  };
}

export function compactNote(raw: Record<string, unknown>): CompactNote {
  return {
    id: raw.id as number,
    content: (raw.content as string) ?? "",
    deal_id: (raw.deal_id as number) ?? null,
    person_id: (raw.person_id as number) ?? null,
    org_id: (raw.org_id as number) ?? null,
    lead_id: (raw.lead_id as string) ?? null,
    user_id: (raw.user_id as number) ?? null,
    pinned_to_deal_flag: (raw.pinned_to_deal_flag as boolean) ?? false,
    pinned_to_person_flag: (raw.pinned_to_person_flag as boolean) ?? false,
    pinned_to_organization_flag: (raw.pinned_to_organization_flag as boolean) ?? false,
    update_time: (raw.update_time as string) ?? null,
  };
}
