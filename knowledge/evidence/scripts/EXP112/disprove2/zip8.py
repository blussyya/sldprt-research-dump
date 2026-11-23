"""Independent reader for the claimed 'ZIP from byte 8' layout of modern SLDPRT files.

Written from the claim text only. Nothing here assumes the record signatures: end records are
found by brute force over every byte position, and the local and central records are read at
the offsets the directory gives.

Field layouts are the standard ZIP ones (APPNOTE 4.3.7, 4.3.12, 4.3.16):
  local   : sig ver flags method time date crc csize usize nlen elen | name extra data   (30)
  central : sig vmade vneed flags method time date crc csize usize nlen elen clen disk
            iattr eattr lhoff | name extra comment                                       (46)
  end     : sig disk cdisk ndisk ntotal cdsize cdoff clen | comment                      (22)
"""
import struct, zlib
import numpy as np

LOC = struct.Struct('<4sHHHHHIIIHH')            # 30
CEN = struct.Struct('<4sHHHHHHIIIHHHHHII')      # 46
END = struct.Struct('<4sHHHHIIH')               # 22


def rotl8(b, r):
    r &= 7
    return ((b << r) | (b >> (8 - r))) & 0xFF if r else b


_UNROT = [bytes(rotl8(b, 8 - r) for b in range(256)) for r in range(8)]
_PRINT = bytes(range(32, 127))


def unrotate(raw, r):
    """Undo a left rotation by r bits: rotate right by r == rotate left by 8-r."""
    return bytes(raw).translate(_UNROT[r & 7])


def printable(bs):
    return len(bs) > 0 and not bs.translate(None, _PRINT)


def rotations_that_print(raw):
    """Every left-rotation amount r (0..7) such that undoing it gives printable ASCII."""
    return [r for r in range(8) if printable(unrotate(raw, r))]


def inflate_exact(buf):
    """Raw-inflate buf. Returns (ok_end, out, unused_len, err)."""
    d = zlib.decompressobj(-15)
    try:
        out = d.decompress(buf)
        out += d.flush()
    except zlib.error as e:
        return False, b'', None, str(e)
    return d.eof, out, len(d.unused_data), None


def _u32_all(data):
    """u32 little-endian at every position 0..n-4 (numpy, int64)."""
    a = np.frombuffer(data, dtype=np.uint8).astype(np.int64)
    m = len(a) - 3
    return a[:m] | (a[1:m + 1] << 8) | (a[2:m + 2] << 16) | (a[3:m + 3] << 24)


def _u16_all(data):
    a = np.frombuffer(data, dtype=np.uint8).astype(np.int64)
    m = len(a) - 1
    return a[:m] | (a[1:m + 1] << 8)


def end_candidates(data, base):
    """Every position q where q == base + cdoff(q) + cdsize(q), no shape assumed."""
    n = len(data)
    u32 = _u32_all(data)
    qs = np.arange(0, n - 21, dtype=np.int64)
    cs = u32[qs + 12]
    co = u32[qs + 16]
    return [int(q) for q in qs[qs == base + co + cs]]


def end_shaped(data):
    """Blocks shaped like an end record, any signature: disk==cdisk==0, ndisk==ntotal>0,
    and the directory it describes lies inside the file for base 0 or base 8."""
    n = len(data)
    u32 = _u32_all(data); u16 = _u16_all(data)
    qs = np.arange(0, n - 21, dtype=np.int64)
    m = ((u16[qs + 4] == 0) & (u16[qs + 6] == 0) & (u16[qs + 8] == u16[qs + 10]) &
         (u16[qs + 10] > 0) & (u32[qs + 12] > 0) & (u32[qs + 16] + u32[qs + 12] + 8 <= n))
    return [int(q) for q in qs[m]]


