# Atlas Stellaire

A nostalgic revisit of the Gemini sector from Wing Commander: Privateer and its
expansion, Righteous Fire.

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
