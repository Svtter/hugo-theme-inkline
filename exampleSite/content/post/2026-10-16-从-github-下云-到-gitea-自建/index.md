---
title: 从 GitHub 下云，到 Gitea 自建：工作室的代码托管迁移记
slug: 从-github-下云-到-gitea-自建
description: 工作室的代码托管从 GitHub 搬进内网 Gitea：为什么搬——agent 编队改了用量结构、国际链路丢包、凭证策略不在自己手里；怎么搬——migrate 全量加五项验收清单；踩了哪些坑；以及为什么这个博客还留在 GitHub 上。
date: 2026-10-16T18:30:00+08:00
categories:
  - DevOps
  - 架构
tags:
  - Gitea
  - GitHub
  - 自托管
  - CI
  - AI Agent
  - homelab
series:
  - 自托管与私有云
weight: 8
comments: 'true'
cover: https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/2026/10/16/gitea-migration-cover.jpg
image: https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/2026/10/16/gitea-migration-cover.jpg
---

## 欠着的下半篇

[上一篇][1]把硬件账算完了：三台服务器、三十台虚拟机，现金成本是云上方案的十分之一。写完发现那篇只回答了「机器放哪」，没回答另一半：代码托管、CI、PR 评审这些软件层的东西，放在哪。

答案分两半。工作室的代码，从六月开始试点、九月起批量搬，现在住在内网的 Gitea 上；这个博客还在 GitHub 上——它上个月刚因为一个 90 天的 token 静默过期停更了五天，这事后面展开讲。

先把定位说清楚：**这几台服务器是工作室的生产资料**。它们服务的是工作室自己的项目、客户项目，和一支由十几个 agent 组成的编队。这个定位先摆出来，后面每个判断都从它出发。

## GitHub 哪里对不上

先把话说公平：GitHub 没做错什么。对开源项目，它仍是第一选择——这个博客现在还靠它发布和评审。对不上的地方在于，工作室的实际用法变了，而托管平台的产品模型还停在「人类开发团队」的假设上。

1. **一半的同事不是人。** 工作室的 CI job、PR、代码评审量，过去一年翻着番地涨——不是团队扩了，是 agent 编队上工了。内网 runner 池做过一次盘点：14 天 6722 个 CI job，其中七成是 30 秒以内的轻量任务；AI 代码评审每天一百多场，峰值 197。这个用量结构放进按人头收坐席费、按小时限速 API 的模型里，账对不上——编队里大部分成员不是人，也不看钟点干活。
2. **国际链路是物理问题。** 从家宽到 GitHub 要出国。运维记录里最差的一段，出口路由段丢包 30%，TLS 握手中位数 1.57 秒、最差 7.6 秒，clone 卡住、CI 假红是常态。有一回迁移跑到一半，链路抖动直接把迁移掐死，删了半仓重来。这类问题换任何云上方案都无解——物理距离摆在那。
3. **凭证策略不在自己手里。** 托管平台的 access token 有 90 天强制过期。10 月 4 日中午，这个博客的部署 token 到期，部署流水线开始报错，直到 9 日才发现——停更五天，查了一圈构建和 runner 都正常，最后拿 secret 的更新时间和成功失败边界对时间线才定位。托管的代价之一：到期策略别人定，坏的方式还是静默的。
4. **数据要在自己手里。** 客户项目和内部工具，合同和常识都要求它们待在内网。公有托管上再细的权限配置，也比不上物理上不出去。

上一篇有个判断：常驻、低平均利用率、大量内网东西向流量的负载，偏向云下。代码托管这条画像全占——Git 仓库常驻，CI 池任务来了才吃满，镜像和构建缓存全在内网流转。

## 路线：两条路，选了原生

托管选了 Gitea，跑在 NAS 上，一个容器，前面挂一层内网 TLS。选它没有太多故事：轻，workflow 语法和 GitHub Actions 兼容，API 够用，数据就是普通 Git 仓库加一个数据库，备份逻辑简单。

真正做过一次选择的是 workflow 路线：

- **兼容路线**：仓库里 `.github/workflows/` 原样搬到 Gitea 跑。评估结果是改造量 7~11 周——`actions/github-script` 这类 GitHub 专有 action 必须逐个重写，21 个 workflow 排着队改。
- **原生路线**：新写 `.gitea/workflows/`，用 shell 加 Gitea API 的写法，不追兼容。Gitea 两个目录都认，`.github/` 原封不动留给 GitHub，两边同时活跃也互不干扰。

选了原生。兼容路线省下的脑力，全折算成了周；原生路线的每个 workflow 按 Gitea 自己的能力重新写，反而更短。GitHub 侧仓库完全不动，双写期自然成立——这个选择后面还救过我们一次。

## 先把 runner 的绳剪了

CI 这层有个隐藏依赖：workflow 里到处是 `uses: actions/checkout@v4`，这些第三方 action 默认从 GitHub 拉。迁到内网之后如果还去外面拉 action，等于搬了新家，钥匙还挂在旧物业手里。

