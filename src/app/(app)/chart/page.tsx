"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Maximize,
  Minimize,
  Plus,
  X,
  Camera,
  Columns2,
  Eye,
  ChevronRight,
  Search,
  Star,
  PanelRightOpen,
} from "lucide-react";
import { useTrades, type Trade } from "@/hooks/useTrades";
import { useStrategies } from "@/hooks/useStrategies";
import { useTranslation } from "@/i18n/context";

/* ── CSS Variables (injected once) ──────────────────── */
const CSS_VARS = `
  :root {
    --chart-sidebar-w: 48px;
    --chart-topbar-h: 36px;
    --chart-accent: #00e5ff;
    --chart-bg: #0a0a0f;
    --chart-sidebar-bg: rgba(10, 10, 18, 0.95);
    --chart-topbar-bg: rgba(10, 10, 18, 0.92);
    --chart-border: rgba(255,255,255,0.06);
    --chart-text: #e0e0e0;
    --chart-text-dim: #666;
    --chart-hover: rgba(255,255,255,0.06);
    --chart-active: rgba(0,229,255,0.12);
  }
`;

/* ── Constants ──────────────────────────────────────── */
type SymbolDef = { id: string; tv: string; label: string; cat: "FX" | "IDX" | "CRY" };

const SYMBOLS: SymbolDef[] = [
  // FX
  { id: "EURUSD", tv: "FX:EURUSD", label: "EU", cat: "FX" },
  { id: "GBPUSD", tv: "FX:GBPUSD", label: "GU", cat: "FX" },
  { id: "USDJPY", tv: "FX:USDJPY", label: "UJ", cat: "FX" },
  { id: "XAUUSD", tv: "TVC:GOLD", label: "XAU", cat: "FX" },
  { id: "USDCHF", tv: "FX:USDCHF", label: "UC", cat: "FX" },
  { id: "AUDUSD", tv: "FX:AUDUSD", label: "AU", cat: "FX" },
  { id: "NZDUSD", tv: "FX:NZDUSD", label: "NU", cat: "FX" },
  { id: "USDCAD", tv: "FX:USDCAD", label: "UCA", cat: "FX" },
  { id: "EURGBP", tv: "FX:EURGBP", label: "EG", cat: "FX" },
  { id: "EURJPY", tv: "FX:EURJPY", label: "EJ", cat: "FX" },
  { id: "GBPJPY", tv: "FX:GBPJPY", label: "GJ", cat: "FX" },
  // IDX
  { id: "SPX500", tv: "FOREXCOM:SPXUSD", label: "SPX", cat: "IDX" },
  { id: "NAS100", tv: "FOREXCOM:NSXUSD", label: "NAS", cat: "IDX" },
  { id: "US30", tv: "FOREXCOM:DJI", label: "DJ", cat: "IDX" },
  { id: "DAX", tv: "PEPPERSTONE:GER40", label: "DAX", cat: "IDX" },
  // CRY
  { id: "BTCUSD", tv: "COINBASE:BTCUSD", label: "BTC", cat: "CRY" },
  { id: "ETHUSD", tv: "COINBASE:ETHUSD", label: "ETH", cat: "CRY" },
  { id: "SOLUSD", tv: "COINBASE:SOLUSD", label: "SOL", cat: "CRY" },
];

const INTERVALS = [
  { label: "1m", value: "1" },
  { label: "5m", value: "5" },
  { label: "15m", value: "15" },
  { label: "30m", value: "30" },
  { label: "1H", value: "60" },
  { label: "4H", value: "240" },
  { label: "D", value: "D" },
  { label: "W", value: "W" },
  { label: "M", value: "M" },
];

const ASSETS_LEGACY = [
  "EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD",
  "USD/CHF", "AUD/USD", "NZD/USD", "USD/CAD", "EUR/GBP",
  "EUR/JPY", "GBP/JPY",
];
const FALLBACK_STRATEGIES = [
  "Breakout", "Retracement", "Support/Resistance", "Trend Following", "Scalping",
];

/* ── Glassmorphism helpers ──────────────────────────── */
const glassStyle: React.CSSProperties = {
  background: "var(--glass-bg, rgba(15, 15, 30, 0.78))",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid var(--glass-border, rgba(255,255,255,0.10))",
};

const glassInputClass =
  "w-full rounded-lg px-3 py-2 text-sm bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors";

