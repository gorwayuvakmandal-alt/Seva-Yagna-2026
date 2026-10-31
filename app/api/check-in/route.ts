import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EVENT_ID, MANDALS, mandalId, type Sector } from "@/lib/mandals";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const db = await createClient();

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!input || typeof input !== "object") {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const values = input as Record<string, unknown>;
  const sector = values.sector;
  const mandal = values.mandal;
  const name = values.name;
  const registrationId = values.registrationId;

  if (
    typeof sector !== "string" ||
    !(sector in MANDALS) ||
    typeof mandal !== "string" ||
    !MANDALS[sector as Sector].some((item) => mandalId(item) === mandal) ||
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 120 ||
    !(
      registrationId === null ||
      registrationId === undefined ||
      (typeof registrationId === "string" && /^[0-9a-f-]{36}$/i.test(registrationId))
    )
  ) {
    return NextResponse.json(
      { error: "Please supply a valid Xetra, Mandal and name." },
      { status: 400 }
    );
  }

  const { data, error } = await db.rpc("check_in_yuvak", {
    p_event_id: EVENT_ID,
    p_sector_id: sector,
    p_mandal_id: mandal,
    p_full_name: name.trim(),
    p_registration_id: registrationId ?? null,
  });

  if (error) {
    const isNameConflict = error.message.includes("Multiple records");
    return NextResponse.json(
      {
        error: isNameConflict
          ? "Multiple people have this name. Please select the correct existing record."
          : error.message || "Unable to mark attendance. Please check details or contact the administrator.",
      },
      { status: isNameConflict ? 409 : 400 }
    );
  }

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
