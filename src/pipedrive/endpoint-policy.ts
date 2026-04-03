export type ApiVersion = "v1" | "v2";
export type PaginationMode = "cursor" | "offset" | "none";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface EndpointPolicy {
  version: ApiVersion;
  method: HttpMethod;
  path: string;
  pagination: PaginationMode;
  isSearch?: boolean;
}

// Single source of truth for all tool -> API endpoint mappings.
// When Pipedrive migrates an endpoint from v1 to v2, change it here only.
const policies: Record<string, EndpointPolicy> = {
  // Deals (v2)
  "deals.list": { version: "v2", method: "GET", path: "/deals", pagination: "cursor" },
  "deals.get": { version: "v2", method: "GET", path: "/deals/:id", pagination: "none" },
  "deals.create": { version: "v2", method: "POST", path: "/deals", pagination: "none" },
  "deals.update": { version: "v2", method: "PATCH", path: "/deals/:id", pagination: "none" },
  "deals.delete": { version: "v2", method: "DELETE", path: "/deals/:id", pagination: "none" },
  "deals.search": { version: "v2", method: "GET", path: "/deals/search", pagination: "cursor", isSearch: true },

  // Persons (v2)
  "persons.list": { version: "v2", method: "GET", path: "/persons", pagination: "cursor" },
  "persons.get": { version: "v2", method: "GET", path: "/persons/:id", pagination: "none" },
  "persons.create": { version: "v2", method: "POST", path: "/persons", pagination: "none" },
  "persons.update": { version: "v2", method: "PATCH", path: "/persons/:id", pagination: "none" },
  "persons.delete": { version: "v2", method: "DELETE", path: "/persons/:id", pagination: "none" },
  "persons.search": { version: "v2", method: "GET", path: "/persons/search", pagination: "cursor", isSearch: true },
  "persons.merge": { version: "v1", method: "PUT", path: "/persons/:id/merge", pagination: "none" },

  // Organizations (v2)
  "organizations.list": { version: "v2", method: "GET", path: "/organizations", pagination: "cursor" },
  "organizations.get": { version: "v2", method: "GET", path: "/organizations/:id", pagination: "none" },
  "organizations.create": { version: "v2", method: "POST", path: "/organizations", pagination: "none" },
  "organizations.update": { version: "v2", method: "PATCH", path: "/organizations/:id", pagination: "none" },
  "organizations.delete": { version: "v2", method: "DELETE", path: "/organizations/:id", pagination: "none" },
  "organizations.search": { version: "v2", method: "GET", path: "/organizations/search", pagination: "cursor", isSearch: true },
  "organizations.merge": { version: "v1", method: "PUT", path: "/organizations/:id/merge", pagination: "none" },

  // Activities (v2)
  "activities.list": { version: "v2", method: "GET", path: "/activities", pagination: "cursor" },
  "activities.get": { version: "v2", method: "GET", path: "/activities/:id", pagination: "none" },
  "activities.create": { version: "v2", method: "POST", path: "/activities", pagination: "none" },
  "activities.update": { version: "v2", method: "PATCH", path: "/activities/:id", pagination: "none" },
  "activities.delete": { version: "v2", method: "DELETE", path: "/activities/:id", pagination: "none" },
  "activityTypes.list": { version: "v1", method: "GET", path: "/activityTypes", pagination: "none" },

  // Notes (v1)
  "notes.list": { version: "v1", method: "GET", path: "/notes", pagination: "offset" },
  "notes.get": { version: "v1", method: "GET", path: "/notes/:id", pagination: "none" },
  "notes.create": { version: "v1", method: "POST", path: "/notes", pagination: "none" },
  "notes.update": { version: "v1", method: "PUT", path: "/notes/:id", pagination: "none" },
  "notes.delete": { version: "v1", method: "DELETE", path: "/notes/:id", pagination: "none" },

  // Pipelines (v2)
  "pipelines.list": { version: "v2", method: "GET", path: "/pipelines", pagination: "cursor" },
  "pipelines.get": { version: "v2", method: "GET", path: "/pipelines/:id", pagination: "none" },
  "stages.list": { version: "v2", method: "GET", path: "/stages", pagination: "cursor" },
  "stages.get": { version: "v2", method: "GET", path: "/stages/:id", pagination: "none" },

  // Custom Fields (all v1 - v2 fields endpoints not available on all instances)
  "dealFields.list": { version: "v1", method: "GET", path: "/dealFields", pagination: "none" },
  "personFields.list": { version: "v1", method: "GET", path: "/personFields", pagination: "none" },
  "organizationFields.list": { version: "v1", method: "GET", path: "/organizationFields", pagination: "none" },
  "activityFields.list": { version: "v1", method: "GET", path: "/activityFields", pagination: "none" },
  "productFields.list": { version: "v1", method: "GET", path: "/productFields", pagination: "none" },

  // Users (v1)
  "users.list": { version: "v1", method: "GET", path: "/users", pagination: "none" },
  "users.get": { version: "v1", method: "GET", path: "/users/:id", pagination: "none" },
  "users.permissions": { version: "v1", method: "GET", path: "/users/:id/permissions", pagination: "none" },

  // Filters (v1)
  "filters.list": { version: "v1", method: "GET", path: "/filters", pagination: "none" },
  "filters.get": { version: "v1", method: "GET", path: "/filters/:id", pagination: "none" },

  // Products (v2)
  "products.list": { version: "v2", method: "GET", path: "/products", pagination: "cursor" },
  "products.get": { version: "v2", method: "GET", path: "/products/:id", pagination: "none" },
  "products.create": { version: "v2", method: "POST", path: "/products", pagination: "none" },
  "products.update": { version: "v2", method: "PATCH", path: "/products/:id", pagination: "none" },
  "products.delete": { version: "v2", method: "DELETE", path: "/products/:id", pagination: "none" },
  "products.search": { version: "v2", method: "GET", path: "/products/search", pagination: "cursor", isSearch: true },
  "dealProducts.list": { version: "v2", method: "GET", path: "/deals/:id/products", pagination: "cursor" },
  "dealProducts.add": { version: "v2", method: "POST", path: "/deals/:id/products", pagination: "none" },
  "dealProducts.update": { version: "v2", method: "PATCH", path: "/deals/:dealId/products/:id", pagination: "none" },
  "dealProducts.delete": { version: "v2", method: "DELETE", path: "/deals/:dealId/products/:id", pagination: "none" },

  // Files (v1)
  "files.list": { version: "v1", method: "GET", path: "/files", pagination: "offset" },
  "files.get": { version: "v1", method: "GET", path: "/files/:id", pagination: "none" },
  "files.upload": { version: "v1", method: "POST", path: "/files", pagination: "none" },

  // Leads (v1 CRUD, v2 search)
  "leads.list": { version: "v1", method: "GET", path: "/leads", pagination: "offset" },
  "leads.get": { version: "v1", method: "GET", path: "/leads/:id", pagination: "none" },
  "leads.create": { version: "v1", method: "POST", path: "/leads", pagination: "none" },
  "leads.update": { version: "v1", method: "PATCH", path: "/leads/:id", pagination: "none" },
  "leads.delete": { version: "v1", method: "DELETE", path: "/leads/:id", pagination: "none" },
  "leads.search": { version: "v2", method: "GET", path: "/leads/search", pagination: "cursor", isSearch: true },

  // Webhooks (v1)
  "webhooks.list": { version: "v1", method: "GET", path: "/webhooks", pagination: "none" },
  "webhooks.create": { version: "v1", method: "POST", path: "/webhooks", pagination: "none" },
  "webhooks.delete": { version: "v1", method: "DELETE", path: "/webhooks/:id", pagination: "none" },

  // Mail (v1)
  "mailThreads.list": { version: "v1", method: "GET", path: "/mailbox/mailThreads", pagination: "offset" },
  "mailThreads.get": { version: "v1", method: "GET", path: "/mailbox/mailThreads/:id", pagination: "none" },
  "mailThreadMessages.list": { version: "v1", method: "GET", path: "/mailbox/mailThreads/:id/mailMessages", pagination: "none" },
  "mailMessages.get": { version: "v1", method: "GET", path: "/mailbox/mailMessages/:id", pagination: "none" },
  "mailThreads.update": { version: "v1", method: "PUT", path: "/mailbox/mailThreads/:id", pagination: "none" },
  "mailThreads.delete": { version: "v1", method: "DELETE", path: "/mailbox/mailThreads/:id", pagination: "none" },
  "dealMailMessages.list": { version: "v1", method: "GET", path: "/deals/:id/mailMessages", pagination: "offset" },
  "personMailMessages.list": { version: "v1", method: "GET", path: "/persons/:id/mailMessages", pagination: "offset" },
};

export function getEndpointPolicy(key: string): EndpointPolicy {
  const policy = policies[key];
  if (!policy) {
    throw new Error(`No endpoint policy found for: ${key}`);
  }
  return policy;
}

export function resolveEndpointPath(policy: EndpointPolicy, params: Record<string, string | number>): string {
  let path = policy.path;
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`:${key}`, String(value));
  }
  return path;
}
