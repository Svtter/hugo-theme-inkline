---
categories:
- Coding
- AI
comments: 'true'
date: '2026-09-16 09:00:00+08:00'
series: ["AI 代码审查实践"]
weight: 10
description: OCR 和 pi-review-agent 用同一个模型、同一个裁判、同一批 152 个实例对跑：语义 F1 21.4% vs 8.4%——架构差距
  2.5 倍，而单位成本反过来 pi 便宜 2.9 倍。
draft: false
tags:
- pi-review-agent
- Open Code Review
- AACR-Bench
- Code Review
- Benchmark
title: 同模型对照：OCR 与 pi-review-agent 的架构差距值多少分
---

简单说：差距挺大，但 pi-review-agent 并非一无是处——它更便宜，review 也更快。

<!--more-->

> 本文由 zcode 协助跑实验。如果有问题，欢迎指正。
>
> 更新（2026-09-18）：zcode 已爆出安全事件/违法事件——静默上传全量 Git 历史，详见 [ferstar 的取证博客](https://blog.ferstar.org/posts/zcode-silent-workspace-snapshot-upload/)和[事件分析](https://mp.weixin.qq.com/s/LdXekkP-Yb2IQfoMV53uDw)。

[第一篇](/p/pi-review-agent-跑-aacr-bench/)跑完 AACR-Bench 后留了个尾巴：
pi-review-agent 8.1% 对 OCR 官方配 Deepseek-V4-Pro 的 17.9%，差距里混着模型档位和评测框架，没法回答“架构本身值多少分”。

> 后面 pi-review-agent 简称为 pi。

这篇文章里，我把 OCR 拉到和 pi 完全相同的条件下重跑——同一个模型（mimo-v2.5，同一个 LiteLLM 代理）、同一个语义裁判（mimo-v2.5-pro）、同一批实例（两家都有结果的 152 个，1167 条参考标注）。

## 不同 framework/benchmark 对照

| 指标 | OCR + mimo-v2.5 | pi + mimo-v2.5 | 倍差 |
|---|---|---|---|
| 生成意见数 | 748 | 751 | 打平 |
| 行号 Precision | 44.0% | 16.1% | 2.7× |
| 语义 Precision | 27.4% | 10.8% | 2.5× |
| 语义 Recall | 17.6% | 6.9% | 2.5× |
| **语义 F1** | **21.4%** | **8.4%** | **2.5×** |
| 行号 F1 | 34.4% | 12.6% | 2.7× |
| token（同集） | 329M | 45M | pi 省 7.3× |
| **每语义命中 token** | **1.60M** | **0.55M** | **pi 便宜 2.9×** |
| 平均单实例耗时 | 9.0 分钟 | **5.8 分钟** | pi 快 1.5× |

生成量打平是这张表最重要的控制变量：两家说的话一样多（748 对 751），
差距全部落在“命中质量”上。同模型、同裁判、同题、同话量——
**2.5 倍就是两个架构的纯粹差距**。

两行 Precision 的含义：行号 P 是“意见落进某条标注的 ±1 行范围内”的比例，
语义 P 是其中“内容和标注说的是同一个问题”的比例——后者是前者的子集。

## 三个发现

### 1. mimo-v2.5 表现比 deepseek-v4-pro 更好

OCR 配我们这个便宜模型拿到 21.4%，比它官方榜上配 Deepseek-V4-Pro 的 17.9% 还高（部分数据集失效，因此仅供参考）。规则引擎把高频缺陷模式硬编码、定位交给字符串匹配、LLM 只做剩下的语义推理——模型越便宜，这套确定性工程的杠杆越大。反过来，pi 这种 prompt 驱动的架构才吃模型：差距在弱模型上被放大。

### 2. 差距出在“找没找到”，不在“说没说对”

把语义 P 除以行号 P，就是“落对位置的意见里、说中问题”的比例：OCR 是 62%，pi 是 67%。这件事两家水平相当，pi 甚至略高。

而意见能落进标注范围的比例，pi 只有 16.1%，OCR 是 44.0%，差了近三倍。定位准不准、关注的缺陷类型对不对、以及 OCR 的规则库和这份标注出自同一家（天然“对题”），三者都压在这一步上，基准分不出各自占多少。对 pi 来说方向是明确的：补上确定性规则那层，“找到地方”和“说对话题”会一起受益。

### 3. 单位成本差异

每条有效命中，pi 便宜 2.9 倍、快 1.5 倍；OCR 准 2.5 倍。OCR 全程烧了 366M token，pi 只有 45M；两家的 token 都有约 9 成走前缀缓存价。

## 结论

这个系列到这里闭环：pi 的 8.4% 不是模型不够好，也不（主要）是输入不完整，是缺一层确定性工程。

好消息是方向从未如此具体——规则层可以从 OCR 的公开设计反推，bundling 的源码已经拆过，`related-context.ts` 的 import 图就是现成的分组器。在补上这层之前，pi 的叙事是“质量-成本曲线上的低成本点”：每条有效意见便宜 3 倍、快一半，会话级记忆和成本可观测是基准考不出的差异。

数据与代码：[实验记录全文](https://github.com/Svtter/aacr-bench/pull/1)。
