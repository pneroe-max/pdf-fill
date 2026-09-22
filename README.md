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

**Moduli con campi (AcroForm).** `pdf-lib` elenca i campi con nome, tipo e rettangolo. Il nome interno viene confrontato con le regole in `REGOLE`, ma nei moduli della pubblica amministrazione è spesso inutile (`Testo1`, `Testo2`): allora si legge l'etichetta stampata accanto al campo dal livello testo, la stessa strada usata sui moduli piatti. "Il/La sottoscritto/a", "nato/a il", "residente a", "C.F.:", "prov.", "codice fiscale" vengono riconosciute così. All'uscita i campi vengono appiattiti, quindi il PDF non è più modificabile.

**Moduli piatti o scansionati.** La pagina viene renderizzata su canvas e analizzata pixel per pixel:

- righe da compilare: tratti orizzontali lunghi almeno 36pt, ricomponendo i buchi fino a 4,5pt — è così che vengono riconosciute le righe di underscore spaziati e quelle di puntini `………`, che altrimenti sarebbero invisibili;
- il filtro decisivo è lo spessore verticale: l'inchiostro di una riga occupa poche righe di pixel, quello del testo molte. Senza questo controllo i bordi superiori delle lettere maiuscole vengono scambiati per righe tratteggiate;
- caselle: quadrati fra 8,5 e 18pt, con i quattro bordi pieni e l'interno vuoto (è questo che esclude le lettere).

Su un modulo con righe vettoriali (12 righe, 4 caselle) le trova tutte in circa 60 ms. Su un'autocertificazione con underscore e puntini trova 12 campi su 12, compresa la riga della firma, con un falso positivo.

**Etichette e compilazione automatica.** Per i PDF digitali il livello testo di pdf.js dà posizione e contenuto di ogni parola. Per ogni riga trovata viene cercata l'etichetta a sinistra (anche quando etichetta e underscore sono lo stesso blocco: la porzione che precede il campo viene tagliata al confine di parola), sotto (`(comune di residenza)`) e sopra (`Luogo e data`, `Il/La dichiarante`). L'etichetta viene confrontata con le regole e il campo si precompila da solo. Un'etichetta che parla di firma trasforma il campo in campo firma. Sulle scansioni il livello testo è vuoto e non succede nulla: serve l'OCR, fuori perimetro.

**Memoria del modulo.** Alla prima compilazione viene salvata un'impronta del documento (hash del testo della prima pagina, o nome e dimensione se il PDF è scansionato) insieme a posizione e associazione di ogni campo. Riaprendo lo stesso modulo i campi tornano al loro posto senza rilevarli di nuovo.

**Corpo del testo.** Si parte dal 72% dell'altezza del campo e si scende di 0,25pt finché il testo entra nella larghezza, con il minimo a 6pt.

**Firme.** Disegnate su canvas, ritagliate sul tratto, salvate come PNG trasparente in IndexedDB. Inserite in un campo, vengono scalate mantenendo le proporzioni.

## Aspetto

Contenuti su carta bianca, barre di sopra e di sotto scure. La gerarchia viene dal peso del carattere e dallo spessore dei filetti: filetto pieno sotto il titolo, filetto medio sotto le intestazioni di sezione, filo sottile fra le righe di elenco. Niente schede con ombra.

Il giallo evidenziatore ha un significato solo: **qui manca qualcosa da scrivere**. Un campo compilato perde il riempimento e tiene un contorno sottile, così si legge il valore.

## Profili

Ogni persona ha il suo profilo con i suoi dati. Il profilo attivo precompila i moduli; all'apertura di un modulo, se i profili sono più di uno, l'app chiede chi stai compilando, e nel pannello di ogni campo puoi passare a un'altra persona per quel campo soltanto. Quello che scrivi in un campo associato a un dato ancora vuoto viene imparato nel profilo di quel campo. I vecchi dati singoli vengono migrati nel profilo "Io" al primo avvio.

Scrivendo `Paullo (MI)` in un campo comune o luogo di nascita, la sigla finisce nel campo provincia accanto e viene imparata. Un campo corto subito dopo un comune viene riconosciuto da solo come provincia.

## Vista a modulo

All'apertura il PDF diventa un elenco di caselle raggruppate per pagina. Sopra ogni casella c'è la frase del modulo con il buco evidenziato in giallo:

> residente a ____ in Via ____ n. ____ C.F.: **▁▁▁**

