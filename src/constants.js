// ============================================================
// НИШ KPI жүйесі — мұғалімдерге арналған (қайта балансталған)
// ============================================================
// 4 негізгі бағыт және олардың үлесі:
//   1. Негізгі оқыту жұмысы  — ~45% (БАСТЫ — мұғалімнің тура жұмысы)
//   2. Оқушы жетістігі       — ~25%
//   3. Кәсіби даму           — ~20%
//   4. Жеке даму             — ~10%
//
// Қосымша өрістер:
//   - category:         "core" (негізгі) | "additional" (қосымша)
//   - maxPerYear:       бір оқу жылындағы максималды қайталану саны
//   - evidenceRequired: дәлелдеуге қажетті құжат
// ============================================================
export const DEFAULT_TYPES = [

  // ════════════════════════════════════════════════════════════
  // 1. НЕГІЗГІ ОҚЫТУ ЖҰМЫСЫ — мұғалімнің тура жұмысы
  // ════════════════════════════════════════════════════════════

  // --- Сабақ сапасы (бақылау нәтижесі бойынша) ---
  {
    section: "Негізгі оқыту жұмысы",
    subsection: "Сабақ сапасы",
    name: "Сабақты бақылау — «өте жоғары» деңгей",
    defaultPoints: 40,
    category: "core",
    maxPerYear: 3,
    evidenceRequired: "Әкімшіліктің бақылау хаттамасы"
  },
  {
    section: "Негізгі оқыту жұмысы",
    subsection: "Сабақ сапасы",
    name: "Сабақты бақылау — «жоғары» деңгей",
    defaultPoints: 25,
    category: "core",
    maxPerYear: 5,
    evidenceRequired: "Әкімшіліктің бақылау хаттамасы"
  },
  {
    section: "Негізгі оқыту жұмысы",
    subsection: "Сабақ сапасы",
    name: "Дифференциация мен жеке тәсілді жүйелі қолдану",
    defaultPoints: 20,
    category: "core",
    maxPerYear: 1,
    evidenceRequired: "Сабақ жоспарлары + бақылау есебі"
  },
  {
    section: "Негізгі оқыту жұмысы",
    subsection: "Сабақ сапасы",
    name: "Қалыптастырушы бағалауды жүйелі қолдану (AfL)",
    defaultPoints: 20,
    category: "core",
    maxPerYear: 1,
    evidenceRequired: "Сабақ үлгілері + оқушылардың рефлексиясы"
  },
  {
    section: "Негізгі оқыту жұмысы",
    subsection: "Сабақ сапасы",
    name: "Цифрлық құралдар мен IT-ны сабақта тиімді қолдану",
    defaultPoints: 12,
    category: "core",
    maxPerYear: 1,
    evidenceRequired: "Сабақ материалдары + бақылау есебі"
  },

  // --- Оқушылардың академиялық нәтижесі ---
  {
    section: "Негізгі оқыту жұмысы",
    subsection: "Академиялық нәтиже",
    name: "Сынып бойынша СОЖ орташа балы — мектеп бенчмаркінен жоғары",
    defaultPoints: 35,
    category: "core",
    maxPerYear: 1,
    evidenceRequired: "СОЖ нәтижелерінің есебі"
  },
  {
    section: "Негізгі оқыту жұмысы",
    subsection: "Академиялық нәтиже",
    name: "Тоқсандық/жылдық үлгерімнің оң динамикасы (≥10%)",
    defaultPoints: 30,
    category: "core",
    maxPerYear: 1,
    evidenceRequired: "Журналдан салыстырмалы есеп"
  },
  {
    section: "Негізгі оқыту жұмысы",
    subsection: "Академиялық нәтиже",
    name: "Сапа көрсеткіші 70%-дан жоғары",
    defaultPoints: 25,
    category: "core",
    maxPerYear: 1,
    evidenceRequired: "Тоқсандық есеп"
  },
  {
    section: "Негізгі оқыту жұмысы",
    subsection: "Академиялық нәтиже",
    name: "Үлгермеуші оқушылармен жұмыс — оң нәтиже",
    defaultPoints: 20,
    category: "core",
    maxPerYear: 1,
    evidenceRequired: "Жеке жоспар + аралық бақылау нәтижелері"
  },
  {
    section: "Негізгі оқыту жұмысы",
    subsection: "Академиялық нәтиже",
    name: "Сабаққа қатысу 95%-дан жоғары",
    defaultPoints: 10,
    category: "core",
    maxPerYear: 1,
    evidenceRequired: "Электронды журнал есебі"
  },

  // --- Сынып жетекшілігі / Тәрбие жұмысы ---
  {
    section: "Негізгі оқыту жұмысы",
    subsection: "Сынып жетекшілігі",
    name: "Сынып жетекшілік қызметі (бір оқу жылы)",
    defaultPoints: 30,
    category: "core",
    maxPerYear: 1,
    evidenceRequired: "Бұйрық + тәрбие жоспарының орындалуы"
  },
  {
    section: "Негізгі оқыту жұмысы",
    subsection: "Сынып жетекшілігі",
    name: "Ата-аналармен жүйелі жұмыс (жиналыс ≥4 рет)",
    defaultPoints: 15,
    category: "core",
    maxPerYear: 1,
    evidenceRequired: "Жиналыс хаттамалары"
  },
  {
    section: "Негізгі оқыту жұмысы",
    subsection: "Сынып жетекшілігі",
    name: "Оқушылар мен ата-аналардан қанағаттану ≥85%",
    defaultPoints: 20,
    category: "core",
    maxPerYear: 1,
    evidenceRequired: "Сауалнама нәтижелері"
  },
  {
    section: "Негізгі оқыту жұмысы",
    subsection: "Сынып жетекшілігі",
    name: "Тәрбие шараларын ұйымдастыру (мектеп деңгейі)",
    defaultPoints: 8,
    category: "additional",
    maxPerYear: 5,
    evidenceRequired: "Іс-шара жоспары + фотоесеп"
  },

  // ════════════════════════════════════════════════════════════
  // 2. ОҚУШЫ ЖЕТІСТІГІ — қосымша индикатор (баллдар азайтылды)
  // ════════════════════════════════════════════════════════════

  // --- Пәндік олимпиадалар ---
  {
    section: "Оқушы жетістігі",
    subsection: "Пәндік олимпиадалар",
    name: "Халықаралық олимпиада жеңімпазы (алтын медаль)",
    defaultPoints: 60,
    category: "additional",
    maxPerYear: 2,
    evidenceRequired: "Диплом + ресми хаттама"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Пәндік олимпиадалар",
    name: "Халықаралық олимпиада жеңімпазы (күміс медаль)",
    defaultPoints: 45,
    category: "additional",
    maxPerYear: 2,
    evidenceRequired: "Диплом + ресми хаттама"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Пәндік олимпиадалар",
    name: "Халықаралық олимпиада жеңімпазы (қола медаль)",
    defaultPoints: 35,
    category: "additional",
    maxPerYear: 2,
    evidenceRequired: "Диплом + ресми хаттама"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Пәндік олимпиадалар",
    name: "Республикалық олимпиада — I дәрежелі диплом",
    defaultPoints: 30,
    category: "additional",
    maxPerYear: 3,
    evidenceRequired: "Диплом"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Пәндік олимпиадалар",
    name: "Республикалық олимпиада — II дәрежелі диплом",
    defaultPoints: 22,
    category: "additional",
    maxPerYear: 3,
    evidenceRequired: "Диплом"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Пәндік олимпиадалар",
    name: "Республикалық олимпиада — III дәрежелі диплом",
    defaultPoints: 18,
    category: "additional",
    maxPerYear: 3,
    evidenceRequired: "Диплом"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Пәндік олимпиадалар",
    name: "Облыстық олимпиада — I орын",
    defaultPoints: 12,
    category: "additional",
    maxPerYear: 5,
    evidenceRequired: "Диплом"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Пәндік олимпиадалар",
    name: "Облыстық олимпиада — II–III орын",
    defaultPoints: 8,
    category: "additional",
    maxPerYear: 5,
    evidenceRequired: "Диплом"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Пәндік олимпиадалар",
    name: "Қашықтан / онлайн олимпиада жүлдегері",
    defaultPoints: 2,
    category: "additional",
    maxPerYear: 5,
    evidenceRequired: "Сертификат"
  },

  // --- Ғылыми жобалар ---
  {
    section: "Оқушы жетістігі",
    subsection: "Ғылыми жобалар",
    name: "Халықаралық ғылыми жоба байқауының жеңімпазы",
    defaultPoints: 40,
    category: "additional",
    maxPerYear: 2,
    evidenceRequired: "Диплом + жоба паспорты"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Ғылыми жобалар",
    name: "Республикалық ғылыми жоба байқауының жеңімпазы",
    defaultPoints: 25,
    category: "additional",
    maxPerYear: 3,
    evidenceRequired: "Диплом + жоба паспорты"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Ғылыми жобалар",
    name: "Облыстық ғылыми жоба байқауының жеңімпазы",
    defaultPoints: 12,
    category: "additional",
    maxPerYear: 3,
    evidenceRequired: "Диплом + жоба паспорты"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Ғылыми жобалар",
    name: "Оқушының ғылыми мақаласын жариялау",
    defaultPoints: 10,
    category: "additional",
    maxPerYear: 3,
    evidenceRequired: "Жарияланым көшірмесі"
  },

  // --- Сыртқы бағалау ---
  {
    section: "Оқушы жетістігі",
    subsection: "Сыртқы бағалау",
    name: "Cambridge IGCSE — A* / A нәтижесі",
    defaultPoints: 15,
    category: "additional",
    maxPerYear: 10,
    evidenceRequired: "Сертификат"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Сыртқы бағалау",
    name: "A-Level — A* / A нәтижесі",
    defaultPoints: 20,
    category: "additional",
    maxPerYear: 10,
    evidenceRequired: "Сертификат"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Сыртқы бағалау",
    name: "IELTS — 7.0+ нәтижесі",
    defaultPoints: 18,
    category: "additional",
    maxPerYear: 10,
    evidenceRequired: "Ресми нәтиже"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Сыртқы бағалау",
    name: "IELTS — 6.0–6.5 нәтижесі",
    defaultPoints: 10,
    category: "additional",
    maxPerYear: 10,
    evidenceRequired: "Ресми нәтиже"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Сыртқы бағалау",
    name: "SAT — 1400+ балл",
    defaultPoints: 20,
    category: "additional",
    maxPerYear: 5,
    evidenceRequired: "Ресми нәтиже"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Сыртқы бағалау",
    name: "ҰБТ — 120+ балл",
    defaultPoints: 18,
    category: "additional",
    maxPerYear: 10,
    evidenceRequired: "Ресми сертификат"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Сыртқы бағалау",
    name: "ҰБТ — 100–119 балл",
    defaultPoints: 10,
    category: "additional",
    maxPerYear: 10,
    evidenceRequired: "Ресми сертификат"
  },

  // --- Шығармашылық және спорт ---
  {
    section: "Оқушы жетістігі",
    subsection: "Шығармашылық және спорт",
    name: "Халықаралық байқау / жарыс жеңімпазы",
    defaultPoints: 25,
    category: "additional",
    maxPerYear: 3,
    evidenceRequired: "Диплом"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Шығармашылық және спорт",
    name: "Республикалық байқау / жарыс жеңімпазы",
    defaultPoints: 15,
    category: "additional",
    maxPerYear: 5,
    evidenceRequired: "Диплом"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Шығармашылық және спорт",
    name: "Облыстық байқау / жарыс жеңімпазы",
    defaultPoints: 8,
    category: "additional",
    maxPerYear: 5,
    evidenceRequired: "Диплом"
  },

  // --- Түлектердің жетістігі ---
  {
    section: "Оқушы жетістігі",
    subsection: "Түлектердің жетістігі",
    name: "Шетелдегі үздік ЖОО-ға (QS Top-100) түсу",
    defaultPoints: 30,
    category: "additional",
    maxPerYear: 5,
    evidenceRequired: "Қабылдау хаты"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Түлектердің жетістігі",
    name: "«Болашақ» стипендиясын жеңіп алу",
    defaultPoints: 25,
    category: "additional",
    maxPerYear: 5,
    evidenceRequired: "Стипендия туралы құжат"
  },
  {
    section: "Оқушы жетістігі",
    subsection: "Түлектердің жетістігі",
    name: "ҚР үздік ЖОО-ларына мемлекеттік грантпен түсу",
    defaultPoints: 12,
    category: "additional",
    maxPerYear: 10,
    evidenceRequired: "Грант туралы құжат"
  },

  // ════════════════════════════════════════════════════════════
  // 3. КӘСІБИ ДАМУ — баллдар біршама азайтылды
  // ════════════════════════════════════════════════════════════

  // --- Біліктілікті арттыру ---
  {
    section: "Кәсіби даму",
    subsection: "Біліктілікті арттыру",
    name: "NIS біліктілікті арттыру курстарын аяқтау (72 сағат)",
    defaultPoints: 12,
    category: "additional",
    maxPerYear: 2,
    evidenceRequired: "Сертификат"
  },
  {
    section: "Кәсіби даму",
    subsection: "Біліктілікті арттыру",
    name: "Халықаралық сертификат (IELTS 7.0+, TOEFL 100+)",
    defaultPoints: 25,
    category: "additional",
    maxPerYear: 1,
    evidenceRequired: "Ресми сертификат"
  },
  {
    section: "Кәсіби даму",
    subsection: "Біліктілікті арттыру",
    name: "Cambridge / AQA / Pearson сертификаты",
    defaultPoints: 20,
    category: "additional",
    maxPerYear: 1,
    evidenceRequired: "Ресми сертификат"
  },
  {
    section: "Кәсіби даму",
    subsection: "Біліктілікті арттыру",
    name: "Педагог-сарапшы санатын алу",
    defaultPoints: 15,
    category: "additional",
    maxPerYear: 1,
    evidenceRequired: "Куәлік"
  },
  {
    section: "Кәсіби даму",
    subsection: "Біліктілікті арттыру",
    name: "Педагог-зерттеуші санатын алу",
    defaultPoints: 22,
    category: "additional",
    maxPerYear: 1,
    evidenceRequired: "Куәлік"
  },
  {
    section: "Кәсіби даму",
    subsection: "Біліктілікті арттыру",
    name: "Педагог-шебер санатын алу",
    defaultPoints: 35,
    category: "additional",
    maxPerYear: 1,
    evidenceRequired: "Куәлік"
  },
  {
    section: "Кәсіби даму",
    subsection: "Біліктілікті арттыру",
    name: "Магистр дәрежесін қорғау",
    defaultPoints: 25,
    category: "additional",
    maxPerYear: 1,
    evidenceRequired: "Диплом"
  },
  {
    section: "Кәсіби даму",
    subsection: "Біліктілікті арттыру",
    name: "PhD дәрежесін қорғау",
    defaultPoints: 60,
    category: "additional",
    maxPerYear: 1,
    evidenceRequired: "Диплом"
  },

  // --- Ғылыми-әдістемелік жұмыс ---
  {
    section: "Кәсіби даму",
    subsection: "Ғылыми-әдістемелік жұмыс",
    name: "Scopus / Web of Science журналдарында мақала",
    defaultPoints: 35,
    category: "additional",
    maxPerYear: 3,
    evidenceRequired: "Жарияланым көшірмесі + DOI"
  },
  {
    section: "Кәсіби даму",
    subsection: "Ғылыми-әдістемелік жұмыс",
    name: "ҚР БҒСБК ұсынған журналдарда мақала",
    defaultPoints: 18,
    category: "additional",
    maxPerYear: 3,
    evidenceRequired: "Жарияланым көшірмесі"
  },
  {
    section: "Кәсіби даму",
    subsection: "Ғылыми-әдістемелік жұмыс",
    name: "Республикалық әдістемелік басылымда мақала",
    defaultPoints: 10,
    category: "additional",
    maxPerYear: 3,
    evidenceRequired: "Жарияланым көшірмесі"
  },
  {
    section: "Кәсіби даму",
    subsection: "Ғылыми-әдістемелік жұмыс",
    name: "Авторлық оқу-әдістемелік кешен әзірлеу",
    defaultPoints: 22,
    category: "additional",
    maxPerYear: 1,
    evidenceRequired: "Әдістемелік кеңес ұсынысы"
  },
  {
    section: "Кәсіби даму",
    subsection: "Ғылыми-әдістемелік жұмыс",
    name: "Авторлық оқулық немесе монография шығару",
    defaultPoints: 45,
    category: "additional",
    maxPerYear: 1,
    evidenceRequired: "Басылым көшірмесі"
  },
  {
    section: "Кәсіби даму",
    subsection: "Ғылыми-әдістемелік жұмыс",
    name: "Авторлық бағдарлама әзірлеу және енгізу",
    defaultPoints: 18,
    category: "additional",
    maxPerYear: 1,
    evidenceRequired: "Бағдарлама + сараптама"
  },

  // --- Тәжірибе алмасу ---
  {
    section: "Кәсіби даму",
    subsection: "Тәжірибе алмасу",
    name: "Халықаралық конференцияда баяндама",
    defaultPoints: 22,
    category: "additional",
    maxPerYear: 3,
    evidenceRequired: "Сертификат + бағдарлама"
  },
  {
    section: "Кәсіби даму",
    subsection: "Тәжірибе алмасу",
    name: "Республикалық конференцияда баяндама",
    defaultPoints: 15,
    category: "additional",
    maxPerYear: 4,
    evidenceRequired: "Сертификат + бағдарлама"
  },
  {
    section: "Кәсіби даму",
    subsection: "Тәжірибе алмасу",
    name: "Облыстық / қалалық конференцияда баяндама",
    defaultPoints: 8,
    category: "additional",
    maxPerYear: 4,
    evidenceRequired: "Сертификат"
  },
  {
    section: "Кәсіби даму",
    subsection: "Тәжірибе алмасу",
    name: "Республикалық деңгейдегі ашық сабақ",
    defaultPoints: 15,
    category: "additional",
    maxPerYear: 2,
    evidenceRequired: "Бұйрық + бағалау парағы"
  },
  {
    section: "Кәсіби даму",
    subsection: "Тәжірибе алмасу",
    name: "Облыстық деңгейдегі ашық сабақ",
    defaultPoints: 10,
    category: "additional",
    maxPerYear: 3,
    evidenceRequired: "Бұйрық + бағалау парағы"
  },
  {
    section: "Кәсіби даму",
    subsection: "Тәжірибе алмасу",
    name: "Мектепішілік ашық сабақ",
    defaultPoints: 4,
    category: "additional",
    maxPerYear: 5,
    evidenceRequired: "Бағалау парағы"
  },
  {
    section: "Кәсіби даму",
    subsection: "Тәжірибе алмасу",
    name: "Мастер-класс / тренинг өткізу",
    defaultPoints: 7,
    category: "additional",
    maxPerYear: 5,
    evidenceRequired: "Бағдарлама + қатысушылар тізімі"
  },

  // ════════════════════════════════════════════════════════════
  // 4. ЖЕКЕ ДАМУ — ең азғантай үлес
  // ════════════════════════════════════════════════════════════

  // --- Кәсіби құзыреттілік ---
  {
    section: "Жеке даму",
    subsection: "Кәсіби құзыреттілік",
    name: "Ағылшын тілін C1 деңгейінде меңгеру",
    defaultPoints: 18,
    category: "additional",
    maxPerYear: 1,
    evidenceRequired: "Ресми сертификат"
  },
  {
    section: "Жеке даму",
    subsection: "Кәсіби құзыреттілік",
    name: "Ағылшын тілін B2 деңгейінде меңгеру",
    defaultPoints: 10,
    category: "additional",
    maxPerYear: 1,
    evidenceRequired: "Ресми сертификат"
  },
  {
    section: "Жеке даму",
    subsection: "Кәсіби құзыреттілік",
    name: "Үшінші шет тілін меңгеру (B1+)",
    defaultPoints: 10,
    category: "additional",
    maxPerYear: 1,
    evidenceRequired: "Ресми сертификат"
  },
  {
    section: "Жеке даму",
    subsection: "Кәсіби құзыреттілік",
    name: "IT-құзыреттілік курстарын аяқтау",
    defaultPoints: 7,
    category: "additional",
    maxPerYear: 2,
    evidenceRequired: "Сертификат"
  },
  {
    section: "Жеке даму",
    subsection: "Кәсіби құзыреттілік",
    name: "Soft skills бойынша сертификатталған тренинг",
    defaultPoints: 5,
    category: "additional",
    maxPerYear: 2,
    evidenceRequired: "Сертификат"
  },

  // --- Тәлімгерлік ---
  {
    section: "Жеке даму",
    subsection: "Тәлімгерлік",
    name: "Жас маманға тәлімгерлік (бір оқу жылы)",
    defaultPoints: 15,
    category: "additional",
    maxPerYear: 2,
    evidenceRequired: "Бұйрық + жас маман есебі"
  },
  {
    section: "Жеке даму",
    subsection: "Тәлімгерлік",
    name: "Сертификатталған коуч / ментор",
    defaultPoints: 20,
    category: "additional",
    maxPerYear: 1,
    evidenceRequired: "Сертификат"
  },
  {
    section: "Жеке даму",
    subsection: "Тәлімгерлік",
    name: "Студент-практиканттарға жетекшілік",
    defaultPoints: 6,
    category: "additional",
    maxPerYear: 3,
    evidenceRequired: "Бұйрық + ЖОО хаты"
  },

  // --- Қоғамдық белсенділік ---
  {
    section: "Жеке даму",
    subsection: "Қоғамдық белсенділік",
    name: "Кәсіби қауымдастық / қазылар алқасына мүшелік",
    defaultPoints: 10,
    category: "additional",
    maxPerYear: 2,
    evidenceRequired: "Куәлік / бұйрық"
  },
  {
    section: "Жеке даму",
    subsection: "Қоғамдық белсенділік",
    name: "БАҚ-та кәсіби тақырыпта мақала / сұхбат",
    defaultPoints: 6,
    category: "additional",
    maxPerYear: 5,
    evidenceRequired: "Жарияланым сілтемесі"
  },
  {
    section: "Жеке даму",
    subsection: "Қоғамдық белсенділік",
    name: "«Үздік педагог» байқауының жеңімпазы",
    defaultPoints: 35,
    category: "additional",
    maxPerYear: 1,
    evidenceRequired: "Диплом"
  },
  {
    section: "Жеке даму",
    subsection: "Қоғамдық белсенділік",
    name: "Мемлекеттік / салалық наградамен марапатталу",
    defaultPoints: 30,
    category: "additional",
    maxPerYear: 1,
    evidenceRequired: "Куәлік"
  }

].map(x => ({ ...x, active: true }));


