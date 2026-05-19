# Desktop Cat With Hatchpet

Desktop Cat With Hatchpet 是一个 Windows-first 的 Electron 桌面宠物运行时。它直接复用 Hatchpet/Codex 生成的宠物资源，把 `pet.json` 和 `spritesheet.webp` 当作原生资产格式，而不是再做一套资源转换流程。

当前版本：`v1.5.0`

应用显示名：`Desktop Cat`

Windows 打包产物名：`DesktopCat-v${version}.exe`

## 当前能力

- 透明、无边框、始终置顶的桌宠窗口。
- 内置两只本地宠物：`xigua`（西瓜）和 `simba`（辛巴）。
- 支持 Codex/Hatchpet 固定 8x9 atlas：`idle`、`running-right`、`running-left`、`waving`、`jumping`、`failed`、`waiting`、`running`、`review`。
- 支持右键菜单和系统托盘菜单。
- 支持中文 / English 菜单切换，默认中文。
- 支持宠物切换、本地 Hatchpet/Codex 宠物导入、右下角自由拖拽缩放、拖拽摆放、位置重置、置顶切换、显示隐藏和退出。
- 支持四种陪伴风格：安静陪伴、好奇巡视、活泼玩耍、低打扰专注。
- 支持底部边缘自动移动、停留观察、拖拽后回到底部边缘。
- 支持点击后的有限动作反馈，不再把每个动作无限循环播放。

当前还没有实现番茄钟、喝水提醒、日程联动、全屏/会议自动隐藏、长期记忆或多只宠物同时出现。README 只描述当前已经落地的能力；后续规划见 [docs/roadmap.md](docs/roadmap.md)。

## 快速开始

建议使用 Node.js 24 和 npm。项目本地开发环境里也可能包含 `.tools/` 下的便携 Node/npm，但它们只用于本机，不会发布到仓库。

安装依赖：

```bash
npm install
```

校验宠物资源：

```bash
npm run validate:pets
```

运行测试：

```bash
npm run test
```

启动桌宠：

```bash
npm run dev
```

打包 Windows 安装程序：

```bash
npm run dist:win
```

打包输出在 `dist/`。当前配置会生成类似 `DesktopCat-v1.5.0.exe` 的安装包和对应 `.blockmap`。

## 项目结构

```text
desktop-cat-with-hatchpet/
  app/
    main/                Electron 主进程、窗口、托盘、菜单、设置、移动控制
    renderer/            Canvas 渲染、动画播放、行为状态映射
  build/                 应用图标
  docs/                  架构、资源格式、行为逻辑说明
  pets/                  本地宠物资源
  scripts/               校验脚本
  tests/                 Node test 测试
  package.json
```

关键模块：

- `app/main/electron-main.mjs`：应用入口，注册 IPC，创建窗口和托盘。
- `app/main/menu-template.mjs`：右键菜单和托盘菜单结构。
- `app/main/movement-controller.mjs`：桌宠窗口移动、停留、回到底部边缘的主进程控制器。
- `app/main/settings-store.mjs`：读写本地运行设置。
- `app/renderer/main.js`：加载宠物、处理点击、拖拽摆放和右下角缩放、驱动动画循环。
- `app/renderer/pet/pet-behavior.js`：把点击、陪伴风格、移动快照和 mood 映射成动画状态。
- `app/renderer/pet/atlas-player.js`：按当前状态推进 spritesheet 帧。
- `app/renderer/pet/codex-pet-spec.js`：定义 atlas 行、列、帧数和播放节奏。

## 宠物资源格式

运行时原生支持 Hatchpet/Codex 输出结构：

```text
pets/<pet-id>/
  pet.json
  spritesheet.webp
```

`pet.json` 示例：

```json
{
  "id": "xigua",
  "displayName": "西瓜",
  "description": "西瓜是一只粘人、好奇、很有主见的微胖银黑虎斑白猫。",
  "spritesheetPath": "spritesheet.webp"
}
```

spritesheet 约束：

- 格式：WebP
- 尺寸：`1536x1872`
- 网格：8 列 x 9 行
- 单元格：`192x208`
- 未使用格子保持透明

仓库目前白名单提交了 `pets/xigua/` 和 `pets/simba/`。`.gitignore` 默认忽略其他 `pets/*` 目录；如果之后要把新宠物也纳入仓库，需要同步更新 `.gitignore` 白名单。

