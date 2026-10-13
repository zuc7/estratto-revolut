// Quotazioni intraday indicative per la simulazione ETF, senza dati dell'utente.
const FUNDS = [
  {symbol: 'VWCE.DE', name: 'Vanguard FTSE All-World'},
  {symbol: 'SXR8.DE', name: 'iShares Core S&P 500'},
  {symbol: 'EUNL.DE', name: 'iShares Core MSCI World'}
];

module.exports = async (_req, res) => {
  try {
    const funds = await Promise.all(FUNDS.map(async fund => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${fund.symbol}?range=1d&interval=5m`;
      const r = await fetch(url, {headers: {'User-Agent': 'Mozilla/5.0'}});
      if (!r.ok) throw new Error(`Quotazione ${fund.symbol} non disponibile`);
      const json = await r.json();
      const result = json.chart?.result?.[0];
      const timestamps = result?.timestamp || [];
      const prices = result?.indicators?.quote?.[0]?.close || [];
      const series = timestamps.map((ts, i) => ({ts: ts * 1000, price: prices[i]})).filter(p => Number.isFinite(p.price));
      if (series.length < 2) throw new Error(`Nessuna seduta disponibile per ${fund.symbol}`);
      return {...fund, series, open: series[0].price};
    }));

    // 50 euro complessivi, divisi in parti uguali e investiti al primo prezzo di oggi.
    const points = funds[0].series.map((p, i) => {
      const value = funds.reduce((sum, fund) => {
        const quote = fund.series[Math.min(i, fund.series.length - 1)];
        return sum + (50 / FUNDS.length) * quote.price / fund.open;
      }, 0);
      return {ts: p.ts, value};
    });
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.json({date: new Date().toISOString().slice(0, 10), asOf: new Date(points[points.length - 1].ts).toLocaleTimeString('it-IT', {timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit'}), funds: FUNDS, points});
  } catch (e) {
    res.status(502).json({error: e.message});
  }
};
