"use client";
import { useRef, useState } from "react";
import { CheckCircle2, RefreshCcw } from "lucide-react";
import { MANDALS, type Sector, mandalId } from "@/lib/mandals";

type Notice = { ok: boolean; text: string } | null;

export default function AttendanceForm() {
  const sectorRef = useRef<HTMLSelectElement>(null);
  const [sector, setSector] = useState<Sector | "">("");
  const [mandal, setMandal] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const choices = sector ? MANDALS[sector] : [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sector || !mandal || name.trim().length < 2) return;
    setLoading(true);
    setNotice(null);

    try {
      const response = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sector,
          mandal,
          name: name.trim(),
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Attendance could not be saved.");

      setNotice({ ok: true, text: `${result.name} marked present successfully.` });
      setSector("");
      setMandal("");
      setName("");
      requestAnimationFrame(() => sectorRef.current?.focus());
    } catch (error) {
      setNotice({
        ok: false,
        text: error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setSector("");
    setMandal("");
    setName("");
    setNotice(null);
    requestAnimationFrame(() => sectorRef.current?.focus());
  }

  return (
    <div className="attendance-layout">
      <section className="panel main-panel">
        <div className="panel-head">
          <div className="step-icon">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h2>Attendance entry</h2>
            <p className="muted">Fast check-in for Yuvaks</p>
          </div>
        </div>

        <form className="form-fields" onSubmit={submit}>
          <label htmlFor="sector">
            Xetra <span className="required">*</span>
          </label>
          <select
            id="sector"
            ref={sectorRef}
            autoFocus
            required
            value={sector}
            onChange={(e) => {
              setSector(e.target.value as Sector | "");
              setMandal("");
              setName("");
              setNotice(null);
            }}
          >
            <option value="">Select Xetra</option>
            {Object.keys(MANDALS).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <label htmlFor="mandal">
            Mandal <span className="required">*</span>
          </label>
          <select
            id="mandal"
            required
            disabled={!sector}
            value={mandal}
            onChange={(e) => {
              setMandal(e.target.value);
              setName("");
              setNotice(null);
            }}
          >
            <option value="">{sector ? "Select Mandal" : "Select Xetra first"}</option>
            {choices.map((m) => (
              <option key={m} value={mandalId(m)}>
                {m}
              </option>
            ))}
          </select>

          <label htmlFor="name">
            Yuvak name <span className="required">*</span>
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNotice(null);
            }}
            autoComplete="off"
            required
            minLength={2}
            maxLength={120}
            placeholder="Type Yuvak's full name"
            disabled={!mandal}
          />

          {notice && (
            <p role="status" className={`alert ${notice.ok ? "success" : "error"}`}>
              {notice.text}
            </p>
          )}

          <div className="form-actions">
            <button
              disabled={loading || !sector || !mandal || name.trim().length < 2}
              className="primary-btn"
              type="submit"
            >
              {loading ? "Saving…" : "Mark Present"} <CheckCircle2 size={18} />
            </button>
            <button type="button" className="secondary-btn" onClick={clear}>
              <RefreshCcw size={17} /> Clear
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
