# Casse-briques (Brick Breaker)

Bounce the ball back with your paddle to break every brick in the level. 40 levels designed one by one (pyramid, fortress, heart, skull, dragon…), then endlessly generated levels that keep getting harder, with tough, indestructible or explosive bricks and eight capsules to catch.

*Version française : [README.md](README.md)*

## Controls

- **Mouse** or **← →** (or **A D** / **Q D**): move the paddle.
- **Click** or **Space**: launch the ball, and fire when you have lasers.
- **P** or **Escape**: pause.
- The ball leaves in the direction of where it rests on the paddle: hit it with the edge to send it at an angle.

## The bricks

- **Coloured bricks**: 1, 2 or 3 hits depending on their colour (blue, purple, pink); they crack when hit.
- **Metal** (grey): indestructible, except with the fireball. It does not need to be broken to finish the level.
- **Explosive** (orange): they break every brick around them, which can set off neighbouring explosives in a chain.
- **Bonus** (gold): they always drop a capsule. Other bricks drop one now and then (about one time in nine).

## The capsules

Catch them with the paddle:

- **E**: wide paddle (20 s).
- **M**: multi-ball, each ball splits into three (12 balls at most).
- **L**: lasers (10 s), fired with a click or Space.
- **S**: slow ball (12 s).
- **C**: glue (15 s), the ball sticks to the paddle until the next launch.
- **F**: fireball (8 s), it goes through and breaks everything in one hit, metal included.
- **V**: an extra life (6 at most).
- **R**: trap, short paddle (12 s).

## Lives, speed and levels

- You start with 3 lives; losing the ball (when it was the last one in play) costs one.
- The ball goes a little faster each level, and speeds up gently during the level.
- A level is finished when only metal is left. Every level you reach is unlocked: on the title screen, **← →** or the **Starting level** list let you start there again.

## Points

- 10 points per hit on a brick, 40 (plus 5 per level) when it breaks, 25 per capsule caught.
- End of level: 500 points, plus 100 per life left.

## Data and sync

Your record and the furthest level reached are stored by NeoDex, backed up and synced between your PCs when sync is on.

## Install

In NeoDex: **NeoStore → Discover → Casse-briques → Install**.

Building a plugin: see the [NeoDex SDK](https://github.com/NDesumeur/neodex-sdk).
