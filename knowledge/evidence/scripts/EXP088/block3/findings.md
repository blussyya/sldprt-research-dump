# Block3: nonzero samples and what they rule out

Draft for review, 2026-11-04. No converter change is proposed yet.

The expanded corpus has nonzero Block3 bytes. The old statement that every byte seen is zero
is no longer true. The original and controlled files in this run remain all zero.

## What was checked

Run `node survey.js` from this directory. It walks the three corpus folders recursively and
records each file's SHA-256. It reads the raw display stream, checks every accepted Block3
array against its raw header and bytes, and also searches for raw `[1,8,2,N]` array headers
outside accepted faces. The latter is a check against silently excluding nonzero samples,
not an independent proof of the whole face grammar.

| folder | files | accepted faces | Block3 bytes | nonzero bytes |
|---|---:|---:|---:|---:|
| original | 24 | 1,475 | 129,724 | 0 |
| controlled/new, including additional files | 56 | 347 | 95,304 | 0 |
| online, including re-saves and not-a-part folder | 142 | 19,280 | 1,903,076 | 30,713 |

The 222 files have distinct SHA-256 hashes. Eighteen online files did not return display-list
bytes; their names and errors are retained in `summary.json`. Fourteen old faces have the
layout with no Block1/2/3 and contribute no bytes. There were no rejected face candidates and
no disagreements between raw Block3 bytes and parsed bytes in the streams read. Every raw
nonzero array candidate belonged to an accepted face.

There are 27 files with nonzero bytes, listed in `summary.json`. The only nonzero values are
1, 2 and 4. `survey.json` retains their offsets, face indices and corresponding Block1 words.

## The bytes follow Block1's roles

`node classify.js` checks every face in those 27 files, including their all-zero faces.

| position | byte | occurrences |
|---|---:|---:|
| first strip's control word | 1 | 2,690 |
| later strip's control word | 4 | 16,455 |
| nonzero edge label | 1 | 11,322 |
| nonzero edge label | 2 | 246 |

No interior zero-label position has a nonzero byte. No control position has byte 2. Byte 4
appears only at later strip controls. Within a face, later controls are all 0 or all 4; the
first control is 0 or 1. These are observed roles, not decoded meanings for the flags.

This rules out a description of Block3 as unused padding. It also gives a concrete way to
recognize the kinds of positions that need different interpretations. The values are powers
of two, but no combined value was observed, so a bit-mask interpretation is still a hypothesis.

## Tests of possible meanings

`node edges.js` compares flags across occurrences of the same display edge label. Of 1,838
labels with byte 1, 702 also occur with byte 0. Therefore byte 1 is not simply an invariant
property of an edge ID. Some IDs may be reused across bodies, and that needs care in interpreting
these counts. Matched endpoint normals differ by more than 0.01 rad for 372 flagged labels,
so calling byte 1 a universal smooth-edge marker is not supported either. Endpoint normals
are only a preliminary geometric check.

Byte 2 occurs on 14 display edge labels. `node topology.js` checks them against the selected
B-rep. Six labels match edges, and all six have one fin without an owning face. They are open
boundaries, not same-face seams. The other eight labels do not match an edge in the selected
B-rep, so they cannot support a general conclusion. Byte 1 also appears on both same-face
seams and ordinary cross-face edges. The seam interpretation is therefore rejected for byte 2
and is not specific enough for byte 1.

The topology check uses the existing body reader and ID correspondence. It does not establish
why the eight labels are unmatched or prove a universal open-boundary rule. The files, offsets
and rows are retained so another reader can challenge those matches.

## What would settle the semantics

Use these nonzero files now; a new nonzero sample is no longer the blocker. The next useful
check is a controlled re-save that changes one display setting at a time, with no geometric
edit, and records the exact setting. Candidate settings are tangent-edge display, hidden
edges and face visibility. Those are experiments to run, not established meanings.

Before naming any flag, independently recover its positions from raw bytes, verify the
B-rep ownership for its edge labels, and compare a controlled pair. This run establishes the
nonzero data and its position rules. It does not yet decode the rendering or selection meaning.
