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
  useEffect(() => {
    const auth = clientAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, value => { setUser(value); setLoading(false); }, () => { setError("Your session could not be checked. Please reload."); setLoading(false); });
  }, []);
  async function logout() {
    try { const auth = clientAuth(); if (auth) await signOut(auth); router.push("/signin"); }
    catch { setError("Could not sign out. Please try again."); }
  }
  const links = [[demo ? "/demo" : "/workspace", "New report"], [demo ? "/demo/history" : "/runs", "Report history"], [demo ? "/demo/guide" : "/guide", "How to use IssueScout"]];
  return <SessionContext.Provider value={{ user, loading }}><div className={`workspace-app editorial ${motion ? "motion-on" : "motion-off"}`}><a className="skip" href="#workspace-main">Skip to workspace</a>
    <aside className="workspace-sidebar">
      <Link href="/" className="brand"><span className="brand-icon">i</span> IssueScout</Link>
      <button className="workspace-menu" aria-expanded={menu} aria-controls="workspace-navigation" onClick={() => setMenu(!menu)}>{menu ? "Close menu" : "Menu"}</button>
      <nav id="workspace-navigation" className={menu ? "open" : ""} aria-label="Workspace navigation">
        <span className="workspace-nav-label">YOUR WORKSPACE</span>
        {links.map(([href, label]) => <Link key={href} href={href} onClick={() => setMenu(false)} aria-current={path === href ? "page" : undefined}>{label}</Link>)}
      </nav>
      <div className="workspace-sidebar-bottom"><span className="workspace-badge">{demo ? "Sample workspace" : "Your workspace"}</span><p>Research only.<br />You decide what changes.</p><Link href={demo ? "/signin" : "/demo"}>{demo ? "Sign in for a real report" : "Explore sample workspace"}</Link></div>
    </aside>
    <div className="workspace-body"><header className="workspace-topbar"><span>{demo ? "Try the experience" : "Issue research workspace"}</span><div>{user ? <><span className="session-email">{user.email}</span><button onClick={logout}>Sign out</button></> : <Link href="/signin">Sign in</Link>}</div></header>
    {error && <p className="workspace-alert" role="alert">{error}</p>}
    {demo && <div className="demo-banner"><strong>Sample mode</strong> Illustrative data only. No GitHub requests, no saved runs.</div>}
    <main key={path} className="workspace-main" id="workspace-main">{children}</main>
    <footer className="workspace-footer"><span>IssueScout · Built by Ivaylo & Jonathan</span><button className="motion-toggle" aria-pressed={motion} onClick={() => setMotion(!motion)}>{motion ? "Pause" : "Enable"} animations</button><Link href="/trust">Trust & safety</Link></footer></div>
  </div></SessionContext.Provider>;
}
