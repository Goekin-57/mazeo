// Design system MAZEO (V4.1) : toutes les valeurs visuelles partagées.
// L'écran logique fait 1080 unités de large ; il est conçu pour un téléphone de 360 px CSS,
// donc 1 px CSS ≈ 3 unités. Les jetons sont exprimés en px CSS puis convertis.
import { C } from '../art/palette';

export const px = (cssPx: number) => Math.round(cssPx * 3);

export const color = {
  primary: C.orange,
  primaryDeep: C.orangeDeep,
  primaryText: '#ffffff',
  surface: '#fffbf0',
  surfaceAlt: '#f6eed9',
  border: '#e2d3b0',
  ink: C.ink,
  inkSoft: '#56634f', // contraste ≥ 4,5:1 sur la surface crème
  inkMuted: '#7b8574',
  success: '#4f9a3c',
  successSoft: '#e3f2d6',
  accent: C.turquoiseDeep,
  accentSoft: '#dff3ef',
  locked: '#c9bfa8',
  danger: C.red,
  scrim: 0x2c4a30,
};

export const font = {
  /** Titres, boutons, chiffres : Fredoka (arrondie, identité du jeu). */
  family: 'Fredoka, "Trebuchet MS", "Segoe UI", sans-serif',
  /** Petits textes (légendes, explications) : Nunito, plus simple et plus lisible en petit. */
  text: 'Nunito, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  display: px(30), // « Bravo ! », logo secondaire
  title: px(22), // titre d'écran
  heading: px(18), // titre de carte
  body: px(15),
  label: px(14),
  caption: px(12.5), // taille minimale
  button: px(17),
  buttonSm: px(15),
};

export const space = {
  margin: px(18), // marge latérale
  gap: px(12), // entre actions
  section: px(24), // entre sections
  pad: px(16), // marge intérieure des cartes
  xs: px(4),
  sm: px(8),
};

export const radius = { card: px(18), button: px(28), chip: px(14), small: px(10) };

export const touch = {
  primaryH: px(56),
  secondaryH: px(48),
  icon: px(48), // zone tactile minimale des boutons icônes
  iconVisual: px(42),
  /** Barre de commandes en partie : zone 48 px, glyphe 24 px, 10 px entre les boutons. */
  barBtn: px(48),
  barGlyph: px(24),
  barGap: px(10),
};

export const shadow = { y: px(3), alpha: 0.16 };

export const motion = { press: 70, release: 140, fade: 200, panel: 320, quick: 160 };

export const hexOf = (c: string) => parseInt(c.replace('#', ''), 16);
