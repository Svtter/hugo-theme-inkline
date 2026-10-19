---
title: 用 Claude Code 开发 Fried Rice 主题
date: 2025-12-23T15:00:00+08:00
series: ["Hugo 博客工程"]
weight: 5
draft: false
image: https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/migrated/304e19fa6090ca88.png
tags:
    - claude code
    - hugo
    - open source
    - coding agent
categories:
    - coding
description: 记录使用 Claude Code 开发 Hugo 博客主题的体验
publishDate: 2025-12-23T15:25:02.779910476+08:00
---


最近用 Claude Code 给我自己的博客主题 [Fried Rice](https://github.com/Svtter/Fried-Rice) 加了一些 SEO 功能，整体体验还不错。

## 背景

Fried Rice 是从 [hugo-theme-stack](https://github.com/CaiJimmy/hugo-theme-stack) fork 出来的主题。之前已经加了一些基础的 JSON-LD structured data，这次想继续完善。

## 这次做了什么

主要是增强 SEO 的 structured data：

- WebSite schema（支持 search action）
- Organization schema（包含 founder、contact point、address）
- FAQ schema（支持文章内嵌 FAQ）
- 增强 Article/BlogPosting schema（加了 accessibility metadata）

![Fried Rice 主题预览](https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/migrated/e4e99b0723f6cc84.png)

## Claude Code 的表现

整个开发过程大概 2 小时，Claude Code 帮我：

1. **写代码** - Hugo 模板语法比较繁琐，让 AI 写省心很多
2. **Review 代码** - 我提交后让它检查，它发现了好几个问题：
   - `datePublished` 重复定义了 3 次
   - `founder` 对象重复定义
   - JSON 输出有双重转义问题
   - 变量作用域错误
3. **修复问题** - 发现问题后直接让它修，一次性改完
4. **创建 PR、打 tag、写 CHANGELOG** - 这些琐碎的事情也能做

比较惊喜的是它能发现代码里的逻辑问题。比如 Hugo 的 `jsonify` 输出被 HTML 转义导致 JSON 格式错误，它找到了正确的解决方案（用 `safeJS`）。

## 不足

- 有时候需要多次提醒才会用正确的工具
- 对于 Hugo 模板语法，有些地方不太熟悉，需要迭代几次

## 总结

对于这种「加功能 + 修 bug」的任务，Claude Code 挺好用的。特别是 Hugo 模板这种语法繁琐的东西，让 AI 来写效率高很多。

## 相关项目

{{< repo-card repo="Svtter/Fried-Rice" >}}

**基于:**

{{< repo-card repo="CaiJimmy/hugo-theme-stack" >}}


