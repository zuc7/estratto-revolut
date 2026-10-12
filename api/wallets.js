// Restituisce un JSON con tutti i conti Revolut (corrente, savings, investimenti)
// più il loro saldo e le ultime transazioni per ciascuno.
// GET /api/wallets?token=… oppure Authorization: Bearer …
const {eb, authed} = require('./_eb');

// Mappa i cash_account_type / product_name a etichette italiane e tipo portafoglio
function walletMeta(acct) {
  const name  = (acct.product || acct.product_name || acct.name || '').toLowerCase();
  const type  = (acct.cash_account_type || '').toUpperCase();
  const cur   = (acct.currency || acct.account_id?.currency || '').toUpperCase();

  // Investimenti: Revolut non ha un "investment account" nel PSD2, ma i Revolut Trading
  // pocket a volte arrivano come CACC con product "stocks" o "trading" nel nome
  if (/stock|trading|invest|azioni|etf|crypto/i.test(name))
    return {label: 'Investimenti', kind: 'investment'};

  // Savings: Savings Vault / Instant Access Savings
  if (/sav|risparmio|savings vault|piggy|instant.*sav|pocket.*sav/i.test(name) || type === 'SVGS')
    return {label: 'Instant Savings', kind: 'savings'};

  // Conto corrente principale
  if (type === 'CACC' || type === 'TRAN' || type === 'MOMA')
    return {label: `Conto ${cur}`, kind: 'current'};

  return {label: acct.product || acct.name || `Conto ${cur}`, kind: 'other'};
}

module.exports = async (req, res) => {
  if (!authed(req)) return res.status(401).end();
  const uid = process.env.EB_ACCOUNT;
  if (!uid) return res.status(500).send('EB_ACCOUNT mancante');

  try {
    // 1. Lista di tutti i conti disponibili nella sessione
    let accounts = [];
    try {
      const a = await eb('/accounts');
      accounts = a.accounts || [];
    } catch (_) {
      // fallback: usa solo l'account configurato
      accounts = [{ account_id: { iban: uid }, currency: 'EUR' }];
    }
    // Se non viene tornata la lista, usa l'account singolo configurato
    if (!accounts.length) accounts = [{ resource_id: uid }];

    const from = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);

    const wallets = await Promise.all(accounts.map(async acct => {
      const rid = acct.resource_id || acct.account_id?.iban || uid;
      const meta = walletMeta(acct);
      const currency = (acct.currency || acct.account_id?.currency || 'EUR').toUpperCase();

      // Saldo
      let balance = null, balanceType = null;
      try {
        const bd = await eb(`/accounts/${rid}/balances`);
        const b = bd.balances?.[0];
        if (b) {
          balance = parseFloat(b.balance_amount?.amount ?? b.amount?.amount ?? 0);
          balanceType = b.balance_type || b.type || '';
        }
      } catch (_) {}

      // Transazioni (solo per conti non-investimento, per performance)
      let transactions = [];
      if (meta.kind !== 'investment') {
        try {
          let key;
          do {
            const r = await eb(`/accounts/${rid}/transactions?date_from=${from}` + (key ? '&continuation_key=' + encodeURIComponent(key) : ''));
            for (const t of r.transactions || []) {
              if (t.status && t.status !== 'BOOK' && t.status !== 'PDNG') continue;
              const day = t.booking_date || t.value_date || t.transaction_date;
              if (!day) continue;
              const out = t.credit_debit_indicator === 'DBIT';
              const who = out ? t.creditor?.name : t.debtor?.name;
              const desc = [who, ...(t.remittance_information || [])].filter(Boolean).join(' ') || 'Operazione';
              const amt = (out ? -1 : 1) * Math.abs(parseFloat(t.transaction_amount?.amount ?? 0));
              transactions.push({ date: day, desc: t.status === 'PDNG' ? desc + ' (in sospeso)' : desc, amount: amt });
            }
            key = r.continuation_key;
          } while (key);
        } catch (_) {}
      }

      return {
        id: rid,
        label: meta.label,
        kind: meta.kind,
        currency,
        balance,
        balanceType,
        transactionCount: transactions.length,
        transactions // incluse per eventuale integrazione futura
      };
    }));

    res.setHeader('Content-Type', 'application/json');
    res.json({
      fetchedAt: new Date().toISOString(),
      wallets,
      // Totale patrimonio in EUR (stima semplice, valute miste non convertite)
      totalEur: wallets.reduce((s, w) => s + (w.currency === 'EUR' && w.balance != null ? w.balance : 0), 0)
    });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
