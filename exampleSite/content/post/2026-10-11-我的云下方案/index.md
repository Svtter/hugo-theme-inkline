---
title: 我的云下方案：三台服务器与三十台虚拟机的账本
slug: 我的云下方案
description: 起因是一笔报价：这套环境搬上阿里云 k8s，合理架构四五千一个月起步，而现状现金成本只有电费。这篇摊开我的云下方案——三台 Proxmox、三十台虚拟机、分层存储、自建 CI 池——以及半年 380 篇运维日志换来的治理清单。
date: 2026-10-11T10:00:00+08:00
categories:
  - DevOps
  - 架构
tags:
  - Proxmox
  - 自托管
  - CI
  - Gitea
  - 成本
  - homelab
series:
  - 自托管与私有云
weight: 7
comments: 'true'
cover: /images/2026/10/11/off-prem-infra-cover.jpg
image: /images/2026/10/11/off-prem-infra-cover.jpg
---

## 起因：一笔云上报价

最近把工作室的基础设施认真盘了一遍，起因是一个很具体的问题：这套东西搬到阿里云 k8s 上，一个月要花多少钱。

按 2026 年 10 月的列表价算了一遍（数字后面展开）：合理架构四五千一个月起步，如果 1:1 平移，八千往上。而这套东西现在的现金成本，是每月两三百块电费。

差了一个数量级。这个差距值得写清楚：它来自哪里、付出了什么代价、什么情况下会反转。这篇把我的云下方案摊开讲，算是一本公开的账本。

## 这套方案长什么样

先交代规模，否则成本没有意义。

- 三台 x86 服务器跑 Proxmox VE，最老的一台是 2012 年平台的 Dell 塔式服务器；另有一台 NAS 做存储和几个容器化服务
- 常驻虚拟机 30 台上下，名义分配约 80 vCPU / 160 GB 内存
- 对外只保留两三台云上小机器做公网入口和海外任务，常驻计算全部在云下

30 台虚拟机分三类：

| 分层 | 数量 | 内容 |
|------|------|------|
| CI 池 | 17 | 自托管 runner 和构建机，跑 GitHub Actions 和 Gitea Actions 的任务：单测、镜像构建、LaTeX 编译、AI 代码评审 |
| 状态服务 | ~10 | Gitea（代码托管 + CI 控制面）、Docker Registry、PostgreSQL、Redis、Prometheus + Grafana、几个长连接的 AI agent 服务 |
| 开发机 | 3~4 | SSH + tmux 的 Linux 虚拟机，见[我的 Linux 开发环境 — 2026](/p/我的-linux-开发环境-2026/) |

