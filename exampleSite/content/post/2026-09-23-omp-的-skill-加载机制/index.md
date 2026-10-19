---
categories:
- Coding
- AI
comments: 'true'
date: '2026-09-23 10:00:00+08:00'
series: ["AI 代码审查实践"]
weight: 11
description: 把一次关于 oh-my-pi (omp) skill 机制的问答整理成文：发现（discovery）是会话创建时的确定性代码，触发（正文进上下文）依赖模型读 description 自行判断；外加 autoloadSkills 预载、子代理目录继承、reviewer 预载为零的本机核对。
cover: /images/2026/09/23/omp-skill-loading-cover.jpg
image: /images/2026/09/23/omp-skill-loading-cover.jpg
tags:
- oh-my-pi
- omp
- skill
- coding-agent
- Agent
title: omp 的 skill 是怎么被加载的：发现靠代码，触发靠模型
---

我的 omp（oh-my-pi）里现在装了一百多个 skill。某天在会话里顺手问了一句：「omp 是怎么判断一个 skill 是否被加载的？还是说完全依赖模型实现？」

这个问题背后是一组更具体的问题：skill 从磁盘到模型上下文，中间经过几步？每一步是代码在决定，还是模型在决定？如果模型跳过了该读的 skill，会发生什么？

这篇文章把当时的问答整理成一篇完整记录。结论都对照两处来源核对过：omp 的内置文档（`skills.md`、`rulebook-matching-pipeline.md`、`task-agent-discovery.md`），以及本机安装的 `@oh-my-pi/pi-coding-agent@18.2.7` 的实际代码和 bundled agent 定义文件。

<!--more-->

## skill 在 omp 里是什么

一个 skill 是一个目录，目录里放一个 `SKILL.md`：

```text
<skills-root>/<skill-name>/SKILL.md
```

`SKILL.md` 的 frontmatter 支持这些字段：`name`、`description`、`globs`、`alwaysApply`、`hide`、`disableModelInvocation`。对运行时真正要紧的是 `name` 和 `description`；文档里专门补了一句 "matching quality depends on `description` being meaningful"——这句话的分量要到第三节才显出来。

skill 的来源有多个 provider：omp 自己的 `.omp` 目录、Claude Code / Codex / Agents / OpenCode 各自的布局、GitHub 的 `.github/skills/`、插件，以及 omp 自动学习的 managed skills。多来源意味着重名，重名意味着需要优先级——这已经是「发现」阶段的事了。

## 发现阶段：纯代码，模型不参与

`loadSkills()`（`packages/coding-agent/src/extensibility/skills.ts`）在会话创建时跑三趟扫描：

1. capability providers（managed/auto-learn 除外）
2. `skills.customDirectories` 自定义目录
3. omp-managed（auto-learn）skill，永远最后解析，同名时让位于任何手写的 skill

provider 有明确优先级，数字大的先来：

| 优先级 | provider | 位置 |
|---|---|---|
| 100 | native | `.omp` 用户/项目目录 |
| 90 | omp-plugins | 扩展包与已安装插件 |
| 80 | claude | Claude 布局 |
| 70 | claude-plugins / agents / codex | 三者同优先级，按注册顺序 |
| 55 | opencode | |
| 30 | github | `.github/skills/`（仅项目级） |
| 5 | omp-managed | `~/.omp/agent/managed-skills` |

去重按 `name` 精确匹配，同名第一个胜出；此外还有按 `realpath` 的去重（防 symlink 重复）和重名告警。之后过四道过滤：`disabledExtensions`、source 开关、`ignoredSkills`、`includeSkills`。

这一趟里没有任何语义判断。唯一和「内容质量」沾边的检查是 `requireDescription`：部分 provider 要求 `description` 字段必须存在，否则不加载。存在性是布尔检查，description 写得好不好，代码不看。

时间点也值得强调：以上全部发生在会话创建时、第一次模型调用之前。它就是一段文件系统扫描加配置过滤的代码，与 LLM 无关。

## 加载阶段：决策靠模型，执行靠代码，强制没有

发现阶段结束后，得到一批「已发现的 skill」。它们进入模型视野的方式很克制：

- 系统提示里只放 name + description（`hide: true` 的不列出）
- 正文不进系统提示，按需通过 `read skill://<name>` 读取

把「加载」拆成三个环节看。

**决策（要不要读）是模型的。** 系统提示里的驱动文字是一句指令：`Matching skill → MUST read skill://<name> first`。模型对着 description 目录，自己判断当前任务和哪条相关。这是一条提示层的约束：没有任何 hook 会校验「你动了这类文件却没读对应的 skill」，frontmatter 里的 `globs` 字段也不参与任何执行期检查。模型跳过它，什么都不会发生。

**执行（怎么取）是代码的。** 模型决定后发出的工具调用是 `read("skill://<name>")`，剩下的交给 `src/internal-urls/skill-protocol.ts`：名字精确匹配、拒绝绝对路径、拒绝 `..` 穿越、解析结果必须留在 skill 目录内。这条通道没有语义成分。

**强制（不读会怎样）不存在。** 这是 skill 和 rule 在 omp 里最大的差异。rules 管线（`bucketRules`）有真正的确定性分桶：

