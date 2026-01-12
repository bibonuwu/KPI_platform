import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { collection, doc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";

export default function AdminUsers() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [qText, setQText] = useState("");

  async function load() {
    setErr(""); setOk("");
    try {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setRows(snap.docs.map(d => d.data()));
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function setRole(uid, role) {
    setErr(""); setOk("");
    try {
      await updateDoc(doc(db, "users", uid), { role });
      setOk(`Роль обновлена: ${uid} → ${role}`);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  const filtered = useMemo(() => {
    const t = qText.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(u =>
      (u.displayName || "").toLowerCase().includes(t) ||
      (u.email || "").toLowerCase().includes(t) ||
      (u.school || "").toLowerCase().includes(t) ||
      (u.subject || "").toLowerCase().includes(t)
    );
  }, [rows, qText]);

  return (
    <div className="container">
      <div className="card">
        <div className="row" style={{alignItems:"center"}}>
          <h2 style={{marginBottom:0}}>Админ: учителя и роли</h2>
          <div style={{marginLeft:"auto", minWidth: 260, flex:"1 1 260px"}}>
            <input className="input" placeholder="Поиск: ФИО / email / школа / предмет" value={qText} onChange={(e)=>setQText(e.target.value)} />
          </div>
          <button className="btn secondary" onClick={load}>Обновить</button>
        </div>

        {err && <div className="error" style={{marginTop:12}}>{err}</div>}
        {ok && <div className="success" style={{marginTop:12}}>{ok}</div>}

        <div style={{overflowX:"auto", marginTop: 12}}>
          <table className="table" style={{minWidth: 1100}}>
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Школа</th>
                <th>Предмет</th>
                <th>Email</th>
                <th>UID</th>
                <th>Баллы</th>
                <th>Роль</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.uid}>
                  <td><b>{u.displayName || "—"}</b></td>
                  <td><small className="muted">{u.school || "—"}</small></td>
                  <td><small className="muted">{u.subject || "—"}</small></td>
                  <td><small className="muted">{u.email}</small></td>
                  <td><small className="muted">{u.uid}</small></td>
                  <td><b>{u.totalPoints ?? 0}</b></td>
                  <td><span className="badge">{u.role}</span></td>
                  <td style={{whiteSpace:"nowrap"}}>
                    <Link className="badge" to={`/admin/teacher/${u.uid}`}>Профиль/достижения</Link>{" "}
                    <button className="btn secondary" onClick={()=>setRole(u.uid, "teacher")}>teacher</button>{" "}
                    <button className="btn" onClick={()=>setRole(u.uid, "admin")}>admin</button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan="8"><small className="muted">Пользователей пока нет.</small></td></tr>
              )}
            </tbody>
          </table>
        </div>

        <hr />
        <small className="muted">
          Регистрации на сайте нет — аккаунты создавайте в Firebase Authentication вручную, потом пользователь войдёт по email/паролю.
        </small>
      </div>
    </div>
  );
}
