<script setup>
defineProps({
  metric: {
    type: Object,
    required: true
  }
});
</script>

<template>
  <div class="metric">
    <strong>{{ metric.value }}</strong>
    <span>{{ metric.label }}</span>
    <small>{{ metric.desc }}</small>
  </div>
</template>

