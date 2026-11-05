'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../../../../..');
const P = require(path.join(root, '../solidworks-converters/src/parasolid/partition'));
const X = require(path.join(root, '../solidworks-converters/src/parasolid/xt'));
const {load} = require(path.join(root, 'knowledge/evidence/scripts/EXP079/load'));

const files = [
  path.join(root, 'test files original/cube.SLDPRT'),
  path.join(root, 'test files original/Helical Bevel Gear.SLDPRT'),
];

function deref(reader, value) {
  return value && Object.prototype.hasOwnProperty.call(value, 'ref')
    ? reader.objects.get(value.ref)
    : value;
}

function check(file) {
  const raw = fs.readFileSync(file);
  const streams = P.streams(raw);
  const featureKey = Object.keys(streams).find(name => /Config-0-ResolvedFeatures$/.test(name));
  const ghostKey = Object.keys(streams).find(name => /Config-0-GhostPartition$/.test(name));
  const tree = load(file);
  if (tree.err) throw tree.err;
  const featureBytes = streams[featureKey];
  const refs = [];

  for (const object of tree.r.objects.values()) {
    if (!object || !object.class || !object.comp) continue;
    const component = deref(tree.r, object.comp);
    if (!component || component.class !== '@comp' || typeof component.x0 !== 'string') continue;
    const block = Buffer.from(component.x0, 'hex');
    if (block.length !== 28) throw Error(`component ${component.index}: expected 28 bytes, got ${block.length}`);
    const id = block.readUInt32LE(0);
    if (!id) continue;
    const rawAt = component.at + 17;
    const owners = tree.tops.filter(top => top && top.at <= object.at && top.end >= object.end)
      .map(top => ({id: top.id, name: top.name, class: top.class}));
    const targets = tree.tops.filter(top => top && top.id === object.feature)
      .map(top => ({id: top.id, name: top.name, class: top.class}));
    refs.push({
      id,
      class: object.class,
      objectIndex: object.index,
      componentIndex: component.index,
      componentAt: component.at,
      rawAt,
      rawMatches: featureBytes.subarray(rawAt, rawAt + 28).equals(block),
      feature: object.feature,
      owners,
      targets,
    });
  }

  const bodies = [];
  if (ghostKey) {
    const framed = P.sections(streams[ghostKey], 0);
    if (framed.error) throw Error(framed.error);
    for (const section of framed.out) {
      const parsed = X.parse(section.body, true);
      if (parsed.error) throw Error(parsed.error);
      const byIndex = new Map(parsed.nodes.map(node => [node.index, node]));
      for (const attribute of parsed.nodes.filter(node => node.name === 'ATTRIBUTE')) {
        const definition = byIndex.get(attribute.values.definition);
        const name = byIndex.get(definition?.values.identifier)?.values.string;
        if (name !== 'GHOST_REF_BODY_ID_2001') continue;
        const body = byIndex.get(attribute.values.owner);
        const value = byIndex.get(attribute.values.fields[1]);
        if (body?.name !== 'BODY' || value?.name !== 'INT_VALUES') throw Error('unexpected ghost attribute shape');
        const id = value.values.values[0];
        bodies.push({
          id,
          bodyIndex: body.index,
          bodyType: body.values.body_type,
          edge: body.values.edge,
          vertex: body.values.vertex,
          matches: refs.filter(ref => ref.id === id),
        });
      }
    }
  }

  const duplicateBodyIds = bodies.map(body => body.id).filter((id, i, all) => all.indexOf(id) !== i);
  const duplicateRefIds = refs.map(ref => ref.id).filter((id, i, all) => all.indexOf(id) !== i);
  return {
    file: path.relative(root, file),
    featureStream: featureKey,
    ghostStream: ghostKey || null,
    treeEnd: tree.end,
    topSlots: tree.tops.length,
    bodies,
    refs,
    duplicateBodyIds: [...new Set(duplicateBodyIds)],
    duplicateRefIds: [...new Set(duplicateRefIds)],
    unmatchedBodies: bodies.filter(body => body.matches.length !== 1).map(body => body.id),
    unmatchedRefs: refs.filter(ref => !bodies.some(body => body.id === ref.id)).map(ref => ref.id),
  };
}

console.log(JSON.stringify(files.map(check), null, 2));
