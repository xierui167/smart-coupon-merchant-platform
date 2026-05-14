<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import {
  Activity,
  Bell,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Coins,
  FileSpreadsheet,
  Gauge,
  Layers3,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Ticket,
  UnlockKeyhole,
  WalletCards
} from 'lucide-vue-next';
import DataTable from './components/DataTable.vue';
import LoginView from './components/LoginView.vue';
import MetricCard from './components/MetricCard.vue';
import { API_BASE_URL } from './config/env';
import { merchantApi } from './services/merchantApi';
import { normalizeToken } from './services/http';
import {
  assertValid,
  validateBatchTask,
  validateLogin,
  validateRemind,
  validateSettlementKey,
  validateSettlementMutation,
  validateSettlementQuery,
  validateStock,
  validateTemplate,
  validateTemplateId
} from './utils/validators';
import { buildOrderId, couponTypeText, formatDateTime, money, templateStatusText } from './utils/format';

const navItems = [
  { id: 'overview', label: '总览', icon: Gauge },
  { id: 'templates', label: '模板管理', icon: Ticket, auth: true },
  { id: 'coupons', label: '领券兑换', icon: WalletCards, auth: true },
  { id: 'settlement', label: '结算中心', icon: Coins, auth: true },
  { id: 'operations', label: '预约与批量', icon: Boxes, auth: true },
  { id: 'response', label: '接口响应', icon: ClipboardCheck }
];

const templateColumns = [
  { key: 'id', label: 'ID', width: '78px' },
  { key: 'templateName', label: '模板名称' },
  { key: 'couponType', label: '类型', width: '92px' },
  { key: 'stock', label: '库存', width: '90px' },
  { key: 'status', label: '状态', width: '96px' },
  { key: 'validEndTime', label: '有效期', width: '180px' },
  { key: 'action', label: '操作', width: '160px' }
];

const activeNav = ref('overview');
const loading = ref(false);
const demoRunning = ref(false);
const notice = reactive({ type: 'muted', text: '等待操作' });
const lastResponse = ref(null);
const lastLatency = ref(null);
const templates = ref([]);
const settlementResult = ref(null);
const redeemResult = ref(null);
const remindResult = ref(null);
const selectedUserCouponId = ref('');
const selectedTemplateId = ref('');
const templateSearch = ref('');

const auth = reactive({
  username: '',
  password: '',
  token: localStorage.getItem('coupon-token') || '',
  userInfo: null
});
const isMainVisible = ref(Boolean(auth.token));

const templateQuery = reactive({ pageNum: 1, pageSize: 10 });
const templateForm = reactive({
  templateName: `前端演示券${new Date().getMonth() + 1}${new Date().getDate()}`,
  couponType: 1,
  stock: 100,
  limitPerPerson: 1,
  usageInstructions: '前端管理台创建',
  termsOfUse: 10,
  discountRate: '',
  maximumDiscountAmount: 1,
  explanationOfConditions: '订单金额不足，暂不可用',
  validStartTime: formatDateTime(new Date()),
  validEndTime: formatDateTime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
});

const stockForm = reactive({ templateId: '', addNumber: 100 });
const receiveForm = reactive({ templateId: '', requestId: '' });
const oldVerifyForm = reactive({ userCouponId: '' });
const settlementForm = reactive({
  orderId: buildOrderId(),
  userCouponId: '',
  orderAmount: 100,
  payableAmount: 99,
  merchantId: 1,
  goodsNumber: '001',
  goodsAmount: 100
});
const remindForm = reactive({ templateId: '', type: 0, remindTime: 5 });
const batchForm = reactive({ taskName: '前端批量发券任务', templateId: '', file: null });

const performanceMetrics = [
  { label: '持续压测请求数', value: '22338', desc: '100 并发 / 10 秒' },
  { label: '查询错误率', value: '0%', desc: '结算查询接口' },
  { label: 'P95 延迟', value: '58.82ms', desc: '本地环境实测' },
  { label: 'P99 延迟', value: '103.95ms', desc: '本地环境实测' },
  { label: '锁定取消闭环', value: '30/30', desc: '成功率 100%' }
];

const pressureReport = [
  { label: '测试目标', value: '优惠券结算查询、锁定与取消闭环' },
  { label: '测试方式', value: 'JMeter 本地压测，100 并发，持续 10 秒' },
  { label: '核心结论', value: '查询链路 0 错误率，P99 约 103.95ms，锁定取消闭环 30/30 通过' },
  { label: '适用说明', value: '用于面试展示和本地性能佐证，不等同于生产容量结论' }
];