<svg viewBox="0 0 800 400" width="100%" style="max-width:800px;height:auto;display:block;margin:1.5rem auto;" role="img" aria-label="云下架构总览：三台 Proxmox 服务器加一台 NAS 承载 30 台虚拟机（CI 池 17、状态服务约 10、开发机 3~4），NAS 按 IO 画像分五个存储池，对外仅通过两三台云上小机器提供公网入口与海外任务">
  <defs>
    <marker id="pve-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 Z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="40" y="36" font-size="17" font-weight="bold" fill="currentColor">云下架构总览</text>
  <g fill="currentColor" font-size="12">
    <rect x="40" y="58" width="170" height="110" rx="8" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="56" y="82" font-size="13" font-weight="bold">Proxmox VE · 1</text>
    <line x1="56" y1="92" x2="194" y2="92" stroke="currentColor" stroke-opacity="0.15"/>
    <rect x="90" y="104" width="18" height="18" rx="3" fill="#3B82F6"/>
    <rect x="116" y="104" width="18" height="18" rx="3" fill="#3B82F6"/>
    <rect x="142" y="104" width="18" height="18" rx="3" fill="#3B82F6"/>
    <rect x="90" y="130" width="18" height="18" rx="3" fill="#14B8A6"/>
    <rect x="116" y="130" width="18" height="18" rx="3" fill="#14B8A6"/>
    <rect x="142" y="130" width="18" height="18" rx="3" fill="#8B5CF6"/>
    <rect x="226" y="58" width="170" height="110" rx="8" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="242" y="82" font-size="13" font-weight="bold">Proxmox VE · 2</text>
    <line x1="242" y1="92" x2="380" y2="92" stroke="currentColor" stroke-opacity="0.15"/>
    <rect x="276" y="104" width="18" height="18" rx="3" fill="#3B82F6"/>
    <rect x="302" y="104" width="18" height="18" rx="3" fill="#3B82F6"/>
    <rect x="328" y="104" width="18" height="18" rx="3" fill="#3B82F6"/>
    <rect x="276" y="130" width="18" height="18" rx="3" fill="#14B8A6"/>
    <rect x="302" y="130" width="18" height="18" rx="3" fill="#14B8A6"/>
    <rect x="328" y="130" width="18" height="18" rx="3" fill="#8B5CF6"/>
    <rect x="412" y="58" width="170" height="110" rx="8" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="428" y="82" font-size="13" font-weight="bold">Proxmox VE · 3</text>
    <line x1="428" y1="92" x2="566" y2="92" stroke="currentColor" stroke-opacity="0.15"/>
    <rect x="462" y="104" width="18" height="18" rx="3" fill="#3B82F6"/>
    <rect x="488" y="104" width="18" height="18" rx="3" fill="#3B82F6"/>
    <rect x="514" y="104" width="18" height="18" rx="3" fill="#3B82F6"/>
    <rect x="462" y="130" width="18" height="18" rx="3" fill="#14B8A6"/>
    <rect x="488" y="130" width="18" height="18" rx="3" fill="#14B8A6"/>
    <rect x="514" y="130" width="18" height="18" rx="3" fill="#8B5CF6"/>
    <rect x="640" y="58" width="120" height="150" rx="8" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.55" stroke-dasharray="6 4"/>
    <text x="700" y="82" text-anchor="middle" font-size="14" font-weight="bold">云上</text>
    <rect x="650" y="94" width="28" height="18" rx="3" fill="none" stroke="currentColor" stroke-opacity="0.6"/>
    <rect x="686" y="94" width="28" height="18" rx="3" fill="none" stroke="currentColor" stroke-opacity="0.6"/>
    <rect x="722" y="94" width="28" height="18" rx="3" fill="none" stroke="currentColor" stroke-opacity="0.6"/>
    <text x="700" y="134" text-anchor="middle">2~3 台小机器</text>
    <text x="700" y="156" text-anchor="middle">公网入口</text>
    <text x="700" y="176" text-anchor="middle">海外任务</text>
    <text x="611" y="103" text-anchor="middle" font-size="11" opacity="0.8">公网入口</text>
    <line x1="588" y1="113" x2="632" y2="113" stroke="currentColor" stroke-opacity="0.7" marker-start="url(#pve-arrow)" marker-end="url(#pve-arrow)"/>
    <line x1="125" y1="174" x2="125" y2="220" stroke="currentColor" stroke-opacity="0.7" marker-start="url(#pve-arrow)" marker-end="url(#pve-arrow)"/>
    <line x1="497" y1="174" x2="497" y2="220" stroke="currentColor" stroke-opacity="0.7" marker-start="url(#pve-arrow)" marker-end="url(#pve-arrow)"/>
    <text x="311" y="201" text-anchor="middle">内网东西向：镜像分发 / 构建缓存</text>
    <rect x="40" y="226" width="542" height="100" rx="8" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="60" y="252" font-size="13" font-weight="bold">NAS · 存储</text>
    <text x="562" y="252" text-anchor="end" font-size="11" opacity="0.7">按 IO 画像分 5 池</text>
    <rect x="109" y="268" width="64" height="32" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="141" y="289" text-anchor="middle">NVMe</text>
    <rect x="187" y="268" width="64" height="32" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="219" y="289" text-anchor="middle">SSD</text>
    <rect x="265" y="268" width="56" height="32" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="293" y="289" text-anchor="middle">SAS</text>
    <rect x="335" y="268" width="56" height="32" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="363" y="289" text-anchor="middle">SAS</text>
    <rect x="405" y="268" width="108" height="32" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="459" y="289" text-anchor="middle">HDD 冷数据</text>
    <rect x="40" y="360" width="14" height="14" rx="3" fill="#3B82F6"/>
    <text x="62" y="372">CI 池 17</text>
    <rect x="170" y="360" width="14" height="14" rx="3" fill="#14B8A6"/>
    <text x="192" y="372">状态服务 ~10</text>
    <rect x="330" y="360" width="14" height="14" rx="3" fill="#8B5CF6"/>
    <text x="352" y="372">开发机 3~4</text>
    <text x="760" y="372" text-anchor="end" font-size="13" font-weight="bold">合计：30 台 VM / 80 vCPU / 160 GB</text>
  </g>
</svg>

存储不是一大块，而是按 IO 画像分了五个池：NVMe 和几块 SSD 各自成池，给 runner 和高写入负载；两块企业级 SAS 盘做通用池；一块大容量机械盘只放冷数据。CI 的镜像仓库（LaTeX 全量镜像单个 9 GB+）和构建缓存吃掉了大部分空间。

