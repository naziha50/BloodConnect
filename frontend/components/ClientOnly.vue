<template>
  <div v-if="mounted">
    <slot />
  </div>
  <div v-else>
    <slot name="fallback" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const mounted = ref(false)

onMounted(() => {
  console.log('ClientOnly component mounted')
  mounted.value = true
})
</script>