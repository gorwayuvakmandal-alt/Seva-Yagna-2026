"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, RefreshCw, UserCheck } from "lucide-react";

type Row = {
  event_id: string;
  sector_id: string;
  mandal_id: string;
  mandal_name: string;
  present_total: number;
};

const groups = ["All Xetras", "VD-1", "VD-2", "VD-3"] as const;
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

  const filtered = useMemo(
    () => (group === "All Xetras" ? rows : rows.filter((r) => r.sector_id === group)),
    [rows, group]
  );

  const totalPresent = useMemo(
    () => filtered.reduce((acc, r) => acc + Number(r.present_total), 0),
    [filtered]
  );

  const categoryRows = useMemo(
    () =>
      groups.slice(1).map((sector) => {
        const items = rows.filter((r) => r.sector_id === sector);
        return {
          sector,
          present: items.reduce((sum, r) => sum + Number(r.present_total), 0),
        };
      }),
    [rows]
  );

  function download() {
    const header = ["Xetra", "Mandal", "Present"];
    const csv = [
      header,
      ...filtered.map((r) => [r.sector_id, r.mandal_name, String(r.present_total)]),
    ]
      .map((line) => line.map((v) => `"${v.replaceAll('"', '""')}"`).join(","))
      .join("\r\n");

    const link = document.createElement("a");
    const href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    link.href = href;
    link.download = `seva-yagna-2026-present-${group.replaceAll(" ", "-").toLowerCase()}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="dashboard-area">
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
            <ArrowDownToLine size={16} /> Export CSV
          </button>
        </div>
      </section>

      <div className="dashboard-status">
        {loading
          ? "Loading attendance…"
          : updated
          ? `Last refreshed at ${updated} · auto-refreshes every 10 seconds`
          : ""}
        {error && <span className="text-error">{error}</span>}
      </div>

      <section className="stat-grid" style={{ gridTemplateColumns: "1fr" }}>
        <div className="stat-card">
          <div className="stat-title">
            <span>Total Present Yuvaks ({group})</span>
            <UserCheck size={24} />
          </div>
          <strong style={{ fontSize: "40px", color: "var(--primary-dark)" }}>
            {number(totalPresent)}
          </strong>
          <small>Recorded attendance count</small>
        </div>
      </section>

      {group === "All Xetras" && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Xetra summary</h2>
              <p className="muted">VD-1, VD-2 and VD-3</p>
            </div>
          </div>
          <div className="area-grid">
            {categoryRows.map((item) => (
              <button
                className="area-card"
                key={item.sector}
                onClick={() => setGroup(item.sector)}
              >
                <div className="area-title">
                  <strong>{item.sector}</strong>
                  <span style={{ fontSize: "17px", fontWeight: "bold" }}>
                    {number(item.present)} present
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Mandal-wise attendance</h2>
            <p className="muted">Click any Mandal to see the list of present Yuvaks.</p>
          </div>
          <span className="count-chip">{filtered.length} Mandals</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: "120px" }}>Xetra</th>
                <th>Mandal</th>
                <th style={{ textAlign: "right", width: "150px" }}>Present</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.mandal_id}>
                  <td>
                    <span className="sector-tag">{r.sector_id}</span>
                  </td>
                  <td className="mandal-cell">
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
                      <span className="view-list-badge">
                        View list →
                      </span>
                    </Link>
                  </td>
                  <td
                    className="present-cell"
                    style={{
                      textAlign: "right",
                      fontSize: "17px",
                      fontWeight: 750,
                    }}
                  >
                    <Link
                      href={`/dashboard/${r.mandal_id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      {number(Number(r.present_total))}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
