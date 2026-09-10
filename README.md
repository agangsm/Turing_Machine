# Turing Machine Solo Offline Edition

An offline single-player web implementation of *Turing Machine*, featuring Chinese and English interfaces and a complete solo deduction puzzle experience.

## Features

- Fixed challenge bank and randomly generated puzzles
- Turing Master daily challenges, free practice, and challenge reports
- Deduction notes, scratchpad tools, and read-only puzzle-by-puzzle review
- Standard card quick reference
- Chinese rule pages and the English rulebook
- Chinese / English interface switching
- Local save data and single-file offline operation

## Direct Use

Open `release/Turing_Machine_单人离线版.html` directly. This file already contains the runtime code, styles, challenge data, and rule materials, so no internet connection or software installation is required.

## Local Development

Requires Node.js 22.13 or later.

```bash
npm ci
npm run dev
```

Build the single-file offline edition:

```bash
npm run build:standalone
```

By default, the build script outputs the finished file to the parent directory of the project as `Turing_Machine_单人离线版_clean.html`.

Verify the fixed challenge bank, randomly generated puzzles, and Turing Master challenge sets:

```bash
npm run audit:puzzles
```

## Directory Structure

- `app/`: interface, game logic, challenge data, and embedded rule data
- `public/`: rulebook and public web assets
- `scripts/`: offline build tools, rule-data generation tools, and challenge-bank verification tools
- `release/`: directly shareable single-file build
- `RELEASE-CLEANUP.txt`: pre-release cleanup and verification notes

## Disclaimer

This project is intended solely for personal learning, Chinese localization practice, programming research, and non-commercial exchange. No commercial use is authorized.

Rights relating to the *Turing Machine* name, rules, artwork, and related materials remain with their respective rights holders. This is an unofficial fan-made project. Official website: [Scorpion Masqué — Turing Machine](https://www.scorpionmasque.com/en/turingmachine).

## License and Third-Party Rights

Original software code in this repository that the project author has the right to license is provided under the **PolyForm Noncommercial License 1.0.0**, for non-commercial use only. See `LICENSE` for details.

This license does not cover the *Turing Machine* name, trademarks, official rulebook, artwork, graphic design, official challenge-bank data, or other third-party materials. Rights to those materials remain with their respective rights holders. See `THIRD_PARTY_NOTICES.md` for details.

Accordingly, this project is more accurately described as **source-available / non-commercial**, rather than “open-source software” under the OSI definition, which requires permission for commercial use.

---

# 中文说明

# Turing Machine 单人离线版

一个可离线运行的《Turing Machine》单人网页实现，提供中文、英文界面与完整的单人推理解谜流程。

## 功能

- 固定题库与随机生成题目
- 图灵大师每日挑战、自由练习与挑战战报
- 推理记录、推理草稿和只读逐题复盘
- 标准卡速查
- 中文规则页与英文规则书
- 中文 / English 界面切换
- 本地存档与单文件离线运行

## 直接使用

打开 `release/Turing_Machine_单人离线版.html` 即可。该文件已经内嵌运行代码、样式、题库及规则资料，不需要联网，也不需要安装软件。

## 本地开发

需要 Node.js 22.13 或更高版本。

```bash
npm ci
npm run dev
```

生成单文件离线版：

```bash
npm run build:standalone
```

构建脚本默认把成品输出到项目目录的上一级，文件名为 `Turing_Machine_单人离线版_clean.html`。

核验固定题库、随机题和图灵大师题组：

```bash
npm run audit:puzzles
```

## 目录说明

- `app/`：界面、游戏逻辑、题库与内嵌规则数据
- `public/`：规则书和网页公开素材
- `scripts/`：离线版构建、规则数据生成及题库核验工具
- `release/`：可直接分享的单文件成品
- `RELEASE-CLEANUP.txt`：发布前清理与核验记录

## 声明

此项目仅用于个人学习、汉化实践、编程研究与非商业交流，不授权任何商业用途。

《Turing Machine》相关名称、规则与美术资料的权利归其原权利人所有。本项目为非官方爱好者项目。官方网站：[Scorpion Masqué — Turing Machine](https://www.scorpionmasque.com/en/turingmachine)。

## 许可证与第三方权利

本仓库中由项目作者原创且有权授权的软件代码，采用 **PolyForm Noncommercial License 1.0.0**，仅授权非商业用途。详见 `LICENSE`。

该许可不覆盖《Turing Machine》的名称、商标、官方规则书、美术、图形设计、官方题库数据或其他第三方资料；这些内容的权利仍归各自权利人所有。详见 `THIRD_PARTY_NOTICES.md`。

因此，本项目更准确地属于 **source-available / non-commercial（源码公开、非商业许可）**，而不是 OSI 定义下允许商业使用的“开源软件”。
