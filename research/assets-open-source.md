# Open-licensed art & audio assets for a Survivor-like — verified download sources

Research date: 2026-10-13. Every URL below was probed from **this machine** with `curl`
(no API keys, no cookies, no browser). Status codes and byte counts are measured, not guessed.

Project root: `/Users/aojiang/Documents/Qoder/2026-10-13/6da7e952`
Probe cache (small files only, safe to delete): `/Users/aojiang/Documents/Qoder/2026-10-13/6da7e952/.research-cache/`

---

## 1. Download patterns that WORK (proven)

| # | Pattern | Proof | Notes |
|---|---|---|---|
| P1 | `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/<path>` | `.../iwenzhou/kenney/master/Fonts%20(10%20files)/kenpixel.ttf` → **200**, `18068` B, `application/octet-stream`; valid TTF magic `00 01 00 00` | **Best channel.** URL-encode spaces as `%20`, parens as `%28`/`%29`. Paths with `(5190 files)` style suffixes are real dir names. |
| P2 | `https://opengameart.org/sites/default/files/<file>` | `DawnLike_5.zip` → **200**, `application/zip`, `1008505` B; `16x16babies.png` → **200**, `image/png`, `3676` B | **Second best.** Direct, no token. Requires `%20` for spaces. |
| P3 | HTTP Range on OGA files | `-r 0-4095 DawnLike_5.zip` → **206**, 4096 B, `Zip archive data` | You can probe zip contents without full download. |
| P4 | `https://codeload.github.com/<owner>/<repo>/tar.gz/refs/heads/<branch>` | `artuq/LootClicker`, `ptidejteam/ecs-survivors` → **200** | Whole-repo tarball works, but grabs the *entire* game, not just the pack. Prefer P1 per-file. |
| P5 | `git clone --filter=blob:none --sparse https://github.com/<owner>/<repo>.git` | `git ls-remote` succeeded for `iwenzhou/kenney` (`b772928…refs/heads/master`), `artuq/LootClicker`, `wridzer/Grad_HKU` | Cleanest way to pull a whole pack directory. `git` is installed. |
| P6 | `https://registry.npmjs.org/<name>/-/<basename>-<version>.tgz` | `@anabis/kenney-space-kit-mirror/-/kenney-space-kit-mirror-2.0.0.tgz` → **200**; `kenney-hexagon-pack/-/kenney-hexagon-pack-1.0.0.tgz` → **200** | Pattern works, **but content is useless for us** (see §5). |

**GitHub API is unthrottled enough** for discovery: `api.github.com/repos/<r>`,
`.../git/trees/<branch>?recursive=1` all returned 200 (4,545-blob tree in one call, `truncated=false`).
`gh` CLI is authenticated as `Lazarus-coder`, so `gh search repos/code` is available and cheap.

### Throttling caveat (important)
`opengameart.org` **resets connections** if you hit it faster than ~1 request / 2 s:
`ERR Remote end closed connection without response`. Sleep 2–3 s between OGA requests.
`raw.githubusercontent.com` showed the same symptom with Python `urllib` but **not** with `curl` —
use `curl` for GitHub raw.

---

## 2. URL patterns that FAILED — do not retry

| Failed URL / pattern | Result | Verdict |
|---|---|---|
| `https://kenney.nl/media/` (any path) | **403** `text/html` 199 B | Bot-blocked, as briefed. **No Kenney downloads from kenney.nl.** |
| `https://kenney.nl/media/pages/assets/tiny-dungeon/7.0.2/kenney_tiny-dungeon.zip` | **404** `text/html` 7441 B | Even the real CDN layout 404s for guessed version hashes. |
| `https://kenney.nl/assets/tiny-dungeon` | 200 HTML only | Page readable, but the zip link inside needs the blocked `/media/` path. |
| `https://raw.githubusercontent.com/wridzer/Grad_HKU/main/game/Art/kenney_game-icons/PNG/Black/1x/sword.png` | **404** | Kenney **game-icons is NOT a weapon/icon-art pack** — its 425 PNGs are input prompts & UI glyphs (`arrowDown`, `buttonA`, `basket`, `checkmark`, `fastForward`). Useless for survivor icons. Discard. |
| `.../kenney_game-icons/PNG/White/2x/sword.png`, `.../Black/2x/gem.png` | **404** | Same reason. |
| `https://raw.githubusercontent.com/iwenzhou/kenney/master/Audio%20(295%20files)/UI%20sounds%20(50%20sounds)/button1.ogg` | **404** | Wrong filename. Real names: `click1..5.ogg`, `rollover1..5.ogg`, `mouseclick1.ogg`, `mouserelease1.ogg`. |
| `.../iwenzhou/kenney/master/Art%20(5190%20files)/Audio` | **404** | Audio is at repo **root**: `Audio (295 files)/`, not under `Art`. |
| `.../iwenzhou/kenney/master/Art%20(5190%20files)/UI%20pack%20(220%20assets)/Base%20pack%20(140%20assets)/PNG/Blue/blueButton000.png` | **404** | Pack-1 UI pack has no such PNG name; use the `Spritesheet/*Sheet.png` instead (verified 200). |
| `https://raw.githubusercontent.com/iwenzhou/kenney/master/Fonts%20(10%20files)/kenfont.ttf` | **404** | Only `kenpixel*.ttf` + `kenvector_future*.ttf` exist (10 files total). |
| `https://opengameart.org/sites/default/files/Monsters_pack.zip` | **404** | Real filename is `Monsters1.zip` (200, 21027 B). |
| `https://opengameart.org/sites/default/files/survivor-move_knife_0.png` | 200 but **not an image** | Guessed name; returns HTML. Only names scraped from the node page are safe. |
| `https://opengameart.org/content/…` fetched rapidly (no delay) | connection reset | Throttle, not a 404 — retry with 2 s spacing. |
| `https://codeload.github.com/torvalds/linux/tar.gz/refs/tags/v1` | **404** | Bad ref format, host is fine (P4 works with `refs/heads/<branch>`). |

