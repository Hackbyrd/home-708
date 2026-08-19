import assert from 'node:assert/strict';
import test from 'node:test';
import { Group } from 'three';
import { planToWorld, validateFurnitureIds, worldToPlan } from '../src/invariants.ts';
import { QUALITY_PROFILES, resolvePixelRatio } from '../src/quality.ts';

test('plan coordinates preserve y/z and mirror x', () => {
  const world = planToWorld({ x: 31.6, y: 11, z: 57.7 });
  assert.deepEqual(world, { x: -31.6, y: 11, z: 57.7 });
  assert.deepEqual(worldToPlan(world), { x: 31.6, y: 11, z: 57.7 });
});

test('quality pixel ratio is clamped by preset', () => {
  assert.equal(resolvePixelRatio('low', 3), 1);
  assert.equal(resolvePixelRatio('balanced', 2), 1.5);
  assert.equal(resolvePixelRatio('high', 0.5), QUALITY_PROFILES.high.minPixelRatio);
  assert.equal(resolvePixelRatio('high', 2, 0.5), 1);
});

test('furniture IDs report duplicates and missing values', () => {
  const floors = [new Group(), new Group(), new Group(), new Group()] as [
    Group,
    Group,
    Group,
    Group,
  ];
  for (const id of ['0|chair|1.0,2.0', '0|chair|1.0,2.0']) {
    const item = new Group();
    item.userData.id = id;
    floors[0].add(item);
  }
  floors[1].add(new Group());

  const result = validateFurnitureIds({ furn: floors });
  assert.equal(result.valid, false);
  assert.deepEqual(result.duplicates, ['0|chair|1.0,2.0']);
  assert.equal(result.missing.length, 1);
});
