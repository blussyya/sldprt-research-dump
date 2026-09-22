# The published Parasolid XT format specification — what it says, and what we must now re-test

Compiled 2026-09-21. Session handoff: research only, **no corpus verification done yet.**

> **This file records what the format's owner documents. It is not evidence and nothing in it
> supports any invariant.** Same standing as `PRIOR_ART.md`. Every item below is a *prediction*
> to be tested against our corpus; anything that survives gets its own experiment, its own
> evidence file and its own numbers before it goes near `KNOWN_INVARIANTS.md`.

---

## 1. The document

**Parasolid XT Format Reference**, October 2006, © UGS Corp. (UGS → Siemens, 2007). 123 pages.
Mirror used: `http://www.13thmonkey.org/documentation/CAD/Parasolid-XT-format-reference.pdf`
(HTTP 200, 363,627 bytes, freely accessible, no login). A newer V35 edition is indexed at
`q-solid.com/Parasolid_Docs_V35/pdf/xt.pdf` but was returning 503 — **worth retrying, since our
corpus is schema base 13006, well past the V14 this edition documents.**

The XT B-Rep layout is additionally published in **ISO 14306 (JT), Annex G** — royalty-free.
Siemens' JT File Format Reference downloads free without login.

**Standing.** The format is published; the *kernel* is what requires a licence. The document
states its own purpose plainly: the files "have a published format so that applications can have
access to Parasolid models without necessarily using the Parasolid kernel. The main audience for
this manual is people who intend to write translators from or to the Parasolid transmit format."

It also carries a strict copyright notice. So: paraphrase and cite, never paste its tables
wholesale into this repo. Nothing here is copied verbatim beyond short quotations needed to
establish what was actually said.

**What it is not.** It is not SolidWorks source. No SOLIDWORKS source code is public or lawfully
available, and this project derives nothing from Dassault Systèmes source, decompiled binaries,
or any purportedly leaked material. Two layers, two provenance stories:

| layer | provenance |
|---|---|
| Parasolid XT transmit (`Config-0-Partition`, `.x_t`, `.x_b`) | owner-published spec + ISO standard |
| SolidWorks container, stream names, feature tree, DisplayLists | **no spec exists** — black-box, ours |

Everything in `KNOWN_INVARIANTS.md` about DisplayLists, the container and INV-026 sits in the
second row and is unaffected by this document.

## 2. The reframe: we have been misreading the schema table

Our reader calls the leading uppercase run **"type letters"**. It is not a type string. Quoting
the spec's embedded-schema section directly:

> If the base field matches the current field, output `'C'` (char) and advance to the next base
> and current fields; If the base field does not match any unprocessed current field, output
> `'D'` (char) and advance to the next base field; Output `'I'` (char), the current field in the
> above format, and advance to the next current field. If there are any unprocessed current
> fields, then output an Append sequence, each instruction being `'A'` (char) followed by the
> field. **Finally, output `'Z'` (char) to signal the end.**

So `C`/`D`/`I`/`A` are **edit opcodes** — Copy, Delete, Insert, Append — in a per-node-type delta
against the base schema, and **`Z` terminates that edit script**.

And immediately before:

> If the two arrays match (equal length and all fields match in name, xmt_code, ptr_class,
> n_elts and type) then output the flag value **255** (byte `0xff`).

### What this explains that we could not

| our observation | under the edit-script reading |
|---|---|
| `owner` appears as `CCCCCCCDI` **and** `CCCCCCCA` | same node type, two different *edits*. A type-letter reading cannot produce this; an edit-script reading requires it. |
| `index_map_offset` appears as `CCCA` and later as `CI` | same — different deltas at different points |
| the same name carries different letters in export vs partition | different current schemas, so different deltas |
| `255 <id> <type>` runs in the `.x_t` | the `0xff` "matches base schema exactly" flag |
| `Z` "is a genuine record boundary" (EXP-060) | **wrong** — it ends an edit script |

### The field format, which decodes two more of our open questions

The spec gives the field record as `name`, `xmt_code`, `ptr_class`, `n_elts`, `type`, with two
omission rules:

- **`type` is omitted if `ptr_class` is non-zero**
- `xmt_code` is omitted for fixed-length fields (`n_elts != 1`)

Our recorded entries fit this exactly:

```
A16 index_map_offset0 0 1 d     ->  ptr_class=0  =>  type "d" PRESENT
A16 mesh_offset_data206 0       ->  ptr_class=206 =>  type OMITTED
```

Two consequences, both to be tested:

1. **Our "code" field is almost certainly `ptr_class`**, not an opcode. Check 222, 1006, 1008,
   1040, 12, 82, 206, 74, 1012 against the spec's node-class table (p.115).
2. **NQ-042 dissolves.** EXP-059 §6 called the extension rule "fitted to two names, one length"
   and NQ-042 is filed as *blocked on new material*. It is neither: `"d"`/`"u"`/`"l"` are field
   **type letters** (`d` int, `u` unsigned byte, `l` logical), and they appear only on
   `index_map_offset` and `lowest_node_id` because those are the entries whose `ptr_class` is 0.
   The rule was never "these two names" — it is the documented omission rule.

Field types, for reference: `u` unsigned byte, `c` char, `l` logical, `n` short, `w` unicode,
`d` int, `p` pointer-index, `f` double, `i` interval (2 doubles), `v` vector (3 doubles),
`b` box (6 doubles — spec warns the ordering **differs** from the PK/KI interface), `h` hvec.

