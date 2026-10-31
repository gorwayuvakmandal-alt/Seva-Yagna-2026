"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, RefreshCw, UsersRound, UserCheck, CalendarCheck2, PieChart } from "lucide-react";

type Row = {
  event_id: string;
  sector_id: string;
  mandal_id: string;
  mandal_name: string;
  registered_total: number;
  present_total: number;
  registered_present: number;
  walk_in_present: number;
  attendance_pct: number | string | null;
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
      setRows(data.rows ?? []); setUpdated(new Date(data.updatedAt).toLocaleTimeString("en-IN", { timeStyle: "medium" })); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to refresh"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  const filtered = useMemo(() => group === "All Xetras" ? rows : rows.filter(r => r.sector_id === group), [rows, group]);
  const totals = useMemo(() => filtered.reduce((acc, r) => ({ registered: acc.registered + Number(r.registered_total), present: acc.present + Number(r.present_total), walkIn: acc.walkIn + Number(r.walk_in_present) }), { registered: 0, present: 0, walkIn: 0 }), [filtered]);
  const pct = totals.registered ? Math.round(totals.present * 1000 / totals.registered) / 10 : 0;
  const remaining = Math.max(0, totals.registered - totals.present);
  const categoryRows = useMemo(() => groups.slice(1).map(sector => {
    const items = rows.filter(r => r.sector_id === sector);
    return { sector, registered: items.reduce((sum, r) => sum + Number(r.registered_total), 0), present: items.reduce((sum, r) => sum + Number(r.present_total), 0) };
  }), [rows]);
  function download() {
    const header = ["Xetra", "Mandal", "Registered", "Present", "Pre-registered present", "On-site present", "Attendance %"];
    const csv = [header, ...filtered.map(r => [r.sector_id, r.mandal_name, String(r.registered_total), String(r.present_total), String(r.registered_present), String(r.walk_in_present), String(r.attendance_pct ?? 0)])]
      .map(line => line.map(v => `"${v.replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const link = document.createElement("a"); const href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    link.href = href; link.download = `seva-yagna-2026-${group.replaceAll(" ", "-").toLowerCase()}.csv`; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(href);
  }
  return <div className="dashboard-area">
    <section className="toolbar panel"><div className="pills" role="group" aria-label="Xetra filter">{groups.map(s => <button key={s} type="button" onClick={() => setGroup(s)} className={`pill ${group === s ? "selected" : ""}`}>{s}</button>)}</div><div className="tool-actions"><button className="secondary-btn" onClick={() => void refresh()}><RefreshCw size={16}/> Refresh</button><button className="primary-btn small-btn" onClick={download} disabled={!rows.length}><ArrowDownToLine size={16}/> Export CSV</button></div></section>
    <div className="dashboard-status">{loading ? "Loading attendance…" : updated ? `Last refreshed at ${updated} · refreshes every 10 seconds` : ""}{error && <span className="text-error">{error}</span>}</div>
    <section className="stat-grid"><div className="stat-card"><div className="stat-title"><span>Registered target</span><UsersRound size={20}/></div><strong>{number(totals.registered)}</strong><small>From imported PDF / roster</small></div><div className="stat-card"><div className="stat-title"><span>Present Yuvaks</span><UserCheck size={20}/></div><strong>{number(totals.present)}</strong><small>Includes {number(totals.walkIn)} on-site registrations</small></div><div className="stat-card"><div className="stat-title"><span>Attendance vs target</span><PieChart size={20}/></div><strong>{pct}%</strong><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(pct,100)}%` }}/></div></div><div className="stat-card"><div className="stat-title"><span>Remaining to target</span><CalendarCheck2 size={20}/></div><strong>{number(remaining)}</strong><small>{totals.present > totals.registered ? "Attendance exceeds target" : "Compared with registered target"}</small></div></section>
    {group === "All Xetras" && <section className="panel"><div className="section-heading"><div><h2>Xetra summary</h2><p className="muted">VD-1, VD-2 and VD-3</p></div></div><div className="area-grid">{categoryRows.map(item => { const percent = item.registered ? Math.round(item.present * 1000 / item.registered) / 10 : 0; return <button className="area-card" key={item.sector} onClick={() => setGroup(item.sector)}><div className="area-title"><strong>{item.sector}</strong><span>{percent}%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(percent,100)}%` }}/></div><small>{number(item.present)} present of {number(item.registered)} registered</small></button>; })}</div></section>}
    <section className="panel"><div className="section-heading"><div><h2>Mandal-wise attendance</h2><p className="muted">All 22 Mandals are listed, including those with zero attendance.</p></div><span className="count-chip">{filtered.length} Mandals</span></div><div className="table-scroll"><table><thead><tr><th>Xetra</th><th>Mandal</th><th>Registered</th><th>Present</th><th>On-site</th><th>Attendance %</th></tr></thead><tbody>{filtered.map(r => <tr key={r.mandal_id}><td><span className="sector-tag">{r.sector_id}</span></td><td className="mandal-cell">{r.mandal_name}</td><td>{number(Number(r.registered_total))}</td><td className="present-cell">{number(Number(r.present_total))}</td><td>{number(Number(r.walk_in_present))}</td><td><span className="percent-label">{Number(r.attendance_pct).toFixed(1)}%</span></td></tr>)}</tbody></table></div><p className="table-footnote">The percentage is Present ÷ Registered target × 100. If there are walk-ins, it is a target comparison, not an exact pre-registered turnout rate.</p></section>
  </div>;
}
