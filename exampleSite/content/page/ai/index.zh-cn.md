---
title: 模型
description: 我的私人 LLM Leaderboard
menu:
    main:
        weight: -50
        params:
            icon: brain

comments: false
toc: false
---

## 2026-09-18

- ZCode（安全事件/违法事件）已停用：静默上传全量 Git 历史。详见 [ferstar 的取证博客](https://blog.ferstar.org/posts/zcode-silent-workspace-snapshot-upload/)和[事件分析](https://mp.weixin.qq.com/s/LdXekkP-Yb2IQfoMV53uDw)。

## 2026-08-03

| 用途 | 模型 / 工具 |
| --- | --- |
| Coding | Kimi K3 + GLM-5.2 |
| 代码评审 | Xiaomi MiMo token plan |
| Agent Client | oh-my-pi / ZCode（安全事件/违法事件）/ Kimi Code / Hermes (DeepSeek-V4-Flash) |
| Talk | Kimi-K2.6 |

> 编码 agent 已不再使用 MiMo。MiMo token plan 仅用于 code review —— 它是最便宜的 plan，而 review 吃 prefix cache，成本可以压到最低。

## 2026-07-03

| 用途 | 模型 / 工具 |
| --- | --- |
| Coding Agent | Claude Code / Kimi Code / OpenCode / MiMo Code |
| Coding Plan | Xiaomi MiMo Pro / Zhipu Coding Plan Max / Kimi Allegretto |
| 代码评审 | DeepSeek-V4-Flash |
| Talk | Kimi-K2.6 |

## 2026-06-24

- Coding Agent: Claude Code / Kimi Code / OpenCode / MiMo Code
- 主力开发: GLM-5.2 / Kimi-K2.7 / MiniMax-M3
- 代码评审: DeepSeek-V4-Flash
- Talk: Kimi-K2.6

## 2025-12-16

- Code Agent: Sonnet 4.5
- Talk: Opus 4.5

## 2025-10-24

- Code Agent: [Kilo Code](https://kiloai.ai) - GLM 4.6
- Code Agent: [Claude Code](https://claude.ai/code) - Sonnet 4.5 or Deepseek Reasoner (v3.2)
- 解决困难问题: Claude Sonnet 4.5
- 日常对话: GPT-5

## 2025-10-09

当前工作流：

- Code Agent: [Kilo Code](https://kiloai.ai) - GLM 4.6
- Code Agent: [Claude Code](https://claude.ai/code) - GLM 4.6
- 复杂推理: [deepseek/deepseek-v3.2](https://openrouter.ai/deepseek/deepseek-v3.2)
- 解决困难问题: Claude Sonnet 4.5
- 日常对话: GPT-5

## 2025-09-22

当前工作流：

- PLAN mode: [Claude Code](https://claude.ai/code) - Claude Sonnet 4
- ACT mode: [deepseek/deepseek-v3.1](https://openrouter.ai/deepseek/deepseek-v3.1) (for complex reasoning)
- 日常对话: GPT-5

## 2025-08-08

工作流：

- PLAN mode: deepseek/deepseek-reason (on https://platform.deepseek.com)
- ACT mode: qwen/qwen3-235b-a22b-07-25 (for quick code editing)

## 2025-07-27

阿里云官方的 qwen 实在是忒贵了，都搞不清楚为什么，50块就划掉了。而且实际上通过 leaderboard 上的测试，性能不如 r1-0528。

- 快速编程模型: [deepseek/deepseek-v3]()
- 规划模型: [deepseek/deepseek-r1-0528]()
- 日常对话： [chatgpt-4o]()

## 2025-07-26

- 快速编程模型: [qwen/qwen3-235b-a22b-07-25](https://openrouter.ai/qwen/qwen3-235b-a22b-07-25)
- 规划模型: [deepseek/deepseek-r1-0528]()
- 日常对话： [chatgpt-4o]()


## Previous

- 快速编程模型: [cursor-auto]()
- 规划模型: [deepseek/deepseek-r1-0528]()
- 日常对话： [chatgpt-4o]()
