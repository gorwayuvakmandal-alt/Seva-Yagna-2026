import Nav from "@/components/nav";
import AttendanceForm from "./attendance-form";

export const dynamic = "force-dynamic";

export default function AttendancePage() {
  return (
    <>
      <Nav />
      <main className="container">
        <div className="attendance-page-shell">
          <div className="page-heading">
            <div>
              <h1>Mark Yuvak Attendance</h1>
              <p className="muted">Select the Xetra and Mandal, then record the Yuvak&apos;s presence.</p>
            </div>
            <div className="live-pill">
              <span className="live-dot" />Live Attendance
            </div>
          </div>
          <AttendanceForm />
        </div>
      </main>
    </>
  );
}
