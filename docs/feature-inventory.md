# MarketPhase - Feature Inventory (Final QA)

**Date:** 2026-03-23
**Build status:** PASS (Next.js 16.1.6, 158 static pages, 0 errors)
**Codebase:** ~90,400 lines of TypeScript/TSX, 47 components, 76 API routes

---

## Sidebar Pages (50 linked pages + admin)

### 1. TRADING (core daily workflow)

| Page | Key Features |
|------|-------------|
| `/dashboard` | KPI cards (P&L, win rate, streak, RR), equity curve chart, strategy breakdown chart, trade form (add/edit/delete), forex sessions widget, daily goal tracker, screenshot capture, trade sharing, quick stats |
| `/journal` | Trade list with sorting/filtering, add/edit/delete trades, tag system, screenshot attachment, AI trade review (Brain icon), trade duplication, CSV export, trade sharing, search by symbol/tag |
| `/chart` | TradingView-style charting, trade overlay on candles, strategy filter, symbol normalization, multi-timeframe |
| `/daily-bias` | Pre-session bias planning, directional bias (bull/bear/neutral), trading rules integration, screenshot upload, shareable plans, calendar navigation, copy/export plans |
| `/checklist` | Pre-trade checklist with scoring, AI-generated checklists, customizable items, score tracking |

### 2. ANALYTICS

| Page | Key Features |
|------|-------------|
| `/analytics` | Equity curve, weekday performance chart, monthly comparison, emotion performance, advanced equity chart, streaks, asset performance, win rate by tag/strategy, VIP advanced stats |
| `/performance` | Performance score gauge, discipline metrics, consistency score, risk management score, multi-criteria scoring |
| `/calendar` | P&L calendar heatmap, daily/monthly P&L, click-through to trades, streak indicators, monthly stats bar |
| `/heatmap` | Time-of-day vs day-of-week P&L heatmap, color-coded grid |
| `/recaps` | Weekly/monthly recap builder, session-based analysis, auto-generated summaries, trading session breakdown |
| `/analytics/distribution` | Hourly distribution, day-of-week distribution, session distribution, asset-type breakdown, pie charts |
| `/analytics/sessions` | Trading session analysis (London, NY, Tokyo, Sydney), session equity curves, session stats |

### 3. PERFORMANCE

| Page | Key Features |
|------|-------------|
| `/performance/grading` | Letter grade system (A-F), criteria-based grading, downloadable report, peer comparison, detailed metrics |
| `/badges` | Gamification badges with rarity tiers, daily quests, badge collection gallery, progress tracking |
| `/playbook` | Strategy playbook builder, setup documentation, screenshot-based examples, stat tracking per setup, pattern categorization |
| `/strategies` | CRUD strategy manager, strategy tagging, performance stats per strategy |
| `/mistakes` | Error pattern analysis, Chart.js-based mistake visualizations, recurring mistake detection, categorization |
| `/risk` | Risk metrics dashboard (Sharpe, Sortino, max drawdown), drawdown curve, position size calculator, Kelly criterion, asset-type risk breakdown |

### 4. MARKET DATA

| Page | Key Features |
|------|-------------|
| `/cot` | COT report viewer, multi-contract support, category-based filtering, chart visualization, net positioning |
| `/macro` | Macroeconomic dashboard, FRED data integration (GDP, CPI, unemployment, etc.), chart overlays |
| `/calendar-eco` | Economic calendar, impact filters (high/medium/low), trade correlation with events |
| `/news` | Market news aggregator, category filtering, watchlist-linked news, relevance scoring |
| `/market` | Live market data, quotes, indices overview, market status |
| `/watchlist` | Symbol watchlist with alerts, price tracking, notes, trade history per symbol, news links, trend indicators |
| `/volatility` | VIX dashboard, volatility gauges, historical volatility charts, options-implied vol |
| `/earnings` | Earnings calendar, live/fallback data, past/upcoming earnings, star favorites, impact tracking |
| `/sentiment` | Fear & Greed Index, live BTC price, market sentiment gauges, multi-indicator sentiment dashboard |
| `/currency-strength` | Real-time currency strength meter, pair suggestions, trade correlation |
| `/lbma` | LBMA precious metals prices (Gold, Silver, Platinum, Palladium), historical charts, trade overlay |
| `/scanner` | Live market scanner, filters, sorting, real-time price streaming, sector-based scanning |
| `/sector-heatmap` | S&P 500 sector treemap, table view toggle, sector performance, stock-level detail |
| `/flow` | Options flow analysis (PLACEHOLDER - coming soon) |

### 5. ADVANCED TOOLS

