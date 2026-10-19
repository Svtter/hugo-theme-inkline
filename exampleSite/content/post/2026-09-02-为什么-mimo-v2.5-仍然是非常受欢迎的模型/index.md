---
categories:
- AI
- 评测
comments: true
cover: /images/2026/09/02/mimo-v2.5-cover.jpg
date: '2026-09-02 00:00:00+08:00'
description: mimo-v2.5 在足够用、ZDR 隐私 posture 和 Token Plan 大用量之间取得了少见的平衡，至今仍是 code review
  这类高频轻量任务的首选。
draft: false
hidden: false
image: /images/2026/09/02/mimo-v2.5-cover.jpg
tags:
- MiMo
- DeepSeek
- Qwen
- LLM
- 性价比
- Code Review
- ZDR
title: 为什么 mimo-v2.5 仍然是非常受欢迎的模型？
---

过去一年新模型发布得像雨点，但是我仍然更加推荐 mimo-v2.5。

显然，mimo-v2.5 不是最强模型，甚至在不少榜单上已经算不上第一梯队。但是我想说，它在大多数真实工作负载里已经够用，而且把"够用的成本"压到了极低的位置。

> 之前 deepseek-v4-flash 其实也是这样。但现在涨价之后，已经明显在部分任务上不适配了。

<!--more-->

## "够用"比"最强"更值钱

日常开发里真正需要 frontier 模型硬啃的任务其实没那么多：复杂架构设计、跨文件大规模重构、深度数学/推理，这些才值得请出最强的模型。更多时候我们面对的是：

- 读一段代码并给出 review 意见
- 补单元测试、改命名、拆小函数
- 解释一个报错，给出修复建议
- 写简单的脚本、配置、文档片段

这些任务对模型的要求不是"天下第一"，而是**反应快、指令跟随稳、成本够低**。mimo-v2.5 恰好踩在这个甜区上。它的综合能力比不上 Claude Opus 5 或 Qwen 3.8 Max，但在中高难度的编码辅助上完全能给出可用结果。

当"够用"成为常态，"便宜且可预期"就成了更重要的决策因素。

## Token Plan：把用量变成不需要算计的资源

MiMo 的 Token Plan 是按月/年订阅的 Credits 套餐，从 Lite 到 Max 覆盖了轻量体验到高强度开发。最大的好处不是单价多低，而是**把 API 调用从"按量计费"变成"包月额度"**——你可以把 agent、code review、定时任务都接上去，而不用每次请求都心算一次花了多少钱。

对于 agent 编程和批量 code review 这种高频、长上下文、输出 token 不少的 workload，订阅制的心理成本和实际管理成本都比按量付费低很多。这也是为什么 MiMo 在 coding plan 类用户里粘性很高：买了额度，剩下的就是尽情用。

## ZDR 是另一个隐形加分项

在企业和个人开发者越来越在意数据隐私的当下，mimo-v2.5 还有一个被广泛提及的优势：**在部分第三方平台的模型隐私对照表中被记录为 0 天数据保留**。换句话说，prompt 和输出不会被供应商保留用于后续训练或审计之外的用途。

严格来说，小米官方并没有大张旗鼓地用"ZDR"这个词做营销，OpenRouter 等聚合平台对小米的 ZDR 标注也偏谨慎。但在 OpenCode 的模型隐私矩阵里，mimo-v2.5 和 mimo-v2.5-pro 的 Data retention 都被列为 0 天。对于把私有代码、内部文档喂给模型的开发者来说，这一点比跑分更重要。

> 如果你把数据合规当作硬性约束，建议直接核对小米官方隐私政策和你的服务商路由配置，不要只依赖第三方表格。

## 典型场景：code review

code review 是 mimo-v2.5 最舒服的战场之一：

- 输入是一段 diff 或完整函数，上下文通常几百到几千 token；
- 输出是评审意见，不需要长篇大论；
- 对模型的要求是"看得懂、说得准"，而不是"写出诺贝尔论文"。

