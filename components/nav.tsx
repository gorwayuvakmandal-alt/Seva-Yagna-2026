"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BarChart3, ClipboardCheck, LogOut } from "lucide-react";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <header className="topbar">
      <div className="nav-wrap">
        <Link className="brand" href="/attendance"><span className="brand-symbol">SY</span><span><strong>Seva Yagna 2026</strong><small>Yuvak Attendance Portal</small></span></Link>
        <nav className="nav-links" aria-label="Main navigation">
          <Link className={pathname === "/attendance" ? "active" : ""} href="/attendance"><ClipboardCheck size={17} /> <span>Attendance</span></Link>
          <Link className={pathname === "/dashboard" ? "active" : ""} href="/dashboard"><BarChart3 size={17} /> <span>Dashboard</span></Link>
          <button className="signout" type="button" onClick={logout} title="Sign out"><LogOut size={17} /><span>Log out</span></button>
        </nav>
      </div>
    </header>
  );
}
