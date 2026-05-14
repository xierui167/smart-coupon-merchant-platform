# 智惠券商家服务平台前端

这是牛券后端项目配套的 Vue 3 前端管理台，默认通过 Vite 代理访问 `http://localhost:10010` 的 Spring Boot 后端。

## 启动

```bash
npm install
npm run dev
```

访问：

```text
http://localhost:5173
```

## 核心功能

- 登录与 Token 管理
- 独立登录页，登录或粘贴 Apifox Token 后进入商家后台
- 优惠券模板查询、创建、增发、结束
- 同步领券、异步兑换、兑换结果查询
- 可用/不可用优惠券查询与优惠金额计算
- 锁定、取消锁定、结算核销、退款退还
- 预约提醒与批量发券入口
- 压测指标展示
- 一键演示业务闭环：创建模板 -> 领取券 -> 查询可用券 -> 锁定 -> 取消锁定

## 环境配置

默认配置在 `.env.development`：

```text
VITE_API_BASE_URL=/api
VITE_REQUEST_TIMEOUT=15000
```

`/api` 会由 `vite.config.js` 代理到 `http://localhost:10010`。如果后端端口变化，优先改 `vite.config.js` 的 proxy target。

## 代码结构

```text
src/
  components/   通用展示组件
  config/       前端环境配置
  services/     后端接口封装
  utils/        格式化和表单校验
  App.vue       页面编排和业务流程
```
