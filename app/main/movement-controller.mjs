import electron from "electron";
import {
  COMPANION_STYLE_PROFILES,
  DEFAULT_COMPANION_STYLE,
  normalizeCompanionStyle
} from "../shared/companion-options.mjs";

const { screen } = electron;

const STEP_MS = 50;
const WINDOW_MARGIN = 24;
const EDGE_THRESHOLD_PX = 56;
const SIDE_TOP_RATIO = 0.48;
const TASKBAR_SPEED_PX_PER_SECOND = 38;
const TASKBAR_WINDOW_ASPECT_RATIO = 1.25;
const TASKBAR_FALLBACK_HEIGHT = 48;

export class MovementController {
  constructor({ mainWindow, onStateChange, onPositionChanged, random = Math.random, screenApi = screen }) {
    this.mainWindow = mainWindow;
    this.onStateChange = onStateChange;
    this.onPositionChanged = onPositionChanged;
    this.random = random;
    this.screen = screenApi;
    this.companionStyle = DEFAULT_COMPANION_STYLE;
    this.profile = COMPANION_STYLE_PROFILES[this.companionStyle];
    this.mode = "desktop";
    this.phase = "observe";
    this.phaseRemainingMs = 0;
    this.edge = "bottom";
    this.horizontalDirection = this.random() < 0.5 ? -1 : 1;
    this.verticalDirection = -1;
    this.animationState = "idle";
    this.timer = null;
    this.dragging = false;
    this.lastStateKey = null;
    this.queuedPhase = null;
    this.rehomeTarget = null;
    this.interactionBoostRemainingMs = 0;
    this.desktopBoundsBeforeTaskbar = null;
    this.desktopMinimumSizeBeforeTaskbar = null;
    this.desktopAlwaysOnTopBeforeTaskbar = null;
    this.desktopSkipTaskbarBeforeTaskbar = null;
    this.taskbarGeometry = null;
  }

  applySettings(settings) {
    this.setCompanionStyle(settings?.companionStyle);
  }

  setCompanionStyle(style) {
    this.companionStyle = normalizeCompanionStyle(style);
    this.profile = COMPANION_STYLE_PROFILES[this.companionStyle];
    this.interactionBoostRemainingMs = 0;

    if (!this.timer) {
      this.primeMovementLoop();
      this.timer = setInterval(() => this.tick(STEP_MS), STEP_MS);
      return;
    }

    if (this.mode === "taskbar") {
      this.emitTaskbarSnapshot();
      return;
    }

    if (!this.dragging && this.phase !== "rehome") {
      this.phaseRemainingMs = Math.min(this.phaseRemainingMs, this.phaseDurationMs(this.phase));
    }

    this.emitSnapshot();
  }

  noteInteraction() {
    if (this.mode === "taskbar") {
      return;
    }

    const boostDurationMs = this.profile.interactionMoveBoostMs ?? 0;

    if (boostDurationMs <= 0) {
      return;
    }

    this.interactionBoostRemainingMs = Math.max(this.interactionBoostRemainingMs, boostDurationMs);

    if (this.phase === "observe" || this.phase === "settle") {
      this.phaseRemainingMs = Math.min(this.phaseRemainingMs, 1400);
    }

    this.emitSnapshot();
  }

  setAnimationState(stateId) {
    this.animationState = typeof stateId === "string" && stateId.trim() !== "" ? stateId : "idle";
  }

  setDragging(dragging) {
    if (this.mode === "taskbar") {
      return;
    }

    this.dragging = dragging;

    if (dragging) {
      this.queuedPhase = null;
      this.rehomeTarget = null;
      this.emitSnapshot({ phase: "settle", locomotion: "none" });
      return;
    }

    const placement = this.getPlacement();

    if (placement.edge) {
      this.edge = placement.edge;
      this.alignToEdge(placement.edge);
      this.startPhase(this.random() < 0.4 ? "settle" : "observe");
      return;
    }

    this.startQueuedRehome();
  }

  stop() {
    this.stopTimer();
    this.emitSnapshot({ phase: "observe", locomotion: "none" });
  }

  tick(deltaMs) {
    if (this.dragging || !this.mainWindow.isVisible()) {
      return;
    }

    if (this.mode === "taskbar") {
      this.moveAlongTaskbar(deltaMs);
      return;
    }

    this.interactionBoostRemainingMs = Math.max(0, this.interactionBoostRemainingMs - deltaMs);

    if (this.phase === "stroll") {
      this.moveAlongBottom(deltaMs);
    } else if (this.phase === "rehome") {
      this.completeRehome();
      return;
    } else {
      this.emitSnapshot();
    }

    this.phaseRemainingMs -= deltaMs;

    if (this.phaseRemainingMs <= 0) {
      this.advancePhase();
    }
  }