| Page | Key Features |
|------|-------------|
| `/ai-coach` | AI-powered trade coaching, pattern detection, personalized recommendations, performance analysis |
| `/war-room` | Multi-widget trading workspace, customizable layout, real-time data panels, session timer, news/chart/stats widgets, drag-and-drop |
| `/backtest` | Strategy backtesting engine, parameter toggles, equity simulation, win rate/RR analysis |
| `/calculator` | Position size calculator, R:R calculator, pip calculator, compound interest, margin calculator, multi-tool |
| `/replay` | Trade replay system, step-through candle replay, trade annotation, speed controls, pattern study |
| `/correlation` | Asset correlation matrix, pair correlation analysis, heatmap visualization, time-period selection |
| `/compare` | Period-over-period comparison, multi-metric comparison charts, baseline analysis |

### 6. TOOLS

| Page | Key Features |
|------|-------------|
| `/custom-dashboard` | Drag-and-drop widget dashboard, configurable panels, personal KPI selection |
| `/reports` | PDF report generation, period selection, multi-section reports, export |
| `/screenshots` | Screenshot gallery, trade-linked screenshots, lightbox viewer, annotation notes, before/after comparison |

### 7. MY SPACE

| Page | Key Features |
|------|-------------|
| `/profile` | User profile editor, avatar upload, password change, account deletion, trade data export, public profile toggle, social links |
| `/pricing` | Subscription plans, Stripe checkout integration, feature comparison table |

### 8. PREMIUM (VIP)

| Page | Key Features |
|------|-------------|
| `/vip` | VIP hub with trade-of-the-day, subscription management, premium content feed |
| `/vip/indicateurs` | Premium trading indicators library, author-attributed content |
| `/vip/analyses` | Premium macro analyses, type-categorized posts, author system |
| `/community` | Social trading feed, trade sharing, likes/reactions, follow system, gamification integration, profile cards |
| `/chat` | Real-time chat rooms, message reactions, image upload, trade sharing in chat, pinned messages, moderation (ban) |
| `/challenges` | Trading challenges (daily/weekly/monthly/special), progress tracking, reward system |
| `/leaderboard` | Multi-metric leaderboard (P&L, win rate, trades, streak), ranking system |

### 9. ADMIN

| Page | Key Features |
|------|-------------|
| `/admin` | User management, role assignment, admin stats |
| `/admin/revenue` | Revenue dashboard, Stripe integration stats |
| `/admin/vip-content` | VIP content management (create/edit/publish posts) |

### 10. PUBLIC / MARKETING PAGES

| Page | Key Features |
|------|-------------|
| `/` (landing) | Marketing homepage |
| `/about` | About page |
| `/features` | Feature showcase |
| `/blog` | SEO blog with 15+ articles |
| `/blog/[slug]` | Dynamic blog posts |
| `/login` | Authentication |
| `/register` | Registration |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset form |
| `/contact` | Contact form |
| `/journal-de-trading` | SEO landing page (French) |
| `/journal-de-trading-gratuit` | SEO landing page (French) |
| `/marketphase-vs-tradervue` | Comparison landing page |
| `/marketphase-vs-tradezella` | Comparison landing page |
| `/extension` | Browser extension page |
| `/cgu` | Terms of service |
| `/confidentialite` | Privacy policy |
| `/mentions-legales` | Legal notices |
| `/track/[username]` | Public trader profile |
| `/webhook-docs` | Webhook API documentation |

---

## Total Feature Count

| Category | Pages | Key Features |
|----------|-------|-------------|
| Trading (Core) | 5 | ~25 |
| Analytics | 7 | ~35 |
| Performance | 6 | ~30 |
| Market Data | 14 | ~55 |
| Advanced Tools | 7 | ~35 |
| Tools | 3 | ~12 |
| My Space | 2 | ~10 |
| Premium/VIP | 7 | ~30 |
| Admin | 3 | ~8 |
| Public/Marketing | 17 | ~20 |
| **TOTAL** | **71 pages** | **~260 features** |

Additional infrastructure:
- 76 API routes
- 47 reusable components
- i18n (French + English)
- Stripe billing integration
- NextAuth authentication
- Real-time WebSocket chat
- Gamification engine (badges, quests, XP)
- Social features (follow, share, leaderboard)

---

## Competitor Comparison

