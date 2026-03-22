# Logic Audit Report — MarketPhase

**Date**: 2026-03-22
**Scope**: Trade calculations, useTrades hook, API routes, Dashboard, Community page

---

## BUG 1 — Stale closure in `deleteTrade` optimistic rollback

**File**: `src/hooks/useTrades.tsx`, line 112
**What's wrong**: `deleteTrade` captures `trades` from the render-time closure to use as a rollback snapshot. However, because `trades` is listed in the dependency array of `useCallback` (line 125), a new function is created every time `trades` changes. This means every component consuming `deleteTrade` re-renders on every trade list change, defeating memoization. More critically, if two rapid deletions happen before the first re-render, the second call captures the original array (before the first optimistic removal), so a rollback of the second delete would **restore the first-deleted trade** as a ghost entry.

**Impact**: Bulk rapid deletions can restore already-deleted trades in the UI on a single API failure. Excessive re-renders on every trade list change.

**Fix**: Use a ref (`useRef`) to track the latest trades for rollback instead of closing over the state variable. Remove `trades` from the dependency array. Same issue exists in `bulkDeleteTrades` (line 129).

---

## BUG 2 — `profitFactor` serializes to `Infinity` in JSON

**File**: `src/lib/utils.ts`, line 55
**What's wrong**: When `grossLosses === 0` and `grossWins > 0`, `profitFactor` is set to `Infinity`. Line 85 does `parseFloat(profitFactor.toFixed(2))`, but `Infinity.toFixed(2)` returns `"Infinity"` and `parseFloat("Infinity")` returns `Infinity`. When this value is serialized to JSON via `NextResponse.json()`, `Infinity` becomes `null` (per JSON spec), which can cause `NaN` in downstream arithmetic or crashes in chart libraries expecting a number.

**Impact**: Dashboard cards and analytics pages can display `NaN` or crash when a user has only winning trades (zero losses).

**Fix**: Cap `profitFactor` to a finite sentinel value, e.g. `const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 999 : 0;` (the gamification route already does this correctly with `999`).

---

## BUG 3 — `startOfWeek()` returns wrong date on Sundays

**File**: `src/app/api/challenges/route.ts`, line 49
**What's wrong**: `d.setDate(d.getDate() - d.getDay() + 1)` computes Monday. On Sunday (`getDay() === 0`), this evaluates to `currentDate - 0 + 1 = currentDate + 1`, which is **next Monday** — a date in the future. All weekly challenge computations will then filter trades with `date >= nextMonday`, returning zero trades, making weekly challenges appear incomplete even when they are met.

**Impact**: Every Sunday, all weekly challenges (win streak, discipline, morning trader) show 0% progress and cannot be completed.

**Fix**: Handle Sunday explicitly: `const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));`

---

## BUG 4 — Forex session classifier has overlapping ranges, drops hours 22-23

**File**: `src/lib/advancedStats.ts`, lines 102-107
**What's wrong**: The `getForexSession` function uses UTC hours with overlapping ranges: Asia is 0-7, London is 7-15, New York is 13-21. Hours 7 overlap (assigned to Asia, not London because `if` short-circuits). Hours 22 and 23 UTC fall through all conditions and return "Hors session", but hour 22 is still active New York session in reality. The main issue: a trade at UTC 7:30 is classified as "Asie" when it should be "Londres" (London opens at 7 or 8 UTC depending on DST).

**Impact**: Trades are misclassified between sessions in the analytics distribution view. The session P&L breakdown will attribute London-open trades to the Asia session.

**Fix**: Prioritize sessions correctly and remove overlaps, or assign to the "dominant" session. A trade at 7 UTC should go to Londres. Restructure the conditionals so London (7-15) is checked before Asia (0-7).

---

## BUG 5 — Stripe webhook `customer.subscription.deleted` cannot find email

**File**: `src/app/api/webhooks/stripe/route.ts`, line 69
**What's wrong**: For `customer.subscription.deleted` events, the code reads `sub.customer_email`. However, the Stripe subscription object does not have a `customer_email` field — only the `checkout.session` object does. The fallback `sub.metadata?.email` only works if the metadata was manually set during subscription creation. In most Stripe integrations, neither field exists on the subscription object, so `customerEmail` will be `undefined` and the user will never be downgraded.

**Impact**: When a customer cancels their subscription, the webhook silently fails to downgrade them from VIP to USER. They retain VIP access indefinitely after cancellation.

**Fix**: Retrieve the customer object from Stripe using `sub.customer` (which is the customer ID), then look up the email from the database or expand the customer object. Alternatively, store the user ID in subscription metadata at checkout time.

---

## BUG 6 — Gamification badge `percentOwned` is non-deterministic (uses `Math.random()`)

