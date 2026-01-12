import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  updateDoc,
  doc
} from "firebase/firestore";

/* =====================
   ДЕФОЛТНЫЕ ТИПЫ
===================== */
const DEFAULT_TYPES = [
  // Кәсіби даму
  { section: "Кәсіби даму", subsection: "Семинарлар", name: "Семинарға қатысу (мектепішілік)", defaultPoints: 5 },
  { section: "Кәсіби даму", subsection: "Семинарлар", name: "Семинарға қатысу (аудандық)", defaultPoints: 10 },
  { section: "Кәсіби даму", subsection: "Семинарлар", name: "Семинарға қатысу (облыстық)", defaultPoints: 15 },
  { section: "Кәсіби даму", subsection: "Семинарлар", name: "Халықаралық семинарға қатысу", defaultPoints: 25 },
  { section: "Кәсіби даму", subsection: "Семинарлар", name: "Мастер-класс өткізу", defaultPoints: 20 },

  { section: "Кәсіби даму", subsection: "Курстар", name: "Біліктілік арттыру (72+ сағат)", defaultPoints: 25 },
  { section: "Кәсіби даму", subsection: "Курстар", name: "Қысқа курстар / тренингтер (1-3 күн)", defaultPoints: 5 },
  { section: "Кәсіби даму", subsection: "Курстар", name: "Онлайн курс аяқтау (сертификатпен)", defaultPoints: 10 },
  { section: "Кәсіби даму", subsection: "Курстар", name: "Сертификатталған кәсіби бағдарлама", defaultPoints: 20 },
  { section: "Кәсіби даму", subsection: "Курстар", name: "Педагогикалық зерттеу жүргізу", defaultPoints: 30 },

  { section: "Кәсіби даму", subsection: "Сабақ", name: "Ашық сабақ өткізу", defaultPoints: 20 },
  { section: "Кәсіби даму", subsection: "Сабақ", name: "Интерактив сабақ өткізу", defaultPoints: 15 },
  { section: "Кәсіби даму", subsection: "Сабақ", name: "Сабақты инновациялық әдіспен өткізу", defaultPoints: 25 },
  { section: "Кәсіби даму", subsection: "Сабақ", name: "Сабақ жоспарын жаңарту немесе жетілдіру", defaultPoints: 10 },

  { section: "Кәсіби даму", subsection: "Оқушы жетістігі", name: "Олимпиада жүлдегерін дайындау", defaultPoints: 30 },
  { section: "Кәсіби даму", subsection: "Оқушы жетістігі", name: "Шығармашылық конкурсқа дайындау", defaultPoints: 20 },
  { section: "Кәсіби даму", subsection: "Оқушы жетістігі", name: "Республикалық конкурсқа дайындау", defaultPoints: 35 },
  { section: "Кәсіби даму", subsection: "Оқушы жетістігі", name: "Мектепішілік спорт немесе өнер жетістігіне қолдау көрсету", defaultPoints: 10 },

  // Жеке даму
  { section: "Жеке даму", subsection: "Кітап оқу", name: "Кәсіби кітап оқу (1 кітап)", defaultPoints: 5 },
  { section: "Жеке даму", subsection: "Кітап оқу", name: "Жеке даму / психология кітабы оқу", defaultPoints: 3 },
  { section: "Жеке даму", subsection: "Кітап оқу", name: "Шет тіліндегі кітап оқу", defaultPoints: 5 },
  { section: "Жеке даму", subsection: "Кітап оқу", name: "Апталық оқу челленджін орындау", defaultPoints: 10 },
  { section: "Жеке даму", subsection: "Кітап оқу", name: "Сабаққа қолдануға арналған әдебиет оқу", defaultPoints: 8 },

  { section: "Жеке даму", subsection: "Онлайн оқу", name: "Вебинарға қатысу (сертификатпен)", defaultPoints: 5 },
  { section: "Жеке даму", subsection: "Онлайн оқу", name: "MOOC курс аяқтау (Coursera, EdX)", defaultPoints: 10 },
  { section: "Жеке даму", subsection: "Онлайн оқу", name: "Сертификатталған халықаралық курс", defaultPoints: 20 },
  { section: "Жеке даму", subsection: "Онлайн оқу", name: "Педагогикалық блог немесе мақаланы оқу/жазу", defaultPoints: 5 },

  { section: "Жеке даму", subsection: "Цифрлық дағды", name: "Цифрлық платформа меңгеру", defaultPoints: 10 },
  { section: "Жеке даму", subsection: "Цифрлық дағды", name: "Презентация / видеомонтаж жасау дағдысын меңгеру", defaultPoints: 10 },
  { section: "Жеке даму", subsection: "Цифрлық дағды", name: "Бағдарламалау негізін меңгеру", defaultPoints: 15 },
  { section: "Жеке даму", subsection: "Цифрлық дағды", name: "Онлайн құралдар арқылы сабақ жоспарын автоматтандыру", defaultPoints: 20 },
  { section: "Жеке даму", subsection: "Цифрлық дағды", name: "Мультимедиа сабақ материалдарын жасау", defaultPoints: 15 },

  // Қосымша даму
  { section: "Қосымша даму", subsection: "Марапаттар", name: "Грамота (мектепішілік)", defaultPoints: 5 },
  { section: "Қосымша даму", subsection: "Марапаттар", name: "Грамота (аудандық)", defaultPoints: 10 },
  { section: "Қосымша даму", subsection: "Марапаттар", name: "Грамота (облыстық)", defaultPoints: 15 },
  { section: "Қосымша даму", subsection: "Марапаттар", name: "Мемлекеттік немесе халықаралық марапат", defaultPoints: 25 },
  { section: "Қосымша даму", subsection: "Марапаттар", name: "Кәсіби байқауда жүлде алу", defaultPoints: 30 },

  { section: "Қосымша даму", subsection: "Қоғамдық жұмыс", name: "Іс-шара ұйымдастыру", defaultPoints: 10 },
  { section: "Қосымша даму", subsection: "Қоғамдық жұмыс", name: "Еріктілік / қоғамдық жобада қатысу", defaultPoints: 15 },
  { section: "Қосымша даму", subsection: "Қоғамдық жұмыс", name: "Мектепішілік клуб немесе үйірме ұйымдастыру", defaultPoints: 10 },
  { section: "Қосымша даму", subsection: "Қоғамдық жұмыс", name: "Қоғамдық конференция немесе форумға қатысу", defaultPoints: 20 },
  { section: "Қосымша даму", subsection: "Қоғамдық жұмыс", name: "Жас педагогтарға ментор болу", defaultPoints: 25 },

  // Инновации и творчество
  { section: "Инновациялар", subsection: "Жаңа әдіс", name: "Жаңа сабақ әдісін енгізу", defaultPoints: 20 },
  { section: "Инновациялар", subsection: "Творчество", name: "Шығармашылық жоба жасау", defaultPoints: 25 },
  { section: "Инновациялар", subsection: "Жаңа құрал", name: "Оқыту құралын цифрлық түрде жасау", defaultPoints: 15 },
  { section: "Инновациялар", subsection: "Инновациялық жобалар", name: "Жаңа оқыту платформасын енгізу", defaultPoints: 30 },
  { section: "Инновациялар", subsection: "Инновациялық жобалар", name: "Ғылыми жоба немесе зерттеу жариялау", defaultPoints: 35 }
].map(t => ({ ...t, active: true }));

