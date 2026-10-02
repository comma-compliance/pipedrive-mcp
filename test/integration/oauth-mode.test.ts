/**
 * End-to-end test that a tool call in OAuth mode sends a Bearer header
 * and does NOT include an api_token query param.
 *
 * This file uses setupOAuthTestContext so it should be kept isolated
 * from other integration tests that use API token mode.
 */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import nock from "nock";
import { readFileSync } from "fs";
import { join } from "path";
import {
  setupOAuthTestContext,
  callTool,
  BASE_URL,
  TEST_OAUTH_TOKEN,
} from "../helpers/setup.js";

const fixturesV2 = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, "../fixtures/v2", name), "utf-8"));

beforeAll(async () => {
  await setupOAuthTestContext();
});

afterEach(() => {
  nock.cleanAll();
});

describe("OAuth mode end-to-end", () => {
  it("sends Bearer header and no api_token query param on a tool call", async () => {
    const fixture = fixturesV2("deals-list.json");

    const scope = nock(BASE_URL)
      .get("/api/v2/deals")
      .query((params) => params.api_token === undefined)
      .matchHeader("Authorization", `Bearer ${TEST_OAUTH_TOKEN}`)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_deals_list", {});

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.items).toBeInstanceOf(Array);
    expect(scope.isDone()).toBe(true);
  });
});
