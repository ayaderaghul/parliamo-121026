# 4. The past

Covers 10 nodes: `verb.participio.regular`, `verb.participio.irregular`,
`pp.avere`, `aux.selection`, `pp.essere`, `pp.agreement.clitic`,
`imperfetto.forms`, `imperfetto.aspect`, `trapassato`, `passato.remoto`.

The densest area of the graph, and where the agreement spine and the verb spine
cross twice.

---

### Regular past participle · `verb.participio.regular` · A2
*Prerequisites: `verb.present.regular`*

| infinitive | participle |
|---|---|
| parl**are** | parl**ato** |
| cred**ere** | cred**uto** |
| dorm**ire** | dorm**ito** |

That's the entire rule: **-ato, -uto, -ito**. The participle also functions as an
adjective (*una porta chiusa*), which is the clue that it can agree — and the
basis for everything in `pp.essere`, `pp.agreement.clitic` and `passivo`.

---

### Irregular past participles · `verb.participio.irregular` · A2
*Prerequisites: `verb.participio.regular`*

Almost all irregulars are **-ere** verbs. Grouping them by ending makes the list
tractable.

**-tto:** fare → fatto, dire → detto, leggere → letto, scrivere → scritto,
rompere → rotto, cuocere → cotto, tradurre → tradotto
**-so:** prendere → preso, mettere → messo, chiudere → chiuso,
decidere → deciso, scendere → sceso, correre → corso, spendere → speso
**-sto:** rimanere → rimasto, vedere → visto (also *veduto*),
chiedere → chiesto, rispondere → risposto, porre → posto
**-nto:** vincere → vinto, spegnere → spento, dipingere → dipinto,
piangere → pianto
**Others:** essere → stato, venire → venuto, aprire → aperto,
offrire → offerto, morire → morto, nascere → nato, vivere → vissuto,
bere → bevuto, perdere → perso (also *perduto*), succedere → successo,
scegliere → scelto, muovere → mosso

**Trap.** Compounds inherit their base: *comprendere → compreso*,
*riprendere → ripreso*, *descrivere → descritto*, *trattenere → trattenuto*.
Learning the base verb buys you the family.

---

### Passato prossimo with avere · `pp.avere` · A2
*Prerequisites: `verb.avere.present`, `verb.participio.regular`*

*avere* (present) + past participle. This is the ordinary past for completed
events, used in speech for everything from five minutes ago to five centuries
ago.

*Ieri **ho mangiato** una pizza. **Abbiamo visto** un film. **Hanno deciso** di
partire.*

With *avere*, the participle is **invariable**: *Maria ha mangiato*, *le ragazze
hanno mangiato*.

Transitive verbs — those taking a direct object — take *avere*:
*ho letto il libro, hai fatto i compiti, abbiamo comprato la casa*.

**Placement of adverbs:** *sempre, già, mai, più, appena, ancora* go between
auxiliary and participle: *ho **sempre** pensato*, *non ho **mai** visto*,
*è **appena** arrivato*.

---

### Auxiliary selection · `aux.selection` · A2
*Prerequisites: `pp.avere`, `verb.reflexive`*

The highest-value single node in the graph, and the one that produces the most
persistent errors.

**Take essere:**

- Verbs of **motion and change of state** (the subject undergoes the event rather
  than performing it on something): *andare, venire, arrivare, partire, uscire,
  entrare, tornare, salire, scendere, cadere, restare, rimanere, stare, nascere,
  morire, diventare, crescere, succedere, piacere, sembrare, costare, bastare,
  mancare.*
- All **reflexive and pronominal** verbs: *mi sono alzata, si sono visti,
  me ne sono andato.*
- The **passive** (→ `passivo`).

**Take avere:** transitive verbs, and most verbs of activity that don't involve
displacement: *ho lavorato, ho dormito, ho camminato, ho viaggiato, ho nuotato,
ho parlato.*

**Verbs that take either, with a meaning shift.** When used transitively they
take *avere*; intransitively, *essere*:

| avere (transitive) | essere (intransitive) |
|---|---|
| *ho cambiato la macchina* | *sono cambiato molto* |
| *ho finito il lavoro* | *il film è finito* |
| *ho cominciato il libro* | *la lezione è cominciata* |
| *ho passato le vacanze* | *sono passato da te* |
| *ho salito le scale* | *sono salito in macchina* |
| *ho corso una maratona* | *sono corso a casa* |

**Modals** normally inherit the auxiliary of the following infinitive:
*ho dovuto lavorare* but *sono dovuto partire*. In practice *avere* with modals
is widespread in speech and rarely noticed.

**Trap.** The rule is semantically motivated but not derivable from meaning.
*Camminare* is motion and takes *avere*; *andare* takes *essere*. Treat it as a
lexical property learned per verb, with the motion/change-of-state pattern as a
memory aid rather than an algorithm.

---

### Passato prossimo with essere · `pp.essere` · A2
*Prerequisites: `aux.selection`, `adj.agreement`*

Same construction, but the participle now **agrees with the subject** in gender
and number, exactly like an adjective.

*Marco **è andato**. Maria **è andata**. I ragazzi **sono andati**.
Le ragazze **sono andate**.*

This is the first crossing of the verb spine and the agreement spine. A learner
who is shaky on `noun.gender` will fail here even with perfect verb morphology,
and the error will look like a past-tense problem when it isn't. That is exactly
what the `blame()` walk in the diagnostic is for.

**Traps.**
- Mixed group → masculine plural: *Marco e Anna sono andati*.
- Formal *Lei* agrees with the real person's gender: *Lei è arrivat**a***, said to
  a woman.
