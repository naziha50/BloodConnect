<template>
  <div class="map-container">
    <ClientOnly>
      <LeafletMap :center="center" :donors="donors" />
      <template #fallback>
        <div class="map-fallback">
          <div class="loading-spinner">
            <svg class="spinner" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p>Loading interactive map...</p>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import ClientOnly from './ClientOnly.vue'
import LeafletMap from './LeafletMap.vue'

interface Donor {
  id: number
  name: string
  blood_group: string
  phone: string
  email: string
  address: string
  lat: number
  lng: number
  distance_km?: number
}

interface Center {
  lat: number
  lng: number
}

const props = defineProps<{
  center: Center
  donors: Donor[]
}>()
</script>

<style scoped>
.map-container {
  width: 100%; /* w-full */
}

.map-fallback {
  width: 100%; /* w-full */
  height: 24rem; /* h-96 */
  background-color: #e5e7eb; /* bg-gray-200 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem; /* rounded */
  gap: 1rem;
}

.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 2rem;
  height: 2rem;
  color: #3b82f6;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.map-fallback p {
  color: #6b7280;
  font-size: 1rem;
  margin: 0;
}
</style>