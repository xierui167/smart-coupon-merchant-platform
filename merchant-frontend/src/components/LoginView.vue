<script setup>
import { Activity, KeyRound, LogIn, ShieldCheck, Ticket, WalletCards } from 'lucide-vue-next';

defineProps({
  auth: {
    type: Object,
    required: true
  },
  notice: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  lastLatency: {
    type: Number,
    default: null
  }
});

defineEmits(['login', 'enter-with-token']);

const capabilityItems = [
  { icon: Ticket, title: '模板管理', desc: '创建、增发、结束优惠券模板' },
  { icon: WalletCards, title: '领券兑换', desc: '同步领取与异步兑换结果查询' },
  { icon: ShieldCheck, title: '结算闭环', desc: '查询、锁定、取消、核销与退款' }
];
</script>

<template>
  <main class="login-page">
    <section class="login-shell">
      <div class="login-panel">
        <div class="login-brand">
          <div class="brand-mark">
            <Ticket :size="24" />
          </div>
          <div>
            <p class="eyebrow">oneCoupon Merchant Console</p>
            <h1>智惠券商家服务平台</h1>
          </div>
        </div>

        <div class="login-title">
          <h2>商家账号登录</h2>
          <span :class="['notice', notice.type]">{{ notice.text }}</span>
        </div>

        <div class="login-form">
          <label>
            <span>用户名</span>
            <input v-model="auth.username" autocomplete="username" placeholder="商户账号" />
          </label>
          <label>
            <span>密码</span>
            <input v-model="auth.password" autocomplete="current-password" placeholder="登录密码" type="password" />
          </label>
          <label>
            <span>Token</span>
            <input v-model="auth.token" placeholder="登录后自动写入，也可以粘贴 Apifox token" />
          </label>
        </div>

        <div class="login-actions">
          <button class="primary" type="button" @click="$emit('login')" :disabled="loading">
            <LogIn :size="16" />
            登录进入
          </button>
          <button type="button" @click="$emit('enter-with-token')" :disabled="loading">
            <KeyRound :size="16" />
            使用 Token 进入
          </button>
        </div>

        <div class="login-hint">
          <span class="dot ok"></span>
          <strong>后端代理 /api -> 10010</strong>
          <span v-if="lastLatency !== null">{{ lastLatency }}ms</span>
        </div>
      </div>

      <aside class="login-aside">
        <div>
          <p class="eyebrow">Interview Demo Ready</p>
          <h2>围绕商家端核心链路做展示</h2>
          <p class="muted-text">登录后进入后台，可以继续演示模板、领券、结算、预约与批量任务。</p>
        </div>

        <div class="login-metrics">
          <div>
            <strong>0%</strong>
            <span>查询错误率</span>
          </div>
          <div>
            <strong>103.95ms</strong>
            <span>P99 延迟</span>
          </div>
          <div>
            <strong>30/30</strong>
            <span>锁定取消闭环</span>
          </div>
        </div>

        <div class="login-capabilities">
          <article v-for="item in capabilityItems" :key="item.title">
            <component :is="item.icon" :size="18" />
            <div>
              <strong>{{ item.title }}</strong>
              <span>{{ item.desc }}</span>
            </div>
          </article>
        </div>

        <div class="login-footnote">
          <Activity :size="16" />
          <span>用于本地接口联调、压测数据展示和面试演示。</span>
        </div>
      </aside>
    </section>
  </main>
</template>
