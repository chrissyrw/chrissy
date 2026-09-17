# KLG Social Gameplay

KLG should make players memorable to one another without turning the city into a generic lobby.

## Core loop

```text
PLAYER ACTION
  -> visible signature
  -> encounter
  -> recognition
  -> trust / reputation
  -> cooperation or rivalry
  -> shared opportunity
  -> shared consequence
  -> stronger social memory
```

## Player recognition

Every player has a lightweight social identity:

- display name
- callsign
- archetype
- signature vehicle
- social style
- earned badge
- deterministic KLG social ID

The important design rule is that the identity is earned through behavior, not chosen as a class.

## How two players become known

### 1. Proximity encounter
Two players repeatedly operating in the same district become recognizable.

### 2. Shared activity
Completing the same emergent opportunity creates a stronger connection than simply standing nearby.

### 3. Help / endorsement
Players can endorse a useful behavior or tag a player after an encounter. Trust grows slowly rather than becoming an instant friend list.

### 4. Rivalry
Repeated competition can create a known rival relationship without requiring a formal matchmaking queue.

### 5. Crew formation
Players can form small crews around a specialty such as courier, racing, night operations, business, or exploration.

## Social discovery should happen inside Kigali

Avoid a permanent giant player list.

Instead:

- see a player's vehicle first
- recognize their callsign after repeated encounters
- remember where you met
- discover their reputation through actions
- get social opportunities from the city

This makes meeting another player feel like an event in the world.

## Trust model

Trust is gradual:

- first encounter: recognition
- repeat encounter: familiarity
- cooperation: trust increase
- reliable help: strong trust
- betrayal/failure: trust loss
- repeated conflict: rivalry

Trust should affect future social opportunities, not simply unlock cosmetic badges.

## Privacy / safety direction

Only expose the minimum public profile needed for gameplay. Keep communication tools opt-in, provide block/mute/report hooks, and avoid exposing private account information through the world simulation.

## Technical direction

`SocialWorldSystem` is intentionally transport-agnostic. The current implementation provides the gameplay model and persistence shape. A production multiplayer backend can later feed remote player snapshots/events into it through a network adapter without rewriting the social gameplay layer.

Future production layers:

1. WebSocket/WebTransport session service
2. authoritative server-side player state
3. spatial interest management
4. server-side trust/reputation validation
5. anti-cheat validation
6. presence matchmaking by district/activity
7. asynchronous social memory for players who are offline

The city remains the meeting place; the backend should support the city rather than replace it with a lobby.