## 3. NQ-043 has to be re-posed, not re-correlated

We have spent EXP-059, EXP-060, EXP-064 and EXP-065 on a `u32be` read at `Z+3`, on the premise
that `Z` marks a record boundary. If `Z` ends an edit script, that premise is gone: the bytes
after `Z` are the **first node of that type**, and we have been reading a field inside node data.

The spec documents the real ID-ceiling fields: **`highest_node_id`** on `BODY` and `ASSEMBLY`,
and **`highest_id`** / **`current_id`** on `WORLD` (partitions). EXP-065 falsified a crude
text-integer proxy for an ID ceiling (C15: dense prefix 57 > Z 44; C16: 369 > 355). That
falsified the proxy, **not** these fields. Locate them properly and re-test.

Also documented: in XT format the archive name is extended with the base schema number and then
**the maximum number of node types is inserted (short)** — a candidate meaning for our undecoded
9-byte preamble `00 e6 00 00 00 00 00 0c 23`.

Retained regardless: `binary − text == SolidWorks face count` on 24/24 modern pairs, delta 0 on
25/25 legacy. That is our measurement and stands on its own.

## 4. Predictions to test, in priority order

Each is falsifiable on the corpus we already hold. Report confirmed / falsified /
untestable-here, with counts over 24 SW2022 + 25 SW2011 + 21 original partitions.

| # | prediction | status |
|---|---|---|
| a | `C/D/I/A` are edit opcodes; opcode counts track field-count deltas against base 13006 |
| b | `255` = "type matches base schema exactly" |
| c | our "code" is `ptr_class`; values match the spec's node-class table |
| d | trailing `d`/`u`/`l` are type letters, present iff `ptr_class == 0` → closes NQ-042 |
| e | `Z` is not a record boundary → re-pose NQ-043 | **CONFIRMED (EXP-067)** |
| f | `highest_node_id` (BODY/ASSEMBLY), `highest_id`/`current_id` (WORLD) are the real ceilings | **CONFIRMED (EXP-067)** — 49/49 |
| g | 9-byte preamble contains max-node-types as a short |
| h | field type `b` = box, 6 doubles, non-PK ordering — cross-check against INV-026 |

## 5. Other public primary sources found

- **SolidWorks API docs** (`help.solidworks.com`, free, no login): persistent reference IDs —
  and SolidWorks itself documents that the byte array **may differ for the same reference**, so
  it cannot be byte-compared for identity. `IFace2::GetTessTriangles` (display quality only, the
  docs say so explicitly). `IBody2::GetBodyBox`. A configuration-level bounding box property was
  **not** confirmed — relevant to NQ-046, worth checking directly.
- **"Cut-Extrude" naming/numbering is NOT documented anywhere.** EXP-065's finding stays
  empirical, and note feature names are localised in non-English installs.
- Patents are a clean citable source: US 2014/0184598 A1 / US 9,875,577, Dassault Systèmes,
  tessellation of a parameterised 3D modelled object. Assigned to the CATIA parent, so relevance
  to SLDPRT is plausible but unverified.
- Okino publish a hand-decoded annotated XT sphere — a ready-made first test vector.
- Siemens ship a **free Parasolid model viewer** — usable as an independent oracle.

## 6. Housekeeping found on the way

`parasolid/v0.1/README.md` is **stale** and should be corrected independently of any of the
above. It still states the `u16be` flag as established, still reports the "24/24, 168 entries"
headline EXP-059 §2 showed is n=1, and still says the reader stops at 7 entries "where the text
form has 19" — corrected to a contiguous prefix of 13 in EXP-059 §1.1. The source and the test
were updated; the README was not.


---

## 7. Results so far

**(e) and (f) are confirmed** on our own corpus by [EXP-067](evidence/2026-09-22_v0.5-EXP067.md):
`Z` ends a schema-delta edit script, and the value after it is `BODY.highest_node_id`, with
`res_size`/`res_linear` following a fixed number of pointer fields later — 49/49 across both eras,
and SW2011's struct matching the 2006 spec field-for-field. **NQ-043 is answered.**

Two further spec facts, recorded here because they answer questions raised elsewhere and are
cheap to test whenever someone reaches them:

- **Logical values are written `T`/`F` in text, and `c`/`l` fields are NOT followed by a space.**
  So a run like `FFFFTFTFFFFFF` is a sequence of logical fields, and a bare letter immediately
  followed by digits (`V0`, `S74`, `+0`) is a **char field** running straight into the next
  numeric field. The spec's worked example shows exactly this: `19 6 5 0 1 0 0 3 V` (region) and
  `17 ... 0 0 +` / `17 ... 0 0 -` (fins).
- **`?` marks an unset/null value** — the spec: two sentinel values (−32764 integral, −3.14158e13
  floating point) "are represented in a text transmit file as the question mark". A null vector
  prints as a single `?`.
- **Variable-length nodes** carry their element count between the nodetype and the index, so an
  attribute-definition name reads `<nodetype> <n_elts> <index> <chars>` — the spec's example is
  `79 15 16 SDL/TYSA_COLOUR`, i.e. type 79, 15 characters, index 16, then the name.
- **Node type numbers** from the worked example: 1 terminator, 12 body, 13 shell, 14 face,
  15 loop, 16 edge, 17 fin, 19 region, 31 circle, 50 plane, 70 list, 74 pointer_lis_block,
  79 att_def_id, 80 attrib_def, 81 attribute, 83 real_values.
