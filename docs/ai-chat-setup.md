# AI Chat Setup

Follow these steps to run the ShanBus Copilot chatbox with your own OpenAI (ChatGPT) API key.

## 1. Backend environment variables

Edit `backend/.env` (or the environment variables in your hosting platform) and add:

```bash
GEMINI_API_KEY=AIza-your-key-here
# Optional overrides
GEMINI_MODEL=gemini-1.5-flash-latest
GEMINI_TEMPERATURE=0.3
GEMINI_MAX_TOKENS=500
```

- `GEMINI_API_KEY` is mandatory. Keep it private and **never** commit it.
- `GEMINI_MODEL`, `GEMINI_TEMPERATURE`, and `GEMINI_MAX_TOKENS` are optional tweaks that fall back to sensible defaults if omitted.

## 2. Install backend dependencies

```bash
cd backend
npm install
```

(This installs the new `openai` client.)

## 3. Start the stacks

```bash
# Backend
cd backend
npm run dev

# Frontend (in a new terminal)
cd frontend
npm run dev
```

The chat widget automatically appears on user-facing pages. Your messages are sent to `POST /api/chat`, which proxies them to Gemini with the key you configured.

## 4. Troubleshooting

- `503 Chưa cấu hình Gemini API key`: the backend did not receive `GEMINI_API_KEY`.
- Slow or empty responses: verify the selected `GEMINI_MODEL` is available for your key and you have remaining quota.
- To disable the widget temporarily, remove `<ChatWidget />` from `frontend/src/layouts/UserLayout.tsx`.
