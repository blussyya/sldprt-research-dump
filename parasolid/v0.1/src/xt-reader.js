/* Parasolid XT binary transmit reader — header and schema table only.
 *
 * Scope, deliberately narrow (NQ-037 milestone 1): read the transmit header,
 * enumerate the schema entries the file declares, and locate where the node
 * stream begins. NO entity fields are resolved and no geometry is produced.
 * Everything here is checked byte-for-byte against the .x_t text form of the
 * same body, which states the same table in readable ASCII.
 *
 * Verified layout (EXP-056):
 *
 *   "PS"                      2 bytes
 *   u32be descLen             length of the description that follows
 *   descLen bytes ASCII       ": TRANSMIT FILE ... modeller version <v>"
 *   u32be schemaLen
 *   schemaLen bytes ASCII     "SCH_<modeller>_<x>_<base>", base is 13006 here
 *   ... schema entry table ...
 *
 * A schema entry is:
 *   type letters              one or more uppercase ASCII (A C D I Z ...)
 *   u8 nameLen
 *   nameLen bytes             lowercase identifier, e.g. "lattice"
 *   u16be code                e.g. 222 for lattice, 1006 for mesh
 *   u16be flag
 *
 * The same entries appear in the .x_t text form as
 *   <letters><nameLen> <name><code> <flag>
 * which is what lets this be checked rather than guessed.
 *
 * No external dependencies, consistent with the rest of the project.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.XTReader = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAGIC = [0x50, 0x53]; // "PS"

  function u8(b, o) { return b[o]; }
  function u16be(b, o) { return (b[o] << 8) | b[o + 1]; }
  function u32be(b, o) { return ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3]; }
  function ascii(b, o, n) {
    var s = '';
    for (var i = 0; i < n; i++) s += String.fromCharCode(b[o + i]);
    return s;
  }

  function isUpper(c) { return c >= 0x41 && c <= 0x5a; }
  function isNameChar(c) {
    return (c >= 0x61 && c <= 0x7a) || (c >= 0x30 && c <= 0x39) || c === 0x5f;
  }

  /* Read the fixed transmit header. Throws on anything unexpected rather than
   * guessing, because a wrong header silently poisons everything downstream. */
  function readHeader(b) {
    if (b.length < 8 || b[0] !== MAGIC[0] || b[1] !== MAGIC[1])
      throw Error('Not a Parasolid transmit: missing PS magic');
    var o = 2;
    var descLen = u32be(b, o); o += 4;
    if (descLen === 0 || o + descLen > b.length)
      throw Error('Implausible description length ' + descLen + ' at ' + (o - 4));
    var desc = ascii(b, o, descLen); o += descLen;

    var schemaLen = u32be(b, o); o += 4;
    if (schemaLen === 0 || o + schemaLen > b.length)
      throw Error('Implausible schema length ' + schemaLen + ' at ' + (o - 4));
    var schema = ascii(b, o, schemaLen); o += schemaLen;

    var mv = desc.match(/modeller version (\d+)/);
    var sm = schema.match(/^SCH_(\d+)_(\d+)_(\d+)$/);

    return {
      desc: desc,
      schema: schema,
      modellerVersion: mv ? mv[1] : null,
      schemaBase: sm ? sm[3] : null,
      isPartition: /\(partition\)/.test(desc),
      end: o
    };
  }

  /* Enumerate the declared schema entries. Stops at the first thing that is not
   * a well-formed entry and reports where, rather than running off into the
   * node stream and inventing names. */
  function readSchemaTable(b, start) {
    var entries = [], o = start, stop = null;
    while (o < b.length) {
      var t0 = o;
      while (o < b.length && isUpper(b[o])) o++;
      if (o === t0) { stop = 'no type letters at ' + o; break; }
      var letters = ascii(b, t0, o - t0);

      if (o >= b.length) { stop = 'truncated before name length'; break; }
      var nameLen = u8(b, o); o += 1;
      if (nameLen === 0 || o + nameLen > b.length) { stop = 'bad name length ' + nameLen + ' at ' + (o - 1); break; }

      var ok = true;
      for (var i = 0; i < nameLen; i++) if (!isNameChar(b[o + i])) { ok = false; break; }
      if (!ok) { stop = 'non-identifier name at ' + o; break; }
      var name = ascii(b, o, nameLen); o += nameLen;

      if (o + 4 > b.length) { stop = 'truncated after name ' + name; break; }
      var code = u16be(b, o); o += 2;
      var flag = u16be(b, o); o += 2;

      entries.push({ letters: letters, name: name, code: code, flag: flag, offset: t0 });
    }
    return { entries: entries, end: o, stop: stop };
  }

  function read(b) {
    var h = readHeader(b);
    // Between the schema string and the table there is a short fixed run whose
    // meaning is not yet established; skip to the first type-letter byte rather
    // than pretend to know its layout.
    var o = h.end;
    var limit = Math.min(b.length, o + 64);
    while (o < limit && !isUpper(b[o])) o++;
    var preambleBytes = o - h.end;
    var t = readSchemaTable(b, o);
    return {
      header: h,
      preambleBytes: preambleBytes,
      preamble: Array.prototype.slice.call(b.subarray(h.end, o)),
      schemaEntries: t.entries,
      schemaTableEnd: t.end,
      schemaTableStop: t.stop
    };
  }

  /* The .x_t text form states the same table as
   *   <letters><nameLen> <name><code> <flag>
   * Parse it so the binary read can be checked against it. */
  function readTextSchemaTable(text) {
    var body = text.indexOf('**END_OF_HEADER');
    var s = body >= 0 ? text.slice(body) : text;
    // The text form line-wraps at a fixed width, so newlines can fall anywhere,
    // including inside a name. Join before scanning.
    s = s.replace(/\r?\n/g, '');

    // A name may legally contain digits (index_map_offset does not, but the
    // grammar allows it), so the declared length must drive the slice rather
    // than a greedy character class — otherwise the name absorbs the code's
    // digits and every entry fails its own length check.
    var re = /([A-Z]+)(\d+) /g, m, out = [];
    while ((m = re.exec(s))) {
      var nameLen = parseInt(m[2], 10);
      var at = m.index + m[0].length;
      var name = s.substr(at, nameLen);
      if (!/^[a-z_][a-z0-9_]*$/.test(name)) continue;
      var rest = s.slice(at + nameLen);
      var nums = rest.match(/^(\d+) (\d+)/);
      if (!nums) continue;
      out.push({ letters: m[1], name: name, code: parseInt(nums[1], 10), flag: parseInt(nums[2], 10) });
      re.lastIndex = at + nameLen;
    }
    return out;
  }

  return { read: read, readHeader: readHeader, readSchemaTable: readSchemaTable, readTextSchemaTable: readTextSchemaTable };
});