export const NEWS_CAT_ICONS = { science: "\u{1F52C}", school: "\u{1F3EB}", event: "\u{1F389}", sport: "\u26BD", achievement: "\u{1F3C6}", other: "\u{1F4CC}" };
export const NEWS_CATEGORIES = [
  { key: "science", tKey: "catScience" },
  { key: "school", tKey: "catSchool" },
  { key: "event", tKey: "catEvent" },
  { key: "sport", tKey: "catSport" },
  { key: "achievement", tKey: "catAchievement" },
  { key: "other", tKey: "catOther" },
];
export const NEWS_FONTS = [
  { key: "", label: "Default" },
  { key: "'Georgia', serif", label: "Georgia" },
  { key: "'Courier New', monospace", label: "Courier" },
  { key: "'Comic Sans MS', cursive", label: "Comic Sans" },
  { key: "'Times New Roman', serif", label: "Times" },
  { key: "'Trebuchet MS', sans-serif", label: "Trebuchet" },
];
export const NEWS_MOODS = ["\u{1F60A}", "\u{1F602}", "\u{1F60D}", "\u{1F525}", "\u{1F44F}", "\u{1F4AA}", "\u{1F389}", "\u{1F60E}", "\u{1F914}", "\u{1F622}", "\u2764\uFE0F", "\u{1F44D}"];