def walk(data, eoc, base=8):
    """Read the end record at eoc and walk its directory with offsets counted from base.
    Returns dict with entries and a list of problems."""
    n = len(data)
    probs = []
    sig_e, dk, cdk, nd, nt, cs, co, clen = END.unpack_from(data, eoc)
    res = {'eoc': eoc, 'end_sig': sig_e.hex(), 'ntotal': nt, 'cdsize': cs, 'cdoff': co,
           'end_comment_len': clen, 'entries': [], 'problems': probs}
    p = base + co
    cen_sigs, loc_sigs = set(), set()
    for i in range(nt):
        if p + 46 > n:
            probs.append(f'central {i} runs past EOF'); break
        (csig, vmade, vneed, flags, meth, tm, dt, crc, csz, usz, nl, el, cl, disk, iat, eat,
         lho) = CEN.unpack_from(data, p)
        cen_sigs.add(csig)
        rawname = data[p + 46:p + 46 + nl]
        cextra = data[p + 46 + nl:p + 46 + nl + el]
        e = {'i': i, 'cen_pos': p, 'cen_sig': csig.hex(), 'vmade': vmade, 'vneed': vneed,
             'flags': flags, 'method': meth, 'time': tm, 'date': dt, 'crc': crc, 'csize': csz,
             'usize': usz, 'nlen': nl, 'celen': el, 'cclen': cl, 'disk': disk, 'iattr': iat,
             'eattr': eat, 'lhoff': lho, 'rawname': rawname.hex(),
             'rots': rotations_that_print(rawname)}
        p += 46 + nl + el + cl
        lp = base + lho
        e['loc_pos'] = lp
        if lp + 30 > n:
            e['err'] = 'local past EOF'; res['entries'].append(e); continue
        (lsig, lver, lfl, lmeth, ltm, ldt, lcrc, lcs, lus, lnl, lel) = LOC.unpack_from(data, lp)
        loc_sigs.add(lsig)
        lname = data[lp + 30:lp + 30 + lnl]
        e['loc_sig'] = lsig.hex()
        e['loc_elen'] = lel
        mism = []
        for k, a, b in (('ver', vneed, lver), ('flags', flags, lfl), ('method', meth, lmeth),
                        ('time', tm, ltm), ('date', dt, ldt), ('crc', crc, lcrc),
                        ('csize', csz, lcs), ('usize', usz, lus), ('nlen', nl, lnl)):
            if a != b:
                mism.append(f'{k} cen={a} loc={b}')
        if lname != rawname:
            mism.append('name bytes differ')
        e['cen_loc_mismatch'] = mism
        ds = lp + 30 + lnl + lel
        e['data_start'] = ds
        e['data_end'] = ds + lcs
        if ds + lcs > n:
            e['err'] = 'data past EOF'; res['entries'].append(e); continue
        blob = data[ds:ds + lcs]
        if meth == 8:
            ok, out, unused, err = inflate_exact(blob)
            e['inflate_end'] = ok
            e['inflate_err'] = err
            e['unused'] = unused
        elif meth == 0:
            out = blob; e['inflate_end'] = True; e['inflate_err'] = None; e['unused'] = 0
        else:
            out = b''; e['inflate_end'] = False; e['inflate_err'] = f'method {meth}'; e['unused'] = None
        e['out_len'] = len(out)
        e['size_ok'] = len(out) == usz
        e['crc_calc'] = zlib.crc32(out) & 0xFFFFFFFF
        e['crc_ok'] = e['crc_calc'] == crc
        res['entries'].append(e)
    res['cd_end'] = p
    res['cd_bytes_walked'] = p - (base + co)
    res['cen_sigs'] = sorted(s.hex() for s in cen_sigs)
    res['loc_sigs'] = sorted(s.hex() for s in loc_sigs)
    return res


def entry_ok(e):
    return (not e.get('err') and e.get('inflate_end') and e.get('unused') == 0 and e.get('size_ok')
            and e.get('crc_ok') and not e.get('cen_loc_mismatch'))
