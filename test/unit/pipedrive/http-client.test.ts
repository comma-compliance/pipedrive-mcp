import { describe, it, expect, afterEach } from "vitest";
import nock from "nock";
import { createHttpClient } from "../../../src/pipedrive/http-client.js";
import type { Config } from "../../../src/config.js";

const BASE_URL = "https://testcompany.pipedrive.com";

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    apiToken: undefined,
    oauthToken: undefined,
    companyDomain: "testcompany",
    transport: "stdio",
    sseHost: "0.0.0.0",
    ssePort: 3100,
    requestTimeoutMs: 5000,
    defaultLimit: 25,
    maxLimit: 100,
    rateLimitGeneralPer2s: 100,
    rateLimitSearchPer2s: 50,
    fieldCacheTtlMs: 300000,
    enableWriteTools: true,
    logLevel: "error",
    ...overrides,
  } as Config;
}

afterEach(() => {
  nock.cleanAll();
});

describe("createHttpClient auth modes", () => {
  it("uses api_token query param when apiToken is set", async () => {
    const client = createHttpClient(
      makeConfig({ apiToken: "test-api-token-12345" }),
    );

    const scope = nock(BASE_URL)
      .get("/v1/deals")
      .query((params) => params.api_token === "test-api-token-12345")
      .matchHeader("Authorization", (val) => val === undefined)
      .reply(200, { success: true, data: [] });

    const response = await client.request({
      method: "GET",
      url: `${BASE_URL}/v1/deals`,
    });

    expect(response.status).toBe(200);
    expect(scope.isDone()).toBe(true);
  });

  it("uses Bearer Authorization header when oauthToken is set", async () => {
    const client = createHttpClient(
      makeConfig({ oauthToken: "oauth-access-token-xyz" }),
    );

    const scope = nock(BASE_URL)
      .get("/v1/deals")
      .query((params) => params.api_token === undefined)
      .matchHeader("Authorization", "Bearer oauth-access-token-xyz")
      .reply(200, { success: true, data: [] });

    const response = await client.request({
      method: "GET",
      url: `${BASE_URL}/v1/deals`,
    });

    expect(response.status).toBe(200);
    expect(scope.isDone()).toBe(true);
  });

  it("does not send api_token query param in OAuth mode even if apiToken is set (OAuth takes precedence)", async () => {
    // Defensive check: even though config validation prevents both being set,
    // the client should prefer Bearer auth if oauthToken is present.
    const client = createHttpClient(
      makeConfig({
        apiToken: "should-not-be-used",
        oauthToken: "oauth-wins",
      }),
    );

    const scope = nock(BASE_URL)
      .get("/v1/deals")
      .query((params) => params.api_token === undefined)
      .matchHeader("Authorization", "Bearer oauth-wins")
      .reply(200, { success: true, data: [] });

    const response = await client.request({
      method: "GET",
      url: `${BASE_URL}/v1/deals`,
    });

    expect(response.status).toBe(200);
    expect(scope.isDone()).toBe(true);
  });

  it("preserves extra query params alongside api_token", async () => {
    const client = createHttpClient(
      makeConfig({ apiToken: "test-token" }),
    );

    const scope = nock(BASE_URL)
      .get("/v1/deals")
      .query((params) =>
        params.api_token === "test-token" && params.limit === "50",
      )
      .reply(200, { success: true, data: [] });

    await client.request({
      method: "GET",
      url: `${BASE_URL}/v1/deals`,
      params: { limit: 50 },
    });

    expect(scope.isDone()).toBe(true);
  });
});
