# SLDPRT parser v0.3

Read modern and SW2011 legacy `.SLDPRT` display meshes, inspect them in 3D, and export the same six-view PNG sheet. External files are read locally in your browser; there is no upload endpoint or filename-to-corpus lookup.

## Open the app

From the repository root, with Node installed:

```sh
node parser/v0.3/serve.js --open
```

Or `cd parser/v0.3` then `npm start`. No installation or build step is required. Open **http://127.0.0.1:8080/parser/v0.3/web/index.html** (the server prints another port if 8080 is occupied). Keep the whole repository checkout: the viewer reuses its bundled preview meshes and v0.1 modern container reader.

Choose **Load a .SLDPRT** or drag a file onto the page. Use **Try a 2011 shell** for a source-file example. Orbit, zoom, toggle face colours and boundary edges, then select **Export 6-view sheet**. **Download PNG** saves the sheet; the inline image also supports Save Image As. Bundled preview chips are precomputed examples; loading a source file always invokes v0.3.

Parsing runs in a worker with a Cancel button and 60-second timeout. The page displays format, face/triangle counts, and validation details. Rejected candidate faces produce a prominent PARTIAL notice. A failed load explicitly leaves the previous model displayed. Up to three externally loaded models are retained for comparison; older external models release their GPU buffers.

## CLI / API

```sh
node parser/v0.3/src/node-cli.js path/to/model.SLDPRT > parsed.json
node parser/v0.3/test/validate.js
node parser/v0.3/test/worker.js
```

The CommonJS API remains `parseSLDPRT(bytes, inflateRaw, inflateZlib)`. For Node, use bounded zlib callbacks like the CLI. For browsers, the provided inflater checks Adler-32 and limits output. Modern geometry/metadata follows v0.2. Legacy results include strip triangles, normals, Block1 edge annotations, stored bounding records, and uninterpreted downstream bytes/ranges. Stored bounds may be conservative, particularly on splines.

This reads saved tessellation; it does not reconstruct exact B-rep solids, feature history or separate configurations. Legacy surface/edge metadata is **not decoded**. Support is demonstrated on the supplied **25 SW2011 files / 145 faces**, not every historical SolidWorks version. The three older original OLE files remain explicitly unsupported. Modern regression covers **45 files / 1,414 faces**.

Limits: 128 MiB input and decompressed streams; 2 million vertices / 50,000 accepted faces in the core; 300,000 triangles in the web viewer. Unsupported wrappers, malformed chains and invalid geometry are reported rather than guessed or repaired. These limits and tests are not a comprehensive hostile-input security audit.

## Validation and honest limits

[Core validation](CORE_VALIDATION.md) and [web/reference checks](WEB_VALIDATION.md) contain methods and current results. Node and browser decompressor outputs agree across all 73 inputs. The worker path runs in an isolated JavaScript context in tests; this is not a substitute for an actual browser test.

Real browser smoke test (optional Playwright installation and Chromium required; start the server first):

```sh
node parser/v0.3/test/browser.js
```

It exercises file selection, a synthetic external-file drop, legacy loading, PNG sheet output and invalid-input handling. Set `VIEWER_URL` or `CHROMIUM_PATH` if needed. **This test has not run successfully in the development environment because Chromium was unavailable and its download timed out.** No new WebGL screenshot is claimed.

Independent STL comparisons:

```sh
python3 parser/v0.3/test/compare-stl.py --render
```

Requires NumPy; `--render` also requires Matplotlib. References can differ in origin and omit faces: the comparison retains raw distances and clearly labels the optional translation hypothesis. It must not be read as an all-files correctness certificate.