运行中的应用可以从宠物菜单选择“导入宠物…”导入本地 Hatchpet/Codex 宠物文件夹。导入会校验 `pet.json`、WebP 文件和 `1536x1872` atlas 尺寸，并把资源复制到应用的用户数据目录，不会写入安装包内的 `pets/`。

## 行为触发逻辑

桌宠行为由两层一起决定：

- 主进程 `MovementController` 决定窗口在桌面上的位置，以及当前处于 `observe`、`settle`、`stroll`、`rehome` 哪个移动阶段。
- 渲染进程 `PetBehavior` 接收移动快照，结合点击、陪伴风格、mood 和短动作，决定播放哪一行动画。

动画状态优先级从高到低是：

1. 点击触发的短动作：`waving`、`jumping`、`review`。
2. 移动控制器发出的方向移动：`running-left`、`running-right`。
3. 专注风格下的静止状态：运行时 `still`，锁在 `idle` 第一帧。
4. 自动观察和停留状态：根据陪伴风格和 mood 映射到 `idle`、`waiting`、`review` 或 `running`。

主要触发源：

- 启动：读取设置，恢复宠物、自由缩放尺寸、语言和陪伴风格。
- 左键点击：触发有限时长短动作，并重置互动计时；拖拽后的 click 会被保护逻辑吞掉。
- 拖拽：移动超过 8px 后进入窗口拖拽，不触发点击动作；松手后如果不在底部边缘，会延迟回到底部。
- 右下角缩放：把鼠标放到宠物窗口右下角后拖拽，可连续调整大小；松手后尺寸会写入本地设置。
- 菜单切换：宠物、陪伴风格、语言、位置重置和窗口控制会立即生效。
- 移动循环：主进程每 50ms 更新移动阶段；只有当渲染进程已经切到 `running-left` 或 `running-right` 时，窗口才真正移动。

更完整的中文版说明见 [docs/behavior-logic.zh-CN.md](docs/behavior-logic.zh-CN.md)。英文原版仍保留在 [docs/behavior-logic.md](docs/behavior-logic.md)。

## 陪伴风格

- 安静陪伴 `quiet`：移动慢、停留久，点击反馈较温和。
- 好奇巡视 `curious`：默认风格，观察、停留、移动之间比较均衡。
- 活泼玩耍 `playful`：更容易移动，点击后更容易跳跃。
- 低打扰专注 `focus`：长时间保持静止观察，点击后短暂借用好奇巡视的移动节奏。

这些风格只影响行为节奏和状态映射，不改变宠物资源本身。

## 菜单结构

右键菜单和托盘菜单使用同一套模板，当前分组如下：

- 当前宠物：只读显示当前选择。
- 宠物：导入本地 Hatchpet/Codex 宠物文件夹，或切换 `xigua` / `simba` / 已导入宠物。
- 陪伴风格：切换 `quiet` / `curious` / `playful` / `focus`。
- 语言：中文 / English。
- 位置：回到屏幕中央、回到右下角。
- 底部窗口控制区：置顶 / 取消置顶、显示或隐藏、退出。

## 打包和发布

打包配置在 `package.json` 的 `build` 字段里：

- `productName`：`Desktop Cat`
- `artifactName`：`DesktopCat-v${version}.${ext}`
- `icon`：`build/icon.ico`
- Windows target：NSIS installer

GitHub Actions workflow 位于 `.github/workflows/release.yml`。触发方式：

- 推送 `v*` 标签，例如 `v1.5.0`。
- 在 GitHub Actions 页面手动运行 `workflow_dispatch`。

workflow 会执行 `npm ci`、`npm run validate:pets`、`npm run dist:win -- --publish never`，然后上传安装包、`.blockmap` 和 `latest.yml`。如果是 tag 触发，还会创建或更新对应 GitHub Release。

## 相关文档

- [docs/behavior-logic.zh-CN.md](docs/behavior-logic.zh-CN.md)：当前行为触发和状态映射中文版。
- [docs/behavior-logic.md](docs/behavior-logic.md)：行为逻辑英文说明。
- [docs/architecture.md](docs/architecture.md)：项目分层和数据流。
- [docs/pet-format.md](docs/pet-format.md)：宠物资源格式。
- [docs/runtime-states.md](docs/runtime-states.md)：9 个动画状态的语义。
- [docs/roadmap.md](docs/roadmap.md)：版本路线图和后续规划。
- [pets/README.md](pets/README.md)：宠物资源目录说明。
