const base = import.meta.env.BASE_URL;

const SKYBOX_SPRITE_ICONS = {
  moon1: `${base}assets/skybox/moon1.png`,
  moon2: `${base}assets/skybox/moon2.png`,
  moon3: `${base}assets/skybox/moon3.png`,
  galaxy1: `${base}assets/skybox/galaxy1.png`,
  galaxy2: `${base}assets/skybox/galaxy2.png`,
  galaxy3: `${base}assets/skybox/galaxy3.png`,
  galaxy4: `${base}assets/skybox/galaxy4.png`,
  gasgiant: `${base}assets/skybox/gasgiant.png`,
  mars: `${base}assets/skybox/mars.png`,
  nebula1: `${base}assets/skybox/nebula1.png`,
  nebula2: `${base}assets/skybox/nebula2.png`,
  nebula3: `${base}assets/skybox/nebula3.png`,
  uranus: `${base}assets/skybox/uranus.png`,
  starwhit: `${base}assets/skybox/starwhite.png`,
  sunbin1: `${base}assets/skybox/sunbinary.png`,
  sunblue: `${base}assets/skybox/sunblue.png`,
  sunbrwn: `${base}assets/skybox/sunbrown.png`,
  sunyel: `${base}assets/skybox/sunyellow.png`,
};

export function skyboxSpriteTexture(name) {
  return SKYBOX_SPRITE_ICONS[name] ?? null;
}
