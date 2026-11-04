# 麻将狂欢 Mahjong Mayhem

3D, peer-to-peer, 4-player Guobiao (国标麻将 / MCR) mahjong in the browser. Bilingual (中文 / English).

## Run

```
node server.js 8137        # any static server works
open http://localhost:8137
```

No build step and no npm install. Three.js, PeerJS and the fonts load from CDNs.

## Play

- **Create Room**: you get a 5-letter code. Share it or the invite link.
- **Join**: enter the code. The host can fill empty seats with bots.
- **Practice vs Bots**: solo game against 3 bots.
- Tap a tile to select it, then tap it again to discard. When you select a tile, a hint shows your waits and their fan count.

## Rules

- Guobiao (MCR) with 81 fans. A win needs at least 8 fan. Exclusion (不计) rules apply.
- Each flower adds 1 fan. Flowers do not count toward the 8-fan minimum.
- Self-draw: each other player pays 8 + fan. Discard win: the discarder pays 8 + fan, and the other two pay 8 each.

## Architecture

| File | Role |
|---|---|
| `js/scoring.js` | Fan calculator (all 81 fans, 不计 rules, 套算一次 for chow combinations) |
| `js/game.js` | Authoritative state machine. Runs on the host only. |
| `js/ai.js` | Bot: shanten, tile acceptance, fan-plan bias |
| `js/host.js` | Host controller: bots, turn timers (Web Worker based) |
| `js/net.js` | PeerJS / WebRTC. The host peer id comes from the room code. |
| `js/render3d.js` | Three.js table and tile animation |
| `js/textures.js` | Tile faces drawn on a canvas (no image files) |
| `js/audio.js` | Synthesized sound effects, voice callouts, music |
| `js/fx.js` | Callouts, confetti, emoji rain, screen shake |

The host sends each player only their own hidden tiles. Tile ids map to random types for each hand, so other players' hands do not leak.

## Test

```
npm test        # scoring unit tests + 30-game bot simulation
node test/sim.test.js 400
```
