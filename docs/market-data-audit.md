# Market Data Audit Report

**Date:** 2026-03-22
**Audited by:** Claude (automated code audit)
**Project:** ProTrade Journal (MarketPhase)

---

## Summary

| # | Page | Status | Data Source | Issues |
|---|------|--------|-------------|--------|
| 1 | COT Report | WORKING | CFTC Socrata API (free, no key) | None |
| 2 | Macro | FALLBACK DATA | FRED API + hardcoded defaults | Heavy hardcoded fallback data |
| 3 | Calendar Eco | WORKING (with fallback) | Forex Factory + Finnhub | Static fallback in page + API |
| 4 | News | WORKING | Finnhub + 6 RSS feeds | Depends on Finnhub API key |
| 5 | Market Data | WORKING | MarketData.app (paid) | Requires MARKETDATA_API_KEY |
| 6 | Watchlist | WORKING | MarketData.app quotes | Requires MARKETDATA_API_KEY |
| 7 | Volatility | WORKING (with fallback) | CBOE CSV + Yahoo + mock | Large mock data block in page |
| 8 | Earnings | WORKING (with fallback) | Finnhub earnings calendar | Fallback generates fake earnings |
| 9 | Sentiment | WORKING | alternative.me FNG + VIX + live-prices | Composite fallback calculation |
| 10 | Currency Strength | WORKING | open.er-api.com (free) | Fallback hardcoded strengths |
| 11 | LBMA Metals | WORKING | LBMA official JSON (free) | None |
| 12 | Scanner | WORKING | live-prices + currency-strength APIs | Signal algo is basic/heuristic |
| 13 | Sector Heatmap | WORKING | MarketData.app + Yahoo Finance | Requires MARKETDATA_API_KEY |
| 14 | Options Flow | PLACEHOLDER | None | Coming soon page only |

**Configured API Keys (from .env):**
- `NEXT_PUBLIC_FRED_API_KEY` -- configured
- `NEXT_PUBLIC_FINNHUB_API_KEY` -- configured
- `MARKETDATA_API_KEY` -- configured

---

## Detailed Audit

### 1. COT Report (`/cot`)

**Status: WORKING**

- **Page:** `src/app/(app)/cot/page.tsx`
- **API:** No dedicated API route. Client-side fetch via `@/lib/market/cot.ts`
- **External Source:** `https://publicreporting.cftc.gov/resource/6dca-aqww.json` (CFTC Socrata open data)
- **Data Flow:** Page imports `fetchCotData()` which calls CFTC Socrata directly from the client
- **API Key Required:** No (open data)
- **Contracts Covered:** 30+ contracts (forex, indices, metals, energy, agriculture, bonds)
- **Issues:** None. Data is live from CFTC, no fallback needed.
- **Recommendation:** Consider server-side caching to reduce CFTC API calls. CORS may be an issue in some environments.

---

### 2. Macro (`/macro`)

**Status: FALLBACK DATA**

- **Page:** `src/app/(app)/macro/page.tsx`
- **API:** `/api/fred` -> `src/app/api/fred/route.ts`
- **External Source:** `https://api.stlouisfed.org/fred/series/observations`
- **Data Flow:** Page uses `fetchMultipleFredSeries()` from `@/lib/market/fred.ts` which calls `/api/fred`
- **API Key Required:** Yes (`NEXT_PUBLIC_FRED_API_KEY` / `FRED_API_KEY`) -- configured
- **FRED Series Used:** FED_RATE, CPI, TREASURY_10Y, TREASURY_2Y, DXY, UNEMPLOYMENT

**Issues (CRITICAL):**
1. **Massive hardcoded fallback data in the page file:** Lines 39-94 contain hardcoded "March 2026" data for:
   - `CENTRAL_BANK_RATES` -- 6 banks with specific rates, dates (e.g., "4.25-4.50%", "19 mars 2026")
   - `INFLATION_DATA_DEFAULT` -- 5 countries with CPI values
   - `BOND_YIELDS_DEFAULT` -- US, DE, UK yield curves with specific values
   - `DXY_DATA_DEFAULT` -- Dollar index at 104.2 with correlations
   - `PMI_DATA` -- 6 countries with manufacturing/services PMI values
2. The FRED API only covers a subset (FED_RATE, CPI, TREASURY_10Y, TREASURY_2Y, DXY, UNEMPLOYMENT). Central bank rates for BCE, BoE, BoJ, PBoC, RBA are entirely hardcoded.
3. PMI data is 100% hardcoded with no API source.
4. Correlation data is hardcoded.

