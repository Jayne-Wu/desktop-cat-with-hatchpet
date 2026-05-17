# Desktop Cat With Hatchpet

Desktop Cat With Hatchpet 是一个 Windows-first 的 Electron 桌面宠物运行时。它的核心目标是直接复用 Hatchpet/Codex 生成的宠物资源，把 `pet.json` 和 `spritesheet.webp` 作为桌面宠物的原生资产格式，而不是重新设计一套转换流程。

当前版本是一只可运行的本地桌面小猫，默认加载 `pets/xigua/` 下的资源，并以透明、无边框、始终置顶的窗口显示在桌面上。项目更关注轻量、可扩展和本地优先的桌宠体验：资源留在本地，运行时设置写入 Electron 的 `userData` 目录，代码仓库只保存应用源码和资源格式说明。

## Overview

这个项目由四个部分组成：

- Electron 桌面壳：负责窗口、托盘、右键菜单、置顶、隐藏和退出。
- Hatchpet 资源适配层：扫描 `pets/`，读取 `pet.json`，解析 `spritesheet.webp`。
- Canvas 动画运行时：按 Codex/Hatchpet atlas 规格裁切帧并播放动画。
- 轻量行为系统：处理点击互动、手动动作切换和随机 ambient 状态。

项目当前面向 Windows 开发和打包，后续可以在不改变宠物资源格式的前提下扩展宠物切换、桌面移动、工作陪伴和多宠物能力。

## Current Version

`v1.3.0: 桌面移动版`

当前版本的范围是稳定播放本地 Hatchpet/Codex 宠物资源，并提供基础桌面控制能力。已支持：

- 透明、无边框、始终置顶的 Electron 桌宠窗口。
- 默认加载 `pets/xigua/pet.json` 和 `pets/xigua/spritesheet.webp`。
- 支持 9 个 Codex/Hatchpet 动画状态：`idle`、`running-right`、`running-left`、`waving`、`jumping`、`failed`、`waiting`、`running`、`review`。
- 左键点击触发有限时长的互动动作，并会根据点击节奏在 `waving`、`jumping`、`review` 之间变化。
- 右键菜单支持手动动作切换：`Idle`、`Wave`、`Jump`、`Waiting`、`Working`、`Review`、`Failed`、`Move Left`、`Move Right`。
- 右键菜单支持窗口控制：`Pin / Unpin`、`Hide`、`Quit`。
- 系统托盘支持显示、隐藏、置顶切换和退出。
- 本地设置存储支持宠物选择、缩放和窗口位置等运行时设置。
- 支持从右键菜单和托盘切换 `xigua` 与 `simba`。
- 支持拖拽摆放、三档尺寸切换和一键重置位置。
- 支持更安静的随机 ambient 动作、简单情绪节奏和长时间无操作后的休息/唤醒行为。
- 支持底部走动、左右停靠和点击穿透模式。
- 支持中文 / English 菜单切换。
- `npm run validate:pets` 可以校验本地宠物 manifest 和 WebP atlas 尺寸。

## Quick Start

1. 安装 Node.js LTS 和 npm。

本项目推荐使用官方 Node.js LTS 工具链。本机开发时也可以使用 `.tools/` 中的本地 Node/npm；`.tools/` 只用于本地环境，不会上传到 GitHub。

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

当前默认宠物 id 是 `xigua`，定义在 `app/main/pet-registry.mjs` 的 `DEFAULT_PET_ID`。

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

## Project Structure

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

### Main Process

`app/main/` 负责 Electron 主进程能力，包括应用入口、窗口生命周期、IPC、托盘、右键菜单、宠物资源扫描和本地设置读写。

关键模块：