**File**: `src/app/api/gamification/route.ts`, lines 211-217
**What's wrong**: The `pct()` helper uses `Math.random()` to generate the "percentage of community that owns this badge". This means every API call returns different values. The response is not cache-friendly, and the UI will show flickering/changing percentages on every re-fetch or page navigation.

**Impact**: Badge rarity percentages change randomly on every page load, confusing users and preventing HTTP caching.

**Fix**: Use a deterministic hash based on the badge ID and a time bucket (e.g., daily) instead of `Math.random()`, or compute actual percentages from the database.

---

## BUG 7 — `computeStats` drawdown does not account for commissions/swaps

**File**: `src/lib/utils.ts`, lines 58-66
**What's wrong**: The `computeStats` drawdown calculation uses `t.result` (raw P&L) but ignores `commission` and `swap` fields. In contrast, `computeDrawdownCurve` in `advancedStats.ts` (line 162) correctly subtracts commissions and swaps. This means the `maxDrawdown` value shown in summary stats understates the real drawdown.

**Impact**: The max drawdown stat on the dashboard is inaccurate — it shows a smaller drawdown than reality for users with significant commission/swap costs.

**Fix**: Change line 62 to `cumulative += t.result - (t.commission || 0) - (t.swap || 0);` — matching the logic in `computeDrawdownCurve`.

---

## BUG 8 — `DashboardCards` shows all-time profit % with "this month" label

**File**: `src/components/DashboardCards.tsx`, lines 17-19, 59
**What's wrong**: `computeStats(trades)` is called with ALL trades (line 17), producing `stats.netProfit` as the all-time net profit. This value is used to compute `profitPercent` (line 19). But the label on line 59 says "this month" (`{t("thisMonth")}`). The percentage displayed is the all-time return, mislabeled as monthly.

**Impact**: Users see an incorrect monthly return percentage — it actually shows the all-time P&L percentage. A user with +50% all-time but -5% this month would see "+50% This Month".

**Fix**: Use `monthlyStats.netProfit` (which is already computed on line 27) instead of `stats.netProfit` for the percentage shown next to the "this month" label.

---

## BUG 9 — Challenges consistency check skips weekends incorrectly

**File**: `src/app/api/challenges/route.ts`, lines 265-284 (`special-consistency-king`)
**What's wrong**: The consecutive-days streak calculation uses `diff === 1` (exactly 1 day apart) to count consecutive trading days. This means if a user trades Mon-Fri but not Sat-Sun (normal behavior), the streak resets to 1 on Monday because Fri-to-Mon is a 3-day gap. It is impossible to achieve a 10-day consecutive streak without trading on weekends.

**Impact**: The "Roi de la Consistance" challenge (10 consecutive trading days) can only be completed by users who also trade on weekends — the challenge is effectively unachievable for forex/stock traders.

**Fix**: Skip weekends in the gap calculation. When computing the streak, treat Friday-to-Monday as a 1-day gap (consecutive) rather than a 3-day gap.

---

## BUG 10 — `calculateRR` ignores trade direction

**File**: `src/lib/utils.ts`, lines 1-6
**What's wrong**: `calculateRR` computes reward as `Math.abs(tp - entry)` and risk as `Math.abs(entry - sl)`. Using absolute values means the R:R is always positive regardless of direction. However, this is only correct if `tp` and `sl` are set on the correct side of `entry` for the trade direction. The function has no way to validate that a SHORT trade has `tp < entry` and `sl > entry`. If a user accidentally enters a SHORT with `tp > entry`, the R:R will appear valid instead of flagging an error.

**Impact**: Misconfigured trades (wrong SL/TP relative to direction) produce plausible-looking R:R values instead of being flagged, leading to incorrect average R:R statistics.

**Fix**: Accept `direction` as a parameter and validate that SL and TP are on the correct side of entry. Return "-" or a warning value when they are inconsistent.

---

## Summary

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | Medium | useTrades.tsx:112 | Stale closure in optimistic delete rollback |
| 2 | High | utils.ts:55 | Infinity profit factor breaks JSON serialization |
| 3 | High | challenges/route.ts:49 | Weekly challenges broken every Sunday |
| 4 | Low | advancedStats.ts:102 | Forex session overlap misclassifies trades |
| 5 | Critical | webhooks/stripe/route.ts:69 | Subscription cancellation never downgrades VIP |
| 6 | Low | gamification/route.ts:211 | Random badge percentages on every request |
| 7 | Medium | utils.ts:58 | Drawdown ignores commissions/swaps |
| 8 | High | DashboardCards.tsx:17-59 | All-time profit mislabeled as monthly |
| 9 | Medium | challenges/route.ts:265 | 10-day streak impossible without weekend trading |
| 10 | Low | utils.ts:1 | R:R doesn't validate direction consistency |
