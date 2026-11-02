// Préparation communautaire : interfaces prêtes pour un futur backend (ex. Supabase),
// implémentation locale honnête en attendant. Aucun faux joueur, aucun score présenté comme synchronisé.
import type { ScoreResult } from '../score';

export interface PlayerProfile {
  id: string;
  pseudonym: string;
  friendCode: string;
  visibility: 'private' | 'friends' | 'public';
}

export interface LeaderboardEntry {
  rank: number; // ex æquo : même nombre de cases = même rang
  pseudonym: string;
  moves: number;
}

export interface CommunityBackend {
  readonly online: boolean;
  /** Raison affichée quand les fonctions en ligne ne sont pas disponibles. */
  readonly unavailableReason: string;
  submitResult(r: ScoreResult): Promise<'accepted' | 'rejected' | 'offline'>;
  leaderboard(contextId: string, scope: 'friends' | 'weekly' | 'world'): Promise<LeaderboardEntry[] | null>;
  profile(): Promise<PlayerProfile | null>;
}

/** Aucun serveur configuré : tout reste sur l'appareil. */
export const offlineBackend: CommunityBackend = {
  online: false,
  unavailableReason: 'Les classements et les amis arriveront avec les comptes en ligne (facultatifs).',
  async submitResult() {
    return 'offline';
  },
  async leaderboard() {
    return null;
  },
  async profile() {
    return null;
  },
};

export const community: CommunityBackend = offlineBackend;
