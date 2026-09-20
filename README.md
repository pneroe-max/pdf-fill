# PDF Fill

Compila e firma moduli PDF dal telefono. Tutto gira nel browser: il PDF non esce mai dal dispositivo, non c'è backend.

## Deploy

1. Nuovo repo `pdf-fill` su GitHub, visibilità pubblica.
2. Carica i file di questa cartella nella radice del repo.
3. Settings → Pages → Source: `Deploy from a branch`, branch `main`, cartella `/ (root)`.
4. Dopo un minuto l'app è su `https://pneroe-max.github.io/pdf-fill/`.
5. Aprila in Chrome su Android → menù → *Installa app*. Da lì funziona anche senza rete.

Il service worker mette in cache app e librerie al primo avvio. Pubblicando una versione nuova, alza `CACHE` in `sw.js` (`pdffill-v1` → `pdffill-v2`) per forzare l'aggiornamento.

## Come funziona

**Moduli con campi (AcroForm).** `pdf-lib` elenca i campi con nome, tipo e rettangolo. Il nome viene confrontato con le regole in `REGOLE` e associato ai dati salvati: un campo chiamato `Codice Fiscale` si precompila da solo. All'uscita i campi vengono appiattiti, quindi il PDF non è più modificabile.

**Moduli piatti o scansionati.** La pagina viene renderizzata su canvas e analizzata pixel per pixel:

- righe da compilare: tratti orizzontali scuri lunghi almeno 45pt, spessi al massimo 2,5pt, con lo spazio sopra libero;
- caselle: quadrati fra 8,5 e 18pt, con i quattro bordi pieni e l'interno vuoto (è questo che esclude le lettere).

Su un modulo di prova con 12 righe e 4 caselle il rilevamento le trova tutte, senza falsi positivi, in circa 60 ms.

**Memoria del modulo.** Alla prima compilazione viene salvata un'impronta del documento (hash del testo della prima pagina, o nome e dimensione se il PDF è scansionato) insieme a posizione e associazione di ogni campo. Riaprendo lo stesso modulo i campi tornano al loro posto senza rilevarli di nuovo.

**Corpo del testo.** Si parte dal 72% dell'altezza del campo e si scende di 0,25pt finché il testo entra nella larghezza, con il minimo a 6pt.

**Firme.** Disegnate su canvas, ritagliate sul tratto, salvate come PNG trasparente in IndexedDB. Inserite in un campo, vengono scalate mantenendo le proporzioni.

## Archivio locale (IndexedDB `pdffill`)

| store | contenuto |
|---|---|
| `firme` | `{id, nome, png, predefinita}` |
| `anagrafica` | `{chiave, valore}` |
| `layout` | `{impronta, nome, campi[]}` — solo posizioni e associazioni, mai i valori digitati |

## Limiti noti

- Niente OCR: le etichette dei moduli scansionati non vengono lette, l'associazione a un dato si fa con un tap la prima volta e poi resta in memoria.
- Il rilevamento lavora alla risoluzione di rendering del telefono (circa 1,2x). Su scansioni storte o molto sbiadite conviene aggiungere i campi a mano con il tasto `＋`.
- I PDF protetti da password vanno sbloccati prima.
- I campi radio e i menù a tendina vengono compilati solo se il PDF li espone come campi veri.
- Se `flatten()` fallisce su un PDF anomalo, il file viene salvato comunque e l'app avvisa che i campi restano modificabili.

## Librerie

pdf-lib 1.17.1, pdf.js 3.11.174, React 18.3.1 con Babel standalone, tutte da cdnjs e messe in cache dal service worker.
