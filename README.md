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

The 3D station models are alpha-corrected and converted from original Origin
assets hosted at the [WC CIC](https://www.wcnews.com/wcpedia/WC3D_Collection_Index)
which, again, are credited to Origin Systems as the original rights holder.
While nostalgia was an initial goal, the single static sprite used for bases
was a significant downgrade from the multi-view-angle sprites used for bases in
previous Wing Commander games. So Origin's source models are used as a faithful
reproduction instead.

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
  file order, with `SCEN[0]` always a non-point 'default' zone. Byte offset
  7–8 of each per-point `SCEN` record is a little-endian signed 16-bit value
  that gives the **asteroid field flag**: `-1` (`0xFFFF`) means no asteroid
  field is near that point; any other value is an ID for a shared
  asteroid-field object in the system, and points sharing the same ID sit in
  the same physical field (eg Rikel's Nav 1, 2, 4, 5 and Hidden 3 all
  reference field `5` — one belt spans near all five). Populates each nav
  point's `asteroids` boolean in `gemini.json`.
- `CAST` (squadron roster) and `WAND` (46-byte squadron records) chunks give
  each nav point's random-encounter table: which ship(s), how many, and at
  what odds. Each `WAND` record names its own `CAST` slot directly (bytes
  19–20) and its zone (byte 21, matching `SPHR`/nav-point order) rather than
  relying on file position, carries the ship's stats-file and sprite-file
  names (bytes 3–18), a squad size (bytes 35–36), and a cumulative
  probability percentage (byte 0) — records sharing a cumulative value in a
  zone are alternative squads spawned together as one group, and a group's
  own weight is its cumulative value minus the previous one seen in that
  zone. Populates each nav point's `encounters` array in `gemini.json`
  (omitted where a nav point has no encounter table) as `{chance, ships:
  [{ship, count}]}`; `ship` is the internal sprite filename as-is (eg
  `STILETTO`, or `TALPIR`/`TALMIL`/`TALRELIG` for the three Talon faction
  skins) — `src/lib/utils/ships.js` maps these to friendly display names.
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
