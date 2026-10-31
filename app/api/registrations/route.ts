import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const db = await createClient();
  const { data: claimsData } = await db.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { data: operator } = await db.from("app_users").select("user_id").eq("user_id", claims.sub).maybeSingle();
  if (!operator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(request.url);
  const mandal = url.searchParams.get("mandal") ?? "";
  const query = (url.searchParams.get("q") ?? "").trim();
  if (!/^[a-z0-9-]{2,60}$/.test(mandal) || query.length < 2 || query.length > 100) return NextResponse.json({ registrations: [] });
  const safe = query.replace(/[%,()]/g, "");
  const { data, error } = await db.from("registrations").select("id,full_name,source")
    .eq("event_id", "seva-yagna-2026").eq("mandal_id", mandal).ilike("full_name", `%${safe}%`).limit(8).order("full_name");
  if (error) return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  return NextResponse.json({ registrations: data }, { headers: { "Cache-Control": "no-store" } });
}
