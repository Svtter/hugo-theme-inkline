---
categories:
- Coding
- AI
- Research
comments: 'true'
cover: /images/2026/09/14/pi-vs-ocr-arch-cover.jpg
date: '2026-09-14 09:00:00+08:00'
series: ["AI 代码审查实践"]
weight: 9
description: AACR-Bench 上输了 10 个点之后，盘点 pi-review-agent 架构里 Open Code Review 确实没有的东西：会话级评审记忆、视角并行、缓存经济学、验证器透明度。
draft: false
image: /images/2026/09/14/pi-vs-ocr-arch-cover.jpg
tags:
- pi-review-agent
- Open Code Review
- Code Review
- AI Agent
- Architecture
title: pi-review-agent 的架构比 Open Code Review 多了什么
---

[上一篇](/p/pi-review-agent-跑-aacr-bench/)里，我把 [pi-review-agent](https://github.com/sun-praise/pi-review-agent) 接上 AACR-Bench 跑了一轮：语义 F1 8.1%，距离 [Open Code Review](https://github.com/alibaba/open-code-review)（OCR）配 Deepseek-V4-Pro 的 17.9% 差了 10 个点。

差距不小。但换个角度想，pi 的架构里有哪些 OCR 没有的东西？这值得单独盘一盘。

> OCR 在“把评审这件事本身做好”上（规则引擎、文件捆绑、评论定位）确实更强，下面列的是评测指标之外的结构性差异，每条尽量带实测或源码证据。

<!--more-->

总得来说，pi-review-agent 精度上确实不及 OCR，但胜在价格便宜、速度快；更重要的是，它的设计侧重点本来就不在基准考的那些维度上。下面逐项说。

## 1. 跨 push 的评审记忆

pi 的会话是 PR 级持久的：append-only JSONL transcript 加 `actions/cache` 恢复，
同一个 PR 第二次 push 时，reviewer 知道“上次我提了什么、作者改了什么、哪些 issue 还没解决”。

OCR 的 `resume` 是单次任务内的断点续审，中断了接着跑。它官方 GitHub Action 里其实也有跨 push
的机制：`checkpoint_range` 记录上次审到的 head，新 push 只审 `<checkpoint>..<新 head>`；
`incremental` 读现有 bot 评论做重叠去重，不重贴旧意见（两者默认关闭）。但这些到不了会话级——
reviewer 依然不知道作者对上次的意见改了什么、哪些 issue 还悬着。

所以差异从“有没有”降到了“多深”：pi 是会话级记忆，OCR 的连续性停在范围级。这仍是 pi 最早的设计动机之一。代价是会话管理的复杂度，收益是评审从“增量去重的快照”变成“持续对话”。

基准考不到这个：AACR 的每个实例都是孤立的单次评审，跨 push 记忆没有用武之地。

## 2. 并行维度不同：按视角切，不是按文件切

我读了 OCR 的捆绑源码（`internal/agent/grouping.go`），它的分治是文件维度的：相关文件打成
bundle，每个 bundle 一个同质的子 agent。

pi 则是视角维度的：quality / security / performance
各自独立评审，再由 coordinator 仲裁——去重、severity 冲突取高、verdict 有降级链，任何 reviewer 缺席就强制 CANNOT MERGE（fail-closed）。同样一个问题，在三个视角下被独立地看三遍，再由仲裁层收敛。

> 订正：在之前的描述里，我说 OCR 是完全基于规则的代码切分。从逻辑上也行不通。

OCR README 把 “Smart file bundling” 列在“确定性工程”名下，但代码里 review 路径的语义分组默认是一次真的 LLM 调用（文件数 ≥4 触发，prompt 让模型输出 JSON 分组），真正纯代码的是骨架：阈值判定、每组 ≤10 文件、token 预算、失败回退。设计本质是“LLM 提议、代码裁决”。

## 3. 缓存有效性

pi 出生就是为了修 opencode 的 `tokens_cache_read` 恒零 bug，所以逐 persona 的 input / cacheRead / cacheWrite / cost 进了每一条输出面：CI 步骤摘要、`GITHUB_OUTPUT`、JSON payload、stats 事件，成本表还能按模型覆写。上一轮基准实测：66M token 里 88% 走缓存价，三个 persona 共享同一份 diff，前缀缓存让“重复输入”在计费上几乎免费。

多 persona 架构最被诟病的是“同样的话说三遍”。正确记账下，重复的是缓存价 token，增量的是视角。

OCR 报 token 相对量（号称降到通用 agent 的 1/9），但没有把“每条 finding 多少钱”做成可观测面。

## 4. 拦截结果可见

pi 的两层 verifier（规则层查文件与行号、LLM 层拿 read+grep 核对意见正文）是 fail-open。在设计上，pi-review-agent 倾向于拿不准就保留，只对“确证错误”降级。被降级的 finding 连同理由渲染进 PR 折叠区，
用户能看到“我们拦掉了什么、为什么拦”。OCR 有类似的定位/反思模块，但拦截结果没做到这个可见程度。

评审 agent 的结论反正要人过目，把为什么拦写给人看，不算多余的设计。

## 对比

OCR 的护城河在“把评审做好”：规则引擎、文件捆绑、定位工程、两年生产数据打磨，基准分是它的主场。
pi 的护城河在“评审嵌入工作流的方式”：记忆续接、成本可见、视角可配。这些维度基准不考，但日常每天用得到。