管理面尽量自动化：

- runner 是模板克隆出来的，新机器从克隆到接单半小时以内
- 全员 node_exporter + Prometheus + Grafana，磁盘、内存、节点存活都有告警
- 每周自动清理的 systemd timer 覆盖全部 runner：构建缓存、/tmp、诊断日志、悬空镜像——这是血泪换来的，后面讲
- 虚拟机层的带外管理（qemu-guest-agent）是救命的：SSH 都被 IO 饿死的时候，还能从宿主机进机器杀进程

## 账本

### 云上要花多少

按「迁移后的合理架构」估（列表价，2026-10）：

| 项目 | 规格 | 月费 |
|------|------|------|
| [ACK Pro 集群管理费](https://help.aliyun.com/zh/ack/ack-managed-and-ack-dedicated/product-overview/cluster-management-fee) | ¥0.64/小时 | ~¥470 |
| 常驻状态服务节点 | 2 × 8C/32G ECS | ~¥1300 |
| CI 常驻节点 | 2 × 8C/16G ECS | ~¥1000 |
| 块存储 | ~1.2 TB ESSD | ~¥600 |
| NAT 网关 + EIP + 负载均衡 | | ~¥400 |
| CI 弹性 | 竞价实例，按需 | ¥300~1000 |
| 合计 | | **¥4000~5000** |

托管集群基础版免管理费，能再省 ¥470，代价是没有 SLA 和部分企业功能。如果 1:1 平移全部 30 台虚拟机，月费会到 ¥8000 以上。

### 云下实际花多少

- 电费：整机常驻功耗 500W 上下，每月三百多度电，两三百块
- 硬件：三台机器和盘是这几年陆续攒的；二手 x86 服务器整机千元级就能起步，算沉没成本，不计入月账
- 云上小机器保留两三台（海外任务 + 公网入口），每月几百块

云下的现金成本，约为云上方案的十分之一。

<svg viewBox="0 0 800 260" width="100%" style="max-width:800px;height:auto;display:block;margin:1.5rem auto;" role="img" aria-label="月度现金成本对比：云上合理架构每月约四千至五千元（ACK 管理费、状态服务、CI 节点、块存储、网络、CI 弹性），1:1 平移则超过八千元；云下现金成本约每月六百至八百元，约为云上的十分之一">
  <text x="40" y="32" font-size="17" font-weight="bold" fill="currentColor">月度现金成本对比（¥ / 月）</text>
  <g fill="currentColor" font-size="12">
    <text x="170" y="56" font-size="11" opacity="0.75">¥4000~5000 / 月</text>
    <text x="160" y="88" text-anchor="end" font-size="12.5">云上 · 合理架构</text>
    <rect x="170" y="64" width="34" height="36" fill="#8B5CF6"/>
    <rect x="204" y="64" width="93" height="36" fill="#14B8A6"/>
    <rect x="297" y="64" width="71" height="36" fill="#3B82F6"/>
    <rect x="368" y="64" width="43" height="36" fill="#F59E0B"/>
    <rect x="411" y="64" width="29" height="36" fill="#22C55E"/>
    <rect x="440" y="64" width="46" height="36" fill="#EF4444"/>
    <rect x="486" y="64" width="256" height="36" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="5 4"/>
    <text x="614" y="87" text-anchor="middle" opacity="0.85">1:1 平移 ¥8000+</text>
    <rect x="170" y="109" width="12" height="12" rx="2" fill="#8B5CF6"/>
    <text x="188" y="119" font-size="11.5">ACK 管理费 ~¥470</text>
    <rect x="352" y="109" width="12" height="12" rx="2" fill="#14B8A6"/>
    <text x="370" y="119" font-size="11.5">状态服务 ~¥1300</text>
    <rect x="534" y="109" width="12" height="12" rx="2" fill="#3B82F6"/>
    <text x="552" y="119" font-size="11.5">CI 常驻节点 ~¥1000</text>
    <rect x="170" y="131" width="12" height="12" rx="2" fill="#F59E0B"/>
    <text x="188" y="141" font-size="11.5">块存储 ~¥600</text>
    <rect x="352" y="131" width="12" height="12" rx="2" fill="#22C55E"/>
    <text x="370" y="141" font-size="11.5">网络 ~¥400</text>
    <rect x="534" y="131" width="12" height="12" rx="2" fill="#EF4444"/>
    <text x="552" y="141" font-size="11.5">CI 弹性 ¥300~1000</text>
    <text x="160" y="192" text-anchor="end" font-size="12.5">云下 · 现金成本</text>
    <rect x="170" y="168" width="18" height="36" fill="#F59E0B"/>
    <rect x="188" y="168" width="32" height="36" fill="#3B82F6"/>
    <text x="230" y="192" font-size="12.5" font-weight="bold">≈ ¥600~800 / 月</text>
    <text x="368" y="192" font-size="13" font-weight="bold" fill="#F59E0B">约为云上的 1/10 · 差一个数量级</text>
    <rect x="170" y="219" width="12" height="12" rx="2" fill="#F59E0B"/>
    <text x="188" y="229" font-size="11.5">电费 ~¥250（500W 常驻）</text>
    <rect x="420" y="219" width="12" height="12" rx="2" fill="#3B82F6"/>
    <text x="438" y="229" font-size="11.5">云上小机器（公网入口 / 海外任务）几百块</text>
  </g>
</svg>

### 差距为什么这么大

关键在一个数字：CI 池名义上有 17 台虚拟机，但平均利用率很低。任务来了满负荷，任务一停大半空转。

- 云上按实例计费，空转也要付钱，低利用率直接放大账单
- 云下电费对利用率不敏感，17 台虚拟机满载和空载，电表读数差别不大

这套负载画像——常驻、低平均利用率、大量内网东西向流量（镜像分发、构建缓存）——每一项都偏向云下。反过来，突发大、生命周期短的负载，云上按秒计费才是便宜的。这个判断只对「三台服务器、三十台虚拟机」这个规模成立，规模变了要重算。

## 这套方案的真实成本：运维时间

账本只有一半，另一半是时间。

这套环境我记了半年运维日志，380+ 篇。翻一遍会发现，钱省下来的部分，时间是付了利息的。反复出现的几类：

**1. 精简置备池写满**。Proxmox 默认的 lvmthin 有个坑：虚拟机里 df 看着正常，宿主机上池子已经满了。池一满，同池所有正在写盘的虚拟机一起进 IO error——我有一次四个 runner 楔死 28 小时才发现，guest 层监控全绿，宿主层没有水位指标。另一个坑：删除文件不回吐池空间，fstrim 才回吐。治理：清理脚本末尾强制 fstrim，宿主层水位告警补上。

**2. 慢盘元数据塌缩**。拿一块 5400rpm 笔记本盘当存储池，日常没事，直到某次要删除上百万个小文件：ext4 日志线程被打跪，一台虚拟机卡在开机清理上几个小时。治理：存储按 IO 画像分层，删除大户永远隔离到 SSD 池。

**3. CI 磁盘写满**。记录在案 12 次。构建缓存每个分支 800MB+、/tmp、诊断日志，只写不清。直到把每周自动清理 timer 铺满全部 runner，这个模式才算按住。前几次都是磁盘 100%、runner 掉线之后才发现。

**4. 内存默认值不够**。runner 虚拟机默认 2G 内存，跑 AI 评审或并行单测必被 OOM killer 杀掉，4G 起步是底线。

**5. 时间性凭证到期**。自签证书、90 天 PAT，这类「到点就死」的东西没有台账时，坏掉的方式都是静默的：CI 假红、部署停更，查一圈才发现是过期。治理：到期台账 + 探活告警。

这些坑的共性：云上产品化掉的麻烦——存储扩容、水位监控、凭证轮换——云下都要自己扛。云上那四五千块，买的主要就是这部分时间。

另外有一个做法值得单独说：每次故障我都记进一个结构化的知识库。原始日志 append-only；同一个模式出现两次以上，就提炼成独立的概念页；跨服务的架构决策单独成时间线。这个库由我和 agent 共同维护，agent 排障前先读索引再动手。运维时间是有复利的，前提是记录在案。

## 什么时候不该选云下

把条件摆全，免得这篇变成单边广告：

- **负载突发大**：云下机器是固定的，CI 高峰排队是真的，我这里有单任务排队一小时的记录；云上竞价实例几分钟就能扩出来
- **电力和网络不可靠**：停电吃过亏，两台虚拟机没配开机自启，来电之后没人拉起来
- **不想付运维时间**：上面每一条坑都是真实的小时数，如果这些时间对你很贵，云上反而便宜
- **需要公网 SLA 或合规**：家宽没有 SLA，这是硬伤

## 收束

上云买的是弹性和省心，云下买的是单位成本和控制权。

对当前这个规模，我的选择是混合：常驻大头放云下，海外和公网入口留在云上，每月总现金成本几百块。如果哪天 CI 负载涨十倍，或者我不再愿意花时间守着这些机器，这笔账会立刻反转——到那时候再迁，云上按量计费的门一直开着。
