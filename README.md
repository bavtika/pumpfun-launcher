# pump.fun Token Launcher

Веб-интерфейс для деплоя токенов на pump.fun. Доступ по логину; кошельки хранятся в Postgres и видны только своему пользователю.

## Стек

- **client/** — React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand
- **server/** — Express + TypeScript
- **api/** — Vercel serverless entry (тот же Express app)
- npm workspaces, vite proxy `/api` → `:3000`

## Локальный запуск

```bash
npm install
cp .env.example .env   # заполни SITE_PASSWORD, WALLET_ENCRYPTION_KEY, DATABASE_URL, RPC_URL
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:3000

Первый вход: **Register** (username + password + access password из `SITE_PASSWORD`).

## Переменные окружения

| Ключ | Зачем |
| --- | --- |
| `SITE_PASSWORD` | Общий пароль на вход и регистрацию |
| `WALLET_ENCRYPTION_KEY` | Шифрует приватники кошельков в БД (64 hex или фраза ≥16 символов) |
| `DATABASE_URL` | Postgres (Neon / Vercel Postgres) |
| `RPC_URL` | Solana RPC |
| `RUNPOD_ENDPOINT_ID` / `RUNPOD_API_KEY` | GPU vanity (опционально) |

Не коммить `.env` и `.wallets.json`.

## Production (Vercel + Neon + GitHub)

1. Создай **private** GitHub repo и запушь `main`.
2. Создай бесплатную БД [Neon](https://neon.tech) (или Vercel Storage → Postgres) и скопируй `DATABASE_URL`.
3. Import project на [Vercel](https://vercel.com): Root Directory = репозиторий, Framework = Other. `vercel.json` уже задаёт build/output/API rewrite.
4. Environment variables на Vercel (Production + Preview):

   - `SITE_PASSWORD`
   - `WALLET_ENCRYPTION_KEY`
   - `DATABASE_URL`
   - `RPC_URL`
   - `RUNPOD_*` при необходимости

5. Deploy. Таблицы `users` / `sessions` / `wallets` создаются сами при первом запросе.
6. CI: `.github/workflows/ci.yml` гоняет `tsc` + Vite build на каждый push/PR. CD — автодеплой Vercel с GitHub.

## Структура

```
devvv/
├── api/index.ts            # Vercel serverless → Express
├── client/                 # Vite SPA
├── server/src/
│   ├── lib/auth.ts, db.ts, wallets.ts
│   └── routes/             # auth, wallets, deploy, trade, vamp, vanity, earnings
├── vercel.json
└── .github/workflows/ci.yml
```
