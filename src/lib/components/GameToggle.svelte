<script>
  import { game, gameSwitchLocked } from '../stores/game.js';
  import { GAMES, gameLabel } from '../utils/games.js';
  import { t } from '../i18n/index.js';

  // The application-wide game switch, in the top-right corner of both the
  // sector map and the system view. Like the 2D/3D toggle, it shows the
  // current state and flips to the other one.
  function toggle() {
    const i = GAMES.findIndex((g) => g.id === $game);
    game.set(GAMES[(i + 1) % GAMES.length].id);
  }
</script>

<button
  type="button"
  class="primary caps"
  disabled={$gameSwitchLocked}
  title={$gameSwitchLocked ? $t('settings.waitForAnimation') : $t('gameToggle.title')}
  onclick={toggle}
>
  {gameLabel($game)}
</button>
