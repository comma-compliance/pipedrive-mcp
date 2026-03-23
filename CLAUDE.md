# Pipedrive MCP Server

## Build instructions
- npm install && npm run build
- npm run dev (watch mode)
- npm test (vitest)

## Architecture rules
- One tool file per entity in src/tools/
- One schema file per entity in src/schemas/
- No business logic in tool handlers - delegate to services/
- No raw HTTP in tool files - use api-v1.ts or api-v2.ts via http-client.ts
- No @ts-ignore - fix types properly
- No hardcoded Pipedrive field keys or option IDs
- All destructive tools require confirm param and support dry_run
- Use native fetch (not axios)
- Use Zod .strict() on all tool input schemas
- v2 activities use participants array, not person_id (which is read-only)
- v2 custom field writes must nest fields in a custom_fields object
- All field metadata endpoints are v1 (v2 field routes are not available on all instances)

## Testing
- vitest for all tests
- nock for HTTP mocking in integration tests
- Never hit production Pipedrive in tests
- Sanitized fixtures in test/fixtures/v1/ and test/fixtures/v2/

## Key files
- src/pipedrive/endpoint-policy.ts is the source of truth for API routing
- src/services/custom-fields.ts handles all field name resolution
