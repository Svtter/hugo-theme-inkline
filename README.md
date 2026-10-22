**简体中文** | [English](README.en.md)

# 墨线 Inkline

终端工程感 × 中文期刊排版的 Hugo 博客主题。为 [svtter.cn](https://svtter.cn) 设计，也可用于任何以中文长文为主的个人博客。

![首页（浅色）](docs/screenshots/home-light.png)

| 深色首页 | 文章页 | 相关文章与评论 |
|---|---|---|
| ![深色首页](docs/screenshots/home-dark.png) | ![文章页](docs/screenshots/article.png) | ![评论区](docs/screenshots/article-comments.png) |

| 移动端首页 | 移动端文章 | 归档 | 系列页 |
|---|---|---|---|
| ![移动端首页](docs/screenshots/home-mobile.png) | ![移动端文章](docs/screenshots/article-mobile.png) | ![归档](docs/screenshots/archives.png) | ![系列页](docs/screenshots/series.png) |

## 特性

**双层字体系统** —— 衬线（Noto Serif SC）承载标题与正文，等宽（JetBrains Mono）承载一切元数据（日期、编号、分类、统计），工程师与写作者两种气质叠加。

- 深浅双主题：跟随系统、手动切换并记忆
- **全局三档字号**（小 / 中 / 大）：rem 根字号缩放，全站排版等比变化，选择记忆
- **客户端全文搜索**：`/` 或 `⌘K` 呼出，基于首页 JSON 输出，无后端依赖
- **连载系列**：首页系列卡片、文章页系列目录（第 N / M 篇高亮）、上/下一篇
- **相关文章**（Hugo Related）+ utterances 评论位
- 归档页：按年分组 + 侧栏年度贡献柱状图
- **GitHub 贡献日历**侧栏卡片（jogruber API + 主题色阶自渲染，无第三方库）
- Carbon Ads 位（配置后渲染，未配置零输出）
- Shortcode：`article-card` / `repo-card`（GitHub 实时数据卡，跟随主题深浅色）/ `social-card` / `wechat-card` / `pdf`
- 多语言界面文案（`i18n/zh-cn.toml` + `i18n/en.toml`）
- 响应式：390px 起步到桌面全覆盖，零横向溢出（经过 84 组页面×视口×主题组合的自动化视觉审计）
- vim statusline 式页脚

## 要求

- Hugo **≥ 0.120**（使用了 `.Fragments`、Related 等）

## 安装

```bash
# 方式一：Git submodule
git submodule add https://github.com/Svtter/hugo-theme-inkline.git themes/hugo-theme-inkline
# 站点配置 theme = "hugo-theme-inkline"

# 方式二：Hugo Modules
# [module]
#   [[module.imports]]
#     path = "github.com/Svtter/hugo-theme-inkline"
```

## 站点参数（params）

```toml
description = "专注于编程技术、机器学习和开发工具。"
motto = "在你想要放弃的时候，想想你为什么开始"   # Hero 大字
bio = "…"
avatar = "https://github.com/Svtter.png"
name = "Svtter"
handle = "@svtter · svtter.cn"
since = 2014
license = "CC BY-NC-SA 4.0"
topics = ["编程", "机器学习", "开发工具"]        # Hero 话题胶囊
favicon = "/favicon.png"

[social]
github = "https://github.com/svtter"

[newsletter]
label = "订阅以获取最新文章更新，第一时间送达你的邮箱"
action = ""                       # 表单提交地址，留空仅展示

[github_calendar]
enable = true
username = "svtter"

[utterances]
repo = "Svtter/svtter.github.io"
label = "blog"

[carbon]
# serve = "CK7I6237"              # 配置后侧栏与文章页渲染 Carbon Ads
# placement = "your-placement"
```

文章 frontmatter：`cover` / `image`（完整 URL、站点绝对路径或页面包裸文件名均可）、`series` + `weight`（系列序）、`description`（导语）。

## 站点配置要点

```toml
defaultContentLanguage = "zh-cn"
hasCJKLanguage = true

[outputs]
home = ["HTML", "RSS", "JSON"]    # JSON 供全文搜索

[markup]
  [markup.highlight]
    noClasses = true
    style = "monokai"
  [markup.goldmark.renderer]
    unsafe = true                 # 文章内嵌 raw HTML（如 SVG 图表）

[pagination]
pagerSize = 10

[taxonomies]
series = "series"
tag = "tags"
category = "categories"
```

导航：页面 frontmatter 的 `menu` 声明与站点配置 `[[menus.main]]` 会自动合并，按 `weight` 排序。

## 本地预览

```bash
hugo server --source exampleSite --themesDir ../..
```

exampleSite 使用真实博客数据，包含 repo-card / pdf 等 shortcode 演示。

## 目录结构

```
layouts/          模板（home / single / list / terms / archives / 404 / 渲染钩子）
assets/css/main.css   全部样式（rem 化，根字号驱动三档缩放）
assets/js/            main.js（主题/字号/搜索/日历/scrollspy）+ repo-card.js
i18n/             界面文案（zh-cn / en）
exampleSite/      示例站点
```

## 已知限制

- 日历数据依赖 `github-contributions-api.jogruber.de`（失败自动重试一次，仍失败显示兜底文案）
- utterances 评论框固定浅色（未随主题切换）
- 搜索索引为全量 JSON，文章数千篇后建议换服务端方案

## License

MIT
