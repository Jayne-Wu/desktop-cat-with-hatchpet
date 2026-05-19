import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COMPANION_IDLE_DURATIONS_MS,
  DIRECTIONAL_LOCOMOTION_DURATIONS_MS,
  FEEDBACK_FAILED_DURATIONS_MS,
  FEEDBACK_JUMPING_DURATIONS_MS,
  FEEDBACK_RUNNING_DURATIONS_MS,
  FEEDBACK_WAVING_DURATIONS_MS,
  REVIEW_DURATIONS_MS,
  getStateCycleDurationMs,
  getStateSpec
} from "../app/renderer/pet/codex-pet-spec.js";

test("idle animation is intentionally much slower than locomotion states", () => {
  assert.deepEqual(getStateSpec("idle").durationsMs, COMPANION_IDLE_DURATIONS_MS);
  assert.ok(getStateCycleDurationMs("idle") >= getStateCycleDurationMs("running-right") * 4);
  assert.ok(getStateSpec("idle").durationsMs[0] > getStateSpec("idle").durationsMs[1] * 4);
  assert.ok(getStateSpec("idle").durationsMs.at(-1) > getStateSpec("idle").durationsMs[3] * 4);
});

test("directional locomotion keeps the fast movement pacing", () => {
  assert.deepEqual(getStateSpec("running-left").durationsMs, DIRECTIONAL_LOCOMOTION_DURATIONS_MS);
  assert.deepEqual(getStateSpec("running-right").durationsMs, DIRECTIONAL_LOCOMOTION_DURATIONS_MS);
});

test("static companion states share the slow lingering pacing", () => {
  for (const stateId of ["idle", "waiting"]) {
    assert.deepEqual(getStateSpec(stateId).durationsMs, COMPANION_IDLE_DURATIONS_MS);
  }
});

test("review keeps its own brisker reading cadence", () => {
  assert.deepEqual(getStateSpec("review").durationsMs, REVIEW_DURATIONS_MS);
  assert.ok(getStateCycleDurationMs("review") < getStateCycleDurationMs("idle"));
  assert.ok(getStateCycleDurationMs("review") > getStateCycleDurationMs("running"));
});

test("feedback states keep a separate more responsive pacing", () => {
  assert.deepEqual(getStateSpec("waving").durationsMs, FEEDBACK_WAVING_DURATIONS_MS);
  assert.deepEqual(getStateSpec("jumping").durationsMs, FEEDBACK_JUMPING_DURATIONS_MS);
  assert.deepEqual(getStateSpec("failed").durationsMs, FEEDBACK_FAILED_DURATIONS_MS);
  assert.deepEqual(getStateSpec("running").durationsMs, FEEDBACK_RUNNING_DURATIONS_MS);
  assert.ok(getStateCycleDurationMs("waving") < getStateCycleDurationMs("idle"));
  assert.ok(getStateCycleDurationMs("jumping") < getStateCycleDurationMs("idle"));
  assert.ok(getStateCycleDurationMs("running") < getStateCycleDurationMs("idle"));
});
