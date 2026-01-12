import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db, storage } from "../firebase";
import { addDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function AddResult() {
  const { user } = useAuth();

  const [types, setTypes] = useState([]);

  const [section, setSection] = useState("");
  const [subsection, setSubsection] = useState("");
  const [typeId, setTypeId] = useState("");

  const [eventDate, setEventDate] = useState(todayISO());
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const [file, setFile] = useState(null);
  const [link, setLink] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // =====================
  // LOAD TYPES
  // =====================
  async function loadTypes() {
    try {
      const snap = await getDocs(collection(db, "types"));
      setTypes(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(t => t.active)
      );
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    loadTypes();
  }, []);

  // =====================
  // DERIVED DATA
  // =====================
  const sections = useMemo(
    () => [...new Set(types.map(t => t.section))],
    [types]
  );

  const subsections = useMemo(
    () =>
      [...new Set(
        types
          .filter(t => t.section === section)
          .map(t => t.subsection)
      )],
    [types, section]
  );

  const filteredTypes = useMemo(
    () =>
      types.filter(
        t => t.section === section && t.subsection === subsection
      ),
    [types, section, subsection]
  );

  const chosen = useMemo(
    () => filteredTypes.find(t => t.id === typeId),
    [filteredTypes, typeId]
  );

  // =====================
  // FILE UPLOAD
  // =====================
  async function uploadFileIfNeeded() {
    if (!file) return "";
    const path = `evidence/${user.uid}/${Date.now()}_${safeName(file.name)}`;
    const r = ref(storage, path);
    await uploadBytes(r, file);
    return await getDownloadURL(r);
  }

  // =====================
  // SUBMIT
  // =====================
  async function submit(e) {
    e.preventDefault();
    setErr(""); setOk("");

    if (!section || !subsection || !typeId) {
      return setErr("Выберите раздел, подраздел и тип");
    }
    if (!title.trim()) return setErr("Введите название");

    setBusy(true);
    try {
      const fileUrl = await uploadFileIfNeeded();

      await addDoc(collection(db, "submissions"), {
        uid: user.uid,

        typeId,
        typeName: chosen.name,
        typeSection: chosen.section,
        typeSubsection: chosen.subsection,
        points: chosen.defaultPoints,

        title: title.trim(),
        description: desc.trim(),
        eventDate,

        evidenceLink: link.trim(),
        evidenceFileUrl: fileUrl,
        evidenceUrl: fileUrl || link.trim(),

        status: "pending",
        createdAt: serverTimestamp()
      });

      setOk("Заявка отправлена");
      setTitle("");
      setDesc("");
      setLink("");
      setFile(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  // =====================
  // UI
  // =====================
  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 800 }}>
        <h2>Добавить достижение</h2>

        {err && <div className="error">{err}</div>}
        {ok && <div className="success">{ok}</div>}

        <form onSubmit={submit} className="stack">

          {/* SECTION */}
          <div>
            <label>Раздел</label>
            <select
              className="input"
              value={section}
              onChange={e => {
                setSection(e.target.value);
                setSubsection("");
                setTypeId("");
              }}
            >
              <option value="">— Выберите —</option>
              {sections.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* SUBSECTION */}
          {section && (
            <div>
              <label>Подраздел</label>
              <select
                className="input"
                value={subsection}
                onChange={e => {
                  setSubsection(e.target.value);
                  setTypeId("");
                }}
              >
                <option value="">— Выберите —</option>
                {subsections.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* TYPE */}
          {subsection && (
            <div>
              <label>Тип достижения</label>
              <select
                className="input"
                value={typeId}
                onChange={e => setTypeId(e.target.value)}
              >
                <option value="">— Выберите —</option>
                {filteredTypes.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.defaultPoints} балл(ов)
                  </option>
                ))}
              </select>
            </div>
          )}

          {chosen && (
            <div className="badge">
              Баллы: <b>{chosen.defaultPoints}</b>
            </div>
          )}

          <div>
            <label>Дата достижения</label>
            <input
              className="input"
              type="date"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
            />
          </div>

          <div>
            <label>Название</label>
            <input
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label>Описание</label>
            <textarea
              className="input"
              rows="3"
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          <div>
            <label>Ссылка (необязательно)</label>
            <input
              className="input"
              value={link}
              onChange={e => setLink(e.target.value)}
            />
          </div>

          <div>
            <label>Файл (PDF / JPG / PNG)</label>
            <input
              className="input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <button className="btn" disabled={busy}>
            {busy ? "Отправка..." : "Отправить"}
          </button>
        </form>
      </div>
    </div>
  );
}