const demoSteps = reactive([
  { id: 'create', label: '创建优惠券模板', status: 'pending' },
  { id: 'receive', label: '领取/兑换优惠券', status: 'pending' },
  { id: 'query', label: '查询可用券并计算金额', status: 'pending' },
  { id: 'lock', label: '锁定优惠券', status: 'pending' },
  { id: 'cancel', label: '取消锁定恢复优惠券', status: 'pending' }
]);

const hasToken = computed(() => Boolean(normalizeToken(auth.token)));
const availableCoupons = computed(() => settlementResult.value?.availableCouponList || []);
const notAvailableCoupons = computed(() => settlementResult.value?.notAvailableCouponList || []);
const templateRecords = computed(() => {
  const data = templates.value;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.data?.records)) return data.data.records;
  return [];
});
const filteredTemplateRecords = computed(() => {
  const keyword = templateSearch.value.trim().toLowerCase();
  if (!keyword) return templateRecords.value;
  return templateRecords.value.filter((item) =>
    [item.id, item.templateName, couponTypeText(item.couponType), templateStatusText(item.status)]
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  );
});

function setNotice(type, text) {
  notice.type = type;
  notice.text = text;
}

function persistToken(token) {
  auth.token = token || '';
  if (auth.token) {
    localStorage.setItem('coupon-token', auth.token);
  } else {
    localStorage.removeItem('coupon-token');
  }
}

function switchNav(item) {
  if (item.auth && !hasToken.value) {
    setNotice('danger', '请先登录或粘贴 Apifox Token');
    activeNav.value = 'overview';
    isMainVisible.value = false;
    return;
  }
  activeNav.value = item.id;
}

function ensureToken() {
  if (!hasToken.value) {
    activeNav.value = 'overview';
    isMainVisible.value = false;
    throw new Error('请先登录或粘贴 Apifox Token');
  }
}

function captureValidation(errors) {
  try {
    assertValid(errors);
    return true;
  } catch (error) {
    setNotice('danger', error.message);
    lastResponse.value = { validation: error.message };
    return false;
  }
}

async function callApi(apiCall, successText) {
  loading.value = true;
  try {
    const { payload, latency } = await apiCall();
    lastLatency.value = latency;
    lastResponse.value = payload;
    setNotice('success', successText || payload?.message || '操作成功');
    return payload;
  } catch (error) {
    lastLatency.value = error.latency ?? null;
    lastResponse.value = error.payload || { message: error.message };
    if (error.status === 401) {
      persistToken('');
      activeNav.value = 'overview';
      isMainVisible.value = false;
    }
    setNotice('danger', error.message || '请求失败');
    throw error;
  } finally {
    loading.value = false;
  }
}

function buildTemplatePayload() {
  const payload = {
    ...templateForm,
    couponType: Number(templateForm.couponType),
    stock: Number(templateForm.stock),
    limitPerPerson: Number(templateForm.limitPerPerson),
    termsOfUse: Number(templateForm.termsOfUse),
    maximumDiscountAmount: Number(templateForm.maximumDiscountAmount)
  };
  if (templateForm.discountRate !== '') {
    payload.discountRate = Number(templateForm.discountRate);
  }
  return payload;
}

function settlementPayload(includePayable = true) {
  const payload = {
    orderId: Number(settlementForm.orderId),
    userCouponId: Number(settlementForm.userCouponId),
    orderAmount: Number(settlementForm.orderAmount),
    merchantId: Number(settlementForm.merchantId),
    goodsList: [
      {
        goodsNumber: settlementForm.goodsNumber,
        goodsAmount: Number(settlementForm.goodsAmount)
      }
    ]
  };
  if (includePayable) {
    payload.payableAmount = Number(settlementForm.payableAmount);
  }
  return payload;
}

function selectTemplate(item) {
  selectedTemplateId.value = item.id;
  stockForm.templateId = item.id;
  receiveForm.templateId = item.id;
  remindForm.templateId = item.id;
  batchForm.templateId = item.id;
  setNotice('success', `已选中模板 ${item.id}`);
}

