# Night Survivors 幸存者之夜

类《吸血鬼幸存者》(Vampire Survivors) 的本地 Roguelite 割草游戏。Phaser 3 + Vite，纯前端，无后端。

## 运行

建议使用 Node.js 22（与 GitHub Actions 一致）。

```bash
npm ci
npm run dev      # http://localhost:5173
npm run build    # 产物在 dist/，可静态托管
npm run preview  # 本地预览已构建的 dist/
```

### 静态部署

默认 `base: './'`，同一份 `dist/` 可放在站点根目录或 `/night-survivors/` 等子目录。
部署时保留 `dist/` 内的目录结构，通过 HTTP 静态服务访问，并使用带末尾斜杠的目录 URL（例如 `/night-survivors/`）。
BootScene 统一按 Vite 的 `base` 解析生成清单中的图集、音频和字体路径；重新生成清单无需手动调整部署路径。

仓库的 `.github/workflows/pages.yml` 会在推送到 `main` 时构建并发布 GitHub Pages，也支持手动触发。
该工作流尚未运行浏览器测试；发布前可在本机运行 `npm run test:deployment`，验证同一构建产物在根目录和项目子目录下都能加载素材并启动游戏。

## 操作

| 按键 | 作用 |
| --- | --- |
| W A S D / 方向键 | 八向移动（武器自动攻击） |
| SPACE | 冲刺，3.2s 冷却，附 0.24s 无敌 |
| 1 / 2 / 3 或鼠标 | 升级时选择卡牌 |
| R | 升级界面重抽一次（每级 1 次） |
| ESC / P | 暂停 |
| M / R（主菜单） | 静音 / 清档 |

## 玩法循环

- 单局 10 分钟。击杀掉落经验宝石（会自动被吸过来），升级触发三选一卡牌。
- 6 个武器槽 + 6 个被动槽。武器最高 Lv8；满级 + 对应被动到 **Lv3** 才触发进化卡（金卡）。
- 击杀有 7% 概率掉落食物（回 18 血），精英怪必掉宝箱并回血 —— 撑住靠这个。
- 每分钟刷精英怪，掉宝箱（必出高级选项）；10:00 死神降临、音乐切换成 Boss 曲，再撑 40 秒即通关。
- **诅咒契约**（3 分钟后进入卡池，最多叠 3 层）：敌人 +18%、经验 +10% —— 用难度换成长速度。
- 三个角色：幸存者（飞刀 / 血厚）、法师（冰霜瓶 Lv2 / 生存 5 分钟解锁）、盗贼（环绕飞刃 / 速度 +9% / 生存 8 分钟解锁）。
- 局外存档（localStorage）：最长存活、最多击杀、金币，并解锁角色与毒雾锅。
- 主菜单可用金币买 3 项永久强化：训练有素（+15 初始生命）/ 武器大师（初始武器 +1 级）/ 拾荒者（拾取范围 +40%）。

### 武器

飞刀（朝最近敌人直线穿透）· 斧刃（抛物线砸落）· 回旋锤（追踪投掷）·
毒雾锅（贴身光环持续伤害并击退）· 冰霜瓶（落地留冻结区域）· 雷击（锁定随机敌人劈落）·
环绕飞刃（刀刃环绕自身，碰到即伤）· 连锁闪电（在敌群中弹跳，每次弹跳伤害衰减）
进化（8 条）：千刃 / 月牙 / 神圣之锤 / 噬魂 / 圣泉 / 雷霆回环 / 血月环刃 / 永动雷链

### 被动

力量 · 装甲 · 疾行 · 冷却 · 范围 · 数量 · 磁力 · 持续 · 成长（各 5 级）

### 策略深度

- **进化配对**：每把武器的进化绑定一个指定被动（如 环绕飞刃 + 范围 Lv3 → 血月环刃）。卡池会在该被动还差级数时打上 ★ 提示，逼你在「补武器等级」和「补被动」之间取舍。
- **诅咒换成长**：3 分钟后卡池出现可叠加的诅咒契约，敌人 +18%/层、经验 +10%/层，是否吃要看当前构筑能不能扛住。
- **槽位稀缺**：6+6 个槽位对上 8 把武器 + 9 个被动，每局都必须放弃一部分。
- **宝箱与精英**：每分钟精英怪掉宝箱（必出进化/高级选项），精英同时回血 —— 拿宝箱意味着要贴脸打。

## 数值一览（调参入口都在 src/data/）

| 项 | 值 | 位置 |
| --- | --- | --- |
| 单局时长 / 死神 / 通关 | 10:00 / 9:55 / 10:35 | `RUN` |
| 玩家生命 / 速度 / 无敌帧 / 磁力半径 | 130 / 205 / 0.8s / 200 | `PLAYER` + `CHARACTERS` |
| 升级所需经验 | Lv1→2 = 4，之后每级 +3.4 | `xpToNext` |
| 刷怪速度 | 0.85 只/秒 起，每分钟 +0.5 只/秒；诅咒每层 ×1.18 | `SPAWN` |
| 敌人成长 | 血量 +24%/分钟，伤害 +12%/分钟 | `statScale` |
| 掉落 | 食物 7%（回 18），精英回 22 并掉宝箱 | `DROPS` |
| 敌人上限 | 240（超出时回收最远的一只） | `RUN.maxEnemies` |
| 武器 | 8 把 + 8 进化（进化需被动 Lv3），被动 9 种各 5 级 | `src/data/weapons.js` |
| 敌人 | 12 种普通 + 2 精英 + 死神 | `src/data/enemies.js` |

