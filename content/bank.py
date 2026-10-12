"""Question bank: 272 items over 78 nodes.

Per node: 3 items at A1/A2, 4 at B1, 6 at B2 — more where the evidence is
thinnest. Four options everywhere, so guess = 0.25 in the engine.
The correct answer is first in each list; the app shuffles at display time and
rolls a fair die among a node's items, so retakes differ.
"""


BANK_A1 = {
"phon.spelling": [
    ("Il plurale di «amico» è ___.", ["amici", "amichi", "amicci", "amicii"]),
    ("Il plurale di «banca» è ___.", ["banche", "banci", "bance", "banchi"]),
    ("Il plurale di «medico» è ___.", ["medici", "medichi", "medicci", "mediki"]),
],
"phon.geminate": [
    ("Con questo sole mi metto il ___.", ["cappello", "capello", "capelo", "cappelo"]),
    ("Mia ___ ha novant'anni.", ["nonna", "nona", "nonne", "nonnia"]),
    ("Ho scritto la lettera con la ___.", ["penna", "pena", "penne", "pene"]),
],
"phon.stress": [
    ("Ieri Marco ___ con il direttore per un'ora.", ["parlò", "parlo", "parlano", "parli"]),
    ("Loro ___ a Milano da molti anni.", ["abitano", "abitàno", "abitanno", "abbitano"]),
    ("Non ho ___ finito il lavoro.", ["ancora", "àncora", "ancorà", "ancorra"]),
],
"noun.gender": [
    ("___ problema è più serio di quanto pensassi.", ["Il", "La", "Lo", "L'"]),
    ("Mi fa male ___ mano destra.", ["la", "il", "lo", "un"]),
    ("___ programma inizia alle otto.", ["Il", "La", "Lo", "L'"]),
],
"noun.number": [
    ("Ho perso tutte e due le ___.", ["chiavi", "chiave", "chiaves", "chiavie"]),
    ("Le ___ sono già chiuse.", ["porte", "porti", "porta", "portes"]),
    ("In aula ci sono tre ___.", ["studenti", "studente", "studentes", "studentti"]),
],
"article.definite": [
    ("___ zaino nero è mio.", ["Lo", "Il", "L'", "La"]),
    ("___ amiche di Anna sono arrivate.", ["Le", "Li", "Gli", "La"]),
    ("___ studenti aspettano in corridoio.", ["Gli", "I", "Li", "Le"]),
],
"article.indefinite": [
    ("Ho ___ amico che abita a Bologna.", ["un", "uno", "un'", "una"]),
    ("Nel corso c'è ___ studentessa francese.", ["una", "un'", "uno", "un"]),
    ("Domani mi compro ___ zaino nuovo.", ["uno", "un", "un'", "una"]),
],
"adj.agreement": [
    ("Le pareti della cucina sono ___.", ["rosse", "rossi", "rossa", "rosso"]),
    ("È una ragazza molto ___.", ["intelligente", "intelligenta", "intelligenti", "intelligento"]),
    ("Marco e Anna sono ___ dal viaggio.", ["stanchi", "stanche", "stanco", "stanca"]),
],
"quantifier.invariable": [
    ("Le tue amiche sono ___ simpatiche.", ["molto", "molte", "molti", "molta"]),
    ("Ho ___ amiche a Roma.", ["molte", "molto", "molti", "molta"]),
    ("È una città ___ cara per noi.", ["troppo", "troppa", "troppe", "troppi"]),
],
"adj.bello.buono": [
    ("Ieri sera ho visto un ___ film.", ["bel", "bello", "buon", "belli"]),
    ("Che ___ zaino che hai!", ["bello", "bel", "bella", "buon"]),
    ("___ giorno, signora!", ["Buon", "Buono", "Bello", "Bel"]),
],
"verb.essere.present": [
    ("Noi ___ italiani.", ["siamo", "siete", "sono", "sei"]),
    ("Voi ___ sempre in ritardo.", ["siete", "siamo", "sono", "è"]),
    ("Lei ___ la mia insegnante di storia.", ["è", "e", "sei", "sono"]),
],
"verb.avere.present": [
    ("Loro ___ sempre fame.", ["hanno", "anno", "hano", "ànno"]),
    ("Io ___ vent'anni.", ["ho", "o", "hò", "ha"]),
    ("Tu ___ ragione, scusa.", ["hai", "ai", "ha", "hà"]),
],
"pron.subject": [
    ("— Chi ha cucinato? — ___.", ["Io", "Me", "Mi", "A me"]),
    ("___ lavoro il sabato, lui no.", ["Io", "Me", "Mi", "Mio"]),
    ("Anche ___ vengo con voi.", ["io", "me", "mi", "a me"]),
],
"pron.stressed": [
    ("Questo regalo è per ___.", ["te", "ti", "tu", "tuo"]),
    ("Vieni al cinema con ___?", ["me", "mi", "io", "mio"]),
    ("___ piace il mare, a lui no.", ["A me", "Mi", "Io", "Me"]),
],
"verb.present.regular": [
    ("Voi ___ troppo poco.", ["dormite", "dormete", "dormate", "dormiete"]),
    ("Loro ___ il giornale ogni mattina.", ["leggono", "leggano", "legono", "leggeno"]),
    ("Io ___ italiano e inglese.", ["parlo", "parlò", "parle", "parli"]),
],
"verb.present.isc": [
    ("Non ___ quello che dici.", ["capisco", "capo", "capio", "capesco"]),
    ("A che ora ___ di lavorare?", ["finisci", "fini", "finischi", "finesci"]),
    ("Loro ___ il tè al caffè.", ["preferiscono", "preferono", "preferisciono", "preferescono"]),
],
"verb.present.irregular": [
    ("Domani ___ al mare con Anna.", ["vado", "ando", "vao", "vaddo"]),
    ("Loro ___ i compiti insieme.", ["fanno", "facciono", "fano", "faciono"]),
    ("Noi ___ di casa alle otto.", ["usciamo", "esciamo", "uscimo", "usciame"]),
],
"verb.modal": [
    ("Non ___ venire, devo lavorare.", ["posso", "posso di", "posso a", "posso per"]),
    ("___ aiutarmi un attimo?", ["Puoi", "Poi", "Pota", "Puote"]),
    ("Loro ___ partire subito.", ["devono", "dovono", "deveno", "devino"]),
],
"negation.non": [
    ("A quest'ora non c'è ___ in ufficio.", ["nessuno", "qualcuno", "ognuno", "chiunque"]),
    ("Ieri sera non ho visto ___.", ["niente", "qualcosa", "tutto", "ogni"]),
    ("Non mangio ___ carne né pesce.", ["né", "non", "o", "e"]),
],
"interrogative": [
    ("___ costa questa borsa?", ["Quanto", "Come", "Quale", "Chi"]),
    ("___ è il tuo numero di telefono?", ["Qual", "Qual'", "Quali", "Chi"]),
    ("___ libro mi consigli?", ["Che", "Chi", "Come", "Quanto"]),
],
"prep.simple": [
    ("Da tre anni abito ___ Italia.", ["in", "a", "nel", "da"]),
    ("Domani vado ___ Roma per lavoro.", ["a", "in", "nel", "su"]),
    ("Vengo ___ Milano, ma vivo qui.", ["da", "di", "a", "in"]),
],
"prep.articulated": [
    ("Ho lasciato le chiavi ___ tavolo.", ["sul", "su il", "sullo", "nel"]),
    ("Torno ___ Stati Uniti a maggio.", ["dagli", "dai", "degli", "dalli"]),
    ("Ti parlo ___ mia amica Anna.", ["della", "di la", "dalla", "delle"]),
],
"esserci": [
    ("In piazza ___ molte persone.", ["ci sono", "c'è", "ci ha", "è"]),
    ("___ un problema con il treno.", ["C'è", "Ci sono", "Ci ha", "È"]),
    ("Ieri alla festa ___ molta gente.", ["c'era", "c'erano", "ci era", "erano"]),
],
"demonstrative": [
    ("___ zaino lì in fondo è tuo?", ["Quello", "Quel", "Quella", "Quegli"]),
    ("___ ragazzi laggiù sono simpatici.", ["Quei", "Quelli", "Quegli", "Quel"]),
    ("Non voglio questo, preferisco ___.", ["quello", "quel", "quegli", "quei"]),
],
"possessive": [
    ("___ sorella abita a Milano da anni.", ["Mia", "La mia", "Il mio", "Mio"]),
    ("___ genitori sono in vacanza.", ["I miei", "Miei", "Il mio", "I mio"]),
    ("___ casa è in centro.", ["La loro", "Loro", "Le loro", "Il loro"]),
],
"pron.reflexive": [
    ("La mattina io ___ alzo alle sette.", ["mi", "me", "si", "ti"]),
    ("Loro ___ vedono ogni settimana.", ["si", "ci", "se", "gli"]),
    ("Voi ___ divertite in vacanza?", ["vi", "ci", "si", "ve"]),
],
"verb.reflexive": [
    ("La domenica loro ___ tardi.", ["si svegliano", "svegliano", "ci svegliano", "si sveglia"]),
    ("Come ___? — Marco.", ["ti chiami", "chiami", "si chiama", "ti chiama"]),
    ("Noi ___ sempre alle sei.", ["ci alziamo", "si alziamo", "alziamo", "ci alziano"]),
],
"piacere.formula": [
    ("A me ___ molto i film italiani.", ["piacciono", "piace", "piaccio", "piacere"]),
    ("Mi ___ molto questa città.", ["piace", "piacciono", "piaccio", "piaci"]),
    ("Ti ___ leggere la sera?", ["piace", "piacciono", "piaci", "piacere"]),
],
}

