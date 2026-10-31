"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowDownToLine, RefreshCw, Search, Users, Clock } from "lucide-react";

type Yuvak = {
  attendanceId: string;
  registrationId: string;
  fullName: string;
  checkedInAt: string;
};

type Mandal = {
  id: string;
  name: string;
  sector_id: string;
};

export default function MandalAttendanceClient({ mandalId }: { mandalId: string }) {
  const [mandal, setMandal] = useState<Mandal | null>(null);
  const [yuvaks, setYuvaks] = useState<Yuvak[]>([]);
  const [registered, setRegistered] = useState<number>(0);
  const [attendancePct, setAttendancePct] = useState<number>(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/mandal/${encodeURIComponent(mandalId)}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Could not load mandal attendance.");
      const data = await response.json();
      setMandal(data.mandal);
      setYuvaks(data.yuvaks ?? []);
      setRegistered(Number(data.registered || 0));
      setAttendancePct(Number(data.attendancePct || 0));
      setUpdated(
        new Date(data.updatedAt).toLocaleTimeString("en-IN", { timeStyle: "medium" })
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [mandalId]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const filtered = useMemo(() => {
    if (!query.trim()) return yuvaks;
    const q = query.toLowerCase().trim();
    return yuvaks.filter((y) => y.fullName.toLowerCase().includes(q));
  }, [yuvaks, query]);

  function downloadCsv() {
    if (!mandal || !yuvaks.length) return;
    const header = ["#", "Xetra", "Mandal", "Yuvak Name", "Checked In Time"];
    const csv = [
      header,
      ...yuvaks.map((y, idx) => [
        String(idx + 1),
        mandal.sector_id,
        mandal.name,
        y.fullName,
        new Date(y.checkedInAt).toLocaleString("en-IN"),
      ]),
    ]
      .map((line) => line.map((v) => `"${v.replaceAll('"', '""')}"`).join(","))
      .join("\r\n");

    const link = document.createElement("a");
    const href = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
    );
    link.href = href;
    link.download = `${mandal.name}-present-yuvaks.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  function formatTime(iso: string) {
    try {
      return new Date(iso).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="dashboard-area">
      {/* Top action bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <Link href="/dashboard" className="secondary-btn" style={{ textDecoration: "none" }}>
          <ArrowLeft size={16} /> <span>Back to Dashboard</span>
        </Link>
        <div className="tool-actions">
          <button className="secondary-btn" onClick={() => void refresh()}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            className="primary-btn small-btn"
            onClick={downloadCsv}
            disabled={!yuvaks.length}
          >
            <ArrowDownToLine size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Mandal Header Card */}
      <section className="panel" style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <span className="sector-tag" style={{ fontSize: "12.5px", padding: "4px 9px" }}>
                {mandal?.sector_id ?? "Xetra"}
              </span>
              <h1 style={{ fontSize: "26px", margin: 0, fontWeight: 800 }}>
                {mandal?.name ?? "Mandal"}
              </h1>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Present Yuvak attendance list
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid var(--line)",
                padding: "10px 16px",
                borderRadius: "14px",
                textAlign: "right",
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.5px" }}>
                REGISTERED
              </div>
              <div style={{ fontSize: "26px", fontWeight: 850, color: "var(--ink)", lineHeight: 1.1 }}>
                {registered}
              </div>
            </div>

            <div
              style={{
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                padding: "10px 18px",
                borderRadius: "14px",
                textAlign: "right",
              }}
            >
              <div style={{ fontSize: "11px", color: "#047857", fontWeight: 700, letterSpacing: "0.5px" }}>
                TOTAL PRESENT
              </div>
              <div style={{ fontSize: "26px", fontWeight: 850, color: "#047857", lineHeight: 1.1 }}>
                {yuvaks.length}
              </div>
            </div>

            <div
              style={{
                background: attendancePct >= 50 ? "#ecfdf5" : "#fff7ed",
                border: `1px solid ${attendancePct >= 50 ? "#a7f3d0" : "#ffedd5"}`,
                padding: "10px 16px",
                borderRadius: "14px",
                textAlign: "right",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: attendancePct >= 50 ? "#047857" : "#c2410c",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                }}
              >
                TURNOUT %
              </div>
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: 850,
                  color: attendancePct >= 50 ? "#047857" : "#c2410c",
                  lineHeight: 1.1,
                }}
              >
                {attendancePct}%
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Table Card */}
      <section className="panel" style={{ padding: "0", overflow: "hidden" }}>
        {/* Table Toolbar with Search and Count */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "14px",
            flexWrap: "wrap",
            background: "#fafbfd",
          }}
        >
          <div style={{ position: "relative", minWidth: "260px", flex: 1 }}>
            <Search
              size={17}
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              placeholder="Search Yuvak by name in this Mandal…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%",
                paddingLeft: "40px",
                paddingRight: "14px",
                minHeight: "42px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                margin: 0,
                outline: "none",
                background: "#ffffff",
              }}
            />
          </div>

          <span className="count-chip" style={{ fontSize: "12px", padding: "5px 12px" }}>
            <Users size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "5px" }} />
            {filtered.length} {filtered.length === 1 ? "Yuvak" : "Yuvaks"} Present
          </span>
        </div>

        {/* Clean Responsive Table without overflow cutoffs */}
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ width: "60px", textAlign: "center", padding: "12px 14px" }}>#</th>
                <th style={{ padding: "12px 16px" }}>Yuvak Full Name</th>
                <th style={{ textAlign: "right", width: "190px", padding: "12px 18px", whiteSpace: "nowrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <Clock size={14} /> Checked-in Time
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                    {loading
                      ? "Loading records…"
                      : query.trim()
                      ? `No Yuvaks match "${query}".`
                      : "No Yuvaks have been marked present for this Mandal yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((y, idx) => (
                  <tr key={y.attendanceId} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ textAlign: "center", color: "#94a3b8", fontWeight: 600, padding: "14px 14px" }}>
                      {idx + 1}
                    </td>
                    <td className="mandal-cell" style={{ fontSize: "15px", color: "var(--ink)", padding: "14px 16px" }}>
                      {y.fullName}
                    </td>
                    <td style={{ textAlign: "right", color: "#64748b", fontWeight: 600, fontSize: "13px", padding: "14px 18px", whiteSpace: "nowrap" }}>
                      {formatTime(y.checkedInAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Card Footer status */}
        <div style={{ padding: "12px 18px", background: "#f8fafc", borderTop: "1px solid var(--line)", fontSize: "12px", color: "var(--muted)" }}>
          {loading
            ? "Loading…"
            : updated
            ? `Refreshed at ${updated} · auto-refreshes every 10 seconds`
            : ""}
          {error && <span className="text-error" style={{ marginLeft: "10px" }}>{error}</span>}
        </div>
      </section>
    </div>
  );
}
