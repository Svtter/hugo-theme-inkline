---
title: "Hugo Admin - A Lightweight Hugo Blog Management Interface"
date: 2025-12-23T16:00:00+08:00
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

When managing a Hugo blog, you often need to switch back and forth between the terminal and editor. To simplify this process, I developed [hugo-admin](https://github.com/Svtter/hugo-admin), a lightweight web management interface based on Flask.

<!--more-->

## Why It's Needed

The typical workflow for writing Hugo blogs is:

1. Execute `hugo new post/xxx.md` in terminal
2. Open the file with an editor to write content
3. Start `hugo server` in terminal to preview
4. Switch to browser to check the effect
5. If not satisfied, return to editor to modify

This workflow is fine, but it would be more convenient if all operations could be completed in one place.

## Main Features

hugo-admin provides the following features:

- **Dashboard**: Blog statistics overview
- **Article Management**: Browse, search, filter articles
- **Markdown Editor**: Online editing with auto-save support
- **Hugo Server Control**: Start/stop server, view logs in real-time
- **Image Management**: Upload and manage article images

## Interface Display

![hugo-admin interface](https://pub-7004adda461c45dfaa1f3ec95693b444.r2.dev/images/migrated/df87673bbf87e083.png)

## Tech Stack

Backend uses Flask + Flask-SocketIO, frontend uses Tailwind CSS + Alpine.js. Real-time log pushing is implemented based on WebSocket.

```
hugo-admin/
├── app.py                 # Flask application
├── services/              # Business logic layer
│   ├── hugo_service.py    # Hugo server management
│   ├── post_service.py    # Article operations
│   └── cache_service.py   # Cache layer
├── templates/             # Jinja2 templates
└── static/                # Static resources
```

## Installation and Usage

```bash
# Clone repository
git clone https://github.com/Svtter/hugo-admin.git
cd hugo-admin

# Install dependencies
pip install -r requirements.txt

# Configure Hugo directory
cp config.py config_local.py
# Edit config_local.py to set HUGO_ROOT

# Start
python app.py
```

After starting, visit `http://127.0.0.1:5000`.

## Core Implementation

The Python version uses SQLite for caching to avoid scanning the file system every time:

```python
post_service = PostService(app.config['CONTENT_DIR'], use_cache=True)
```

Hugo server control manages processes based on psutil, supporting real-time log pushing:

```python
hugo_manager = HugoServerManager(app.config['HUGO_ROOT'], socketio)
```

## Advanced Version

Besides the open-source Python version, I also developed a Go language implementation of the advanced version. Compared to the open-source version, the Go version has the following advantages:

- **Higher performance**: Compiled Go language executes more efficiently
- **Lower resource usage**: Less memory and CPU usage
- **Single file deployment**: Compiled into a single executable file, no need for dependency environment
- **More features**: Includes more advanced features
- **Direct Hugo API usage**: No need for SQLite3 cache, directly calls Hugo API to get article information, more lightweight and efficient

The advanced version is priced at $10 USD. [Click here to purchase](https://ko-fi.com/s/57009bf884) to get complete source code. If you have higher requirements for performance and deployment convenience, consider the advanced version.

## Future Plans

- Git operations interface
- Batch operation support
- Docker deployment

The project is open source, welcome to Star and PR.

{{< repo-card repo="Svtter/hugo-admin" >}}