BANK_A2 = {
"noun.irregular": [
    ("Dopo la palestra mi fanno male le ___.", ["braccia", "bracci", "braccie", "braccii"]),
    ("In sala ci sono molti ___.", ["uomini", "uomi", "uomeni", "uominii"]),
    ("Per la torta servono sei ___.", ["uova", "uovi", "uove", "uovas"]),
],
"adj.position": [
    ("Ci conosciamo da vent'anni: è ___.", ["un vecchio amico", "un amico vecchio", "un amico di vecchio", "un vecchio di amico"]),
    ("Ha novant'anni: è ___.", ["un uomo vecchio", "un vecchio uomo", "un uomo di vecchio", "un vecchio di uomo"]),
    ("Gandhi è stato ___ della storia.", ["un grande uomo", "un uomo grande", "un uomo di grande", "un grande di uomo"]),
],
"pron.direct": [
    ("— Conosci Maria? — Sì, ___ conosco bene.", ["la", "le", "gli", "lo"]),
    ("— Compri i libri? — Sì, ___ compro.", ["li", "le", "gli", "lo"]),
    ("— Hai visto le ragazze? — Sì, ___ ho viste.", ["le", "li", "gli", "la"]),
],
"pron.indirect": [
    ("Ho incontrato Marco e ___ ho detto tutto.", ["gli", "lo", "ci", "la"]),
    ("Ho scritto a Maria e ___ ho chiesto aiuto.", ["le", "la", "gli", "ci"]),
    ("Ai miei genitori ___ telefono ogni domenica.", ["gli", "li", "le", "lo"]),
],
"pron.ne": [
    ("— Quante mele vuoi? — ___ voglio tre.", ["Ne", "Le", "Ci", "Li"]),
    ("— Hai fratelli? — Sì, ___ ho due.", ["ne", "li", "ci", "gli"]),
    ("Del film, che cosa ___ pensi?", ["ne", "ci", "lo", "li"]),
],
"pron.ci": [
    ("— Sei stato a Napoli? — Sì, ___ sono stato due volte.", ["ci", "ne", "lo", "vi ci"]),
    ("— Credi ai fantasmi? — No, non ___ credo.", ["ci", "ne", "li", "gli"]),
    ("Per arrivare in centro ___ vuole un'ora.", ["ci", "ne", "si", "lo"]),
],
"partitive": [
    ("Puoi comprare ___ pane, per favore?", ["del", "di", "dei", "delle"]),
    ("Ieri ho visto ___ amici al bar.", ["degli", "dei", "delle", "di"]),
    ("Vorrei ___ acqua naturale.", ["dell'", "della", "del", "di"]),
],
"verb.participio.regular": [
    ("Ho ___ a ogni sua parola.", ["creduto", "credato", "credito", "credeto"]),
    ("Abbiamo ___ tutta la notte.", ["dormito", "dormuto", "dormato", "dormiuto"]),
    ("Ha ___ con il capo stamattina.", ["parlato", "parluto", "parlito", "parlanto"]),
],
"verb.participio.irregular": [
    ("Ti ho ___ una mail ieri.", ["scritto", "scrivuto", "scrivato", "scriveto"]),
    ("Ho ___ la finestra perché fa freddo.", ["chiuso", "chiudato", "chiuduto", "chiudito"]),
    ("Abbiamo ___ una decisione difficile.", ["preso", "prenduto", "prendato", "prenso"]),
],
"pp.avere": [
    ("Ieri sera ___ una pizza enorme.", ["ho mangiato", "sono mangiato", "ho mangiata", "sono mangiata"]),
    ("___ il film insieme sabato.", ["Abbiamo visto", "Siamo visti", "Abbiamo veduti", "Siamo visto"]),
    ("___ tutto il giorno senza pausa.", ["Hanno lavorato", "Sono lavorati", "Hanno lavorati", "Anno lavorato"]),
],
"adverb.position": [
    ("Non ___ a Roma in vita mia.", ["sono mai stato", "mai sono stato", "sono stato mai", "ho mai stato"]),
    ("___ che fosse una buona idea.", ["Ho sempre pensato", "Sempre ho pensato", "Ho pensato sempre", "Sempre pensato ho"]),
    ("Marco ___ , è ancora in corridoio.", ["è appena arrivato", "appena è arrivato", "è arrivato appena", "appena arrivato è"]),
],
"aux.selection": [
    ("Ieri Marco ___ prestissimo.", ["è partito", "ha partito", "era partito", "è partita"]),
    ("___ tutto il giorno in ufficio.", ["Ho lavorato", "Sono lavorato", "Sono lavorata", "Ho lavorata"]),
    ("La lezione ___ alle tre in punto.", ["è cominciata", "ha cominciato", "è cominciato", "ha cominciata"]),
],
"pp.essere": [
    ("Maria ___ a casa mezz'ora fa.", ["è andata", "è andato", "ha andato", "è andate"]),
    ("Le ragazze ___ molto tardi.", ["sono arrivate", "sono arrivati", "hanno arrivato", "è arrivata"]),
    ("Anna si ___ prestissimo stamattina.", ["è alzata", "ha alzata", "è alzato", "ha alzato"]),
],
"imperfetto.forms": [
    ("Da bambino ___ a calcio ogni giorno.", ["giocavo", "giocai", "giocherei", "giocassi"]),
    ("___ le tre quando è uscito.", ["Erano", "Eravano", "Furono", "Sarebbero"]),
    ("Da piccoli ___ in campagna.", ["abitavamo", "abitammo", "abitavano", "abiteremmo"]),
],
"imperfetto.aspect": [
    ("Mentre ___, è suonato il telefono.", ["leggevo", "ho letto", "avevo letto", "leggerò"]),
    ("Ieri ___ al cinema con Luca.", ["sono andato", "andavo", "ero andato", "andrò"]),
    ("___ le otto quando è arrivata.", ["Erano", "Sono state", "Furono", "Saranno"]),
],
"futuro.semplice": [
    ("L'anno prossimo ___ a vivere a Roma.", ["andrò", "anderò", "vadrò", "andarò"]),
    ("___ tempo domani pomeriggio?", ["Avrai", "Averai", "Avrà", "Avresti"]),
    ("Che ore sono? ___ le tre, credo.", ["Saranno", "Sono state", "Erano", "Siano"]),
],
"condizionale.presente": [
    ("___ un caffè, per favore.", ["Vorrei", "Voglierei", "Volerei", "Vorrebbe"]),
    ("___ aiutarmi, per cortesia?", ["Potrebbe", "Poterebbe", "Potessi", "Poteva"]),
    ("___ riposarti un po', sei stanco.", ["Dovresti", "Doveresti", "Devresti", "Dovrei"]),
],
"imperativo.informal": [
    ("Marco, non ___ via adesso!", ["andare", "vai", "vada", "andando"]),
    ("___ la verità, per favore!", ["Di'", "Dice", "Dica", "Dici"]),
    ("Ragazzi, ___ attenzione!", ["fate", "fai", "faccia", "facciate"]),
],
"subordination.che": [
    ("Penso ___ tu abbia ragione.", ["che", "di", "come", "se"]),
    ("Penso ___ avere ragione io.", ["di", "che", "a", "per"]),
    ("Spero ___ vederti presto.", ["di", "che", "a", "per"]),
],
"ipotetico.1": [
    ("Se ___ tempo, verrò senz'altro.", ["avrò", "avessi", "avrei", "abbia"]),
    ("Se ___, resto a casa.", ["piove", "piovesse", "pioverebbe", "piova"]),
    ("Se non ti sbrighi, ___ il treno.", ["perderemo", "perderemmo", "perdessimo", "avremmo perso"]),
],
"gerundio": [
    ("___ a casa, ho incontrato Luca.", ["Tornando", "Tornato", "Tornare", "Tornante"]),
    ("Si impara ___.", ["sbagliando", "sbagliato", "sbagliare", "sbagliante"]),
    ("Prima di ___, chiamami.", ["partire", "partendo", "partito", "parti"]),
],
"verb.progressive": [
    ("Non posso parlare, ___.", ["sto mangiando", "sono mangiando", "sto mangiare", "sto mangiato"]),
    ("Che cosa ___ in questo momento?", ["stai facendo", "sei facendo", "stai fare", "stai fatto"]),
    ("___ quando sei arrivato.", ["Stavo dormendo", "Ero dormendo", "Stavo dormire", "Stavo dormito"]),
],
"comparativo": [
    ("È più simpatico ___ intelligente.", ["che", "di", "come", "quanto"]),
    ("Marco è più alto ___ Luca.", ["di", "che", "come", "quanto"]),
    ("Oggi sto ___ di ieri.", ["meglio", "migliore", "più bene", "buono"]),
],
"superlativo": [
    ("È il ragazzo più alto ___ classe.", ["della", "di", "nella", "in"]),
    ("Questo film è ___!", ["bellissimo", "molto bellissimo", "il più bellissimo", "beltissimo"]),
    ("È ___ film che abbia mai visto.", ["il più bel", "più bello", "il più bello di", "il bello più"]),
],
"avverbi.mente": [
    ("Parla sempre molto ___.", ["lentamente", "lentemente", "lentomente", "lentente"]),
    ("Viene in palestra ___.", ["regolarmente", "regolaremente", "regolamente", "regolarmentemente"]),
    ("Mi ha risposto ___.", ["gentilmente", "gentilemente", "gentilamente", "gentilmenti"]),
],
"verb.piacere": [
    ("A Marco i film horror ___ per niente.", ["non piacciono", "non piace", "non lo piacciono", "non gli piace"]),
    ("Mi ___ moltissimo la festa di ieri.", ["è piaciuta", "ha piaciuto", "è piaciuto", "sono piaciuta"]),
    ("___ tanto quando sei via, lo sai?", ["Mi manchi", "Ti manco", "Mi manca", "Ti manchi"]),
],
}


