import assert from "node:assert/strict";
import { test } from "node:test";
import { AtlasPlayer } from "../app/renderer/pet/atlas-player.js";

test("still state locks playback to the first idle frame", () => {
  const player = new AtlasPlayer();
  player.attachPet({
    atlas: {
      cellWidth: 192,
      cellHeight: 208
    },
    states: {
      idle: { id: "idle" }
    }
  });

  player.setState("still");
  const firstFrame = player.update(1000);
  const secondFrame = player.update(100000);

  assert.equal(firstFrame.stateId, "still");
  assert.equal(firstFrame.row, 0);
  assert.equal(firstFrame.frameIndex, 0);
  assert.deepEqual(secondFrame, firstFrame);
});