async function login() {
  if (!captureValidation(validateLogin(auth))) return;
  try {
    const result = await callApi(
      () => merchantApi.login({ username: auth.username, password: auth.password }, auth.token),
      '登录成功，Token 已保存'
    );
    persistToken(result.data);
    isMainVisible.value = true;
    activeNav.value = 'overview';
    fetchTemplates().catch(() => undefined);
  } catch {
    return undefined;
  }
}

function saveManualToken() {
  const token = normalizeToken(auth.token);
  if (!token) {
    setNotice('danger', 'Token 不能为空');
    return;
  }
  persistToken(token);
  isMainVisible.value = true;
  activeNav.value = 'overview';
  setNotice('success', '已进入商家服务平台');
  fetchTemplates().catch(() => undefined);
}

async function fetchUserInfo() {
  try {
    ensureToken();
    const result = await callApi(() => merchantApi.userInfo(auth.token), '用户信息获取成功');
    auth.userInfo = result.data;
  } catch {
    return undefined;
  }
}

async function logout() {
  try {
    if (hasToken.value) {
      await callApi(() => merchantApi.logout(auth.token), '退出成功');
    }
  } catch {
    return undefined;
  } finally {
    persistToken('');
    auth.userInfo = null;
    isMainVisible.value = false;
    activeNav.value = 'overview';
    setNotice('muted', '已退出，请重新登录');
  }
}

async function fetchTemplates() {
  try {
    ensureToken();
  } catch (error) {
    setNotice('danger', error.message);
    return undefined;
  }
  const result = await callApi(() => merchantApi.templates(templateQuery, auth.token), '模板列表已刷新');
  templates.value = result.data;
  const first = templateRecords.value[0];
  if (first?.id) selectTemplate(first);
  return result;
}

async function createTemplate() {
  if (!captureValidation(validateTemplate(templateForm))) return null;
  try {
    ensureToken();
    const result = await callApi(() => merchantApi.createTemplate(buildTemplatePayload(), auth.token), '模板创建成功');
    selectedTemplateId.value = result.data;
    receiveForm.templateId = result.data;
    stockForm.templateId = result.data;
    remindForm.templateId = result.data;
    batchForm.templateId = result.data;
    await fetchTemplates();
    return result;
  } catch {
    return null;
  }
}

async function increaseStock() {
  if (!captureValidation(validateStock(stockForm))) return null;
  try {
    ensureToken();
    const result = await callApi(
      () =>
        merchantApi.increaseStock(
          { templateId: Number(stockForm.templateId), addNumber: Number(stockForm.addNumber) },
          auth.token
        ),
      '库存增发成功'
    );
    await fetchTemplates();
    return result;
  } catch {
    return null;
  }
}

async function terminateTemplate(id = stockForm.templateId) {
  if (!captureValidation(validateTemplateId(id))) return null;
  try {
    ensureToken();
    const result = await callApi(() => merchantApi.terminateTemplate(id, auth.token), '模板已结束');
    await fetchTemplates();
    return result;
  } catch {
    return null;
  }
}

async function receiveCoupon() {
  if (!captureValidation(validateTemplateId(receiveForm.templateId))) return null;
  try {
    ensureToken();
    const result = await callApi(() => merchantApi.receiveCoupon(receiveForm.templateId, auth.token), '优惠券领取成功');
    selectedUserCouponId.value = result.data;
    settlementForm.userCouponId = result.data;
    return result;
  } catch {
    return null;
  }
}

async function submitRedeem() {
  if (!captureValidation(validateTemplateId(receiveForm.templateId))) return null;
  try {
    ensureToken();
    const result = await callApi(() => merchantApi.submitRedeem(receiveForm.templateId, auth.token), '异步兑换已提交');
    receiveForm.requestId = result.data?.requestId || '';
    redeemResult.value = result.data;
    return result;
  } catch {
    return null;
  }
}

async function queryRedeemResult() {
  if (!receiveForm.requestId) {
    setNotice('danger', '请先填写异步请求 ID');
    return null;
  }
  try {
    ensureToken();
    const result = await callApi(() => merchantApi.redeemResult(receiveForm.requestId, auth.token), '兑换结果查询成功');
    redeemResult.value = result.data;
    if (result.data?.userCouponId) {
      selectedUserCouponId.value = result.data.userCouponId;
      settlementForm.userCouponId = result.data.userCouponId;
    }
    return result;
  } catch {
    return null;
  }
}