- Reflexives: *mi sono lavat**a*** if the speaker is female. The single most
  common place for a fluent learner to give themselves away.

---

### Participle agreement with clitics · `pp.agreement.clitic` · B1
*Prerequisites: `pp.avere`, `pron.direct`*

With *avere*, the participle is invariable — **except** when a direct object
pronoun comes before it. Then it agrees with that pronoun.

*Hai visto Maria? Sì, **l'ho vista**.*
*Hai comprato le mele? Sì, **le ho comprate**.*
*Dove sono i libri? **Li ho messi** sul tavolo.*
*Di mele **ne** ho mangiat**e** tre.*

Agreement with *mi, ti, ci, vi* is optional: *ci ha visto* and *ci ha visti* are
both acceptable.

**Why this is the most fossilised rule in the language.** Omitting it never
impedes comprehension, never draws a correction, and the correct form is
unstressed. So learners hear it correctly for years while producing *l'ho visto*
about a woman, and nothing in the environment pushes back. It is a textbook case
for repair-mode teaching: elicit the error, show the surprise, then explain.

---

### Imperfetto forms · `imperfetto.forms` · A2
*Prerequisites: `verb.present.regular`*

The most regular tense in Italian. Drop *-re* from the infinitive, add
*-vo, -vi, -va, -vamo, -vate, -vano*.

*parlare → parla**vo**, parla**vi**, parla**va**, parla**vamo**, parla**vate**,
parla**vano***

Only four irregulars, and they're mild:
*essere* → *ero, eri, era, eravamo, eravate, erano*;
*fare* → *facevo*; *dire* → *dicevo*; *bere* → *bevevo* (all from older
infinitives *facere, dicere, bevere*).

**Trap.** Stress on the *loro* form is early: *parLAvano*, not *parlaVAno*.

---

### Imperfetto vs passato prossimo · `imperfetto.aspect` · A2
*Prerequisites: `imperfetto.forms`, `pp.essere`*

The real A2 wall. The forms are easy; the choice is not. This is **aspect**, not
time — both tenses refer to the past, and the difference is how the event is
framed.

**Passato prossimo** — a bounded, completed event. Something happened.
**Imperfetto** — an unbounded frame: description, habit, ongoing state,
background.

| imperfetto | passato prossimo |
|---|---|
| *Da bambino **giocavo** a calcio.* (habit) | *Ieri **ho giocato** a calcio.* (one event) |
| ***Era** tardi, **pioveva**.* (background) | ***Sono uscito** alle otto.* (event) |
| ***Leggevo** quando è suonato il telefono.* | *Il telefono **è suonato**.* |
| ***Avevo** fame.* (state) | ***Ho avuto** un'idea.* (event) |

**Diagnostics that work.**
- "Used to / was doing" → imperfetto.
- A completed action with a boundary or a count → passato prossimo:
  *ci sono andato tre volte*.
- Two past events: the frame is imperfetto, the interruption is passato prossimo.
- Time, age, weather, appearance, feelings as background → imperfetto:
  *erano le tre, aveva vent'anni, faceva freddo*.

**Meaning shifts with mental and modal verbs:**
*sapevo* (I knew, state) vs *ho saputo* (I found out, event);
*conoscevo* (I knew someone) vs *ho conosciuto* (I met);
*dovevo andare* (I was supposed to, unclear if I went) vs *ho dovuto andare*
(I had to, and did);
*volevo* (I wanted, softened request) vs *ho voluto* (I insisted).

**Trap.** Speakers of languages without grammatical aspect default to whichever
they learned first and use it everywhere. The output is comprehensible and
permanently non-native, which makes this a prime fossilisation candidate.

---

### Trapassato prossimo · `trapassato` · B1
*Prerequisites: `imperfetto.forms`, `verb.participio.regular`, `aux.selection`*

*Imperfetto* of the auxiliary + participle. It marks a past event **before**
another past event.

*Quando sono arrivato, lui **era** già **uscito**.*
*Non sapevo che **avessero** venduto la casa.*
*Ti **avevo detto** di aspettare.*

Auxiliary selection and participle agreement work exactly as in the passato
prossimo: *era andata, si erano alzati, l'avevo vista*.

**Trap.** Italian requires it where English can get away with a simple past.
*When I arrived, he already left* is fine colloquially in English; *quando sono
arrivato, lui è già uscito* is not idiomatic Italian. The sequence needs marking.

---

### Passato remoto · `passato.remoto` · B2
*Prerequisites: `pp.essere`*

A simple (one-word) past used for completed events with no present relevance:
narrative, history, literature. In the north it is essentially absent from speech;
in much of the south it replaces the passato prossimo entirely in everyday use.

*parlare*: parl**ai**, parl**asti**, parl**ò**, parl**ammo**, parl**aste**,
parl**arono**
*essere*: fui, fosti, fu, fummo, foste, furono
*avere*: ebbi, avesti, ebbe, avemmo, aveste, ebbero

Most irregulars follow a **1-3-3 pattern**: only the first singular, third
singular and third plural are irregular, and the rest are regular:
*prendere* → **presi**, prendesti, **prese**, prendemmo, prendeste, **presero**.
Same for *fare* (feci), *dire* (dissi), *vedere* (vidi), *venire* (venni),
*sapere* (seppi), *volere* (volli), *scrivere* (scrissi), *nascere* (nacque).

**Teaching order.** Recognition first, production much later or never. A learner
needs to read *Dante nacque nel 1265* without stumbling; producing it is a low
priority unless they read fiction or live in the south. Putting this early, as
many syllabuses do, spends a large budget on a small return.
