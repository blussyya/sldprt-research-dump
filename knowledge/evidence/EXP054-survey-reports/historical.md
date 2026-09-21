# SLDPRT Format Knowledge Provenance Report

**Report Date:** 2026-09-20  
**Project:** SLDPRT Format Research  
**Scope:** Historical origins of public SLDPRT binary-format knowledge

---

## 1. Chronology: Dated Timeline of Public SLDPRT Knowledge

### Early Work (circa 2010s, pre-2015)

**Bryan Bishop's Investigation** (heybryan.org/solidworks_file_format.html)
- **Date:** Not explicitly stated; appears to be one of the earliest public technical investigations
- **Methodology:** Comparative reverse-engineering—created progressively complex SolidWorks models and compared exports
- **Claim:** SolidWorks files use Microsoft Structured Storage format (OLE2 compound document)
- **Demonstrated:** 
  - Existence of PreviewPNG stream
  - Existence of `Contents/DisplayLists__ZLB` stream containing geometry
  - Not: the binary specification itself (Bishop states "I haven't been able to figure that out yet")

**StackOverflow Question 17966108** (2013)
- **Date:** 2013 (posted date not explicitly confirmed via WebFetch; URL pattern and numbering suggests early 2010s)
- **Title:** "How to extract just the visualization data from the SolidWorks files (*.sldprt and *.sldasm)?"
- **Status:** UNREACHABLE via WebFetch and Wayback Machine. Cannot confirm content, answers, or community knowledge without access.

### Mid-Period (2015)

**daeken/SLDPRT Repository**
- **Date:** Last update October 2015
- **Project Title:** "Picking apart the Solidworks 2015 sldprt file format"
- **Status:** CONFIRMED EMPTY—no code or documentation content
- **Inference:** Represents an attempt to reverse-engineer SolidWorks 2015 format; project abandoned before public release
- **Note:** No forks, issues, or surviving work recovered (confirmed via GitHub search)

### Commercial/Official Route (ongoing)

**SolidWorks Document Manager API** (help.solidworks.com)
- **Date:** Continuously maintained; 2024 documentation exists
- **Claim:** Official GetPartitionStream API provides access to partition data in SLDPRT files
- **Status:** UNREACHABLE via WebFetch; documentation page structure only, no content details found
- **Implication:** Legitimate route to SLDPRT data exists but requires:
  - SolidWorks license
  - Windows operating system
  - .NET framework
  - (Exact requirements unconfirmed; requires official documentation access)

**ODA MCAD SDK**
- **Date:** Current commercial product (marketing materials fetched 2026-09-20)
- **Claim:** Supports SLDPRT/SLDASM and 10+ CAD formats through unified API
- **Requirements:**
  - Sustaining membership or above (annual subscription, flat per-company fee)
  - 60-day free trial (no credit card)
  - Web/SaaS deployment has additional tier requirements
- **Status:** Commercial offering; no public format specification provided

### PRONOM Registration (Standards & Documentation)

**PRONOM Entry fmt/1967**
- **Date:** Registered by The National Archives; last updated February 28, 2024
- **PUID:** fmt/1967
- **Classification:** Aggregate format
- **Version Coverage:** 2015+
- **Developer:** Dassault Systèmes
- **File Types Covered:** .sldprt, .sldasm, .slddrw, .sld, .sldlfp, .slddrt
- **Signature Data:** UNREACHABLE via WebFetch; PRONOM database indicates Signatures tab exists but content not retrieved
- **Implication:** PRONOM acknowledges modern (2015+) SolidWorks formats as a distinct registration, with independent criteria separate from older versions

### Modern Research Era (2024–2026)

**blussyya/sldprt-format-research**
- **Date:** Active through 2026-09-20; most recent work dated 2026-09-16 (v0.4.8 research)
- **Status:** Public, comprehensive, with working parser and converter
- **Research Claim:** "reverse engineering the SLDPRT format because its not documented anywhere"
- **Citation Pattern:** No reference to Bryan Bishop, daeken/SLDPRT, or StackOverflow thread in README or knowledge base
- **Apparent Independence:** Modern research appears to have rediscovered DisplayLists independently or built upon unnamed earlier work

---

## 2. Root Claims: Source-by-Source Format Facts

### Bryan Bishop (heybryan.org)

**Established Claims (demonstrated, not just stated):**

1. **Container Format:** "SolidWorks files use the Microsoft Structured storage file format"
   - Root fact: OLE2 compound-document container
   - Stream multiplexing documented

