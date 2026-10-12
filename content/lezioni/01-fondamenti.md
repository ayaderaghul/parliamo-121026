# 1. Foundations: sounds, nouns, articles, agreement

Covers 11 nodes: `phon.spelling`, `phon.geminate`, `phon.stress`, `noun.gender`,
`noun.number`, `noun.irregular`, `article.definite`, `article.indefinite`,
`adj.agreement`, `adj.position`, `quantifier.invariable`.

---

### Sounds and spelling · `phon.spelling` · A1
*Prerequisites: none (root)*

Italian spelling is regular, but a handful of digraphs carry the whole system.

- **c** and **g** are hard before `a, o, u` (*casa, gatto*) and soft before `e, i`
  (*cena* = "che-", *gelato* = "dje-").
- **h** is silent and exists only to keep a consonant hard: *che, chi, ghe, ghi*.
  So *amico → amici* (soft, because -ci), but *banca → banche* (h keeps it hard).
- **sc** is soft before `e, i` (*pesce, sci*), hard elsewhere (*scuola*); **sch**
  restores the hard sound (*schema*).
- **gl** before `i` is a single palatal sound (*figlio, gli*), **gn** likewise
  (*bagno, signore*).

**Traps.** Plural spelling changes are not irregularities, they preserve the
sound: *amica → amiche*, *amico → amici*, *medico → medici*, *albergo → alberghi*.
This node gates `article.definite`, because the choice of *lo/gli* is decided by
the sounds a word starts with, not by meaning.

---

### Double consonants · `phon.geminate` · A1
*Prerequisites: `phon.spelling`*

Length is phonemic: a doubled consonant is genuinely held longer, and the
difference changes words.

| single | double |
|---|---|
| *nono* (ninth) | *nonno* (grandfather) |
| *capello* (a hair) | *cappello* (hat) |
| *pena* (sorrow) | *penna* (pen) |
| *casa* (house) | *cassa* (crate, till) |
| *sete* (thirst) | *sette* (seven) |

