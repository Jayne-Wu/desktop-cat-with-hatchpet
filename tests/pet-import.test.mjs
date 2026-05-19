import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  getImportedPetsRoot,
  importPetFromDirectory,
  listAvailablePets
} from "../app/main/pet-registry.mjs";

const APP_ROOT = process.cwd();

test("importPetFromDirectory copies a valid Hatchpet package into user data", async () => {
  const userDataPath = await makeTempDir("desktop-pet-user-data-");
  const sourceDir = await makePetSource("desktop-pet-source-", {
    id: "test-import",
    displayName: "Test Import"
  });

  const result = await importPetFromDirectory(APP_ROOT, userDataPath, sourceDir);
  const importedRoot = getImportedPetsRoot(userDataPath);
  const importedManifestPath = path.join(importedRoot, "test-import", "pet.json");
  const importedSpritesheetPath = path.join(importedRoot, "test-import", "spritesheet.webp");
  const importedManifest = JSON.parse(await readFile(importedManifestPath, "utf8"));
  const registry = await listAvailablePets(APP_ROOT, userDataPath);

  assert.equal(result.pet.id, "test-import");
  assert.equal(result.pet.source, "imported");
  assert.equal(importedManifest.displayName, "Test Import");
  assert.ok(await fileExists(importedSpritesheetPath));
  assert.ok(registry.pets.some((pet) => pet.id === "test-import" && pet.source === "imported"));
});

test("importPetFromDirectory rejects pets that collide with bundled ids", async () => {
  const userDataPath = await makeTempDir("desktop-pet-user-data-");
  const sourceDir = await makePetSource("desktop-pet-source-", {
    id: "xigua",
    displayName: "Duplicate Xigua"
  });

  await assert.rejects(
    () => importPetFromDirectory(APP_ROOT, userDataPath, sourceDir),
    /bundled pet already uses id: xigua/
  );
});

async function makePetSource(prefix, manifest) {
  const sourceDir = await makeTempDir(prefix);
  await writeFile(
    path.join(sourceDir, "pet.json"),
    `${JSON.stringify(
      {
        ...manifest,
        description: "",
        spritesheetPath: "spritesheet.webp"
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await copyFile(path.join(APP_ROOT, "pets", "xigua", "spritesheet.webp"), path.join(sourceDir, "spritesheet.webp"));
  return sourceDir;
}

async function makeTempDir(prefix) {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}
