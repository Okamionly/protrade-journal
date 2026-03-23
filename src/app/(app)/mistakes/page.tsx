"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useTrades, useUser } from "@/hooks/useTrades";
import { Chart, registerables } from "chart.js";
import {
  AlertOctagon,
  TrendingDown,
  Lightbulb,
  Flame,
  Zap,
  ShieldOff,
  ShieldAlert,
  ScaleIcon,
  Timer,
  LogOut,
  BarChart3,
  TrendingUp,
  BookOpen,
  Save,
  ChevronDown,
  ChevronUp,
  Settings,
  Target,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  Compass,
  Award,
} from "lucide-react";
import { useTranslation } from "@/i18n/context";
import { useTheme } from "next-themes";

Chart.register(...registerables);

// ---- Types ----
interface MistakeCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  tip: string;
  autoDetect: boolean;
  recommendation?: string;
  explanation?: string;
}

interface DetectedMistake {
  categoryId: string;
  tradeIds: string[];
  count: number;
  impactPnl: number;
  severity: "high" | "medium" | "low";
  description: string;
  date?: string;
  percentOfTotal: number;
  trend: "improving" | "worsening" | "stable";
}

interface WeeklyTrend {
  week: string;
  count: number;
}

interface WeeklyErrorData {
  weekLabel: string;
  weekStart: Date;
  weekEnd: Date;
  bySeverity: { high: number; medium: number; low: number };
  total: number;
}