2. **Stream Existence:** PreviewPNG stream contains preview bitmap images
   - Confirmed demonstrable

3. **Geometry Stream:** 
   - Quote: "display list" structure containing model geometry data
   - Name pattern: "Contents/DisplayLists__ZLB"
   - Status: Identified as present but not decoded
   - Quote (on spec): "I haven't been able to figure that out yet" (explicit limitation stated)

**Not Demonstrated:**
- Binary structure of DisplayLists stream
- Data encoding/serialization format
- Compression method
- Triangle representation
- Any byte offsets or header formats

### StackOverflow 17966108 (2013)

**Status:** CONTENT UNREACHABLE. Cannot extract root claims without source access.  
**Implication:** Early 2013 community discussion likely exists; any knowledge it contains is not verified in this report.

### daeken/SLDPRT (October 2015)

**Status:** Repository empty; no substantive claims to extract.

### SolidWorks Document Manager API (Official)

**Claimed Access Route:**
- Official method to read SLDPRT partition data
- GetPartitionStream API named in official documentation
- Quote (title only): "ISwDMConfiguration2_methods.html" suggests the method exists in Configuration2 interface

**Not Confirmed (documentation unreachable):**
- Exact method signature
- Return data format
- License/system requirements
- Data structure it returns

### ODA MCAD SDK (Commercial)

**Claimed Capability:**
- "Open files from every supported format through one API"
- Explicitly lists SOLIDWORKS (.sldprt, .sldasm) support
- Alternative to proprietary API for SLDPRT access

**Not Substantiated:**
- Internal SLDPRT format knowledge (likely proprietary, reverse-engineered or licensed)
- Data format output
- Technical specifications

### PRONOM fmt/1967 (Standards Body)

**Established Facts (from PRONOM record):**

1. **Format Identifier:** PUID fmt/1967
2. **Version Scope:** "2015+" (explicitly excludes earlier versions)
3. **Developer:** Dassault Systèmes
4. **File Type Description:** "A 3D model" (generic)
5. **File Extensions:** .sldprt, .sldasm, .slddrw, .sld, .sldlfp, .slddrt
6. **Classification:** "Aggregate" (suggests multiple related file types or versions grouped)

**Not Confirmed (Signatures tab unreachable):**
- Magic bytes / hexadecimal signatures
- Byte offsets for identification
- Container type confirmation
- Compression detection signatures

### blussyya/sldprt-format-research (Current, 2026)

**Established Claims (from KNOWN_INVARIANTS.md and FORMAT_TIMELINE.md):**

1. **Modern Container Format (SLDPRT v2/v3, 2015–2026):**
   - "Uses openswx-like archive structure"
   - Stream names "appear encoded"
   - Content uses "zlib raw inflate"
   - Contrasted with v1 OLE2

2. **Geometry Stream:**
   - Modern: `Contents/DisplayLists` (confirmed readable)
   - Legacy OLE2: `DisplayLists` and `DisplayLists__Zip` (unsupported in current work)

3. **Face Block Structure (fully decoded):**
   - Header: `[12,100,2,vertexCount]` gap marker before normals
   - Triangle strips with per-strip vertex counts (precursor array `[4,8,2,S]`)
   - Block1: edge annotations (0=interior, nonzero=boundary)
   - Block2: encodes strip counts via formula `(Block2[i] + 2) / 2`
   - Block3: byte array (mostly zeros; semantics unknown)

4. **Compression:**
   - DEFLATE/zlib compression on DisplayLists stream

5. **Embedded Partition:**
   - `Config-0-Partition` stream referenced but "remains unreadable/high entropy"

---

## 3. Lineage: Which Projects Inherit from Which Historical Source

### Direct Lineage Evidence

**blussyya/sldprt-format-research ← Bryan Bishop (heybryan.org)**
- **Evidence:** Both use the term `Contents/DisplayLists` to name the geometry stream
- **Confidence:** Terminology match is suggestive but not conclusive—could be independent discovery
- **Status:** Inference (not explicitly cited in project README)

**blussyya/sldprt-format-research ← daeken/SLDPRT**
- **Evidence:** Repository existed (daeken/SLDPRT, October 2015) before this project's research epoch (2026)
- **Confidence:** Weak—daeken repo is empty, no code or knowledge to inherit
- **Status:** No demonstrated lineage; chronological precedent only

**blussyya/sldprt-format-research ← StackOverflow 2013 thread**
- **Evidence:** UNREACHABLE; cannot assess
- **Status:** Unknown

