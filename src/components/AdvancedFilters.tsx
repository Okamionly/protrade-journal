"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Search,
  Calendar,
  DollarSign,
  Clock,
} from "lucide-react";
import { useTranslation } from "@/i18n/context";
import { useAdvancedFilters } from "@/hooks/useAdvancedFilters";
import type { Trade } from "@/hooks/useTrades";

interface AdvancedFiltersProps {
  trades: Trade[];
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-3 py-2 text-sm text-[--text-primary] hover:border-cyan-500/30 transition"
      >
        <span className="truncate">
          {selected.length === 0 ? label : `${label} (${selected.length})`}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-[--text-muted] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-full max-h-48 overflow-y-auto rounded-lg border border-[--border] bg-[--bg-card] shadow-xl">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[--text-muted]">--</div>
          ) : (
            options.map((opt) => (
              <button
                key={opt}
                onClick={() => toggle(opt)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[--bg-hover] transition ${
                  selected.includes(opt) ? "text-cyan-400 bg-cyan-500/10" : "text-[--text-primary]"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${
                    selected.includes(opt)
                      ? "bg-cyan-500 border-cyan-500"
                      : "border-[--border]"
                  }`}
                >
                  {selected.includes(opt) && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="truncate">{opt}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function AdvancedFilters({ trades }: AdvancedFiltersProps) {
  const { t } = useTranslation();
  const { filters, setFilter, resetAll, activeFilterCount, EMOTION_OPTIONS } = useAdvancedFilters();
  const [expanded, setExpanded] = useState(false);

  // Derive unique values from trades
  const uniqueAssets = useMemo(() => [...new Set(trades.map((t) => t.asset))].sort(), [trades]);
  const uniqueStrategies = useMemo(() => [...new Set(trades.map((t) => t.strategy))].sort(), [trades]);
  const uniqueTags = useMemo(() => {
    const all = trades.flatMap((t) => (t.tags || "").split(",").map((s) => s.trim()).filter(Boolean));
    return [...new Set(all)].sort();
  }, [trades]);
  const uniqueEmotions = useMemo(() => {
    const fromTrades = trades.map((t) => t.emotion).filter((e): e is string => !!e);
    return [...new Set([...EMOTION_OPTIONS, ...fromTrades])].sort();
  }, [trades, EMOTION_OPTIONS]);

  return (
    <div className="mb-6">
      {/* Toggle bar */}
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[--border] bg-[--bg-secondary]/50 hover:bg-[--bg-secondary] transition relative"
        >
          <Filter className="w-4 h-4" />
          {t("advancedFilters")}
          {activeFilterCount > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-cyan-500 text-white text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Quick search always visible */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
          <input
            type="text"
            placeholder={t("search")}
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-lg pl-10 pr-4 py-2 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:border-cyan-500/50 focus:outline-none transition"
          />
        </div>

        {activeFilterCount > 0 && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-secondary]/50 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t("resetAll")}
          </button>
        )}
      </div>

      {/* Expanded filter panel */}
      {expanded && (
        <div className="glass rounded-xl p-4 border border-[--border] animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {/* Date range */}
            <div>
              <label className="flex items-center gap-1 text-xs text-[--text-muted] mb-1">
                <Calendar className="w-3 h-3" />
                {t("dateFrom")}
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilter("dateFrom", e.target.value)}
                className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-3 py-2 text-sm text-[--text-primary] focus:border-cyan-500/50 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs text-[--text-muted] mb-1">
                <Calendar className="w-3 h-3" />
                {t("dateTo")}
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilter("dateTo", e.target.value)}
                className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-3 py-2 text-sm text-[--text-primary] focus:border-cyan-500/50 focus:outline-none transition"
              />
            </div>

            {/* Asset multi-select */}
            <div>
              <label className="text-xs text-[--text-muted] mb-1 block">{t("assetCol")}</label>
              <MultiSelect
                label={t("allAssets")}
                options={uniqueAssets}
                selected={filters.assets}
                onChange={(v) => setFilter("assets", v)}
              />
            </div>

            {/* Direction */}
            <div>
              <label className="text-xs text-[--text-muted] mb-1 block">{t("directionCol")}</label>
              <select
                value={filters.direction}
                onChange={(e) => setFilter("direction", e.target.value)}
                className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-3 py-2 text-sm text-[--text-primary]"
              >
                <option value="ALL">{t("allDirections")}</option>
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
              </select>
            </div>

            {/* Result */}
            <div>
              <label className="text-xs text-[--text-muted] mb-1 block">{t("resultCol")}</label>
              <select
                value={filters.result}
                onChange={(e) => setFilter("result", e.target.value)}
                className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-3 py-2 text-sm text-[--text-primary]"
              >
                <option value="ALL">{t("allResults")}</option>
                <option value="WIN">{t("winnersFilter")}</option>
                <option value="LOSS">{t("losersFilter")}</option>
                <option value="BE">{t("breakeven")}</option>
              </select>
            </div>

            {/* Strategy multi-select */}
            <div>
              <label className="text-xs text-[--text-muted] mb-1 block">{t("strategyCol")}</label>
              <MultiSelect
                label={t("allStrategies")}
                options={uniqueStrategies}
                selected={filters.strategies}
                onChange={(v) => setFilter("strategies", v)}
              />
            </div>

            {/* Emotion multi-select */}
            <div>
              <label className="text-xs text-[--text-muted] mb-1 block">{t("emotionCol")}</label>
              <MultiSelect
                label={t("allEmotions")}
                options={uniqueEmotions}
                selected={filters.emotions}
                onChange={(v) => setFilter("emotions", v)}
              />
            </div>

            {/* Tags multi-select */}
            <div>
              <label className="text-xs text-[--text-muted] mb-1 block">{t("tagsLabel")}</label>
              <MultiSelect
                label={t("allTags")}
                options={uniqueTags}
                selected={filters.tags}
                onChange={(v) => setFilter("tags", v)}
              />
            </div>

            {/* Min P&L */}
            <div>
              <label className="flex items-center gap-1 text-xs text-[--text-muted] mb-1">
                <DollarSign className="w-3 h-3" />
                {t("minPnl")}
              </label>
              <input
                type="number"
                step="any"
                value={filters.minPnl}
                onChange={(e) => setFilter("minPnl", e.target.value)}
                placeholder="0"
                className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-3 py-2 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:border-cyan-500/50 focus:outline-none transition"
              />
            </div>

            {/* Max P&L */}
            <div>
              <label className="flex items-center gap-1 text-xs text-[--text-muted] mb-1">
                <DollarSign className="w-3 h-3" />
                {t("maxPnl")}
              </label>
              <input
                type="number"
                step="any"
                value={filters.maxPnl}
                onChange={(e) => setFilter("maxPnl", e.target.value)}
                placeholder="0"
                className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-3 py-2 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:border-cyan-500/50 focus:outline-none transition"
              />
            </div>

            {/* Session */}
            <div>
              <label className="flex items-center gap-1 text-xs text-[--text-muted] mb-1">
                <Clock className="w-3 h-3" />
                {t("sessionLabel")}
              </label>
              <select
                value={filters.session}
                onChange={(e) => setFilter("session", e.target.value)}
                className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-3 py-2 text-sm text-[--text-primary]"
              >
                <option value="ALL">{t("allSessions")}</option>
                <option value="Tokyo">{t("sessionTokyo")}</option>
                <option value="London">{t("sessionLondon")}</option>
                <option value="New York">{t("sessionNewYork")}</option>
                <option value="Sydney">{t("sessionSydney")}</option>
              </select>
            </div>
          </div>

          {/* Active filter tags */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[--border]">
              {filters.assets.map((a) => (
                <FilterTag key={`a-${a}`} label={a} onRemove={() => setFilter("assets", filters.assets.filter((x) => x !== a))} />
              ))}
              {filters.direction !== "ALL" && (
                <FilterTag label={filters.direction} onRemove={() => setFilter("direction", "ALL")} />
              )}
              {filters.result !== "ALL" && (
                <FilterTag label={filters.result} onRemove={() => setFilter("result", "ALL")} />
              )}
              {filters.strategies.map((s) => (
                <FilterTag key={`s-${s}`} label={s} onRemove={() => setFilter("strategies", filters.strategies.filter((x) => x !== s))} />
              ))}
              {filters.emotions.map((e) => (
                <FilterTag key={`e-${e}`} label={e} onRemove={() => setFilter("emotions", filters.emotions.filter((x) => x !== e))} />
              ))}
              {filters.tags.map((tg) => (
                <FilterTag key={`t-${tg}`} label={`#${tg}`} onRemove={() => setFilter("tags", filters.tags.filter((x) => x !== tg))} />
              ))}
              {filters.session !== "ALL" && (
                <FilterTag label={filters.session} onRemove={() => setFilter("session", "ALL")} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-500/15 text-cyan-400 text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-white transition">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
