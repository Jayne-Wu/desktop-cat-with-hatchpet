import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { readSettings } from "../app/main/settings-store.mjs";

test("legacy movementMode is ignored in favor of default companion style", async () => {
  const userDataPath = await mkdtemp(path.join(os.tmpdir(), "desktop-pet-settings-"));

  await writeFile(
    path.join(userDataPath, "settings.json"),
    JSON.stringify({
      movementMode: "bottom-walk",
      clickThrough: true
    }),
    "utf8"
  );

  const settings = await readSettings(userDataPath);

  assert.equal(settings.companionStyle, "curious");
  assert.equal(settings.clickThrough, true);
  assert.equal("movementMode" in settings, false);
});

test("invalid companion style falls back to curious", async () => {
  const userDataPath = await mkdtemp(path.join(os.tmpdir(), "desktop-pet-settings-"));

  await writeFile(
    path.join(userDataPath, "settings.json"),
    JSON.stringify({
      companionStyle: "chaotic"
    }),
    "utf8"
  );

  const settings = await readSettings(userDataPath);

  assert.equal(settings.companionStyle, "curious");
});
