import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";

export default function Rating() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [qText, setQText] = useState("");

  useEffect(() => {
    (async () => {
      setErr("");
      try {
        const q = query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(100));
        const snap = await getDocs(q);
        const all = snap.docs.map(d => d.data());
        // Админы не участвуют в рейтинге
        setRows(all.filter(u => (u.role ?? 'teacher') !== 'admin'));
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const t = qText.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(u =>
      (u.displayName || "").toLowerCase().includes(t) ||
      (u.school || "").toLowerCase().includes(t) ||
      (u.subject || "").toLowerCase().includes(t)
    );
  }, [rows, qText]);

  return (
    <div className="container">
      <div className="card">
        <div className="row" style={{alignItems:"center"}}>
          <h2 style={{marginBottom:0}}>Рейтинг преподавателей</h2>
          <div style={{marginLeft:"auto", minWidth: 240, flex:"1 1 240px"}}>
            <input className="input" placeholder="Поиск: ФИО / школа / предмет" value={qText} onChange={(e)=>setQText(e.target.value)} />
          </div>
        </div>

        {err && <div className="error" style={{marginTop:12}}>{err}</div>}

        <div style={{overflowX:"auto", marginTop: 12}}>
          <table className="table" style={{minWidth: 760}}>
            <thead>
              <tr>
                <th>#</th>
                <th>ФИО</th>
                <th>Школа</th>
                <th>Предмет</th>
                <th>Стаж</th>
                <th>Баллы</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.uid || i}>
                  <td><b>{i + 1}</b></td>
                  <td>{u.displayName || "Без имени"}</td>
                  <td><small className="muted">{u.school || "—"}</small></td>
                  <td><small className="muted">{u.subject || "—"}</small></td>
                  <td><small className="muted">{u.experienceYears ?? 0} лет</small></td>
                  <td><b>{u.totalPoints ?? 0}</b></td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan="6"><small className="muted">Ничего не найдено.</small></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
