// Restituisce le transazioni in CSV (Data;Descrizione;Importo;Conto), pronte per Estratto.
const {eb, authed} = require('./_eb');
const dmy = s => { const [y, m, d] = s.slice(0, 10).split('-'); return `${d}/${m}/${y}`; };

const sanitizeCsv = s => {
  const str = String(s ?? '');
  if (/^[=+\-@\t\r]/.test(str)) return "'" + str;
  return str;
};

module.exports = async (req, res) => {
  if (!authed(req)) return res.status(401).end();
  const uid = process.env.EB_ACCOUNT;
  if (!uid) return res.status(500).send('EB_ACCOUNT mancante: completa prima /api/login');
  try {
    const from = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10); // shortcut: ultimi 12 mesi
    const rows = ['Data;Descrizione;Importo;Conto'];
    let key;
    let totalSum = 0;
    let oldestDate = null;
    do {
      const r = await eb(`/accounts/${uid}/transactions?date_from=${from}` + (key ? '&continuation_key=' + encodeURIComponent(key) : ''));
      for (const t of r.transactions || []) {
        if (t.status && t.status !== 'BOOK' && t.status !== 'PDNG') continue;
        const day = t.booking_date || t.value_date || t.transaction_date;
        if (!day) continue;
        if (!oldestDate || day < oldestDate) oldestDate = day;
        const out = t.credit_debit_indicator === 'DBIT';
        const who = out ? t.creditor?.name : t.debtor?.name;
        let desc = [who, ...(t.remittance_information || [])].filter(Boolean).join(' ') || 'Operazione';
        if (t.status === 'PDNG') desc += ' (in sospeso)';
        const amt = (out ? -1 : 1) * Math.abs(parseFloat(t.transaction_amount.amount));
        totalSum += amt;
        rows.push([dmy(day), `"${sanitizeCsv(desc).replace(/"/g, '""')}"`, amt.toFixed(2).replace('.', ','), 'Revolut'].join(';'));
      }
      key = r.continuation_key;
    } while (key);

    try {
      const bData = await eb(`/accounts/${uid}/balances`);
      const currentBal = parseFloat(bData.balances?.[0]?.balance_amount?.amount);
      if (!isNaN(currentBal) && oldestDate) {
        const diff = Math.round((currentBal - totalSum) * 100) / 100;
        if (Math.abs(diff) >= 0.01) {
          const prevDate = new Date(new Date(oldestDate).getTime() - 864e5).toISOString().slice(0, 10);
          rows.push([dmy(prevDate), '"Saldo iniziale conto"', diff.toFixed(2).replace('.', ','), 'Revolut'].join(';'));
        }
      }
    } catch (_) { /* se i saldi non sono disponibili prosegui con le transazioni */ }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(rows.join('\n'));
  } catch (e) { res.status(502).send(e.message); }
};
