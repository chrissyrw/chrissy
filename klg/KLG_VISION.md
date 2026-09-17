# KLG — The Game That Doesn't Play Like a Conventional Open-World

## Core idea

Kigali Legends is not designed as a map full of missions waiting for the player.

The city itself is the game.

The player enters a living Kigali simulation and becomes a catalyst. People, traffic, businesses, weather, police, opportunities and rival drivers continuously react to what is happening. The player does not simply consume content; the player creates situations.

The target experience is:

```text
LIVE IN KIGALI
      ↓
NOTICE SOMETHING
      ↓
MAKE A CHOICE
      ↓
CREATE A CONSEQUENCE
      ↓
THE CITY REACTS
      ↓
NEW OPPORTUNITIES APPEAR
      ↓
YOUR LEGEND CHANGES
```

## 1. No traditional mission-first design

The game should not depend on a giant list of missions with map markers.

Instead, the world generates opportunities from its current state.

Examples:

- A market becomes overloaded → urgent delivery opportunity appears.
- Rain hits a hill district → roads become dangerous and new driving opportunities emerge.
- A traffic incident blocks a major route → shortcuts become valuable.
- A business runs low on stock → a player can discover a supply contract.
- Police pressure rises → some activities become riskier while other opportunities appear.
- Nightlife grows → districts become more social, crowded and unpredictable.

A mission is therefore a **consequence of simulation**, not a pre-scripted checkbox.

## 2. The player is a catalyst, not a hero following a script

KLG should not assume that every player wants the same fantasy.

One player may become:

- a street racer
- a trusted courier
- a vehicle collector
- a business operator
- a risky night driver
- a hill specialist
- a market network driver
- a low-profile explorer
- a notorious troublemaker

The game observes behavior and gradually builds a player identity from actions rather than forcing a class selection screen.

## 3. The hidden game: relationships

Progression is not only XP and money.

The world remembers relationships.

```text
PLAYER
 │
 ├── businesses
 ├── drivers
 ├── mechanics
 ├── NPC communities
 ├── police
 ├── activity networks
 └── districts
```

Helping a business can create future supply work.
Ignoring an NPC can close an opportunity.
Repeatedly driving dangerously can change police behavior.
Becoming known in a district can unlock opportunities without a conventional unlock screen.

## 4. Districts are gameplay personalities

Every district must have a distinct simulation identity.

### Kimironko
Commerce, crowds, deliveries, market pressure and constant movement.

### Nyamirambo
Dense streets, motos, nightlife, shortcuts and social encounters.

### Nyabugogo
Transit, logistics, buses, congestion and time-sensitive movement.

### CBD / Kacyiru
Business, premium vehicles, contracts, corporate movement and controlled traffic.

### Rebero / Mount Kigali
Elevation, switchbacks, handling, weather exposure and driving skill.

A district is complete only when its geometry, audio, population, economy, traffic and activities reinforce the same identity.

## 5. Driving is the primary language of the game

The player should be able to communicate with the world through driving.

Speed, route choice, vehicle class, risk, timing and location should all have meaning.

The game should reward understanding Kigali rather than memorizing mission markers.

A player who knows a back street, a hill route, a market shortcut or a traffic pattern has acquired real gameplay knowledge.

## 6. The city has memory

The simulation should maintain lightweight historical context.

Examples:

```text
Recent accident near Nyabugogo
        ↓
Traffic pressure increases
        ↓
NPC routes change
        ↓
Delivery times increase
        ↓
Business demand changes
        ↓
New opportunity appears
```

Not every event needs to persist forever. Important world consequences should have lifetimes and decay naturally.

## 7. AI is the director of possibility, not the author of every moment

KLG AI should not constantly interrupt the player.

Its job is to create conditions from which interesting gameplay can emerge.

```text
WORLD STATE
    ↓
AI DIRECTORS
    ↓
PRESSURE / OPPORTUNITY
    ↓
WORLD RESPONSE
    ↓
PLAYER CHOICE
```

The AI should prefer believable combinations of existing systems over arbitrary random events.

## 8. Emergent activities replace repetitive mission spam

Activities should be generated from templates plus live world conditions.

```text
Activity Template
      +
District State
      +
Player Identity
      +
Weather
      +
Traffic
      +
Economy
      +
Police Pressure
      ↓
Emergent Opportunity
```

This allows the same activity type to feel different every time.

## 9. Vehicles are identities, not inventory numbers

Every vehicle class should change how the player interacts with Kigali.

```text
MOTO       → narrow streets / agility / risk
SPORT      → speed / highway pressure
UTILITY    → cargo / business opportunities
RALLY      → hills / rough routes / weather
GT         → long-distance performance
LUXURY     → social / premium opportunities
```

Vehicle ownership should therefore expand the player's possible behavior, not simply increase a stat.

## 10. The garage is a workshop for identity

The garage should become a collection and decision space.

It answers:

- What kind of driver am I becoming?
- Which vehicles do I trust?
- Which routes does each vehicle make easier?
- What am I investing in?
- What should I sell, keep or specialize?

Garage progression is therefore connected to world gameplay rather than being a separate menu economy.

## 11. UX should reveal the city instead of covering it

Avoid a permanent wall of HUD information.

The interface should be contextual.

```text
NORMAL DRIVE
→ minimal HUD

INTERESTING EVENT
→ subtle signal

PLAYER LOOKS / INTERACTS
→ information expands

PLAYER COMMITS
→ focused activity UI
```

The world should remain visually dominant.

## 12. Architecture principle

KLG systems must be replaceable and data-driven.

```text
ENGINE
  ↓
RUNTIME
  ↓
SIMULATION
  ↓
GAMEPLAY
  ↓
AI ORCHESTRATION
  ↓
CONTENT
  ↓
PRESENTATION
```

The game concept must not depend on one programming language or one renderer. Engine-specific code belongs at the boundary; gameplay rules and world concepts should remain portable wherever practical.

## 13. The long-term production target

The final target is not "a bigger prototype".

It is a systemic open-world driving experience where:

- Kigali feels inhabited even when the player ignores missions.
- Activities emerge from the simulation.
- Player behavior changes opportunities.
- Vehicles change play style.
- Districts have gameplay identities.
- AI coordinates the city without feeling scripted.
- Progression represents reputation, relationships, wealth, vehicles and knowledge.
- The player can tell stories about things that happened rather than only remembering completed objectives.

## Design test

Every new feature should answer at least one of these questions:

1. Does it make Kigali feel more alive?
2. Does it create meaningful player choice?
3. Does it produce new interactions between systems?
4. Does it create memorable emergent situations?
5. Does it deepen vehicle or driving identity?
6. Does it improve the player's relationship with the city?

If it does none of these, it should not become a priority feature.
