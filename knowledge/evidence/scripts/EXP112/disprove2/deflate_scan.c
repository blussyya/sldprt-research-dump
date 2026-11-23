/* Brute-force raw-DEFLATE scan: try to inflate from every byte offset of a file and print every
 * offset where a complete raw deflate stream (reaching Z_STREAM_END) produces at least MINOUT bytes.
 *
 * No header, no signature, no directory is assumed. Output lines:
 *   offset  consumed_in  produced_out  crc32_of_output  first_byte_of_input
 *
 * build: gcc -O2 -o deflate_scan deflate_scan.c -lz
 * usage: deflate_scan FILE [MINOUT=32]
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <zlib.h>

int main(int argc, char **argv) {
    if (argc < 2) { fprintf(stderr, "usage: %s FILE [MINOUT]\n", argv[0]); return 2; }
    long minout = argc > 2 ? atol(argv[2]) : 32;
    FILE *f = fopen(argv[1], "rb");
    if (!f) { perror(argv[1]); return 2; }
    fseek(f, 0, SEEK_END); long n = ftell(f); fseek(f, 0, SEEK_SET);
    unsigned char *d = malloc(n ? n : 1);
    if (fread(d, 1, n, f) != (size_t)n) { perror("read"); return 2; }
    fclose(f);
    static unsigned char out[1 << 16];
    const long CAP = 64L << 20;   /* stop following a stream after 64 MB of output */
    z_stream s; memset(&s, 0, sizeof s);
    if (inflateInit2(&s, -15) != Z_OK) return 3;
    long hits = 0;
    for (long o = 0; o < n; o++) {
        inflateReset(&s);
        s.next_in = d + o; s.avail_in = (uInt)(n - o);
        long total = 0; uLong crc = crc32(0L, Z_NULL, 0);
        int r;
        for (;;) {
            s.next_out = out; s.avail_out = sizeof out;
            r = inflate(&s, Z_NO_FLUSH);
            long got = (long)(sizeof out - s.avail_out);
            if (got) { crc = crc32(crc, out, (uInt)got); total += got; }
            if (r == Z_STREAM_END || r == Z_DATA_ERROR || r == Z_MEM_ERROR || r == Z_NEED_DICT) break;
            if (r == Z_BUF_ERROR && got == 0) break;          /* input ran out */
            if (s.avail_in == 0 && got == 0) break;
            if (total > CAP) break;
        }
        if (r == Z_STREAM_END && total >= minout) {
            long used = (long)(n - o) - (long)s.avail_in;
            printf("%ld %ld %ld %08lx %02x\n", o, used, total, crc, d[o]);
            hits++;
        }
    }
    inflateEnd(&s);
    fprintf(stderr, "%s size=%ld hits=%ld\n", argv[1], n, hits);
    return 0;
}