所以动 CI 之前先做了三件事：

1. 把实例配置里第三方 action 的默认拉取地址指到自己（`DEFAULT_ACTIONS_URL=self`）
2. 常用 action 镜像进内网的 `actions` 组织：checkout、cache、setup-python、setup-node、setup-uv 这些，一次镜像，全组织可用
3. runner 起任务容器用自构建的镜像，证书、git 配置、curl 配置都烤进镜像里，git 和 curl 两条 TLS 线一次处理完

做完这轮，一条 CI 从拉代码、装依赖、跑测试到缓存读写，全程不碰外网。这轮改造内部代号 kill-PAT——最初只想解决 runner 的 token 依赖，做完发现收获不止这一项：CI 不再受国际链路抖动影响，这本身就是下云的一部分。

## 迁移剧本

数据迁移用的是 Gitea 的 migrate API，一次性全量：git 历史、issues、PR、labels、milestones、releases、LFS 都跟着走。为什么不用 mirror 模式？mirror 仓库只读，issues 单元直接禁用，「代码同步 + issue 也能用」两个需求它只能满足一个。

<svg viewBox="0 0 800 250" width="100%" style="max-width:800px;height:auto;display:block;margin:1.5rem auto;" role="img" aria-label="仓库切换四步：冻结、全量 migrate、验收对账、GitHub 侧归档；migrate 一步要用轮询计数代替等待 HTTP 响应；双写期的同步 timer 在切换完成后必须拆除">
  <defs>
    <marker id="cut-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 Z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="40" y="34" font-size="17" font-weight="bold" fill="currentColor">单仓切换剧本</text>
  <g fill="currentColor" font-size="12">
    <rect x="40" y="56" width="150" height="96" rx="8" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="115" y="82" text-anchor="middle" font-size="13.5" font-weight="bold">1 · 冻结</text>
    <text x="115" y="104" text-anchor="middle" opacity="0.75">GitHub 侧停止开发</text>
    <text x="115" y="124" text-anchor="middle" opacity="0.75">核查零漂移、无在飞 CI</text>
    <line x1="196" y1="104" x2="222" y2="104" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#cut-arrow)"/>
    <rect x="226" y="56" width="150" height="96" rx="8" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="301" y="82" text-anchor="middle" font-size="13.5" font-weight="bold">2 · 全量 migrate</text>
    <text x="301" y="104" text-anchor="middle" opacity="0.75">git + issues + PR + LFS</text>
    <text x="301" y="124" text-anchor="middle" opacity="0.75">轮询计数，别等 201</text>
    <line x1="382" y1="104" x2="408" y2="104" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#cut-arrow)"/>
    <rect x="412" y="56" width="150" height="96" rx="8" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="487" y="82" text-anchor="middle" font-size="13.5" font-weight="bold">3 · 验收对账</text>
    <text x="487" y="104" text-anchor="middle" opacity="0.75">计数逐项对 + 抽查编号</text>
    <text x="487" y="124" text-anchor="middle" opacity="0.75">计数表 · 状态位 · 开关</text>
    <line x1="568" y1="104" x2="594" y2="104" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#cut-arrow)"/>
    <rect x="598" y="56" width="150" height="96" rx="8" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="673" y="82" text-anchor="middle" font-size="13.5" font-weight="bold">4 · 归档</text>
    <text x="673" y="104" text-anchor="middle" opacity="0.75">GitHub 侧 archive</text>
    <text x="673" y="124" text-anchor="middle" opacity="0.75">只读留档，随时可回</text>
    <rect x="40" y="178" width="480" height="52" rx="8" fill="none" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="6 4"/>
    <text x="60" y="200" opacity="0.85">双写期（临时）：GitHub→Gitea 小时级同步 timer</text>
    <text x="60" y="219" font-weight="bold" fill="#EF4444" opacity="0.9">切换完成的定义：所有还在写旧平台的自动化点名拆除</text>
    <text x="700" y="240" text-anchor="end" opacity="0.55">前三仓 ~1 天 · 后面的仓一次过</text>
  </g>
</svg>

单个仓库的切换固定四步：

1. **冻结**：GitHub 侧停止开发，最后核一遍零漂移、无在飞的 CI
2. **migrate**：API 全量迁移，顺手带 LFS
3. **验收对账**：issues、PR、分支、tag 计数逐项对，抽查编号、标题、状态
4. **归档**：GitHub 侧 archive，只读留档，想回随时能回

第一批数字：ralphplus，818 个分支、576 个 issues、968 个 PR，导入 70 分钟；紧接着最大的仓也把数据搬了过去，2339 个 issues、3451 个 PR。十月的批量迁移就顺了——客户项目组织九个仓，外加两个业务仓，验收清单走完直接归档，最后一个仓零残留一次过。

早期还配过一个 GitHub→Gitea 的小时级同步 timer，负责双写期把增量分支推过来。后来证明它多余且危险，坑 6 讲。

