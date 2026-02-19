# 股票信息查询系统

基于Next.js前端和Python后端的股票信息查询系统。

## 技术栈

- **前端**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **后端**: Python Flask, yfinance
- **数据库**: SQLite
- **数据源**: Yahoo Finance API

## 项目结构

```
├── frontend/           # Next.js前端应用
│   ├── components/    # React组件
│   ├── pages/         # 页面组件
│   ├── lib/          # 工具库
│   ├── styles/       # 样式文件
│   └── public/       # 静态资源
├── backend/           # Flask后端应用
│   ├── app/          # Flask应用主文件
│   ├── api/          # API路由
│   ├── models/       # 数据模型
│   ├── utils/        # 工具函数
│   └── config/       # 配置文件
├── data/             # 数据存储
├── docs/             # 项目文档
└── scripts/          # 脚本文件
```

## 快速开始

### 1. 安装依赖

```bash
npm run install:all
```

### 2. 启动开发服务器

```bash
npm run dev
```

这将同时启动前端(localhost:3000)和后端(localhost:5000)服务器。

### 3. 构建生产版本

```bash
npm run build
npm start
```

## 开发指南

### 前端开发

```bash
cd frontend
npm run dev
```

### 后端开发

```bash
cd backend
python app.py
```

## API文档

后端API文档请参考 [docs/api/README.md](docs/api/README.md)

## 部署指南

部署指南请参考 [docs/deployment/README.md](docs/deployment/README.md)

## 许可证

MIT License