async function oldVerifyCoupon() {
  if (!captureValidation(validateSettlementKey({ orderId: 1, userCouponId: oldVerifyForm.userCouponId }))) return null;
  try {
    ensureToken();
    return await callApi(() => merchantApi.oldVerifyCoupon(oldVerifyForm.userCouponId, auth.token), '旧版核销接口调用成功');
  } catch {
    return null;
  }
}

async function querySettlement() {
  if (!captureValidation(validateSettlementQuery(settlementForm))) return null;
  try {
    ensureToken();
    const result = await callApi(
      () => merchantApi.querySettlement(settlementPayload(false), auth.token),
      '可用优惠券已计算'
    );
    settlementResult.value = result.data;
    const first = availableCoupons.value[0];
    if (first?.userCouponId) {
      selectedUserCouponId.value = first.userCouponId;
      settlementForm.userCouponId = first.userCouponId;
      settlementForm.payableAmount = first.payableAmount ?? settlementForm.payableAmount;
    }
    return result;
  } catch {
    return null;
  }
}

async function lockCoupon() {
  if (!captureValidation(validateSettlementMutation(settlementForm))) return null;
  try {
    ensureToken();
    const result = await callApi(() => merchantApi.lockCoupon(settlementPayload(true), auth.token), '优惠券已锁定');
    settlementForm.payableAmount = result.data?.payableAmount ?? settlementForm.payableAmount;
    return result;
  } catch {
    return null;
  }
}

async function cancelCoupon() {
  if (!captureValidation(validateSettlementKey(settlementForm))) return null;
  try {
    ensureToken();
    return await callApi(
      () =>
        merchantApi.cancelCoupon(
          { orderId: Number(settlementForm.orderId), userCouponId: Number(settlementForm.userCouponId) },
          auth.token
        ),
      '锁定已取消'
    );
  } catch {
    return null;
  }
}

async function confirmCoupon() {
  if (!captureValidation(validateSettlementKey(settlementForm))) return null;
  try {
    ensureToken();
    return await callApi(
      () =>
        merchantApi.confirmCoupon(
          { orderId: Number(settlementForm.orderId), userCouponId: Number(settlementForm.userCouponId) },
          auth.token
        ),
      '优惠券已核销'
    );
  } catch {
    return null;
  }
}

async function refundCoupon() {
  if (!captureValidation(validateSettlementKey(settlementForm))) return null;
  try {
    ensureToken();
    return await callApi(
      () =>
        merchantApi.refundCoupon(
          { orderId: Number(settlementForm.orderId), userCouponId: Number(settlementForm.userCouponId) },
          auth.token
        ),
      '优惠券已退款'
    );
  } catch {
    return null;
  }
}

function newOrderId() {
  settlementForm.orderId = buildOrderId();
  setNotice('success', `已生成新订单 ${settlementForm.orderId}`);
}

async function createRemind() {
  if (!captureValidation(validateRemind(remindForm))) return null;
  try {
    ensureToken();
    const result = await callApi(
      () =>
        merchantApi.createRemind(
          {
            templateId: Number(remindForm.templateId),
            type: Number(remindForm.type),
            remindTime: Number(remindForm.remindTime)
          },
          auth.token
        ),
      '预约提醒已创建'
    );
    remindResult.value = result.data;
    return result;
  } catch {
    return null;
  }
}

async function cancelRemind() {
  if (!captureValidation(validateRemind(remindForm))) return null;
  try {
    ensureToken();
    const result = await callApi(
      () =>
        merchantApi.cancelRemind(
          {
            templateId: Number(remindForm.templateId),
            type: Number(remindForm.type),
            remindTime: Number(remindForm.remindTime)
          },
          auth.token
        ),
      '预约提醒已取消'
    );
    remindResult.value = result.data;
    return result;
  } catch {
    return null;
  }
}

async function queryRemind() {
  if (!captureValidation(validateTemplateId(remindForm.templateId))) return null;
  try {
    ensureToken();
    const result = await callApi(
      () => merchantApi.queryRemind({ templateId: Number(remindForm.templateId), type: Number(remindForm.type) }, auth.token),
      '预约提醒查询成功'
    );
    remindResult.value = result.data;
    return result;
  } catch {
    return null;
  }
}

async function createBatchTask() {
  if (!captureValidation(validateBatchTask(batchForm))) return null;
  try {
    ensureToken();
    const formData = new FormData();
    formData.append('taskName', batchForm.taskName);
    formData.append('templateId', batchForm.templateId);
    formData.append('file', batchForm.file);
    return await callApi(() => merchantApi.createBatchTask(formData, auth.token), '批量发券任务已创建');
  } catch {
    return null;
  }
}

