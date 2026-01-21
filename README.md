
# KPI Platform

**KPI Platform** — веб-платформа для работы с KPI: хранение данных и просмотр метрик с использованием **Firebase** (Firestore/Storage) и правил безопасности.  
Проект собран на **Vite**. Исходники находятся в `src`, конфигурация — в `vite.config.js`. Для окружения используй `.env` (пример — `.env.example`). Правила безопасности лежат в `firestore.rules` и `storage.rules`.

<p align="center">
  <img alt="KPI Platform" src="https://img.shields.io/badge/KPI-Platform-blue" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-ready-646CFF" />
  <img alt="Firebase" src="https://img.shields.io/badge/Firebase-enabled-FFCA28" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-green" />
</p>

---

## ⚙️ Установка и запуск

Требования: **Node.js (LTS)** и **npm**.

Склонируй репозиторий и установи зависимости:

```bash
git clone https://github.com/bibonuwu/KPI_platform.git
cd KPI_platform
npm install
````

Создай `.env` из примера и заполни переменные:

```bash
cp .env.example .env
```

Запуск в режиме разработки:

```bash
npm run dev
```

Сборка и локальный просмотр сборки:

```bash
npm run build
npm run preview
```

---

## 🔥 Firebase

Создай проект в **Firebase Console**, включи **Firestore** и при необходимости **Storage**, добавь **Web App** и перенеси конфигурацию в `.env`.
Файлы правил безопасности в репозитории: `firestore.rules` и `storage.rules`.

Если используешь Firebase CLI:

```bash
npm i -g firebase-tools
firebase login
firebase init
```

Деплой правил:

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```

---

## 🧱 Структура проекта

`src/` — исходники приложения
`index.html` — входная HTML-страница
`vite.config.js` — конфигурация Vite
`.env.example` — пример переменных окружения
`firestore.rules` — правила Firestore
`storage.rules` — правила Storage

---

## 🤝 Вклад

Нашёл баг или хочешь улучшить проект — создавай **issue** или **pull request**.

---

## 📄 Лицензия

Проект распространяется по лицензии **MIT**. Подробности — в файле `LICENSE`.

---

## ⚠️ Примечание

Папку `node_modules/` обычно **не коммитят** в Git — лучше добавить её в `.gitignore`, чтобы репозиторий был легче и чище.

Лицензия: [MIT](./LICENSE)

