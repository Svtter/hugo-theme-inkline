---
title: "Create Vnet to Build Internal Network"
description:
date: 2025-06-19T15:53:53+08:00
series: ["自托管与私有云"]
weight: 4
image: https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/migrated/53e2172739072918.png
math:
license:
hidden: false
comments: true
draft: false
tags:
  - network
  - pve
---

我们可以使用 Proxmox Virtual Environment (PVE) 来构建一个大型内部网络。

PVE 集群节点可以创建 VNets，通过 VNets，我们可以将不同的虚拟机直接放入来获取更自由网络能力。
