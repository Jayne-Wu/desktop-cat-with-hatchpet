import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_SETTINGS = {
  selectedPetId: null,
  scale: 1.25,
  windowPosition: null
};

export async function readSettings(userDataPath) {
  const settingsPath = getSettingsPath(userDataPath);

  try {
    const raw = await readFile(settingsPath, "utf8");
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function writeSettings(userDataPath, partialSettings) {
  const settingsPath = getSettingsPath(userDataPath);
  const current = await readSettings(userDataPath);
  const next = normalizeSettings({
    ...current,
    ...partialSettings
  });

  await mkdir(path.dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

function getSettingsPath(userDataPath) {
  return path.join(userDataPath, "settings.json");
}

function normalizeSettings(settings) {
  const scale = Number(settings?.scale);
  const position = normalizeWindowPosition(settings?.windowPosition);

  return {
    selectedPetId:
      typeof settings?.selectedPetId === "string" && settings.selectedPetId.trim() !== ""
        ? settings.selectedPetId
        : null,
    scale: Number.isFinite(scale) ? Math.min(2, Math.max(1, scale)) : DEFAULT_SETTINGS.scale,
    windowPosition: position
  };
}

function normalizeWindowPosition(position) {
  if (!position || typeof position !== "object") {
    return null;
  }

  const x = Number(position.x);
  const y = Number(position.y);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return {
    x: Math.round(x),
    y: Math.round(y)
  };
}
