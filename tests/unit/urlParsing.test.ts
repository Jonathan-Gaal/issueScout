import { describe, expect, it } from "vitest";
import { parseIssueUrl } from "../../lib/server/github/urlParsing";

describe("parseIssueUrl", () => {
  it("parses a valid issue URL", () => {
    const result = parseIssueUrl("https://github.com/calcom/cal.diy/issues/42");
    expect(result).toEqual({
      ok: true,
      value: { owner: "calcom", repo: "cal.diy", number: 42 },
    });
  });

  it("parses a valid issue URL in a second, different repo", () => {
    const result = parseIssueUrl("https://github.com/facebook/react/issues/1");
    expect(result).toEqual({
      ok: true,
      value: { owner: "facebook", repo: "react", number: 1 },
    });
  });

  it("accepts a trailing slash or query string on an otherwise valid URL", () => {
    const withSlash = parseIssueUrl("https://github.com/calcom/cal.diy/issues/42/");
    const withQuery = parseIssueUrl(
      "https://github.com/calcom/cal.diy/issues/42?tab=comments"
    );
    expect(withSlash.ok).toBe(true);
    expect(withQuery.ok).toBe(true);
  });

  it("returns is_pull_request for a pull request URL", () => {
    const result = parseIssueUrl("https://github.com/calcom/cal.diy/pull/42");
    expect(result).toEqual({ ok: false, code: "is_pull_request" });
  });

  it("returns invalid_url for a malformed URL", () => {
    const result = parseIssueUrl("not a url at all");
    expect(result).toEqual({ ok: false, code: "invalid_url" });
  });

  it("returns invalid_url for an empty string", () => {
    const result = parseIssueUrl("");
    expect(result).toEqual({ ok: false, code: "invalid_url" });
  });

  it("returns invalid_url for a non-GitHub URL", () => {
    const result = parseIssueUrl("https://gitlab.com/calcom/cal.diy/issues/42");
    expect(result).toEqual({ ok: false, code: "invalid_url" });
  });

  it("returns invalid_url for a GitHub URL with a non-numeric issue number", () => {
    const result = parseIssueUrl("https://github.com/calcom/cal.diy/issues/abc");
    expect(result).toEqual({ ok: false, code: "invalid_url" });
  });

  it("returns invalid_url for a GitHub repo root URL with no issue number", () => {
    const result = parseIssueUrl("https://github.com/calcom/cal.diy");
    expect(result).toEqual({ ok: false, code: "invalid_url" });
  });

  it("parses mixed-case owner/repo segments structurally, unchanged", () => {
    const result = parseIssueUrl("https://github.com/CalCom/Cal.Diy/issues/5");
    expect(result).toEqual({
      ok: true,
      value: { owner: "CalCom", repo: "Cal.Diy", number: 5 },
    });
  });
});
