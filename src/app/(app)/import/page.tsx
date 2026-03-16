"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";
import Papa from "papaparse";

interface PreviewRow {
  date: string;
  asset: string;
  direction: string;
  entry: string;
  exit: string;
  lots: string;
  result: string;
  [key: string]: string;
}

interface BrokerPreset {
  name: string;
  mapping: Record<string, string>;
}

const BROKER_PRESETS: BrokerPreset[] = [
  {
    name: "MT4 / MT5",
    mapping: { "Open Time": "date", "Symbol": "asset", "Type": "direction", "Open Price": "entry", "Close Price": "exit", "Volume": "lots", "Profit": "result", "Commission": "commission", "Swap": "swap" },
  },
  {
    name: "cTrader",
    mapping: { "Opening Time": "date", "Symbol": "asset", "Direction": "direction", "Entry Price": "entry", "Closing Price": "exit", "Quantity": "lots", "Net Profit": "result", "Commission": "commission", "Swap": "swap" },
  },
  {
    name: "TradingView",
    mapping: { "Date/Time": "date", "Symbol": "asset", "Side": "direction", "Price": "entry", "Close Price": "exit", "Qty": "lots", "Profit": "result" },
  },
  {
    name: "Personnalisé",
    mapping: {},
  },
];

const TARGET_FIELDS = ["date", "asset", "direction", "entry", "exit", "lots", "result", "commission", "swap", "sl", "tp", "strategy", "tags"];

