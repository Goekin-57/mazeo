// Catalogue de la collection. Toutes les récompenses sont cosmétiques.

export type RewardSlot = 'hat' | 'scarf' | 'companion' | 'decor' | 'badge';

export interface RewardDef {
  id: string; // stable, « reward-… » implicite : on garde des identifiants courts et stables
  slot: RewardSlot;
  name: string;
  /** Comment l'obtenir (affiché quand l'objet est verrouillé). */
  how: string;
  /** Texture d'aperçu. */
  icon: string;
}

export const REWARDS: RewardDef[] = [
  { id: 'companion-duckling', slot: 'companion', name: 'Caneton compagnon', how: 'Terminer « Le caneton perdu »', icon: 'duckling' },
  { id: 'deco-magic-flower', slot: 'decor', name: 'Fleur magique', how: 'Terminer « Le jardin secret »', icon: 'magic-flower' },
  { id: 'hat-gardener', slot: 'hat', name: 'Chapeau de jardinier', how: 'Terminer le chapitre 1', icon: 'hat-gardener' },
  { id: 'badge-garden-keeper', slot: 'badge', name: 'Gardien du Jardin', how: 'Terminer le chapitre 1', icon: 'badge-garden' },
  { id: 'badge-first-daily', slot: 'badge', name: 'Premier défi du jour', how: 'Réussir un défi du jour', icon: 'badge-daily' },
  { id: 'deco-lanterns', slot: 'decor', name: 'Lanternes du sentier', how: 'Réussir 5 défis différents', icon: 'lantern' },
  { id: 'scarf-golden', slot: 'scarf', name: 'Écharpe dorée', how: 'Réussir 3 défis Expert', icon: 'scarf-golden' },
];

export const rewardById = (id: string) => REWARDS.find((r) => r.id === id);

/** Récompense liée à la fin d'un niveau d'aventure. */
export const LEVEL_REWARDS: Record<string, string[]> = {
  'chapter01-level03': ['companion-duckling'],
  'chapter01-level05': ['deco-magic-flower'],
};
