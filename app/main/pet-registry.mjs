import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_PET_ID = "xigua";

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listLocalPets(appRoot) {
  const petsRoot = path.join(appRoot, "pets");
  const pets = [];
  const errors = [];

  let entries = [];

  try {
    entries = await readdir(petsRoot, { withFileTypes: true });
  } catch (error) {
    return {
      petsRoot,
      pets,
      errors: [
        {
          id: "pets",
          message: `Could not read pets directory: ${error.message}`
        }
      ]
    };
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const petDir = path.join(petsRoot, entry.name);
    const manifestPath = path.join(petDir, "pet.json");
    const baseError = {
      id: entry.name,
      petDir,
      manifestPath
    };

    if (!(await exists(manifestPath))) {
      errors.push({
        ...baseError,
        message: "Missing pet.json"
      });
      continue;
    }

    try {
      const manifest = await readJson(manifestPath);
      const manifestError = validateManifest(manifest);

      if (manifestError) {
        errors.push({
          ...baseError,
          message: manifestError
        });
        continue;
      }

      const spritesheetPath = path.join(petDir, manifest.spritesheetPath ?? "spritesheet.webp");

      if (!(await exists(spritesheetPath))) {
        errors.push({
          ...baseError,
          message: `Missing spritesheet: ${manifest.spritesheetPath}`
        });
        continue;
      }

      pets.push({
        id: manifest.id ?? entry.name,
        displayName: manifest.displayName ?? entry.name,
        description: manifest.description ?? "",
        petDir,
        manifestPath,
        spritesheetPath,
        spritesheetUrl: pathToFileURL(spritesheetPath).href
      });
    } catch (error) {
      errors.push({
        ...baseError,
        message: `Invalid pet.json: ${error.message}`
      });
    }
  }

  return {
    petsRoot,
    pets: pets.sort((a, b) => a.displayName.localeCompare(b.displayName)),
    errors
  };
}

export async function getPetSpritesheetDataUrl(appRoot, petId) {
  const registry = await listLocalPets(appRoot);
  const pet = registry.pets.find((entry) => entry.id === petId);

  if (!pet) {
    throw new Error(`Pet not found: ${petId}`);
  }

  const data = await readFile(pet.spritesheetPath);
  return `data:image/webp;base64,${data.toString("base64")}`;
}

export async function getDefaultPet(appRoot) {
  const registry = await listLocalPets(appRoot);
  const pet = registry.pets.find((entry) => entry.id === DEFAULT_PET_ID);

  if (!pet) {
    const errorDetail = registry.errors.length > 0 ? ` ${registry.errors[0].message}` : "";
    throw new Error(`Default pet not found: ${DEFAULT_PET_ID}.${errorDetail}`);
  }

  return pet;
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object") {
    return "pet.json must contain a JSON object";
  }

  for (const key of ["id", "displayName", "spritesheetPath"]) {
    if (typeof manifest[key] !== "string" || manifest[key].trim() === "") {
      return `pet.json must include a non-empty string field: ${key}`;
    }
  }

  if (manifest.description !== undefined && typeof manifest.description !== "string") {
    return "pet.json description must be a string when present";
  }

  if (path.isAbsolute(manifest.spritesheetPath) || manifest.spritesheetPath.includes("..")) {
    return "spritesheetPath must be a relative file name inside the pet directory";
  }

  return null;
}