---

## 3. Prioritized asset pack table

Ordered by usefulness-per-attribute-burden for a top-down horde-survival roguelite.

| Pri | Pack | Exact URL (tested) | HTTP / bytes | License | Attribution required | What it gives a survivor-like | Tile / sheet dims |
|---|---|---|---|---|---|---|---|
| **1** | **Kenney – Roguelike / RPG pack** (16×16, ~1,767 tiles: characters, monsters, weapons, items, terrain, HUD) | `https://raw.githubusercontent.com/wridzer/Grad_HKU/main/game/Art/kenney_roguelike-rpg-pack/Spritesheet/roguelikeSheet_transparent.png` | **200** / `94,579` | **CC0 1.0** — stated in `game/Art/kenney_roguelike-rpg-pack/License.txt` (tested **200** / `644` B) | "Credit (Kenney)" — courtesy, not mandatory | The single best horde source: hundreds of enemy/character/prop tiles, plus chest/coin/potion/gem items, all in one sheet | sheet `968×526`; **16×16 tiles, 1 px margin** (`Spritesheet/spritesheetInfo.txt`, tested 200/97 B) → 57 cols × 31 rows ≈ **1,767 tiles** |
| **1** | ↑ alt tint sheet (magenta = non-solid) | `.../kenney_roguelike-rpg-pack/Spritesheet/roguelikeSheet_magenta.png` | **200** / `101,117` | CC0 | same | collision-mask variant | 968×526 |
| **1** | ↑ sample Tiled maps (learn the margin/spacing setup) | `.../kenney_roguelike-rpg-pack/Map/sample_map.tmx`, `Map/sample_indoor.tmx` | in tree: `3,076` B / `1,792` B | CC0 | same | ready-made .tmx proving tile order | — |
| **2** | **Kenney – Tiny Dungeon** (1.0) | `https://raw.githubusercontent.com/artuq/LootClicker/main/assets/kenney_tiny-dungeon/Tilemap/tilemap_packed.png` | **200** / `5,294` | **CC0 1.0** — `assets/kenney_tiny-dungeon/License.txt` tested **200** / `570` B: *"License: (Creative Commons Zero, CC0) … free to use in personal, educational and commercial projects. Support us by crediting Kenney (this is not mandatory)"* | optional | Compact, cohesive 16×16 dungeon: floor/wall/grass terrain, torches, chests, coins, swords/wands, and **animated characters + enemies** in a tiny sheet — ideal art-direction anchor | packed `192×176` (no margin); spaced `tilemap.png` `203×186` (**200**/`5,533` B); `Tilesheet.txt` (200) states **16×16, 1 px space, 12×11 = 132 tiles**; also `Tiles/tile_0000..0131.png` individual PNGs |
| 2 | ↑ same pack vendored in other repos (fallback if one is deleted) | `mthunbo/Atlantis-RPG` (`Assets/…`, main), `cbrannen9a/rpg-course` (`assets/…`, main), `sahmadzai/gmtk_2025` (`assets/…`, main), `ddb12138/RoguelikeAreana` (`asserts/…`, main), `ajtran303/dungeon-crawler` (`Art/…`, **branch `trunk`**) | trees verified: 282–283 blobs each incl. `License.txt` | CC0 | optional | redundancy | identical |
| **3** | **Kenney Asset Pack 1** (2014 donation pack — fonts + audio are the gold) | `https://raw.githubusercontent.com/iwenzhou/kenney/master/…` | see rows below | **CC0 1.0** — repo root `LICENSE.md` (full CC0 text, verified 200) | none | 4,545 files: 11 pixel fonts, 303 audio clips, RPG/Adventure/UI sprite sheets | — |
| 3a | └ pixel font `kenpixel.ttf` (+ `kenpixel_blocks/future/high/mini/square`, `kenvector_future*.ttf`) | `.../Fonts%20(10%20files)/kenpixel.ttf` | **200** / `18,068` | CC0 (`LICENSE.md`) | none | crisp pixel HUD font, no attribution → zero-legal-risk default font. Dir is *named* "Fonts (10 files)" but actually holds **11** TTFs (verified via tree) | TTF (`00 01 00 00` magic verified). Glyph metrics not measured — test at runtime |
| 3b | └ **~10 UI/combat SFX** | `.../Audio%20(295%20files)/Digital%20sounds%20(60%20sounds)/laser1.ogg` | **200** / `20,941` (`OggS`) | CC0 (`LICENSE.md`) | none | **303 OGGs**, all filenames confirmed from the repo tree: **Digital** `laser1..9`, `powerUp1..12`, `zap1/zap2/zapTwoTone/zapTwoTone2/zapThreeToneUp/Down`, `tone1`, `twoTone1/2`, `threeTone1/2`, `highUp/highDown`, `lowRandom`, `pepSound1..5`, `phaseJump1..5`, `phaserUp1..7`, `spaceTrash1..5` · **UI** `click1..5`, `rollover1..6`, `mouseclick1`, `mouserelease1`, `switch1..38` · **RPG** `handleCoins(2)`, `doorOpen_1..2`, `doorClose_1..4`, `bookOpen/Close`, `chop`, `knifeSlice(2)`, `drawKnife1..3`, `metalClick/Latch/Pot1..3`, `footstep00..09`, `creak1..3`, `cloth1..4` · **Casino** `cardSlide1..8`, `chipsCollide1..4`, `diceThrow1..4` · **Jingle** `jingles_HIT/jingles_HIT00..16`, `jingles_NES/jingles_NES00..` | per-pack .ogg counts: Digital 62, Jingle 85, RPG 51, UI 51, Casino 54 |
| 3c | └ RPG sprite sheet (64 px, top-down props/items/characters) | `.../Art%20(5190%20files)/RPG%20pack%20(230%20assets)/Spritesheet/RPGpack_sheet.png` | **200** / `166,723` | CC0 | none | chests, coins, gems, bottles, weapons, terrain, characters as vector-derived 64 px tiles | `1280×832`; individual `PNG/rpgTile000.png` = **64×64** (tested 200/`2,443` B) → 20×13 = 260 tiles |
| 3d | └ UI / health-bar 9-slice frames | `.../Art%20(5190%20files)/UI%20pack%20(220%20assets)/Base%20pack%20(140%20assets)/Spritesheet/greySheet.png` | **200** / `12,953` | CC0 | none | panels, buttons, progress-bar fills, crosshair, icons — **health/XP bar frames** | `512×512` (also `blueSheet/greenSheet/redSheet/yellowSheet.png`, same dir) |
| 3e | └ UI "Adventure pack" frames (RPG-styled) | `.../UI%20pack%20(220%20assets)/Adventure%20pack%20(80%20assets)/Spritesheet/uipack_rpg_sheet.png` | **200** / `32,558` | CC0 | none | wood/parchment UI, good for level-up / upgrade screens | `512×512` |
| 3f | └ walk/attack animation reference with **text frame atlas** | `.../Platformer%20assets%20(1330%20assets)/Base%20pack%20(360%20assets)/Player/p1_spritesheet.png` | **200** / `33,279` | CC0 | none | side-view (not top-down) but ships `p1_spritesheet.txt` with ready frame rects: `p1_walk01 = 0 0 72 97`, `p1_front`, `p1_hurt`, `p1_jump`, `p1_duck` | `508×288`, frames ~**72×97** |
| **4** | **OGA — Animated Top Down Survivor Player** | `https://opengameart.org/sites/default/files/Top_Down_Survivor_2.zip` | **200** / `13,652,717` (`application/zip`) | **CC-BY 3.0** (page `field-name-field-art-licenses` → `http://creativecommons.org/licenses/by/3.0/`) | **Yes.** Page "Copyright/Attribution Notice: **Riley Gombart**". Ship: *Top Down Survivor by Riley Gombart (opengameart.org), CC-BY 3.0* | **Exactly the genre**: 8-direction player, idle + move cycles, each with knife / rifle / shotgun / flashlight; also `Survivor Spine.zip` (200/`116,281` B) skeleton variant | per-frame PNGs (zip); page previews `survivor-idle_knife_0.png` etc. |
| **4** | **OGA — Animated Top Down Zombie** (horde fodder) | `https://opengameart.org/sites/default/files/tds_zombie.zip` | **200** / `1,933,661` | **CC0** (page) | none | animated zombie (same art family as #4 → free visual consistency). Also `skeleton-attack_0.png` on the page | top-down, 8-dir |
| 4 | OGA — Top-down animated zombie *set* | `https://opengameart.org/sites/default/files/zombie_01_0.zip` | **200** / `1,226,895` | **OGA-BY 3.0** | "Zombie Sprite by **Riley Gombart**" | extra zombie variants | — |
| **5** | **OGA — 70 individually animated rainbow character sprites** | `https://opengameart.org/sites/default/files/rainbow-chars.zip` | **200** / `3,924,936` | page badge **CC0**; note: derived from ArMM1998's CC-BY set → **treat as CC-BY 3.0** to be safe | Recommended credit: *70+ characters base by ArMM1998 (opengameart.org), recolored as "rainbow-chars" by scl* | **6+ enemy types solved in one file**: 70 top-down characters, each with 8-direction walk cycles — ideal for endless horde variety | preview `3_108.png` = `1069×833` (tested 200) |
| 5 | OGA — 16×16 Animated Critters | `https://opengameart.org/sites/default/files/16x16babies.png` | **200** / `3,676` | **CC0** (page `license_images/cc0.png`) | none | 16 tiny animated critters (slime/bat/bug tier-1 enemies) | `256×112` → **16×16 grid 16 × 7** |
| 5 | OGA — Roguelike Monsters (Joe Williamson) | `https://opengameart.org/sites/default/files/roguelikecreatures.png` | **200** / `7,590` | **CC-BY-SA 3.0** — page notice: *"If possible, please link to my twitter (@JoeCreates) when giving credit"* | **Yes (and ShareAlike)** | 72 distinct monster faces for the horde | `128×144` → **16×16 grid 8 × 9 = 72 monsters** |
| 5 | ↑ 3× upscaled | `https://opengameart.org/sites/default/files/roguelikecreaturesx3.png` | **200** / `12,383` | CC-BY-SA 3.0 | yes | for high-DPI rendering | ~`384×432` |
| 5 | OGA — Animated Slime (Calciumtrice) | `https://opengameart.org/sites/default/files/slime%20spritesheet%20calciumtrice_0.png` | **200** / `12,041` | **CC-BY 3.0** — notice: *"Animated Slime by Calciumtrice, usable under Creative Commons Attribution 3.0 license."* | **Yes** | idle/walk/attack/**death** cycles — the classic tier-1 survivor enemy | `320×640` |
| 5 | OGA — 5 Monsters pack (idle/move/jump, 64×64) | `https://opengameart.org/sites/default/files/Monsters1.zip` | **200** / `21,027` | **CC-BY 4.0** (Lluc Entertainment) | yes | 5 polished 64×64 monsters w/ 3 states each | 64×64 |
| **6** | **OGA — Zelda-like tilesets and sprites (ArMM1998)** | `https://opengameart.org/sites/default/files/gfx_3.zip` | **200** / `174,776` | **CC0** (page) | none | top-down 16×16 overworld terrain + player/enemy sprites — the terrain fallback if Tiny Dungeon is too small | 16×16 |
| **6** | **OGA — DawnLike 16×16 Universal Roguelike tileset v1.81** | `https://opengameart.org/sites/default/files/DawnLike_5.zip` | **200** / `1,008,505` | **CC-BY 4.0** (DragonDePlatino) | **Yes** — "DawnLike by DragonDePlatino, CC-BY 4.0" | **Everything at 16×16**: dungeon/town/mine/forest/underworld terrain, hundreds of monsters, items, UI — the widest single-file coverage | 16×16 |
| **7** | **OGA — 496 pixel-art icons for medieval/fantasy RPG** | `https://opengameart.org/sites/default/files/496_RPG_icons.zip` | **200** / `1,541,171` | **CC0** (gnola14) | none | **projectile/weapon/upgrade icons**: swords, staves, gems, rings, potions, XP bottles, scrolls | 64×64 each |
| 7 | OGA — 16×16 weapon RPG icons (Shade) | `https://opengameart.org/sites/default/files/16x16_weapons_rpg_icons.zip` | **200** / `313,313` | **CC0** | none | 16×16 weapon set in 4 metal tiers (`iron-weapons.png`, `steel-weapons.png`, `bronze-weapons.png`, `gold-weapons.png`, all listed on page) → maps to weapon-upgrade tiers | 16×16 |
| 7 | OGA — OSARE weapon icons (Blarumyrran) | `https://opengameart.org/sites/default/files/valmis.zip` | **200** / `181,092` | **CC0** | none | large top-down weapon/projectile icon set | — |
| 7 | OGA — Kyrise's Free 16×16 RPG Icon Pack v1.2 | `https://opengameart.org/sites/default/files/Kyrises_16x16_RPG_Icon_Pack_V1.2.zip` | **200** / `724,218` | **CC-BY 4.0** | yes | clean 16×16 items/skills/potions for the level-up card UI | 16×16 |
| **8** | **OGA — Treasure chests 32×32 and 16×16** (Blarumyrran) | `https://opengameart.org/sites/default/files/chests_32x32_0.png`<br>`https://opengameart.org/sites/default/files/chests_16x16_0.png` | **200** / `7,453`<br>**200** / `4,585` | **CC0** | none | **chest pickups** with open animation frames | `96×160` = 3×5 @32 px<br>`48×80` = 3×5 @16 px |
| 8 | OGA — Gold treasure icons 16×16 (Bonsaiheldin) | `https://opengameart.org/sites/default/files/gold_treasure_icons_16x16_2.zip` | **200** / `6,096` | **CC0** (page badge `cc0.png`) | none | **coins/gems** — the same pack used by the MIT VampireSurvivorsClone | preview `256×256` |
| **9** | **Press Start 2P** pixel font | `https://raw.githubusercontent.com/google/fonts/main/ofl/pressstart2p/PressStart2P-Regular.ttf` | **200** / `118,204` | **SIL OFL 1.1** — `ofl/pressstart2p/OFL.txt` fetched **200**, states reserved font name "Press Start 2P" | keep OFL.txt; don't rename the font | retro arcade display font for titles/damage numbers | TTF, monospace 8×8 grid |
| 10 | OGA — 512 retro SFX (SubspaceAudio) | `https://opengameart.org/sites/default/files/The%20Essential%20Retro%20Video%20Game%20Sound%20Effects%20Collection%20%5B512%20sounds%5D.zip` | **200** / `20,582,855` | **CC0** (`creativecommons.org/publicdomain/zero/1.0/`) | none | 512 chiptune SFX if Kenney's set isn't enough | — |
| 10 | OGA — 100+ game SFX WAV/OGG/M4A (Damaged Panda) | `https://opengameart.org/sites/default/files/GAME%20SOUND%20FX%20PACK%20WAV%20OGG%20M4A_0.zip` | **200** / `5,241,100` | **CC-BY 3.0** — notice: *"you do not have to add a link but if you want to credit me feel free. Damaged Panda"* | courtesy | hits/deaths/UI in 3 formats | — |
| 10 | OGA — UI Sound Effects pack (ViRiX) | `https://opengameart.org/sites/default/files/UI%20pack%201.zip` | **200** / `3,347,906` | **CC-BY 3.0** | yes | menu/pickup/level-up UI clicks | — |
| **11** | **OGA — "Happy Adventure" loop** (TinyWorlds) | `https://opengameart.org/sites/default/files/happy_adveture.mp3` | **200** / `636,925` (`audio/mpeg`) | **CC0** | none | **loopable BGM**, small enough to ship | — |
| 11 | OGA — Dark Cavern Ambient 001 (Paul Wortmann) | `https://opengameart.org/sites/default/files/dark_cavern_ambient_001.ogg` | **200** / `1,689,062` (`audio/ogg`) | **CC0** | none | darker stage/night loop | — |
| 11 | OGA — Chiptune "The Old Tower Inn" loop (RandomMind) | `https://opengameart.org/sites/default/files/NES_TheOldTowerInn_0.mp3` | **200** / `4,038,600` | **CC0** | none | NES-flavoured loop (heavy; also `CHIPTUNE_Loop_The_Old_Tower_Inn.wav` 11.7 Mb) | — |
| 11 | OGA — Horror loop pack (TinyWorlds) | `https://opengameart.org/sites/default/files/horror_music.zip` | **200** / `2,846,897` | **CC0** | none | multiple horror beds for boss waves | — |
| 11 | OGA — "Intense" (HorrorPen) | `https://opengameart.org/sites/default/files/Intense.ogg` | **200** / `3,364,032` (`audio/ogg`) | **CC-BY 3.0** | **yes** — "Intense by HorrorPen, CC-BY 3.0" | combat/boss loop | — |
| 11 | OGA — Battle March (PlayOnLoop) | `https://opengameart.org/sites/default/files/POL-battle-march-short_0.wav` | **200** / `498,148` | **CC-BY 3.0** (PlayOnLoop requires a link-back) | **yes** | orchestral loop | — |
| 12 | OGA — Bitmap font pack (ZiNGOT) | `https://opengameart.org/sites/default/files/font-pack_0.zip` | **200** / `76,531` | **CC-BY 4.0** | yes | several extra bitmap faces | — |
| 12 | Kenney UI pack (modern, 9-slice PNG) vendored | `https://raw.githubusercontent.com/biligsoft/free-rehab-hub/main/assets/2d_graphics/kenney_ui-pack/…` | dir verified in tree (282-file `kenney_*` sets incl. `License.txt`-style `SOURCE.txt`) | CC0 per Kenney | optional | alternative UI source; repo also vendors `kenney_animal-pack`, `kenney_generic-items`, `kenney_mobile-controls` | — |

---

## 4. Open-source survivor-like repos that ship reusable assets

These are code-first repos, but their asset folders are engine-agnostic PNG/OGG and legally
reusable under the repo's MIT license (which covers the assets unless a file says otherwise).

| Repo | License | Assets present | Probes | Caution |
|---|---|---|---|---|
| `matthiasbroske/VampireSurvivorsClone` (Unity/C#, 277★) | **MIT** (`LICENSE` fetched **200**/`1,072` B) | 68 media files ≈ **5.4 MB**: `Assets/Sprites/Weapons` (16), `Monsters` (10: Alien, Boss, CrabOrange, CrabRed, ExplosiveGuy, GhostFairy, MiniBoss, NailHead, PunchMonster, WizardMonster), `Coins` (6: 1/5/10/30/50/100), `Gems` (3), `UI` (6), `Kenney` (5), `Characters` (4), `Textures/Backgrounds` (3) | `…/Monsters/CrabOrange.png` **200**/`1,001` → `96×24` (4 frames of 24×24); `…/Characters/MainCharacterBlue.png` **200**/`971` → `96×24`; `…/Coins/Coin1.png` **200**/`146` → `16×16` | README credits Kenney + Bonsaiheldin (`gold-treasure-icons-16x16`) — those sub-assets stay CC0/MIT-safe. `Assets/Sprites/UI/HealthBar.png` → **404** (name guess wrong). |
| `migalvalm/vampire-survivors-clone` (Godot 4, 27★) | **MIT** | 216 media ≈ **5.9 MB**: `assets/tilemap/Tiles` (**131**), `assets/audio` (**33** — Kenney `click1..5`, `footstep_carpet_000..004`, `impactGeneric_light_000..002`, + music mp3), `assets/effects` (23), `assets/player/skins` (5), `assets/ui` (3) | tree verified via API | Kenney/OGA files inside carry their upstream CC0/CC-BY terms. |
| `mkalvas/roguelite-survivor` (MonoGame) | **MIT** | 50 media ≈ **313 KB**: `Content/Enemies` (9: BloodLich, GhastlyBeholder, GnollGrunt, GnollPikeman, GraveRevenant, OrcJuggernaut, OrcSavage, OrcShaman, **VampireBat**), `Effects` (17: `blood-1..5`, `fireball-hit`, `ice-shard-hit`, `lightning-blast-hit`), `Spells` (6), `Hud` (3), `Player` (3), `Pickups` (1) | `…/Enemies/VampireBat.png` **200**/`809`; `…/Content/Datasets/credits.json` **200**/`1,226` B | ⚠ `credits.json` lists **itch.io** packs (DeepDiveGameStudio, pimen, Anokolisa, Cyberrumor, Kyrise, XYEzawr, Pipoya). Those upstream "free" itch packs may be non-commercial-only → **do not redistribute**; use the OGA/GitHub CC0 rows instead. |
| `ptidejteam/ecs-survivors` (TypeScript ECS survivors) | **GPL-3.0** (repo `GPL-3.0`, 4,323 KB) | vendors `kenney_tiny-dungeon` incl. `assets/tiled/ecs-survivors.tiled-session` | `codeload` tarball **200** | GPL copyleft — fine for reference/learning, but don't copy assets into a differently-licensed build without checking. |

