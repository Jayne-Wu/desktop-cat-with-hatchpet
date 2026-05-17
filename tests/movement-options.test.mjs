import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_CLICK_THROUGH,
  DEFAULT_MOVEMENT_MODE,
  normalizeClickThrough,
  normalizeMovementMode
} from "../app/shared/movement-options.mjs";

test("movement defaults are quiet and clickable", () => {
  assert.equal(DEFAULT_MOVEMENT_MODE, "still");
  assert.equal(DEFAULT_CLICK_THROUGH, false);
});

test("movement settings normalize unknown persisted values", () => {
  assert.equal(normalizeMovementMode("bottom-walk"), "bottom-walk");
  assert.equal(normalizeMovementMode("unknown"), "still");
  assert.equal(normalizeClickThrough(true), true);
  assert.equal(normalizeClickThrough("true"), false);
});