  primeMovementLoop() {
    if (this.mode === "taskbar") {
      this.alignToTaskbar();
      this.emitTaskbarSnapshot();
      return;
    }

    const placement = this.getPlacement();

    if (placement.edge) {
      this.edge = placement.edge;
      this.alignToEdge(placement.edge);
      this.startPhase("observe");
      return;
    }

    this.startQueuedRehome();
  }

  startPhase(phase, options = {}) {
    if (this.mode === "taskbar") {
      this.alignToTaskbar();
      this.emitTaskbarSnapshot();
      return;
    }

    this.phase = phase;
    this.queuedPhase = options.nextPhase ?? null;
    this.rehomeTarget = options.rehomeTarget ?? this.rehomeTarget;
    this.phaseRemainingMs =
      options.durationMs ?? randomInRange(options.rangeMs ?? this.phaseRangeFor(phase), this.random);
    this.emitSnapshot({ phase, locomotion: "none" });
  }

  startQueuedRehome() {
    if (this.mode === "taskbar") {
      return;
    }

    this.rehomeTarget = this.computeNearestEdgeTarget();
    this.startPhase("settle", {
      nextPhase: "rehome",
      rangeMs: this.profile.rehomeDelayRangeMs
    });
  }

  beginRehome() {
    if (this.mode === "taskbar") {
      return;
    }

    this.phase = "rehome";
    this.rehomeTarget = this.computeNearestEdgeTarget();
    this.emitSnapshot({ phase: "rehome", locomotion: "none" });
  }

  advancePhase() {
    if (this.mode === "taskbar") {
      this.emitTaskbarSnapshot();
      return;
    }

    if (this.phase === "settle" && this.queuedPhase === "rehome") {
      this.beginRehome();
      return;
    }

    if (this.phase === "rehome") {
      this.startPhase("observe");
      return;
    }

    if (this.phase === "stroll") {
      this.startPhase(this.random() < 0.58 ? "observe" : "settle");
      return;
    }

    if (this.phase === "observe") {
      this.startPhase(this.random() < this.activeProfile().observeToStrollChance ? "stroll" : "settle");
      return;
    }

    this.startPhase(this.random() < this.activeProfile().settleToStrollChance ? "stroll" : "observe");
  }

  moveAlongBottom(deltaMs) {
    const geometry = this.getGeometry();
    const bounds = this.mainWindow.getBounds();
    const desiredLocomotion = this.horizontalDirection > 0 ? "right" : "left";
    const desiredAnimationState = desiredLocomotion === "right" ? "running-right" : "running-left";

    if (this.edge !== "bottom") {
      this.edge = "bottom";
      this.alignToEdge("bottom");
      this.emitSnapshot({
        phase: "stroll",
        locomotion: desiredLocomotion,
        edge: this.edge
      });
      return;
    }

    if (this.animationState !== desiredAnimationState) {
      this.emitSnapshot({
        phase: "stroll",
        locomotion: desiredLocomotion,
        edge: this.edge
      });
      return;
    }

    const distance = (this.activeProfile().speedPxPerSecond * deltaMs) / 1000;
    let nextX = bounds.x + distance * this.horizontalDirection;

    if (nextX <= geometry.minX) {
      nextX = geometry.minX;
      this.horizontalDirection = 1;
    } else if (nextX >= geometry.maxX) {
      nextX = geometry.maxX;
      this.horizontalDirection = -1;
    }

    this.mainWindow.setPosition(Math.round(nextX), Math.round(geometry.bottomY));
    this.onPositionChanged?.();
    this.emitSnapshot({
      phase: "stroll",
      locomotion: this.horizontalDirection > 0 ? "right" : "left",
      edge: this.edge
    });
  }

  enterTaskbarMode() {
    if (this.mode !== "taskbar") {
      this.desktopBoundsBeforeTaskbar = this.mainWindow.getBounds();
      this.desktopMinimumSizeBeforeTaskbar = this.mainWindow.getMinimumSize?.() ?? null;
      this.desktopAlwaysOnTopBeforeTaskbar = this.mainWindow.isAlwaysOnTop?.() ?? null;
      this.desktopSkipTaskbarBeforeTaskbar = false;
    }

    this.mode = "taskbar";
    this.taskbarGeometry = this.getTaskbarGeometry();
    this.phase = "taskbar";
    this.phaseRemainingMs = Number.POSITIVE_INFINITY;
    this.queuedPhase = null;
    this.rehomeTarget = null;
    this.dragging = false;
    this.mainWindow.setSkipTaskbar?.(true);
    this.reassertTaskbarZOrder();
    this.alignToTaskbar();
    this.emitTaskbarSnapshot();
  }

