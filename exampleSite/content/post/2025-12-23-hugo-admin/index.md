---
title: "Hugo Admin - 轻量级 Hugo 博客管理界面"
date: 2025-12-23T16:00:00+08:00
series: ["Hugo 博客工程"]
weight: 4
categories:
- DevOps
tags:
- hugo
- python
- flask
- 博客
image: https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/migrated/403bf08a102d9151.png
draft: false
---

管理 Hugo 博客时，常常需要在终端和编辑器之间来回切换。为了简化这个流程，我开发了 [hugo-admin](https://github.com/Svtter/hugo-admin)，一个基于 Flask 的轻量级 Web 管理界面。

<!--more-->

## 为什么需要它

使用 Hugo 写博客的流程通常是这样的：

1. 终端执行 `hugo new post/xxx.md`
2. 用编辑器打开文件写内容
3. 终端启动 `hugo server` 预览
4. 切换浏览器查看效果
5. 不满意就回到编辑器修改

这个流程没什么问题，但如果能在一个地方完成所有操作，会更方便。

## 主要功能

hugo-admin 提供了以下功能：

- **仪表板**: 博客统计信息概览
- **文章管理**: 浏览、搜索、筛选文章
- **Markdown 编辑器**: 在线编辑，支持自动保存
- **Hugo 服务器控制**: 启停服务器，实时查看日志
- **图片管理**: 上传和管理文章图片

## 界面展示

![hugo-admin 界面](https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/migrated/df87673bbf87e083.png)

## 技术栈

后端使用 Flask + Flask-SocketIO，前端使用 Tailwind CSS + Alpine.js。实时日志推送基于 WebSocket 实现。

```
hugo-admin/
├── app.py                 # Flask 应用
├── services/              # 业务逻辑层
│   ├── hugo_service.py    # Hugo 服务器管理
│   ├── post_service.py    # 文章操作
│   └── cache_service.py   # 缓存层
├── templates/             # Jinja2 模板
└── static/                # 静态资源
```

## 安装使用

```bash
# 克隆仓库
git clone https://github.com/Svtter/hugo-admin.git
cd hugo-admin

# 安装依赖
pip install -r requirements.txt

# 配置 Hugo 目录
cp config.py config_local.py
# 编辑 config_local.py 设置 HUGO_ROOT

# 启动
python app.py
```

启动后访问 `http://127.0.0.1:5000` 即可。

## 核心实现

Python 版本使用 SQLite 做缓存，避免每次都扫描文件系统：

```python
post_service = PostService(app.config['CONTENT_DIR'], use_cache=True)
```

Hugo 服务器控制基于 psutil 管理进程，支持实时日志推送：

```python
hugo_manager = HugoServerManager(app.config['HUGO_ROOT'], socketio)
```

## 高级版本

除了开源的 Python 版本，我还开发了一个 Go 语言实现的高级版本。相比开源版本，Go 版本具有以下优势：

- **更高性能**: Go 语言编译后执行效率更高
- **更低资源占用**: 内存占用和 CPU 使用更少
- **单文件部署**: 编译后为单个可执行文件，无需依赖环境
- **更多功能**: 包含更多高级特性
- **直接使用 Hugo API**: 无需 SQLite3 缓存，直接调用 Hugo API 获取文章信息，更轻量高效

高级版本售价 $10 美元，[点击这里购买](https://ko-fi.com/s/57009bf884)后会提供完整源代码。如果你对性能和部署便利性有更高要求，可以考虑高级版本。

## 后续计划

- Git 操作界面
- 批量操作支持
- Docker 部署

项目开源，欢迎 Star 和 PR。

{{< repo-card repo="Svtter/hugo-admin" >}}
