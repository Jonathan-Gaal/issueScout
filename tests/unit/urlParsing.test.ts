import { describe, expect, it } from "vitest";
import { parseIssueUrl } from "../../lib/server/github/urlParsing";

const APPROVED_REPO = "calcom/cal.diy";

describe("parseIssueUrl", () => {
  it("parses a valid issue URL in the approved repo", () => {
    const result = parseIssueUrl("https://github.com/calcom/cal.diy/issues/42", APPROVED_REPO);
    expect(result).toEqual({
      ok: true,
      value: { owner: "calcom", repo: "cal.diy", number: 42 },
    });
  });

  it("accepts a trailing slash or query string on an otherwise valid URL", () => {
    const withSlash = parseIssueUrl("https://github.com/calcom/cal.diy/issues/42/", APPROVED_REPO);
    const withQuery = parseIssueUrl(
      "https://github.com/calcom/cal.diy/issues/42?tab=comments",
      APPROVED_REPO
    );
    expect(withSlash.ok).toBe(true);
    expect(withQuery.ok).toBe(true);
  });

  it("returns repo_not_allowed for a URL in a different repository", () => {
    const result = parseIssueUrl("https://github.com/octocat/hello-world/issues/1", APPROVED_REPO);
    expect(result).toEqual({ ok: false, code: "repo_not_allowed" });
  });

  it("returns is_pull_request for a pull request URL in the approved repo", () => {
    const result = parseIssueUrl("https://github.com/calcom/cal.diy/pull/42", APPROVED_REPO);
    expect(result).toEqual({ ok: false, code: "is_pull_request" });
  });

  it("returns invalid_url for a malformed URL", () => {
    const result = parseIssueUrl("not a url at all", APPROVED_REPO);
    expect(result).toEqual({ ok: false, code: "invalid_url" });
  });

  it("returns invalid_url for an empty string", () => {
    const result = parseIssueUrl("", APPROVED_REPO);
    expect(result).toEqual({ ok: false, code: "invalid_url" });
  });

  it("returns invalid_url for a non-GitHub URL", () => {
    const result = parseIssueUrl("https://gitlab.com/calcom/cal.diy/issues/42", APPROVED_REPO);
    expect(result).toEqual({ ok: false, code: "invalid_url" });
  });

  it("returns invalid_url for a GitHub URL with a non-numeric issue number", () => {
    const result = parseIssueUrl("https://github.com/calcom/cal.diy/issues/abc", APPROVED_REPO);
    expect(result).toEqual({ ok: false, code: "invalid_url" });
  });

  it("returns invalid_url for a GitHub repo root URL with no issue number", () => {
    const result = parseIssueUrl("https://github.com/calcom/cal.diy", APPROVED_REPO);
    expect(result).toEqual({ ok: false, code: "invalid_url" });
  });

  it("is case-insensitive on the repo match", () => {
    const result = parseIssueUrl("https://github.com/CalCom/Cal.Diy/issues/5", APPROVED_REPO);
    expect(result.ok).toBe(true);
  });
});
