import { screen } from "electron";
import { DEFAULT_CLICK_THROUGH, normalizeClickThrough, normalizeMovementMode } from "../shared/movement-options.mjs";

const STEP_MS = 50;
const WALK_SPEED_PX_PER_SECOND = 72;
const WINDOW_MARGIN = 24;
const WALK_DURATION_RANGE_MS = [7000, 12000];
const REST_DURATION_RANGE_MS = [6000, 11000];

export class MovementController {
  constructor({ mainWindow, onStateChange, onPositionChanged, random = Math.random }) {
    this.mainWindow = mainWindow;
    this.onStateChange = onStateChange;
    this.onPositionChanged = onPositionChanged;
    this.random = random;
    this.mode = "still";
    this.direction = -1;
    this.phase = "rest";
    this.phaseRemainingMs = 0;
    this.timer = null;
    this.dragging = false;
    this.lastState = null;
    this.clickThrough = DEFAULT_CLICK_THROUGH;
  }

  applySettings(settings) {
    this.setClickThrough(settings?.clickThrough);
    this.setMode(settings?.movementMode);
  }

  setMode(mode) {
    const nextMode = normalizeMovementMode(mode);
    this.mode = nextMode;
    this.stopTimer();

    if (nextMode === "dock-left" || nextMode === "dock-right") {
      this.dock(nextMode === "dock-left" ? "left" : "right");
      this.emitState("idle");
      return;
    }

    if (nextMode === "bottom-walk") {
      this.startWalkingPhase();
      this.timer = setInterval(() => this.tick(STEP_MS), STEP_MS);
      return;
    }

    this.emitState("idle");
  }

  setClickThrough(value) {
    this.clickThrough = normalizeClickThrough(value);
    this.mainWindow.setIgnoreMouseEvents(this.clickThrough, { forward: true });
  }

  setDragging(dragging) {
    this.dragging = dragging;

    if (dragging) {
      this.emitState("idle");
      return;
    }

    if (this.mode === "bottom-walk") {
      this.snapToBottom();
    }
  }

  stop() {
    this.stopTimer();
    this.emitState("idle");
  }

  tick(deltaMs) {
    if (this.dragging || !this.mainWindow.isVisible()) {
      return;
    }

    this.phaseRemainingMs -= deltaMs;

    if (this.phase === "walk") {
      this.moveAlongBottom(deltaMs);
    } else {
      this.emitState("idle");
    }

    if (this.phaseRemainingMs <= 0) {
      if (this.phase === "walk") {
        this.startRestPhase();
      } else {
        this.startWalkingPhase();
      }
    }
  }

  moveAlongBottom(deltaMs) {
    const bounds = this.mainWindow.getBounds();
    const workArea = screen.getDisplayMatching(bounds).workArea;
    const minX = workArea.x + WINDOW_MARGIN;
    const maxX = workArea.x + workArea.width - bounds.width - WINDOW_MARGIN;
    const bottomY = workArea.y + workArea.height - bounds.height - WINDOW_MARGIN;
    const distance = (WALK_SPEED_PX_PER_SECOND * deltaMs) / 1000;
    let nextX = bounds.x + distance * this.direction;

    if (nextX <= minX) {
      nextX = minX;
      this.direction = 1;
    } else if (nextX >= maxX) {
      nextX = maxX;
      this.direction = -1;
    }

    this.mainWindow.setPosition(Math.round(nextX), Math.round(bottomY));
    this.emitState(this.direction > 0 ? "running-right" : "running-left");
    this.onPositionChanged?.();
  }

  dock(side) {
    const bounds = this.mainWindow.getBounds();
    const workArea = screen.getDisplayMatching(bounds).workArea;
    const x =
      side === "left"
        ? workArea.x + WINDOW_MARGIN
        : workArea.x + workArea.width - bounds.width - WINDOW_MARGIN;
    const y = clamp(bounds.y, workArea.y + WINDOW_MARGIN, workArea.y + workArea.height - bounds.height - WINDOW_MARGIN);

    this.mainWindow.setPosition(Math.round(x), Math.round(y));
    this.onPositionChanged?.({ immediate: true });
  }

  snapToBottom() {
    const bounds = this.mainWindow.getBounds();
    const workArea = screen.getDisplayMatching(bounds).workArea;
    const x = clamp(bounds.x, workArea.x + WINDOW_MARGIN, workArea.x + workArea.width - bounds.width - WINDOW_MARGIN);
    const y = workArea.y + workArea.height - bounds.height - WINDOW_MARGIN;

    this.mainWindow.setPosition(Math.round(x), Math.round(y));
    this.onPositionChanged?.({ immediate: true });
  }

  startWalkingPhase() {
    this.phase = "walk";
    this.phaseRemainingMs = randomInRange(WALK_DURATION_RANGE_MS, this.random);
    this.snapToBottom();
  }

  startRestPhase() {
    this.phase = "rest";
    this.phaseRemainingMs = randomInRange(REST_DURATION_RANGE_MS, this.random);
    this.emitState("idle");
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  emitState(state) {
    if (state === this.lastState) {
      return;
    }

    this.lastState = state;
    this.onStateChange(state);
  }
}

function randomInRange([min, max], random) {
  return min + random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
