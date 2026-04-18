<template>
  <div class="find-donor-page">
    <!-- Page Header -->
    <div class="page-header">
      <h1 class="page-title">Find Blood Donor</h1>
    </div>

    <!-- Filters Bar -->
    <div class="filters-bar">
      <div class="filter-group">
        <label class="filter-label">Blood Group</label>
        <select v-model="filters.blood_group" class="filter-select">
          <option value="">All Blood Groups</option>
          <option value="A+">A+</option>
          <option value="A-">A-</option>
          <option value="B+">B+</option>
          <option value="B-">B-</option>
          <option value="AB+">AB+</option>
          <option value="AB-">AB-</option>
          <option value="O+">O+</option>
          <option value="O-">O-</option>
        </select>
      </div>

      <div class="filter-group">
        <label class="filter-label">Distance</label>
        <select v-model="filters.radius_km" class="filter-select">
          <option value="5">Within 5 km</option>
          <option value="10">Within 10 km</option>
          <option value="25">Within 25 km</option>
          <option value="50">Within 50 km</option>
          <option value="100">Within 100 km</option>
        </select>
      </div>

      <div class="filter-group">
        <label class="filter-label">Availability</label>
        <select v-model="filters.availability" class="filter-select">
          <option value="">All</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </div>

      <button @click="applyFilters" :disabled="loading || !hasLocation" class="apply-btn">
        <span v-if="loading" class="btn-loading">
          <svg class="spin-icon" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"></circle>
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" class="opacity-75"></path>
          </svg>
          Searching...
        </span>
        <span v-else>Apply Filters</span>
      </button>
    </div>

    <!-- Location Missing Banner -->
    <div v-if="!hasLocation" class="location-banner">
      <svg class="banner-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
      <div class="banner-text">
        <p class="banner-title">Enable location to find nearby donors</p>
        <p class="banner-sub">{{ locationError || 'Requesting your location...' }}</p>
      </div>
      <div class="banner-search">
        <LocationSearch @location-selected="handleLocationSelected" placeholder="Or enter your location manually" />
      </div>
    </div>

    <!-- Main Content Grid -->
    <div v-if="hasLocation" class="content-grid">
      <!-- Left: Map Panel -->
      <div class="map-panel">
        <div class="map-header">
          <div class="map-header-row">
            <svg class="map-pin-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            </svg>
            <span class="map-title">Nearby Donors Map</span>
          </div>
          <p class="map-subtitle">{{ donors.length }} donors found in your area</p>
        </div>

        <div class="map-wrapper">
          <ClientOnly>
            <LeafletMap :center="center" :donors="donors" :radius-km="Number(filters.radius_km)" />
            <template #fallback>
              <div class="map-loading">
                <svg class="spin-icon" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" style="opacity:0.25"></circle>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style="opacity:0.75"></path>
                </svg>
                <span>Loading map...</span>
              </div>
            </template>
          </ClientOnly>
        </div>

        <!-- Legend -->
        <div class="map-legend">
          <div class="legend-item">
            <span class="legend-dot legend-available"></span>
            <span>Available</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot legend-unavailable"></span>
            <span>Unavailable</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot legend-you"></span>
            <span>Your Location</span>
          </div>
        </div>
      </div>

      <!-- Right: Donor List Panel -->
      <div class="donor-list-panel">
        <div class="list-header">
          <h2 class="list-title">Available Donors</h2>
          <span class="results-count">{{ donors.length }} results</span>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="state-box">
          <svg class="spin-icon large" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="#dc2626" stroke-width="4" style="opacity:0.25"></circle>
            <path fill="#dc2626" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p>Searching for donors...</p>
        </div>

        <!-- No Results -->
        <div v-else-if="hasSearched && donors.length === 0" class="state-box">
          <svg fill="none" stroke="#9ca3af" viewBox="0 0 24 24" style="width:3rem;height:3rem;margin-bottom:0.75rem;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="state-title">No donors found</p>
          <p class="state-sub">Try expanding the distance or adjusting filters.</p>
        </div>

        <!-- Donor Cards -->
        <div v-else class="donor-list">
          <div v-for="donor in donors" :key="donor.id" class="donor-card">
            <!-- Card Top Row -->
            <div class="card-top">
              <!-- Avatar -->
              <div class="donor-avatar">
                <svg viewBox="0 0 24 24" fill="#dc2626" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
                </svg>
              </div>

              <!-- Info -->
              <div class="donor-info">
                <h3 class="donor-name">{{ donor.name }}</h3>
                <div class="donor-location-row">
                  <svg class="loc-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <span>{{ donor.address || 'Unknown location' }} · {{ donor.distance_km?.toFixed(1) }} km</span>
                </div>
                <p class="donor-last-donation">Last donation: {{ formatLastDonation(donor.last_donation_date) }}</p>
              </div>

              <!-- Right Badges -->
              <div class="donor-badges">
                <span class="blood-type-badge">{{ donor.blood_group }}</span>
                <span :class="['avail-badge', donor.available ? 'avail-yes' : 'avail-no']">
                  {{ donor.available ? 'Available' : 'Not Available' }}
                </span>
              </div>
            </div>

            <!-- Action Buttons (only for available donors) -->
            <div v-if="donor.available" class="card-actions">
              <a :href="`tel:${donor.phone}`" class="btn-call">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                </svg>
                Call
              </a>
              <a :href="`mailto:${donor.email || ''}`" class="btn-message">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                Message
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import ClientOnly from './ClientOnly.vue'
import LeafletMap from './LeafletMap.vue'
import LocationSearch from './LocationSearch.vue'
import { useApi } from '../composables/useApi.ts'