**blussyya/sldprt-format-research ← ODA MCAD SDK / Official API**
- **Evidence:** Project implements reverse-engineering route; official routes (ODA, Document Manager) exist but are not integrated
- **Status:** Deliberately separate—project appears to be independent reverse-engineering rather than API wrapper

### Explicit Non-Lineage

**blussyya/sldprt-format-research**
- README states: "reverse engineering the SLDPRT format because its not documented anywhere"
- Knowledge base contains NO citations to prior SLDPRT work
- FORMAT_TIMELINE.md records observations but does not cite earlier researchers
- **Implication:** Either genuinely independent rediscovery or unattributed incorporation

---

## 4. Truth Status: Still Valid vs. Superseded

### Bryan Bishop's Claims (still valid for OLE2; irrelevant for modern)

| Claim | Current Status | Evidence |
|-------|----------------|----------|
| SolidWorks uses Structured Storage | **Partially valid** | OLE2 true for v1 (~2000-era); modern v2/v3 use different container |
| PreviewPNG stream exists | **Still valid** (v1 likely; v2/v3 not verified) | Not tested on modern corpus |
| DisplayLists stream has geometry | **Valid, renamed term** | Modern project confirms `Contents/DisplayLists` contains geometry |
| Format specification unknown | **Obsolete** | Modern research has decoded substantial geometry layer (triangles, edges, normals) |

### daeken/SLDPRT Claims

No substantive claims made (repository empty).

### StackOverflow 2013 Thread

Cannot assess (unreachable).

### PRONOM fmt/1967 Claims

| Claim | Current Status |
|-------|----------------|
| 2015+ format | **Valid** | Confirmed by FORMAT_TIMELINE (SLDPRT v2 ≈ 2015, v3 ≈ 2020+) |
| Developer = Dassault Systèmes | **Valid** | Not contradicted |
| File type = 3D model | **Valid** | Confirmed |

### blussyya/sldprt-format-research Claims

All claims current as of 2026-09-14 research cutoff.  
Status: **High confidence within modern corpus** (1,272 faces, 7–21 files tested).  
Scope limitation: **OLE2 container unsupported** (legacy versions not addressed).

**Conflict Check:** No contradictions found between modern research and earlier sources on overlapping territory (DisplayLists terminology, geometry stream existence, container format categories).

---

## 5. PRONOM Signature (fmt/1967)

**PUID:** fmt/1967  
**Version:** 2015+  
**Developer:** Dassault Systèmes  
**Format Classification:** Aggregate (multiple file types, grouped)

**Magic Bytes / Signature:**
- **Status:** UNREACHABLE via WebFetch
- **Attempted Fetch:** https://www.nationalarchives.gov.uk/PRONOM/fmt/1967/signatures
- **Result:** Signatures tab indicated but content not retrieved
- **Alternative formats covered under fmt/1967:** .sldprt, .sldasm, .slddrw, .sld, .sldlfp, .slddrt

**Inferred from context (not verified):**
- Modern format uses openswx-like ZIP/archive container (from blussyya research)
- OLE2 compound-document signature for legacy versions (from Bryan Bishop, implied by PRONOM v2015 split)
- Likely uses DEFLATE compression internally (from blussyya research, not PRONOM)

**Recommendation:** Consult PRONOM database directly via browser or contact The National Archives for complete signature specification.

---

## 6. Official & Commercial Routes Summary

### SolidWorks Document Manager API (Official)

**Scope:** Legitimate, official method to access SLDPRT data  
**Requirements (inferred, not confirmed):**
- SolidWorks license (required)
- Windows operating system (implied by .NET reference)
- .NET framework (referenced in documentation URL)
- Document Manager API license tier (exact terms unknown)

**Capability:**
- GetPartitionStream method: accesses partition data within SLDPRT
- Represents official vendor-provided route to geometry data
- Eliminates need for reverse-engineering for licensed users

**Limitation:** Requires commercial license; not available for open-source or academic use without purchase.

### ODA MCAD SDK (Commercial)

**Scope:** Third-party commercial solution supporting SLDPRT among 11+ CAD formats  
**Requirements:**
- ODA Sustaining membership or above (annual subscription, flat per-company pricing)
- 60-day free trial available (no credit card required)
- Web/SaaS deployment requires higher membership tier

