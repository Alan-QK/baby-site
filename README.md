# baby-site

个人 GitHub Pages 主页仓库。

## 主页地址

- 预期访问链接：`https://alan-qk.github.io/baby-site/`

## 部署方式

仓库内置了 GitHub Actions 工作流（`.github/workflows/deploy-pages.yml`）：

1. 推送到 `main` 分支后自动触发部署。
2. 工作流会将 `site/` 目录发布到 GitHub Pages。

## 本地预览

在 `site/` 目录下使用任意静态服务器进行预览，例如：

```bash
python -m http.server 8080 --directory site
```
