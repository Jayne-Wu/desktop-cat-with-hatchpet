# Architecture

## Goal

Build a desktop pet application that treats Codex/Hatchpet pet assets as a first-class runtime format instead of converting them into a new bespoke asset pipeline.

## Design Principles

- Reuse existing assets without re-authoring.
- Keep asset parsing separate from runtime behavior.
- Keep desktop shell concerns separate from pet animation logic.
- Start with a stable pet player, then evolve it into an automatic companion.

## System Layers

### 1. Asset Layer

Owns local pet files:

```text
pets/<pet-id>/
  pet.json
  spritesheet.webp
```

Responsibilities:

- store authored pet output exactly as produced by Hatchpet/Codex
- avoid mutating packaged pet assets at runtime
- allow multiple pets to coexist under one local folder

### 2. Adapter Layer

Reads Codex/Hatchpet assets and maps them into an internal runtime model.

Responsibilities:

- read `pet.json`
- resolve `spritesheet.webp`
- apply the fixed atlas contract
- expose animation metadata to the runtime

This layer is where future support for other pet formats can be added without rewriting the runtime.

### 3. Runtime Layer

Owns playback, state changes, and pet-like companion behavior.

Responsibilities:

- animation playback
- state transitions
- timing
- interaction responses
- companion-style pacing and movement policies

### 4. Desktop App Layer

Owns operating-system integration.

Responsibilities:

- transparent always-on-top window
- tray menu
- pet selection
- future settings and startup integration

## Current Module Map

```text
app/
  main/
    electron-main.mjs
    preload.cjs
    pet-registry.mjs
    tray.mjs
    window.mjs
  renderer/
    pet/
      codex-pet-spec.js
      pet-loader.js
      atlas-player.js
      pet-behavior.js
      pet-renderer.js
```

## Data Flow

1. The main process scans `pets/`.
2. The renderer requests the pet list over the preload bridge.
3. The renderer loads one pet manifest and image.
4. The adapter applies the Codex atlas contract.
5. The runtime maps companion intent into animation states.
6. The renderer draws the active frame onto a transparent canvas.

## Runtime Boundaries

### Main Process

- file-system access
- tray lifecycle
- window creation
- asset discovery

### Renderer

- image loading
- animation playback
- companion-state mapping
- drawing
- local user interactions

## Planned Evolution

### Near-Term

- companion styles in the runtime and menu
- pet scaling
- drag support
- pet switching from tray and renderer

### Mid-Term

- edge-biased strolling with settle/observe/rehome phases
- richer automatic companion behavior
- click-through mode
- settings persistence

### Long-Term

- multiple simultaneous pets
- plugin or event hooks
- expanded pet manifest extensions for desktop-only features