**Recommendation:**
- Add API sources for non-US central bank rates (or scrape from trading economics)
- PMI data should come from an API (Finnhub economic calendar or similar)
- Mark clearly which data is live vs static
- At minimum, add a "last updated" indicator for hardcoded data

---

### 3. Calendar Eco (`/calendar-eco`)

**Status: WORKING (with fallback)**

- **Page:** `src/app/(app)/calendar-eco/page.tsx`
- **API:** `/api/calendar` -> `src/app/api/calendar/route.ts`
- **External Sources:**
  1. **Primary:** `https://nfs.faireconomy.media/ff_calendar_thisweek.json` (Forex Factory mirror, free, no key)
  2. **Secondary:** `https://finnhub.io/api/v1/calendar/economic` (Finnhub, requires key)
- **Cache:** 15 minutes in-memory
- **API Key Required:** Finnhub key for secondary source

**Issues:**
1. **Double fallback system:** The page itself (`generateStaticFallback()` at line 66) has ~25 hardcoded economic events. The API route also has its own `generateStaticEvents()` fallback with similar hardcoded data.
2. The page-level static fallback generates events relative to the current week, so it always looks "current" even if data is fake -- potentially misleading.
3. Forex Factory mirror (`faireconomy.media`) is a third-party service with no SLA.

**Recommendation:**
- Remove the page-level `generateStaticFallback()` and rely solely on the API route's fallback chain
- Show a clear "fallback data" indicator when using static events
- Test if `faireconomy.media` is still returning data reliably

---

### 4. News (`/news`)

**Status: WORKING**

- **Page:** `src/app/(app)/news/page.tsx`
- **API:** `/api/news` -> `src/app/api/news/route.ts`
- **External Sources (7 total):**
  1. Finnhub general news (`finnhub.io/api/v1/news`, requires key)
  2. CNBC RSS (`search.cnbc.com/rs/search/combinedcms/view.xml`)
  3. Google News RSS (French finance)
  4. BBC Business RSS (`feeds.bbci.co.uk/news/business/rss.xml`)
  5. Investing.com RSS (`investing.com/rss/news.rss`)
  6. MarketWatch RSS (`feeds.marketwatch.com/marketwatch/topstories/`)
  7. Reuters RSS (fallback: via Google News filtered search)
- **Cache:** 5 minutes in-memory
- **API Key Required:** Finnhub (optional, but enhances coverage)

**Issues:**
1. Reuters retired their public RSS feed. The fallback via Google News works but is not reliable.
2. Investing.com may block server-side RSS requests with bot detection.
3. Category classification is keyword-based and may misclassify some articles.
4. No deduplication across sources -- the same story from multiple outlets may appear.

**Recommendation:**
- Add deduplication logic (headline similarity)
- Remove Reuters direct feed attempt (always use the Google News fallback)
- Monitor Investing.com access -- may need proxy or alternative

---

### 5. Market Data (`/market`)

**Status: WORKING**

- **Page:** `src/app/(app)/market/page.tsx`
- **APIs:**
  - `/api/market-data/quotes` -> MarketData.app (`api.marketdata.app/v1/stocks/quotes`)
  - `/api/market-data/candles` -> MarketData.app (`api.marketdata.app/v1/stocks/candles`)
  - `/api/market-data/options` -> MarketData.app (`api.marketdata.app/v1/options/chain`)
- **API Key Required:** Yes (`MARKETDATA_API_KEY`) -- configured
- **Features:** Live quotes for indices (SPY, QQQ, DIA, IWM, VIX) + popular stocks, candle charts, options chains

**Issues:**
1. MarketData.app is a paid service. If the API key expires or hits rate limits, the page shows an error with no fallback.
2. No fallback/mock data at all in quotes, candles, or options routes.
3. VIX is fetched as a stock quote (`VIX` symbol) which may not work the same as the CBOE VIX index.

**Recommendation:**
- Add fallback data for when MarketData.app is unavailable
- Consider the free tier limits for MarketData.app
- Add rate limit tracking

---

### 6. Watchlist (`/watchlist`)

**Status: WORKING**

- **Page:** `src/app/(app)/watchlist/page.tsx`
- **APIs:**
  - `/api/market-data/quotes` -> MarketData.app
  - `/api/news?symbols=...` -> same news API
