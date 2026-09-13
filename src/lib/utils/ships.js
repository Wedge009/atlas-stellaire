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

export function shipName(shipId) {
  return SHIP_NAMES[shipId] ?? shipId;
}
