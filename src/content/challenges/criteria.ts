// Critères documentés d'acceptation des défis générés (outil tools/gen-challenges.ts) :
// une carte est rejetée si elle est impossible, ou trop triviale selon ces seuils.
// La bibliothèque figée les respecte (vérifié par tests/unit/v05.test.ts).
export const CHALLENGE_CRITERIA = {
  Facile: { minMoves: 7, maxMoves: 14, maxRandomWin: 0.45, minSpread: 4, minDecisions: 1 },
  Intermédiaire: { minMoves: 12, maxMoves: 22, maxRandomWin: 0.14, minSpread: 4, minDecisions: 3 },
  Expert: { minMoves: 16, maxMoves: 32, maxRandomWin: 0.05, minSpread: 6, minDecisions: 3 },
} as const;
// minMoves/maxMoves : longueur du parcours optimal (déplacements) ;
// maxRandomWin : probabilité maximale de gagner en jouant au hasard ;
// minSpread : écart minimal entre le parcours gagnant le plus court et le plus long (le score départage) ;
// minDecisions : nombre minimal de choix, le long du parcours optimal, où une option fait perdre.
