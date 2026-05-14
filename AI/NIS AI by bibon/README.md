# NIS AI by Bibon

Мини-чат-бот для KPI-платформы NIS. Отвечает на вопросы про сайт — навигация,
функции, кабинеты, рейтинг, документы, мероприятия.

Стек: Firebase Functions + статический сайт. Собственный rule-based движок,
без внешних API, без ключей, без тяжёлых зависимостей. Работает всегда и
бесплатно.

## Как устроено

База знаний — массив `INTENTS` в `functions/index.js`. Каждый интент:
ключевые слова + 1–3 готовых ответа. На запрос:

1. Нормализуем (lowercase, без пунктуации, ё→е).
2. Считаем score: каждое совпавшее ключевое слово даёт 1–3 очка.
3. Берём интент с лучшим score (порог 2). Иначе — fallback.

Поддержка русского, казахского и английского — ключевые слова на всех трёх.

Чтобы добавить новый ответ — допиши блок в `INTENTS`:

```js
{
  id: "my-topic",
  kw: ["ключевое", "слово", "keyword"],
  answers: ["Ответ номер один.", "Альтернативный ответ."],
},
```

## Структура

```
KPI_platform/AI/NIS AI by bibon/
├── public/              ← standalone-сайт чат-бота
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── functions/           ← Cloud Function "chat" (rule-based)
│   ├── index.js         ← база знаний + логика
│   ├── package.json
│   └── node_modules/
└── README.md
```

Сама функция и встроенный виджет деплоятся через корневой
`KPI_platform/firebase.json` — отдельного `firebase.json`/`.firebaserc`
внутри AI-папки нет, всё едет в проект `kpiplatform-85ef9`.

## Развёртывание

Из корня `KPI_platform/`:

```bash
firebase deploy --only functions
```

URL функции после деплоя (Cloud Run v2):
`https://chat-qlebq6gwma-uc.a.run.app`

Виджет в KPI-платформе уже на него настроен (см. `AI_ENDPOINT` в
`src/components.jsx`).

## Проверить, что работает

```bash
curl -X POST https://chat-qlebq6gwma-uc.a.run.app ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Привет\"}]}"
```

Должен вернуться `{"reply":"Привет! Я NIS AI by Bibon — ..."}`.

## Локальная разработка

```bash
cd "AI/NIS AI by bibon/functions"
firebase emulators:start --only functions
```

Эмулятор поднимется на `http://127.0.0.1:5001/kpiplatform-85ef9/us-central1/chat`.
Для теста с эмулятором — временно подменить `AI_ENDPOINT` в `components.jsx`.

## Standalone-сайт (опционально)

`public/index.html` — отдельная страница чат-бота. Можно открыть напрямую в
браузере или захостить где угодно — она ходит на тот же Cloud Function по
полному URL.
