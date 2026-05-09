# 接口与演示闭环

以下接口用于说明项目业务闭环，不包含完整源码实现。

## 登录与用户

| 操作 | 接口 | 说明 |
| --- | --- | --- |
| 账号密码登录 | `POST /api/v1/auth/login` | 获取 Sa-Token 登录 token |
| 查询登录用户 | `GET /api/v1/auth/userInfo` | 确认当前用户和商户身份 |

请求头示例：

```text
coupon: coupon <登录返回的 token>
```

## 优惠券模板

| 操作 | 接口 | 说明 |
| --- | --- | --- |
| 创建模板 | `POST /api/v1/coupon/templates` | 创建优惠券模板，包含库存、有效期和领取规则 |
| 查询模板 | `GET /api/v1/coupon/templates?pageNum=1&pageSize=10` | 查询当前商户下的模板 |
| 增加库存 | `POST /api/v1/coupon/templates/increase-stock` | 活动期间追加库存 |
| 结束模板 | `POST /api/v1/coupon/templates/terminate/{templateId}` | 提前结束模板 |

## 预约提醒

| 操作 | 接口 | 说明 |
| --- | --- | --- |
| 创建提醒 | `POST /api/v1/coupon/templates/remind` | 创建开抢提醒 |
| 查询提醒 | `GET /api/v1/coupon/templates/remind?pageNum=1&pageSize=10` | 查询当前用户提醒记录 |
| 取消提醒 | `POST /api/v1/coupon/templates/remind/cancel` | 取消指定提醒类型和提醒时间 |

## 领券

| 操作 | 接口 | 说明 |
| --- | --- | --- |
| 同步领券 | `POST /api/v1/coupon/receive/{templateId}` | 基础领券链路 |
| 异步领券 | `POST /api/v1/coupon/receive/v2/{templateId}` | 秒杀场景下提交异步领券请求 |
| 查询异步结果 | `GET /api/v1/coupon/receive/v2/result/{requestId}` | 查询异步处理状态 |

## 批量发券

| 操作 | 接口 | 说明 |
| --- | --- | --- |
| 创建批量任务 | `POST /api/v1/coupon/distribution-tasks` | 上传 Excel 用户列表并创建异步发券任务 |

`form-data` 示例：

```text
taskName: 五一活动批量发券
templateId: 1
file: 用户 ID Excel 文件
```

## 演示建议

建议面试前保存一组 Apifox 或 Postman 请求记录，按照下面顺序演示：

1. 登录获取 token。
2. 创建优惠券模板。
3. 查询模板，确认商户隔离。
4. 创建预约提醒，再取消提醒。
5. 调用异步领券接口，拿到 requestId。
6. 查询异步领券结果。
7. 上传 Excel 创建批量发券任务。
8. 说明 XXL-Job 如何做状态和库存兜底。
