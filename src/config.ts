import { z } from "zod";

export const ConfigSchema = z
  .object({
    apiToken: z.string().min(1).optional(),
    oauthToken: z.string().min(1).optional(),
    companyDomain: z.string().min(1, "PIPEDRIVE_COMPANY_DOMAIN is required"),
    transport: z.enum(["stdio", "sse"]).default("stdio"),
    sseHost: z.string().default("0.0.0.0"),
    ssePort: z.coerce.number().int().positive().default(3100),
    requestTimeoutMs: z.coerce.number().int().positive().default(30000),
    defaultLimit: z.coerce.number().int().positive().max(100).default(25),
    maxLimit: z.coerce.number().int().positive().max(500).default(100),
    rateLimitGeneralPer2s: z.coerce.number().int().positive().default(8),
    rateLimitSearchPer2s: z.coerce.number().int().positive().default(4),
    fieldCacheTtlMs: z.coerce.number().int().positive().default(300000),
    enableWriteTools: z
      .string()
      .transform((v) => v.toLowerCase() !== "false")
      .default("true"),
    logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  })
  .refine(
    (cfg) => Boolean(cfg.apiToken) !== Boolean(cfg.oauthToken),
    {
      message:
        "Set exactly one of PIPEDRIVE_API_TOKEN or PIPEDRIVE_OAUTH_TOKEN (not both, not neither)",
      path: ["apiToken"],
    },
  );

export type Config = z.infer<typeof ConfigSchema>;

let _config: Config | null = null;

export function loadConfig(): Config {
  if (_config) return _config;

  const result = ConfigSchema.safeParse({
    apiToken: process.env.PIPEDRIVE_API_TOKEN,
    oauthToken: process.env.PIPEDRIVE_OAUTH_TOKEN,
    companyDomain: process.env.PIPEDRIVE_COMPANY_DOMAIN,
    transport: process.env.PIPEDRIVE_TRANSPORT,
    sseHost: process.env.PIPEDRIVE_SSE_HOST,
    ssePort: process.env.PIPEDRIVE_SSE_PORT,
    requestTimeoutMs: process.env.PIPEDRIVE_REQUEST_TIMEOUT_MS,
    defaultLimit: process.env.PIPEDRIVE_DEFAULT_LIMIT,
    maxLimit: process.env.PIPEDRIVE_MAX_LIMIT,
    rateLimitGeneralPer2s: process.env.PIPEDRIVE_RATE_LIMIT_GENERAL_PER_2S,
    rateLimitSearchPer2s: process.env.PIPEDRIVE_RATE_LIMIT_SEARCH_PER_2S,
    fieldCacheTtlMs: process.env.PIPEDRIVE_FIELD_CACHE_TTL_MS,
    enableWriteTools: process.env.PIPEDRIVE_ENABLE_WRITE_TOOLS,
    logLevel: process.env.LOG_LEVEL,
  });

  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid configuration:\n${messages}`);
  }

  _config = result.data;
  return _config;
}

export function getBaseUrlV1(config: Config): string {
  return `https://${config.companyDomain}.pipedrive.com/v1`;
}

export function getBaseUrlV2(config: Config): string {
  return `https://${config.companyDomain}.pipedrive.com/api/v2`;
}

export function resetConfig(): void {
  _config = null;
}
