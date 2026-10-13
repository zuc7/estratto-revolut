// Quotazioni intraday indicative per la simulazione ETF, senza dati dell'utente.
const FUND = {symbol: 'VUAA.MI', name: 'Vanguard S&P 500 UCITS ETF USD Accumulating'};
const SHARES = 0.37;

module.exports = async (_req, res) => {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${FUND.symbol}?range=1d&interval=5m`;
    const r = await fetch(url, {headers: {'User-Agent': 'Mozilla/5.0'}});
    if (!r.ok) throw new Error(`Quotazione ${FUND.symbol} non disponibile`);
    const json = await r.json();
    const result = json.chart?.result?.[0];
    const timestamps = result?.timestamp || [];
    const prices = result?.indicators?.quote?.[0]?.close || [];
    const series = timestamps.map((ts, i) => ({ts: ts * 1000, price: prices[i]})).filter(p => Number.isFinite(p.price));
    if (series.length < 2) throw new Error(`Nessuna seduta disponibile per ${FUND.symbol}`);
    const open = series[0].price;
    const points = series.map(p => ({ts: p.ts, value: SHARES * p.price}));
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.json({date: new Date().toISOString().slice(0, 10), asOf: new Date(points[points.length - 1].ts).toLocaleTimeString('it-IT', {timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit'}), fund: FUND, shares: SHARES, openingValue: SHARES * open, points});
  } catch (e) {
    res.status(502).json({error: e.message});
  }
};
