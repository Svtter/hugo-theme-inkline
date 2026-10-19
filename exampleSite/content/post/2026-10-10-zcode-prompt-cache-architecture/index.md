---
categories:
- AI
- 架构
cover: /images/2026/10/10/zcode-prompt-cache-cover.svg
date: '2026-10-10T12:39:00+08:00'
description: "反编译 ZCode 后发现,它把 system prompt 拆成 9 个带 cacheHint/injectionTarget 元数据的注入块,按缓存边界分桶成三条 system message,每条都打 ephemeral 断点,靠最长前缀匹配保住稳定段缓存。对照 oh-my-pi 修复前后的演进,拆解两边的实际实现与取舍。"
image: /images/2026/10/10/zcode-prompt-cache-cover.svg
tags:
- ZCode
- oh-my-pi
- Agent Harness
- Prompt Caching
- 逆向分析
- LLM
title: ZCode 的 Prompt 缓存架构,以及它和 oh-my-pi 的殊途同归
---

> **安全事件/违法事件提示（2026-09-18）**：ZCode 被曝静默上传用户全量 Git 历史——客户端会将工作区快照（含完整 `.git` 历史）打包加密后上传至云端 OSS，本地不留解密密钥；设置里的"仓库快照索引"开关不在采集路径上，实际上无法关闭。详见 [ferstar 的取证博客](https://blog.ferstar.org/posts/zcode-silent-workspace-snapshot-upload/)和[老冯的独立复现分析](https://mp.weixin.qq.com/s/LdXekkP-Yb2IQfoMV53uDw)。**事件期间建议停用 ZCode，或至少锁死 `~/.zcode/v2/checkpoints/` 目录（macOS `chflags uchg`，Linux `chattr +i`），并轮换 Git 历史中出现过的所有凭据。**
>
> **后续（2026-09-21）**：智谱已将 ZCode 以 Apache 2.0 协议开源（[zai-org/ZCode](https://github.com/zai-org/ZCode)），v3.14.0 删除 Repo Wiki 并切断本地仓库快照的生成与上传链路，中国信通院与绿盟科技核查确认涉事 OSS bucket 数据已删除。
>
> **关于本文**：这是存货——初稿写于 2026-08-02，基于反编译闭源 bundle（3.3.5 / 3.3.6），成文早于开源。现在源码已公开，文中的 `ContextBuilder` / `assembleSystemMessages` 等结论可以直接对照仓库核验。

## 背景:为什么要反编译一个 agent harness

最近在用 ZCode(智谱出的 AI 编程 agent,Electron 桌面应用形态)。用多了会好奇一个问题:**它在"驱动模型"这件事上,和市面上其他 agent harness(claude-code、oh-my-pi、codex)到底有什么不一样?**

很多 harness 是"套壳"——把上游 claude-code 包一层 UI 就完事。但反编译后我发现 ZCode 不是。它的核心是一个 9.2MB 的 minified bundle(Linux 3.3.5 / 3.3.6 deb 包实测,Windows 安装下大小可能不同):

```
C:\Users\<user>\AppData\Local\Programs\ZCode\resources\glm\zcode.cjs
```

把它和上游 claude-code 的 `cli.js`(2.0.28,实测 9.9MB)做关键词交叉对比,结论很清晰:

| 关键词 | zcode.cjs | claude-code cli.js (2.0.28) |
|---|---|---|
| `injectionTarget` | 34 处 | **0** |
| `cacheHint` | 26 处 | **0** |
| `ContextBuilder` | 13 处 | **0** |
| `"You are ZCode..."` | 有 | 无 |

(两个 ZCode 版本的计数一致。)

ZCode 把 claude-code / codex / gemini-cli / opencode 当作**可选的底层 runtime**(app.asar 里有 `bundled-agents/<plat>-<arch>` 的路径拼接和 `claude / opencode / gemini / codex / glm` 的 runtime 枚举;Linux 包里并没有 manifest.json 这个文件,结构都在 asar 内),但 harness 本体——prompt 组装、工具调度、权限、hooks、skills、上下文压缩——是**从零自研**的。

在所有自研设计里,最让我眼前一亮、也最经得起推敲的一点是:**它的 system prompt 不是拼出来的,而是按"缓存边界"组装出来的。**

<!--more-->

## 先讲清楚:Anthropic 的 prompt cache 怎么计费

要理解这套架构为什么有用,得先对齐 prompt cache 的工作原理。

Anthropic 的 prompt cache 按**前缀**计费,而且是以断点为单位**分段**的:你在请求里打一个 `cache_control: { type: "ephemeral" }` 断点,从请求开头到这个断点为止的内容就构成一段可缓存的嵌套前缀。一个请求最多可以打 **4 个断点**,也就是 4 层逐级嵌套的前缀。

下次请求时,系统按**最长前缀匹配**:逐字节比对,找到最长的那段仍然一字不差的已缓存前缀,命中部分按约 **10%** 的 input 价格计费(默认 TTL 5 分钟;另有 1 小时档,是较新的 cache_control 类型,读价约 20%,和 5 分钟档不同价)。

关键规则是:**从第一处字节分歧开始,之后的断点全部 miss,之前的断点照常命中。**

所以如果整个请求只在最末尾打一个断点,那么断点之前任何一处变化——哪怕只是一个日期字段——都会让这唯一的断点 miss,整段前缀全价重算。反过来,把稳定内容和易变内容用多个断点隔开,"变的部分"就只会废掉它后面的断点。

缓存优化的核心问题始终是:

> "稳定不变的内容"和"每轮都变的内容",在请求里是怎么排布的?断点打在哪?

(还有个小约束:缓存段有最小可缓存长度(5 分钟档约 1024 token),太短的段单独打断点不会真的被缓存——后文会看到 ZCode 的第一段就踩在这条线上。)

## oh-my-pi 的做法:模板拼接,断点甩给线路层

作为对照,先看 oh-my-pi(`@oh-my-pi/pi-coding-agent`)是怎么做的。它有完整 TypeScript 源码,可以直接读(本文基于 2026-08-01 之前的版本阅读,下面会解释为什么这个时间点重要)。

它的 system prompt 组装在 `pi-coding-agent/src/system-prompt.ts` 的 `buildSystemPrompt()` 里,产出是 **3~4 个粗粒度的字符串块**:

```ts
const rendered = prompt.render(
  resolvedCustomPrompt ? customSystemPromptTemplate : systemPromptTemplate,
  data
);
const systemPrompt = [rendered];
if (toolNames.includes("computer")) {
  systemPrompt.push(computerSafetyPrompt.trim());
}
const projectPrompt = prompt.render(projectPromptTemplate, data).trim();
if (projectPrompt) systemPrompt.push(projectPrompt);
if (activeRepoContextPrompt) systemPrompt.push(activeRepoContextPrompt);
return { systemPrompt };
```

排布大致是:

```
[ main 模板 ]          ← 身份 + 规则 + 工具列表 + skills
[ computer-safety ]    ← 仅当用 computer 工具
[ project-footer ]     ← 工作站信息 + 上下文文件 + 工作区树(含 cwd / 日期等易变字段)
[ active-repo ]        ← 仓库上下文(git 分支 / 状态)
```

内容排布本身是缓存友好的:身份和规则这类稳定内容都在 main 模板里,每轮都变的 cwd / git / 日期被推到了后面的 footer 块。真正会改动 main 模板的动态内容只有 skills 列表(以及规则、工具清单的变化)。

问题出在**断点位置**。缓存控制被整个甩给了 provider 线路层:在 `pi-ai/src/providers/anthropic.ts` 里(下面是修复前行为的简化示意,合并了 `applyClaudeCodeSystemCache` / `applyCacheControlToLastBlock` 的逻辑):

```ts
for (const prompt of sanitizedPrompts) {
  blocks.push({ type: "text", text: prompt });
}
const lastIndex = blocks.length - 1;
if (cacheControl && lastIndex >= 0 && blocks[lastIndex].cache_control == null) {
  blocks[lastIndex] = {
    ...blocks[lastIndex],
    cache_control: cloneAnthropicCacheControl(cacheControl),
  };
}
```

整个 system prompt **只在最后一个块(active-repo)末尾打一个断点**。总共有 4 个断点配额,其余分给最近的 message turn。

这种排布的后果很直接:**唯一断点打在了所有易变内容之后。footer 里的 cwd、git 状态、日期只要有一处变了,从请求开头到这个断点的前缀就不再一字不差,整段缓存全部失效**——尽管 main 模板里几 K token 的身份 + 规则其实一个字都没变。

它本质上是"赌 system prompt 的尾部基本不变"。可惜在真实编程场景里,cwd、git 每轮都可能变——这个赌注经常输。

**oh-my-pi 后来也意识到了这一点,并且修得很快。** 2026-08-01,omp 落了 [`79a7f309a4`](https://github.com/can1357/oh-my-pi/commit/79a7f309a49a089d72ed462eab03ed23f0bbf283)("cache stable system prefix across cwd/date footer changes",修 [`#7324`](https://github.com/can1357/oh-my-pi/issues/7324))和 `1488be016d`,在稳定前缀(main 模板)末尾加了第二个断点;2026-09-03 又加了 `applyHeadCaching`,把断点锚定到最后一个稳定的 system 块上。**当前的 18.8.7 在 cwd / git / 日期变化时,同样能保住稳定前缀的缓存。**

所以下文的对比里,对照组是"oh-my-pi 修复前 / 修复后"两个版本——这恰好让对比更有意思:一边是 day-one 就把缓存边界做进架构的自研设计,一边是靠补丁快速收敛的开源实现。

## ZCode 的做法:语义级 stable/dynamic 分段

ZCode 的做法完全不同。它把 system prompt 拆成 **9 个带元数据的离散注入块(section)**,每个 section 标注两个属性:

- **`injectionTarget`**:`"system"`(塞进 system message)或 `"meta_user"`(塞进 user message 的附加内容)
- **`cacheHint`**:`"stable"`(基本不变)或 `"dynamic"`(每轮可能变)

这 9 个 section 是:

| section | source | target | cacheHint | 内容 |
|---|---|---|---|---|
| CLI Prefix | `cli_prefix` | system | stable | 短身份串 "You are ZCode, an interactive coding agent" |
| Agent Identity | `identity` | system | stable | 长身份 prompt(`buildIdentityPrompt` 输出,含整段 `# Harness` 规则) |
| Custom System Prompt | `custom_system_prompt` | system | stable | 用户自定义 prompt |
| Environment Info | `env_info` | system | dynamic | cwd / 是否 git / platform / shell / 模型名 |
| System Context | `system_context` | system | dynamic | git 分支 / 主分支 / git 用户 / git 状态 |
| Skills | `skills` | meta_user | dynamic | 可用 skill 列表 |
| Request User Context | `request_user_context` | meta_user | dynamic | CLAUDE.md 等用户指令 |
| Memory | `memory` | system | dynamic | 记忆注入 |
| Current Date | `current_date` | meta_user | dynamic | 当前日期 |

每个 section 的构造都很规整,长这样(从 bundle 里还原):

```js
function buildIdentitySection(e, t = true) {
  let r = buildIdentityPrompt(e, t);
  return {
    name: "Agent Identity",
    source: "identity",
    injectionTarget: "system",
    cacheHint: "stable",   // ← 关键:标注为稳定
    chars: r.length,
    tokens: countTokens(r),
    content: r,
  };
}
```

而 identity 段的实际内容(`buildIdentityPrompt` 的输出)就是你现在看到的 Harness 指令——注意它和 cli_prefix 里那句短身份串是两段不同的内容:

```
You are an interactive ZCode agent that helps users with software engineering tasks.

# Harness
- Text you output outside of tool use is displayed to the user as Github-flavored markdown in a terminal.
- Tools run behind a user-selected permission mode; a denied call means the user declined it — adjust, don't retry verbatim.
- `<system-reminder>` tags in messages and tool results are injected by the harness, not the user.
- Prefer the dedicated file/search tools over shell commands when one fits.
- Reference code as `file_path:line_number` — it's clickable.
...
```

## 关键魔法:三桶分段,断点全打

光拆成 section 还不够,真正值钱的是 `ContextBuilder.assembleSystemMessages()` 的组装逻辑。它把 `injectionTarget === "system"` 的 6 个 section 按 `cacheHint` **分桶成三条独立的 system message**,并且**每一条都打 cacheControl 断点**(bundle 里是同一个常量,`Hbe = { type: "ephemeral" }`):

```js
assembleSystemMessages(t) {
  let r = [];

  // 桶 1:cli_prefix 单独成段(最稳定的前缀)
  let o = joinSections(t.filter(
    s => s.injectionTarget === "system" && s.source === "cli_prefix"
  ));
  o && r.push({ role: "system", content: o, cacheControl: ENABLED });

  // 桶 2:其余所有 stable section 一起(身份 + 规则 + 自定义)
  let n = joinSections(t.filter(
    s => s.injectionTarget === "system"
        && s.cacheHint === "stable"
        && s.source !== "cli_prefix"
  ));
  n && r.push({ role: "system", content: n, cacheControl: ENABLED });

  // 桶 3:所有 dynamic section 一起(环境 / git / memory)
  //      ← 同样打断点
  let i = joinSections(t.filter(
    s => s.injectionTarget === "system" && s.cacheHint === "dynamic"
  ));
  i && r.push({ role: "system", content: i, cacheControl: ENABLED });

  return r;
}
```

(`joinSections` / `ENABLED` 是还原时起的名字:前者拼接 section 内容,后者对应 `{ type: "ephemeral" }` 断点。`cacheControl` 在这里是 ZCode 内部的 message 级表示,发送前会被转成 `providerOptions.anthropic.cacheControl`,最终落到对应 content block 的 `cache_control` 上——也就是 Anthropic API 的真实语义,断点真实生效。)

最终发给 API 的请求结构是这样的:

```
system message #1:  cli_prefix(短身份串)                ← cache_control ✓
system message #2:  identity + custom_system_prompt      ← cache_control ✓
system message #3:  env_info + system_context + memory   ← cache_control ✓
─────────────────────────────────────────────────────────
user message #1:    [meta_user: skills + request_user_context + current_date]
                    + 用户实际输入
tool / assistant messages...
```

<svg viewBox="0 0 800 420" width="100%" style="max-width:800px;height:auto;display:block;margin:1.5rem auto;" role="img" aria-label="ZCode 三桶分段请求结构:三条 system message 按稳定度递减排列,每条末尾都打 cache_control 断点;user message 内含 meta_user 三段与用户输入;单请求 4 个断点配额,system 占 3">
  <text x="40" y="38" font-size="17" font-weight="700" fill="currentColor">ZCode 请求结构:三桶分段,断点全打</text>
  <rect x="584" y="20" width="176" height="26" rx="13" fill="#8B5CF6" fill-opacity="0.12" stroke="#8B5CF6" stroke-opacity="0.45"/>
  <text x="672" y="37" text-anchor="middle" font-size="12.5" fill="#8B5CF6">4 断点配额 · system 占 3</text>
  <line x1="48" y1="84" x2="48" y2="374" stroke="currentColor" stroke-opacity="0.35"/>
  <polygon points="48,382 43,370 53,370" fill="currentColor" fill-opacity="0.35"/>
  <text x="66" y="229" transform="rotate(90 66 229)" text-anchor="middle" font-size="13" fill="currentColor" fill-opacity="0.55">稳定度递减 →</text>
  <rect x="96" y="76" width="524" height="46" rx="8" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
  <rect x="112" y="89" width="58" height="20" rx="10" fill="#14B8A6" fill-opacity="0.12" stroke="#14B8A6" stroke-opacity="0.5"/>
  <text x="141" y="103" text-anchor="middle" font-size="12" fill="#14B8A6">stable</text>
  <text x="186" y="104" font-size="14" fill="currentColor"><tspan font-weight="700">system #1</tspan><tspan fill-opacity="0.75"> · cli_prefix(短身份串)</tspan></text>
  <g transform="translate(646 99)"><rect x="-8" y="-8" width="16" height="16" rx="2.5" transform="rotate(45)" fill="#F59E0B" fill-opacity="0.15" stroke="#F59E0B" stroke-opacity="0.8"/><polygon points="1.5,-6.5 -4.5,0.5 -1.2,0.5 -1.8,6.5 4.5,-0.5 1.2,-0.5" fill="#F59E0B"/></g>
  <text x="664" y="103" font-size="12" fill="#F59E0B">cache_control</text>
  <rect x="96" y="134" width="524" height="46" rx="8" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
  <rect x="112" y="147" width="58" height="20" rx="10" fill="#14B8A6" fill-opacity="0.12" stroke="#14B8A6" stroke-opacity="0.5"/>
  <text x="141" y="161" text-anchor="middle" font-size="12" fill="#14B8A6">stable</text>
  <text x="186" y="162" font-size="14" fill="currentColor"><tspan font-weight="700">system #2</tspan><tspan fill-opacity="0.75"> · identity + custom_system_prompt</tspan></text>
  <g transform="translate(646 157)"><rect x="-8" y="-8" width="16" height="16" rx="2.5" transform="rotate(45)" fill="#F59E0B" fill-opacity="0.15" stroke="#F59E0B" stroke-opacity="0.8"/><polygon points="1.5,-6.5 -4.5,0.5 -1.2,0.5 -1.8,6.5 4.5,-0.5 1.2,-0.5" fill="#F59E0B"/></g>
  <text x="664" y="161" font-size="12" fill="#F59E0B">cache_control</text>
  <rect x="96" y="192" width="524" height="46" rx="8" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
  <rect x="112" y="205" width="64" height="20" rx="10" fill="#F59E0B" fill-opacity="0.12" stroke="#F59E0B" stroke-opacity="0.5"/>
  <text x="144" y="219" text-anchor="middle" font-size="12" fill="#F59E0B">dynamic</text>
  <text x="192" y="220" font-size="14" fill="currentColor"><tspan font-weight="700">system #3</tspan><tspan fill-opacity="0.75"> · env_info + system_context + memory</tspan></text>
  <g transform="translate(646 215)"><rect x="-8" y="-8" width="16" height="16" rx="2.5" transform="rotate(45)" fill="#F59E0B" fill-opacity="0.15" stroke="#F59E0B" stroke-opacity="0.8"/><polygon points="1.5,-6.5 -4.5,0.5 -1.2,0.5 -1.8,6.5 4.5,-0.5 1.2,-0.5" fill="#F59E0B"/></g>
  <text x="664" y="219" font-size="12" fill="#F59E0B">cache_control</text>
  <rect x="96" y="250" width="524" height="82" rx="8" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="112" y="271" font-size="13" font-weight="700" fill="currentColor">user message</text>
  <rect x="112" y="278" width="494" height="28" rx="6" fill="#8B5CF6" fill-opacity="0.08" stroke="#8B5CF6" stroke-opacity="0.4"/>
  <text x="122" y="296" font-size="12" fill="#8B5CF6">meta_user</text>
  <rect x="188" y="283" width="54" height="18" rx="9" fill="#8B5CF6" fill-opacity="0.14" stroke="#8B5CF6" stroke-opacity="0.45"/>
  <text x="215" y="296" text-anchor="middle" font-size="12" fill="#8B5CF6">skills</text>
  <rect x="250" y="283" width="148" height="18" rx="9" fill="#8B5CF6" fill-opacity="0.14" stroke="#8B5CF6" stroke-opacity="0.45"/>
  <text x="324" y="296" text-anchor="middle" font-size="12" fill="#8B5CF6">request_user_context</text>
  <rect x="406" y="283" width="96" height="18" rx="9" fill="#8B5CF6" fill-opacity="0.14" stroke="#8B5CF6" stroke-opacity="0.45"/>
  <text x="454" y="296" text-anchor="middle" font-size="12" fill="#8B5CF6">current_date</text>
  <text x="112" y="325" font-size="12.5" fill="#3B82F6">+ 用户实际输入</text>
  <rect x="96" y="346" width="524" height="34" rx="8" fill="currentColor" fill-opacity="0.03" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="5 4"/>
  <text x="112" y="368" font-size="12.5" fill="currentColor" fill-opacity="0.6">tool / assistant messages…(对话与工具轮次)</text>
  <text x="96" y="406" font-size="12" fill="currentColor" fill-opacity="0.6">stable = 基本不变 · dynamic = 每轮可能变 · 断点全打,交给最长前缀匹配</text>
</svg>

剩下三个 `injectionTarget: "meta_user"` 的 section 不进 system 段,而是作为附加内容拼进 user message——9 个 section 到此全部有了落点。

**核心思想:三条 system message 按"稳定度递减"排列,断点全打,把命运交给最长前缀匹配。** git 状态变了,只有 message #3 从分歧点开始作废,#1 / #2 的断点照常命中;环境连续几轮没变,#3 自己的断点也能命中;skills 列表变了,system 段一个字节都不动(它在 meta_user 里)。顺带一提:cli_prefix 那一段很短,单独看可能低于约 1024 token 的最小可缓存长度——好在第二段的断点把它整段覆盖,不影响大局。

## 同样的场景,修复前后的差距

把 oh-my-pi 修复前后的版本和 ZCode 放到同一个对比里:

<svg viewBox="0 0 800 400" width="100%" style="max-width:800px;height:auto;display:block;margin:1.5rem auto;" role="img" aria-label="唯一断点与多断点的命中对比:omp 修复前唯一断点打在最末尾,易变段一变整条前缀全量重算;ZCode 与 omp 修复后在稳定段末尾打断点,稳定段照常命中约一折价格,只废掉后面的断点">
  <text x="40" y="34" font-size="17" font-weight="700" fill="currentColor">唯一断点 vs 多断点:命中范围对比</text>
  <text x="40" y="66" font-size="14" font-weight="700" fill="currentColor">omp 修复前(单断点打在末尾)</text>
  <rect x="412" y="74" width="72" height="20" rx="10" fill="#EF4444" fill-opacity="0.12" stroke="#EF4444" stroke-opacity="0.5"/>
  <text x="448" y="88" text-anchor="middle" font-size="12" fill="#EF4444">变了 ✗</text>
  <rect x="40" y="98" width="290" height="48" rx="6" fill="#EF4444" fill-opacity="0.06" stroke="#EF4444" stroke-opacity="0.6"/>
  <text x="185" y="127" text-anchor="middle" font-size="12.5" fill="#EF4444">稳定段:identity + 规则</text>
  <line x1="116" y1="122" x2="254" y2="122" stroke="#EF4444" stroke-opacity="0.7"/>
  <rect x="358" y="98" width="180" height="48" rx="6" fill="#EF4444" fill-opacity="0.06" stroke="#EF4444" stroke-opacity="0.6"/>
  <text x="448" y="127" text-anchor="middle" font-size="12.5" fill="#EF4444">易变段:cwd / git / 日期</text>
  <line x1="374" y1="122" x2="522" y2="122" stroke="#EF4444" stroke-opacity="0.7"/>
  <line x1="46" y1="141" x2="534" y2="105" stroke="#EF4444" stroke-opacity="0.3"/>
  <g transform="translate(552 122)"><rect x="-8" y="-8" width="16" height="16" rx="2.5" transform="rotate(45)" fill="#EF4444" fill-opacity="0.15" stroke="#EF4444" stroke-opacity="0.8"/><polygon points="1.5,-6.5 -4.5,0.5 -1.2,0.5 -1.8,6.5 4.5,-0.5 1.2,-0.5" fill="#EF4444"/></g>
  <text x="568" y="126" font-size="12" fill="#EF4444">cache_control</text>
  <path d="M40 157 L40 164 L552 164 L552 157" fill="none" stroke="#EF4444" stroke-opacity="0.7"/>
  <text x="296" y="186" text-anchor="middle" font-size="13" font-weight="700" fill="#EF4444">全部 miss → 全量重算 💸</text>
  <line x1="60" y1="212" x2="200" y2="212" stroke="currentColor" stroke-opacity="0.2"/>
  <line x1="600" y1="212" x2="740" y2="212" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="400" y="216" text-anchor="middle" font-size="13" font-weight="700" fill="#3B82F6">「从第一处字节分歧开始,之后的断点全部 miss,之前的断点照常命中」</text>
  <text x="40" y="248" font-size="14" font-weight="700" fill="currentColor">ZCode / omp 修复后(稳定段末尾打断点)</text>
  <rect x="149" y="256" width="72" height="20" rx="10" fill="#22C55E" fill-opacity="0.12" stroke="#22C55E" stroke-opacity="0.5"/>
  <text x="185" y="270" text-anchor="middle" font-size="12" fill="#22C55E">没变 ✓</text>
  <rect x="412" y="256" width="72" height="20" rx="10" fill="#EF4444" fill-opacity="0.12" stroke="#EF4444" stroke-opacity="0.5"/>
  <text x="448" y="270" text-anchor="middle" font-size="12" fill="#EF4444">变了 ✗</text>
  <rect x="40" y="282" width="290" height="48" rx="6" fill="#22C55E" fill-opacity="0.07" stroke="#22C55E" stroke-opacity="0.6"/>
  <text x="185" y="311" text-anchor="middle" font-size="12.5" fill="#22C55E">稳定段:identity + 规则</text>
  <g transform="translate(344 306)"><rect x="-8" y="-8" width="16" height="16" rx="2.5" transform="rotate(45)" fill="#22C55E" fill-opacity="0.15" stroke="#22C55E" stroke-opacity="0.8"/><polygon points="1.5,-6.5 -4.5,0.5 -1.2,0.5 -1.8,6.5 4.5,-0.5 1.2,-0.5" fill="#22C55E"/></g>
  <rect x="358" y="282" width="180" height="48" rx="6" fill="#EF4444" fill-opacity="0.06" stroke="#EF4444" stroke-opacity="0.6"/>
  <text x="448" y="311" text-anchor="middle" font-size="12.5" fill="#EF4444">易变段:cwd / git / 日期</text>
  <line x1="364" y1="325" x2="532" y2="289" stroke="#EF4444" stroke-opacity="0.3"/>
  <g transform="translate(552 306)" opacity="0.55"><rect x="-8" y="-8" width="16" height="16" rx="2.5" transform="rotate(45)" fill="#EF4444" fill-opacity="0.15" stroke="#EF4444" stroke-opacity="0.8"/><polygon points="1.5,-6.5 -4.5,0.5 -1.2,0.5 -1.8,6.5 4.5,-0.5 1.2,-0.5" fill="#EF4444"/></g>
  <path d="M40 345 L40 352 L330 352 L330 345" fill="none" stroke="#22C55E" stroke-opacity="0.7"/>
  <text x="185" y="372" text-anchor="middle" font-size="13" font-weight="700" fill="#22C55E">命中 ✓ · 按 ~10% 价格计费</text>
  <text x="448" y="372" text-anchor="middle" font-size="13" font-weight="700" fill="#EF4444">易变段起全部 miss → 只废掉后面的断点</text>
  <text x="40" y="394" font-size="12" fill="currentColor" fill-opacity="0.6">命中范围由最长前缀匹配逐字节判定</text>
</svg>

| 变化场景 | omp 修复前(17.2.4) | omp 当前(18.8.7) | ZCode(3.3.6) |
|---|---|---|---|
| 用户改了 cwd | ❌ 唯一断点前已变,全失效 | ✅ 稳定前缀断点命中 | ✅ #1 / #2 断点命中 |
| git 状态变了(几乎每轮) | ❌ 全失效 | ✅ | ✅ |
| 跨天(date 变了) | ❌ 全失效 | ✅ | ✅ |
| skills 列表变 | ❌ 全失效 | ❌ skills 渲染进 main 模板,稳定前缀失效 | ✅ skills 在 meta_user,system 段不动 |
| 纯对话推进(啥都没变) | ✅ 全命中 | ✅ | ✅ |

保住的"身份 + 规则"段往往有几 K token——Harness 指令、安全策略、工具说明,每轮省下来的是实打实的钱和延迟。修好断点位置之后,oh-my-pi 在环境类变化上已经和 ZCode 打平;ZCode 仍然占优的是 skills 这类场景,以及一个更根本的区别:ZCode 的"哪段内容属于哪个缓存桶"是 section 元数据里声明好的,边界和内容写在一起;omp 的断点锚定在线路层,"哪些块算稳定"的判断维护在离内容更远的地方。

## 这套架构不是没代价

为了不变成单方面吹捧,得说清楚 ZCode 这套设计的成本:

**1. 实现复杂度上去了。** 要给每个 section 打元数据(`source` / `injectionTarget` / `cacheHint`),写一个 `ContextBuilder` 维护这些 section,再写分桶组装逻辑。相比 oh-my-pi 的"一个 Handlebars 模板 + join",工程量明显更大。

**2. 依赖 provider 支持"多 system message + 多断点"。** 这套分段只有 Anthropic 风格的 API(支持多个 system block、每个都能打 `cache_control`)才吃得满。一旦换到只支持单条 system message 的 OpenAI 兼容端点,stable/dynamic 分段就退化成普通拼接,架构优势消失。而且单请求 4 个断点配额,system 段就固定占掉 3 个,给 message 历史留的余量更小。ZCode 的 model provider 配置里确实专门标了 `kind: "anthropic"`:

```json
{
  "provider": {
    "builtin:bigmodel": {
      "name": "Bigmodel",
      "kind": "anthropic",
      "options": {
        "baseURL": "https://open.bigmodel.cn/api/anthropic"
      }
    }
  }
}
```

这侧面印证了:这套架构是为 Anthropic 兼容端点量身定做的。

**3. 缓存省的钱有上限。** 身份 + 规则段大概几 K token,而一个长会话的 message history 可能有几十 K 到上百 K。ZCode 保住的是 system 段的缓存,message 段两边都得重新缓存推进。所以它对总成本的影响是"system 部分更稳",**不是"整体翻天覆地"**——在长会话里占比有限,在频繁开新会话 / 短会话的场景下收益最明显。

**4. oh-my-pi 也一直在管缓存,而且追得很快。** 它的内容排布从一开始就是缓存友好的(稳定内容在前,易变字段在 footer),2026-08-01 修断点位置、9 月再加 `applyHeadCaching`,两次小改动就补齐了差距——这是"模板拼接 + 线路层补丁"架构的迭代速度优势。ZCode 这套设计换来的不是"对手做不到"的护城河,而是 day-one 的结构性保证和更细的分段粒度。

## 一个更深的观察:两种 harness 哲学

扒完两边代码,我觉得这不止是"谁缓存做得好"的技术差异,而是两种 harness 设计哲学的缩影:

- **oh-my-pi:模板驱动 + 按需加载。** 用一堆 `.md` 模板 + Handlebars 渲染,功能面铺得极广(autolearn / autoresearch / hindsight / dap 调试 / live / irc / stt / tts / vibe / lsp / collab),skill 用 `skill://` URL 协议让模型按需拉取而非预注入。它的哲学是**功能丰富、灵活、按需**,缓存交给线路层兜底。

- **ZCode:工程优化 + 精确控制。** 功能面不比 oh-my-pi 多,但在每个关键路径(prompt 组装、上下文压缩的两阶段防抖、权限的 5 模式 + 风险分级)都做了精细的工程优化。它的哲学是**在少数关键点上做到极致**。

这两种没有绝对的高下。oh-my-pi 的方式更适合"一个 harness 适配多种 provider、功能要全"的场景;ZCode 的方式更适合"锁定单一 provider 生态、把单点优化榨干"的场景。

单看"prompt 缓存利用率"这一项,修复后的双方已经殊途同归。差异在过程:ZCode 把缓存边界当成架构原语,day-one 就有结构性保证(连 skills 都被挪出了 system 段);oh-my-pi 在问题暴露后,用线路层的最小改动收敛到了近似效果。如果你在做锁定 Anthropic 兼容端点的 harness,前者值得抄;如果你的 harness 要适配多种 provider,后者的演进路径可能更务实。

## 附:证据链与复现方法

本文所有结论都基于真实代码,可复现:

- **ZCode bundle**:ZCode 3.3.5 / 3.3.6(Linux deb 包)`resources/glm/zcode.cjs`,实测 9.2MB(Windows 安装包大小可能不同)。关键词 `ContextBuilder` / `cacheHint` / `injectionTarget` / `assembleSystemMessages` 可定位核心逻辑;关键词计数用 `grep -o <关键词> zcode.cjs | wc -l` 统计,两个版本结果一致。文中代码块是去混淆后的简化还原,变量名(如 `joinSections` / `ENABLED`)为还原时所起,可能与实际实现存在出入。
- **oh-my-pi 源码**:基于修复前的版本(约 17.2.4,2026-08-01 之前)阅读,涉及文件 `pi-coding-agent/src/system-prompt.ts`(`buildSystemPrompt`)、`pi-ai/src/providers/anthropic.ts`(`buildAnthropicSystemBlocks` / `applyPromptCaching`)。修复及后续演进的锚点:`79a7f309a4` + `1488be016d`(2026-08-01,稳定前缀末尾加第二断点)、`applyHeadCaching`(2026-09-03,锚定最后一个稳定 system 块);omp 几乎每日迭代,当前 18.8.7 的行为已实机核对。
- **交叉验证**:`injectionTarget` / `cacheHint` / `ContextBuilder` 三个关键词在 claude-code 2.0.28 的 `cli.js`(实测 9.9MB)里均为 0 处出现,证实这是 ZCode 自研设计而非继承自上游。
- **计费事实**(5 分钟档读价 0.1x、1 小时档读价 0.2x、4 断点配额、约 1024 token 最小可缓存长度)对照 Anthropic 官方 prompt caching 文档核对过;omp 侧 `ANTHROPIC_MAX_BREAKPOINTS = 4`。

修订记录:初稿写于 2026-08-02,所引 oh-my-pi 源码阅读于其 2026-08-01 断点修复落地之前(约 17.2.4);2026-10-10 依据实测逐条复核后修订(补齐该修复与 2026-09-03 `applyHeadCaching` 的后续核对,并改正两处机制表述),发布日期以修订日为准;2026-10-13 发布时补充文首安全事件提示与 ZCode 开源后续。

一个提醒:ZCode 的 bundle 是 minified 的,变量名会被混淆(比如 `Q6n` = CLI Prefix 的内容变量,`Hbe` = ephemeral 断点常量),但字符串常量和对象结构(`name` / `source` / `injectionTarget` / `cacheHint`)是保留的,靠这些可以精确定位每一段逻辑。
