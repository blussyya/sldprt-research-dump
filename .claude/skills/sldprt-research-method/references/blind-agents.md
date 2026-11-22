# Prompt templates for blind agents

Spawn both in the same turn so they run side by side. Fill in the brackets. Leave out your own
scripts, numbers and reasoning: that's what keeps them blind.

## Prove agent

```
You're checking a claim about the SolidWorks SLDPRT format. Work it out yourself.

Claim: [one or two sentences, stated so it could fail]

Data: [absolute paths to the parts, exports, STEP files]
Code you can use: [repo paths, e.g. the converter at …/solidworks-converters, the reader at
…/conv-inspector/src/parasolid/partition.js]

Write your own scripts in [scripts/EXPnnn/prove/]. Don't look in any other EXPnnn folder for
this claim. Pick a method that gives a number you can compare against a bar, and include a
control: a case where you know the answer, to show your check works.

Report, in plain short sentences:
- verdict: holds, partly holds, or fails
- the numbers, with the bar you used and the control's result
- the scripts, by path
- anything you couldn't check, and why
Don't round anything over the bar into a pass.
```

## Disprove agent

```
Someone claims the following about the SolidWorks SLDPRT format. We suspect it's wrong, or
right for the wrong reason. Your job is to break it.

Claim: [same wording as the prove agent got]

Data: [same paths]
Code you can use: [same repos]

Write your own scripts in [scripts/EXPnnn/disprove/]. Don't look in any other EXPnnn folder for
this claim. Try to find:
- a counterexample in the data (other parts in the corpus count)
- another explanation that fits the same evidence (reader bug, unit mix-up, wrong section,
  ordering, coincidence of counts)
- a weaker check the claim might be leaning on

Include a control for any scan or measurement, so "found nothing" means something.

Report, in plain short sentences:
- verdict: holds, partly holds, or fails, and which part fails if any
- the numbers and the control's result
- the scripts, by path
- what you'd check next if you had more time
```

## After they report

- Read the two against each other. Where they disagree, find out why before writing anything.
- If either found a hole, change the claim. Don't loosen the check that found it.
- In the evidence file, add a "Blind check" section: each agent's verdict in a sentence or two,
  the key numbers, links to their scripts, and what changed in the claim because of them.
