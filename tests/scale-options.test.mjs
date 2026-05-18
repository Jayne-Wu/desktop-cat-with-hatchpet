import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BASE_WINDOW_HEIGHT,
  BASE_WINDOW_WIDTH,
  DEFAULT_SCALE,
  MAX_SCALE,
  MIN_SCALE,
  normalizeScale,
  scaleToWindowSize,
  windowSizeToScale
} from "../app/shared/scale-options.mjs";

test("scale defaults to medium", () => {
  assert.equal(DEFAULT_SCALE, 0.92);
  assert.equal(normalizeScale(undefined), 0.92);
});

test("scale values remain continuous within supported bounds", () => {
  assert.equal(normalizeScale(0.62), 0.62);
  assert.equal(normalizeScale(1), 1);
  assert.equal(normalizeScale(1.255), 1.25);
  assert.equal(normalizeScale(0.1), MIN_SCALE);
  assert.equal(normalizeScale(9), MAX_SCALE);
});

test("default scale maps to the baseline window size", () => {
  assert.deepEqual(scaleToWindowSize(DEFAULT_SCALE), {
    width: BASE_WINDOW_WIDTH,
    height: BASE_WINDOW_HEIGHT
  });
});

test("window size converts back to a clamped scale", () => {
  const largeSize = scaleToWindowSize(1.5);

  assert.equal(windowSizeToScale(largeSize.width, largeSize.height), 1.5);
  assert.equal(windowSizeToScale(1, 1), MIN_SCALE);
  assert.equal(windowSizeToScale(9999, 9999), MAX_SCALE);
});
