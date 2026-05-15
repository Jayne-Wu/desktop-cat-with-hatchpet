# Runtime States

This runtime intentionally preserves the original Codex/Hatchpet interpretation of the nine animation rows.

## States

### `idle`

Default calm loop. This is the baseline state when no stronger behavior is active.

### `running-right`

Directional movement to the right. In early builds this may be used as a visual action before true desktop locomotion exists.

### `running-left`

Directional movement to the left. Same semantic notes as `running-right`.

### `waving`

Greeting, acknowledgement, or friendly attention cue. Good for click feedback or random social moments.

### `jumping`

Short energetic reaction. Good for playful click response or periodic activity beats.

### `failed`

Error, deflated, or frustrated expression. Useful later for event hooks or interruption reactions.

### `waiting`

Blocked, expectant, or asking-for-input pose. Useful as a passive prompt state when the user has not interacted recently.

### `running`

Busy working state. This should not be interpreted as locomotion. It represents processing, concentration, or effort.

### `review`

Focused thinking or inspection loop. Useful for a quiet active state that is distinct from `idle`.

## Initial Runtime Policy

The first runtime version should interpret states like this:

- default: `idle`
- click reaction: `waving` or `jumping`
- random ambient actions: `review`, `running`, `waiting`
- manual test controls: allow switching through all nine states

## Future Runtime Policy

When movement exists, these rules should stay stable:

- use `running-right` and `running-left` only for directional travel
- keep `running` for working or processing behavior
- treat `waiting` as a prompt-like state, not a generic idle variant
- keep `review` visibly more focused than `idle`
