"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, UserRoundSearch, Info, RefreshCcw } from "lucide-react";
import { MANDALS, type Sector, mandalId } from "@/lib/mandals";

type Match = { id: string; full_name: string; source: string };
type Notice = { ok: boolean; text: string } | null;
export default function AttendanceForm() {
  const sectorRef = useRef<HTMLSelectElement>(null);
  const [sector, setSector] = useState<Sector | "">("");
  const [mandal, setMandal] = useState("");
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [searching, setSearching] = useState(false);
  const choices = sector ? MANDALS[sector] : [];

  useEffect(() => {
    if (!mandal || name.trim().length < 2 || selectedId) { setMatches([]); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetch(`/api/registrations?mandal=${encodeURIComponent(mandal)}&q=${encodeURIComponent(name.trim())}`, { signal: controller.signal, cache: "no-store" });
        if (res.ok) setMatches((await res.json()).registrations ?? []);
        else setMatches([]);
      } catch { if (!controller.signal.aborted) setMatches([]); }
      finally { if (!controller.signal.aborted) setSearching(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [mandal, name, selectedId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sector || !mandal || name.trim().length < 2) return;
    setLoading(true); setNotice(null);
    try {
      const response = await fetch("/api/check-in", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sector, mandal, name: name.trim(), registrationId: selectedId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Attendance could not be saved.");
      if (result.status === "already_marked") {
        setNotice({ ok: false, text: `${result.name} was already marked present. No duplicate was added.` });
        return;
      }
      setNotice({ ok: true, text: `${result.name} marked present successfully.` });
      setSector(""); setMandal(""); setName(""); setSelectedId(null); setMatches([]);
      requestAnimationFrame(() => sectorRef.current?.focus());
    } catch (error) {
      setNotice({ ok: false, text: error instanceof Error ? error.message : "Something went wrong." });
    } finally { setLoading(false); }
  }
  function clear() {
    setSector(""); setMandal(""); setName(""); setSelectedId(null); setMatches([]); setNotice(null);
    requestAnimationFrame(() => sectorRef.current?.focus());
  }

  return <div className="attendance-layout"><section className="panel main-panel"><div className="panel-head"><div className="step-icon">01</div><div><h2>Attendance entry</h2><p className="muted">One Yuvak at a time · fast check-in</p></div></div>
    <form className="form-fields" onSubmit={submit}>
      <label htmlFor="sector">Xetra <span className="required">*</span></label>
      <select id="sector" ref={sectorRef} autoFocus required value={sector} onChange={e => { setSector(e.target.value as Sector | ""); setMandal(""); setName(""); setSelectedId(null); setNotice(null); }}>
        <option value="">Select Xetra</option>{Object.keys(MANDALS).map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <label htmlFor="mandal">Mandal <span className="required">*</span></label>
      <select id="mandal" required disabled={!sector} value={mandal} onChange={e => { setMandal(e.target.value); setName(""); setSelectedId(null); setNotice(null); }}>
        <option value="">{sector ? "Select Mandal" : "Select Xetra first"}</option>{choices.map(m => <option key={m} value={mandalId(m)}>{m}</option>)}
      </select>
      <div className="label-row"><label htmlFor="name">Yuvak name <span className="required">*</span></label>{searching && <small className="muted">Looking up…</small>}</div>
      <input id="name" value={name} onChange={e => { setName(e.target.value); setSelectedId(null); setNotice(null); }} autoComplete="off" required minLength={2} maxLength={120} placeholder="Type Yuvak's full name" disabled={!mandal} />
      {matches.length > 0 && <div className="matches"><div className="matches-title"><UserRoundSearch size={15} /> Existing registrations (tap to select)</div>{matches.map(match => <button key={match.id} className="match" type="button" onClick={() => { setName(match.full_name); setSelectedId(match.id); setMatches([]); }}>{match.full_name}<small>{match.source === "pre_registered" ? "Pre-registered" : "On-site record"}</small></button>)}</div>}
      {selectedId && <p className="selected-message"><CheckCircle2 size={15}/> Existing registration selected</p>}
      <div className="info-strip"><Info size={17}/><span>If there is no matching registration, a new on-site record is created automatically. If names match multiple people, select the correct record.</span></div>
      {notice && <p role="status" className={`alert ${notice.ok ? "success" : "error"}`}>{notice.text}</p>}
      <div className="form-actions"><button disabled={loading || !sector || !mandal || name.trim().length < 2} className="primary-btn" type="submit">{loading ? "Saving…" : "Mark Present"} <CheckCircle2 size={18}/></button><button type="button" className="secondary-btn" onClick={clear}><RefreshCcw size={17}/> Clear</button></div>
    </form>
  </section><aside className="panel side-panel"><div className="side-icon"><CheckCircle2 size={22}/></div><h2>Quick check-in</h2><p>Optimized for volunteers working on phones, tablets and laptops.</p><ul className="tips"><li>Choose VD-1, VD-2 or VD-3.</li><li>Only Mandals in that Xetra appear.</li><li>Search existing names to prevent duplicate records.</li><li>After a successful check-in, the form resets and Xetra receives focus.</li><li>All signed-in devices save to one database.</li></ul><div className="side-foot">22 Mandals · 3 Xetras</div></aside></div>;
}
