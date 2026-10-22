/**
 * /about 页面数据：项目指标、核心链路、压测结果、作者其它项目。
 * 压测数据由仓库内 k6 场景实测后手动更新（见 mall/k6/scenarios 与 mall-Web/PROGRESS 记录）。
 */

export interface BenchRow {
  scenario: string
  endpoint: string
  source: string
  vus: string
  rps: string
  p95: string
  errorRate: string
}

export const BENCH = {
  measuredAt: '2026-10-22',
  tool: 'k6 v1.7.1',
  env: '公网客户端 → 阿里云 2C2G（Ubuntu 22.04 / Nginx 1.18 / Go 1.25）',
  command: 'k6 run -e SCENARIO=products -e BASE=https://mall.syloe1.xyz/api/v1 k6/scenarios/public_read.js',
  rows: [
    { scenario: '商品列表', endpoint: 'GET /api/v1/products?page=1&page_size=12', source: '公网 k6', vus: '100', rps: '116.9', p95: '724 ms', errorRate: '0.08%' },
    { scenario: '混合只读', endpoint: '列表 + 详情 + 搜索 + 分类', source: '公网 k6', vus: '100', rps: '122.9', p95: '576 ms', errorRate: '0.03%' },
    { scenario: '商品列表', endpoint: 'GET /api/v1/products（含 Nginx）', source: '服务器本机 ab', vus: '100', rps: '255.9', p95: '588 ms', errorRate: '0%' },
    { scenario: '商品搜索', endpoint: 'GET /api/v1/products/search（含 Nginx）', source: '服务器本机 ab', vus: '100', rps: '457.0', p95: '259 ms', errorRate: '0%' },
    { scenario: '商品详情', endpoint: 'GET /api/v1/products/1001（含 Nginx）', source: '服务器本机 ab', vus: '100', rps: '414.3', p95: '381 ms', errorRate: '0%' },
    { scenario: '分类字典', endpoint: 'GET /api/v1/categories（含 Nginx）', source: '服务器本机 ab', vus: '100', rps: '923.2', p95: '213 ms', errorRate: '0%' },
  ] as BenchRow[],
  notes: [
    '公网 k6：客户端 → Cloudflare Tunnel → Nginx → Go → MySQL/Meilisearch，100 VU 爬坡 15s + 稳态 30s，含真实网络与 TLS 开销。',
    '服务器本机 ab：在 2C2G 服务器上压 127.0.0.1（含 Nginx 反向代理），用来衡量服务端自身吞吐上限，没有跨公网损耗。',
    '压测中顺带修掉一个真实问题：Go 连接池 100 × Web/Worker 两个进程打满 MySQL max_connections（Error 1040），下调单进程池到 60、MySQL 上限调到 200 后失败率归零。',
    '只压公开只读接口，不写业务数据；秒杀用并发正确性测试（50 并发抢 10 件不超卖）验证，没有对生产库做抢购压测。',
  ],
}

export const PROJECT_METRICS = [
  { value: '50+', label: 'REST 接口' },
  { value: '15', label: 'MySQL 表' },
  { value: '6', label: '核心链路' },
  { value: '246', label: 'Go 测试函数' },
]

export interface FlowCard {
  icon: string
  title: string
  subtitle: string
  steps: string[]
  points: string[]
}

export const CORE_FLOWS: FlowCard[] = [
  {
    icon: '🔐',
    title: '登录 / 认证',
    subtitle: 'JWT 双 Token + HttpOnly Cookie + jti 吊销',
    steps: [
      '注册：服务端强制密码策略（≥8 位、字母+数字、弱口令黑名单），bcrypt cost 12 落库',
      '登录：限流（IP + 账号 5 次/分钟）→ dummy hash 抹平「用户不存在」时间差 → 统一 401 文案',
      '签发 access token（15 分钟，仅存内存）+ refresh token（7 天，HttpOnly + SameSite=Lax Cookie）',
      '刷新：401 拦截器单飞刷新，rotate refresh token；登出把 jti 写入 Redis 黑名单',
    ],
    points: [
      'token 不落 localStorage：XSS 拿不到持久凭证；Cookie 走 SameSite，避免 CSRF',
      '用户名不可枚举：不存在与密码错误返回同一个 401 与同一句提示',
    ],
  },
  {
    icon: '🛒',
    title: '购物车',
    subtitle: 'Pinia 全局角标 + 服务端勾选态',
    steps: [
      '加购校验：商品在售 + 库存 + 数量上限，返回最新购物车',
      '勾选 / 全选 / 改数量 / 删除 / 清空，全部服务端持久化',
      '前端 Pinia 维护角标数量，跨页面实时同步',
    ],
    points: ['结算页只取「已勾选」项，服务端再校验一次库存，避免前端状态被篡改'],
  },
  {
    icon: '📦',
    title: '下单',
    subtitle: '事务扣库存 + 30 分钟延迟关单',
    steps: [
      '购物车下单 / 立即购买，两种入口复用同一套订单服务',
      '事务内：校验地址 → 校验库存 → 扣减库存 → 写订单 + 订单明细快照 → 清勾选购物车',
      '事务提交后发 RabbitMQ 延迟消息，30 分钟未支付自动取消并回滚库存',
    ],
    points: ['订单明细存商品名/图/价格快照，商品后续改价不影响历史订单'],
  },
  {
    icon: '💳',
    title: '支付',
    subtitle: '幂等支付单 + 余额 AES 加密',
    steps: [
      '创建支付单：订单状态机校验 + 支付单号唯一索引保证幂等',
      '余额支付：支付密码 bcrypt 校验 + 余额 AES 解密 + 事务扣款 + 订单转已支付',
      '模拟支付：仅在 DEMO_MODE 下挂载接口，供演示环境走通闭环',
    ],
    points: ['支付超时/重复点击都不会产生重复扣款：状态机 + 唯一索引 + Redis 锁'],
  },
  {
    icon: '⚡',
    title: '秒杀',
    subtitle: 'Redis Lua 原子扣库存 + MQ 异步落单',
    steps: [
      '活动库存预热进 Redis；抢购时 Lua 脚本原子完成「查重复 → 判断库存 → 扣减 → 记录用户」',
      'Redis 分布式锁防止同一用户并发重复提交，令牌桶限流保护后端',
      '扣减成功投递 MQ 异步创建真实订单；失败回滚 Redis 库存',
      '服务端按 start_at / end_at 实时派生状态（upcoming / running / ended），过期活动返回 410',
    ],
    points: [
      '防超卖：扣库存和判库存在一段 Lua 里，Redis 单线程保证原子性',
      '防重复：用户购买标记 + 数据库唯一索引双保险，MQ 重复投递也幂等',
    ],
  },
  {
    icon: '🔎',
    title: '搜索',
    subtitle: 'Outbox → RabbitMQ → Meilisearch',
    steps: [
      '商品增删改：MySQL 业务表 + product_outboxes 在同一事务写入',
      'Worker 轮询 Outbox 投递 RabbitMQ，消费者写入 Meilisearch 索引',
      '失败重试 3 次后写 product_event_dead_letters（死信表）供后台审计',
      '管理后台可「重建搜索索引」：以 MySQL 为准全量覆盖，修复索引漂移',
    ],
    points: ['搜索不做 MySQL 回退，写入路径简单；索引漂移用对账 + reindex 兜底'],
  },
]

