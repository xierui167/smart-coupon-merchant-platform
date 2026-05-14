export function formatDateTime(date) {
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function buildOrderId() {
  const date = new Date();
  const pad = (num) => String(num).padStart(2, '0');
  const dateText = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  return Number(`${dateText}${String(Math.floor(Math.random() * 900000) + 100000)}`);
}

export function couponTypeText(value) {
  const typeMap = {
    0: '立减券',
    1: '满减券',
    2: '折扣券'
  };
  return typeMap[value] || `类型 ${value ?? '-'}`;
}

export function templateStatusText(value) {
  const statusMap = {
    0: '生效中',
    1: '已结束'
  };
  return statusMap[value] || `状态 ${value ?? '-'}`;
}

export function settlementStatusText(value) {
  const statusMap = {
    0: '锁定中',
    1: '已取消',
    2: '已核销',
    3: '已退款'
  };
  return statusMap[value] || `状态 ${value ?? '-'}`;
}

export function money(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return value ?? '-';
  return number.toFixed(2);
}

