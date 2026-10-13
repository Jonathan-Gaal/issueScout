// Opt-in only: creates synthetic users/rows in a dedicated Supabase TEST project.
// Firebase is the production identity provider; these JWTs exercise Postgres RLS
// directly, independently of the backend service-role ownership predicates.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
const enabled = process.env.RUN_LIVE_DB_TESTS === "1";
describe.skipIf(!enabled)("Live database ownership and admission", () => {
  let admin: SupabaseClient;
  let anonymous: SupabaseClient;
  const users: { id: string; client: SupabaseClient }[] = [];
  const runIds: string[] = [];
  beforeAll(async () => {
    const url = process.env.TEST_SUPABASE_URL;
    const service = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
    const anon = process.env.TEST_SUPABASE_ANON_KEY;
    if (!url || !service || !anon) throw new Error("Explicit TEST_SUPABASE_* configuration is required.");
    const options = { auth: { persistSession: false, autoRefreshToken: false } };
    admin = createClient(url, service, options);
    anonymous = createClient(url, anon, options);
    for (let i = 0; i < 2; i++) {
      const email = `issuescout-test-${crypto.randomUUID()}@example.com`;
      const password = crypto.randomUUID() + "Aa1!";
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.error || !created.data.user) throw new Error("Cannot create test identity.");
      const client = createClient(url, anon, options);
      users.push({ id: created.data.user.id, client });
      const login = await client.auth.signInWithPassword({ email, password });
      if (login.error) throw new Error("Cannot sign in test identity.");
    }
  }, 30000);
  afterAll(async () => {
    if (!admin) return;
    for (const table of ["reports", "tool_calls", "issues"]) if (runIds.length) await admin.from(table).delete().in("run_id", runIds);
    if (runIds.length) await admin.from("runs").delete().in("id", runIds);
    for (const user of users) { await user.client.auth.signOut(); await admin.auth.admin.deleteUser(user.id); }
  });
  it("atomically admits only one of two simultaneous starts at limit one", async () => {
    const results = await Promise.all([0, 1].map(() => admin.rpc("admit_run", { p_user_id: users[0].id, p_issue_url: "https://github.com/calcom/cal.diy/issues/42", p_limit: 1 })));
    for (const result of results) {
      if (result.data) runIds.push(...result.data.map((row: { id: string }) => row.id));
      expect(result.error).toBeNull();
    }
    expect(runIds).toHaveLength(1);
    const complete = await admin.rpc("finish_run", { p_run_id: runIds[0], p_user_id: users[0].id, p_repo: "calcom/cal.diy", p_duration_ms: 20, p_outcome: { status: "completed", report: { issue: { number: 42, title: "Synthetic", state: "open", url: "https://github.com/calcom/cal.diy/issues/42", retrievedAt: new Date().toISOString() }, coverage: { stopReason: "completed", searchesRun: 0, candidatesRead: 0 } }, toolCalls: [{ operation: "read", arguments: { issueNumber: 42 }, outcome: "error" }] } });
    expect(complete.error).toBeNull();
  });
  it("denies other users and anonymous readers while allowing the owner", async () => {
    expect(runIds).toHaveLength(1);
    const owner = await users[0].client.from("runs").select("id").eq("id", runIds[0]);
    expect(owner.error).toBeNull();
    expect(owner.data).toHaveLength(1);
    for (const client of [anonymous, users[1].client]) {
      for (const table of ["runs", "issues", "reports", "tool_calls"]) {
        const result = await client.from(table).select("id").eq(table === "runs" ? "id" : "run_id", runIds[0]);
        expect(result.error).toBeNull();
        expect(result.data).toEqual([]);
      }
      const write = await client.from("runs").insert({ user_id: users[0].id, issue_url: "test" });
      expect(write.error).not.toBeNull();
      const rpc = await client.rpc("admit_run", { p_user_id: users[0].id, p_issue_url: "test", p_limit: 100 });
      expect(rpc.error).not.toBeNull();
    }
  });
  it("rolls back a malformed report without marking the run completed", async () => {
    const admitted = await admin.rpc("admit_run", { p_user_id: users[1].id, p_issue_url: "https://github.com/calcom/cal.diy/issues/42", p_limit: 1 });
    expect(admitted.error).toBeNull();
    const id = admitted.data[0].id;
    runIds.push(id);
    const finish = await admin.rpc("finish_run", { p_run_id: id, p_user_id: users[1].id, p_repo: "calcom/cal.diy", p_duration_ms: 20, p_outcome: { status: "completed", report: { summary: "invalid" } } });
    expect(finish.error).not.toBeNull();
    const row = await admin.from("runs").select("status").eq("id", id).single();
    expect(row.data?.status).toBe("running");
    const reports = await admin.from("reports").select("id").eq("run_id", id);
    expect(reports.data).toEqual([]);
  });
});
