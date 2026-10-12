/**
 * Italian skill graph (A1–B2).
 *
 * Nodes are atomic teachable claims. An edge A -> B asserts:
 * "B is not usefully teachable until A is reasonably solid."
 *
 * Status of the edges:
 *  - The verb-morphology spine (present -> passato prossimo -> imperfetto ->
 *    futuro -> condizionale -> congiuntivo) reflects reported L2 acquisition
 *    sequences for Italian. Treat as well supported.
 *  - Everything else is a hypothesis encoded from curriculum convention.
 *    Validate each edge against your own attempt log (see validateEdges below).
 */

export type Cefr = "A1" | "A2" | "B1" | "B2";

export interface Skill {
  id: string;
  label: string;
  cefr: Cefr;
  prereqs: string[];
  /** Importance, 0.8-4.0: how much a learner's Italian suffers without it.
   *  Editorial and authored by hand, deliberately NOT structural leverage (how
   *  many nodes sit downstream). Spelling has huge leverage and low importance;
   *  imperfetto-vs-passato-prossimo has almost no leverage and is the hardest
   *  thing at A2. Drives scoring and how eagerly the engine probes a node.
   *  Revise from data: weight should track how often an error here actually
   *  shows up in production. */
  weight: number;
  /** p(mastered) on entering this node's region, before any evidence. */
  prior: number;
  /** Why the edges are what they are, or what learners typically get wrong. */
  note?: string;
}

