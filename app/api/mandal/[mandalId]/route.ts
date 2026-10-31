import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { REGISTERED_TARGETS } from "@/lib/mandals";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mandalId: string }> }
) {
  const { mandalId } = await params;
  const db = await createClient();

  // 1. Get mandal details
  const { data: mandal, error: mandalError } = await db
    .from("mandals")
    .select("id, name, sector_id")
    .eq("id", mandalId)
    .maybeSingle();

  if (mandalError || !mandal) {
    return NextResponse.json({ error: "Mandal not found." }, { status: 404 });
  }

  // 2. Get all present yuvaks for this mandal
  const { data: attendances, error: attendanceError } = await db
    .from("attendance")
    .select("id, checked_in_at, registrations!inner(id, full_name, mandal_id)")
    .eq("event_id", "seva-yagna-2026")
    .eq("registrations.mandal_id", mandalId)
    .order("checked_in_at", { ascending: false });

  if (attendanceError) {
    return NextResponse.json({ error: "Failed to fetch attendance." }, { status: 500 });
  }

  const yuvaks = (attendances || []).map((item: any) => ({
    attendanceId: item.id,
    registrationId: item.registrations.id,
    fullName: item.registrations.full_name,
    checkedInAt: item.checked_in_at,
  }));

  const registered = REGISTERED_TARGETS[mandalId] ?? 0;
  const attendancePct = registered > 0 ? Number(((yuvaks.length / registered) * 100).toFixed(1)) : 0;

  return NextResponse.json(
    {
      mandal,
      yuvaks,
      count: yuvaks.length,
      registered,
      attendancePct,
      updatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

