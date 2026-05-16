# Desktop Cat With Hatchpet

这是一个 Windows-first 的 Electron 桌面宠物程序。当前主程序是一只本地桌面小猫，默认加载本地 `xigua` 资源，并直接复用 Hatchpet/Codex 生成的宠物产物：

- `pet.json`
- `spritesheet.webp`

项目目标不是重新制作一套宠物资源格式，而是把 Hatchpet/Codex 的精灵图 atlas 当作桌面宠物运行时的原生资产格式。真实宠物资源仅作为本地测试资产使用，已被 `.gitignore` 忽略，不会上传到 GitHub。

## 功能说明

- 透明、无边框、始终置顶的 Electron 桌面窗口。
- 默认加载 `pets/xigua/pet.json` 和 `pets/xigua/spritesheet.webp`。
- 支持 Codex/Hatchpet 的 9 个动画状态：`idle`、`running-right`、`running-left`、`waving`、`jumping`、`failed`、`waiting`、`running`、`review`。
- 左键点击小猫会触发互动动作，当前会在 `waving`、`jumping`、`review` 之间轮换。
- 右键菜单可以手动切换动作：`Idle`、`Wave`、`Jump`、`Waiting`、`Working`、`Review`、`Failed`、`Move Left`、`Move Right`。
- 右键菜单也提供窗口控制：`Pin / Unpin`、`Hide`、`Quit`。
- 本地设置存储支持缩放等运行时设置，设置写入 Electron 的 userData 目录，不写入宠物资源目录。
- `npm run validate:pets` 可以校验本地宠物 manifest 和 WebP atlas 尺寸。

## Quick Start

1. 安装 Node.js LTS 和 npm。

本项目推荐使用官方 Node.js LTS 工具链。本机开发时也可以使用 `.tools/` 里的本地 Node/npm；`.tools/` 只用于本地环境，不会上传到 GitHub。

2. 安装依赖：

```bash
npm install
```

3. 准备本地宠物资源：

```text
pets/
  xigua/
    pet.json
    spritesheet.webp
```

当前程序默认宠物 id 是 `xigua`。这个默认值定义在 `app/main/pet-registry.mjs` 的 `DEFAULT_PET_ID`。

4. 校验宠物资源：

```bash
npm run validate:pets
```

5. 启动桌面宠物：

```bash
npm run dev
```

6. 打包 Windows 安装程序：

```bash
npm run dist:win
```

打包产物会输出到 `dist/`。本地打包会把 `pets/xigua/pet.json` 和 `pets/xigua/spritesheet.webp` 放进安装包，但这些真实宠物资源仍然不会进入 GitHub。

## 工程结构

```text
desktop-cat-with-hatchpet/
  app/
    main/
    renderer/
  docs/
  pets/
  scripts/
  package.json
  package-lock.json
```

### `app/main/`

Electron 主进程代码：

- `electron-main.mjs`：应用入口，注册 IPC、创建窗口、创建托盘、转发 renderer 日志。
- `window.mjs`：创建透明无边框桌宠窗口，并在 ready 后居中显示。
- `context-menu.mjs`：右键菜单，负责动作切换、置顶/取消置顶、隐藏和退出。
- `tray.mjs`：系统托盘菜单，提供显示、隐藏、置顶和退出。
- `pet-registry.mjs`：扫描 `pets/`，校验 `pet.json`，读取默认宠物 `xigua`，并把 spritesheet 转成 data URL 交给 renderer。
- `settings-store.mjs`：读写本地运行设置，例如缩放比例。
- `preload.cjs`：Electron preload bridge，把安全的主进程能力暴露给 renderer。

### `app/renderer/`

Renderer 进程代码，负责真正显示小猫：

- `index.html`：只有一个透明 canvas 和错误提示容器。
- `styles.css`：透明窗口样式，避免显示调试面板或普通网页背景。
- `main.js`：加载默认宠物、启动动画循环、处理左键互动和右键菜单事件。

### `app/renderer/pet/`

桌宠运行时模块：

- `codex-pet-spec.js`：Codex/Hatchpet atlas 固定规格，包含 8 列 x 9 行、`192x208` 单元格和 9 个状态的帧时长。
- `pet-loader.js`：加载 `pet.json` 对应的 spritesheet，校验 atlas 尺寸必须是 `1536x1872`。
- `atlas-player.js`：根据当前状态和帧时长推进动画帧。
- `pet-behavior.js`：轻量行为状态机，负责点击互动和随机 ambient 状态。
- `pet-renderer.js`：Canvas 渲染器，从 spritesheet 中裁切当前帧并绘制到窗口。

### `pets/`

本地宠物资产目录。实际宠物资源格式如下：

```text
pets/<pet-id>/
  pet.json
  spritesheet.webp
```

当前本地测试资源包括 `xigua` 和 `simba`，但这些真实资源被 `.gitignore` 忽略，不会上传到 GitHub。仓库只保留 `pets/README.md` 作为目录说明。

### `scripts/`

本地辅助脚本：

- `validate-pets.mjs`：扫描 `pets/` 下的本地宠物，检查 manifest 是否合法，并校验 WebP atlas 是否为 `1536x1872`。

### `docs/`

项目说明和后续规划：

- `architecture.md`：分层架构和数据流。
- `pet-format.md`：Hatchpet/Codex 资源格式说明。
- `runtime-states.md`：9 个动画状态在桌宠里的语义。
- `roadmap.md`：后续版本演进路线。

## 资源格式

当前运行时原生支持 Hatchpet/Codex 格式：

```json
{
  "id": "xigua",
  "displayName": "西瓜",
  "description": "西瓜是一只粘人、好奇、很有主见的微胖银黑虎斑白猫。",
  "spritesheetPath": "spritesheet.webp"
}
```

spritesheet 要求：

- 格式：WebP
- 尺寸：`1536x1872`
- 网格：8 列 x 9 行
- 单元格：`192x208`
- 透明背景

## GitHub 上传说明

以下内容会上传：

- 应用源码
- README 和 docs
- `package.json`
- `package-lock.json`
- `pets/README.md`
- `scripts/validate-pets.mjs`

以下内容不会上传：

- `pets/xigua/`
- `pets/simba/`
- `.tools/`
- `node_modules/`
- 构建输出目录，例如 `dist/`、`out/`、`release/`

## Windows 打包

项目使用 `electron-builder` 生成 Windows 安装包：

- `npm run pack`：生成未安装的本地应用目录，用于快速检查打包内容。
- `npm run dist:win`：生成 Windows NSIS 安装程序。

打包配置写在 `package.json` 的 `build` 字段里。当前只包含默认宠物 `xigua` 的运行必需资源：

```text
pets/xigua/pet.json
pets/xigua/spritesheet.webp
```

`pets/xigua/spritesheet.lossless-backup.webp` 和 `pets/simba/` 不会进入安装包。

当前 Windows 构建关闭了 `signAndEditExecutable`，因此不会尝试代码签名或修改 exe 元数据；这避免了普通 Windows 开发环境下解压签名工具时需要符号链接权限。
