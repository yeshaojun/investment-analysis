# 股票查询API文档

## 基础信息

- **基础URL**: `http://localhost:5000/api`
- **数据格式**: JSON
- **字符编码**: UTF-8

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

### 错误响应
```json
{
  "success": false,
  "error": "错误信息",
  "code": "ERROR_CODE"
}
```

## API接口列表

### 1. 健康检查

**接口**: `GET /health`

**描述**: 检查API服务状态

**响应示例**:
```json
{
  "status": "ok",
  "message": "Stock Query API is running"
}
```

### 2. 获取股票基本信息

**接口**: `GET /stock/<symbol>`

**描述**: 获取指定股票的基本信息

**参数**:
- `symbol` (路径参数): 股票代码，如 'AAPL'

**响应示例**:
```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "price": 170.23,
  "change": 2.34,
  "changePercent": 1.39,
  "volume": 45234500,
  "marketCap": 2675000000000,
  "lastUpdated": "2024-02-13T10:30:00.000Z"
}
```

**错误码**:
- `404`: 股票代码不存在
- `400`: 参数错误
- `500`: 服务器内部错误

### 3. 获取股票历史数据

**接口**: `GET /stock/<symbol>/history`

**描述**: 获取指定股票的历史价格数据

**参数**:
- `symbol` (路径参数): 股票代码，如 'AAPL'
- `period` (查询参数): 时间周期，默认 '1mo'
  - 可选值: '1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'
- `interval` (查询参数): 数据间隔，默认 '1d'
  - 可选值: '1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo'

**响应示例**:
```json
{
  "symbol": "AAPL",
  "period": "1mo",
  "interval": "1d",
  "data": [
    {
      "date": "2024-02-13T00:00:00.000Z",
      "open": 168.50,
      "high": 171.20,
      "low": 167.80,
      "close": 170.23,
      "volume": 45234500
    }
  ]
}
```

### 4. 搜索股票

**接口**: `GET /search`

**描述**: 根据关键词搜索股票

**参数**:
- `q` (查询参数): 搜索关键词

**响应示例**:
```json
{
  "results": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc."
    },
    {
      "symbol": "GOOGL",
      "name": "Alphabet Inc."
    }
  ]
}
```

## 数据字段说明

### 股票基本信息字段
- `symbol`: 股票代码
- `name`: 公司名称
- `price`: 当前价格
- `change`: 价格变动
- `changePercent`: 价格变动百分比
- `volume`: 成交量
- `marketCap`: 市值
- `lastUpdated`: 最后更新时间

### 历史数据字段
- `date`: 日期时间
- `open`: 开盘价
- `high`: 最高价
- `low`: 最低价
- `close`: 收盘价
- `volume`: 成交量

## 错误代码表

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |
| 503 | 服务不可用 |

## 使用限制

- Yahoo Finance API有调用频率限制，建议合理使用缓存
- 单次请求历史数据量不要过大
- 建议在前端实现请求缓存机制