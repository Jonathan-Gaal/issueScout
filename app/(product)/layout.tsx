import { Suspense } from "react";
import WorkspaceShell from "../../components/WorkspaceShell";
export default function Layout({ children }: { children: React.ReactNode }) { return <Suspense fallback={<main style={{ padding: 40 }}><p role="status">Opening your workspace…</p></main>}><WorkspaceShell>{children}</WorkspaceShell></Suspense>; }
