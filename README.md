# KPI Platform (Plain HTML)

**KPI Platform** — демо веб‑платформа для работы с KPI: хранение данных, просмотр метрик и управление заявками. Текущая версия работает без сборщика — это чистые **HTML/CSS/JS** файлы, которые можно открыть напрямую в браузере.

<p align="center">
  <img alt="KPI Platform" src="https://img.shields.io/badge/KPI-Platform-blue" />
  <img alt="Plain HTML" src="https://img.shields.io/badge/HTML-CSS-JS-orange" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-green" />
</p>

---

## ⚙️ Запуск без Node.js

### Вариант 1 — просто открыть файл
1. Откройте `index.html` в браузере.
2. Для Firebase‑логина желательно использовать локальный сервер (см. ниже), чтобы не блокировались модульные импорты.

### Вариант 2 — локальный сервер
Запускайте сервер **из корня репозитория**, чтобы пути `/js/*` резолвились корректно:

```bash
python -m http.server 8000
```

После этого откройте `http://127.0.0.1:8000/`.

---

## 🧱 Структура проекта

- `index.html` — главная страница
- `styles.css` — стили интерфейса
- `js/main.js` — точка входа приложения
- `js/render.js` — рендер и UI‑логика
- `js/api.js` — работа с Firestore/Storage
- `js/state.js` — общее состояние/роутинг
- `js/utils.js` — утилиты и графики
- `js/firebase-config.js` — конфиг Firebase
- `firestore.rules` / `storage.rules` — примеры правил безопасности (если понадобится Firebase)

---

## 🤝 Вклад

Нашёл баг или хочешь улучшить проект — создавай **issue** или **pull request**.

---

## 📄 Лицензия

Проект распространяется по лицензии **MIT**. Подробности — в файле `LICENSE`.
