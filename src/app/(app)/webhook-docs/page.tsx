"use client";

import { useState, useEffect } from "react";
import {
  Webhook,
  Key,
  Copy,
  Check,
  Terminal,
  MessageCircle,
  Send,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { useTranslation } from "@/i18n/context";

export default function WebhookDocsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.apiKey) setApiKey(data.apiKey);
      })
      .catch(() => {});
  }, []);

  const maskedKey = apiKey ? `mp_****${apiKey.slice(-4)}` : "mp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
  const displayKey = apiKey || "VOTRE_CLE_API";

  const copyToClipboard = async (text: string, blockId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedBlock(blockId);
    toast(t("webhookDocsCopied"), "success");
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  const curlExample = `curl -X POST ${typeof window !== "undefined" ? window.location.origin : "https://votre-domaine.com"}/api/webhook/trade \\
  -H "Content-Type: application/json" \\
  -d '{
    "apiKey": "${displayKey}",
    "asset": "EURUSD",
    "direction": "LONG",
    "entry": 1.0850,
    "exit": 1.0900,
    "sl": 1.0820,
    "tp": 1.0920,
    "lots": 0.5,
    "strategy": "Breakout",
    "notes": "Trade via webhook"
  }'`;

  const discordBotExample = `// Commande Discord Bot (Node.js)
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!trade')) return;

  // Format: !trade EURUSD LONG 1.0850 1.0900 1.0820 1.0920 0.5
  const args = message.content.split(' ').slice(1);
  const [asset, direction, entry, exit, sl, tp, lots] = args;

  const res = await fetch('${typeof window !== "undefined" ? window.location.origin : "https://votre-domaine.com"}/api/webhook/trade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: '${displayKey}',
      asset, direction,
      entry: parseFloat(entry),
      exit: parseFloat(exit),
      sl: parseFloat(sl),
      tp: parseFloat(tp),
      lots: parseFloat(lots),
    }),
  });

  const data = await res.json();
  message.reply(data.success
    ? \`Trade enregistre: \${data.tradeId}\`
    : \`Erreur: \${data.error}\`
  );
});`;

  const telegramBotExample = `# Bot Telegram (Python)
import requests
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

API_KEY = "${displayKey}"
URL = "${typeof window !== "undefined" ? window.location.origin : "https://votre-domaine.com"}/api/webhook/trade"

async def trade(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    # Format: /trade EURUSD LONG 1.0850 1.0900 1.0820 1.0920 0.5
    args = ctx.args
    if len(args) < 7:
        await update.message.reply_text("Usage: /trade ASSET DIR ENTRY EXIT SL TP LOTS")
        return

    payload = {
        "apiKey": API_KEY,
        "asset": args[0],
        "direction": args[1],
        "entry": float(args[2]),
        "exit": float(args[3]),
        "sl": float(args[4]),
        "tp": float(args[5]),
        "lots": float(args[6]),
    }

    r = requests.post(URL, json=payload)
    data = r.json()
    if data.get("success"):
        await update.message.reply_text(f"Trade enregistre: {data['tradeId']}")
    else:
        await update.message.reply_text(f"Erreur: {data.get('error')}")

app = ApplicationBuilder().token("BOT_TOKEN").build()
app.add_handler(CommandHandler("trade", trade))
app.run_polling()`;

  const jsonBody = `{
  "apiKey": "string (requis)",
  "asset": "string (requis) - ex: EURUSD, BTCUSD, AAPL",
  "direction": "string (requis) - LONG | SHORT | BUY | SELL",
  "entry": "number (requis) - prix d'entree",
  "exit": "number (optionnel) - prix de sortie",
  "sl": "number (requis) - stop loss",
  "tp": "number (requis) - take profit",
  "lots": "number (requis) - taille de position",
  "strategy": "string (optionnel) - nom de la strategie",
  "emotion": "string (optionnel) - emotion ressentie",
  "notes": "string (optionnel) - notes",
  "date": "string ISO (optionnel) - defaut: maintenant"
}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
          <Webhook className="w-7 h-7 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("webhookDocsTitle")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("webhookDocsSubtitle")}
          </p>
        </div>
      </div>

      {/* API Key display */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("webhookDocsYourKey")}
          </h2>
        </div>
        {apiKey ? (
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 font-mono text-sm text-gray-700 dark:text-gray-300">
              {maskedKey}
            </code>
            <button
              onClick={() => copyToClipboard(apiKey, "key")}
              className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition"
            >
              {copiedBlock === "key" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {t("profileApiKeyCopy")}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-amber-500">
            <AlertCircle className="w-4 h-4" />
            {t("webhookDocsNoKey")}
          </div>
        )}
      </div>

      {/* Endpoint info */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <ArrowRight className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Endpoint
          </h2>
        </div>
        <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 font-mono text-sm">
          <span className="text-green-400 font-bold">POST</span>{" "}
          <span className="text-gray-700 dark:text-gray-300">
            {typeof window !== "undefined" ? window.location.origin : "https://votre-domaine.com"}/api/webhook/trade
          </span>
        </div>

        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-4 mb-2">
          {t("webhookDocsBodyFormat")}
        </h3>
        <div className="relative">
          <pre className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto font-mono">
            {jsonBody}
          </pre>
        </div>
      </div>

      {/* CURL example */}
      <CodeBlock
        icon={Terminal}
        title="cURL"
        code={curlExample}
        blockId="curl"
        copiedBlock={copiedBlock}
        onCopy={copyToClipboard}
        copyLabel={t("profileApiKeyCopy")}
      />

      {/* Discord example */}
      <CodeBlock
        icon={MessageCircle}
        title={t("webhookDocsDiscordBot")}
        code={discordBotExample}
        blockId="discord"
        copiedBlock={copiedBlock}
        onCopy={copyToClipboard}
        copyLabel={t("profileApiKeyCopy")}
      />

      {/* Telegram example */}
      <CodeBlock
        icon={Send}
        title={t("webhookDocsTelegramBot")}
        code={telegramBotExample}
        blockId="telegram"
        copiedBlock={copiedBlock}
        onCopy={copyToClipboard}
        copyLabel={t("profileApiKeyCopy")}
      />
    </div>
  );
}

function CodeBlock({
  icon: Icon,
  title,
  code,
  blockId,
  copiedBlock,
  onCopy,
  copyLabel,
}: {
  icon: React.ElementType;
  title: string;
  code: string;
  blockId: string;
  copiedBlock: string | null;
  onCopy: (text: string, id: string) => void;
  copyLabel: string;
}) {
  return (
    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        </div>
        <button
          onClick={() => onCopy(code, blockId)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 transition"
        >
          {copiedBlock === blockId ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copyLabel}
        </button>
      </div>
      <pre className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto font-mono leading-relaxed">
        {code}
      </pre>
    </div>
  );
}