export default function ImportPage() {
  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload");
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preset, setPreset] = useState<string>("MT4 / MT5");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, string>[];
        if (data.length === 0) return;
        setRawData(data);
        setHeaders(Object.keys(data[0]));
        // Auto-apply preset
        const p = BROKER_PRESETS.find((b) => b.name === preset);
        if (p) setMapping(p.mapping);
        setStep("map");
      },
    });
  }, [preset]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".tsv"))) {
      handleFile(file);
    }
  }, [handleFile]);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const applyPreset = (name: string) => {
    setPreset(name);
    const p = BROKER_PRESETS.find((b) => b.name === name);
    if (p) setMapping(p.mapping);
  };

  const generatePreview = () => {
    const mapped: PreviewRow[] = rawData.slice(0, 10).map((row) => {
      const out: Record<string, string> = {};
      for (const [sourceCol, targetField] of Object.entries(mapping)) {
        if (targetField && row[sourceCol] !== undefined) {
          out[targetField] = row[sourceCol];
        }
      }
      // Normalize direction
      if (out.direction) {
        const d = out.direction.toLowerCase();
        out.direction = d.includes("buy") || d.includes("long") || d === "0" ? "LONG" : "SHORT";
      }
      return out as PreviewRow;
    });
    setPreview(mapped);
    setStep("preview");
  };

  const doImport = async () => {
    setImporting(true);
    const trades = rawData.map((row) => {
      const out: Record<string, unknown> = {};
      for (const [sourceCol, targetField] of Object.entries(mapping)) {
        if (targetField && row[sourceCol] !== undefined) {
          out[targetField] = row[sourceCol];
        }
      }
      // Normalize direction
      if (out.direction) {
        const d = String(out.direction).toLowerCase();
        out.direction = d.includes("buy") || d.includes("long") || d === "0" ? "LONG" : "SHORT";
      }
      // Parse numbers
      for (const f of ["entry", "exit", "lots", "result", "commission", "swap", "sl", "tp"]) {
        if (out[f] !== undefined && out[f] !== "") {
          out[f] = parseFloat(String(out[f]).replace(",", ".")) || 0;
        }
      }
      if (!out.strategy) out.strategy = "Import CSV";
      return out;
    });

    try {
      const res = await fetch("/api/trades/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trades }),
      });
      const data = await res.json();
      setResult({ success: data.count || 0, errors: trades.length - (data.count || 0) });
      setStep("done");
    } catch {
      setResult({ success: 0, errors: trades.length });
      setStep("done");
    }
    setImporting(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Import CSV</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Importez vos trades depuis MT4, MT5, cTrader, TradingView ou un fichier CSV personnalisé.
        </p>
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {BROKER_PRESETS.map((b) => (
              <button
                key={b.name}
                onClick={() => applyPreset(b.name)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  preset === b.name ? "btn-primary text-white" : ""
                }`}
                style={preset !== b.name ? { border: "1px solid var(--border)", color: "var(--text-secondary)" } : {}}
              >
                {b.name}
              </button>
            ))}
          </div>

          <div
            className={`metric-card rounded-2xl p-16 text-center cursor-pointer transition-all ${dragOver ? "ring-2 ring-cyan-400" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById("csvInput")?.click()}
          >
            <input type="file" id="csvInput" accept=".csv,.tsv" className="hidden" onChange={onFileSelect} />
            <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
            <p className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>
              Glissez votre fichier CSV ici
            </p>
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              ou cliquez pour sélectionner — CSV, TSV supportés
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Column mapping */}
      {step === "map" && (
        <div className="space-y-4">
          <div className="metric-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                <FileText className="w-5 h-5 inline mr-2" />
                Mapper les colonnes ({rawData.length} lignes détectées)
              </h3>
              <div className="flex gap-2">
                {BROKER_PRESETS.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => applyPreset(b.name)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${preset === b.name ? "bg-cyan-500/20 text-cyan-400" : ""}`}
                    style={preset !== b.name ? { color: "var(--text-muted)" } : {}}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {headers.map((h) => (
                <div key={h} className="flex items-center gap-3">
                  <span className="text-sm font-mono truncate w-40" style={{ color: "var(--text-secondary)" }}>{h}</span>
                  <span style={{ color: "var(--text-muted)" }}>→</span>
                  <div className="relative flex-1">
                    <select
                      value={mapping[h] || ""}
                      onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}
                      className="input-field text-sm appearance-none pr-8"
                    >
                      <option value="">— Ignorer —</option>
                      {TARGET_FIELDS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep("upload")} className="px-4 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                Retour
              </button>
              <button
                onClick={generatePreview}
                className="btn-primary text-white px-6 py-2 rounded-xl text-sm font-medium"
                disabled={!mapping || !Object.values(mapping).includes("date")}
              >
                Prévisualiser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="metric-card rounded-2xl p-6">
            <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Aperçu (10 premiers trades sur {rawData.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {Object.values(mapping).filter(Boolean).map((f) => (
                      <th key={f} className="px-3 py-2 text-left font-medium" style={{ color: "var(--text-secondary)" }}>{f}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      {Object.values(mapping).filter(Boolean).map((f) => (
                        <td key={f} className="px-3 py-2 mono text-xs" style={{ color: "var(--text-primary)" }}>
                          {row[f] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep("map")} className="px-4 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                Retour
              </button>
              <button
                onClick={doImport}
                disabled={importing}
                className="btn-primary text-white px-6 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {importing ? "Import en cours..." : `Importer ${rawData.length} trades`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && result && (
        <div className="metric-card rounded-2xl p-12 text-center">
          {result.success > 0 ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Import terminé !</h3>
              <p className="mt-2" style={{ color: "var(--text-secondary)" }}>
                {result.success} trades importés avec succès.
                {result.errors > 0 && ` ${result.errors} erreurs.`}
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="w-16 h-16 text-rose-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Erreur d&apos;import</h3>
              <p className="mt-2" style={{ color: "var(--text-secondary)" }}>
                Aucun trade n&apos;a pu être importé. Vérifiez le mapping des colonnes.
              </p>
            </>
          )}
          <button
            onClick={() => { setStep("upload"); setResult(null); setRawData([]); }}
            className="btn-primary text-white px-6 py-2 rounded-xl text-sm font-medium mt-6"
          >
            Nouvel import
          </button>
        </div>
      )}
    </div>
  );
}