/* ── Normalise symbol for matching ──────────────────── */
function normalizeSymbol(s: string): string {
  return s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/* ── Format helpers ─────────────────────────────────── */
function fmtDate(d: string): string {
  const dt = new Date(d);
  return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
function fmtPrice(n: number | null): string {
  if (n === null || n === undefined) return "-";
  return n.toFixed(n >= 100 ? 2 : 5);
}

/* ══════════════════════════════════════════════════════
   TradingView Widget Builder
   ══════════════════════════════════════════════════════ */
function buildTVWidget(
  container: HTMLElement,
  opts: {
    symbol: string;
    interval: string;
    theme: "dark" | "light";
    height: string;
  },
) {
  container.innerHTML = "";
  const isDark = opts.theme === "dark";

  const wrapper = document.createElement("div");
  wrapper.className = "tradingview-widget-container";
  wrapper.style.height = "100%";
  wrapper.style.width = "100%";

  const widgetDiv = document.createElement("div");
  widgetDiv.className = "tradingview-widget-container__widget";
  widgetDiv.style.height = opts.height;
  widgetDiv.style.width = "100%";

  const script = document.createElement("script");
  script.src =
    "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
  script.type = "text/javascript";
  script.async = true;
  script.innerHTML = JSON.stringify({
    autosize: true,
    symbol: opts.symbol,
    interval: opts.interval,
    timezone: "Europe/Paris",
    theme: isDark ? "dark" : "light",
    style: "1",
    locale: "fr",
    allow_symbol_change: false,
    support_host: "https://www.tradingview.com",
    backgroundColor: isDark ? "rgba(10, 10, 15, 1)" : "rgba(255, 255, 255, 1)",
    gridColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.06)",
    hide_top_toolbar: true,
    hide_legend: false,
    save_image: true,
    calendar: false,
    hide_side_toolbar: false,
    details: false,
    hotlist: false,
    studies: [],
    withdateranges: false,
  });

  wrapper.appendChild(widgetDiv);
  wrapper.appendChild(script);
  container.appendChild(wrapper);
}

/* ══════════════════════════════════════════════════════
   SYMBOL SIDEBAR (left, 48px)
   ══════════════════════════════════════════════════════ */
function SymbolSidebar({
  symbols,
  activeSymbol,
  onSelect,
  favorites,
  onToggleFav,
}: {
  symbols: SymbolDef[];
  activeSymbol: string;
  onSelect: (sym: SymbolDef) => void;
  favorites: string[];
  onToggleFav: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && inputRef.current) inputRef.current.focus();
  }, [searchOpen]);

  const filtered = useMemo(() => {
    if (!query) return symbols;
    const q = query.toUpperCase();
    return symbols.filter(
      (s) => s.id.includes(q) || s.label.includes(q) || s.cat.includes(q),
    );
  }, [symbols, query]);

  const favSymbols = useMemo(
    () => filtered.filter((s) => favorites.includes(s.id)),
    [filtered, favorites],
  );
  const grouped = useMemo(() => {
    const cats: ("FX" | "IDX" | "CRY")[] = ["FX", "IDX", "CRY"];
    return cats.map((cat) => ({
      cat,
      items: filtered.filter((s) => s.cat === cat && !favorites.includes(s.id)),
    }));
  }, [filtered, favorites]);

  const activeTv = activeSymbol;

  return (
    <div
      className="flex flex-col h-full shrink-0 overflow-y-auto overflow-x-hidden"
      style={{
        width: "var(--chart-sidebar-w)",
        background: "var(--chart-sidebar-bg)",
        borderRight: "1px solid var(--chart-border)",
      }}
    >
      {/* Search toggle */}
      <button
        onClick={() => { setSearchOpen((v) => !v); setQuery(""); }}
        className="w-full h-9 flex items-center justify-center hover:bg-white/5 transition-colors shrink-0"
        style={{ color: searchOpen ? "var(--chart-accent)" : "var(--chart-text-dim)" }}
        title={t("chartSearch")}
      >
        <Search className="w-3.5 h-3.5" />
      </button>

      {searchOpen && (
        <div className="px-1 pb-1 shrink-0">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="..."
            className="w-full text-[10px] px-1 py-1 rounded bg-white/5 border border-white/10 focus:border-cyan-500/40 focus:outline-none"
            style={{ color: "var(--chart-text)" }}
          />
        </div>
      )}

      {/* Favorites */}
      {favSymbols.length > 0 && (
        <>
          <div
            className="px-1 pt-1 pb-0.5 text-[8px] font-bold uppercase tracking-wider text-center shrink-0"
            style={{ color: "var(--chart-accent)", opacity: 0.6 }}
          >
            <Star className="w-2.5 h-2.5 mx-auto" />
          </div>
          {favSymbols.map((sym) => (
            <SymbolButton
              key={sym.id}
              sym={sym}
              active={sym.tv === activeTv}
              isFav
              onSelect={() => onSelect(sym)}
              onToggleFav={() => onToggleFav(sym.id)}
            />
          ))}
          <div className="mx-1 my-1 border-t shrink-0" style={{ borderColor: "var(--chart-border)" }} />
        </>
      )}

      {/* Grouped symbols */}
      {grouped.map(
        ({ cat, items }) =>
          items.length > 0 && (
            <div key={cat}>
              <div
                className="text-[8px] font-bold uppercase tracking-wider text-center py-1 shrink-0"
                style={{ color: "var(--chart-text-dim)" }}
              >
                {cat}
              </div>
              {items.map((sym) => (
                <SymbolButton
                  key={sym.id}
                  sym={sym}
                  active={sym.tv === activeTv}
                  isFav={false}
                  onSelect={() => onSelect(sym)}
                  onToggleFav={() => onToggleFav(sym.id)}
                />
              ))}
            </div>
          ),
      )}
    </div>
  );
}

