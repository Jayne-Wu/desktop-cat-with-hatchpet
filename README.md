# Desktop Cat With Hatchpet

Desktop pet runtime scaffold that directly reuses Codex/Hatchpet assets:

- `pet.json`
- `spritesheet.webp`

Current goals:

- load pets from the local `pets/` directory
- interpret the Codex 9-state atlas contract
- render a transparent desktop pet window
- provide a small runtime and documentation base for future behavior work

## Quick Start

1. Install Node.js LTS with npm.

This project expects the official Node.js LTS toolchain. If Node is not installed globally, use the local toolchain prepared under `.tools/` after environment setup.

2. Install dependencies:

```bash
npm install
```

3. Put one or more pets under `pets/<pet-id>/`:

```text
pets/
  my-pet/
    pet.json
    spritesheet.webp
```

4. Validate pet assets:

```bash
npm run validate:pets
```

5. Start the app:

```bash
npm run dev
```

## Included Pets

Local test pets can be placed under `pets/`, but real pet assets are ignored by Git so they are not uploaded to GitHub.

The current local test pets are:

- `simba`
- `xigua`

## Project Layout

- `docs/`: architecture, format, runtime semantics, roadmap
- `app/main/`: Electron main-process files
- `app/renderer/`: renderer UI and pet runtime modules
- `pets/`: local pet assets compatible with Codex/Hatchpet

## Current Scope

This scaffold focuses on:

- native support for existing Codex/Hatchpet assets
- a simple transparent pet player
- a small state/animation runtime

It does not yet include:

- full physics or edge walking
- click-through mode
- multi-pet orchestration
- packaging and auto-update
