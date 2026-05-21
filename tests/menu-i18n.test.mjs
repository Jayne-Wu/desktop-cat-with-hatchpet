import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_LANGUAGE, getMenuText, normalizeLanguage } from "../app/shared/menu-i18n.mjs";

test("menu language defaults to Chinese", () => {
  assert.equal(DEFAULT_LANGUAGE, "zh-CN");
  assert.equal(normalizeLanguage(undefined), "zh-CN");
  assert.equal(getMenuText(undefined).companion, "陪伴风格");
  assert.equal(getMenuText(undefined).taskbarRun, "在任务栏上慢跑");
});

test("menu language supports English labels", () => {
  const text = getMenuText("en-US");

  assert.equal(text.companion, "Companion Style");
  assert.equal(text.playful, "Playful");
  assert.equal(text.pin, "Pin");
  assert.equal(text.unpin, "Unpin");
  assert.equal(text.taskbarRun, "Run on Taskbar");
  assert.equal(text.backToDesktop, "Back to Desktop");
});
