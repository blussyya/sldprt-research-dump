#!/usr/bin/env python3
"""Controls for the LocalBodies grammar, the CFB reader and the modern scanner.

Part A: synthetic streams built from the grammar. A round trip must parse to the built
        structure; each deliberate mutation must raise ParseError.
Part B: every real LocalBodies stream (41) run through mutations that must fail:
        truncated by 1 byte, truncated to half, shifted by one byte (wrong offset),
        entry count +1 and -1, appended byte, GUID byte flipped, zlib byte flipped.
Part C: container controls: CFB signature corrupted, CFB truncated, modern scanner with a
        wrong rotation key, modern stream with a flipped deflate byte (must drop or CRC-fail).
Writes results to SCRATCH/controls.json and prints a summary.
"""
import json, os, struct, sys, zlib, random
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import parse_localbodies as P
import cfb as CFBMOD
import modern as MOD

SCR = "/tmp/claude-0/-home-user/c2f6f8eb-69df-510d-ae4a-5c22d3da6c6b/scratchpad/exp097"
GUID = P.GUID


def enc_cstring(name):
    u16 = name.encode("utf-16-le")
    assert len(name) < 0xFF
    return b"\xff\xfe\xff" + bytes([len(name)]) + u16


def rec10(flag, sp5):
    return struct.pack("<I", flag) + b"\x00" + struct.pack("<I", sp5) + b"\x00"


def section(pieces):
    """pieces: list of raw byte strings, one zlib chunk each."""
    inner = b""
    for p in pieces:
        z = zlib.compress(p, 9)
        inner += struct.pack("<II", len(p), len(z)) + z
    inner += b"\x00" * 8
    S = 16 + len(inner)
    return struct.pack("<I", S) + GUID + inner, S


def entry(name, kind, flag, sections):
    """sections: list of lists of chunk payloads (one inner list per section)."""
    out = enc_cstring(name)
    built = []
    for pieces in sections:
        sec, S = section(pieces)
        built.append((sec, S))
    if kind == 18:
        out += struct.pack("<I", 0) + struct.pack("<I", len(sections))
    # first section header
    out += rec10(flag, built[0][1] + 5)
    out += built[0][0]
    for sec, S in built[1:]:
        out += rec10(0, S + 5) + sec
    return out


def stream(entries):
    return struct.pack("<I", len(entries)) + b"".join(entries)


def payload(seed, n):
    rnd = random.Random(seed)
    return bytes(rnd.getrandbits(8) for _ in range(n))


results = []


def check(label, ok, detail=""):
    results.append(dict(label=label, ok=bool(ok), detail=detail))
    print(("PASS " if ok else "FAIL ") + label + ("  " + detail if detail else ""))


def must_fail(label, b):
    try:
        P.parse(b)
    except P.ParseError as ex:
        check(label, True, "rejected: " + str(ex)[:110])
        return
    except Exception as ex:  # an unexpected exception type is also a rejection, but flag it
        check(label, True, "rejected (other exception %s): %s" % (type(ex).__name__, str(ex)[:90]))
        return
    check(label, False, "parser accepted a corrupted stream")


def must_pass(label, b):
    try:
        r = P.parse(b)
        check(label, True, "accepted; entries=%d" % len(r["entries"]))
        return r
    except P.ParseError as ex:
        check(label, False, "rejected: " + str(ex))


# ---------------- Part A: synthetic round trip ----------------
A_entries = [
    entry("Imported1", 10, 0, [[payload(1, 3000)]]),                          # 10-byte, 1 section
    entry("Body Two", 18, 1, [[payload(2, 500)], [payload(3, 900)]]),         # 18-byte, 2 sections
    entry("Chunky", 18, 0, [[payload(4, 4096), payload(5, 4096), payload(6, 77)]]),  # 18-byte, 3 chunks
]
A = stream(A_entries)
r = must_pass("A0 synthetic round trip parses", A)
if r:
    exp = dict(entry_count=3, names=["Imported1", "Body Two", "Chunky"],
               headers=[10, 18, 18], flags=[0, 1, 0], nsec=[1, 2, 1], chunks=[1, 1, 3])
    got = dict(entry_count=r["entry_count"], names=[e["name"] for e in r["entries"]],
               headers=[e["header"] for e in r["entries"]], flags=[e["flag"] for e in r["entries"]],
               nsec=[e["n_sections"] for e in r["entries"]],
               chunks=[len(e["sections"][0]["chunks"]) for e in r["entries"]])
    check("A0b synthetic structure matches what was built", got == exp, json.dumps(got))
    body_ok = b"".join(s["body"] for s in r["entries"][2]["sections"]) == payload(4, 4096) + payload(5, 4096) + payload(6, 77)
    check("A0c synthetic chunk payload round-trips byte for byte", body_ok)

