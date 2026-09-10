# etelwardosigismondi.it — sito del Senatore Etelwardo Sigismondi

Sito statico (HTML, CSS e JavaScript scritti a mano, nessun CMS, nessun database),
pubblicato con **GitHub Pages** da questo repository e servito attraverso **Cloudflare**
(DNS, HTTPS, protezione). Il modulo di segnalazione è un **Worker Cloudflare**
(`_worker/`) che trasforma l'invio in un'email alla casella istituzionale del Senatore.

Questo file è la guida per chi eredita il sito: staff del Senatore o un nuovo
fornitore. Tutto ciò che serve per gestirlo è qui o nei due account indicati sotto.

## Che cosa c'è in questo repository

| Cartella / file | Cosa contiene |
|---|---|
| `index.html`, `*.html` | le pagine in italiano |
| `en/`, `fr/`, `es/`, `de/` | le stesse pagine nelle altre lingue |
| `notizie/`, `dossier/` | comunicati e dossier |
| `assets/` | CSS, JavaScript, immagini, font (tutto ospitato qui: nessun servizio esterno) |
| `sitemap.xml`, `robots.txt`, `site.webmanifest` | file di servizio generati |
| `CNAME` | il dominio servito da GitHub Pages (`etelwardosigismondi.it`) |
| `_worker/` | il Worker Cloudflare del modulo di segnalazione (GitHub Pages non pubblica le cartelle che iniziano con `_`) |

Le pagine sono **generate** da un progetto sorgente (`_source/` con `gen_site.py`,
i dati JSON dei comunicati, dei dossier, della rassegna stampa e le traduzioni) che
il fornitore attuale consegna insieme al sito. Modificare i file HTML a mano
funziona, ma alla rigenerazione successiva le modifiche vanno riportate nei sorgenti.

## Come è ospitato

1. **GitHub Pages** — repository `Laqvila/etelwardosigismondi.it`, ramo `main`,
   cartella radice. Impostazioni → Pages: dominio personalizzato
   `etelwardosigismondi.it`, "Enforce HTTPS" attivo.
2. **Cloudflare** — zona `etelwardosigismondi.it` (piano gratuito):
   - DNS: record `A` dell'apice verso gli indirizzi di GitHub Pages
     (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`),
     record `AAAA` (`2606:50c0:8000::153` … `8003::153`), `CNAME www → laqvila.github.io`;
     tutti "Proxied". Modalità SSL/TLS: **Full**.
   - Email Routing: attivo; mittente del modulo `segnalazioni@etelwardosigismondi.it`;
     destinatario verificato `etelwardo.sigismondi@senato.it`.
   - Turnstile: widget "etelwardosigismondi.it" (chiave pubblica nel sito,
     chiave segreta nel Worker).
   - Workers: `etelwardosigismondi-segnala`, rotta `etelwardosigismondi.it/api/*`.
3. **Registrar** — il dominio è registrato su **Aruba**; i nameserver puntano a
   Cloudflare. Il rinnovo annuale del dominio resta su Aruba.
4. **Google Search Console** — proprietà `https://etelwardosigismondi.it/` (account
   Google di Mirko Rocci), verificata con il file `googleddd643da45a84de0.html` nella
   radice del sito: **non va rimosso**. Sitemap inviata (`/sitemap.xml`). Per passare la
   proprietà allo staff: Impostazioni → Utenti e autorizzazioni → aggiungere il loro
   account come Proprietario.

## Come si aggiorna il sito

Con i sorgenti: `python _source/gen_site.py` genera le pagine, `python _source/check.py`
le verifica (link, titoli, immagini, contrasti), `python _source/pubblica.py --prod`
le copia in questo repository; poi `git commit` e `git push`. GitHub Pages
pubblica in circa un minuto.

Senza i sorgenti: modificare i file HTML e fare push. Attenzione al CSS e al JS:
l'indirizzo dei file porta un'impronta (`style.css?v=…`) che cambia a ogni
modifica, così i browser non usano la copia vecchia in cache.

## Il modulo di segnalazione (`_worker/`)

Il modulo nella pagina Contatti fa un POST a `/api/segnala`. Il Worker controlla
i campi, l'esca antirobot, il tempo di compilazione, il limite per indirizzo IP
e la verifica Turnstile, poi invia un'email di testo semplice alla casella
istituzionale con il mittente di risposta impostato sull'email di chi scrive.
**Non salva nulla**: niente archivio, niente log del contenuto.

Per ridistribuirlo (serve Node.js):

```bash
cd _worker
npm install
npx wrangler login              # apre il browser: accesso all'account Cloudflare
npx wrangler secret put TURNSTILE_SECRET   # chiave segreta del widget Turnstile
npx wrangler deploy
```

Il destinatario, il mittente e le origini ammesse sono in `_worker/wrangler.toml`
(`[vars]`). Il destinatario deve essere un **indirizzo verificato** in
Cloudflare → Email Routing → Destination addresses.

## Passaggio di consegne al Senatore o a un nuovo fornitore

1. **Repository**: GitHub → Settings → General → "Transfer ownership" verso
   l'account o l'organizzazione del nuovo proprietario. Il sito resta in linea;
   GitHub Pages va riattivato una volta nel nuovo account (Settings → Pages).
2. **Cloudflare**: aggiungere il nuovo responsabile come membro dell'account
   (Manage account → Members), oppure creare la zona nel suo account
   ricopiando i record DNS elencati sopra, riattivare Email Routing e Turnstile,
   ridistribuire il Worker e infine cambiare i nameserver su Aruba.
3. **Aruba**: il dominio si trasferisce con il codice AuthInfo dal pannello Aruba
   (o si lascia su Aruba cambiando l'intestatario).

Nessun servizio a pagamento, nessuna licenza, nessuna dipendenza da terzi
oltre a GitHub, Cloudflare e al registrar.

## Note legali e privacy

Le pagine Privacy, Cookie, Note legali e Accessibilità sono generate dai sorgenti
e vanno aggiornate lì (chiavi `priv*`, `cook*`, `leg*`, `a11y*` in `gen_site.py`
e nelle traduzioni). Cambiando fornitori (hosting, email) vanno aggiornati i
paragrafi "Destinatari e fornitori" e "Trasferimenti fuori dall'Unione europea".