- `electron-main.mjs`：应用入口，注册 IPC、创建窗口、创建托盘、转发 renderer 日志。
- `window.mjs`：创建透明、无边框、始终置顶的桌宠窗口。
- `context-menu.mjs`：提供动作切换、置顶切换、隐藏和退出。
- `tray.mjs`：提供系统托盘菜单。
- `pet-registry.mjs`：扫描 `pets/`，校验 `pet.json`，读取默认宠物并返回 spritesheet 数据。
- `settings-store.mjs`：读写本地运行设置。
- `preload.cjs`：通过安全的 preload bridge 向 renderer 暴露能力。

### Renderer Runtime

`app/renderer/` 负责实际显示和动画播放。页面只包含透明 canvas 和错误提示容器，动画逻辑拆分在 `app/renderer/pet/` 下。

关键模块：

- `main.js`：加载默认宠物、启动动画循环、处理左键互动和右键菜单事件。
- `codex-pet-spec.js`：定义 Codex/Hatchpet atlas 固定规格。
- `pet-loader.js`：加载 manifest 和 spritesheet，校验 atlas 尺寸。
- `atlas-player.js`：根据当前状态和帧时长推进动画。
- `pet-behavior.js`：处理点击互动和随机 ambient 状态。
- `pet-renderer.js`：从 spritesheet 裁切当前帧并绘制到 canvas。

### Supporting Files

- `docs/architecture.md`：分层架构和数据流。
- `docs/pet-format.md`：Hatchpet/Codex 资源格式说明。
- `docs/runtime-states.md`：9 个动画状态在桌宠中的语义。
- `pets/README.md`：本地宠物资源目录说明。
- `scripts/validate-pets.mjs`：本地宠物资源校验脚本。

## Pet Asset Format

运行时原生支持 Hatchpet/Codex 资源格式：

```text
pets/<pet-id>/
  pet.json
  spritesheet.webp
```

示例 manifest：

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
- 背景：透明

当前本地测试资源包括 `xigua` 和 `simba`，但真实宠物资源被 `.gitignore` 忽略，不会上传到 GitHub。仓库只保留 `pets/README.md` 作为目录说明。

## Packaging

项目使用 `electron-builder` 生成 Windows 安装包：

- `npm run pack`：生成未安装的本地应用目录，用于快速检查打包内容。
- `npm run dist:win`：生成 Windows NSIS 安装程序。

打包配置位于 `package.json` 的 `build` 字段。当前只包含默认宠物 `xigua` 的运行必需资源：

```text
pets/xigua/pet.json
pets/xigua/spritesheet.webp
```

`pets/xigua/spritesheet.lossless-backup.webp` 和 `pets/simba/` 不会进入安装包。

当前 Windows 构建关闭了 `signAndEditExecutable`，因此不会尝试代码签名或修改 exe 元数据；这可以避免普通 Windows 开发环境下解压签名工具时需要符号链接权限。

## Release Workflow

仓库包含一个标签触发和手动触发的 GitHub Actions workflow：

```text
.github/workflows/release.yml
```

触发方式：

- 推送 `v*` 格式标签，例如 `v1.3.0`。
- 在 GitHub Actions 页面手动运行 `workflow_dispatch`。

workflow 会在 GitHub 的 Windows runner 上执行：

- `npm ci`
- 恢复私有宠物资源
- `npm run validate:pets`
- `npm run dist:win`
- 上传构建产物为 Actions artifact
- 如果当前运行来自 tag，创建或更新 GitHub Release 并上传 Windows 安装包

发布标签示例：

```bash
git tag v1.3.0
git push origin v1.3.0
```

### Private Pet Assets

`pets/xigua/` 不上传 GitHub，因此 CI 环境默认拿不到真实宠物资源。自动发布前，需要在 GitHub 仓库的 Actions secrets 中配置：

- `PET_ASSET_ZIP_URL`：私有 ZIP 下载地址。
- `PET_ASSET_ZIP_TOKEN`：可选，如果下载地址需要 Bearer token。

ZIP 解压后必须包含：

```text
pets/xigua/pet.json
pets/xigua/spritesheet.webp
```

