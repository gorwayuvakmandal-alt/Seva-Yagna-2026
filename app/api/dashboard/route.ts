import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { REGISTERED_TARGETS } from "@/lib/mandals";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await createClient();

  const { data, error } = await db
    .from("mandal_dashboard")
    .select("*")
    .eq("event_id", "seva-yagna-2026")
    .order("sector_id")
    .order("mandal_name");

  if (error) {
    return NextResponse.json({ error: "Dashboard could not be loaded." }, { status: 500 });
  }

  const rows = (data || []).map((row: any) => {
    const registered = REGISTERED_TARGETS[row.mandal_id] ?? 0;
    const present = Number(row.present_total || 0);
    const pct = registered > 0 ? Number(((present / registered) * 100).toFixed(1)) : 0;
    return {
      ...row,
      registered_total: registered,
      present_total: present,
      attendance_pct: pct,
    };
  });

  return NextResponse.json(
    { rows, updatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
