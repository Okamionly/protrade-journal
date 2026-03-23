# API Maximization Plan — MarketPhase

> Audit date: 2026-03-23
> Goal: Extract maximum value from existing API keys, then add new free data sources.

---

## PART 1 — EXISTING API AUDIT

### 1.1 Finnhub (`NEXT_PUBLIC_FINNHUB_API_KEY`)

**Currently used (3 endpoints):**
| Endpoint | Route | Data fetched |
|---|---|---|
| `GET /news?category=general` | `/api/news`, `/api/trump-news` | General market news headlines |
| `GET /calendar/earnings` | `/api/earnings` | Earnings calendar (2-week window) |
| `GET /calendar/economic` | `/api/calendar` | Economic events calendar (fallback to ForexFactory) |

**Available but NOT used (free tier, 60 calls/min):**
| Endpoint | Data | Target page | Priority |
|---|---|---|---|
| `GET /stock/insider-sentiment?symbol=X` | Monthly Share Purchase Ratio (MSPR) — aggregated insider buy/sell ratio | `/sentiment`, `/scanner` | HIGH |
| `GET /stock/social-sentiment?symbol=X` | Reddit + Twitter mention counts, positive/negative scores | `/sentiment` | HIGH |
| `GET /calendar/ipo` | IPO calendar (upcoming filings + pricing) | `/earnings` (extend) or new `/ipo` | MEDIUM |
| `GET /forex/candle?symbol=OANDA:EUR_USD&resolution=D` | Forex OHLCV candles (60+ pairs) | `/chart`, `/currency-strength` | HIGH |
| `GET /crypto/candle?symbol=BINANCE:BTCUSDT&resolution=D` | Crypto OHLCV candles | `/chart` | MEDIUM |
| `GET /stock/earnings-quality?symbol=X` | Earnings quality score (accrual-based) | `/earnings` | LOW |
| `GET /stock/recommendation?symbol=X` | Analyst consensus (Buy/Hold/Sell over time) | `/scanner`, `/watchlist` | MEDIUM |
| `GET /scan/support-resistance?symbol=X&resolution=D` | Auto-detected S/R levels | `/chart`, `/daily-bias` | HIGH |
| `GET /stock/peers?symbol=X` | Related stocks for a given ticker | `/compare` | LOW |
| `GET /news?category=forex` | Forex-specific news (vs generic "general") | `/news` | MEDIUM |
| `GET /news?category=crypto` | Crypto-specific news | `/news` | MEDIUM |
| `GET /quote?symbol=X` | Real-time US stock quote (free) | `/live-prices` | MEDIUM |
| `GET /stock/earnings-surprises?symbol=X` | Historical EPS surprises (actual vs estimate) | `/earnings` | MEDIUM |

---

### 1.2 FRED (`NEXT_PUBLIC_FRED_API_KEY`)

**Currently used (10 series via generic proxy):**
GDP, CPIAUCSL, CPILFESL, PAYEMS, UNRATE, FEDFUNDS, DGS10, DGS2, DTWEXBGS, PCEPI

**Available but NOT used (unlimited free, 120 requests/min):**
| Series ID | Name | Target page | Priority |
|---|---|---|---|
| `RSAFS` | Retail Sales (total) | `/macro` | HIGH |
| `RSXFS` | Retail Sales ex-autos | `/macro` | MEDIUM |
| `HOUST` | Housing Starts | `/macro` | HIGH |
| `PERMIT` | Building Permits | `/macro` | MEDIUM |
| `UMCSENT` | U Michigan Consumer Sentiment | `/macro`, `/sentiment` | HIGH |
| `PPIFIS` | PPI (Final Demand) | `/macro` | HIGH |
| `MANEMP` | Manufacturing Employment | `/macro` | LOW |
| `INDPRO` | Industrial Production Index | `/macro` | MEDIUM |
| `CSCICP03USM665S` | Consumer Confidence (OECD) | `/macro` | MEDIUM |
| `T10Y2Y` | 10Y-2Y Spread (yield curve inversion) | `/macro`, `/sentiment` | HIGH |
| `T10YFF` | 10Y minus Fed Funds Rate | `/macro` | MEDIUM |
| `BAMLH0A0HYM2` | ICE BofA High Yield Spread | `/macro`, `/sentiment` | HIGH |
| `DCOILWTICO` | WTI Crude Oil Price (daily) | `/market`, `/live-prices` | MEDIUM |
| `DCOILBRENTEU` | Brent Crude Oil Price (daily) | `/market` | MEDIUM |
| `GOLDAMGBD228NLBM` | Gold Price (London Fix, daily) | `/lbma` complement | LOW |
| `NASDAQCOM` | Nasdaq Composite (daily) | backup for Yahoo fail | LOW |
| `M2SL` | M2 Money Supply | `/macro` | MEDIUM |
| `WALCL` | Fed Balance Sheet (total assets) | `/macro` | MEDIUM |
| `MORTGAGE30US` | 30-Year Mortgage Rate | `/macro` | LOW |
| `VIXCLS` | VIX Close (daily, FRED mirror) | `/volatility` backup | LOW |

