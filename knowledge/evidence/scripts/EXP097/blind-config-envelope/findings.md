# EXP097: blind check of the configuration-level bounds record

Scope: the 222 SLDPRT files in "test files original", "test files new" and "test files online".
Of these, 183 are modern containers and 39 are OLE2 (SW2011 and older). 166 modern files have a
DisplayLists stream; that is the claim's denominator. The 17 modern files without one are not
inspected. Converter code used: /home/user/dump-validation/package/src (read-only use).
Excluded by instruction: EXP064, EXP091, EXP092, EXP093 and any .claude/skills folder.

## Verdicts

1. **Holds.** The name rule finds exactly one record in 113 of 166 files. In 112 of them the
   record's box equals the union of the saved display-face bounds, to 1.1e-16 m. The exception
   is `test files online/2025/ac760485_存矿小端.SLDPRT`. Its box extends 4.412 mm further in -x and
   12.684 mm further in +z than the display union. The claim's wording holds with two caveats,
   given in the Parasolid section below.
   - Caveat on the "8 bytes" wording: the name's last 8 bytes overlap the record's first 8 bytes.
     The box centre sits 4 bytes after the name ends. The claim's literal wording is correct.
     The record's 12-byte header is therefore the name's tail, not the 0,0,1 header that face
     records carry.

2. **Partly holds.** The two extra arithmetic boxes in Dekor and Helical Bevel Gear are real.
   They pass the same box arithmetic, carry no name, and do not equal the display union.
   But the pattern is not limited to those two files:
   - Two more named files carry a second unnamed box: `d8206ed0_J6_Flange_Adapter.SLDPRT` and
     `daa6e9e9_CR26-201-08.SLDPRT`.
   - Eight unnamed boxes sit in files with no name record. These are the Facemask, Mounting Ring,
     Socket Head Screws, Face Block Middle Left, Slope Panels, and the three zero-face
     LocalBodies files (Tower Base Angle, Pulley, Rod).
   - The "47 records in 45 files" set could not be reproduced exactly. The closest set is the
     21 "test files original" modern files plus the 25 "test files new/SW2022" files. It has 46
     files, 46 named records, and exactly two unnamed look-alikes (Dekor and Helical). If the
     claim's 45 files are this set minus one file, each file has exactly one named record, so
     the real count is 45 and the look-alikes account for the 47.

3. **Holds.** The first name record is at declared version 13000. The 42 files at 12000 or below
   have none. Of the 124 files at 13000 or later, 113 have one. The 8 omissions with display
   faces all have a LocalBodies stream or more than one configuration. Seven have LocalBodies:
   3c4752f1, 03764871 BME280, d0d61cde, ef1d5cfe DS3231, a4ecc6f5, 05d0b4c3 and 6fd68589. Two have
   more than one configuration: d0d61cde (2) and c613782b (4, no LocalBodies).
   - Caveat: three more 13000+ files with zero faces (Tower Base Angle, Pulley, Rod) also lack a
     name record, and all three have LocalBodies. They are outside the 8.
   - Caveat: the arithmetic test alone does give unnamed boxes at or below 12000 (Facemask,
     Mounting Ring, Face Block, Slope Panels, Socket Head Screws at 10000). So "never has it" is
     a claim about the named record, not about every box with that arithmetic.

## Parasolid check for the exception file (ac760485)

- Config-0-Partition body, POINT vertices: x from -2.8e-17 to 0.154117 m; y from -0.000499 to
  0.083910 m; z from -3.8e-17 to 0.100000 m.
- Config-0-GhostPartition: 2 points, both at the origin.
- Record box: min x -0.004412 m; max z 0.112684 m; y and min z match the display.
- Display union: x 0 to 0.15, y 0 to 0.06, z 0 to 0.1 m.
- Caveat 1: POINT vertices do not bound curved surfaces exactly, so this is a point-level check.
- Caveat 2: the deltas section (Config-0-Partition, section 1) fails to parse ("missing base
  schema for node type 3"). So "every readable section" leaves out one section, and the record
  could come from there.

## Blind scan results

- Arithmetic test: the box centre is the midpoint of min and max; the radius equals the corner
  distance; min is at most max; the box size is between 1 micron and 10 km; the tolerance is
  relative to the size.
- All 19,201 face boxes from the converter pass, and the scan finds exactly the converter's face
  count in every file (0 mismatches).
- The blind scan finds 125 non-face candidates in 121 files:
  - 113 candidates carry the name rule (the name ends at record start + 8).
  - 12 candidates carry no name.
- Unnamed candidates sit 342 to 414 bytes before the end of the DisplayLists stream. Named
  records sit 859 to 8076 bytes before the end, median 915. The unnamed boxes are therefore not
  at the place where configuration records sit.
- No unnamed candidate equals the display union. So the blind search finds no record that the
  name rule misses.
- Name rule gap histogram: every match has its name end at record start + 8 (113 of 113). No
  other gap appears in the search window of -40 to +24 bytes.

## Controls

- C1, face boxes as negative control: 0 of 19,201 face bounding records have a printable MFC name
  ending at record start + 8.
- C2, shifted-gap null: among 19,326 arithmetic-pass boxes, the true gap gives 113 name matches.
  The 128 shifts from -64 to +64 (excluding 0) give 1 match in 2,473,728 tests.
- C3, random-byte null: same-length random buffers over the 166 files (54,230,352 bytes) give 0
  arithmetic hits.
- C4, rejected-face audit: 7 faces are rejected in 3 files. Two of those files have a named record
  equal to the union, so rejected faces do not break the union check. The third file
  (`4febfc67_6344149`) is version 3800 and has no name record.

## Scripts (all in /home/user/dump-validation/knowledge/evidence/scripts/EXP097/blind-config-envelope/)

- 01-inventory.js: corpus inventory, writes inventory.json.
- boxtest.js: the arithmetic box test. Shared by the scripts below.
- 02-explore.js, 02b-explore.js: first exploration. These used an absolute tolerance and produced
  false hits in a sketch file with no faces. Superseded; kept for the record.
- 02c-check.js, 02e-check.js: checks the test against the converter's face bounds.
- 02d-values.js, 02f-extra.js: value dumps and the first named candidate (C04 cube).
- 03-blind-scan.js: blind scan over the 166 files, writes scan.json.
- 04-unnamed.js: bytes before unnamed candidates, writes unnamed.json.
- 05-parasolid.js: Parasolid section point boxes for one file.
- 06-controls.js: controls C1 to C3, writes controls.json.
- 07-unnamed-location.js: position of unnamed candidates, writes unnamed-location.json.
- 08-tail.js: tail positions, named versus unnamed.
- 09-union-audit.js: rejected-face and null-bounds audit.

## What I could not check

- The exact 45-file set behind "47 records in 45 files". Only a close reconstruction was tested.
- The earlier counting method that gave 47.
- Whether the named record belongs to configuration 0 in multi-configuration files.
- What the record is used for. The claims do not say, and I did not test it.
- The 17 modern files with no DisplayLists stream. They are outside the denominator.
- The deltas section of ac760485, which does not parse.
- Whether POINT vertices bound the body exactly, for curved faces.
- Whether the name strings are configuration names. I did not check them against a configuration
  table; they look like configuration names (Default, Défaut, 默认, and others).
