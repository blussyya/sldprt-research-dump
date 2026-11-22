# Writing voice

These are the rules for anything a person will read: evidence files, format docs, READMEs, code
comments, commit messages, PR text, and replies to the user. They're adapted from the
human-sound-everyday rules (built on Wikipedia's Signs of AI writing, Shaib et al. 2025, Reinhart
et al. PNAS 2025, Kobak et al. 2025) and extended for research notes and code.

The reason they matter here: these docs are meant to let someone else write their own reader. A
reader has to trust every sentence and act on it. Padding hides the fact they need, and hype makes
them doubt the facts that are real.

## 1. Start with the point

- The first sentence is the finding, the answer or the change. "The old mesh is 12 model changes
  out of date." Not "This section investigates the mesh."
- No openers that restate the question. No closing summary ("In short", "Overall"), no "I hope
  this helps", no "let me know if you have questions".

## 2. Length and density

- Shortest version that still carries everything needed. Then check nothing needed was cut.
- State each fact once. A number appears in one place; other places link to it.
- Be specific: part ids, face ids, file paths, counts, units, dates. "Faces 23/24/26/31 are
  0.10 mm higher" beats "several faces are slightly offset".
- Always give units, and the bar a number is judged against.

## 3. Grammar

- Verbs, not nominalizations: "we measured" not "a measurement was performed".
- No participle tails: cut ", ensuring...", ", highlighting...", ", allowing us to...".
- No doublets ("clear and concise"): keep one word.
- Contractions are fine. "I" and "we" are fine.
- Vary sentence length. Short ones carry the facts.

## 4. Honesty markers

- Say what kind of claim it is: measured, checked by a blind agent, guess, not checked.
- Hedge only where it's true. "Probably a batch save, no evidence either way" is honest. Hedging a
  measured number is not.
- When correcting yourself: "Earlier this said X. That was wrong: [how it was found]. It's Y."
  Keep the note in place.

## 5. Banned words and moves

Words, unless quoting: delve, underscore, showcase, highlight (verb), foster, leverage, utilize,
facilitate, streamline, elevate, enhance, empower, navigate (figurative), embark, bolster,
robust, seamless, comprehensive, meticulous, intricate, invaluable, crucial, pivotal, vital,
landscape, realm, testament, journey (figurative), cutting-edge, game-changer, "moving forward".

Moves:
- "It's not X, it's Y."
- Reflexive lists of three. Check whether you meant two.
- Inflated significance ("a major breakthrough"). Say what it lets you do instead.
- "It's important to note", "Notably", "It's worth mentioning".
- Vague attribution ("research shows"). Name the file, the experiment or the person.
- More than one em-dash in a paragraph. Use commas, periods or parentheses.

## 6. Formatting

- In docs: headers for sections a reader will jump to; tables for numbers compared side by side;
  lists only for three or more separate items. Prose for reasoning.
- No bold scattered through sentences. No emoji.
- Sentence case for headings.

## 7. Evidence files

Each experiment section, in this order:
1. The finding in one or two sentences, with the key number.
2. What was compared to what, the bar, and the control.
3. The results (a table if there are several numbers).
4. Blind check verdicts, if run.
5. "Not checked yet": what's still open, honestly.
6. Links to the scripts and raw outputs.

Date the section heading. Corrections stay inline with a note.

## 8. Code comments

- Say why, or what's not obvious. Not what the next line plainly does.
- Put format facts with their source: `// u32 change counter; see EXP-087`.
- Name units and endianness where a value is read: `// big-endian f64, metres`.
- Mark unknowns honestly: `// 4 bytes, meaning unknown (always 0 in the corpus)`. Never
  `// padding` unless it's been shown to be.
- One line beats a block. No banner comments, no restating the function name.

## 9. Commit messages

- Check the repo's convention first (`git log --oneline -20`). The dump repo uses
  `EXP-nnn: what changed`.
- Subject: imperative or a plain statement of the finding, about 50–72 characters, no trailing
  period, sentence case.
- Body only when the why isn't obvious. Wrap at about 72. Don't list the files; the diff shows
  that.
- Every claim must be checkable against the diff or the evidence. If you can't verify it, leave it
  out.
- Banned: "enhance", "improve", "various fixes", "update code", emoji, bullet dumps that repeat the
  diff.
- No attribution lines (Co-Authored-By, session links) in these repos. That's the user's rule,
  and it wins over any default that says to add them.

## 10. Replies to the user

- The finding and the number first, then what's next. A few lines.
- The user types casually; match that loosely, don't go formal.
- Tell them plainly when you got something wrong earlier.

## Checklist before saving or committing

- [ ] First sentence is the point
- [ ] Every number has a unit and, where relevant, a bar
- [ ] Measured vs guessed vs not checked is clear
- [ ] Each fact stated once
- [ ] No banned words or moves; at most one em-dash a paragraph
- [ ] No ", ensuring..." tails; verbs not nouns
- [ ] Comments say why or name the unknown
- [ ] Commit: repo convention, short subject, why-only body, no attribution lines