**Implementation note:** The FRED API route is already a generic proxy — just add the new series IDs to `FRED_SERIES` in `src/lib/market/constants.ts`. Zero backend work needed.

---

### 1.3 MarketAux (`MARKETAUX_API_KEY`)

**Currently used (1 endpoint):**
- `GET /v1/news/all?search=trump+tariff` in `/api/trump-news` — Filtered news for Trump tracker

**Available but NOT used (free: 100 requests/day):**
| Endpoint | Data | Target page | Priority |
|---|---|---|---|
| Same endpoint, `entities` parameter | Entity detection — returns entities (companies, people, countries) mentioned in articles | `/trump-news`, `/news` | MEDIUM |
| Same endpoint, `sentiment` field | Per-article sentiment score (-1 to +1) already returned but IGNORED | `/trump-news` | HIGH |
| `GET /v1/entity/search?search=AAPL` | Entity-level sentiment aggregation | `/sentiment` | MEDIUM |
| `GET /v1/news/similar/:uuid` | Find related articles | `/news` detail view | LOW |

**Quick win:** MarketAux already returns `sentiment` in its response objects. The current `trump-news` route computes sentiment via keyword-matching instead. Use the API's built-in sentiment for better accuracy.

---

### 1.4 NewsData (`NEWSDATA_API_KEY`)

**Currently used (1 endpoint):**
- `GET /api/1/news?q=trump+tariff&language=en,fr` in `/api/trump-news`

**Available but NOT used (free: 200 credits/day):**
| Endpoint | Data | Target page | Priority |
|---|---|---|---|
| `GET /api/1/news?q=bitcoin+crypto&language=en` | Crypto-specific news | `/news` (crypto tab) | MEDIUM |
| `GET /api/1/news?category=business&language=fr` | French business news | `/news` | MEDIUM |
| `GET /api/1/archive?q=...&from_date=...&to_date=...` | Historical news (paid tier) | N/A | LOW |

---

### 1.5 MarketData.app (`MARKETDATA_API_KEY`)

**Currently used (3 endpoints):**
| Endpoint | Route | Data |
|---|---|---|
| `GET /v1/stocks/candles/{res}/{symbol}` | `/api/market-data/candles` | Stock OHLCV candles |
| `GET /v1/options/chain/{symbol}` | `/api/market-data/options` | Options chain |
| `GET /v1/stocks/quotes/?symbols=X` | `/api/market-data/quotes` | Real-time stock quotes |

**Available but NOT used (free tier: 100 requests/day):**
| Endpoint | Data | Target page | Priority |
|---|---|---|---|
| `GET /v1/stocks/earnings/{symbol}` | Earnings per stock (actual vs estimate + dates) | `/earnings` | MEDIUM |
| `GET /v1/stocks/news/{symbol}` | Stock-specific news | `/news` | LOW |
| `GET /v1/options/expirations/{symbol}` | Available expiration dates | `/flow` | MEDIUM |
| `GET /v1/options/strikes/{symbol}` | Available strike prices | `/flow` | MEDIUM |
| `GET /v1/options/quotes/{optionSymbol}` | Individual option quotes (for flow analysis) | `/flow` | MEDIUM |
| `GET /v1/indices/candles/{res}/{symbol}` | Index candles (SPX, VIX, etc.) | `/chart` | MEDIUM |