  exitTaskbarMode() {
    if (this.mode !== "taskbar") {
      return;
    }

    this.mode = "desktop";
    this.phase = "observe";
    this.phaseRemainingMs = 0;
    this.queuedPhase = null;
    this.rehomeTarget = null;

    const restoreBounds = this.desktopBoundsBeforeTaskbar;

    if (restoreBounds) {
      this.mainWindow.setBounds?.(restoreBounds);
    }

    if (this.desktopMinimumSizeBeforeTaskbar) {
      this.mainWindow.setMinimumSize?.(
        this.desktopMinimumSizeBeforeTaskbar[0],
        this.desktopMinimumSizeBeforeTaskbar[1]
      );
    }

    if (this.desktopAlwaysOnTopBeforeTaskbar !== null) {
      this.mainWindow.setAlwaysOnTop?.(this.desktopAlwaysOnTopBeforeTaskbar, "screen-saver");
    }

    if (this.desktopSkipTaskbarBeforeTaskbar !== null) {
      this.mainWindow.setSkipTaskbar?.(this.desktopSkipTaskbarBeforeTaskbar);
    }

    this.desktopBoundsBeforeTaskbar = null;
    this.desktopMinimumSizeBeforeTaskbar = null;
    this.desktopAlwaysOnTopBeforeTaskbar = null;
    this.desktopSkipTaskbarBeforeTaskbar = null;
    this.taskbarGeometry = null;

    if (!restoreBounds) {
      this.alignToEdge("bottom");
    }

    this.startPhase("observe");
  }

  isTaskbarMode() {
    return this.mode === "taskbar";
  }

  moveAlongTaskbar(deltaMs) {
    this.reassertTaskbarZOrder();

    const geometry = this.taskbarGeometry ?? this.getTaskbarGeometry();
    const bounds = this.mainWindow.getBounds();
    const direction = this.getTaskbarDirection(geometry);
    const desiredLocomotion = this.getTaskbarLocomotion(geometry, direction);
    const desiredAnimationState =
      geometry.axis === "horizontal"
        ? desiredLocomotion === "right" ? "running-right" : "running-left"
        : "running";
    const offTrack =
      geometry.axis === "horizontal"
        ? Math.round(bounds.y) !== Math.round(geometry.y)
        : Math.round(bounds.x) !== Math.round(geometry.x);

    if (
      offTrack ||
      Math.round(bounds.width) !== Math.round(geometry.windowWidth) ||
      Math.round(bounds.height) !== Math.round(geometry.windowHeight)
    ) {
      this.alignToTaskbar();
      this.emitTaskbarSnapshot();
      return;
    }

    if (this.animationState !== desiredAnimationState) {
      this.emitTaskbarSnapshot();
      return;
    }

    const distance = (TASKBAR_SPEED_PX_PER_SECOND * deltaMs) / 1000;
    let nextPosition = this.getTaskbarPosition(bounds, geometry) + distance * direction;

    if (nextPosition <= geometry.minPosition) {
      nextPosition = geometry.minPosition;
      this.setTaskbarDirection(geometry, 1);
    } else if (nextPosition >= geometry.maxPosition) {
      nextPosition = geometry.maxPosition;
      this.setTaskbarDirection(geometry, -1);
    }

    this.setTaskbarBounds(nextPosition, geometry, false);
    this.onPositionChanged?.();
    this.emitTaskbarSnapshot();
  }

  alignToTaskbar() {
    const geometry = this.taskbarGeometry ?? this.getTaskbarGeometry();
    const bounds = this.mainWindow.getBounds();

    this.setTaskbarBounds(this.getTaskbarPosition(bounds, geometry), geometry, true);
    this.onPositionChanged?.({ immediate: true });
  }

  setTaskbarBounds(position, geometry, updateMinimumSize) {
    const nextBounds = {
      x: Math.round(geometry.axis === "horizontal" ? clamp(position, geometry.minPosition, geometry.maxPosition) : geometry.x),
      y: Math.round(geometry.y),
      width: geometry.windowWidth,
      height: geometry.windowHeight
    };

    if (geometry.axis === "vertical") {
      nextBounds.y = Math.round(clamp(position, geometry.minPosition, geometry.maxPosition));
    }

    if (updateMinimumSize) {
      this.mainWindow.setMinimumSize?.(geometry.windowWidth, geometry.windowHeight);
    }

    if (this.mainWindow.setBounds) {
      this.mainWindow.setBounds(nextBounds);
      this.reassertTaskbarZOrder();
      return;
    }

    this.mainWindow.setPosition(nextBounds.x, nextBounds.y);
    this.reassertTaskbarZOrder();
  }