| Feature | MarketPhase | TradeZella | Tradervue | Edgewonk |
|---------|:-----------:|:----------:|:---------:|:--------:|
| **Core Journaling** | | | | |
| Trade logging | YES | YES | YES | YES |
| Screenshot attachment | YES | YES | YES | YES |
| Tag system | YES | YES | YES | YES |
| CSV import/export | YES | YES | YES | YES |
| **Analytics** | | | | |
| Equity curve | YES | YES | YES | YES |
| P&L calendar | YES | YES | YES | YES |
| Win rate by day/hour | YES | YES | YES | YES |
| Emotion tracking | YES | NO | NO | YES |
| Session analysis | YES | NO | NO | NO |
| **Market Data (built-in)** | | | | |
| Live market quotes | YES | NO | NO | NO |
| COT reports | YES | NO | NO | NO |
| Economic calendar | YES | NO | NO | NO |
| Market news feed | YES | NO | NO | NO |
| Fear & Greed Index | YES | NO | NO | NO |
| Currency strength meter | YES | NO | NO | NO |
| Sector heatmap | YES | NO | NO | NO |
| LBMA metals data | YES | NO | NO | NO |
| Earnings calendar | YES | NO | NO | NO |
| Volatility (VIX) | YES | NO | NO | NO |
| Watchlist with alerts | YES | NO | NO | NO |
| Market scanner | YES | NO | NO | NO |
| Macro dashboard (FRED) | YES | NO | NO | NO |
| **Advanced Tools** | | | | |
| AI trade coach | YES | NO | NO | NO |
| War room (multi-widget) | YES | NO | NO | NO |
| Backtesting | YES | NO | NO | YES |
| Trade replay | YES | YES | NO | NO |
| Correlation matrix | YES | NO | NO | NO |
| Period comparison | YES | NO | NO | NO |
| Position size calculator | YES | NO | NO | YES |
| Risk manager (Sharpe, Kelly) | YES | NO | NO | YES |
| **Performance** | | | | |
| Performance grading (A-F) | YES | NO | NO | YES |
| Gamification (badges, quests) | YES | NO | NO | NO |
| Strategy playbook | YES | NO | NO | YES |
| Mistake pattern analysis | YES | NO | NO | YES |
| **Social & Community** | | | | |
| Social feed / community | YES | NO | NO | NO |
| Real-time chat rooms | YES | NO | NO | NO |
| Trading challenges | YES | NO | NO | NO |
| Leaderboard | YES | NO | NO | NO |
| Public profile / follow | YES | NO | NO | NO |
| **Premium** | | | | |
| VIP macro analyses | YES | NO | NO | NO |
| Premium indicators | YES | NO | NO | NO |
| Trade of the day | YES | NO | NO | NO |
| **Other** | | | | |
| Custom dashboard (drag/drop) | YES | NO | NO | NO |
| PDF report generation | YES | NO | YES | NO |
| Webhook API | YES | NO | NO | NO |
| Browser extension | YES | YES | YES | NO |
| Blog / SEO content | YES | YES | YES | YES |
| i18n (multi-language) | YES | NO | NO | NO |
| Daily bias planning | YES | NO | NO | NO |
| Pre-trade checklist | YES | NO | NO | YES |
| TradingView charting | YES | YES | NO | NO |
| **Unique features** | **~35** | ~3 | ~1 | ~2 |

### Summary vs Competitors
- **TradeZella** ($30-50/mo): Solid journaling + replay, but no market data, no AI, no social features, no advanced analytics
- **Tradervue** ($30-50/mo): Strong journal + basic analytics, very limited feature set, no market data integration
- **Edgewonk** ($170 one-time): Good analytics + backtesting, but desktop-only, no real-time data, no community, no AI
- **MarketPhase**: All-in-one platform with ~260 features across 71 pages. The only trading journal that integrates live market data (13 market tools), AI coaching, social community with real-time chat, gamification, and advanced risk analytics into a single web application.

---

## Placeholder / Coming Soon Items

| Page | Status | Detail |
|------|--------|--------|
| `/flow` (Options Flow) | PLACEHOLDER | Full "coming soon" page, 45 lines |
| `/community` | PARTIAL | One tooltip says "Disponible prochainement" (video sharing feature) |
| `/vip/indicateurs` | OK | "Aucun indicateur pour le moment" is an empty-state message, not a placeholder |
| `/vip/analyses` | OK | "Aucune analyse pour le moment" is an empty-state message, not a placeholder |

---

## QA Checklist Summary

| Check | Result |
|-------|--------|
| `npx next build` | PASS (0 errors, 158 pages) |
| TypeScript | PASS (compiled successfully) |
| All sidebar links resolve | PASS (50/50 pages exist) |
| English text in French UI | PASS (0 hardcoded English strings in page files) |
| Coming Soon placeholders | 1 page (`/flow`), 1 minor tooltip (`/community`) |
| i18n coverage | All pages use `useTranslation` + `t()` calls |
| Total pages | 71 (50 app + 3 admin + 17 public + 1 dynamic blog) |
| Total features | ~260 |
| API routes | 76 |
| Components | 47 |