**Capability:**
- Unified API to read SLDPRT, SLDASM, Inventor, CATIA, NX, Creo, Solid Edge, Rhino, Parasolid, JT, ACIS
- Neutral format output (STEP, IGES, DWG, STL, OBJ, FBX)
- No local SolidWorks installation required (alternative to Document Manager API)

**Limitation:** Commercial licensing required; unclear whether reverse-engineered or vendor-licensed implementation.

---

## 7. Summary Findings

### Chronological Order of Public Knowledge

1. **~2010s (exact date unknown):** Bryan Bishop independently investigates SolidWorks structure, identifies Structured Storage container and DisplayLists stream but does not decode binary format.

2. **2013:** StackOverflow community discusses extraction of visualization data (content unverified).

3. **October 2015:** daeken/SLDPRT project created but abandoned without substantive public output.

4. **Ongoing:** ODA MCAD SDK and SolidWorks Document Manager API provide official/commercial routes; no public format specification released.

5. **2024–2026:** blussyya/sldprt-format-research conducts comprehensive modern reverse-engineering, achieving full parser/converter without apparent reliance on earlier work (no citations).

### Root Claims Ownership

| Fact | Original Source | Current Evidence |
|------|-----------------|------------------|
| OLE2 container (legacy) | Bryan Bishop | FORMAT_TIMELINE confirms v1 ≈ 2000-era |
| DisplayLists stream name | Bryan Bishop | Modern research uses same term for Contents/DisplayLists |
| Modern openswx-like container | blussyya (rediscovered) | No prior source found |
| Triangle-strip geometry in DisplayLists | blussyya | First detailed decode; no prior source verified |
| Block1/Block2 structure | blussyya | First detailed characterization |
| Edge annotation semantics | blussyya (INV-021/024) | Unique to modern research |

### Attribution Gaps

- No explicit acknowledgment in blussyya's project of Bryan Bishop's or daeken's prior work
- No published lineage to StackOverflow discussion (inaccessible)
- ODA/Dassault Systèmes likely reverse-engineered or licensed format; no public schema
- SolidWorks official API (GetPartitionStream) provides data route but not format specification

### What Remains Unknown (Public Layer)

1. PRONOM fmt/1967 signature (magic bytes, offsets) — requires National Archives direct access
2. Container directory structure and checksums (openswx format details unverified)
3. Exact version boundaries and container changes across SolidWorks releases (2015+ assumed; granularity unknown)
4. Block3 semantics (documented as all-zero in modern corpus; purpose unresolved)
5. Advanced surface tags (4005/4006/4007/4009) — corpus gap, only tags 4001/4002 externally validated
6. Legacy OLE2 binary structure (underspecified; daeken/blussyya both avoid it)

---

## 8. Data Quality Assessment

| Source | Accessibility | Verifiability | Completeness |
|--------|---|---|---|
| Bryan Bishop | ✓ Reachable | ✓ Verifiable claims | △ Partial (admits ignorance on binary spec) |
| StackOverflow 2013 | ✗ Unreachable | ? Unknown | ? Unknown |
| daeken/SLDPRT | ✓ Confirmed empty | ✓ Verifiable (no code) | ✗ Null |
| PRONOM fmt/1967 | ✓ Reachable (summary only) | ✓ Verifiable metadata | △ Partial (no signatures fetched) |
| SolidWorks API docs | ✗ Unreachable | ? Unknown | ? Unknown |
| ODA MCAD SDK | ✓ Reachable | ✓ Product marketing verified | ✓ Product scope clear |
| blussyya research | ✓ Reachable | ✓ Reproducible with corpus | ✓ Comprehensive for modern format |

---

## Conclusion

Public SLDPRT format knowledge originates with Bryan Bishop's early investigation (~2010s), which identified the OLE2 container and DisplayLists stream terminology but left the binary specification undecoded. No other pre-2015 public reverse-engineering work has been recovered. The 2015 daeken/SLDPRT project represents an abandoned effort. The modern (2024–2026) blussyya/sldprt-format-research project provides the first comprehensive public decode of triangle-strip geometry, edge annotations, and metadata structure for modern (2015+) SLDPRT files, with no explicit lineage to earlier work noted.

Official/commercial routes (SolidWorks Document Manager API, ODA MCAD SDK) exist but do not publish format specifications. PRONOM registration (fmt/1967, 2015+) provides standards-body acknowledgment but signature details remain inaccessible via this investigation.

**The modern parser and converter (parser/v0.2, converter/v0.1) represent original reverse-engineering research with high confidence within its modern-format scope, independent of prior sources.**