**Traps.** Speakers of languages without consonant length hear these as the same
word and spell by guesswork for years. Note also that the preceding vowel
shortens before a geminate, which is often the easier cue to imitate. Fixed
spellings worth memorising: *abbastanza, femmina, professoressa, appartamento,
soprattutto* (two t's, one p).

---

### Word stress · `phon.stress` · A1
*Prerequisites: `phon.spelling`*

Most words stress the second-to-last syllable (*aMIco, paROla*). A written accent
marks final stress (*città, perché, caffè*) and is obligatory there. Many common
words stress the third-from-last syllable with no written mark, which you simply
have to learn: *TAvolo, MEdico, MAcchina, TElefono, abitano*.

**Traps.** Stress alone distinguishes verb forms and can change meaning
entirely: *PARlo* (I speak) vs *parLÒ* (he spoke, passato remoto);
*ANcora* (anchor) vs *anCOra* (still, again); *CApitano* (they happen / captain)
vs *capiTAno* (they understand). Third-person plural present is always stressed
early: *ABitano, TELefonano, PARlano* — never *abiTAno*.

---

### Noun gender · `noun.gender` · A1
*Prerequisites: none (root)*

Every noun is masculine or feminine, including objects and abstractions. The
default signal is the ending:

- **-o** → masculine (*il libro*), **-a** → feminine (*la casa*)
- **-e** → either, unpredictable (*il pane* m., *la notte* f.)

Reliable sub-patterns: **-zione, -sione, -tà, -tù, -trice** are feminine
(*la stazione, la città, la virtù, l'attrice*); **-ore, -ismo, -mento** are
masculine (*il colore, il turismo, il momento*).

**Traps.**
- Greek-origin nouns in **-ma** are masculine: *il problema, il tema, il sistema,
  il programma, il clima*.
- Feminine nouns not ending in -a: *la mano, la radio, la foto, la moto,
  la crisi, l'auto*.
- Masculine nouns ending in -a: *il poeta, il pilota, il turista* (m. or f. by
  person).

This is the single highest-value node in the graph. Gender propagates into
articles, adjectives, pronouns, past participles and the passive, so an unstable
gender system produces errors at four later nodes that look unrelated.

---

### Noun number · `noun.number` · A1
*Prerequisites: `noun.gender`*

The plural is formed by changing the final vowel, never by adding -s.

| singular | plural | |
|---|---|---|
| libr**o** | libr**i** | m. |
| cas**a** | cas**e** | f. |
| pan**e** | pan**i** | m. in -e |
| nott**e** | nott**i** | f. in -e |

So **-e** nouns all take **-i** regardless of gender, which is why gender must
come first: you cannot predict *le notti* vs *i pani* from the form alone.

**Invariable nouns** (unchanged in the plural): words with a written final accent
(*le città, i caffè*), shortened words (*le foto, le auto, i cinema*), foreign
words (*i bar, i film, gli sport*), single-syllable words (*i re*).

---

### Irregular plurals · `noun.irregular` · A2
*Prerequisites: `noun.number`*

Two groups worth learning as vocabulary.

**Suppletive:** *l'uomo → gli uomini*, *il dio → gli dèi*, *il bue → i buoi*.

**Masculine singular → feminine plural**, mostly body parts and pairs:

| singular (m.) | plural (f.) |
|---|---|
| il braccio | le braccia |
| il dito | le dita |
| il ginocchio | le ginocchia |
| il labbro | le labbra |
| l'uovo | le uova |
| il paio | le paia |

Agreement follows the plural form: *le braccia stanch**e***, not *stanchi*.

Some nouns have both plurals with different meanings: *i bracci* (of a river, a
chair), *le braccia* (of a body); *i muri* (individual walls), *le mura* (city
walls).

---

### Definite article · `article.definite` · A1
*Prerequisites: `noun.gender`, `noun.number`, `phon.spelling`*

The form depends on gender, number, and the **sound** that follows.

| | singular | plural | used before |
|---|---|---|---|
| m. | **il** | **i** | most consonants: *il libro, i libri* |
| m. | **lo** | **gli** | s+cons., z, ps, gn, y, x: *lo studente, gli zii* |
| m. | **l'** | **gli** | vowel: *l'amico, gli amici* |
| f. | **la** | **le** | consonant: *la casa, le case* |
| f. | **l'** | **le** | vowel: *l'amica, le amiche* |

**Traps.** The trigger is phonological, so it tracks the *next word*, not the
noun: *il ragazzo* but *lo stesso ragazzo*; *gli studenti* but *i bravi studenti*.
Italian also uses the article where English drops it: with abstractions
(*la vita è bella*), languages (*studio l'italiano*), possessives (*la mia casa*),
and generic plurals (*mi piacciono i cani*).

---

### Indefinite article · `article.indefinite` · A1
*Prerequisites: `noun.gender`, `phon.spelling`*

Singular only, and it mirrors the definite series.

| | form | before |
|---|---|---|
| m. | **un** | consonants *and* vowels: *un libro, un amico* |
| m. | **uno** | s+cons., z, ps, gn: *uno studente, uno zaino* |
| f. | **una** | consonants: *una casa* |
| f. | **un'** | vowels: *un'amica* |

**Traps.** *un amico* takes no apostrophe (masculine), *un'amica* does
(feminine) — the apostrophe is the only thing marking gender here. There is no
plural: use the partitive (*dei libri*) or *alcuni/qualche* (→ `partitive`).
Italian omits the article after *essere* with professions: *sono medico*,
*è ingegnere*.

---

### Adjective agreement · `adj.agreement` · A1
*Prerequisites: `noun.gender`, `noun.number`*

Two classes.

**Four-form (-o):** *ross**o**, ross**a**, ross**i**, ross**e***.
**Two-form (-e):** *grand**e**, grand**i*** — no gender distinction at all.

*un libro rosso / una casa rossa / i libri rossi / le case rosse*
*un libro grande / una casa grande / i libri grandi / le case grandi*

**Traps.**
- A mixed-gender group takes the masculine plural: *Marco e Anna sono stanchi*.
- Two-form adjectives feel "unagreeing" and learners over-correct to
  *intelligenta*, *importanta*. There is no such form.
- Colour adjectives from nouns are invariable: *le scarpe **rosa***, *i capelli
  **blu***, *le giacche **viola***.
- *bello* and *buono* before a noun inflect like the articles:
  *bel libro, bei libri, bello zaino, begli amici*; *buon giorno, buona sera,
  buon amico*.

This node is load-bearing: participle agreement, the passive, and
adverb formation all draw on it.

---

### Adjective position · `adj.position` · A2
*Prerequisites: `adj.agreement`*

Default position is **after** the noun, which is where a distinguishing,
informative adjective goes: *una macchina rossa*, *un film interessante*,
*il vino italiano*.

A small set of frequent adjectives normally goes **before**, where the meaning is
expected or evaluative rather than contrastive: *bello, brutto, buono, cattivo,
grande, piccolo, giovane, vecchio, nuovo, stesso, altro*.

**Meaning changes with position:**

| before | after |
|---|---|
| *un **vecchio** amico* (long-standing) | *un amico **vecchio*** (elderly) |
| *un **grand'**uomo* (great) | *un uomo **grande*** (large) |
| *una **certa** notizia* (a certain, some) | *una notizia **certa*** (reliable) |
| *un **povero** uomo* (pitiable) | *un uomo **povero*** (penniless) |
| *diverse* persone (several) | persone *diverse* (different) |

**Trap.** Both orders are grammatical in every pair above; neither is an error.
The error is assuming position is free.

---

### molto, poco, troppo, tanto · `quantifier.invariable` · A1
*Prerequisites: `adj.agreement`*

These words belong to two word classes, and the class decides whether they agree.

**Before a noun → adjective → agrees:**
*molt**e** ragazze, poc**o** tempo, tropp**i** libri, tant**a** pazienza.*

**Before an adjective, adverb or verb → adverb → invariable:**
*sono molt**o** belle, parla molt**o** lentamente, studio molt**o**,
è poc**o** simpatica, sono tropp**o** stanche.*

**Trap.** *molto belle* is correct precisely where agreement feels most natural,
because a feminine plural adjective is sitting right next to it. *molte belle* is
the error. The test is mechanical: look at what the word modifies, not at what
comes after it.

Note *tanto... quanto* and *così... come* in comparisons (→ `comparativo`), where
*tanto/quanto* agree when they quantify nouns: *ho tanti libri quanti ne hai tu*.
