---
categories:
- DevOps
- 博客
cover: https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/migrated/31a9cfed55fe7ecc.png
date: '2026-06-13 18:29:24+08:00'
series: ["Hugo 博客工程"]
weight: 6
description: 升级到 Hugo 0.163 后 hugo server 起不来，排查发现是新引入的 security.allowContent 安全策略默认拦截了
  content/ 下的 HTML 文件。记录排查过程，以及 allowContent 语义里那个不太直觉的坑。
draft: false
image: https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/migrated/31a9cfed55fe7ecc.png
publishDate: '2026-06-13T18:29:24+08:00'
slug: hugo-0163-升级记录
tags:
- Hugo
- security
- 踩坑
- allowContent
title: Hugo 0.163 升级记录：security.allowContent 拦截了 HTML 内容
---

最近更新了一次主题，不知不觉把 Hugo 也带到了 `v0.163.1`。然后 `hugo server` 就起不来了。

<!--more-->

## 现象

启动直接报错：

```
ERROR ... content/index.html:1:1": access denied: "text/html" is not whitelisted in policy "security.allowContent"
```

首页 `content/index.html`（一个嵌着 GitHub Calendar 的页面）被拒之门外。奇怪的是 markdown 文章一个没受影响。

## 根因

不是主题的锅，是 Hugo 本身。`0.163` 引入了一个新的安全策略 `security.allowContent`，默认配置长这样：

```toml
[security]
  allowContent = ['! ^text/html$']
```

意图是防止 `content/` 目录里混入恶意 HTML（一种 XSS 防护）。`!` 前缀表示 deny 规则。方向是对的，但本站的 HTML 内容页是正经页面，不是攻击向量，于是被误伤了。

## allowContent 的语义挺绕

这部分是最值得记的。我先按官方 security 文档那套 allowlist 的思路去猜，结果几次试错才搞清楚。把几次配置的结果放一起对比就很明显了：

| 配置 | html | markdown |
|------|:----:|:--------:|
| 默认 `['! ^text/html$']` | 拒 | 放行 |
| 空列表 `[]` | 拒 | 放行 |
| `['^text/html$']` | 放行 | 拒 |

据此可以推出几条结论：

- 配置里**没有任何 allow 规则**（只有 `!` deny 规则，或者干脆为空）→ 「默认放行」模式，只拦截命中 deny 的类型；
- 配置里**一旦出现 allow 规则**（不带 `!` 的项）→ 立刻切到「白名单」模式，只有命中的类型才放行，其余全部拒绝；
- `text/html` 还有一条**隐含的内置 deny**，连空列表 `[]` 都清不掉它（所以 `[]` 和默认表现一模一样）。

这就解释了为什么「显式放行 html」(`['^text/html$']`) 反而把 markdown 也一起拒了——它触发了白名单模式。

所以正确的修法是用一条通配 allow 规则：

```toml
[security]
  allowContent = ['.*']
```

`.*` 命中所有类型，html 和 markdown 都放行；而且 allow 规则能压过那条内置的 html deny（实测 `['^text/html$']` 时 html 是能通过的，证明 allow 优先级高于内置 deny）。

> 顺带一提，直接读 `hugo config` 打印出的当前生效配置，是确认这些细节最快的办法，比翻文档靠谱——毕竟官方 security 页面目前根本还没收录 `allowContent` 这个新 key。

## 修复

`config/_default/config.toml` 末尾加上面那段，`hugo server` 恢复正常。

## 更大的坑：content/index.html 让整站文章只剩四分之一

`allowContent` 修完，`hugo server` 确实能起了。但写这篇文章时发现一个**比上面严重得多**的问题——新写的文章死活构建不出来，怎么都不生成独立页面。

排查下来，又是 0.163 的行为变化。项目根目录有个 `content/index.html`（starter 模板自带的，里面嵌了个 GitHub Calendar）。Hugo 一直有条警告：

> Using index.html in your content's root directory is usually incorrect ... your home page will be treated as a leaf bundle, meaning it won't be able to have any child pages or sections.

以前（旧版 Hugo）这条只是警告、不影响构建；**0.163 开始动真格了**——首页一旦是 leaf bundle，整棵 content 树就丢了子页面/子 section。后果很吓人，拿掉这个文件前后对比：

| | 有 content/index.html | 改成 _index.html 后 |
|---|---|---|
| 构建出的文章 | ~106 篇 | **625 篇** |
| 文章 URL | 全跑去 `/post/` | 恢复 `/p/:slug/` |
| 新文章 | 静默吞掉 | 正常 |
| `hugo list all` | 只剩 1 条 | 715 条 |

也就是说，**如果直接拿 0.163 重新部署，站点会凭空消失四分之三的文章，所有旧的 `/p/` 链接全 404**。这个杀伤力比 `allowContent` 大多了，而且 `hugo server` 照样能"启动成功"，不报错，极度隐蔽。

最骚的是，这个 `content/index.html` 里的日历**从来就没在线上首页渲染过**（线上首页是文章列表），它纯粹是个"只搞破坏不干活"的死文件——来自 starter 模板，留着只会埋雷。

修法很简单，二选一：

- `content/index.html` 改名成 `content/_index.html`（变成 branch bundle，不再吞子页面），构建立刻恢复；
- 或者干脆删掉它，效果一样、更干净。

## 另外带出来的两个小问题

排查过程里还冒出来两个，跟安全策略无关：

1. **`hugo --gc` 报 permission denied**。`resources/_gen/` 下的缓存文件是 root 拥有的——大概是之前用 root 或容器跑过一次构建留下的。`sudo chown -R $USER resources/` 归位即可。这玩意儿只影响 `--gc` 的垃圾回收，不影响 `hugo server` 和普通构建。
2. **一批配置弃用警告**（v0.158 起 deprecated）：`languageCode` → `locale`、`languages.*.languageName` → `languages.*.label`、`languages.*.languageDirection` → `languages.*.direction`。现在还是 WARN，未来版本会变成 ERROR。这个我开了个 [issue][1] 跟踪，回头一并改了。

## 小结

这次 0.163 升级踩了两个坑，一个明一个暗：

- **明的**：`security.allowContent` 默认拦 HTML，启动直接报错，反而好发现。加 `allowContent = ['.*']` 解决。
- **暗的**：`content/index.html` 让首页变 leaf bundle，0.163 下静默吞掉四分之三的文章、打乱所有 URL，而 `hugo server` 照样"成功启动"不报错。这个才是真正危险的——要不是我顺手写篇文章发现它构建不出来，直接部署就惨了。

教训：升级 Hugo 大版本后，别光看 `hugo server` 能不能起，**一定要对比一下构建出的文章数量和 URL 结构**有没有变（比如 `find public/p -type d | wc -l`）。`hugo server` 成功 ≠ 站点健康。

至于那些弃用警告（`languageCode` 之类），回头慢慢改，不影响运行。

[1]: https://github.com/Svtter/hugo-blog/issues/72
