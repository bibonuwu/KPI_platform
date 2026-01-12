import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      nav("/");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{paddingTop: 40}}>
      <div className="card" style={{maxWidth: 480, margin:"0 auto"}}>
        <h2>Вход</h2>
        {err && <div className="error">{err}</div>}
        <form onSubmit={onSubmit} className="stack">
          <div>
            <label>Email</label>
            <input className="input" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div>
            <label>Пароль</label>
            <input className="input" type="password" value={pass} onChange={e=>setPass(e.target.value)} />
          </div>
          <button className="btn" disabled={busy}>{busy ? "Входим..." : "Войти"}</button>
        </form>
</div>
    </div>
  );
}
