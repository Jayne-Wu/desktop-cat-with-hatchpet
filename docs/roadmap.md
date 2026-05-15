# Roadmap

## Milestone 1: Asset Player

Goal: prove that the app can directly reuse existing Codex/Hatchpet pet assets.

Deliverables:

- scan local `pets/`
- load `pet.json`
- load and render `spritesheet.webp`
- play all nine states using the fixed atlas contract

## Milestone 2: Desktop Shell

Goal: establish a viable desktop-pet container.

Deliverables:

- transparent frameless always-on-top window
- tray menu
- pet switching
- basic renderer controls

## Milestone 3: Interaction Runtime

Goal: make the pet feel responsive rather than only decorative.

Deliverables:

- click reaction states
- lightweight random ambient behavior
- simple state queueing and interruption rules

## Milestone 4: Movement

Goal: turn the player into a desktop pet rather than a floating animated sticker.

Deliverables:

- dragging
- scale controls
- edge-aware horizontal travel
- idle placement and anchor rules

## Milestone 5: Productization

Goal: make the app usable as a persistent desktop companion.

Deliverables:

- settings persistence
- launch at startup
- packaging
- logs and basic diagnostics

## Milestone 6: Extensibility

Goal: support richer pet behaviors and ecosystem growth.

Deliverables:

- optional desktop-only manifest extensions
- multiple pets
- plugin or event hooks
- desktop event integrations
