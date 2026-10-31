"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardCheck } from "lucide-react";

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <div className="nav-wrap">
        <Link className="brand" href="/attendance">
          <span className="brand-symbol">SY</span>
          <span>
            <strong>Seva Yagna 2026</strong>
            <small>Yuvak Attendance Portal</small>
          </span>
        </Link>
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
