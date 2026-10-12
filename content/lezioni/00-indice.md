# Italian lessons, indexed by skill node

One lesson section per node in `italian-skill-graph.ts`. All 73 nodes are
covered. Each section carries its node ID and prerequisites, so a lesson can be
retrieved by skill rather than by chapter.

Explanations are in English with Italian examples. Node IDs in headings are the
join key: `getLesson(skillId)` should resolve to a section, not to a file.

| file | nodes | contents |
|---|---|---|
| [01-fondamenti.md](01-fondamenti.md) | 11 | sounds, spelling, stress; noun gender and number, irregular plurals; definite and indefinite articles; adjective agreement and position; *molto/poco/troppo* |
| [02-presente-preposizioni.md](02-presente-preposizioni.md) | 15 | *essere*, *avere*, subject pronouns; regular, *-isc-* and irregular present; modals; negation; question words; simple and articulated prepositions; partitive; *c'è/ci sono*; demonstratives; possessives |
| [03-clitici.md](03-clitici.md) | 9 | reflexive pronouns and verbs; direct and indirect objects; *piacere*; *ne*; *ci*; combined pronouns; clitic placement |
| [04-passato.md](04-passato.md) | 10 | past participles regular and irregular; passato prossimo with *avere* and *essere*; auxiliary selection; participle agreement with clitics; imperfetto forms and aspect; trapassato; passato remoto |
| [05-futuro-congiuntivo.md](05-futuro-congiuntivo.md) | 10 | futuro semplice and anteriore; conditional present and past; informal and formal imperative; subjunctive forms, triggers, imperfect and pluperfect |
| [06-subordinazione-avanzate.md](06-subordinazione-avanzate.md) | 18 | subordination with *che*; relatives; connectives; sequence of tenses; reported speech; the three conditionals; *si* impersonal; passive; gerund; infinitive; comparatives and superlatives; *-mente* adverbs; pronominal verbs; register |

## Section anatomy

Every section has the same five parts, which is what makes them machine-usable:

1. **Heading** — label, node ID, CEFR level
2. **Prerequisites** — mirrors the graph edges
3. **Forms** — a table wherever there is a paradigm
4. **Rule** — what governs the choice, stated as briefly as it can honestly be
5. **Traps** — the errors this node actually produces, including L1-transfer ones

The Traps block is the part worth mining. Those are the candidate `errorTags` for
the grader and the source material for distractors, so a later version should
extract them into structured data rather than leaving them as prose.

## What these are not

These are reference explanations, not the lesson text a learner should see.

- For **first encounter**, the section is too long. It needs cutting to the rule
  and two examples.
- For **refresh**, only the forms table is needed.
- For **repair** — the fossilised case — the explanation should not come first
  at all. Elicit the error, show the surprise, then show the relevant Trap line.

Which is to say: one node may need three lesson variants, and this file is the
source they're all cut from.
