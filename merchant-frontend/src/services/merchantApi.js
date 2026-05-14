import { request } from './http';

function withToken(token, options = {}) {
  return { token, ...options };
}

export const merchantApi = {
  login(body, token) {
    return request('/v1/auth/login', withToken(token, { method: 'POST', body }));
  },
  userInfo(token) {
    return request('/v1/auth/userInfo', withToken(token));
  },
  logout(token) {
    return request('/v1/auth/logout', withToken(token));
  },
  templates(params, token) {
    return request(`/v1/coupon/templates?${new URLSearchParams(params)}`, withToken(token));
  },
  createTemplate(body, token) {
    return request('/v1/coupon/templates', withToken(token, { method: 'POST', body }));
  },
  increaseStock(body, token) {
    return request('/v1/coupon/templates/increase-stock', withToken(token, { method: 'POST', body }));
  },
  terminateTemplate(templateId, token) {
    return request(`/v1/coupon/templates/terminate/${templateId}`, withToken(token, { method: 'POST' }));
  },
  receiveCoupon(templateId, token) {
    return request(`/v1/coupon/receive/${templateId}`, withToken(token, { method: 'POST' }));
  },
  submitRedeem(templateId, token) {
    return request(`/v1/coupon/receive/v2/${templateId}`, withToken(token, { method: 'POST' }));
  },
  redeemResult(requestId, token) {
    return request(`/v1/coupon/receive/v2/result/${encodeURIComponent(requestId)}`, withToken(token));
  },
  oldVerifyCoupon(userCouponId, token) {
    return request(`/v1/coupon/templates/verify/${userCouponId}`, withToken(token, { method: 'POST' }));
  },
  querySettlement(body, token) {
    return request('/v1/coupon/settlement/coupon-query', withToken(token, { method: 'POST', body }));
  },
  lockCoupon(body, token) {
    return request('/v1/coupon/settlement/lock', withToken(token, { method: 'POST', body }));
  },
  cancelCoupon(body, token) {
    return request('/v1/coupon/settlement/cancel', withToken(token, { method: 'POST', body }));
  },
  confirmCoupon(body, token) {
    return request('/v1/coupon/settlement/confirm', withToken(token, { method: 'POST', body }));
  },
  refundCoupon(body, token) {
    return request('/v1/coupon/settlement/refund', withToken(token, { method: 'POST', body }));
  },
  createRemind(body, token) {
    return request('/v1/coupon/templates/remind', withToken(token, { method: 'POST', body }));
  },
  cancelRemind(body, token) {
    return request('/v1/coupon/templates/remind/cancel', withToken(token, { method: 'POST', body }));
  },
  queryRemind(params, token) {
    return request(`/v1/coupon/templates/remind?${new URLSearchParams(params)}`, withToken(token));
  },
  createBatchTask(body, token) {
    return request('/v1/coupon/distribution-tasks', withToken(token, { method: 'POST', body }));
  }
};

