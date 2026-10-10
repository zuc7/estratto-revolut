// URL di ritorno dopo il consenso in Revolut: mostra l'uid del conto da mettere in EB_ACCOUNT.
const {eb} = require('./_eb');

module.exports = async (req, res) => {
  try {
    const s = await eb('/sessions', {method: 'POST', body: JSON.stringify({code: req.query.code})});
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send('Conti collegati. Copia l\'uid del conto da usare in EB_ACCOUNT su Vercel e rifai il deploy:\n\n' +
      s.accounts.map(a => `${a.uid}  ${a.account_id?.iban || a.name || ''} ${a.currency || ''}`).join('\n'));
  } catch (e) { res.status(502).send(e.message); }
};