must_fail("A1 truncate synthetic stream by 1 byte", A[:-1])
must_fail("A2 truncate synthetic stream mid-section", A[: len(A) // 2])
must_fail("A3 shift synthetic stream by 1 byte (wrong offset)", A[1:])
must_fail("A4 entry count 3 -> 4", struct.pack("<I", 4) + A[4:])
must_fail("A5 entry count 3 -> 2 (leaves trailing bytes)", struct.pack("<I", 2) + A[4:])
must_fail("A6 append one byte", A + b"\x00")
must_fail("A7 flip CString marker FF -> FE", A[:4] + b"\xfe" + A[5:])
sp5_off = 4 + len(enc_cstring("Imported1"))
must_fail("A8 header size+5 field +1", A[:sp5_off + 5] + bytes([A[sp5_off + 5] ^ 1]) + A[sp5_off + 6:])
must_fail("A9 rec10 zero byte set to 1", A[:sp5_off + 4] + b"\x01" + A[sp5_off + 5:])
g_off = A.find(GUID)
must_fail("A10 GUID byte flipped", A[:g_off + 3] + bytes([A[g_off + 3] ^ 0xFF]) + A[g_off + 4:])
must_fail("A11 section tail: last zero byte set to 1", A[:-1] + b"\x01")
z_off = A.find(GUID) + 24  # zlib header of the first chunk, after GUID + inflated + deflated fields
assert A[z_off] == 0x78
must_fail("A12 zlib body byte flipped", A[:z_off + 10] + bytes([A[z_off + 10] ^ 0x55]) + A[z_off + 11:])
# 18-byte count of Body Two: 2 -> 3
# locate the 18-byte header of Body Two directly by rebuilding offsets
off_body2 = 4 + len(entry("Imported1", 10, 0, [[payload(1, 3000)]]))
cnt_off = off_body2 + len(enc_cstring("Body Two")) + 4
must_fail("A13 18-byte section count 2 -> 3", A[:cnt_off] + struct.pack("<I", 3) + A[cnt_off + 4:])
between_off = off_body2 + len(enc_cstring("Body Two")) + 18 + len(section([payload(2, 500)])[0])
must_fail("A14 between-section record flag 0 -> 1", A[:between_off] + struct.pack("<I", 1) + A[between_off + 4:])
must_pass("A15 control: flag 0 -> 1 in the first header (grammar does not constrain flag)",
          A[:sp5_off] + struct.pack("<I", 1) + A[sp5_off + 4:])
renamed = stream([entry("RenamedBody", 10, 0, [[payload(1, 3000)]])] + A_entries[1:])
must_pass("A16 control: renamed entry still parses (names are not constrained)", renamed)

# ---------------- Part B: every real LocalBodies stream ----------------
m = json.load(open(os.path.join(SCR, "manifest.json")))
mut_names = ["B1 real: truncate 1 byte", "B2 real: truncate to half", "B3 real: shift 1 byte (wrong offset)",
             "B4 real: entry count +1", "B5 real: entry count -1", "B6 real: append 1 byte",
             "B7 real: GUID byte flipped", "B8 real: zlib byte flipped (first section)"]
tally = {n: [0, 0] for n in mut_names}  # [rejected, total]
baseline_ok = 0
other_exc = []
for s in m["streams"]:
    b = open(os.path.join(SCR, s["out"]), "rb").read()
    try:
        P.parse(b); baseline_ok += 1
    except P.ParseError:
        pass
    n_count = struct.unpack_from("<I", b, 0)[0]
    g = b.find(GUID)
    # first zlib header after the GUID
    zb = b.find(b"\x78", g + 24)
    muts = [
        b[:-1],
        b[: len(b) // 2],
        b[1:],
        struct.pack("<I", n_count + 1) + b[4:],
        struct.pack("<I", n_count - 1) + b[4:],
        b + b"\x00",
        b[:g + 3] + bytes([b[g + 3] ^ 0xFF]) + b[g + 4:],
        b[:zb + 5] + bytes([b[zb + 5] ^ 0x5A]) + b[zb + 6:],
    ]
    for name, mb in zip(mut_names, muts):
        tally[name][1] += 1
        try:
            P.parse(mb)
        except P.ParseError:
            tally[name][0] += 1
        except Exception as ex:
            tally[name][0] += 1
            other_exc.append((name, type(ex).__name__))
for n in mut_names:
    rej, tot = tally[n]
    check(n + " rejected for all real streams", rej == tot, "%d/%d rejected" % (rej, tot))
check("B9 real mutations: exceptions other than ParseError", not other_exc, str(other_exc[:5]) if other_exc else "none")
check("B0 real streams: unmutated parse accepted", baseline_ok == len(m["streams"]),
      "%d/%d" % (baseline_ok, len(m["streams"])))

# ---------------- Part C: container controls ----------------
cfb_path = "/home/user/dump-validation/test files online/2017/4df87793_21BC-S 1.19-A.sldprt"
raw = open(cfb_path, "rb").read()
bad = b"\x00" + raw[1:]
try:
    CFBMOD.CFB(bad); check("C1 CFB: corrupted signature rejected", False)
except CFBMOD.CFBError as ex:
    check("C1 CFB: corrupted signature rejected", True, str(ex))
half = raw[: len(raw) // 2]
got_full = False
try:
    cfb_half = CFBMOD.CFB(half)
    try:
        got_full = len(cfb_half.stream_by_path("/Config-0-FeatureBodies/LocalBodies")) == 1930
    except Exception:
        got_full = False  # read past end of file is a detected failure
except CFBMOD.CFBError:
    got_full = False      # header or FAT beyond end is a detected failure
check("C2 CFB: half-truncated file does not yield the full LocalBodies stream", not got_full)

mpath = "/home/user/dump-validation/test files original/Dekor.SLDPRT"
mb = open(mpath, "rb").read()
st_ok, _ = MOD.scan(mb)
check("C3 modern: correct key finds the Dekor streams (baseline)", len(st_ok) > 30, "%d streams" % len(st_ok))
wrong = bytearray(mb); wrong[7] = (wrong[7] + 1) & 0xFF
st_wrong, stats_w = MOD.scan(bytes(wrong))
check("C4 modern: wrong rotation key loses named streams", len(st_wrong) < len(st_ok),
      "wrong key %d names vs %d correct; non-printable %d" % (len(st_wrong), len(st_ok), stats_w["nonprintable_names"]))
# flip a deflate byte inside the LocalBodies stream of the 2024/ a4ecc6f5 file
lb_file = "/home/user/dump-validation/test files online/2024/a4ecc6f5_PP-2074-08.SLDPRT"
lb = open(lb_file, "rb").read()
st_lb, _ = MOD.scan(lb)
name_lb = [k for k in st_lb if k.endswith("LocalBodies")][0]
data_lb = st_lb[name_lb]
# find the compressed bytes of that stream: search for its deflate start is hard; instead corrupt
# the stored inflated bytes' source by flipping a byte near the middle of the file where that
# stream's compressed payload is, found by re-deflating and locating it.
comp = zlib.compressobj(9, zlib.DEFLATED, -15)
# Simpler control: flip a byte at the start of the compressed payload of the first 0x14 record
sig_pos = [i for i in range(len(lb)) if lb[i:i + 6] == MOD.SIG and i >= 4]
hit = False
for p in sig_pos:
    sig = p - 4
    comp_size = struct.unpack_from("<I", lb, sig + 18)[0]
    nlen = struct.unpack_from("<I", lb, sig + 26)[0]
    name = "".join(chr(MOD._rotl(c, lb[7] & 7)) for c in lb[sig + 30:sig + 30 + nlen])
    if name == name_lb and comp_size > 10:
        ds = sig + 30 + nlen
        mut = bytearray(lb); mut[ds + 4] ^= 0xFF
        st_m, stats_m = MOD.scan(bytes(mut))
        gone = name_lb not in st_m
        check("C5 modern: flipped deflate byte drops the LocalBodies stream (CRC or inflate)", gone,
              "stats: inflate_reject=%d size_reject=%d crc_fail=%d" % (stats_m["rejected_inflate"], stats_m["rejected_size"], len(stats_m["crc_fail"])))
        hit = True
        break
if not hit:
    check("C5 modern: flipped deflate byte drops the LocalBodies stream", False, "record not located")

out = dict(results=results, n_pass=sum(1 for r_ in results if r_["ok"]), n_total=len(results))
json.dump(out, open(os.path.join(SCR, "controls.json"), "w"), indent=1, ensure_ascii=False)
print("controls: %d of %d as expected" % (out["n_pass"], out["n_total"]))
