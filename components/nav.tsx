"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardCheck } from "lucide-react";

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      {/* Sacred Invocatory Header */}
      <div className="sacred-banner">
        <div className="sacred-shloka">|| shri swaminarayano vijayate ||</div>
        <div className="sacred-title">BAPS Swaminarayan Mandir, Atladara - Vadodara</div>
        <div className="sacred-subtitle">Seva Yagna - 2026</div>
      </div>

      {/* Main Navigation Bar */}
      <div className="nav-wrap">
        <div className="nav-portal-label">
          <span className="live-dot" style={{ display: "inline-block", marginRight: "7px" }} />
          <span>Yuvak Attendance Portal</span>
        </div>
        <nav className="nav-links" aria-label="Main navigation">
          <Link className={pathname === "/attendance" ? "active" : ""} href="/attendance">
            <ClipboardCheck size={17} /> <span>Attendance</span>
          </Link>
          <Link className={pathname === "/dashboard" ? "active" : ""} href="/dashboard">
            <BarChart3 size={17} /> <span>Dashboard</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
