# 核心业务链路

## 秒杀领券链路

```mermaid
sequenceDiagram
    participant U as 用户
    participant API as 领券接口
    participant BF as 布隆过滤器
    participant R as Redis + Lua
    participant MQ as RocketMQ
    participant C as 消费者
    participant DB as MySQL

    U->>API: 提交秒杀领券请求
    API->>BF: 校验模板 ID 是否可能存在
    BF-->>API: 通过
    API->>R: Lua 原子校验库存与领取次数
    R-->>API: 预扣成功
    API->>MQ: 发送异步领券消息
    API-->>U: 返回 requestId
    MQ->>C: 消费领券消息
    C->>DB: 条件扣减库存并写入用户券
    C->>R: 写入处理结果
    U->>API: 查询 requestId 处理结果
```

### 解决的问题

- 高并发请求直接打数据库会造成库存扣减压力。
- 用户重复点击可能导致重复领取。
- 接口同步完成数据库写入会增加响应时间。

### 设计要点

- 使用布隆过滤器过滤明显不存在的模板 ID，降低缓存穿透和无效请求压力。
- 使用 Redis Hash 缓存模板库存、状态、有效期等热点字段。
- 使用 Lua 脚本原子完成库存预扣和用户领取次数记录。
- 使用 RocketMQ 异步落库，接口优先返回请求 ID。
- 消费端完成数据库条件扣减、用户券写入、缓存更新和结果回写。

## 预约提醒链路

```mermaid
sequenceDiagram
    participant U as 用户
    participant API as 提醒接口
    participant DB as MySQL
    participant MQ as RocketMQ 延迟消息
    participant C as 提醒消费者

    U->>API: 创建开抢提醒
    API->>DB: 写入提醒记录 Bitmap
    API->>MQ: 发送延迟消息
    MQ->>C: 到达提醒时间
    C-->>U: 触达提醒
```

### 设计要点

- 使用一个 `Long information` 记录提醒类型与提醒时间。
- 通过位运算判断是否已经预约、取消指定提醒位。
- RocketMQ 延迟消息负责到点触发提醒，避免定时任务频繁扫描。

## 批量发券链路

```mermaid
sequenceDiagram
    participant M as 商家
    participant API as 批量任务接口
    participant MQ as RocketMQ
    participant C as 批量发券消费者
    participant Excel as Excel 文件
    participant DB as MySQL
    participant R as Redis

    M->>API: 上传 Excel 用户列表
    API->>DB: 创建批量发券任务
    API->>MQ: 发送任务 ID
    MQ->>C: 消费批量任务
    C->>Excel: EasyExcel 流式读取
    C->>R: 记录处理进度
    C->>DB: 批量判重、批量插入用户券
    C->>DB: 记录失败明细
```

### 设计要点

- 上传接口只负责保存文件和创建任务，避免长时间同步阻塞。
- EasyExcel 流式读取大文件，降低内存压力。
- 以批次为单位处理用户列表，结合 Redis 记录处理进度。
- 对失败用户记录失败原因，为后续重试预留能力。

## 一致性兜底链路

```mermaid
flowchart LR
    DB["MySQL 最终数据"] --> Job["XXL-Job 定时任务"]
    Job --> Redis["Redis 热点缓存"]
    Redis --> API["接口读取"]
```

### 设计要点

- MySQL 作为最终可信数据源。
- Redis 承载高频读取与秒杀热点数据。
- Cache Aside 处理普通缓存读写。
- XXL-Job 定时对异常场景进行补偿，例如库存同步、自动上架、过期失效。
