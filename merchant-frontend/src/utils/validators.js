function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function toNumber(value) {
  if (isBlank(value)) return Number.NaN;
  return Number(value);
}

function positive(value) {
  return !Number.isNaN(toNumber(value)) && toNumber(value) > 0;
}

function nonNegative(value) {
  return !Number.isNaN(toNumber(value)) && toNumber(value) >= 0;
}

function pushRequired(errors, value, label) {
  if (isBlank(value)) errors.push(`${label}不能为空`);
}

function pushPositive(errors, value, label) {
  if (!positive(value)) errors.push(`${label}必须大于 0`);
}

function pushNonNegative(errors, value, label) {
  if (!nonNegative(value)) errors.push(`${label}不能小于 0`);
}

export function assertValid(errors) {
  if (errors.length) {
    throw new Error(errors[0]);
  }
}

export function validateLogin(form) {
  const errors = [];
  pushRequired(errors, form.username, '用户名');
  pushRequired(errors, form.password, '密码');
  return errors;
}

export function validateTemplate(form) {
  const errors = [];
  pushRequired(errors, form.templateName, '模板名称');
  pushPositive(errors, form.stock, '库存');
  pushPositive(errors, form.limitPerPerson, '每人限领');
  pushNonNegative(errors, form.termsOfUse, '门槛金额');
  pushPositive(errors, form.maximumDiscountAmount, '优惠金额');
  pushRequired(errors, form.validStartTime, '开始时间');
  pushRequired(errors, form.validEndTime, '结束时间');

  const start = new Date(form.validStartTime.replace(/-/g, '/')).getTime();
  const end = new Date(form.validEndTime.replace(/-/g, '/')).getTime();
  if (!Number.isNaN(start) && !Number.isNaN(end) && end <= start) {
    errors.push('结束时间必须晚于开始时间');
  }

  if (Number(form.couponType) === 2 && isBlank(form.discountRate)) {
    errors.push('折扣券需要填写折扣率');
  }

  return errors;
}

export function validateTemplateId(value) {
  const errors = [];
  pushPositive(errors, value, '模板 ID');
  return errors;
}

export function validateStock(form) {
  const errors = validateTemplateId(form.templateId);
  pushPositive(errors, form.addNumber, '增发数量');
  return errors;
}

export function validateSettlementQuery(form) {
  const errors = [];
  pushPositive(errors, form.orderId, '订单 ID');
  pushPositive(errors, form.orderAmount, '订单金额');
  pushPositive(errors, form.merchantId, '商户 ID');
  pushRequired(errors, form.goodsNumber, '商品编码');
  pushPositive(errors, form.goodsAmount, '商品金额');
  return errors;
}

export function validateSettlementMutation(form) {
  const errors = validateSettlementQuery(form);
  pushPositive(errors, form.userCouponId, '用户券 ID');
  pushNonNegative(errors, form.payableAmount, '应付金额');
  return errors;
}

export function validateSettlementKey(form) {
  const errors = [];
  pushPositive(errors, form.orderId, '订单 ID');
  pushPositive(errors, form.userCouponId, '用户券 ID');
  return errors;
}

export function validateRemind(form) {
  const errors = validateTemplateId(form.templateId);
  pushNonNegative(errors, form.remindTime, '提前分钟');
  return errors;
}

export function validateBatchTask(form) {
  const errors = validateTemplateId(form.templateId);
  pushRequired(errors, form.taskName, '任务名称');
  if (!form.file) errors.push('请先选择 Excel 文件');
  return errors;
}