export default function AdminTypes() {
  const [rows, setRows] = useState([]);

  const [section, setSection] = useState("");
  const [subsection, setSubsection] = useState("");
  const [name, setName] = useState("");
  const [points, setPoints] = useState(0);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  /* =====================
     LOAD WITH INDEX-FALLBACK
     Попытка выполнить составной запрос (нужен composite index).
     Если Firestore вернёт ошибку "requires an index" — делаем fallback:
     загружаем все документы и сортируем на клиенте.
  ===================== */
  async function load() {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      // Попытка — запрос с несколькими orderBy (потребует composite index)
      const q = query(collection(db, "types"), orderBy("section"), orderBy("subsection"), orderBy("name"));
      const snap = await getDocs(q);
      setRows(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    } catch (e) {
      // Если индекс пока строится или отсутствует — fallback
      const msg = (e && e.message) ? e.message.toLowerCase() : "";
      if (msg.includes("requires an index") || msg.includes("index") || msg.includes("composite")) {
        console.warn("Firestore composite index missing/ building — falling back to client-side sort.", e.message);
        try {
          const snap = await getDocs(collection(db, "types"));
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          // client-side sort: section -> subsection -> name
          data.sort((a, b) => {
            const sa = String(a.section || "");
            const sb = String(b.section || "");
            if (sa !== sb) return sa.localeCompare(sb, "ru");

            const ssa = String(a.subsection || "");
            const ssb = String(b.subsection || "");
            if (ssa !== ssb) return ssa.localeCompare(ssb, "ru");

            return String(a.name || "").localeCompare(String(b.name || ""), "ru");
          });
          setRows(data);
          setOk("Данные загружены (client-side сортировка — индекс строится или отсутствует).");
        } catch (inner) {
          setErr(inner.message || "Ошибка при получении типов (фоллбек).");
        } finally {
          setLoading(false);
        }
      } else {
        // другая ошибка
        setErr(e.message || "Ошибка при получении типов.");
        setLoading(false);
      }
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  /* =====================
     DERIVED LISTS
  ===================== */
  const sections = useMemo(
    () => {
      const s = rows.map(r => r.section || "—");
      return [...new Set(s)];
    },
    [rows]
  );

  const subsections = useMemo(
    () =>
      [...new Set(
        rows
          .filter(r => r.section === section)
          .map(r => r.subsection || "—")
      )],
    [rows, section]
  );

  /* =====================
     CREATE
  ===================== */
  async function createType(e) {
    e.preventDefault();
    setErr(""); setOk("");

    if (!section || !subsection || !name.trim()) {
      return setErr("Заполните раздел, подраздел и название");
    }

    try {
      await addDoc(collection(db, "types"), {
        section,
        subsection,
        name: name.trim(),
        defaultPoints: Number(points) || 0,
        active: true
      });
      setName("");
      setPoints(0);
      setOk("Тип добавлен");
      await load();
    } catch (e) {
      setErr(e.message || "Ошибка при добавлении типа");
    }
  }

  async function seedDefaults() {
    setErr(""); setOk("");
    try {
      const existing = new Set(rows.map(r => (r.name || "").toLowerCase()));
      let count = 0;

      for (const t of DEFAULT_TYPES) {
        if (existing.has((t.name || "").toLowerCase())) continue;
        await addDoc(collection(db, "types"), t);
        count++;
      }

      setOk(count ? `Добавлено: ${count}` : "Все типы уже существуют");
      await load();
    } catch (e) {
      setErr(e.message || "Ошибка при добавлении дефолтов");
    }
  }

  async function toggleActive(t) {
    setErr(""); setOk("");
    try {
      await updateDoc(doc(db, "types", t.id), { active: !t.active });
      await load();
    } catch (e) {
      setErr(e.message || "Ошибка при переключении статуса");
    }
  }

  /* =====================
     UI
  ===================== */
  return (
    <div className="container">
      <div className="card">
        <h2>Админ: типы достижений</h2>

        {loading && <div className="muted">Загрузка типов...</div>}
        {err && <div className="error">{err}</div>}
        {ok && <div className="success">{ok}</div>}

        <div style={{display: "flex", gap: 8, marginBottom: 8}}>
          <button className="btn secondary" onClick={seedDefaults}>Добавить дефолтные типы</button>
          <button className="btn secondary" onClick={load}>Обновить</button>
          <a
            className="btn"
            href="https://console.firebase.google.com/project/_/firestore/indexes"
            target="_blank"
            rel="noreferrer"
            style={{marginLeft: "auto"}}
          >
            Открыть индексы (консоль)
          </a>
        </div>

        <hr />

        <form onSubmit={createType} className="stack">

          <div>
            <label>Раздел</label>
            <select
              className="input"
              value={section}
              onChange={e => {
                setSection(e.target.value);
                setSubsection("");
              }}
            >
              <option value="">— Выберите —</option>
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {section && (
            <div>
              <label>Подраздел</label>
              <select
                className="input"
                value={subsection}
                onChange={e => setSubsection(e.target.value)}
              >
                <option value="">— Выберите —</option>
                {subsections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {subsection && (
            <>
              <div>
                <label>Название типа</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)} />
              </div>

              <div>
                <label>Баллы</label>
                <input className="input" type="number" value={points} onChange={e => setPoints(e.target.value)} />
              </div>
            </>
          )}

          <button className="btn">Добавить тип</button>
        </form>

        <hr />

        <table className="table" style={{minWidth: 800}}>
          <thead>
            <tr>
              <th>Раздел</th>
              <th>Подраздел</th>
              <th>Тип</th>
              <th>Баллы</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(t => (
              <tr key={t.id}>
                <td>{t.section || "—"}</td>
                <td>{t.subsection || "—"}</td>
                <td><b>{t.name}</b></td>
                <td>{t.defaultPoints}</td>
                <td>
                  <button className="btn secondary" onClick={() => toggleActive(t)}>
                    {t.active ? "Выключить" : "Включить"}
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan="5"><small className="muted">Типов пока нет. Нажмите «Добавить дефолтные типы».</small></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
