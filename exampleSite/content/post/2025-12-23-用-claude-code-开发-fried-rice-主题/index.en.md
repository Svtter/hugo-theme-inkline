---
title: Developing Fried Rice Theme with Claude Code
date: 2025-12-23T15:00:00+08:00
draft: false
image: https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/migrated/304e19fa6090ca88.png
tags:
    - claude code
    - hugo
    - open source
    - coding agent
categories:
    - coding
description: Recording the experience of developing Hugo blog theme with Claude Code
publishDate: 2025-12-23T15:25:02.779910476+08:00
---


Recently, I used Claude Code to add some SEO features to my own blog theme [Fried Rice](https://github.com/Svtter/Fried-Rice), and the overall experience was quite good.

## Background

Fried Rice is a theme forked from [hugo-theme-stack](https://github.com/CaiJimmy/hugo-theme-stack). Previously, I had already added some basic JSON-LD structured data, and this time I wanted to continue improving it.

## What Was Done This Time

Mainly enhancing SEO structured data:

- WebSite schema (supports search action)
- Organization schema (includes founder, contact point, address)
- FAQ schema (supports inline FAQ in articles)
- Enhanced Article/BlogPosting schema (added accessibility metadata)

![Fried Rice Theme Preview](https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/migrated/e4e99b0723f6cc84.png)

## Claude Code's Performance

The entire development process took about 2 hours. Claude Code helped me:

1. **Write code** - Hugo template syntax is cumbersome, letting AI write it saves a lot of effort
2. **Review code** - After I committed, I asked it to check, and it found several issues:
   - `datePublished` was defined 3 times
   - `founder` object was defined repeatedly
   - JSON output had double escaping issues
   - Variable scope errors
3. **Fix issues** - After finding issues, I asked it to fix them directly, all fixed at once
4. **Create PR, tag, write CHANGELOG** - These trivial tasks can also be done

A pleasant surprise was that it could find logical issues in the code. For example, Hugo's `jsonify` output was HTML-escaped causing JSON format errors, and it found the correct solution (using `safeJS`).

## Shortcomings

- Sometimes needs multiple reminders to use the correct tools
- Not very familiar with Hugo template syntax in some places, needs several iterations

## Summary

For this kind of "add feature + fix bug" task, Claude Code is quite useful. Especially for tedious syntax like Hugo templates, having AI write it is much more efficient.

## Related Projects

{{< repo-card repo="Svtter/Fried-Rice" >}}

**Based on:**

{{< repo-card repo="CaiJimmy/hugo-theme-stack" >}}


