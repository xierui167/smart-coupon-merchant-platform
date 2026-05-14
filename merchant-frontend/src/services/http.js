import { API_BASE_URL, REQUEST_TIMEOUT } from '../config/env';

export function normalizeToken(value) {
  if (!value) return '';
  return value.replace(/^coupon\s+/i, '').trim();
}

export async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  const started = performance.now();

  try {
    const headers = { ...(options.headers || {}) };
    const token = normalizeToken(options.token || '');
    if (token) {
      headers.coupon = `coupon ${token}`;
    }

    let body = options.body;
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers,
      body,
      signal: controller.signal
    });

    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text };
    }

    const latency = Math.round(performance.now() - started);
    if (response.status === 401) {
      const error = new Error('登录已过期，请重新登录');
      error.status = 401;
      error.payload = payload;
      error.latency = latency;
      throw error;
    }

    if (!response.ok || payload?.code >= 400) {
      const error = new Error(payload?.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      error.latency = latency;
      throw error;
    }

    return { payload, latency };
  } catch (error) {
    if (error.name === 'AbortError') {
      error.message = '请求超时，请确认后端服务是否可用';
    }
    error.latency = Math.round(performance.now() - started);
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

