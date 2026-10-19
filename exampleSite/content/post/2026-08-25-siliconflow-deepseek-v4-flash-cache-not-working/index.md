---
categories:
- 工具
- LLM
comments: true
date: '2026-08-25 00:00:00+08:00'
series: ["DeepSeek 前缀缓存"]
weight: 2
description: 实测 SiliconFlow 的 DeepSeek-V4-Flash Prompt Cache：167/963/1843 token 全部
  cached=0，6683 token 命中 6656（99.6%）——缓存真实生效，但存在较高最小 token 阈值，短 prompt 永远按全价计费
draft: false
image: cover.jpg
hidden: false
tags:
- SiliconFlow
- DeepSeek
- Prompt Cache
- LiteLLM
- API
title: SiliconFlow 的 DeepSeek-V4-Flash 缓存：命中确认，但有最小 token 阈值
---

给 LiteLLM 接入 SiliconFlow 的 `deepseek-ai/DeepSeek-V4-Flash` 时，想验证它的缓存机制。SiliconFlow 模型页面标注了缓存命中价 **¥0.020/M Tokens**（输入全价 $0.13/M 的约 1/46），于是按 ¥0.020/M 换算成 `$0.0028/1M` 配进了 LiteLLM 的 `model_info.cache_read_input_token_cost`。配完想实测验证，结果第一轮测试得出了一个**错误的结论**，直到把 prompt 拉大到 6.6K tokens 才看到缓存真实命中。

## 更新（2026-09-01）：缓存价涨 15 倍，两条结论翻面

SiliconFlow 把 DeepSeek-V4-Flash 改成了峰谷分时（[价格页](https://siliconflow.cn/pricing)），本文写作时的 ¥0.94/¥2.02、缓存 ¥0.020 已作废；阈值实测本身不受影响。新价（per 1M tokens，北京时间）：

| 时段 | 窗口 | 输入 | 输出 | 缓存命中 |
|---|---|---|---|---|
| 旧价（本文写作时，已作废） | 固定价，无峰谷 | ¥0.94 | ¥2.02 | ¥0.020 |
| 峰段 | 00:00–02:00、08:00–24:00 | ¥3.00 | ¥9.00 | ¥0.30 |
| 谷段 | 每天仅 02:00–08:00（6 小时） | ¥1.50 | ¥4.50 | ¥0.15 |

影响两处：

1. 缓存命中价 ¥0.020 → ¥0.30（15 倍），LiteLLM 的 `cache_read_input_token_cost` 应改为 `4.2e-08`（≈$0.042/M，峰段），结论 3 里的 `2.8e-09` 作废
2. 官方峰段缓存命中 ¥0.10，只有 SiliconFlow 的 1/3，且没有 >2K token 的命中门槛——"长上下文场景 SiliconFlow 的缓存才有意义"翻面：要缓存折扣直接用官方，峰段 ¥3.17/¥9.50 也只比 SiliconFlow 贵 5% 上下，还更快更稳（见下文 TTFT 实测）

## 第一轮测试：得出错误结论

测试方法：完全相同的 prompt 连续请求多次，检查 `usage.prompt_tokens_details.cached_tokens` 和 `prompt_cache_hit_tokens`。

完整测试脚本（输入/输出速度 + 缓存命中三项，key 走环境变量）：[llm-benchmark.py](https://gist.github.com/Svtter/73dd4d40874d7c062427f706ca8cd442)

短 prompt（167 token，重复 4 次）：

```
run1: 25.65s cached=0
run2: 5.80s  cached=0
run3: 8.82s  cached=0
run4: 36.22s cached=0
```

长一点（963 token，重复 3 次）：

```
run1: cached=0  hit=0
run2: cached=0  hit=0
run3: cached=0  hit=0
```

直连 SiliconFlow 和经过 LiteLLM 网关两条路径结果一致，`cached_tokens` 恒为 0。当时据此得出"缓存不生效、页面标注是摆设"的结论——**这个结论是错的**，原因是测试 prompt 太小，根本没达到缓存的触发阈值。

## 为什么错了：缓存有最小 token 阈值

怀疑是阈值问题（很多平台的缓存要求最小前缀长度，比如 OpenAI 1024、Gemini 2048），于是逐步加大 prompt：

| prompt tokens | cached | 命中率 |
|---|---|---|
| 167 | 0 | 0% |
| 963 | 0 | 0% |
| 1843 | 0 | 0% |
| **6683** | **6656** | **99.6%** |

6683 token 的 prompt 连续多次验证，缓存稳定命中（cached=6656，hit=6656），与 DeepSeek 官方 API 的 `prompt_cache_hit_tokens` 字段表现一致。

所以 SiliconFlow 的 V4-Flash 缓存**真实存在且工作正常**，只是触发阈值比常见平台更高（实测至少 >1843 token，具体阈值未公开，推测 2K 量级）。这正好解释了一个现象：为什么"短对话永远感受不到缓存"——日常聊天式请求（几百 token）远达不到阈值，只有长上下文场景（文档问答、代码库分析、长 system prompt）才能命中。

## 顺带发现：SiliconFlow 的 V4-Flash 响应波动极大

测试过程中还注意到，SiliconFlow 的 V4-Flash 响应时间波动非常大：同一请求的 TTFT 从 9 秒到 104 秒不等，还出现过 503 Service Unavailable。即使缓存命中，TTFT 也没有明显改善（命中时 9.6s vs 未命中时可能 12s/40s/55s）。与 DeepSeek 官方 API 命中缓存后 TTFT 大幅下降的表现不同。

## 结论

1. **SiliconFlow 的 DeepSeek-V4-Flash 缓存是有效的**，`cached_tokens`/`prompt_cache_hit_tokens` 字段正常返回命中值（6683 token 命中 6656）
2. **但触发阈值很高**（实测 1843 不命中、6683 命中），短 prompt 永远按全价计费——这正是它页面标注 ¥0.020/M 缓存价但实际很少命中的原因
3. LiteLLM 里配 `cache_read_input_token_cost: 2.8e-09`（≈¥0.02/M）是正确的，长上下文请求命中后计费会正确落到缓存价

## 对使用者的建议

1. **验证缓存要用大 prompt**（≥4K tokens），几百 token 的测试测不出来，反而会得出错误结论
2. 短对话场景（几百 token/请求）在 SiliconFlow 上**享受不到缓存折扣**，价格敏感场景优先 DeepSeek 官方 API
3. 长上下文场景（文档问答、批量 RAG）SiliconFlow 的缓存才有意义，且要先确认你的前缀是稳定的（前缀一变就全 miss）
4. SiliconFlow 当前 V4-Flash 服务稳定性一般（TTFT 波动大 + 偶发 503），对延迟敏感的应用需要重试和降级策略