---

### 1.6 Open Exchange Rates / ExchangeRate-API (free, no key)

**Currently used:**
- `GET https://open.er-api.com/v6/latest/USD` in `/api/currency-strength` and `/api/live-prices`
- Returns spot rates for 150+ currencies vs USD

**NOT exploited:**
- Historical rates: `GET https://open.er-api.com/v6/historical/2024-01-01.json` — free, no key, goes back years
- Can compute: currency strength time-series, momentum (day-over-day change), historical DXY calculation
- **Quick win:** Fetch yesterday's rates alongside today's to compute 24h currency strength change %

---

### 1.7 CFTC Socrata (COT Data)

**Currently used:**
- `https://publicreporting.cftc.gov/resource/6dca-aqww.json` — Legacy COT (Futures Only)
- Fetches: non-commercial long/short, commercial long/short, open interest

**Available but NOT used (same API, different dataset IDs):**
| Dataset ID | Report Type | Data | Priority |
|---|---|---|---|
| `jun7-fc8e` | Disaggregated COT | Splits non-commercials into: Producer/Merchant, Swap Dealer, Managed Money, Other Reportable | HIGH |
| `gpe5-46if` | Traders in Financial Futures (TFF) | Specific to financial futures: Asset Manager, Leveraged, Other | HIGH |
| `kh3c-gbw2` | Combined Futures + Options | More complete picture of positioning | MEDIUM |

**Quick win:** Switch from legacy report to Disaggregated report to show "Managed Money" positioning — this is what institutional traders actually look at.

---

### 1.8 Alternative.me (Fear & Greed)

**Currently used:**
- `GET https://api.alternative.me/fng/?limit=30` — Crypto Fear & Greed Index (30 days)

**Available but NOT used (free, no key):**
| Endpoint | Data | Target page | Priority |
|---|---|---|---|
| `GET /fng/?limit=365` | Full year of historical F&G | `/sentiment` — add historical chart | HIGH |
| `GET /v2/ticker/bitcoin_dominance/` | Bitcoin dominance % | `/sentiment` | MEDIUM |
| `GET /v2/ticker/?limit=10` | Top 10 crypto market data | `/market` | LOW |

---

### 1.9 CBOE (VIX)

**Currently used:**
- `GET https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv` — Full VIX history

**Available but NOT used (same CDN, free):**
| URL | Data | Target page | Priority |
|---|---|---|---|
| `.../VVIX_History.csv` | VVIX (volatility of VIX) — measures uncertainty about VIX itself | `/volatility` | MEDIUM |
| `.../SP500_History.csv` | S&P 500 official daily data from CBOE | `/market` backup | LOW |
| `.../VIX9D_History.csv` | 9-Day VIX (short-term vol) | `/volatility` | MEDIUM |
| `.../VIX3M_History.csv` | 3-Month VIX | `/volatility` term structure | HIGH |
| `.../VIX6M_History.csv` | 6-Month VIX | `/volatility` term structure | HIGH |
| `.../VIX1Y_History.csv` | 1-Year VIX | `/volatility` term structure | MEDIUM |

**Quick win:** Replace the estimated VIX term structure (currently a mathematical model in the code) with REAL VIX3M and VIX6M data from CBOE CSVs. This is a significant accuracy improvement.

---

### 1.10 LBMA

**Currently used:**
- All 7 fixing price endpoints (gold AM/PM, silver, platinum AM/PM, palladium AM/PM)

**Status:** Fully exploited. All available data is already fetched.

---

## PART 2 — NEW FREE APIs TO INTEGRATE

### 2.1 US Treasury Yield Curve (treasury.gov — free, no key)

**Endpoint:** `GET https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/all/2026?type=daily_treasury_yield_curve&field_tdr_date_value=2026&page&_format=csv`

Or JSON via FRED: Series DGS1MO, DGS3MO, DGS6MO, DGS1, DGS2, DGS3, DGS5, DGS7, DGS10, DGS20, DGS30

