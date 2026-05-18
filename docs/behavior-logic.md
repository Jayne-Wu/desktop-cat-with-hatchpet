# Behavior Logic

This document explains how the desktop pet decides which animation state to play, what can trigger each state, and when the window is actually allowed to move.

## Overview

The runtime has two cooperating layers:

- Main process movement controller
  - decides where the pet window is on screen
  - decides whether it is observing, settling, strolling, or rehoming
  - emits a movement snapshot to the renderer
- Renderer pet behavior
  - receives the movement snapshot
  - tracks click interaction, mood, and short-lived action bursts
  - maps the current situation to one of the atlas states, plus a runtime-only `still` state

In practice, animation selection follows this priority:

1. Active interaction action such as `waving`, `jumping`, or `review`
2. Directional locomotion from movement, such as `running-left` or `running-right`
3. Runtime-only `still` when the style wants true rest
4. Passive observe / settle behavior, mapped by companion style and mood

The important movement rule today is:

- the pet only physically moves when the current animation is `running-left` or `running-right`
- all other states are visual-only and stay in place

## Trigger Sources

### 1. Startup

On startup, the renderer reads settings, restores the saved freeform scale, and seeds behavior with the saved `companionStyle`.

Effect:

- pet starts in `observe`
- `companionStyle` is restored from settings
- window size is restored from the saved continuous scale value
- renderer immediately resolves the first animation state

### 2. Left click on the pet

Clicking the pet triggers two things at the same time:

- renderer calls `behavior.triggerInteraction()`
- main process receives `pet:interaction` and lets the movement controller react

Renderer-side effect:

- resets `timeSinceInteractionMs`
- sets `mood` to `playful`
- starts a short-lived action burst
- applies per-style click cooldown

Main-process effect:

- only `focus` currently reacts with a movement boost
- during that boost, `focus` temporarily borrows the more mobile `curious` pacing
- after the boost window expires, it falls back to normal `focus` behavior

### 3. Dragging the pet

Dragging is handled by the renderer pointer events and the main process window drag IPC.

Effect while dragging:

- movement controller marks the pet as dragging
- emitted movement phase becomes settle-like and locomotion is suppressed
- click action is suppressed if the pointer movement crossed the drag threshold

Effect after drag ends:

- if released near the bottom edge, the pet aligns there
- if released away from the bottom edge, it enters a delayed rehome sequence:
  - `settle`
  - then `rehome`
  - then `observe`

### 4. Companion style switch

Changing companion style from the menu updates both settings and the movement controller profile.

Effect:

- future stroll / observe / settle timing changes immediately
- renderer behavior mapping changes immediately
- current interaction burst is not converted into a different animation mid-flight

## Main Process Movement Logic

The movement controller emits snapshots with this shape:

```js
{
  companionStyle,
  phase,
  locomotion,
  edge
}
```

### Movement phases

#### `observe`

The pet is stationary and quietly present near the bottom edge.

Typical next phase:

- `stroll` if the current style wants to move
- `settle` if the current style prefers to remain quiet a bit longer

#### `settle`

The pet is stationary but in a more resting-in-place mode than `observe`.

Typical next phase:

- `observe`
- `stroll`
- or `rehome` if the pet was dropped away from the bottom edge

#### `stroll`

The pet is actively trying to move along the bottom edge.

Behavior:

- only bottom-edge left/right locomotion is used for animated travel
- before the window moves, the controller first asks the renderer to switch to `running-left` or `running-right`
- if another action such as `waving`, `jumping`, or `review` is active, the controller pauses movement and waits
- once the directional animation is active, the window starts moving

#### `rehome`

The pet returns to the bottom edge after being dropped into the desktop interior.

Behavior:

- snaps to the nearest valid bottom-edge position
- does not animate the return with `running`
- returns to `observe` immediately after snapping

### Edge territory

The pet does not freely roam the entire desktop.

Allowed activity region:

- bottom edge is the active travel territory
- other positions can exist temporarily after dragging
- the pet no longer uses vertical edge travel during automatic behavior

### 4. Resizing the pet

Resizing is handled by the right-bottom resize grip in the renderer and window resize IPC in the main process.

Effect:

- the resize grip is a larger invisible hit target in the lower-right corner
- scale is continuous, not limited to small / medium / large presets
- resizing keeps the bottom edge visually anchored so the pet does not appear to float
- the final scale is written to local settings when the pointer is released

### 5. Menus and window controls

The right-click menu and tray menu share the same menu template.

Current menu responsibilities:

- pet switching
- companion style switching
- position reset
- language switching
- bottom control group: `Pin / Unpin`, `Hide`, `Quit`

Click-through mode has been removed, so the pet remains clickable even if older local settings contain a legacy `clickThrough` value.

### Companion style profiles

The main tuning values live in `app/shared/companion-options.mjs`.

#### `quiet`

- slower movement
- medium chance to leave observation and stroll
- long observe and settle windows
- no interaction movement boost

#### `curious`

- balanced default behavior
- frequent transitions into strolling
- moderate observe and settle windows
- no interaction movement boost

#### `playful`

- fastest movement
- highest chance to keep moving
- shortest observe / settle windows
- no interaction movement boost because it is already active by default

#### `focus`