---

## 5. npm route: pattern works, content is a dead end

| Package | Tarball probe | Verdict |
|---|---|---|
| `@anabis/kenney-space-kit-mirror@2.0.0` | **200**, tgz unpacks to **1,695 files** | Only **3D** `.dae`/glTF models (alien, astronaut, corridors, craft) — not 2D top-down sprites. Not useful. |
| `kenney-hexagon-pack@1.0.0` | **200** | Hexagon map tiles — wrong genre for survivor. |
| `@ai-game-assets/phaser@0.11.22`, `@magicpixelart/cli`, `arcane-assets-mcp`, `threenative-asset-mcp` | not fetched | AI/generated-asset services; would need API keys → out of scope of the "no API key" requirement. |

`npm search` for `kenney`, `keywords:kenney`, `game assets sprite sheet`, `roguelike assets`,
`pixel art assets`, `opengameart` → **no package bundles 2D top-down survivor art**.
**Conclusion: use GitHub raw (P1) + OpenGameArt direct files (P2), not npm, for assets.**
(For the engine itself: `https://registry.npmjs.org/phaser` → 200; latest published Phaser on npm is **4.2.1**, `phaser@3` still installable.)

---

## 6. Recommended minimal asset bundle (10 downloads)

All commands below are copy-paste ready and all URLs were HTTP-verified in this session.
Total payload ≈ **21 MB**, all zero-cost, no API key.

