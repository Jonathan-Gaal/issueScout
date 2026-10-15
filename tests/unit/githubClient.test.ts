import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RestGitHubClient } from "../../lib/server/github/client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("RestGitHubClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getComments", () => {
    it("truncates at the max and sets truncated: true when more exist", async () => {
      const twentyOneComments = Array.from({ length: 21 }, (_, index) => ({
        body: `comment ${index}`,
        html_url: `https://github.com/calcom/cal.diy/issues/1#comment-${index}`,
        created_at: "2026-01-01T00:00:00Z",
      }));
      fetchMock.mockResolvedValueOnce(jsonResponse(200, twentyOneComments));

      const client = new RestGitHubClient("calcom/cal.diy");
      const result = await client.getComments(1, 20);

      expect(result.truncated).toBe(true);
      expect(result.comments).toHaveLength(20);
    });

    it("does not truncate when the comment count is at or below the max", async () => {
      const fiveComments = Array.from({ length: 5 }, (_, index) => ({
        body: `comment ${index}`,
        html_url: "https://github.com/calcom/cal.diy/issues/1#comment",
        created_at: "2026-01-01T00:00:00Z",
      }));
      fetchMock.mockResolvedValueOnce(jsonResponse(200, fiveComments));

      const client = new RestGitHubClient("calcom/cal.diy");
      const result = await client.getComments(1, 20);

      expect(result.truncated).toBe(false);
      expect(result.comments).toHaveLength(5);
    });
  });

  describe("searchIssues", () => {
    it("filters out items with a pull_request field and the excluded issue number", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, {
          items: [
            { number: 1, title: "input issue itself", html_url: "https://github.com/calcom/cal.diy/issues/1", state: "open" },
            { number: 2, title: "a real PR", pull_request: {}, html_url: "https://github.com/calcom/cal.diy/issues/2", state: "open" },
            { number: 3, title: "a real issue candidate", html_url: "https://github.com/calcom/cal.diy/issues/3", state: "open", body: "x" },
          ],
        })
      );

      const client = new RestGitHubClient("calcom/cal.diy");
      const result = await client.searchIssues("crash", 10, 1);

      expect(result).toEqual([
        { number: 3, title: "a real issue candidate", excerpt: "x", state: "open", url: "https://github.com/calcom/cal.diy/issues/3" },
      ]);
    });

    it("returns { rateLimited: true } on a 403 response, not an empty success", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(403, { message: "rate limit exceeded" }));

      const client = new RestGitHubClient("calcom/cal.diy");
      const result = await client.searchIssues("crash", 10, 1);

      expect(result).toEqual({ rateLimited: true });
    });

    it("returns { rateLimited: true } on a 429 response", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(429, { message: "too many requests" }));

      const client = new RestGitHubClient("calcom/cal.diy");
      const result = await client.searchIssues("crash", 10, 1);

      expect(result).toEqual({ rateLimited: true });
    });

    it("returns { error: true } on a malformed/non-JSON response, never throws", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response("not json", { status: 200, headers: { "Content-Type": "text/plain" } })
      );

      const client = new RestGitHubClient("calcom/cal.diy");
      const result = await client.searchIssues("crash", 10, 1);

      expect(result).toEqual({ error: true });
    });
  });

  describe("getIssue", () => {
    it("returns { notFound: true } on a 404, never throws", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404, { message: "Not Found" }));

      const client = new RestGitHubClient("calcom/cal.diy");
      const result = await client.getIssue(999);

      expect(result).toEqual({ notFound: true });
    });

    it("works against a second, different repo bound at construction", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, {
          number: 1, title: "a react issue", body: "x", state: "open",
          html_url: "https://github.com/facebook/react/issues/1",
          created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", labels: [],
        })
      );

      const client = new RestGitHubClient("facebook/react");
      await client.getIssue(1);

      const requestedUrl = String(fetchMock.mock.calls[0][0]);
      expect(requestedUrl).toContain("/repos/facebook/react/issues/1");
    });

    it("rejects a response whose html_url belongs to a different repo than the one bound at construction", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, {
          number: 1, title: "mismatched repo", body: "x", state: "open",
          html_url: "https://github.com/other/project/issues/1",
          created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", labels: [],
        })
      );

      const client = new RestGitHubClient("calcom/cal.diy");
      await expect(client.getIssue(1)).rejects.toThrow();
    });
  });
});