function SymbolButton({
  sym,
  active,
  isFav,
  onSelect,
  onToggleFav,
}: {
  sym: SymbolDef;
  active: boolean;
  isFav: boolean;
  onSelect: () => void;
  onToggleFav: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      onContextMenu={(e) => { e.preventDefault(); onToggleFav(); }}
      className="group relative w-full flex items-center justify-center py-1.5 transition-all shrink-0"
      style={{
        background: active ? "var(--chart-active)" : "transparent",
        borderLeft: active ? "2px solid var(--chart-accent)" : "2px solid transparent",
      }}
      title={`${sym.id} (clic droit = favori)`}
    >
      <span
        className="text-[10px] font-semibold leading-none"
        style={{
          color: active ? "var(--chart-accent)" : "var(--chart-text-dim)",
        }}
      >
        {sym.label}
      </span>
      {isFav && (
        <Star
          className="absolute top-0.5 right-0.5 w-2 h-2"
          style={{ color: "var(--chart-accent)", fill: "var(--chart-accent)" }}
        />
      )}
    </button>
  );
}

/* ══════════════════════════════════════════════════════
   TIMEFRAME BAR (horizontal, above chart)
   ══════════════════════════════════════════════════════ */
function TimeframeBar({
  activeInterval,
  onSelect,
  symbolLabel,
}: {
  activeInterval: string;
  onSelect: (interval: string) => void;
  symbolLabel: string;
}) {
  return (
    <div
      className="flex items-center shrink-0 px-2 gap-0.5"
      style={{
        height: "var(--chart-topbar-h)",
        background: "var(--chart-topbar-bg)",
        borderBottom: "1px solid var(--chart-border)",
      }}
    >
      {INTERVALS.map((iv) => (
        <button
          key={iv.value}
          onClick={() => onSelect(iv.value)}
          className="px-2 py-1 rounded text-[11px] font-medium transition-all"
          style={{
            background: activeInterval === iv.value ? "var(--chart-active)" : "transparent",
            color: activeInterval === iv.value ? "var(--chart-accent)" : "var(--chart-text-dim)",
            border: activeInterval === iv.value ? "1px solid rgba(0,229,255,0.25)" : "1px solid transparent",
          }}
        >
          {iv.label}
        </button>
      ))}

      {/* Spacer + symbol label on the right */}
      <div className="ml-auto flex items-center gap-2">
        <span
          className="text-[11px] font-semibold tracking-wide"
          style={{ color: "var(--chart-text)" }}
        >
          {symbolLabel}
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   ACTION TOOLBAR (top-right floating)
   ══════════════════════════════════════════════════════ */
function ActionToolbar({
  wrapperRef,
  theme,
  dualChart,
  isFullscreen,
  tradesOpen,
  onToggleDual,
  onToggleFullscreen,
  onToggleTrades,
}: {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  theme: "dark" | "light";
  dualChart: boolean;
  isFullscreen: boolean;
  tradesOpen: boolean;
  onToggleDual: () => void;
  onToggleFullscreen: () => void;
  onToggleTrades: () => void;
}) {
  const { t } = useTranslation();
  const [capturing, setCapturing] = useState(false);
  const [capDone, setCapDone] = useState(false);

  const capture = useCallback(async () => {
    if (!wrapperRef.current) return;
    setCapturing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(wrapperRef.current, {
        backgroundColor: theme === "dark" ? "#0a0a0f" : "#ffffff",
        useCORS: true,
        allowTaint: true,
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = `chart-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setCapDone(true);
      setTimeout(() => setCapDone(false), 2000);
    } catch {
      alert(t("chartCaptureFailed"));
    } finally {
      setCapturing(false);
    }
  }, [wrapperRef, theme, t]);

  const btnClass =
    "w-8 h-8 flex items-center justify-center rounded transition-all hover:bg-white/10";

  return (
    <div
      className="absolute top-1 right-1 z-30 flex items-center gap-0.5 rounded-lg px-1"
      style={{
        background: "rgba(10,10,18,0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid var(--chart-border)",
        height: 36,
      }}
    >
      <button
        onClick={capture}
        disabled={capturing}
        className={btnClass}
        style={{ color: capDone ? "#22c55e" : "var(--chart-text-dim)" }}
        title={t("chartScreenshot")}
      >
        <Camera className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onToggleDual}
        className={btnClass}
        style={{ color: dualChart ? "var(--chart-accent)" : "var(--chart-text-dim)" }}
        title={t("chartToggleDual")}
      >
        <Columns2 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onToggleFullscreen}
        className={btnClass}
        style={{ color: isFullscreen ? "var(--chart-accent)" : "var(--chart-text-dim)" }}
        title={t("chartToggleFullscreen")}
      >
        {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={onToggleTrades}
        className={btnClass}
        style={{ color: tradesOpen ? "var(--chart-accent)" : "var(--chart-text-dim)" }}
        title={t("chartToggleTrades")}
      >
        <PanelRightOpen className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TRADES PANEL (right side slide-in overlay)
   ══════════════════════════════════════════════════════ */
function TradesPanel({
  symbol,
  open,
  onClose,
}: {
  symbol: string;
  open: boolean;
  onClose: () => void;
}) {
  const { trades } = useTrades();
  const { t } = useTranslation();

  const norm = normalizeSymbol(symbol);
  const filtered = useMemo(
    () =>
      trades
        .filter((tr) => normalizeSymbol(tr.asset) === norm)
        .slice(0, 30),
    [trades, norm],
  );

  return (
    <div
      className="absolute top-0 right-0 z-20 h-full transition-transform duration-300"
      style={{
        width: 320,
        transform: open ? "translateX(0)" : "translateX(100%)",
        background: "rgba(10,10,18,0.92)",
        backdropFilter: "blur(24px)",
        borderLeft: "1px solid var(--chart-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center px-3 h-10 border-b" style={{ borderColor: "var(--chart-border)" }}>
        <Eye className="w-3.5 h-3.5 mr-2" style={{ color: "var(--chart-text-dim)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--chart-text)" }}>
          Trades — {symbol}
        </span>
        <span
          className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-white/10"
          style={{ color: "var(--chart-text-dim)" }}
        >
          {filtered.length}
        </span>
        <button
          onClick={onClose}
          className="ml-auto p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: "var(--chart-text-dim)" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List */}
      <div className="overflow-y-auto" style={{ height: "calc(100% - 90px)" }}>
        {filtered.length === 0 && (
          <div className="p-6 text-center text-xs" style={{ color: "var(--chart-text-dim)" }}>
            {t("chartNoTradesFor", { symbol })}
          </div>
        )}
        {filtered.map((trade) => (
          <TradeRow key={trade.id} trade={trade} />
        ))}
      </div>

      {/* Quick add button */}
      <div className="absolute bottom-0 left-0 right-0 p-2 border-t" style={{ borderColor: "var(--chart-border)" }}>
        <a
          href="/journal"
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-medium transition-all hover:bg-cyan-500/10"
          style={{
            background: "var(--chart-active)",
            color: "var(--chart-accent)",
            border: "1px solid rgba(0,229,255,0.2)",
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          {t("chartQuickAdd")}
        </a>
      </div>
    </div>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  const { t } = useTranslation();
  const isLong = trade.direction === "LONG";
  const pnl = trade.result;
  const pnlColor =
    pnl > 0 ? "#22c55e" : pnl < 0 ? "#ef4444" : "var(--chart-text-dim)";

  return (
    <div
      className="px-3 py-2 border-b hover:bg-white/[0.03] transition-colors"
      style={{ borderColor: "var(--chart-border)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{
            background: isLong ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            color: isLong ? "#22c55e" : "#ef4444",
          }}
        >
          {isLong ? "LONG" : "SHORT"}
        </span>
        <span className="text-[10px]" style={{ color: "var(--chart-text-dim)" }}>
          {fmtDate(trade.date)}
        </span>
        <span className="ml-auto text-xs font-semibold" style={{ color: pnlColor }}>
          {pnl > 0 ? "+" : ""}{pnl.toFixed(2)} $
        </span>
      </div>
      <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--chart-text-dim)" }}>
        <span>{fmtPrice(trade.entry)}</span>
        <span style={{ opacity: 0.4 }}>&rarr;</span>
        <span>{fmtPrice(trade.exit)}</span>
        <a
          href="/journal"
          className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
          style={{ color: "var(--chart-accent)" }}
        >
          {t("chartView")}
        </a>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MINI TRADE FORM (floating "+" at bottom-right)
   ══════════════════════════════════════════════════════ */
function MiniTradeForm({ symbol }: { symbol: string }) {
  const { addTrade } = useTrades();
  const { strategies } = useStrategies();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState("LONG");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const strategyNames =
    strategies.length > 0
      ? strategies.map((s) => s.name)
      : FALLBACK_STRATEGIES;

  const defaultAsset = useMemo(() => {
    const sym = normalizeSymbol(symbol);
    return ASSETS_LEGACY.find((a) => normalizeSymbol(a) === sym) || ASSETS_LEGACY[0];
  }, [symbol]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 10);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handler); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const entry = parseFloat(form.get("entry") as string);
    const exit = form.get("exit") as string;
    const exitVal = exit ? parseFloat(exit) : null;
    const lots = parseFloat(form.get("lots") as string);
    let result = 0;
    if (exitVal !== null) {
      const diff = direction === "LONG" ? exitVal - entry : entry - exitVal;
      result = diff * lots * 100000;
    }
    const trade = {
      date: new Date().toISOString(),
      asset: form.get("asset"),
      direction,
      strategy: form.get("strategy"),
      entry,
      exit: exitVal,
      sl: parseFloat(form.get("sl") as string),
      tp: parseFloat(form.get("tp") as string),
      lots,
      result,
      commission: 0,
      swap: 0,
      emotion: null,
      setup: null,
      tags: "",
      screenshots: [],
    };
    try {
      const ok = await addTrade(trade as Record<string, unknown>);
      if (ok) {
        setSuccess(true);
        setTimeout(() => { setOpen(false); setSuccess(false); }, 600);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`absolute bottom-3 right-3 z-20 w-10 h-10 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          open
            ? "rotate-45 bg-red-500/80 hover:bg-red-500"
            : "bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 hover:scale-110"
        }`}
        style={{
          backdropFilter: "blur(12px)",
          boxShadow: open
            ? "0 6px 20px rgba(239,68,68,0.3)"
            : "0 6px 20px rgba(0,229,255,0.25)",
        }}
        title={t("chartAddTrade")}
      >
        <Plus className="w-4 h-4 text-white transition-transform duration-300" />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute bottom-16 right-3 z-20 w-80 rounded-xl shadow-2xl overflow-hidden"
          style={{
            background: "rgba(10,10,18,0.95)",
            backdropFilter: "blur(24px)",
            border: "1px solid var(--chart-border)",
          }}
        >
          <div className="px-4 py-2.5 flex items-center justify-between border-b" style={{ borderColor: "var(--chart-border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--chart-text)" }}>
              {t("chartQuickTrade")}
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: "var(--chart-text-dim)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-3 space-y-2.5">
            <div>
              <label className="text-[10px] font-medium mb-0.5 block" style={{ color: "var(--chart-text-dim)" }}>
                {t("chartSymbol")}
              </label>
              <select
                name="asset"
                required
                defaultValue={defaultAsset}
                className={glassInputClass}
                style={{ color: "var(--chart-text)" }}
              >
                {ASSETS_LEGACY.map((a) => (
                  <option key={a} value={a} style={{ background: "#0a0a0f" }}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-medium mb-0.5 block" style={{ color: "var(--chart-text-dim)" }}>
                {t("chartDirection")}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDirection("LONG")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    direction === "LONG"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-white/5 border border-white/10 hover:bg-white/10"
                  }`}
                  style={direction !== "LONG" ? { color: "var(--chart-text-dim)" } : {}}
                >
                  {t("chartBuy")}
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("SHORT")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    direction === "SHORT"
                      ? "bg-red-500/20 text-red-400 border border-red-500/40"
                      : "bg-white/5 border border-white/10 hover:bg-white/10"
                  }`}
                  style={direction !== "SHORT" ? { color: "var(--chart-text-dim)" } : {}}
                >
                  {t("chartSell")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium mb-0.5 block" style={{ color: "var(--chart-text-dim)" }}>{t("chartEntry")}</label>
                <input name="entry" type="number" step="any" required className={glassInputClass} style={{ color: "var(--chart-text)" }} placeholder="0.00" />
              </div>
              <div>
                <label className="text-[10px] font-medium mb-0.5 block" style={{ color: "var(--chart-text-dim)" }}>{t("chartExit2")}</label>
                <input name="exit" type="number" step="any" className={glassInputClass} style={{ color: "var(--chart-text)" }} placeholder={t("chartOptional")} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-medium mb-0.5 block" style={{ color: "var(--chart-text-dim)" }}>SL</label>
                <input name="sl" type="number" step="any" required className={glassInputClass} style={{ color: "var(--chart-text)" }} placeholder="0.00" />
              </div>
              <div>
                <label className="text-[10px] font-medium mb-0.5 block" style={{ color: "var(--chart-text-dim)" }}>TP</label>
                <input name="tp" type="number" step="any" required className={glassInputClass} style={{ color: "var(--chart-text)" }} placeholder="0.00" />
              </div>
              <div>
                <label className="text-[10px] font-medium mb-0.5 block" style={{ color: "var(--chart-text-dim)" }}>Lots</label>
                <input name="lots" type="number" step="any" required className={glassInputClass} style={{ color: "var(--chart-text)" }} placeholder="0.01" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-medium mb-0.5 block" style={{ color: "var(--chart-text-dim)" }}>{t("chartStrategy")}</label>
              <select name="strategy" required className={glassInputClass} style={{ color: "var(--chart-text)" }}>
                {strategyNames.map((s) => (
                  <option key={s} value={s} style={{ background: "#0a0a0f" }}>{s}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className={`w-full py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                success
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg hover:shadow-cyan-500/20"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("chartSaving")}
                </span>
              ) : success ? (
                t("chartSaved")
              ) : (
                t("chartSaveTrade")
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ══════════════════════════════════════════════════════ */
export default function ChartPage() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const container2Ref = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dualChart, setDualChart] = useState(false);
  const [tradesOpen, setTradesOpen] = useState(false);

  /* ── Inject CSS variables ──────────────────────────── */
  useEffect(() => {
    const id = "chart-page-vars";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = CSS_VARS;
      document.head.appendChild(style);
    }
  }, []);

  /* ── Symbol & interval state ──────────────────────── */
  const [currentSymbol, setCurrentSymbol] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("chart-symbol") || "FX:EURUSD";
    }
    return "FX:EURUSD";
  });
  const [mainInterval, setMainInterval] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("chart-interval") || "60";
    }
    return "60";
  });

  /* ── Favorites (persisted) ──────────────────────────── */
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        return JSON.parse(localStorage.getItem("chart-favs") || "[]");
      } catch { return []; }
    }
    return [];
  });
  useEffect(() => {
    localStorage.setItem("chart-favs", JSON.stringify(favorites));
  }, [favorites]);

  const toggleFav = useCallback((id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  }, []);

  /* ── Persist symbol and interval ──────────────────── */
  useEffect(() => { localStorage.setItem("chart-symbol", currentSymbol); }, [currentSymbol]);
  useEffect(() => { localStorage.setItem("chart-interval", mainInterval); }, [mainInterval]);

  /* ── Detect theme ─────────────────────────────────── */
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const detect = () => {
      const stored = localStorage.getItem("theme");
      if (stored === "light") setTheme("light");
      else setTheme("dark");
    };
    detect();
    window.addEventListener("storage", detect);
    const observer = new MutationObserver(detect);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => { window.removeEventListener("storage", detect); observer.disconnect(); };
  }, []);

  /* ── Build main widget ────────────────────────────── */
  const buildWidget = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    buildTVWidget(el, {
      symbol: currentSymbol,
      interval: mainInterval,
      theme,
      height: "100%",
    });
  }, [theme, currentSymbol, mainInterval]);

  useEffect(() => {
    buildWidget();
    return () => { if (containerRef.current) containerRef.current.innerHTML = ""; };
  }, [buildWidget]);

  /* ── Build second widget when dual chart ────────── */
  useEffect(() => {
    const el = container2Ref.current;
    if (!el) return;
    if (!dualChart) { el.innerHTML = ""; return; }
    const secondInterval = mainInterval === "60" ? "D" : "60";
    buildTVWidget(el, {
      symbol: currentSymbol,
      interval: secondInterval,
      theme,
      height: "100%",
    });
    return () => { if (el) el.innerHTML = ""; };
  }, [dualChart, theme, currentSymbol, mainInterval]);

  /* ── Fullscreen ────────────────────────────────────── */
  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  /* ── Derived display symbol ────────────────────────── */
  const displaySymbol = useMemo(() => {
    const parts = currentSymbol.split(":");
    const raw = parts.length > 1 ? parts[1] : parts[0];
    const norm = normalizeSymbol(raw);
    const matched = ASSETS_LEGACY.find((a) => normalizeSymbol(a) === norm);
    return matched || raw;
  }, [currentSymbol]);

  /* ── Active symbol def ─────────────────────────────── */
  const activeSymDef = useMemo(
    () => SYMBOLS.find((s) => s.tv === currentSymbol),
    [currentSymbol],
  );
  const symbolLabel = activeSymDef
    ? activeSymDef.id
    : currentSymbol.split(":").pop() || currentSymbol;

  /* ── Handle symbol select from sidebar ─────────────── */
  const handleSymbolSelect = useCallback((sym: SymbolDef) => {
    setCurrentSymbol(sym.tv);
  }, []);

  /* ── Handle interval select ────────────────────────── */
  const handleIntervalSelect = useCallback((interval: string) => {
    setMainInterval(interval);
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="flex flex-col"
      style={{
        height: isFullscreen ? "100vh" : "calc(100vh - 64px)",
        background: "var(--chart-bg)",
        overflow: "hidden",
        margin: 0,
        borderRadius: 0,
      }}
    >
      {/* ── Timeframe bar (top) ─────────────────────────── */}
      <TimeframeBar
        activeInterval={mainInterval}
        onSelect={handleIntervalSelect}
        symbolLabel={symbolLabel}
      />

      {/* ── Main area: sidebar + chart ─────────────────── */}
      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        {/* Symbol sidebar */}
        <SymbolSidebar
          symbols={SYMBOLS}
          activeSymbol={currentSymbol}
          onSelect={handleSymbolSelect}
          favorites={favorites}
          onToggleFav={toggleFav}
        />

        {/* Chart container(s) */}
        <div className="flex-1 flex relative min-w-0 overflow-hidden">
          <div
            ref={containerRef}
            style={{
              height: "100%",
              width: dualChart ? "50%" : "100%",
              transition: "width 0.3s ease",
            }}
          />
          {dualChart && (
            <div
              ref={container2Ref}
              style={{
                height: "100%",
                width: "50%",
                borderLeft: "1px solid var(--chart-border)",
              }}
            />
          )}

          {/* Action toolbar (floating top-right of chart) */}
          <ActionToolbar
            wrapperRef={wrapperRef}
            theme={theme}
            dualChart={dualChart}
            isFullscreen={isFullscreen}
            tradesOpen={tradesOpen}
            onToggleDual={() => setDualChart((v) => !v)}
            onToggleFullscreen={toggleFullscreen}
            onToggleTrades={() => setTradesOpen((v) => !v)}
          />

          {/* Trades panel (right side overlay) */}
          <TradesPanel
            symbol={displaySymbol}
            open={tradesOpen}
            onClose={() => setTradesOpen(false)}
          />

          {/* Quick trade form (bottom-right FAB) */}
          <MiniTradeForm symbol={currentSymbol} />
        </div>
      </div>
    </div>
  );
}
