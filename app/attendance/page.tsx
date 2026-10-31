import Nav from "@/components/nav";
import AttendanceForm from "./attendance-form";

export const dynamic = "force-dynamic";

export default function AttendancePage() {
  return (
    <>
      <Nav />
      <main className="container">
        <div className="page-heading">
          <div>
            <p className="eyebrow">SEVA YAGNA 2026</p>
            <h1>Mark Yuvak Attendance</h1>
            <p className="muted">Select the Xetra and Mandal, then record the Yuvak's presence.</p>
          </div>
          <div className="live-pill">
            <span className="live-dot" />Live registration
          </div>
        </div>
        <AttendanceForm />
      </main>
    </>
  );
}
