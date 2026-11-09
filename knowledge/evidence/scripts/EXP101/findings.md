# EXP101: LocalBodies flag against BODY_IN_LIGHTWEIGHT_PERM

## Verdict

**Holds.** On the 281 LocalBodies entries, flag 1 occurs exactly on the entries whose
BODY_IN_LIGHTWEIGHT_PERM value decodes to 0 (8 of 8). No entry with flag 0 decodes to 0.
The 8 flag-0 entries without the attribute are reported separately below; the claim does not cover them.

## Counts (281 entries, 41 LocalBodies streams in 40 files)

| flag | BODY_IN_LIGHTWEIGHT_PERM value | entries |
|---|---|---|
| 1 | 0 | 8 |
| 0 | 1 | 265 |
| 0 | attribute missing | 8 |
| 0 | 0 | 0 |
| 1 | 1 or missing | 0 |

Flag byte values seen: 0 (273 entries), 1 (8). Per-entry rows: `entries.csv` in this folder.
Header counts summed over the 41 streams give 281, matching the entry count.

## Method (what I did)

1. Stream bytes: `partition.streams()` from the converter, used only to get the raw bytes of each `LocalBodies` stream. Written to `work/lb/`.
2. Section frame (own reader, `sections.js`): u32 size, GUID `231dd571...`, zlib chunks (u32 inflated, u32 compressed), 8 zero bytes. Every chunk inflated to its stated size.
3. Entry split (`entries.js`): each entry is `ff fe ff`, u8 char count, UTF-16LE name, a gap, u32 length (= section size + 5), a 00 byte, then the section. 289 sections in total: 281 start with a name header. The other 8 (lb04 section 1, lb36 sections 1 to 7) are full transmit payloads with no name header, and each stream's header count (1) says there is one entry. They are excluded.
4. Flag (`final_table.js`): byte 5 before each entry's length field. Values 0 and 1 only.
5. Attribute (`attr_value.js`): the definition is a node `00 4f`, u32 name length 24, u16 id, then the ASCII name. The instance is a node `00 50`, u32 count 2, then pointers; its third pointer is the definition id. The value is the first `00 52` record after the instance (`00 52`, u32 1, pointer, u32 value). In two large payloads (lb11, lb27) the ids and pointers are 4 bytes wide; `final_table.js` takes the value field whose end is followed by a record marker.

## Controls

- **Byte edit (`controls.js`, C2):** lb00 value byte 1 -> 0 changes the decoded value from 1 to 0.
- **Broken link (C3):** the definition id in the instance record +1 makes the reader report no instance.
- **Other attributes (C4):** the same reader gives ATOM_ID_2001 = 101, LAST_BODY_MODIFYING_FEATURE_ID = 17, ENT_TIME_STAMP_2001 = 291 on lb01 entry 0. These are plausible integers, not the flag target.
- **Flag flip (C5):** lb01 entry 0 flag byte 1 -> 0 changes the flag reading.
- **Two readers agree:** where the value record sits directly before the definition (254 entries), the adjacency reading equals the instance reading in all 254 cases.
- **Missing check (C1):** the 8 entries without the attribute contain no `BODY_IN_LIGHTWEIGHT_PERM` in ASCII, nor `LIGHTWEIGHT` in ASCII or UTF-16.
- **Count check:** flag 1 count 8 and flag 0 count 273 match the claim's numbers exactly (273 = 265 + 8).

## Caveats and what I did not check

- **Flag position was chosen by pattern.** I picked byte lenPos-5 because it gave 8 ones, which is the number in the claim. So the 8-count is not an independent check. The independent check is the agreement of the flag with the decoded attribute value, which holds on all 8 + 265 entries.
- **Possible contamination.** Before writing my own framing, I read the first 80 lines of `partition.js` in the converter (its header comment states the frame and the attribute claim). I did not use its code, but I did read its description of the frame, and I should say so.
- **Not decoded.** I did not parse the Parasolid schema or the full node grammar. The value rule is a layout rule read from the bytes (instance then value). It is checked by the flag agreement and the controls, not by a schema.
- **Owner link not checked.** I did not confirm that the value record's owner pointer refers to the body in that entry. The pointers in the value records do not match body ids in a simple way.
- **Missing attribute.** The 8 entries with flag 0 and no attribute: the claim does not say what they should be. They are not counted as value 0.
- **No blind agents run.** This check was run alone, as asked by the caller, not as a prove and disprove pair.
- **Not read:** `/home/user/dump-validation/knowledge/evidence/` outside this folder. No git commands.

## Files

- `entries.csv`: one row per entry (281 rows)
- `final_table.js`, `final_rows.json`: cross-tab and per-entry data
- `attr_value.js`, `entries.js`, `sections.js`: readers
- `controls.js`: controls
- `work/lb/`: raw LocalBodies stream bytes and `index.json` (the stream bytes come from the converter's stream loader)