**Data:** Full yield curve (1mo to 30yr), updated daily
**Target page:** `/macro` — add interactive yield curve chart + inversion indicator
**Value:** Shows recession risk, rate expectations. Currently you have 2Y and 10Y from FRED but not the full curve.
**Effort:** LOW (add 8 more FRED series to constants.ts)

---

### 2.2 CBOE Put/Call Ratio (free, no key)

**Endpoint:** `GET https://cdn.cboe.com/api/global/us_indices/daily_prices/TOTALPC.csv`
Also: `EQUITYPC.csv` (equity-only P/C), `INDEXPC.csv` (index-only P/C)

**Data:** Daily total put/call ratio, equity P/C, index P/C
**Target page:** `/sentiment`, `/volatility`
**Value:** Key contrarian indicator — extreme readings signal market turning points
**Effort:** LOW (same pattern as VIX CSV parser)

---

### 2.3 Finviz Insider Trading (free, scraping)

**Endpoint:** RSS feed: `https://finviz.com/insider.ashx`
Or use Finnhub: `GET /stock/insider-transactions?symbol=X`

**Data:** Recent insider buys/sells with amounts and % of holdings
**Target page:** New `/insider` page or embed in `/scanner`
**Value:** Insider buying clusters are one of the strongest bullish signals
**Effort:** MEDIUM (Finnhub endpoint is simpler)

---

### 2.4 CoinGlass Open Interest & Funding Rates (free tier)

**Endpoint:** `GET https://open-api.coinglass.com/public/v2/funding`
**API:** Free tier available with registration

**Data:** Crypto funding rates, open interest, liquidation data
**Target page:** `/sentiment` (crypto section)
**Value:** Funding rates indicate leveraged positioning direction
**Effort:** MEDIUM (new API key needed)

---

### 2.5 IG Client Sentiment (free, no key)

**Endpoint:** `GET https://www.ig.com/en/ig-client-sentiment`
Or scrape: `GET https://www.ig.com/content/ig/pws/trading-platform-api/client-sentiment`

**Data:** % of IG retail clients long vs short on major instruments
**Target page:** `/sentiment`, `/currency-strength`
**Value:** Retail positioning is a powerful contrarian indicator for forex
**Effort:** MEDIUM (HTML scraping or unofficial API)

---

### 2.6 Quandl/Nasdaq CFTC (alternative COT source)

**Endpoint:** `GET https://data.nasdaq.com/api/v3/datasets/CFTC/...`
**API:** Free tier: 50 calls/day, 1 concurrent

**Data:** Same COT data but cleaner format and more historical depth
**Target page:** `/cot` — backup data source
**Effort:** LOW

---

### 2.7 Economic Surprise Index via Citi (FRED proxy)

**FRED Series:** `CSCICP03USM665S` (Consumer Confidence), `STLFSI2` (Financial Stress Index)

**Data:** Financial conditions, economic stress indicators
**Target page:** `/macro`, `/sentiment`
**Value:** Financial stress index is a leading recession indicator
**Effort:** LOW (just add FRED series)

---

### 2.8 SEC EDGAR Insider Filings (free, no key)

**Endpoint:** `GET https://efts.sec.gov/LATEST/search-index?q=%22Form%204%22&dateRange=custom&startdt=2026-03-20&enddt=2026-03-23`
Or full text: `GET https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=4&dateb=&owner=include&count=40&search_text=&action=getcompany`

**Data:** All Form 4 filings (insider trades) in real-time
**Target page:** New section in `/scanner` or standalone
**Value:** Direct SEC source, most comprehensive
**Effort:** HIGH (complex XML parsing)

---

### 2.9 CryptoCompare Social Stats (free tier)

**Endpoint:** `GET https://min-api.cryptocompare.com/data/social/coin/latest?coinId=1182`

**Data:** Reddit, Twitter, code repository activity metrics for crypto
**Target page:** `/sentiment` crypto section
**Value:** Social activity correlates with crypto price movements
**Effort:** MEDIUM (free API key required)

---