如果没有配置私有资源 ZIP，release workflow 会在 `Restore private pet assets` 步骤失败，并提示缺少资源。这可以避免生成一个没有默认宠物资源的安装包。

## Roadmap

当前版本作为 `v1.3.0` 固化，后续版本按“先好用，再像桌宠，再成为轻陪伴应用”的路线演进。

### v1.1.0 基础可用性版

目标：让用户能长期把它放在桌面上。

- 增加宠物切换：从右键菜单或托盘切换本地宠物。
- 记住用户选择：保存上次使用的宠物。
- 支持拖拽摆放：宠物可以移动到桌面任意位置。
- 记住窗口位置：重启后恢复上次位置。
- 增加大小控制：提供小、中、大三档缩放。
- 增加重置位置：宠物不见时可一键回到屏幕中央或右下角。

### v1.2.0 桌宠行为版

目标：让它不再只是循环动画，而是更像一个有响应的桌面伙伴。

- 增加更自然的点击反馈：根据当前状态、点击次数、冷却时间触发不同动作。
- 增加随机小动作：空闲时偶尔挥手、等待、发呆或查看。
- 增加简单情绪：开心、无聊、困倦、专注等状态影响动作概率。
- 增加休息和唤醒：长时间无操作进入安静状态，点击后恢复活跃。
- 增加动作节奏控制：避免频繁重复同一个动作。

### v1.3.0 桌面移动版

目标：让桌宠真正生活在桌面上。

- 增加桌面走动：宠物可以在屏幕底部或桌面边缘移动。
- 增加边缘感知：走到屏幕边缘自动回头。
- 增加停靠规则：可选择靠左、靠右、底部自由移动。
- 增加点击穿透模式：开启后不影响用户操作桌面和窗口。
- 增加自动降低存在感：全屏、游戏、会议场景下减少打扰或自动隐藏。

### v1.4.0 工作陪伴版

目标：让桌宠和用户的工作节奏产生轻连接。

- 增加专注模式：动作频率降低，保持安静陪伴。
- 增加番茄钟：工作一段时间后用动作或轻提示提醒休息。
- 增加轻提醒：喝水、休息眼睛、站立活动。
- 增加状态联动入口：可手动切换“工作中 / 等待 / 审查 / 出错 / 完成”等状态。
- 增加勿扰时间：用户设置时间段内降低互动频率。

### v1.5.0 个性化版

目标：让用户更愿意把它当作自己的桌宠。

- 增加宠物命名：菜单和提示显示自定义名字。
- 增加透明度控制：适配不同桌面背景。
- 增加行为频率设置：安静、普通、活跃三档。
- 增加开机启动选项。
- 增加简单配饰：帽子、围巾、小物件等轻量装饰。

### v2.0.0 多宠与生态版

目标：从单个桌宠应用扩展成可持续添加内容的平台。

- 支持多宠物同屏。
- 支持宠物导入：用户可以添加自己的 Hatchpet 资源。
- 支持宠物管理面板：启用、禁用、删除、预览本地宠物。
- 支持桌宠专属 manifest 扩展：为桌面行为、默认缩放、推荐锚点、性格参数提供可选配置。
- 支持插件或事件 hook：为外部工具、工作流、系统状态联动留下入口。

## Repository Notes

以下内容会上传到 GitHub：

- 应用源码
- README 和 docs
- `package.json`
- `package-lock.json`
- `pets/README.md`
- `scripts/validate-pets.mjs`
- GitHub Actions workflow

以下内容不会上传到 GitHub：

- `pets/xigua/`
- `pets/simba/`
- `.tools/`
- `node_modules/`
- 构建输出目录，例如 `dist/`、`out/`、`release/`

真实宠物资源仅作为本地测试和发布打包资产使用。运行时设置写入 Electron 的 `userData` 目录，不写入宠物资源目录。
