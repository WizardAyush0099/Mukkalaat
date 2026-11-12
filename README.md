# MUKKALAAT — The Iron Fist Tournament

A 3D arcade fighting game that runs in the browser. Pick a fighter, step into the akhada,
and knock the CPU out over a best-of-three match.

Tekken 3-era framing: bladed fighting stance, health bars top-left and top-right, round
timer in the middle, round pips, combo counter, supers, hit sparks, screen shake, slow-mo
K.O. The stage is a night-time mud-and-stone akhada: torches, string lights, banners and a
crowd in silhouette.

## Run it

Any static server works — the game is plain ES modules plus three.js from a CDN.

```bash
python3 -m http.server 3000 --bind 0.0.0.0
# then open http://localhost:3000/
```

## Controls

| Action | Keys |
| --- | --- |
| Move forward / back | `D` / `A` (or → / ←) |
| Jump | `W` (or ↑) |
| Crouch | `S` (or ↓) |
| Block | hold back |
| Punch | `J` |
| Kick | `K` |
| Grab | `I` |
| Super (needs a full meter) | `L` |
| Pause | `Esc` |
| Sound | `M` |

On touch or mouse, use the on-screen D-pad and PUNCH / KICK / GRAB / SUPER buttons.

### Combos and specials

* `J` `J` `J` — jab → cross → uppercut chain
* `S` + `J` — uppercut, `S` + `K` — low sweep (knocks down)
* `W` + `K` — dive kick
* `I` — grab and slam when close
* `L` — super: charge, flurry, then a finishing blast

## Stages

| Stage | Feel |
| --- | --- |
| The Old Akhada | Walled mud pit, torchlight, string lights and a crowd in silhouette |
| Neon Bazaar | Midnight market street: buzzing shop signs, paper lanterns, wet stone, driving rain, rippling puddles and distant lightning |

After picking a fighter you pick the arena; the stage you highlight is built live behind the
menu so you can see its lighting before the bell.

## Fighters

| Fighter | Style | Feel |
| --- | --- | --- |
| MUKKAL | Kushti brawler | Balanced, iron jaw, heavy hands |
| CHHAYA | Kalari blade | Fast, light, in-and-out |
| BAAZ | Sherwani bruiser | Slow, huge damage, huge health |
| BOSS | Suited enforcer | Grey-templed don in a black suit and red tie; heavy, patient, punishing |
| DAYA | CID brawler | Brown shirt, black jeans, CID-issue iron grip; quick and stubborn |

Difficulty (EASY / NORMAL / HARD) changes the CPU's reaction time, blocking, aggression
and damage.

## Project layout

```
index.html      page shell: HUD, screens (title, select, versus, result, pause) and CSS
js/game.js      match flow, combat, AI, camera, HUD, input, render loop
js/character.js fighter model (sculpted head, muscles, hands, cloth) and every animation clip
js/arena.js     stage builders and registry: the torchlit akhada and the neon bazaar
js/fx.js        hit sparks, dust, shock rings and synthesized audio
js/env.js       renderer, tone mapping and the baked environment map
js/util.js      procedural canvas textures and math helpers
```

All art is generated in code — no downloaded models or textures. Characters are built from
sculpted primitives on a shared anatomical rig, so the same animation clips drive every
fighter.
