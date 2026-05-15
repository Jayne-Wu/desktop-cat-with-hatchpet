import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PETS_ROOT = path.join(ROOT, "pets");
const EXPECTED_WIDTH = 1536;
const EXPECTED_HEIGHT = 1872;

let failed = false;

const entries = await readdir(PETS_ROOT, { withFileTypes: true });

for (const entry of entries) {
  if (!entry.isDirectory()) {
    continue;
  }

  const petDir = path.join(PETS_ROOT, entry.name);
  const manifestPath = path.join(petDir, "pet.json");

  try {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const manifestError = validateManifest(manifest);

    if (manifestError) {
      throw new Error(manifestError);
    }

    const spritesheetPath = path.join(petDir, manifest.spritesheetPath);
    const dimensions = parseWebpDimensions(await readFile(spritesheetPath));

    if (dimensions.width !== EXPECTED_WIDTH || dimensions.height !== EXPECTED_HEIGHT) {
      throw new Error(
        `Expected ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}, got ${dimensions.width}x${dimensions.height}`
      );
    }

    console.log(`OK ${manifest.id}: ${dimensions.width}x${dimensions.height}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${entry.name}: ${error.message}`);
  }
}

if (failed) {
  process.exitCode = 1;
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

  return null;
}

function parseWebpDimensions(buffer) {
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