| | skill | rule（TTSR） | rule（alwaysApply） |
|---|---|---|---|
| 触发判定 | 模型自行判断 | 代码对输出流做 regex / ast-grep 匹配 | 无条件 |
| 注入方式 | 模型主动 `read` | 代码中断流并注入 | 代码把全文注入系统提示 |
| 不触发后果 | 无 | 规则仍生效 | 规则仍生效 |

TTSR 指 Time Traveling Stream Rules：带 `condition`（正则）或 `astCondition`（ast-grep 模式）的 rule 会注册进运行时，由代码实时匹配模型的输出流。甚至 rulebook 部分（只在系统提示里列目录的 rule）在文档里也明确标注 "code does not enforce glob applicability"，同样是提示层约束。skill 连提示层之外的执行层都没有。

回到开头的问题，答案到这里可以给出：**除两条旁路外，skill 触发与否主要靠模型自身判断。** 由此有三个实操推论：

1. **description 是 skill 的全部接口。** 模型决策时只看这一行文字，写得含糊或过窄，skill 就等于不存在。触发率取决于 description 和任务表述的语义重叠度，代码层没有任何补偿机制。
2. **模型弱则机制弱。** 换一个指令跟随差的模型，`MUST read` 就只是建议。可靠性敏感的约束应该写成 rule（`alwaysApply` 或 TTSR 的 `condition`），那才是代码强制的通道。
3. **失败是静默的。** 模型跳过该读的 skill，不报错、不告警，omp 不追踪「放了几个 skill、实际读了几个」。调试触发问题只能从 description 入手。

## 两条不经模型判断的路径

**`/skill:<name>`，用户手动。** 交互模式下每个已发现的 skill 注册一个 slash command，正文直接注入为消息。决策者是用户。

**`autoloadSkills`，agent 作者预声明。** 这是子代理（task agent）定义文件 frontmatter 里的字段：

```markdown
---
name: latex-writer
description: LaTeX 排版专家
systemPrompt: ...
autoloadSkills: [latex-builder, technical-writing]
---
```

语义：

- 引用域是父会话的已发现 skill 列表，未知名字静默忽略，不报错
- 注入格式用专门的 Autoloaded 模板（`src/prompts/skills/autoload.md`）：正文加 `Skill: <path>` 出处，作为隐藏消息注入，且明确不得声称是用户调用的
- 注入时机在子代理的第一条 prompt 之前

它回答的问题：子代理是空白会话，没有主会话历史；默认路径下它会不会主动去读 skill，取决于它的模型。对职责固定的专家 agent，作者可以用这个字段把「模型判断」换成「代码保证」。

## 子代理的 skill：一张分工表

| 决策 | 谁做 | 依据 |
|---|---|---|
| 子代理能看到哪些 skill | 代码，继承父会话 | 文档原话："there is no per-task skill pinning override"——Task 工具没有按任务挑 skill 的参数 |
| 哪些正文必须预载 | agent 作者，frontmatter 静态声明 | `autoloadSkills` |
| 其余正文读不读 | 子代理自己的模型 | 提示层指令 |
| 父 LLM | 无任何干预手段 | — |

补充一点：rules 的 `agents` frontmatter 字段（如 `agents: [scout]`）会在子代理会话创建时按 agent 名重新过滤，`agents: main` 的规则对子代理不生效。这是 rules 侧的机制，但同样说明每个子代理都会重新评估一遍自己的上下文构成。

## 本机核对：bundled agents 与 reviewer

omp 内置 5 个 agent：`scout`（只读调研）、`reviewer`（代码审查）、`security-reviewer`（安全审查）、`task`（通用）、`sonic`（低推理的机械任务）。

reviewer 的定义文件在 `src/prompts/agents/reviewer.md`，frontmatter 摘录：

```yaml
---
name: reviewer
description: "Code review specialist for quality/security analysis"
tools: read, find, grep, glob, bash, lsp, web_search, ast_grep
spawns: scout
model: "@slow"
---
```

没有 `autoloadSkills` 字段。对照定义文件的 frontmatter 模板（`frontmatter.md`，`autoloadSkills` 是其中的条件分支），bundled 的 5 个 agent 全部没有使用它。所以：

- reviewer 的 skill 预载数量：零
- 它的 tools 里有 `read`，满足「read 可用则系统提示含 skill 目录」的条件，所以它看得到父会话的全部 skill 列表；读不读，由它的模型（`@slow` 解析出的模型）决定
- 想让 reviewer 必带某个 skill，做法是写同名定义覆盖 bundled。同名优先级：项目 `.omp/agents/` > 用户 `~/.omp/agent/agents/` > bundled

## 收束

把整条链路按「谁在做决定」排一遍：

| 环节 | 决定者 | 机制 |
|---|---|---|
| 哪些 skill 存在、进目录 | 代码 | 文件系统扫描 + 配置过滤 |
| 目录里哪条适用于当前任务 | 模型 | 提示层指令 + description |
| 正文怎么进入上下文 | 代码（read + skill:// 协议） | 确定性 |
| 读不读的后果 | 无 | 无强制 |
| 子代理必载哪些 | agent 作者 | `autoloadSkills` |
| 用户点名加载 | 用户 | `/skill:<name>` |

omp 把 skill 做成「系统提示里的目录」，把 rule 做成「运行时强制执行的规则」。写的时候值得按这个分工分配内容：方法论、参考资料、可跳过的工作流放 skill；必须生效的约束放 rule。