- **Storage:** LocalStorage for user watchlist items
- **Default list:** 10 stocks (AAPL, MSFT, NVDA, TSLA, GOOGL, AMZN, META, SPY, QQQ, AMD)
- **Features:** Price alerts, correlation detection, relative strength, news per symbol

**Issues:**
1. Same dependency on MarketData.app as the Market page (no fallback).
2. Correlation coefficients are hardcoded (e.g., EUR/USD + GBP/USD = 0.85, SPY + QQQ = 0.91). These are static and not computed from actual data.
3. Alert system is client-side only -- alerts are lost if the browser is closed.

**Recommendation:**
- Compute correlations from actual price history
- Consider server-side alert persistence
- Add fallback quotes for common symbols

---

### 7. Volatility (`/volatility`)

**Status: WORKING (with fallback)**

- **Page:** `src/app/(app)/volatility/page.tsx`
- **APIs:**
  - `/api/market-data/vix` -> CBOE CSV + Yahoo Finance fallback chain
  - `/api/market-data/quotes` -> MarketData.app (for vol instruments + ETFs)
- **VIX Data Flow:**
  1. **Primary:** CBOE official CSV (`cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv`)
  2. **Secondary:** Yahoo Finance
  3. **Tertiary:** Mock data
- **Cache:** 10 minutes

**Issues:**
1. **Large mock data blocks:** Lines 63-96 contain `MOCK_VIX_HISTORY`, `MOCK_IV_HV_DATA`, `MOCK_TERM_STRUCTURE`, and `MOCK_FEAR_INDICATORS`. The page identifies mock data via `source: "mock"` field.
2. IV/HV data (implied vs historical volatility) per stock is hardcoded in `MOCK_IV_HV_DATA`. There is no API to compute real IV rank or IV percentile.
3. Put/Call ratio, VVIX, SKEW index are hardcoded in `MOCK_FEAR_INDICATORS`.
4. Term structure data relies on VIX API returning it -- only CBOE source provides full term structure.

**Recommendation:**
- The CBOE CSV source is good and free. Monitor for availability changes.
- Add real IV/HV calculation from options data (use MarketData.app options endpoint)
- Fetch put/call ratio from a live source
- Clearly label which data sections are live vs mock

---

### 8. Earnings (`/earnings`)

**Status: WORKING (with fallback)**

- **Page:** `src/app/(app)/earnings/page.tsx`
- **API:** `/api/earnings` -> `src/app/api/earnings/route.ts`
- **External Source:** `https://finnhub.io/api/v1/calendar/earnings` (Finnhub)
- **API Key Required:** Yes (`FINNHUB_API_KEY`) -- configured
- **Cache:** 1 hour in-memory

**Issues:**
1. **Fallback generates fake earnings** with real company names (AAPL, MSFT, NVDA, etc.) and fabricated estimates. This could mislead users into thinking these are real upcoming earnings.
2. The response includes a `source: "live" | "fallback"` field, and the page tracks `dataSource` -- but the UI may not clearly distinguish live from fallback data.

**Recommendation:**
- Show a prominent warning banner when showing fallback data
- The fallback should say "sample data" not present fake-but-plausible numbers

---

### 9. Sentiment (`/sentiment`)

**Status: WORKING**

- **Page:** `src/app/(app)/sentiment/page.tsx`
- **APIs:**
  - `/api/fear-greed` -> alternative.me Crypto Fear & Greed Index + composite fallback
  - `/api/market-data/vix` -> VIX data
  - `/api/live-prices` -> Forex, crypto, commodities, indices prices
  - `/api/btc-price` -> CoinGecko BTC historical prices
- **External Sources:**
  1. `https://api.alternative.me/fng/` (Crypto F&G, free, no key)
  2. Composite fallback: VIX + SPY change + BTC change -> formula-based F&G score
  3. CoinGecko for BTC chart data
- **Cache:** 1 hour for F&G, 5 minutes for live prices

**Issues:**
1. The Fear & Greed Index from alternative.me is **crypto-specific**, not a general market sentiment indicator. The page presents it alongside stock/VIX data which may confuse users.
2. The composite fallback formula (`50 + spy*8 - (vix-20)*1.5 + btc*2`) is a reasonable approximation but not a standard indicator.
3. CoinGecko free tier has aggressive rate limiting.

