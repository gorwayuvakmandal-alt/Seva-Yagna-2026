import Nav from "@/components/nav";
import MandalAttendanceClient from "./mandal-attendance-client";

export const dynamic = "force-dynamic";

export default async function MandalAttendancePage({
  params,
}: {
  params: Promise<{ mandalId: string }>;
}) {
  const { mandalId } = await params;

  return (
    <>
      <Nav />
      <main className="container">
        <MandalAttendanceClient mandalId={mandalId} />
      </main>
    </>
  );
}

