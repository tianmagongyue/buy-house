# Tasks

- [x] Task 1: 初始化 Git + Next.js 项目骨架并可在 Vercel 部署
  - [x] 创建 Next.js + TypeScript 工程与基础页面路由
  - [x] 配置环境变量模板（地图 Key、数据源配置、数据库连接）
  - [x] 验证本地开发与 Vercel 构建通过

- [x] Task 2: 设计并落地数据模型与存储层（含溯源字段）
  - [x] 定义楼盘数据结构（含 source / priceSource / updatedAt 等字段）
  - [x] 选择并接入 Vercel 友好的持久化方案（如 Postgres）
  - [x] 提供数据迁移/初始化方案

- [x] Task 3: 实现数据导入与坐标补全流水线（CLI + API）
  - [x] CLI：导入 2021 限售楼盘清单（JSON/CSV）
  - [x] 地理编码：对缺失经纬度的记录补全并写回
  - [x] 校验：去重、字段完整性检查、导入报告输出

- [x] Task 4: 实现“挂牌价”数据接入层与刷新机制
  - [x] 定义可插拔的价格 Provider 接口（支持不同来源与替换）
  - [x] 实现至少一种可公开访问的数据抓取/读取方式，并记录溯源字段
  - [x] 提供手动刷新 API（含限流/鉴权策略，避免公开滥用）

- [x] Task 5: 实现查询 API（筛选/搜索/分页）与更新时间聚合
  - [x] GET /api/projects：支持 year/district/priceRange/q/page/pageSize
  - [x] GET /api/projects/:id：返回详情
  - [x] GET /api/meta：返回数据最后更新时间与统计信息

- [x] Task 6: 实现地图 + 列表双视图 UI（聚类 + 交互）
  - [x] 地图：标记点、聚类、点击弹窗详情
  - [x] 列表：分页/懒加载、点击联动地图聚焦
  - [x] 交互：搜索框、行政区与价格筛选、视图切换、加载态
  - [x] 响应式布局（移动端优先）

- [x] Task 7: 实现定期自动更新（Vercel Cron）与可观测性
  - [x] 定时任务：刷新价格并更新 priceUpdatedAt
  - [x] 失败重试与错误记录（不包含密钥/隐私数据）

- [x] Task 8: 验证与交付（基础测试 + 使用文档）
  - [x] 为筛选/搜索/分页与核心数据转换添加单元测试
  - [x] 编写 README：数据导入、环境变量、部署到 Vercel、CLI 用法

# Task Dependencies
- Task 3 depends on Task 2
- Task 4 depends on Task 2
- Task 5 depends on Task 2
- Task 6 depends on Task 5
- Task 7 depends on Task 4
- Task 8 depends on Task 1, Task 3, Task 6, Task 7
