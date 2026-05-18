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

export class MovementController {
  constructor({ mainWindow, onStateChange, onPositionChanged, random = Math.random, screenApi = screen }) {
    this.mainWindow = mainWindow;
    this.onStateChange = onStateChange;
    this.onPositionChanged = onPositionChanged;
    this.random = random;
    this.screen = screenApi;
    this.companionStyle = DEFAULT_COMPANION_STYLE;
    this.profile = COMPANION_STYLE_PROFILES[this.companionStyle];
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

    if (!this.dragging && this.phase !== "rehome") {
      this.phaseRemainingMs = Math.min(this.phaseRemainingMs, this.phaseDurationMs(this.phase));
    }

    this.emitSnapshot();
  }

  noteInteraction() {
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
    this.phase = phase;
    this.queuedPhase = options.nextPhase ?? null;
    this.rehomeTarget = options.rehomeTarget ?? this.rehomeTarget;
    this.phaseRemainingMs =
      options.durationMs ?? randomInRange(options.rangeMs ?? this.phaseRangeFor(phase), this.random);
    this.emitSnapshot({ phase, locomotion: "none" });
  }

  startQueuedRehome() {
    this.rehomeTarget = this.computeNearestEdgeTarget();
    this.startPhase("settle", {
      nextPhase: "rehome",
      rangeMs: this.profile.rehomeDelayRangeMs
    });
  }

  beginRehome() {
    this.phase = "rehome";
    this.rehomeTarget = this.computeNearestEdgeTarget();
    this.emitSnapshot({ phase: "rehome", locomotion: "none" });
  }

  advancePhase() {
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
}

function randomInRange([min, max], random) {
  return min + random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
