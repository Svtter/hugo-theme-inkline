# 墨线 Inkline

终端工程感 × 中文期刊排版的 Hugo 博客主题。为 [svtter.cn](https://svtter.cn) 设计：

- **双层字体系统**——衬线（Noto Serif SC）承载内容，等宽（JetBrains Mono）承载元数据
- **深浅双主题**，跟随系统、手动切换并记忆
- **全局三档字号**（小 / 中 / 大），根字号缩放，全站排版等比变化
- **客户端全文搜索**（home JSON 输出 + 前端过滤）
- **连载系列**：首页系列卡片、文章页系列目录（第 N 部分）、上/下一篇
- **相关文章**（Hugo Related）、归档年度柱状图、utterances 评论位
- vim statusline 式页脚

## 使用

```bash
# 站点配置
theme = "inkline"

# 或以模块引入
# [module]
#   [[module.imports]]
#     path = "github.com/Svtter/hugo-theme-inkline"
```

### 站点参数（params.toml）

```toml
description = "专注于编程技术、机器学习和开发工具。"
motto = "在你想要放弃的时候，想想你为什么开始"
bio = "…"
avatar = "https://github.com/Svtter.png"
handle = "@svtter · svtter.cn"
topics = ["编程", "机器学习", "开发工具"]
since = 2014
license = "CC BY-NC-SA 4.0"

[newsletter]
  action = ""          # 表单提交地址，留空则仅展示
  label = "订阅以获取最新文章更新，第一时间送达你的邮箱"

[social]
  github = "https://github.com/svtter"

[utterances]
  repo = "Svtter/svtter.github.io"
  label = "blog"
```

### 菜单 / 输出

- 导航来自 `menus.main`，建议：文章 `/post/`、系列 `/series/`、分类 `/categories/`、归档（`layout: archives` 的页面）、模型、链接、咨询、关于
- 首页需 JSON 输出供搜索使用：`[outputs] home = ["HTML", "RSS", "JSON"]`
- 文章 frontmatter 支持 `cover` / `image`（字符串或 Stack 兼容的 map）、`series` + `weight`（系列序）、`description`

## 本地预览

```bash
hugo server --source exampleSite --themesDir ../..
```

## 结构

```
layouts/          模板（home / single / list / terms / archives / 404）
assets/css/main.css   全部样式（rem 化，根字号驱动三档缩放）
assets/js/main.js     主题切换、字号、搜索、TOC scrollspy
exampleSite/      示例站点（真实文章数据）
```

## 多语言

- 界面文案：`i18n/zh-cn.toml` + `i18n/en.toml`，按站点语言自动切换（占位/统计/系列/评论等全部走 i18n）
- 语言在站点 `languages` 配置中定义即可；菜单建议按语言分别配置

## Shortcodes

`article-card`、`repo-card`（GitHub API 实时拉取，跟随主题深浅色）、`social-card`、`wechat-card`、`pdf` 均已内置，与旧博客用法一致。