function onBatchFileChange(event) {
  batchForm.file = event.target.files?.[0] || null;
}

function useCoupon(coupon) {
  settlementForm.userCouponId = coupon.userCouponId;
  settlementForm.payableAmount = coupon.payableAmount ?? settlementForm.payableAmount;
  selectedUserCouponId.value = coupon.userCouponId;
  setNotice('success', `已选择用户券 ${coupon.userCouponId}`);
}

function resetDemoSteps() {
  demoSteps.forEach((step) => {
    step.status = 'pending';
  });
}

function demoStatusText(status) {
  return {
    pending: '待执行',
    running: '执行中',
    success: '已完成',
    failed: '失败'
  }[status];
}

async function runDemoStep(id, action) {
  const step = demoSteps.find((item) => item.id === id);
  step.status = 'running';
  const result = await action();
  if (!result) {
    step.status = 'failed';
    throw new Error(`${step.label}失败`);
  }
  step.status = 'success';
  return result;
}

async function runDemoFlow() {
  try {
    ensureToken();
  } catch (error) {
    setNotice('danger', error.message);
    return;
  }
  demoRunning.value = true;
  resetDemoSteps();
  try {
    newOrderId();
    await runDemoStep('create', createTemplate);
    await runDemoStep('receive', receiveCoupon);
    await runDemoStep('query', querySettlement);
    await runDemoStep('lock', lockCoupon);
    await runDemoStep('cancel', cancelCoupon);
    setNotice('success', '一键演示流程已跑通');
  } catch (error) {
    setNotice('danger', error.message);
  } finally {
    demoRunning.value = false;
  }
}

onMounted(() => {
  if (hasToken.value) {
    isMainVisible.value = true;
    fetchTemplates().catch(() => undefined);
  } else {
    isMainVisible.value = false;
  }
});
</script>

