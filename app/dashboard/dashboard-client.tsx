"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, RefreshCw, UserCheck, Users, Percent, Layers } from "lucide-react";

type Row = {
  event_id: string;
  sector_id: string;
  mandal_id: string;
  mandal_name: string;
  present_total: number;
  registered_total: number;
  attendance_pct: number;
};

const SECTORS = ["VD-1", "VD-2", "VD-3"] as const;
const groups = ["All Xetras", ...SECTORS] as const;
const number = (value: number) => value.toLocaleString("en-IN");

export default function DashboardClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [group, setGroup] = useState<(typeof groups)[number]>("All Xetras");
  const [updated, setUpdated] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to refresh attendance data.");
      const data = await response.json();
      setRows(data.rows ?? []);
      setUpdated(new Date(data.updatedAt).toLocaleTimeString("en-IN", { timeStyle: "medium" }));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to refresh");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const totalRegistered = useMemo(
    () => rows.reduce((acc, r) => acc + Number(r.registered_total || 0), 0),
    [rows]
  );

  const totalPresent = useMemo(
    () => rows.reduce((acc, r) => acc + Number(r.present_total || 0), 0),
    [rows]
  );

  const overallPct = totalRegistered > 0 ? ((totalPresent / totalRegistered) * 100).toFixed(1) : "0.0";

  // Data grouped by Xetra (VD-1, VD-2, VD-3)
  const sectorData = useMemo(() => {
    return SECTORS.map((sector) => {
      const items = rows.filter((r) => r.sector_id === sector);
      const registered = items.reduce((sum, r) => sum + Number(r.registered_total || 0), 0);
      const present = items.reduce((sum, r) => sum + Number(r.present_total || 0), 0);
      const pct = registered > 0 ? ((present / registered) * 100).toFixed(1) : "0.0";
      return {
        sector,
        items,
        registered,
        present,
        pct,
      };
    });
  }, [rows]);

  const displayedSectors = useMemo(() => {
    return group === "All Xetras"
      ? sectorData
      : sectorData.filter((s) => s.sector === group);
  }, [sectorData, group]);

  // Current view totals (matches selected group)
  const viewRegistered = useMemo(() => {
    return displayedSectors.reduce((acc, s) => acc + s.registered, 0);
  }, [displayedSectors]);

  const viewPresent = useMemo(() => {
    return displayedSectors.reduce((acc, s) => acc + s.present, 0);
  }, [displayedSectors]);

  const viewPct = viewRegistered > 0 ? ((viewPresent / viewRegistered) * 100).toFixed(1) : "0.0";

  function download() {
    const header = ["Xetra", "#", "Mandal", "Registered Yuvak", "Present Yuvak", "Attendance %"];
    const csvRows: string[][] = [header];

    displayedSectors.forEach((sec) => {
      sec.items.forEach((r, idx) => {
        csvRows.push([
          sec.sector,
          String(idx + 1),
          r.mandal_name,
          String(r.registered_total || 0),
          String(r.present_total || 0),
          `${(r.attendance_pct || 0).toFixed(1)}%`,
        ]);
      });
      // Subtotal row for this Xetra
      csvRows.push([
        sec.sector,
        "SUBTOTAL",
        `${sec.sector} Total (${sec.items.length} Mandals)`,
        String(sec.registered),
        String(sec.present),
        `${sec.pct}%`,
      ]);
    });

    if (group === "All Xetras") {
      csvRows.push([
        "ALL",
        "GRAND TOTAL",
        "Vadodara (VD-1, VD-2, VD-3)",
        String(totalRegistered),
        String(totalPresent),
        `${overallPct}%`,
      ]);
    }

    const csv = csvRows
      .map((line) => line.map((v) => `"${v.replaceAll('"', '""')}"`).join(","))
      .join("\r\n");

    const link = document.createElement("a");
    const href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    link.href = href;
    link.download = `seva-yagna-2026-attendance-summary-${group.replaceAll(" ", "-").toLowerCase()}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="dashboard-area">
      {/* Top Filter and Actions Toolbar */}
      <section className="toolbar panel">
        <div className="pills" role="group" aria-label="Xetra filter">
          {groups.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setGroup(s)}
              className={`pill ${group === s ? "selected" : ""}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="tool-actions">
          <button className="secondary-btn" onClick={() => void refresh()}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="primary-btn small-btn" onClick={download} disabled={!rows.length}>
            <ArrowDownToLine size={16} /> Export Summary CSV
          </button>
        </div>
      </section>

      {/* Live Refresh Status Banner */}
      <div className="dashboard-status">
        {loading
          ? "Loading attendance summary…"
          : updated
          ? `Last refreshed at ${updated} · auto-refreshes every 10 seconds`
          : ""}
        {error && <span className="text-error">{error}</span>}
      </div>

      {/* 3 Executive KPI Cards */}
      <section className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div className="stat-card">
          <div className="stat-title">
            <span>Registered Yuvaks ({group})</span>
            <Users size={22} style={{ color: "var(--muted)" }} />
          </div>
          <strong style={{ fontSize: "36px", color: "var(--ink)" }}>
            {number(viewRegistered)}
          </strong>
          <small>Target from summary sheet</small>
        </div>

        <div className="stat-card">
          <div className="stat-title">
            <span>Present Yuvaks ({group})</span>
            <UserCheck size={22} />
          </div>
          <strong style={{ fontSize: "36px", color: "var(--primary-dark)" }}>
            {number(viewPresent)}
          </strong>
          <small>Live checked-in count</small>
        </div>

        <div className="stat-card">
          <div className="stat-title">
            <span>Attendance Turnout ({group})</span>
            <Percent size={22} style={{ color: Number(viewPct) >= 50 ? "#047857" : "var(--primary)" }} />
          </div>
          <strong
            style={{
              fontSize: "36px",
              color: Number(viewPct) >= 50 ? "#047857" : "var(--primary)",
            }}
          >
            {viewPct}%
          </strong>
          <small>Present vs registered target</small>
        </div>
      </section>

      {/* Xetra Quick Comparison Cards (when viewing All Xetras) */}
      {group === "All Xetras" && (
        <section className="panel" style={{ padding: "20px 22px" }}>
          <div className="section-heading" style={{ marginBottom: "14px" }}>
            <div>
              <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Layers size={19} style={{ color: "var(--primary)" }} />
                <span>Xetra-wise Attendance Summary</span>
              </h2>
              <p className="muted">Overview across VD-1, VD-2 and VD-3</p>
            </div>
          </div>
          <div className="area-grid">
            {sectorData.map((item) => (
              <button
                className="area-card"
                key={item.sector}
                onClick={() => setGroup(item.sector)}
                style={{ padding: "16px 18px", borderRadius: "12px" }}
              >
                <div className="area-title" style={{ flexDirection: "column", alignItems: "flex-start", gap: "8px", width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                    <span className="sector-tag" style={{ fontSize: "13px", padding: "4px 10px" }}>
                      {item.sector}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 750,
                        padding: "3px 10px",
                        borderRadius: "10px",
                        background: Number(item.pct) >= 50 ? "#ecfdf5" : "#eff6ff",
                        color: Number(item.pct) >= 50 ? "#047857" : "#1d4ed8",
                      }}
                    >
                      {item.pct}%
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "baseline" }}>
                    <div style={{ fontSize: "14px", color: "var(--muted)" }}>
                      <strong style={{ fontSize: "20px", color: "var(--ink)", fontWeight: 800 }}>
                        {number(item.present)}
                      </strong>{" "}
                      / {number(item.registered)} present
                    </div>
                    <small style={{ color: "var(--primary)", fontWeight: 700, fontSize: "12px" }}>
                      {item.items.length} Mandals →
                    </small>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* XETRA-WISE ATTENDANCE TABLES (Separate clear tables for VD-1, VD-2, VD-3) */}
      {displayedSectors.map((sec) => (
        <section className="panel" key={sec.sector} style={{ padding: "0", overflow: "hidden", marginBottom: "24px" }}>
          {/* Xetra Table Header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--line)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              background: "#fafbfd",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="sector-tag" style={{ fontSize: "14px", padding: "5px 12px", fontWeight: 800 }}>
                {sec.sector}
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "var(--ink)" }}>
                  {sec.sector} Mandal Attendance Summary
                </h3>
                <p className="muted" style={{ margin: 0, fontSize: "12.5px" }}>
                  {sec.items.length} Mandals in this Xetra
                </p>
              </div>
            </div>

            {/* Xetra Subtotal Pill */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--line)",
                  padding: "6px 14px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: 650,
                  color: "var(--ink)",
                }}
              >
                <span>Present: </span>
                <strong style={{ color: "var(--primary-dark)", fontSize: "15px" }}>
                  {number(sec.present)}
                </strong>
                <span style={{ color: "var(--muted)" }}> / {number(sec.registered)}</span>
              </div>
              <span
                style={{
                  display: "inline-block",
                  padding: "6px 12px",
                  borderRadius: "10px",
                  fontWeight: 800,
                  fontSize: "13px",
                  color: Number(sec.pct) >= 50 ? "#047857" : "#1d4ed8",
                  background: Number(sec.pct) >= 50 ? "#ecfdf5" : "#eff6ff",
                  border: `1px solid ${Number(sec.pct) >= 50 ? "#a7f3d0" : "#bfdbfe"}`,
                }}
              >
                {sec.pct}% Turnout
              </span>
            </div>
          </div>

          {/* Mandal Table */}
          <div className="table-scroll" style={{ width: "100%", overflowX: "auto", margin: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ width: "60px", textAlign: "center", paddingLeft: "20px" }}>#</th>
                  <th style={{ paddingLeft: "14px" }}>Mandal</th>
                  <th style={{ textAlign: "right", width: "140px" }}>Registered Yuvak</th>
                  <th style={{ textAlign: "right", width: "140px" }}>Present Yuvak</th>
                  <th style={{ textAlign: "right", width: "150px", paddingRight: "20px" }}>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {sec.items.map((r, idx) => {
                  const pct = Number(r.attendance_pct || 0);
                  const badgeColor =
                    pct >= 80 ? "#047857" : pct >= 50 ? "#b45309" : pct > 0 ? "#1d4ed8" : "#64748b";
                  const badgeBg =
                    pct >= 80 ? "#ecfdf5" : pct >= 50 ? "#fef3c7" : pct > 0 ? "#eff6ff" : "#f1f5f9";

                  return (
                    <tr key={r.mandal_id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600, paddingLeft: "20px" }}>
                        {idx + 1}
                      </td>
                      <td className="mandal-cell" style={{ paddingLeft: "14px" }}>
                        <Link
                          href={`/dashboard/${r.mandal_id}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "var(--ink)",
                            fontWeight: 700,
                            textDecoration: "none",
                          }}
                        >
                          <span>{r.mandal_name}</span>
                          <span className="view-list-badge">View list →</span>
                        </Link>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontSize: "15px",
                          color: "#475569",
                          fontWeight: 650,
                        }}
                      >
                        {number(Number(r.registered_total || 0))}
                      </td>
                      <td
                        className="present-cell"
                        style={{
                          textAlign: "right",
                          fontSize: "16px",
                          fontWeight: 800,
                        }}
                      >
                        <Link
                          href={`/dashboard/${r.mandal_id}`}
                          style={{ textDecoration: "none", color: "inherit" }}
                        >
                          {number(Number(r.present_total || 0))}
                        </Link>
                      </td>
                      <td style={{ textAlign: "right", paddingRight: "20px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontWeight: 750,
                            fontSize: "13px",
                            color: badgeColor,
                            background: badgeBg,
                          }}
                        >
                          {pct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Xetra Subtotal Footer Row */}
              <tfoot>
                <tr
                  style={{
                    background: "#f8fafc",
                    borderTop: "2px solid var(--line-strong)",
                    fontWeight: 800,
                  }}
                >
                  <td colSpan={2} style={{ padding: "14px 20px", fontSize: "14.5px", color: "var(--ink)" }}>
                    <span className="sector-tag" style={{ marginRight: "8px" }}>{sec.sector}</span>
                    <span>Subtotal ({sec.items.length} Mandals)</span>
                  </td>
                  <td style={{ textAlign: "right", padding: "14px 18px", fontSize: "15px", color: "var(--ink)" }}>
                    {number(sec.registered)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "14px 18px",
                      fontSize: "16px",
                      color: "var(--primary-dark)",
                      fontWeight: 850,
                    }}
                  >
                    {number(sec.present)}
                  </td>
                  <td style={{ textAlign: "right", padding: "14px 20px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 12px",
                        borderRadius: "12px",
                        fontWeight: 800,
                        fontSize: "13.5px",
                        color: Number(sec.pct) >= 50 ? "#047857" : "#1d4ed8",
                        background: Number(sec.pct) >= 50 ? "#ecfdf5" : "#eff6ff",
                      }}
                    >
                      {sec.pct}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
