import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase";

export default function Register() {
  const nav = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (displayName.trim()) await updateProfile(cred.user, { displayName });
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
        <h2>Регистрация</h2>
        {err && <div className="error">{err}</div>}
        <form onSubmit={onSubmit} className="stack">
          <div>
            <label>ФИО (как отображать)</label>
            <input className="input" value={displayName} onChange={e=>setDisplayName(e.target.value)} />
          </div>
          <div>
            <label>Email</label>
            <input className="input" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div>
            <label>Пароль</label>
            <input className="input" type="password" value={pass} onChange={e=>setPass(e.target.value)} />
          </div>
          <button className="btn" disabled={busy}>{busy ? "Создаём..." : "Создать аккаунт"}</button>
        </form>
        <hr />
        <small className="muted">
          Уже есть аккаунт? <Link to="/login"><b>Вход</b></Link>
        </small>
      </div>
    </div>
  );
}
