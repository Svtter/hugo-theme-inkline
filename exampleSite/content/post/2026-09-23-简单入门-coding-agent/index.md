---
categories: []
cover: /images/2026/09/23/coding-agent-intro-cover.svg
date: '2026-09-23 10:06:35+08:00'
draft: false
image: /images/2026/09/23/coding-agent-intro-cover.svg
publishDate: '2026-10-09T22:54:00+08:00'
tags: []
title: 简单入门 coding agent
---

> 这篇文章的目标读者是初级工程师和计算机类专业的本科生。

coding agent 不是最近才火起来的，但是不少小伙伴还不知道怎么使用 coding agent。

这里，我写一篇文章，来讲讲如何入门 coding agent。

本文对读者要求：

1. 知道命令行是什么，可以打开终端。
2. 计算机专业背景，工程师。

<!--more-->

coding agent 受到大家的广泛喜爱。很多人被 coding agent 这个名词吓到了，但其实入门其实很容易。现在我比较推荐 [oh-my-pi][1] 和 [kimi code][2] 这两个 coding agent，就以这个 agent 为例，讲讲如何使用。

## 安装

我建议把这个问题直接问 [DeepSeek][3]。例如 [如何安装 omp (oh-my-pi) 和 kimi code][4]。照着命令敲就行了，非常方便。

## 使用

安装完成后，你可以通过使用 `omp` 命令进入 [oh-my-pi][1]，或者输入`kimi web --host`来运行 [kimi code][2]。

我现在比较推荐 [kimi code][2]。因为如果你使用 kimi code 可以有一个图形化界面来操作。你可以把这个命令跑在 Linux 终端上，就可直接在自己的服务器上跑 kimi code 了。所有的命令执行都不会影响你的本地机器，也会从物理上隔离你的数据。

### 在服务器上跑

你可以直接在[腾讯云购买一个轻量应用服务器][5]做这个事情。如果你已经学会使用 Linux 服务器了，我建议你看看我的[这篇文章][6]来调整一下自己的服务器。我认为不做过多配置，就是最好的配置方式。

> PS: Linux 真的不适合 GUI。也就是说，Linux 不适合作为自己的桌面机器。要么使用 Windows，要么 macOS，别给自己找罪受。

## 界面

启动 kimi code 之后，你能看到这样的界面：

![图片](https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/2026/10/09/41120ad0-bc8f-41f3-9bed-3623053211b5.png)

左上角“新建会话”，选择一个合适的目录，就可以开始了。

## 代码控制

不管做什么事情，写论文，还是写项目，都要要求 coding agent 进行 git 初始化。

> [什么是 git？][7]

另外，如果有并行化开发的要求，可以在 AGENTS.md 中写入：

> [什么是 AGENTS.md？][8]

```markdown
在 .worktrees/ 目录下，使用 git worktree 进行开发。不能直接 commit 到 main 分支。
```

## 结语

通过对话，你已经可以自由的开发项目了。

例如，[timeclock][9] 就是一个典型的 vibe coding 项目。你可以用来练手。

实际上的 prompt [只有一句话][10]。

![图片](https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/2026/10/09/8bc05106-1100-4141-89af-c60d7abe0a1e.png)

[1]: https://omp.sh/
[2]: https://www.kimi.com/code/zh
[3]: https://chat.deepseek.com/
[4]: https://chat.deepseek.com/share/11bjyqojteiuwdyb9e
[5]: https://curl.qcloud.com/jJBG1iVX
[6]: https://svtter.cn/p/%E6%88%91%E7%9A%84-linux-%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83-2026/
[7]: https://chat.deepseek.com/share/7o6u10emcevogjrw6i
[8]: https://chat.deepseek.com/share/xwu4tgwcbvlipsjjzu
[9]: https://github.com/Svtter/time-clock
[10]: https://v2ex.com/t/1213437#reply7