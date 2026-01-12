import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";


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

export default function Profile() {
  const { user, profile, role } = useAuth();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [bootstrapInfo, setBootstrapInfo] = useState({ checked: false, exists: true });
  const [bootBusy, setBootBusy] = useState(false);

  const [form, setForm] = useState({
    displayName: "",
    school: "",
    subject: "",
    experienceYears: 0,
    phone: "",
    city: "",
    position: ""
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      displayName: profile.displayName ?? "",
      school: profile.school ?? "",
      subject: profile.subject ?? "",
      experienceYears: profile.experienceYears ?? 0,
      phone: profile.phone ?? "",
      city: profile.city ?? "",
      position: profile.position ?? ""
    });
  }, [profile]);

  useEffect(() => {
  (async () => {
    if (!user) return;
    setErr("");
    try {
      // Avoid composite index: fetch by uid only, then sort in code
      const q = query(
        collection(db, "submissions"),
        where("uid", "==", user.uid),
        limit(100)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tb - ta;
      });
      setItems(list.slice(0, 10));
    } catch (e) {
      setErr(e.message);
    }
  })();
}, [user?.uid]);

  // check if config/app exists (to allow "first admin" bootstrap)
  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "config", "app"));
        setBootstrapInfo({ checked: true, exists: snap.exists() });
      } catch {
        setBootstrapInfo({ checked: true, exists: true });
      }
    })();
  }, [user?.uid]);

  const totalPoints = useMemo(() => profile?.totalPoints ?? 0, [profile]);

  async function saveProfile(e) {
    e.preventDefault();
    if (!user) return;
    setErr(""); setOk("");
    const experienceYears = Math.max(0, Number(form.experienceYears) || 0);

    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: form.displayName.trim(),
        school: form.school.trim(),
        subject: form.subject.trim(),
        experienceYears,
        phone: form.phone.trim(),
        city: form.city.trim(),
        position: form.position.trim()
      });
      setOk("Профиль сохранён.");
    } catch (e) {
      setErr(e.message);
    }
  }

  async function claimFirstAdmin() {
    if (!user) return;
    setErr(""); setOk("");
    setBootBusy(true);
    try {
      // 1) create config/app (only if it doesn't exist)
      await setDoc(doc(db, "config", "app"), {
        bootstrapClaimed: true,
        claimedBy: user.uid,
        claimedAt: serverTimestamp()
      });

      // 2) promote yourself to admin (rules allow only for claimedBy)
      await updateDoc(doc(db, "users", user.uid), { role: "admin" });

      setOk("Готово! Вы стали администратором. Откройте «Админ: типы» и добавьте типы достижений.");
      setBootstrapInfo({ checked: true, exists: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBootBusy(false);
    }
  }

  const canBootstrap = bootstrapInfo.checked && !bootstrapInfo.exists && role !== "admin";

  return (
    <div className="container">
      <div className="row">
        <div className="card" style={{flex: "1 1 420px"}}>
          <h2>Профиль</h2>

          <div className="row" style={{alignItems:"center"}}>
            <div>
              <div><b>{profile?.displayName || "Без имени"}</b></div>
              <small className="muted">{profile?.email}</small>
            </div>
            <div style={{marginLeft:"auto"}}>
              <div className="badge">Баллы: <b>{totalPoints}</b></div>
            </div>
          </div>

          <hr />

          {canBootstrap && (
            <div className="card" style={{borderStyle:"dashed", background:"#fcfdff"}}>
              <b>Первый запуск</b>
              <div><small className="muted">
                В базе ещё нет администратора. Нажмите кнопку ниже, чтобы назначить себя первым админом.
              </small></div>
              <div style={{marginTop:10}}>
                <button className="btn" onClick={claimFirstAdmin} disabled={bootBusy}>
                  {bootBusy ? "Назначаем..." : "Сделать меня администратором"}
                </button>
              </div>
              <div style={{marginTop:8}}>
                <small className="muted">
                  После этого создайте типы достижений в разделе «Админ: типы».
                </small>
              </div>
            </div>
          )}

          {err && <div className="error" style={{marginTop:12}}>{err}</div>}
          {ok && <div className="success" style={{marginTop:12}}>{ok}</div>}

          <form onSubmit={saveProfile} className="stack" style={{marginTop: 12}}>
            <div>
              <label>ФИО</label>
              <input className="input" value={form.displayName}
                     onChange={(e)=>setForm(s=>({...s, displayName: e.target.value}))} />
            </div>

            <div className="grid2">
              <div>
                <label>Школа</label>
                <input className="input" value={form.school}
                       onChange={(e)=>setForm(s=>({...s, school: e.target.value}))} />
              </div>
              <div>
                <label>Город</label>
                <input className="input" value={form.city}
                       onChange={(e)=>setForm(s=>({...s, city: e.target.value}))} />
              </div>
            </div>

            <div className="grid2">
              <div>
                <label>Предмет</label>
                <input className="input" value={form.subject}
                       onChange={(e)=>setForm(s=>({...s, subject: e.target.value}))} />
              </div>
              <div>
                <label>Стаж (лет)</label>
                <input className="input" type="number" min="0" value={form.experienceYears}
                       onChange={(e)=>setForm(s=>({...s, experienceYears: e.target.value}))} />
              </div>
            </div>

            <div className="grid2">
              <div>
                <label>Должность</label>
                <input className="input" value={form.position}
                       onChange={(e)=>setForm(s=>({...s, position: e.target.value}))} />
              </div>
              <div>
                <label>Телефон</label>
                <input className="input" value={form.phone}
                       onChange={(e)=>setForm(s=>({...s, phone: e.target.value}))} />
              </div>
            </div>

            <button className="btn">Сохранить профиль</button>
          </form>

          <hr />
          <small className="muted">
            Если профиль раньше “сбрасывался” после перезахода — это исправлено.
          </small>
        </div>

        <div className="card" style={{flex: "1 1 600px"}}>
          <h2>Последние заявки</h2>
          {err && <div className="error">{err}</div>}

          <div style={{overflowX:"auto"}}>
            <table className="table" style={{minWidth: 980}}>
              <thead>
                <tr>
                  <th>Тип</th>
                  <th>Название</th>
                  <th>Баллы</th>
                  <th>Статус</th>
                  <th>Доказательство</th>
                </tr>
              </thead>
              <tbody>
                {items.map(x => (
                  <tr key={x.id}>
                    <td>{x.typeName || x.typeId}</td>
                    <td>
                      <div><b>{x.title}</b></div>
                      {x.description && <small className="muted">{x.description}</small>}
                    </td>
                    <td><b>{x.points}</b></td>
                    <td><span className="badge">{x.status}</span></td>
                    <td>
                      {(pickEvidence(x).fileUrl || pickEvidence(x).link || pickEvidence(x).legacy) ? (
                        <div className="stack" style={{gap:8}}>
                          <a className="badge" href={(pickEvidence(x).fileUrl || pickEvidence(x).link || pickEvidence(x).legacy)} target="_blank" rel="noreferrer">Открыть</a>
                          <small className="muted" style={{maxWidth: 260, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                            {(pickEvidence(x).fileUrl || pickEvidence(x).link || pickEvidence(x).legacy)}
                          </small>
                          {isImage(pickEvidence(x).fileUrl || pickEvidence(x).link || pickEvidence(x).legacy) && (
                            <a href={(pickEvidence(x).fileUrl || pickEvidence(x).link || pickEvidence(x).legacy)} target="_blank" rel="noreferrer">
                              <img src={(pickEvidence(x).fileUrl || pickEvidence(x).link || pickEvidence(x).legacy)} alt="evidence" style={{maxWidth: 140, borderRadius: 12, border:"1px solid #e7e8ee"}} />
                            </a>
                          )}
                          {isPdf(pickEvidence(x).fileUrl || pickEvidence(x).link || pickEvidence(x).legacy) && <small className="muted">PDF файл</small>}
                        </div>
                      ) : (
                        <small className="muted">—</small>
                      )}
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr><td colSpan="5"><small className="muted">Пока нет заявок.</small></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
