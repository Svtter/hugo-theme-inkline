---
title: LLMs
description: 我的私人 LLM Leaderboard
menu:
    main:
        weight: -50
        params:
            icon: brain

comments: false
---

## 2026-09-18

- ZCode（安全事件/违法事件）已停用：静默上传全量 Git 历史。详见 [ferstar 的取证博客](https://blog.ferstar.org/posts/zcode-silent-workspace-snapshot-upload/)和[事件分析](https://mp.weixin.qq.com/s/LdXekkP-Yb2IQfoMV53uDw)。

## 2026-08-03

| Use | Model / Tool |
| --- | --- |
| Coding | Kimi K3 + GLM-5.2 |
| Code Review | Xiaomi MiMo token plan |
| Agent Client | oh-my-pi / ZCode（安全事件/违法事件）/ Kimi Code / Hermes (DeepSeek-V4-Flash) |
| Talk | Kimi-K2.6 |

> MiMo is no longer used as a coding agent. The MiMo token plan is reserved for code review only — it's the cheapest plan, and review workloads hit prefix cache heavily, so the cost bottoms out.

## 2026-06-24

- Coding Agent: Claude Code / Kimi Code / OpenCode / MiMo Code
- Main Dev: GLM-5.2 / Kimi-K2.7 / MiniMax-M3
- Code Review: DeepSeek-V4-Flash
- Talk: Kimi-K2.6

## 2025-10-09

Current workflow:

- Code Agent: [Kilo Code](https://kiloai.ai) - GLM 4.6
- Code Agent: [Claude Code](https://claude.ai/code) - GLM 4.6
- Complex reasoning: [deepseek/deepseek-v3.2](https://openrouter.ai/deepseek/deepseek-v3.2)
- Hard problem solving: Claude Sonnet 4.5
- Daily conversation: GPT-5

## Previous

- Fast programming model: [qwen/qwen3-235b-a22b-07-25](https://openrouter.ai/qwen/qwen3-235b-a22b-07-25)
- Planning model: [deepseek/deepseek-r1-0528]()
- Daily conversation: [chatgpt-4o]()