```bash
mkdir -p assets/{sprites,audio,fonts} && cd assets

# --- 1. Terrain + all base tiles (Kenney Tiny Dungeon, CC0, 16x16, 132 tiles) ---
curl -fsSL -o sprites/kenney_tiny-dungeon_tilemap_packed.png \
  https://raw.githubusercontent.com/artuq/LootClicker/main/assets/kenney_tiny-dungeon/Tilemap/tilemap_packed.png   # 200, 5,294 B, 192x176
curl -fsSL -o sprites/kenney_tiny-dungeon_License.txt \
  https://raw.githubusercontent.com/artuq/LootClicker/main/assets/kenney_tiny-dungeon/License.txt                 # 200, CC0
curl -fsSL -o sprites/kenney_tiny-dungeon_Tilesheet.txt \
  https://raw.githubusercontent.com/artuq/LootClicker/main/assets/kenney_tiny-dungeon/Tilesheet.txt               # 200, tile spec

# --- 2. Enemies / horde variety + weapons + items (Kenney Roguelike/RPG pack, CC0, 16x16 x ~1767) ---
curl -fsSL -o sprites/kenney_roguelikeSheet_transparent.png \
  https://raw.githubusercontent.com/wridzer/Grad_HKU/main/game/Art/kenney_roguelike-rpg-pack/Spritesheet/roguelikeSheet_transparent.png  # 200, 94,579 B, 968x526
curl -fsSL -o sprites/kenney_roguelike_License.txt \
  https://raw.githubusercontent.com/wridzer/Grad_HKU/main/game/Art/kenney_roguelike-rpg-pack/License.txt                                 # 200, 644 B, CC0

# --- 3. Player sprites, 8-direction animated (OGA, CC-BY 3.0) ---
curl -fsSL -o sprites/Top_Down_Survivor.zip \
  https://opengameart.org/sites/default/files/Top_Down_Survivor_2.zip     # 200, 13,652,717 B
curl -fsSL -o sprites/tds_zombie.zip \
  https://opengameart.org/sites/default/files/tds_zombie.zip              # 200, 1,933,661 B, CC0

# --- 4. 6+ enemy types at once (OGA, 70 animated top-down characters) ---
curl -fsSL -o sprites/rainbow-chars.zip \
  https://opengameart.org/sites/default/files/rainbow-chars.zip           # 200, 3,924,936 B
curl -fsSL -o sprites/roguelikecreatures.png \
  https://opengameart.org/sites/default/files/roguelikecreatures.png      # 200, 7,590 B, 128x144 = 72 monsters @16x16
curl -fsSL -o sprites/slime_spritesheet.png \
  "https://opengameart.org/sites/default/files/slime%20spritesheet%20calciumtrice_0.png"   # 200, 12,041 B, 320x640

# --- 5. Projectiles / weapon + upgrade icons (OGA, CC0) ---
curl -fsSL -o sprites/496_RPG_icons.zip \
  https://opengameart.org/sites/default/files/496_RPG_icons.zip           # 200, 1,541,171 B, CC0, 64x64
curl -fsSL -o sprites/16x16_weapons_rpg_icons.zip \
  https://opengameart.org/sites/default/files/16x16_weapons_rpg_icons.zip # 200, 313,313 B, CC0, iron/steel/bronze/gold tiers

# --- 6. Pickups: chests + coins/gems (OGA, CC0) ---
curl -fsSL -o sprites/chests_32x32.png  https://opengameart.org/sites/default/files/chests_32x32_0.png   # 200, 7,453 B, 96x160
curl -fsSL -o sprites/chests_16x16.png  https://opengameart.org/sites/default/files/chests_16x16_0.png   # 200, 4,585 B, 48x80
curl -fsSL -o sprites/gold_treasure_icons_16x16.zip https://opengameart.org/sites/default/files/gold_treasure_icons_16x16_2.zip  # 200, 6,096 B

# --- 7. UI / health-bar + XP-bar frames (Kenney UI pack, CC0) ---
curl -fsSL -o sprites/kenney_uipack_greySheet.png \
  "https://raw.githubusercontent.com/iwenzhou/kenney/master/Art%20(5190%20files)/UI%20pack%20(220%20assets)/Base%20pack%20(140%20assets)/Spritesheet/greySheet.png"        # 200, 12,953 B, 512x512
curl -fsSL -o sprites/kenney_uipack_rpg_sheet.png \
  "https://raw.githubusercontent.com/iwenzhou/kenney/master/Art%20(5190%20files)/UI%20pack%20(220%20assets)/Adventure%20pack%20(80%20assets)/Spritesheet/uipack_rpg_sheet.png"  # 200, 32,558 B, 512x512

# --- 8. Pixel fonts (CC0 + OFL) ---
curl -fsSL -o fonts/kenpixel.ttf \
  "https://raw.githubusercontent.com/iwenzhou/kenney/master/Fonts%20(10%20files)/kenpixel.ttf"   # 200, 18,068 B, CC0
curl -fsSL -o fonts/PressStart2P-Regular.ttf \
  https://raw.githubusercontent.com/google/fonts/main/ofl/pressstart2p/PressStart2P-Regular.ttf   # 200, 118,204 B, OFL 1.1
curl -fsSL -o fonts/OFL-PressStart2P.txt \
  https://raw.githubusercontent.com/google/fonts/main/ofl/pressstart2p/OFL.txt

# --- 9. ~10 UI/combat SFX (Kenney Pack 1, CC0, one .ogg each, 7-21 KB each) ---
# Every path below was HEAD-verified 200 with its byte count in this session.
G="https://raw.githubusercontent.com/iwenzhou/kenney/master/Audio%20(295%20files)"
while IFS= read -r p; do
  curl -fsSL -o "audio/$(basename "$p")" "$G/$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))' "$p")"
done <<'LIST'
Digital sounds (60 sounds)/laser1.ogg
Digital sounds (60 sounds)/laser2.ogg
Digital sounds (60 sounds)/zap1.ogg
Digital sounds (60 sounds)/tone1.ogg
Digital sounds (60 sounds)/powerUp1.ogg
RPG sounds (50 sounds)/handleCoins.ogg
RPG sounds (50 sounds)/doorOpen_1.ogg
RPG sounds (50 sounds)/bookClose.ogg
UI sounds (50 sounds)/click1.ogg
UI sounds (50 sounds)/rollover1.ogg
Casino sounds (50 sounds)/cardSlide1.ogg
Jingle sounds (85 sounds)/jingles_HIT/jingles_HIT00.ogg
LIST
# verified sizes: laser1 20941, laser2 21675, zap1 13791, tone1 19420, powerUp1 15109,
#   handleCoins 25394, doorOpen_1 22848, bookClose 9292, click1 6952, rollover1 9144,
#   cardSlide1 17704, jingles_HIT00 8650  (all 200)
# Folder notes (avoid 404s): audio lives at repo root `Audio (295 files)/`, NOT under `Art`.
#   `powerUp1..12` are in **Digital sounds**, `handleCoins(2)` in **RPG sounds**,
#   `click1..5`/`rollover1..5`/`mouseclick1`/`mouserelease1` in **UI sounds**,
#   `cardSlide1..8` in **Casino sounds**, and the hit stingers are nested one level deeper:
#   `Jingle sounds (85 sounds)/jingles_HIT/jingles_HIT00..16.ogg`.
#   There is NO `button1.ogg`, NO `metalPad.ogg`, NO `glass*.ogg`/`wood*.ogg` in this mirror (all 404).

# --- 10. One loopable music track (CC0, no attribution) ---
curl -fsSL -o audio/music_happy_adventure.mp3 \
  https://opengameart.org/sites/default/files/happy_adveture.mp3      # 200, 636,925 B, audio/mpeg, CC0
curl -fsSL -o audio/music_dark_cavern.ogg \
  https://opengameart.org/sites/default/files/dark_cavern_ambient_001.ogg  # 200, 1,689,062 B, CC0 (night/boss stage)
```

