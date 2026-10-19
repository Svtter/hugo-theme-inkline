---
categories:
- Coding
- DevOps
date: '2026-09-01 00:00:00+08:00'
draft: false
tags:
- zcode
- AI agent
- 自动化
- GitHub
title: 用 zcode 跑夜间无人值守：issue → PR 的自动化闭环
---

> **安全事件/违法事件提示（2026-09-18 更新）**：ZCode 被曝静默上传用户全量 Git 历史——客户端会将工作区快照（含完整 `.git` 历史）打包加密后上传至云端 OSS，本地不留解密密钥；设置里的"仓库快照索引"开关不在采集路径上，实际上无法关闭。详见 [ferstar 的取证博客](https://blog.ferstar.org/posts/zcode-silent-workspace-snapshot-upload/)和[老冯的独立复现分析](https://mp.weixin.qq.com/s/LdXekkP-Yb2IQfoMV53uDw)。**建议停用 ZCode，或至少锁死 `~/.zcode/v2/checkpoints/` 目录（macOS `chflags uchg`，Linux `chattr +i`），并轮换 Git 历史中出现过的所有凭据。**

前提：我的 Coding Plan 每天有 5 小时额度且没有周上限。

基于此，晚上不跑 zcode，这个额度就浪费了。我把一个完整闭环放进了夜间定时任务：让 zcode 每半小时开一个新 session，自动从 issue 池里挑一个没人认领的开放问题，分析、实现、review，最后 push 并创建 PR。

<!--more-->

## 核心思路

不是让 agent 无休无止地跑，而是每个 session 只做一个 issue，做完就结束。如果 CI 红了、没有合适 issue、或者信息不足以安全动手，就记录原因然后退出。这样可以控制单次成本，也避免 agent 在模糊需求上硬做半套。

下面是我实际用的提示词：

```text
你在一个无人值守的定时任务中运行,目标是完成一个完整闭环:找一个当前没有关联 PR 的开放 issue → 分析它 → 在独立 worktree 中实现 → 通过 /review-loop → push 并创建修复该 issue 的 PR。全程自主决策,不要向用户提问或等待确认;无法继续时记录原因并结束本次运行。

流程与约束:

1. 先读 AGENTS.md 并严格遵守(尤其:禁止在 main 分支或项目根直接开发,必须在 .worktrees/ 下创建 worktree;创建 PR 前必须通过 /review-loop;先看 main CI 是否绿)。
2. 检查 main 最近一次 CI 状态(gh run list --branch main --limit 3)。若为 failure/canceled/error:先看最近 commit message / PR / issue 确认是否已有人在修;无人处理则本次运行转为优先修复 CI,不再挑新 issue;已有人在修则直接结束本次运行。
3. 挑 issue:找一个 open 且没有关联 PR 的 issue(可先 gh repo view 确认远程 owner/name,再 gh search issues 'state:open -linked:pr' --repo <owner/name>,或 gh issue list 后逐个核实没有 PR/分支引用它)。排除:已被其他 open PR、已有分支或最近 commit 认领的,以及评论里已有他人留言认领的。只挑一个;若 .worktrees/ 下已有针对该 issue 的未完成 worktree,优先续做它而不是另起炉灶。没有合适的 issue 就直接结束并说明。
4. 分析该 issue:bug 修复走 /fix-bug-workflow 技能;功能开发遵循仓库标准流程(可参考 latex-agent-workflow 技能)。若改动属于需要 OpenSpec 流程的结构性变更、或 issue 信息不足以安全动手,跳过换下一个候选(最多再看 2 个),仍不合适则结束本次运行,不要硬做半套。
5. 编码:遵循 docs/style-guide.md;测试尽量不用 mock/monkeypatch,提交前做「删/改坏实现 → 测试变红」自证;禁止 eslint-disable。
6. 交付:push 后创建 PR,描述中写 "Closes #<issue号>";若是 bug 修复,PR 描述必须包含 AGENTS.md 规则 6 要求的四点根因复盘(问题怎么发生/哪个 PR 引入/为什么 review 没拦住/是否沉淀 docs/code-faq)。
7. 最后输出本次运行摘要:处理了哪个 issue、做了什么、PR 链接;或未产出的原因(CI 红/无合适 issue/信息不足等)。
```

## 几个关键设计

**先看 CI。** 如果主分支已经红了，新的改动很可能建立在不稳定基线上。此时优先修 CI，而不是继续堆代码。

**只挑无 PR 关联的 issue。** 用 `gh search issues 'state:open -linked:pr'` 可以快速过滤，避免和别人的工作冲突。

**独立 worktree。** 每个 issue 都在 `.worktrees/` 下有自己的工作区，不会污染主分支，也方便断点续做。

**必须过 review-loop。** 不是写完就 push，而是让 agent 自己先 review 一遍，把明显问题留在本地。

**测试自证。** 提交前故意改坏实现，确认测试会变红。这比单纯"测试通过"更能保证测试真的在测正确的东西。

## 实际跑法

我用 cron 每半小时触发一次，每次启动一个新的 zcode session。session 之间不共享上下文，避免长时间运行带来的状态漂移。一个晚上通常能产出 3-5 个 PR，大部分是小 bug 修复和文档改进。

## 注意

这不是"set and forget"。更理想的节奏是：白天确认今天要处理哪些 issue、优先级和边界，夜间让 agent 在闲时优惠中批量执行。第二天早上再过一遍昨晚的 PR，合并、关闭或要求补充。

自动化的价值在于把"找事做 + 初步实现"的耗时环节搬到低价时段，最终决策和代码质量把关仍然需要人。

如果你也买了类似的 Coding Plan，每天有固定小时额度且没有周上限，不妨试试把这类低优先级但完整的闭环任务放到夜间跑。当然，如果当前有必须做的任务，按量付费的 API 也完全值得考虑。