# EXP-079..082 working helpers

Small scripts used while decoding; paths inside assume the dump repo layout.

- `all.sh`, `all11.sh`: run probe.js on every SW2022 / SW2011 controlled model.
- `pair.sh NAME`: field-trace the SW2022 and SW2011 copies of one controlled model and diff them (uses `tdiff.py`).
- `tdiff.py A B`: diff two fieldtrace outputs field by field.
- `inv.js`: stream inventory (length, MD5) of C22 / C23 / C24.
- `st.js`, `bytes.js`, `c0.js`, `hx.js`: hex dumps of one stream.
- `ann.js`, `f64s.js`: annotate a byte range as strings / u32 / f32 / f64.