**Recommendation:**
- Clearly label that the F&G score is crypto-based
- Consider CNN's Fear & Greed Index as an alternative (requires scraping)
- Add rate limit handling for CoinGecko

---

### 10. Currency Strength (`/currency-strength`)

**Status: WORKING**

- **Page:** `src/app/(app)/currency-strength/page.tsx`
- **API:** `/api/currency-strength` -> `src/app/api/currency-strength/route.ts`
- **External Source:** `https://open.er-api.com/v6/latest/USD` (free exchange rates, no key)
- **Algorithm:** Relative cross-rate strength calculation with log-based normalization
- **Cache:** 5 minutes

**Issues:**
1. Fallback hardcoded strengths at line 156 (`FALLBACK_STRENGTHS`) are static values.
2. The strength calculation is based on **spot rates only** (snapshot), not momentum/change over time. This means two currencies at similar levels will show similar strength even if one is rising and the other falling.
3. Exchange rate API (`open.er-api.com`) updates ~daily, not intraday.
4. Trade suggestions are algorithmic but simplistic (strongest vs weakest).

**Recommendation:**
- Add momentum component (compare current rates vs 24h/1w ago)
- Use a faster-updating forex rate source for intraday data
- Show "updated X minutes ago" prominently since rates are not real-time

---

### 11. LBMA Metals (`/lbma`)

**Status: WORKING**

- **Page:** `src/app/(app)/lbma/page.tsx`
- **API:** `/api/lbma` -> `src/app/api/lbma/route.ts`
- **External Source:** `https://prices.lbma.org.uk/json/*.json` (7 endpoints for gold AM/PM, silver, platinum AM/PM, palladium AM/PM)
- **API Key Required:** No (free public LBMA data)
- **Cache:** 1 hour via Next.js revalidate
- **Data:** Historical fixing prices in USD, GBP, EUR

**Issues:** None significant. LBMA is the official source for precious metals fixing prices.

**Recommendation:**
- The page includes a live fixing countdown timer -- ensure timezone handling is correct for DST transitions.

---

### 12. Scanner (`/scanner`)

**Status: WORKING**

- **Page:** `src/app/(app)/scanner/page.tsx`
- **APIs:**
  - `/api/live-prices` -> Forex (open.er-api.com), Crypto (CoinGecko), Commodities, Indices
  - `/api/currency-strength` -> Relative strength scores
- **Signal Generation:** Client-side computation based on price change % and strength score

**Issues:**
1. Signal generation is basic heuristic (`strength >= 65 && change > 0.05` = buy). No technical analysis.
2. Volume level is estimated from price change magnitude, not actual volume data.
3. Commodities data in `/api/live-prices` appears to come from exchange rates (XAU, WTI computed from forex rates), not real commodity quotes.

**Recommendation:**
- Add actual technical indicators (RSI, MACD, moving averages) for signal quality
- Use real volume data where available
- Clearly label that signals are heuristic, not recommendations

---

### 13. Sector Heatmap (`/sector-heatmap`)

**Status: WORKING**

- **Page:** `src/app/(app)/sector-heatmap/page.tsx`
- **APIs:**
  - `/api/market-data/global-indices` -> Yahoo Finance (with mock fallback)
  - `/api/market-data/quotes` -> MarketData.app for individual stock quotes
- **Sectors Covered:** Technology, Consumer, Finance, Healthcare, Energy, Industrials, Cybersecurity & Cloud, Indices
- **Stocks:** ~55 individual stocks across 8 sectors

**Issues:**
1. Market cap values in `SECTORS` are hardcoded approximations (e.g., AAPL marketCap: 350). These determine tile size in the heatmap but don't reflect real market caps.
2. `global-indices` route has mock fallback data with approximate values.
3. Yahoo Finance is rate-limited and may block server-side requests.
4. Fetching 55+ individual quotes per refresh could hit MarketData.app rate limits.

**Recommendation:**
- Fetch real market cap data or use a sector ETF approach
- Batch quotes more efficiently
- Add prominent "last updated" timestamp

---

### 14. Options Flow (`/flow`)

**Status: PLACEHOLDER**

- **Page:** `src/app/(app)/flow/page.tsx`
- **API:** None
- **Content:** "Coming soon" page with a single icon and French text

**Issues:**
1. Page is a complete placeholder -- no API, no data, no functionality.
2. Still appears in navigation.

**Recommendation:**
- Either implement with a data source (CBOE, unusual whales, or compute from MarketData.app options data)
- Or hide from navigation until ready

