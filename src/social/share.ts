// Partage déterministe d'un défi : le lien identifie précisément le puzzle et sa version.
// Sans serveur, il permet seulement de jouer au même labyrinthe (pas de comparaison sécurisée).
import { findPuzzle } from '../content/challenges/calendar';

const PUBLIC_URL = 'https://goekin-57.github.io/mazeo/';

export function challengeCode(puzzleId: string, version: number) {
  return `${puzzleId}@${version}`;
}

export function challengeLink(puzzleId: string, version: number) {
  let base = PUBLIC_URL;
  try {
    if (/^https?:/.test(location.href) && !location.hostname.endsWith('claude.ai') && !location.hostname.includes('claudeusercontent')) {
      base = location.origin + location.pathname;
    }
  } catch {
    /* hors navigateur */
  }
  return `${base}?defi=${encodeURIComponent(challengeCode(puzzleId, version))}`;
}

export type ParsedCode = { ok: true; puzzleId: string; version: number } | { ok: false; reason: string };

export function parseChallengeCode(code: string | null): ParsedCode | null {
  if (!code) return null;
  const m = /^([a-z0-9-]+)@(\d+)$/i.exec(code.trim());
  if (!m) return { ok: false, reason: 'Ce code de défi est illisible.' };
  const p = findPuzzle(m[1]);
  if (!p) return { ok: false, reason: 'Ce défi n’existe pas dans cette version du jeu.' };
  if (p.version !== Number(m[2])) return { ok: false, reason: 'Ce défi a changé depuis le partage : la version ne correspond plus.' };
  return { ok: true, puzzleId: p.key, version: p.version };
}

/** Texte de résultat à partager manuellement (aucun envoi automatique). */
export function resultText(name: string, moves: number, optimalKnown: number | null, link: string) {
  const opt = optimalKnown ? ` (optimal : ${optimalKnown})` : '';
  return `MAZEO — ${name} : ${moves} cases${opt}. À ton tour : ${link}`;
}
