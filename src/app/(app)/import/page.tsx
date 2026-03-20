"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "@/i18n/context";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  Zap,
  Table2,
  Shield,
  X,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";
import Papa from "papaparse";

/* ─── Types ─── */
interface PlatformDef {
  id: string;
  name: string;
  abbr: string;
  color: string;
  requiredHeaders: string[];
  mapping: Record<string, string>;
}

interface DetectionResult {
  platform: PlatformDef;
  confidence: number;
  matchedHeaders: string[];
}

interface ImportResult {
  success: number;
  errors: number;
  errorDetails: string[];
}

/* ─── Platform Definitions ─── */
const PLATFORMS: PlatformDef[] = [
  {
    id: "mt4",
    name: "MetaTrader 4/5",
    abbr: "MT",
    color: "#3b82f6",
    requiredHeaders: ["Ticket", "Open Time", "Type", "Size", "Symbol", "Price", "S/L", "T/P", "Close Time", "Close Price", "Profit"],
    mapping: {
      "Symbol": "asset",
      "Type": "direction",
      "Price": "entry",
      "Close Price": "exit",
      "S/L": "sl",
      "T/P": "tp",
      "Profit": "result",
      "Open Time": "date",
      "Close Time": "exitDate",
      "Size": "lots",
      "Commission": "commission",
      "Swap": "swap",
    },
  },
  {
    id: "ctrader",
    name: "cTrader",
    abbr: "cT",
    color: "#8b5cf6",
    requiredHeaders: ["Position ID", "Symbol", "Direction", "Volume", "Entry Price", "Exit Price", "Net Profit", "Open Time", "Close Time"],
    mapping: {
      "Symbol": "asset",
      "Direction": "direction",
      "Entry Price": "entry",
      "Exit Price": "exit",
      "Net Profit": "result",
      "Open Time": "date",
      "Close Time": "exitDate",
      "Volume": "lots",
      "Commission": "commission",
      "Swap": "swap",
    },
  },
  {
    id: "tradingview",
    name: "TradingView",
    abbr: "TV",
    color: "#10b981",
    requiredHeaders: ["Trade #", "Type", "Signal", "Symbol", "Price", "Contracts", "Profit", "Run-up", "Drawdown"],
    mapping: {
      "Symbol": "asset",
      "Type": "direction",
      "Price": "entry",
      "Profit": "result",
      "Contracts": "lots",
      "Signal": "strategy",
    },
  },
  {
    id: "ib",
    name: "Interactive Brokers",
    abbr: "IB",
    color: "#ef4444",
    requiredHeaders: ["Symbol", "Date/Time", "Quantity", "T. Price", "Proceeds", "Comm/Fee", "Realized P/L"],
    mapping: {
      "Symbol": "asset",
      "Date/Time": "date",
      "Quantity": "lots",
      "T. Price": "entry",
      "Proceeds": "exit",
      "Comm/Fee": "commission",
      "Realized P/L": "result",
    },
  },
  {
    id: "binance",
    name: "Binance",
    abbr: "BN",
    color: "#f59e0b",
    requiredHeaders: ["Order No", "Date(UTC)", "Pair", "Type", "Side", "Order Price", "Order Amount", "Avg Trading Price", "Filled", "Total", "status"],
    mapping: {
      "Pair": "asset",
      "Side": "direction",
      "Order Price": "entry",
      "Avg Trading Price": "exit",
      "Total": "result",
      "Date(UTC)": "date",
      "Filled": "lots",
    },
  },
];

const TARGET_FIELD_KEYS = [
  { key: "date", labelKey: "fieldDate", required: true },
  { key: "asset", labelKey: "fieldAsset", required: true },
  { key: "direction", labelKey: "fieldDirection", required: true },
  { key: "entry", labelKey: "fieldEntry", required: false },
  { key: "exit", labelKey: "fieldExit", required: false },
  { key: "sl", labelKey: "fieldSl", required: false },
  { key: "tp", labelKey: "fieldTp", required: false },
  { key: "lots", labelKey: "fieldLots", required: false },
  { key: "result", labelKey: "fieldResult", required: false },
  { key: "commission", labelKey: "fieldCommission", required: false },
  { key: "swap", labelKey: "fieldSwap", required: false },
  { key: "strategy", labelKey: "fieldStrategy", required: false },
  { key: "tags", labelKey: "fieldTags", required: false },
  { key: "exitDate", labelKey: "fieldExitDate", required: false },
];

