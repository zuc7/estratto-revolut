# Estratto Open Banking (Revolut & Banche Europee)

Dashboard personale e privata per l'analisi delle spese bancarie tramite **Open Banking (PSD2)** via [Enable Banking](https://enablebanking.com).

L'applicazione gira interamente su **Vercel** (funzioni serverless Node 18+ e frontend statico `index.html`) senza necessità di database o server dedicati.

---

## 🔒 Sicurezza & Privacy
- **Zero Database:** Nessun dato bancario viene salvato su database esterni o server di terze parti.
- **Analisi nel Browser:** Il calcolo di statistiche, grafici e categorizzazioni avviene lato client nel tuo browser.
- **Crittografia RS256:** Le chiamate Open Banking sono autenticate con JWT firmati crittograficamente tramite la tua chiave privata RSA, custodita nelle variabili d'ambiente protette di Vercel.
- **Autenticazione a Tempo Costante:** L'accesso alle API è protetto da un token segreto verificato con hash SHA-256 a tempo costante contro attacchi side-channel.
- **Security Headers & CSP:** Include Content Security Policy (CSP), HSTS, X-Frame-Options (anti-clickjacking) e sanitizzazione contro CSV Formula Injection.

---

## 🚀 Guida all'Installazione (Setup in 5 Minuti)

### 1. Registrazione su Enable Banking
1. Registrati gratuitamente su [enablebanking.com](https://enablebanking.com) ed entra nel **Control Panel**.
2. Crea una nuova applicazione selezionando **"Production"** (modalità *restricted production* per i tuoi conti personali).
3. Compila il modulo:
   - **Application Name:** `Estratto Open Banking`
   - **Redirect URL:** `https://TUO-PROGETTO.vercel.app/api/callback`
   - **Private key:** Seleziona *"Generate in the browser"* e scarica il file `.pem`.
4. Annota l'**Application ID** (il codice alfanumerico o il nome del file `.pem`).
5. Nel Control Panel, clicca su **"Activate by linking accounts"** per attivare l'applicazione collegando il tuo conto bancario (es. Revolut).

---

### 2. Deploy su Vercel
Puoi pubblicare questa cartella su Vercel tramite **Vercel CLI** (`vercel` da terminale) o collegando il tuo repository GitHub a Vercel.

Imposta le seguenti **Variabili d'Ambiente** (Environment Variables) su Vercel:

| Variabile | Descrizione | Esempio / Default |
| :--- | :--- | :--- |
| `EB_APP_ID` | Application ID fornito da Enable Banking | `40d738c6-...` |
| `EB_PRIVATE_KEY` | Il contenuto testuale completo del file `.pem` | `-----BEGIN PRIVATE KEY-----\n...` |
| `EB_REDIRECT` | Lo stesso Redirect URL inserito su Enable Banking | `https://tuo-progetto.vercel.app/api/callback` |
| `ACCESS_TOKEN` | Una password o token lungo casuale a tua scelta | `tuo_token_segreto_qui` |
| `EB_BANK` | Nome della banca da collegare | `Revolut` *(default)* |
| `EB_COUNTRY` | Codice paese della banca (ISO 3166-1) | `LT` *(per Revolut)*, `IT`, `DE`, ecc. |

Esegui il deploy in produzione:
```bash
vercel --prod
```

---

### 3. Primo Accesso e Recupero UID del Conto
1. Apri nel browser:
   ```text
   https://TUO-PROGETTO.vercel.app/api/login?token=IL_TUO_ACCESS_TOKEN
   ```
2. Verrai reindirizzato alla pagina sicura della tua banca per confermare l'autorizzazione all'accesso in lettura (validità di 90 giorni).
3. Al termine dell'autorizzazione, la pagina mostrerà l'**UID** del tuo conto.
4. Aggiungi su Vercel la variabile d'ambiente:
   - `EB_ACCOUNT` = `<UID_DEL_CONTO>`
5. Esegui nuovamente il deploy per salvare la configurazione:
   ```bash
   vercel --prod
   ```

---

### 4. Utilizzo dell'Applicazione
1. Apri il tuo sito: `https://TUO-PROGETTO.vercel.app`.
2. Clicca su **"Collega Revolut"** e inserisci il tuo `ACCESS_TOKEN`.
3. L'applicazione caricherà automaticamente le transazioni e le memorizzerà nella cache locale del browser.
4. Ai successivi accessi, l'app effettuerà il login automatico e sincronizzerà in background i nuovi movimenti!

---

## 💡 Funzionalità Supportate
- **Operazioni Contabilizzate e in Sospeso:** Traccia sia i pagamenti già registrati sia quelli pendenti con carta.
- **Riconciliazione Saldo Reale:** Calcola automaticamente il saldo iniziale storico per garantire che il totale coincida al centesimo con il saldo reale della banca.
- **Multi-Banca:** Supporta Revolut, Intesa Sanpaolo, UniCredit, N26, BBVA e oltre 2.500 banche europee compatibili PSD2 tramite Enable Banking.
- **Esportazione & Report:** Esportazione CSV sanitizzata, visualizzazione andamento saldo, individuazione abbonamenti e spese ricorrenti.

---

## Licenza
Distribuito con licenza MIT. Vedi `LICENSE` per ulteriori dettagli.
