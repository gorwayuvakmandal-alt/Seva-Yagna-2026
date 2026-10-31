"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.replace("/attendance"); router.refresh();
  }
  return <form className="form-fields" onSubmit={submit}>
    <label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" placeholder="volunteer@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
    <label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" placeholder="Enter your password" required value={password} onChange={e => setPassword(e.target.value)} />
    {error && <p className="alert error" role="alert">{error}</p>}
    <button className="primary-btn" disabled={loading} type="submit">{loading ? "Signing in…" : "Sign in"}</button>
  </form>;
}