// ---- Constants ----
const SEVERITY_CONFIG = {
  high: { label: "Critique", color: "#ef4444", bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30" },
  medium: { label: "Important", color: "#f59e0b", bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  low: { label: "Mineur", color: "#eab308", bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30" },
};

const DEFAULT_OVERTRADING_THRESHOLD = 5;
const DEFAULT_RISK_PERCENT = 2;

export default function MistakesPage() {
  const { t } = useTranslation();
  const { trades, loading } = useTrades();
  const { user } = useUser();
  const { theme } = useTheme();

  // Settings
  const [overtradingThreshold, setOvertradingThreshold] = useState(DEFAULT_OVERTRADING_THRESHOLD);
  const [riskPercent, setRiskPercent] = useState(DEFAULT_RISK_PERCENT);
  const [showSettings, setShowSettings] = useState(false);

  // Manual tags stored in localStorage
  const [manualTags, setManualTags] = useState<Record<string, string[]>>({});
  const [lessons, setLessons] = useState<Record<string, string>>({});
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [expandedComprehension, setExpandedComprehension] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mistakes-manual-tags");
      if (saved) setManualTags(JSON.parse(saved));
      const savedLessons = localStorage.getItem("mistakes-lessons");
      if (savedLessons) setLessons(JSON.parse(savedLessons));
      const savedThreshold = localStorage.getItem("mistakes-overtrading-threshold");
      if (savedThreshold) setOvertradingThreshold(parseInt(savedThreshold));
      const savedRisk = localStorage.getItem("mistakes-risk-percent");
      if (savedRisk) setRiskPercent(parseFloat(savedRisk));
    } catch { /* ignore */ }
  }, []);

  // Save settings
  const saveSettings = useCallback(() => {
    localStorage.setItem("mistakes-overtrading-threshold", String(overtradingThreshold));
    localStorage.setItem("mistakes-risk-percent", String(riskPercent));
  }, [overtradingThreshold, riskPercent]);

  useEffect(() => { saveSettings(); }, [saveSettings]);

  // Categories definition
  const categories: MistakeCategory[] = useMemo(() => [
    {
      id: "no-sl",
      label: "Pas de Stop Loss",
      icon: <ShieldOff className="w-5 h-5 text-red-500" />,
      tip: "Placez toujours un Stop Loss avant d'entrer en position. Aucune exception.",
      autoDetect: true,
      recommendation: "Definissez systematiquement un SL avant chaque entree. Utilisez un SL automatique dans votre plateforme.",
      explanation: "Trader sans Stop Loss expose votre capital a des pertes illimitees. Un seul mouvement adverse peut effacer des semaines de gains. Le SL est votre assurance : il limite la perte maximale par trade et protege votre capital.",
    },
    {
      id: "sl-too-wide",
      label: "SL trop large",
      icon: <ShieldAlert className="w-5 h-5 text-orange-400" />,
      tip: "Un SL trop eloigne reduit votre ratio risque/recompense et augmente votre perte potentielle.",
      autoDetect: true,
      recommendation: "Recalibrez vos SL sur la volatilite recente (ATR). Visez un SL < 2x la distance moyenne.",
      explanation: "Un Stop Loss trop large signifie que vous risquez trop par trade. Meme si le trade gagne, le ratio risque/recompense est defavorable. Cela degrade votre esperance mathematique sur le long terme et rend votre money management incoherent.",
    },
    {
      id: "revenge",
      label: "Revenge Trading",
      icon: <Flame className="w-5 h-5 text-rose-400" />,
      tip: "Apres une perte, attendez au moins 15 minutes avant de reprendre. Ne tradez jamais sous le coup de l'emotion.",
      autoDetect: true,
      recommendation: "Implementez une regle stricte : pas de nouveau trade dans les 15 min suivant une perte. Faites une pause.",
      explanation: "Le revenge trading est un comportement emotionnel ou vous tentez de 'recuperer' une perte immediatement. Cela mene a des decisions precipitees, des tailles de position excessives et des entrees sans setup valide. C'est l'une des causes principales de drawdowns importants.",
    },
    {
      id: "contre-tendance",
      label: "Contre la tendance",
      icon: <Compass className="w-5 h-5 text-teal-400" />,
      tip: "Tradez dans le sens du biais journalier. Les trades contre-tendance ont un taux de reussite plus faible.",
      autoDetect: true,
      recommendation: "Identifiez le biais daily avant chaque session. Ne prenez que des trades alignes avec la tendance principale.",
      explanation: "Prendre des trades contre la tendance dominante reduit significativement votre probabilite de succes. La tendance represente le flux d'ordres dominant. Aller contre elle revient a nager a contre-courant : possible mais epuisant et rarement rentable.",
    },
    {
      id: "surexposition",
      label: "Surexposition",
      icon: <Layers className="w-5 h-5 text-purple-400" />,
      tip: "Evitez d'avoir plusieurs positions ouvertes sur le meme actif le meme jour. Cela multiplie votre risque.",
      autoDetect: true,
      recommendation: "Limitez-vous a une seule position par actif par jour. Si vous voulez re-entrer, cloturez d'abord la position existante.",
      explanation: "Ouvrir plusieurs trades sur le meme actif le meme jour multiplie votre exposition au risque sans diversification. Si l'actif se retourne, toutes vos positions souffrent simultanement. C'est une forme deguisee de surlevier.",
    },
    {
      id: "early-exit",
      label: "Sortie prematuree",
      icon: <LogOut className="w-5 h-5 text-blue-400" />,
      tip: "Laissez vos trades gagnants atteindre au moins 50% du TP avant de couper. La patience paie.",
      autoDetect: true,
      recommendation: "Utilisez un trailing stop au lieu de couper manuellement. Laissez le marche vous sortir.",
      explanation: "Couper un trade gagnant trop tot est aussi couteux que de laisser courir un perdant. Vous manquez le gros du mouvement qui aurait compense vos pertes. Sur le long terme, cela detruit votre ratio gain/perte moyen et votre esperance mathematique.",
    },
    {
      id: "overtrading",
      label: "Overtrading",
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      tip: `Ne depassez pas ${overtradingThreshold} trades par jour. La qualite prime sur la quantite.`,
      autoDetect: true,
      recommendation: `Fixez une limite stricte de ${overtradingThreshold} trades/jour. Apres l'atteinte, arretez et analysez votre journee.`,
      explanation: "L'overtrading traduit souvent un manque de discipline ou un besoin d'action. Plus vous tradez, plus les frais de commission s'accumulent et plus vous prenez des setups de moindre qualite. Les meilleurs traders sont selectifs.",
    },
    {
      id: "oversizing",
      label: "Risque excessif",
      icon: <ScaleIcon className="w-5 h-5 text-purple-400" />,
      tip: `Ne risquez jamais plus de ${riskPercent}% de votre capital par trade. Respectez votre money management.`,
      autoDetect: true,
      recommendation: `Calculez votre taille de position AVANT d'entrer. Risque max = ${riskPercent}% du capital.`,
      explanation: "Risquer trop par trade expose votre compte a la ruine statistique. Meme avec un taux de reussite de 60%, une serie de 5 pertes peut arriver. Si chaque perte represente plus de 2% du capital, votre drawdown devient difficile a recuperer.",
    },
    {
      id: "moving-sl",
      label: "SL deplace",
      icon: <ShieldAlert className="w-5 h-5 text-orange-400" />,
      tip: "Ne deplacez jamais votre SL dans le sens contraire au trade. Un SL deplace est un SL viole.",
      autoDetect: false,
      recommendation: "Traitez votre SL initial comme inviolable. Si vous devez le deplacer, c'est uniquement pour securiser des gains (break-even).",
      explanation: "Deplacer un SL contre le trade revient a augmenter votre risque apres coup. C'est un signe que votre analyse initiale etait incorrecte mais que vous refusez de l'accepter. Cela transforme de petites pertes en pertes catastrophiques.",
    },
    {
      id: "fomo",
      label: "Entree FOMO",
      icon: <Timer className="w-5 h-5 text-cyan-400" />,
      tip: "Attendez toujours une confirmation avant d'entrer. Un trade manque vaut mieux qu'un trade en FOMO.",
      autoDetect: false,
      recommendation: "Avant chaque entree, verifiez que votre checklist de setup est respectee. Si non, ne tradez pas.",
      explanation: "Le FOMO (Fear Of Missing Out) pousse a entrer tard dans un mouvement deja avance. Le ratio risque/recompense est alors defavorable : vous entrez au pire moment, souvent pres d'un sommet ou d'un creux local.",
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [riskPercent, overtradingThreshold]);

  // ---- Auto-detection engine ----
  const detectedMistakes = useMemo(() => {
    if (!trades.length) return [];

    const mistakes: DetectedMistake[] = [];
    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Helper: compute trend for a set of trade IDs
    const computeTrend = (tradeIds: string[]): "improving" | "worsening" | "stable" => {
      const recentCount = tradeIds.filter((id) => {
        const tr = trades.find((t2) => t2.id === id);
        return tr && new Date(tr.date) >= thirtyDaysAgo;
      }).length;
      const olderCount = tradeIds.filter((id) => {
        const tr = trades.find((t2) => t2.id === id);
        return tr && new Date(tr.date) >= sixtyDaysAgo && new Date(tr.date) < thirtyDaysAgo;
      }).length;
      if (olderCount === 0 && recentCount === 0) return "stable";
      if (olderCount === 0) return "worsening";
      if (recentCount < olderCount) return "improving";
      if (recentCount > olderCount) return "worsening";
      return "stable";
    };

    // 1. Pas de Stop Loss: SL is 0 or null/undefined
    const noSlTrades = trades.filter((t2) => !t2.sl || t2.sl === 0);
    if (noSlTrades.length > 0) {
      const ids = noSlTrades.map((t2) => t2.id);
      mistakes.push({
        categoryId: "no-sl",
        tradeIds: ids,
        count: noSlTrades.length,
        impactPnl: noSlTrades.reduce((s, t2) => s + (t2.result < 0 ? t2.result : 0), 0),
        severity: "high",
        description: `${noSlTrades.length} trade(s) sans Stop Loss defini`,
        percentOfTotal: (noSlTrades.length / trades.length) * 100,
        trend: computeTrend(ids),
      });
    }

    // 2. SL trop large: |entry - SL| > 2 * average |entry - SL|
    const tradesWithSl = trades.filter((t2) => t2.sl && t2.sl !== 0);
    if (tradesWithSl.length > 2) {
      const avgSlDistance = tradesWithSl.reduce((s, t2) => s + Math.abs(t2.entry - t2.sl), 0) / tradesWithSl.length;
      const wideSlTrades = tradesWithSl.filter((t2) => Math.abs(t2.entry - t2.sl) > 2 * avgSlDistance);
      if (wideSlTrades.length > 0) {
        const ids = wideSlTrades.map((t2) => t2.id);
        mistakes.push({
          categoryId: "sl-too-wide",
          tradeIds: ids,
          count: wideSlTrades.length,
          impactPnl: wideSlTrades.reduce((s, t2) => s + (t2.result < 0 ? t2.result : 0), 0),
          severity: "medium",
          description: `${wideSlTrades.length} trade(s) avec SL > 2x la distance moyenne (moy: ${avgSlDistance.toFixed(1)} pts)`,
          percentOfTotal: (wideSlTrades.length / trades.length) * 100,
          trend: computeTrend(ids),
        });
      }
    }

    // 3. Revenge Trading: trade opened within 15 min of a losing trade
    const byAsset: Record<string, typeof trades> = {};
    sorted.forEach((t2) => {
      if (!byAsset[t2.asset]) byAsset[t2.asset] = [];
      byAsset[t2.asset].push(t2);
    });

    let revengeCount = 0;
    let revengeImpact = 0;
    const revengeIds: string[] = [];

    Object.values(byAsset).forEach((assetTrades) => {
      for (let i = 1; i < assetTrades.length; i++) {
        const prev = assetTrades[i - 1];
        const curr = assetTrades[i];
        const diffMin = (new Date(curr.date).getTime() - new Date(prev.date).getTime()) / 60000;
        if (prev.result < 0 && diffMin <= 15 && diffMin >= 0) {
          revengeCount++;
          revengeImpact += curr.result;
          revengeIds.push(curr.id);
        }
      }
    });

    if (revengeCount > 0) {
      mistakes.push({
        categoryId: "revenge",
        tradeIds: revengeIds,
        count: revengeCount,
        impactPnl: revengeImpact,
        severity: "high",
        description: `${revengeCount} trade(s) ouvert(s) dans les 15 min suivant une perte`,
        percentOfTotal: (revengeCount / trades.length) * 100,
        trend: computeTrend(revengeIds),
      });
    }

    // 4. Contre la tendance: direction opposite to daily bias
    // We infer daily bias from the majority direction of trades on that day
    const tradeDays: Record<string, typeof trades> = {};
    sorted.forEach((t2) => {
      const day = t2.date.slice(0, 10);
      if (!tradeDays[day]) tradeDays[day] = [];
      tradeDays[day].push(t2);
    });

    const contreTendanceIds: string[] = [];
    let contreTendanceImpact = 0;
    Object.values(tradeDays).forEach((dayTrades) => {
      if (dayTrades.length < 2) return;
      const buyCount = dayTrades.filter((t2) => t2.direction?.toLowerCase() === "buy" || t2.direction?.toLowerCase() === "long").length;
      const sellCount = dayTrades.filter((t2) => t2.direction?.toLowerCase() === "sell" || t2.direction?.toLowerCase() === "short").length;
      if (buyCount === sellCount) return; // no clear bias
      const majorityDir = buyCount > sellCount ? "buy" : "sell";
      dayTrades.forEach((t2) => {
        const dir = t2.direction?.toLowerCase();
        const isBuy = dir === "buy" || dir === "long";
        const isSell = dir === "sell" || dir === "short";
        const isContre = (majorityDir === "buy" && isSell) || (majorityDir === "sell" && isBuy);
        if (isContre && t2.result < 0) {
          contreTendanceIds.push(t2.id);
          contreTendanceImpact += t2.result;
        }
      });
    });

    if (contreTendanceIds.length > 0) {
      mistakes.push({
        categoryId: "contre-tendance",
        tradeIds: contreTendanceIds,
        count: contreTendanceIds.length,
        impactPnl: contreTendanceImpact,
        severity: "medium",
        description: `${contreTendanceIds.length} trade(s) perdant(s) contre le biais directionnel du jour`,
        percentOfTotal: (contreTendanceIds.length / trades.length) * 100,
        trend: computeTrend(contreTendanceIds),
      });
    }

    // 5. Surexposition: multiple trades on same asset same day
    const surexpositionIds: string[] = [];
    let surexpositionImpact = 0;
    Object.values(tradeDays).forEach((dayTrades) => {
      const assetCount: Record<string, typeof trades> = {};
      dayTrades.forEach((t2) => {
        if (!assetCount[t2.asset]) assetCount[t2.asset] = [];
        assetCount[t2.asset].push(t2);
      });
      Object.values(assetCount).forEach((assetDayTrades) => {
        if (assetDayTrades.length > 1) {
          // All trades after the first are considered surexposition
          assetDayTrades.slice(1).forEach((t2) => {
            surexpositionIds.push(t2.id);
            surexpositionImpact += t2.result < 0 ? t2.result : 0;
          });
        }
      });
    });

    if (surexpositionIds.length > 0) {
      mistakes.push({
        categoryId: "surexposition",
        tradeIds: surexpositionIds,
        count: surexpositionIds.length,
        impactPnl: surexpositionImpact,
        severity: "medium",
        description: `${surexpositionIds.length} trade(s) supplementaire(s) sur un actif deja trade le meme jour`,
        percentOfTotal: (surexpositionIds.length / trades.length) * 100,
        trend: computeTrend(surexpositionIds),
      });
    }

    // 6. Sortie prematuree: closed before reaching 50% of TP distance
    const earlyExits = trades.filter((t2) => {
      if (!t2.exit || t2.result <= 0 || !t2.tp) return false;
      const potential = Math.abs(t2.tp - t2.entry);
      const actual = Math.abs(t2.exit - t2.entry);
      return potential > 0 && actual < potential * 0.5;
    });
    if (earlyExits.length > 0) {
      const ids = earlyExits.map((t2) => t2.id);
      const missedProfit = earlyExits.reduce((s, t2) => {
        const potential = Math.abs(t2.tp - t2.entry) * t2.lots;
        return s + (potential - t2.result);
      }, 0);
      mistakes.push({
        categoryId: "early-exit",
        tradeIds: ids,
        count: earlyExits.length,
        impactPnl: -missedProfit,
        severity: "low",
        description: `${earlyExits.length} gain(s) coupe(s) avant 50% du TP`,
        percentOfTotal: (earlyExits.length / trades.length) * 100,
        trend: computeTrend(ids),
      });
    }

    // 7. Overtrading: more than threshold trades per day
    const overtradeDays = Object.entries(tradeDays).filter(([, ts]) => ts.length > overtradingThreshold);
    if (overtradeDays.length > 0) {
      const impact = overtradeDays.reduce(
        (s, [, ts]) => s + ts.slice(overtradingThreshold).reduce((ss, t2) => ss + t2.result, 0),
        0
      );
      const ids = overtradeDays.flatMap(([, ts]) => ts.slice(overtradingThreshold).map((t2) => t2.id));
      mistakes.push({
        categoryId: "overtrading",
        tradeIds: ids,
        count: overtradeDays.length,
        impactPnl: impact,
        severity: "medium",
        description: `${overtradeDays.length} jour(s) avec +${overtradingThreshold} trades`,
        percentOfTotal: (ids.length / trades.length) * 100,
        trend: computeTrend(ids),
      });
    }

    // 8. Oversizing: risk > X% of capital
    const capital = user?.balance || 10000;
    const maxRisk = capital * (riskPercent / 100);
    const oversizedTrades = trades.filter((t2) => {
      if (!t2.sl || t2.sl === 0) return false;
      const riskPerTrade = Math.abs(t2.entry - t2.sl) * t2.lots;
      return riskPerTrade > maxRisk;
    });
    if (oversizedTrades.length > 0) {
      const ids = oversizedTrades.map((t2) => t2.id);
      mistakes.push({
        categoryId: "oversizing",
        tradeIds: ids,
        count: oversizedTrades.length,
        impactPnl: oversizedTrades.reduce((s, t2) => s + (t2.result < 0 ? t2.result : 0), 0),
        severity: "high",
        description: `${oversizedTrades.length} trade(s) avec risque > ${riskPercent}% du capital`,
        percentOfTotal: (oversizedTrades.length / trades.length) * 100,
        trend: computeTrend(ids),
      });
    }

    // 9. Manual tags: FOMO and Moving SL from localStorage
    const fomoIds = manualTags["fomo"] || [];
    const fomoTrades = trades.filter((t2) => fomoIds.includes(t2.id));
    if (fomoTrades.length > 0) {
      mistakes.push({
        categoryId: "fomo",
        tradeIds: fomoIds,
        count: fomoTrades.length,
        impactPnl: fomoTrades.reduce((s, t2) => s + t2.result, 0),
        severity: "medium",
        description: `${fomoTrades.length} entree(s) FOMO identifiee(s)`,
        percentOfTotal: (fomoTrades.length / trades.length) * 100,
        trend: computeTrend(fomoIds),
      });
    }

    const movingSlIds = manualTags["moving-sl"] || [];
    const movingSlTrades = trades.filter((t2) => movingSlIds.includes(t2.id));
    if (movingSlTrades.length > 0) {
      mistakes.push({
        categoryId: "moving-sl",
        tradeIds: movingSlIds,
        count: movingSlTrades.length,
        impactPnl: movingSlTrades.reduce((s, t2) => s + (t2.result < 0 ? t2.result : 0), 0),
        severity: "high",
        description: `${movingSlTrades.length} SL deplace(s) contre le trade`,
        percentOfTotal: (movingSlTrades.length / trades.length) * 100,
        trend: computeTrend(movingSlIds),
      });
    }

    return mistakes.sort((a, b) => {
      const sev = { high: 3, medium: 2, low: 1 };
      return sev[b.severity] - sev[a.severity] || Math.abs(b.impactPnl) - Math.abs(a.impactPnl);
    });
  }, [trades, overtradingThreshold, riskPercent, manualTags, user?.balance]);

  // ---- Cout des Erreurs summary ----
  const costSummary = useMemo(() => {
    const totalPnl = trades.reduce((s, t2) => s + t2.result, 0);
    const totalErrorCost = detectedMistakes.reduce((s, m) => s + m.impactPnl, 0);
    const potentialPnl = totalPnl - totalErrorCost; // what PnL would be if errors were avoided
    const improvementPct = totalPnl !== 0 ? ((potentialPnl - totalPnl) / Math.abs(totalPnl)) * 100 : 0;
    return { totalPnl, totalErrorCost, potentialPnl, improvementPct };
  }, [trades, detectedMistakes]);

  // ---- Top 3 Erreurs a Corriger ----
  const top3Errors = useMemo(() => {
    return [...detectedMistakes]
      .sort((a, b) => Math.abs(b.impactPnl) - Math.abs(a.impactPnl))
      .slice(0, 3);
  }, [detectedMistakes]);

  // ---- Stats ----
  const totalImpact = detectedMistakes.reduce((s, m) => s + m.impactPnl, 0);
  const criticalCount = detectedMistakes.filter((m) => m.severity === "high").length;

  // ---- Category frequency data for bar chart (last 30 days) ----
  const categoryFrequency = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentTrades = trades.filter((t2) => new Date(t2.date) >= thirtyDaysAgo);

    if (!recentTrades.length) return [];

    const counts: Record<string, number> = {};
    categories.forEach((c) => (counts[c.id] = 0));

    detectedMistakes.forEach((m) => {
      const recentIds = m.tradeIds.filter((id) => {
        const trade = trades.find((t2) => t2.id === id);
        return trade && new Date(trade.date) >= thirtyDaysAgo;
      });
      counts[m.categoryId] = (counts[m.categoryId] || 0) + recentIds.length;
    });

    return categories
      .map((c) => ({ id: c.id, label: c.label, count: counts[c.id] || 0 }))
      .filter((c) => c.count > 0);
  }, [trades, detectedMistakes, categories]);

  // ---- Weekly trend data ----
  const weeklyTrend = useMemo((): WeeklyTrend[] => {
    if (!trades.length) return [];

    const weeks: Record<string, number> = {};
    const now = new Date();

    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const key = `S${getWeekNumber(weekStart)}`;
      weeks[key] = 0;
    }

    detectedMistakes.forEach((m) => {
      m.tradeIds.forEach((id) => {
        const trade = trades.find((t2) => t2.id === id);
        if (trade) {
          const key = `S${getWeekNumber(new Date(trade.date))}`;
          if (key in weeks) weeks[key]++;
        }
      });
    });

    return Object.entries(weeks).map(([week, count]) => ({ week, count }));
  }, [trades, detectedMistakes]);

  // ---- SVG Error Timeline data (by severity, by week) ----
  const svgTimelineData = useMemo((): WeeklyErrorData[] => {
    if (!trades.length || !detectedMistakes.length) return [];
    const now = new Date();
    const weeks: WeeklyErrorData[] = [];

    for (let i = 11; i >= 0; i--) {
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      weeks.push({
        weekLabel: `S${getWeekNumber(weekEnd)}`,
        weekStart,
        weekEnd,
        bySeverity: { high: 0, medium: 0, low: 0 },
        total: 0,
      });
    }

    detectedMistakes.forEach((m) => {
      m.tradeIds.forEach((id) => {
        const trade = trades.find((t2) => t2.id === id);
        if (!trade) return;
        const tradeDate = new Date(trade.date);
        const week = weeks.find((w) => tradeDate >= w.weekStart && tradeDate < w.weekEnd);
        if (week) {
          week.bySeverity[m.severity]++;
          week.total++;
        }
      });
    });

    return weeks;
  }, [trades, detectedMistakes]);

  // ---- Chart refs ----
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const barChartInstance = useRef<Chart | null>(null);
  const trendChartRef = useRef<HTMLCanvasElement>(null);
  const trendChartInstance = useRef<Chart | null>(null);

  // Bar chart: category frequency
  useEffect(() => {
    if (!barChartRef.current || !categoryFrequency.length) return;
    if (barChartInstance.current) barChartInstance.current.destroy();

    const isDark = theme === "dark";
    const textColor = isDark ? "#94a3b8" : "#64748b";

    const colors = categoryFrequency.map((c) => {
      if (c.id === "revenge") return "#ef4444";
      if (c.id === "overtrading") return "#f59e0b";
      if (c.id === "no-sl") return "#ef4444";
      if (c.id === "sl-too-wide") return "#f97316";
      if (c.id === "oversizing") return "#a855f7";
      if (c.id === "fomo") return "#06b6d4";
      if (c.id === "early-exit") return "#3b82f6";
      if (c.id === "moving-sl") return "#f97316";
      if (c.id === "contre-tendance") return "#14b8a6";
      if (c.id === "surexposition") return "#8b5cf6";
      return "#6366f1";
    });

    barChartInstance.current = new Chart(barChartRef.current, {
      type: "bar",
      data: {
        labels: categoryFrequency.map((c) => c.label),
        datasets: [{
          data: categoryFrequency.map((c) => c.count),
          backgroundColor: colors.map((c) => c + "33"),
          borderColor: colors,
          borderWidth: 1.5,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: textColor, stepSize: 1 },
            grid: { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
          },
          x: {
            ticks: { color: textColor, font: { size: 10 } },
            grid: { display: false },
          },
        },
      },
    });

    return () => { barChartInstance.current?.destroy(); };
  }, [categoryFrequency, theme]);

  // Trend chart: weekly improvement
  useEffect(() => {
    if (!trendChartRef.current || !weeklyTrend.length) return;
    if (trendChartInstance.current) trendChartInstance.current.destroy();

    const isDark = theme === "dark";
    const textColor = isDark ? "#94a3b8" : "#64748b";

    trendChartInstance.current = new Chart(trendChartRef.current, {
      type: "line",
      data: {
        labels: weeklyTrend.map((w) => w.week),
        datasets: [{
          data: weeklyTrend.map((w) => w.count),
          borderColor: "#8b5cf6",
          backgroundColor: "rgba(139, 92, 246, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#8b5cf6",
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: textColor, stepSize: 1 },
            grid: { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
          },
          x: {
            ticks: { color: textColor, font: { size: 10 } },
            grid: { display: false },
          },
        },
      },
    });

    return () => { trendChartInstance.current?.destroy(); };
  }, [weeklyTrend, theme]);

  // ---- Lessons handlers ----
  const saveLesson = (categoryId: string, text: string) => {
    const updated = { ...lessons, [categoryId]: text };
    setLessons(updated);
    localStorage.setItem("mistakes-lessons", JSON.stringify(updated));
  };

  // ---- Loading ----
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl" style={{ background: "var(--bg-card-solid)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <AlertOctagon className="w-6 h-6 text-rose-400" /> {t("errorDetection")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {t("errorDetectionDesc")}
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="metric-card rounded-xl p-2.5 hover:brightness-125 transition-all"
        >
          <Settings className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="metric-card rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Settings className="w-4 h-4" /> Parametres de detection
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Seuil overtrading (trades/jour)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={overtradingThreshold}
                onChange={(e) => setOvertradingThreshold(parseInt(e.target.value) || 5)}
                className="w-full mt-1 rounded-lg px-3 py-2 text-sm glass"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Risque max (% du capital)
              </label>
              <input
                type="number"
                min={0.5}
                max={10}
                step={0.5}
                value={riskPercent}
                onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 2)}
                className="w-full mt-1 rounded-lg px-3 py-2 text-sm glass"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
          </div>
        </div>
      )}

      {trades.length === 0 ? (
        <div className="metric-card rounded-2xl p-12 text-center">
          <p className="text-lg font-medium" style={{ color: "var(--text-secondary)" }}>{t("noTradesToAnalyze")}</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{t("addTradesToDetect")}</p>
        </div>
      ) : detectedMistakes.length === 0 ? (
        <div className="metric-card rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">
            <Award className="w-12 h-12 mx-auto text-emerald-400" />
          </div>
          <p className="text-lg font-bold" style={{ color: "#10b981" }}>{t("noErrorsDetected")}</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{t("followingRules")}</p>
        </div>
      ) : (
        <>
          {/* ====== COUT DES ERREURS SUMMARY CARD ====== */}
          <div className="metric-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5" style={{
              background: "linear-gradient(135deg, #ef4444 0%, #f59e0b 50%, #10b981 100%)",
            }} />
            <div className="relative">
              <h2 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: "var(--text-primary)" }}>
                <Target className="w-4 h-4 text-rose-400" /> Cout des Erreurs
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="glass rounded-xl p-4 text-center">
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    Cout total des erreurs
                  </div>
                  <div className="text-2xl font-bold mono" style={{ color: "#ef4444" }}>
                    {costSummary.totalErrorCost.toFixed(2)}&euro;
                  </div>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    P&amp;L actuel
                  </div>
                  <div className="text-2xl font-bold mono" style={{ color: costSummary.totalPnl >= 0 ? "#10b981" : "#ef4444" }}>
                    {costSummary.totalPnl >= 0 ? "+" : ""}{costSummary.totalPnl.toFixed(2)}&euro;
                  </div>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    P&amp;L potentiel sans erreurs
                  </div>
                  <div className="text-2xl font-bold mono" style={{ color: costSummary.potentialPnl >= 0 ? "#10b981" : "#ef4444" }}>
                    {costSummary.potentialPnl >= 0 ? "+" : ""}{costSummary.potentialPnl.toFixed(2)}&euro;
                  </div>
                </div>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Si vous aviez evite ces erreurs, votre P&amp;L serait de{" "}
                  <span className="font-bold" style={{ color: "#10b981" }}>
                    {costSummary.potentialPnl >= 0 ? "+" : ""}{costSummary.potentialPnl.toFixed(2)}&euro;
                  </span>{" "}
                  au lieu de{" "}
                  <span className="font-bold" style={{ color: costSummary.totalPnl >= 0 ? "#10b981" : "#ef4444" }}>
                    {costSummary.totalPnl >= 0 ? "+" : ""}{costSummary.totalPnl.toFixed(2)}&euro;
                  </span>
                </p>
                {costSummary.improvementPct > 0 && (
                  <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "#10b981" }}>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    Amelioration potentielle de {costSummary.improvementPct.toFixed(0)}%
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="metric-card rounded-2xl p-5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("errorsDetected")}</span>
              <div className="text-3xl font-bold text-rose-400 mt-1">{detectedMistakes.reduce((s, m) => s + m.count, 0)}</div>
            </div>
            <div className="metric-card rounded-2xl p-5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("totalImpact")}</span>
              <div className="text-3xl font-bold mono mt-1" style={{ color: totalImpact >= 0 ? "#f59e0b" : "#ef4444" }}>
                {totalImpact >= 0 ? "+" : ""}{totalImpact.toFixed(2)}&euro;
              </div>
            </div>
            <div className="metric-card rounded-2xl p-5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("criticalErrors")}</span>
              <div className="text-3xl font-bold mt-1" style={{ color: criticalCount > 0 ? "#ef4444" : "#10b981" }}>
                {criticalCount}
              </div>
            </div>
            <div className="metric-card rounded-2xl p-5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Categories touchees</span>
              <div className="text-3xl font-bold mt-1" style={{ color: "#8b5cf6" }}>
                {detectedMistakes.length}
              </div>
            </div>
          </div>

          {/* ====== TOP 3 ERREURS A CORRIGER ====== */}
          {top3Errors.length > 0 && (
            <div className="metric-card rounded-2xl p-6">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: "var(--text-primary)" }}>
                <Award className="w-4 h-4 text-amber-400" /> Top 3 Erreurs a Corriger
              </h3>
              <div className="space-y-3">
                {top3Errors.map((m, idx) => {
                  const cat = categories.find((c) => c.id === m.categoryId);
                  if (!cat) return null;
                  const sevConfig = SEVERITY_CONFIG[m.severity];
                  const isExpanded = expandedComprehension === m.categoryId;
                  const medals = ["#fbbf24", "#94a3b8", "#cd7f32"];

                  return (
                    <div key={m.categoryId} className="glass rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                          style={{ background: medals[idx] + "22", color: medals[idx], border: `1.5px solid ${medals[idx]}44` }}>
                          #{idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {cat.icon}
                            <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{cat.label}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${sevConfig.bg} ${sevConfig.text} border ${sevConfig.border}`}
                            >
                              {sevConfig.label}
                            </span>
                            {m.trend === "improving" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                                <ArrowDownRight className="w-3 h-3" /> En baisse
                              </span>
                            )}
                            {m.trend === "worsening" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-0.5">
                                <ArrowUpRight className="w-3 h-3" /> En hausse
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                            <span className="mono font-bold" style={{ color: m.impactPnl >= 0 ? "#f59e0b" : "#ef4444" }}>
                              {m.impactPnl >= 0 ? "+" : ""}{m.impactPnl.toFixed(2)}&euro;
                            </span>
                            <span>{m.count} occurrence{m.count > 1 ? "s" : ""}</span>
                            <span>{m.percentOfTotal.toFixed(1)}% des trades</span>
                          </div>
                          {/* Recommendation */}
                          <div className="mt-2 rounded-lg p-2.5 flex items-start gap-2" style={{ background: "var(--bg-hover)" }}>
                            <Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{cat.recommendation}</p>
                          </div>
                          {/* Expandable "Comprendre" section */}
                          {cat.explanation && (
                            <button
                              onClick={() => setExpandedComprehension(isExpanded ? null : m.categoryId)}
                              className="mt-2 text-xs flex items-center gap-1 hover:brightness-125 transition-all"
                              style={{ color: "var(--accent)" }}
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              Comprendre
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                          {isExpanded && cat.explanation && (
                            <div className="mt-2 rounded-lg p-3 text-xs leading-relaxed" style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>
                              {cat.explanation}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ====== SVG ERROR TIMELINE ====== */}
          {svgTimelineData.length > 0 && svgTimelineData.some((w) => w.total > 0) && (
            <div className="metric-card rounded-2xl p-5">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: "var(--text-primary)" }}>
                <BarChart3 className="w-4 h-4 text-indigo-400" /> Chronologie des erreurs (12 semaines)
              </h3>
              <ErrorTimelineSVG data={svgTimelineData} />
            </div>
          )}

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bar chart: frequency by category (30 days) */}
            <div className="metric-card rounded-2xl p-5">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: "var(--text-primary)" }}>
                <BarChart3 className="w-4 h-4 text-rose-400" /> Frequence par categorie (30j)
              </h3>
              {categoryFrequency.length > 0 ? (
                <div style={{ height: 220 }}>
                  <canvas ref={barChartRef} />
                </div>
              ) : (
                <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
                  Aucune erreur dans les 30 derniers jours
                </p>
              )}
            </div>

            {/* Trend chart: improvement tracker */}
            <div className="metric-card rounded-2xl p-5">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: "var(--text-primary)" }}>
                <TrendingUp className="w-4 h-4 text-purple-400" /> Tendance d&apos;amelioration (8 semaines)
              </h3>
              {weeklyTrend.some((w) => w.count > 0) ? (
                <div style={{ height: 220 }}>
                  <canvas ref={trendChartRef} />
                </div>
              ) : (
                <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
                  Pas assez de donnees pour afficher la tendance
                </p>
              )}
            </div>
          </div>

          {/* Cost of mistakes breakdown */}
          <div className="metric-card rounded-2xl p-5">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: "var(--text-primary)" }}>
              <TrendingDown className="w-4 h-4 text-rose-400" /> Cout des erreurs par categorie
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {detectedMistakes.map((m) => {
                const cat = categories.find((c) => c.id === m.categoryId);
                if (!cat) return null;
                return (
                  <div key={m.categoryId} className="glass rounded-xl p-3 text-center">
                    <div className="flex justify-center mb-2">{cat.icon}</div>
                    <div className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                      {cat.label}
                    </div>
                    <div
                      className="text-lg font-bold mono"
                      style={{ color: m.impactPnl >= 0 ? "#f59e0b" : "#ef4444" }}
                    >
                      {m.impactPnl >= 0 ? "+" : ""}{m.impactPnl.toFixed(0)}&euro;
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {m.count} {m.count > 1 ? t("occurrences") : t("occurrence")} ({m.percentOfTotal.toFixed(1)}%)
                    </div>
                    <div className="text-[10px] mt-0.5 flex items-center justify-center gap-0.5">
                      {m.trend === "improving" && (
                        <span className="text-emerald-400 flex items-center gap-0.5">
                          <ArrowDownRight className="w-3 h-3" /> En baisse
                        </span>
                      )}
                      {m.trend === "worsening" && (
                        <span className="text-rose-400 flex items-center gap-0.5">
                          <ArrowUpRight className="w-3 h-3" /> En hausse
                        </span>
                      )}
                      {m.trend === "stable" && (
                        <span style={{ color: "var(--text-muted)" }}>Stable</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed mistake cards */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              Detail des erreurs detectees
            </h3>
            {detectedMistakes.map((m) => {
              const cat = categories.find((c) => c.id === m.categoryId);
              if (!cat) return null;
              const sevConfig = SEVERITY_CONFIG[m.severity];

              return (
                <div key={m.categoryId} className="metric-card rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl glass flex-shrink-0">{cat.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>{cat.label}</h3>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${sevConfig.bg} ${sevConfig.text} border ${sevConfig.border}`}
                        >
                          {sevConfig.label}
                        </span>
                        {!cat.autoDetect && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                            Manuel
                          </span>
                        )}
                        {m.trend === "improving" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                            <ArrowDownRight className="w-3 h-3" /> En baisse
                          </span>
                        )}
                        {m.trend === "worsening" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-0.5">
                            <ArrowUpRight className="w-3 h-3" /> En hausse
                          </span>
                        )}
                      </div>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{m.description}</p>
                      <div className="flex items-center gap-6 mt-3">
                        <div className="flex items-center gap-1.5">
                          <TrendingDown className="w-4 h-4 text-rose-400" />
                          <span
                            className="text-sm font-bold mono"
                            style={{ color: m.impactPnl >= 0 ? "#f59e0b" : "#ef4444" }}
                          >
                            {m.impactPnl >= 0 ? "+" : ""}{m.impactPnl.toFixed(2)}&euro;
                          </span>
                        </div>
                        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                          {m.count} {m.count > 1 ? t("occurrences") : t("occurrence")}
                        </span>
                        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                          {m.percentOfTotal.toFixed(1)}% des trades
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tip */}
                  <div className="mt-4 rounded-xl p-3 flex items-start gap-2" style={{ background: "var(--bg-hover)" }}>
                    <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{cat.tip}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lecons apprises section */}
          <div className="metric-card rounded-2xl p-5">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: "var(--text-primary)" }}>
              <BookOpen className="w-4 h-4 text-emerald-400" /> Lecons apprises
            </h3>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Ecrivez vos reflexions et lecons pour chaque categorie d&apos;erreur. Sauvegarde automatique.
            </p>
            <div className="space-y-3">
              {categories.map((cat) => {
                const isExpanded = expandedLesson === cat.id;
                const hasLesson = !!lessons[cat.id]?.trim();

                return (
                  <div key={cat.id} className="glass rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedLesson(isExpanded ? null : cat.id)}
                      className="w-full flex items-center gap-3 p-3 hover:brightness-125 transition-all"
                    >
                      {cat.icon}
                      <span className="text-sm font-medium flex-1 text-left" style={{ color: "var(--text-primary)" }}>
                        {cat.label}
                      </span>
                      {hasLesson && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Rempli
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                      ) : (
                        <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3">
                        <textarea
                          value={lessons[cat.id] || ""}
                          onChange={(e) => saveLesson(cat.id, e.target.value)}
                          placeholder={`Qu'avez-vous appris concernant "${cat.label}" ? Quelles actions correctives ?`}
                          rows={3}
                          className="w-full rounded-lg px-3 py-2 text-sm glass resize-none"
                          style={{ color: "var(--text-primary)" }}
                        />
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Save className="w-3 h-3 text-emerald-400" />
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            Sauvegarde automatique (localStorage)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---- SVG Error Timeline Component ----
function ErrorTimelineSVG({ data }: { data: WeeklyErrorData[] }) {
  const svgWidth = 700;
  const svgHeight = 200;
  const padding = { top: 20, right: 20, bottom: 35, left: 40 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  const barWidth = Math.max(8, (chartWidth / data.length) - 4);

  // Compute simple linear trend
  const nonZero = data.filter((d) => d.total > 0);
  let trendSlope = 0;
  if (nonZero.length >= 2) {
    const n = data.length;
    const sumX = data.reduce((s, _, i) => s + i, 0);
    const sumY = data.reduce((s, d) => s + d.total, 0);
    const sumXY = data.reduce((s, d, i) => s + i * d.total, 0);
    const sumXX = data.reduce((s, _, i) => s + i * i, 0);
    trendSlope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }
  const trendIntercept = (data.reduce((s, d) => s + d.total, 0) / data.length) - trendSlope * ((data.length - 1) / 2);

  const getX = (i: number) => padding.left + (i / (data.length - 1 || 1)) * chartWidth;
  const getY = (val: number) => padding.top + chartHeight - (val / maxTotal) * chartHeight;

  const trendY1 = getY(trendIntercept);
  const trendY2 = getY(trendIntercept + trendSlope * (data.length - 1));

  const severityColors = {
    high: "#ef4444",
    medium: "#f59e0b",
    low: "#eab308",
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full" style={{ minWidth: 400 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padding.top + chartHeight * (1 - frac);
          const val = Math.round(maxTotal * frac);
          return (
            <g key={frac}>
              <line x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y}
                stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
              <text x={padding.left - 8} y={y + 3} textAnchor="end"
                fill="currentColor" fillOpacity={0.4} fontSize={10}>
                {val}
              </text>
            </g>
          );
        })}

        {/* Stacked bars */}
        {data.map((d, i) => {
          const x = getX(i) - barWidth / 2;
          let yOffset = 0;
          const bars: { severity: keyof typeof severityColors; height: number }[] = [];

          (["low", "medium", "high"] as const).forEach((sev) => {
            if (d.bySeverity[sev] > 0) {
              const h = (d.bySeverity[sev] / maxTotal) * chartHeight;
              bars.push({ severity: sev, height: h });
              yOffset += h;
            }
          });

          let currentY = padding.top + chartHeight;
          return (
            <g key={i}>
              {bars.map((bar, bIdx) => {
                currentY -= bar.height;
                return (
                  <rect key={bIdx} x={x} y={currentY} width={barWidth} height={bar.height}
                    rx={2} fill={severityColors[bar.severity]} fillOpacity={0.6} />
                );
              })}
              <text x={getX(i)} y={svgHeight - 8} textAnchor="middle"
                fill="currentColor" fillOpacity={0.4} fontSize={9}>
                {d.weekLabel}
              </text>
            </g>
          );
        })}

        {/* Trend line */}
        {nonZero.length >= 2 && (
          <line x1={padding.left} y1={trendY1} x2={svgWidth - padding.right} y2={trendY2}
            stroke={trendSlope < 0 ? "#10b981" : "#ef4444"} strokeWidth={2}
            strokeDasharray="6 3" strokeOpacity={0.7} />
        )}

        {/* Legend */}
        <g transform={`translate(${svgWidth - padding.right - 180}, ${padding.top - 5})`}>
          {(["high", "medium", "low"] as const).map((sev, i) => (
            <g key={sev} transform={`translate(${i * 65}, 0)`}>
              <rect width={8} height={8} rx={2} fill={severityColors[sev]} fillOpacity={0.6} />
              <text x={12} y={8} fill="currentColor" fillOpacity={0.5} fontSize={9}>
                {sev === "high" ? "Critique" : sev === "medium" ? "Important" : "Mineur"}
              </text>
            </g>
          ))}
        </g>

        {/* Trend indicator */}
        {nonZero.length >= 2 && (
          <text x={svgWidth - padding.right} y={padding.top + chartHeight + 25} textAnchor="end"
            fill={trendSlope < 0 ? "#10b981" : "#ef4444"} fontSize={10} fontWeight="bold">
            {trendSlope < 0 ? "Tendance: En amelioration" : trendSlope > 0 ? "Tendance: En degradation" : ""}
          </text>
        )}
      </svg>
    </div>
  );
}

// ---- Helpers ----
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