---

## API Routes Summary

| Route | External Source | Key Required | Status |
|-------|----------------|-------------|--------|
| `/api/fred` | `api.stlouisfed.org` | FRED_API_KEY | WORKING |
| `/api/calendar` | Forex Factory + Finnhub | Finnhub optional | WORKING |
| `/api/news` | Finnhub + 6 RSS feeds | Finnhub optional | WORKING |
| `/api/earnings` | Finnhub earnings | Finnhub required | WORKING |
| `/api/currency-strength` | `open.er-api.com` | None (free) | WORKING |
| `/api/lbma` | `prices.lbma.org.uk` | None (free) | WORKING |
| `/api/fear-greed` | `alternative.me` + composite | None | WORKING |
| `/api/live-prices` | open.er-api + CoinGecko | None (free) | WORKING |
| `/api/btc-price` | CoinGecko | None (free) | WORKING |
| `/api/market-data/quotes` | `api.marketdata.app` | MARKETDATA_API_KEY | WORKING |
| `/api/market-data/candles` | `api.marketdata.app` | MARKETDATA_API_KEY | WORKING |
| `/api/market-data/options` | `api.marketdata.app` | MARKETDATA_API_KEY | WORKING |
| `/api/market-data/vix` | CBOE CSV + Yahoo | None | WORKING |
| `/api/market-data/global-indices` | Yahoo Finance | None | WORKING (fragile) |
| `/api/market-data/global` | Yahoo Finance | None | WORKING (fragile) |

---

## Critical Issues (Priority Order)

### HIGH PRIORITY

1. **Macro page hardcoded data** -- Central bank rates, PMI, bond yields for non-US countries are entirely hardcoded with "March 2026" values. These will become stale immediately. Users may rely on them for trading decisions.

2. **Earnings fallback generates fake but plausible data** -- Fake EPS estimates and revenue numbers for real companies (AAPL, MSFT, NVDA etc.) could mislead users. The fallback should use clearly fake data or be more prominently labeled.

3. **No fallback for MarketData.app routes** -- If the paid API key expires or service is down, Market Data, Watchlist, and Sector Heatmap pages will all break with no graceful degradation.

### MEDIUM PRIORITY

4. **Calendar Eco has duplicate fallback systems** -- Both the page and the API route generate their own static fallback events. Consolidate to API-only.

5. **Volatility page IV/HV data is entirely mocked** -- IV Rank, IV Percentile, Put/Call ratio, VVIX, SKEW are all hardcoded. These are important trading metrics that should be live.

6. **Yahoo Finance dependency is fragile** -- Both `global-indices` and `global` routes scrape Yahoo Finance, which frequently blocks server-side requests. Mock fallback exists but returns stale approximate data.

7. **Currency Strength uses daily snapshot** -- The `open.er-api.com` rates update once daily. For a forex-focused feature, this is too infrequent.

### LOW PRIORITY

8. **News deduplication missing** -- Same story appears from multiple RSS sources.
9. **Correlation data in Watchlist is hardcoded** -- Should be computed from price history.
10. **Scanner signals are heuristic** -- No technical analysis backing the buy/sell signals.
11. **Options Flow is a placeholder** -- Should be built or hidden from nav.
12. **Sentiment F&G index is crypto-specific** -- May confuse stock-focused users.

---

## External Service Reliability Assessment

| Service | Reliability | Cost | Risk |
|---------|------------|------|------|
| CFTC Socrata (COT) | High | Free | Low -- official government data |
| FRED API | High | Free (with key) | Low -- Federal Reserve data |
| LBMA pricing | High | Free | Low -- official metals data |
| MarketData.app | High | Paid | Medium -- key expiry, rate limits |
| Finnhub | Medium | Free tier | Medium -- rate limits on free tier |
| alternative.me (F&G) | Medium | Free | Medium -- community project |
| open.er-api.com | Medium | Free | Medium -- daily updates only |
| CoinGecko | Medium | Free | Medium -- aggressive rate limiting |
| Yahoo Finance (scraping) | Low | Free | HIGH -- frequently blocks, no SLA |
| Forex Factory mirror | Medium | Free | Medium -- third-party mirror |
| CBOE CSV | Medium-High | Free | Low -- official but may change URL |
| RSS feeds (CNBC, BBC, etc.) | Medium | Free | Medium -- feeds may be deprecated |
