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
  FIGHTER: 'Centurion',
  FRIGATE: 'Paradigm',
  GLADIUS: 'Gladius',
  GOTHRI: 'Gothri',
  KAMEKH: 'Kamekh',
  MERCHANT: 'Galaxy',
  STILETTO: 'Stiletto',
  TALMIL: 'Talon (Militia)',
  TALPIR: 'Talon (Pirate)',
  TALRELIG: 'Talon (Retro)',
  TUG: 'Orion',
};

// Maximum speed in kps (the in-universe unit of measure used by the game;
// treat these as relative-only, not tied to any real-world unit). The Talon
// variants share the base ship's figure since they're just faction skins.
const SHIP_MAX_SPEEDS = {
  BRDSWORD: 350,
  CLUNKER: 300,
  DEMON: 450,
  DRALTHI: 400,
  DRAYMAN: 200,
  FIGHTER: 500,
  FRIGATE: 200,
  GLADIUS: 500,
  GOTHRI: 400,
  KAMEKH: 300,
  MERCHANT: 300,
  STILETTO: 500,
  TALMIL: 400,
  TALPIR: 400,
  TALRELIG: 400,
  TUG: 350,
};

export function shipName(shipId) {
  return SHIP_NAMES[shipId] ?? shipId;
}

export function shipMaxSpeed(shipId) {
  return SHIP_MAX_SPEEDS[shipId];
}
