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
  Save,
  BookmarkCheck,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "@/i18n/context";
import { useAdvancedFilters } from "@/hooks/useAdvancedFilters";
import type { FilterPreset } from "@/hooks/useAdvancedFilters";
import type { Trade } from "@/hooks/useTrades";

export type { AdvancedFilters as FilterState } from "@/hooks/useAdvancedFilters";

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
  const {
    filters, setFilter, resetAll, activeFilterCount, EMOTION_OPTIONS,
    presets, savePreset, deletePreset, loadPreset,
  } = useAdvancedFilters();
  const [expanded, setExpanded] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const presetMenuRef = useRef<HTMLDivElement>(null);

  // Close preset menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (presetMenuRef.current && !presetMenuRef.current.contains(e.target as Node)) {
        setShowPresetMenu(false);
      }
    };
    if (showPresetMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPresetMenu]);

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

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    savePreset(presetName.trim());
    setPresetName("");
    setShowSaveModal(false);
  };

  const handleLoadPreset = (preset: FilterPreset) => {
    loadPreset(preset);
    setShowPresetMenu(false);
  };

  return (
    <div className="mb-6">
      {/* Toggle bar */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
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

        {/* Preset dropdown */}
        <div className="relative" ref={presetMenuRef}>
          <button
            onClick={() => setShowPresetMenu(!showPresetMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-[--border] bg-[--bg-secondary]/50 hover:bg-[--bg-secondary] transition"
            title="Filtres enregistres"
          >
            <BookmarkCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Presets</span>
            {presets.length > 0 && (
              <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full font-bold">
                {presets.length}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-[--text-muted] transition ${showPresetMenu ? "rotate-180" : ""}`} />
          </button>
          {showPresetMenu && (
            <div className="absolute z-50 top-full mt-1 right-0 w-64 rounded-xl border border-[--border] bg-[--bg-card] shadow-2xl backdrop-blur-xl overflow-hidden">
              {presets.length === 0 ? (
                <div className="px-4 py-3 text-xs text-[--text-muted] text-center">
                  Aucun preset enregistre
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto">
                  {presets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center gap-2 px-3 py-2.5 hover:bg-[--bg-hover] transition group"
                    >
                      <button
                        onClick={() => handleLoadPreset(preset)}
                        className="flex-1 text-left text-sm text-[--text-primary] truncate"
                      >
                        {preset.name}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePreset(preset.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 transition p-1"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-[--border]">
                <button
                  onClick={() => {
                    setShowPresetMenu(false);
                    setShowSaveModal(true);
                  }}
                  disabled={activeFilterCount === 0}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-cyan-400 hover:bg-cyan-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5" />
                  Sauvegarder le filtre actuel
                </button>
              </div>
            </div>
          )}
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

            {/* Min RR */}
            <div>
              <label className="flex items-center gap-1 text-xs text-[--text-muted] mb-1">
                <TrendingUp className="w-3 h-3" />
                Min R:R
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={filters.minRR}
                onChange={(e) => setFilter("minRR", e.target.value)}
                placeholder="0"
                className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-lg px-3 py-2 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:border-cyan-500/50 focus:outline-none transition"
              />
            </div>

            {/* Max RR */}
            <div>
              <label className="flex items-center gap-1 text-xs text-[--text-muted] mb-1">
                <TrendingUp className="w-3 h-3" />
                Max R:R
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={filters.maxRR}
                onChange={(e) => setFilter("maxRR", e.target.value)}
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
              {filters.minRR && (
                <FilterTag label={`Min R:R ${filters.minRR}`} onRemove={() => setFilter("minRR", "")} />
              )}
              {filters.maxRR && (
                <FilterTag label={`Max R:R ${filters.maxRR}`} onRemove={() => setFilter("maxRR", "")} />
              )}
              {filters.session !== "ALL" && (
                <FilterTag label={filters.session} onRemove={() => setFilter("session", "ALL")} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Save preset modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl p-6 max-w-sm w-full border border-[--border] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold flex items-center gap-2 text-[--text-primary]">
                <Save className="w-5 h-5 text-cyan-400" />
                Sauvegarder le filtre
              </h3>
              <button onClick={() => setShowSaveModal(false)} className="text-[--text-muted] hover:text-[--text-primary] transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
              placeholder="Nom du preset..."
              maxLength={50}
              autoFocus
              className="w-full bg-[--bg-secondary]/50 border border-[--border] rounded-xl px-4 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:border-cyan-500/50 transition mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-[--border] bg-[--bg-secondary]/50 hover:bg-[--bg-secondary] transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Sauvegarder
              </button>
            </div>
          </div>
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
