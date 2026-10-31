import Nav from "@/components/nav";
import { requireOperator } from "@/lib/auth";
import DashboardClient from "./dashboard-client";
export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  await requireOperator();
  return <><Nav/><main className="container"><div className="page-heading"><div><p className="eyebrow">SEVA YAGNA 2026</p><h1>Attendance Dashboard</h1><p className="muted">Xetra-wise and Mandal-wise registration comparison.</p></div><div className="live-pill"><span className="live-dot"/>Auto-refresh</div></div><DashboardClient/></main></>;
}
