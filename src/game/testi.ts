/**
 * New Italian for the visitors, ships as generated (decision of 25 Oct 2026).
 * Every line has a report button in the game (Segnala).
 *
 * Proverbs: the Folletto della nebbia, on foggy days. `o[0]` is the missing word.
 * Tips: the Sibilla, at the new moon: how Italians actually say it.
 */
export interface Proverbio {
  id: string;
  /** the proverb with ___ where the missing word goes */
  testo: string;
  o: string[];
  /** what it means, in simple Italian (A2) */
  significa: string;
  en: string;
  /** when Italians say it */
  quando: string;
}

export const PROVERBI: Proverbio[] = [
  { id: "piano", testo: "Chi va piano va sano e va ___.", o: ["lontano", "veloce", "forte", "presto"],
    significa: "Chi non ha fretta arriva più lontano.", en: "Slow and steady goes far.", quando: "Lo dici a chi corre troppo." },
  { id: "tardi", testo: "Meglio tardi che ___.", o: ["mai", "sempre", "oggi", "domani"],
    significa: "È meglio fare una cosa tardi che non farla.", en: "Better late than never.", quando: "Quando qualcuno arriva in ritardo, ma arriva." },
  { id: "abito", testo: "L'abito non fa il ___.", o: ["monaco", "sarto", "re", "prete"],
    significa: "Non giudicare una persona dai vestiti.", en: "The habit does not make the monk.", quando: "Quando l'aspetto inganna." },
  { id: "dorme", testo: "Chi dorme non piglia ___.", o: ["pesci", "gatti", "treni", "sogni"],
    significa: "Se non fai niente, non ottieni niente.", en: "The early bird catches the worm.", quando: "Per svegliare un amico pigro." },
  { id: "mare", testo: "Tra il dire e il fare c'è di mezzo il ___.", o: ["mare", "monte", "fiume", "lago"],
    significa: "Dire una cosa è facile, farla è difficile.", en: "Easier said than done.", quando: "Davanti a una promessa grande." },
  { id: "paese", testo: "Paese che vai, usanza che ___.", o: ["trovi", "lasci", "porti", "perdi"],
    significa: "Ogni posto ha le sue abitudini.", en: "When in Rome, do as the Romans do.", quando: "Quando un'abitudine di un posto ti sorprende." },
  { id: "amico", testo: "Chi trova un amico trova un ___.", o: ["tesoro", "lavoro", "cane", "gatto"],
    significa: "Un vero amico vale moltissimo.", en: "A friend is a treasure.", quando: "Per dire grazie a un amico." },
  { id: "mattino", testo: "Il mattino ha l'oro in ___.", o: ["bocca", "mano", "tasca", "testa"],
    significa: "La mattina è il momento migliore per lavorare.", en: "The morning has gold in its mouth.", quando: "Quando ti alzi presto e fai molte cose." },
  { id: "cerca", testo: "Chi cerca ___.", o: ["trova", "perde", "dorme", "mangia"],
    significa: "Se cerchi con pazienza, alla fine trovi.", en: "Seek and you shall find.", quando: "Quando finalmente trovi una cosa." },
  { id: "volere", testo: "Volere è ___.", o: ["potere", "dovere", "sapere", "avere"],
    significa: "Se vuoi davvero una cosa, ce la fai.", en: "Where there's a will, there's a way.", quando: "Per dare coraggio." },
  { id: "rosa", testo: "Non c'è rosa senza ___.", o: ["spine", "foglie", "acqua", "profumo"],
    significa: "Ogni cosa bella ha anche un lato difficile.", en: "No rose without thorns.", quando: "Quando una bella cosa porta anche un problema." },
  { id: "roma", testo: "Roma non fu fatta in un ___.", o: ["giorno", "anno", "mese", "minuto"],
    significa: "Le cose grandi hanno bisogno di tempo.", en: "Rome wasn't built in a day.", quando: "Quando impari una lingua, per esempio." },
  { id: "fidarsi", testo: "Fidarsi è bene, non fidarsi è ___.", o: ["meglio", "peggio", "male", "bello"],
    significa: "È meglio controllare.", en: "Trust is good, checking is better.", quando: "Prima di prestare soldi." },
  { id: "cavallo", testo: "A caval donato non si guarda in ___.", o: ["bocca", "testa", "coda", "zampa"],
    significa: "Un regalo si accetta senza criticarlo.", en: "Don't look a gift horse in the mouth.", quando: "Quando un regalo non è perfetto." },
  { id: "medaglia", testo: "Ogni medaglia ha il suo ___.", o: ["rovescio", "colore", "valore", "prezzo"],
    significa: "Ogni situazione ha un lato buono e uno cattivo.", en: "Every coin has two sides.", quando: "Quando parli di vantaggi e svantaggi." },
  { id: "nuocere", testo: "Non tutto il male vien per ___.", o: ["nuocere", "piacere", "ridere", "piangere"],
    significa: "Anche da una cosa brutta può venire qualcosa di buono.", en: "Every cloud has a silver lining.", quando: "Dopo una sfortuna che poi aiuta." },
];

