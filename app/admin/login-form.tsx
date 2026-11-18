"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [error, submit, pending] = useActionState(login, "");

  return <form action={submit} className="admin-panel login">
    <label>Password <input name="password" type="password" autoComplete="current-password" required /></label>
    {error && <p role="alert">{error}</p>}
    <button className="admin-button" disabled={pending}>{pending ? "Memeriksa…" : "Masuk"}</button>
  </form>;
}