## 代码结构

```
src/
  main.js               Phaser 配置（FIT 1280x720, arcade physics）
  data/                 纯数据：数值表、敌人表、武器/被动表、资产清单
  systems/
    EnemySpawner.js     环形刷怪、权重时间窗、回收复用、精英/死神事件
    WeaponSystem.js     6 种武器行为、投射物池、燃烧池、光环
    UpgradeSystem.js    升级卡池生成（含进化优先级、兜底卡）
    TextureFactory.js   程序化像素贴图（缺图集时的回退仍有限制，见下文）
    SaveSystem.js       localStorage 局外进度与解锁
    AudioSystem.js      优先播放素材音效，缺失时用 WebAudio 合成
  scenes/               Boot / Menu / Game / Hud / Upgrade / GameOver
```

## 素材与授权

美术/音频全部来自开源素材，清单见 `LICENSES.md`、许可证原件在 `licenses/`。
当前清单共 18 项，约 5.5 MB：2 张图集、1 个字体和 15 个音频文件。许可与署名信息如下：

| 用途 | 素材 | 许可 |
| --- | --- | --- |
| 角色 / 怪物 / 武器 / 地形 / 药水 / 宝箱（16×16） | Kenney *Tiny Dungeon* | CC0 1.0 |
| 金币图标 | Kenney *Roguelike/RPG pack* | CC0 1.0 |
| 已收录的 13 个战斗/UI 音效 | Kenney *Asset Pack 1*（Digital / RPG / UI / Jingle） | CC0 1.0 |
| 环境音乐 | Paul Wortmann *Dark Cavern Ambient 001* | CC0 1.0 |
| Boss 音乐 | HorrorPen *Intense* | CC-BY 3.0 |
| 像素字体 | Press Start 2P（`licenses/PressStart2P-OFL.txt`） | SIL OFL 1.1 |

工作流：`asset-spec.json` 描述每个文件（key / URL / 类型 / 许可 / 出处），
`node scripts/fetch-assets.mjs` 下载到 `public/assets/` 并生成 `src/data/assets.js` 清单与 `LICENSES.md`；
已存在且大于 64 字节的素材文件会跳过（`--force` 重下），许可证文本仍会重新请求。
下载的素材会校验文件头，防止把 HTML 错误页当成素材；使用仓库内已提交的素材进行构建和部署测试无需重新下载。

贴图索引集中在 `src/data/sprites.js`（例如 96=骑士、108=史莱姆、120=蝙蝠、121=幽灵、122=蜘蛛）。
挑索引用 `node scripts/tile-inspect.mjs --src /assets/sprites/kenney_td_tiles.png --tile 16 --zoom 7 --pick 96,97,108`
生成带编号的放大对照图 —— 每次都是看图确认，不靠猜。

素材缺失时，战斗/UI 音效可回退到合成声音，字体使用系统备用字体。
已知限制：程序化贴图尚未覆盖角色、敌人、武器和图标对原图集的引用；图集缺失时仍可能显示缺失贴图。
完整画面依赖 `public/assets/` 中的图集随构建产物一起部署。

## 自动化验证

浏览器测试使用 Playwright 的 `chrome` channel，需要本机安装 Google Chrome。
`test:deployment` 会自动构建、启动临时本地静态服务器并在测试后关闭，无需先运行开发服务器。
它检查当前 18 项素材的 HTTP 响应、图集和音频缓存、字体加载，以及菜单进入游戏、角色移动和背景音乐；失败时返回非零退出码。

```bash
npm run test:deployment           # 构建后分别挂载根目录/子目录，验证全部素材、字体、移动和背景音乐
```

以下试玩和截图脚本需要先在另一个终端运行 `npm run dev`，确保游戏位于 `http://localhost:5173/`：

```bash
node scripts/systems-test.mjs 30   # 一键发全套武器+被动，强制弹升级面板，跑 30s 看是否有异常
node scripts/endgame-test.mjs      # 暂停面板截图 + 跳时钟到死神阶段，验证 Boss 音乐、死神、结算流程
node scripts/smoke.mjs 300         # headless Chrome 里 5 分钟试玩：会风筝走位、安全时回头捡宝石、按构筑优先级选卡
node scripts/tile-inspect.mjs --src /assets/sprites/kenney_td_tiles.png --tile 16 --zoom 7 --pick 96,108
                                   # 生成带编号的放大瓦片对照图，用来核对美术索引
```

部署测试直接在终端输出断言结果；试玩脚本输出 `test-results/smoke.json`（逐秒状态轨迹：hp / 等级 / 击杀 / 敌人数 / 弹体数 / 音频采样）、
`test-results/systems.json`、`test-results/endgame.json` 与 `test-results/shots/*.png` 截图。
这套脚本已经抓出过：`Distance.BetweenSquared` 不存在导致的每帧异常、HUD 不刷新、飞刀按朝向投掷导致 45 秒 0 杀、
刷怪曲线中段过陡、以及「顺手按键 + JustDown 轮询」丢输入 —— 都是靠 trace 与截图定位的。