  reassertTaskbarZOrder() {
    if (this.mode !== "taskbar") {
      return;
    }

    this.mainWindow.setAlwaysOnTop?.(true, "screen-saver");
    this.mainWindow.moveTop?.();
  }

  completeRehome() {
    if (!this.rehomeTarget) {
      this.rehomeTarget = this.computeNearestEdgeTarget();
    }

    this.mainWindow.setPosition(Math.round(this.rehomeTarget.x), Math.round(this.rehomeTarget.y));
    this.edge = this.rehomeTarget.edge;
    this.onPositionChanged?.({ immediate: true });
    this.startPhase("observe");
  }

  computeNearestEdgeTarget() {
    const geometry = this.getGeometry();
    const bounds = this.mainWindow.getBounds();
    return {
      edge: "bottom",
      x: clamp(bounds.x, geometry.minX, geometry.maxX),
      y: geometry.bottomY
    };
  }

  alignToEdge(edge) {
    const geometry = this.getGeometry();
    const bounds = this.mainWindow.getBounds();

    if (edge === "left") {
      this.mainWindow.setPosition(Math.round(geometry.minX), Math.round(clamp(bounds.y, geometry.sideTopY, geometry.bottomY)));
    } else if (edge === "right") {
      this.mainWindow.setPosition(
        Math.round(geometry.maxX),
        Math.round(clamp(bounds.y, geometry.sideTopY, geometry.bottomY))
      );
    } else {
      this.mainWindow.setPosition(
        Math.round(clamp(bounds.x, geometry.minX, geometry.maxX)),
        Math.round(geometry.bottomY)
      );
    }

    this.onPositionChanged?.({ immediate: true });
  }

  getPlacement() {
    const geometry = this.getGeometry();
    const bounds = this.mainWindow.getBounds();
    const nearLeft = Math.abs(bounds.x - geometry.minX) <= EDGE_THRESHOLD_PX;
    const nearRight = Math.abs(bounds.x - geometry.maxX) <= EDGE_THRESHOLD_PX;
    const nearBottom = Math.abs(bounds.y - geometry.bottomY) <= EDGE_THRESHOLD_PX;

    if (nearBottom) {
      return { edge: "bottom" };
    }

    if (nearLeft && bounds.y >= geometry.sideTopY - EDGE_THRESHOLD_PX) {
      return { edge: "left" };
    }

    if (nearRight && bounds.y >= geometry.sideTopY - EDGE_THRESHOLD_PX) {
      return { edge: "right" };
    }

    return { edge: null };
  }

  getGeometry() {
    const bounds = this.mainWindow.getBounds();
    const workArea = this.screen.getDisplayMatching(bounds).workArea;
    const minX = workArea.x + WINDOW_MARGIN;
    const maxX = workArea.x + workArea.width - bounds.width - WINDOW_MARGIN;
    const bottomY = workArea.y + workArea.height - bounds.height - WINDOW_MARGIN;
    const sideTopY = Math.min(
      bottomY,
      Math.round(workArea.y + workArea.height * SIDE_TOP_RATIO)
    );

    return {
      minX,
      maxX,
      bottomY,
      sideTopY
    };
  }

  getTaskbarGeometry() {
    const bounds = this.mainWindow.getBounds();
    const display = this.screen.getDisplayMatching(bounds);
    const displayBounds = display.bounds ?? display.workArea;
    const workArea = display.workArea ?? displayBounds;
    const taskbar = getTaskbarRect(displayBounds, workArea);
    const horizontal = taskbar.edge === "top" || taskbar.edge === "bottom";
    const thickness = horizontal ? taskbar.height : taskbar.width;
    const windowHeight = horizontal
      ? Math.max(1, Math.round(thickness))
      : Math.max(1, Math.round(thickness * TASKBAR_WINDOW_ASPECT_RATIO));
    const windowWidth = horizontal
      ? Math.max(1, Math.round(windowHeight * TASKBAR_WINDOW_ASPECT_RATIO))
      : Math.max(1, Math.round(thickness));
    const minPosition = horizontal ? taskbar.x + WINDOW_MARGIN : taskbar.y + WINDOW_MARGIN;
    const maxPosition = Math.max(
      minPosition,
      horizontal
        ? taskbar.x + taskbar.width - windowWidth - WINDOW_MARGIN
        : taskbar.y + taskbar.height - windowHeight - WINDOW_MARGIN
    );

    return {
      axis: horizontal ? "horizontal" : "vertical",
      edge: taskbar.edge,
      x: horizontal ? null : taskbar.x,
      y: horizontal ? taskbar.y : taskbar.y + WINDOW_MARGIN,
      minPosition,
      maxPosition,
      windowWidth,
      windowHeight
    };
  }