La frase si ricostruisce dal livello testo: le parole della pagina vengono raggruppate per riga, le voci che attraversano un campo vengono tagliate al confine di parola, e gli altri campi della stessa riga diventano trattini. Se sulla riga non c'è testo si risale alle righe sopra fino a 45pt, così "Luogo e data" e "Firma" trovano comunque la loro etichetta. Sulle scansioni il livello testo è vuoto e la casella resta senza frase.

Ogni tipo di dato apre la tastiera giusta: numerica per CAP e civico, telefono, email, maiuscole per il codice fiscale. Invio passa alla casella successiva. `vedi sul foglio` porta al campo sulla pagina vera, dove si può spostare o cancellare; l'interruttore **Modulo / Foglio** in alto fa la stessa cosa a mano.

Sui moduli piatti tutte le pagine (fino a 12) vengono analizzate all'apertura, fuori schermo e a scala fissa: il rilevamento non dipende più dalla larghezza dello schermo, e l'elenco è completo dal primo momento.

## Pannello del campo

In cima c'è un ritaglio ingrandito del modulo: il campo evidenziato in giallo più la zona attorno, così l'etichetta stampata si legge sia che stia a sinistra, sopra o sotto la riga. Il ritaglio viene renderizzato da pdf.js alla risoluzione giusta per il pannello, non ingrandendo l'immagine della pagina, e il testo che scrivi ci compare dentro mentre lo digiti.

**Avanti** (o Invio sulla tastiera) salva e porta al prossimo campo vuoto, anche su un'altra pagina, saltando le caselle; arrivato in fondo riparte dall'inizio. **‹** torna al campo precedente anche se già compilato. Il contatore mostra la posizione nell'ordine di lettura.

Dati e persone stanno su una riga scorrevole; aspetto, posizione ed eliminazione sono raccolti in una sezione richiudibile.

Corpo del testo (A− / A+ rispetto al calcolo automatico), spostamento di 2pt nelle quattro direzioni, e scrittura normale, MAIUSCOLA o minuscola. Le scelte restano memorizzate con il modulo.

## Navigazione

Il gesto indietro di Android chiude un livello alla volta: pannello, poi modulo, poi schermata. La ricarica trascinando dall'alto è disattivata.

## Salvataggio verificato

Il file viene scritto due volte se serve. Primo tentativo: i valori vanno nei campi veri del modulo, che poi vengono appiattiti. Poi il PDF prodotto viene **riaperto e controllato**: se un valore non compare nel testo della pagina, il file si rifà scrivendo i valori direttamente sopra e togliendo i campi. Capita con i moduli che hanno un livello XFA o campi che non accettano la scrittura: l'app li mostra pieni ma il lettore li vede vuoti.

Il livello XFA, quando c'è, viene rimosso: è lui a far ignorare ai lettori i valori dei campi AcroForm.

Il messaggio dopo il salvataggio dice quanti valori sono stati scritti, così un file vuoto si riconosce subito.

## Archivio locale (IndexedDB `pdffill`)

| store | contenuto |
|---|---|
| `firme` | `{id, nome, png, predefinita}` |
| `profili` | `{id, nome, dati}` — un profilo per persona |
| `anagrafica` | vecchio formato, letto solo per la migrazione |
| `layout` | `{impronta, nome, campi[]}` — solo posizioni e associazioni, mai i valori digitati |

## Limiti noti

- Niente OCR: sui moduli scansionati le etichette non si leggono, l'associazione a un dato si fa con un tap la prima volta e poi resta in memoria.
- I dati non ancora salvati appaiono comunque fra i suggerimenti, in grigio: quello che scrivi in un campo associato viene imparato e riproposto nei moduli successivi.
- Il rilevamento lavora alla risoluzione di rendering del telefono (circa 1,2x). Su scansioni storte o molto sbiadite conviene aggiungere i campi a mano con il tasto `＋`.
- I PDF protetti da password vanno sbloccati prima.
- I campi radio e i menù a tendina vengono compilati solo se il PDF li espone come campi veri.
- Se `flatten()` fallisce su un PDF anomalo, il file viene salvato comunque e l'app avvisa che i campi restano modificabili.

## Librerie

pdf-lib 1.17.1, pdf.js 3.11.174, React 18.3.1 con Babel standalone, tutte da cdnjs e messe in cache dal service worker.
