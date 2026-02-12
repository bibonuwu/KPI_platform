# KPI Platform — Teacher Rating (React + Vite + Firebase)

## Запуск
```bash
npm i
npm run dev
```
Открой: http://localhost:5173/#/login

## Firebase
Включи:
- Auth → Email/Password
- Firestore
- Storage

Приложение подключает Firebase через CDN ESM:
`https://www.gstatic.com/firebasejs/10.12.5/...`

## Примечание про индексы
В этой сборке я убрал `where + orderBy` (которые требуют композитных индексов) — сортировка сделана на клиенте.
