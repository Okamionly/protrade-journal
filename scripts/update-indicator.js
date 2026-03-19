const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

// The full Pine Script from user's message
const FULL_SCRIPT = `//@version=6
indicator("Sniper Oscillator [Smart Core] v3", shorttitle="SNP V3", overlay=false)
// ─────────────────────────────────────────────────────────────────────────────
// 1. SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
// -- SUPERTREND OSCILLATOR --
groupST   = "1. SuperTrend Oscillator (Momentum)"
st_len    = input.int(10,   "Length", minval=1, group=groupST)
st_mult   = input.float(2.0, "Multiplier", minval=0.1, step=0.1, group=groupST)
st_smooth = input.int(72,   "Smoothing", minval=1, group=groupST)
// -- ICHIMOKU OSCILLATOR --
groupIchi = "2. Ichimoku Oscillator (Trend Strength)"
conv_len  = input.int(9,  "Tenkan-sen (Conversion)", minval=1, group=groupIchi)
base_len  = input.int(26, "Kijun-sen (Base)", minval=1, group=groupIchi)
lead_len  = input.int(52, "Senkou Span B (Leading)", minval=1, group=groupIchi)
disp      = input.int(26, "Displacement", minval=1, group=groupIchi)
// -- RSI VOLATILITY --
groupVol  = "3. RSI Volatility (Squeeze Filter)"
rsi_len   = input.int(14, "RSI Length", minval=1, group=groupVol)
vol_len   = input.int(5,  "Volatility Length", minval=1, group=groupVol)
sqz_th    = input.float(2.0, "Squeeze Threshold", minval=0.1, step=0.1, group=groupVol)
// -- MACD (Trend Confirmation) --
groupMACD = "4. MACD (Trend Confirmation)"
macd_fast = input.int(12, "Fast Length", minval=1, group=groupMACD)
macd_slow = input.int(26, "Slow Length", minval=1, group=groupMACD)
macd_sig  = input.int(9,  "Signal Smoothing", minval=1, group=groupMACD)
show_macd_dots = input.bool(true, "Show MACD Cross Dots", group=groupMACD)
// -- SMART CORE (INVENTION) --
groupSmart = "5. Smart Core (Invention)"
use_chop  = input.bool(true, "Use Choppiness Filter (The Silencer)", group=groupSmart)
chop_len  = input.int(14, "Choppiness Length", minval=1, group=groupSmart)
chop_th   = input.float(61.8, "Choppiness Threshold", minval=1, step=0.1, group=groupSmart)
use_div   = input.bool(true, "Show Divergences (Predictive Scope)", group=groupSmart)
div_lb    = input.int(5, "Divergence Pivot Lookback", minval=1, group=groupSmart)
// -- DASHBOARD --
groupDash = "6. Dashboard"
showDash     = input.bool(true, "Show Dashboard", group=groupDash)
dashPos      = input.string(position.top_right, "Position", options=[position.top_right, position.bottom_right, position.bottom_left, position.top_left], group=groupDash)
dashSize     = input.string(size.normal, "Size (Enhanced)", options=[size.tiny, size.small, size.normal, size.large, size.huge], group=groupDash)
style     = input.string("Day Trading", "Style", options=["Scalping", "Day Trading", "Swing", "Manual"], group=groupDash)
m_tf1     = input.timeframe("60",  "Manual TF 1", group=groupDash)
m_tf2     = input.timeframe("240", "Manual TF 2", group=groupDash)
m_tf3     = input.timeframe("D",   "Manual TF 3", group=groupDash)
// -- FILTERS --
groupFilt = "7. Filters"
use_vol   = input.bool(true, "Filter by Volume (> SMA 20)", group=groupFilt)
// -- VISUALS --
groupVis  = "Visuals"
colBull   = input.color(#089981, "Bull (Strong)", group=groupVis)
colBear   = input.color(#f23645, "Bear (Strong)", group=groupVis)
colNeut   = input.color(color.gray, "Neutral/Conflict", group=groupVis)
colSqz    = input.color(color.new(color.yellow, 85), "Squeeze Background", group=groupVis)
colMain   = input.color(#2962ff, "Consensus Line", group=groupVis)
mainWidth = input.int(2, "Consensus Line Width", minval=1, group=groupVis)
colSig    = input.color(#ff6d00, "Signal Line", group=groupVis)
sigWidth  = input.int(1, "Signal Line Width", minval=1, group=groupVis)
colChop   = input.color(color.new(#5d606b, 20), "Choppy Mode Color", group=groupVis)
divWidth  = input.int(2, "Divergence Line Width", minval=1, group=groupVis)
divStyle  = input.string(line.style_solid, "Divergence Line Style", options=[line.style_solid, line.style_dotted, line.style_dashed], group=groupVis)
colDivBull = input.color(#089981, "Bull Divergence Color", group=groupVis)
colDivBear = input.color(#f23645, "Bear Divergence Color", group=groupVis)
// -- DASHBOARD THEME --
groupTheme = "Dashboard Theme"
dashBgCol   = input.color(color.new(#131722, 10), "Background Color", group=groupTheme)
dashBdrCol  = input.color(#2a2e39, "Border Color", group=groupTheme)
dashTxtCol  = input.color(color.white, "Text Color", group=groupTheme)
dashHeadCol = input.color(color.new(#1e222d, 0), "Header Background", group=groupTheme)
dashHeadTxt = input.color(#787b86, "Header Text Color", group=groupTheme)

// ─────────────────────────────────────────────────────────────────────────────
// 2. CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────
calc_st_osc(float _src, int _len, float _mult) =>
    float atr = ta.atr(_len) * _mult
    float up = hl2 + atr
    float dn = hl2 - atr
    var float upper = 0.
    var float lower = 0.
    upper := _src[1] < upper[1] ? math.min(up, upper[1]) : up
    lower := _src[1] > lower[1] ? math.max(dn, lower[1]) : dn
    var int trend = 0
    trend := _src > upper[1] ? 1 : _src < lower[1] ? 0 : trend[1]
    float spt = trend == 1 ? lower : upper
    float range_ = upper - lower
    float raw_osc = range_ != 0 ? (_src - spt) / range_ : 0
    float osc = math.max(math.min(raw_osc, 1), -1) * 100
    osc

donchian(len) => math.avg(ta.lowest(len), ta.highest(len))

calc_ichi_score(int _conv, int _base, int _lead, int _disp) =>
    float convLine = donchian(_conv)
    float baseLine = donchian(_base)
    float lead1    = math.avg(convLine, baseLine)
    float lead2    = donchian(_lead)
    float cloudMin = math.min(lead1[_disp - 1], lead2[_disp - 1])
    float cloudMax = math.max(lead1[_disp - 1], lead2[_disp - 1])
    var int mtrend = 0
    mtrend := close > cloudMax ? 1 : close < cloudMin ? -1 : mtrend
    int score = 0
    score += mtrend
    if convLine >= baseLine
        score += 1
    else
        score -= 1
    if lead1 >= lead2
        score += 1
    else
        score -= 1
    if close > close[_disp]
        score += 1
    else
        score -= 1
    float norm_score = (score / 4.0) * 100
    norm_score

calc_rsi_vol(int _rlen, int _vlen) =>
    float _rsi = ta.hma(ta.rsi(close, _rlen), _vlen)
    float _hv = 100 * ta.stdev(math.log(_rsi / _rsi[1]), 5)
    _hv := _hv / ta.stdev(_hv, 200)
    _hv

calc_rsi_score(int _len) =>
    float r = ta.rsi(close, _len)
    [ (r - 50) * 2 , r ]

calc_macd_score(int _fast, int _slow, int _sig) =>
    [macdLine, signalLine, _] = ta.macd(close, _fast, _slow, _sig)
    int score = 0
    if macdLine > signalLine
        score := 100
    else
        score := -100
    bool xUp = ta.crossover(macdLine, signalLine)
    bool xDn = ta.crossunder(macdLine, signalLine)
    [score, xUp, xDn]

calc_chop(int _len) =>
    float sumAtr = math.sum(ta.atr(1), _len)
    float hi = ta.highest(_len)
    float lo = ta.lowest(_len)
    float range_ = hi - lo
    float ci = 100 * math.log10(sumAtr / range_) / math.log10(_len)
    ci

calcAll() =>
    st = calc_st_osc(close, st_len, st_mult)
    ich = calc_ichi_score(conv_len, base_len, lead_len, disp)
    vol = calc_rsi_vol(rsi_len, vol_len)
    [rsScore, rsRaw]  = calc_rsi_score(rsi_len)
    [mac, mxUp, mxDn] = calc_macd_score(macd_fast, macd_slow, macd_sig)
    combo = math.avg(st, ich, mac, rsScore)
    isSq = vol <= sqz_th ? 1 : 0
    chopVal = calc_chop(chop_len)
    isChoppy = use_chop and chopVal > chop_th
    float vSma = ta.sma(volume, 20)
    bool volOk = not use_vol or (volume > vSma)
    [st, ich, vol, combo, isSq, mac, mxUp, mxDn, chopVal, isChoppy, rsScore, rsRaw, volOk]

// ─────────────────────────────────────────────────────────────────────────────
// 3. MAIN LOGIC & PLOTTING
// ─────────────────────────────────────────────────────────────────────────────
[st_val, ichi_val, vol_val, combo_score, isSqueezeInt, macd_val, mac_xUp, mac_xDn, chop_val, isChoppy, rsi_score, rsi_raw, vol_ok] = calcAll()
bool isSqueeze = isSqueezeInt == 1

var float signal_line = 0.
float alpha = math.pow(combo_score/100.0, 2) / st_len
signal_line := nz(signal_line[1] + alpha * (combo_score - signal_line[1]), combo_score)

// DIVERGENCE ENGINE
f_calc_div(float src, float osc, int lb) =>
    float pl = ta.pivotlow(osc, lb, lb)
    float ph = ta.pivothigh(osc, lb, lb)
    bool divBull = false
    if not na(pl)
        float oscPrev = ta.valuewhen(not na(pl), osc[lb], 1)
        float prcPrev = ta.valuewhen(not na(pl), src[lb], 1)
        float oscCurr = osc[lb]
        float prcCurr = src[lb]
        if oscCurr > oscPrev and prcCurr < prcPrev
            divBull := true
    bool divBear = false
    if not na(ph)
        float oscPrev = ta.valuewhen(not na(ph), osc[lb], 1)
        float prcPrev = ta.valuewhen(not na(ph), src[lb], 1)
        float oscCurr = osc[lb]
        float prcCurr = src[lb]
        if oscCurr < oscPrev and prcCurr > prcPrev
            divBear := true
    [divBull, divBear]

[divMacdBull, divMacdBear] = f_calc_div(close, macd_val, div_lb)
[divRsiBull, divRsiBear]   = f_calc_div(close, rsi_raw, div_lb)
bool smartDivBull = (divMacdBull or divRsiBull) and use_div
bool smartDivBear = (divMacdBear or divRsiBear) and use_div

if use_div
    float pl_c = ta.pivotlow(combo_score, div_lb, div_lb)
    if not na(pl_c)
        float oscPrev = ta.valuewhen(not na(pl_c), pl_c, 1)
        float prcPrev = ta.valuewhen(not na(pl_c), low[div_lb], 1)
        int idxPrev   = ta.valuewhen(not na(pl_c), bar_index[div_lb], 1)
        float oscCurr = pl_c
        float prcCurr = low[div_lb]
        int idxCurr   = bar_index[div_lb]
        if oscCurr > oscPrev and prcCurr < prcPrev
            line.new(idxPrev, oscPrev, idxCurr, oscCurr, color=colDivBull, width=divWidth, style=divStyle)
    float ph_c = ta.pivothigh(combo_score, div_lb, div_lb)
    if not na(ph_c)
        float oscPrev = ta.valuewhen(not na(ph_c), ph_c, 1)
        float prcPrev = ta.valuewhen(not na(ph_c), high[div_lb], 1)
        int idxPrev   = ta.valuewhen(not na(ph_c), bar_index[div_lb], 1)
        float oscCurr = ph_c
        float prcCurr = high[div_lb]
        int idxCurr   = bar_index[div_lb]
        if oscCurr < oscPrev and prcCurr > prcPrev
            line.new(idxPrev, oscPrev, idxCurr, oscCurr, color=colDivBear, width=divWidth, style=divStyle)

// VISUALS
bgcolor(isSqueeze ? colSqz : na, title="Squeeze Background")
float hist = combo_score - signal_line
color histCol = hist >= 0 ? (hist[1] < hist ? #26a69a : #b2dfdb) : (hist[1] < hist ? #ffcdd2 : #ef5350)
if isChoppy
    histCol := colChop
else if isSqueeze
    histCol := color.new(color.gray, 50)

plot(hist, "Histogram", style=plot.style_columns, color=histCol)
color mainCol = isChoppy ? colChop : colMain
color sigCol  = isChoppy ? colChop : colSig
plot(combo_score, "Consensus Line", color=mainCol, linewidth=mainWidth)
plot(signal_line, "Signal Line",    color=sigCol,  linewidth=sigWidth)
hline(0, "Zero", color=color.gray)
hline(50, "Bull Zone", color=color.gray, linestyle=hline.style_dotted)
hline(-50, "Bear Zone", color=color.gray, linestyle=hline.style_dotted)

// SIGNALS
bool xo = ta.crossover(combo_score, signal_line)
bool xu = ta.crossunder(combo_score, signal_line)
bool sniperBuy = not isSqueeze and vol_ok and xo and combo_score > 20
bool sniperSell = not isSqueeze and vol_ok and xu and combo_score < -20

bool recentDivBull = ta.barssince(smartDivBull) < 15
bool recentDivBear = ta.barssince(smartDivBear) < 15
bool goldBuy  = sniperBuy and recentDivBull
bool goldSell = sniperSell and recentDivBear
bool stdBuy   = sniperBuy and not goldBuy
bool stdSell  = sniperSell and not goldSell

plotshape(stdBuy,  "Sniper Buy", shape.triangleup,   location.bottom, colBull, size=size.tiny)
plotshape(goldBuy, "GOLD Buy",   shape.triangleup,   location.bottom, color.new(color.yellow, 0), size=size.small, text="\\u2605", textcolor=color.yellow)
plotshape(stdSell, "Sniper Sell", shape.triangledown, location.top,    colBear, size=size.tiny)
plotshape(goldSell,"GOLD Sell",   shape.triangledown, location.top,    color.new(color.yellow, 0), size=size.small, text="\\u2605", textcolor=color.yellow)

bool smartXUp = show_macd_dots and mac_xUp and not isChoppy and vol_ok
bool smartXDn = show_macd_dots and mac_xDn and not isChoppy and vol_ok
plotshape(smartXUp, "MACD Bull Cross", shape.circle, location=location.bottom, color=colBull, size=size.tiny, text="\\u2022", textcolor=colBull)
plotshape(smartXDn, "MACD Bear Cross", shape.circle, location=location.top, color=colBear, size=size.tiny, text="\\u2022", textcolor=colBear)

// ─────────────────────────────────────────────────────────────────────────────
// 4. DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
f_tf(tfStr) =>
    if str.contains(tfStr, "D") or str.contains(tfStr, "W")
        tfStr
    else
        float mVal = str.tonumber(tfStr)
        int m = int(mVal)
        if not na(m) and m >= 60 and m % 60 == 0
            str.tostring(m / 60) + "H"
        else
            tfStr + "m"

f_col_bg(v) =>
    if v > 50
        color.new(colBull, 20)
    else if v > 20
        color.new(colBull, 60)
    else if v < -50
        color.new(colBear, 20)
    else if v < -20
        color.new(colBear, 60)
    else
        color.new(color.gray, 80)

f_txt_col(v) => math.abs(v) > 20 ? color.white : color.new(color.white, 30)
f_status_txt(v, isChop) =>
    if isChop
        "RANGE"
    else if v > 70
        "STRONG BUY"
    else if v > 20
        "BUY"
    else if v < -70
        "STRONG SELL"
    else if v < -20
        "SELL"
    else
        "NEUTRAL"

f_macd_txt(m) => m > 0 ? "\\u25B2" : "\\u25BC"
f_macd_col(m) => m > 0 ? colBull : colBear
f_sqTxt(s) => s==1 ? "\\u25CF" : "\\u25CB"
f_sqCol(s) => s==1 ? color.yellow : color.gray
f_vol_txt(vOk) => vOk ? "HIGH" : "LOW"
f_vol_col(vOk) => vOk ? color.green : color.red
f_rsi_col(r) => r > 70 ? colBear : r < 30 ? colBull : color.gray
f_col(v, _bull, _bear) => v > 0 ? _bull : v < 0 ? _bear : color.gray
f_ichi_txt(v) => v > 0 ? "\\u25B2" : "\\u25BC"
f_ichi_col(v) => v > 0 ? colBull : colBear

f_row(_tbl, _r, _tf, _st, _ic, _mac, _co, _sq, _chop, _rs, _vOk, _ts, _hC) =>
    bool isC = _chop > chop_th and use_chop
    table.cell(_tbl, 0, _r, f_tf(_tf), text_color=color.gray, text_size=_ts, bgcolor=_hC, text_halign=text.align_left)
    string status = f_status_txt(_co, isC)
    color statCol = isC ? colChop : f_col_bg(_co)
    table.cell(_tbl, 1, _r, status, bgcolor=statCol, text_color=dashTxtCol, text_size=_ts, text_halign=text.align_center)
    table.cell(_tbl, 2, _r, str.tostring(math.round(_st)), text_color=color.new(f_col(_st, colBull, colBear), 0), text_size=_ts, bgcolor=_hC)
    table.cell(_tbl, 3, _r, f_ichi_txt(_ic), text_color=f_ichi_col(_ic), text_size=_ts, bgcolor=_hC)
    table.cell(_tbl, 4, _r, f_macd_txt(_mac), text_color=f_macd_col(_mac), text_size=_ts, bgcolor=_hC)
    table.cell(_tbl, 5, _r, str.tostring(math.round(_rs)), text_color=color.new(f_rsi_col(_rs), 0), text_size=_ts, bgcolor=_hC)
    table.cell(_tbl, 6, _r, f_vol_txt(_vOk), text_color=f_vol_col(_vOk), text_size=_ts, bgcolor=_hC)

if showDash
    string tf1 = na, string tf2 = na, string tf3 = na
    if style == "Scalping"
        tf1 := "5", tf2 := "15", tf3 := "60"
    else if style == "Day Trading"
        tf1 := "60", tf2 := "240", tf3 := "D"
    else if style == "Swing"
        tf1 := "240", tf2 := "D", tf3 := "W"
    else
        tf1 := m_tf1, tf2 := m_tf2, tf3 := m_tf3

    [st0, ic0, vo0, co0, sq0, mc0, u0, d0, ch0, isc0, rss0, rsr0, vOk0] = calcAll()
    [st1, ic1, vo1, co1, sq1, mc1, u1, d1, ch1, isc1, rss1, rsr1, vOk1] = request.security(syminfo.tickerid, tf1, calcAll())
    [st2, ic2, vo2, co2, sq2, mc2, u2, d2, ch2, isc2, rss2, rsr2, vOk2] = request.security(syminfo.tickerid, tf2, calcAll())
    [st3, ic3, vo3, co3, sq3, mc3, u3, d3, ch3, isc3, rss3, rsr3, vOk3] = request.security(syminfo.tickerid, tf3, calcAll())

    var tbl = table.new(dashPos, 7, 6, bgcolor=dashBgCol, frame_color=dashBdrCol, frame_width=1, border_width=1, border_color=dashBdrCol)
    hC = dashHeadCol
    txtC = dashHeadTxt
    ts = dashSize

    table.merge_cells(tbl, 0, 0, 6, 0)
    table.cell(tbl, 0, 0, "MARKETPHASE \\u2022 " + str.upper(style), text_color=dashTxtCol, text_size=ts, bgcolor=hC)
    table.cell(tbl, 0, 1, "TF", bgcolor=hC, text_color=txtC, text_size=size.tiny)
    table.cell(tbl, 1, 1, "SIGNAL", bgcolor=hC, text_color=txtC, text_size=size.tiny)
    table.cell(tbl, 2, 1, "ST", bgcolor=hC, text_color=txtC, text_size=size.tiny)
    table.cell(tbl, 3, 1, "ICHI", bgcolor=hC, text_color=txtC, text_size=size.tiny)
    table.cell(tbl, 4, 1, "MACD", bgcolor=hC, text_color=txtC, text_size=size.tiny)
    table.cell(tbl, 5, 1, "RSI", bgcolor=hC, text_color=txtC, text_size=size.tiny)
    table.cell(tbl, 6, 1, "VOL", bgcolor=hC, text_color=txtC, text_size=size.tiny)
    f_row(tbl, 2, timeframe.period, st0, ic0, mc0, co0, sq0, ch0, rsr0, vOk0, ts, hC)
    f_row(tbl, 3, tf1, st1, ic1, mc1, co1, sq1, ch1, rsr1, vOk1, ts, hC)
    f_row(tbl, 4, tf2, st2, ic2, mc2, co2, sq2, ch2, rsr2, vOk2, ts, hC)
    f_row(tbl, 5, tf3, st3, ic3, mc3, co3, sq3, ch3, rsr3, vOk3, ts, hC)`;

async function main() {
  const p = new PrismaClient();

  // Update indicator with full script
  const updated = await p.$executeRawUnsafe(
    'UPDATE "VipPost" SET "scriptCode" = $1 WHERE type = $2',
    FULL_SCRIPT,
    'indicator'
  );
  console.log('Updated indicator script:', updated, 'rows');

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