interface Donor {
  id: number
  name: string
  blood_group: string
  phone: string
  email: string
  address: string
  lat: number
  lng: number
  available: boolean
  last_donation_date: string | null
  distance_km?: number
}

interface Location {
  lat: number
  lng: number
  address: string
}

const props = defineProps<{
  initialLocation?: Location | null
  initialBloodGroup?: string
}>()

const { searchDonors, loading } = useApi()

const filters = reactive({
  blood_group: props.initialBloodGroup || '',
  radius_km: '5',
  availability: ''
})

const currentLocation = reactive<{ lat: number; lng: number }>({ lat: 0, lng: 0 })
const donors = ref<Donor[]>([])
const hasSearched = ref(false)
const locationError = ref('')

const hasLocation = computed(() => currentLocation.lat !== 0 || currentLocation.lng !== 0)

const center = computed(() => ({ lat: currentLocation.lat, lng: currentLocation.lng }))

const formatLastDonation = (date: string | null): string => {
  if (!date) return 'No previous donation'
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return 'Today'
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`
}

const fetchDonors = async () => {
  if (!hasLocation.value) return
  try {
    hasSearched.value = true
    const params: Record<string, string | number> = {
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      radius_km: Number(filters.radius_km)
    }
    if (filters.blood_group) params.blood_group = filters.blood_group
    if (filters.availability) params.availability = filters.availability
    donors.value = await searchDonors(params as any)
  } catch (err) {
    donors.value = []
  }
}

const applyFilters = () => fetchDonors()

const handleLocationSelected = (location: Location) => {
  currentLocation.lat = location.lat
  currentLocation.lng = location.lng
  fetchDonors()
}

onMounted(() => {
  // If a location was passed from the homepage search, use it directly
  if (props.initialLocation) {
    currentLocation.lat = props.initialLocation.lat
    currentLocation.lng = props.initialLocation.lng
    fetchDonors()
    return
  }

  if (!navigator.geolocation) {
    locationError.value = 'Geolocation is not supported by your browser.'
    return
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      currentLocation.lat = pos.coords.latitude
      currentLocation.lng = pos.coords.longitude
      fetchDonors()
    },
    () => {
      locationError.value = 'Location access denied. Please enter your location below.'
    }
  )
})
</script>

<style scoped>
/* ── Page wrapper ──────────────────────────────────────────── */
.find-donor-page {
  padding: 2rem;
  background: var(--gray-50, #f9fafb);
  min-height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* ── Page Header ───────────────────────────────────────────── */
.page-header {
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 800;
  color: var(--gray-900, #111827);
  margin: 0;
  letter-spacing: -0.01em;
}

/* ── Filters Bar ───────────────────────────────────────────── */
.filters-bar {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  background: var(--white, #fff);
  padding: 1.25rem 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.07);
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  border: 1px solid var(--gray-200, #e5e7eb);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1;
  min-width: 150px;
}

.filter-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--gray-500, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.filter-select {
  padding: 0.625rem 2.25rem 0.625rem 0.875rem;
  border: 2px solid var(--gray-300, #d1d5db);
  border-radius: 0.75rem;
  font-size: 0.9375rem;
  color: var(--gray-700, #374151);
  background: var(--white, #fff) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E") no-repeat right 0.6rem center / 1.25rem;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  height: 2.75rem;
}

.filter-select:focus {
  outline: none;
  border-color: var(--primary-red, #dc2626);
  box-shadow: 0 0 0 3px rgba(220,38,38,0.1);
}

.apply-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0 1.75rem;
  height: 2.75rem;
  background: var(--primary-red, #dc2626);
  color: var(--white, #fff);
  font-size: 0.9375rem;
  font-weight: 600;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  align-self: flex-end;
  box-shadow: 0 2px 4px rgba(220,38,38,0.2);
}

.apply-btn:hover:not(:disabled) {
  background: var(--primary-red-dark, #b91c1c);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(220,38,38,0.3);
}

.apply-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-loading {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* ── Location Banner ───────────────────────────────────────── */
.location-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 1rem;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.banner-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: #ea580c;
  flex-shrink: 0;
}

.banner-text {
  flex: 1;
  min-width: 160px;
}

.banner-title {
  font-weight: 700;
  color: #9a3412;
  margin: 0 0 0.125rem;
  font-size: 0.9rem;
}

.banner-sub {
  font-size: 0.8rem;
  color: #c2410c;
  margin: 0;
}

.banner-search {
  flex: 2;
  min-width: 240px;
}

/* ── Content Grid ──────────────────────────────────────────── */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 900px) {
  .content-grid { grid-template-columns: 1fr; }
}

/* ── Map Panel ─────────────────────────────────────────────── */
.map-panel {
  background: var(--white, #fff);
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.07);
  border: 1px solid var(--gray-200, #e5e7eb);
}

.map-header {
  background: var(--primary-red, #dc2626);
  padding: 0.875rem 1.25rem;
  color: var(--white, #fff);
}

.map-header-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.map-pin-icon {
  width: 1.125rem;
  height: 1.125rem;
}

.map-title {
  font-weight: 700;
  font-size: 1rem;
}

.map-subtitle {
  font-size: 0.8rem;
  opacity: 0.9;
  margin: 0;
}

.map-wrapper {
  height: 400px;
  position: relative;
}

.map-wrapper :deep(.leaflet-container) {
  height: 400px !important;
  border-radius: 0 !important;
  border: none !important;
}

.map-loading {
  height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  color: var(--gray-500, #6b7280);
  font-size: 0.875rem;
  background: var(--gray-50, #f9fafb);
}

/* Map Legend */
.map-legend {
  display: flex;
  gap: 1.5rem;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--gray-100, #f3f4f6);
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  color: var(--gray-700, #374151);
  font-weight: 500;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-available  { background: var(--primary-red, #dc2626); }
.legend-unavailable { background: var(--gray-400, #9ca3af); }
.legend-you         { background: #3b82f6; }

/* ── Donor List Panel ──────────────────────────────────────── */
.donor-list-panel {
  background: var(--white, #fff);
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.07);
  border: 1px solid var(--gray-200, #e5e7eb);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 532px; /* aligns with map + header + legend */
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--gray-100, #f3f4f6);
  flex-shrink: 0;
}

.list-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--gray-900, #111827);
  margin: 0;
}

.results-count {
  font-size: 0.8125rem;
  color: var(--gray-500, #6b7280);
  font-weight: 500;
}

/* States */
.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
  flex: 1;
}

.state-title {
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--gray-700, #374151);
  margin: 0 0 0.375rem;
}

.state-sub {
  font-size: 0.875rem;
  color: var(--gray-400, #9ca3af);
  margin: 0;
}

/* ── Donor Card ────────────────────────────────────────────── */
.donor-card {
  background: var(--white, #fff);
  border: 1px solid var(--gray-200, #e5e7eb);
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  margin: 0.5rem 0.75rem;
  transition: box-shadow 0.15s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.donor-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.donor-list {
  overflow-y: auto;
  flex: 1;
  padding: 0.25rem 0 0.5rem;
}

.card-top {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  margin-bottom: 0.75rem;
}

/* Avatar */
.donor-avatar {
  width: 3rem;
  height: 3rem;
  min-width: 3rem;
  border-radius: 50%;
  background: #fee2e2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.625rem;
}

.donor-avatar svg {
  width: 100%;
  height: 100%;
}

/* Info block */
.donor-info {
  flex: 1;
  min-width: 0;
}

.donor-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--gray-900, #111827);
  margin: 0 0 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.donor-location-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8125rem;
  color: var(--gray-500, #6b7280);
  margin-bottom: 0.2rem;
}

.loc-icon {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
}

.donor-last-donation {
  font-size: 0.8125rem;
  color: var(--gray-500, #6b7280);
  margin: 0;
}

/* Badges column */
.donor-badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.375rem;
  flex-shrink: 0;
}

.blood-type-badge {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: var(--primary-red, #dc2626);
  color: var(--white, #fff);
  font-size: 0.7rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  line-height: 1;
  box-shadow: 0 2px 4px rgba(220,38,38,0.3);
}

.avail-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 0.325rem;
  white-space: nowrap;
}

.avail-yes {
  background: #dcfce7;
  color: #15803d;
}

.avail-no {
  background: var(--gray-100, #f3f4f6);
  color: var(--gray-500, #6b7280);
}

/* Action Buttons */
.card-actions {
  display: flex;
  gap: 0.625rem;
}

.btn-call,
.btn-message {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
}

.btn-call svg,
.btn-message svg {
  width: 0.9rem;
  height: 0.9rem;
  flex-shrink: 0;
}

.btn-call {
  background: var(--primary-red, #dc2626);
  color: var(--white, #fff);
  border: 2px solid var(--primary-red, #dc2626);
  box-shadow: 0 2px 4px rgba(220,38,38,0.2);
}

.btn-call:hover {
  background: var(--primary-red-dark, #b91c1c);
  border-color: var(--primary-red-dark, #b91c1c);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(220,38,38,0.3);
}

.btn-message {
  background: var(--white, #fff);
  color: var(--primary-red, #dc2626);
  border: 2px solid var(--primary-red, #dc2626);
}

.btn-message:hover {
  background: #fef2f2;
  transform: translateY(-1px);
}

/* ── Spinner ────────────────────────────────────────────────── */
.spin-icon {
  width: 1rem;
  height: 1rem;
  animation: spin 0.75s linear infinite;
}

.spin-icon.large {
  width: 2.25rem;
  height: 2.25rem;
  margin-bottom: 0.75rem;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