- very long observe and settle windows
- does not start bottom strolling during passive observe / settle
- on click, gets a temporary movement boost for about 6.5 seconds
- the movement boost uses the `curious` profile, then expires automatically

## Renderer Behavior Logic

Renderer behavior tracks these concepts:

- `movementState`
- `mood`
- `clickCooldownMs`
- `playfulBurstMs`
- `timeSinceInteractionMs`
- `activeAction`

### Mood states

Mood is not a direct animation. It affects how observation and interaction resolve.

#### `playful`

Triggered by:

- left click, when interaction is accepted

Ends when:

- `playfulBurstMs` reaches 0

#### `curious`

Triggered by:

- being recently interacted with, but no longer in active playful burst

Window:

- while `timeSinceInteractionMs < 12000`

#### `calm`

Triggered by:

- enough time passing without interaction

Window:

- after `calmAfterMs`, currently 45 seconds

#### `sleepy`

Triggered by:

- long inactivity

Window:

- after `sleepAfterMs`, currently 120 seconds

### Action burst priority

When a click-triggered action is active, it overrides all passive behavior.

Possible interaction states:

- `waving`
- `jumping`
- `review`

Loop counts:

- `waving`: 2 cycles
- `jumping`: 1 cycle
- `review`: 2 cycles

After the burst ends, behavior falls back to automatic state resolution.

## Final Animation Mapping

This is the effective state mapping used today.

### `still`

Triggered when:

- no active action
- no locomotion
- companion style is `focus`
- phase is `observe` or `settle`

Implementation notes:

- `still` is a runtime-only state, not a new atlas row
- it locks rendering to frame 0 of the `idle` row
- no frame timer advances while `still` is active

### `idle`

Triggered when:

- no active action
- no locomotion
- phase is `observe` and style is `quiet`
- or phase is `settle` and no stronger waiting rule applies

Notes:

- this animation is intentionally very slow and uneven
- it acts like a breathing / lingering loop rather than a neutral cycle

### `running-right`

Triggered when:

- movement controller emits `locomotion: "right"`

Typical source:

- strolling along the bottom edge toward the right

### `running-left`

Triggered when:

- movement controller emits `locomotion: "left"`

Typical source:

- strolling along the bottom edge toward the left

### `running`

Triggered when:

- observe phase is `playful` style and no stronger state wins

Notes:

- this is a visual busy / active state only
- it does not imply physical movement

### `waving`

Triggered only by click interaction burst.

Weighted chance by style:

- `quiet`: 50%
- `curious`: 40%
- `playful`: 35%
- `focus`: 35%

### `jumping`

Triggered only by click interaction burst.

Weighted chance by style:

- `quiet`: 15%
- `curious`: 25%
- `playful`: 45%
- `focus`: 15%

### `review`

Triggered by either interaction or passive observation.

As an interaction burst:

- `quiet`: 35%
- `curious`: 35%
- `playful`: 20%
- `focus`: 50%

As a passive state:

- while `playfulBurstMs > 0` during observe
- as the general fallback observe state for most styles

### `waiting`

Triggered passively, not by direct click burst.

Used when:

- mood is `sleepy` during observe
- companion style is `quiet` during settle

This is the most resting / paused passive state in current behavior logic.

### `failed`

Current trigger:

- none in the automatic companion runtime

Status:

- reserved for future event hooks, task failure, or interruption semantics

## Animation Pacing Groups

The runtime uses three pacing groups instead of forcing every state onto one identical timing curve.

### 1. Directional locomotion group

States:

- `running-left`
- `running-right`

Intent:

- fast and readable desktop travel
- should always feel clearly in motion

### 2. Static companion group

States:

- `idle`
- `waiting`
- `review`
- `still` is runtime-only, but conceptually belongs here

Intent:

- quiet presence
- slow breathing / lingering energy
- lower visual noise during passive companionship

### 3. Interaction feedback group

States:

- `waving`
- `jumping`
- `failed`
- `running`

Intent:

- preserve stronger feedback and character
- stay noticeably quicker than `idle`
- avoid the “everything feels sedated” problem from full timing unification

## Idle Timing

Current `idle` frame durations:

```js
[3600, 480, 900, 420, 1320, 4200]
```

Design intent:

- first and last poses hold much longer
- middle frames feel like tiny breathing shifts
- the loop should read as lingering presence, not constant animation

## Interaction Cooldown and Burst by Style

### `quiet`

- click cooldown: 520 ms
- playful burst: 4200 ms

### `curious`

- click cooldown: 420 ms
- playful burst: 5600 ms

### `playful`

- click cooldown: 320 ms
- playful burst: 7200 ms

### `focus`

- click cooldown: 620 ms
- playful burst: 3200 ms
- movement boost: 6500 ms using `curious` move pacing

## Practical Editing Guide

If you want to change a behavior, use this shortcut:

- Change which animation a situation maps to:
  - edit `app/renderer/pet/pet-behavior.js`
- Change how often the pet moves or rests:
  - edit `app/shared/companion-options.mjs`
- Change how bottom-edge movement works:
  - edit `app/main/movement-controller.mjs`
- Change animation playback speed:
  - edit `app/renderer/pet/codex-pet-spec.js`

## Known Gaps

- `failed` is still unused in automatic behavior
- no desktop-time schedule such as day/night or work hours
- no long-term memory or affinity system
- no asset-defined personality overrides in `pet.json`