### 2.10 TradingEconomics Widgets (free embed)

**Endpoint:** Embeddable widgets (no API key)

**Data:** Economic calendar, forecasts, indicators
**Target page:** `/calendar-eco`
**Value:** Professional-quality economic calendar display
**Effort:** LOW (iframe embed)

---

## PART 3 — IMPLEMENTATION PLAN

### TIER 1: Quick Wins (1-2 hours each, use existing API keys)

| # | Action | API | Target Page | Impact |
|---|---|---|---|---|
| 1 | **Add 10+ FRED series** to `constants.ts`: RSAFS, HOUST, UMCSENT, PPIFIS, T10Y2Y, BAMLH0A0HYM2, M2SL, WALCL, DGS5, DGS30 | FRED | `/macro` | HIGH — Massively enriches macro dashboard |
| 2 | **Replace VIX term structure model** with real VIX3M + VIX6M CSVs from CBOE | CBOE | `/volatility` | HIGH — Real data vs mathematical estimate |
| 3 | **Add CBOE Put/Call ratio** CSV (same parser pattern as VIX) | CBOE | `/sentiment` | HIGH — Key market sentiment indicator |
| 4 | **Use MarketAux built-in sentiment** instead of keyword matching in trump-news | MarketAux | `/trump-tracker` | MEDIUM — Better accuracy, less code |
| 5 | **Switch COT to Disaggregated report** (change dataset ID in cot.ts) | CFTC | `/cot` | HIGH — "Managed Money" is what pros track |
| 6 | **Add historical F&G** (change limit to 365) + chart | Alternative.me | `/sentiment` | MEDIUM — Historical context for current reading |
| 7 | **Fetch yesterday's FX rates** for 24h change in currency strength | ExchangeRate | `/currency-strength` | MEDIUM — Shows momentum |
| 8 | **Add forex/crypto news categories** from Finnhub | Finnhub | `/news` | LOW — Filter tabs for news types |

### TIER 2: New Integrations (half-day each, new free APIs)

| # | Action | API | Target Page | Impact |
|---|---|---|---|---|
| 9 | **Yield curve visualization** — add full maturity range via FRED series | FRED + Treasury | `/macro` — new "Yield Curve" section | HIGH |
| 10 | **Finnhub insider sentiment** (MSPR) for top watchlist stocks | Finnhub | `/sentiment`, `/scanner` | HIGH |
| 11 | **Finnhub support/resistance** auto-detection for active chart symbols | Finnhub | `/daily-bias`, `/chart` | HIGH |
| 12 | **Finnhub social sentiment** (Reddit + Twitter) for popular tickers | Finnhub | `/sentiment` | MEDIUM |
| 13 | **FRED Financial Stress Index** (STLFSI2) as macro overlay | FRED | `/macro` | MEDIUM |
| 14 | **CBOE VVIX and VIX9D** for advanced vol analysis | CBOE | `/volatility` | MEDIUM |
| 15 | **Finnhub IPO calendar** in earnings/calendar page | Finnhub | `/earnings` or `/calendar-eco` | MEDIUM |
| 16 | **Finnhub analyst recommendations** for watchlist stocks | Finnhub | `/watchlist` | MEDIUM |

### TIER 3: Premium / VIP Data (paid APIs worth adding)

| # | Service | Data | Cost | VIP Value |
|---|---|---|---|---|
| 17 | **Unusual Whales** or **FloAlerts** | Options flow, dark pool prints, unusual activity | ~$30-50/mo | VERY HIGH — institutional-grade flow data |
| 18 | **TradingEconomics API** | Economic surprise index, forecasts, global indicators | ~$20/mo | HIGH — professional economic data |
| 19 | **Quiver Quantitative** | Congress trading, insider clusters, lobbying data | ~$10/mo | HIGH — unique alternative data |
| 20 | **Polygon.io** | Real-time stock/options data, aggregates, trades | Free tier + $29/mo | HIGH — reliable data backbone |
| 21 | **CoinGlass Pro** | Crypto liquidations heatmap, OI, funding rates | ~$20/mo | MEDIUM — crypto trader must-have |
| 22 | **Sentifi / Accern** | AI-powered news sentiment scoring | Enterprise | LOW — overkill for current stage |

