# pipedrive-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for [Pipedrive CRM](https://www.pipedrive.com). Provides 80 tools covering deals, persons, organizations, activities, notes, pipelines, products, leads, files, users, filters, custom fields, webhooks, and shortcut tools for common CRM workflows.

## Why this exists

We use Pipedrive as our primary CRM at [Comma Compliance](https://commacompliance.com). We wanted a way for our non-developer team members to interact with Pipedrive through AI assistants - searching contacts, updating deals, logging activities - without needing to learn the API or build custom integrations.

We're big fans of MCP as a protocol. APIs are great for structured integrations, but MCP hits a different sweet spot - self-documenting tools, built-in schema validation, and a natural interface for conversational interaction. It makes internal tools accessible to people who would never write a curl command. This is the first of several MCP servers we plan to open source, alongside an open source MCP server management tool we're building internally (coming soon).

The existing open source Pipedrive MCP servers we evaluated had issues: single-file monoliths, hardcoded field keys, silent pagination truncation, no write support, stale v1-only implementations. So we built this one from scratch with proper modular architecture, full CRUD, custom field resolution by name, and safety guards on destructive operations.

We've been running this internally for several weeks against our production Pipedrive instance. The test suite includes integration tests recorded from real API responses (sanitized for publication).

## Features

- **Full CRUD** for deals, persons, organizations, activities, notes, products, leads, and webhooks
- **Custom field resolution** - reference fields by human-readable name (e.g. `{"Tier": "Enterprise"}`) instead of API keys
- **Explicit pagination** - cursor/offset tokens with no silent truncation
- **Safety guards** - destructive operations require explicit confirmation and support `dry_run` previews
- **Structured errors** - Claude-friendly error messages with category, guidance, and retryability
- **Rate limiting** - respects Pipedrive's rate limits with automatic backoff
- **v1/v2 API support** - uses v2 where available, falls back to v1 where needed

## Quick start

```bash
git clone https://github.com/comma-compliance/pipedrive-mcp.git
cd pipedrive-mcp
npm install
npm run build
```

## Configuration

Copy `.env.example` to `.env` and set your Pipedrive credentials:

```
PIPEDRIVE_API_TOKEN=your-api-token-here
PIPEDRIVE_COMPANY_DOMAIN=yourcompany
```

Find your API token in Pipedrive under **Settings > Personal preferences > API**.

Your company domain is the subdomain in your Pipedrive URL (e.g. `yourcompany` for `yourcompany.pipedrive.com`).

### Optional settings

| Variable | Default | Description |
|----------|---------|-------------|
| `PIPEDRIVE_REQUEST_TIMEOUT_MS` | `30000` | HTTP request timeout |
| `PIPEDRIVE_DEFAULT_LIMIT` | `25` | Default page size |
| `PIPEDRIVE_MAX_LIMIT` | `100` | Maximum page size |
| `PIPEDRIVE_RATE_LIMIT_GENERAL_PER_2S` | `8` | General rate limit per 2s |
| `PIPEDRIVE_RATE_LIMIT_SEARCH_PER_2S` | `4` | Search rate limit per 2s |
| `PIPEDRIVE_FIELD_CACHE_TTL_MS` | `300000` | Field metadata cache TTL (5 min) |
| `PIPEDRIVE_ENABLE_WRITE_TOOLS` | `true` | Set `false` to expose only read tools |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |

## Usage with Claude Code

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "pipedrive": {
      "type": "stdio",
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/pipedrive-mcp",
      "env": {
        "PIPEDRIVE_API_TOKEN": "your-api-token",
        "PIPEDRIVE_COMPANY_DOMAIN": "yourcompany"
      }
    }
  }
}
```

## Usage with Codex

Create a `codex.json` or pass the server config when launching Codex:

```json
{
  "mcpServers": {
    "pipedrive": {
      "type": "stdio",
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/pipedrive-mcp",
      "env": {
        "PIPEDRIVE_API_TOKEN": "your-api-token",
        "PIPEDRIVE_COMPANY_DOMAIN": "yourcompany"
      }
    }
  }
}
```

Or if running via Docker:

```json
{
  "mcpServers": {
    "pipedrive": {
      "type": "stdio",
      "command": "docker",
      "args": ["run", "--rm", "-i", "-e", "PIPEDRIVE_API_TOKEN=your-api-token", "-e", "PIPEDRIVE_COMPANY_DOMAIN=yourcompany", "pipedrive-mcp"]
    }
  }
}
```

## Usage with Docker

```bash
docker build -t pipedrive-mcp .
docker run -e PIPEDRIVE_API_TOKEN=xxx -e PIPEDRIVE_COMPANY_DOMAIN=yourcompany pipedrive-mcp
```

## Tools

### Deals (8 tools)
`pipedrive_deals_list` `pipedrive_deals_get` `pipedrive_deals_search` `pipedrive_deals_summary` `pipedrive_deals_move_stage` `pipedrive_deals_create` `pipedrive_deals_update` `pipedrive_deals_delete`

### Persons (7 tools)
`pipedrive_persons_list` `pipedrive_persons_get` `pipedrive_persons_search` `pipedrive_persons_create` `pipedrive_persons_update` `pipedrive_persons_delete` `pipedrive_persons_merge`

### Organizations (7 tools)
`pipedrive_organizations_list` `pipedrive_organizations_get` `pipedrive_organizations_search` `pipedrive_organizations_create` `pipedrive_organizations_update` `pipedrive_organizations_delete` `pipedrive_organizations_merge`

### Activities (7 tools)
`pipedrive_activities_list` `pipedrive_activities_get` `pipedrive_activities_create` `pipedrive_activities_update` `pipedrive_activities_mark_done` `pipedrive_activities_delete` `pipedrive_activity_types_list`

### Notes & Comments (10 tools)
`pipedrive_notes_list` `pipedrive_notes_get` `pipedrive_notes_create` `pipedrive_notes_update` `pipedrive_notes_delete` `pipedrive_note_comments_list` `pipedrive_note_comments_get` `pipedrive_note_comments_create` `pipedrive_note_comments_update` `pipedrive_note_comments_delete`

### Pipelines & Stages (4 tools)
`pipedrive_pipelines_list` `pipedrive_pipelines_get` `pipedrive_stages_list` `pipedrive_stages_get`

### Products (10 tools)
`pipedrive_products_list` `pipedrive_products_get` `pipedrive_products_create` `pipedrive_products_update` `pipedrive_products_delete` `pipedrive_products_search` `pipedrive_deal_products_list` `pipedrive_deal_products_add` `pipedrive_deal_products_update` `pipedrive_deal_products_delete`

### Leads (6 tools)
`pipedrive_leads_list` `pipedrive_leads_get` `pipedrive_leads_create` `pipedrive_leads_update` `pipedrive_leads_delete` `pipedrive_leads_search`

### Files (3 tools)
`pipedrive_files_list` `pipedrive_files_get` `pipedrive_files_upload`

### Users (3 tools)
`pipedrive_users_list` `pipedrive_users_get` `pipedrive_users_permissions`

### Filters (3 tools)
`pipedrive_filters_list` `pipedrive_filters_get` `pipedrive_filters_results`

### Custom Fields (1 tool)
`pipedrive_custom_fields_list`

### Webhooks (3 tools)
`pipedrive_webhooks_list` `pipedrive_webhooks_create` `pipedrive_webhooks_delete`

### Shortcuts (8 tools)
`pipedrive_me` `pipedrive_my_open_deals` `pipedrive_my_overdue_activities` `pipedrive_my_upcoming_activities` `pipedrive_recently_updated` `pipedrive_my_pipeline_summary` `pipedrive_stale_deals` `pipedrive_people_needing_followup`

These are opinionated wrappers around the core tools designed for common CRM workflows. They auto-resolve the current user from the API token so you don't need to know your numeric owner ID.

All shortcut tools support an optional `as_user` parameter for shared API token scenarios (e.g. multiple team members accessing Pipedrive through a single MCP server). Pass a name or email and it resolves against the Pipedrive users list:

```json
{ "name": "pipedrive_my_open_deals", "arguments": { "as_user": "Sasha" } }
{ "name": "pipedrive_my_overdue_activities", "arguments": { "as_user": "sasha@company.com" } }
```

| Tool | What it does |
|------|-------------|
| `pipedrive_me` | Show current user profile, or resolve a teammate by name/email |
| `pipedrive_my_open_deals` | Open deals owned by the current user, sorted by recently updated |
| `pipedrive_my_overdue_activities` | Past-due undone activities |
| `pipedrive_my_upcoming_activities` | Activities in the next N days (default 7) |
| `pipedrive_recently_updated` | Deals, persons, or orgs updated in the last N days |
| `pipedrive_my_pipeline_summary` | Stage-by-stage breakdown with deal counts and total values |
| `pipedrive_stale_deals` | Open deals not updated in N+ days (default 30) |
| `pipedrive_people_needing_followup` | Contacts with no next activity scheduled |

## Custom fields

Reference custom fields by name instead of API key:

```json
{
  "name": "pipedrive_deals_update",
  "arguments": {
    "deal_id": 42,
    "custom_fields_by_name": {
      "Tier": "Enterprise",
      "Expected Revenue": 50000
    }
  }
}
```

Use `pipedrive_custom_fields_list` to discover available fields for each entity type.

## Safety guards

All destructive operations require explicit confirmation:

- **Delete tools** require `confirm: "DELETE"`
- **Merge tools** require `confirm: "MERGE"`
- **Webhook create/delete** require `confirm: "YES"`

All destructive tools support `dry_run: true` to preview what would happen without executing.

Set `PIPEDRIVE_ENABLE_WRITE_TOOLS=false` to disable all write operations entirely.

## Development

```bash
npm run dev          # Watch mode
npm test             # Run tests
npm run test:watch   # Watch tests
npm run lint         # Type check
```

## Testing

Tests use [vitest](https://vitest.dev) with [nock](https://github.com/nock/nock) for HTTP mocking. No live API calls are made during tests.

```bash
npm test
```

## Architecture

```
src/
  index.ts                 # Entry point
  server.ts                # MCP server setup
  config.ts                # Environment variable loading
  logging.ts               # Structured logging
  mcp/                     # MCP protocol helpers
  pipedrive/               # HTTP client, pagination, rate limiting, retries
  services/                # Custom fields, summaries, guards, cache
  schemas/                 # Zod input schemas per entity
  tools/                   # Tool handlers per entity
  presenters/              # Response formatting
```

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repo and create a feature branch
2. `npm install && npm run build` to verify the build
3. Make your changes - follow the existing patterns (one file per entity in `src/tools/` and `src/schemas/`)
4. Add tests for new functionality
5. `npm test` to make sure everything passes
6. `npm run lint` to verify types
7. Open a PR with a clear description of what you changed and why

A few ground rules:
- No `@ts-ignore` - fix the types properly
- No hardcoded Pipedrive field keys or option IDs
- All destructive tools must require explicit confirmation and support `dry_run`
- Use native `fetch` (not axios)
- Never commit real Pipedrive data - sanitize any test fixtures

## License

MIT
