import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

function isImage(url) {
  return /\.(png|jpg|jpeg|webp)$/i.test(url || "");
}
function isPdf(url) {
  return /\.pdf$/i.test(url || "");
}
function pickEvidence(s) {
  const link = (s.evidenceLink || "").trim();
  const fileUrl = (s.evidenceFileUrl || "").trim();
  const legacy = (s.evidenceUrl || "").trim();

  return {
    link: link || (legacy && !legacy.includes("firebasestorage") ? legacy : ""),
    fileUrl: fileUrl || (legacy && legacy.includes("firebasestorage") ? legacy : ""),
    legacy
  };
}

export default function AdminApprovals() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");

  async function load() {
  setErr("");
  try {
    // Avoid composite index: order by createdAt only, filter status in code
    const q = query(
      collection(db, "submissions"),
      orderBy("createdAt", "desc"),
      limit(200)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setRows(list.filter(x => x.status === "pending"));
  } catch (e) {
    setErr(e.message);
  }
}

  useEffect(() => { load(); }, []);

  async function approve(submission) {
    setBusyId(submission.id);
    setErr("");
    try {
      await runTransaction(db, async (tx) => {
        const subRef = doc(db, "submissions", submission.id);
        const userRef = doc(db, "users", submission.uid);

        const subSnap = await tx.get(subRef);
        if (!subSnap.exists()) throw new Error("Заявка не найдена");
        const sub = subSnap.data();
        if (sub.status !== "pending") throw new Error("Заявка уже обработана");

        const userSnap = await tx.get(userRef);
        if (!userSnap.exists()) throw new Error("Пользователь не найден");

        const curPoints = userSnap.data().totalPoints ?? 0;
        const add = sub.points ?? 0;

        tx.update(subRef, {
          status: "approved",
          decidedAt: serverTimestamp(),
          decidedBy: user.uid
        });
        tx.update(userRef, { totalPoints: curPoints + add });
      });

      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId("");
    }
  }

  async function reject(submission) {
    setBusyId(submission.id);
    setErr("");
    try {
      await runTransaction(db, async (tx) => {
        const subRef = doc(db, "submissions", submission.id);
        const subSnap = await tx.get(subRef);
        if (!subSnap.exists()) throw new Error("Заявка не найдена");
        const sub = subSnap.data();
        if (sub.status !== "pending") throw new Error("Заявка уже обработана");

        tx.update(subRef, {
          status: "rejected",
          decidedAt: serverTimestamp(),
          decidedBy: user.uid
        });
      });

      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="container">
      <div className="card">
        <div className="row" style={{alignItems:"center"}}>
          <h2 style={{marginBottom:0}}>Админ: заявки</h2>
          <button className="btn secondary" style={{marginLeft:"auto"}} onClick={load}>Обновить</button>
        </div>

        {err && <div className="error" style={{marginTop:12}}>{err}</div>}

        <div style={{overflowX:"auto", marginTop: 12}}>
          <table className="table" style={{minWidth: 900}}>
            <thead>
              <tr>
                <th>UID</th>
                <th>Тип / Название</th>
                <th>Баллы</th>
                <th>Доказательство</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(s => (
                <tr key={s.id}>
                  <td><small className="muted">{s.uid}</small></td>
                  <td>
                    <div className="badge">{s.typeName || s.typeId}</div>
                    <div style={{marginTop:6}}><b>{s.title}</b></div>
                    {s.description && <small className="muted">{s.description}</small>}
                  </td>
                  <td><b>{s.points}</b></td>
                  <td>
                    {(pickEvidence(s).fileUrl || pickEvidence(s).link || pickEvidence(s).legacy) ? (
                      <div className="stack" style={{gap:8}}>
                        <a className="badge" href={(pickEvidence(s).fileUrl || pickEvidence(s).link || pickEvidence(s).legacy)} target="_blank" rel="noreferrer">Открыть</a>
                        <small className="muted" style={{maxWidth: 240, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                          {(pickEvidence(s).fileUrl || pickEvidence(s).link || pickEvidence(s).legacy)}
                        </small>
                      </div>
                    ) : (
                      <small className="muted">—</small>
                    )}
                  </td>
                  <td style={{whiteSpace:"nowrap"}}>
                    <button className="btn" disabled={busyId===s.id} onClick={()=>approve(s)}>Подтвердить</button>{" "}
                    <button className="btn secondary" disabled={busyId===s.id} onClick={()=>reject(s)}>Отклонить</button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan="5"><small className="muted">Нет заявок в ожидании.</small></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
