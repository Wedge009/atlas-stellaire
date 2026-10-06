# Atlas Stellaire

A nostalgic revisit of the Gemini sector from Wing Commander: Privateer and its
expansion, Righteous Fire.

## Licence and copyright

The code in this repository is licensed under the GNU General Public
License v3.0 — see [LICENSE](LICENSE).

Wing Commander: Privateer and Righteous Fire were originally developed by
Origin Systems and published by Electronic Arts. This is an unofficial,
non-commercial fan project, not affiliated with or endorsed by Electronic Arts.
The co-ordinate data in `gemini.json` is derived from the copyrighted game
archives described below; no rights to the original game, its assets, or its
data are claimed, and all related trademarks belong to their respective owners.

The planetary textures for models in `public/assets/models/`, and the jump-point
animation frames in `public/assets/animations/jump/`, are adapted from the
[Privateer Gemini Gold](https://sourceforge.net/projects/privateer/) project's
public assets, used per its non-commercial art licence terms with credit to
the Privateer Gemini Gold project and to Origin Systems as the original
rights holder.

The 3D station and ship models are alpha-corrected and converted from original
Origin assets hosted at the [WC CIC](https://www.wcnews.com/wcpedia/WC3D_Collection_Index)
which, again, are credited to Origin Systems as the original rights holder.
While nostalgia was an initial goal, the single static sprite used for bases
was a significant downgrade from the multi-view-angle sprites used for bases in
previous Wing Commander games. So Origin's source models are used as a faithful
reproduction instead, with ship models optionally included as well.

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
  points, and unlabelled 'hidden trigger' zones (encounter zones with no
  visible icon).
- `FORM SCRP` > `FORM PLAY` (nested inside the same per-system block) — a
  `SCEN` (scripted-encounter zone) record per distinct `SPHR` position, in
  file order, with `SCEN[0]` always a non-point 'default' zone. Byte 1 of
  each record is that zone's ID and byte 2 the system's ID (its index in
  `SECTORS.IFF`'s block table). Zone IDs aren't contiguous (eg Pentonville's
  are 0, 1, 20; 17-AR's 0, 1, 2, 5, 7), and other records refer to a nav
  point by this zone ID, so it has to be looked up via the `SCEN` list
  (`SCEN[k]` is nav point `k - 1`) rather than used as an index. Bytes 3–4
  and 7–8 of each per-point `SCEN` record are little-endian signed 16-bit
  indices of the system's `PROG` script blocks to run when the zone is
  activated and deactivated (`-1`, `0xFFFF`, for none). A zone with an
  **asteroid field** has a deactivate block, the system's 'field off' block
  `C1 00`, and its activate block is a 'field on' block `C2 n`, where `n` is
  the most rocks that can be out at once (2–7). Every zone with a field in a
  system shares the same 'field off' block, so the shared index doesn't mean a
  shared belt: each zone's field is its own, sized by that zone's `SPHR`
  radius. Whether a zone has a field populates each nav point's `asteroids`
  boolean in `gemini.json`.
- `CAST` (squadron roster) and `WAND` (46-byte squadron records) chunks give
  each nav point's random-encounter table: which ship(s), how many, and at
  what odds. Each `WAND` record names its own `CAST` slot directly (bytes
  19–20) and its zone ID (byte 21, mapped to a nav point via `SCEN` as above)
  rather than relying on file position, carries the ship's stats-file and
  sprite-file names (bytes 3–18), the system ID (bytes 22–23), a squad size
  (bytes 35–36), and a cumulative
  probability percentage (byte 0) — records sharing a cumulative value in a
  zone are alternative squads spawned together as one group, and a group's
  own weight is its cumulative value minus the previous one seen in that
  zone. Populates each nav point's `encounters` array in `gemini.json`
  (omitted where a nav point has no encounter table) as `{chance, ships:
  [{ship, count}]}`; `ship` is the internal sprite file name as-is (eg
  `STILETTO`, or `TALPIR`/`TALMIL`/`TALRELIG` for the three Talon faction
  skins) — `src/lib/utils/ships.js` maps these to friendly display names.
  The game data also distinguishes groups by pilot skill and personality,
  which isn't modelled here, so groups with an identical ship composition at
  the same nav point are merged into one with their chances summed.
- `TABLE.DAT` — a 69×69 (Privateer) shortest-path matrix between all systems,
  used to independently verify the jump network.
- `FORM GLXY` > `FORM SUNS` (nested inside the same per-system block) — fixed
  16-byte records giving each system's backdrop sky-box sprites: an 8-byte
  name (eg `MOON1`, `NEBULA2`) followed by (X, Y, Z) as three signed
  16-bit values. This is a separate, much smaller co-ordinate space (roughly
  ±1000) than the flight-sim nav space above (roughly ±60000) — these
  aren't navigable positions, just the direction each sprite sits in the sky.
  29 of the 70 systems have one or more; the rest have no `SUNS` chunk at
  all. Stored as each system's `skybox` array in `gemini.json`; the sprite
  images themselves live in `public/assets/skybox/` and are mapped by name in
  `skyboxSprites.js`.

**Game differences**: `gemini.json` is Righteous Fire's map, with the base
game's differences marked in place rather than kept as a second copy, and
the app shows whichever game is selected (`resolveSector` in
`src/lib/utils/games.js`):

- `game: "RF"` or `game: "PRIV"` on a system or nav point means it's only in
  that game; without it, it's in both. RF-only: Eden (and Gaea), the jumps to
  it (Valhalla Nav 4, Rikel Hidden 4), Regallis's hidden point and Blockade
  Point Alpha's redesigned layout. PRIV-only: Delta Prime's Derelict (RF's
  `SECTORS.IFF` has no base there) and Blockade Point Alpha's original 3 points.
- `privateer: {encounters: [...]}` on a nav point in both games holds the
  base game's encounter table where RF changed it (Capella, Death, Nitir,
  Pestilence, Rikel, Valhalla and War; an empty list means none).
- Nav point IDs are unique within each game's view rather than across the
  file: Blockade Point Alpha's PRIV points reuse `nav-1` to `nav-3`. Each
  view keeps that game's `SPHR`/`SCEN` order, so zone IDs still map to nav
  points by position.

Everything else in `gemini.json` is the same in both games: base positions
and facilities, the sky-boxes and the rest of the map. Ship stats and
sprites are too, apart from RF's additions.

**Story missions** (`DATA\MISSIONS\S<n>M<x>.IFF` — `S0`–`S7` in `PRIV.TRE`,
`S8`–`S14` in `RF.TRE`; one file per plot mission, series `n` being one
fixer's run of missions): each is a `FORM MSSN` holding the briefing
(`TEXT`), the pay (`PAYS`, a 32-bit credit amount) and a `FORM SCRP` built
from the same `CAST`/`SCEN` machinery as the per-system data above, but with a
`PART` chunk in place of `WAND`:

- `PART` — fixed 45-byte records, one per ship. Story encounters are fixed,
  so there are no count or probability fields. Record 0 is always the player.
  Each record gives the ship's stats-file and sprite-file names (bytes 2–17),
  its `CAST` slot (bytes 18–19, which is also the ship's number in the
  script — see below), a zone ID and system ID (bytes 20 and 21,
  resolved to a nav point via that system's `SCEN` list as above), its
  position relative to the nav point (bytes 22–33, three 32-bit 24.8
  fixed-point values), and whether it's present when the player arrives
  (byte 36 = 1) or is spawned later by the mission's script (byte 36 = 0).
  One mission can place ships across several systems.
- `SCEN` — one record per mission zone: a zone ID and system ID, the script
  blocks to run on entering it, then a list of `PART` record numbers. A ship
  no zone lists isn't in the game at all (eg the 4th Talon of several groups
  in S9MC and S9MD). A ship is usually listed under its own zone, but not
  always: S11MD lists its Retro reinforcements under Nav 4, where the fight
  is, while they arrive from Nav 1, the zone their records give.
- `PROG` — the mission's script: a list of numbered blocks of 2-byte
  (instruction, operand) words, each block ending in `00 00`. Ship records
  point at blocks for their starting attitude, their behaviour (re-run
  continuously, eg a conversation stepping through its lines), what happens
  when they're destroyed, and (for the player) the mission objectives; a
  zone's `SCEN` record can point at a block to run on entering it.
  Instructions include spawn/remove ship, attack/form up on a ship,
  friendly/hostile, switch/case on counters, calls between blocks, and
  dialogue — `96 NN` speaks line `NN` from the ship's `DATA\AIDS` profile
  (`FORM PUSR` > `FORM PLOT`), and `95 NN` offers the player a list of
  replies from the same profile.

Stored separately from `gemini.json` in `public/data/story-missions.json`,
since these only apply while a mission is active: each mission's
`encounters` list gives `{system, navPoint, ships}` using `gemini.json`'s
IDs, where each ship is `{ship, count}`, plus `character` for a
named pilot or ship (eg `toth`, `MENESCH`) rather than a generic `XXX_YY`
faction squadron. The top-level `characters` map gives the display name
for each `character` that is a real named character (eg `toth` → Hunter
Toth); one with no entry (eg `RETRO1`, `elite`, `SDRONE`) is a generic pilot
singled out only for its role in the mission. Names are proper nouns, so
aren't translated. Each `CAST` name is also the name of an AI profile,
`DATA\AIDS\<name>.IFF`, whose `INFO` record gives the faction, then pilot
skill and attitude — the two letters after the underscore (skill D/A/S,
attitude P/A/F, each 0–2). As with the regular encounters, faction, skill and
attitude aren't output here, so otherwise identical ships are merged —
unless they're spawned by different triggers (below).

A mission's `SCEN` list can also name a nav point with no ships. That still
replaces the nav point's regular encounters while the mission is active, so
it's left empty: these come out as encounters with `ships: []`.

Ships spawned later by the script carry a `trigger` (ships without one are
present when the player arrives), found by tracing each
spawn instruction back through the script to what sets it off:

- `{"event": "kills", "kills": N}` — a wave, arriving at the Nth kill counted
  by that group's destroyed handlers.
- `{"event": "enterNav"}` — spawned on (first) entering this nav point.
- `{"event": "dialogueEnd", "character": X}` — when X's conversation ends.
- `{"event": "destroyed", "character": X}` — when X is destroyed.

The script refers to a ship by its `CAST` slot number, not by the position
of its `PART` record. The two usually match, but in 16 missions the records
are stored in a different order; S14MA, for instance, stores its systems'
ships Valhalla, Eden, Telar, 17-AR, J900 but numbers them Telar 1–6, 17-AR
7–12, J900 13–18, Valhalla 19–24, Eden 25–32. Every mission's
reinforcements come from its own system.

Any trigger may add `ifAlive: X` or `ifDestroyed: X` (eg S1MD's Nav 2 has
either Riordian's wing if he survived, or the usual pirate Talons if not), or
`ifDeparted: X` (X has jumped out). A ship's 'destroyed' handler also fires
when it jumps out, so `ifDestroyed` may really mean 'gone'.

An encounter may also carry `firstOf`, a list of `{system, navPoint}`: it
only happens if this is the first of those nav points the player reaches.
The scripts do this either by having each nav point's trigger disable the
others, or by having each spawn only while a shared counter is still zero.
Kroiz waits at whichever Rikel jump point the player enters by (S2MB) and
ambushes at the first hidden point reached if he survived; Miggs is at the
first of four Newcastle nav points reached (S2MD); and S13MB's pirate
messenger (directing the player to Drake in Capella) is at whichever of
Famine Nav 1 or Troy Nav 7 is reached first — so there's only ever one of
each.

Ships the script never actually spawns are also left out, with a warning
from the extraction script — mistakes in the original mission data, such as
a reinforcement block that's never called or ships no spawn instruction
names. S12MD's second Freyja wave is left out too: it depends on a call
instruction whose condition isn't decoded, and it doesn't arrive in the
game.

Ship positions are stored as offsets from their nav point, and every real
encounter sits within about 34,000 of it (the first group usually around
15,000 out, later waves a little further). Two kinds of ship are left out of
the file entirely: ones attached to a zone that doesn't exist in the system
(eg two of S14MA's elite Salthi at Eden, which fly in to Nav 1 from far
off), and ones placed implausibly far away because of a
mistyped co-ordinate (one of S1MD's three 'regular' pirate Talons at
Pentonville Nav 2 is 74,500 out, well outside the system's roughly ±60,000
space).

**Commodity prices** (`DATA\OPTIONS\COMODTYP.IFF`, one per game): a
`FORM COMD` holding one `FORM COMM` per commodity, each with an `INFO` ID, a
`LABL` name and two tables, `COST` and `AVAL`. Each table is 19 signed 16-bit
values: a base value, then nine (location, modifier) pairs. The location
keys are base types for the generic bases (1 pleasure, 2 refinery,
3 mining, 4 agricultural, 5 pirate) and global base IDs (from `BASES.IFF`)
for the four unique ones (31 New Constantinople, 32 New Detroit, 39 Oxford,
41 Perry).

- **Price** at a location is base + trunc(modifier × random), with random in
  [0, 1) and truncation towards zero. A positive modifier gives a range from
  the base price up to base + modifier − 1. A negative one gives
  base + modifier + 1 up to the base price. A modifier of 0 gives a fixed
  price. This is why a price range's far end is always one short of a
  round figure.
- **Availability:** a `COST` modifier of −1 (always paired with an `AVAL`
  of −1) means the commodity isn't traded at that location at all. Otherwise
  an `AVAL` modifier of −1 means the base buys it but doesn't sell it.
- **Stock:** a commodity the base sells isn't always in stock. Each time the
  base loads, it's stocked with a fixed chance of the `AVAL` base value plus
  its modifier, in per cent and capped at 100 (eg Grain at an agricultural
  base: 50 + 60, so always; Construction there: 50 − 40 = 10%). The Commodity
  Exchange lists whatever is stocked in commodity-number order.
- **Non-trade entries:** entries with a base of 0 that are sold nowhere are
  mission cargo, not trade goods (Alien Artifact, Mission Cargo, and RF's
  Documents and Monte).

`src/lib/data/commodities.js` is generated from this file.

**Base facilities** (`DATA\OPTIONS\GAMEFLOW.IFF`, the base-screen logic):
a `FORM MISS` per location, identified by its global base ID (59 is the
Steltek derelict), holding a `FORM SCEN` per screen and a `FORM SPRT` per
mouse-click hot-spot. A hot-spot's `INFO` byte identifies it, and `EFCT` gives
what it does. The Merchants' Guild is hot-spot `0x3D`, the Mercenaries' Guild
`0xCB`, and the Ship Dealer `0xC0`/`0xC1`/`0xC9`, which always appear
together. Populates each base's `facilities` in `gemini.json`; the data is
identical in both games.

### Jump transition animation

The full-viewport hyperspace-jump effect played when you use a jump point
(`public/assets/transitions/jump.webp`) is likewise decoded from the real game
data, not a recreation:

- `DATA\MIDGAMES\JUMP.PAK`, inside `PRIV.TRE`, holds the cut-scene. Unlike the
  map data above it isn't EA-IFF-85 — it's Origin's separate "VGA" bitmap/
  animation codec shared by Wing Commander 1, Wing Commander 2, Academy and
  Privateer's own 2D in-flight engine (documented at
  https://fabiensanglard.net/reverse_engineering_strike_commander/docs/wc1g.txt).
- Container layout: a 4-byte total-length header followed by a table of
  32-bit offsets (relative to the container start); the first offset's value
  always equals the header+table's own byte length. Each entry points to
  either a resource — `JUMP.PAK`'s first block is a 256-colour palette, 6
  bits per channel — or another such table whose entries are individual
  frames.
- Each frame is RLE-compressed: an 8-byte bounding-box header
  (`X2, X1, Y1, Y2` as signed 16-bit values; width = `X1+X2+1`, height =
  `Y1+Y2+1`), then `{key, x, y, pixel data}` records until a terminating
  `key == 0`. An even key is a literal run of `key >> 1` bytes; an odd key is
  an encoded run of `key >> 1` pixels built from sub-runs, each starting with
  a control byte that's either a further literal copy or a single repeated
  byte.
- `JUMP.PAK` contains two such 42-frame tables — 320×70 and 320×60 — stacked
  to build each full frame, then encoded as WebP (80ms/frame).

### Base sprite images

The station/base icons in `public/assets/bases/` are likewise decoded
directly from the game archives:

- Source: `DATA\APPEARNC\*.IFF` in `PRIV.TRE`/`RF.TRE` (eg `PERRY.IFF`,
  `ROIDBASE.IFF`), wrapping the same RLE codec as `JUMP.PAK` in an EA-IFF-85
  container: `FORM APPR` > `FORM BMAP` > `INFO` (frame count) + `SHAP` (frame
  table + RLE frames).
- Each RLE record's `x, y` are **signed**, relative to the frame's own
  bounding-box origin — canvas position is `(X1+x, Y1+y)`, not `(x, y)`
  directly.
- A sprite's multiple 'frames' aren't always independent alternate images.
  Several base sprites split one picture across differently-directioned
  frames that share a common origin — eg Perry's dome and docking module are
  each one quadrant of the full station, meant to be composited on to a
  single shared canvas, not treated as 4 alternate views.
- Palette index 0 isn't a reliable transparency sentinel. Some sprites (eg
  `ROIDBASE.IFF`) explicitly draw with index 0 for genuine near-black detail
  — rivets, cable shadow — indistinguishable from 'never drawn' by value
  alone; a separate per-pixel 'was this drawn' mask, not the palette value,
  decides what's opaque.
- `OXFORD.IFF` and `PLEASURE.IFF` are distinct-but-near-identical station
  skins (not a literal copy — a few hundred bytes apart), which is why
  `oxford` maps to the `pleasure` icon in `baseTypes.js`. There's no separate
  `GAEA.IFF` at all — `gaea` reusing the `agricultural` icon reflects the
  original game data, not a short-cut taken by this project. Oxford's sprite
  also bakes in a vertical band of duplicated pixels down its middle; that's
  present in the original asset itself, not a decoding artefact.

### Jump-point sphere sprite

The nav-map's 'original' jump sphere sprites (Settings → Jump points → Sprites)
is decoded from `DATA\APPEARNC\JUMP.IFF`, wrapping the same RLE codec and
`FORM APPR` > `FORM BMAP` > `INFO`/`SHAP` container as the base sprites above,
with one difference: `SHAP`'s frame-table entries are 4 bytes each, but only
the low 16 bits are the real offset — the high 16 bits are a constant `0xC100`
filler, not part of the offset, and reading the table unmasked misparses it.

Unlike the base sprites quadrant-tiled frames, `JUMP.IFF`'s 9 frames are
genuine independent animation frames — each is already a complete, if sparse,
fuzzy blue sphere image on its own, not a slice of one shared picture.
The source frames are a face-on 2D sprite the way the original 3Space engine
actually drew them. The decoded alpha is also a hard 0/255 cut-out — this
project feathers it with a Gaussian blur before use so it reads as translucent
rather than a solid disc.

### Ship encounter sprites

The encountered ship sprites (`public/assets/ships/<ship>/`) are decoded from
`DATA\APPEARNC\<SHIP>.IFF` in `PRIV.TRE`/`RF.TRE`, for the 16 ships that appear
in ambient `WAND` encounters:

- Structurally these are `FORM APPR` > `FORM BM3D`, containing an `INFO`
  chunk followed by `VSHP` — a different layout from the base/jump-point
  sprites above, despite sharing the same underlying RLE codec.
- `VSHP` isn't one shared frame-offset table. It's 37 back-to-back
  self-contained sub-blocks (one per rotation angle, matching `INFO`'s frame
  count), each a 4-byte length + a single masked offset entry + one RLE
  frame — no compositing needed, unlike the base sprites' quadrant tiling.
  Frame 0 is a top-down/nose-up view for every ship, sweeping through 3/4,
  side-on, and belly views across the 37 frames.
- **Rendered sprite size is not to scale between ships.** Every ship's
  decoded rotation-frame canvas comes out roughly the same pixel footprint
  (about 90–125px) regardless of hull class — Paradigm and Kamekh, the two
  largest ships in the game, decode *smaller* in raw pixels than several
  fighters.
- The real relative hull size instead comes from `INFO` itself: 12 bytes,
  six little-endian 16-bit fields `(frameCount, 30, 30, typeFlag, dim1,
  dim2)`. `dim1`/`dim2` are in-universe hull-dimension units with no known
  real-world conversion, but are internally consistent across every ship —
  capital ships > freighters > fighters, Paradigm coming out ~4x a Talon —
  and missile/decoy `APPEARNC` files (which aren't ships) carry a
  distinctly smaller `dim1`/`dim2` pair alongside a different `typeFlag`.
  `src/lib/utils/ships.js`'s `shipSize()` exposes `dim2` per ship; the
  encounter renderer scales each sprite by this value rather than by the
  sprite bitmap's own pixel size.
- Top speed comes from `DATA\APPEARNC\SKELETON.IFF`, not the per-ship
  `DATA\TYPES\*TYPE.IFF` stats files. Each sprite file has a one-byte `SKEL`
  chunk indexing a `FORM SKEL` entry in `SKELETON.IFF` (via its `TABL` of
  file offsets); hull entries carry a `FORM GUID` > `SHIP` chunk of eight
  little-endian 32-bit values in 24.8 fixed point (divide by 256). The
  second is top speed; the others appear to be acceleration, three turn
  rates and afterburner speed. `ships.js`'s `shipMaxSpeed()` uses these
  figures.
- A `TYPES` file can override these with optional `SPEE`/`THRU` chunks, but
  these are 8.8 fixed-point multipliers (256 = 1x) on the base top speed and
  acceleration, not absolute values (confirmed from the game's flight code).
  Only RF uses them: its speed upgrade is 300 (x1.17, eg Centurion 500 →
  585), and a few mission-specific stats files boost particular ships —
  `ELITE` (the Salthi in RF's final missions, x1.25), `JONES` (x1.33),
  `TRNSPORT` (a Drayman, x1.64) and `MENESCH1` (x1.17).

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
- **Sky-box backdrops** (`createNavScene.js`): since a `skybox` entry's (X, Y,
  Z) isn't a real position, it's normalised to a direction vector out at a fixed
  radius in the 3D view — the sprite sits in the correct direction in the sky,
  at a distance chosen only for visibility, not meaning.
