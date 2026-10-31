import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireOperator() {
  const db = await createClient();
  const { data: { claims }, error } = await db.auth.getClaims();
  if (error || !claims?.sub) redirect("/login");
  const { data: operator, error: profileError } = await db
    .from("app_users")
    .select("role")
    .eq("user_id", claims.sub)
    .maybeSingle();
  if (profileError || !operator) redirect("/login?not_authorized=1");
  return { db, operator };
}
