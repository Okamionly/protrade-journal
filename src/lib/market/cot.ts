import { COT_CONTRACTS, CFTC_API_BASE } from "./constants";

export interface CotParsed {
  date: string;
  nonCommLong: number;
  nonCommShort: number;
  nonCommNet: number;
  commLong: number;
  commShort: number;
  commNet: number;
  retailLong: number;
  retailShort: number;
  retailNet: number;
  openInterest: number;
}

export async function fetchCotData(assetKey: string, weeks = 52): Promise<CotParsed[]> {
  const contract = COT_CONTRACTS[assetKey];
  if (!contract) throw new Error(`Unknown asset: ${assetKey}`);

  const url = `${CFTC_API_BASE}?$where=cftc_contract_market_code='${contract.code}'&$order=report_date_as_yyyy_mm_dd DESC&$limit=${weeks}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CFTC API error: ${res.status}`);

  const raw = await res.json();

  return raw
    .map((r: Record<string, string>) => {
      const ncLong = parseInt(r.ncomm_positions_long_all || "0");
      const ncShort = parseInt(r.ncomm_positions_short_all || "0");
      const cLong = parseInt(r.comm_positions_long_all || "0");
      const cShort = parseInt(r.comm_positions_short_all || "0");
      const oi = parseInt(r.open_interest_all || "0");
      const rLong = oi - ncLong - cLong;
      const rShort = oi - ncShort - cShort;

      return {
        date: r.report_date_as_yyyy_mm_dd || "",
        nonCommLong: ncLong,
        nonCommShort: ncShort,
        nonCommNet: ncLong - ncShort,
        commLong: cLong,
        commShort: cShort,
        commNet: cLong - cShort,
        retailLong: Math.max(rLong, 0),
        retailShort: Math.max(rShort, 0),
        retailNet: rLong - rShort,
        openInterest: oi,
      };
    })
    .sort((a: CotParsed, b: CotParsed) => a.date.localeCompare(b.date));
}
