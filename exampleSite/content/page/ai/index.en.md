---
title: LLMs
description: My private LLM Leaderboard
comments: false
toc: false
---

## 2026-09-18

- ZCode (security incident) retired: it silently uploads users' full Git history — workspace snapshots (including the complete `.git` history) are encrypted and uploaded to cloud OSS with no decryption key held locally, and the snapshot toggle in settings is not on the collection path, so it cannot actually be disabled. See [ferstar's forensic writeup](https://blog.ferstar.org/posts/zcode-silent-workspace-snapshot-upload/) and the [incident analysis](https://mp.weixin.qq.com/s/LdXekkP-Yb2IQfoMV53uDw).

## 2026-08-03

| Use | Model / Tool |
| --- | --- |
| Coding | Kimi K3 + GLM-5.2 |
| Code Review | Xiaomi MiMo token plan |
| Agent Client | oh-my-pi / ZCode (security incident) / Kimi Code / Hermes (DeepSeek-V4-Flash) |
| Talk | Kimi-K2.6 |

> MiMo is no longer used as a coding agent. The MiMo token plan is reserved for code review only — it's the cheapest plan, and review workloads hit prefix cache heavily, so the cost bottoms out.

## 2026-06-24

- Coding Agent: Claude Code / Kimi Code / OpenCode / MiMo Code
- Main Dev: GLM-5.2 / Kimi-K2.7 / MiniMax-M3
- Code Review: DeepSeek-V4-Flash
- Talk: Kimi-K2.6

## 2025-12-16

- Code Agent: Sonnet 4.5
- Talk: Opus 4.5

## 2025-10-24

- Code Agent: [Kilo Code](https://kiloai.ai) - GLM 4.6
- Code Agent: [Claude Code](https://claude.ai/code) - Sonnet 4.5 or Deepseek Reasoner (v3.2)
- Complex reasoning: Claude Sonnet 4.5
- Daily conversation: GPT-5

## 2025-10-09

Current workflow:

- Code Agent: [Kilo Code](https://kiloai.ai) - GLM 4.6
- Code Agent: [Claude Code](https://claude.ai/code) - GLM 4.6
- Complex reasoning: [deepseek/deepseek-v3.2](https://openrouter.ai/deepseek/deepseek-v3.2)
- Hard problem solving: Claude Sonnet 4.5
- Daily conversation: GPT-5

## 2025-09-22

Current workflow:

- PLAN mode: [Claude Code](https://claude.ai/code) - Claude Sonnet 4
- ACT mode: [deepseek/deepseek-v3.1](https://openrouter.ai/deepseek/deepseek-v3.1) (for complex reasoning)
- Daily conversation: GPT-5

## 2025-08-08

Workflow:

- PLAN mode: deepseek/deepseek-reason (on https://platform.deepseek.com)
- ACT mode: qwen/qwen3-235b-a22b-07-25 (for quick code editing)

## 2025-07-27

Aliyun's official qwen is too expensive, 50 yuan is gone. And based on leaderboard tests, performance is worse than r1-0528.

- Fast programming model: [deepseek/deepseek-v3]()
- Planning model: [deepseek/deepseek-r1-0528]()
- Daily conversation: [chatgpt-4o]()

## 2025-07-26

- Fast programming model: [qwen/qwen3-235b-a22b-07-25](https://openrouter.ai/qwen/qwen3-235b-a22b-07-25)
- Planning model: [deepseek/deepseek-r1-0528]()
- Daily conversation: [chatgpt-4o]()

## Previous

- Fast programming model: [cursor-auto]()
- Planning model: [deepseek/deepseek-r1-0528]()
- Daily conversation: [chatgpt-4o]()
