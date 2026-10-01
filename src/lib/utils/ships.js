// Ship IDs in gemini.json's `encounters` data are the game's internal
// sprite file names (DATA/APPEARNC/*.IFF), which is also why the three
// Talon faction skins (militia/pirate/retro) are distinct codes rather than
// one ambiguous 'Talon' string.
const SHIP_NAMES = {
  BRDSWORD: 'Broadsword',
  CLUNKER: 'Tarsus',
  DEMON: 'Demon',
  DRALTHI: 'Dralthi',
  DRAYMAN: 'Drayman',
  DRONE: 'Steltek Drone',
  FIGHTER: 'Centurion',
  FRIGATE: 'Paradigm',
  GLADIUS: 'Gladius',
  GOTHRI: 'Gothri',
  KAMEKH: 'Kamekh',
  MERCHANT: 'Galaxy',
  SALTHI: 'Salthi',
  SCOUT: 'Steltek Scout',
  STILETTO: 'Stiletto',
  TALMIL: 'Talon (Militia)',
  TALPIR: 'Talon (Pirate)',
  TALRELIG: 'Talon (Retro)',
  TUG: 'Orion',
};

// Maximum speed in kps (the in-universe unit of measure used by the game;
// treat these as relative-only, not tied to any real-world unit), read from
// DATA/APPEARNC/SKELETON.IFF: each sprite file's `SKEL` byte indexes a
// `FORM SKEL` entry whose `GUID > SHIP` chunk holds the hull's flight stats
// as 24.8 fixed-point values, the second being top speed. These are base
// figures - a `SPEE` chunk in a ship's TYPES file scales them (256 = 1x), as
// with RF's speed upgrade (Centurion 500 -> 585) and a few RF mission ships.
// The Talon skins all index identical entries.
const SHIP_MAX_SPEEDS = {
  BRDSWORD: 350,
  CLUNKER: 300,
  DEMON: 450,
  DRALTHI: 400,
  DRAYMAN: 200,
  DRONE: 900,
  FIGHTER: 500,
  FRIGATE: 200,
  GLADIUS: 400,
  GOTHRI: 450,
  KAMEKH: 250,
  MERCHANT: 300,
  SALTHI: 600,
  SCOUT: 500,
  STILETTO: 500,
  TALMIL: 400,
  TALPIR: 400,
  TALRELIG: 400,
  TUG: 350,
};

// Relative hull size, read from each ship's DATA/APPEARNC/<ship>.IFF sprite
// file (`FORM BM3D > INFO`, the second of two previously-unexplained u16
// fields trailing the frame count). Values are in-universe units with no
// known real-world conversion (same caveat as SHIP_MAX_SPEEDS above), but
// they're internally consistent: capital ships > freighters > fighters, with
// Paradigm coming out ~4x a Talon.
const SHIP_SIZES = {
  BRDSWORD: 270,
  CLUNKER: 158,
  DEMON: 156,
  DRALTHI: 140,
  DRAYMAN: 370,
  DRONE: 180,
  FIGHTER: 166,
  FRIGATE: 500,
  GLADIUS: 183,
  GOTHRI: 192,
  KAMEKH: 440,
  MERCHANT: 240,
  SALTHI: 140,
  SCOUT: 270,
  STILETTO: 155,
  TALMIL: 120,
  TALPIR: 120,
  TALRELIG: 120,
  TUG: 230,
};

export function shipName(shipId) {
  return SHIP_NAMES[shipId] ?? shipId;
}

export function shipMaxSpeed(shipId) {
  return SHIP_MAX_SPEEDS[shipId];
}

export function shipSize(shipId) {
  return SHIP_SIZES[shipId];
}
