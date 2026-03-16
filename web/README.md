# 上海 2021 触发限售楼盘地图

功能目标：查询并展示 2021 年上海触发限售的新盘清单、地理位置与当前二手房挂牌价（可按行政区/价格筛选、地图聚类展示、列表/地图切换）。

## 目录结构
- 本仓库根目录包含 `.trae/specs/`（规格与任务清单）
- `web/` 是实际要部署到 Vercel 的 Next.js 应用

## 本地运行

### 1) 安装依赖

```bash
cd web
npm i
```

### 2) 配置环境变量

复制示例文件并填写：

```bash
cp .env.example .env.local
```

需要的变量：
- `NEXT_PUBLIC_AMAP_KEY`: 高德 JSAPI Key（前端加载地图）
- `AMAP_WEB_SERVICE_KEY`: 高德 WebService Key（用于地址地理编码补坐标）
- `POSTGRES_URL`: Neon/Vercel Postgres 连接串
- `REFRESH_TOKEN`: 刷新任务鉴权 token（用于手动刷新 API）
- `PRICE_FEED_URL`: 挂牌价数据源 URL（JSON 或 CSV，公开可访问）

### 3) 初始化数据库

```bash
npm run db:migrate
```

### 4) 导入楼盘清单（示例）

```bash
npm run import:projects -- --file data/sample-projects-2021.json --year 2021 --geocode
```

### 5) 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000

## 挂牌价数据源（PRICE_FEED_URL）

系统不会尝试绕过登录/付费/反爬来抓取数据。你需要提供一个公开可访问的价格 Feed（建议来源为官方房产平台/权威平台公开页面的整理结果），并在 Feed 中写明来源与更新时间字段。

支持两种格式：

### JSON
数组元素字段：
- `year`（数字，可选，默认 2021）
- `name`（楼盘名）
- `priceCnyPerSqm`（元/㎡，可为 null）
- `priceTotalCny`（可为 null）
- `priceSourceTitle` / `priceSourceUrl`（可为 null）
- `priceUpdatedAt`（ISO 字符串，可为 null）

参考：[data/sample-prices.json](data/sample-prices.json)

### CSV
首行表头（固定）：
`year,name,priceCnyPerSqm,priceTotalCny,priceSourceTitle,priceSourceUrl,priceUpdatedAt`

## 手动刷新价格

页面右上角“刷新价格”会提示输入 `REFRESH_TOKEN`（仅存于本次会话的 sessionStorage），随后调用后端刷新接口更新价格并刷新页面更新时间。

也可用 curl：

```bash
curl -X POST \
  -H "authorization: Bearer $REFRESH_TOKEN" \
  http://localhost:3000/api/jobs/refresh-prices
```

## 部署到 Vercel

1. 推送到 GitHub
2. 在 Vercel 新建项目并选择该仓库
3. 设置 Root Directory 为 `web/`
4. 在 Vercel 配置上述环境变量
5. Cron 已在 [vercel.json](vercel.json) 中配置，默认每天 03:00 UTC 触发 `/api/cron/refresh-prices`

## CLI 查询与导出

```bash
npm run cli -- list --year 2021 --district 浦东新区 --format json
```

导出 CSV：

```bash
npm run cli -- list --year 2021 --format csv > projects.csv
```

## 从网页复制表格到可导入 JSON（不抓包也能用）

如果你只能从网页把表格“整段复制出来”（每个单元格一行），可以：

1. 把复制内容粘贴到 `web/data/fangdi-copy.txt`
2. 运行解析脚本生成 JSON：

```bash
npm run parse:fangdi-copy -- --in data/fangdi-copy.txt --out data/fangdi-copy.json --year 2021
```

3. 再把 JSON 导入数据库（可选 `--geocode` 补经纬度）：

```bash
npm run import:projects -- --file data/fangdi-copy.json --year 2021 --geocode
```