用 mimo-v2.5 跑 review，单次成本低、响应快，配合 Token Plan 几乎可以做到" review 自由"。这也是为什么很多 agent 工具把它设为默认 review 模型——反正够用，何必用更贵的？

## 价格对比：mimo-v2.5 vs deepseek-v4-flash vs qwen-3.8-flash

![三家模型价格对比抽象插图](/images/2026/09/02/mimo-v2.5-pricing.jpg)

下面把三家主流轻量/次旗舰模型的官方价放在一起。MiMo 和 DeepSeek 官方以美元标价，Qwen 3.8 Flash 官方以人民币标价；人民币栏按 7.2 汇率换算，方便横向比较。

### 美元官方价（per 1M tokens）

| 模型 | Input | Cache Hit | Output | 官方来源 |
|---|---|---|---|---|
| **MiMo-V2.5** | $0.14 | $0.0028 | $0.28 | [MiMo Pay-as-you-go](https://mimo.mi.com/docs/price/pay-as-you-go) |
| **DeepSeek-V4-Flash** | $0.22 | $0.007 | $0.66 | [AI Pricing Guru](https://www.aipricing.guru/deepseek-pricing/) |
| **Qwen3.8-Flash** | $0.15 | $0.016 | $0.47 | 国际站参考价 |

### 人民币估算价（per 1M tokens，按 ¥1 = $7.2）

| 模型 | Input | Cache Hit | Output |
|---|---|---|---|
| **MiMo-V2.5** | ≈ ¥1.0 | ≈ ¥0.02 | ≈ ¥2.0 |
| **DeepSeek-V4-Flash** | ≈ ¥1.6 | ≈ ¥0.05 | ≈ ¥4.8 |
| **Qwen3.8-Flash** | ¥0.8 | ¥0.1 | ¥2.7 |

几个值得注意的点：

1. **MiMo-V2.5 的输出价最低**：¥2.0/M 的输出 token 比 DeepSeek-V4-Flash 的 ¥4.8 便宜一半还多，对输出量大的 review、agent 对话非常友好。
2. **DeepSeek-V4-Flash 的缓存命中价极低**：$0.007/M（≈ ¥0.05）几乎白送，但前提是前缀重复度高；如果缓存命中率低，实际成本会明显高于 MiMo。
3. **Qwen3.8-Flash 输入价更便宜**，但输出价比 MiMo-V2.5 贵 ¥0.7/M（¥2.7 vs ≈ ¥2.0）。对于输出 token 占比较高的 workload，这个差距会拉低它的综合成本优势。

## qwen-3.8-flash：很有力的挑战者

Qwen 3.8 Flash 确实是有力的竞争者。它在多个评测里表现出了接近更大模型的能力，输入价压到了 ¥0.8/M，对长输入场景（比如一次性塞整段日志、长文档）非常有吸引力。

但如果你主要跑的是 code review、agent 自动修复这类**输出 token 不少**的任务，Qwen 3.8 Flash 的输出价 ¥2.7/M 仍然比 MiMo-V2.5 高出约 ¥0.7/M。乘以每天的调用次数，这个差距会累积成可观的成本差异。

所以选择模型时还是要回到具体 workload：

- **输入重、输出轻**（总结长文、检索问答）：Qwen 3.8 Flash 可能更划算。
- **输入输出都频繁，尤其是输出不少**（code review、agent 迭代）：MiMo-V2.5 的成本结构更占优。
- **追求绝对推理/代码能力上限**：DeepSeek-V4-Flash 或更强的 frontier 模型更合适，但要接受更高的输出成本。

## 结论

mimo-v2.5 受欢迎，不是因为它最强，而是因为它把"够用"这件事做到了极致的性价比。配合 Token Plan 的大额度和被多方记录为 0 天保留的隐私 posture，它成了 code review、agent 辅助、定时任务这类高频轻量 workload 的默认选择。

Qwen 3.8 Flash 正在快速逼近，输入价甚至更低；但在输出成本上，它仍比 MiMo-V2.5 贵 ¥0.7/M。只要你的 workload 仍然以"给点输入、拿回一段可用输出"为主，mimo-v2.5 就还会继续稳在首选列表里。