console.log("[KPI] main.jsx loaded");
try { const el = document.getElementById("boot-status"); if (el) { el.textContent = "JS: loaded"; el.dataset.kind = "ok"; } } catch (e) { }
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import "./styles.css";
import { t, getLang, setLang } from "./i18n.js";

/** PocketBase SDK */
import pb, { getFileUrl } from "./pb.js";

/** Record normalizers — add backward-compatible URL properties from PocketBase file fields */
function normalizeUser(rec) {
  return { ...rec, uid: rec.id, avatarUrl: getFileUrl(rec, "avatar"), signatureUrl: getFileUrl(rec, "signature") };
}
function normalizeSub(rec) {
  return { ...rec, evidenceFileUrl: getFileUrl(rec, "evidenceFile") };
}
function normalizeReq(rec) {
  return { ...rec, evidenceFileUrl: getFileUrl(rec, "evidenceFile") };
}
function normalizeDoc(rec) {
  return { ...rec, signatureUrl: getFileUrl(rec, "signatureFile") };
}
function normalizeTeacherDoc(rec) {
  return { ...rec, fileUrl: getFileUrl(rec, "file") };
}
function normalizeNews(rec) {
  return { ...rec, photoUrl: getFileUrl(rec, "photo"), coverUrl: getFileUrl(rec, "cover"), avatarUrl: rec.authorAvatar || "" };
}
function normalizeComment(rec) {
  return { ...rec, avatarUrl: rec.authorAvatar || "" };
}

/** Default KPI Types (required) */
const DEFAULT_TYPES = [
  // ===== КӘСІБИ ДАМУ =====
  { section: "Кәсіби даму", subsection: "Семинарлар", name: "Семинарға қатысу (мектепішілік)", defaultPoints: 5 },
  { section: "Кәсіби даму", subsection: "Семинарлар", name: "Семинарға қатысу (аудандық)", defaultPoints: 10 },
  { section: "Кәсіби даму", subsection: "Семинарлар", name: "Семинарға қатысу (облыстық)", defaultPoints: 15 },
  { section: "Кәсіби даму", subsection: "Семинарлар", name: "Семинарға қатысу (республикалық)", defaultPoints: 20 },
  { section: "Кәсіби даму", subsection: "Семинарлар", name: "Семинарда баяндама жасау (мектепішілік)", defaultPoints: 10 },
  { section: "Кәсіби даму", subsection: "Семинарлар", name: "Семинарда баяндама жасау (аудандық)", defaultPoints: 15 },
  { section: "Кәсіби даму", subsection: "Семинарлар", name: "Семинарда баяндама жасау (облыстық)", defaultPoints: 20 },
  { section: "Кәсіби даму", subsection: "Семинарлар", name: "Семинарда баяндама жасау (республикалық)", defaultPoints: 25 },

  { section: "Кәсіби даму", subsection: "Курстар", name: "Біліктілік арттыру (36 сағатқа дейін)", defaultPoints: 10 },
  { section: "Кәсіби даму", subsection: "Курстар", name: "Біліктілік арттыру (36–71 сағат)", defaultPoints: 15 },
  { section: "Кәсіби даму", subsection: "Курстар", name: "Біліктілік арттыру (72+ сағат)", defaultPoints: 25 },
  { section: "Кәсіби даму", subsection: "Курстар", name: "Пәндік курс (сертификатпен)", defaultPoints: 15 },
  { section: "Кәсіби даму", subsection: "Курстар", name: "Педагогика/психология курсы", defaultPoints: 15 },
  { section: "Кәсіби даму", subsection: "Курстар", name: "Инклюзивті білім беру курсы", defaultPoints: 20 },
  { section: "Кәсіби даму", subsection: "Курстар", name: "CLIL / STEM / PBL курсы", defaultPoints: 20 },

  { section: "Кәсіби даму", subsection: "Сабақ", name: "Ашық сабақ өткізу", defaultPoints: 20 },
  { section: "Кәсіби даму", subsection: "Сабақ", name: "Шеберлік сыныбын өткізу", defaultPoints: 20 },
  { section: "Кәсіби даму", subsection: "Сабақ", name: "Интеграцияланған сабақ өткізу", defaultPoints: 15 },
  { section: "Кәсіби даму", subsection: "Сабақ", name: "Пән апталығында үлгілі сабақ өткізу", defaultPoints: 15 },
  { section: "Кәсіби даму", subsection: "Сабақ", name: "Сабаққа өзара қатысу және талдау (1 цикл)", defaultPoints: 10 },

  { section: "Кәсіби даму", subsection: "Конференциялар", name: "Конференцияға қатысу (мектеп/аудан)", defaultPoints: 10 },
  { section: "Кәсіби даму", subsection: "Конференциялар", name: "Конференцияға қатысу (облыс/республика)", defaultPoints: 15 },
  { section: "Кәсіби даму", subsection: "Конференцияда баяндама жасау (аудандық)", defaultPoints: 20 },
  { section: "Кәсіби даму", subsection: "Конференцияда баяндама жасау (облыстық)", defaultPoints: 25 },
  { section: "Кәсіби даму", subsection: "Конференцияда баяндама жасау (республикалық)", defaultPoints: 30 },
  { section: "Кәсіби даму", subsection: "Конференциялар", name: "Халықаралық конференцияда баяндама", defaultPoints: 40 },

  { section: "Кәсіби даму", subsection: "Әдістемелік жұмыс", name: "Әдістемелік бірлестік отырысында баяндама", defaultPoints: 10 },
  { section: "Кәсіби даму", subsection: "Әдістемелік жұмыс", name: "ӘБ жетекшісі ретінде жұмыс", defaultPoints: 20 },
  { section: "Кәсіби даму", subsection: "Әдістемелік жұмыс", name: "Әдістемелік нұсқаулық әзірлеу", defaultPoints: 20 },
  { section: "Кәсіби даму", subsection: "Әдістемелік жұмыс", name: "ҚМЖ/ОМЖ үлгісін әзірлеп тарату", defaultPoints: 10 },
  { section: "Кәсіби даму", subsection: "Әдістемелік жұмыс", name: "Пән бойынша тапсырмалар банкін жасау", defaultPoints: 20 },

  { section: "Кәсіби даму", subsection: "Менторлық", name: "Жас маманға тәлімгер болу (1 оқу жылы)", defaultPoints: 25 },
  { section: "Кәсіби даму", subsection: "Менторлық", name: "Тәлімгерлік кездесу өткізу (1 рет)", defaultPoints: 5 },
  { section: "Кәсіби даму", subsection: "Менторлық", name: "Сабаққа кері байланыс беру (тәлімгерлік)", defaultPoints: 5 },
  { section: "Кәсіби даму", subsection: "Менторлық", name: "Менторлық жоспарын әзірлеу", defaultPoints: 10 },

  { section: "Кәсіби даму", subsection: "Зерттеу", name: "Lesson Study жүргізу (1 цикл)", defaultPoints: 25 },
  { section: "Кәсіби даму", subsection: "Зерттеу", name: "Action Research жүргізу", defaultPoints: 25 },
  { section: "Кәсіби даму", subsection: "Зерттеу", name: "Зерттеу нәтижесін мектепте таныстыру", defaultPoints: 15 },
  { section: "Кәсіби даму", subsection: "Зерттеу", name: "Зерттеу нәтижесін сыртқы алаңда таныстыру", defaultPoints: 25 },

  { section: "Кәсіби даму", subsection: "Байқаулар", name: "Педагогикалық байқауға қатысу (мектепішілік)", defaultPoints: 10 },
  { section: "Кәсіби даму", subsection: "Байқаулар", name: "Педагогикалық байқауға қатысу (аудандық)", defaultPoints: 15 },
  { section: "Кәсіби даму", subsection: "Байқаулар", name: "Педагогикалық байқауға қатысу (облыстық)", defaultPoints: 20 },
  { section: "Кәсіби даму", subsection: "Байқаулар", name: "Педагогикалық байқауға қатысу (республикалық)", defaultPoints: 25 },
  { section: "Кәсіби даму", subsection: "Байқаулар", name: "Педагогикалық байқауда жүлделі орын (аудандық)", defaultPoints: 25 },
  { section: "Кәсіби даму", subsection: "Байқаулар", name: "Педагогикалық байқауда жүлделі орын (облыстық)", defaultPoints: 35 },
  { section: "Кәсіби даму", subsection: "Байқаулар", name: "Педагогикалық байқауда жүлделі орын (республикалық)", defaultPoints: 50 },

  // ===== ЖЕКЕ ДАМУ =====
  { section: "Жеке даму", subsection: "Кітап оқу", name: "Кәсіби кітап оқу (1 кітап)", defaultPoints: 5 },
  { section: "Жеке даму", subsection: "Кітап оқу", name: "Педагогика/психология кітабын оқу", defaultPoints: 5 },
  { section: "Жеке даму", subsection: "Кітап оқу", name: "Оқыған кітап бойынша қысқаша шолу жазу", defaultPoints: 5 },
  { section: "Жеке даму", subsection: "Кітап оқу", name: "Кітап талқылау клубына қатысу", defaultPoints: 5 },

  { section: "Жеке даму", subsection: "Онлайн оқу", name: "Вебинарға қатысу (сертификатпен)", defaultPoints: 5 },
  { section: "Жеке даму", subsection: "Онлайн оқу", name: "Вебинарға қатысу (сертификатсыз)", defaultPoints: 3 },
  { section: "Жеке даму", subsection: "Онлайн оқу", name: "MOOC курсынан модуль аяқтау", defaultPoints: 5 },
  { section: "Жеке даму", subsection: "Онлайн оқу", name: "Онлайн интенсив/марафон аяқтау", defaultPoints: 10 },
  { section: "Жеке даму", subsection: "Онлайн оқу", name: "Подкаст/дәріс тыңдау (кәсіби)", defaultPoints: 2 },

  { section: "Жеке даму", subsection: "Цифрлық дағды", name: "Цифрлық платформа меңгеру", defaultPoints: 10 },
  { section: "Жеке даму", subsection: "Цифрлық дағды", name: "Жаңа EdTech құралын сабақта қолдану", defaultPoints: 10 },
  { section: "Жеке даму", subsection: "Цифрлық дағды", name: "Google Workspace / Microsoft 365 жетілдіру", defaultPoints: 10 },
  { section: "Жеке даму", subsection: "Цифрлық дағды", name: "Онлайн тест/викторина құралы меңгеру", defaultPoints: 8 },
  { section: "Жеке даму", subsection: "Цифрлық дағды", name: "Бейнесабақ монтаждау дағдысын дамыту", defaultPoints: 10 },
  { section: "Жеке даму", subsection: "Цифрлық дағды", name: "Презентация дизайнын жетілдіру", defaultPoints: 5 },

  { section: "Жеке даму", subsection: "Тіл дамыту", name: "Қазақ тілі академиялық жазу дағдысын дамыту", defaultPoints: 10 },
  { section: "Жеке даму", subsection: "Тіл дамыту", name: "Орыс тілі кәсіби коммуникация дағдысын дамыту", defaultPoints: 10 },
  { section: "Жеке даму", subsection: "Тіл дамыту", name: "Ағылшын тілі курсына қатысу", defaultPoints: 15 },
  { section: "Жеке даму", subsection: "Тіл дамыту", name: "Пәндік терминологияны үш тілде игеру", defaultPoints: 10 },

  { section: "Жеке даму", subsection: "Soft skills", name: "Тайм-менеджмент дағдысын жетілдіру", defaultPoints: 5 },
  { section: "Жеке даму", subsection: "Soft skills", name: "Публичное выступление дағдысын дамыту", defaultPoints: 10 },
  { section: "Жеке даму", subsection: "Soft skills", name: "Кері байланыс беру/алу мәдениетін дамыту", defaultPoints: 5 },
  { section: "Жеке даму", subsection: "Soft skills", name: "Командалық жұмыс дағдысын дамыту", defaultPoints: 5 },

  { section: "Жеке даму", subsection: "Денсаулық", name: "Педагогтың эмоционалдық күйін қолдау тренингіне қатысу", defaultPoints: 5 },
  { section: "Жеке даму", subsection: "Денсаулық", name: "Стресс-менеджмент тренингі", defaultPoints: 5 },
  { section: "Жеке даму", subsection: "Денсаулық", name: "Спорттық/сауықтыру шарасына қатысу", defaultPoints: 3 },

  // ===== ҚОСЫМША ДАМУ =====
  { section: "Қосымша даму", subsection: "Марапаттар", name: "Грамота (мектепішілік)", defaultPoints: 5 },
  { section: "Қосымша даму", subsection: "Марапаттар", name: "Грамота (аудандық)", defaultPoints: 10 },
  { section: "Қосымша даму", subsection: "Марапаттар", name: "Грамота (облыстық)", defaultPoints: 15 },
  { section: "Қосымша даму", subsection: "Марапаттар", name: "Грамота (республикалық)", defaultPoints: 20 },
  { section: "Қосымша даму", subsection: "Марапаттар", name: "Алғыс хат (мектепішілік)", defaultPoints: 3 },
  { section: "Қосымша даму", subsection: "Марапаттар", name: "Алғыс хат (аудандық/қалалық)", defaultPoints: 5 },
  { section: "Қосымша даму", subsection: "Марапаттар", name: "Алғыс хат (облыстық)", defaultPoints: 10 },
  { section: "Қосымша даму", subsection: "Марапаттар", name: "Құрмет грамотасы", defaultPoints: 20 },

  { section: "Қосымша даму", subsection: "Қоғамдық жұмыс", name: "Іс-шара ұйымдастыру", defaultPoints: 10 },
  { section: "Қосымша даму", subsection: "Қоғамдық жұмыс", name: "Мектепішілік жобаға жетекшілік ету", defaultPoints: 15 },
  { section: "Қосымша даму", subsection: "Қоғамдық жұмыс", name: "Аудандық іс-шараны ұйымдастыруға қатысу", defaultPoints: 20 },
  { section: "Қосымша даму", subsection: "Қоғамдық жұмыс", name: "Қайырымдылық акциясына қатысу", defaultPoints: 5 },
  { section: "Қосымша даму", subsection: "Қоғамдық жұмыс", name: "Волонтерлік қызмет (педагогикалық бағыт)", defaultPoints: 10 },

  { section: "Қосымша даму", subsection: "Тәрбие жұмысы", name: "Сынып сағатын сапалы өткізу", defaultPoints: 5 },
  { section: "Қосымша даму", subsection: "Тәрбие жұмысы", name: "Тәрбие жобасын әзірлеу", defaultPoints: 15 },
  { section: "Қосымша даму", subsection: "Тәрбие жұмысы", name: "Мектеп мерекесіне сценарий жазу", defaultPoints: 10 },
  { section: "Қосымша даму", subsection: "Тәрбие жұмысы", name: "Патриоттық/экологиялық акция ұйымдастыру", defaultPoints: 10 },

  { section: "Қосымша даму", subsection: "Ата-анамен жұмыс", name: "Ата-аналар жиналысын жаңа форматта өткізу", defaultPoints: 10 },
  { section: "Қосымша даму", subsection: "Ата-аналармен жұмыс", name: "Ата-аналарға тренинг/семинар өткізу", defaultPoints: 15 },
  { section: "Қосымша даму", subsection: "Ата-аналармен жұмыс", name: "Ата-анамен жеке кеңес беру (жүйелі)", defaultPoints: 5 },
  { section: "Қосымша даму", subsection: "Ата-аналармен жұмыс", name: "Отбасы мен мектеп серіктестігі жобасын іске асыру", defaultPoints: 20 },

  { section: "Қосымша даму", subsection: "Медиа", name: "Мектеп сайтына/желісіне материал жариялау", defaultPoints: 5 },
  { section: "Қосымша даму", subsection: "Медиа", name: "Педагогикалық блог/парақша жүргізу", defaultPoints: 10 },
  { section: "Қосымша даму", subsection: "Медиа", name: "БАҚ-та мақала/сұхбат жариялануы", defaultPoints: 15 },
  { section: "Қосымша даму", subsection: "Медиа", name: "Оқу-тәрбие контентін тұрақты жариялау (айлық)", defaultPoints: 10 },

  // ===== ИННОВАЦИЯЛАР =====
  { section: "Инновациялар", subsection: "Жаңа әдіс", name: "Жаңа сабақ әдісін енгізу", defaultPoints: 20 },
  { section: "Инновациялар", subsection: "Жаңа әдіс", name: "Белсенді оқыту әдісін жүйелі қолдану", defaultPoints: 15 },
  { section: "Инновациялар", subsection: "Жаңа әдіс", name: "Саралап оқыту тәсілін енгізу", defaultPoints: 20 },
  { section: "Инновациялар", subsection: "Жаңа әдіс", name: "Жобалық оқыту (PBL) элементтерін енгізу", defaultPoints: 20 },
  { section: "Инновациялар", subsection: "Жаңа әдіс", name: "STEM элементтерін сабаққа енгізу", defaultPoints: 20 },
  { section: "Инновациялар", subsection: "Жаңа әдіс", name: "Геймификация элементін енгізу", defaultPoints: 15 },
  { section: "Инновациялар", subsection: "Жаңа әдіс", name: "Флиппед класс тәсілін қолдану", defaultPoints: 20 },

  { section: "Инновациялар", subsection: "Творчество", name: "Шығармашылық жоба жасау", defaultPoints: 25 },
  { section: "Инновациялар", subsection: "Творчество", name: "Авторлық тапсырмалар жинағын құрастыру", defaultPoints: 25 },
  { section: "Инновациялар", subsection: "Творчество", name: "Авторлық жұмыс дәптерін әзірлеу", defaultPoints: 25 },
  { section: "Инновациялар", subsection: "Творчество", name: "Пән бойынша ойын/квест құрастыру", defaultPoints: 20 },
  { section: "Инновациялар", subsection: "Творчество", name: "Бейнесабақ / mini-course жасау", defaultPoints: 20 },

  { section: "Инновациялар", subsection: "Цифрландыру", name: "Сандық оқу материалын әзірлеу", defaultPoints: 15 },
  { section: "Инновациялар", subsection: "Цифрландыру", name: "Интерактивті презентация/симуляция жасау", defaultPoints: 15 },
  { section: "Инновациялар", subsection: "Цифрландыру", name: "Онлайн курс беті/платформа құрылымдау", defaultPoints: 20 },
  { section: "Инновациялар", subsection: "Цифрландыру", name: "Электронды бағалау жүйесін тиімді қолдану", defaultPoints: 10 },

  { section: "Инновациялар", subsection: "Бағалау", name: "Қалыптастырушы бағалау құралдарын жаңарту", defaultPoints: 15 },
  { section: "Инновациялар", subsection: "Бағалау", name: "Рубрика/дескрипторлардың авторлық үлгісін жасау", defaultPoints: 20 },
  { section: "Инновациялар", subsection: "Бағалау", name: "Деректерге негізделген талдау жүргізу (сынып нәтижесі)", defaultPoints: 20 },

  { section: "Инновациялар", subsection: "AI / EdTech", name: "AI құралын сабақ жоспарлауда қолдану", defaultPoints: 10 },
  { section: "Инновациялар", subsection: "AI / EdTech", name: "AI құралын тапсырма саралауда қолдану", defaultPoints: 15 },
  { section: "Инновациялар", subsection: "AI / EdTech", name: "AI құралын кері байланыс дайындауда қолдану", defaultPoints: 10 },
  { section: "Инновациялар", subsection: "AI / EdTech", name: "AI қолдану бойынша әріптестерге шеберлік сағаты", defaultPoints: 20 },

  // ===== ОҚУШЫ ЖЕТІСТІГІ (қосымша пайдалы бөлім) =====
  { section: "Оқушы жетістігі", subsection: "Олимпиада", name: "Оқушыны олимпиадаға дайындау (қатысу, мектепішілік)", defaultPoints: 10 },
  { section: "Оқушы жетістігі", subsection: "Олимпиада", name: "Оқушыны олимпиадаға дайындау (аудандық қатысу)", defaultPoints: 15 },
  { section: "Оқушы жетістігі", subsection: "Олимпиада", name: "Оқушы жүлдесі (аудандық олимпиада)", defaultPoints: 25 },
  { section: "Оқушы жетістігі", subsection: "Олимпиада", name: "Оқушы жүлдесі (облыстық олимпиада)", defaultPoints: 35 },
  { section: "Оқушы жетістігі", subsection: "Олимпиада", name: "Оқушы жүлдесі (республикалық олимпиада)", defaultPoints: 50 },

  { section: "Оқушы жетістігі", subsection: "Байқаулар", name: "Оқушыны ғылыми жобаға дайындау (қатысу)", defaultPoints: 15 },
  { section: "Оқушы жетістігі", subsection: "Байқаулар", name: "Оқушы жүлдесі (ғылыми жоба, аудандық)", defaultPoints: 25 },
  { section: "Оқушы жетістігі", subsection: "Байқаулар", name: "Оқушы жүлдесі (ғылыми жоба, облыстық)", defaultPoints: 35 },
  { section: "Оқушы жетістігі", subsection: "Байқаулар", name: "Оқушы жүлдесі (ғылыми жоба, республикалық)", defaultPoints: 50 },
  { section: "Оқушы жетістігі", subsection: "Байқаулар", name: "Оқушыны шығармашылық/спорттық байқауға дайындау", defaultPoints: 10 },

  { section: "Оқушы жетістігі", subsection: "Нәтиже", name: "Сыныптың оқу сапасының өсуі", defaultPoints: 20 },
  { section: "Оқушы жетістігі", subsection: "Нәтиже", name: "Үлгерімі төмен оқушымен нәтижелі жұмыс", defaultPoints: 15 },
  { section: "Оқушы жетістігі", subsection: "Нәтиже", name: "Дарынды оқушымен жеке жоспар бойынша жұмыс", defaultPoints: 15 },

  // ===== ЖАРИЯЛАНЫМ / АВТОРЛЫҚ МАТЕРИАЛ =====
  { section: "Жарияланым", subsection: "Мақалалар", name: "Мектеп деңгейінде мақала жариялау", defaultPoints: 10 },
  { section: "Жарияланым", subsection: "Мақалалар", name: "Аудандық басылымда мақала жариялау", defaultPoints: 15 },
  { section: "Жарияланым", subsection: "Мақалалар", name: "Облыстық басылымда мақала жариялау", defaultPoints: 20 },
  { section: "Жарияланым", subsection: "Мақалалар", name: "Республикалық басылымда мақала жариялау", defaultPoints: 30 },
  { section: "Жарияланым", subsection: "Мақалалар", name: "Халықаралық жинақта мақала жариялау", defaultPoints: 40 },

  { section: "Жарияланым", subsection: "Авторлық материал", name: "Авторлық бағдарлама әзірлеу", defaultPoints: 30 },
  { section: "Жарияланым", subsection: "Авторлық материал", name: "Факультатив/электив курс бағдарламасын жасау", defaultPoints: 25 },
  { section: "Жарияланым", subsection: "Авторлық материал", name: "Әдістемелік құрал шығару", defaultPoints: 35 },
  { section: "Жарияланым", subsection: "Авторлық материал", name: "Электронды ресурс / сайтша әзірлеу", defaultPoints: 25 }
].map(x => ({ ...x, active: true }));

/** ---------- tiny state store ---------- */
const store = {
  state: {
    route: parseRoute(),
    booting: true,
    loading: false,
    toasts: [],
    modal: null, // {kind:'crop', file}
    authUser: null,
    userDoc: null,

    // data caches
    types: [],
    users: [],
    mySubmissions: [],
    pendingSubmissions: [],
    adminRecentSubs: [],

    // teacher statements / requests
    myRequests: [],
    pendingRequests: [],
    adminRecentRequests: [],

    // documents (admin → teacher)
    myDocuments: [],
    allDocuments: [],
    // teacher personal documents (uploaded by teacher)
    myTeacherDocs: [],

    // news feed
    news: [],

    // announcements (admin banners)
    announcements: [],

    // ui
    statsRangeMode: "14d",
    statsView: "mine",
    theme: (function () { try { return localStorage.getItem("kpi_theme") || "light"; } catch (e) { return "light"; } })(),
    accessibility: { reduceMotion: false, largeText: false, highContrast: false },
    showAccessibilityModal: false
  },
  subs: new Set()
};

function setState(patch) {
  store.state = { ...store.state, ...patch };
  for (const fn of store.subs) fn(store.state);
}
function useStore() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const fn = () => rerender(x => x + 1);
    store.subs.add(fn);
    return () => store.subs.delete(fn);
  }, []);
  return store.state;
}

function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem("kpi_theme", t); } catch (e) { }
  setState({ theme: t });
}
function toggleTheme() {
  const next = store.state.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  const u = store.state.userDoc;
  if (u) {
    pb.collection("users").update(u.id, { preferredTheme: next }).catch(() => { });
  }
}

/* -------- Accessibility settings -------- */
function getDefaultAccessibility() {
  return { reduceMotion: false, largeText: false, highContrast: false };
}
function applyAccessibility(acc) {
  const el = document.documentElement;
  el.setAttribute("data-reduce-motion", acc.reduceMotion ? "true" : "false");
  el.setAttribute("data-large-text", acc.largeText ? "true" : "false");
  el.setAttribute("data-high-contrast", acc.highContrast ? "true" : "false");
  setState({ accessibility: { ...acc } });
}
async function saveAccessibility(uid, acc) {
  try {
    await pb.collection("users").update(uid, { accessibility: acc });
  } catch (e) { console.warn("Accessibility save failed:", e); }
}

/** ---------- router ---------- */
const ROUTES = [
  "login", "onboarding", "dashboard", "profile", "rating", "stats", "add",
  "requests", "documents", "news", "support",
  "admin/approvals", "admin/requests", "admin/types", "admin/users", "admin/teacher", "admin/documents", "admin/support", "admin/announcements"
];

function parseRoute() {
  const raw = (window.location.hash || "#/login").replace(/^#\/?/, "");
  const [pRaw, qs] = raw.split("?");
  let path = (pRaw || "login").replace(/\/+$/, "");
  if (!path || path === '/') path = 'login';
  const params = {};
  if (qs) {
    const sp = new URLSearchParams(qs);
    for (const [k, v] of sp.entries()) params[k] = v;
  }
  return { path, params };
}
function navigate(path, params = {}) {
  try { window.__closeDrawer?.(); } catch (e) { }
  const qs = new URLSearchParams(params).toString();
  window.location.hash = `#/${path}${qs ? `?${qs}` : ""}`;
  // Immediately update route visibility for instant feedback
  const resolved = ROUTES.includes(path) ? path : "login";
  updateRouteVisibility(resolved);
  store.state = { ...store.state, route: { path: resolved, params } };
  for (const fn of store.subs) fn(store.state);
}
function resolvePath(path) { return ROUTES.includes(path) ? path : "login"; }

function canAccess(path, userDoc) {
  const isAuth = !!userDoc;
  if (!isAuth) return path === "login";
  const role = userDoc.role || "teacher";
  if (path === "onboarding") return true;
  if (role === "teacher") {
    if (userDoc.onboarded !== true) return false; // block all pages until onboarding done
    if (path.startsWith("admin/")) return false;
    return ["dashboard", "profile", "rating", "stats", "add", "requests", "documents", "news", "support"].includes(path);
  }
  if (role === "admin") {
    if (path === "add") return false;
    return ["dashboard", "profile", "rating", "stats", "documents", "news"].includes(path) || path.startsWith("admin/");
  }
  return false;
}
function updateRouteVisibility(path) {
  document.querySelectorAll("[data-route]").forEach(sec => {
    sec.hidden = sec.getAttribute("data-route") !== path;
  });
}

/** ---------- React mount/render layer ---------- */
const __roots = new Map();
const __mountedContent = new Map(); // track which mount points have content
let __lastRenderedPath = null; // tracks the previously rendered route for proper unmounting
function mount(id, el) {
  const node = document.getElementById(id);
  if (!node) return;
  // Skip re-rendering null if this mount point was already null (or never mounted)
  const hadContent = __mountedContent.get(id);
  if (el === null && hadContent === false) return;
  __mountedContent.set(id, el !== null);
  let root = __roots.get(id);
  if (!root) {
    root = createRoot(node);
    __roots.set(id, root);
  }
  root.render(el);
}

let __layoutMounted = false;
async function render() {
  const route = parseRoute();
  const prev = store.state.route;
  if (!prev || prev.path !== route.path || JSON.stringify(prev.params || {}) !== JSON.stringify(route.params || {})) {
    store.state = { ...store.state, route };
    for (const fn of store.subs) fn(store.state);
  }

  const rawPath = route.path || "login";
  const path = resolvePath(rawPath);
  if (path !== rawPath) {
    navigate(path, route.params || {});
    return;
  }
  updateRouteVisibility(path);

  // Layout — mount only once; they self-update via useStore()
  if (!__layoutMounted) {
    __layoutMounted = true;
    mount("mount-sidebar", <ErrorBoundary name="sidebar"><SidebarNav /></ErrorBoundary>);
    mount("mount-drawer", <ErrorBoundary name="drawer"><SidebarNav /></ErrorBoundary>);
    mount("mount-topbar", <ErrorBoundary name="topbar"><TopbarRight /></ErrorBoundary>);
    mount("mount-topbar-right", <ErrorBoundary name="topbar"><TopbarRight /></ErrorBoundary>);
    mount("mount-bottomnav", <ErrorBoundary name="bottomnav"><BottomNav /></ErrorBoundary>);
    mount("mount-overlays", <ErrorBoundary name="overlays"><Overlays /></ErrorBoundary>);
    mount("mount-announcements", <ErrorBoundary name="announcements"><AnnouncementBanner /></ErrorBoundary>);
  }

  // Pages — only mount/unmount the active page + previous page (to clear it)
  const booting = store.state.booting;
  const prevPath = __lastRenderedPath;
  const pages = {
    "login": () => <ErrorBoundary name="login"><PageLogin /></ErrorBoundary>,
    "onboarding": () => <ErrorBoundary name="onboarding">{booting ? <LoadingScreen /> : <PageOnboarding />}</ErrorBoundary>,
    "dashboard": () => <ErrorBoundary name="dashboard">{booting ? <LoadingScreen /> : <PageDashboard />}</ErrorBoundary>,
    "profile": () => <ErrorBoundary name="profile">{booting ? <LoadingScreen /> : <PageProfile />}</ErrorBoundary>,
    "rating": () => <ErrorBoundary name="rating">{booting ? <LoadingScreen /> : <PageRating />}</ErrorBoundary>,
    "stats": () => <ErrorBoundary name="stats">{booting ? <LoadingScreen /> : <PageStats />}</ErrorBoundary>,
    "add": () => <ErrorBoundary name="add">{booting ? <LoadingScreen /> : <PageAdd />}</ErrorBoundary>,
    "requests": () => <ErrorBoundary name="requests">{booting ? <LoadingScreen /> : <PageRequests />}</ErrorBoundary>,
    "documents": () => <ErrorBoundary name="documents">{booting ? <LoadingScreen /> : <PageDocuments />}</ErrorBoundary>,
    "news": () => <ErrorBoundary name="news">{booting ? <LoadingScreen /> : <PageNews />}</ErrorBoundary>,
    "support": () => <ErrorBoundary name="support">{booting ? <LoadingScreen /> : <PageSupport />}</ErrorBoundary>,
    "admin/approvals": () => <ErrorBoundary name="admin/approvals">{booting ? <LoadingScreen /> : <PageAdminApprovals />}</ErrorBoundary>,
    "admin/requests": () => <ErrorBoundary name="admin/requests">{booting ? <LoadingScreen /> : <PageAdminRequests />}</ErrorBoundary>,
    "admin/documents": () => <ErrorBoundary name="admin/documents">{booting ? <LoadingScreen /> : <PageAdminDocuments />}</ErrorBoundary>,
    "admin/types": () => <ErrorBoundary name="admin/types">{booting ? <LoadingScreen /> : <PageAdminTypes />}</ErrorBoundary>,
    "admin/users": () => <ErrorBoundary name="admin/users">{booting ? <LoadingScreen /> : <PageAdminUsers />}</ErrorBoundary>,
    "admin/teacher": () => <ErrorBoundary name="admin/teacher">{booting ? <LoadingScreen /> : <PageAdminTeacher />}</ErrorBoundary>,
    "admin/support": () => <ErrorBoundary name="admin/support">{booting ? <LoadingScreen /> : <PageAdminSupport />}</ErrorBoundary>,
    "admin/announcements": () => <ErrorBoundary name="admin/announcements">{booting ? <LoadingScreen /> : <PageAdminAnnouncements />}</ErrorBoundary>,
  };
  const toMountId = (p) => "mount-" + p.replace("/", "-");
  // Clear previous page if different
  if (prevPath && prevPath !== path) {
    mount(toMountId(prevPath), null);
  }
  // Mount active page
  const factory = pages[path];
  if (factory) mount(toMountId(path), factory());
  __lastRenderedPath = path;
}

function setupMobileDrawer() {
  const drawer = document.getElementById("mobileDrawer");
  const backdrop = document.getElementById("mobileDrawerBackdrop");
  const btnOpen = document.getElementById("btnMobileMenu");
  const btnClose = document.getElementById("btnDrawerClose");
  if (!drawer || !backdrop || !btnOpen || !btnClose) return;

  const open = () => {
    drawer.hidden = false;
    backdrop.hidden = false;
    drawer.classList.add("open");
    backdrop.classList.add("open");
  };
  const close = () => {
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
    drawer.hidden = true;
    backdrop.hidden = true;
  };

  btnOpen.addEventListener("click", open);
  btnClose.addEventListener("click", close);
  backdrop.addEventListener("click", close);

  window.__closeDrawer = close;
}


/** ---------- helpers ---------- */
const fmtPoints = (n) => (Number(n) || 0).toLocaleString("ru-RU");
const safeText = (v) => (v ?? "").toString().trim();
function ymd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function tsKey(x) {
  return new Date(x?.created || 0).getTime();
}
function sum(arr, fn) { return arr.reduce((a, x) => a + (Number(fn(x)) || 0), 0); }
function lastDays(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push({ ymd: ymd(d), label: `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` });
  }
  return out;
}

function lastMonths(n) {
  const out = [];
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setMonth(start.getMonth() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    out.push({ key: `${y}-${m}`, label: `${m}-${String(y).slice(2)}` });
  }
  return out;
}
function startYMDFromDays(days) {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return ymd(d);
}
function levelFromPoints(p) {
  const x = Number(p) || 0;
  if (x >= 500) return { name: t("lvlLegend"), next: null, pct: 100 };
  if (x >= 300) return { name: t("lvlLeader"), next: 500, pct: Math.round(((x - 300) / (200)) * 100) };
  if (x >= 150) return { name: t("lvlPro"), next: 300, pct: Math.round(((x - 150) / (150)) * 100) };
  if (x >= 50) return { name: t("lvlConfident"), next: 150, pct: Math.round(((x - 50) / (100)) * 100) };
  return { name: t("lvlNewbie"), next: 50, pct: Math.round((x / 50) * 100) };
}

/** ---------- toasts ---------- */
function toast(msg, kind = "info") {
  const id = Math.random().toString(36).slice(2);
  const item = { id, msg, kind };
  setState({ toasts: [item, ...store.state.toasts].slice(0, 3) });
  setTimeout(() => setState({ toasts: store.state.toasts.filter(t => t.id !== id) }), 3200);
}

/** ---------- PocketBase api ---------- */
async function ensureUserDoc() {
  const user = pb.authStore.record;
  if (!user) return null;
  if (!user.displayName) {
    let preName = "", prePosition = "";
    try {
      const pre = await pb.collection("preUsers").getFirstListItem(`email="${user.email.toLowerCase()}"`);
      preName = pre.displayName || "";
      prePosition = pre.position || "";
    } catch (_) { }
    const patch = {};
    if (preName) patch.displayName = preName;
    if (prePosition) patch.position = prePosition;
    if (Object.keys(patch).length) {
      const updated = await pb.collection("users").update(user.id, patch);
      return normalizeUser(updated);
    }
  }
  return normalizeUser(user);
}

async function hasAnyAdmin() {
  try {
    const res = await pb.collection("users").getList(1, 1, { filter: 'role="admin"' });
    return res.totalItems > 0;
  } catch { return false; }
}

async function fetchTypesAll() {
  const arr = await pb.collection("types").getFullList({ sort: "section,subsection,name" });
  return arr;
}
async function fetchTypesActive() {
  return await pb.collection("types").getFullList({ filter: "active=true", sort: "section,subsection,name" });
}
async function seedDefaultTypes() {
  const existing = await fetchTypesAll();
  const key = (t) => `${(t.section || "").toLowerCase()}||${(t.subsection || "").toLowerCase()}||${(t.name || "").toLowerCase()}`;
  const have = new Set(existing.map(key));
  const missing = DEFAULT_TYPES.filter(t => !have.has(key(t)));
  for (const t of missing) await pb.collection("types").create(t);
  return { added: missing.length };
}
async function addType(p) {
  await pb.collection("types").create({
    section: safeText(p.section),
    subsection: safeText(p.subsection),
    name: safeText(p.name),
    defaultPoints: Number(p.defaultPoints) || 0,
    active: true
  });
}
async function toggleType(id, active) {
  await pb.collection("types").update(id, { active: !!active });
}
async function deleteTypeDoc(id) {
  await pb.collection("types").delete(id);
}
async function updateType(id, data) {
  await pb.collection("types").update(id, data);
}

async function fetchUsersAll() {
  const arr = await pb.collection("users").getFullList({ sort: "-totalPoints" });
  return arr.map(normalizeUser);
}

async function fetchMySubmissions(uid) {
  const arr = await pb.collection("submissions").getFullList({ filter: `uid="${uid}"`, sort: "-created" });
  return arr.map(normalizeSub);
}
async function fetchPendingSubmissions() {
  const arr = await pb.collection("submissions").getFullList({ filter: 'status="pending"', sort: "-created" });
  return arr.map(normalizeSub);
}
async function fetchAdminRecentSubs() {
  const arr = await pb.collection("submissions").getFullList({ sort: "-created" });
  return arr.map(normalizeSub);
}

async function createSubmission({ uid, type, title, description, eventDate, evidenceLink, evidenceFile }) {
  const data = {
    uid,
    typeId: type.id,
    typeName: type.name,
    typeSection: type.section,
    typeSubsection: type.subsection,
    points: Number(type.defaultPoints) || 0,
    title: safeText(title),
    description: safeText(description),
    eventDate: safeText(eventDate),
    evidenceLink: safeText(evidenceLink),
    status: "pending"
  };
  if (evidenceFile) {
    const formData = new FormData();
    for (const [k, v] of Object.entries(data)) formData.append(k, v);
    formData.append("evidenceFile", evidenceFile);
    await pb.collection("submissions").create(formData);
  } else {
    await pb.collection("submissions").create(data);
  }
}
async function approveSubmission(subId, adminUid) {
  const sub = await pb.collection("submissions").getOne(subId);
  if (sub.status !== "pending") return;
  await pb.collection("submissions").update(subId, {
    status: "approved",
    decidedAt: new Date().toISOString(),
    decidedBy: adminUid
  });
  await pb.collection("users").update(sub.uid, {
    "totalPoints+": Number(sub.points) || 0
  });
}
async function rejectSubmission(subId, adminUid) {
  await pb.collection("submissions").update(subId, { status: "rejected", decidedAt: new Date().toISOString(), decidedBy: adminUid });
}

/** ---------- teacher statements / requests ---------- */
const REQUEST_KINDS = [
  { key: "leave", tKey: "rkLeave", compMode: "none" },
  { key: "weekday_off", tKey: "rkWeekdayOff", compMode: "use" },
  { key: "weekend_work", tKey: "rkWeekendWork", compMode: "earn" }
];
function requestKindLabel(key) {
  const k = REQUEST_KINDS.find(x => x.key === key);
  return k ? t(k.tKey) : String(key || "");
}
function dateRangeDays(fromYmd, toYmd) {
  const a = safeText(fromYmd);
  const b = safeText(toYmd) || a;
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return 1;
  const ms = db.getTime() - da.getTime();
  const diff = Math.floor(ms / 86400000);
  return Math.max(1, diff + 1);
}

async function fetchMyRequests(uid) {
  const arr = await pb.collection("requests").getFullList({ filter: `uid="${uid}"`, sort: "-created" });
  return arr.map(normalizeReq);
}
async function fetchPendingRequests() {
  const arr = await pb.collection("requests").getFullList({ filter: 'status="pending"', sort: "-created" });
  return arr.map(normalizeReq);
}
async function fetchAdminRecentRequests() {
  const arr = await pb.collection("requests").getFullList({ sort: "-created" });
  return arr.map(normalizeReq);
}

async function createTeacherRequest({ uid, kind, dateFrom, dateTo, note, evidenceFile }) {
  const k = REQUEST_KINDS.find(x => x.key === kind) || REQUEST_KINDS[0];
  const from = safeText(dateFrom);
  const to = safeText(dateTo) || from;
  const days = dateRangeDays(from, to);
  const data = {
    uid,
    kind: k.key,
    kindLabel: t(k.tKey),
    compMode: k.compMode,
    dateFrom: from,
    dateTo: to,
    days,
    note: safeText(note),
    status: "pending",
    pointsDelta: 0,
    compDaysDelta: 0
  };
  if (evidenceFile) {
    const formData = new FormData();
    for (const [key, val] of Object.entries(data)) formData.append(key, val);
    formData.append("evidenceFile", evidenceFile);
    await pb.collection("requests").create(formData);
  } else {
    await pb.collection("requests").create(data);
  }
}

/* -------- Online presence -------- */
let __presenceErrorShown = false;
async function setUserOnline(uid, isOnline) {
  try {
    await pb.collection("users").update(uid, {
      online: isOnline,
      lastSeen: new Date().toISOString()
    });
    __presenceErrorShown = false;
  } catch (e) {
    console.warn("Presence update failed:", e);
    if (!__presenceErrorShown) {
      __presenceErrorShown = true;
      toast(t("presenceError"), "error");
    }
  }
}

/* -------- Delete user + their data -------- */
async function deleteUserAndData(uid) {
  const [subs, reqs, docs] = await Promise.all([
    pb.collection("submissions").getFullList({ filter: `uid="${uid}"` }),
    pb.collection("requests").getFullList({ filter: `uid="${uid}"` }),
    pb.collection("documents").getFullList({ filter: `toUid="${uid}"` })
  ]);
  await Promise.all([
    ...subs.map(d => pb.collection("submissions").delete(d.id)),
    ...reqs.map(d => pb.collection("requests").delete(d.id)),
    ...docs.map(d => pb.collection("documents").delete(d.id)),
    pb.collection("users").delete(uid)
  ]);
}

/* -------- Documents (admin → teacher) -------- */
async function createDocument({ fromUid, toUid, toEmail, toName, title, body, requireSignature }) {
  await pb.collection("documents").create({
    fromUid,
    toUid,
    toEmail: safeText(toEmail),
    toName: safeText(toName),
    title: safeText(title),
    body: safeText(body),
    requireSignature: !!requireSignature,
    status: "sent"
  });
}
async function fetchDocumentsForTeacher(uid) {
  const arr = await pb.collection("documents").getFullList({ filter: `toUid="${uid}"`, sort: "-created" });
  return arr.map(normalizeDoc);
}
async function fetchAllDocuments() {
  const arr = await pb.collection("documents").getFullList({ sort: "-created" });
  return arr.map(normalizeDoc);
}
async function signDocument(docId, signatureBlob) {
  const formData = new FormData();
  formData.append("status", "signed");
  formData.append("signedAt", new Date().toISOString());
  if (signatureBlob) formData.append("signatureFile", signatureBlob);
  await pb.collection("documents").update(docId, formData);
}
async function markDocumentViewed(docId) {
  await pb.collection("documents").update(docId, { status: "viewed" });
}

// ---- teacher personal documents (teacher_documents collection) ----
async function fetchMyTeacherDocs(uid) {
  const arr = await pb.collection("teacher_documents").getFullList({ filter: `uid="${uid}"`, sort: "-created" });
  return arr.map(normalizeTeacherDoc);
}
async function createMyTeacherDoc({ uid, title, description, file, fileName }) {
  const formData = new FormData();
  formData.append("uid", uid);
  formData.append("title", safeText(title));
  formData.append("description", safeText(description));
  formData.append("fileName", safeText(fileName));
  if (file) formData.append("file", file);
  await pb.collection("teacher_documents").create(formData);
}
async function uploadTeacherDocFile(uid, file) {
  // PocketBase handles files as record fields, return the file itself for FormData usage
  return file;
}

async function decideTeacherRequest(reqId, adminUid, action, pointsDelta) {
  const r = await pb.collection("requests").getOne(reqId);
  if (r.status !== "pending") return;

  const u = await pb.collection("users").getOne(r.uid);

  if (action === "reject") {
    await pb.collection("requests").update(reqId, {
      status: "rejected",
      decidedAt: new Date().toISOString(),
      decidedBy: adminUid,
      pointsDelta: 0,
      compDaysDelta: 0
    });
    return;
  }

  const deltaPts = Number(pointsDelta) || 0;
  const days = Number(r.days) || dateRangeDays(r.dateFrom, r.dateTo);
  const mode = r.compMode || "none";
  const compDelta = mode === "earn" ? days : mode === "use" ? -days : 0;
  const curComp = Number(u.compDays) || 0;
  if (curComp + compDelta < 0) {
    throw new Error(`Недостаточно отгулов: нужно ${Math.abs(compDelta)}, есть ${curComp}`);
  }

  await pb.collection("requests").update(reqId, {
    status: "approved",
    decidedAt: new Date().toISOString(),
    decidedBy: adminUid,
    pointsDelta: deltaPts,
    compDaysDelta: compDelta
  });
  const patch = {};
  if (deltaPts) patch["totalPoints+"] = deltaPts;
  if (compDelta) patch["compDays+"] = compDelta;
  if (Object.keys(patch).length) await pb.collection("users").update(r.uid, patch);
}

async function setRole(uid, role) {
  await pb.collection("users").update(uid, { role });
}
async function setPosition(uid, position) {
  await pb.collection("users").update(uid, { position });
}
async function logAdminAction({ action, targetUid, targetName, details }) {
  try {
    const u = store.state.userDoc;
    await pb.collection("admin_logs").create({
      action,
      targetUid: targetUid || "",
      targetName: targetName || "",
      details: details || "",
      adminUid: u?.id || "",
      adminName: u?.displayName || u?.email || ""
    });
  } catch (e) { console.error("logAdminAction error:", e); }
}
async function fetchAdminLogs(limitN = 200) {
  const res = await pb.collection("admin_logs").getList(1, limitN, { sort: "-created" });
  return res.items;
}
async function updateProfile(uid, patch) {
  await pb.collection("users").update(uid, patch);
}
async function fetchCustomPositions() {
  try {
    const rec = await pb.collection("settings").getFirstListItem('key="positions"');
    return rec.value?.list || [];
  } catch { return []; }
}
async function saveCustomPositions(list) {
  try {
    const rec = await pb.collection("settings").getFirstListItem('key="positions"');
    await pb.collection("settings").update(rec.id, { value: { list } });
  } catch {
    await pb.collection("settings").create({ key: "positions", value: { list } });
  }
}

/** ---------- file upload helpers ---------- */
async function uploadAvatar(uid, blob) {
  const formData = new FormData();
  formData.append("avatar", new File([blob], "avatar.png", { type: blob.type || "image/png" }));
  const updated = await pb.collection("users").update(uid, formData);
  return getFileUrl(updated, "avatar");
}

/** ---------- news api ---------- */
const NEWS_CAT_ICONS = { science: "\u{1F52C}", school: "\u{1F3EB}", event: "\u{1F389}", sport: "\u26BD", achievement: "\u{1F3C6}", other: "\u{1F4CC}" };
const NEWS_CATEGORIES = [
  { key: "science", tKey: "catScience" },
  { key: "school", tKey: "catSchool" },
  { key: "event", tKey: "catEvent" },
  { key: "sport", tKey: "catSport" },
  { key: "achievement", tKey: "catAchievement" },
  { key: "other", tKey: "catOther" },
];
const NEWS_FONTS = [
  { key: "", label: "Default" },
  { key: "'Georgia', serif", label: "Georgia" },
  { key: "'Courier New', monospace", label: "Courier" },
  { key: "'Comic Sans MS', cursive", label: "Comic Sans" },
  { key: "'Times New Roman', serif", label: "Times" },
  { key: "'Trebuchet MS', sans-serif", label: "Trebuchet" },
];
const NEWS_MOODS = ["😊", "😂", "😍", "🔥", "👏", "💪", "🎉", "😎", "🤔", "😢", "❤️", "👍"];

/** Parse simple **bold** and *italic* markers in text */
function renderRichDesc(text) {
  if (!text) return null;
  const parts = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)/g;
  let last = 0;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(React.createElement("strong", { key: m.index }, m[2]));
    else if (m[3]) parts.push(React.createElement("em", { key: m.index }, m[4]));
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function newsCatLabel(key) {
  const c = NEWS_CATEGORIES.find(x => x.key === key);
  return c ? t(c.tKey) : key;
}

async function fetchNewsAll() {
  const arr = await pb.collection("news").getFullList({ sort: "-created" });
  return arr.map(normalizeNews);
}

async function createNewsPost({ uid, authorName, authorRole, avatarUrl, category, title, description, photoFile, coverFile, link, mood, fontFamily }) {
  const formData = new FormData();
  formData.append("uid", uid);
  formData.append("authorName", safeText(authorName));
  formData.append("authorRole", safeText(authorRole));
  formData.append("authorAvatar", safeText(avatarUrl));
  formData.append("category", safeText(category));
  formData.append("title", safeText(title));
  formData.append("description", safeText(description));
  formData.append("link", safeText(link));
  formData.append("mood", safeText(mood || ""));
  formData.append("fontFamily", safeText(fontFamily || ""));
  formData.append("likes", JSON.stringify([]));
  formData.append("pinned", false);
  if (photoFile) formData.append("photo", photoFile);
  if (coverFile) formData.append("cover", coverFile);
  await pb.collection("news").create(formData);
}

async function toggleNewsLike(newsId, uid, currentLikes) {
  const hasLiked = (currentLikes || []).includes(uid);
  if (hasLiked) {
    await pb.collection("news").update(newsId, { "likes-": [uid] });
  } else {
    await pb.collection("news").update(newsId, { "likes+": [uid] });
  }
}

async function fetchNewsComments(newsId) {
  const arr = await pb.collection("comments").getFullList({ filter: `newsId="${newsId}"`, sort: "created" });
  return arr.map(normalizeComment);
}

async function addNewsComment(newsId, { uid, authorName, avatarUrl, text }) {
  await pb.collection("comments").create({
    newsId,
    uid,
    authorName: safeText(authorName),
    authorAvatar: safeText(avatarUrl),
    text: safeText(text)
  });
}

async function deleteNewsPost(newsId) {
  const comments = await pb.collection("comments").getFullList({ filter: `newsId="${newsId}"` });
  await Promise.all(comments.map(c => pb.collection("comments").delete(c.id)));
  await pb.collection("news").delete(newsId);
}

async function toggleNewsPin(newsId, currentlyPinned) {
  await pb.collection("news").update(newsId, { pinned: !currentlyPinned });
}

/** ---------- support tickets ---------- */
async function fetchAllTickets() {
  return await pb.collection("tickets").getFullList({ sort: "-created" });
}
async function fetchMyTickets(uid) {
  return await pb.collection("tickets").getFullList({ filter: `uid="${uid}"`, sort: "-created" });
}
async function createTicket({ uid, authorName, authorEmail, subject, message, priority }) {
  await pb.collection("tickets").create({
    uid,
    authorName: safeText(authorName),
    authorEmail: safeText(authorEmail),
    subject: safeText(subject),
    message: safeText(message),
    priority: priority || "medium",
    status: "new"
  });
}
async function updateTicketStatus(ticketId, newStatus) {
  await pb.collection("tickets").update(ticketId, { status: newStatus });
}

/** ---------- announcements (admin → all users banner) ---------- */
async function fetchAnnouncements() {
  return await pb.collection("announcements").getFullList({ sort: "-created" });
}
async function createAnnouncement({ emoji, text, link, startDate, endDate }) {
  await pb.collection("announcements").create({
    emoji: safeText(emoji),
    text: safeText(text),
    link: safeText(link),
    startDate: startDate || "",
    endDate: endDate || ""
  });
}
async function deleteAnnouncement(id) {
  await pb.collection("announcements").delete(id);
}

/** ---------- ui components ---------- */
function Icon({ name }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none" };
  const s = { stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "user": return <svg {...common}><path {...s} d="M20 21a8 8 0 10-16 0" /><path {...s} d="M12 13a4 4 0 100-8 4 4 0 000 8z" /></svg>;
    case "rank": return <svg {...common}><path {...s} d="M4 20V10" /><path {...s} d="M10 20V4" /><path {...s} d="M16 20v-6" /><path {...s} d="M22 20v-9" /></svg>;
    case "chart": return <svg {...common}><path {...s} d="M4 19V5" /><path {...s} d="M4 19h16" /><path {...s} d="M7 15l3-3 3 2 5-6" /></svg>;
    case "plus": return <svg {...common}><path {...s} d="M12 5v14" /><path {...s} d="M5 12h14" /></svg>;
    case "logout": return <svg {...common}><path {...s} d="M10 17l5-5-5-5" /><path {...s} d="M15 12H3" /></svg>;
    case "check": return <svg {...common}><path {...s} d="M20 6L9 17l-5-5" /></svg>;
    case "x": return <svg {...common}><path {...s} d="M6 6l12 12M18 6L6 18" /></svg>;
    case "file": return <svg {...common}><path {...s} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path {...s} d="M14 2v6h6" /></svg>;
    case "shield": return <svg {...common}><path {...s} d="M12 22s8-4 8-10V6l-8-3-8 3v6c0 6 8 10 8 10z" /></svg>;
    case "sun": return <svg {...common}><circle {...s} cx="12" cy="12" r="4" /><path {...s} d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>;
    case "moon": return <svg {...common}><path {...s} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>;
    case "news": return <svg {...common}><path {...s} d="M4 22h14a2 2 0 002-2V7.5L14.5 2H6a2 2 0 00-2 2v4" /><path {...s} d="M14 2v6h6" /><path {...s} d="M2 15h10M2 19h6" /></svg>;
    case "bug": return <svg {...common}><path {...s} d="M8 2l1.88 1.88M16 2l-1.88 1.88M9 7.13v-1a3.003 3.003 0 116 0v1" /><path {...s} d="M12 20c-3.3 0-6-2.7-6-6v-3a6 6 0 0112 0v3c0 3.3-2.7 6-6 6z" /><path {...s} d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M6 17l-4 1M17.47 9c1.93-.2 3.53-1.9 3.53-4M18 13h4M18 17l4 1" /></svg>;
    case "home": return <svg {...common}><path {...s} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline {...s} points="9 22 9 12 15 12 15 22" /></svg>;
    case "chevron": return <svg {...common} style={{ transition: "transform .3s cubic-bezier(.4,0,.2,1)" }}><path {...s} d="M6 9l6 6 6-6" /></svg>;
    case "folder": return <svg {...common}><path {...s} d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>;
    case "clipboard": return <svg {...common}><path {...s} d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect {...s} x="8" y="2" width="8" height="4" rx="1" /></svg>;
    case "info": return <svg {...common}><circle {...s} cx="12" cy="12" r="10" /><path {...s} d="M12 16v-4M12 8h.01" /></svg>;
    case "eye": return <svg {...common}><path {...s} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle {...s} cx="12" cy="12" r="3" /></svg>;
    case "briefcase": return <svg {...common}><rect {...s} x="2" y="7" width="20" height="14" rx="2" /><path {...s} d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>;
    case "settings": return <svg {...common}><circle {...s} cx="12" cy="12" r="3" /><path {...s} d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" /></svg>;
    case "refresh": return <svg {...common}><path {...s} d="M23 4v6h-6" /><path {...s} d="M1 20v-6h6" /><path {...s} d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>;
    case "bell": return <svg {...common}><path {...s} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path {...s} d="M13.73 21a2 2 0 01-3.46 0" /></svg>;
    default: return null;
  }
}
const Btn = ({ kind = "", children, ...props }) => <button className={["btn", kind].join(" ").trim()} {...props}>{children}</button>;
const Input = (p) => <input className="input" {...p} />;
const Select = (p) => <select className="select" {...p} />;
const Textarea = (p) => <textarea className="textarea" {...p} />;
const Pill = ({ kind, children, style }) => <span className={`pill ${kind}`} style={style}>{children}</span>;
// Mobile-friendly data display: cards on mobile, table on desktop
function DataCards({ columns, rows, emptyText }) {
  if (!emptyText) emptyText = t("noData");
  if (!rows.length) return <p className="p muted" style={{ padding: "12px 0" }}>{emptyText}</p>;
  return (
    <div className="datacards-wrap">
      {/* Desktop: table */}
      <div className="heatwrap desktop-table">
        <table className="table">
          <thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.__key ?? i}>
                {columns.map(c => (
                  <td key={c.key} className="tiny">{c.render ? c.render(row) : row[c.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile: cards */}
      <div className="mobile-cards">
        {rows.map((row, i) => (
          <div key={row.__key ?? i} className="mobile-card glass">
            {columns.map(c => (
              <div key={c.key} className="mobile-card__row">
                <span className="mobile-card__label">{c.label}</span>
                <span className="mobile-card__val">{c.render ? c.render(row) : row[c.key]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}


function LoadingScreen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 16 }}>
      <div style={{
        width: 42, height: 42, borderRadius: 14,
        background: "#fff",
        display: "grid", placeItems: "center",
        overflow: "hidden",
        animation: "kpiPulse 1.4s ease-in-out infinite",
        boxShadow: "0 3px 12px rgba(135,188,46,.3)"
      }}><img src="/logo-nis.png" alt="NIS" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
      <style>{`@keyframes kpiPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.94)}}`}</style>
      <p className="p" style={{ margin: 0 }}>{t("loading")}</p>
    </div>
  );
}

function Guard() {
  return (
    <div className="glass card" style={{ maxWidth: 360 }}>
      <div className="h2">{t("needAuth")}</div>
      <p className="p">{t("loginToContinue")}</p>
      <div className="sep"></div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Btn kind="primary" onClick={() => navigate("login")}>{t("signIn")}</Btn>
      </div>
    </div>
  );
}


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err, info) {
    console.error("[ErrorBoundary]", this.props?.name || "", err, info);
  }
  render() {
    if (this.state.err) {
      const e = this.state.err;
      return (
        <div className="glass card">
          <div className="h2">{t("renderError")}</div>
          <p className="p">{t("section")}: <b>{this.props?.name || "page"}</b></p>
          <div className="sep"></div>
          <div className="tiny"><b>{String(e?.name || "Error")}</b>: {String(e?.message || e)}</div>
          <div className="help">{t("openDevtools")}</div>
          <div className="sep"></div>
          <Btn onClick={() => { this.setState({ err: null }); }}>{t("tryAgain")}</Btn>
        </div>
      );
    }
    return this.props.children;
  }
}


function NavFlyout({ icon, label, children, badge, open, onToggle }) {
  const bodyRef = useRef(null);
  const [height, setHeight] = useState(open ? "auto" : 0);

  useEffect(() => {
    if (!bodyRef.current) return;
    if (open) {
      const h = bodyRef.current.scrollHeight;
      setHeight(h + "px");
      const t = setTimeout(() => setHeight("auto"), 320);
      return () => clearTimeout(t);
    } else {
      setHeight(bodyRef.current.scrollHeight + "px");
      requestAnimationFrame(() => requestAnimationFrame(() => setHeight("0px")));
    }
  }, [open]);

  return (
    <div className={`nav-flyout${open ? " nav-flyout--open" : ""}`}>
      <div className="nav-flyout__head" role="button" tabIndex={0} onClick={onToggle}>
        <Icon name={icon} />
        <span className="nav-flyout__label">{label}</span>
        {badge > 0 && <span className="nav-badge nav-badge--flyout">{badge > 99 ? "99+" : badge}</span>}
        <span className="nav-flyout__chevron"><Icon name="chevron" /></span>
      </div>
      <div className="nav-flyout__body" ref={bodyRef} style={{ height, overflow: "hidden" }}>
        <div className="nav-flyout__items">{children}</div>
      </div>
    </div>
  );
}

function SidebarNav() {
  const st = useStore();
  const u = st.userDoc;
  const path = st.route.path;

  const badgeFor = (p) => {
    if (p === "admin/approvals") return (st.pendingSubmissions || []).length || 0;
    if (p === "admin/requests") return (st.pendingRequests || []).length || 0;
    if (p === "documents") return (st.myDocuments || []).filter(d => d.status === "sent").length || 0;
    if (p === "admin/support") return (st.allTickets || []).filter(tk => tk.status === "new").length || 0;
    return 0;
  };

  const NavLink = ({ it }) => {
    const badge = badgeFor(it.p);
    return (
      <div className={`navlink ${path === it.p ? "active" : ""}`} role="button" tabIndex={0} onClick={() => navigate(it.p)}>
        <Icon name={it.i} /> {t(it.tKey)}
        {badge > 0 && <span className="nav-badge">{badge > 99 ? "99+" : badge}</span>}
      </div>
    );
  };

  // Accordion: only one flyout open at a time; sync with current route
  const groupFor = (p) => {
    if (["rating", "stats"].includes(p)) return "analytics";
    if (["requests", "documents", "add"].includes(p)) return "work";
    if (["support", "onboarding"].includes(p)) return "info";
    return null;
  };
  const [openGroup, setOpenGroup] = useState(() => groupFor(path));
  useEffect(() => { setOpenGroup(groupFor(path)); }, [path]);
  const toggle = (key) => setOpenGroup(prev => prev === key ? null : key);

  // Admin panel items
  const adminItems = [
    { p: "admin/approvals", tKey: "navApprovals", i: "check" },
    { p: "admin/requests", tKey: "navRequests", i: "file" },
    { p: "admin/documents", tKey: "navDocuments", i: "shield" },
    { p: "admin/types", tKey: "navKpiTypes", i: "file" },
    { p: "admin/users", tKey: "navUsers", i: "user" },
    { p: "admin/support", tKey: "navSupport", i: "bug" },
    { p: "admin/announcements", tKey: "navAnnouncements", i: "bell" },
  ];

  // Flyout group badges (sum of children)
  const workBadge = badgeFor("documents");
  const adminReqBadge = badgeFor("admin/approvals") + badgeFor("admin/requests");
  const adminSupportBadge = badgeFor("admin/support");

  if (!u) {
    return (
      <div className="sidenav">
        <div className="navsec">{t("navTitle")}</div>
        <NavLink it={{ p: "login", tKey: "navLogin", i: "user" }} />
      </div>
    );
  }

  const isTeacher = u.role !== "admin";

  return (
    <div className="sidenav">
      <div className="navsec">{t("navTitle")}</div>

      {/* Dashboard — home page */}
      <NavLink it={{ p: "dashboard", tKey: "navDashboard", i: "home" }} />

      {/* Profile */}
      <NavLink it={{ p: "profile", tKey: "navProfile", i: "user" }} />

      {/* News — standalone */}
      <NavLink it={{ p: "news", tKey: "navNews", i: "news" }} />

      {/* Group 1: Рейтинг + Статистика */}
      <NavFlyout icon="rank" label={t("navGroupAnalytics")} open={openGroup === "analytics"} onToggle={() => toggle("analytics")}>
        <NavLink it={{ p: "rating", tKey: "navRating", i: "rank" }} />
        <NavLink it={{ p: "stats", tKey: "navStats", i: "chart" }} />
      </NavFlyout>

      {isTeacher && (
        <>
          {/* Group 2: Заявления + Документы + Добавить KPI */}
          <NavFlyout icon="clipboard" label={t("navGroupWork")} badge={workBadge} open={openGroup === "work"} onToggle={() => toggle("work")}>
            <NavLink it={{ p: "requests", tKey: "navRequests", i: "file" }} />
            <NavLink it={{ p: "documents", tKey: "navDocuments", i: "shield" }} />
            <NavLink it={{ p: "add", tKey: "navAddKpi", i: "plus" }} />
          </NavFlyout>

          {/* Group 3: Поддержка + Ознакомление */}
          <NavFlyout icon="info" label={t("navGroupInfo")} open={openGroup === "info"} onToggle={() => toggle("info")}>
            <NavLink it={{ p: "support", tKey: "navSupport", i: "bug" }} />
            <NavLink it={{ p: "onboarding", tKey: "navOnboarding", i: "check" }} />
          </NavFlyout>
        </>
      )}

      {u.role === "admin" && (
        <>
          <div className="navsec">{t("navAdmin")}</div>
          {adminItems.map(it => <NavLink key={it.p} it={it} />)}
        </>
      )}

    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const days = [t("daySun"), t("dayMon"), t("dayTue"), t("dayWed"), t("dayThu"), t("dayFri"), t("daySat")];
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const day = days[now.getDay()];
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return (
    <div className="live-clock">
      <span className="live-clock__date">{dd}.{mm}.{yyyy} <span className="live-clock__day">{day}</span></span>
      <span className="live-clock__time">{hh}:{min}</span>
    </div>
  );
}

function LangSwitcher() {
  const st = useStore();
  const lang = getLang();
  const langs = [
    { code: "kz", label: "KZ" },
    { code: "ru", label: "RU" },
    { code: "en", label: "EN" },
  ];
  return (
    <div className="lang-switcher">
      {langs.map(l => (
        <button
          key={l.code}
          className={`lang-switcher__btn${lang === l.code ? " lang-switcher__btn--active" : ""}`}
          onClick={() => { setLang(l.code); setState({ lang: l.code }); render(); }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function AccessibilityModal() {
  const st = useStore();
  if (!st.showAccessibilityModal) return null;
  const acc = st.accessibility || getDefaultAccessibility();
  const u = st.userDoc;
  const toggle = (key) => {
    const next = { ...acc, [key]: !acc[key] };
    applyAccessibility(next);
    if (u) saveAccessibility(u.id, next);
  };
  const close = () => setState({ showAccessibilityModal: false });
  const rows = [
    { key: "reduceMotion", label: t("accReduceMotion"), desc: t("accReduceMotionDesc") },
    { key: "largeText", label: t("accLargeText"), desc: t("accLargeTextDesc") },
    { key: "highContrast", label: t("accHighContrast"), desc: t("accHighContrastDesc") },
  ];
  return (
    <div className="modalback" onClick={close}>
      <div className="modal glass" style={{ maxWidth: 440, width: "92vw" }} onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <div>
            <div className="h2" style={{ marginBottom: 2 }}>{t("accessibilityTitle")}</div>
            <div className="tiny muted">{t("accessibilityDesc")}</div>
          </div>
          <Btn onClick={close}>✕</Btn>
        </div>
        <div className="acc-panel">
          {rows.map(r => (
            <div className="acc-row" key={r.key}>
              <div className="acc-row__info">
                <div className="acc-row__label">{r.label}</div>
                <div className="acc-row__desc">{r.desc}</div>
              </div>
              <button
                className={`acc-toggle${acc[r.key] ? " acc-toggle--on" : ""}`}
                onClick={() => toggle(r.key)}
                aria-label={r.label}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopbarRight() {
  const st = useStore();
  const u = st.userDoc;
  const isDark = st.theme !== "light";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <LiveClock />
      <LangSwitcher />
      <button
        className="iconbtn"
        onClick={() => setState({ showAccessibilityModal: true })}
        aria-label={t("accessibilityBtn")}
        title={t("accessibilityBtn")}
      >
        <Icon name="eye" />
      </button>
      <button
        className="iconbtn theme-toggle"
        onClick={toggleTheme}
        aria-label={isDark ? t("lightTheme") : t("darkTheme")}
        title={isDark ? t("lightTheme") : t("darkTheme")}
      >
        <Icon name={isDark ? "sun" : "moon"} />
      </button>
      {u ? (
        <>
          <Pill kind={u.role === "admin" ? "pending" : "approved"}>{u.role}</Pill>
          <div className="tiny" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <b>{u.displayName || t("unnamed")}</b>
          </div>
          <Btn kind="ghost" onClick={async () => { if (pb.authStore.record) await setUserOnline(pb.authStore.record.id, false); pb.authStore.clear(); toast(t("loggedOut")); navigate("login"); }}>
            <Icon name="logout" /> {t("navLogout")}
          </Btn>
        </>
      ) : (
        <div className="tiny muted">{t("guest")}</div>
      )}
    </div>
  );
}

function OnlineWidget() {
  const st = useStore();
  const u = st.userDoc;
  const [showOnline, setShowOnline] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  if (!u) return null;
  const allUsers = st.users || [];
  const onlineUsers = allUsers.filter(x => x.online === true);
  const onlineCount = onlineUsers.length + 1;
  const totalCount = allUsers.length;
  return (
    <>
      {showOnline && (
        <div className="modalback" onClick={() => setShowOnline(false)}>
          <div className="modal glass" style={{ maxWidth: 400, width: "90vw" }} onClick={e => e.stopPropagation()}>
            <div className="modal__head">
              <div className="h2">{t("onlineNow")}</div>
              <Btn onClick={() => setShowOnline(false)}>✕</Btn>
            </div>
            {onlineUsers.length === 0 ? (
              <p className="p muted">{t("noActiveUsers")}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                {onlineUsers.map(x => (
                  <div key={x.uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--hover-bg)", borderRadius: 8 }}>
                    <span className="online-dot" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{x.displayName || x.email || "—"}</div>
                      <div className="tiny muted">{x.role} · {x.school || x.subject || x.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="help" style={{ marginTop: 12 }}>{t("totalUsers")}: {totalCount} {t("employee")}</p>
          </div>
        </div>
      )}
      <div className={`online-widget${collapsed ? " online-widget--collapsed" : ""}`}>
        <button
          className="online-widget__btn"
          onClick={() => setShowOnline(true)}
          title={t("onlineNow")}
        >
          <span className="online-dot" />
          {!collapsed && (
            <div className="online-widget__info">
              <span className="online-widget__count">{onlineCount}</span>
              <span className="online-widget__label">онлайн</span>
              <span className="online-widget__total">/ {totalCount}</span>
            </div>
          )}
        </button>
      </div>
    </>
  );
}

function BottomNav() {
  const st = useStore();
  const u = st.userDoc;
  const path = st.route.path;
  const items = !u ? [
    { p: "login", tKey: "bottomLogin", i: "user" },
    { p: "rating", tKey: "navRating", i: "rank" },
  ] : [
    { p: "dashboard", tKey: "navDashboard", i: "home" },
    { p: "rating", tKey: "navRating", i: "rank" },
    { p: "news", tKey: "bottomNews", i: "news" },
    { p: "profile", tKey: "navProfile", i: "user" },
  ];
  return (
    <div className="bottomnav__row">
      {items.map(it => (
        <div key={it.p} className={`navitem ${path === it.p ? "active" : ""}`} role="button" tabIndex={0} onClick={() => navigate(it.p)}>
          <Icon name={it.i} /> {t(it.tKey)}
        </div>
      ))}
    </div>
  );
}

/** ---------- Force Password Change overlay ---------- */
function ForcePasswordChange() {
  const st = useStore();
  const u = st.userDoc;
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");
  const [saving, setSaving] = useState(false);

  // Show ONLY for teachers who just completed onboarding (flag in localStorage)
  const needsPwdChange = (() => { try { return localStorage.getItem("kpi_needsPwdChange") === "1"; } catch (e) { return false; } })();
  if (!u || u.role === "admin") return null;
  if (!needsPwdChange) return null;

  const skip = () => {
    try { localStorage.removeItem("kpi_needsPwdChange"); } catch (e) { }
    setState({ userDoc: { ...u } });
    toast(t("pwdChangeSkipped"), "ok");
  };

  const handleChange = async () => {
    if (newPwd.length < 6) { toast(t("pwdMinLength"), "error"); return; }
    if (newPwd !== newPwd2) { toast(t("pwdMismatch"), "error"); return; }
    if (!pb.authStore.record) { toast(t("noSession"), "error"); return; }
    setSaving(true);
    try {
      await pb.collection("users").update(pb.authStore.record.id, {
        password: newPwd,
        passwordConfirm: newPwd,
        oldPassword: newPwd
      });
      try { localStorage.removeItem("kpi_needsPwdChange"); } catch (e) { }
      setState({ userDoc: { ...u } }); // trigger re-render
      toast(t("pwdChangedRedirect"), "ok");
    } catch (e) {
      console.error(e);
      toast(e?.message || t("pwdChangeError"), "error");
    } finally { setSaving(false); }
  };

  return (
    <div className="force-pwd-overlay">
      <div className="force-pwd-card">
        <div className="force-pwd-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <h2>{t("forceChangePwdTitle")}</h2>
        <p className="force-pwd-desc">{t("forceChangePwdDesc")}</p>
        <div className="force-pwd-form">
          <label className="label">{t("newPwd")}</label>
          <input className="input" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="••••••••" />
          <label className="label">{t("repeatNewPwd")}</label>
          <input className="input" type="password" value={newPwd2} onChange={e => setNewPwd2(e.target.value)} placeholder="••••••••"
            onKeyDown={e => { if (e.key === "Enter" && !saving) handleChange(); }} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Btn kind="primary" disabled={saving} onClick={handleChange} style={{ flex: 1, justifyContent: "center" }}>
              {saving ? t("loading") : t("changePwd")}
            </Btn>
            <Btn kind="ghost" onClick={skip} style={{ justifyContent: "center" }}>
              {t("skip")}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherProfileModal() {
  const st = useStore();
  const m = st.modal;
  if (m?.kind !== "teacherProfile") return null;
  const tc = m.teacher;
  if (!tc) return null;

  const allTeachers = (st.users || []).filter(x => (x.role || "teacher") !== "admin");
  const sorted = [...allTeachers].sort((a, b) => (Number(b.totalPoints) || 0) - (Number(a.totalPoints) || 0));
  const rankIdx = sorted.findIndex(x => x.uid === tc.uid);
  const rank = rankIdx >= 0 ? rankIdx + 1 : "—";
  const lvl = levelFromPoints(tc.totalPoints || 0);
  const subs = (st.submissions || []).filter(s => s.uid === tc.uid);
  const approved = subs.filter(s => s.status === "approved");
  const igHandle = (tc.instagram || "").replace(/^@/, "").trim();

  const close = () => setState({ modal: null });

  return (
    <div className="tp-overlay" onClick={close}>
      <div className="tp-card" onClick={e => e.stopPropagation()}>
        <button className="tp-close" onClick={close}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>

        <div className="tp-header">
          <div className="tp-avatar-wrap">
            <div className="tp-avatar">
              {tc.avatarUrl
                ? <img src={tc.avatarUrl} alt="" />
                : <span>{(tc.displayName || tc.email || "?").slice(0, 1).toUpperCase()}</span>}
            </div>
            <div className="tp-rank-badge">#{rank}</div>
          </div>
          <div className="tp-name">{tc.displayName || t("unnamed")}</div>
          <div className="tp-role">{tc.position || t("role")}: {tc.role || "teacher"}</div>
          {tc.school && <div className="tp-school">{tc.school}</div>}
        </div>

        <div className="tp-stats-grid">
          <div className="tp-stat">
            <div className="tp-stat-value">{fmtPoints(tc.totalPoints)}</div>
            <div className="tp-stat-label">{t("totalPoints")}</div>
          </div>
          <div className="tp-stat">
            <div className="tp-stat-value">{lvl.name}</div>
            <div className="tp-stat-label">{t("levelLabel")}</div>
          </div>
          <div className="tp-stat">
            <div className="tp-stat-value">#{rank}</div>
            <div className="tp-stat-label">{t("rankLabel")}</div>
          </div>
          <div className="tp-stat">
            <div className="tp-stat-value">{tc.experienceYears || 0}</div>
            <div className="tp-stat-label">{t("expYears")}</div>
          </div>
        </div>

        <div className="tp-info-list">
          {tc.subject && <div className="tp-info-row"><span className="tp-info-icon">📚</span><span>{tc.subject}</span></div>}
          {tc.city && <div className="tp-info-row"><span className="tp-info-icon">📍</span><span>{tc.city}</span></div>}
          {tc.email && <div className="tp-info-row"><span className="tp-info-icon">✉️</span><span>{tc.email}</span><a href={`https://teams.microsoft.com/l/chat/0/0?users=${tc.email}`} target="_blank" rel="noopener noreferrer" className="tp-teams-btn" title="Teams Chat">💬</a></div>}
          {tc.phone && <div className="tp-info-row"><span className="tp-info-icon">📞</span><span>{tc.phone}</span></div>}
          {tc.experienceYears > 0 && <div className="tp-info-row"><span className="tp-info-icon">⏳</span><span>{tc.experienceYears} {t("yearsShort")}</span></div>}
        </div>

        <div className="tp-progress">
          <div className="tp-progress-label">
            <span>{lvl.name}</span>
            {lvl.next && <span className="muted">{tc.totalPoints || 0} / {lvl.next}</span>}
          </div>
          <div className="tp-progress-bar">
            <div className="tp-progress-fill" style={{ width: `${lvl.pct}%` }} />
          </div>
        </div>

        <div className="tp-footer">
          {igHandle && (
            <a href={`https://instagram.com/${igHandle}`} target="_blank" rel="noopener noreferrer" className="btn btn--instagram">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" /></svg>
              Instagram
            </a>
          )}
          <button className="btn" onClick={close}>{t("closeProfile")}</button>
        </div>
      </div>
    </div>
  );
}

function Overlays() {
  const st = useStore();
  return (
    <>
      <div className="toastwrap" aria-live="polite" aria-atomic="true">
        {st.toasts.map(ti => (
          <div key={ti.id} className="toast">
            <div style={{ fontWeight: 900, marginBottom: 4 }}>{ti.kind === "error" ? t("toastError") : ti.kind === "ok" ? t("toastOk") : t("toastMsg")}</div>
            <div className="tiny muted">{ti.msg}</div>
          </div>
        ))}
      </div>
      {st.modal?.kind === "crop" && <CropModal file={st.modal.file} onClose={() => setState({ modal: null })} />}
      <TeacherProfileModal />
      <ForcePasswordChange />
      <OnlineWidget />
      <AccessibilityModal />
    </>
  );
}

/** ---------- avatar crop modal (simple square) ---------- */
function CropModal({ file, onClose }) {
  const st = useStore();
  const u = st.userDoc;
  const [url, setUrl] = useState("");
  const [zoom, setZoom] = useState(1.2);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = url;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => { draw(); /* eslint-disable-next-line */ }, [zoom, off]);

  function draw() {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (!c || !img) return;
    const ctx = c.getContext("2d");
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(0, 0, W, H);

    const scale = zoom * Math.min(W / img.width, H / img.height);
    const dw = img.width * scale, dh = img.height * scale;
    const x = W / 2 + off.x - dw / 2;
    const y = H / 2 + off.y - dh / 2;
    ctx.drawImage(img, x, y, dw, dh);

    const size = Math.min(W, H) * 0.62;
    const sx = (W - size) / 2, sy = (H - size) / 2;
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(sx, sy, size, size); ctx.fill("evenodd");
    ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 2; ctx.strokeRect(sx, sy, size, size);
  }

  function down(e) { e.preventDefault(); setDrag({ x: e.clientX, y: e.clientY, ox: off.x, oy: off.y }); }
  function move(e) { if (!drag) return; setOff({ x: drag.ox + (e.clientX - drag.x), y: drag.oy + (e.clientY - drag.y) }); }
  function up() { setDrag(null); }

  async function save() {
    try {
      if (!u) return;
      setState({ loading: true });

      const preview = canvasRef.current, img = imgRef.current;
      const W = preview.width, H = preview.height;
      const size = Math.min(W, H) * 0.62;
      const sx = (W - size) / 2, sy = (H - size) / 2;

      // render full canvas into temp then crop into 512x512
      const tmp = document.createElement("canvas");
      tmp.width = W; tmp.height = H;
      const tctx = tmp.getContext("2d");

      const scale = zoom * Math.min(W / img.width, H / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      const x = W / 2 + off.x - dw / 2;
      const y = H / 2 + off.y - dh / 2;
      tctx.drawImage(img, x, y, dw, dh);

      const out = document.createElement("canvas");
      out.width = 512; out.height = 512;
      const octx = out.getContext("2d");
      octx.drawImage(tmp, sx, sy, size, size, 0, 0, 512, 512);

      const blob = await new Promise(res => out.toBlob(res, "image/png", 0.92));
      if (!blob) throw new Error(t("saveError"));

      await uploadAvatar(u.uid, blob);
      const fresh = await ensureUserDoc();
      setState({ userDoc: fresh });
      toast(t("avatarUpdated"), "ok");
      onClose();
    } catch (e) {
      console.error(e);
      toast(e?.message || t("saveError"), "error");
    } finally {
      setState({ loading: false });
    }
  }

  return (
    <div className="modalback" onMouseMove={move} onMouseUp={up}>
      <div className="modal glass">
        <div className="modal__head">
          <div className="modal__title">{t("cropAvatar")}</div>
          <button className="iconbtn" onClick={onClose} aria-label={t("close")}><Icon name="x" /></button>
        </div>
        <div className="sep"></div>
        <div className="grid2">
          <div className="glass card">
            <div className="h2">{t("preview")}</div>
            <canvas
              ref={canvasRef}
              width={820}
              height={520}
              style={{ width: "100%", borderRadius: 18, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.12)" }}
              onMouseDown={down}
            />
            <div className="label">{t("scale")}</div>
            <input type="range" min="0.8" max="2.6" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: "100%" }} />
            <div className="help">{t("dragImage")}</div>
          </div>
          <div className="glass card">
            <div className="h2">{t("actions")}</div>
            <div className="sep"></div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Btn kind="primary" onClick={save} disabled={st.loading}><Icon name="check" /> {t("save")}</Btn>
              <Btn onClick={onClose}>{t("cancel")}</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------- charts ---------- */
function BarChart({ values, labels }) {
  const max = Math.max(1, ...values.map(v => Number(v) || 0));
  return (
    <div>
      <div className="barchart">
        {values.map((v, i) => (
          <div key={i} className="bar" style={{ height: `${Math.max(4, Math.round(((Number(v) || 0) / max) * 100))}%` }} title={`${labels[i]}: ${v}`} />
        ))}
      </div>
      <div className="barlabel">
        <span>{labels[0]}</span>
        <span>{labels[Math.floor(labels.length / 2)]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

function LineChart({ values, labels }) {
  const n = (values || []).length;
  const nums = (values || []).map(v => Number(v) || 0);
  const max = Math.max(1, ...nums);
  const min = Math.min(0, ...nums);
  const W = 520, H = 190, pad = 26;
  const span = Math.max(1e-9, max - min);
  const xStep = (W - pad * 2) / Math.max(1, n - 1);

  const pts = nums.map((v, i) => {
    const x = pad + i * xStep;
    const y = H - pad - ((v - min) / span) * (H - pad * 2);
    return [x, y];
  });

  const points = pts.map(p => p.join(",")).join(" ");
  const gid = useMemo(() => `lg_${Math.random().toString(16).slice(2)}`, []);

  const first = labels?.[0] ?? "";
  const mid = labels?.[Math.floor((labels?.length || 1) / 2)] ?? "";
  const last = labels?.[Math.max(0, (labels?.length || 1) - 1)] ?? "";

  return (
    <div className="chartBox">
      <svg className="chartSvg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Line chart">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(135,188,46,.95)" />
            <stop offset="100%" stopColor="rgba(90,140,26,.95)" />
          </linearGradient>
        </defs>

        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(255,255,255,.18)" strokeWidth="1" />

        {n > 1 ? (
          <>
            <polyline fill="none" stroke={`url(#${gid})`} strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r="3.2" fill="rgba(255,255,255,.92)" opacity="0.75" />
            ))}
          </>
        ) : (
          <text x={pad} y={H / 2} fill="rgba(255,255,255,.72)" fontSize="12">{t("noChartData")}</text>
        )}

        <text x={pad} y={H - 8} fill="rgba(255,255,255,.62)" fontSize="12">{first}</text>
        <text x={W / 2} y={H - 8} textAnchor="middle" fill="rgba(255,255,255,.62)" fontSize="12">{mid}</text>
        <text x={W - pad} y={H - 8} textAnchor="end" fill="rgba(255,255,255,.62)" fontSize="12">{last}</text>
      </svg>
    </div>
  );
}

function AreaLineChart({ values, labels }) {
  const n = (values || []).length;
  const nums = (values || []).map(v => Number(v) || 0);
  const max = Math.max(1, ...nums);
  const min = Math.min(0, ...nums);
  const W = 520, H = 190, pad = 26;
  const span = Math.max(1e-9, max - min);
  const xStep = (W - pad * 2) / Math.max(1, n - 1);

  const pts = nums.map((v, i) => {
    const x = pad + i * xStep;
    const y = H - pad - ((v - min) / span) * (H - pad * 2);
    return [x, y];
  });

  const linePoints = pts.map(p => p.join(",")).join(" ");
  const areaPath = pts.length
    ? `M ${pts[0][0]} ${H - pad} L ${pts.map(p => p.join(" ")).join(" L ")} L ${pts[pts.length - 1][0]} ${H - pad} Z`
    : "";

  const gid = useMemo(() => `ag_${Math.random().toString(16).slice(2)}`, []);
  const aid = useMemo(() => `af_${Math.random().toString(16).slice(2)}`, []);

  const first = labels?.[0] ?? "";
  const mid = labels?.[Math.floor((labels?.length || 1) / 2)] ?? "";
  const last = labels?.[Math.max(0, (labels?.length || 1) - 1)] ?? "";

  return (
    <div className="chartBox">
      <svg className="chartSvg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Area line chart">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(135,188,46,.95)" />
            <stop offset="100%" stopColor="rgba(90,140,26,.95)" />
          </linearGradient>
          <linearGradient id={aid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(90,140,26,.26)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>

        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(255,255,255,.18)" strokeWidth="1" />

        {pts.length > 1 ? (
          <>
            <path d={areaPath} fill={`url(#${aid})`} />
            <polyline fill="none" stroke={`url(#${gid})`} strokeWidth="3" points={linePoints} strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          <text x={pad} y={H / 2} fill="rgba(255,255,255,.72)" fontSize="12">{t("noChartData")}</text>
        )}

        <text x={pad} y={H - 8} fill="rgba(255,255,255,.62)" fontSize="12">{first}</text>
        <text x={W / 2} y={H - 8} textAnchor="middle" fill="rgba(255,255,255,.62)" fontSize="12">{mid}</text>
        <text x={W - pad} y={H - 8} textAnchor="end" fill="rgba(255,255,255,.62)" fontSize="12">{last}</text>
      </svg>
    </div>
  );
}

function HistogramChart({ data, binCount = 7 }) {
  const nums = (data || []).map(v => Number(v)).filter(v => Number.isFinite(v));
  if (!nums.length) return <p className="p">{t("noHistogram")}</p>;

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const bins = Math.max(3, Math.min(12, Number(binCount) || 7));
  const span = Math.max(1e-9, max - min);
  const w = span / bins;

  const counts = Array.from({ length: bins }, () => 0);
  for (const v of nums) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((v - min) / w)));
    counts[idx] += 1;
  }

  const labels = counts.map((_, i) => {
    const a = min + i * w;
    const b = min + (i + 1) * w;
    const ra = Math.round(a);
    const rb = Math.round(b);
    return `${ra}–${rb}`;
  });

  const maxC = Math.max(1, ...counts);

  return (
    <div>
      <div className="histchart">
        {counts.map((c, i) => (
          <div
            key={i}
            className="histbar"
            style={{ height: `${Math.max(6, Math.round((c / maxC) * 100))}%` }}
            title={`${labels[i]}: ${c}`}
          />
        ))}
      </div>
      <div className="barlabel">
        <span>{labels[0]}</span>
        <span>{labels[Math.floor(labels.length / 2)]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
      <div className="help">{t("histogramHelp")}</div>
    </div>
  );
}

function DonutChart({ segments, centerLabel }) {
  const segs = (segments || []).map(s => ({ label: String(s.label || ""), value: Number(s.value) || 0 })).filter(s => s.value > 0);
  const total = Math.max(1, segs.reduce((a, s) => a + s.value, 0));

  const size = 170;
  const thickness = 18;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  let offset = 0;
  const palette = [
    "rgba(135,188,46,.95)",
    "rgba(90,140,26,.95)",
    "rgba(53,208,127,.95)",
    "rgba(255,200,87,.95)",
    "rgba(255,90,122,.95)"
  ];

  return (
    <div className="donutWrap">
      <div className="donutBox">
        <svg className="donutSvg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Donut chart">
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2} cy={size / 2} r={r}
              fill="none"
              stroke="rgba(255,255,255,.12)"
              strokeWidth={thickness}
            />
            {segs.map((s, i) => {
              const len = (s.value / total) * c;
              const dash = `${len} ${Math.max(0, c - len)}`;
              const dashOffset = -offset;
              offset += len;
              return (
                <circle
                  key={i}
                  cx={size / 2} cy={size / 2} r={r}
                  fill="none"
                  stroke={palette[i % palette.length]}
                  strokeWidth={thickness}
                  strokeDasharray={dash}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                />
              );
            })}
          </g>

          <text x="50%" y="47%" textAnchor="middle" fill="rgba(255,255,255,.92)" fontSize="18" fontWeight="900">
            {centerLabel || total}
          </text>
          <text x="50%" y="60%" textAnchor="middle" fill="rgba(255,255,255,.62)" fontSize="12">
            всего
          </text>
        </svg>
      </div>

      <div className="donutLegend">
        {segs.map((s, i) => {
          const pct = Math.round((s.value / total) * 100);
          return (
            <div key={i} className="legendItem">
              <span className="legendDot" style={{ background: palette[i % palette.length] }} />
              <div className="tiny">
                <b>{s.label}</b> — {s.value} <span className="muted">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RadarChart({ labels, values }) {
  const labs = (labels || []).map(x => String(x || ""));
  const nums = (values || []).map(v => Math.max(0, Number(v) || 0));
  const n = Math.min(labs.length, nums.length);
  if (!n) return <p className="p">{t("noRadarData")}</p>;

  const W = 280, H = 280;
  const cx = W / 2, cy = H / 2;
  const R = 92;
  const max = Math.max(1, ...nums.slice(0, n));

  const ringCount = 4;
  const points = Array.from({ length: n }, (_, i) => {
    const ang = (-90 + (360 / n) * i) * (Math.PI / 180);
    const rr = (nums[i] / max) * R;
    const x = cx + Math.cos(ang) * rr;
    const y = cy + Math.sin(ang) * rr;
    return [x, y];
  });

  const poly = points.map(p => p.join(",")).join(" ");
  const paletteFill = "rgba(135,188,46,.18)";
  const paletteStroke = "rgba(90,140,26,.95)";

  return (
    <div className="chartBox">
      <svg className="radarSvg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Radar chart">
        {Array.from({ length: ringCount }, (_, k) => {
          const rr = (R / ringCount) * (k + 1);
          return (
            <circle key={k} cx={cx} cy={cy} r={rr} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1" />
          );
        })}

        {Array.from({ length: n }, (_, i) => {
          const ang = (-90 + (360 / n) * i) * (Math.PI / 180);
          const x = cx + Math.cos(ang) * R;
          const y = cy + Math.sin(ang) * R;
          return (
            <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.14)" strokeWidth="1" />
          );
        })}

        <polygon points={poly} fill={paletteFill} stroke={paletteStroke} strokeWidth="2" />

        {Array.from({ length: n }, (_, i) => {
          const ang = (-90 + (360 / n) * i) * (Math.PI / 180);
          const x = cx + Math.cos(ang) * (R + 18);
          const y = cy + Math.sin(ang) * (R + 18);
          const anchor = Math.cos(ang) > 0.25 ? "start" : Math.cos(ang) < -0.25 ? "end" : "middle";
          return (
            <text key={i} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fill="rgba(255,255,255,.70)" fontSize="11">
              {labs[i].slice(0, 16)}{labs[i].length > 16 ? "…" : ""}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/** ---------- GaugeChart ---------- */
function GaugeChart({ value = 0, max = 100, label = "", sublabel = "" }) {
  const pct = Math.min(1, Math.max(0, (Number(value) || 0) / (Number(max) || 1)));
  const W = 180, H = 110;
  const cx = W / 2, cy = 100;
  const R = 75;
  const start = Math.PI;
  const end = 0;
  const ang = start + (end - start) * pct;
  const x1 = cx + Math.cos(start) * R, y1 = cy + Math.sin(start) * R;
  const x2 = cx + Math.cos(ang) * R, y2 = cy + Math.sin(ang) * R;
  const large = pct > 0.5 ? 1 : 0;
  return (
    <div className="gauge-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        <path d={`M ${x1} ${y1} A ${R} ${R} 0 1 1 ${cx + R} ${cy}`} fill="none" stroke="var(--border)" strokeWidth="10" strokeLinecap="round" />
        {pct > 0.001 && <path d={`M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke="url(#gaugeGrad)" strokeWidth="10" strokeLinecap="round" />}
        <defs><linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="var(--accent)" /><stop offset="100%" stopColor="var(--accent2)" /></linearGradient></defs>
      </svg>
      <div className="gauge-value">{value}</div>
      {label && <div className="gauge-label">{label}</div>}
      {sublabel && <div className="gauge-sublabel">{sublabel}</div>}
    </div>
  );
}

/** ---------- StackedBarChart ---------- */
function StackedBarChart({ data, labels }) {
  // data: array of { label, segments: [{value, color}] }
  if (!data || !data.length) return <p className="p">{t("noBarData")}</p>;
  const maxVal = Math.max(1, ...data.map(d => d.segments.reduce((a, s) => a + (Number(s.value) || 0), 0)));
  const colors = ["var(--accent)", "var(--accent2)", "var(--green)", "var(--yellow)", "var(--red)", "#f472b6", "#38bdf8"];
  return (
    <div>
      <div className="barchart" style={{ height: 160 }}>
        {data.map((d, i) => {
          const total = d.segments.reduce((a, s) => a + (Number(s.value) || 0), 0);
          const h = (total / maxVal) * 100;
          return (
            <div key={i} style={{ flex: 1, height: `${h}%`, display: "flex", flexDirection: "column-reverse", borderRadius: 6, overflow: "hidden", minWidth: 4 }} title={`${d.label}: ${total}`}>
              {d.segments.map((s, j) => {
                const sh = total ? (s.value / total) * 100 : 0;
                return <div key={j} style={{ height: `${sh}%`, background: s.color || colors[j % colors.length], minHeight: s.value ? 2 : 0 }} />;
              })}
            </div>
          );
        })}
      </div>
      {labels && <div className="barlabel">{labels.map((l, i) => <span key={i}>{l}</span>)}</div>}
    </div>
  );
}

/** ---------- Document Download Helpers ---------- */
function generateDocHTML(request, user, signatureUrl, adminSignatureUrl) {
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
  const docNum = (request.id || "").slice(-6).toUpperCase();
  const days = request.days || dateRangeDays(request.dateFrom, request.dateTo);
  const kindLabel = request.kindLabel || requestKindLabel(request.kind);
  const statusText = request.status === "approved" ? t("dpApproved") : request.status === "rejected" ? t("dpRejected") : t("dpPending");
  const period = `${request.dateFrom}${request.dateTo && request.dateTo !== request.dateFrom ? " — " + request.dateTo : ""}`;

  const sigBlock = (url, label, name) => url
    ? `<div style="text-align:center"><img src="${url}" style="max-width:160px;height:50px;object-fit:contain"/><div style="font-size:11px;color:#888">${label}</div>${name ? `<div style="font-size:12px">${name}</div>` : ""}</div>`
    : `<div style="text-align:center"><div style="width:160px;border-bottom:1px solid #333;margin:0 auto 4px"></div><div style="font-size:11px;color:#888">${label}</div>${name ? `<div style="font-size:12px">${name}</div>` : ""}</div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t("statement")} - ${docNum}</title>
<style>
  @page { margin: 20mm; }
  body { font-family: 'Times New Roman', serif; font-size: 14px; color: #1a1d2e; line-height: 1.6; max-width: 700px; margin: 0 auto; padding: 40px 20px; }
  .header { text-align: center; margin-bottom: 24px; }
  .logo { width: 60px; height: 60px; margin: 0 auto 8px; }
  .org { font-size: 15px; font-weight: bold; }
  .sub { font-size: 12px; color: #666; margin-top: 4px; }
  .regnum { text-align: right; font-size: 12px; color: #888; margin-bottom: 8px; }
  .title { text-align: center; font-size: 20px; font-weight: bold; margin: 20px 0; text-transform: uppercase; }
  .field { margin-bottom: 8px; }
  .field-label { font-weight: bold; }
  .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
  .sig-block { width: 45%; }
  .date-line { margin-top: 24px; font-size: 13px; color: #666; }
  .stamp { position: absolute; right: 60px; bottom: 120px; border: 3px solid rgba(135,188,46,.4); border-radius: 50%; width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; transform: rotate(-15deg); color: rgba(135,188,46,.6); font-weight: bold; font-size: 13px; text-align: center; }
</style></head><body>
  <div class="regnum">No. ${docNum}</div>
  <div class="header">
    <div class="org">${t("nisOrg")}</div>
    <div class="sub">${t("toSchoolPrincipal")}</div>
  </div>
  <div class="title">${t("statement")}</div>
  <div class="field"><span class="field-label">${t("fromWhom")}:</span> ${user.displayName || user.email || "—"}</div>
  <div class="field"><span class="field-label">${t("positionLabel")}:</span> ${user.position || user.subject || "—"}</div>
  ${user.school ? `<div class="field"><span class="field-label">${t("schoolLabel")}:</span> ${user.school}</div>` : ""}
  <div class="field"><span class="field-label">${t("requestTypeLabel")}:</span> <b>${kindLabel}</b></div>
  <div class="field"><span class="field-label">${t("periodLabel")}:</span> ${period}</div>
  ${request.note ? `<div class="field"><span class="field-label">${t("reasonLabel")}:</span> ${request.note}</div>` : ""}
  <div class="field"><span class="field-label">${t("daysCount")}:</span> ${days}</div>
  <div class="field"><span class="field-label">${t("statusLabel")}:</span> ${statusText}</div>
  <div class="signatures">
    ${sigBlock(signatureUrl, t("employeeSign"), user.displayName || "")}
    ${sigBlock(adminSignatureUrl, t("directorSign"), "")}
  </div>
  <div class="date-line">${t("date")}: ${dateStr}</div>
</body></html>`;
}

function downloadDocAsWord(request, user, signatureUrl, adminSignatureUrl) {
  const html = generateDocHTML(request, user, signatureUrl, adminSignatureUrl);
  const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">${html.slice(html.indexOf("<head>"))}`;
  const blob = new Blob(["\ufeff", wordHtml], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${t("statement")}_${(request.id || "doc").slice(-6).toUpperCase()}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadDocAsPdf(request, user, signatureUrl, adminSignatureUrl) {
  const html = generateDocHTML(request, user, signatureUrl, adminSignatureUrl);
  const win = window.open("", "_blank");
  if (!win) { toast(t("error"), "error"); return; }
  win.document.write(html);
  win.document.close();
  win.onafterprint = () => win.close();
  setTimeout(() => win.print(), 300);
}

/** ---------- DocumentPreview ---------- */
function DocumentPreview({ request, user, signatureUrl, adminSignatureUrl, onPrint, showDownload }) {
  if (!request || !user) return null;
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
  const docNum = (request.id || "").slice(-6).toUpperCase();
  return (
    <div className="doc-preview">
      <div className="doc-preview__regnum">No. {docNum || "——"}</div>

      <div className="doc-preview__header">
        <img src="/logo-nis.png" alt="NIS" className="doc-preview__logo" />
        <div className="doc-preview__org">{t("nisOrg")}</div>
        <div className="doc-preview__org-full">{t("nisOrg")}</div>
        <div className="doc-preview__sub">{t("toSchoolPrincipal")}</div>
      </div>

      <div className="doc-preview__title">{t("statement")}</div>

      <div className="doc-preview__body">
        <div className="doc-preview__field">
          <span className="doc-preview__field-label">{t("fromWhom")}:</span>
          <span className="doc-preview__field-value">{user.displayName || user.email || "—"}</span>
        </div>
        <div className="doc-preview__field">
          <span className="doc-preview__field-label">{t("positionLabel")}:</span>
          <span className="doc-preview__field-value">{user.position || user.subject || "—"}</span>
        </div>
        {user.school && (
          <div className="doc-preview__field">
            <span className="doc-preview__field-label">{t("schoolLabel")}:</span>
            <span className="doc-preview__field-value">{user.school}</span>
          </div>
        )}
        <div className="doc-preview__field">
          <span className="doc-preview__field-label">{t("requestTypeLabel")}:</span>
          <span className="doc-preview__field-value"><b>{request.kindLabel || requestKindLabel(request.kind)}</b></span>
        </div>
        <div className="doc-preview__field">
          <span className="doc-preview__field-label">{t("periodLabel")}:</span>
          <span className="doc-preview__field-value">{request.dateFrom}{request.dateTo && request.dateTo !== request.dateFrom ? ` — ${request.dateTo}` : ""}</span>
        </div>
        {request.note && (
          <div className="doc-preview__field">
            <span className="doc-preview__field-label">{t("reasonLabel")}:</span>
            <span className="doc-preview__field-value">{request.note}</span>
          </div>
        )}
        <div className="doc-preview__field">
          <span className="doc-preview__field-label">{t("daysCount")}:</span>
          <span className="doc-preview__field-value">{request.days || dateRangeDays(request.dateFrom, request.dateTo)}</span>
        </div>
        <div className="doc-preview__field">
          <span className="doc-preview__field-label">{t("statusLabel")}:</span>
          <span className="doc-preview__field-value"><Pill kind={request.status}>{request.status === "approved" ? t("dpApproved") : request.status === "rejected" ? t("dpRejected") : t("dpPending")}</Pill></span>
        </div>
        {request.evidenceFileUrl && (
          <div className="doc-preview__field">
            <span className="doc-preview__field-label">{t("attachmentLabel")}:</span>
            <span className="doc-preview__field-value"><a href={request.evidenceFileUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{t("openFile")}</a></span>
          </div>
        )}
      </div>

      <div className="doc-preview__signature">
        <div className="doc-preview__sig-block">
          {signatureUrl ? <img src={signatureUrl} alt="Подпись" className="doc-preview__sig-img" /> : <div className="doc-preview__sig-line" />}
          <div className="doc-preview__sig-label">{t("employeeSign")}</div>
          <div className="doc-preview__sig-name">{user.displayName || ""}</div>
        </div>
        <div className="doc-preview__sig-block">
          {adminSignatureUrl ? <img src={adminSignatureUrl} alt="Admin" className="doc-preview__sig-img" /> : <div className="doc-preview__sig-line" />}
          <div className="doc-preview__sig-label">{t("directorSign")}</div>
        </div>
      </div>

      <div className="doc-preview__date">{t("date")}: {dateStr}</div>

      {request.status === "approved" && (
        <div className="doc-preview__stamp">
          <img src="/logo-nis.png" alt="" style={{ width: 30, height: 30, objectFit: "contain", opacity: .4, marginBottom: 4 }} />
          <div>{t("dpApproved")}</div>
        </div>
      )}

      {(onPrint || showDownload) && (
        <div style={{ marginTop: 20, textAlign: "center", display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }} className="doc-preview__actions">
          {onPrint && <Btn kind="primary" onClick={onPrint}><Icon name="file" /> {t("preview")}</Btn>}
          {showDownload && (
            <>
              <Btn kind="ghost" onClick={() => downloadDocAsWord(request, user, signatureUrl, adminSignatureUrl)}>
                <Icon name="file" /> {t("downloadWord")}
              </Btn>
              <Btn kind="ghost" onClick={() => downloadDocAsPdf(request, user, signatureUrl, adminSignatureUrl)}>
                <Icon name="file" /> {t("downloadPdf")}
              </Btn>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** ---------- PageOnboarding ---------- */
function PageOnboarding() {
  const st = useStore();
  // All hooks MUST be called before any conditional returns (React rules)
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [signed, setSigned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checks, setChecks] = useState([false, false, false, false, false]);
  const [expanded, setExpanded] = useState(null);
  const [brushSize, setBrushSize] = useState(2);

  // Fill white bg on mount and on clear
  const fillCanvasWhite = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);
  useEffect(() => { fillCanvasWhite(); }, [fillCanvasWhite]);

  const u = st.userDoc;
  if (!u) return <Guard />;
  if (!canAccess("onboarding", u)) return <Guard />;

  const isOnboarded = u.onboarded === true;

  const getPos = (e) => {
    const c = canvasRef.current;
    if (!c) return [0, 0];
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    const t = e.touches ? e.touches[0] : e;
    return [(t.clientX - rect.left) * scaleX, (t.clientY - rect.top) * scaleY];
  };

  const onDown = (e) => {
    e.preventDefault();
    setDrawing(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const [x, y] = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onMove = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const [x, y] = getPos(e);
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1d2e";
    ctx.lineTo(x, y);
    ctx.stroke();
    setSigned(true);
  };

  const onUp = () => setDrawing(false);

  const clearSig = () => {
    fillCanvasWhite();
    setSigned(false);
  };

  const toggleCheck = (i) => {
    const copy = [...checks];
    copy[i] = !copy[i];
    setChecks(copy);
  };

  const allChecked = checks.every(Boolean);

  const submit = async () => {
    if (!signed || !allChecked) {
      toast(t("onbReadAndSign"), "error");
      return;
    }
    try {
      setSaving(true);
      const c = canvasRef.current;
      const blob = await new Promise(res => c.toBlob(res, "image/png"));
      const sigFile = new File([blob], "sig.png", { type: "image/png" });
      // Step 1: update onboarded flag (plain JSON)
      await pb.collection("users").update(u.id, { onboarded: true });
      // Step 2: upload signature file (FormData)
      try {
        const fd = new FormData();
        fd.append("signature", sigFile);
        await pb.collection("users").update(u.id, fd);
      } catch (sigErr) {
        console.warn("Signature upload failed (non-critical):", sigErr);
      }
      // Flag for password change overlay (stored in localStorage, not PocketBase)
      try { localStorage.setItem("kpi_needsPwdChange", "1"); } catch (e) { }
      const freshUser = await ensureUserDoc();
      setState({ userDoc: freshUser });
      toast(t("onbCompleted"), "ok");
      navigate("dashboard");
    } catch (e) {
      console.error("Onboarding error:", e, "data:", e?.data);
      // Show detailed field errors if available
      let msg = e?.message || t("saveError");
      if (e?.data) {
        const fieldErrors = Object.entries(e.data).map(([k, v]) => `${k}: ${v?.message || v}`).join("; ");
        if (fieldErrors) msg += " (" + fieldErrors + ")";
      }
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const docs = [
    {
      title: t("onbDoc1Title"),
      kz: "NIS KPI Platform — мұғалімдердің кәсіби жетістіктерін есепке алу және рейтингін жасау жүйесі. Платформаны пайдалану барлық педагогтар үшін міндетті. Деректерді дәл және уақытылы енгізу — ар-намыс міндеттемесі.",
      ru: "NIS KPI Platform — система учёта и рейтингования профессиональных достижений педагогов. Пользование платформой обязательно для всех педагогов. Точность и своевременность вносимых данных является обязательством каждого сотрудника.",
    },
    {
      title: t("onbDoc2Title"),
      kz: "Мен, төменде қол қоюшы, өзімнің жеке деректерімді (аты-жөні, лауазымы, электрондық поштасы, жұмыс нәтижелері) «Назарбаев Зияткерлік Мектептері» АҚ ішіндегі рейтинг мен есеп беру мақсаттарында өңдеуге өз еркіммен келісімімді беремін.",
      ru: "Я, нижеподписавшийся, добровольно даю согласие на обработку моих персональных данных (ФИО, должность, e-mail, результаты работы) в целях рейтингования и отчётности внутри АО «Назарбаев Интеллектуальные Школы».",
    },
    {
      title: t("onbDoc3Title"),
      kz: "Жұмыс уақыты: 09:00–18:00 (дүйсенбі–жұма). Кешіккен жағдайда жазбаша хабарлама қажет. Жоқтықты рәсімдеу платформадағы «Өтініштер» бөлімі арқылы жүзеге асырылады. Ережені бұзу тәртіптік шараларға әкеледі.",
      ru: "Рабочее время: 09:00–18:00 (понедельник–пятница). При опоздании обязательно письменное уведомление. Оформление отсутствия осуществляется через раздел «Заявления» на платформе. Нарушение регламента влечёт дисциплинарные меры.",
    },
    {
      title: t("onbDoc4Title"),
      kz: "Жетістіктер санаттар бойынша бағаланады: кәсіби даму, жарыстар, жобалар, зерттеу жұмыстары және т.б. Балдарды тек әкімші растайды. Дәлелсіз немесе жалған мәліметтер тәртіптік жауапкершілікке әкеледі.",
      ru: "Достижения оцениваются по категориям: профессиональное развитие, конкурсы, проекты, исследовательские работы и др. Баллы начисляются исключительно администратором после проверки. Недостоверные данные влекут дисциплинарную ответственность.",
    },
    {
      title: t("onbDoc5Title"),
      kz: "Кіру деректерін (логин, пароль) үшінші тұлғаларға беруге тыйым салынады. Күдікті белсенділік анықталса, дереу әкімшіге хабарлаңыз. Есептік жазбаңызды үнемі бақылауда ұстаңыз.",
      ru: "Передача учётных данных (логин, пароль) третьим лицам строго запрещена. При обнаружении подозрительной активности немедленно уведомите администратора. Регулярно следите за безопасностью своей учётной записи.",
    },
  ];

  const checkedCount = isOnboarded ? docs.length : checks.filter(Boolean).length;

  return (
    <div className="onboarding">

      {/* ═══ HERO BANNER ═══════════════════════════ */}
      <div className={`onb-hero${isOnboarded ? " onb-hero--done" : ""}`}>
        {/* Floating particles */}
        <div className="onb-hero__particles" aria-hidden="true">
          {["✦", "★", "✦", "●", "✦", "★", "✦", "●", "✦", "★", "✦", "●"].map((s, i) => (
            <span key={i} className="onb-particle" style={{ "--i": i }}>{s}</span>
          ))}
        </div>

        <div className="onb-hero__inner">
          <img src="/logo-nis.png" alt="NIS" className="onb-hero__logo" />

          <div className="onb-hero__badge">
            {isOnboarded ? `✅ ${t("onbDoneBadge")}` : `🎉 ${t("onbNewEmployee")}`}
          </div>

          <div className="onb-hero__title">
            {t("onbWelcome")}
          </div>
          {u.displayName && (
            <div className="onb-hero__name">{u.displayName}</div>
          )}
          <div className="onb-hero__sub">
            {isOnboarded
              ? t("onbSuccessMsg")
              : t("onbInstructions")}
          </div>

          {/* Step indicators */}
          <div className="onb-steps">
            <div className={`onb-step${allChecked ? " onb-step--done" : checkedCount > 0 ? " onb-step--active" : ""}`}>
              <div className="onb-step__num">{allChecked ? "✓" : "1"}</div>
              <div className="onb-step__label">{t("onbStepDocs")}</div>
            </div>
            <div className={`onb-steps__line${allChecked ? " onb-steps__line--done" : ""}`} />
            <div className={`onb-step${isOnboarded ? " onb-step--done" : allChecked ? " onb-step--active" : ""}`}>
              <div className="onb-step__num">{isOnboarded ? "✓" : "2"}</div>
              <div className="onb-step__label">{t("onbStepSign")}</div>
            </div>
          </div>

          {/* Progress bar */}
          {!isOnboarded && (
            <div className="onb-progress">
              <div className="onb-progress__bar">
                <div className="onb-progress__fill" style={{ width: `${(checkedCount / docs.length) * 100}%` }} />
              </div>
              <span className="onb-progress__label">{checkedCount}/{docs.length} {t("onbRead")}</span>
            </div>
          )}
        </div>
      </div>
      <div class="grid2">
        {/* ═══ DOCUMENTS ════════════════════════════ */}
        <div className="glass card onb-docs-card">
          <div className="onb-docs-header">
            <div style={{ fontSize: 20, fontWeight: 800 }}>{`📄 ${t("onbOfficialDocs")}`}</div>
            {isOnboarded && <span className="pill approved">{t("onbAllRead")} ✓</span>}
          </div>

          <div className="onb-docs-list">
            {docs.map((d, i) => {
              const done = checks[i] || isOnboarded;
              const isOpen = expanded === i;
              return (
                <div key={i} className={`onb-doc${done ? " onb-doc--done" : ""}${isOpen ? " onb-doc--open" : ""}`}
                  style={{ animationDelay: `${i * 0.07}s` }}>
                  <div
                    className="onb-doc__head"
                    role="button" tabIndex={0}
                    onClick={() => setExpanded(isOpen ? null : i)}
                  >
                    <div className={`onb-doc__num${done ? " onb-doc__num--done" : ""}`}>
                      {done ? "✓" : i + 1}
                    </div>
                    <div className="onb-doc__title">{d.title}</div>
                    <div className={`onb-doc__chevron${isOpen ? " onb-doc__chevron--open" : ""}`}>›</div>
                  </div>
                  {isOpen && (
                    <div className="onb-doc__body">
                      <div className="onb-doc__lang-label">🇰🇿 {t("onbLangKz")}</div>
                      <p className="onb-doc__text">{d.kz}</p>
                      <div className="onb-doc__lang-label">🇷🇺 {t("onbLangRu")}</div>
                      <p className="onb-doc__text">{d.ru}</p>
                      {!isOnboarded && (
                        <button
                          className={`onb-doc__confirm${checks[i] ? " onb-doc__confirm--done" : ""}`}
                          onClick={() => { if (!checks[i]) toggleCheck(i); setExpanded(null); }}
                        >
                          {checks[i] ? `✓ ${t("onbReadDone")}` : t("onbAgree")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {isOnboarded && (
          <div className="glass card onb-done-card">
            <div className="onb-done-card__icon">🏆</div>
            <div className="onb-done-card__title">{t("onbSuccess")}</div>
            <div className="onb-done-card__checks">
              <div className="onb-done-check"><span>✓</span> {t("onbDocsRead")}</div>
              <div className="onb-done-check"><span>✓</span> {t("onbSignDone")}</div>
              {u.updated && (
                <div className="onb-done-check">
                  <span>📅</span> {t("date")}: {new Date(u.updated).toLocaleDateString("ru-RU")}
                </div>
              )}
            </div>
            {u.signatureUrl && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: .4 }}>{t("onbYourSign")}</div>
                <img src={u.signatureUrl} alt="Подпись" className="onb-done-card__sig" />
              </div>
            )}
          </div>
        )}

        {/* ═══ SIGNATURE ════════════════════════════ */}
        {!isOnboarded && (
          <div className={`onb-sig-section glass card${allChecked ? " onb-sig-section--ready" : ""}`}>
            {!allChecked ? (
              <div className="onb-sig-locked">
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{t("onbSignSection")}</div>
                <p className="p" style={{ textAlign: "center" }}>
                  {checkedCount} / {docs.length}
                </p>
                <div className="onb-sig-locked__progress">
                  <div className="onb-sig-locked__fill" style={{ width: `${(checkedCount / docs.length) * 100}%` }} />
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>{checkedCount} / {docs.length}</div>
              </div>
            ) : (
              <>
                <div className="onb-sig-ready-banner">
                  <div className="onb-sig-ready-banner__icon">🎊</div>
                  <div className="onb-sig-ready-banner__title">{t("onbAllDocsRead")}</div>
                  <div className="onb-sig-ready-banner__sub">{t("onbFinalStep")}</div>
                </div>

                <div className="onb-sig-wrap">
                  <div className="onb-sig-wrap__head">
                    <div>
                      <div className="h2" style={{ marginBottom: 4 }}>✍ {t("onbDrawSign")}</div>
                      <p className="p" style={{ margin: 0, fontSize: 13 }}>
                        {t("onbDrawHint")}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("onbThickness")}</span>
                      {[1, 2, 4].map(sz => (
                        <button key={sz} onClick={() => setBrushSize(sz)} style={{
                          width: 32, height: 32, borderRadius: 8,
                          border: `2px solid ${brushSize === sz ? "var(--accent)" : "var(--border)"}`,
                          background: brushSize === sz ? "var(--hover-bg)" : "transparent",
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s"
                        }}>
                          <div style={{ width: Math.max(sz * 4, 8), height: sz, background: "#1a2035", borderRadius: 99 }} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="onb-sig-canvas-wrap">
                    <canvas
                      ref={canvasRef}
                      width={800}
                      height={200}
                      className="onb-sig-canvas"
                      onMouseDown={onDown}
                      onMouseMove={onMove}
                      onMouseUp={onUp}
                      onMouseLeave={onUp}
                      onTouchStart={onDown}
                      onTouchMove={onMove}
                      onTouchEnd={onUp}
                    />
                    {!signed && (
                      <div className="onb-sig-hint">✍ {t("onbSignHere")}</div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <Btn onClick={clearSig}>↺ {t("onbClear")}</Btn>
                    <Btn kind="primary" onClick={submit} disabled={saving || !signed}>
                      {saving ? t("loading") : `✅ ${t("onbConfirmSign")}`}
                    </Btn>
                    {signed && <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 700 }}>✓ {t("onbSignReady")}</span>}
                  </div>
                </div>
              </>
            )}
          </div>
        )}


      </div>



      {/* ═══ ALREADY ONBOARDED ════════════════════ */}

    </div>
  );
}


/** ---------- pages ---------- */
function PageLogin() {
  const st = useStore();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (st.userDoc) {
      if (st.userDoc.onboarded !== true && st.userDoc.role !== "admin") {
        navigate("onboarding");
      } else {
        navigate("dashboard");
      }
    }
  }, [st.userDoc]);

  useEffect(() => {
    const id = setInterval(() => setSlide(s => (s + 1) % 3), 4500);
    return () => clearInterval(id);
  }, []);

  const slides = [
    { icon: "📊", tTitle: "loginTitle1", tDesc: "loginDesc", accent: "#87BC2E" },
    { icon: "🏆", tTitle: "loginSlide1Title", tDesc: "loginSlide1Desc", accent: "#4f9cf9" },
    { icon: "✨", tTitle: "loginSlide2Title", tDesc: "loginSlide2Desc", accent: "#a78bfa" },
  ];

  async function submit(e) {
    e.preventDefault();
    try {
      setState({ loading: true });
      await pb.collection("users").authWithPassword(email, pass);
      toast(t("loginWelcome"), "ok");
    } catch (err) {
      console.error("Login error:", err);
      console.error("Status:", err?.status, "Data:", JSON.stringify(err?.data));
      const msg = err?.message || t("loginError");
      toast(msg, "error");
    } finally { setState({ loading: false }); }
  }

  const s = slides[slide];

  return (
    <div className="login-page">

      {/* ═══ LEFT: Slideshow ═══ */}
      <div className="login-slider">
        {/* Animated bg blobs */}
        <div className="login-slider__blobs" aria-hidden="true">
          <div className="login-blob login-blob--1" />
          <div className="login-blob login-blob--2" />
          <div className="login-blob login-blob--3" />
        </div>

        <div className="login-slider__inner">
          {/* Brand */}
          <div className="login-slider__brand">
            <img src="/logo-nis.png" alt="NIS" className="login-slider__logo" />
            <div>
              <div className="login-slider__brandname">{t("appName")}</div>
              <div className="login-slider__brandsub">{t("loginNisName")}</div>
            </div>
          </div>

          {/* Slide */}
          <div className="login-slide" key={slide}>
            <div className="login-slide__icon" style={{ "--accent": s.accent }}>{s.icon}</div>
            <div className="login-slide__title">{t(s.tTitle)}</div>
            <div className="login-slide__desc">{t(s.tDesc)}</div>
          </div>

          {/* Dots */}
          <div className="login-dots">
            {slides.map((sl, i) => (
              <button
                key={i}
                className={`login-dot${i === slide ? " login-dot--active" : ""}`}
                onClick={() => setSlide(i)}
                aria-label={`Слайд ${i + 1}`}
                style={{ "--acc": sl.accent }}
              />
            ))}
          </div>

          {/* Bottom strip */}
          <div className="login-slider__footer">
            <div className="login-slider__stat"><span>📈</span> {t("loginMotivation1")}</div>
            <div className="login-slider__stat"><span>🎯</span> {t("loginMotivation2")}</div>
            <div className="login-slider__stat"><span>🏅</span> {t("loginMotivation3")}</div>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT: Form ═══ */}
      <div className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-form-header">
            <div className="login-form-logo">
              <img src="/logo-nis.png" alt="NIS" />
            </div>
            <div className="login-form-title">{t("loginHeading")}</div>
            <div className="login-form-sub">{t("loginSubtext")}</div>
          </div>

          <form onSubmit={submit}>
            <div className="login-field">
              <label className="login-label">{t("email")}</label>
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="name@nis.edu.kz" required />
            </div>
            <div className="login-field" style={{ marginTop: 10 }}>
              <label className="login-label">{t("password")}</label>
              <Input value={pass} onChange={e => setPass(e.target.value)} type="password" placeholder="••••••••" required />
            </div>
            <Btn kind="primary" type="submit" disabled={st.loading}
              style={{ width: "100%", justifyContent: "center", marginTop: 14, padding: "12px 20px", fontSize: 15 }}>
              {st.loading ? t("signingIn") : t("signIn")}
            </Btn>
          </form>

          <div className="login-form-footer">{t("copyright")}</div>
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════ */
/* ═══ AnimNum (stable component — must live outside PageDashboard) */
/* ══════════════════════════════════════════════ */
function AnimNum({ value, suffix = "" }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    if (target === 0) { setDisplay(0); return; }
    let frame;
    const start = performance.now();
    const dur = 900;
    const step = (t) => {
      const p = Math.min((t - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(ease * target));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{fmtPoints(display)}{suffix}</>;
}

/* ══════════════════════════════════════════════ */
/* ═══ PAGE: DASHBOARD ════════════════════════= */
/* ══════════════════════════════════════════════ */
function PageDashboard() {
  const st = useStore();
  const u = st.userDoc;
  if (!u) return <Guard />;
  if (!canAccess("dashboard", u)) return <Guard />;

  const users = st.users || [];
  const subs = st.mySubmissions || [];
  const allSubs = st.adminRecentSubs || [];
  const news = st.news || [];
  const types = st.types || [];
  const isAdmin = u.role === "admin";

  // Greeting based on time
  const hour = new Date().getHours();
  const greet = hour < 12 ? t("dashGreetMorning") : hour < 18 ? t("dashGreetDay") : t("dashGreetEvening");
  const displayName = (u.displayName || u.email || "").split(" ")[0];

  // Stats
  const totalPts = Number(u.totalPoints) || 0;
  const teachers = users.filter(x => x.role !== "admin");
  const sorted = [...teachers].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  const myRank = sorted.findIndex(x => x.uid === u.uid) + 1;

  const pending = isAdmin
    ? (st.pendingSubmissions || []).length
    : subs.filter(s => s.status === "pending").length;
  const approved = isAdmin
    ? allSubs.filter(s => s.status === "approved").length
    : subs.filter(s => s.status === "approved").length;
  const totalSubs = isAdmin ? allSubs.length : subs.length;
  const docsCount = isAdmin ? (st.allDocuments || []).length : (st.myDocuments || []).length;

  // Average points
  const avgPts = teachers.length ? Math.round(teachers.reduce((s, x) => s + (x.totalPoints || 0), 0) / teachers.length) : 0;

  // Active users (online in last 5 min is hard to track, so count users with points > 0)
  const activeUsers = teachers.filter(x => (x.totalPoints || 0) > 0).length;

  // Top 5 teachers
  const top5 = sorted.slice(0, 5);

  // Recent submissions (last 5)
  const recent = [...(isAdmin ? allSubs : subs)]
    .sort((a, b) => {
      const da = new Date(a.created || 0);
      const db = new Date(b.created || 0);
      return db - da;
    })
    .slice(0, 5);

  // Mini sparkline data: points per day for last 7 days
  const now = Date.now();
  const spark = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now - i * 86400000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const pts = (isAdmin ? allSubs : subs)
      .filter(s => {
        const d = new Date(s.created || 0);
        return d >= dayStart && d < dayEnd && s.status === "approved";
      })
      .reduce((sum, s) => sum + (Number(s.points) || 0), 0);
    spark.push(pts);
  }
  const sparkMax = Math.max(...spark, 1);

  // Status pills helper
  const statusPill = (status) => {
    const map = { pending: "warn", approved: "ok", rejected: "error" };
    const labelMap = { pending: t("dashPending"), approved: t("dashApproved"), rejected: "—" };
    return <span className={`pill ${map[status] || ""}`}>{labelMap[status] || status}</span>;
  };

  return (
    <div className="dash">
      {/* Welcome hero */}
      <div className="dash-hero glass card" style={{ "--di": 0 }}>
        <div className="dash-hero__text">
          <div className="dash-hero__greet">{greet}, <strong>{displayName}</strong>!</div>
          <div className="dash-hero__sub">{t("dashWelcome")}</div>
        </div>
        <div className="dash-hero__visual">
          <div className="dash-hero__ring">
            <svg viewBox="0 0 120 120" className="dash-hero__svg">
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="8" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--accent)" strokeWidth="8"
                strokeDasharray={`${Math.min(totalPts / 100, 1) * 327} 327`}
                strokeLinecap="round" transform="rotate(-90 60 60)"
                className="dash-hero__progress" />
            </svg>
            <div className="dash-hero__ring-text">
              <div className="dash-hero__ring-num"><AnimNum value={totalPts} /></div>
              <div className="dash-hero__ring-label">{t("dashMyPoints")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards row */}
      <div className="dash-stats">
        {!isAdmin && (
          <div className="dash-stat glass card" style={{ "--di": 1 }}>
            <div className="dash-stat__icon" style={{ background: "rgba(135,188,46,.12)", color: "var(--accent)" }}><Icon name="rank" /></div>
            <div className="dash-stat__num"><AnimNum value={myRank} /></div>
            <div className="dash-stat__label">{t("dashMyRank")} {t("dashOf")} {teachers.length}</div>
          </div>
        )}
        <div className="dash-stat glass card" style={{ "--di": 2 }}>
          <div className="dash-stat__icon" style={{ background: "rgba(59,130,246,.12)", color: "#3b82f6" }}><Icon name="user" /></div>
          <div className="dash-stat__num"><AnimNum value={teachers.length} /></div>
          <div className="dash-stat__label">{t("dashTeachers")}</div>
        </div>
        <div className="dash-stat glass card" style={{ "--di": 3 }}>
          <div className="dash-stat__icon" style={{ background: "rgba(245,158,11,.12)", color: "#f59e0b" }}><Icon name="file" /></div>
          <div className="dash-stat__num"><AnimNum value={totalSubs} /></div>
          <div className="dash-stat__label">{t("dashSubmissions")}</div>
        </div>
        <div className="dash-stat glass card" style={{ "--di": 4 }}>
          <div className="dash-stat__icon" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}><Icon name="shield" /></div>
          <div className="dash-stat__num"><AnimNum value={docsCount} /></div>
          <div className="dash-stat__label">{t("dashDocuments")}</div>
        </div>
        <div className="dash-stat glass card" style={{ "--di": 5 }}>
          <div className="dash-stat__icon" style={{ background: "rgba(236,72,153,.12)", color: "#ec4899" }}><Icon name="news" /></div>
          <div className="dash-stat__num"><AnimNum value={news.length} /></div>
          <div className="dash-stat__label">{t("dashNews")}</div>
        </div>
      </div>

      {/* Main grid: left + right */}
      <div className="dash-grid">
        {/* Left column */}
        <div className="dash-col">
          {/* Sparkline / points trend */}
          <div className="glass card dash-card" style={{ "--di": 6 }}>
            <div className="dash-card__head">
              <div className="h2">{t("dashPointsTrend")}</div>
              <div className="dash-spark-stats">
                <span className="pill ok">{t("dashApproved")}: {approved}</span>
                <span className="pill warn">{t("dashPending")}: {pending}</span>
              </div>
            </div>
            <div className="dash-spark">
              {spark.map((v, i) => (
                <div key={i} className="dash-spark__bar-wrap">
                  <div className="dash-spark__bar" style={{ "--h": `${(v / sparkMax) * 100}%`, "--delay": `${i * 0.07}s` }} />
                  <div className="dash-spark__day">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][(new Date(now - (6 - i) * 86400000)).getDay() === 0 ? 6 : (new Date(now - (6 - i) * 86400000)).getDay() - 1]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="glass card dash-card" style={{ "--di": 7 }}>
            <div className="h2">{t("dashQuickActions")}</div>
            <div className="dash-actions">
              {!isAdmin && (
                <button className="dash-action" onClick={() => navigate("add")}>
                  <span className="dash-action__icon" style={{ background: "rgba(135,188,46,.15)" }}><Icon name="plus" /></span>
                  {t("dashAddKpi")}
                </button>
              )}
              <button className="dash-action" onClick={() => navigate("rating")}>
                <span className="dash-action__icon" style={{ background: "rgba(59,130,246,.15)" }}><Icon name="rank" /></span>
                {t("dashViewRating")}
              </button>
              <button className="dash-action" onClick={() => navigate("stats")}>
                <span className="dash-action__icon" style={{ background: "rgba(168,85,247,.15)" }}><Icon name="chart" /></span>
                {t("dashViewStats")}
              </button>
              <button className="dash-action" onClick={() => navigate("news")}>
                <span className="dash-action__icon" style={{ background: "rgba(236,72,153,.15)" }}><Icon name="news" /></span>
                {t("dashViewNews")}
              </button>
            </div>
          </div>

          {/* Platform overview (for everyone) */}
          <div className="glass card dash-card" style={{ "--di": 8 }}>
            <div className="h2">{t("dashPlatformStats")}</div>
            <div className="dash-platform-row">
              <div className="dash-platform-item">
                <div className="dash-platform-item__num"><AnimNum value={avgPts} /></div>
                <div className="dash-platform-item__label">{t("dashAvgPoints")}</div>
              </div>
              <div className="dash-platform-item">
                <div className="dash-platform-item__num"><AnimNum value={activeUsers} /></div>
                <div className="dash-platform-item__label">{t("dashActiveUsers")}</div>
              </div>
              <div className="dash-platform-item">
                <div className="dash-platform-item__num"><AnimNum value={types.length} /></div>
                <div className="dash-platform-item__label">{t("navKpiTypes")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="dash-col">
          {/* Top teachers */}
          <div className="glass card dash-card" style={{ "--di": 6 }}>
            <div className="h2">{t("dashTopTeachers")}</div>
            <div className="dash-top">
              {top5.map((tc, idx) => (
                <div key={tc.uid} className="dash-top__row" style={{ "--delay": `${idx * 0.08}s` }}>
                  <div className={`dash-top__rank${idx < 3 ? " dash-top__rank--medal" : ""}`} data-rank={idx + 1}>{idx + 1}</div>
                  <div className="dash-top__info">
                    <div className="dash-top__name">{tc.displayName || tc.email}</div>
                  </div>
                  <div className="dash-top__pts">{fmtPoints(tc.totalPoints || 0)}</div>
                </div>
              ))}
              {top5.length === 0 && <p className="p muted">{t("dashNoActivity")}</p>}
            </div>
          </div>

          {/* Recent activity */}
          <div className="glass card dash-card" style={{ "--di": 7 }}>
            <div className="h2">{t("dashRecentActivity")}</div>
            <div className="dash-recent">
              {recent.map((s, idx) => {
                const tp = types.find(x => x.id === s.typeId);
                const d = new Date(s.created || 0);
                return (
                  <div key={s.id || idx} className="dash-recent__row" style={{ "--delay": `${idx * 0.08}s` }}>
                    <div className="dash-recent__dot" />
                    <div className="dash-recent__body">
                      <div className="dash-recent__title">{tp?.name || s.typeId || "—"}</div>
                      <div className="dash-recent__meta">
                        {isAdmin && <span>{s.userName || s.uid?.slice(0, 6)}</span>}
                        <span>{d.toLocaleDateString("ru-RU")}</span>
                        {statusPill(s.status)}
                      </div>
                    </div>
                    <div className="dash-recent__pts">+{s.points || 0}</div>
                  </div>
                );
              })}
              {recent.length === 0 && <p className="p muted">{t("dashNoActivity")}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function PageProfile() {
  const st = useStore();
  const u = st.userDoc; // read early, guard comes AFTER all hooks

  // ALL hooks before any early return
  const [tab, setTab] = useState("overview"); // overview | settings | security
  const [form, setForm] = useState({ displayName: "", school: "", subject: "", experienceYears: 0, phone: "", city: "", position: "", instagram: "", youtube: "" });
  const [pw, setPw] = useState({ current: "", next: "", next2: "" });
  useEffect(() => {
    if (!u) return;
    setForm({ displayName: u.displayName || "", school: u.school || "", subject: u.subject || "", experienceYears: u.experienceYears || 0, phone: u.phone || "", city: u.city || "", position: u.position || "", instagram: u.instagram || "", youtube: u.youtube || "" });
  }, [u?.uid]);
  useEffect(() => setPw({ current: "", next: "", next2: "" }), [u?.uid]);

  if (!u) return <Guard />;
  if (!canAccess("profile", u)) return <Guard />;

  const subs = st.mySubmissions || [];
  const lvl = levelFromPoints(u.totalPoints || 0);
  const approved = subs.filter(s => s.status === "approved");
  const pending = subs.filter(s => s.status === "pending");
  const rejected = subs.filter(s => s.status === "rejected");

  // --- Security / password change ---
  const isPasswordProvider = true; // PocketBase always uses password auth

  async function changePassword() {
    if (!pb.authStore.record) { toast(t("noSession"), "error"); return; }

    const next = String(pw.next || "");
    const next2 = String(pw.next2 || "");
    const current = String(pw.current || "");

    if (next.length < 6) { toast(t("pwdMinLength"), "error"); return; }
    if (next !== next2) { toast(t("pwdMismatch"), "error"); return; }
    if (!current) { toast(t("enterCurPwd"), "error"); return; }

    try {
      setState({ loading: true });
      await pb.collection("users").update(pb.authStore.record.id, {
        oldPassword: current,
        password: next,
        passwordConfirm: next
      });
      toast(t("pwdChanged"), "ok");
      setPw({ current: "", next: "", next2: "" });
    } catch (e) {
      console.error(e);
      toast(e?.message || t("pwdChangeError"), "error");
    } finally { setState({ loading: false }); }
  }

  async function resetPasswordEmail() {
    try {
      const email = (pb.authStore.record?.email || u.email || "").trim();
      if (!email) { toast(t("noEmail"), "error"); return; }
      setState({ loading: true });
      await pb.collection("users").requestPasswordReset(email);
      toast(t("resetSent"), "ok");
    } catch (e) {
      console.error(e);
      toast(e?.message || t("emailSendError"), "error");
    } finally { setState({ loading: false }); }
  }

  async function save() {
    try {
      setState({ loading: true });
      await updateProfile(u.id, {
        displayName: safeText(form.displayName),
        school: safeText(form.school),
        subject: safeText(form.subject),
        experienceYears: Number(form.experienceYears) || 0,
        phone: safeText(form.phone),
        city: safeText(form.city),
        position: safeText(form.position),
        instagram: safeText(form.instagram),
        youtube: safeText(form.youtube)
      });
      const fresh = await ensureUserDoc();
      setState({ userDoc: fresh });
      toast(t("profileUpdated"), "ok");
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast(e?.message || t("saveError"), "error");
    } finally { setState({ loading: false }); }
  }

  async function pickAvatar(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast(t("needImage"), "error"); return; }
    setState({ modal: { kind: "crop", file } });
  }

  // Блок "Первый запуск / сделать меня админом" удалён по запросу.

  const approvedPts = sum(approved, s => s.points);
  const aprPct = subs.length ? Math.round((approved.length / subs.length) * 100) : 0;
  const nextPts = lvl.next ? lvl.next - (Number(u.totalPoints) || 0) : 0;

  const TabBtn = ({ id, icon, label }) => (
    <button className={`prof-tab${tab === id ? " prof-tab--active" : ""}`} onClick={() => setTab(id)}>
      <Icon name={icon} /> {label}
    </button>
  );

  const LevelRing = ({ pct, size = 72, stroke = 5 }) => {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (circ * Math.min(pct, 100)) / 100;
    return (
      <svg width={size} height={size} className="prof-level-ring">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#profGrad)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <defs><linearGradient id="profGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--accent)" /><stop offset="100%" stopColor="var(--accent2)" /></linearGradient></defs>
      </svg>
    );
  };

  return (
    <div className="prof">
      {/* ══ Modern Hero Card ══ */}
      <div className="prof-hero glass card" style={{ "--di": 0 }}>
        <div className="prof-hero__banner" />
        <div className="prof-hero__content">
          {/* Avatar with upload */}
          <div className="prof-hero__avatar-wrap" onClick={() => document.getElementById("prof-avatar-input")?.click()}>
            <div className="prof-hero__avatar-ring">
              <div className="prof-hero__avatar">
                {u.avatarUrl ? <img src={u.avatarUrl} alt="" /> : <span>{(u.displayName || u.email || "?").slice(0, 1).toUpperCase()}</span>}
              </div>
            </div>
            <div className="prof-hero__avatar-overlay"><Icon name="file" /></div>
            <input id="prof-avatar-input" hidden type="file" accept="image/*" onChange={(e) => pickAvatar(e.target.files?.[0])} />
            <div className="prof-hero__badge-role">{u.role === "admin" ? "A" : "T"}</div>
          </div>

          {/* Info block */}
          <div className="prof-hero__info">
            <div className="prof-hero__name">{u.displayName || t("unnamed")}</div>
            <div className="prof-hero__tags">
              <span className="prof-tag prof-tag--role">{u.role === "admin" ? "Admin" : "Teacher"}</span>
              <span className="prof-tag prof-tag--level">{lvl.name}</span>
              {u.position && <span className="prof-tag">{u.position}</span>}
            </div>
            <div className="prof-hero__meta-row">
              <span className="prof-hero__meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" /><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" /></svg>
                {u.email}
              </span>
              {u.school && (
                <span className="prof-hero__meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" /></svg>
                  {u.school}
                </span>
              )}
              {u.subject && (
                <span className="prof-hero__meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" stroke="currentColor" strokeWidth="2" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" stroke="currentColor" strokeWidth="2" /></svg>
                  {u.subject}
                </span>
              )}
            </div>
          </div>

          {/* Level ring + actions */}
          <div className="prof-hero__right">
            <div className="prof-hero__level-wrap">
              <LevelRing pct={lvl.pct} />
              <div className="prof-hero__level-inner">
                <div className="prof-hero__level-pts">{fmtPoints(u.totalPoints)}</div>
                <div className="prof-hero__level-label">{t("points")}</div>
              </div>
            </div>
            {lvl.next && <div className="prof-hero__level-hint">{nextPts} {t("profileNextLevel").toLowerCase()}</div>}
          </div>
        </div>

        {/* Social links + quick actions */}
        <div className="prof-hero__bottom">
          <div className="prof-hero__social">
            {u.instagram && (
              <a href={`https://instagram.com/${u.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="prof-social-btn prof-social-btn--ig">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" /></svg>
                {u.instagram.startsWith("@") ? u.instagram : `@${u.instagram}`}
              </a>
            )}
            {u.youtube && (
              <a href={u.youtube} target="_blank" rel="noopener noreferrer" className="prof-social-btn prof-social-btn--yt">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.43z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                YouTube
              </a>
            )}
            {u.phone && (
              <a href={`tel:${u.phone}`} className="prof-social-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" /></svg>
                {u.phone}
              </a>
            )}
          </div>
          <div className="prof-hero__actions">
            {u.role !== "admin" && <Btn kind="primary" onClick={() => navigate("add")}><Icon name="plus" /> {t("addKpi")}</Btn>}
            <Btn onClick={() => navigate("rating")}><Icon name="rank" /> {t("navRating")}</Btn>
          </div>
        </div>
      </div>

      {/* ══ Stats row ══ */}
      <div className="prof-stats">
        <div className="prof-stat glass card" style={{ "--di": 1 }}>
          <div className="prof-stat__icon prof-stat__icon--green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="prof-stat__num">{fmtPoints(u.totalPoints)}</div>
          <div className="prof-stat__label">{t("totalPoints")}</div>
          <div className="prof-stat__bar"><div className="prof-stat__fill" style={{ width: `${lvl.pct}%` }} /></div>
          {lvl.next && <div className="prof-stat__hint">{t("profileNextLevel")}: {nextPts}</div>}
        </div>
        <div className="prof-stat glass card" style={{ "--di": 2 }}>
          <div className="prof-stat__icon prof-stat__icon--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" /><path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" /></svg>
          </div>
          <div className="prof-stat__num">{subs.length}</div>
          <div className="prof-stat__label">{t("submissions")}</div>
          <div className="prof-stat__badges">
            <span className="pill ok">{approved.length}</span>
            <span className="pill warn">{pending.length}</span>
            <span className="pill error">{rejected.length}</span>
          </div>
        </div>
        <div className="prof-stat glass card" style={{ "--di": 3 }}>
          <div className="prof-stat__icon prof-stat__icon--amber">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="prof-stat__num">{fmtPoints(approvedPts)}</div>
          <div className="prof-stat__label">{t("approvedPts")}</div>
          <div className="prof-stat__hint">{t("profApprovalRate")}: {aprPct}%</div>
        </div>
        <div className="prof-stat glass card" style={{ "--di": 4 }}>
          <div className="prof-stat__icon prof-stat__icon--purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </div>
          <div className="prof-stat__num">{fmtPoints(u.compDays || 0)}</div>
          <div className="prof-stat__label">{t("compDays")}</div>
          <Btn kind="ghost" style={{ marginTop: 6, fontSize: 12 }} onClick={() => navigate("requests")}>{t("requests")}</Btn>
        </div>
      </div>

      {/* ══ Tabs ══ */}
      <div className="prof-tabs">
        <TabBtn id="overview" icon="chart" label={t("profileOverview")} />
        <TabBtn id="settings" icon="user" label={t("profileEditInfo")} />
        <TabBtn id="security" icon="shield" label={t("security")} />
      </div>

      {/* Tab: overview */}
      {tab === "overview" && (
        <div className="glass card prof-card" style={{ "--di": 5 }}>
          <div className="h2">{t("recentSubs")}</div>
          <div className="sep"></div>
          <DataCards
            emptyText={t("noSubsYet")}
            columns={[
              { key: "eventDate", label: t("date") },
              { key: "typeName", label: t("type") },
              { key: "title", label: t("title") },
              { key: "points", label: t("points"), render: s => <b>{fmtPoints(s.points)}</b> },
              { key: "status", label: t("status"), render: s => <Pill kind={s.status}>{s.status}</Pill> }
            ]}
            rows={subs.slice(0, 8).map(s => ({ ...s, __key: s.id }))}
          />
        </div>
      )}

      {/* Tab: settings */}
      {tab === "settings" && (
        <div className="glass card prof-card" style={{ "--di": 5 }}>
          <div className="h2">{t("profilePersonal")}</div>
          <div className="sep"></div>
          <div className="grid2">
            <div><div className="label">{t("fullName")}</div><Input value={form.displayName} onChange={(e) => setForm(f => ({ ...f, displayName: e.target.value }))} /></div>
            <div><div className="label">{t("position")}</div><Input value={form.position} onChange={(e) => setForm(f => ({ ...f, position: e.target.value }))} /></div>
            <div><div className="label">{t("school")}</div><Input value={form.school} onChange={(e) => setForm(f => ({ ...f, school: e.target.value }))} /></div>
            <div><div className="label">{t("subject")}</div><Input value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
            <div><div className="label">{t("experience")}</div><Input type="number" min="0" max="60" value={form.experienceYears} onChange={(e) => setForm(f => ({ ...f, experienceYears: e.target.value }))} /></div>
            <div><div className="label">{t("phone")}</div><Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><div className="label">{t("city")}</div><Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div><div className="label">{t("instagram")}</div><Input value={form.instagram} onChange={(e) => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder={t("instagramPh")} /></div>
            <div style={{ gridColumn: "1 / -1" }}><div className="label">{t("youtube")}</div><Input value={form.youtube} onChange={(e) => setForm(f => ({ ...f, youtube: e.target.value }))} placeholder={t("youtubePh")} /></div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <Btn kind="primary" onClick={save} disabled={st.loading}><Icon name="check" /> {t("save")}</Btn>
            <Btn onClick={() => setTab("overview")}>{t("cancel")}</Btn>
          </div>
        </div>
      )}

      {/* Tab: security */}
      {tab === "security" && (
        <div className="glass card prof-card" style={{ "--di": 5 }}>
          <div className="h2">{t("security")}</div>
          <div className="help" style={{ marginBottom: 12 }}>
            {isPasswordProvider ? t("securityHelp") : t("securityNote")}
          </div>
          <div className="grid2">
            {isPasswordProvider && (
              <div>
                <div className="label">{t("currentPwd")}</div>
                <Input type="password" autoComplete="current-password" value={pw.current}
                  onChange={(e) => setPw(p => ({ ...p, current: e.target.value }))} />
              </div>
            )}
            <div>
              <div className="label">{t("newPwd")}</div>
              <Input type="password" autoComplete="new-password" value={pw.next}
                onChange={(e) => setPw(p => ({ ...p, next: e.target.value }))} />
            </div>
            <div>
              <div className="label">{t("repeatNewPwd")}</div>
              <Input type="password" autoComplete="new-password" value={pw.next2}
                onChange={(e) => setPw(p => ({ ...p, next2: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <Btn kind="primary" onClick={changePassword} disabled={st.loading}><Icon name="shield" /> {t("changePwd")}</Btn>
            <Btn kind="ghost" onClick={resetPasswordEmail} disabled={st.loading}>{t("resetByEmail")}</Btn>
          </div>
        </div>
      )}
    </div>
  );
}


const BOOK_QUIZ_LIBRARY = [
  {
    id: "auyl-shetindegi-ui",
    month: "Ақпан",
    title: "Әкім Тарази — «Ауыл шетіндегі үй»",
    shortTitle: "Ауыл шетіндегі үй",
    author: "Әкім Тарази",
    points: 20,
    thresholdPercent: 70,
    note: "NIS-пен бірге оқиық жобасы · ақпан айы",
    answerKeyNeedsReview: true,
    questions: [
      {
        id: "q1",
        text: "Шығарманың басты кейіпкері кім?",
        options: [
          { key: "A", text: "Сұлтан" },
          { key: "B", text: "Еркебұлан" },
          { key: "C", text: "Танабай" },
          { key: "D", text: "Ақбар" }
        ],
        correct: "A"
      },
      {
        id: "q2",
        text: "Басты кейіпкердің «Жаман Сұлтан» аталуына басты себеп не болды?",
        options: [
          { key: "A", text: "Елге қарсы шыққаны" },
          { key: "B", text: "Жұмысты дұрыс істемегені" },
          { key: "C", text: "Өмірдегі сәтсіздіктері мен мінез-құлқы" },
          { key: "D", text: "Бай адамдарға жақпағаны" }
        ],
        correct: "C"
      },
      {
        id: "q3",
        text: "Сұлтан колхозда қандай қызмет атқарады?",
        options: [
          { key: "A", text: "Колхоз бастығы" },
          { key: "B", text: "Қойшы" },
          { key: "C", text: "Қызылша суғаратын сушы" },
          { key: "D", text: "Саудамен айналысты" }
        ],
        correct: "C"
      },
      {
        id: "q4",
        text: "Сұлтан түн ортасында Өгізөлген ойпаңында не үшін жалғыз қалды?",
        options: [
          { key: "A", text: "Батырхан қашып кеткендіктен" },
          { key: "B", text: "Су бұратын қақпа ашылмай қалғандықтан" },
          { key: "C", text: "Жаңбыр жауып кеткендіктен" },
          { key: "D", text: "Ішімдік іздеп кеткендіктен" }
        ],
        correct: "B"
      },
      {
        id: "q5",
        text: "Жігіттердің көмекке келуіне не себеп болды?",
        options: [
          { key: "A", text: "Өз еріктерімен" },
          { key: "B", text: "Батырханның өтінішімен" },
          { key: "C", text: "Колхоз бастығынан қорыққандықтан" },
          { key: "D", text: "Ақша алу үшін" }
        ],
        correct: "B"
      },
      {
        id: "q6",
        text: "Танабайдың Сұлтанға деген көзқарасы қандай болды?",
        options: [
          { key: "A", text: "Менсінбейтін" },
          { key: "B", text: "Аяйтын" },
          { key: "C", text: "Шынайы құрметтейтін" },
          { key: "D", text: "Пайда үшін жақындасқан" }
        ],
        correct: "C"
      },
      {
        id: "q7",
        text: "Сұлтанның ісі оңға басуына өзі қандай екі себепті атады?",
        options: [
          { key: "A", text: "Ақша мен таныстық" },
          { key: "B", text: "Танабай және өз еңбегі" },
          { key: "C", text: "Ішімдік пен бастық" },
          { key: "D", text: "Аруақ пен бақыт" }
        ],
        correct: "B"
      },
      {
        id: "q8",
        text: "Сұлтан көрген түсін қалай жорыды?",
        options: [
          { key: "A", text: "Жамандыққа" },
          { key: "B", text: "Ауруға" },
          { key: "C", text: "Береке мен жақсы хабарға" },
          { key: "D", text: "Қайғылы оқиғаға" }
        ],
        correct: "C"
      },
      {
        id: "q9",
        text: "Гүлгауһардың тойында күйеу жігіттің кешігуінің нақты себебі қандай болды?",
        options: [
          { key: "A", text: "Ауырып қалған" },
          { key: "B", text: "Жолда қалған" },
          { key: "C", text: "Милицияға түсіп қалған" },
          { key: "D", text: "Басқа қыз тапқан" }
        ],
        correct: "C"
      },
      {
        id: "q10",
        text: "Құдалардан Сарбалақ бүркітті не үшін сұрады?",
        options: [
          { key: "A", text: "Өзіне керек болғандықтан" },
          { key: "B", text: "Байлығын көрсету үшін" },
          { key: "C", text: "Танабайды қуантқысы келгендіктен" },
          { key: "D", text: "Саудалау үшін" }
        ],
        correct: "C"
      }
    ]
  },
  {
    id: "akboz-at",
    month: "Наурыз",
    title: "Тәкен Әлімқұлов — «Ақбоз ат»",
    shortTitle: "Ақбоз ат",
    author: "Тәкен Әлімқұлов",
    points: 20,
    thresholdPercent: 70,
    note: "Викторина · 10 сұрақ",
    answerKeyNeedsReview: false,
    questions: [
      {
        id: "q1",
        text: "Шынар қайда оқыған?",
        options: [
          { key: "A", text: "Алматыда" },
          { key: "B", text: "Мәскеуде" },
          { key: "C", text: "Қаратауда" }
        ],
        correct: "B"
      },
      {
        id: "q2",
        text: "Шынар кімнің қызы?",
        options: [
          { key: "A", text: "Механиктің қызы" },
          { key: "B", text: "Директордың қызы" },
          { key: "C", text: "Жылқышының қызы" }
        ],
        correct: "A"
      },
      {
        id: "q3",
        text: "Қараш Бековтің негізгі қызығушылығы не?",
        options: [
          { key: "A", text: "Жылқыны қарау және ауыл шаруашылығына көмектесу" },
          { key: "B", text: "Газет жазу" },
          { key: "C", text: "Шопандармен сөйлесу" }
        ],
        correct: "A"
      },
      {
        id: "q4",
        text: "Біркембай кім?",
        options: [
          { key: "A", text: "Елеусіздің досы" },
          { key: "B", text: "«Бозтөбе» совхозының ақсақалы" },
          { key: "C", text: "Жергілікті мектептің директоры" }
        ],
        correct: "B"
      },
      {
        id: "q5",
        text: "Елеусіз қандай кәсібімен айналысады?",
        options: [
          { key: "A", text: "Кинооператор" },
          { key: "B", text: "Газеттің қызметкері" },
          { key: "C", text: "Мектеп мұғалімі" }
        ],
        correct: "B"
      },
      {
        id: "q6",
        text: "Қараш Бековтің туған жері қайда?",
        options: [
          { key: "A", text: "Алматы" },
          { key: "B", text: "Бұхар облысы" },
          { key: "C", text: "Қаратау" }
        ],
        correct: "B"
      },
      {
        id: "q7",
        text: "Елеусіз Қарашқа қанша досы бар деп айтты?",
        options: [
          { key: "A", text: "10-ға жуық" },
          { key: "B", text: "200 миллионнан асады" },
          { key: "C", text: "Белгісіз" }
        ],
        correct: "B"
      },
      {
        id: "q8",
        text: "Шынар қай қалада оқыған?",
        options: [
          { key: "A", text: "Алматыда" },
          { key: "B", text: "Мәскеуде" },
          { key: "C", text: "Ташкентте" }
        ],
        correct: "B"
      },
      {
        id: "q9",
        text: "Қараш Бековтың мамандығы қандай?",
        options: [
          { key: "A", text: "Жазушы" },
          { key: "B", text: "Кинооператор" },
          { key: "C", text: "Дәрігер" }
        ],
        correct: "B"
      },
      {
        id: "q10",
        text: "Елеусіз балалар үйінде неше жасында тұрады?",
        options: [
          { key: "A", text: "5 жас" },
          { key: "B", text: "13 жас" },
          { key: "C", text: "9 жас" }
        ],
        correct: "B"
      }
    ]
  },
  {
    id: "kentavr",
    month: "Сәуір",
    title: "Алтай Асқар — «Кентавр»",
    shortTitle: "Кентавр",
    author: "Алтай Асқар",
    points: 20,
    thresholdPercent: 70,
    note: "Тест сұрақтары кейін қосылады",
    questions: []
  },
  {
    id: "komentogai",
    month: "Мамыр",
    title: "Сайын Мұратбеков — «Коментогай»",
    shortTitle: "Коментогай",
    author: "Сайын Мұратбеков",
    points: 20,
    thresholdPercent: 70,
    note: "Тест сұрақтары кейін қосылады",
    questions: []
  }
];

async function fetchMyBookQuizAttempts(uid) {
  return await pb.collection("bookQuizAttempts").getFullList({ filter: `uid="${uid}"`, sort: "-created" });
}

async function createBookQuizAttempt(data) {
  await pb.collection("bookQuizAttempts").create({
    uid: data.uid,
    bookKey: safeText(data.bookKey),
    bookTitle: safeText(data.bookTitle),
    month: safeText(data.month),
    correctCount: Number(data.correctCount) || 0,
    totalCount: Number(data.totalCount) || 0,
    scorePercent: Number(data.scorePercent) || 0,
    passed: !!data.passed,
    cooldownUntil: safeText(data.cooldownUntil),
    thresholdPercent: Number(data.thresholdPercent) || 70,
    pointsCandidate: Number(data.pointsCandidate) || 0
  });
}

async function createBookQuizRewardSubmission({ uid, book, result }) {
  await pb.collection("submissions").create({
    uid,
    typeId: `book_quiz:${book.id}`,
    typeName: "Книжный тест (NIS-пен бірге оқиық)",
    typeSection: "Чтение",
    typeSubsection: "Книжный тест",
    points: Number(book.points) || 20,
    title: `Книжный тест: ${book.title}`,
    description: `Результат теста: ${result.correct}/${result.total} (${result.percent}%). Порог: ${book.thresholdPercent || 70}%`,
    eventDate: ymd(),
    evidenceLink: "",
    quizBookKey: book.id,
    quizScorePercent: Number(result.percent) || 0,
    quizCorrectCount: Number(result.correct) || 0,
    quizTotalCount: Number(result.total) || 0,
    status: "pending"
  });
}

function calcQuizResult(book, answers) {
  const questions = book?.questions || [];
  let correct = 0;
  for (const q of questions) {
    if (!q?.correct) continue;
    if ((answers?.[q.id] || "") === q.correct) correct += 1;
  }
  const total = questions.length;
  const percent = total ? Math.round((correct / total) * 100) : 0;
  return { correct, total, percent };
}

function getBookQuizStatus(book, attempts, submissions) {
  const items = (attempts || []).filter(a => a.bookKey === book.id);
  const latest = items[0] || null;
  const now = Date.now();
  const cooldownUntilMs = latest?.cooldownUntil ? new Date(latest.cooldownUntil).getTime() : 0;
  const isCooldown = !!cooldownUntilMs && cooldownUntilMs > now && !latest?.passed;
  const hasRewardSubmission = (submissions || []).some(s => {
    if ((s?.quizBookKey || "") === book.id && s.status !== "rejected") return true;
    if ((s?.title || "").includes(book.title) && (s?.typeId || "").startsWith("book_quiz:") && s.status !== "rejected") return true;
    return false;
  });
  const hasQuestions = !!(book.questions && book.questions.length);

  let state = "ready";
  if (!hasQuestions) state = "soon";
  else if (hasRewardSubmission) state = "sent";
  else if (isCooldown) state = "cooldown";
  else if (latest?.passed) state = "passed";

  return { state, latest, cooldownUntilMs, hasRewardSubmission, hasQuestions };
}

function fmtDateTimeSafe(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function PageAdd() {
  const st = useStore();
  const u = st.userDoc; // read early, guard comes AFTER all hooks

  // ALL hooks before any early return
  const [section, setSection] = useState("");
  const [subsection, setSubsection] = useState("");
  const [typeId, setTypeId] = useState("");
  const [eventDate, setEventDate] = useState(ymd());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceLink, setEvidenceLink] = useState("");
  const [file, setFile] = useState(null);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState(BOOK_QUIZ_LIBRARY[0]?.id || "");
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);

  const types = (st.types || []).filter(t => t.active);
  const sections = Array.from(new Set(types.map(t => t.section))).sort();
  const subs = useMemo(() => Array.from(new Set(types.filter(t => t.section === section).map(t => t.subsection))).sort(), [types, section]);
  const opts = useMemo(() => types.filter(t => t.section === section && t.subsection === subsection), [types, section, subsection]);
  const selectedBook = BOOK_QUIZ_LIBRARY.find(b => b.id === selectedBookId) || BOOK_QUIZ_LIBRARY[0] || null;
  const selectedStatus = useMemo(
    () => selectedBook ? getBookQuizStatus(selectedBook, quizAttempts, st.mySubmissions || []) : null,
    [selectedBookId, quizAttempts, (st.mySubmissions || []).length]
  );

  useEffect(() => setSection(sections[0] || ""), [sections.join("|")]);
  useEffect(() => setSubsection(subs[0] || ""), [subs.join("|")]);
  useEffect(() => setTypeId(opts[0]?.id || ""), [opts.map(x => x.id).join("|")]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!u?.uid) return;
      try {
        setQuizLoading(true);
        const items = await fetchMyBookQuizAttempts(u.uid);
        if (!cancelled) setQuizAttempts(items);
      } catch (e) {
        console.error(e);
        toast("Не удалось загрузить историю тестов", "error");
      } finally {
        if (!cancelled) setQuizLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [u?.uid]);

  if (!u) return <Guard />;
  if (!canAccess("add", u)) return <Guard />;

  const type = opts.find(x => x.id === typeId) || null;

  async function refreshQuizAttempts() {
    if (!u?.uid) return;
    const items = await fetchMyBookQuizAttempts(u.uid);
    setQuizAttempts(items);
  }

  function openQuiz(book) {
    setSelectedBookId(book.id);
    setQuizOpen(true);
    setQuizAnswers({});
    setQuizResult(null);
  }

  function closeQuiz() {
    setQuizOpen(false);
    setQuizAnswers({});
    setQuizResult(null);
  }

  async function submitBookQuiz(e) {
    e?.preventDefault?.();
    if (!selectedBook) return;
    const status = getBookQuizStatus(selectedBook, quizAttempts, st.mySubmissions || []);
    if (!status.hasQuestions) { toast("Тест по этой книге пока не добавлен", "error"); return; }
    if (status.state === "cooldown") {
      toast(`Повторная попытка доступна после ${fmtDateTimeSafe(status.latest?.cooldownUntil)}`, "error");
      return;
    }
    if (status.hasRewardSubmission) {
      toast("Баллы по этой книге уже отправлены на проверку", "ok");
      return;
    }

    const unanswered = (selectedBook.questions || []).filter(q => !quizAnswers[q.id]);
    if (unanswered.length) {
      toast(`Ответьте на все вопросы (${unanswered.length} осталось)`, "error");
      return;
    }

    const result = calcQuizResult(selectedBook, quizAnswers);
    const passed = result.percent >= (selectedBook.thresholdPercent || 70);
    setQuizResult({ ...result, passed });

    try {
      setQuizSubmitting(true);
      const cooldownUntil = passed ? "" : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await createBookQuizAttempt({
        uid: u.uid,
        bookKey: selectedBook.id,
        bookTitle: selectedBook.title,
        month: selectedBook.month,
        correctCount: result.correct,
        totalCount: result.total,
        scorePercent: result.percent,
        passed,
        cooldownUntil,
        thresholdPercent: selectedBook.thresholdPercent || 70,
        pointsCandidate: passed ? (selectedBook.points || 20) : 0
      });

      if (passed) {
        await createBookQuizRewardSubmission({ uid: u.uid, book: selectedBook, result });
        const my = await fetchMySubmissions(u.uid);
        setState({ mySubmissions: my });
        toast(`Тест пройден (${result.percent}%). +${selectedBook.points || 20} баллов отправлены на проверку`, "ok");
      } else {
        toast(`Набрано ${result.percent}%. Повтор через 24 часа`, "error");
      }

      await refreshQuizAttempts();
    } catch (err) {
      console.error(err);
      toast(err?.message || "Ошибка при сохранении результата теста", "error");
    } finally {
      setQuizSubmitting(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    try {
      if (!type) { toast("Выберите тип KPI", "error"); return; }
      if (!safeText(title)) { toast("Введите название", "error"); return; }
      if (!safeText(evidenceLink) && !file) { toast("Добавьте ссылку и/или файл", "error"); return; }

      setState({ loading: true });
      await createSubmission({ uid: u.uid, type, title, description, eventDate, evidenceLink, evidenceFile: file || null });
      toast("Заявка отправлена на проверку", "ok");

      const my = await fetchMySubmissions(u.uid);
      setState({ mySubmissions: my });

      setTitle(""); setDescription(""); setEvidenceLink(""); setFile(null);
      navigate("dashboard");
    } catch (err) {
      console.error(err);
      toast(err?.message || "Ошибка отправки", "error");
    } finally { setState({ loading: false }); }
  }

  return (selectedBook && quizOpen) ? (
    <div className="quiz-fullpage route-section">
      <div className="quiz-fullpage__header">
        <button className="quiz-back-btn" type="button" onClick={closeQuiz}>
          ← Кітаптар · Назад
        </button>
        <div className="quiz-fullpage__book-info">
          <span className="quiz-fullpage__month">{selectedBook.month}</span>
          <span className="quiz-fullpage__title">{selectedBook.author} · «{selectedBook.shortTitle}»</span>
          <span className="tiny muted">Порог: {selectedBook.thresholdPercent || 70}% · +{selectedBook.points || 20} балл</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {selectedStatus?.state === "sent" ? <Pill kind="pending">Баллы отправлены</Pill> : null}
          {selectedStatus?.state === "cooldown" ? <Pill kind="rejected">Повтор позже</Pill> : null}
        </div>
      </div>

      {selectedBook.questions?.length ? (
        quizResult ? (
          <div className="quiz-result-screen">
            <div className="quiz-result-screen__icon">{quizResult.passed ? "🎉" : "😔"}</div>
            <div className="quiz-result-screen__score">
              {quizResult.correct}<span className="quiz-result-screen__score-total">/{quizResult.total}</span>
            </div>
            <div className="quiz-result-screen__percent">{quizResult.percent}%</div>
            {quizResult.passed ? (
              <>
                <div className="quiz-result-screen__title ok">Құттықтаймыз! · Поздравляем!</div>
                <div className="quiz-result-screen__desc">
                  Тест сәтті өтілді · Тест успешно пройден<br />
                  +{selectedBook.points || 20} балл тексеруге жіберілді · баллов отправлены на проверку
                </div>
              </>
            ) : (
              <>
                <div className="quiz-result-screen__title fail">Өкінішке орай · К сожалению</div>
                <div className="quiz-result-screen__desc">
                  Өту шегі {selectedBook.thresholdPercent || 70}% · Порог прохождения {selectedBook.thresholdPercent || 70}%<br />
                  24 сағаттан кейін қайталауға болады · Повтор доступен через 24 часа
                </div>
              </>
            )}
            <Btn type="button" onClick={closeQuiz} kind="primary" style={{ marginTop: 28 }}>← Кітаптарға оралу · Вернуться к книгам</Btn>
          </div>
        ) : (
          <form onSubmit={submitBookQuiz} className="quiz-fullpage__form">
            <div className="quiz-questions">
              {selectedBook.questions.map((q, idx) => {
                const picked = quizAnswers[q.id] || "";
                return (
                  <div key={q.id} className="quiz-question-card">
                    <div className="quiz-question-card__title">{idx + 1}. {q.text}</div>
                    <div className="quiz-options">
                      {q.options.map(opt => {
                        const checked = picked === opt.key;
                        return (
                          <label key={opt.key} className={`quiz-option ${checked ? "selected" : ""}`}>
                            <input
                              type="radio"
                              name={`quiz_${selectedBook.id}_${q.id}`}
                              value={opt.key}
                              checked={checked}
                              onChange={() => setQuizAnswers(prev => ({ ...prev, [q.id]: opt.key }))}
                              disabled={quizSubmitting || selectedStatus?.state === "cooldown" || selectedStatus?.hasRewardSubmission}
                            />
                            <span className="quiz-option__key">{opt.key}</span>
                            <span>{opt.text}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="quiz-fullpage__actions">
              <Btn kind="primary" type="submit" disabled={quizSubmitting || selectedStatus?.state === "cooldown" || selectedStatus?.hasRewardSubmission}>
                {quizSubmitting ? "Сохраняем..." : "Тестті аяқтау · Завершить тест"}
              </Btn>
              <Btn type="button" onClick={() => setQuizAnswers({})} disabled={quizSubmitting}>Сбросить ответы</Btn>
              <Btn type="button" onClick={closeQuiz}>← Назад</Btn>
            </div>
          </form>
        )
      ) : (
        <div className="glass card" style={{ maxWidth: 560, margin: "0 auto" }}>
          <p className="p">Для этой книги тест ещё не добавлен. Можете прислать вопросы — я встрою их по аналогии.</p>
          <Btn type="button" onClick={closeQuiz} style={{ marginTop: 12 }}>← Назад</Btn>
        </div>
      )}
    </div>
  ) : (
    <div className="grid2">
      <div className="glass card">
        <div className="h1">Добавить KPI</div>
        <p className="p">Выберите тип KPI и прикрепите доказательства.</p>
        <div className="sep"></div>

        <form onSubmit={submit}>
          <div className="grid2">
            <div>
              <div className="label">Section</div>
              <Select value={section} onChange={(e) => setSection(e.target.value)}>
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <div className="label">Subsection</div>
              <Select value={subsection} onChange={(e) => setSubsection(e.target.value)}>
                {subs.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <div className="label">Тип KPI</div>
              <Select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                {opts.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
              <div className="help">Баллы подтянутся из типа автоматически.</div>
            </div>
          </div>

          <div className="grid2">
            <div>
              <div className="label">Дата</div>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
            </div>
            <div>
              <div className="label">Баллы</div>
              <Input value={type?.defaultPoints ?? ""} readOnly />
            </div>
          </div>

          <div className="label">Название</div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />

          <div className="label">Описание</div>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Коротко: что сделано, где, результат..." />

          <div className="label">Ссылка (optional)</div>
          <Input value={evidenceLink} onChange={(e) => setEvidenceLink(e.target.value)} placeholder="https://..." />

          <div className="label">Файл (optional)</div>
          <Input type="file" accept=".pdf,image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <Btn kind="primary" type="submit" disabled={st.loading}>Отправить</Btn>
            <Btn type="button" onClick={() => navigate("profile")}>Назад</Btn>
          </div>
        </form>
      </div>

      <div className="glass card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div className="h2" style={{ marginBottom: 4 }}>Подсказки · Книги месяца</div>
            <div className="tiny muted">Откройте тест по книге. При результате от 70% система отправит +20 баллов на проверку.</div>
          </div>
          {quizLoading ? <Pill kind="pending">Загрузка...</Pill> : <Pill kind="approved">Тесты с БД</Pill>}
        </div>
        <div className="sep"></div>

        <div className="book-month-grid">
          {BOOK_QUIZ_LIBRARY.map(book => {
            const qs = book.questions || [];
            const status = getBookQuizStatus(book, quizAttempts, st.mySubmissions || []);
            const isSelected = selectedBookId === book.id;
            const stateLabel = status.state === "sent"
              ? "На проверке"
              : status.state === "cooldown"
                ? "Пауза 24ч"
                : status.state === "soon"
                  ? "Скоро"
                  : "Доступен";
            return (
              <div key={book.id} className={`book-month-card ${isSelected ? "active" : ""}`}>
                <div className="book-month-card__top">
                  <div className="book-month-card__month">{book.month}</div>
                  <Pill kind={status.state === "sent" ? "pending" : status.state === "cooldown" ? "rejected" : status.state === "soon" ? "" : "approved"}>{stateLabel}</Pill>
                </div>
                <div className="book-month-card__title">{book.author}</div>
                <div className="book-month-card__subtitle">«{book.shortTitle}»</div>
                <div className="tiny muted" style={{ marginTop: 6 }}>{book.note || ""}</div>
                <div className="tiny muted" style={{ marginTop: 8 }}>
                  {qs.length ? `${qs.length} сұрақ · Порог ${book.thresholdPercent || 70}% · +${book.points || 20} балл` : "Тест сұрақтары әлі қосылмаған"}
                </div>
                {status.state === "cooldown" && status.latest?.cooldownUntil ? (
                  <div className="tiny" style={{ marginTop: 8, color: "var(--red)" }}>Повтор: {fmtDateTimeSafe(status.latest.cooldownUntil)}</div>
                ) : null}
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <Btn
                    kind={isSelected ? "primary" : ""}
                    onClick={() => { setSelectedBookId(book.id); if (qs.length) setQuizOpen(true); }}
                    disabled={!qs.length}
                    type="button"
                  >
                    {isSelected ? "Выбрано" : "Открыть"}
                  </Btn>
                  {qs.length ? <Btn type="button" kind="ghost" onClick={() => openQuiz(book)}>Начать тест</Btn> : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="sep"></div>
        <p className="p">Если тест не пройден (меньше 70%), повторная попытка блокируется на 24 часа. Это помогает проверить, действительно ли учитель читал книгу.</p>
        {BOOK_QUIZ_LIBRARY.some(b => b.answerKeyNeedsReview) && (
          <div className="help" style={{ marginTop: 8 }}>⚠️ Для теста «Ауыл шетіндегі үй» ответы добавлены как рабочий ключ. Перед запуском в школе проверьте ключи у методиста.</div>
        )}
      </div>
    </div>
  );
}

function PageRequests() {
  const st = useStore();
  const u = st.userDoc; // read early, guard comes AFTER all hooks

  // ALL hooks before any early return
  const [kind, setKind] = useState(REQUEST_KINDS[0]?.key || "leave");
  const [dateFrom, setDateFrom] = useState(ymd());
  const [dateTo, setDateTo] = useState(ymd());
  const [note, setNote] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [viewReq, setViewReq] = useState(null);
  const days = useMemo(() => dateRangeDays(dateFrom, dateTo), [dateFrom, dateTo]);

  if (!u) return <Guard />;
  if (!canAccess("requests", u)) return <Guard />;

  const reqs = st.myRequests || [];
  const k = REQUEST_KINDS.find(x => x.key === kind) || REQUEST_KINDS[0];
  const compPreview = k.compMode === "earn" ? days : k.compMode === "use" ? -days : 0;

  const pending = reqs.filter(r => r.status === "pending");
  const approved = reqs.filter(r => r.status === "approved");
  const rejected = reqs.filter(r => r.status === "rejected");

  async function refresh() {
    try {
      setState({ loading: true });
      const [myReq, fresh] = await Promise.all([
        fetchMyRequests(u.uid),
        ensureUserDoc()
      ]);
      setState({ myRequests: myReq, userDoc: fresh });
      toast(t("dataUpdated"), "ok");
    } catch (e) {
      console.error(e);
      toast(e?.message || t("updateFailed"), "error");
    } finally { setState({ loading: false }); }
  }

  async function submit(e) {
    e.preventDefault();
    try {
      const f = safeText(dateFrom);
      const to = safeText(dateTo) || f;
      const df = new Date(`${f}T00:00:00`);
      const dt = new Date(`${to}T00:00:00`);
      if (Number.isNaN(df.getTime()) || Number.isNaN(dt.getTime())) { toast(t("invalidDateRange"), "error"); return; }
      if (dt.getTime() < df.getTime()) { toast(t("invalidDateRange"), "error"); return; }

      setState({ loading: true });
      await createTeacherRequest({ uid: u.uid, kind, dateFrom: f, dateTo: to, note, evidenceFile: null });
      toast(t("requestSent"), "ok");
      const myReq = await fetchMyRequests(u.uid);
      setState({ myRequests: myReq });
      setNote("");
    } catch (err) {
      console.error(err);
      toast(err?.message || t("sendError"), "error");
    } finally { setState({ loading: false }); }
  }

  const signNum = (n) => {
    const x = Number(n) || 0;
    return x > 0 ? `+${x}` : String(x);
  };

  // Preview data for the form
  const previewReq = {
    kind, kindLabel: t(k.tKey), dateFrom, dateTo,
    days, note, status: "pending", id: Math.random().toString(36).slice(2, 8).toUpperCase(),
    evidenceFileUrl: ""
  };

  return (
    <>
      {/* Modal: view document for a specific request */}
      {viewReq && createPortal(
        <div className="tp-overlay" onClick={() => setViewReq(null)}>
          <div className="tp-card" onClick={e => e.stopPropagation()} style={{ width: "700px", maxWidth: "95vw", maxHeight: "95vh", overflowY: "auto" }}>
            <button className="tp-close" onClick={() => setViewReq(null)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
            <DocumentPreview
              request={viewReq}
              user={u}
              signatureUrl={u.signatureUrl}
              onPrint={() => window.print()}
              showDownload
            />
          </div>
        </div>,
        document.body
      )}

      <div className="grid2">
        <div className="glass card">
          <div className="h1">{t("requestsTitle")}</div>
          <p className="p">{t("requestsDesc")}</p>
          <div className="sep"></div>

          <form onSubmit={submit}>
            <div className="label">{t("requestType")}</div>
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              {REQUEST_KINDS.map(x => <option key={x.key} value={x.key}>{t(x.tKey)}</option>)}
            </Select>

            <div className="grid2">
              <div>
                <div className="label">{t("dateFrom")}</div>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} required />
              </div>
              <div>
                <div className="label">{t("dateTo")}</div>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} required />
              </div>
            </div>

            <div className="label">{t("reason")}</div>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("reasonPlaceholder")} />

            <div className="help" style={{ marginTop: 8 }}>
              Кезеңдегі күндер: <b>{days}</b>. {k.compMode === "earn" && <>{t("earnedDays")}: <b>+{days}</b>.</>}
              {k.compMode === "use" && <>{t("usedDays")}: <b>-{days}</b>.</>}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <Btn kind="primary" type="submit" disabled={st.loading}><Icon name="check" /> {t("send")}</Btn>
              <Btn type="button" onClick={() => setShowPreview(!showPreview)}><Icon name="file" /> {showPreview ? t("hide") : t("preview")}</Btn>
              <Btn type="button" onClick={refresh} disabled={st.loading}>{t("refresh")}</Btn>
            </div>
          </form>

          {showPreview && (
            <>
              <div className="sep" />
              <div className="h2">{t("preview")}</div>
              <DocumentPreview request={previewReq} user={u} signatureUrl={u.signatureUrl} showDownload />
            </>
          )}
        </div>

        <div className="glass card">
          <div className="h2">{t("myRequests")}</div>
          <div className="sep"></div>

          <div className="grid3">
            <div className="kpi">
              <div><div className="muted tiny">{t("compBalance")}</div><div style={{ fontWeight: 900, fontSize: 22 }}>{fmtPoints(u.compDays || 0)}</div></div>
              <Pill kind="approved">{t("compDaysPill")}</Pill>
            </div>
            <div className="kpi">
              <div><div className="muted tiny">{t("requests")}</div><div style={{ fontWeight: 900, fontSize: 22 }}>{fmtPoints(reqs.length)}</div></div>
              <span className="tiny muted">{t("reqPending")} {pending.length}</span>
            </div>
            <div className="kpi">
              <div><div className="muted tiny">{t("compForecast")}</div><div style={{ fontWeight: 900, fontSize: 22 }}>{compPreview ? signNum(compPreview) : "0"}</div></div>
              <span className="tiny muted">{t("forNew")}</span>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Pill kind="approved">{t("reqApproved")}: {approved.length}</Pill>
            <Pill kind="pending">{t("reqPending")}: {pending.length}</Pill>
            <Pill kind="rejected">{t("reqRejected")}: {rejected.length}</Pill>
          </div>

          <div className="sep"></div>

          <DataCards
            emptyText={t("noRequests")}
            columns={[
              { key: "period", label: "Кезең", render: r => `${r.dateFrom}${r.dateTo && r.dateTo !== r.dateFrom ? ` → ${r.dateTo}` : ""}` },
              { key: "kind", label: "Түрі", render: r => <><b>{r.kindLabel || requestKindLabel(r.kind)}</b>{r.note ? <div className="muted tiny">{r.note}</div> : null}</> },
              { key: "status", label: t("status"), render: r => <Pill kind={r.status}>{r.status === "approved" ? t("reqApproved") : r.status === "rejected" ? t("reqRejected") : t("reqPending")}</Pill> },
              { key: "pts", label: t("pointsDelta"), render: r => r.status === "approved" ? <b>{signNum(Number(r.pointsDelta) || 0)}</b> : <span className="muted">—</span> },
              { key: "actions", label: "", render: r => <Btn kind="ghost" onClick={() => setViewReq(r)}><Icon name="file" /></Btn> }
            ]}
            rows={reqs.slice(0, 20).map(r => ({ ...r, __key: r.id }))}
          />
        </div>
      </div>
    </>
  );
}

function ratingTrend(usersSorted) {
  const prev = JSON.parse(localStorage.getItem("rating_snapshot") || "[]");
  const prevPos = new Map(prev.map((x, i) => [x.uid, i + 1]));
  const trend = new Map();
  usersSorted.forEach((u, i) => {
    const c = i + 1;
    const p = prevPos.get(u.uid);
    if (!p) trend.set(u.uid, "NEW");
    else {
      const diff = p - c;
      trend.set(u.uid, diff > 0 ? `▲ ${diff}` : diff < 0 ? `▼ ${Math.abs(diff)}` : "• 0");
    }
  });
  localStorage.setItem("rating_snapshot", JSON.stringify(usersSorted.map(u => ({ uid: u.uid, total: Number(u.totalPoints) || 0 }))));
  return trend;
}


function PageRating() {
  const st = useStore();
  const u = st.userDoc;

  if (!u) return <Guard />;
  if (!canAccess("rating", u)) return <Guard />;

  const teachers = st.users.filter(x => (x.role || "teacher") !== "admin");
  const sorted = [...teachers].sort((a, b) => (Number(b.totalPoints) || 0) - (Number(a.totalPoints) || 0)).slice(0, 100);
  const trend = ratingTrend(sorted);

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const Avatar = ({ user, size = "sm" }) => (
    <div className={`avatar ${size}`} aria-hidden="true">
      {user?.avatarUrl
        ? <img src={user.avatarUrl} alt="" />
        : <span style={{ fontWeight: 900 }}>{(user?.displayName || user?.email || "?").slice(0, 1).toUpperCase()}</span>}
    </div>
  );

  const openProfile = (teacher) => setState({ modal: { kind: "teacherProfile", teacher } });

  return (
    <div className="glass card">
      <div className="h1">{t("ratingTitle")}</div>
      <p className="p">{t("ratingDesc")}</p>
      <div className="sep"></div>

      <div className="podium">
        {[1, 0, 2].map((idx, i) => {
          const tc = top3[idx];
          const isChamp = idx === 0;
          if (!tc) {
            return (
              <div key={i} className="podium__item glass">
                <div className="podium__inner">
                  <div className="podium__rank">—</div>
                  <div className="podium__name">{t("emptySlot")}</div>
                  <div className="podium__meta muted">{t("noData")}</div>
                </div>
              </div>
            );
          }
          if (isChamp) {
            return (
              <div key={tc.uid} className="podium__item podium__item--champ glass first" onClick={() => openProfile(tc)} style={{ cursor: "pointer" }}>
                {/* Decorative shimmer strips */}
                <div className="champ-shimmer" aria-hidden="true" />
                <div className="podium__inner">
                  <div className="champ-crown">👑</div>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div className="podiumAvatar podiumAvatar--champ">
                      {tc.avatarUrl
                        ? <img src={tc.avatarUrl} alt="" />
                        : <span style={{ fontWeight: 900, fontSize: 22 }}>{(tc.displayName || tc.email || "?").slice(0, 1).toUpperCase()}</span>}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="champ-rank-badge">#1 {t("champion")} · {trend.get(tc.uid)}</div>
                      <div className="champ-name">{tc.displayName || tc.email}</div>
                      <div className="podium__meta">{tc.school || "—"} · {tc.subject || "—"}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div className="champ-points">{fmtPoints(tc.totalPoints)}</div>
                      <div className="tiny" style={{ color: "#d4a800", fontWeight: 700 }}>{t("pts")}</div>
                    </div>
                  </div>
                  <div className="champ-stars" aria-hidden="true">★ ★ ★ ★ ★</div>
                </div>
              </div>
            );
          }
          const isSilver = idx === 1;
          const isBronze = idx === 2;
          const placeClass = isSilver ? "podium__item--silver" : "podium__item--bronze";
          const avatarClass = isSilver ? "podiumAvatar--silver" : "podiumAvatar--bronze";
          const badgeClass = isSilver ? "silver-rank-badge" : "bronze-rank-badge";
          const shimmerClass = isSilver ? "silver-shimmer" : "bronze-shimmer";
          const medal = isSilver ? "🥈" : "🥉";
          return (
            <div key={tc.uid} className={`podium__item ${placeClass} glass`} onClick={() => openProfile(tc)} style={{ cursor: "pointer" }}>
              <div className={shimmerClass} aria-hidden="true" />
              <div className="podium__inner" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div className={`podiumAvatar ${avatarClass}`}>
                  {tc.avatarUrl
                    ? <img src={tc.avatarUrl} alt="" />
                    : <span style={{ fontWeight: 900 }}>{(tc.displayName || tc.email || "?").slice(0, 1).toUpperCase()}</span>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className={badgeClass}>#{idx + 1} {medal} · {trend.get(tc.uid)}</div>
                  <div className="podium__name">{tc.displayName || tc.email}</div>
                  <div className="podium__meta">{tc.school || "—"} · {tc.subject || "—"}</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div className="podium__points">{fmtPoints(tc.totalPoints)}</div>
                  <div className="tiny muted">{t("pts")}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sep"></div>

      <div className="h2">{t("top100")}</div>
      <div className="ratinglist" style={{ marginTop: 10 }}>
        {rest.map((tc, i) => (
          <div key={tc.uid} className="ratingrow ratingrow--clickable" onClick={() => openProfile(tc)}>
            <div className="ratingrank">{i + 4}</div>
            <Avatar user={tc} />
            <div className="ratingmeta">
              <div className="ratingname">{tc.displayName || t("unnamed")}</div>
              <div className="ratingsub">{tc.school || "—"} · {tc.subject || "—"} · {tc.email}</div>
            </div>
            <div className="ratingpts">{fmtPoints(tc.totalPoints)}</div>
            <div className="ratingtrend">{trend.get(tc.uid)}</div>
          </div>
        ))}
        {!sorted.length && (
          <div className="ratingrow"><div className="muted tiny">{t("noData")}</div></div>
        )}
      </div>
    </div>
  );
}




function PageStats() {
  const st = useStore();
  const u = st.userDoc;
  if (!u) return <Guard />;
  if (!canAccess("stats", u)) return <Guard />;

  const mode = st.statsRangeMode;
  const days = mode === "365d" ? 365 : 14;

  // keep UI responsive: 14d -> daily, 365d -> monthly
  const startYMD = startYMDFromDays(days);
  const dayBins = lastDays(14);
  const monthBins = lastMonths(12);
  const bins = mode === "365d" ? monthBins : dayBins;

  const rangeDays = new Set(dayBins.map(x => x.ymd));
  const rangeMonths = new Set(monthBins.map(x => x.key));

  const inRange = (s) => {
    if (!s?.eventDate) return false;
    if (mode === "365d") {
      const mk = (s.eventDate || "").slice(0, 7);
      return s.eventDate >= startYMD && rangeMonths.has(mk);
    }
    return rangeDays.has(s.eventDate);
  };

  const seriesPoints = (approved, bin) => {
    if (mode === "365d") {
      return sum(approved.filter(s => (s.eventDate || "").slice(0, 7) === bin.key), s => s.points);
    }
    return sum(approved.filter(s => s.eventDate === bin.ymd), s => s.points);
  };

  const view = u.role === "teacher" ? (st.statsView || "mine") : "platform";

  async function refresh() {
    try {
      setState({ loading: true });
      await hydrateForUser(u);
      toast(t("dataUpdated"), "ok");
    } catch (e) {
      console.error(e);
      toast(e?.message || t("updateFailed"), "error");
    } finally {
      setState({ loading: false });
    }
  }

  const Controls = () => (
    <div className="stats-controls">
      {u.role === "teacher" ? (
        <div className="stats-controls__group">
          <Btn kind={view === "mine" ? "primary" : ""} onClick={() => setState({ statsView: "mine" })}><Icon name="user" /> {t("mine")}</Btn>
          <Btn kind={view === "platform" ? "primary" : ""} onClick={() => setState({ statsView: "platform" })}><Icon name="chart" /> {t("platform")}</Btn>
        </div>
      ) : null}
      <div className="stats-controls__group">
        <Btn kind={mode === "14d" ? "primary" : ""} onClick={() => setState({ statsRangeMode: "14d" })}>{t("range14d")}</Btn>
        <Btn kind={mode === "365d" ? "primary" : ""} onClick={() => setState({ statsRangeMode: "365d" })}>{t("rangeYear")}</Btn>
      </div>
      <div className="stats-controls__group">
        {u.role === "teacher" && view === "mine" ? <Btn onClick={() => navigate("add")}><Icon name="plus" /> KPI</Btn> : null}
        {view === "platform" ? <Btn onClick={() => navigate("rating")}>{t("navRating")}</Btn> : null}
        {u.role === "admin" ? <Btn onClick={() => navigate("admin/approvals")}>{t("navApprovals")}</Btn> : null}
        <Btn onClick={refresh} disabled={st.loading}>{t("refresh")}</Btn>
      </div>
    </div>
  );

  // Trend: compare current half of range vs previous half
  const halfBins = Math.ceil(bins.length / 2);
  const recentBins = new Set(bins.slice(-halfBins).map(b => mode === "365d" ? b.key : b.ymd));
  const olderBins = new Set(bins.slice(0, halfBins).map(b => mode === "365d" ? b.key : b.ymd));

  const trendPct = (curr, prev) => {
    if (!prev) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };
  const TrendBadge = ({ curr, prev }) => {
    const pct = trendPct(curr, prev);
    const up = pct >= 0;
    return (
      <span style={{ fontSize: 11, fontWeight: 700, color: up ? "var(--green, #22c55e)" : "var(--red, #ef4444)", marginLeft: 6 }}>
        {up ? "▲" : "▼"} {Math.abs(pct)}%
      </span>
    );
  };

  function renderMine() {
    const allMy = (st.mySubmissions || []);
    const subs = allMy.filter(inRange);
    const approved = subs.filter(s => s.status === "approved");
    const pending = subs.filter(s => s.status === "pending");
    const rejected = subs.filter(s => s.status === "rejected");

    const totalPts = sum(approved, s => s.points);
    const bySeries = bins.map(b => seriesPoints(approved, b));

    // Trend calculation
    const recentPts = sum(approved.filter(s => {
      const k = mode === "365d" ? (s.eventDate || "").slice(0, 7) : s.eventDate;
      return recentBins.has(k);
    }), s => s.points);
    const olderPts = sum(approved.filter(s => {
      const k = mode === "365d" ? (s.eventDate || "").slice(0, 7) : s.eventDate;
      return olderBins.has(k);
    }), s => s.points);

    const typeMap = new Map();
    approved.forEach(s => {
      const key = s.typeName || "—";
      typeMap.set(key, (typeMap.get(key) || 0) + (Number(s.points) || 0));
    });
    const topType = Array.from(typeMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);
    const radar = topType.slice(0, 6);

    const sectionMap = new Map();
    approved.forEach(s => {
      const key = s.typeSection || t("other");
      sectionMap.set(key, (sectionMap.get(key) || 0) + (Number(s.points) || 0));
    });
    const topSections = Array.from(sectionMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const totalForPie = sum(topSections, x => x[1]) || 1;

    // For gauge: use all-time total from user doc
    const allTimeTotal = Number(u.totalPoints) || 0;
    const GOAL = 200;

    return (
      <div className="glass card">
        <div className="h1">{t("myStats")}</div>
        <p className="p">Диапазон: <b>{mode === "365d" ? t("rangeYear") : t("range14d")}</b>.</p>
        <Controls />

        <div className="sep"></div>

        <div className="grid3">
          <div className="kpi">
            <div>
              <div className="muted tiny">{t("approved")}</div>
              <b>{fmtPoints(totalPts)}</b>
              <TrendBadge curr={recentPts} prev={olderPts} />
            </div>
            <Pill kind="approved">{t("approved")}</Pill>
          </div>
          <div className="kpi">
            <div><div className="muted tiny">{t("pending")}</div><b>{pending.length}</b></div>
            <Pill kind="pending">{t("pending")}</Pill>
          </div>
          <div className="kpi">
            <div><div className="muted tiny">{t("rejected")}</div><b>{rejected.length}</b></div>
            <Pill kind="rejected">{t("rejected")}</Pill>
          </div>
        </div>

        <div className="sep"></div>

        <div className="grid2">
          <div className="glass card">
            <div className="h2">{t("pointsDynamic")}</div>
            <div className="sep"></div>
            <AreaLineChart values={bySeries} labels={bins.map(x => x.label)} />
          </div>

          <div className="glass card" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="h2" style={{ alignSelf: "flex-start" }}>{t("goalProgress")} ({GOAL} {t("pts")})</div>
            <div className="sep" style={{ alignSelf: "stretch" }}></div>
            <GaugeChart value={Math.min(allTimeTotal, GOAL)} max={GOAL} label={`${fmtPoints(allTimeTotal)} / ${GOAL}`} sublabel={t("total")} />
            <p className="help" style={{ marginTop: 8, textAlign: "center" }}>
              {allTimeTotal >= GOAL ? `🎉 ${t("goalReached")}` : `${fmtPoints(GOAL - allTimeTotal)} ${t("ptsRemaining")}`}
            </p>
          </div>

          <div className="glass card">
            <div className="h2">{t("statusSubs")}</div>
            <div className="sep"></div>
            <DonutChart
              segments={[
                { label: "approved", value: approved.length },
                { label: "pending", value: pending.length },
                { label: "rejected", value: rejected.length }
              ]}
              centerLabel={subs.length}
            />
          </div>

          <div className="glass card">
            <div className="h2">{t("byCategories")}</div>
            <div className="sep"></div>
            {topSections.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {topSections.map(([sec, pts]) => {
                  const pct = Math.round((pts / totalForPie) * 100);
                  return (
                    <div key={sec}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                        <span style={{ color: "var(--text)", fontWeight: 600 }}>{sec}</span>
                        <span style={{ color: "var(--accent)", fontWeight: 700 }}>{fmtPoints(pts)} балл ({pct}%)</span>
                      </div>
                      <div style={{ height: 7, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 4, transition: "width .5s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="p">{t("noData")}</p>}
          </div>
        </div>

        <div className="sep"></div>

        <div className="grid2">
          <div className="glass card">
            <div className="h2">{t("histogram")}</div>
            <div className="sep"></div>
            <HistogramChart data={approved.map(s => Number(s.points) || 0)} />
          </div>

          <div className="glass card">
            <div className="h2">{t("radarTopCat")}</div>
            <div className="sep"></div>
            <RadarChart labels={radar.map(x => x[0])} values={radar.map(x => x[1])} />
            {!radar.length ? <p className="p">{t("noKpiInRange")}</p> : null}
          </div>
        </div>

        <div className="sep"></div>

        <div className="glass card">
          <div className="h2">{t("topTypes")}</div>
          <div className="sep"></div>
          {topType.length ? (
            <div className="stats-toplist">
              {topType.slice(0, 12).map(([name, pts], i) => {
                const max = topType[0][1];
                return (
                  <div key={name} className="stats-toplist__row">
                    <span className="stats-toplist__num muted tiny">{i + 1}</span>
                    <div className="stats-toplist__bar-wrap">
                      <div className="stats-toplist__label tiny">{name}</div>
                      <div className="stats-toplist__bar">
                        <div className="stats-toplist__fill" style={{ width: `${Math.round((pts / max) * 100)}%` }} />
                      </div>
                    </div>
                    <span className="stats-toplist__pts"><b>{fmtPoints(pts)}</b></span>
                  </div>
                );
              })}
            </div>
          ) : <p className="p">{t("noData")}</p>}
        </div>
      </div>
    );
  }

  function renderPlatform() {
    const subs = (st.adminRecentSubs || []).filter(inRange);
    const approved = subs.filter(s => s.status === "approved");
    const pending = subs.filter(s => s.status === "pending");
    const rejected = subs.filter(s => s.status === "rejected");

    const teachers = (st.users || []).filter(x => (x.role || "teacher") !== "admin");

    const totalApprovedPts = sum(approved, s => s.points);
    const bySeries = bins.map(b => seriesPoints(approved, b));

    // Trend
    const recentPts = sum(approved.filter(s => {
      const k = mode === "365d" ? (s.eventDate || "").slice(0, 7) : s.eventDate;
      return recentBins.has(k);
    }), s => s.points);
    const olderPts = sum(approved.filter(s => {
      const k = mode === "365d" ? (s.eventDate || "").slice(0, 7) : s.eventDate;
      return olderBins.has(k);
    }), s => s.points);

    const pointsByTeacher = new Map();
    approved.forEach(s => {
      pointsByTeacher.set(s.uid, (pointsByTeacher.get(s.uid) || 0) + (Number(s.points) || 0));
    });
    const topTeachers = Array.from(pointsByTeacher.entries())
      .map(([uid, pts]) => ({ uid, pts, user: teachers.find(t => t.uid === uid) }))
      .sort((a, b) => b.pts - a.pts).slice(0, 10);

    const sectionMap = new Map();
    approved.forEach(s => {
      const key = s.typeSection || s.typeName || "—";
      sectionMap.set(key, (sectionMap.get(key) || 0) + (Number(s.points) || 0));
    });
    const topSections = Array.from(sectionMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 7);

    // Stacked bar: approved/pending/rejected by time bin
    const stackedData = bins.map(b => {
      const bKey = mode === "365d" ? b.key : b.ymd;
      const inBin = subs.filter(s => (mode === "365d" ? (s.eventDate || "").slice(0, 7) : s.eventDate) === bKey);
      return {
        label: b.label,
        segments: [
          { value: sum(inBin.filter(s => s.status === "approved"), s => s.points), color: "rgba(135,188,46,.8)" },
          { value: inBin.filter(s => s.status === "pending").length * 5, color: "rgba(251,191,36,.7)" },
          { value: inBin.filter(s => s.status === "rejected").length * 3, color: "rgba(239,68,68,.6)" }
        ]
      };
    });

    // heatmap (top teachers x bins)
    const hmTeachers = topTeachers.map(x => x.user).filter(Boolean).slice(0, 10);
    const maxCell = Math.max(1, ...hmTeachers.map(t => Math.max(0, ...bins.map(b => {
      const v = mode === "365d"
        ? sum(approved.filter(s => s.uid === t.uid && (s.eventDate || "").slice(0, 7) === b.key), s => s.points)
        : sum(approved.filter(s => s.uid === t.uid && s.eventDate === b.ymd), s => s.points);
      return v;
    }))));

    const cellStyle = (v) => {
      if (!v) return { background: "rgba(255,255,255,0.06)" };
      const t = Math.min(1, v / maxCell);
      if (t < 0.34) return { background: "rgba(255, 99, 132, 0.42)" };
      if (t < 0.67) return { background: "rgba(255, 200, 87, 0.48)" };
      return { background: "rgba(135, 188, 46, 0.45)" };
    };

    const hasAny = (st.users || []).length || (st.adminRecentSubs || []).length;

    return (
      <div className="glass card">
        <div className="h1">{t("platformStats")}</div>
        <p className="p">
          {t("overallView")} <b>{mode === "365d" ? t("rangeYear") : t("range14d")}</b>.
        </p>
        <Controls />

        <div className="sep"></div>

        {!hasAny ? (
          <p className="p">{t("generalNotLoaded")} <b>{t("refresh")}</b>.</p>
        ) : null}

        <div className="grid2">
          <div className="kpi"><div><div className="muted tiny">{t("teachers")}</div><b>{teachers.length}</b></div><Pill kind="approved">users</Pill></div>
          <div className="kpi"><div><div className="muted tiny">{t("subsInRange")}</div><b>{subs.length}</b></div><Pill kind="pending">range</Pill></div>
          <div className="kpi"><div><div className="muted tiny">{t("pending")}</div><b>{pending.length}</b></div><Pill kind="pending">{t("pending")}</Pill></div>
          <div className="kpi">
            <div>
              <div className="muted tiny">{t("approved")}</div>
              <b>{fmtPoints(totalApprovedPts)}</b>
              <TrendBadge curr={recentPts} prev={olderPts} />
            </div>
            <Pill kind="approved">points</Pill>
          </div>
        </div>

        <div className="sep"></div>

        <div className="grid2">
          <div className="glass card">
            <div className="h2">{t("pointsDynamic")}</div>
            <div className="sep"></div>
            <LineChart values={bySeries} labels={bins.map(x => x.label)} />
          </div>

          <div className="glass card">
            <div className="h2">{t("statusSubs")}</div>
            <div className="sep"></div>
            <DonutChart
              segments={[
                { label: "approved", value: approved.length },
                { label: "pending", value: pending.length },
                { label: "rejected", value: rejected.length }
              ]}
              centerLabel={subs.length}
            />
          </div>

          <div className="glass card">
            <div className="h2">{t("top10Teachers")}</div>
            <div className="sep"></div>
            {topTeachers.length ? (
              <BarChart
                values={topTeachers.map(x => x.pts)}
                labels={topTeachers.map(x => (x.user?.displayName || x.user?.email || "—").slice(0, 10) + "…")}
              />
            ) : <p className="p">{t("noData")}</p>}
          </div>

          <div className="glass card">
            <div className="h2">{t("radarSections")}</div>
            <div className="sep"></div>
            <RadarChart labels={topSections.map(x => x[0])} values={topSections.map(x => x[1])} />
            {!topSections.length ? <p className="p">{t("noData")}</p> : null}
          </div>
        </div>

        <div className="sep"></div>

        <div className="glass card">
          <div className="h2">{t("byPeriods")}: approved / pending / rejected</div>
          <p className="p muted" style={{ fontSize: 12 }}>
            <span style={{ color: "rgba(135,188,46,.9)" }}>▇</span> Мақұлданды балл &nbsp;
            <span style={{ color: "rgba(251,191,36,.9)" }}>▇</span> Күтуде ×5 &nbsp;
            <span style={{ color: "rgba(239,68,68,.9)" }}>▇</span> Қабылданбады ×3
          </p>
          <div className="sep"></div>
          <StackedBarChart data={stackedData} labels={bins.map(x => x.label)} />
        </div>

        <div className="sep"></div>

        <div className="glass card">
          <div className="h2">{t("heatmap")}</div>
          <p className="p">Тек <b>мақұлданған</b> балдар / Только <b>одобренные</b> баллы. Топ-10 по диапазону.</p>
          <div className="sep"></div>

          {!hmTeachers.length
            ? <p className="p">{t("noData")}</p>
            : (
              <div className="heatmap-wrap">
                <div className="heatmap-scroll">
                  <table className="table heatmap-table">
                    <thead>
                      <tr>
                        <th className="heatmap-name-col">{t("teacher")}</th>
                        {bins.map(b => <th key={mode === "365d" ? b.key : b.ymd} className="heatmap-bin-col">{b.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {hmTeachers.map(t => (
                        <tr key={t.uid}>
                          <td className="tiny heatmap-name-col"><b>{(t.displayName || t.email || "—").slice(0, 14)}</b></td>
                          {bins.map(b => {
                            const v = mode === "365d"
                              ? sum(approved.filter(s => s.uid === t.uid && (s.eventDate || "").slice(0, 7) === b.key), s => s.points)
                              : sum(approved.filter(s => s.uid === t.uid && s.eventDate === b.ymd), s => s.points);
                            return (
                              <td key={mode === "365d" ? b.key : b.ymd} className="tiny" style={{ ...cellStyle(v), textAlign: "center", padding: "6px 4px", fontSize: 11 }} title={`${b.label}: ${v}`}>
                                {v ? fmtPoints(v) : ""}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="help" style={{ marginTop: 8 }}>← {t("scrollH")}</p>
              </div>
            )
          }
        </div>
      </div>
    );
  }

  if (u.role === "teacher") {
    return view === "platform" ? renderPlatform() : renderMine();
  }
  return renderPlatform();
}




function PageAdminApprovals() {
  const st = useStore();
  const u = st.userDoc;
  if (!u) return <Guard />;
  if (u.role !== "admin") return <Guard />;

  const pending = st.pendingSubmissions;
  const usersMap = new Map(st.users.map(x => [x.uid, x]));

  async function decide(id, action) {
    try {
      setState({ loading: true });
      if (action === "approve") await approveSubmission(id, u.uid);
      else await rejectSubmission(id, u.uid);

      toast(action === "approve" ? t("approvedToast") : t("rejectedToast"), "ok");

      const [p, users] = await Promise.all([fetchPendingSubmissions(), fetchUsersAll()]);
      setState({ pendingSubmissions: p, users });
    } catch (e) {
      console.error(e);
      toast(e?.message || t("error"), "error");
    } finally { setState({ loading: false }); }
  }

  return (
    <div className="glass card">
      <div className="h1">{t("approvalsTitle")}</div>
      <p className="p">{t("approvalsDesc")}</p>
      <div className="sep"></div>

      {!pending.length && <p className="p muted" style={{ padding: "12px 0" }}>{t("noSubsToReview")}</p>}
      <div className="mobile-cards">
        {pending.map(s => {
          const tu = usersMap.get(s.uid);
          return (
            <div key={s.id} className="mobile-card glass">
              <div className="mobile-card__row">
                <span className="mobile-card__label">{t("teacher")}</span>
                <span className="mobile-card__val"><b>{tu?.displayName || "—"}</b><div className="muted tiny">{tu?.email || s.uid}</div></span>
              </div>
              <div className="mobile-card__row">
                <span className="mobile-card__label">{t("typeAndTitle")}</span>
                <span className="mobile-card__val"><b>{s.typeName}</b><div className="muted tiny">{s.title}</div>{s.description ? <div className="muted tiny">{s.description}</div> : null}</span>
              </div>
              <div className="mobile-card__row">
                <span className="mobile-card__label">{t("dateAndPts")}</span>
                <span className="mobile-card__val">{s.eventDate} · <b>{fmtPoints(s.points)} pts</b></span>
              </div>
              {(s.evidenceLink || s.evidenceFileUrl) && (
                <div className="mobile-card__row">
                  <span className="mobile-card__label">{t("evidence")}</span>
                  <span className="mobile-card__val" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {s.evidenceLink ? <a className="btn" href={s.evidenceLink} target="_blank" rel="noreferrer">{t("link")}</a> : null}
                    {s.evidenceFileUrl ? <a className="btn" href={s.evidenceFileUrl} target="_blank" rel="noreferrer">{t("file")}</a> : null}
                  </span>
                </div>
              )}
              <div className="mobile-card__actions">
                <Btn kind="ok" onClick={() => decide(s.id, "approve")} disabled={st.loading}><Icon name="check" /> {t("approve")}</Btn>
                <Btn kind="danger" onClick={() => decide(s.id, "reject")} disabled={st.loading}><Icon name="x" /> {t("reject")}</Btn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PageAdminRequests() {
  const st = useStore();
  const u = st.userDoc;
  const [deltas, setDeltas] = useState({}); // hook before early return

  if (!u) return <Guard />;
  if (u.role !== "admin") return <Guard />;

  const pending = st.pendingRequests || [];
  const usersMap = new Map((st.users || []).map(x => [x.uid, x]));

  const getDelta = (id) => {
    const v = deltas[id];
    return (v === 0 || v) ? Number(v) : 0;
  };
  const setDelta = (id, v) => setDeltas(m => ({ ...m, [id]: v }));

  const compPreview = (r) => {
    const days = Number(r.days) || dateRangeDays(r.dateFrom, r.dateTo);
    const mode = r.compMode || (REQUEST_KINDS.find(x => x.key === r.kind)?.compMode) || "none";
    return mode === "earn" ? days : mode === "use" ? -days : 0;
  };
  const signNum = (n) => {
    const x = Number(n) || 0;
    return x > 0 ? `+${x}` : String(x);
  };

  async function decide(id, action) {
    try {
      setState({ loading: true });
      const delta = getDelta(id);
      await decideTeacherRequest(id, u.uid, action, delta);
      toast(action === "approve" ? t("approvedToast") : t("rejectedToast"), "ok");
      const [pendReq, recentReq, users] = await Promise.all([
        fetchPendingRequests(),
        fetchAdminRecentRequests(),
        fetchUsersAll()
      ]);
      setState({ pendingRequests: pendReq, adminRecentRequests: recentReq, users });
    } catch (e) {
      console.error(e);
      toast(e?.message || t("error"), "error");
    } finally { setState({ loading: false }); }
  }

  const recent = (st.adminRecentRequests || []).filter(r => r.status !== "pending").slice(0, 30);

  return (
    <div className="grid2">
      <div className="glass card">
        <div className="h1">{t("adminReqTitle")}</div>
        <p className="p">{t("adminReqDesc")}</p>
        <div className="sep"></div>

        {!pending.length && <p className="p muted" style={{ padding: "12px 0" }}>{t("noReqToReview")}</p>}
        <div className="mobile-cards">
          {pending.map(r => {
            const tu = usersMap.get(r.uid);
            const delta = getDelta(r.id);
            const cd = compPreview(r);
            return (
              <div key={r.id} className="mobile-card glass">
                <div className="mobile-card__row">
                  <span className="mobile-card__label">{t("teacher")}</span>
                  <span className="mobile-card__val"><b>{tu?.displayName || "—"}</b><div className="muted tiny">{tu?.email || r.uid}</div></span>
                </div>
                <div className="mobile-card__row">
                  <span className="mobile-card__label">{t("typeAndPeriod")}</span>
                  <span className="mobile-card__val"><b>{r.kindLabel || requestKindLabel(r.kind)}</b><div className="muted tiny">{r.dateFrom}{r.dateTo && r.dateTo !== r.dateFrom ? ` → ${r.dateTo}` : ""} · дней: {Number(r.days) || dateRangeDays(r.dateFrom, r.dateTo)}</div>{r.note ? <div className="muted tiny">{r.note}</div> : null}</span>
                </div>
                <div className="mobile-card__row">
                  <span className="mobile-card__label">Баланс отгулов / Δ</span>
                  <span className="mobile-card__val"><b>{fmtPoints(tu?.compDays || 0)}</b> {t("compDaysShort")} · {t("compDeltaLabel")} <b>{signNum(cd)}</b></span>
                </div>
                <div className="mobile-card__row">
                  <span className="mobile-card__label">{t("pointsDelta")}</span>
                  <span className="mobile-card__val" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <Input type="number" value={delta} onChange={(e) => setDelta(r.id, e.target.value)} style={{ maxWidth: 100 }} />
                    <Btn type="button" onClick={() => setDelta(r.id, -2)}>-2</Btn>
                    <Btn type="button" onClick={() => setDelta(r.id, +2)}>+2</Btn>
                  </span>
                </div>
                <div className="mobile-card__actions">
                  <Btn kind="ok" onClick={() => decide(r.id, "approve")} disabled={st.loading}><Icon name="check" /> {t("ok")}</Btn>
                  <Btn kind="danger" onClick={() => decide(r.id, "reject")} disabled={st.loading}><Icon name="x" /> {t("no")}</Btn>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass card">
        <div className="h2">{t("recentDecisions")}</div>
        <div className="sep"></div>
        <DataCards
          emptyText={t("noHistory")}
          columns={[
            { key: "teacher", label: t("teacher"), render: r => { const tu = usersMap.get(r.uid); return <><b>{tu?.displayName || "—"}</b><div className="muted tiny">{tu?.email || r.uid}</div></>; } },
            { key: "kind", label: t("type"), render: r => r.kindLabel || requestKindLabel(r.kind) },
            { key: "period", label: t("period"), render: r => `${r.dateFrom}${r.dateTo && r.dateTo !== r.dateFrom ? ` → ${r.dateTo}` : ""}` },
            { key: "status", label: t("status"), render: r => <Pill kind={r.status}>{r.status}</Pill> },
            { key: "pts", label: t("pointsDelta"), render: r => <b>{signNum(r.pointsDelta || 0)}</b> },
            { key: "cd", label: t("compDaysDeltaCol"), render: r => <b>{signNum(r.compDaysDelta || 0)}</b> }
          ]}
          rows={recent.map(r => ({ ...r, __key: r.id }))}
        />

        <div className="sep"></div>
        <div className="help">{t("compRules")}</div>
      </div>
    </div>
  );
}

/** ---------- PageDocuments (teacher inbox + my documents) ---------- */
function PageDocuments() {
  const st = useStore();
  // All hooks before any conditional returns
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signingDoc, setSigningDoc] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("sign"); // "sign" | "my"

  // My documents upload form state
  const [docTitle, setDocTitle] = useState("");
  const [docDesc, setDocDesc] = useState("");
  const [docFile, setDocFile] = useState(null);

  const u = st.userDoc;
  if (!u) return <Guard />;
  if (!canAccess("documents", u)) return <Guard />;

  const docs = st.myDocuments || [];
  const myTDocs = st.myTeacherDocs || [];
  const unsignedCount = docs.filter(d => d.status !== "signed").length;

  const getPos = (e) => {
    const c = canvasRef.current;
    if (!c) return [0, 0];
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    const tch = e.touches ? e.touches[0] : e;
    return [(tch.clientX - rect.left) * scaleX, (tch.clientY - rect.top) * scaleY];
  };
  const onDown = (e) => {
    e.preventDefault();
    setDrawing(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const [x, y] = getPos(e);
    ctx.beginPath(); ctx.moveTo(x, y);
  };
  const onMove = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const [x, y] = getPos(e);
    ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "#ffffff"; ctx.lineTo(x, y); ctx.stroke();
    setSigned(true);
  };
  const onUp = () => setDrawing(false);
  const clearSig = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setSigned(false);
  };

  const openDoc = async (d) => {
    setViewDoc(d);
    if (d.status === "sent") {
      try { await markDocumentViewed(d.id); } catch (e) { console.error(e); }
    }
  };

  const submitSign = async () => {
    if (!signed) { toast(t("putSignature"), "error"); return; }
    try {
      setSaving(true);
      const c = canvasRef.current;
      const blob = await new Promise(res => c.toBlob(res, "image/png"));
      const sigFile = new File([blob], "sig.png", { type: "image/png" });
      await signDocument(signingDoc.id, sigFile);
      const fresh = await fetchDocumentsForTeacher(u.uid);
      setState({ myDocuments: fresh });
      toast(t("docSigned"), "ok");
      setSigningDoc(null);
      setViewDoc(null);
    } catch (e) {
      toast(e?.message || t("error"), "error");
    } finally {
      setSaving(false);
    }
  };

  // ---- My documents upload ----
  const submitMyDoc = async (e) => {
    e.preventDefault();
    if (!safeText(docTitle)) { toast(t("enterDocName"), "error"); return; }
    if (!docFile) { toast(t("attachFile"), "error"); return; }
    try {
      setState({ loading: true });
      await createMyTeacherDoc({ uid: u.uid, title: docTitle, description: docDesc, file: docFile, fileName: docFile.name });
      toast(t("docAdded"), "ok");
      const fresh = await fetchMyTeacherDocs(u.uid);
      setState({ myTeacherDocs: fresh });
      setDocTitle(""); setDocDesc(""); setDocFile(null);
    } catch (err) {
      console.error(err);
      toast(err?.message || t("error"), "error");
    } finally { setState({ loading: false }); }
  };

  const refreshMyDocs = async () => {
    try {
      setState({ loading: true });
      const fresh = await fetchMyTeacherDocs(u.uid);
      setState({ myTeacherDocs: fresh });
      toast(t("updated"), "ok");
    } catch (e) {
      toast(e?.message || t("error"), "error");
    } finally { setState({ loading: false }); }
  };

  const statusLabel = (s) => s === "signed" ? t("statusSigned") : s === "viewed" ? t("statusViewed") : t("statusNew");
  const statusColor = (s) => s === "signed" ? "approved" : s === "viewed" ? "pending" : "rejected";

  return (
    <>
      {/* View/Sign document modal */}
      {(viewDoc || signingDoc) && createPortal(
        <div className="tp-overlay" onClick={() => { setViewDoc(null); setSigningDoc(null); setSigned(false); }}>
          <div className="tp-card" onClick={e => e.stopPropagation()} style={{
            width: signingDoc && !signingDoc.signatureUrl ? "1100px" : "700px",
            maxWidth: "95vw", maxHeight: "95vh", overflowY: "auto"
          }}>
            <button className="tp-close" onClick={() => { setViewDoc(null); setSigningDoc(null); setSigned(false); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
            {(() => {
              const d = signingDoc || viewDoc;
              const dateStr = d.created ? new Date(d.created).toLocaleDateString("ru-RU") : ymd();
              const needsSign = signingDoc && !signingDoc.signatureUrl;
              return (
                <div style={needsSign ? { display: "flex", gap: 24, flexWrap: "wrap" } : undefined}>
                  {/* Document preview (left side) */}
                  <div style={needsSign ? { flex: "1 1 380px", minWidth: 0 } : undefined}>
                    <div className="doc-preview">
                      <div className="doc-preview__regnum">No. {(d.id || "").slice(-6).toUpperCase() || "——"}</div>
                      <div className="doc-preview__header">
                        <img src="/logo-nis.png" alt="NIS" className="doc-preview__logo" />
                        <div className="doc-preview__org">{t("nisOrg")}</div>
                      </div>
                      <div className="doc-preview__title">{d.title}</div>
                      <div className="doc-preview__body">
                        <div className="doc-preview__field">
                          <span className="doc-preview__field-label">{t("recipient")}:</span>
                          <span className="doc-preview__field-value">{d.toName || d.toEmail || u.displayName || u.email}</span>
                        </div>
                        {d.body && (
                          <div className="doc-preview__field">
                            <span className="doc-preview__field-label">{t("docDescLabel")}:</span>
                            <span className="doc-preview__field-value" style={{ whiteSpace: "pre-wrap" }}>{d.body}</span>
                          </div>
                        )}
                        <div className="doc-preview__field">
                          <span className="doc-preview__field-label">{t("date")}:</span>
                          <span className="doc-preview__field-value">{dateStr}</span>
                        </div>
                        <div className="doc-preview__field">
                          <span className="doc-preview__field-label">{t("statusLabel")}:</span>
                          <span className="doc-preview__field-value"><Pill kind={statusColor(d.status)}>{statusLabel(d.status)}</Pill></span>
                        </div>
                        {d.requireSignature && (
                          <div className="doc-preview__field">
                            <span className="doc-preview__field-label">{t("needsSignature")}:</span>
                            <span className="doc-preview__field-value">{d.status === "signed" ? t("statusSigned") : t("reqPending")}</span>
                          </div>
                        )}
                      </div>
                      <div className="doc-preview__signature">
                        <div className="doc-preview__sig-block">
                          {d.signatureUrl ? <img src={d.signatureUrl} alt="Подпись" className="doc-preview__sig-img" /> : <div className="doc-preview__sig-line" />}
                          <div className="doc-preview__sig-label">{t("employeeSign")}</div>
                          <div className="doc-preview__sig-name">{u.displayName || ""}</div>
                        </div>
                        <div className="doc-preview__sig-block">
                          {d.adminSignatureUrl ? <img src={d.adminSignatureUrl} alt="Admin" className="doc-preview__sig-img" /> : <div className="doc-preview__sig-line" />}
                          <div className="doc-preview__sig-label">{t("directorSign")}</div>
                        </div>
                      </div>
                      <div className="doc-preview__date">{t("date")}: {dateStr}</div>
                      {d.status === "signed" && (
                        <div className="doc-preview__stamp">
                          <img src="/logo-nis.png" alt="" style={{ width: 30, height: 30, objectFit: "contain", opacity: .4, marginBottom: 4 }} />
                          <div>{t("statusSigned")}</div>
                        </div>
                      )}
                      {!needsSign && (
                        <div style={{ marginTop: 20, textAlign: "center", display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }} className="doc-preview__actions">
                          <Btn kind="primary" onClick={() => window.print()}><Icon name="file" /> {t("preview")}</Btn>
                          {d.requireSignature && d.status !== "signed" && (
                            <Btn kind="primary" onClick={() => { setSigningDoc(d); setViewDoc(null); setSigned(false); clearSig(); }}>{t("signDoc")}</Btn>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Signature pad (right side) */}
                  {needsSign && (
                    <div style={{ flex: "1 1 280px", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <div className="glass card" style={{ padding: 20 }}>
                        <div className="h2" style={{ marginBottom: 12 }}>{t("putSignature")}</div>
                        <canvas
                          ref={canvasRef}
                          width={800} height={200}
                          className="signature-pad"
                          style={{ width: "100%", height: 140, display: "block", cursor: "crosshair", marginBottom: 12, borderRadius: 10, border: "2px dashed var(--border)" }}
                          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
                          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
                        />
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Btn onClick={clearSig}>{t("clear")}</Btn>
                          <Btn kind="primary" onClick={submitSign} disabled={saving || !signed}>
                            {saving ? t("loading") : t("signBtn")}
                          </Btn>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      <div className="page-wrap">
        {/* Header */}
        <div className="glass card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <img src="/logo-nis.png" alt="NIS" style={{ width: 40, height: 40, objectFit: "contain" }} />
            <div>
              <div className="h1">{t("documentsTitle")}</div>
              <div className="muted" style={{ fontSize: 13 }}>{t("documentsDesc")}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="prof-tabs" style={{ marginBottom: 16 }}>
          <button className={`prof-tab${activeTab === "sign" ? " prof-tab--active" : ""}`} onClick={() => setActiveTab("sign")}>
            <Icon name="file" /> {t("tabToSign")} {unsignedCount > 0 && <span className="at-tab-count">{unsignedCount}</span>}
          </button>
          <button className={`prof-tab${activeTab === "my" ? " prof-tab--active" : ""}`} onClick={() => setActiveTab("my")}>
            <Icon name="plus" /> {t("tabMyDocs")} {myTDocs.length > 0 && <span className="at-tab-count">{myTDocs.length}</span>}
          </button>
        </div>

        {/* Tab: Documents to sign (from admin) */}
        {activeTab === "sign" && (
          <>
            {docs.length === 0 ? (
              <div className="glass card" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
                {t("noDocuments")}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {docs.map(d => {
                  const dateStr = d.created ? new Date(d.created).toLocaleDateString("ru-RU") : "—";
                  return (
                    <div key={d.id} className="glass card" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.title}</div>
                        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.body}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <Pill kind={statusColor(d.status)}>{statusLabel(d.status)}</Pill>
                          {d.requireSignature && d.status !== "signed" && <Pill kind="pending">{t("needsSignature")}</Pill>}
                          <span className="tiny muted">{dateStr}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <Btn onClick={() => openDoc(d)}>{t("view")}</Btn>
                        {d.requireSignature && d.status !== "signed" && (
                          <Btn kind="primary" onClick={() => { setSigningDoc(d); setSigned(false); clearSig(); }}>{t("signDoc")}</Btn>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Tab: My documents (teacher uploads) */}
        {activeTab === "my" && (
          <div className="grid2">
            <div className="glass card">
              <div className="h2">{t("myDocsTitle")}</div>
              <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{t("myDocsDesc")}</div>
              <div className="sep"></div>

              <form onSubmit={submitMyDoc}>
                <div className="label">{t("docNameLabel")}</div>
                <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder={t("docNamePlaceholder")} required />

                <div className="label">{t("docDescLabel")}</div>
                <Textarea value={docDesc} onChange={(e) => setDocDesc(e.target.value)} placeholder={t("docDescPlaceholder")} />

                <div className="label">{t("docFileLabel")}</div>
                <Input type="file" accept=".pdf,.doc,.docx,image/png,image/jpeg" onChange={(e) => setDocFile(e.target.files?.[0] || null)} required />

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  <Btn kind="primary" type="submit" disabled={st.loading}>{t("uploadBtn")}</Btn>
                  <Btn type="button" onClick={refreshMyDocs} disabled={st.loading}>{t("refresh")}</Btn>
                </div>
              </form>
            </div>

            <div className="glass card">
              <div className="h2">{t("uploadedDocs")}</div>
              <div className="sep"></div>

              {myTDocs.length === 0 && <p className="muted">{t("noMyDocs")}</p>}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {myTDocs.map(d => {
                  const dateStr = d.created ? new Date(d.created).toLocaleDateString("ru-RU") : "—";
                  return (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700 }}>{d.title}</div>
                        {d.description && <div className="muted tiny">{d.description}</div>}
                        <div className="muted tiny">{d.fileName || "файл"} · {dateStr}</div>
                      </div>
                      {d.fileUrl && <a className="btn" href={d.fileUrl} target="_blank" rel="noreferrer">{t("openDoc")}</a>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** ---------- Staff positions for admin documents & users ---------- */
const DEFAULT_POSITION_LIST = [
  // --- Административно-управленческий персонал ---
  { position: "Директор", group: "admin" },
  { position: "Заместитель директора, эксперт", group: "admin" },
  { position: "Заместитель директора", group: "admin" },
  { position: "Заместитель директора, модератор", group: "admin" },
  { position: "Заведующий лабораторией, модератор", group: "admin" },
  { position: "Главный бухгалтер", group: "admin" },
  { position: "Бухгалтер", group: "admin" },
  { position: "Экономист", group: "admin" },
  { position: "Юрист", group: "admin" },
  { position: "Менеджер по персоналу (HR менеджер)", group: "admin" },
  { position: "Менеджер по связям с общественностью (PR менеджер)", group: "admin" },
  { position: "Специалист по закупкам", group: "admin" },
  { position: "Инженер по безопасности и охране труда", group: "admin" },
  { position: "Делопроизводитель-секретарь", group: "admin" },
  // --- Основной производственный персонал ---
  { position: "Учитель-эксперт казахского языка и литературы", group: "teacher" },
  { position: "Учитель-модератор казахского языка и литературы", group: "teacher" },
  { position: "Учитель казахского языка", group: "teacher" },
  { position: "Учитель-эксперт русского языка и литературы", group: "teacher" },
  { position: "Учитель-модератор русского языка и литературы", group: "teacher" },
  { position: "Учитель русского языка и литературы", group: "teacher" },
  { position: "Учитель-эксперт английского языка", group: "teacher" },
  { position: "Учитель-модератор английского языка", group: "teacher" },
  { position: "Учитель английского языка", group: "teacher" },
  { position: "Учитель-стажёр английского языка", group: "teacher" },
  { position: "Учитель-эксперт биологии", group: "teacher" },
  { position: "Учитель-модератор биологии", group: "teacher" },
  { position: "Учитель-эксперт физики", group: "teacher" },
  { position: "Учитель-модератор физики", group: "teacher" },
  { position: "Учитель физики", group: "teacher" },
  { position: "Учитель-эксперт химии", group: "teacher" },
  { position: "Учитель-модератор химии", group: "teacher" },
  { position: "Учитель химии", group: "teacher" },
  { position: "Учитель-эксперт математики", group: "teacher" },
  { position: "Учитель-модератор математики", group: "teacher" },
  { position: "Учитель математики", group: "teacher" },
  { position: "Учитель-эксперт информатики", group: "teacher" },
  { position: "Учитель-модератор информатики", group: "teacher" },
  { position: "Учитель информатики", group: "teacher" },
  { position: "Учитель-стажер информатики", group: "teacher" },
  { position: "Учитель-эксперт географии", group: "teacher" },
  { position: "Учитель-модератор географии", group: "teacher" },
  { position: "Учитель географии", group: "teacher" },
  { position: "Учитель-эксперт истории", group: "teacher" },
  { position: "Учитель-модератор истории", group: "teacher" },
  { position: "Учитель истории", group: "teacher" },
  { position: "Учитель-эксперт глобальных перспектив и проектных работ, экономики", group: "teacher" },
  { position: "Учитель-модератор физической культуры", group: "teacher" },
  { position: "Учитель физической культуры", group: "teacher" },
  { position: "Преподаватель-организатор по НВП", group: "teacher" },
  { position: "Учитель-эксперт музыки", group: "teacher" },
  { position: "Учитель-эксперт изобразительного искусства", group: "teacher" },
  { position: "Учитель-модератор изобразительного искусства", group: "teacher" },
  { position: "Учитель изобразительного искусства", group: "teacher" },
  // --- Не основной производственный персонал ---
  { position: "Методист", group: "support" },
  { position: "Консультант по профессиональной ориентации", group: "support" },
  { position: "Старший педагог-библиотекарь", group: "support" },
  { position: "Педагог-библиотекарь", group: "support" },
  { position: "Старший инженер", group: "support" },
  { position: "Инженер по специальному оборудованию", group: "support" },
  { position: "Инженер по компьютерному оборудованию", group: "support" },
  { position: "Педагог-психолог", group: "support" },
  { position: "Педагог-организатор-куратор", group: "support" },
  { position: "Педагог дополнительного образования", group: "support" },
  { position: "Лаборант (химия)", group: "support" },
  { position: "Лаборант (биология)", group: "support" },
  { position: "Лаборант (физика)", group: "support" },
];
const POSITION_GROUP_MAP = {};
DEFAULT_POSITION_LIST.forEach(p => { POSITION_GROUP_MAP[p.position.toLowerCase()] = p.group; });

const STAFF_GROUPS = [
  { key: "admin", label: "Административно-управленческий персонал" },
  { key: "teacher", label: "Основной производственный персонал" },
  { key: "support", label: "Не основной производственный персонал" },
];
function getStaffGroup(email, position) {
  if (position) {
    const g = POSITION_GROUP_MAP[position.toLowerCase()];
    if (g) return g;
  }
  return "teacher";
}
function getStaffPosition(email, position) {
  return position || "";
}

/** ---------- PageAdminDocuments ---------- */
function PageAdminDocuments() {
  const st = useStore();
  // All hooks before any conditional returns
  const [toUids, setToUids] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [requireSig, setRequireSig] = useState(false);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState("send");
  const [filterUid, setFilterUid] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [recipientQ, setRecipientQ] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const u = st.userDoc;
  if (!u) return <Guard />;
  if (u.role !== "admin") return <Guard />;

  const allUsers = (st.users || []).filter(x => x.uid !== u.uid);
  const users = roleFilter ? allUsers.filter(x => getStaffGroup(x.email, x.position) === roleFilter) : allUsers;
  const groupedUsers = STAFF_GROUPS.map(g => ({
    ...g,
    users: allUsers.filter(x => getStaffGroup(x.email, x.position) === g.key)
  })).filter(g => g.users.length > 0);
  const docs = st.allDocuments || [];

  const selectedUsers = allUsers.filter(x => toUids.includes(x.uid));
  const toggleUid = (uid) => setToUids(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);

  const send = async () => {
    if (toUids.length === 0 || !title.trim() || !body.trim()) {
      toast(t("fillFields"), "error");
      return;
    }
    try {
      setSending(true);
      for (const uid of toUids) {
        const rec = allUsers.find(x => x.uid === uid);
        await createDocument({
          fromUid: u.uid,
          toUid: uid,
          toEmail: rec?.email || "",
          toName: rec?.displayName || rec?.email || "",
          title: title.trim(),
          body: body.trim(),
          requireSignature: requireSig
        });
      }
      const fresh = await fetchAllDocuments();
      setState({ allDocuments: fresh });
      toast(t("docSent") + ` (${toUids.length})`, "ok");
      setToUids([]); setTitle(""); setBody(""); setRequireSig(false);
    } catch (e) {
      toast(e?.message || t("error"), "error");
    } finally {
      setSending(false);
    }
  };

  const filteredDocs = filterUid ? docs.filter(d => d.toUid === filterUid) : docs;
  const statusLabel = (s) => s === "signed" ? t("statusSigned") : s === "viewed" ? t("statusViewed") : t("sendTab");
  const statusColor = (s) => s === "signed" ? "approved" : s === "viewed" ? "pending" : "rejected";

  return (
    <div className="page-wrap">
      <div className="glass card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <img src="/logo-nis.png" alt="NIS" style={{ width: 40, height: 40, objectFit: "contain" }} />
          <div style={{ flex: 1 }}>
            <div className="h1">{t("adminDocTitle")}</div>
            <div className="muted" style={{ fontSize: 13 }}>{t("adminDocDesc")}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Btn kind={tab === "send" ? "primary" : "ghost"} onClick={() => setTab("send")}>{t("sendTab")}</Btn>
          <Btn kind={tab === "list" ? "primary" : "ghost"} onClick={() => setTab("list")}>{t("listTab")} ({docs.length})</Btn>
        </div>
      </div>

      {tab === "send" && (() => {
        const rq = recipientQ.trim().toLowerCase();
        const recipientList = (roleFilter ? users : allUsers).filter(x => {
          if (!rq) return true;
          const hay = `${x.displayName || ""} ${x.email || ""} ${x.position || ""}`.toLowerCase();
          return hay.includes(rq);
        });
        const recipientGrouped = STAFF_GROUPS.map(g => ({
          ...g,
          users: recipientList.filter(x => getStaffGroup(x.email, x.position) === g.key)
        })).filter(g => g.users.length > 0);

        return (
          <div className="admin-users-layout">
            {/* LEFT: Recipient picker */}
            <div className="admin-users-left">
              <div className="glass card" style={{ position: "sticky", top: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(135,188,46,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="user" />
                  </div>
                  <div className="h2" style={{ margin: 0, flex: 1 }}>{t("recipient")}</div>
                </div>

                {/* Selected users chips */}
                {selectedUsers.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {selectedUsers.map(su => (
                      <div key={su.uid} style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(135,188,46,.12)", borderRadius: 20, padding: "3px 10px 3px 6px", fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
                        {su.avatarUrl ? (
                          <img src={su.avatarUrl} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(135,188,46,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800 }}>
                            {(su.displayName || su.email || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{su.displayName || su.email}</span>
                        <button className="iconbtn" onClick={() => toggleUid(su.uid)} style={{ width: 16, height: 16, fontSize: 10, padding: 0 }}><Icon name="x" /></button>
                      </div>
                    ))}
                    <button className="iconbtn" onClick={() => setToUids([])} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, color: "var(--muted)" }}>{t("clearAll")}</button>
                  </div>
                ) : (
                  <div className="admin-users-placeholder">
                    <div className="muted" style={{ fontSize: 13 }}>{t("selectRecipients")}</div>
                  </div>
                )}

                {/* Search */}
                <input className="input" style={{ width: "100%", marginBottom: 8 }} placeholder={t("searchPlaceholder")} value={recipientQ} onChange={e => setRecipientQ(e.target.value)} />

                {/* Group filter pills */}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                  <Btn kind={roleFilter === "" ? "primary" : "ghost"} onClick={() => { setRoleFilter(""); }} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8 }}>{t("all")}</Btn>
                  {STAFF_GROUPS.map(g => {
                    const cnt = allUsers.filter(x => getStaffGroup(x.email, x.position) === g.key).length;
                    return cnt > 0 ? <Btn key={g.key} kind={roleFilter === g.key ? "primary" : "ghost"} onClick={() => { setRoleFilter(g.key); }} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8 }}>{g.label} ({cnt})</Btn> : null;
                  })}
                </div>

                {/* Scrollable user list */}
                <div style={{ maxHeight: "calc(100vh - 480px)", overflowY: "auto", margin: "0 -4px", padding: "0 4px" }}>
                  {recipientGrouped.length === 0 && <div className="muted" style={{ textAlign: "center", padding: 12, fontSize: 13 }}>{t("noResults")}</div>}
                  {recipientGrouped.map(g => {
                    const grpColor = g.key === "admin" ? "#6366f1" : g.key === "support" ? "#06b6d4" : "var(--accent)";
                    const isOpen = !collapsedGroups[g.key];
                    const grpUids = g.users.map(x => x.uid);
                    const allSel = grpUids.every(id => toUids.includes(id));
                    const selCount = grpUids.filter(id => toUids.includes(id)).length;
                    return (
                      <div key={g.key} style={{ marginBottom: 4 }}>
                        <div className="pos-group-label" style={{ color: grpColor, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}
                          onClick={() => setCollapsedGroups(prev => ({ ...prev, [g.key]: !prev[g.key] }))}>
                          <span style={{ transition: "transform .2s", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", display: "inline-flex" }}>
                            <Icon name="chevron" />
                          </span>
                          <span style={{ flex: 1 }}>{g.label} ({g.users.length}){selCount > 0 && <span style={{ fontSize: 11, opacity: .7 }}> — {selCount} {t("selected") || "selected"}</span>}</span>
                          <button className="iconbtn" style={{ fontSize: 10, padding: "1px 6px", borderRadius: 6, color: grpColor, opacity: .7 }}
                            onClick={(e) => { e.stopPropagation(); setToUids(prev => allSel ? prev.filter(id => !grpUids.includes(id)) : [...new Set([...prev, ...grpUids])]); }}>
                            {allSel ? t("deselectAll") : t("selectAll")}
                          </button>
                        </div>
                        <div style={{ overflow: "hidden", maxHeight: isOpen ? g.users.length * 60 : 0, opacity: isOpen ? 1 : 0, transition: "max-height .25s ease, opacity .2s ease" }}>
                          {g.users.map(x => {
                            const isSel = toUids.includes(x.uid);
                            const initials = (x.displayName || x.email || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                            return (
                              <div key={x.uid} className={`pos-item${isSel ? " active" : ""}`} onClick={() => toggleUid(x.uid)} style={{ padding: "6px 10px", gap: 8 }}>
                                {x.avatarUrl ? (
                                  <img src={x.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                                ) : (
                                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${grpColor}18`, color: grpColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{initials}</div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: isSel ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.displayName || x.email}</div>
                                  {x.position && <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.position}</div>}
                                </div>
                                <div style={{ width: 18, height: 18, borderRadius: 4, border: isSel ? "none" : "2px solid var(--border)", background: isSel ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s" }}>
                                  {isSel && <Icon name="check" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* MIDDLE: Document form */}
            <div className="admin-docs-middle">
              <div className="glass card">
                <div className="h2" style={{ marginBottom: 16 }}>{t("newDocument")}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label className="label">{t("subjectLabel2")}</label>
                    <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder={t("subjectPlaceholder")} />
                  </div>
                  <div>
                    <label className="label">{t("docText")}</label>
                    <textarea className="input" rows={8} value={body} onChange={e => setBody(e.target.value)} placeholder={t("docTextPlaceholder")} style={{ resize: "vertical" }} />
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
                    <input type="checkbox" checked={requireSig} onChange={e => setRequireSig(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />
                    <span>{t("requireSignature")}</span>
                  </label>
                  <div>
                    <Btn kind="primary" onClick={send} disabled={sending || toUids.length === 0}>
                      {sending ? t("sending") : toUids.length > 1 ? `${t("sendDocument")} (${toUids.length})` : t("sendDocument")}
                    </Btn>
                    {toUids.length === 0 && <span className="muted" style={{ fontSize: 12, marginLeft: 10 }}>{t("selectRecipients")}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Live document preview */}
            <div className="admin-docs-preview">
              <div className="glass card" style={{ position: "sticky", top: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(135,188,46,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="file" />
                  </div>
                  <div className="h2" style={{ margin: 0 }}>{t("docPreview")}</div>
                </div>

                {(!title.trim() && !body.trim()) ? (
                  <div style={{ textAlign: "center", padding: "32px 12px", color: "var(--muted)" }}>
                    <Icon name="file" />
                    <div style={{ fontSize: 13, marginTop: 8 }}>{t("docPreviewHint")}</div>
                  </div>
                ) : (
                  <div className="doc-preview" style={{ fontSize: 12, padding: 20 }}>
                    <div className="doc-preview__header">
                      <img src="/logo-nis.png" alt="NIS" className="doc-preview__logo" style={{ width: 36, height: 36 }} />
                      <div className="doc-preview__org">{t("nisOrg")}</div>
                    </div>

                    <div className="doc-preview__title" style={{ fontSize: 14, margin: "14px 0 10px" }}>{title.trim() || t("officialLetter")}</div>

                    <div className="doc-preview__body" style={{ fontSize: 12 }}>
                      <div className="doc-preview__field">
                        <span className="doc-preview__field-label">{t("fromLabel")}:</span>
                        <span className="doc-preview__field-value">{u.displayName || u.email || "—"}</span>
                      </div>
                      {selectedUsers.length > 0 && (
                        <div className="doc-preview__field">
                          <span className="doc-preview__field-label">{t("toLabel")}:</span>
                          <span className="doc-preview__field-value">
                            {selectedUsers.length <= 3
                              ? selectedUsers.map(s => s.displayName || s.email).join(", ")
                              : `${selectedUsers.slice(0, 2).map(s => s.displayName || s.email).join(", ")} +${selectedUsers.length - 2}`}
                          </span>
                        </div>
                      )}
                      {body.trim() && (
                        <div style={{ marginTop: 10, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{body}</div>
                      )}
                    </div>

                    <div className="doc-preview__signature" style={{ marginTop: 18 }}>
                      <div className="doc-preview__sig-block">
                        {u.signatureUrl ? <img src={u.signatureUrl} alt="" className="doc-preview__sig-img" /> : <div className="doc-preview__sig-line" />}
                        <div className="doc-preview__sig-label">{t("directorSign")}</div>
                        <div className="doc-preview__sig-name">{u.displayName || ""}</div>
                      </div>
                      {requireSig && (
                        <div className="doc-preview__sig-block">
                          <div className="doc-preview__sig-line" />
                          <div className="doc-preview__sig-label">{t("employeeSign")}</div>
                        </div>
                      )}
                    </div>

                    <div className="doc-preview__date" style={{ fontSize: 11 }}>{t("date")}: {new Date().toLocaleDateString("ru-RU")}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {tab === "list" && (
        <div className="glass card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div className="h2">{t("sentDocuments")}</div>
            <select className="input" style={{ width: "auto", minWidth: 180 }} value={filterUid} onChange={e => setFilterUid(e.target.value)}>
              <option value="">{t("all")}</option>
              {allUsers.map(x => <option key={x.uid} value={x.uid}>{x.displayName || x.email}</option>)}
            </select>
          </div>
          {filteredDocs.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>{t("noSentDocs")}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredDocs.map(d => {
                const dateStr = d.created ? new Date(d.created).toLocaleDateString("ru-RU") : "—";
                const recipient = allUsers.find(x => x.uid === d.toUid);
                return (
                  <div key={d.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{d.title}</div>
                      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
                        {recipient?.displayName || d.toName || d.toEmail}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <Pill kind={statusColor(d.status)}>{statusLabel(d.status)}</Pill>
                        {d.requireSignature && <Pill kind="pending">{t("signaturePill")}</Pill>}
                        <span className="tiny muted">{dateStr}</span>
                      </div>
                    </div>
                    {d.signatureUrl && (
                      <img src={d.signatureUrl} alt="Подпись" style={{ width: 80, height: 40, objectFit: "contain", border: "1px solid var(--border)", borderRadius: 6, padding: 2, background: "#fff" }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PageAdminTypes() {
  const st = useStore();
  const u = st.userDoc;
  const [form, setForm] = useState({ section: "", subsection: "", name: "", defaultPoints: 5 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ section: "", subsection: "", name: "", defaultPoints: 5 });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [q, setQ] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [sortCol, setSortCol] = useState("");
  const [sortDir, setSortDir] = useState("asc");

  if (!u) return <Guard />;
  if (u.role !== "admin") return <Guard />;

  async function refresh() {
    const tp = await fetchTypesAll();
    setState({ types: tp });
  }
  async function seed() {
    try {
      setState({ loading: true });
      const r = await seedDefaultTypes();
      toast(r.added ? `${t("typeSeedAdded")}: ${r.added}` : t("typeSeedNone"), "ok");
      await refresh();
    } catch (e) {
      console.error(e);
      toast(e?.message || e?.code || t("error"), "error");
    } finally { setState({ loading: false }); }
  }
  async function add() {
    try {
      if (!safeText(form.section) || !safeText(form.subsection) || !safeText(form.name)) {
        toast(t("fillFields"), "error"); return;
      }
      setState({ loading: true });
      await addType(form);
      toast(t("typeAdded"), "ok");
      setForm({ section: "", subsection: "", name: "", defaultPoints: 5 });
      setShowAddModal(false);
      await refresh();
    } catch (e) {
      console.error(e);
      toast(e?.message || t("error"), "error");
    } finally { setState({ loading: false }); }
  }
  async function toggle(id, active) {
    try {
      await toggleType(id, active);
      toast(t("updated"), "ok");
      await refresh();
    } catch (e) {
      console.error(e);
      toast(e?.message || t("error"), "error");
    }
  }
  async function doDelete(id) {
    try {
      setDeleting(true);
      await deleteTypeDoc(id);
      toast(t("typeDeleted"), "ok");
      setConfirmDelete(null);
      await refresh();
    } catch (e) {
      console.error(e);
      toast(e?.message || t("error"), "error");
    } finally { setDeleting(false); }
  }
  async function saveEdit() {
    try {
      if (!safeText(editForm.section) || !safeText(editForm.subsection) || !safeText(editForm.name)) {
        toast(t("fillFields"), "error"); return;
      }
      setState({ loading: true });
      await updateType(editModal, {
        section: safeText(editForm.section),
        subsection: safeText(editForm.subsection),
        name: safeText(editForm.name),
        defaultPoints: Number(editForm.defaultPoints) || 0
      });
      toast(t("updated"), "ok");
      setEditModal(null);
      await refresh();
    } catch (e) {
      console.error(e);
      toast(e?.message || t("error"), "error");
    } finally { setState({ loading: false }); }
  }

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const allTypes = st.types || [];
  const sections = [...new Set(allTypes.map(x => x.section).filter(Boolean))].sort();
  const sectionCounts = {};
  sections.forEach(s => { sectionCounts[s] = allTypes.filter(x => x.section === s).length; });

  const qn = q.trim().toLowerCase();
  let filtered = allTypes.filter(x => {
    const hay = `${x.section || ""} ${x.subsection || ""} ${x.name || ""}`.toLowerCase();
    return hay.includes(qn);
  });
  if (sectionFilter) filtered = filtered.filter(x => x.section === sectionFilter);

  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0;
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortCol === "section") return dir * (a.section || "").localeCompare(b.section || "", "ru");
    if (sortCol === "subsection") return dir * (a.subsection || "").localeCompare(b.subsection || "", "ru");
    if (sortCol === "name") return dir * (a.name || "").localeCompare(b.name || "", "ru");
    if (sortCol === "points") return dir * ((Number(a.defaultPoints) || 0) - (Number(b.defaultPoints) || 0));
    if (sortCol === "active") return dir * ((a.active ? 1 : 0) - (b.active ? 1 : 0));
    return 0;
  });

  const activeCount = allTypes.filter(x => x.active).length;
  const delType = confirmDelete ? allTypes.find(x => x.id === confirmDelete) : null;

  return (
    <>
      {/* Delete confirmation modal */}
      {confirmDelete && createPortal(
        <div className="modalback" onClick={() => setConfirmDelete(null)}>
          <div className="modal glass" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="h2" style={{ marginBottom: 12 }}>{t("typeDeleteTitle")}</div>
            <p className="p" style={{ marginBottom: 16 }}>
              <b>{delType?.name || confirmDelete}</b><br />
              <span className="muted" style={{ fontSize: 13 }}>{delType?.section} &rarr; {delType?.subsection}</span><br />
              <span className="muted" style={{ fontSize: 13, marginTop: 8, display: "block" }}>{t("typeDeleteWarning")}</span>
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => setConfirmDelete(null)}>{t("cancel")}</Btn>
              <Btn kind="primary" style={{ background: "var(--red, #ef4444)" }} onClick={() => doDelete(confirmDelete)} disabled={deleting}>
                {deleting ? t("deleting") : `\u2715 ${t("delete")}`}
              </Btn>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add type modal */}
      {showAddModal && createPortal(
        <div className="modalback" onClick={() => setShowAddModal(false)}>
          <div className="modal glass" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div className="h2" style={{ margin: 0 }}>{t("addTypeTitle")}</div>
              <button className="iconbtn" onClick={() => setShowAddModal(false)}><Icon name="x" /></button>
            </div>
            <div className="label">{t("typeSection")}</div>
            <Input value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} placeholder={t("typeSectionPlaceholder")} />
            <div className="label" style={{ marginTop: 10 }}>{t("typeSubsection")}</div>
            <Input value={form.subsection} onChange={e => setForm(f => ({ ...f, subsection: e.target.value }))} placeholder={t("typeSubsectionPlaceholder")} />
            <div className="label" style={{ marginTop: 10 }}>{t("typeName")}</div>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t("typeNamePlaceholder")} />
            <div className="label" style={{ marginTop: 10 }}>{t("typePoints")}</div>
            <Input type="number" min="0" max="9999" value={form.defaultPoints} onChange={e => setForm(f => ({ ...f, defaultPoints: e.target.value }))} />
            <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
              <Btn onClick={() => setShowAddModal(false)}>{t("cancel")}</Btn>
              <Btn kind="primary" onClick={add} disabled={st.loading}><Icon name="plus" /> {t("typeAddBtn")}</Btn>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit type modal */}
      {editModal && createPortal(
        <div className="modalback" onClick={() => setEditModal(null)}>
          <div className="modal glass" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div className="h2" style={{ margin: 0 }}>{t("typeEditTitle")}</div>
              <button className="iconbtn" onClick={() => setEditModal(null)}><Icon name="x" /></button>
            </div>
            <div className="label">{t("typeSection")}</div>
            <Input value={editForm.section} onChange={e => setEditForm(f => ({ ...f, section: e.target.value }))} />
            <div className="label" style={{ marginTop: 10 }}>{t("typeSubsection")}</div>
            <Input value={editForm.subsection} onChange={e => setEditForm(f => ({ ...f, subsection: e.target.value }))} />
            <div className="label" style={{ marginTop: 10 }}>{t("typeName")}</div>
            <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            <div className="label" style={{ marginTop: 10 }}>{t("typePoints")}</div>
            <Input type="number" min="0" max="9999" value={editForm.defaultPoints} onChange={e => setEditForm(f => ({ ...f, defaultPoints: e.target.value }))} />
            <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
              <Btn onClick={() => setEditModal(null)}>{t("cancel")}</Btn>
              <Btn kind="primary" onClick={saveEdit} disabled={st.loading}>{t("save")}</Btn>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Page header */}
      <div className="glass card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <img src="/logo-nis.png" alt="NIS" style={{ width: 40, height: 40, objectFit: "contain" }} />
          <div style={{ flex: 1 }}>
            <div className="h1" style={{ margin: 0 }}>{t("typesTitle")}</div>
            <div className="muted" style={{ fontSize: 13 }}>{t("typesDesc")}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="types-stat-pill">
              <Icon name="check" />
              <span>{activeCount} {t("typeActive")}</span>
            </div>
            <div className="types-stat-pill muted-pill">
              <Icon name="file" />
              <span>{allTypes.length} {t("typeTotal")}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
          <Btn kind="primary" onClick={() => setShowAddModal(true)}><Icon name="plus" /> {t("addTypeTitle")}</Btn>
          <Btn onClick={seed} disabled={st.loading}>{t("seedDefaults")}</Btn>
          <Btn onClick={refresh}><Icon name="refresh" /></Btn>
        </div>
      </div>

      {/* Filters */}
      <div className="glass card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder={t("typeSearchPlaceholder")} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Btn kind={sectionFilter === "" ? "primary" : "ghost"} onClick={() => setSectionFilter("")} style={{ fontSize: 12, padding: "5px 14px", borderRadius: 8 }}>
            {t("typeAllSections")} ({allTypes.length})
          </Btn>
          {sections.map(s => (
            <Btn key={s} kind={sectionFilter === s ? "primary" : "ghost"} onClick={() => setSectionFilter(sectionFilter === s ? "" : s)} style={{ fontSize: 12, padding: "5px 14px", borderRadius: 8 }}>
              {s} ({sectionCounts[s] || 0})
            </Btn>
          ))}
        </div>
      </div>

      {/* Types table */}
      {!filtered.length && <div className="glass card"><p className="p muted" style={{ padding: "12px 0", textAlign: "center" }}>{t("noTypes")}</p></div>}

      {filtered.length > 0 && (
        <div className="excel-table-wrap glass">
          <table className="excel-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>#</th>
                {[
                  { key: "section", label: t("typeSection") },
                  { key: "subsection", label: t("typeSubsection") },
                  { key: "name", label: t("typeName") },
                  { key: "points", label: t("typePoints"), style: { width: 80, textAlign: "right" } },
                  { key: "active", label: t("typeActiveCol"), style: { width: 80, textAlign: "center" } },
                ].map(col => (
                  <th key={col.key} className="excel-th-sort" style={col.style || {}} onClick={() => toggleSort(col.key)}>
                    <span>{col.label}</span>
                    <span className="excel-sort-icon">{sortCol === col.key ? (sortDir === "asc" ? "\u25B2" : "\u25BC") : "\u25B4\u25BE"}</span>
                  </th>
                ))}
                <th style={{ width: 110, textAlign: "center" }}>{t("colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((x, idx) => (
                <tr key={x.id}>
                  <td className="excel-cell-num">{idx + 1}</td>
                  <td>
                    <span className="excel-pos-pill" style={{ background: "rgba(135,188,46,.08)", color: "var(--accent)", borderColor: "rgba(135,188,46,.25)" }}>{x.section}</span>
                  </td>
                  <td><span className="muted" style={{ fontSize: 13 }}>{x.subsection}</span></td>
                  <td><b style={{ fontSize: 13 }}>{x.name}</b></td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "var(--accent)", fontSize: 14 }}>{fmtPoints(x.defaultPoints)}</td>
                  <td style={{ textAlign: "center" }}>
                    <label className="type-toggle">
                      <input type="checkbox" checked={!!x.active} onChange={e => toggle(x.id, e.target.checked)} />
                      <span className="type-toggle-slider" />
                    </label>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                      <button className="excel-action-btn" title={t("typeEditTitle")} onClick={() => { setEditModal(x.id); setEditForm({ section: x.section || "", subsection: x.subsection || "", name: x.name || "", defaultPoints: x.defaultPoints || 0 }); }}>
                        <Icon name="settings" />
                      </button>
                      <button className="excel-action-btn excel-action-del" title={t("delete")} onClick={() => setConfirmDelete(x.id)}>
                        <Icon name="x" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function PageAdminUsers() {
  const st = useStore();
  const [q, setQ] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmRole, setConfirmRole] = useState(null);
  const [groupFilter, setGroupFilter] = useState("");
  const [posFilter, setPosFilter] = useState("");
  const [selectedUid, setSelectedUid] = useState(null);
  const [customPos, setCustomPos] = useState([]);
  const [newPosName, setNewPosName] = useState("");
  const [posSearch, setPosSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [usersTab, setUsersTab] = useState("users");
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState("");
  const [sortCol, setSortCol] = useState("");
  const [sortDir, setSortDir] = useState("asc");

  const u = st.userDoc;

  useEffect(() => {
    fetchCustomPositions().then(setCustomPos).catch(() => { });
  }, []);

  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      const data = await fetchAdminLogs(300);
      setLogs(data);
    } catch (e) { console.error(e); }
    finally { setLogsLoading(false); }
  };

  useEffect(() => {
    if (usersTab === "history") loadLogs();
  }, [usersTab]);

  if (!u) return <Guard />;
  if (u.role !== "admin") return <Guard />;

  const allPositions = [...DEFAULT_POSITION_LIST.map(p => p.position), ...customPos];
  const allUsrs = st.users || [];

  const qn = q.trim().toLowerCase();
  const afterSearch = allUsrs.filter(x => {
    const hay = `${x.displayName || ""} ${x.email || ""} ${x.position || ""} ${x.school || ""} ${x.subject || ""}`.toLowerCase();
    return hay.includes(qn);
  });
  let filtered = groupFilter ? afterSearch.filter(x => getStaffGroup(x.email, x.position) === groupFilter) : afterSearch;
  if (posFilter) filtered = filtered.filter(x => (x.position || "") === posFilter);

  const groupCounts = {};
  STAFF_GROUPS.forEach(g => { groupCounts[g.key] = 0; });
  allUsrs.forEach(x => { const g = getStaffGroup(x.email, x.position); groupCounts[g] = (groupCounts[g] || 0) + 1; });

  // Position counts for sub-filter
  const posCounts = {};
  const afterGroupFilter = groupFilter ? afterSearch.filter(x => getStaffGroup(x.email, x.position) === groupFilter) : afterSearch;
  afterGroupFilter.forEach(x => { const p = x.position || ""; posCounts[p] = (posCounts[p] || 0) + 1; });
  const uniquePositions = Object.keys(posCounts).filter(p => p).sort();

  async function setR(uid, role) {
    try {
      setState({ loading: true });
      const target = allUsrs.find(x => x.uid === uid);
      const oldRole = target?.role || "";
      await setRole(uid, role);
      await logAdminAction({ action: "role_change", targetUid: uid, targetName: target?.displayName || target?.email || uid, details: `${oldRole} → ${role}` });
      toast(t("roleUpdated"), "ok");
      const users = await fetchUsersAll();
      setState({ users });
    } catch (e) {
      console.error(e);
      toast(e?.message || "Error", "error");
    } finally { setState({ loading: false }); }
  }

  async function assignPos(uid, pos) {
    try {
      setState({ loading: true });
      const target = allUsrs.find(x => x.uid === uid);
      const oldPos = target?.position || "—";
      await setPosition(uid, pos);
      await logAdminAction({ action: "position_change", targetUid: uid, targetName: target?.displayName || target?.email || uid, details: `${oldPos} → ${pos || "—"}` });
      toast(t("positionUpdated"), "ok");
      const users = await fetchUsersAll();
      setState({ users });
    } catch (e) {
      console.error(e);
      toast(e?.message || "Error", "error");
    } finally { setState({ loading: false }); }
  }

  async function doDelete(uid) {
    try {
      setDeleting(true);
      const target = allUsrs.find(x => x.uid === uid);
      const targetName = target?.displayName || target?.email || uid;
      const targetPos = target?.position || "";
      await deleteUserAndData(uid);
      await logAdminAction({ action: "user_delete", targetUid: uid, targetName, details: targetPos });
      const users = await fetchUsersAll();
      setState({ users });
      toast(t("accountDeleted"), "ok");
      setConfirmDelete(null);
    } catch (e) {
      console.error(e);
      toast(e?.message || t("deleteError"), "error");
    } finally { setDeleting(false); }
  }

  async function addCustomPos() {
    const name = newPosName.trim();
    if (!name) return;
    if (allPositions.some(p => p.toLowerCase() === name.toLowerCase())) {
      toast(t("positionExists"), "error"); return;
    }
    const updated = [...customPos, name];
    await saveCustomPositions(updated);
    setCustomPos(updated);
    setNewPosName("");
    toast(t("positionAdded"), "ok");
  }

  async function removeCustomPos(name) {
    const updated = customPos.filter(p => p !== name);
    await saveCustomPositions(updated);
    setCustomPos(updated);
    toast(t("positionRemoved"), "ok");
  }

  function toggleSort(col) {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0;
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortCol === "name") {
      return dir * (a.displayName || "").localeCompare(b.displayName || "", "ru");
    }
    if (sortCol === "email") {
      return dir * (a.email || "").localeCompare(b.email || "", "ru");
    }
    if (sortCol === "position") {
      return dir * (a.position || "").localeCompare(b.position || "", "ru");
    }
    if (sortCol === "role") {
      return dir * (a.role || "").localeCompare(b.role || "", "ru");
    }
    if (sortCol === "points") {
      return dir * ((Number(a.totalPoints) || 0) - (Number(b.totalPoints) || 0));
    }
    return 0;
  });

  const onlineCount = filtered.filter(x => x.online === true).length;
  const delUser = confirmDelete ? allUsrs.find(x => x.uid === confirmDelete) : null;
  const selUser = selectedUid ? allUsrs.find(x => x.uid === selectedUid) : null;

  return (
    <>
      {/* Delete confirmation modal (portal to body) */}
      {confirmDelete && createPortal(
        <div className="modalback" onClick={() => setConfirmDelete(null)}>
          <div className="modal glass" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="h2" style={{ marginBottom: 12 }}>{t("deleteAccount")}</div>
            <p className="p" style={{ marginBottom: 16 }}>
              <b>{delUser?.displayName || delUser?.email || confirmDelete}</b> {t("deleteConfirm")}<br />
              <span className="muted" style={{ fontSize: 13 }}>{t("deleteWarning")}</span>
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => setConfirmDelete(null)}>{t("cancel")}</Btn>
              <Btn kind="primary" style={{ background: "var(--red, #ef4444)" }} onClick={() => doDelete(confirmDelete)} disabled={deleting}>
                {deleting ? t("deleting") : `\u2715 ${t("delete")}`}
              </Btn>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Role change confirmation modal (portal to body) */}
      {confirmRole && createPortal((() => {
        const crUser = allUsrs.find(x => x.uid === confirmRole.uid);
        const newRole = confirmRole.newRole;
        return (
          <div className="modalback" onClick={() => setConfirmRole(null)}>
            <div className="modal glass" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
              <div className="h2" style={{ marginBottom: 12 }}>{t("roleChangeTitle")}</div>
              <p className="p" style={{ marginBottom: 16 }}>
                <b>{crUser?.displayName || crUser?.email || confirmRole.uid}</b><br />
                <span style={{ fontSize: 13 }}>{t("roleChangeConfirm")} <b style={{ color: newRole === "admin" ? "#6366f1" : "var(--accent)" }}>{newRole}</b>?</span>
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={() => setConfirmRole(null)}>{t("cancel")}</Btn>
                <Btn kind="primary" onClick={() => { setR(confirmRole.uid, newRole); setConfirmRole(null); }} disabled={st.loading}>
                  {t("confirm")}
                </Btn>
              </div>
            </div>
          </div>
        );
      })(), document.body)}

      {/* Page header */}
      <div className="glass card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <img src="/logo-nis.png" alt="NIS" style={{ width: 40, height: 40, objectFit: "contain" }} />
          <div style={{ flex: 1 }}>
            <div className="h1" style={{ margin: 0 }}>{t("usersTitle")}</div>
            <div className="muted" style={{ fontSize: 13 }}>{t("usersDesc")}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
            <span className="online-dot" />
            <span style={{ color: "var(--green, #22c55e)" }}>{onlineCount} online</span>
            <span className="muted">/ {filtered.length}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Btn kind={usersTab === "users" ? "primary" : "ghost"} onClick={() => setUsersTab("users")}>{t("usersTabUsers")}</Btn>
          <Btn kind={usersTab === "history" ? "primary" : "ghost"} onClick={() => setUsersTab("history")}>{t("usersTabHistory")} ({logs.length})</Btn>
        </div>
      </div>

      {/* ===== Two-panel layout ===== */}
      {usersTab === "users" && <div className="admin-users-layout">

        {/* LEFT: Position Assignment */}
        <div className="admin-users-left">
          <div className="glass card" style={{ position: "sticky", top: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(135,188,46,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="briefcase" />
              </div>
              <div className="h2" style={{ margin: 0, flex: 1 }}>{t("assignPosition")}</div>
            </div>

            {/* Selected user or placeholder */}
            {selUser ? (
              <div className="admin-users-selected">
                {selUser.avatarUrl ? (
                  <img src={selUser.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(135,188,46,.15)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                    {(selUser.displayName || selUser.email || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 14 }}>{selUser.displayName || selUser.email}</b>
                  {selUser.position && <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{selUser.position}</div>}
                </div>
                <button className="iconbtn" onClick={() => setSelectedUid(null)} title={t("cancel")}><Icon name="x" /></button>
              </div>
            ) : (
              <div className="admin-users-placeholder">
                <Icon name="user" />
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{t("selectUserHint")}</div>
              </div>
            )}

            {/* Position search */}
            <div style={{ marginBottom: 10 }}>
              <input className="input" style={{ fontSize: 13 }} placeholder={t("searchPositionPlaceholder")} value={posSearch} onChange={e => setPosSearch(e.target.value)} />
            </div>

            {/* Position list grouped — collapsible */}
            <div className="pos-scroll" style={{ maxHeight: "calc(100vh - 480px)", overflowY: "auto", margin: "0 -4px", padding: "0 4px" }}>
              {(() => {
                const psq = posSearch.trim().toLowerCase();
                return STAFF_GROUPS.map(g => {
                  const gPos = DEFAULT_POSITION_LIST.filter(p => p.group === g.key);
                  const cPos = g.key === "teacher" ? customPos : [];
                  const filteredGPos = psq ? gPos.filter(p => p.position.toLowerCase().includes(psq)) : gPos;
                  const filteredCPos = psq ? cPos.filter(p => p.toLowerCase().includes(psq)) : cPos;
                  if (!filteredGPos.length && !filteredCPos.length) return null;
                  const grpColor = g.key === "admin" ? "#6366f1" : g.key === "support" ? "#06b6d4" : "var(--accent)";
                  const totalInGroup = filteredGPos.length + filteredCPos.length;
                  const isCollapsed = !psq && collapsedGroups[g.key];
                  const toggleCollapse = () => setCollapsedGroups(prev => ({ ...prev, [g.key]: !prev[g.key] }));
                  return (
                    <div key={g.key} className="pos-group-section">
                      <div className="pos-group-header" style={{ color: grpColor }} onClick={toggleCollapse}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                          <span className="pos-group-chevron" style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0)" }}><Icon name="chevron" /></span>
                          <span className="pos-group-title">{g.label}</span>
                        </div>
                        <span className="pos-group-count" style={{ background: `${grpColor}18`, color: grpColor }}>{totalInGroup}</span>
                      </div>
                      {!isCollapsed && (
                        <div className="pos-group-items">
                          {filteredGPos.map(p => {
                            const active = selUser?.position === p.position;
                            const cnt = allUsrs.filter(x => x.position === p.position).length;
                            return (
                              <div key={p.position} className={`pos-item${active ? " active" : ""}${!selUser ? " disabled" : ""}`} onClick={() => selUser && assignPos(selUser.uid, p.position)}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  {active && <Icon name="check" />}
                                  <span>{p.position}</span>
                                </div>
                                {cnt > 0 && <span className="tiny muted">{cnt}</span>}
                              </div>
                            );
                          })}
                          {filteredCPos.map(p => {
                            const active = selUser?.position === p;
                            const cnt = allUsrs.filter(x => x.position === p).length;
                            return (
                              <div key={p} className={`pos-item${active ? " active" : ""}${!selUser ? " disabled" : ""}`} style={{ paddingRight: 4 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }} onClick={() => selUser && assignPos(selUser.uid, p)}>
                                  {active && <Icon name="check" />}
                                  <span>{p}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  {cnt > 0 && <span className="tiny muted">{cnt}</span>}
                                  <button className="iconbtn" onClick={(e) => { e.stopPropagation(); removeCustomPos(p); }} style={{ color: "var(--red, #ef4444)", width: 22, height: 22 }}><Icon name="x" /></button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}

              {/* Clear position */}
              {selUser && selUser.position && (
                <div className="pos-item" style={{ color: "var(--red, #ef4444)", marginTop: 8 }} onClick={() => assignPos(selUser.uid, "")}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="x" />
                    <span>{t("noPosition")}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Add custom position */}
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 14, paddingTop: 12 }}>
              <div className="label" style={{ fontSize: 12, marginBottom: 6 }}>{t("addPosition")}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input" style={{ flex: 1 }} placeholder={t("positionName")} value={newPosName} onChange={e => setNewPosName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addCustomPos(); }} />
                <Btn kind="primary" onClick={addCustomPos} disabled={!newPosName.trim()}><Icon name="plus" /></Btn>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Employees */}
        <div className="admin-users-right">
          {/* Filters */}
          <div className="glass card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <Input value={q} onChange={e => setQ(e.target.value)} placeholder={t("searchPlaceholder")} />
              </div>
              <Btn onClick={async () => { const users = await fetchUsersAll(); setState({ users }); toast(t("updated"), "ok"); }} style={{ flexShrink: 0 }}><Icon name="refresh" /></Btn>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Btn kind={groupFilter === "" ? "primary" : "ghost"} onClick={() => { setGroupFilter(""); setPosFilter(""); }} style={{ fontSize: 12, padding: "5px 14px", borderRadius: 8 }}>
                {t("allStaff")} ({allUsrs.length})
              </Btn>
              {STAFF_GROUPS.map(g => (
                <Btn key={g.key} kind={groupFilter === g.key ? "primary" : "ghost"} onClick={() => { setGroupFilter(groupFilter === g.key ? "" : g.key); setPosFilter(""); }} style={{ fontSize: 12, padding: "5px 14px", borderRadius: 8 }}>
                  {g.label} ({groupCounts[g.key] || 0})
                </Btn>
              ))}
            </div>
            {uniquePositions.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <select className="input" style={{ width: "auto", minWidth: 240, maxWidth: "100%", fontSize: 13 }} value={posFilter} onChange={e => setPosFilter(e.target.value)}>
                  <option value="">{t("allStaff")} ({afterGroupFilter.length})</option>
                  {STAFF_GROUPS.map(g => {
                    const gPositions = uniquePositions.filter(p => {
                      const pg = POSITION_GROUP_MAP[p.toLowerCase()];
                      return pg ? pg === g.key : g.key === "teacher";
                    });
                    if (!gPositions.length) return null;
                    return (
                      <optgroup key={g.key} label={`${g.label} (${gPositions.reduce((s, p) => s + (posCounts[p] || 0), 0)})`}>
                        {gPositions.map(p => (
                          <option key={p} value={p}>{p} ({posCounts[p] || 0})</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Employee table (Excel-style) */}
          {!filtered.length && <div className="glass card"><p className="p muted" style={{ padding: "12px 0", textAlign: "center" }}>{t("noResults")}</p></div>}

          {filtered.length > 0 && (
            <div className="excel-table-wrap glass">
              <table className="excel-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>#</th>
                    {[
                      { key: "name", label: t("colName") },
                      { key: "email", label: t("colEmail") },
                      { key: "position", label: t("colPosition") },
                      { key: "role", label: t("colRole") },
                      { key: "points", label: t("colPoints"), style: { width: 80, textAlign: "right" } },
                    ].map(col => (
                      <th key={col.key} className="excel-th-sort" style={col.style || {}} onClick={() => toggleSort(col.key)}>
                        <span>{col.label}</span>
                        <span className="excel-sort-icon">{sortCol === col.key ? (sortDir === "asc" ? "\u25B2" : "\u25BC") : "\u25B4\u25BE"}</span>
                      </th>
                    ))}
                    <th style={{ width: 120, textAlign: "center" }}>{t("colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((x, idx) => {
                    const grp = getStaffGroup(x.email, x.position);
                    const grpColor = grp === "admin" ? "#6366f1" : grp === "support" ? "#06b6d4" : "var(--accent)";
                    const isSel = selectedUid === x.uid;
                    const initials = (x.displayName || x.email || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <tr key={x.uid} className={isSel ? "excel-row-selected" : ""} style={{ borderLeft: `3px solid ${grpColor}` }}>
                        <td className="excel-cell-num">{idx + 1}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {x.avatarUrl ? (
                              <img src={x.avatarUrl} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${grpColor}18`, color: grpColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{initials}</div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                {x.online && <span className="online-dot" />}
                                <b style={{ fontSize: 13 }}>{x.displayName || "\u2014"}</b>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td><span className="muted" style={{ fontSize: 12 }}>{x.email}</span></td>
                        <td>
                          {x.position ? (
                            <span className="excel-pos-pill" style={{ background: `${grpColor}12`, color: grpColor, borderColor: `${grpColor}30` }}>{x.position}</span>
                          ) : <span className="muted" style={{ fontSize: 12 }}>{"\u2014"}</span>}
                        </td>
                        <td><Pill kind={x.role === "admin" ? "pending" : "approved"} style={{ fontSize: 11 }}>{x.role}</Pill></td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "var(--accent)", fontSize: 14 }}>{fmtPoints(x.totalPoints)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                            <button className="excel-action-btn" title={x.role === "admin" ? "\u2192 teacher" : "\u2192 admin"} onClick={() => setConfirmRole({ uid: x.uid, newRole: x.role === "admin" ? "teacher" : "admin" })} disabled={st.loading}>
                              <Icon name="refresh" />
                            </button>
                            <button className={`excel-action-btn${isSel ? " active" : ""}`} title={t("position")} onClick={() => setSelectedUid(isSel ? null : x.uid)}>
                              <Icon name="briefcase" />
                            </button>
                            <button className="excel-action-btn" title={t("profileBtn")} onClick={() => navigate("admin/teacher", { uid: (x.uid || x.id) })}>
                              <Icon name="user" />
                            </button>
                            {x.uid !== u.uid && (
                              <button className="excel-action-btn excel-action-del" title={t("delete")} onClick={() => setConfirmDelete(x.uid || x.id)}>
                                <Icon name="x" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>}

      {/* ===== History tab ===== */}
      {usersTab === "history" && (
        <div className="glass card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div className="h2">{t("historyTitle")}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select className="input" style={{ width: "auto", minWidth: 180, fontSize: 13 }} value={logFilter} onChange={e => setLogFilter(e.target.value)}>
                <option value="">{t("actionAll")}</option>
                <option value="role_change">{t("actionRoleChange")}</option>
                <option value="position_change">{t("actionPositionChange")}</option>
                <option value="user_delete">{t("actionUserDelete")}</option>
              </select>
              <Btn onClick={loadLogs} disabled={logsLoading}><Icon name="refresh" /></Btn>
            </div>
          </div>
          {logsLoading ? (
            <div style={{ textAlign: "center", padding: 24 }}><LoadingScreen /></div>
          ) : (() => {
            const filteredLogs = logFilter ? logs.filter(l => l.action === logFilter) : logs;
            return filteredLogs.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>{t("noLogs")}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredLogs.map(l => {
                  const dateStr = l.created ? new Date(l.created).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "\u2014";
                  const actionLabel = l.action === "role_change" ? t("actionRoleChange") : l.action === "position_change" ? t("actionPositionChange") : l.action === "user_delete" ? t("actionUserDelete") : l.action;
                  const actionColor = l.action === "user_delete" ? "rejected" : l.action === "role_change" ? "pending" : "approved";
                  const initials = (l.targetName || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={l.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: l.action === "user_delete" ? "rgba(239,68,68,.1)" : "rgba(135,188,46,.1)", color: l.action === "user_delete" ? "var(--red, #ef4444)" : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                          <b style={{ fontSize: 14 }}>{l.targetName}</b>
                          <Pill kind={actionColor}>{actionLabel}</Pill>
                        </div>
                        {l.details && <div style={{ fontSize: 13, color: "var(--muted)" }}>{l.details}</div>}
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                          <span className="tiny muted">{t("adminLabel")}: {l.adminName}</span>
                          <span className="tiny muted">{dateStr}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </>
  );
}



function PageAdminTeacher() {
  const st = useStore();
  const u = st.userDoc;

  // IMPORTANT: do not early-return before hooks (prevents "Rendered fewer hooks..." during auth hydration)
  const uid = (st.route?.params?.uid) || (parseRoute().params.uid) || "";

  const teacherFromStore = uid ? (st.users.find(x => (x.uid || x.id) === uid) || null) : null;

  const [teacherDoc, setTeacherDoc] = useState(teacherFromStore);
  const [teacherErr, setTeacherErr] = useState(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const [subs, setSubs] = useState([]);
  const [loadingLocal, setLoadingLocal] = useState(false);

  const [edit, setEdit] = useState({
    displayName: "",
    role: "teacher",
    school: "",
    subject: "",
    experienceYears: 0,
    phone: "",
    city: "",
    position: "",
    avatarUrl: "",
    totalPoints: 0
  });

  // Keep local teacherDoc in sync when list is already available
  useEffect(() => {
    if (!uid) return;
    if (teacherFromStore && (!teacherDoc || (teacherDoc.uid !== uid))) {
      setTeacherDoc(teacherFromStore);
    }
  }, [uid, teacherFromStore?.uid]);

  // Load teacher profile directly (works even if st.users is empty)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!uid) {
        if (alive) { setTeacherErr(null); setTeacherDoc(null); }
        return;
      }
      try {
        setTeacherErr(null);
        const rec = await pb.collection("users").getOne(uid);
        const t = normalizeUser(rec);
        if (alive) setTeacherDoc(t);
      } catch (e) {
        console.error(e);
        if (alive) {
          setTeacherErr(e);
          // keep previous teacherDoc if any; but if none, stay null to show error state
          if (!teacherDoc) setTeacherDoc(null);
        }
      }
    })();
    return () => { alive = false; };
  }, [uid, reloadNonce]);

  // Fill edit form whenever teacherDoc changes
  useEffect(() => {
    if (!teacherDoc) return;
    setEdit({
      displayName: teacherDoc.displayName || "",
      role: teacherDoc.role || "teacher",
      school: teacherDoc.school || "",
      subject: teacherDoc.subject || "",
      experienceYears: teacherDoc.experienceYears ?? 0,
      phone: teacherDoc.phone || "",
      city: teacherDoc.city || "",
      position: teacherDoc.position || "",
      avatarUrl: teacherDoc.avatarUrl || "",
      totalPoints: teacherDoc.totalPoints ?? 0
    });
  }, [teacherDoc?.uid]);

  // Teacher submissions
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!uid) {
        if (alive) setSubs([]);
        return;
      }
      try {
        setLoadingLocal(true);
        const arr = (await pb.collection("submissions").getFullList({ filter: `uid="${uid}"`, sort: "-created" })).map(normalizeSub);
        if (alive) setSubs(arr);
      } catch (e) {
        console.error(e);
        toast(e?.message || "Не удалось загрузить заявки", "error");
        if (alive) setSubs([]);
      } finally {
        if (alive) setLoadingLocal(false);
      }
    })();
    return () => { alive = false; };
  }, [uid, reloadNonce]);

  // Teacher personal documents
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!uid) { if (alive) setTeacherDocs([]); return; }
      try {
        setLoadingDocs(true);
        const arr = await fetchMyTeacherDocs(uid);
        if (alive) setTeacherDocs(arr);
      } catch (e) {
        console.error(e);
        if (alive) setTeacherDocs([]);
      } finally {
        if (alive) setLoadingDocs(false);
      }
    })();
    return () => { alive = false; };
  }, [uid, reloadNonce]);

  // Access checks AFTER hooks
  if (!u) return <Guard />;
  if (u.role !== "admin") return <Guard />;

  if (!uid) {
    return (
      <div className="glass card">
        <div className="h2">{t("teacherNotSelected")}</div>
        <p className="p">{t("openFromUsers")}</p>
        <div className="sep"></div>
        <Btn kind="primary" onClick={() => navigate("admin/users")}>{t("goToUsers")}</Btn>
      </div>
    );
  }

  if (!teacherDoc) {
    return (
      <div className="glass card">
        <div className="h2">{teacherErr ? t("profileLoadError") : t("loadingProfile")}</div>
        <p className="p">UID: <b>{uid}</b></p>
        <p className="tiny muted">Route: {st.route?.path} · me: {u.uid}</p>
        {teacherErr ? (
          <>
            <div className="sep"></div>
            <div className="tiny"><b>{String(teacherErr?.name || "Error")}</b>: {String(teacherErr?.message || teacherErr)}</div>
            <div className="help">Открой DevTools → Console, там будет stacktrace.</div>
            <div className="sep"></div>
            <Btn onClick={() => setReloadNonce(x => x + 1)}>{t("retry")}</Btn>
          </>
        ) : null}
      </div>
    );
  }

  const [atTab, setAtTab] = useState("overview"); // overview | edit | subs | docs
  const [teacherDocs, setTeacherDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const approved = subs.filter(s => s.status === "approved");
  const pending = subs.filter(s => s.status === "pending");
  const rejected = subs.filter(s => s.status === "rejected");
  const approvedPts = sum(approved, s => s.points);
  const tLvl = levelFromPoints(teacherDoc?.totalPoints || 0);
  const aprPct = subs.length ? Math.round((approved.length / subs.length) * 100) : 0;

  async function saveTeacher() {
    try {
      setState({ loading: true });
      await pb.collection("users").update(uid, {
        displayName: safeText(edit.displayName),
        role: edit.role === "admin" ? "admin" : "teacher",
        school: safeText(edit.school),
        subject: safeText(edit.subject),
        experienceYears: Number(edit.experienceYears) || 0,
        phone: safeText(edit.phone),
        city: safeText(edit.city),
        position: safeText(edit.position),
        totalPoints: Number(edit.totalPoints) || 0
      });
      const users = await fetchUsersAll();
      setState({ users });
      toast(t("save"), "ok");
      setReloadNonce(x => x + 1);
    } catch (e) {
      console.error(e);
      toast(e?.message || t("saveError"), "error");
    } finally {
      setState({ loading: false });
    }
  }

  async function decide(id, action) {
    try {
      setState({ loading: true });
      if (action === "approve") await approveSubmission(id, u.uid);
      else await rejectSubmission(id, u.uid);
      toast(action === "approve" ? t("approvedToast") : t("rejectedToast"), "ok");

      const users = await fetchUsersAll();
      setState({ users });
      setReloadNonce(x => x + 1);
    } catch (e) {
      console.error(e);
      toast(e?.message || t("error"), "error");
    } finally {
      setState({ loading: false });
    }
  }

  const AtTabBtn = ({ id, icon, label, count }) => (
    <button className={`prof-tab${atTab === id ? " prof-tab--active" : ""}`} onClick={() => setAtTab(id)}>
      <Icon name={icon} /> {label} {count != null && <span className="at-tab-count">{count}</span>}
    </button>
  );

  const LevelRingAT = ({ pct, size = 64, stroke = 4 }) => {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (circ * Math.min(pct, 100)) / 100;
    return (
      <svg width={size} height={size} className="prof-level-ring">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#atGrad)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <defs><linearGradient id="atGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--accent)" /><stop offset="100%" stopColor="var(--accent2)" /></linearGradient></defs>
      </svg>
    );
  };

  return (
    <div className="prof">
      {/* ══ Hero Card ══ */}
      <div className="prof-hero glass card" style={{ "--di": 0 }}>
        <div className="prof-hero__banner" />
        <div className="prof-hero__content">
          {/* Avatar */}
          <div className="prof-hero__avatar-wrap" style={{ cursor: "default" }}>
            <div className="prof-hero__avatar-ring">
              <div className="prof-hero__avatar">
                {edit.avatarUrl
                  ? <img src={edit.avatarUrl} alt="" />
                  : <span>{(edit.displayName || teacherDoc?.email || uid).slice(0, 1).toUpperCase()}</span>}
              </div>
            </div>
            <div className="prof-hero__badge-role">{teacherDoc?.role === "admin" ? "A" : "T"}</div>
          </div>

          {/* Info */}
          <div className="prof-hero__info">
            <div className="prof-hero__name">{teacherDoc?.displayName || "—"}</div>
            <div className="prof-hero__tags">
              <span className="prof-tag prof-tag--role">{teacherDoc?.role === "admin" ? "Admin" : "Teacher"}</span>
              <span className="prof-tag prof-tag--level">{tLvl.name}</span>
              {teacherDoc?.position && <span className="prof-tag">{teacherDoc.position}</span>}
              {teacherDoc?.onboarded
                ? <span className="prof-tag prof-tag--ok">{t("completed")}</span>
                : <span className="prof-tag prof-tag--warn">{t("onboarding")}</span>}
            </div>
            <div className="prof-hero__meta-row">
              <span className="prof-hero__meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" /><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" /></svg>
                {teacherDoc?.email || uid}
              </span>
              {teacherDoc?.school && (
                <span className="prof-hero__meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" /></svg>
                  {teacherDoc.school}
                </span>
              )}
              {teacherDoc?.subject && (
                <span className="prof-hero__meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" stroke="currentColor" strokeWidth="2" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" stroke="currentColor" strokeWidth="2" /></svg>
                  {teacherDoc.subject}
                </span>
              )}
              {teacherDoc?.city && (
                <span className="prof-hero__meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" /></svg>
                  {teacherDoc.city}
                </span>
              )}
            </div>
          </div>

          {/* Level ring */}
          <div className="prof-hero__right">
            <div className="prof-hero__level-wrap">
              <LevelRingAT pct={tLvl.pct} />
              <div className="prof-hero__level-inner" style={{ "--sz": "64px" }}>
                <div className="prof-hero__level-pts" style={{ fontSize: 16 }}>{fmtPoints(teacherDoc?.totalPoints || 0)}</div>
                <div className="prof-hero__level-label">{t("points")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="prof-hero__bottom">
          <div className="prof-hero__social">
            {teacherDoc?.phone && (
              <a href={`tel:${teacherDoc.phone}`} className="prof-social-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" /></svg>
                {teacherDoc.phone}
              </a>
            )}
            {(teacherDoc?.experienceYears > 0) && (
              <span className="prof-social-btn" style={{ cursor: "default" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="currentColor" strokeWidth="2" /></svg>
                {teacherDoc.experienceYears} {t("profYear")}
              </span>
            )}
          </div>
          <div className="prof-hero__actions">
            <Btn onClick={() => navigate("admin/users")}><Icon name="user" /> {t("back")}</Btn>
            <Btn kind="ghost" onClick={() => setReloadNonce(x => x + 1)}><Icon name="refresh" /></Btn>
          </div>
        </div>
      </div>

      {/* ══ Stats row ══ */}
      <div className="prof-stats">
        <div className="prof-stat glass card" style={{ "--di": 1 }}>
          <div className="prof-stat__icon prof-stat__icon--green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="prof-stat__num">{fmtPoints(teacherDoc?.totalPoints || 0)}</div>
          <div className="prof-stat__label">{t("totalPoints")}</div>
          <div className="prof-stat__bar"><div className="prof-stat__fill" style={{ width: `${tLvl.pct}%` }} /></div>
        </div>
        <div className="prof-stat glass card" style={{ "--di": 2 }}>
          <div className="prof-stat__icon prof-stat__icon--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="prof-stat__num">{fmtPoints(approvedPts)}</div>
          <div className="prof-stat__label">{t("approved")}</div>
          <div className="prof-stat__hint">{approved.length} {t("profTabSubs").toLowerCase()}</div>
        </div>
        <div className="prof-stat glass card" style={{ "--di": 3 }}>
          <div className="prof-stat__icon prof-stat__icon--amber">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </div>
          <div className="prof-stat__num">{pending.length}</div>
          <div className="prof-stat__label">{t("pending")}</div>
          <div className="prof-stat__hint">{t("profApprovalRate")}: {aprPct}%</div>
        </div>
        <div className="prof-stat glass card" style={{ "--di": 4 }}>
          <div className="prof-stat__icon prof-stat__icon--purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </div>
          <div className="prof-stat__num">{Number(teacherDoc?.compDays || 0)}</div>
          <div className="prof-stat__label">{t("compDays")}</div>
          <div className="prof-stat__hint">{t("dayShort")}</div>
        </div>
      </div>

      {/* ══ Tabs ══ */}
      <div className="prof-tabs">
        <AtTabBtn id="overview" icon="info" label={t("profileOverview")} />
        <AtTabBtn id="edit" icon="settings" label={t("editSection")} />
        <AtTabBtn id="subs" icon="file" label={t("profTabSubs")} count={subs.length} />
        <AtTabBtn id="docs" icon="shield" label={t("teacherDocsTitle")} count={teacherDocs.length} />
      </div>

      {/* Tab: overview */}
      {atTab === "overview" && (
        <div className="glass card prof-card" style={{ "--di": 5 }}>
          <div className="h2">{t("profAbout")}</div>
          <div className="sep"></div>
          <div className="at-info-grid">
            <div className="at-info-item">
              <div className="at-info-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 21a8 8 0 10-16 0" stroke="currentColor" strokeWidth="2" /><path d="M12 13a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2" /></svg>
              </div>
              <div>
                <div className="at-info-label">{t("fullName")}</div>
                <div className="at-info-value">{teacherDoc?.displayName || "—"}</div>
              </div>
            </div>
            <div className="at-info-item">
              <div className="at-info-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" /></svg>
              </div>
              <div>
                <div className="at-info-label">{t("profSchool")}</div>
                <div className="at-info-value">{teacherDoc?.school || t("profNoSchool")}</div>
              </div>
            </div>
            <div className="at-info-item">
              <div className="at-info-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" stroke="currentColor" strokeWidth="2" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" stroke="currentColor" strokeWidth="2" /></svg>
              </div>
              <div>
                <div className="at-info-label">{t("profSubject")}</div>
                <div className="at-info-value">{teacherDoc?.subject || t("profNoSubject")}</div>
              </div>
            </div>
            <div className="at-info-item">
              <div className="at-info-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="currentColor" strokeWidth="2" /></svg>
              </div>
              <div>
                <div className="at-info-label">{t("profExperience")}</div>
                <div className="at-info-value">{teacherDoc?.experienceYears || 0} {t("profYear")}</div>
              </div>
            </div>
            <div className="at-info-item">
              <div className="at-info-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" /></svg>
              </div>
              <div>
                <div className="at-info-label">{t("profCity")}</div>
                <div className="at-info-value">{teacherDoc?.city || "—"}</div>
              </div>
            </div>
            <div className="at-info-item">
              <div className="at-info-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V6l-8-3-8 3v6c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" /></svg>
              </div>
              <div>
                <div className="at-info-label">{t("roleLabel")}</div>
                <div className="at-info-value">{teacherDoc?.role || "teacher"}</div>
              </div>
            </div>
          </div>

          {/* Recent submissions preview */}
          {subs.length > 0 && (
            <>
              <div className="sep"></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="h2">{t("recentSubs")}</div>
                <Btn kind="ghost" onClick={() => setAtTab("subs")} style={{ fontSize: 12 }}>{t("profTabSubs")} →</Btn>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                {subs.slice(0, 4).map(s => (
                  <div key={s.id} className="at-sub-preview">
                    <div className="at-sub-preview__left">
                      <Pill kind={s.status}>{s.status}</Pill>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{s.title}</div>
                        <div className="muted tiny">{s.typeName} · {s.eventDate}</div>
                      </div>
                    </div>
                    <div className="at-sub-preview__pts">+{fmtPoints(s.points)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: edit */}
      {atTab === "edit" && (
        <div className="glass card prof-card" style={{ "--di": 5 }}>
          <div className="h2">{t("editSection")}</div>
          <div className="sep"></div>
          <div className="grid2">
            <div>
              <div className="label">{t("fullName")}</div>
              <Input value={edit.displayName} onChange={(e) => setEdit(v => ({ ...v, displayName: e.target.value }))} />
            </div>
            <div>
              <div className="label">{t("roleLabel")}</div>
              <Select value={edit.role} onChange={(e) => setEdit(v => ({ ...v, role: e.target.value }))}>
                <option value="teacher">teacher</option>
                <option value="admin">admin</option>
              </Select>
            </div>
            <div>
              <div className="label">{t("school")}</div>
              <Input value={edit.school} onChange={(e) => setEdit(v => ({ ...v, school: e.target.value }))} />
            </div>
            <div>
              <div className="label">{t("subject")}</div>
              <Input value={edit.subject} onChange={(e) => setEdit(v => ({ ...v, subject: e.target.value }))} />
            </div>
            <div>
              <div className="label">{t("expYears")}</div>
              <Input type="number" min="0" max="80" value={edit.experienceYears} onChange={(e) => setEdit(v => ({ ...v, experienceYears: e.target.value }))} />
            </div>
            <div>
              <div className="label">{t("phone")}</div>
              <Input value={edit.phone} onChange={(e) => setEdit(v => ({ ...v, phone: e.target.value }))} />
            </div>
            <div>
              <div className="label">{t("city")}</div>
              <Input value={edit.city} onChange={(e) => setEdit(v => ({ ...v, city: e.target.value }))} />
            </div>
            <div>
              <div className="label">{t("position")}</div>
              <Input value={edit.position} onChange={(e) => setEdit(v => ({ ...v, position: e.target.value }))} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <div className="label">{t("avatarUrl")}</div>
              <Input value={edit.avatarUrl} onChange={(e) => setEdit(v => ({ ...v, avatarUrl: e.target.value }))} placeholder="https://..." />
              <div className="help">{t("avatarHelp")}</div>
            </div>
            <div>
              <div className="label">{t("totalPoints")}</div>
              <Input type="number" min="0" max="9999999" value={edit.totalPoints} onChange={(e) => setEdit(v => ({ ...v, totalPoints: e.target.value }))} />
            </div>
            <div />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <Btn kind="primary" onClick={saveTeacher} disabled={st.loading}><Icon name="check" /> {t("save")}</Btn>
            <Btn onClick={() => setEdit(v => ({ ...v, avatarUrl: "" }))}>{t("clearAvatar")}</Btn>
          </div>
        </div>
      )}

      {/* Tab: submissions */}
      {atTab === "subs" && (
        <div className="glass card prof-card" style={{ "--di": 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div className="h2">{t("teacherSubs")}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Pill kind="approved">{t("approved")}: {approved.length}</Pill>
              <Pill kind="pending">{t("pending")}: {pending.length}</Pill>
              <Pill kind="rejected">{t("rejected")}: {rejected.length}</Pill>
            </div>
          </div>
          <div className="sep"></div>

          {loadingLocal && <p className="p">{t("loadingSubs")}</p>}

          <DataCards
            emptyText={t("noSubs")}
            columns={[
              { key: "eventDate", label: t("date") },
              { key: "typeName", label: t("type") },
              {
                key: "title", label: t("title"), render: s => (
                  <div>
                    <b>{s.title}</b>
                    {s.description ? <div className="muted tiny">{s.description}</div> : null}
                  </div>
                )
              },
              { key: "points", label: t("points"), render: s => <b>{fmtPoints(s.points)}</b> },
              { key: "status", label: t("status"), render: s => <Pill kind={s.status}>{s.status}</Pill> },
              {
                key: "evidence", label: "Evidence", render: s => (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {s.evidenceLink ? <a className="btn" href={s.evidenceLink} target="_blank" rel="noreferrer">{t("link")}</a> : null}
                    {s.evidenceFileUrl ? <a className="btn" href={s.evidenceFileUrl} target="_blank" rel="noreferrer">{t("file")}</a> : null}
                    {!s.evidenceLink && !s.evidenceFileUrl ? <span className="muted tiny">—</span> : null}
                  </div>
                )
              },
              {
                key: "action", label: t("action"), render: s => s.status === "pending" ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Btn kind="ok" onClick={() => decide(s.id, "approve")} disabled={st.loading}><Icon name="check" /></Btn>
                    <Btn kind="danger" onClick={() => decide(s.id, "reject")} disabled={st.loading}><Icon name="x" /></Btn>
                  </div>
                ) : <span className="muted tiny">—</span>
              }
            ]}
            rows={subs.map(s => ({ ...s, __key: s.id }))}
          />
        </div>
      )}

      {/* Tab: teacher documents */}
      {atTab === "docs" && (
        <div className="glass card prof-card" style={{ "--di": 5 }}>
          <div className="h2">{t("teacherDocsTitle")}</div>
          <div className="sep"></div>

          {loadingDocs && <p className="p">{t("loading")}</p>}

          {!loadingDocs && teacherDocs.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>{t("noTeacherDocs")}</div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {teacherDocs.map(d => {
              const dateStr = d.created ? new Date(d.created).toLocaleDateString("ru-RU") : "—";
              return (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 16px", border: "1px solid var(--border)", borderRadius: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{d.title}</div>
                    {d.description && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{d.description}</div>}
                    <div className="muted tiny" style={{ marginTop: 4 }}>{d.fileName || "файл"} · {dateStr}</div>
                  </div>
                  {d.fileUrl && <a className="btn" href={d.fileUrl} target="_blank" rel="noreferrer">{t("openDoc")}</a>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


/** ---------- PageNews ---------- */
function NewsCard({ item, user, index }) {
  const [liked, setLiked] = useState((item.likes || []).includes(user?.uid));
  const [likesCount, setLikesCount] = useState((item.likes || []).length);
  const [likeAnim, setLikeAnim] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const catLabel = (() => { const c = NEWS_CATEGORIES.find(c => c.key === item.category); return c ? t(c.tKey) : item.category; })();
  const dateStr = item.created
    ? new Date(item.created).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" })
    : "";

  const handleLike = async () => {
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(c => c + (newLiked ? 1 : -1));
    if (newLiked) { setLikeAnim(true); setTimeout(() => setLikeAnim(false), 700); }
    try {
      await toggleNewsLike(item.id, user.uid, item.likes || []);
    } catch (e) {
      setLiked(!newLiked);
      setLikesCount(c => c + (newLiked ? -1 : 1));
    }
  };

  const handleToggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      setLoadingComments(true);
      try { setComments(await fetchNewsComments(item.id)); }
      finally { setLoadingComments(false); }
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !user) return;
    setAddingComment(true);
    try {
      await addNewsComment(item.id, {
        uid: user.uid,
        authorName: user.displayName || user.email || t("anonymous"),
        avatarUrl: user.avatarUrl || "",
        text: commentText.trim(),
      });
      setCommentText("");
      setComments(await fetchNewsComments(item.id));
    } catch (e) {
      toast(e?.message || "Ошибка", "error");
    } finally {
      setAddingComment(false);
    }
  };

  const isOwner = user?.uid === item.uid || user?.role === "admin";
  const desc = item.description || "";
  const descLong = desc.length > 200;

  const timeAgo = (() => {
    if (!item.created) return dateStr;
    const diff = Math.floor((Date.now() - new Date(item.created).getTime()) / 1000);
    if (diff < 60) return t("justNow");
    if (diff < 3600) return `${Math.floor(diff / 60)} ${t("minAgo")}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ${t("hAgo")}`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ${t("dAgo")}`;
    return dateStr;
  })();

  const handleShare = async () => {
    const url = window.location.origin + "/#news";
    if (navigator.share) {
      try { await navigator.share({ title: item.title, url }); } catch { }
    } else {
      await navigator.clipboard.writeText(`${item.title} — ${url}`);
      toast(t("linkCopied"), "ok");
    }
  };

  return (
    <div className={`news-card${item.pinned ? " news-card--pinned" : ""}`} style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}>
      {item.pinned && (
        <div className="news-pinned-banner">
          <svg className="news-pinned-banner__icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>
          <span>{t("pinned")}</span>
        </div>
      )}
      <div className="news-card__body">
        <div className="news-card__meta">
          {item.avatarUrl
            ? <img className="news-card__avatar" src={item.avatarUrl} alt="" />
            : <div className="news-card__avatar news-card__avatar--ph">{(item.authorName || "A")[0].toUpperCase()}</div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="news-card__author">{item.authorName || t("anonymous")}</div>
            <div className="tiny muted">{timeAgo}</div>
          </div>
          <span className={`news-pill news-pill--${item.category}`}>{catLabel}</span>
          {user?.role === "admin" && (
            <button className="news-pin-btn" title={item.pinned ? t("unpin") : t("pin")} onClick={async () => {
              await toggleNewsPin(item.id, !!item.pinned);
              const updated = await fetchNewsAll();
              setState({ news: updated });
              toast(item.pinned ? t("unpinned") : t("pinnedDone"), "ok");
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={item.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>
            </button>
          )}
          {isOwner && (
            <button className="news-del-btn" title={t("delete")} onClick={async () => {
              if (!window.confirm(t("deleteNewsConfirm"))) return;
              await deleteNewsPost(item.id);
              const updated = await fetchNewsAll();
              setState({ news: updated });
              toast(t("deleted"), "ok");
            }}>✕</button>
          )}
        </div>

        <div className="news-card__title">{item.mood && <span className="news-card__mood">{item.mood}</span>}{item.title}</div>

        {desc && (
          <div className="news-card__desc" style={item.fontFamily ? { fontFamily: item.fontFamily } : undefined}>
            {descLong && !expanded ? renderRichDesc(desc.slice(0, 200) + "…") : renderRichDesc(desc)}
            {descLong && (
              <button className="news-expand-btn" onClick={() => setExpanded(e => !e)}>
                {expanded ? ` ${t("collapse")}` : ` ${t("readMore")}`}
              </button>
            )}
          </div>
        )}

        {item.photoUrl && (
          <div className="news-card__photo-wrap">
            <img className="news-card__photo" src={item.photoUrl} alt="news" loading="lazy" />
          </div>
        )}

        {item.link && (
          <a className="news-card__link-btn" href={item.link} target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            {t("openLink")}
          </a>
        )}

        <div className="news-card__actions">
          <button className={`news-like-btn${liked ? " liked" : ""}${likeAnim ? " pop" : ""}`} onClick={handleLike}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
            <span>{likesCount > 0 ? likesCount : ""}</span>
          </button>
          <button className={`news-comment-btn${showComments ? " active" : ""}`} onClick={handleToggleComments}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span>{t("comments")}</span>
          </button>
          <button className="news-share-btn" onClick={handleShare}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
        </div>

        {showComments && (
          <div className="news-comments">
            {loadingComments ? (
              <div className="tiny muted" style={{ padding: "8px 0" }}>{t("loadingComments")}</div>
            ) : comments.length === 0 ? (
              <div className="tiny muted" style={{ padding: "8px 0" }}>{t("noComments")}</div>
            ) : (
              <div className="news-comments__list">
                {comments.map(c => (
                  <div key={c.id} className="news-comment">
                    {c.avatarUrl
                      ? <img className="news-comment__av" src={c.avatarUrl} alt="" />
                      : <div className="news-comment__av news-comment__av--ph">{(c.authorName || "A")[0].toUpperCase()}</div>
                    }
                    <div className="news-comment__bubble">
                      <div className="news-comment__author">{c.authorName}</div>
                      <div className="news-comment__text">{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {user && (
              <div className="news-comment-form">
                <input
                  className="input"
                  placeholder={t("writeComment")}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !addingComment) { e.preventDefault(); handleAddComment(); } }}
                />
                <Btn kind="primary" disabled={addingComment || !commentText.trim()} onClick={handleAddComment}>
                  {addingComment ? "…" : t("send")}
                </Btn>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PageNews() {
  const st = useStore();
  const u = st.userDoc;
  const [localNews, setLocalNews] = useState(st.news || []);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [photo, setPhoto] = useState(null);
  const [mood, setMood] = useState("");
  const [fontFamily, setFontFamily] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const descRef = useRef(null);

  useEffect(() => { setLocalNews(st.news || []); }, [st.news]);

  const doRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchNewsAll();
      setState({ news: data });
    } finally { setRefreshing(false); }
  };

  // auto-load if empty
  useEffect(() => {
    if ((st.news || []).length === 0) doRefresh();
  }, []);

  const validateFile = (file, label) => {
    if (file && file.size > 10 * 1024 * 1024) {
      toast(`${label} — ${t("max10mb")}`, "error");
      return false;
    }
    return true;
  };

  const wrapSelection = (before, after) => {
    const ta = descRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = description.slice(start, end);
    const wrapped = before + sel + after;
    const next = description.slice(0, start) + wrapped + description.slice(end);
    setDescription(next);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, start + before.length + sel.length); }, 0);
  };

  const photoInputRef = useRef(null);

  const handleSubmit = async () => {
    if (!title.trim()) return toast(t("fillFields"), "error");
    if (!category) return toast(t("fillFields"), "error");
    if (!validateFile(photo, "Фото")) return;
    setSubmitting(true);
    try {
      await createNewsPost({
        uid: u.uid,
        authorName: u.displayName || u.email || t("anonymous"),
        authorRole: u.role,
        avatarUrl: getFileUrl(u, "avatar") || "",
        category, title: title.trim(), description: description.trim(),
        photoFile: photo || null, coverFile: null, link: link.trim(),
        mood, fontFamily,
      });
      toast(t("newsPublished"), "ok");
      setShowForm(false);
      setTitle(""); setDescription(""); setLink(""); setCategory(""); setPhoto(null); setMood(""); setFontFamily("");
      const updated = await fetchNewsAll();
      setState({ news: updated });
    } catch (e) {
      toast(e?.message || t("publishError"), "error");
    } finally { setSubmitting(false); }
  };

  const filteredRaw = filter === "all" ? localNews : localNews.filter(n => n.category === filter);
  const filtered = [...filteredRaw].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  // Sidebar data
  const totalLikes = localNews.reduce((s, n) => s + (n.likes || []).length, 0);
  const popular = [...localNews].sort((a, b) => (b.likes || []).length - (a.likes || []).length).slice(0, 5);
  const authorMap = new Map();
  localNews.forEach(n => {
    const name = n.authorName || t("anonymous");
    const prev = authorMap.get(name) || { name, avatarUrl: n.avatarUrl || "", count: 0 };
    prev.count++;
    authorMap.set(name, prev);
  });
  const topAuthors = Array.from(authorMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  const catCounts = {};
  localNews.forEach(n => { catCounts[n.category] = (catCounts[n.category] || 0) + 1; });
  const maxCatCount = Math.max(...Object.values(catCounts), 1);

  return (
    <div className="page-news">
      <div className="page-head" style={{ marginBottom: 20 }}>
        <div>
          <div className="h1">{t("newsTitle")}</div>
          <div className="muted tiny">{t("sharedFeed")} · {localNews.length} {t("publication")}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className={`iconbtn${refreshing ? " spin" : ""}`} onClick={doRefresh} title={t("refresh")} disabled={refreshing}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
          </button>
          {u && (
            <Btn kind="primary" onClick={() => setShowForm(v => !v)}>
              {showForm ? `✕ ${t("close")}` : `+ ${t("publish")}`}
            </Btn>
          )}
        </div>
      </div>

      {showForm && (
        <div className="news-form-card">
          <div className="h2" style={{ marginBottom: 16 }}>{t("publishNews")}</div>
          <div className="news-form-grid">
            <div className="field">
              <label className="label">{t("category")} *</label>
              <select className="select" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">{t("selectCategory")}</option>
                {NEWS_CATEGORIES.map(c => <option key={c.key} value={c.key}>{NEWS_CAT_ICONS[c.key] || ""} {t(c.tKey)}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label">{t("title")} *</label>
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder={t("newsTopicPlaceholder")} />
            </div>
            <div className="field" style={{ gridColumn: "1/-1" }}>
              <label className="label">{t("description")}</label>
              <div className="news-desc-toolbar">
                <button type="button" className="news-tb-btn" title="Bold" onClick={() => wrapSelection("**", "**")}><b>B</b></button>
                <button type="button" className="news-tb-btn news-tb-btn--i" title="Italic" onClick={() => wrapSelection("*", "*")}><i>I</i></button>
                <span className="news-tb-sep" />
                <select className="news-tb-font" value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
                  {NEWS_FONTS.map(f => <option key={f.key} value={f.key} style={{ fontFamily: f.key || "inherit" }}>{f.label}</option>)}
                </select>
              </div>
              <textarea ref={descRef} className="textarea" rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder={t("newsContentPlaceholder")} style={fontFamily ? { fontFamily } : undefined} />
              <div className="news-mood-row">
                <span className="tiny muted">{t("mood")}:</span>
                {NEWS_MOODS.map(em => (
                  <button type="button" key={em} className={`news-mood-btn${mood === em ? " active" : ""}`} onClick={() => setMood(mood === em ? "" : em)}>{em}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="label">{t("link")}</label>
              <input className="input" value={link} onChange={e => setLink(e.target.value)} placeholder="https://…" />
            </div>
            <div className="field">
              <label className="label">{t("photoMax10")}</label>
              <input ref={photoInputRef} type="file" accept="image/*" className="input" onChange={e => setPhoto(e.target.files[0] || null)} />
              {photo && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <img src={URL.createObjectURL(photo)} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border2)" }} />
                  <span className="tiny muted">{photo.name} ({(photo.size / 1024 / 1024).toFixed(1)} MB)</span>
                  <button type="button" className="news-clear-photo" onClick={() => { setPhoto(null); if (photoInputRef.current) photoInputRef.current.value = ""; }}>✕ {t("clearPhoto")}</button>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <Btn kind="ghost" onClick={() => setShowForm(false)}>{t("cancel")}</Btn>
            <Btn kind="primary" disabled={submitting} onClick={handleSubmit}>
              {submitting ? t("publishing") : t("publish")}
            </Btn>
          </div>
        </div>
      )}

      <div className="news-filter" role="tablist">
        <button role="tab" className={`news-filter__btn${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>{t("all")}</button>
        {NEWS_CATEGORIES.map(c => (
          <button role="tab" key={c.key} className={`news-filter__btn${filter === c.key ? " active" : ""}`} onClick={() => setFilter(c.key)}>
            {NEWS_CAT_ICONS[c.key] || ""} {t(c.tKey)}
          </button>
        ))}
      </div>

      <div className="news-layout">
        {/* LEFT: news feed */}
        <div className="news-main">
          <div className="news-list">
            {filtered.length === 0 ? (
              <div className="news-empty">
                <div className="news-empty__icon">{filter !== "all" ? (NEWS_CAT_ICONS[filter] || "\u{1F4F0}") : "\u{1F4F0}"}</div>
                <div className="h2">{t("noNews")}</div>
                <div className="tiny muted" style={{ marginTop: 6 }}>{t("noNewsCat")}</div>
              </div>
            ) : (
              filtered.map((n, i) => <NewsCard key={n.id} item={n} user={u} index={i} />)
            )}
          </div>
        </div>

        {/* RIGHT: sidebar */}
        <div className="news-sidebar">
          {/* Stats */}
          <div className="news-sidebar-card">
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>
              {t("newsStats")}
            </h3>
            <div className="news-stat-grid">
              <div className="news-stat-item">
                <span className="news-stat-item__num">{localNews.length}</span>
                <span className="news-stat-item__label">{t("totalPosts")}</span>
              </div>
              <div className="news-stat-item">
                <span className="news-stat-item__num">{totalLikes}</span>
                <span className="news-stat-item__label">{t("totalLikes")}</span>
              </div>
            </div>
          </div>

          {/* Popular news */}
          {popular.length > 0 && (
            <div className="news-sidebar-card">
              <h3>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                {t("popularNews")}
              </h3>
              {popular.map((n, i) => (
                <div key={n.id} className="news-popular-item">
                  <div className="news-popular-rank">{i + 1}</div>
                  <div className="news-popular-info">
                    <div className="news-popular-title">{n.title}</div>
                    <div className="news-popular-meta">{(n.likes || []).length} {t("likes")} · {n.authorName || t("anonymous")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top authors */}
          {topAuthors.length > 0 && (
            <div className="news-sidebar-card">
              <h3>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
                {t("topAuthors")}
              </h3>
              {topAuthors.map((a, i) => (
                <div key={i} className="news-author-item">
                  {a.avatarUrl
                    ? <img className="news-author-av" src={a.avatarUrl} alt="" />
                    : <div className="news-author-av news-author-av--ph">{a.name[0].toUpperCase()}</div>
                  }
                  <div className="news-author-name">{a.name}</div>
                  <div className="news-author-count">{a.count} {t("posts")}</div>
                </div>
              ))}
            </div>
          )}

          {/* Category breakdown */}
          <div className="news-sidebar-card">
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              {t("category")}
            </h3>
            <div className="news-cat-stats">
              {NEWS_CATEGORIES.map(c => (
                <div key={c.key} className="news-cat-stat-row">
                  <div className="news-cat-stat-label">{NEWS_CAT_ICONS[c.key]} {t(c.tKey)}</div>
                  <div className="news-cat-stat-bar">
                    <div className="news-cat-stat-fill" style={{ width: `${((catCounts[c.key] || 0) / maxCatCount) * 100}%` }} />
                  </div>
                  <div className="news-cat-stat-num">{catCounts[c.key] || 0}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------- PageSupport (teacher: bug report + FAQ + social) ---------- */
function PageSupport() {
  const st = useStore();
  const u = st.userDoc;
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("medium");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  if (!canAccess("support", u)) return <Guard />;

  const myTickets = st.myTickets || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    try {
      await createTicket({
        uid: u.uid,
        authorName: u.displayName || u.email,
        authorEmail: u.email || "",
        subject,
        message,
        priority
      });
      setSubject("");
      setMessage("");
      setPriority("medium");
      setSent(true);
      setTimeout(() => setSent(false), 3500);
      const tix = await fetchMyTickets(u.uid);
      setState({ myTickets: tix });
      toast(t("bugSent"), "ok");
    } catch (e) {
      toast(e?.message || t("bugSendError"), "error");
    } finally {
      setSending(false);
    }
  };

  const faqItems = [
    { q: t("faq1q"), a: t("faq1a") },
    { q: t("faq2q"), a: t("faq2a") },
    { q: t("faq3q"), a: t("faq3a") },
    { q: t("faq4q"), a: t("faq4a") },
    { q: t("faq5q"), a: t("faq5a") },
    { q: t("faq6q"), a: t("faq6a") },
  ];

  const prioPill = (p) => p === "high" ? "rejected" : p === "medium" ? "pending" : "approved";
  const statusPill = (s) => s === "done" ? "approved" : s === "in_progress" ? "pending" : "rejected";
  const statusLabel = (s) => s === "done" ? t("ticketDone") : s === "in_progress" ? t("ticketInProgress") : t("ticketNew");

  return (
    <div className="page-support fade-in">
      <div className="support-grid">
        {/* LEFT COLUMN: Form + My Tickets */}
        <div className="support-left slide-up">
          <h1 className="h1">{t("supportTitle")}</h1>
          <p className="p muted" style={{ marginBottom: 16 }}>{t("supportDesc")}</p>

          <div className="support-form-card">
            <div className="support-form-header">
              <Icon name="bug" />
              <span>{t("send")}</span>
            </div>
            {sent && (
              <div className="support-success-banner pop-in">
                <Icon name="check" /> {t("bugSent")}
              </div>
            )}
            <form onSubmit={handleSubmit} className="support-form">
              <label className="form-label">{t("bugSubject")}</label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder={t("bugSubjectPh")} required />

              <label className="form-label">{t("bugMessage")}</label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={t("bugMessagePh")} rows={4} required />

              <label className="form-label">{t("bugPriority")}</label>
              <Select value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="low">{t("prioLow")}</option>
                <option value="medium">{t("prioMedium")}</option>
                <option value="high">{t("prioHigh")}</option>
              </Select>

              <Btn kind="primary" type="submit" disabled={sending} style={{ marginTop: 14 }}>
                {sending ? t("sending") : t("send")}
              </Btn>
            </form>
          </div>

          {/* My tickets */}
          {myTickets.length > 0 && (
            <div className="support-my-tickets">
              <h2 className="h2">{t("myTickets")}</h2>
              <div className="support-ticket-list">
                {myTickets.map((tk, i) => (
                  <div key={tk.id} className="support-ticket-card fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="support-ticket-header">
                      <span className="support-ticket-subject">{tk.subject}</span>
                      <Pill kind={prioPill(tk.priority)}>{tk.priority}</Pill>
                    </div>
                    <div className="support-ticket-body">{tk.message}</div>
                    <div className="support-ticket-footer">
                      <Pill kind={statusPill(tk.status)}>{statusLabel(tk.status)}</Pill>
                      <span className="tiny muted">{tk.created ? new Date(tk.created).toLocaleDateString() : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: FAQ + Social */}
        <div className="support-right slide-up" style={{ animationDelay: ".12s" }}>
          {/* FAQ */}
          <div className="support-faq-section">
            <h2 className="h2">{t("faqTitle")}</h2>
            <div className="faq-list">
              {faqItems.map((item, i) => (
                <div key={i} className={`faq-item ${openFaq === i ? "faq-item--open" : ""}`}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <div className="faq-question">
                    <span className="faq-num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="faq-q-text">{item.q}</span>
                    <span className={`faq-chevron ${openFaq === i ? "faq-chevron--open" : ""}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  </div>
                  <div className={`faq-answer ${openFaq === i ? "faq-answer--visible" : ""}`}>
                    {item.a}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social — minimalist */}
          <div className="support-social-section">
            <h2 className="h2">{t("socialTitle")}</h2>
            <div className="social-mini-links">
              <a href="https://kzl.nis.edu.kz/" target="_blank" rel="noopener noreferrer" className="social-mini" title="kzl.nis.edu.kz">
                <img src="/logo-nis.png" alt="NIS" className="social-mini__logo" />
                <span>kzl.nis.edu.kz</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="social-mini__arrow"><path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
              <a href="https://www.youtube.com/@NISKyzylorda" target="_blank" rel="noopener noreferrer" className="social-mini" title="YouTube">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.5 6.19a3 3 0 00-2.11-2.13C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.39.56A3 3 0 00.5 6.19 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.81 3 3 0 002.11 2.13c1.89.56 9.39.56 9.39.56s7.5 0 9.39-.56a3 3 0 002.11-2.13A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" /></svg>
                <span>YouTube</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="social-mini__arrow"><path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
              <a href="https://www.instagram.com/nis_qyzylorda/" target="_blank" rel="noopener noreferrer" className="social-mini" title="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="ig" x1="0" y1="24" x2="24" y2="0"><stop offset="0%" stopColor="#F77737" /><stop offset="50%" stopColor="#E1306C" /><stop offset="100%" stopColor="#833AB4" /></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig)" strokeWidth="2" /><circle cx="12" cy="12" r="5" stroke="url(#ig)" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.5" fill="url(#ig)" /></svg>
                <span>Instagram</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="social-mini__arrow"><path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------- PageAdminSupport (admin: ticket list + status toggle) ---------- */
function PageAdminSupport() {
  const st = useStore();
  const u = st.userDoc;
  const tickets = st.allTickets || [];
  const [filter, setFilter] = useState("all");
  const [updating, setUpdating] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  if (!canAccess("admin/support", u)) return <Guard />;

  const filtered = filter === "all" ? tickets : tickets.filter(tk => tk.status === filter);

  const cycleStatus = async (tk) => {
    const next = tk.status === "new" ? "in_progress" : tk.status === "in_progress" ? "done" : "new";
    setUpdating(tk.id);
    try {
      await updateTicketStatus(tk.id, next);
      const updated = await fetchAllTickets();
      setState({ allTickets: updated });
    } catch (e) {
      toast(e?.message || t("error"), "error");
    } finally {
      setUpdating(null);
    }
  };

  const prioPill = (p) => p === "high" ? "rejected" : p === "medium" ? "pending" : "approved";
  const statusLabel = (s) => s === "done" ? t("ticketDone") : s === "in_progress" ? t("ticketInProgress") : t("ticketNew");

  const users = st.users || [];
  const userName = (uid) => { const uu = users.find(x => x.uid === uid); return uu ? (uu.displayName || uu.email) : uid; };

  const counts = { new: tickets.filter(t => t.status === "new").length, in_progress: tickets.filter(t => t.status === "in_progress").length, done: tickets.filter(t => t.status === "done").length };

  return (
    <div className="page-admin-support fade-in">
      <h1 className="h1">{t("adminSupportTitle")}</h1>
      <p className="p muted">{t("adminSupportDesc")}</p>

      {/* Stats pills */}
      <div className="admin-support-stats slide-up">
        <div className="admin-support-stat admin-support-stat--new" onClick={() => setFilter("new")}>
          <span className="admin-support-stat__num">{counts.new}</span>
          <span className="admin-support-stat__label">{t("ticketNew")}</span>
        </div>
        <div className="admin-support-stat admin-support-stat--progress" onClick={() => setFilter("in_progress")}>
          <span className="admin-support-stat__num">{counts.in_progress}</span>
          <span className="admin-support-stat__label">{t("ticketInProgress")}</span>
        </div>
        <div className="admin-support-stat admin-support-stat--done" onClick={() => setFilter("done")}>
          <span className="admin-support-stat__num">{counts.done}</span>
          <span className="admin-support-stat__label">{t("ticketDone")}</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="support-filter-bar slide-up" style={{ animationDelay: ".08s" }}>
        {["all", "new", "in_progress", "done"].map(f => (
          <button key={f} className={`support-filter-btn ${filter === f ? "support-filter-btn--active" : ""}`}
            onClick={() => setFilter(f)}>
            {f === "all" ? t("all") : f === "new" ? t("ticketNew") : f === "in_progress" ? t("ticketInProgress") : t("ticketDone")}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="admin-support-empty slide-up">
          <Icon name="check" />
          <p>{t("noTickets")}</p>
        </div>
      ) : (
        <div className="admin-ticket-list">
          {filtered.map((tk, i) => {
            const isExpanded = expandedId === tk.id;
            return (
              <div key={tk.id} className={`admin-ticket-card admin-ticket-card--${tk.status} fade-in`} style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="admin-ticket-top" onClick={() => setExpandedId(isExpanded ? null : tk.id)} style={{ cursor: "pointer" }}>
                  <div className="admin-ticket-left-strip" />
                  <div style={{ flex: 1 }}>
                    <div className="admin-ticket-subject">{tk.subject}</div>
                    <div className="tiny muted">{userName(tk.uid)} · {tk.created ? new Date(tk.created).toLocaleDateString() : ""}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Pill kind={prioPill(tk.priority)}>{tk.priority}</Pill>
                    <span className={`faq-chevron ${isExpanded ? "faq-chevron--open" : ""}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  </div>
                </div>
                <div className={`admin-ticket-expand ${isExpanded ? "admin-ticket-expand--open" : ""}`}>
                  <div className="admin-ticket-body">{tk.message}</div>
                  <div className="admin-ticket-meta">
                    <span className="tiny muted">{tk.authorEmail}</span>
                  </div>
                </div>
                <div className="admin-ticket-bottom">
                  <div className="admin-ticket-status-toggle" onClick={() => cycleStatus(tk)}>
                    <div className={`status-switch status-switch--${tk.status}`}>
                      <div className="status-switch__track">
                        <div className="status-switch__thumb" />
                      </div>
                      <span className="status-switch__label">
                        {updating === tk.id ? "..." : statusLabel(tk.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** ---------- admin announcements page ---------- */
const EMOJI_OPTIONS = ["📢", "🎉", "⚠️", "📅", "🏆", "📚", "🔔", "💡", "🎓", "⭐", "🚀", "❗", "✅", "📝", "🎯", "💪"];

function PageAdminAnnouncements() {
  const st = useStore();
  const u = st.userDoc;
  const announcements = st.announcements || [];
  const [emoji, setEmoji] = useState("📢");
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [linkText, setLinkText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(null);

  if (!canAccess("admin/announcements", u)) return <Guard />;

  const handleCreate = async () => {
    if (!text.trim()) { toast(t("annTextRequired"), "error"); return; }
    if (!startDate || !endDate) { toast(t("annDatesRequired"), "error"); return; }
    if (new Date(endDate) < new Date(startDate)) { toast(t("annEndBeforeStart"), "error"); return; }
    setSending(true);
    try {
      await createAnnouncement({ emoji, text: text.trim(), link: (link.trim() ? (linkText.trim() || link.trim()) + "||" + link.trim() : ""), startDate, endDate });
      const fresh = await fetchAnnouncements();
      setState({ announcements: fresh });
      setText(""); setLink(""); setLinkText(""); setStartDate(""); setEndDate("");
      toast(t("annCreated"), "ok");
    } catch (e) {
      toast(e?.message || t("error"), "error");
    } finally { setSending(false); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteAnnouncement(id);
      const fresh = await fetchAnnouncements();
      setState({ announcements: fresh });
      toast(t("annDeleted"), "ok");
    } catch (e) {
      toast(e?.message || t("error"), "error");
    } finally { setDeleting(null); }
  };

  const now = new Date().toISOString().slice(0, 10);
  const isActive = (a) => a.startDate <= now && a.endDate >= now;

  return (
    <div className="page-admin-announcements fade-in">
      <h1 className="h1">{t("annPageTitle")}</h1>
      <p className="p muted">{t("annPageDesc")}</p>

      <div className="ann-columns">
        {/* Left: Create form */}
        <div className="ann-col-left">
          <div className="ann-form glass slide-up">
            <h2 className="h2">{t("annNewTitle")}</h2>

            <label className="label">{t("annEmojiLabel")}</label>
            <div className="ann-emoji-grid">
              {EMOJI_OPTIONS.map(e => (
                <button key={e} type="button" className={`ann-emoji-btn ${emoji === e ? "ann-emoji-btn--active" : ""}`} onClick={() => setEmoji(e)}>{e}</button>
              ))}
            </div>

            <label className="label">{t("annTextLabel")}</label>
            <Textarea value={text} onChange={e => setText(e.target.value)} placeholder={t("annTextPlaceholder")} rows={2} />

            <div className="ann-row">
              <div className="ann-field">
                <label className="label">{t("annLinkLabel")}</label>
                <Input value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." />
              </div>
              <div className="ann-field">
                <label className="label">{t("annLinkTextLabel")}</label>
                <Input value={linkText} onChange={e => setLinkText(e.target.value)} placeholder={t("annLinkTextPlaceholder")} />
              </div>
            </div>

            <div className="ann-row">
              <div className="ann-field">
                <label className="label">{t("annStartDate")}</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="ann-field">
                <label className="label">{t("annEndDate")}</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>

            {/* Preview */}
            {text.trim() && (
              <div className="ann-preview">
                <label className="label">{t("preview")}</label>
                <div className="ann-banner-preview">
                  <span className="ann-banner__emoji">{emoji}</span>
                  <span className="ann-banner__text">{text}</span>
                  {link.trim() && <a className="ann-banner__link" href={link} target="_blank" rel="noopener noreferrer">{linkText || link}</a>}
                </div>
              </div>
            )}

            <Btn kind="primary" onClick={handleCreate} disabled={sending} style={{ marginTop: 12 }}>
              {sending ? "..." : t("send")}
            </Btn>
          </div>
        </div>

        {/* Right: List */}
        <div className="ann-col-right">
          <h2 className="h2">{t("annListTitle")} ({announcements.length})</h2>
          {announcements.length === 0 ? (
            <p className="p muted">{t("annEmpty")}</p>
          ) : (
            <div className="ann-list">
              {announcements.map((a, i) => {
                const active = isActive(a);
                const parsedLink = (a.link || "").includes("||") ? a.link.split("||") : [a.link, a.link];
                return (
                  <div key={a.id} className={`ann-card glass fade-in ${active ? "ann-card--active" : "ann-card--inactive"}`} style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className="ann-card__top">
                      <span className="ann-card__emoji">{a.emoji}</span>
                      <span className="ann-card__text">{a.text}</span>
                      <Pill kind={active ? "approved" : "rejected"}>{active ? t("annActive") : t("annInactive")}</Pill>
                    </div>
                    {a.link && (
                      <div className="ann-card__link tiny">
                        <a href={parsedLink[1]} target="_blank" rel="noopener noreferrer">{parsedLink[0]}</a>
                      </div>
                    )}
                    <div className="ann-card__meta tiny muted">
                      {a.startDate} — {a.endDate}
                      {a.created && <span> · {new Date(a.created).toLocaleDateString()}</span>}
                    </div>
                    <button className="ann-card__del" onClick={() => handleDelete(a.id)} disabled={deleting === a.id} title={t("delete")}>
                      {deleting === a.id ? "..." : <Icon name="x" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** ---------- announcement banner (shown to all users) ---------- */
function AnnouncementBanner() {
  const st = useStore();
  const announcements = st.announcements || [];
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kpi_ann_dismissed") || "[]"); } catch { return []; }
  });

  const now = new Date().toISOString().slice(0, 10);
  const active = announcements.filter(a => a.startDate <= now && a.endDate >= now && !dismissed.includes(a.id));

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try { localStorage.setItem("kpi_ann_dismissed", JSON.stringify(next)); } catch { }
  };

  if (!active.length || !st.userDoc) return null;

  return (
    <div className="ann-banners-wrap">
      {active.map(a => {
        const parsedLink = (a.link || "").includes("||") ? a.link.split("||") : [a.link, a.link];
        return (
          <div key={a.id} className="ann-banner slide-down">
            <div className="ann-banner__content">
              <span className="ann-banner__emoji">{a.emoji}</span>
              <span className="ann-banner__text">{a.text}</span>
              {a.link && <a className="ann-banner__link" href={parsedLink[1]} target="_blank" rel="noopener noreferrer">{parsedLink[0]}</a>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

async function hydrateForUser(userDoc) {
  if (!userDoc) return;
  // Wrap each fetch so one failure doesn't break all data loading
  const safe = (fn, fallback = []) => fn().catch(e => { console.warn("hydrate fetch failed:", e?.message); return fallback; });
  let hasError = false;
  const onErr = (e) => { if (!hasError) { hasError = true; console.error(e); toast(e?.message || t("error"), "error"); } return []; };

  try {
    if (userDoc.role === "admin") {
      const [types, users, pend, recent, pendReq, recentReq, allDocs, newsData, ticketsData, announcementsData] = await Promise.all([
        safe(() => fetchTypesAll()),
        safe(() => fetchUsersAll()),
        safe(() => fetchPendingSubmissions()),
        safe(() => fetchAdminRecentSubs()),
        safe(() => fetchPendingRequests()),
        safe(() => fetchAdminRecentRequests()),
        safe(() => fetchAllDocuments()),
        safe(() => fetchNewsAll()),
        safe(() => fetchAllTickets()),
        safe(() => fetchAnnouncements())
      ]);
      setState({
        types,
        users,
        pendingSubmissions: pend,
        adminRecentSubs: recent,
        pendingRequests: pendReq,
        adminRecentRequests: recentReq,
        allDocuments: allDocs,
        news: newsData,
        allTickets: ticketsData,
        announcements: announcementsData,
        mySubmissions: [],
        myRequests: [],
        myDocuments: [],
        myTickets: []
      });
    } else {
      // teacher: нужен и личный набор, и общая выборка для рейтинга/общей статистики
      const [types, my, myReq, myDocs, myTDocs, users, recent, newsData, myTix, announcementsData] = await Promise.all([
        safe(() => fetchTypesActive()),
        safe(() => fetchMySubmissions(userDoc.uid)),
        safe(() => fetchMyRequests(userDoc.uid)),
        safe(() => fetchDocumentsForTeacher(userDoc.uid)),
        safe(() => fetchMyTeacherDocs(userDoc.uid)),
        safe(() => fetchUsersAll()),
        safe(() => fetchAdminRecentSubs()),
        safe(() => fetchNewsAll()),
        safe(() => fetchMyTickets(userDoc.uid)),
        safe(() => fetchAnnouncements())
      ]);
      setState({
        types,
        mySubmissions: my,
        myRequests: myReq,
        myDocuments: myDocs,
        myTeacherDocs: myTDocs,
        users,
        adminRecentSubs: recent,
        news: newsData,
        myTickets: myTix,
        announcements: announcementsData,
        pendingSubmissions: [],
        pendingRequests: [],
        adminRecentRequests: [],
        allDocuments: [],
        allTickets: []
      });
    }
  } catch (e) {
    onErr(e);
  }
}


async function bootstrap() {
  setupMobileDrawer();
  applyTheme(store.state.theme);
  applyAccessibility(getDefaultAccessibility());
  // Debounced render on hash changes to avoid flooding React with 20+ root.render() calls
  let _renderTimer = null;
  window.addEventListener("hashchange", () => {
    if (_renderTimer) cancelAnimationFrame(_renderTimer);
    _renderTimer = requestAnimationFrame(() => { _renderTimer = null; render().catch(console.error); });
  });

  // Check if already authenticated (from localStorage token)
  if (pb.authStore.isValid) {
    try {
      setState({ booting: true });
      const authData = await pb.collection("users").authRefresh();
      const userDoc = normalizeUser(authData.record);
      setState({ authUser: userDoc, userDoc });

      // Load user's accessibility + theme preferences
      const savedAcc = userDoc.accessibility || getDefaultAccessibility();
      applyAccessibility(savedAcc);
      if (userDoc.preferredTheme) applyTheme(userDoc.preferredTheme);

      await hydrateForUser(userDoc);

      // Mark user online + start heartbeat
      await setUserOnline(userDoc.id, true);
      if (window.__kpiHeartbeat) clearInterval(window.__kpiHeartbeat);
      window.__kpiHeartbeat = setInterval(() => {
        if (pb.authStore.isValid) setUserOnline(pb.authStore.record.id, true);
      }, 60000);

      // Auto-redirect new employees to onboarding
      if (userDoc.onboarded !== true && userDoc.role !== "admin") {
        navigate("onboarding");
      }
    } catch (e) {
      // Token expired or invalid
      pb.authStore.clear();
      console.error(e);
    }
  }

  setState({ booting: false });

  // Listen for future auth changes
  pb.authStore.onChange(async (token, model) => {
    if (!token || !model) {
      // Logged out
      if (window.__kpiHeartbeat) { clearInterval(window.__kpiHeartbeat); window.__kpiHeartbeat = null; }
      setState({
        authUser: null,
        userDoc: null,
        types: [],
        users: [],
        mySubmissions: [],
        pendingSubmissions: [],
        adminRecentSubs: [],
        myRequests: [],
        pendingRequests: [],
        adminRecentRequests: [],
        myDocuments: [],
        allDocuments: [],
        myTeacherDocs: [],
        news: [],
        myTickets: [],
        allTickets: [],
        announcements: []
      });
      render();
      return;
    }
    // Logged in
    const userDoc = normalizeUser(model);
    setState({ authUser: userDoc, userDoc });
    const savedAcc = userDoc.accessibility || getDefaultAccessibility();
    applyAccessibility(savedAcc);
    if (userDoc.preferredTheme) applyTheme(userDoc.preferredTheme);
    await hydrateForUser(userDoc);
    await setUserOnline(userDoc.id, true);
    if (window.__kpiHeartbeat) clearInterval(window.__kpiHeartbeat);
    window.__kpiHeartbeat = setInterval(() => {
      if (pb.authStore.isValid) setUserOnline(pb.authStore.record.id, true);
    }, 60000);
    if (userDoc.onboarded !== true && userDoc.role !== "admin") {
      navigate("onboarding");
    }
    setState({ booting: false });
    render();
  });

  // Presence: mark offline on tab close / hide
  document.addEventListener("visibilitychange", () => {
    if (pb.authStore.isValid) {
      setUserOnline(pb.authStore.record.id, document.visibilityState === "visible");
    }
  });
  window.addEventListener("beforeunload", () => {
    if (pb.authStore.isValid) setUserOnline(pb.authStore.record.id, false);
  });

  // ensure default hash route
  try { if (!location.hash || location.hash === "#" || location.hash === "#/") { location.hash = "#/login"; } } catch (e) { }
  render();
}

bootstrap().catch(console.error);

// debug
window.__KPI__ = { pb, store, navigate };
