# Casse-briques

Renvoie la balle avec ta raquette pour casser toutes les briques du niveau. 40 niveaux conçus un par un (pyramide, forteresse, cœur, crâne, dragon…), puis des niveaux générés à l'infini, de plus en plus durs, avec des briques solides, indestructibles ou explosives et huit capsules à attraper.

*English version: [README.en.md](README.en.md)*

## Commandes

- **Souris** ou **← →** (ou **Q D**) : déplacer la raquette.
- **Clic** ou **Espace** : lancer la balle, et tirer quand tu as les lasers.
- **P** ou **Échap** : pause.
- La balle part dans la direction de l'endroit de la raquette où elle repose : tape-la avec le bord pour l'envoyer en biais.

## Les briques

- **Briques de couleur** : 1, 2 ou 3 coups selon leur couleur (bleu, violet, rose) ; elles se fissurent quand elles sont touchées.
- **Métal** (gris) : indestructible, sauf avec la boule de feu. Il n'a pas besoin d'être cassé pour finir le niveau.
- **Explosives** (orange) : elles cassent toutes les briques autour d'elles, ce qui peut faire exploser les explosives voisines en chaîne.
- **Bonus** (dorées) : elles lâchent toujours une capsule. Les autres briques en lâchent une de temps en temps (environ une fois sur neuf).

## Les capsules

Attrape-les avec la raquette :

- **E** : raquette large (20 s).
- **M** : multi-balle, chaque balle se divise en trois (12 balles au plus).
- **L** : lasers (10 s), tirés au clic ou à Espace.
- **S** : balle lente (12 s).
- **C** : colle (15 s), la balle reste sur la raquette jusqu'au prochain lancer.
- **F** : boule de feu (8 s), elle traverse et casse tout d'un coup, métal compris.
- **V** : une vie en plus (6 au plus).
- **R** : piège, raquette courte (12 s).

## Vies, vitesse et niveaux

- Tu commences avec 3 vies ; une balle perdue (quand c'était la dernière en jeu) en coûte une.
- La balle va un peu plus vite à chaque niveau, et accélère doucement au fil du niveau.
- Un niveau est fini quand il ne reste plus que du métal. Chaque niveau atteint est débloqué : sur l'écran titre, **← →** ou la liste **Niveau de départ** permettent d'y recommencer.

## Points

- 10 points par coup sur une brique, 40 (plus 5 par niveau) quand elle casse, 25 par capsule attrapée.
- Fin de niveau : 500 points, plus 100 par vie restante.

## Données et synchronisation

Ton record et le dernier niveau atteint sont enregistrés par NeoDex, sauvegardés et synchronisés entre tes PC si la synchro est activée.

## Installer

Dans NeoDex : **NeoStore → À découvrir → Casse-briques → Installer**.

Développer un plugin : voir le [SDK NeoDex](https://github.com/NDesumeur/neodex-sdk).
