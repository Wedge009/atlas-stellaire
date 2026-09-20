// English strings, keyed by "component.thing" ("common.*" for a handful
// reused across components - eg a side-bar button and the dialogue it opens
// share one aria-label/title). `{placeholder}` markers are filled in by
// `t()` in ../index.js - see that file for the interpolation rules. This is
// the fallback dictionary: any locale missing a key falls back to the
// matching entry here rather than showing a raw key.
//
// Strings are written in normal case even where the UI displays them in
// caps (SETTINGS, PLOT ROUTE, etc.) - that's a presentational effect (a
// display-font convention), applied via CSS `text-transform: uppercase` at
// the call site, not something baked into the translatable string itself.
export default {
  'nav.expandSidebar': 'Expand side-bar',
  'nav.collapseSidebar': 'Collapse side-bar',
  'nav.sectorMap': 'Sector map',

  'common.close': 'Close',
  'common.none': 'None',
  'common.about': 'About',
  'common.language': 'Language',
  'common.search': 'Search',
  'common.plotJourney': 'Plot journey',
  'common.bases': 'Bases',
  'common.view3d': '3D view',
  'common.quadrant': '{name} Quadrant',
  'common.geminiSector': 'Gemini Sector',
  'common.shipEncounters': 'Ship encounters',
  'common.commodities': 'Commodities',

  'about.summary': 'A nostalgic revisit of the Gemini sector from Wing Commander: Privateer.',
  'about.version': 'Version {version} · {commit}',

  'settings.button': 'Settings',
  'settings.waitForAnimation': 'Wait for the alignment animation to finish',
  'settings.global': 'Global',
  'settings.showHiddenPoints': 'Show hidden points',
  'settings.showGridLines': 'Show grid lines',
  'settings.jumpTransition': 'Jump transition',
  'settings.backgroundSprites': 'Background sprites',
  'settings.sprites': 'Sprites',
  'settings.models': 'Models',
  'settings.idleRotation': 'Idle rotation',
  'settings.jumpPoints': 'Jump points',

  'systemView.systemLabel': 'System: {name}',
  'systemView.view2d': '2D view',

  'navMap3D.loading': 'Loading 3D engine…',
  'navMap3D.alignTo2d': 'Align to 2D view',
  'navMap3D.returnTo3d': 'Return to 3D view',
  'navMap3D.exitBaseFocusFirst': 'Exit base focus first (double-click the base or press Esc)',
  // Short reusable phrases composed into the hint line at the call site
  // (see NavMap3D.svelte) - 'drag to orbit' and 'click a node' each appear
  // in more than one hint state, so they're only translated once.
  'navMap3D.hintInspectingBase': 'inspecting {baseName}',
  'navMap3D.hintDragOrbit': 'drag to orbit',
  'navMap3D.hintScrollZoom': 'scroll to zoom',
  'navMap3D.hintClickNode': 'click a node',
  'navMap3D.hintJumpTravel': 'double-click a jump point to travel',
  'navMap3D.hintBaseInspect': 'double-click a base to inspect',
  'navMap3D.hintEscReturn': 'double-click or Esc to return',

  'infoPanel.jumpTo': 'Jump to {system}',
  'infoPanel.coords': 'X {x}  Y {y}  Z {z}',
  'infoPanel.merchantsGuild': 'Merchants Guild',
  'infoPanel.mercenariesGuild': 'Mercenaries Guild',
  'infoPanel.shipDealer': 'Ship Dealer',
  'infoPanel.encounterProbability': 'Encounter Probability',

  'commoditiesDialog.title': '{base} Commodities',
  'commoditiesDialog.commodity': 'Commodity',
  'commoditiesDialog.low': 'Low',
  'commoditiesDialog.high': 'High',
  'commoditiesDialog.soldHereNote': 'Highlighted rows are sold at this base.',

  'journeyPanel.titlePrefix': 'Journey:',
  'journeyPanel.legOfJumps': 'Leg {current} of {total} jumps',
  'journeyPanel.offRoute': 'Currently off route · {total} jumps total',
  'journeyPanel.refuelAt': 'Refuel at: {names}',
  'journeyPanel.clearJourney': 'Clear journey',
  'journey.noRouteExists': 'No jump route exists between these systems.',
  'journey.noLandableBase': 'No base within jump range between {from} and {to}.',

  'plotJourneyDialog.fromQuadrant': 'From quadrant (optional)',
  'plotJourneyDialog.fromSystem': 'From system',
  'plotJourneyDialog.toQuadrant': 'To quadrant (optional)',
  'plotJourneyDialog.toSystem': 'To system',
  'plotJourneyDialog.allQuadrants': 'All quadrants',
  'plotJourneyDialog.selectSystem': 'Select a system…',
  'plotJourneyDialog.selectDestination': 'Select a destination…',
  'plotJourneyDialog.destinationPoint': 'Destination point (optional)',
  'plotJourneyDialog.anywhereInSystem': 'Anywhere in system',
  'plotJourneyDialog.landForFuel': 'Land for fuel within six jumps',
  'plotJourneyDialog.plotRoute': 'Plot route',

  'searchDialog.placeholder': 'System or base name…',
  'searchDialog.systemSubtitle': 'System · {quadrant}',
  'searchDialog.baseSubtitle': 'Base in {system} · {quadrant}',
  'searchDialog.noMatches': 'No matches',
  'searchDialog.goTo': 'Go to',

  'systemInfoPanel.jumpPoints': 'Jump Points',
  'systemInfoPanel.hazardsAsteroids': 'Hazards: Asteroids',
  'systemInfoPanel.goToSystem': 'Go to system',

  'legend.title': 'Legend',
  'legend.collapse': 'Collapse legend',
  'legend.expand': 'Expand legend',
  'legend.jumpPoint': 'Jump Point',
  'legend.basePlanet': 'Base / Planet',
  'legend.navPoint': 'Nav Point',
  'legend.hiddenUnknown': 'Hidden / Unknown',
  'legend.asteroidsPresent': 'Asteroids Present',

  'app.loadingSectorData': 'Loading sector data…',

  'language.selectLabel': 'Select language',
  'language.apply': 'Apply',
};
