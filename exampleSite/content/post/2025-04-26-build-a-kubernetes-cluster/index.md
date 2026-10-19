---
title: "Build a Kubernetes Cluster.md"
description: 架设 kubernetes 集群
date: 2025-04-26T09:55:38+08:00
series: ["自托管与私有云"]
weight: 3
categories: [DevOps]
image: https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/migrated/cb9f9889be0254d4.png
math:
license:
hidden: false
comments: true
draft: false
tags:
- til
- kubernetes
- sealos
---

Kubernetes 是现行容器云的事实标准。这两天我构建了一个私有化的 kubernetes 集群，将过程整理成了脚本，可以使用这些脚本进行二次部署。

部署集群的代码：

<script src="/js/repo-card.js"></script>

<!-- inside body, where you want to create the card -->
<div class="repo-card" data-repo="svtter/k8s-deployment"></div>

## 架设前提

实际上，大多数 kubernetes 部署失败的案例，都在网络环境建设上翻了跟头。

架设 kubernetes 集群的前提条件（包括对人和对环境的）：

1. 自由的访问网络
2. 能够对内网中的 DNS 服务器进行管理，能够对 IP 地址进行管理。
3. 服务器方面：
  - 作为 master 的服务器 >= 1
  - 作为 node 节点的服务器 >= 2
  - 使用 supported 操作系统。例如 Ubuntu，CentOS 等。

此外，服务器防火墙，swap 等需要提前关闭。这些前提条件在[这里](https://sealos.run/docs/k8s/quick-start/deploy-kubernetes)会更加详细的描述，我这里就不啰嗦了。在我的代码库中，我提供了对应的代码，可以快速进行操作。

部署 kubernetes 是一个中高级运维人员的必备技能。这个过程中涉及了大量的网络以及操作系统知识。

## 架构简述

Kubernetes 结构图如下：

![Kubernetes architecture](https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/migrated/af70a20e3196b5a8.png)

其中，master 节点再 Control Plan 中，用于接收外部请求和转发。

## 安装过程

安装脚本：

```bash
# 安装 uv
bash install-uv.sh

# 根据自己的实际情况配置网络中的主机
...

# 配置 master node，worker node
vim conf.py

# 安装 sealos
bash download_sealos.sh

# 运行安装脚本
uv run install-k8s.py
```

## 使用

安装完成后，可以直接使用 helm 进行集群容器的安装和卸载。