BANK_B1 = {
"pron.combined": [
    ("— E il libro? — ___ dato ieri a Marco.", ["Gliel'ho", "Gli ho", "Lo gli ho", "Glielo ho"]),
    ("Il tuo libro: me ___ presti?", ["lo", "la", "li", "gli"]),
    ("Se ti serve la penna, ___ do subito.", ["te la", "ti la", "te lo", "ti lo"]),
    ("I documenti? ___ ho già mandati.", ["Glieli", "Gli li", "Li gli", "Gliele"]),
],
"clitic.placement": [
    ("«Devo farlo subito» si può dire anche: ___ subito.", ["lo devo fare", "devo lo fare", "devo farelo", "lo fare devo"]),
    ("___ la verità, ti prego!", ["Dimmi", "Dime", "Mi di'", "Dicimi"]),
    ("Sto ___ da dieci minuti.", ["guardandolo", "lo guardando", "guardando lo", "guardandogli"]),
    ("Signora, ___ pure.", ["si accomodi", "accomodisi", "accomodasi", "si accomoda"]),
],
"pp.agreement.clitic": [
    ("— E le chiavi? — Le ho ___.", ["perse", "perso", "persi", "persa"]),
    ("— Hai visto Maria? — Sì, l'ho ___ ieri.", ["vista", "visto", "viste", "visti"]),
    ("I libri? Li ho ___ sul tavolo.", ["messi", "messo", "messe", "messa"]),
    ("Di mele ne ho ___ tre.", ["mangiate", "mangiato", "mangiati", "mangiata"]),
],
"trapassato": [
    ("Quando sono arrivato, lui ___ già.", ["era già uscito", "è già uscito", "usciva già", "sarebbe già uscito"]),
    ("Te l'___ di aspettarmi qui.", ["avevo detto", "ho detto", "dicevo", "avrei detto"]),
    ("Il film ___ quando siamo entrati.", ["era già cominciato", "è già cominciato", "cominciava già", "aveva già cominciato"]),
    ("Mi ha detto che ___ tutto.", ["aveva capito", "ha capito", "capiva", "avrebbe capito"]),
],
"futuro.anteriore": [
    ("Non risponde: ___ già.", ["sarà uscito", "è uscito", "era uscito", "uscirà"]),
    ("Fra un anno ___ in medicina.", ["si sarà laureata", "si laureerà", "si è laureata", "si laureava"]),
    ("Quando ___ tutto, saremo esausti.", ["avremo finito", "finiremo", "abbiamo finito", "finissimo"]),
    ("L'___ dimenticato, immagino.", ["avrà", "ha", "aveva", "avrebbe"]),
],
"condizionale.passato": [
    ("Mi ha detto che ___ il giorno dopo.", ["sarebbe venuto", "verrebbe", "sarà venuto", "verrà"]),
    ("___ volentieri, ma stavo male.", ["Sarei venuto", "Verrei", "Sarò venuto", "Venissi"]),
    ("Sapevo già che ___ la gara.", ["avrebbe vinto", "vincerebbe", "avrà vinto", "vincesse"]),
    ("___ aiutarti, ma non ero in città.", ["Avrei potuto", "Potrei", "Avrò potuto", "Potessi"]),
],
"imperativo.formal": [
    ("Signora, ___ il ritardo!", ["scusi", "scusa", "scusate", "scusasse"]),
    ("___ pure, dottore, si sieda.", ["Entri", "Entra", "Entrate", "Entrasse"]),
    ("Non ___, signore, ci penso io.", ["si preoccupi", "ti preoccupare", "si preoccupa", "preoccupisi"]),
    ("___ tutto, la ascolto.", ["Mi dica", "Dicami", "Dimmi", "Mi dice"]),
],
"congiuntivo.presente.forms": [
    ("Penso che lui ___ molto stanco.", ["sia", "è", "sarebbe", "fosse"]),
    ("Credo che loro ___ ragione.", ["abbiano", "hanno", "avrebbero", "avessero"]),
    ("Spero che tu ___ presto.", ["venga", "vieni", "verresti", "venissi"]),
    ("È possibile che lui ___ tardi.", ["faccia", "fa", "farebbe", "facesse"]),
],
"congiuntivo.triggers": [
    ("Sono sicuro che lui ___ ragione.", ["ha", "abbia", "avesse", "avrebbe"]),
    ("Benché ___ tardissimo, usciamo.", ["sia", "è", "sarebbe", "era"]),
    ("So che ___ difficile, ma prova.", ["è", "sia", "fosse", "sarebbe"]),
    ("Voglio che tu ___ subito.", ["parta", "parti", "partirai", "partiresti"]),
],
"congiuntivo.imperfetto": [
    ("Vorrei che tu ___ con noi.", ["venissi", "vieni", "verresti", "venga"]),
    ("Pensavo che ___ molto più facile.", ["fosse", "era", "sarebbe", "sia"]),
    ("Se ___ più tempo libero...", ["avessi", "avrei", "avevo", "abbia"]),
    ("Magari ___ vero!", ["fosse", "è", "sarebbe", "sia"]),
],
"relative.che.cui": [
    ("La persona ___ ti ho parlato arriva domani.", ["di cui", "che", "quale", "cui"]),
    ("Il motivo ___ sono venuto è semplice.", ["per cui", "che", "di cui", "quale"]),
    ("Il libro ___ ho letto è bellissimo.", ["che", "cui", "di cui", "quale"]),
    ("La città ___ vivo è molto piccola.", ["in cui", "che", "di cui", "cui"]),
],
"connettivi": [
    ("___ fosse tardissimo, siamo usciti.", ["Benché", "Perché", "Siccome", "Poiché"]),
    ("___ pioveva, siamo rimasti a casa.", ["Siccome", "Benché", "Nonostante", "Affinché"]),
    ("Te lo spiego ___ tu possa capire.", ["affinché", "siccome", "benché", "poiché"]),
    ("Non è difficile, ___ è facilissimo.", ["anzi", "infatti", "però", "quindi"]),
],
"concordanza.tempi": [
    ("Speravo che tu ___ più attento.", ["fossi", "sia", "sei", "saresti"]),
    ("Penso che ieri ___ molto stanco.", ["sia stato", "fosse", "era", "sarebbe stato"]),
    ("Credevo che ___ il giorno dopo.", ["sarebbe partito", "partirebbe", "partisse", "parta"]),
    ("Dubito che ___ già domani.", ["arrivino", "arriveranno", "arrivassero", "arriverebbero"]),
],
"ipotetico.2": [
    ("Se ___ più tempo, verrei volentieri.", ["avessi", "avrei", "avrò", "abbia"]),
    ("Se fossi in te, non lo ___.", ["farei", "facessi", "farò", "avrei fatto"]),
    ("Cosa ___ se vincessi la lotteria?", ["faresti", "facessi", "farai", "avresti fatto"]),
    ("Se ___ ricca, viaggerei sempre.", ["fossi", "sarei", "sono", "sia"]),
],
"si.impersonale": [
    ("In questo negozio ___ anche case.", ["si vendono", "si vende", "si è venduto", "si vendano"]),
    ("In Italia ___ molto bene.", ["si mangia", "si mangiano", "ci si mangiano", "si sono mangiati"]),
    ("Come ___ «hello» in italiano?", ["si dice", "si dicono", "ci si dice", "si è detto"]),
    ("Quando ___ stanchi, si dorme male.", ["si è", "si sono", "ci si è", "si era"]),
],
"passivo": [
    ("La lettera ___ da Maria ieri sera.", ["è stata scritta", "è scritta stata", "ha scritto", "è stato scritto"]),
    ("Le case ___ nel 1950.", ["sono state costruite", "hanno costruito", "è stata costruita", "sono costruito"]),
    ("Il modulo ___ in stampatello.", ["va compilato", "va compilare", "viene compilare", "è compilare"]),
    ("La porta ___ alle otto ogni sera.", ["viene chiusa", "viene chiuso", "è venuta chiusa", "viene chiudere"]),
],
"infinito.usi": [
    ("Ho cercato ___ aiutarlo in tutti i modi.", ["di", "a", "per", "da"]),
    ("Ho cominciato ___ studiare il russo.", ["a", "di", "per", "da"]),
    ("Finalmente sono riuscito ___ finire.", ["a", "di", "per", "in"]),
    ("Dopo ___ mangiato, siamo usciti.", ["aver", "avendo", "avuto", "essere"]),
],
}

