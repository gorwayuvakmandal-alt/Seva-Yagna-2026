import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  return NextResponse.json(
    { rows: data, updatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
