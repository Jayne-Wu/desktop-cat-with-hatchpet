# Pet Format

## Supported Format

The runtime currently treats the Codex/Hatchpet package format as its native v1 asset format.

Expected structure:

```text
pets/<pet-id>/
  pet.json
  spritesheet.webp
```

## Manifest

Expected `pet.json` shape:

```json
{
  "id": "pet-name",
  "displayName": "Pet Name",
  "description": "One short sentence.",
  "spritesheetPath": "spritesheet.webp"
}
```

## Atlas Contract

- dimensions: `1536x1872`
- columns: `8`
- rows: `9`
- cell width: `192`
- cell height: `208`
- unused cells: fully transparent

## State Contract

The runtime assumes these row meanings and frame counts:

| Row | State | Used Frames |
| --- | --- | ---: |
| 0 | `idle` | 6 |
| 1 | `running-right` | 8 |
| 2 | `running-left` | 8 |
| 3 | `waving` | 4 |
| 4 | `jumping` | 5 |
| 5 | `failed` | 8 |
| 6 | `waiting` | 6 |
| 7 | `running` | 6 |
| 8 | `review` | 6 |

## Compatibility Strategy

The application adapts itself to the Codex contract instead of transforming the asset package.

That means:

- existing Hatchpet output can be dropped into `pets/`
- the runtime owns state semantics and frame timing
- future formats should be added through new adapters, not by changing the current v1 format

## Future Extension Policy

If desktop-only metadata is needed later, prefer additive optional fields such as:

```json
{
  "desktop": {
    "defaultScale": 1.25,
    "preferredAnchor": "bottom-center"
  }
}
```

The base Codex/Hatchpet contract should remain valid even when those optional fields are absent.