/* ─── Platform Detection ─── */
function detectPlatform(headers: string[]): DetectionResult | null {
  const normalizedHeaders = headers.map((h) => h.trim());
  let bestMatch: DetectionResult | null = null;

  for (const platform of PLATFORMS) {
    const matched = platform.requiredHeaders.filter((rh) =>
      normalizedHeaders.some((h) => h.toLowerCase() === rh.toLowerCase())
    );
    const confidence = matched.length / platform.requiredHeaders.length;

    if (confidence >= 0.5 && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = { platform, confidence, matchedHeaders: matched };
    }
  }

  return bestMatch;
}

/* ─── Normalize Direction ─── */
function normalizeDirection(raw: string): "LONG" | "SHORT" {
  const d = raw.toLowerCase().trim();
  if (d.includes("buy") || d.includes("long") || d === "0" || d === "b") return "LONG";
  return "SHORT";
}

/* ─── Parse Number ─── */
function parseNum(val: unknown): number {
  if (val === undefined || val === null || val === "") return 0;
  return parseFloat(String(val).replace(/,/g, ".").replace(/[^0-9.\-]/g, "")) || 0;
}

/* ─── Component ─── */
export default function ImportPage() {
  const { t } = useTranslation();
  const TARGET_FIELDS = TARGET_FIELD_KEYS.map((f) => ({ ...f, label: t(f.labelKey) }));
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  /* Mapped fields summary */
  const mappedFields = useMemo(() => {
    const reverseMap: Record<string, string> = {};
    for (const [src, tgt] of Object.entries(mapping)) {
      if (tgt) reverseMap[tgt] = src;
    }
    return reverseMap;
  }, [mapping]);

  const requiredMapped = mappedFields["date"] && mappedFields["direction"];

  /* Preview rows */
  const previewRows = useMemo(() => {
    return rawData.slice(0, 5).map((row) => {
      const out: Record<string, string> = {};
      for (const [sourceCol, targetField] of Object.entries(mapping)) {
        if (targetField && row[sourceCol] !== undefined) {
          out[targetField] = row[sourceCol];
        }
      }
      if (out.direction) {
        out.direction = normalizeDirection(out.direction);
      }
      return out;
    });
  }, [rawData, mapping]);

  /* Handle file parsing */
  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, string>[];
        if (data.length === 0) return;
        setRawData(data);
        const csvHeaders = Object.keys(data[0]);
        setHeaders(csvHeaders);

        const detected = detectPlatform(csvHeaders);
        setDetection(detected);

        if (detected && detected.confidence >= 0.5) {
          setMapping(detected.platform.mapping);
        } else {
          setMapping({});
        }

        setStep(2);
      },
    });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".csv") || file.name.endsWith(".tsv"))) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const applyPlatformMapping = (platform: PlatformDef) => {
    setMapping(platform.mapping);
    setDetection({ platform, confidence: 1, matchedHeaders: platform.requiredHeaders });
  };

  /* Import */
  const doImport = async () => {
    setImporting(true);
    const errorDetails: string[] = [];
    const trades = rawData
      .map((row, idx) => {
        const out: Record<string, unknown> = {};
        for (const [sourceCol, targetField] of Object.entries(mapping)) {
          if (targetField && row[sourceCol] !== undefined) {
            out[targetField] = row[sourceCol];
          }
        }
        // Normalize direction
        if (out.direction) {
          out.direction = normalizeDirection(String(out.direction));
        }
        // Quantity-based direction detection for IB
        if (!out.direction && out.lots) {
          const qty = parseNum(out.lots);
          out.direction = qty >= 0 ? "LONG" : "SHORT";
          out.lots = Math.abs(qty);
        }
        // Parse numbers
        for (const f of ["entry", "exit", "lots", "result", "commission", "swap", "sl", "tp"]) {
          if (out[f] !== undefined && out[f] !== "") {
            out[f] = parseNum(out[f]);
          }
        }
        if (!out.strategy) out.strategy = "Import CSV";
        // Validate
        if (!out.date || !out.direction) {
          errorDetails.push(t("importRowError", { row: idx + 1 }));
          return null;
        }
        return out;
      })
      .filter(Boolean);

    try {
      const res = await fetch("/api/trades/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trades }),
      });
      const data = await res.json();
      setResult({
        success: data.count || 0,
        errors: trades.length - (data.count || 0) + errorDetails.length,
        errorDetails,
      });
      setStep(5);
    } catch {
      setResult({ success: 0, errors: trades.length, errorDetails: [t("serverError")] });
      setStep(5);
    }
    setImporting(false);
  };

  const resetAll = () => {
    setStep(1);
    setRawData([]);
    setHeaders([]);
    setMapping({});
    setDetection(null);
    setResult(null);
    setFileName("");
    setDragOver(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  /* ─── Step indicator ─── */
  const steps = [
    { num: 1, label: t("stepFile") },
    { num: 2, label: t("stepDetection") },
    { num: 3, label: t("stepMapping") },
    { num: 4, label: t("stepPreview") },
    { num: 5, label: t("stepResult") },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {t("importCsv")}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {t("importCsvDesc")}
        </p>
      </div>

      {/* Supported platforms badges */}
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-default"
            style={{
              background: detection?.platform.id === p.id ? `${p.color}20` : "var(--bg-card)",
              border: `1px solid ${detection?.platform.id === p.id ? p.color : "var(--border)"}`,
              color: detection?.platform.id === p.id ? p.color : "var(--text-secondary)",
            }}
          >
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold text-white"
              style={{ background: p.color }}
            >
              {p.abbr}
            </span>
            {p.name}
            {detection?.platform.id === p.id && (
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: p.color }} />
            )}
          </div>
        ))}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{
            background: detection === null && step > 1 ? "var(--bg-hover)" : "var(--bg-card)",
            border: `1px solid ${detection === null && step > 1 ? "#64748b" : "var(--border)"}`,
            color: "var(--text-secondary)",
          }}
        >
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold text-white bg-gray-500">
            ?
          </span>
          {t("custom")}
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background:
                    step >= s.num
                      ? step === s.num
                        ? "#0ea5e9"
                        : "rgba(14, 165, 233, 0.2)"
                      : "var(--bg-secondary)",
                  color: step >= s.num ? (step === s.num ? "white" : "#0ea5e9") : "var(--text-muted)",
                  border: step === s.num ? "2px solid #0ea5e9" : "2px solid transparent",
                }}
              >
                {step > s.num ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  s.num
                )}
              </div>
              <span
                className="text-xs font-medium hidden sm:inline"
                style={{ color: step >= s.num ? "var(--text-primary)" : "var(--text-muted)" }}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="w-8 h-px mx-2"
                style={{ background: step > s.num ? "#0ea5e9" : "var(--border)" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* ─── Step 1: Upload ─── */}
      {step === 1 && (
        <div
          className={`metric-card rounded-2xl p-12 text-center cursor-pointer transition-all ${
            dragOver ? "ring-2 ring-cyan-400 scale-[1.01]" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv"
            className="hidden"
            onChange={onFileSelect}
          />
          <div
            className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{ background: "rgba(14, 165, 233, 0.1)" }}
          >
            <Upload className="w-10 h-10" style={{ color: "#0ea5e9" }} />
          </div>
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {t("dropCsvHere")}
          </p>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            {t("orClickToSelect")}
          </p>
          <div className="flex items-center justify-center gap-4 mt-6">
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <FileSpreadsheet className="w-3.5 h-3.5" /> CSV, TSV
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <Zap className="w-3.5 h-3.5" /> {t("autoDetection")}
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <Shield className="w-3.5 h-3.5" /> {t("maxTrades")}
            </span>
          </div>
        </div>
      )}

      {/* ─── Step 2: Detection Result ─── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* File info */}
          <div
            className="metric-card rounded-2xl p-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(14, 165, 233, 0.1)" }}
              >
                <FileText className="w-5 h-5" style={{ color: "#0ea5e9" }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {fileName}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {rawData.length} {t("rows")} &middot; {headers.length} {t("columns")}
                </p>
              </div>
            </div>
            <button
              onClick={resetAll}
              className="p-2 rounded-lg transition-colors hover:bg-red-500/10"
              style={{ color: "var(--text-muted)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Detection badge */}
          <div className="metric-card rounded-2xl p-6">
            {detection && detection.confidence >= 0.5 ? (
              <div className="text-center space-y-4">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-2xl font-bold text-white"
                  style={{ background: detection.platform.color }}
                >
                  {detection.platform.abbr}
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                      {detection.platform.name} {t("detected")}
                    </h3>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        background:
                          detection.confidence >= 0.8
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(245, 158, 11, 0.15)",
                        color: detection.confidence >= 0.8 ? "#10b981" : "#f59e0b",
                      }}
                    >
                      {Math.round(detection.confidence * 100)}% {t("confidence")}
                    </span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    {detection.matchedHeaders.length} / {detection.platform.requiredHeaders.length} {t("columnsRecognized")}
                  </p>
                </div>

                {/* Detected headers */}
                <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                  {detection.platform.requiredHeaders.map((h) => {
                    const found = detection.matchedHeaders.some(
                      (m) => m.toLowerCase() === h.toLowerCase()
                    );
                    return (
                      <span
                        key={h}
                        className="px-2 py-1 rounded-md text-[11px] font-mono"
                        style={{
                          background: found ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                          color: found ? "#10b981" : "#ef4444",
                          border: `1px solid ${found ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                        }}
                      >
                        {found ? "\u2713" : "\u2717"} {h}
                      </span>
                    );
                  })}
                </div>

                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {t("mappingAutoConfigured")}
                </p>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                  style={{ background: "rgba(245, 158, 11, 0.1)" }}
                >
                  <AlertCircle className="w-8 h-8" style={{ color: "#f59e0b" }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                    {t("formatNotRecognized")}
                  </h3>
                  <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    {t("selectPlatformOrManual")}
                  </p>
                </div>

                {/* Manual platform selection */}
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => applyPlatformMapping(p)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                      style={{
                        background: `${p.color}15`,
                        border: `1px solid ${p.color}40`,
                        color: p.color,
                      }}
                    >
                      <span
                        className="w-5 h-5 rounded text-[9px] font-bold text-white flex items-center justify-center"
                        style={{ background: p.color }}
                      >
                        {p.abbr}
                      </span>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <button
                onClick={resetAll}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                <ArrowLeft className="w-4 h-4" />
                {t("back")}
              </button>
              <button
                onClick={() => setStep(3)}
                className="btn-primary text-white px-6 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              >
                {t("configureMapping")}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 3: Column Mapping ─── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Platform override */}
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPlatformMapping(p)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: detection?.platform.id === p.id ? `${p.color}20` : "transparent",
                  border: `1px solid ${detection?.platform.id === p.id ? p.color : "var(--border)"}`,
                  color: detection?.platform.id === p.id ? p.color : "var(--text-muted)",
                }}
              >
                {p.abbr} {p.name}
              </button>
            ))}
          </div>

          <div className="metric-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Table2 className="w-5 h-5" style={{ color: "#0ea5e9" }} />
                {t("mapColumns")}
              </h3>
              <span className="text-xs px-3 py-1 rounded-full" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                {rawData.length} {t("rows")}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {headers.map((h) => (
                <div
                  key={h}
                  className="flex items-center gap-3 p-2.5 rounded-xl transition-all"
                  style={{
                    background: mapping[h] ? "rgba(14, 165, 233, 0.05)" : "transparent",
                    border: `1px solid ${mapping[h] ? "rgba(14, 165, 233, 0.15)" : "var(--border-subtle)"}`,
                  }}
                >
                  <span
                    className="text-xs font-mono truncate w-36 shrink-0"
                    style={{ color: "var(--text-secondary)" }}
                    title={h}
                  >
                    {h}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
                  <div className="relative flex-1 min-w-0">
                    <select
                      value={mapping[h] || ""}
                      onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}
                      className="input-field text-xs appearance-none pr-7 w-full"
                      style={{ paddingTop: "6px", paddingBottom: "6px" }}
                    >
                      <option value="">-- {t("ignore")} --</option>
                      {TARGET_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label} {f.required ? "*" : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                      style={{ color: "var(--text-muted)" }}
                    />
                  </div>
                  {mapping[h] && (
                    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#10b981" }} />
                  )}
                </div>
              ))}
            </div>

            {/* Mapped fields summary */}
            <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                {t("mappedFields")} :
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TARGET_FIELDS.map((f) => {
                  const isMapped = !!mappedFields[f.key];
                  return (
                    <span
                      key={f.key}
                      className="px-2 py-1 rounded-md text-[11px] font-medium"
                      style={{
                        background: isMapped ? "rgba(16, 185, 129, 0.1)" : f.required ? "rgba(239, 68, 68, 0.1)" : "var(--bg-secondary)",
                        color: isMapped ? "#10b981" : f.required ? "#ef4444" : "var(--text-muted)",
                        border: `1px solid ${isMapped ? "rgba(16, 185, 129, 0.2)" : f.required ? "rgba(239, 68, 68, 0.2)" : "var(--border-subtle)"}`,
                      }}
                    >
                      {isMapped ? "\u2713" : f.required ? "\u2717" : "\u2013"} {f.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                <ArrowLeft className="w-4 h-4" />
                {t("back")}
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!requiredMapped}
                className="btn-primary text-white px-6 py-2 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("preview")}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 4: Preview ─── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="metric-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <FileText className="w-5 h-5" style={{ color: "#0ea5e9" }} />
                {t("previewFirst5Trades")}
              </h3>
              <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: "rgba(14, 165, 233, 0.1)", color: "#0ea5e9" }}>
                {rawData.length} {t("tradesTotal")}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border-subtle)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "var(--bg-secondary)" }}>
                    {Object.values(mapping)
                      .filter(Boolean)
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .map((f) => {
                        const field = TARGET_FIELDS.find((tf) => tf.key === f);
                        return (
                          <th
                            key={f}
                            className="px-3 py-2.5 text-left font-semibold"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {field?.label || f}
                          </th>
                        );
                      })}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      className="transition-colors"
                    >
                      {Object.values(mapping)
                        .filter(Boolean)
                        .filter((v, i, a) => a.indexOf(v) === i)
                        .map((f) => (
                          <td
                            key={f}
                            className="px-3 py-2.5 font-mono"
                            style={{
                              color:
                                f === "direction"
                                  ? row[f] === "LONG"
                                    ? "#10b981"
                                    : "#ef4444"
                                  : f === "result"
                                  ? parseFloat(row[f] || "0") >= 0
                                    ? "#10b981"
                                    : "#ef4444"
                                  : "var(--text-primary)",
                            }}
                          >
                            {f === "direction" ? (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                style={{
                                  background: row[f] === "LONG" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                }}
                              >
                                {row[f] || "\u2014"}
                              </span>
                            ) : (
                              row[f] || "\u2014"
                            )}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mapped fields visual */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {TARGET_FIELDS.filter((f) => mappedFields[f.key]).map((f) => (
                <div
                  key={f.key}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.15)" }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#10b981" }} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold truncate" style={{ color: "#10b981" }}>
                      {f.label}
                    </p>
                    <p className="text-[10px] font-mono truncate" style={{ color: "var(--text-muted)" }}>
                      {mappedFields[f.key]}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-6 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                <ArrowLeft className="w-4 h-4" />
                {t("editMapping")}
              </button>
              <button
                onClick={doImport}
                disabled={importing}
                className="btn-primary text-white px-8 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t("importInProgress")}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {t("importTrades", { count: rawData.length })}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 5: Result ─── */}
      {step === 5 && result && (
        <div className="metric-card rounded-2xl p-12 text-center">
          {result.success > 0 ? (
            <>
              <div
                className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
                style={{ background: "rgba(16, 185, 129, 0.1)" }}
              >
                <CheckCircle2 className="w-10 h-10" style={{ color: "#10b981" }} />
              </div>
              <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                {t("importDone")}
              </h3>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: "#10b981" }}>
                    {result.success}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {t("tradesImported")}
                  </p>
                </div>
                {result.errors > 0 && (
                  <div className="text-center">
                    <p className="text-3xl font-bold" style={{ color: "#ef4444" }}>
                      {result.errors}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      {t("erreurs")}
                    </p>
                  </div>
                )}
              </div>
              {detection && (
                <p className="text-sm mt-4" style={{ color: "var(--text-secondary)" }}>
                  {t("source")} : {detection.platform.name}
                </p>
              )}
              {result.errorDetails.length > 0 && (
                <div
                  className="mt-4 p-3 rounded-xl text-left max-h-32 overflow-y-auto text-xs"
                  style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.15)" }}
                >
                  {result.errorDetails.slice(0, 10).map((e, i) => (
                    <p key={i} style={{ color: "#ef4444" }}>{e}</p>
                  ))}
                  {result.errorDetails.length > 10 && (
                    <p style={{ color: "var(--text-muted)" }}>
                      {t("andMoreErrors", { count: result.errorDetails.length - 10 })}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div
                className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
                style={{ background: "rgba(239, 68, 68, 0.1)" }}
              >
                <AlertCircle className="w-10 h-10" style={{ color: "#ef4444" }} />
              </div>
              <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                {t("importError")}
              </h3>
              <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
                {t("importErrorDesc")}
              </p>
              {result.errorDetails.length > 0 && (
                <div
                  className="mt-4 p-3 rounded-xl text-left max-h-32 overflow-y-auto text-xs"
                  style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.15)" }}
                >
                  {result.errorDetails.slice(0, 10).map((e, i) => (
                    <p key={i} style={{ color: "#ef4444" }}>{e}</p>
                  ))}
                </div>
              )}
            </>
          )}
          <button
            onClick={resetAll}
            className="btn-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold mt-8 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t("newImport")}
          </button>
        </div>
      )}
    </div>
  );
}
