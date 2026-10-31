import Nav from "@/components/nav";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <>
      <Nav />
      <main className="container">
        <div className="page-heading">
          <div>
            <h1>Attendance Dashboard</h1>
            <p className="muted">Xetra-wise and Mandal-wise registration comparison.</p>
          </div>
          <div className="live-pill">
            <span className="live-dot" />Auto-refresh
          </div>
        </div>
        <DashboardClient />
      </main>
    </>
  );
}
