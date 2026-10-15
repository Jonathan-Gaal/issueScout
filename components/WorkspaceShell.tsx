"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "@firebase/auth";
import { clientAuth } from "../lib/client/firebase";
import { hasFirebaseConfig } from "../lib/client/config";
import "./workspace.css";
const SessionContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });
export const useSession = () => useContext(SessionContext);
export default function WorkspaceShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(hasFirebaseConfig);
  const [menu, setMenu] = useState(false);
  const [motion, setMotion] = useState(true);
  const [error, setError] = useState("");
  const path = usePathname(); const router = useRouter();
  const demo = path.startsWith("/demo");
  const entry = path === "/signin" || path === "/signup" || path === "/not-authorized";
  useEffect(() => {
    const auth = clientAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, value => { setUser(value); setLoading(false); }, () => { setError("Your session could not be checked. Please reload."); setLoading(false); });
  }, []);
  const [signingOut, setSigningOut] = useState(false);
  async function logout() {
    setSigningOut(true); setError("");
    try { const auth = clientAuth(); if (auth) await signOut(auth); router.push("/signin"); }
    catch { setError("Could not sign out. Please try again."); }
    finally { setSigningOut(false); }
  }
  const links = demo
    ? [["/demo", "Start a report"], ["/demo/report", "Report"], ["/demo/history", "History"]]
    : [["/workspace", "Start a report"], [path.startsWith("/runs/") ? path : "", "Report"], ["/runs", "History"]];
  return <SessionContext.Provider value={{ user, loading }}><div className={`workspace-app editorial ${entry ? "entry-layout" : ""} ${motion ? "motion-on" : "motion-off"}`}><a className="skip" href="#workspace-main">Skip to workspace</a>
    {!entry && <aside className="workspace-sidebar">
      <Link href="/" className="brand"><span className="brand-icon">i</span> IssueScout</Link>
      <button className="workspace-menu" aria-expanded={menu} aria-controls="workspace-navigation" onClick={() => setMenu(!menu)}>{menu ? "Close menu" : "Menu"}</button>
      <nav id="workspace-navigation" className={menu ? "open" : ""} aria-label="Workspace navigation">
        <span className="workspace-nav-label">YOUR WORKSPACE</span>
        {links.map(([href, label]) => !href ? <span key={label} className="sidebar-pending" aria-disabled="true">Report<small>Create a report or open one from History</small></span> : <Link key={href} href={href} onClick={() => setMenu(false)} aria-current={path === href ? "page" : undefined}>{label}</Link>)}
      </nav>
      <div className="workspace-sidebar-bottom"><Link className="sidebar-help" href={demo ? "/demo/guide" : "/guide"}>How to use IssueScout</Link><span className="workspace-badge">{demo ? "Sample workspace" : "Your workspace"}</span><p>Research only.<br />You decide what changes.</p><Link href={demo ? "/signin" : "/demo/report"}>{demo ? "Sign in for a real report" : "See sample"}</Link></div>
    </aside>}
    <div className="workspace-body"><header className="workspace-topbar">{entry ? <Link href="/" className="brand">IssueScout</Link> : <span>{demo ? "Try the experience" : "Issue research workspace"}</span>}<div>{user ? <><span className="session-email">{user.email}</span><button className="workspace-signout" onClick={logout} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button></> : <><Link href={path === "/signin" ? "/signup" : "/signin"}>{path === "/signin" ? "Sign up" : "Sign in"}</Link>{entry && <Link href="/demo/report">See sample</Link>}</>}</div></header>
    {error && <p className="workspace-alert" role="alert">{error}</p>}
    {demo && path !== "/demo/report" && <div className="demo-banner"><strong>Sample mode</strong> Prepared examples, not live research. Sign in to research your own issue.</div>}
    <main key={path} className="workspace-main" id="workspace-main">{children}</main>
    <footer className="workspace-footer"><span>IssueScout · Built by Ivaylo & Jonathan</span><button className="motion-toggle" aria-pressed={motion} onClick={() => setMotion(!motion)}>{motion ? "Pause" : "Enable"} animations</button><Link href={demo ? "/demo/guide" : "/guide"}>Help</Link><Link href="/trust">Trust & safety</Link></footer></div>
  </div></SessionContext.Provider>;
}
