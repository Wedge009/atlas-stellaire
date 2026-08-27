# Atlas Stellaire

A nostalgic revisit of the Gemini sector from Wing Commander: Privateer and its
expansion, Righteous Fire.

## Licence and copyright

The code in this repository is licensed under the GNU General Public
License v3.0 — see [LICENSE](LICENSE).

Wing Commander: Privateer and Righteous Fire, were originally developed by
Origin Systems and published by Electronic Arts. This is an unofficial,
non-commercial fan project, not affiliated with or endorsed by Electronic Arts.
The co-ordinate data in `gemini.json` is derived from the copyrighted game
archives described below; no rights to the original game, its assets, or its
data are claimed, and all related trademarks belong to their respective owners.

## Data sources

The co-ordinates in `gemini.json` — sector-map quadrant/system positions and
per-system nav points (jumps, bases, nav points, hidden trigger zones) — are
derived from the actual Privateer and Righteous Fire game data, not
estimated or invented.

- `PRIV.TRE` and `RF.TRE` — the game's data archives, in the (uncompressed)
  Privateer TRE container format: a file count and header-length dword,
  followed by one `{flag, 65-byte name, offset, size}` entry per contained
  file.
- Within each TRE, `DATA\SECTORS\QUADRANT.IFF` and `DATA\SECTORS\SECTORS.IFF`
  hold the map data, in a nested EA-IFF-85 chunk format
  (`FORM <size> <type>` containing child chunks).
- Refer to https://hcl.solsector.net/information/p1_tre_format.txt for full
  details.

### What was decoded

**Sector map** (`QUADRANT.IFF`): a `QUADINFO` chunk per quadrant gives its
(X, Y) position and name; a `SYSTINFO` chunk per system (nested under its
quadrant) gives the system's own (X, Y) and name, plus which bases (by ID)
it contains.

**Per-system nav points** (`SECTORS.IFF`, one block per system):
- `BASE` chunk — fixed 46-byte records giving each base's exact in-system
  (X, Y, Z), name, and class (agricultural/mining/refinery/pleasure/etc).
- `JUMP` chunk — same record layout, giving each jump point's destination
  system (the position fields here are unused; real jump-point positions
  live in `SPHR`).
- `SPHR` chunk — fixed 19-byte records giving the (X, Y, Z) and radius of
  every nav-map object in the system: labelled bases, jump points, plain nav
  points, and unlabelled 'hidden trigger' zones (encounter/asteroid zones
  with no visible icon).
- `TABLE.DAT` — a 69×69 (Privateer) shortest-path matrix between all systems,
  used to independently verify the jump network.

### Rendering: live projection, not a separate layout

`gemini.json` stores only the real extracted co-ordinates — no separate,
hand-placed 2D layout is maintained alongside them. The app calculates every
on-screen position at render time, in `navPoints.js`:

- **Nav points** (`resolveFlatPosition`): the flat 2D map, and the 3D view's
  2D-aligned top-down mode, project a nav point's real (X, Y, Z) straight down
  the Z-axis — `sx = 50 + 0.0007·x`, `sy = 50 − 0.0007·y`.
- **Systems** (`sectorPosition`): a system's position on the sector map is
  projected from its quadrant-local (`qx`, `qy`) — the raw `SYSTINFO` values
  — via `gx = 100 + (94/137)·qx`, `gy = 100 + (94/140)·qy`. All four
  quadrants share one co-ordinate origin at the point where the quadrants meet, so
  no per-quadrant branching is needed: the sign of `qx`/`qy` alone puts a
  system in the right quadrant.
