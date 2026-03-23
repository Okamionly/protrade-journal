import { NextResponse } from "next/server";

const CBOE_CSV_URL = "https://cdn.cboe.com/api/global/us_indices/daily_prices/TOTALPC.csv";

interface PutCallEntry {
  date: string;
  ratio: number;
  puts: number;
  calls: number;
}

export async function GET() {
  try {
    const res = await fetch(CBOE_CSV_URL, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/csv,text/plain,*/*",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `CBOE API returned ${res.status}` },
        { status: res.status }
      );
    }

    const text = await res.text();
    const lines = text.trim().split("\n");

    if (lines.length < 2) {
      return NextResponse.json({ error: "Empty CSV from CBOE" }, { status: 502 });
    }

    // Parse header to find column indices
    const header = lines[0].split(",").map((h) => h.trim().toUpperCase());
    const dateIdx = header.findIndex((h) => h === "TRADE_DATE" || h === "DATE");
    const callIdx = header.findIndex((h) => h === "CALL_VOLUME" || h === "CALLS" || h === "CALL");
    const putIdx = header.findIndex((h) => h === "PUT_VOLUME" || h === "PUTS" || h === "PUT");
    const ratioIdx = header.findIndex((h) => h === "TOTAL_PUT_CALL_RATIO" || h === "P/C RATIO" || h === "RATIO");

    // Data rows (last 30 trading days)
    const dataLines = lines.slice(1);
    const last30 = dataLines.slice(-30);

    const data: PutCallEntry[] = [];

    for (const line of last30) {
      const cols = line.split(",").map((c) => c.trim());
      if (cols.length < 2) continue;

      const rawDate = dateIdx >= 0 ? cols[dateIdx] : cols[0];
      const date = formatDate(rawDate);
      if (!date) continue;

      let ratio = 0;
      let puts = 0;
      let calls = 0;

      if (putIdx >= 0 && callIdx >= 0) {
        puts = parseFloat(cols[putIdx]) || 0;
        calls = parseFloat(cols[callIdx]) || 0;
        ratio = ratioIdx >= 0 ? parseFloat(cols[ratioIdx]) || 0 : calls > 0 ? puts / calls : 0;
      } else if (ratioIdx >= 0) {
        ratio = parseFloat(cols[ratioIdx]) || 0;
      } else {
        // Fallback: assume columns are DATE, CALLS, PUTS, RATIO
        calls = parseFloat(cols[1]) || 0;
        puts = parseFloat(cols[2]) || 0;
        ratio = parseFloat(cols[3]) || (calls > 0 ? puts / calls : 0);
      }

      // Round ratio to 4 decimal places
      ratio = Math.round(ratio * 10000) / 10000;

      data.push({ date, ratio, puts, calls });
    }

    if (data.length === 0) {
      return NextResponse.json({ error: "Could not parse CBOE data" }, { status: 502 });
    }

    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
        },
      }
    );
  } catch (e) {
    console.error("CBOE put/call fetch error:", e);
    return NextResponse.json(
      { error: "Failed to fetch CBOE put/call data" },
      { status: 500 }
    );
  }
}

/** Normalize date strings like "2025-03-21", "03/21/2025", "20250321" to "YYYY-MM-DD" */
function formatDate(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/['"]/g, "").trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

  // MM/DD/YYYY
  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[1].padStart(2, "0")}-${slashMatch[2].padStart(2, "0")}`;
  }

  // YYYYMMDD
  const compactMatch = cleaned.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
  }

  return null;
}
