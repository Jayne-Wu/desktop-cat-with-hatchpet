import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SCALE, normalizeScale } from "../app/shared/scale-options.mjs";

test("scale defaults to medium", () => {
  assert.equal(DEFAULT_SCALE, 0.92);
  assert.equal(normalizeScale(undefined), 0.92);
});

test("saved legacy scale values snap to the nearest supported size", () => {
  assert.equal(normalizeScale(0.62), 0.6);
  assert.equal(normalizeScale(1), 0.92);
  assert.equal(normalizeScale(1.25), 1.12);
});