export interface Consiglio {
  id: string;
  /** the expression */
  it: string;
  en: string;
  esempio: string;
  nota: string;
}

export const CONSIGLI: Consiglio[] = [
  { id: "mica-male", it: "Mica male!", en: "Not bad at all!", esempio: "— Ho preso 28 all'esame. — Mica male!",
    nota: "Sounds more natural than «non è male» when something is good." },
  { id: "magari", it: "Magari!", en: "I wish! / If only!", esempio: "— Vai in vacanza ad agosto? — Magari!",
    nota: "On its own it means you would love to, but it probably won't happen." },
  { id: "dai", it: "Dai!", en: "Come on!", esempio: "Dai, vieni anche tu!",
    nota: "To encourage, or to protest: «Dai, non è vero!»." },
  { id: "boh", it: "Boh.", en: "No idea.", esempio: "— A che ora parte il treno? — Boh.",
    nota: "Informal, with a shrug. With people you don't know, say «Non lo so»." },
  { id: "figurati", it: "Figurati!", en: "Don't mention it!", esempio: "— Grazie dell'aiuto! — Figurati!",
    nota: "Warmer than «prego» between friends. Formal: «Si figuri»." },
  { id: "meno-male", it: "Meno male!", en: "Thank goodness!", esempio: "Il treno è in ritardo? Meno male, sono in ritardo anch'io!",
    nota: "Relief when something goes better than feared." },
  { id: "allora", it: "Allora…", en: "So… / Well then…", esempio: "Allora, cosa facciamo stasera?",
    nota: "Italians start many sentences with it, to take the floor or think." },
  { id: "ecco", it: "Ecco!", en: "Here it is! / There you go!", esempio: "Ecco il tuo caffè. Ecco, hai capito!",
    nota: "With pronouns it joins them: «eccolo», «eccomi»." },
  { id: "insomma", it: "Insomma…", en: "So-so / In short", esempio: "— Com'è andata? — Insomma…",
    nota: "Said alone, with a flat voice, it means «not great»." },
  { id: "crepi", it: "In bocca al lupo! — Crepi!", en: "Good luck! — Thanks!", esempio: "— Domani ho l'esame. — In bocca al lupo! — Crepi!",
    nota: "The answer is «crepi» (may the wolf die), never «grazie»." },
  { id: "che-ne-dici", it: "Che ne dici?", en: "What do you think?", esempio: "Andiamo al mare sabato, che ne dici?",
    nota: "A friendly way to propose something. Formal: «Che ne dice?»." },
  { id: "ci-sta", it: "Ci sta.", en: "Fair enough. / Makes sense.", esempio: "— Sono stanco, resto a casa. — Ci sta.",
    nota: "Very common among young people: it means «it's understandable»." },
];