---

## PART 4 — PAGE-BY-PAGE BENEFIT MAP

| Page | Current data sources | Data to add | Priority |
|---|---|---|---|
| `/macro` | FRED (10 series) | +10 FRED series, yield curve, financial stress | **P0** |
| `/sentiment` | Fear & Greed, VIX, SPY | + Put/Call ratio, insider MSPR, social sentiment, historical F&G | **P0** |
| `/volatility` | VIX from CBOE + estimated term structure | + Real VIX3M/6M, VVIX, VIX9D, P/C ratio | **P0** |
| `/cot` | Legacy COT report | + Disaggregated (Managed Money), TFF | **P1** |
| `/currency-strength` | Spot rates only | + 24h change, historical momentum | **P1** |
| `/earnings` | Finnhub earnings calendar | + EPS surprises, IPO calendar | **P1** |
| `/trump-tracker` | MarketAux + Finnhub + NewsData | + Use API sentiment scores | **P2** |
| `/news` | Finnhub general + 7 RSS feeds | + Forex/crypto category filters | **P2** |
| `/daily-bias` | Manual input | + Auto S/R levels from Finnhub | **P2** |
| `/scanner` | None (manual) | + Insider sentiment, analyst recs | **P2** |
| `/watchlist` | Quotes only | + Analyst recommendations | **P3** |

---

## APPENDIX — Exact API calls for Quick Wins

### Adding FRED series (Quick Win #1)
File: `src/lib/market/constants.ts`
```typescript
// Add to FRED_SERIES:
RETAIL_SALES: { id: "RSAFS", label: "Ventes au Détail", unit: "M$", frequency: "Mensuel" },
HOUSING_STARTS: { id: "HOUST", label: "Mises en Chantier", unit: "Milliers", frequency: "Mensuel" },
CONSUMER_SENTIMENT: { id: "UMCSENT", label: "Confiance Michigan", unit: "Index", frequency: "Mensuel" },
PPI: { id: "PPIFIS", label: "PPI (Final Demand)", unit: "Index", frequency: "Mensuel" },
YIELD_SPREAD: { id: "T10Y2Y", label: "Spread 10Y-2Y", unit: "%", frequency: "Quotidien" },
HY_SPREAD: { id: "BAMLH0A0HYM2", label: "Spread High Yield", unit: "%", frequency: "Quotidien" },
M2_MONEY: { id: "M2SL", label: "Masse Monétaire M2", unit: "Mrd $", frequency: "Mensuel" },
FED_BALANCE: { id: "WALCL", label: "Bilan Fed", unit: "M$", frequency: "Hebdomadaire" },
STRESS_INDEX: { id: "STLFSI2", label: "Stress Financier", unit: "Index", frequency: "Hebdomadaire" },
TREASURY_5Y: { id: "DGS5", label: "Trésor 5 ans", unit: "%", frequency: "Quotidien" },
TREASURY_30Y: { id: "DGS30", label: "Trésor 30 ans", unit: "%", frequency: "Quotidien" },
TREASURY_3M: { id: "DGS3MO", label: "Trésor 3 mois", unit: "%", frequency: "Quotidien" },
```

### CBOE Put/Call ratio (Quick Win #3)
New route: `src/app/api/put-call-ratio/route.ts`
```
URL: https://cdn.cboe.com/api/global/us_indices/daily_prices/TOTALPC.csv
Format: Same as VIX CSV — DATE, CALL, PUT, TOTAL, PC_RATIO
```

### COT Disaggregated (Quick Win #5)
File: `src/lib/market/cot.ts`
```
Change: CFTC_API_BASE from "6dca-aqww" to "jun7-fc8e"
New fields: managed_money_long, managed_money_short, swap_dealer_long, swap_dealer_short
```

### Real VIX Term Structure (Quick Win #2)
Add to VIX route: fetch VIX3M_History.csv and VIX6M_History.csv
```
https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX3M_History.csv
https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX6M_History.csv
```
Replace `estimateTermStructure()` with real last-row values from these CSVs.
