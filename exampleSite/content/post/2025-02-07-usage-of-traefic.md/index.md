---
title: "Coolify 和 Traefic 结合使用"
description: Traefic 是 Coolify 用于做反向代理的主要软件
date: 2025-02-07T17:14:55+08:00
series: ["自托管与私有云"]
weight: 1
categories: [DevOps, Coolify]
draft: false
tags:
- til
- traefic
- coolify
- docker-compose
---

我使用 coolify 来管理多台服务器；但是 coolify 域名管理有点让人迷惑，我一直没能搞定。今天测试了一下，终于搞明白了。

<!--more-->

例如，如果我要部署一个`myapp`，我的`docker-compose.yml`应该这样写。

```yml
services:
  myapp:
    image: myapp
    ports:
      - '8050:80'
    volumes:
      - './data:/app/data'
    environment:
      - NODE_ENV=production
      - 'APP_PORT=${APP_PORT_IN_UI}'
      - 'PORT=${PORT_IN_UI:-80} volumes:'
      - '${COOLIFY_VOLUME_MYAPP}:/app/data'
    labels:
      - coolify.managed=true
      - traefik.enable=true
      - traefik.http.routers.myapp.rule=Host(`example.myapp.com`)
      - 'traefik.http.routers.myapp.entrypoints=http,https'
```

- `80`是`myapp`内部的`port`，域名用`example.myapp.com`

如此配置，就可以使用域名了。