  getTaskbarDirection(geometry) {
    return geometry.axis === "horizontal" ? this.horizontalDirection : this.verticalDirection;
  }

  setTaskbarDirection(geometry, direction) {
    if (geometry.axis === "horizontal") {
      this.horizontalDirection = direction;
      return;
    }

    this.verticalDirection = direction;
  }

  getTaskbarPosition(bounds, geometry) {
    return geometry.axis === "horizontal" ? bounds.x : bounds.y;
  }

  getTaskbarLocomotion(geometry, direction) {
    if (geometry.axis === "vertical") {
      return "vertical";
    }

    return direction > 0 ? "right" : "left";
  }

  phaseRangeFor(phase) {
    const profile = this.activeProfile();

    if (phase === "stroll") {
      return profile.strollRangeMs;
    }

    if (phase === "settle") {
      return profile.settleRangeMs;
    }

    if (phase === "observe") {
      return profile.observeRangeMs;
    }

    return profile.observeRangeMs;
  }

  phaseDurationMs(phase) {
    const [min, max] = this.phaseRangeFor(phase);
    return min + (max - min) / 2;
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  activeProfile() {
    const boostProfileId =
      this.interactionBoostRemainingMs > 0 ? this.profile.interactionBoostProfileId : null;

    return (boostProfileId && COMPANION_STYLE_PROFILES[boostProfileId]) || this.profile;
  }

  emitSnapshot(overrides = {}) {
    const snapshot = {
      mode: overrides.mode ?? this.mode,
      companionStyle: this.companionStyle,
      phase: overrides.phase ?? this.phase,
      locomotion: overrides.locomotion ?? "none",
      edge: overrides.edge ?? this.edge
    };
    const key = JSON.stringify(snapshot);

    if (key === this.lastStateKey) {
      return;
    }

    this.lastStateKey = key;
    this.onStateChange(snapshot);
  }

  emitTaskbarSnapshot() {
    const geometry = this.taskbarGeometry ?? this.getTaskbarGeometry();
    this.emitSnapshot({
      mode: "taskbar",
      phase: "taskbar",
      locomotion: this.getTaskbarLocomotion(geometry, this.getTaskbarDirection(geometry)),
      edge: geometry.edge
    });
  }
}

function randomInRange([min, max], random) {
  return min + random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getTaskbarRect(displayBounds, workArea) {
  const displayRight = displayBounds.x + displayBounds.width;
  const displayBottom = displayBounds.y + displayBounds.height;
  const workAreaRight = workArea.x + workArea.width;
  const workAreaBottom = workArea.y + workArea.height;
  const candidates = [
    {
      edge: "bottom",
      size: Math.max(0, displayBottom - workAreaBottom),
      rect: {
        x: displayBounds.x,
        y: workAreaBottom,
        width: displayBounds.width,
        height: Math.max(0, displayBottom - workAreaBottom)
      }
    },
    {
      edge: "top",
      size: Math.max(0, workArea.y - displayBounds.y),
      rect: {
        x: displayBounds.x,
        y: displayBounds.y,
        width: displayBounds.width,
        height: Math.max(0, workArea.y - displayBounds.y)
      }
    },
    {
      edge: "left",
      size: Math.max(0, workArea.x - displayBounds.x),
      rect: {
        x: displayBounds.x,
        y: displayBounds.y,
        width: Math.max(0, workArea.x - displayBounds.x),
        height: displayBounds.height
      }
    },
    {
      edge: "right",
      size: Math.max(0, displayRight - workAreaRight),
      rect: {
        x: workAreaRight,
        y: displayBounds.y,
        width: Math.max(0, displayRight - workAreaRight),
        height: displayBounds.height
      }
    }
  ];
  const best = candidates.reduce((selected, candidate) => candidate.size > selected.size ? candidate : selected);

  if (best.size > 0) {
    return {
      edge: best.edge,
      ...best.rect
    };
  }

  return {
    edge: "bottom",
    x: displayBounds.x,
    y: displayBottom - TASKBAR_FALLBACK_HEIGHT,
    width: displayBounds.width,
    height: TASKBAR_FALLBACK_HEIGHT
  };
}