export const SKILLS: Skill[] = [
  // ── Phonology and orthography ────────────────────────────────────────────
  {
    id: "phon.spelling",
    label: "Suoni e ortografia",
    cefr: "A1",
    weight: 2.0,
    prior: 0.75,
    prereqs: [],
    note: "c/g hard vs soft, ch/gh, gli, gn, sc. Gates article choice (lo/gli).",
  },
  {
    id: "phon.geminate",
    label: "Consonanti doppie",
    cefr: "A1",
    weight: 2.0,
    prior: 0.75,
    prereqs: ["phon.spelling"],
    note: "Phonemic: nono vs nonno, capello vs cappello. Never stops being a spelling error source.",
  },
  {
    id: "phon.stress",
    label: "Accento tonico",
    cefr: "A1",
    weight: 1.2,
    prior: 0.75,
    prereqs: ["phon.spelling"],
    note: "parlo vs parlò, ancora vs àncora. Feeds verb morphology recognition.",
  },

  // ── Nouns, articles, agreement ───────────────────────────────────────────
  {
    id: "noun.gender",
    label: "Genere del nome",
    cefr: "A1",
    weight: 4.0,
    prior: 0.75,
    prereqs: [],
    note: "Root node. Arbitrary for inanimates; the single largest fossilisation source for speakers of genderless L1s.",
  },
  {
    id: "noun.number",
    label: "Numero del nome",
    cefr: "A1",
    weight: 2.0,
    prior: 0.75,
    prereqs: ["noun.gender"],
    note: "-o/-i, -a/-e, -e/-i. Plural pattern depends on gender class, hence the edge.",
  },
  {
    id: "noun.irregular",
    label: "Plurali irregolari",
    cefr: "A2",
    weight: 1.2,
    prior: 0.55,
    prereqs: ["noun.number"],
    note: "uomo/uomini, braccio/braccia, mano (f.), problema (m.).",
  },
  {
    id: "article.definite",
    label: "Articolo determinativo",
    cefr: "A1",
    weight: 4.0,
    prior: 0.75,
    prereqs: ["noun.gender", "noun.number", "phon.spelling"],
    note: "lo/gli selection is phonological, not semantic. Three parents, all genuine.",
  },
  {
    id: "article.indefinite",
    label: "Articolo indeterminativo",
    cefr: "A1",
    weight: 1.2,
    prior: 0.75,
    prereqs: ["noun.gender", "phon.spelling"],
  },
  {
    id: "adj.agreement",
    label: "Accordo dell'aggettivo",
    cefr: "A1",
    weight: 3.5,
    prior: 0.75,
    prereqs: ["noun.gender", "noun.number"],
    note: "4-form and 2-form adjectives. Later required by participle agreement and the passive.",
  },
  {
    id: "adj.position",
    label: "Posizione dell'aggettivo",
    cefr: "A2",
    weight: 1.2,
    prior: 0.55,
    prereqs: ["adj.agreement"],
    note: "Meaning-changing: un vecchio amico vs un amico vecchio.",
  },
  {
    id: "quantifier.invariable",
    label: "Molto, poco, troppo",
    cefr: "A1",
    weight: 1.2,
    prior: 0.75,
    prereqs: ["adj.agreement"],
    note: "Adjective when it modifies a noun (molte ragazze), invariable adverb when it modifies an adjective (molto belle). The second is the trap.",
  },
  {
    id: "adj.bello.buono",
    label: "Bello e buono prenominali",
    cefr: "A1",
    weight: 2.0,
    prior: 0.75,
    prereqs: ["adj.agreement", "article.definite"],
    note: "Before a noun these inflect like the articles: bel film, bello zaino, begli amici, bei libri; buon giorno, buona sera. After the noun they are ordinary adjectives (un film bello). Separate node because the paradigm is the article's, not the adjective's.",
  },

  // ── Core verbs, present tense ────────────────────────────────────────────
  {
    id: "verb.essere.present",
    label: "Essere, presente",
    cefr: "A1",
    weight: 3.0,
    prior: 0.75,
    prereqs: [],
  },
  {
    id: "verb.avere.present",
    label: "Avere, presente",
    cefr: "A1",
    weight: 3.0,
    prior: 0.75,
    prereqs: [],
  },
  {
    id: "pron.subject",
    label: "Pronomi soggetto",
    cefr: "A1",
    weight: 1.2,
    prior: 0.75,
    prereqs: [],
    note: "And when to drop them. Overuse of io/tu is the standard English-speaker tell.",
  },
  {
    id: "pron.stressed",
    label: "Pronomi tonici",
    cefr: "A1",
    weight: 2.0,
    prior: 0.75,
    prereqs: ["pron.subject", "prep.simple"],
    note: "me, te, lui, lei, noi, voi, loro. Used after prepositions (con me, per te), for contrast (a me piace, a lui no), and in comparisons (piu alto di me). Cannot be folded into pron.direct: clitics never follow a preposition.",
  },
  {
    id: "verb.present.regular",
    label: "Presente indicativo regolare",
    cefr: "A1",
    weight: 4.0,
    prior: 0.75,
    prereqs: ["verb.essere.present", "phon.stress"],
    note: "-are / -ere / -ire. Spine root for all later morphology.",
  },
  {
    id: "verb.present.isc",
    label: "Presente in -isc-",
    cefr: "A1",
    weight: 2.0,
    prior: 0.75,
    prereqs: ["verb.present.regular"],
    note: "finire, capire, preferire. Unpredictable membership; lexical, not rule-based.",
  },
  {
    id: "verb.present.irregular",
    label: "Presente irregolare",
    cefr: "A1",
    weight: 3.5,
    prior: 0.75,
    prereqs: ["verb.present.regular"],
    note: "andare, fare, stare, dare, venire, uscire, dire, sapere.",
  },
  {
    id: "verb.modal",
    label: "Potere, volere, dovere",
    cefr: "A1",
    weight: 2.0,
    prior: 0.75,
    prereqs: ["verb.present.irregular"],
    note: "Modal + infinitive. Later interacts with auxiliary selection and clitic placement.",
  },
  {
    id: "negation.non",
    label: "Negazione",
    cefr: "A1",
    weight: 3.0,
    prior: 0.75,
    prereqs: ["verb.present.regular"],
    note: "Including double negation: non ho visto nessuno.",
  },
  {
    id: "interrogative",
    label: "Interrogativi",
    cefr: "A1",
    weight: 2.0,
    prior: 0.75,
    prereqs: ["verb.present.regular"],
    note: "chi, che cosa, dove, quando, come, perché, quanto. No do-support, no inversion required.",
  },

  // ── Prepositions and locatives ───────────────────────────────────────────
  {
    id: "prep.simple",
    label: "Preposizioni semplici",
    cefr: "A1",
    weight: 4.0,
    prior: 0.75,
    prereqs: [],
    note: "di a da in con su per tra fra. Largely lexical; the biggest silent error source at every level.",
  },
  {
    id: "prep.articulated",
    label: "Preposizioni articolate",
    cefr: "A1",
    weight: 3.0,
    prior: 0.75,
    prereqs: ["prep.simple", "article.definite"],
    note: "Pure convergence: mechanical fusion of two parents.",
  },
  {
    id: "partitive",
    label: "Partitivo",
    cefr: "A2",
    weight: 2.0,
    prior: 0.55,
    prereqs: ["prep.articulated"],
    note: "del pane, degli amici. Prerequisite for pronominal ne.",
  },
  {
    id: "esserci",
    label: "C'è, ci sono",
    cefr: "A1",
    weight: 2.0,
    prior: 0.75,
    prereqs: ["verb.essere.present", "noun.number"],
  },
  {
    id: "demonstrative",
    label: "Questo, quello",
    cefr: "A1",
    weight: 2.0,
    prior: 0.75,
    prereqs: ["adj.agreement", "article.definite"],
    note: "quello inflects like the definite article: quel, quello, quei, quegli.",
  },
  {
    id: "possessive",
    label: "Possessivi",
    cefr: "A1",
    weight: 2.0,
    prior: 0.75,
    prereqs: ["article.definite", "adj.agreement"],
    note: "Agrees with the thing possessed, not the possessor. Article obligatory except singular kinship.",
  },

  // ── Clitic pronouns ──────────────────────────────────────────────────────
  {
    id: "pron.reflexive",
    label: "Pronomi riflessivi",
    cefr: "A1",
    weight: 1.2,
    prior: 0.75,
    prereqs: ["verb.present.regular"],
  },
  {
    id: "verb.reflexive",
    label: "Verbi riflessivi",
    cefr: "A1",
    weight: 3.0,
    prior: 0.75,
    prereqs: ["pron.reflexive", "verb.present.irregular"],
    note: "Later forces essere as auxiliary, with participle agreement.",
  },
  {
    id: "pron.direct",
    label: "Pronomi diretti",
    cefr: "A2",
    weight: 3.5,
    prior: 0.55,
    prereqs: ["verb.present.regular", "noun.gender"],
    note: "Gender of the pronoun tracks the noun, so gender failures surface here again.",
  },
  {
    id: "pron.indirect",
    label: "Pronomi indiretti",
    cefr: "A2",
    weight: 3.0,
    prior: 0.55,
    prereqs: ["pron.direct", "prep.simple"],
    note: "The a-marked argument becomes gli/le. Distinguishing this from direct objects is the hard part.",
  },
  {
    id: "piacere.formula",
    label: "Mi piace, mi piacciono",
    cefr: "A1",
    weight: 3.0,
    prior: 0.75,
    prereqs: ["noun.number"],
    note: "The memorised formula, taught in week two everywhere. Only the singular/plural choice is productive here; the argument structure underneath is a separate, later node. Splitting the two is what keeps the graph honest about why this fossilises.",
  },
  {
    id: "verb.piacere",
    label: "Piacere e simili",
    cefr: "A2",
    weight: 2.0,
    prior: 0.55,
    prereqs: ["pron.indirect", "piacere.formula"],
    note: "Argument inversion: the thing liked is the subject, the person is an indirect object. Extends to mancare, servire, bastare, sembrare, interessare. Produces 'io piaccio la pizza' for years precisely because the A1 formula arrives long before this structure.",
  },
  {
    id: "pron.ne",
    label: "Pronome ne",
    cefr: "A2",
    weight: 2.5,
    prior: 0.55,
    prereqs: ["partitive", "pron.direct"],
  },
  {
    id: "pron.ci",
    label: "Pronome ci",
    cefr: "A2",
    weight: 2.5,
    prior: 0.55,
    prereqs: ["esserci", "pron.direct"],
    note: "Locative and pronominal ci; later feeds verbi pronominali.",
  },
  {
    id: "pron.combined",
    label: "Pronomi combinati",
    cefr: "B1",
    weight: 2.0,
    prior: 0.35,
    prereqs: ["pron.direct", "pron.indirect", "pron.ne"],
    note: "glielo, me lo, te ne. Convergence node; a reliable diagnostic for whether the clitic system is real or memorised.",
  },
  {
    id: "clitic.placement",
    label: "Posizione dei clitici",
    cefr: "B1",
    weight: 3.0,
    prior: 0.35,
    prereqs: ["pron.direct", "verb.modal"],
    note: "Proclitic vs enclitic: devo farlo / lo devo fare, dimmi, andandosene.",
  },

  // ── Past: the spine ──────────────────────────────────────────────────────
  {
    id: "verb.participio.regular",
    label: "Participio passato regolare",
    cefr: "A2",
    weight: 3.5,
    prior: 0.55,
    prereqs: ["verb.present.regular"],
  },
  {
    id: "verb.participio.irregular",
    label: "Participio passato irregolare",
    cefr: "A2",
    weight: 3.0,
    prior: 0.55,
    prereqs: ["verb.participio.regular"],
    note: "fatto, detto, preso, scritto, rimasto. Lexical, high frequency, worth its own node.",
  },
  {
    id: "pp.avere",
    label: "Passato prossimo con avere",
    cefr: "A2",
    weight: 4.0,
    prior: 0.55,
    prereqs: ["verb.avere.present", "verb.participio.regular"],
  },
  {
    id: "adverb.position",
    label: "Posizione degli avverbi",
    cefr: "A2",
    weight: 2.5,
    prior: 0.55,
    prereqs: ["pp.avere", "negation.non"],
    note: "sempre, gia, mai, piu, appena, ancora sit between auxiliary and participle: ho sempre pensato, non ho mai visto. Putting them after the participle never blocks comprehension, so it fossilises quietly. Had no home in the graph before.",
  },
  {
    id: "aux.selection",
    label: "Scelta dell'ausiliare",
    cefr: "A2",
    weight: 4.0,
    prior: 0.55,
    prereqs: ["pp.avere", "verb.reflexive"],
    note: "Unaccusative and reflexive verbs take essere. Semantically motivated but not predictable from meaning alone; the highest-value single node in the whole graph.",
  },
  {
    id: "pp.essere",
    label: "Passato prossimo con essere",
    cefr: "A2",
    weight: 3.5,
    prior: 0.55,
    prereqs: ["aux.selection", "adj.agreement"],
    note: "Participle agrees with the subject. Converges the verb spine with the agreement spine.",
  },
  {
    id: "pp.agreement.clitic",
    label: "Accordo del participio con il clitico",
    cefr: "B1",
    weight: 2.5,
    prior: 0.35,
    prereqs: ["pp.avere", "pron.direct"],
    note: "l'ho vista, le ho comprate. Second convergence of the same two spines; near-universally fossilised because omitting it never blocks comprehension.",
  },
  {
    id: "imperfetto.forms",
    label: "Imperfetto, forme",
    cefr: "A2",
    weight: 3.0,
    prior: 0.55,
    prereqs: ["verb.present.regular"],
    note: "Morphologically the most regular tense in the language.",
  },
  {
    id: "imperfetto.aspect",
    label: "Imperfetto vs passato prossimo",
    cefr: "A2",
    weight: 4.0,
    prior: 0.55,
    prereqs: ["imperfetto.forms", "pp.essere"],
    note: "Aspect, not tense. The real A2 wall, and conceptual rather than morphological: the forms are easy and the choice is not.",
  },
  {
    id: "trapassato",
    label: "Trapassato prossimo",
    cefr: "B1",
    weight: 2.0,
    prior: 0.35,
    prereqs: ["imperfetto.forms", "verb.participio.regular", "aux.selection"],
  },
  {
    id: "passato.remoto",
    label: "Passato remoto",
    cefr: "B2",
    weight: 0.8,
    prior: 0.2,
    prereqs: ["pp.essere"],
    note: "Recognition first. Productive use is regional or literary; teaching it early wastes a learner's budget.",
  },

  // ── Future, conditional ──────────────────────────────────────────────────
  {
    id: "futuro.semplice",
    label: "Futuro semplice",
    cefr: "A2",
    weight: 2.5,
    prior: 0.55,
    prereqs: ["verb.present.irregular"],
    note: "Also epistemic: sarà vero. Present tense covers most real future reference, so this is less urgent than curricula suggest.",
  },
  {
    id: "futuro.anteriore",
    label: "Futuro anteriore",
    cefr: "B1",
    weight: 2.0,
    prior: 0.35,
    prereqs: ["futuro.semplice", "verb.participio.regular"],
  },
  {
    id: "condizionale.presente",
    label: "Condizionale presente",
    cefr: "A2",
    weight: 3.0,
    prior: 0.55,
    prereqs: ["futuro.semplice"],
    note: "Shares the future stem, hence the edge. Also the politeness register: vorrei.",
  },
  {
    id: "condizionale.passato",
    label: "Condizionale passato",
    cefr: "B1",
    weight: 2.0,
    prior: 0.35,
    prereqs: ["condizionale.presente", "aux.selection"],
    note: "Also future-in-the-past, which English speakers consistently get wrong.",
  },

  // ── Imperative ───────────────────────────────────────────────────────────
  {
    id: "imperativo.informal",
    label: "Imperativo informale",
    cefr: "A2",
    weight: 2.0,
    prior: 0.55,
    prereqs: ["verb.present.irregular", "negation.non"],
    note: "Negative tu imperative uses the infinitive: non andare.",
  },
  {
    id: "imperativo.formal",
    label: "Imperativo formale",
    cefr: "B1",
    weight: 2.5,
    prior: 0.35,
    prereqs: ["congiuntivo.presente.forms"],
    note: "The Lei imperative IS the present subjunctive. Polite requests therefore smuggle in B1 morphology, which is why A1 learners memorise 'scusi' and 'senta' as vocabulary.",
  },

  // ── Subjunctive ──────────────────────────────────────────────────────────
  {
    id: "congiuntivo.presente.forms",
    label: "Congiuntivo presente, forme",
    cefr: "B1",
    weight: 3.0,
    prior: 0.35,
    prereqs: ["verb.present.irregular"],
  },
  {
    id: "congiuntivo.triggers",
    label: "Usi del congiuntivo",
    cefr: "B1",
    weight: 3.5,
    prior: 0.35,
    prereqs: ["congiuntivo.presente.forms", "subordination.che"],
    note: "Opinion, emotion, doubt, impersonal expressions, certain conjunctions. Separate node from the forms: learners routinely know the morphology and not the trigger.",
  },
  {
    id: "congiuntivo.imperfetto",
    label: "Congiuntivo imperfetto",
    cefr: "B1",
    weight: 2.5,
    prior: 0.35,
    prereqs: ["congiuntivo.triggers", "imperfetto.forms"],
  },
  {
    id: "congiuntivo.trapassato",
    label: "Congiuntivo trapassato",
    cefr: "B2",
    weight: 2.0,
    prior: 0.2,
    prereqs: ["congiuntivo.imperfetto", "trapassato"],
  },

  // ── Subordination and discourse ──────────────────────────────────────────
  {
    id: "subordination.che",
    label: "Frasi subordinate con che",
    cefr: "A2",
    weight: 2.5,
    prior: 0.55,
    prereqs: ["verb.present.regular"],
  },
  {
    id: "relative.che.cui",
    label: "Pronomi relativi che, cui",
    cefr: "B1",
    weight: 2.5,
    prior: 0.35,
    prereqs: ["subordination.che", "prep.simple"],
    note: "cui is the preposition-governed relative: la persona a cui penso.",
  },
  {
    id: "relative.ilquale",
    label: "Il quale, ciò che",
    cefr: "B2",
    weight: 1.2,
    prior: 0.2,
    prereqs: ["relative.che.cui", "article.definite"],
  },
  {
    id: "connettivi",
    label: "Connettivi testuali",
    cefr: "B1",
    weight: 2.0,
    prior: 0.35,
    prereqs: ["subordination.che"],
    note: "benché, sebbene, affinché, purché all govern the subjunctive; nonostante, invece, comunque.",
  },
  {
    id: "concordanza.tempi",
    label: "Concordanza dei tempi",
    cefr: "B1",
    weight: 2.0,
    prior: 0.35,
    prereqs: ["congiuntivo.imperfetto", "condizionale.passato"],
  },
  {
    id: "discorso.indiretto",
    label: "Discorso indiretto",
    cefr: "B2",
    weight: 2.0,
    prior: 0.2,
    prereqs: ["concordanza.tempi", "trapassato"],
  },

  // ── Hypotheticals ────────────────────────────────────────────────────────
  {
    id: "ipotetico.1",
    label: "Periodo ipotetico della realtà",
    cefr: "A2",
    weight: 2.0,
    prior: 0.55,
    prereqs: ["futuro.semplice", "subordination.che"],
    note: "se + indicativo. No subjunctive needed; teachable far earlier than the others.",
  },
  {
    id: "ipotetico.2",
    label: "Periodo ipotetico della possibilità",
    cefr: "B1",
    weight: 2.5,
    prior: 0.35,
    prereqs: ["congiuntivo.imperfetto", "condizionale.presente"],
    note: "Two-parent convergence: se avessi tempo, verrei.",
  },
  {
    id: "ipotetico.3",
    label: "Periodo ipotetico dell'irrealtà",
    cefr: "B2",
    weight: 2.0,
    prior: 0.2,
    prereqs: ["congiuntivo.trapassato", "condizionale.passato"],
  },

  // ── Voice and impersonal ─────────────────────────────────────────────────
  {
    id: "si.impersonale",
    label: "Si impersonale e passivante",
    cefr: "B1",
    weight: 2.5,
    prior: 0.35,
    prereqs: ["pron.reflexive", "verb.present.regular"],
    note: "si mangia bene vs si vendono case. The two are constantly conflated.",
  },
  {
    id: "passivo",
    label: "Forma passiva",
    cefr: "B1",
    weight: 2.5,
    prior: 0.35,
    prereqs: ["verb.participio.regular", "adj.agreement", "aux.selection"],
    note: "essere and venire as passive auxiliaries; participle agrees with the subject. Third convergence of the agreement spine.",
  },

  // ── Non-finite forms ─────────────────────────────────────────────────────
  {
    id: "gerundio",
    label: "Gerundio",
    cefr: "A2",
    weight: 2.0,
    prior: 0.55,
    prereqs: ["verb.present.regular"],
    note: "Temporal and causal uses (tornando a casa...), with the same subject as the main clause. The progressive is split off into verb.progressive.",
  },
  {
    id: "verb.progressive",
    label: "Stare + gerundio",
    cefr: "A2",
    weight: 2.0,
    prior: 0.55,
    prereqs: ["gerundio", "verb.present.irregular"],
    note: "sto mangiando, stavo leggendo. Strictly in progress at this moment, far narrower than English -ing: habits and general states take the plain present. Split from gerundio because learners acquire the progressive long before the adverbial gerund.",
  },
  {
    id: "infinito.usi",
    label: "Usi dell'infinito",
    cefr: "B1",
    weight: 2.5,
    prior: 0.35,
    prereqs: ["prep.simple", "verb.modal"],
    note: "Verb-governed preposition choice: cercare di, riuscire a, finire di. Heavily lexical.",
  },

  // ── Comparison ───────────────────────────────────────────────────────────
  {
    id: "comparativo",
    label: "Comparativi",
    cefr: "A2",
    weight: 2.0,
    prior: 0.55,
    prereqs: ["adj.agreement", "prep.simple"],
    note: "più/meno di vs più/meno che. The di/che split is the whole difficulty.",
  },
  {
    id: "superlativo",
    label: "Superlativi",
    cefr: "A2",
    weight: 2.0,
    prior: 0.55,
    prereqs: ["comparativo", "article.definite"],
  },
  {
    id: "avverbi.mente",
    label: "Avverbi in -mente",
    cefr: "A2",
    weight: 1.2,
    prior: 0.55,
    prereqs: ["adj.agreement"],
    note: "Formed from the feminine singular, so gender surfaces yet again.",
  },

  // ── Advanced lexicalised systems ─────────────────────────────────────────
  {
    id: "verbi.pronominali",
    label: "Verbi pronominali",
    cefr: "B2",
    weight: 2.0,
    prior: 0.2,
    prereqs: ["pron.combined", "clitic.placement", "pron.ci"],
    note: "farcela, andarsene, metterci, avercela. Opaque, high frequency, almost never taught systematically.",
  },
  {
    id: "registro",
    label: "Registro e formalità",
    cefr: "B2",
    weight: 2.0,
    prior: 0.2,
    prereqs: ["imperativo.formal", "condizionale.presente"],
    note: "Lei vs tu, hedging, bureaucratic Italian. The node that decides whether someone sounds competent or merely correct.",
  },
];

