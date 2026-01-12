import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { db } from "../firebase";
import { collection, doc, getDoc, getDocs, query, where, limit } from "firebase/firestore";

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

export default function AdminTeacher() {
  const { uid } = useParams();
  const [teacher, setTeacher] = useState(null);
  const [subs, setSubs] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setErr("");
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (!snap.exists()) throw new Error("Учитель не найден");
        setTeacher(snap.data());

        const q = query(collection(db, "submissions"), where("uid", "==", uid), limit(300));
        const s = await getDocs(q);
        const list = s.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const ta = (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
          const tb = (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
          return tb - ta;
        });
        setSubs(list);
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, [uid]);

  const stats = useMemo(() => {
    const total = subs.reduce((a, x) => a + ((x.points ?? 0) * (x.status === "approved" ? 1 : 0)), 0);
    const approved = subs.filter(x => x.status === "approved").length;
    const pending = subs.filter(x => x.status === "pending").length;
    return { total, approved, pending };
  }, [subs]);

  return (
    <div className="container">
      <div className="row" style={{alignItems:"center"}}>
        <h2 style={{marginBottom:0}}>Учитель: {teacher?.displayName || uid}</h2>
        <div style={{marginLeft:"auto"}}>
          <Link className="badge" to="/admin/users">← Назад</Link>
        </div>
      </div>

      {err && <div className="error" style={{marginTop:12}}>{err}</div>}

      {teacher && (
        <div className="row" style={{marginTop:12}}>
          <div className="card" style={{flex:"1 1 360px"}}>
            <h3>Профиль</h3>
            <div className="stack" style={{gap:8}}>
              <div><small className="muted">Email</small><div><b>{teacher.email}</b></div></div>
              <div><small className="muted">Школа</small><div><b>{teacher.school || "—"}</b></div></div>
              <div><small className="muted">Предмет</small><div><b>{teacher.subject || "—"}</b></div></div>
              <div><small className="muted">Стаж</small><div><b>{teacher.experienceYears ?? 0}</b> лет</div></div>
              <div><small className="muted">Телефон</small><div><b>{teacher.phone || "—"}</b></div></div>
              <div><small className="muted">Город</small><div><b>{teacher.city || "—"}</b></div></div>
              <div><small className="muted">Должность</small><div><b>{teacher.position || "—"}</b></div></div>
            </div>

            <hr />
            <div className="row" style={{gap:10}}>
              <div className="badge">Баллы: <b>{teacher.totalPoints ?? 0}</b></div>
              <div className="badge">Approved: <b>{stats.approved}</b></div>
              <div className="badge">Pending: <b>{stats.pending}</b></div>
            </div>
          </div>

          <div className="card" style={{flex:"1 1 640px"}}>
            <h3>Достижения / заявки</h3>
            <div style={{overflowX:"auto"}}>
              <table className="table" style={{minWidth: 980}}>
                <thead>
                  <tr>
                    <th>Статус</th>
                    <th>Тип</th>
                    <th>Название</th>
                    <th>Баллы</th>
                    <th>Доказательство</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map(s => (
                    <tr key={s.id}>
                      <td><span className="badge">{s.status}</span></td>
                      <td><small className="muted">{s.typeName || s.typeId}</small></td>
                      <td>
                        <div><b>{s.title}</b></div>
                        {s.description && <small className="muted">{s.description}</small>}
                      </td>
                      <td><b>{s.points ?? 0}</b></td>
                      <td>
                        {(pickEvidence(s).fileUrl || pickEvidence(s).link || pickEvidence(s).legacy) ? (
                          <div className="stack" style={{gap:8}}>
                            <a className="badge" href={(pickEvidence(s).fileUrl || pickEvidence(s).link || pickEvidence(s).legacy)} target="_blank" rel="noreferrer">Открыть</a>
                            <small className="muted" style={{maxWidth: 260, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                              {(pickEvidence(s).fileUrl || pickEvidence(s).link || pickEvidence(s).legacy)}
                            </small>
                            {isImage(pickEvidence(s).fileUrl || pickEvidence(s).link || pickEvidence(s).legacy) && (
                              <a href={(pickEvidence(s).fileUrl || pickEvidence(s).link || pickEvidence(s).legacy)} target="_blank" rel="noreferrer">
                                <img src={(pickEvidence(s).fileUrl || pickEvidence(s).link || pickEvidence(s).legacy)} alt="evidence" style={{maxWidth: 180, borderRadius: 12, border:"1px solid #e7e8ee"}} />
                              </a>
                            )}
                            {isPdf(pickEvidence(s).fileUrl || pickEvidence(s).link || pickEvidence(s).legacy) && <small className="muted">PDF файл</small>}
                          </div>
                        ) : (
                          <small className="muted">—</small>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!subs.length && (
                    <tr><td colSpan="5"><small className="muted">У учителя пока нет заявок.</small></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