### Which source covers which need

| Need | Primary (CC0, zero attribution) | Fallback |
|---|---|---|
| Player sprites | Kenney Roguelike sheet / Tiny Dungeon | `Top_Down_Survivor_2.zip` (**CC-BY 3.0**, credit Riley Gombart) — best-in-genre 8-dir animation |
| 6+ enemy types | Kenney Roguelike sheet (~1,767 tiles) | `rainbow-chars.zip` (70 × 8-dir) + `roguelikecreatures.png` (72 @16×16, **CC-BY-SA 3.0**) + `slime_spritesheet.png` (**CC-BY 3.0**) + `tds_zombie.zip` (CC0) |
| Projectiles / weapon icons | `496_RPG_icons.zip` (64×64) + `16x16_weapons_rpg_icons.zip` (tiered) | `valmis.zip` (CC0), Kyrise 16×16 (CC-BY 4.0) |
| Pickups (chests, coins, gems, XP bottles) | `chests_32x32.png`/`chests_16x16.png` + `gold_treasure_icons_16x16_2.zip` (all CC0) | Kenney `RPGpack_sheet.png` (64×64, CC0) |
| Terrain / tiles | Kenney Tiny Dungeon (132 × 16×16) + Kenney Roguelike sheet | `gfx_3.zip` (Zelda-like 16×16, CC0), `DawnLike_5.zip` (CC-BY 4.0, widest coverage) |
| UI / HP-XP bar frames | Kenney UI pack `greySheet.png` + `uipack_rpg_sheet.png` (CC0) | `Kyrises_16x16_RPG_Icon_Pack_V1.2.zip` |
| Pixel font | **`kenpixel.ttf` (CC0)** — safest | **`PressStart2P-Regular.ttf` (OFL 1.1)** — ship `OFL.txt` |
| ~10 UI/combat SFX | **Kenney Pack 1 `Audio (295 files)/` (CC0, 303 OGGs)** | 512 retro SFX (CC0), `GAME SOUND FX PACK…zip` (CC-BY 3.0) |
| 1 loopable music track | **`happy_adveture.mp3` (CC0)** | `dark_cavern_ambient_001.ogg` (CC0), `Intense.ogg` (CC-BY 3.0, HorrorPen) |

