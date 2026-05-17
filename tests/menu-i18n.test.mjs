import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_LANGUAGE, getMenuText, normalizeLanguage } from "../app/shared/menu-i18n.mjs";

test("menu language defaults to Chinese", () => {
  assert.equal(DEFAULT_LANGUAGE, "zh-CN");
  assert.equal(normalizeLanguage(undefined), "zh-CN");
  assert.equal(getMenuText(undefined).behavior, "行为");
});

test("menu language supports English labels", () => {
  const text = getMenuText("en-US");

  assert.equal(text.behavior, "Behavior");
  assert.equal(text.clickThrough, "Click Through");
});
