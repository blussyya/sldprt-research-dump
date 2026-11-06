#!/usr/bin/env python3
"""Minimal OLE2 / Compound File Binary reader (MS-CFB), stdlib only.

Written from the MS-CFB layout: header, FAT, DIFAT, mini FAT, mini stream,
directory red-black tree. Used to pull named streams out of .sldprt files.
"""
import struct

MAGIC = bytes([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])
FREESECT = 0xFFFFFFFF
ENDOFCHAIN = 0xFFFFFFFE
FATSECT = 0xFFFFFFFD
DIFSECT = 0xFFFFFFFC
NOSTREAM = 0xFFFFFFFF


class CFBError(Exception):
    pass


class CFB:
    def __init__(self, data: bytes):
        self.data = data
        if len(data) < 512 or data[:8] != MAGIC:
            raise CFBError("not a CFB file (bad signature)")
        (minor, major) = struct.unpack_from("<HH", data, 24)
        if struct.unpack_from("<H", data, 28)[0] != 0xFFFE:
            raise CFBError("bad byte order mark")
        self.sector_shift = struct.unpack_from("<H", data, 30)[0]
        self.mini_shift = struct.unpack_from("<H", data, 32)[0]
        if self.sector_shift not in (9, 12):
            raise CFBError("bad sector shift %d" % self.sector_shift)
        if self.mini_shift != 6:
            raise CFBError("bad mini sector shift %d" % self.mini_shift)
        self.ssize = 1 << self.sector_shift
        self.mssize = 1 << self.mini_shift
        (self.n_fat_sectors,) = struct.unpack_from("<I", data, 44)
        (self.first_dir,) = struct.unpack_from("<I", data, 48)
        (self.mini_cutoff,) = struct.unpack_from("<I", data, 56)
        (self.first_minifat,) = struct.unpack_from("<I", data, 60)
        (self.n_minifat,) = struct.unpack_from("<I", data, 64)
        (self.first_difat,) = struct.unpack_from("<I", data, 68)
        (self.n_difat,) = struct.unpack_from("<I", data, 72)
        difat = list(struct.unpack_from("<109I", data, 76))
        # DIFAT chain: each DIFAT sector holds (ssize/4 - 1) FAT sector ids
        # and ends with the id of the next DIFAT sector.
        sec = self.first_difat
        seen = 0
        per = self.ssize // 4 - 1
        while sec not in (ENDOFCHAIN, FREESECT) and seen < self.n_difat:
            raw = self._sector(sec)
            vals = struct.unpack_from("<%dI" % (self.ssize // 4), raw, 0)
            difat.extend(vals[:per])
            sec = vals[per]
            seen += 1
        self.fat_sectors = [s for s in difat if s not in (FREESECT, ENDOFCHAIN)][: self.n_fat_sectors]
        fat = []
        for s in self.fat_sectors:
            raw = self._sector(s)
            fat.extend(struct.unpack_from("<%dI" % (self.ssize // 4), raw, 0))
        self.fat = fat
        self.minifat = []
        if self.n_minifat and self.first_minifat not in (ENDOFCHAIN, FREESECT):
            for s in self.chain(self.first_minifat):
                raw = self._sector(s)
                self.minifat.extend(struct.unpack_from("<%dI" % (self.ssize // 4), raw, 0))
        self._load_directory()

    def _sector(self, sid):
        off = (sid + 1) * self.ssize
        if off + self.ssize > len(self.data):
            raise CFBError("sector %d beyond end of file" % sid)
        return self.data[off: off + self.ssize]

    def chain(self, start):
        out = []
        sid = start
        limit = len(self.fat) + 2
        while sid not in (ENDOFCHAIN, FREESECT):
            if len(out) > limit:
                raise CFBError("FAT chain loop")
            if sid >= len(self.fat):
                raise CFBError("FAT index %d out of range" % sid)
            out.append(sid)
            sid = self.fat[sid]
        return out

    def read_regular(self, start, size=None):
        buf = b"".join(self._sector(s) for s in self.chain(start))
        return buf if size is None else buf[:size]

    def _load_directory(self):
        dir_raw = self.read_regular(self.first_dir)
        n = len(dir_raw) // 128
        self.entries = []
        for i in range(n):
            e = dir_raw[i * 128:(i + 1) * 128]
            name_len = struct.unpack_from("<H", e, 64)[0]
            name = e[:max(0, name_len - 2)].decode("utf-16-le", errors="replace") if name_len >= 2 else ""
            etype = e[66]
            left, right, child = struct.unpack_from("<III", e, 68)
            start = struct.unpack_from("<I", e, 116)[0]
            size = struct.unpack_from("<Q", e, 120)[0] & 0xFFFFFFFF  # v3: high dword ignored
            self.entries.append(dict(index=i, name=name, type=etype, left=left,
                                     right=right, child=child, start=start, size=size))
        root = self.entries[0]
        self.root_start = root["start"]
        self.ministream = b""
        if root["start"] not in (ENDOFCHAIN, FREESECT):
            self.ministream = self.read_regular(root["start"], root["size"])
        # Walk the tree to build full paths.
        self.paths = {}
        self._walk(root["child"], "", set())

    def _walk(self, idx, prefix, visiting):
        if idx == NOSTREAM or idx >= len(self.entries) or idx in visiting:
            return
        visiting.add(idx)
        e = self.entries[idx]
        self._walk(e["left"], prefix, visiting)
        path = prefix + "/" + e["name"]
        if e["type"] == 2:
            self.paths[path] = idx
        if e["type"] in (1, 5) and e["child"] != NOSTREAM:
            self._walk(e["child"], path, visiting)
        self._walk(e["right"], prefix, visiting)

    def stream_by_path(self, path):
        idx = self.paths[path]
        return self.read_stream_index(idx)

    def read_stream_index(self, idx):
        e = self.entries[idx]
        size = e["size"]
        if size < self.mini_cutoff:
            out = []
            sid = e["start"]
            limit = len(self.minifat) + 2
            while sid not in (ENDOFCHAIN, FREESECT):
                if len(out) > limit:
                    raise CFBError("mini FAT chain loop")
                out.append(self.ministream[sid * self.mssize:(sid + 1) * self.mssize])
                sid = self.minifat[sid]
            return b"".join(out)[:size]
        return self.read_regular(e["start"], size)


def find_streams(data: bytes, leaf_name: str):
    """Return list of (path, bytes) for every stream whose leaf name matches."""
    cfb = CFB(data)
    out = []
    for p in sorted(cfb.paths):
        if p.rsplit("/", 1)[-1] == leaf_name:
            out.append((p, cfb.stream_by_path(p)))
    return out, cfb


if __name__ == "__main__":
    import sys
    data = open(sys.argv[1], "rb").read()
    cfb = CFB(data)
    for p in sorted(cfb.paths):
        print(cfb.entries[cfb.paths[p]]["size"], p)