<template>
  <LoginView
    v-if="!isMainVisible"
    :auth="auth"
    :notice="notice"
    :loading="loading"
    :last-latency="lastLatency"
    @login="login"
    @enter-with-token="saveManualToken"
  />

  <div v-else class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">
          <Ticket :size="24" />
        </div>
        <div>
          <strong>智惠券</strong>
          <span>商家服务平台</span>
        </div>
      </div>

      <nav class="nav-list">
        <button
          v-for="item in navItems"
          :key="item.id"
          :class="['nav-item', { active: activeNav === item.id }]"
          type="button"
          @click="switchNav(item)"
        >
          <component :is="item.icon" :size="18" />
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="side-status">
        <span :class="['dot', hasToken ? 'ok' : 'warn']"></span>
        <div>
          <strong>{{ hasToken ? '已配置 Token' : '未登录' }}</strong>
          <span>后端代理 {{ API_BASE_URL }} -> 10010</span>
        </div>
      </div>
    </aside>

    <main class="workspace">
      <header class="topbar">
        <div>
          <p class="eyebrow">oneCoupon Merchant Console</p>
          <h1>Java 后端智惠券商家服务平台</h1>
        </div>
        <div class="top-actions">
          <span :class="['notice', notice.type]">{{ notice.text }}</span>
          <span class="latency" v-if="lastLatency !== null">{{ lastLatency }}ms</span>
          <button class="icon-button" type="button" title="刷新模板" @click="fetchTemplates" :disabled="loading">
            <RefreshCw :size="18" />
          </button>
        </div>
      </header>

      <section class="section" v-show="activeNav === 'overview'">
        <div class="overview-grid">
          <div class="panel workspace-panel">
            <div class="panel-title">
              <ShieldCheck :size="20" />
              <h2>商家工作台</h2>
            </div>
            <p class="muted-text">当前已进入商家后台，可以直接演示模板、领券、结算和批量任务链路。</p>
            <div class="workspace-summary">
              <div>
                <span>登录状态</span>
                <strong>{{ hasToken ? '已登录' : '未登录' }}</strong>
              </div>
              <div>
                <span>代理配置</span>
                <strong>{{ API_BASE_URL }} -> 10010</strong>
              </div>
              <div>
                <span>模板记录</span>
                <strong>{{ templateRecords.length }}</strong>
              </div>
            </div>
            <div class="button-row">
              <button class="primary" type="button" @click="fetchTemplates" :disabled="loading">刷新模板</button>
              <button type="button" @click="fetchUserInfo" :disabled="loading">用户信息</button>
              <button type="button" @click="activeNav = 'templates'">模板管理</button>
              <button type="button" @click="activeNav = 'settlement'">结算中心</button>
              <button type="button" @click="logout" :disabled="loading">退出登录</button>
            </div>
            <div class="user-chip" v-if="auth.userInfo">
              <ShieldCheck :size="16" />
              <span>{{ auth.userInfo.username || auth.userInfo.realName || '当前用户' }}</span>
            </div>
          </div>

          <div class="panel metrics-panel">
            <div class="panel-title">
              <Activity :size="20" />
              <h2>压测验收数据</h2>
            </div>
            <div class="metric-grid">
              <MetricCard v-for="metric in performanceMetrics" :key="metric.label" :metric="metric" />
            </div>
          </div>
        </div>

        <div class="overview-grid">
          <div class="panel">
            <div class="panel-title">
              <Send :size="20" />
              <h2>一键演示流程</h2>
            </div>
            <p class="muted-text">自动跑通：创建模板、领取券、查询可用券、锁定、取消锁定。适合面试现场演示完整业务闭环。</p>
            <div class="demo-list">
              <div v-for="step in demoSteps" :key="step.id" :class="['demo-step', step.status]">
                <span>{{ step.label }}</span>
                <strong>{{ demoStatusText(step.status) }}</strong>
              </div>
            </div>
            <button class="primary wide-button" type="button" @click="runDemoFlow" :disabled="loading || demoRunning">
              <Send :size="16" /> 开始一键演示
            </button>
          </div>

          <div class="panel">
            <div class="panel-title">
              <ClipboardCheck :size="20" />
              <h2>压测报告摘要</h2>
            </div>
            <div class="report-list">
              <div v-for="item in pressureReport" :key="item.label">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="flow-band">
          <div class="flow-step">
            <Ticket :size="18" />
            <span>创建模板</span>
          </div>
          <div class="flow-step">
            <WalletCards :size="18" />
            <span>领取/兑换</span>
          </div>
          <div class="flow-step">
            <Search :size="18" />
            <span>查询可用券</span>
          </div>
          <div class="flow-step">
            <LockKeyhole :size="18" />
            <span>锁定优惠券</span>
          </div>
          <div class="flow-step">
            <CheckCircle2 :size="18" />
            <span>核销与退款</span>
          </div>
        </div>
      </section>

      <section class="section" v-show="activeNav === 'templates'">
        <div class="split-layout">
          <div class="panel">
            <div class="panel-title">
              <Layers3 :size="20" />
              <h2>优惠券模板</h2>
            </div>
            <div class="toolbar three-controls">
              <label>
                <span>页码</span>
                <input v-model.number="templateQuery.pageNum" type="number" min="1" />
              </label>
              <label>
                <span>页大小</span>
                <input v-model.number="templateQuery.pageSize" type="number" min="1" />
              </label>
              <label>
                <span>本地筛选</span>
                <input v-model="templateSearch" placeholder="按 ID、名称、状态筛选" />
              </label>
            </div>
            <div class="button-row">
              <button class="primary" type="button" @click="fetchTemplates" :disabled="loading">查询模板</button>
            </div>
            <DataTable :columns="templateColumns" :rows="filteredTemplateRecords" empty-text="暂无模板数据">
              <template #cell-couponType="{ value }">{{ couponTypeText(value) }}</template>
              <template #cell-stock="{ value }">{{ value ?? 0 }}</template>
              <template #cell-status="{ value }">
                <span class="tag">{{ templateStatusText(value) }}</span>
              </template>
              <template #cell-validEndTime="{ row }">
                {{ row.validEndTime || row.validEndTimeStr || '-' }}
              </template>
              <template #cell-action="{ row }">
                <div class="table-actions">
                  <button type="button" @click="selectTemplate(row)">选中</button>
                  <button type="button" @click="terminateTemplate(row.id)">结束</button>
                </div>
              </template>
            </DataTable>
          </div>

          <div class="panel">
            <div class="panel-title">
              <Ticket :size="20" />
              <h2>创建与维护模板</h2>
            </div>
            <div class="form-grid two">
              <label><span>名称</span><input v-model="templateForm.templateName" /></label>
              <label><span>类型</span><select v-model.number="templateForm.couponType"><option :value="0">立减</option><option :value="1">满减</option><option :value="2">折扣</option></select></label>
              <label><span>库存</span><input v-model.number="templateForm.stock" type="number" min="1" /></label>
              <label><span>每人限领</span><input v-model.number="templateForm.limitPerPerson" type="number" min="1" /></label>
              <label><span>门槛金额</span><input v-model.number="templateForm.termsOfUse" type="number" min="0" /></label>
              <label><span>优惠金额</span><input v-model.number="templateForm.maximumDiscountAmount" type="number" min="0" /></label>
              <label><span>折扣率</span><input v-model="templateForm.discountRate" placeholder="折扣券填写 0.8 或 8" /></label>
              <label><span>使用说明</span><input v-model="templateForm.usageInstructions" /></label>
              <label><span>开始时间</span><input v-model="templateForm.validStartTime" /></label>
              <label><span>结束时间</span><input v-model="templateForm.validEndTime" /></label>
            </div>
            <label>
              <span>不可用说明</span>
              <input v-model="templateForm.explanationOfConditions" />
            </label>
            <div class="button-row">
              <button class="primary" type="button" @click="createTemplate" :disabled="loading">创建模板</button>
              <button type="button" @click="increaseStock" :disabled="loading">增发库存</button>
              <button type="button" @click="terminateTemplate()" :disabled="loading">结束模板</button>
            </div>
            <div class="form-grid two compact">
              <label><span>模板 ID</span><input v-model="stockForm.templateId" /></label>
              <label><span>增发量</span><input v-model.number="stockForm.addNumber" type="number" min="1" /></label>
            </div>
          </div>
        </div>
      </section>

      <section class="section" v-show="activeNav === 'coupons'">
        <div class="split-layout">
          <div class="panel">
            <div class="panel-title">
              <WalletCards :size="20" />
              <h2>领券与异步兑换</h2>
            </div>
            <label><span>模板 ID</span><input v-model="receiveForm.templateId" placeholder="例如 50" /></label>
            <div class="button-row">
              <button class="primary" type="button" @click="receiveCoupon" :disabled="loading">同步领取</button>
              <button type="button" @click="submitRedeem" :disabled="loading">提交异步兑换</button>
              <button type="button" @click="queryRedeemResult" :disabled="loading">查询兑换结果</button>
            </div>
            <label><span>异步请求 ID</span><input v-model="receiveForm.requestId" /></label>
            <div class="result-box" v-if="redeemResult">
              <pre>{{ JSON.stringify(redeemResult, null, 2) }}</pre>
            </div>
          </div>

          <div class="panel">
            <div class="panel-title">
              <ShieldCheck :size="20" />
              <h2>旧版直接核销</h2>
            </div>
            <label><span>用户券 ID</span><input v-model="oldVerifyForm.userCouponId" /></label>
            <button class="primary" type="button" @click="oldVerifyCoupon" :disabled="loading">直接核销</button>
            <p class="muted-text">结算链路请使用“结算中心”的核销接口，这里保留用于兼容旧接口测试。</p>
          </div>
        </div>
      </section>

      <section class="section" v-show="activeNav === 'settlement'">
        <div class="panel">
          <div class="panel-title">
            <Coins :size="20" />
            <h2>优惠券结算工作台</h2>
          </div>
          <div class="form-grid six">
            <label><span>订单 ID</span><input v-model="settlementForm.orderId" /></label>
            <label><span>用户券 ID</span><input v-model="settlementForm.userCouponId" /></label>
            <label><span>订单金额</span><input v-model.number="settlementForm.orderAmount" type="number" min="0" /></label>
            <label><span>应付金额</span><input v-model.number="settlementForm.payableAmount" type="number" min="0" /></label>
            <label><span>商户 ID</span><input v-model.number="settlementForm.merchantId" type="number" min="1" /></label>
            <label><span>商品编码</span><input v-model="settlementForm.goodsNumber" /></label>
          </div>
          <div class="form-grid two compact">
            <label><span>商品金额</span><input v-model.number="settlementForm.goodsAmount" type="number" min="0" /></label>
            <label><span>当前选中券</span><input :value="selectedUserCouponId" readonly /></label>
          </div>
          <div class="button-row">
            <button class="primary" type="button" @click="querySettlement" :disabled="loading">
              <Search :size="16" /> 查询可用券
            </button>
            <button type="button" @click="lockCoupon" :disabled="loading">
              <LockKeyhole :size="16" /> 锁定
            </button>
            <button type="button" @click="cancelCoupon" :disabled="loading">
              <UnlockKeyhole :size="16" /> 取消
            </button>
            <button type="button" @click="confirmCoupon" :disabled="loading">
              <CheckCircle2 :size="16" /> 核销
            </button>
            <button type="button" @click="refundCoupon" :disabled="loading">
              <RotateCcw :size="16" /> 退款
            </button>
            <button type="button" @click="newOrderId">新订单号</button>
          </div>
        </div>

        <div class="coupon-columns" v-if="settlementResult">
          <div class="panel">
            <div class="panel-title">
              <CheckCircle2 :size="20" />
              <h2>可用优惠券 {{ availableCoupons.length }}</h2>
            </div>
            <div class="coupon-list">
              <article class="coupon-card available" v-for="coupon in availableCoupons" :key="coupon.userCouponId">
                <div>
                  <strong>{{ coupon.templateName || `模板 ${coupon.templateId}` }}</strong>
                  <span>用户券 {{ coupon.userCouponId }}</span>
                </div>
                <div class="amount">
                  <b>¥{{ money(coupon.couponAmount) }}</b>
                  <small>应付 ¥{{ money(coupon.payableAmount) }}</small>
                </div>
                <button type="button" @click="useCoupon(coupon)">使用</button>
              </article>
            </div>
          </div>
          <div class="panel">
            <div class="panel-title">
              <Clock3 :size="20" />
              <h2>不可用优惠券 {{ notAvailableCoupons.length }}</h2>
            </div>
            <div class="coupon-list">
              <article class="coupon-card disabled" v-for="coupon in notAvailableCoupons" :key="`${coupon.userCouponId}-${coupon.templateId}`">
                <div>
                  <strong>{{ coupon.templateName || `模板 ${coupon.templateId}` }}</strong>
                  <span>{{ coupon.notAvailableReason }}</span>
                </div>
                <div class="amount">
                  <b>¥{{ money(coupon.couponAmount || 0) }}</b>
                  <small>模板 {{ coupon.templateId }}</small>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section class="section" v-show="activeNav === 'operations'">
        <div class="split-layout">
          <div class="panel">
            <div class="panel-title">
              <Bell :size="20" />
              <h2>预约提醒</h2>
            </div>
            <div class="form-grid three">
              <label><span>模板 ID</span><input v-model="remindForm.templateId" /></label>
              <label><span>提醒类型</span><select v-model.number="remindForm.type"><option :value="0">APP</option><option :value="1">短信</option><option :value="2">邮件</option></select></label>
              <label><span>提前分钟</span><input v-model.number="remindForm.remindTime" type="number" min="0" /></label>
            </div>
            <div class="button-row">
              <button class="primary" type="button" @click="createRemind" :disabled="loading">创建预约</button>
              <button type="button" @click="cancelRemind" :disabled="loading">取消预约</button>
              <button type="button" @click="queryRemind" :disabled="loading">查询预约</button>
            </div>
            <div class="result-box" v-if="remindResult">
              <pre>{{ JSON.stringify(remindResult, null, 2) }}</pre>
            </div>
          </div>

          <div class="panel">
            <div class="panel-title">
              <FileSpreadsheet :size="20" />
              <h2>批量发券任务</h2>
            </div>
            <label><span>任务名称</span><input v-model="batchForm.taskName" /></label>
            <label><span>模板 ID</span><input v-model="batchForm.templateId" /></label>
            <label><span>Excel 文件</span><input type="file" accept=".xlsx,.xls" @change="onBatchFileChange" /></label>
            <button class="primary" type="button" @click="createBatchTask" :disabled="loading">
              <Send :size="16" /> 创建批量任务
            </button>
          </div>
        </div>
      </section>

      <section class="section" v-show="activeNav === 'response'">
        <div class="panel">
          <div class="panel-title">
            <ClipboardCheck :size="20" />
            <h2>最近一次接口响应</h2>
          </div>
          <div class="result-box large">
            <pre>{{ JSON.stringify(lastResponse, null, 2) }}</pre>
          </div>
        </div>
      </section>
    </main>

    <div class="loading-mask" v-if="loading">
      <RefreshCw :size="28" class="spin" />
      <span>请求处理中</span>
    </div>
  </div>
</template>
