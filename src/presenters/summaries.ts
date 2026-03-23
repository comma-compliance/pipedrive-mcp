import { type DealSummary } from "../services/summaries.js";
import { compactDeal, compactPerson, compactOrganization, compactActivity, compactNote } from "./entities.js";

export interface FormattedDealSummary {
  deal: ReturnType<typeof compactDeal>;
  person?: ReturnType<typeof compactPerson> | null;
  organization?: ReturnType<typeof compactOrganization> | null;
  recent_activities?: ReturnType<typeof compactActivity>[];
  recent_notes?: Array<{ id: number; content_preview: string; update_time: string | null }>;
  products?: Array<{ id: number; name: string; quantity: number; price: number }>;
}

export function formatDealSummary(summary: DealSummary): FormattedDealSummary {
  const result: FormattedDealSummary = {
    deal: compactDeal(summary.deal),
  };

  if (summary.person) {
    result.person = compactPerson(summary.person);
  }

  if (summary.organization) {
    result.organization = compactOrganization(summary.organization);
  }

  if (summary.activities) {
    result.recent_activities = summary.activities.map(compactActivity);
  }

  if (summary.notes) {
    result.recent_notes = summary.notes.map((n) => ({
      id: n.id as number,
      content_preview: truncate((n.content as string) ?? "", 200),
      update_time: (n.update_time as string) ?? null,
    }));
  }

  if (summary.products) {
    result.products = summary.products.map((p) => ({
      id: (p.id ?? p.product_id) as number,
      name: (p.name ?? (p.product as Record<string, unknown>)?.name ?? "") as string,
      quantity: (p.quantity as number) ?? 0,
      price: (p.item_price as number) ?? 0,
    }));
  }

  return result;
}

export interface FormattedPipelineSummary {
  pipelines: Array<{ id: number; name: string; active: boolean }>;
  stages: Array<{ id: number; name: string; pipeline_id: number; order_nr: number; deal_count: number }>;
}

export function formatPipelineSummary(data: {
  pipelines: Record<string, unknown>[];
  stages: Record<string, unknown>[];
  deal_counts: Record<string, number>;
}): FormattedPipelineSummary {
  return {
    pipelines: data.pipelines.map((p) => ({
      id: p.id as number,
      name: (p.name as string) ?? "",
      active: (p.active as boolean) ?? true,
    })),
    stages: data.stages.map((s) => ({
      id: s.id as number,
      name: (s.name as string) ?? "",
      pipeline_id: s.pipeline_id as number,
      order_nr: (s.order_nr as number) ?? 0,
      deal_count: data.deal_counts[String(s.id)] ?? 0,
    })),
  };
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen) + "...";
}