## 坑，按出现的顺序

以下每条都对应一次真实事故。「数据搬家」这一层的边角，哪家的文档都不会写，全记在这里。

**1. migrate API 不传 `service` 字段，就是静默半迁移。** 只给仓库地址不给 `"service": "github"`，Gitea 会当成纯 git 导入，issues、PR 全部跳过，HTTP 照样返回 201。教训进了验收清单：**验证看数据计数，不看状态码**。

**2. 反向代理 90 秒读超时。** 大仓库的 migrate 调用超过 90 秒，代理层直接 504——但 Gitea 服务端还在跑。解法：发起之后轮询 issues/PR 计数，别等 HTTP 响应。首次全量 push 大仓库会撞同一个超时，从 Gitea 容器内部直接推，绕开代理。

**3. PR 阶段会悬死，重跑能治。** 大仓的 PR 迁移 14 小时只进了 147/3451，后三小时零进展——不是限流，是导入 goroutine 悬死。用「临时仓名重迁一次」做了零风险探测，3 小时全量导入成功，证明是偶发不是数据病态。迁移单趟没有断点续传，但悬死类故障删仓重跑就好，探测一次的成本远低于反复纠结。

**4. issue 计数表会缺行，创建 issue 直接失败。** migrate 后有的仓库 `issue_index` 计数行缺失，新 issue 的编号从 1 起步，撞上存量编号，建一个败一个。十几个仓库里三个中招，间歇出现，与仓库规模无关。修法是补一行计数，验收清单里加了对这项的检查。

**5. Actions 功能单元会静默缺失。** 迁移后 CI 一条 run 都不创建，日志零报错。根因是仓库的 Actions 开关在数据库层缺了一行。更隐蔽的是重开：管理 API 把「是否启用 Actions」当成只读的派生字段，改了不生效，得直接动库。第一次撞上这个的时候查了一整天。

**6. 双写期的同步 timer 是颗雷。** 同步脚本用 force+prune 推分支，隐含假设是「Gitea 侧只是快照」。有个仓切到 Gitea 原生开发之后，timer 还在按小时跑，把 Gitea 上的 main 一路强推回 GitHub 的终态，原生提交差点全丢，分支保护拦住之后才定位。这算「切换后残留写入方」的典型案例：**cutover 完成的定义，是所有还在写旧平台的自动化都被点名处置**——包括自己早先亲手装的。

**7. 自建之后，凭证到期的坑换了主人。** 内网 Gitea 的自签证书一年到期。到期那天 runner 因为配了跳过校验，全程无告警，CI 静默打红。和博客那个 90 天 token 是同一个剧本，只是这次责任在自己。处置：证书换 10 年期，分发到所有 runner，所有时间性凭证进到期台账，探活告警跟上。

这些坑的共同点：没有一条是 Gitea 的 bug，全是「搬家」本身的边角。代理超时、链路窗口、计数表、残留写入方——每家的基础设施不一样，剧本只能自己踩出来。

## 搬完之后

现在的状态：

- 内网 Gitea 上二十个上下的仓库，工作室全部业务代码和客户项目；18 个仓挂上了 AI 评审——每个 PR 自动评审若干轮，判定可合并就自动 merge，有疑点就回帖列出修改项
- runner 池五台实例级 runner，14 天 6722 个 job，CI 和评审全在内网消化
- GitHub 上还剩：开源项目、这个博客，和一个体量最大的业务仓——它的数据两边都有，开发还在老地方，切换只是时间问题；另有一台海外小机器管着 GitHub 侧仓库的自动评审，公有云留给「需要公网」和「需要海外」的部分

钱的变化反而是最小的。CI 硬件两边本来就是自托管，这次搬的只是控制面：PR、issue、CI 编排、评审调度，从别人的平台搬回自己的 NAS。按坐席和分钟计费的部分归零，评审这种在 SaaS 上要按场掏钱的活，内网直接挂 webhook。

代价也真实存在。上一篇列过的运维时间清单又长了几行：证书台账、runner 磁盘水位、数据库备份。区别在于这些麻烦现在都在自己手里——坏了好查，修起来不用提工单。

## 收束

从 GitHub 下云，听起来像决裂，做起来是分工：

| | GitHub | 内网 Gitea |
|---|---|---|
| 定位 | 门面：开源、博客、对外 | 车间：业务、客户项目、agent 编队 |
| 挑它的理由 | 公网可达、协作网络 | 数据在手、无坐席费、链路零抖动 |
| 代价 | 计费模型对 agent 不友好、国际链路、凭证不自主 | 运维时间全自付 |

判断标准还是上一篇那套：看资产、看负载、看使用者。当「使用者」里一半是不占坐席的 agent，当负载是低利用率高常驻，当数据是客户项目——天平倒向自建。哪天 agent 退场、团队回到纯人类小队、项目重新变轻，GitHub 的门也一直开着。这个博客就是证明：它还在那边，好好的——除了那个 90 天的 token。

[1]: /p/我的云下方案/