BANK_B2 = {
"passato.remoto": [
    ("Nella frase «Egli giunse a Roma» il verbo è al:", ["passato remoto", "imperfetto", "trapassato", "condizionale"]),
    ("Dante ___ a Firenze nel 1265.", ["nacque", "nascé", "nascì", "naque"]),
    ("«Fu» è il passato remoto di:", ["essere", "avere", "fare", "fuggire"]),
    ("«Vennero» è il passato remoto di:", ["venire", "vendere", "vincere", "vedere"]),
    ("«Disse» viene dal verbo:", ["dire", "discutere", "dare", "decidere"]),
    ("«Presero» viene dal verbo:", ["prendere", "pregare", "premere", "presentare"]),
],
"congiuntivo.trapassato": [
    ("Pensavo che ___ già il giorno prima.", ["fosse partito", "era partito", "sia partito", "sarebbe partito"]),
    ("Non sapevo che ___ la casa.", ["avessero venduto", "avevano venduto", "abbiano venduto", "avrebbero venduto"]),
    ("Se lo ___ prima, sarebbe diverso.", ["avessi saputo", "avrei saputo", "avevo saputo", "sapessi"]),
    ("Credevo che tu ___ già.", ["avessi mangiato", "avevi mangiato", "abbia mangiato", "avresti mangiato"]),
    ("Temeva che ___ troppo tardi.", ["fosse stato", "era stato", "sia stato", "sarebbe stato"]),
    ("Magari l'___ ascoltato, quel consiglio!", ["avessi", "avrei", "avevo", "abbia"]),
],
"discorso.indiretto": [
    ("«Domani parto» → Disse che ___ il giorno dopo.", ["sarebbe partito", "partirebbe", "partirà", "parta"]),
    ("«Ho finito» → Disse che ___.", ["aveva finito", "ha finito", "finiva", "avrebbe finito"]),
    ("«Vieni qui!» → Mi disse ___.", ["di venire", "che venivo", "venire", "che vengo"]),
    ("«Sono stanco» → Disse che ___ stanco.", ["era", "è", "fosse", "sarebbe"]),
    ("«Ti chiamerò» → Disse che mi ___.", ["avrebbe chiamato", "chiamerebbe", "chiamerà", "chiami"]),
    ("«Oggi piove» → Disse che ___ pioveva.", ["quel giorno", "oggi", "questo giorno", "il giorno"]),
],
"ipotetico.3": [
    ("Se lo ___ saputo prima, non sarei venuto.", ["avessi", "avrei", "avevo", "sapessi"]),
    ("Se fossimo partiti prima, ___ il traffico.", ["avremmo evitato", "avessimo evitato", "eviteremmo", "avevamo evitato"]),
    ("Se ___ studiato, ora sapresti l'italiano.", ["avessi", "avresti", "avevi", "abbia"]),
    ("___ venuto, se me lo avessi detto.", ["Sarei", "Sarò", "Ero", "Fossi"]),
    ("Se non ___ piovuto, saremmo usciti.", ["fosse", "sarebbe", "era", "avesse"]),
    ("Non ___ se lo avesse saputo prima.", ["sarebbe partito", "fosse partito", "partirebbe", "era partito"]),
],
"relative.ilquale": [
    ("Il libro, ___ copertina è rossa, è mio.", ["la cui", "il cui", "di cui la", "cui la"]),
    ("Non capisco ___ dici.", ["ciò che", "che cosa che", "quale", "cui"]),
    ("La sorella di Marco, ___ abita a Roma, è medica.", ["la quale", "il quale", "cui", "che la"]),
    ("Tutto ___ so l'ho imparato qui.", ["quello che", "che cosa", "il quale", "cui"]),
    ("Lo scrittore, ___ romanzi conosci, è morto.", ["i cui", "il cui", "di cui i", "cui i"]),
    ("___ conta davvero è la salute.", ["Quello che", "Che cosa", "Il quale", "Cui"]),
],
"verbi.pronominali": [
    ("È troppo difficile, non ___ faccio più.", ["ce la", "ci la", "me la", "ce lo"]),
    ("Sono stanco, ___ vado a casa.", ["me ne", "mi ne", "me lo", "ci ne"]),
    ("Per arrivare in centro ___ vuole un'ora.", ["ci", "ne", "si", "ce"]),
    ("Non ___ prendere, non è colpa tua.", ["te la", "ti la", "te ne", "ci la"]),
    ("Non ___ frega proprio niente.", ["me ne", "mi ne", "me la", "ce ne"]),
    ("___! È tardissimo.", ["Smettila", "Smetti la", "Smettela", "Smettilo la"]),
],
"registro": [
    ("Gentile Dottoressa, ___ in allegato il documento.", ["Le invio", "Ti invio", "Vi invio", "Gli invio"]),
    ("___ di rispondere entro venerdì.", ["La prego", "Ti prego", "Vi prego", "Prego"]),
    ("Chiusura formale di una mail di lavoro:", ["Distinti saluti", "Un bacio", "Ciao ciao", "A presto"]),
    ("Richiesta attenuata e formale: «___ dirLe una cosa».", ["Volevo", "Voglio", "Vorrò", "Voleva"]),
    ("«Non è mica facile» significa:", ["non è per niente facile", "è facilissimo", "è abbastanza facile", "forse è facile"]),
    ("Dando del Lei: «___ bisogno di aiuto?»", ["Ha", "Hai", "Avete", "Hanno"]),
],
}


BANK = {}
for _d in (BANK_A1, BANK_A2, BANK_B1, BANK_B2):
    BANK.update(_d)

# Flat form, for code that wants one list: (node, prompt, options, answer_index)
ITEMS = [(n, q, o, 0) for n, items in BANK.items() for q, o in items]
