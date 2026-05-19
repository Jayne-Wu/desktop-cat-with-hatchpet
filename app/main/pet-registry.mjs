import { access, copyFile, mkdir, readdir, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_PET_ID = "xigua";
export const IMPORTED_PETS_DIR = "imported-pets";
export const EXPECTED_ATLAS_WIDTH = 1536;
export const EXPECTED_ATLAS_HEIGHT = 1872;

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
  return listPetsFromRoot(petsRoot, "bundled");
}

export async function listImportedPets(userDataPath) {
  const petsRoot = getImportedPetsRoot(userDataPath);
  return listPetsFromRoot(petsRoot, "imported");
}

export async function listAvailablePets(appRoot, userDataPath) {
  const [bundled, imported] = await Promise.all([
    listLocalPets(appRoot),
    listImportedPets(userDataPath)
  ]);
  const bundledIds = new Set(bundled.pets.map((pet) => pet.id));
  const importedPets = imported.pets.filter((pet) => !bundledIds.has(pet.id));

  return {
    petsRoot: bundled.petsRoot,
    importedPetsRoot: imported.petsRoot,
    pets: [...bundled.pets, ...importedPets].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    errors: [...bundled.errors, ...imported.errors]
  };
}

export async function importPetFromDirectory(appRoot, userDataPath, sourceDir) {
  const petDir = path.resolve(sourceDir);
  const pet = await readPetDirectory(petDir, {
    entryName: path.basename(petDir),
    source: "import"
  });
  const bundled = await listLocalPets(appRoot);

  if (bundled.pets.some((entry) => entry.id === pet.id)) {
    throw new Error(`A bundled pet already uses id: ${pet.id}`);
  }

  const importedPetsRoot = getImportedPetsRoot(userDataPath);
  const destinationDir = path.join(importedPetsRoot, toSafeDirectoryName(pet.id));
  const tempDir = path.join(importedPetsRoot, `.tmp-${toSafeDirectoryName(pet.id)}-${Date.now()}`);

  try {
    await mkdir(tempDir, { recursive: true });
    await copyFile(pet.manifestPath, path.join(tempDir, "pet.json"));

    const tempSpritesheetPath = path.join(tempDir, pet.manifest.spritesheetPath);
    await mkdir(path.dirname(tempSpritesheetPath), { recursive: true });
    await copyFile(pet.spritesheetPath, tempSpritesheetPath);

    await readPetDirectory(tempDir, {
      entryName: path.basename(tempDir),
      source: "imported"
    });

    await rm(destinationDir, { recursive: true, force: true });
    await rename(tempDir, destinationDir);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }

  const importedPet = await readPetDirectory(destinationDir, {
    entryName: path.basename(destinationDir),
    source: "imported"
  });

  return {
    pet: toPublicPet(importedPet),
    importedPetsRoot
  };
}

export function getImportedPetsRoot(userDataPath) {
  return path.join(userDataPath, IMPORTED_PETS_DIR);
}

async function listPetsFromRoot(petsRoot, source) {
  const pets = [];
  const errors = [];

  let entries = [];

  try {
    entries = await readdir(petsRoot, { withFileTypes: true });
  } catch (error) {
    if (source === "imported" && error.code === "ENOENT") {
      return {
        petsRoot,
        pets,
        errors
      };
    }

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
    const baseError = {
      id: entry.name,
      petDir
    };

    try {
      const pet = await readPetDirectory(petDir, {
        entryName: entry.name,
        source
      });
      pets.push(toPublicPet(pet));
    } catch (error) {
      errors.push({
        ...baseError,
        message: error.message
      });
    }
  }

  return {
    petsRoot,
    pets: pets.sort((a, b) => a.displayName.localeCompare(b.displayName)),
    errors
  };
}

