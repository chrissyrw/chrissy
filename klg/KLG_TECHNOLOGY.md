# KLG — Distinctive Technology Direction

KLG is intentionally not being built as a conventional mission-driven web game. The technology should reinforce the player-experience model: a living Kigali, emergent opportunities, persistent consequences and an identity that forms from behavior.

## Runtime

- **Three.js** for the current browser prototype and fast iteration.
- **WebGPU-first rendering path** as the target for the high-fidelity renderer when browser/device support allows it.
- **glTF 2.0 + Draco/Meshopt + KTX2/Basis textures** for streaming-friendly world assets.
- **GPU instancing** for traffic, vegetation, street furniture and repeated city elements.

## Simulation

- Event-driven gameplay instead of hard-coded mission chains.
- Data-oriented arrays for high-volume traffic/NPC state.
- Spatial hashing / grid queries for nearby actors and opportunities instead of scanning the whole city.
- Lightweight persistent memory rather than saving every frame: relationships, district pressure, incidents and player behavior.

## Parallel AI

Heavy simulation is designed to move toward **Web Workers** so traffic, population pressure, opportunity scoring and district simulation do not block rendering.

The main thread should own presentation and player input; workers should own scalable simulation calculations.

## Procedural World

KLG should use procedural rules for:

- road-side activity density
- NPC routines
- traffic pressure
- business demand
- district atmosphere
- opportunity placement

This makes the city feel authored by rules rather than by a list of manually scripted missions.

## Future high-performance path

For expensive simulation kernels, the architecture should allow **WebAssembly** modules without coupling gameplay logic to WASM. For GPU-heavy calculations, a WebGPU compute path can later handle crowd/traffic fields and large-scale spatial queries.

## AI philosophy

LLM-style AI is not the simulation itself. The deterministic simulation owns truth. AI directors interpret simulation state, select possibilities and produce authored-feeling variations. This keeps gameplay reproducible and prevents the city from becoming random text generation.

## Asset pipeline

Blender/Houdini/Substance-style procedural workflows are preferred for production assets. Runtime assets should be optimized for streaming, instancing and LOD rather than simply importing high-poly models.

## Core principle

**Use unusual technology where it creates unusual player experience.**

Do not add technology because it sounds advanced. Every technology choice must improve one of:

1. city responsiveness,
2. emergent gameplay,
3. persistent consequences,
4. player identity,
5. world scale,
6. visual/audio immersion.
