---
title: "小型公司的私有云"
description: 
date: 2026-01-18T09:06:31+08:00
series: ["自托管与私有云"]
weight: 6
image: https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/migrated/7ec8e031ebee67fc.png
tags:
  - 私有云
  - 工作环境
  - 基础设施
categories:
  - 技术
draft: false
---

很多朋友想知道一个问题：我们小型软件开发公司的内部服务器情况，以及基础设施有哪些？

内部开发集群无非解决下面几个问题：

1. git code 管理
2. 数据安全与备份
3. 多虚拟机提供开发环境

为了解决上述问题，我们采用如下的方案。

## 硬件配置

我们大概需要同时运行 10 个虚拟机服务器，以及 4 个开发机。如果不计算电量，我大概将服务器硬件成本控制在 **5000 元左右**，已经稳定运行 2 年。

主要设备：
- 二手 Dell 小型主机
- Thunderobot MIX 主机

![](https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/migrated/99308eee1688fb4f.png)

![](https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/migrated/c6cf1fd9ba754c59.png)

## 为什么不用入门级或中级服务器？

最大的原因是**没必要**。功耗对比：

| 配置类型 | 功耗等效 |
|---------|---------|
| 单路配置 | ≈ 4-6 台 Mini 主机 |
| 双路配置 | ≈ 10-15 台 Mini 主机 |

省钱是挺省钱，但是遇到服务器内存需求高的时候，还是会对开发效率造成影响。

## 存储和网络

- **交换机**：Mercury 入门级交换机 2.5G
- **NAS 服务器**：绿联 DH4300 Plus

## 用途

虚拟机服务器上主要运行：

- CI Runner
- 工程师开发环境


## 最后

不过近来看，因为我们需要开发一些 kubernetes 上的服务，现在的配置已经略显不足了。

