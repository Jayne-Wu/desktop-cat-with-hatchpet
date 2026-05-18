import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COMPANION_STYLE_PROFILES,
  DEFAULT_COMPANION_STYLE,
  normalizeCompanionStyle
} from "../app/shared/companion-options.mjs";

test("companion defaults to curious", () => {
  assert.equal(DEFAULT_COMPANION_STYLE, "curious");
});

test("companion settings normalize unknown persisted values", () => {
  assert.equal(normalizeCompanionStyle("playful"), "playful");
  assert.equal(normalizeCompanionStyle("unknown"), "curious");
});

test("playful profile is more active than quiet profile", () => {
  assert.ok(
    COMPANION_STYLE_PROFILES.playful.speedPxPerSecond > COMPANION_STYLE_PROFILES.quiet.speedPxPerSecond
  );
  assert.ok(
    COMPANION_STYLE_PROFILES.playful.interactionBurstMs >
      COMPANION_STYLE_PROFILES.quiet.interactionBurstMs
  );
  assert.ok(
    COMPANION_STYLE_PROFILES.playful.observeRangeMs[0] <
      COMPANION_STYLE_PROFILES.quiet.observeRangeMs[0]
  );
});

test("focus profile is intentionally much less mobile", () => {
  assert.ok(
    COMPANION_STYLE_PROFILES.focus.observeRangeMs[0] >
      COMPANION_STYLE_PROFILES.quiet.observeRangeMs[0]
  );
  assert.ok(
    COMPANION_STYLE_PROFILES.focus.observeToStrollChance <
      COMPANION_STYLE_PROFILES.quiet.observeToStrollChance
  );
  assert.ok(
    COMPANION_STYLE_PROFILES.focus.settleToStrollChance <
      COMPANION_STYLE_PROFILES.quiet.settleToStrollChance
  );
  assert.equal(COMPANION_STYLE_PROFILES.focus.observeToStrollChance, 0);
  assert.equal(COMPANION_STYLE_PROFILES.focus.settleToStrollChance, 0);
  assert.equal(COMPANION_STYLE_PROFILES.focus.interactionBoostProfileId, "curious");
  assert.equal(COMPANION_STYLE_PROFILES.focus.interactionMoveBoostMs, 6500);
});