export async function getPetSpritesheetDataUrl(appRoot, petId, userDataPath = null) {
  const registry = userDataPath ? await listAvailablePets(appRoot, userDataPath) : await listLocalPets(appRoot);
  const pet = registry.pets.find((entry) => entry.id === petId);

  if (!pet) {
    throw new Error(`Pet not found: ${petId}`);
  }

  const data = await readFile(pet.spritesheetPath);
  return `data:image/webp;base64,${data.toString("base64")}`;
}

export async function getPetById(appRoot, petId, userDataPath = null) {
  const registry = userDataPath ? await listAvailablePets(appRoot, userDataPath) : await listLocalPets(appRoot);
  const pet = registry.pets.find((entry) => entry.id === petId);

  if (!pet) {
    throw new Error(`Pet not found: ${petId}`);
  }

  return pet;
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

export async function getStartupPet(appRoot, preferredPetId, userDataPath = null) {
  if (preferredPetId) {
    const registry = userDataPath ? await listAvailablePets(appRoot, userDataPath) : await listLocalPets(appRoot);
    const preferredPet = registry.pets.find((entry) => entry.id === preferredPetId);

    if (preferredPet) {
      return preferredPet;
    }
  }

  return getDefaultPet(appRoot);
}

async function readPetDirectory(petDir, { entryName, source }) {
  const manifestPath = path.join(petDir, "pet.json");

  if (!(await exists(manifestPath))) {
    throw new Error("Missing pet.json");
  }

  let manifest;

  try {
    manifest = await readJson(manifestPath);
  } catch (error) {
    throw new Error(`Invalid pet.json: ${error.message}`);
  }

  const manifestError = validateManifest(manifest);

  if (manifestError) {
    throw new Error(manifestError);
  }

  const spritesheetPath = path.join(petDir, manifest.spritesheetPath);

  if (!(await exists(spritesheetPath))) {
    throw new Error(`Missing spritesheet: ${manifest.spritesheetPath}`);
  }

  const dimensions = parseWebpDimensions(await readFile(spritesheetPath));

  if (dimensions.width !== EXPECTED_ATLAS_WIDTH || dimensions.height !== EXPECTED_ATLAS_HEIGHT) {
    throw new Error(
      `Expected spritesheet ${EXPECTED_ATLAS_WIDTH}x${EXPECTED_ATLAS_HEIGHT}, got ${dimensions.width}x${dimensions.height}`
    );
  }

  return {
    id: manifest.id ?? entryName,
    displayName: manifest.displayName ?? entryName,
    description: manifest.description ?? "",
    petDir,
    manifest,
    manifestPath,
    source,
    spritesheetPath
  };
}

function toPublicPet(pet) {
  return {
    id: pet.id,
    displayName: pet.displayName,
    description: pet.description,
    source: pet.source,
    petDir: pet.petDir,
    manifestPath: pet.manifestPath,
    spritesheetPath: pet.spritesheetPath,
    spritesheetUrl: pathToFileURL(pet.spritesheetPath).href
  };
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

export function parseWebpDimensions(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error("spritesheet is not a WebP file");
  }

  let offset = 12;

  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;

    if (chunkType === "VP8X") {
      return {
        width: 1 + readUInt24LE(buffer, dataOffset + 4),
        height: 1 + readUInt24LE(buffer, dataOffset + 7)
      };
    }

    if (chunkType === "VP8L") {
      const b0 = buffer[dataOffset + 1];
      const b1 = buffer[dataOffset + 2];
      const b2 = buffer[dataOffset + 3];
      const b3 = buffer[dataOffset + 4];

      return {
        width: 1 + (b0 | ((b1 & 0x3f) << 8)),
        height: 1 + (((b1 & 0xc0) >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10))
      };
    }

    if (chunkType === "VP8 ") {
      return {
        width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff
      };
    }

    offset += 8 + chunkSize + (chunkSize % 2);
  }

  throw new Error("could not find a supported WebP image chunk");
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function toSafeDirectoryName(id) {
  const safeName = id.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return safeName || "imported-pet";
}
