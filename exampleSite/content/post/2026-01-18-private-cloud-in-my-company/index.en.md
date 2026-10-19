---
title: "Private Cloud for Small Companies"
description: 
date: 2026-01-18T09:06:31+08:00
image: https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/migrated/7ec8e031ebee67fc.png
tags:
  - Private Cloud
  - Work Environment
  - Infrastructure
categories:
  - Technology
draft: false
---

Many friends want to know: What is the internal server situation and infrastructure of our small software development company?

Internal development clusters essentially solve the following issues:

1. Git code management
2. Data security and backup
3. Multiple virtual machines providing development environments

To address the above problems, we adopt the following solution.

## Hardware Configuration

We need to run approximately 10 virtual machine servers and 4 development machines simultaneously. If not counting electricity costs, I've kept the server hardware cost at around **5000 RMB**, which has been running stably for 2 years.

Main equipment:
- Second-hand Dell mini hosts
- Thunderobot MIX hosts

![](https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/migrated/99308eee1688fb4f.png)

![](https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/migrated/c6cf1fd9ba754c59.png)

## Why Not Use Entry-Level or Mid-Range Servers?

The biggest reason is **unnecessary**. Power consumption comparison:

| Configuration Type | Power Consumption Equivalent |
|-------------------|-----------------------------|
| Single-socket configuration | ≈ 4-6 Mini hosts |
| Dual-socket configuration | ≈ 10-15 Mini hosts |

While it saves money, when server memory requirements are high, it can still impact development efficiency.

## Storage and Networking

- **Switch**: Mercury entry-level 2.5G switch
- **NAS Server**: UGREEN DH4300 Plus

## Usage

Virtual machine servers mainly run:

- CI Runner
- Engineer development environments

## Finally

However, recently, as we need to develop some services on Kubernetes, the current configuration has become somewhat inadequate.