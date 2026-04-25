# AI Trade Summary — Setup

LLM-powered per-trade analysis. Combines:

- Trade data (entry/exit/SL/TP, lots, R:R, emotion, notes, strategy)
- Vision: chart screenshots from `/uploads/*` (up to 4 per call)
- Macro snapshot (FRED: Fed rate, CPI, 10Y, 2Y, DXY, unemployment + derived 2s10s curve & real rate)
- Trader stats: rolling 50-trade winrate, avg planned R:R, win/loss split

Output: structured JSON (executive summary, score 0–100 + grade, observations with evidence,
chart analysis, macro context, suggestions, risk flags).

## Files

- `src/lib/ai/client.ts` — Singleton Anthropic client + `localImageToContentBlock()` for vision
- `src/lib/ai/macro-snapshot.ts` — Server-side FRED snapshot + prompt formatter
- `src/app/api/ai/trade-summary/route.ts` — POST endpoint (`{ tradeId, includeScreenshots? }`)
- `src/components/AITradeSummaryModal.tsx` — UI modal with score gauge, sections, retry
- Wired in `src/app/(app)/journal/page.tsx` (Sparkles icon button, both card and table view)

## Env vars

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929   # optional override
FRED_API_KEY=...                             # optional but recommended for macro context
```

If `ANTHROPIC_API_KEY` is missing, the endpoint returns 503 with code `ANTHROPIC_API_KEY_MISSING`
and the modal shows a friendly setup hint. Existing rule-based `/api/ai/trade-review` keeps working.

## Cost / latency

- System prompt is cached (`cache_control: ephemeral`) → ~80% cheaper on repeated analyses.
- Default model `claude-sonnet-4-5` with vision. ~3–6s for one trade with 0–2 screenshots.
- Capped at 4 screenshots per request to keep tokens predictable.

## Testing locally

```bash
# 1) Add ANTHROPIC_API_KEY to .env
# 2) Restart dev server
npm run dev
# 3) Open /journal → click the Sparkles icon on any trade
```