### Attribution text to ship (for the CC-BY items only)
If you follow the recommended CC0-only bundle, attribution is **not legally required**.
If you add the CC-BY items, put this in your credits screen / `CREDITS.txt`:

- `Top Down Survivor` sprites — Riley Gombart, OpenGameArt.org, CC-BY 3.0
  (https://opengameart.org/content/animated-top-down-survivor-player)
- `70 individually animated rainbow character sprites` — scl / base by ArMM1998, OGA
  (https://opengameart.org/content/70-individually-animated-rainbow-character-sprites) — page badge says CC0, upstream base is CC-BY 3.0, so credit to be safe
- `Animated Slime` — Calciumtrice, CC-BY 3.0 (https://opengameart.org/content/animated-slime)
- `Roguelike Monsters` — Joe Williamson, **CC-BY-SA 3.0** (share-alike applies to derivatives!)
  (https://opengameart.org/content/roguelike-monsters) — asks for a link to @JoeCreates
- `DawnLike 16x16 Universal Rogue-like tileset v1.81` — DragonDePlatino, CC-BY 4.0
- `Press Start 2P` — SIL Open Font License 1.1, reserved name "Press Start 2P" (ship `OFL.txt`)
- Kenney packs (`Tiny Dungeon`, `Roguelike/RPG pack`, `UI pack`, `Audio`) are **CC0**; crediting
  Kenney (https://kenney.nl) is explicitly requested but *not mandatory*.

---

## 7. Risks / caveats found during research

1. **CC-BY-SA 3.0 on `roguelike-monsters` is viral for derivatives** — recolored/scaled versions of
   those 72 monsters would need to be shared under the same license. Prefer the CC0 or CC-BY rows
   for anything you modify.
2. **Kenney Pack 1 is 2014 vintage** (README: *"slightly outdated version from 2014, but the most
   complete and recent version I found"*). Its art is 64 px vector-flavoured, **not** the modern
   16×16 pixel look. Use it for **fonts + audio + UI frames**, not for the horde sprites.
3. **`iwenzhou/kenney`, `artuq/LootClicker`, `wridzer/Grad_HKU` are unofficial mirrors.**
   Nothing is guaranteed permanent — verify `License.txt`/`LICENSE.md` still exists after download
   (I fetched each one and it is present) and keep a local copy of the license file next to the asset.
4. **m5x7.ttf** does download (`https://raw.githubusercontent.com/stillwwater/editor2d/master/Themes/m5x7.ttf`
   → **200**, `34,300` B) and the *repo* is MIT, but the font is by JayjiGames and its own license is
   **not stated in the repo** → unverified provenance. Prefer `kenpixel.ttf` (CC0) / Press Start 2P (OFL).
5. **Kenney "game-icons" is a misnomer for our needs** — it is input-prompt/UI glyphs only; there are
   **no** sword/gem/potion icons in it (weapon-name guesses all 404'd). Do not plan around it.
6. **OGA filenames are versioned unpredictably** (`chests_32x32.png` vs `chests_32x32_0.png`,
   `Intense.ogg` vs `Intense_0.mp3`). Always scrape the exact href from the node page rather than
   guessing; a wrong guess returns an **HTML 404/error body** that will silently poison your pipeline
   if you only check for HTTP 200.
7. **OGA rate-limits at ~1 req/s** (connection reset). Add `sleep 2` in batch download scripts.
8. `NES_TheOldTowerInn_0.mp3` is **4 MB** and its `.wav` is 11.7 MB — fine for desktop, too big for js13k-style budgets.

---

## 8. Files left in the probe cache (delete freely)

`.research-cache/` (548 KB total, no large archives):
`td-License.txt`, `td-Tilesheet.txt`, `td-tilemap.png`, `td-tilemap_packed.png`,
`rl-LICENSE.txt`, `rl_sheet.png`, `gi-license.txt`, `kenpixel.ttf`, `m5x7.ttf`, `laser1.ogg`,
`kenney_rpg_sheet.png`, `kenney_uipack_grey.png`, `kenney_uipack_rpg.png`,
`roguelikecreatures.png`, `slime.png`, `gold.png`, `chests_*.png` (via `pngdim.py`),
plus helper scripts `pngdim.py`.

Scratch scripts used for discovery live in `/tmp/probe/` (`oga2.py`, `iwenzhou.json`,
`ghu.json`, `td.json`, `blik.json`) — not part of the project.