// ── Index and queries ──────────────────────────────────────────────────────

export const byId = new Map(SKILLS.map((s) => [s.id, s]));

/** Skills that are teachable now: not yet mastered, all prerequisites solid. */
export function frontier(
  mastery: Map<string, number>,
  threshold = 0.8,
): Skill[] {
  return SKILLS.filter(
    (s) =>
      (mastery.get(s.id) ?? 0) < threshold &&
      s.prereqs.every((p) => (mastery.get(p) ?? 0) >= threshold),
  );
}

/**
 * Blame assignment: given a failed skill, walk up the graph and return the
 * weakest ancestors. Teach these instead of drilling the symptom.
 */
export function blame(
  id: string,
  mastery: Map<string, number>,
  threshold = 0.8,
): Skill[] {
  const weak: Skill[] = [];
  const seen = new Set<string>();
  const stack = [...(byId.get(id)?.prereqs ?? [])];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const skill = byId.get(cur);
    if (!skill) continue;
    if ((mastery.get(cur) ?? 0) < threshold) weak.push(skill);
    stack.push(...skill.prereqs);
  }
  return weak.sort(
    (a, b) => (mastery.get(a.id) ?? 0) - (mastery.get(b.id) ?? 0),
  );
}

/** Any topological order is a valid teaching sequence. Throws on a cycle. */
export function topoSort(): Skill[] {
  const state = new Map<string, 0 | 1 | 2>();
  const out: Skill[] = [];
  const visit = (id: string, path: string[]) => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1)
      throw new Error(`Cycle: ${[...path, id].join(" -> ")}`);
    const skill = byId.get(id);
    if (!skill) throw new Error(`Unknown prerequisite: ${id}`);
    state.set(id, 1);
    for (const p of skill.prereqs) visit(p, [...path, id]);
    state.set(id, 2);
    out.push(skill);
  };
  for (const s of SKILLS) visit(s.id, []);
  return out;
}

/** Structural check: no dangling references, no cycles, CEFR never decreases. */
export function validateGraph(): string[] {
  const problems: string[] = [];
  const rank: Record<Cefr, number> = { A1: 0, A2: 1, B1: 2, B2: 3 };
  for (const s of SKILLS) {
    for (const p of s.prereqs) {
      const parent = byId.get(p);
      if (!parent) {
        problems.push(`${s.id}: unknown prerequisite ${p}`);
        continue;
      }
      if (rank[parent.cefr] > rank[s.cefr]) {
        problems.push(
          `${s.id} (${s.cefr}) depends on ${p} (${parent.cefr}) — a later skill gating an earlier one`,
        );
      }
    }
  }
  try {
    topoSort();
  } catch (e) {
    problems.push((e as Error).message);
  }
  return problems;
}

/**
 * Edge validation against real data. An edge A -> B is real only if learners
 * who lack A pass B materially less often than learners who have it.
 * Feed this conditional pass rates from your attempt log; anything under about
 * 0.1 separation is a hand-written opinion, not a prerequisite. Cut it.
 */
export function edgeStrength(
  passRateWithParent: number,
  passRateWithoutParent: number,
): number {
  return passRateWithParent - passRateWithoutParent;
}
