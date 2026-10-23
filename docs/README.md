# Documentation

Start with the [project README](../README.md) for setup, controls, game modes, AI Lab, and troubleshooting. Use [Contributing](../CONTRIBUTING.md) for development conventions and extension steps.

## Maintained guides

| Guide                                            | Use it for                                                                                     |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| [Architecture](architecture.md)                  | Runtime composition, ownership, state, input, physics, loading, and production hosting.        |
| [Testing](testing.md)                            | Automated coverage, focused commands, manual browser/device checks, and verification scope.    |
| [Hand-motion audit](hand-motion-verification.md) | Real-rig measurements, contact timing, desk clearance, and the unresolved opposite-edge reach. |

## Detailed references

- [Configuration](../src/config/README.md): defaults, environment overrides, validation, and saved-preference precedence.
- [AI](../src/game/ai/README.md): algorithm behavior, search limits, and headless matches.
- [Physics](../src/game/physics/README.md): collisions, support, tipping, and shared-fall scoring.
- [Game runtime](../src/features/game/README.md): React integration and match UI.
- [Pen assets](../public/models/pens/README.md), [audio credits](../public/audio/CREDITS.md), [texture credits](../public/textures/furniture/CREDITS.md), and [font credits](../public/fonts/CREDITS.md): asset handling and provenance.

Keep implementation details beside the owning module. Keep cross-module guidance here, and update the testing checklist when introducing behavior that needs manual verification.
