// Si apre UNA volta nel browser: /api/login?token=IL_TUO_TOKEN
// Con &find=1 elenca come compare Revolut per il paese EB_COUNTRY.
const {eb, authed} = require('./_eb');

module.exports = async (req, res) => {
  if (!authed(req)) return res.status(401).send('Non autorizzato');
  try {
    const country = process.env.EB_COUNTRY || 'LT';
    if (req.query.find) {
      const a = await eb('/aspsps?country=' + country);
      return res.json(a.aspsps.filter(x => /revolut/i.test(x.name)).map(x => ({name: x.name, country: x.country})));
    }
    const a = await eb('/auth', {method: 'POST', body: JSON.stringify({
      access: {valid_until: new Date(Date.now() + 90 * 864e5).toISOString()}, // shortcut: 90 giorni, alza se la banca lo consente
      aspsp: {name: process.env.EB_BANK || 'Revolut', country},
      state: 'estratto', redirect_url: process.env.EB_REDIRECT, psu_type: 'personal'
    })});
    res.redirect(a.url);
  } catch (e) { res.status(502).send(e.message); }
};
