/**
 * La Fata's stories, for cloudy days: written at the player's level (only the
 * grammar of that level and below), two questions each. New Italian, shipped
 * as generated; every story can be reported in the game. `o[0]` is the answer.
 */
import type { Cefr } from "../engine";

export interface Storia {
  id: string;
  level: Cefr;
  titolo: string;
  testo: string;
  domande: { q: string; o: [string, string, string] }[];
}

export const STORIE: Storia[] = [
  // ── A1: presente ──────────────────────────────────────────────────────────
  { id: "a1-gatto", level: "A1", titolo: "Il gatto di Marta",
    testo: "Marta abita a Venezia, in una piccola casa vicino a un canale. Ha un gatto nero che si chiama Pepe. Ogni mattina Pepe guarda le barche dalla finestra. Non gli piace l'acqua, ma ama il pesce! Il pomeriggio Marta lavora in un bar e Pepe dorme sul divano. La sera mangiano insieme: Marta mangia la pasta, Pepe mangia il pesce.",
    domande: [{ q: "Di che colore è Pepe?", o: ["Nero", "Bianco", "Rosso"] },
              { q: "Dove lavora Marta?", o: ["In un bar", "In una scuola", "Su una barca"] }] },
  { id: "a1-mercato", level: "A1", titolo: "Al mercato di Rialto",
    testo: "È sabato. Luca va al mercato di Rialto con sua nonna. La nonna compra il pesce fresco e la frutta. Luca vuole le fragole, ma costano molto. «Prendiamo le mele», dice la nonna. «Sono buone e costano poco.» Luca è un po' triste. Poi la nonna compra anche un gelato per lui. Che bella giornata!",
    domande: [{ q: "Con chi va al mercato Luca?", o: ["Con sua nonna", "Con sua madre", "Con un amico"] },
              { q: "Che cosa compra la nonna per Luca alla fine?", o: ["Un gelato", "Le fragole", "Un pesce"] }] },
  { id: "a1-scuola", level: "A1", titolo: "La nuova scuola",
    testo: "Anna ha dieci anni ed è nuova a scuola. La sua classe è grande: ci sono venti bambini. La maestra si chiama Giulia ed è molto gentile. All'intervallo Anna è sola, ma una bambina va da lei. «Ciao, io sono Sara. Vuoi giocare con me?» Anna sorride. Adesso ha un'amica.",
    domande: [{ q: "Quanti bambini ci sono nella classe?", o: ["Venti", "Dieci", "Trenta"] },
              { q: "Come si chiama la nuova amica di Anna?", o: ["Sara", "Giulia", "Marta"] }] },
  { id: "a1-pioggia", level: "A1", titolo: "Una giornata di pioggia",
    testo: "Oggi piove e Paolo non va al parco. Resta a casa con il suo cane, Tobia. Paolo legge un libro e beve una cioccolata calda. Tobia dorme vicino alla finestra. Alle cinque non piove più. «Tobia, andiamo!» dice Paolo. Il cane è felice e corre alla porta.",
    domande: [{ q: "Che cosa beve Paolo?", o: ["Una cioccolata calda", "Un caffè", "Un succo di frutta"] },
              { q: "Quando escono Paolo e Tobia?", o: ["Quando non piove più", "La mattina presto", "Quando piove forte"] }] },
  { id: "a1-treno", level: "A1", titolo: "Il treno per Verona",
    testo: "Elena è alla stazione di Padova. Il suo treno per Verona parte alle nove. Ma sono le nove e dieci e il treno non c'è. Elena chiede a un signore: «Scusi, dov'è il treno per Verona?» «È in ritardo di venti minuti», risponde lui. Elena compra un caffè e aspetta.",
    domande: [{ q: "Dove va Elena?", o: ["A Verona", "A Padova", "A Venezia"] },
              { q: "Di quanti minuti è in ritardo il treno?", o: ["Venti", "Dieci", "Nove"] }] },
  { id: "a1-festa", level: "A1", titolo: "La festa a sorpresa",
    testo: "Domani è il compleanno di Marco: compie trent'anni. I suoi amici preparano una festa a sorpresa. Chiara fa una torta al cioccolato, Davide compra le bibite e Lucia decora la casa. Marco non sa niente! Quando arriva a casa, tutti gridano: «Buon compleanno!» Marco è molto contento.",
    domande: [{ q: "Quanti anni compie Marco?", o: ["Trenta", "Venti", "Quaranta"] },
              { q: "Chi fa la torta?", o: ["Chiara", "Davide", "Lucia"] }] },

  // ── A2: passato prossimo, imperfetto, futuro ─────────────────────────────
  { id: "a2-portici", level: "A2", titolo: "Il primo giorno a Bologna",
    testo: "L'anno scorso Sofia si è trasferita a Bologna per studiare. Il primo giorno pioveva e lei non aveva l'ombrello. Per fortuna, sotto i portici nessuno si bagnava! Ha camminato per ore e ha scoperto la città. A pranzo ha mangiato i tortellini in una piccola trattoria. Quando è tornata a casa era stanca, ma felice: Bologna le piaceva già moltissimo.",
    domande: [{ q: "Perché Sofia non si è bagnata?", o: ["Perché camminava sotto i portici", "Perché aveva l'ombrello", "Perché è rimasta a casa"] },
              { q: "Che cosa ha mangiato a pranzo?", o: ["I tortellini", "La pizza", "Una piadina"] }] },
  { id: "a2-nonno", level: "A2", titolo: "Il nonno racconta",
    testo: "«Quando ero giovane», racconta il nonno, «non c'erano i cellulari. Per parlare con la nonna, le scrivevo una lettera ogni settimana. Lei abitava a Modena e io a Parma. Un giorno ho preso il treno e sono andato da lei senza avvisare. Quando mi ha visto alla porta, ha riso tanto. Due anni dopo ci siamo sposati.»",
    domande: [{ q: "Come parlava il nonno con la nonna?", o: ["Con le lettere", "Con il telefono", "Con il computer"] },
              { q: "Che cosa ha fatto un giorno il nonno?", o: ["È andato a Modena senza avvisare", "Ha scritto una lettera lunghissima", "Ha comprato un telefono"] }] },
  { id: "a2-zia", level: "A2", titolo: "La ricetta della zia",
    testo: "Ogni domenica mia zia preparava le tagliatelle. Io la guardavo mentre lavorava la pasta con le mani. Un giorno le ho chiesto: «Zia, qual è il tuo segreto?» Lei ha sorriso e ha risposto: «Pazienza e uova fresche.» Oggi faccio le tagliatelle anch'io, ma non sono mai buone come le sue.",
    domande: [{ q: "Quando preparava le tagliatelle la zia?", o: ["Ogni domenica", "Ogni sera", "Solo a Natale"] },
              { q: "Qual era il segreto della zia?", o: ["Pazienza e uova fresche", "Molto sale", "Una farina speciale"] }] },
  { id: "a2-mura", level: "A2", titolo: "In bicicletta a Ferrara",
    testo: "Sabato scorso io e mio fratello abbiamo noleggiato due biciclette a Ferrara. Abbiamo fatto il giro delle mura: sono lunghe circa nove chilometri! A metà strada ha cominciato a piovere e ci siamo fermati in un bar. Mentre aspettavamo, abbiamo bevuto una cioccolata calda. Dopo mezz'ora è uscito il sole e siamo ripartiti.",
    domande: [{ q: "Dove hanno fatto il giro in bicicletta?", o: ["Sulle mura della città", "Al mare", "In montagna"] },
              { q: "Perché si sono fermati?", o: ["Perché pioveva", "Perché erano stanchi", "Perché avevano fame"] }] },
  { id: "a2-rimini", level: "A2", titolo: "Le estati a Rimini",
    testo: "Da bambina passavo ogni estate a Rimini con i miei genitori. La mattina andavamo in spiaggia e il pomeriggio facevamo lunghe passeggiate. Mi piaceva soprattutto la sera, quando mangiavamo il gelato sul lungomare. Quest'anno ci tornerò con i miei figli: sono sicura che si divertiranno anche loro.",
    domande: [{ q: "Con chi andava a Rimini da bambina?", o: ["Con i suoi genitori", "Con le amiche", "Con i suoi figli"] },
              { q: "Con chi ci tornerà quest'anno?", o: ["Con i suoi figli", "Con i suoi genitori", "Da sola"] }] },
  { id: "a2-chiavi", level: "A2", titolo: "Le chiavi perse",
    testo: "Ieri sera sono tornato a casa tardi e non trovavo più le chiavi. Le ho cercate nella borsa, nelle tasche e in macchina, ma niente. Alla fine ho telefonato a mia sorella, che ne ha una copia. È arrivata dopo mezz'ora, un po' arrabbiata. Stamattina ho trovato le chiavi... nel frigorifero, vicino al latte!",
    domande: [{ q: "Chi ha aiutato il narratore?", o: ["Sua sorella", "Un vicino", "La polizia"] },
              { q: "Dove erano le chiavi?", o: ["Nel frigorifero", "In macchina", "Nella borsa"] }] },

  // ── B1: trapassato, congiuntivo, condizionale passato, passivo, si ───────
  { id: "b1-vista", level: "B1", titolo: "Una stanza con vista",
    testo: "Prima di partire per Firenze, Giulia aveva prenotato una stanza con vista sul Duomo. Quando è arrivata, però, la finestra dava su un cortile buio. «Credo che ci sia un errore», ha detto alla receptionist. La ragazza ha controllato e si è scusata: la stanza giusta era stata data a un altro cliente. Per farsi perdonare, l'albergo le ha offerto la colazione per tutta la settimana. «Non è la vista che speravo», ha pensato Giulia, «ma il cornetto è ottimo.»",
    domande: [{ q: "Che cosa aveva prenotato Giulia?", o: ["Una stanza con vista sul Duomo", "Una stanza sul cortile", "Una colazione speciale"] },
              { q: "Come si è scusato l'albergo?", o: ["Le ha offerto la colazione", "Le ha dato un'altra stanza", "Le ha restituito i soldi"] }] },
  { id: "b1-vendemmia", level: "B1", titolo: "La vendemmia",
    testo: "Ogni settembre, sulle colline del Chianti, si raccoglie l'uva. Quest'anno Matteo ha deciso di aiutare suo zio, benché non avesse mai lavorato in campagna. Il primo giorno pensava che sarebbe stato facile, ma la sera aveva un gran mal di schiena. «Pensavo che fosse più facile», ha detto ridendo. Alla fine della settimana, però, era fiero di sé: il vino di quell'anno sarebbe stato anche un po' suo.",
    domande: [{ q: "Perché la vendemmia è stata difficile per Matteo?", o: ["Non aveva mai lavorato in campagna", "Pioveva sempre", "Lo zio era severo"] },
              { q: "Come si sentiva alla fine della settimana?", o: ["Fiero di sé", "Arrabbiato", "Annoiato"] }] },
  { id: "b1-torre", level: "B1", titolo: "Il ragazzo della Torre",
    testo: "Davanti alla Torre di Pisa, quasi tutti i turisti fanno la stessa foto: sembra che tengano su la torre con le mani. Leo, un ragazzo del posto, guadagna qualche euro aiutandoli a trovare la posizione giusta. «Si metta qui, alzi il braccio, un po' più a destra... perfetto!» Leo dice che ogni giorno si scattano migliaia di foto così. Il suo sogno, però, è un altro: vorrebbe che un giorno qualcuno fotografasse la torre senza fingere di sostenerla.",
    domande: [{ q: "Che cosa fanno quasi tutti i turisti?", o: ["La stessa foto", "Salgono in cima", "Comprano souvenir"] },
              { q: "Qual è il sogno di Leo?", o: ["Una foto della torre senza finzione", "Diventare fotografo", "Salire sulla torre"] }] },
  { id: "b1-lettera", level: "B1", titolo: "La lettera nel cassetto",
    testo: "Mettendo in ordine la casa della nonna, Elisa ha trovato una lettera che non era mai stata spedita. Era indirizzata a un certo Giorgio ed era del 1962. Nella lettera la nonna scriveva che lo aspettava alla stazione di Siena e che sperava che lui venisse. Elisa non sapeva chi fosse Giorgio. Quando ha mostrato la lettera alla mamma, lei ha sorriso: «Giorgio era il primo amore della nonna. Non è mai arrivato, e poco dopo lei ha conosciuto il nonno.»",
    domande: [{ q: "Che cosa ha trovato Elisa?", o: ["Una lettera mai spedita", "Una foto del nonno", "Un biglietto del treno"] },
              { q: "Chi era Giorgio?", o: ["Il primo amore della nonna", "Il nonno", "Un amico della mamma"] }] },
  { id: "b1-fumetti", level: "B1", titolo: "Il festival dei fumetti",
    testo: "Ogni autunno a Lucca si tiene un grande festival del fumetto, e la città si riempie di ragazzi vestiti come i loro personaggi preferiti. Quest'anno Tommaso voleva che anche suo padre si travestisse. All'inizio il papà non voleva, ma alla fine ha accettato a una condizione: che nessuno gli facesse foto. Naturalmente, il giorno dopo la sua foto è stata pubblicata sul giornale locale.",
    domande: [{ q: "Che cosa voleva Tommaso?", o: ["Che suo padre si travestisse", "Andare al festival da solo", "Comprare un fumetto"] },
              { q: "Che cosa è successo il giorno dopo?", o: ["La foto del papà è uscita sul giornale", "Il papà è rimasto a casa", "Tommaso ha vinto un premio"] }] },
  { id: "b1-coinquilino", level: "B1", titolo: "Cercasi coinquilino",
    testo: "Martina cercava un coinquilino per il suo appartamento a Siena. Nell'annuncio aveva scritto che cercava una persona tranquilla, che non fumasse e che amasse gli animali, perché lei ha un gatto. Si sono presentate dieci persone. L'ultimo, Andrea, le ha detto subito che era allergico ai gatti. «Allora perché sei venuto?» ha chiesto Martina. «Perché la casa è bellissima e il gatto sembra simpatico. Prenderò le medicine!»",
    domande: [{ q: "Che cosa chiedeva l'annuncio?", o: ["Una persona tranquilla che amasse gli animali", "Una persona con un gatto", "Uno studente straniero"] },
              { q: "Che problema ha Andrea?", o: ["È allergico ai gatti", "Fuma", "Non ha soldi"] }] },

  // ── B2: passato remoto, ipotetico, discorso indiretto, il quale, registro ─
  { id: "b2-gatto", level: "B2", titolo: "La leggenda del gatto del Colosseo",
    testo: "Si racconta che, molti anni fa, un custode del Colosseo trovò tra le pietre un gattino abbandonato. Lo portò a casa, ma il giorno dopo il gatto tornò tra le rovine. Il custode, il quale era un uomo paziente, ci provò altre tre volte, invano. Alla fine capì che il gatto aveva scelto la sua casa. Da allora, si dice, al Colosseo non mancano mai i gatti, i quali dormono al sole come antichi imperatori.",
    domande: [{ q: "Che cosa fece il gatto il giorno dopo?", o: ["Tornò al Colosseo", "Rimase a casa del custode", "Scappò lontano"] },
              { q: "Che cosa capì il custode?", o: ["Che il gatto aveva scelto la sua casa", "Che il gatto era malato", "Che il gatto aveva fame"] }] },
  { id: "b2-fontana", level: "B2", titolo: "La moneta nella fontana",
    testo: "Quando Anna venne a Roma per la prima volta, aveva vent'anni. Un amico le disse che, se avesse gettato una moneta nella Fontana di Trevi, sarebbe tornata in città. Lei rise, ma lo fece lo stesso. Trent'anni dopo si chiede ancora che cosa sarebbe successo se quella sera fosse rimasta in albergo: forse non avrebbe mai conosciuto Marco, con il quale vive oggi a Trastevere.",
    domande: [{ q: "Che cosa le disse l'amico?", o: ["Che con una moneta nella fontana sarebbe tornata a Roma", "Che la fontana era chiusa", "Che doveva incontrare Marco"] },
              { q: "Dove vive oggi Anna?", o: ["A Trastevere", "A Milano", "In albergo"] }] },
  { id: "b2-email", level: "B2", titolo: "Un'email troppo informale",
    testo: "Il primo giorno di lavoro, Paolo scrisse al direttore: «Ciao! Domani arrivo un po' tardi, ok?» Il giorno dopo una collega lo prese da parte e gli spiegò che in quell'ufficio si dava del Lei a tutti e che le email al direttore cominciavano con «Gentile Dottor Neri». Paolo arrossì. Se qualcuno glielo avesse detto prima, avrebbe evitato una figuraccia. Da allora rilegge ogni email due volte prima di inviarla.",
    domande: [{ q: "Che errore fece Paolo?", o: ["Scrisse al direttore in modo troppo informale", "Arrivò tardi senza avvisare", "Sbagliò il nome del direttore"] },
              { q: "Che cosa gli spiegò la collega?", o: ["Che in ufficio si dava del Lei", "Che doveva arrivare presto", "Che il direttore era arrabbiato"] }] },
  { id: "b2-diario", level: "B2", titolo: "Il diario dello zio",
    testo: "Nel diario dello zio Franco, Lucia lesse una storia che nessuno in famiglia conosceva. Nel 1975 lo zio partì per l'Argentina con un amico, il quale però si ammalò durante il viaggio e tornò in Italia. Franco rimase a Buenos Aires da solo per due anni. Nel diario scriveva di non essere mai stato così libero e così solo. Lucia chiamò sua madre e le chiese se lo sapesse. La madre rispose che lo zio non ne aveva mai parlato.",
    domande: [{ q: "Perché l'amico tornò in Italia?", o: ["Si ammalò durante il viaggio", "Non trovò lavoro", "Litigò con Franco"] },
              { q: "Che cosa rispose la madre di Lucia?", o: ["Che lo zio non ne aveva mai parlato", "Che conosceva già la storia", "Che il diario non era dello zio"] }] },
  { id: "b2-carbonara", level: "B2", titolo: "Il segreto della carbonara",
    testo: "A Roma ogni famiglia giura di conoscere la vera carbonara. Mia nonna diceva che la panna era un sacrilegio. Un giorno un cuoco famoso le chiese quale fosse il suo segreto. Lei rispose che il segreto non stava negli ingredienti, ma nel momento in cui si aggiungono le uova: un attimo prima restano crude, un attimo dopo diventano una frittata. Il cuoco prese appunti, ma ammise che non ce l'avrebbe mai fatta come lei.",
    domande: [{ q: "Che cosa pensava la nonna della panna?", o: ["Che fosse un sacrilegio", "Che fosse il segreto", "Che fosse indispensabile"] },
              { q: "Secondo la nonna, qual è il segreto?", o: ["Il momento in cui si aggiungono le uova", "Il formaggio giusto", "La pasta fresca"] }] },
  { id: "b2-villa", level: "B2", titolo: "La villa dell'imperatore",
    testo: "L'imperatore Adriano fece costruire a Tivoli una villa immensa, nella quale volle ricreare i luoghi che aveva visto viaggiando per l'impero. Negli ultimi anni vi trascorse lunghi periodi, lontano dal rumore di Roma. Si dice che disegnasse lui stesso alcuni edifici, benché gli architetti di corte non fossero sempre d'accordo. Se oggi visitate la villa, capirete perché l'imperatore preferisse quel silenzio alla capitale.",
    domande: [{ q: "Che cosa volle ricreare Adriano?", o: ["I luoghi visti nei suoi viaggi", "Il palazzo di Roma", "Un tempio greco"] },
              { q: "Chi non era sempre d'accordo con lui?", o: ["Gli architetti di corte", "I senatori", "I suoi figli"] }] },
];

export const storieOf = (level: Cefr) => STORIE.filter((s) => s.level === level);
