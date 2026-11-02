# MAZEO — résumé des tests (2 novembre 2026)

## Environnement
Chrome for Testing 153 en mode headless, **sans GPU** : WebGL passe par SwiftShader (rendu logiciel, 2 cœurs).
Le jeu y tourne à environ 7–10 images/s ; les 60 FPS visés n'ont donc **pas pu être mesurés**
(à vérifier sur un vrai téléphone). Les tests e2e utilisent `?e2e`, qui désactive le lissage
de démarrage de Phaser pour que les animations suivent le temps réel malgré la lenteur.

## 1. Moteur et niveaux (Vitest) — 17/17
- Fermeture de la case quittée (départ compris), cases fermées infranchissables.
- L'état précédent n'est jamais modifié (base de l'annulation exacte).
- Murs, eau, cases non voisines refusés ; déterminisme d'un même trajet.
- Détection du blocage ; impossibilité de gagner après une impasse.
- Validation des 6 niveaux sur l'espace d'états complet, plus l'intention de chaque niveau :
  N1 un seul chemin sans piège · N2 impasses · N3 sortie verrouillée avant 2/2 et ordre décisif ·
  N4 pont fermé avant l'interrupteur, passage trop tôt au pied du pont = défaite, pont non refermable ·
  N5 arche fermée puis ouverte par la graine · N6 les deux animaux sont indispensables.

| # | Pas min. | Trajets gagnants | États explorés | Impasses |
|---|---------|------------------|----------------|----------|
| 1 | 10 | 1 | 11 | 0 |
| 2 | 15 | 1 | 23 | 2 |
| 3 | 18 | 1 | 40 | 2 |
| 4 | 16 | 1 | 42 | 3 |
| 5 | 16 | 2 | 91 | 8 |
| 6 | 27 | 1 | 321 | 37 |

## 2. Parcours dans le navigateur (Playwright) — 40 réussis, 3 ignorés, 0 échec
Profils : iPhone 390×844 (tactile), Android 412×915 (tactile), petit écran 360×640 (tactile),
ordinateur 1280×800 (souris + clavier). Gestes réels : événements tactiles CDP, souris, clavier.

| Vérification demandée | Résultat |
|---|---|
| 1. Lancement | OK, aucune erreur console |
| 2. Navigation accueil / carnet / paramètres / jeu / pause | OK |
| 3. Déplacement au doigt (glisser) | OK (3 profils tactiles) |
| 4. Déplacement à la souris | OK (profil ordinateur) |
| 5. Fermeture des chemins | OK (cases fermées = trajet exact) |
| 6. Blocage des passages fermés | OK |
| 7. Collecte des objets | OK (compteur 0/2 → 1/2 → 2/2) |
| 8. Interrupteur | OK |
| 9. Déploiement du pont | OK |
| 10. Ouverture de l'arche | OK |
| 11. Annuler | OK, retour exact (position, haies, historique) |
| 12. Recommencer | OK, grille entièrement restaurée |
| 13. Résolution des 6 niveaux | OK sur les 4 profils |
| 14. Progression et sauvegarde | OK (déblocage, étoiles, rechargement de page) |
| 15. Erreurs bloquantes | aucune |

Aussi testés : mode « animations réduites » (N4 complet), clavier (flèches, Z, R ; ignoré sur
les profils tactiles), niveau verrouillé non ouvrable depuis le carnet.

Note : un premier passage a eu 2 échecs `ERR_CONNECTION_REFUSED` dus à l'arrêt du serveur de
développement (limite de temps de l'environnement), sans lien avec le jeu ; les 2 profils
concernés ont été relancés entièrement et sont passés.

## 3. Inspection des captures
Captures dans `tests/shots/e2e/<profil>/`. Problèmes trouvés et corrigés :
- Écran délavé : fondu de caméra figé par le lissage de démarrage à faible FPS.
- Bandes vides sur téléphones allongés : hauteur logique adaptée au ratio de l'écran.
- Fond plein écran coûteux : déplacé en CSS (moins de remplissage GPU).
- Quads tronqués sur le décor animé (pilote SwiftShader, non déterministe) : limite à 8 unités de
  texture et balancement du décor sans rotation.
- Panneau de victoire masquant la célébration : plus compact, placé à l'opposé de la sortie.
- Bourgeon caché derrière la maison pendant la célébration : tri de profondeur corrigé.
- Transformation du jardin (graine) trop discrète : vraies fleurs qui éclosent sur les haies.

## Non vérifié
- Fluidité réelle (60 FPS) et rendu sur GPU de téléphone.
- Son : synthèse Web Audio non audible en test automatisé (seule l'absence d'erreur est vérifiée).
- Safari iOS réel (seul Chrome était disponible).
