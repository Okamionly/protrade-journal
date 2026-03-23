# MarketPhase - Feature Inventory (Final)

**Date:** 2026-03-23
**Build status:** PASS (Next.js 16.1.6 Turbopack, 165 static pages, 0 errors)
**Codebase:** 98,462 lines of TypeScript/TSX, 48 components, 81 API routes, 77 pages

---

## Sidebar Pages (57 app pages + admin)

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
| `/market-phase` | Market phase detection/visualization |
| `/watchlist` | Symbol watchlist with alerts, price tracking, notes, trade history per symbol, news links, trend indicators |
| `/volatility` | VIX dashboard, volatility gauges, historical volatility charts, options-implied vol |
| `/earnings` | Earnings calendar, live/fallback data, past/upcoming earnings, star favorites, impact tracking |
| `/sentiment` | Fear & Greed Index, live BTC price, market sentiment gauges, multi-indicator sentiment dashboard |
| `/currency-strength` | Real-time currency strength meter, pair suggestions, trade correlation |
| `/lbma` | LBMA precious metals prices (Gold, Silver, Platinum, Palladium), historical charts, trade overlay |
| `/scanner` | Live market scanner, filters, sorting, real-time price streaming, sector-based scanning |
| `/sector-heatmap` | S&P 500 sector treemap, table view toggle, sector performance, stock-level detail |
| `/flow` | Options flow analysis (PLACEHOLDER - coming soon) |
| `/trump-tracker` | Trump-related market news tracker |

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
| `/import` | CSV/broker import tool |

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
| `/` (landing) | Marketing homepage with feature tabs, live ticker, morning briefing |
| `/about` | About page |
| `/features` | Feature showcase |
| `/blog` | SEO blog with 15+ articles |
| `/blog/[slug]` | Dynamic blog posts (15 slugs) |
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
| Market Data | 16 | ~60 |
| Advanced Tools | 7 | ~35 |
| Tools | 4 | ~14 |
| My Space | 2 | ~10 |
| Premium/VIP | 7 | ~30 |
| Admin | 3 | ~8 |
| Public/Marketing | 20 | ~22 |
| **TOTAL** | **77 pages** | **~269 features** |

Additional infrastructure:
- 81 API routes
- 48 reusable components (34 top-level + 14 widgets)
- 2,234 i18n keys (French + English, fully synced)
- Stripe billing integration
- NextAuth authentication (credentials + OAuth)
- Real-time WebSocket chat
- Gamification engine (badges, quests, XP)
- Social features (follow, share, leaderboard)
- Auto-notifications system
- Email weekly digest
- Webhook trade ingestion API

---

## API Routes (81 total)

### Authentication & User (15)
`auth/[...nextauth]`, `auth/forgot-password`, `auth/reset-password`, `register`, `user`, `user/avatar`, `user/change-password`, `user/delete`, `user/delete-trades`, `user/export`, `user/profile`, `user/role`, `users/[id]`, `users/follow`, `users/follow/list`, `users/suggested`

### Trading Core (12)
`trades`, `trades/[id]`, `trades/export`, `trades/import`, `strategies`, `strategies/[id]`, `tags`, `tags/[id]`, `trading-rules`, `trading-rules/[id]`, `calendar`, `daily-plan`, `daily-plan/export`, `daily-plan/history`

### Market Data (16)
`btc-price`, `currency-strength`, `earnings`, `fear-greed`, `fred`, `lbma`, `live-prices`, `market-data/candles`, `market-data/global`, `market-data/global-indices`, `market-data/ipo`, `market-data/options`, `market-data/put-call`, `market-data/quotes`, `market-data/social-sentiment`, `market-data/vix`

### Analytics & Gamification (5)
`gamification`, `leaderboard`, `monthly-goals`, `trade-of-day`, `ai/trade-review`

### Community & Chat (8)
`chat/messages`, `chat/messages/[id]`, `chat/messages/[id]/pin`, `chat/reactions`, `chat/likes`, `chat/rooms`, `chat/upload`, `chat/ban`

### VIP & Premium (6)
`vip/posts`, `vip/posts/[id]`, `vip/posts/admin`, `vip/seed`, `vip/upload`, `checkout`

### Admin (5)
`admin/seed`, `admin/stats`, `admin/users`, `admin/users/[id]`, `admin/users/[id]/role`

### External & Utility (14)
`geo`, `news`, `trump-news`, `notifications`, `email/weekly-digest`, `subscription`, `upload`, `public/profile/[username]`, `challenges`, `webhook/trade`, `webhooks/stripe`

---

## Components (48 total)

### Core UI (34)
AIInsightsCard, AdvancedFilters, AppShell, ChartComponents, CommandPalette, CommunityShareTradeModal, DailyGoalTracker, DashboardCards, EmptyDayMotivation, ErrorBoundary, ForexSessions, Header, LandingContent, LandingFeatureTabs, LiveTicker, LoginStreak, MorningBriefing, NewsTicker, NotificationCenter, NotificationSettings, OnboardingWizard, QuickTradeButton, SessionProvider, ShareButton, ShareStatsCard, ShortcutsHelpModal, Sidebar, Skeleton, TagPicker, ThemeProvider, Toast, TradeCard, TradeForm, TradeShareModal, TradingWrapped

### Dashboard Widgets (14)
CalendarMiniWidget, ChatPreviewWidget, DailyBiasWidget, EquityCurveMiniWidget, FearGreedWidget, GoalsProgressWidget, PnlTodayWidget, QuickStatsWidget, RecentTradesWidget, StreakWidget, TradingSessionsWidget, WidgetWrapper, WinRateWidget

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
| Trump market tracker | YES | NO | NO | NO |
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
| Command palette (Ctrl+K) | YES | NO | NO | NO |
| Auto-notifications | YES | NO | NO | NO |
| **Unique features** | **~37** | ~3 | ~1 | ~2 |

---

## Placeholder / Coming Soon Items

| Page | Status | Detail |
|------|--------|--------|
| `/flow` (Options Flow) | PLACEHOLDER | Full "coming soon" page |
| `/community` | PARTIAL | One tooltip says "Disponible prochainement" (video sharing feature) |