export interface Tradeoff {
  title: string
  problem: string
  decision: string
  cost: string
}

export const TRADEOFFS: Tradeoff[] = [
  {
    title: '事务与消息一致性',
    problem: '订单 / 商品变更要同时落库和发消息，直接发 MQ 会出现「库成功、消息失败」。',
    decision: 'Outbox 表与业务数据同事务写入，Worker 异步投递；失败进死信表，可人工补偿。',
    cost: '最终一致（秒级延迟），不是强一致；用重试 + reindex 对账兜底。',
  },
  {
    title: '秒杀不超卖',
    problem: '高并发的「查库存 → 扣库存」在数据库里会超卖。',
    decision: '库存放 Redis，用 Lua 单脚本原子扣减；落单交给 MQ 削峰。',
    cost: 'Redis 与 MySQL 有短暂不一致窗口，用预扣 + 回滚 + 消费幂等收敛。',
  },
  {
    title: '搜索索引漂移',
    problem: 'MySQL 与 Meilisearch 双写天然会漂移，历史直插数据不在索引里。',
    decision: 'MySQL 是唯一事实源，搜索失败不回退 MySQL；后台提供 reindex 全量重建。',
    cost: '搜索链路多了 Outbox/Worker 两个组件，运维复杂度上升。',
  },
  {
    title: '认证安全基线',
    problem: 'token 存 localStorage 会被 XSS 直接偷走；refresh token 泄漏无法吊销。',
    decision: 'access token 只放内存，refresh token 放 HttpOnly Cookie + jti 黑名单 + 登出吊销。',
    cost: '跨域部署需要 Cookie 配置；同域部署（Nginx 反代）收益最大。',
  },
  {
    title: '演示环境边界',
    problem: '公网演示需要「能走通支付」，但不能留下真实扣款/刷接口风险。',
    decision: 'DEMO_MODE 环境开关控制模拟支付接口是否挂载；演示账号数据每日重置。',
    cost: '演示环境不是生产配置，README 与 /about 都明确标注。',
  },
  {
    title: '商品图',
    problem: '第三方随机图床与商品不符、国内访问不稳定。',
    decision: '商品图自托管为统一风格的本地 SVG 插画（脚本生成，含商品名），不依赖任何第三方图片域名。',
    cost: '不是真实商品摄影图；换成 OSS/R2 真实图只改图片 URL 即可。',
  },
]

export interface OtherProject {
  name: string
  desc: string
  tags: string[]
  url: string
}

export const OTHER_PROJECTS: OtherProject[] = [
  {
    name: 'ReactorNet',
    desc: 'C++11 高性能 Reactor 网络库：epoll 事件循环、线程池、定时器、Buffer 与 TCP 连接管理。',
    tags: ['C++11', 'epoll', 'Reactor', '网络编程'],
    url: 'https://github.com/syloe1/ReactorNet',
  },
  {
    name: 'L_miniob',
    desc: 'MiniOB 数据库内核实验：SQL 解析、执行器、存储引擎与 B+ 树索引。',
    tags: ['C++', '数据库内核', 'B+ 树'],
    url: 'https://github.com/syloe1/L_miniob',
  },
  {
    name: '6.5840',
    desc: 'MIT 6.5840 分布式系统实验：Raft 共识、KV 服务、分片与日志压缩。',
    tags: ['Go', 'Raft', '分布式'],
    url: 'https://github.com/syloe1/6.5840',
  },
  {
    name: 'open_judge',
    desc: '在线判题系统：题目管理、代码编译运行、判题结果回写。',
    tags: ['C++', '在线判题'],
    url: 'https://github.com/syloe1/open_judge',
  },
  {
    name: 'iot',
    desc: 'go-zero 物联网服务练习：设备接入、消息处理与微服务拆分。',
    tags: ['Go', 'go-zero', 'IoT'],
    url: 'https://github.com/syloe1/iot',
  },
  {
    name: 'tutucache',
    desc: 'Go 实现的分布式缓存：一致性哈希、节点间通信与缓存淘汰。',
    tags: ['Go', '分布式缓存'],
    url: 'https://github.com/syloe1/tutucache',
  },
]
