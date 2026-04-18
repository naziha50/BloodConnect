<template>
  <div class="search-container">
    <!-- Search Filters -->
    <div v-if="showFilters" class="filters-grid">
      <select 
        v-model="form.blood_group"
        class="input-field"
      >
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
      
      <div class="radius-input-container">
        <input 
          v-model="form.radius_km"
          placeholder="Search radius in km" 
          type="number"
          min="1"
          max="100"
          class="input-field"
        />
        <div class="radius-suffix">
          <span class="km-text">km</span>
        </div>
      </div>
    </div>
    
    <!-- Search Button -->
    <div v-if="showSearchButton" class="search-button-container">
      <button 
        @click="search" 
        :disabled="loading"
        class="search-button"
      >
        <span v-if="loading">
          <svg class="loading-spinner" fill="none" viewBox="0 0 24 24">
            <circle class="loading-circle" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="loading-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Searching...
        </span>
        <span v-else>
          🩸 Find Blood Donors
        </span>
      </button>
    </div>

    <!-- Map -->
    <div v-if="showMap" class="map-container">
      <MapView :center="center" :donors="donors" />
    </div>

    <!-- Results -->
    <div v-if="donors.length > 0">
      <div class="results-header">
        <h3 class="results-title">
          Found {{ donors.length }} {{ donors.length === 1 ? 'Donor' : 'Donors' }}
        </h3>
        <div v-if="form.radius_km" class="results-subtitle">
          Within {{ form.radius_km }}km radius
        </div>
      </div>
      
      <div class="donors-grid">
        <div 
          v-for="donor in donors" 
          :key="donor.id"
          class="donor-card"
        >
          <div class="donor-header">
            <h4 class="donor-name">{{ donor.name }}</h4>
            <span class="blood-group-badge">
              {{ donor.blood_group }}
            </span>
          </div>
          
          <p class="donor-email">{{ donor.email }}</p>
          <p class="donor-address">{{ donor.address }}</p>
          
          <div class="donor-footer">
            <div class="distance">
              📍 {{ donor.distance_km?.toFixed(1) }}km away
            </div>
            <a 
              :href="`tel:${donor.phone}`"
              class="call-button"
            >
              📞 Call
            </a>
          </div>
        </div>
      </div>
    </div>
    
    <!-- No Results Message -->
    <div v-else-if="hasSearched && !loading" class="empty-state">
      <div class="empty-icon">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      </div>
      <h3 class="empty-title">No donors found</h3>
      <p class="empty-description">
        No blood donors found in the specified area. Try expanding the search radius or searching in a different location.
      </p>
    </div>

    <!-- Welcome Message -->
    <div v-else-if="!hasSearched" class="welcome-state">
      <div class="welcome-icon">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
      <h3 class="welcome-title">Ready to find blood donors</h3>
      <p class="welcome-description">
        Search for a location above to find available blood donors in your area.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useApi } from '../composables/useApi.ts'
import MapView from './MapView.vue'

// Props
const props = defineProps<{
  showMap?: boolean
  showFilters?: boolean
  showSearchButton?: boolean
  showLocationInfo?: boolean
}>()

// Set default values
const {
  showMap = true,
  showFilters = true,
  showSearchButton = true,
  showLocationInfo = true
} = props

// Events
const emit = defineEmits<{
  'donors-updated': [donors: Donor[]]
}>()

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

interface SearchForm {
  blood_group: string
  radius_km: number
}

interface CurrentLocation {
  lat: string
  lng: string
  address: string
}

interface Location {
  lat: number
  lng: number
  address: string
}

const { searchDonors, loading } = useApi()

const form = reactive<SearchForm>({
  blood_group: '',
  radius_km: 10
})

const currentLocation = reactive<CurrentLocation>({
  lat: '',
  lng: '',
  address: ''
})

const donors = ref<Donor[]>([])  
const hasSearched = ref<boolean>(false)

const center = computed(() => ({
  lat: Number(currentLocation.lat) || 0,
  lng: Number(currentLocation.lng) || 0
}))

const search = async () => {
  if (!currentLocation.lat || !currentLocation.lng) {
    alert('Please select a location first.')
    return
  }
  
  try {
    hasSearched.value = true
    const data = await searchDonors({
      blood_group: form.blood_group,
      lat: Number(currentLocation.lat),
      lng: Number(currentLocation.lng),
      radius_km: Number(form.radius_km)
    })
    donors.value = data
    emit('donors-updated', data)
  } catch (error) {
    console.error('Failed to search donors:', error)
    donors.value = []
    emit('donors-updated', [])
  }
}

const updateLocation = (location: Location): void => {
  currentLocation.lat = location.lat.toString()
  currentLocation.lng = location.lng.toString()
  currentLocation.address = location.address
  
  // Reset search results when location changes
  donors.value = []
  hasSearched.value = false
}

// Expose methods for parent component
defineExpose({
  updateLocation
})
</script>

<style scoped>
/* Container */
.search-container {
  background-color: white;
  padding: 1.5rem; /* p-6 */
  border-radius: 0.5rem; /* rounded-lg */
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06); /* shadow-md */
}

/* Filters Grid */
.filters-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem; /* gap-4 */
  margin-bottom: 1.5rem; /* mb-6 */
}

@media (min-width: 768px) {
  .filters-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Input Fields */
.input-field {
  padding: 0.75rem; /* p-3 */
  border: 1px solid #d1d5db; /* border-gray-300 */
  border-radius: 0.5rem; /* rounded-lg */
  width: 100%;
  font-size: 1rem;
  transition: all 0.2s;
}

.input-field:focus {
  outline: 2px solid #dc2626; /* focus:ring-2 focus:ring-red-600 */
  outline-offset: 2px;
  border-color: transparent; /* focus:border-transparent */
}

/* Radius Input */
.radius-input-container {
  position: relative;
}

.radius-suffix {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding-right: 0.75rem; /* pr-3 */
  pointer-events: none;
}

.km-text {
  color: #6b7280; /* text-gray-500 */
  font-size: 0.875rem; /* text-sm */
}

/* Search Button */
.search-button-container {
  margin-bottom: 1.5rem; /* mb-6 */
}

.search-button {
  width: 100%; /* w-full */
  padding: 0.75rem 1.5rem; /* px-6 py-3 */
  background-color: #dc2626; /* bg-red-600 */
  color: white;
  border-radius: 0.5rem; /* rounded-lg */
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1.125rem; /* text-lg */
  font-weight: 600; /* font-semibold */
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
}

.search-button:hover:not(:disabled) {
  background-color: #b91c1c; /* hover:bg-red-700 */
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);
}

.search-button:focus:not(:disabled) {
  outline: 2px solid #dc2626;
  outline-offset: 2px;
}

.search-button:disabled {
  opacity: 0.5; /* disabled:opacity-50 */
  cursor: not-allowed; /* disabled:cursor-not-allowed */
}

/* Loading Spinner */
.loading-spinner {
  animation: spin 1s linear infinite;
  margin-left: -0.25rem; /* -ml-1 */
  margin-right: 0.75rem; /* mr-3 */
  height: 1.25rem; /* h-5 */
  width: 1.25rem; /* w-5 */
  color: white;
  display: inline;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-circle {
  opacity: 0.25;
}

.loading-path {
  opacity: 0.75;
}

/* Map */
.map-container {
  margin-bottom: 1.5rem; /* mb-6 */
}

/* Results Header */
.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem; /* mb-4 */
}

.results-title {
  font-size: 1.25rem; /* text-xl */
  font-weight: 600; /* font-semibold */
  color: #1f2937; /* text-gray-800 */
}

.results-subtitle {
  font-size: 0.875rem; /* text-sm */
  color: #6b7280; /* text-gray-500 */
}

/* Donors Grid */
.donors-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem; /* gap-4 */
}

@media (min-width: 768px) {
  .donors-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .donors-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Donor Card */
.donor-card {
  padding: 1rem; /* p-4 */
  background-color: #f9fafb; /* bg-gray-50 */
  border-radius: 0.5rem; /* rounded-lg */
  border: 1px solid #e5e7eb; /* border-gray-200 */
  transition: box-shadow 0.2s; /* transition-shadow */
}

.donor-card:hover {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06); /* hover:shadow-md */
}

.donor-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem; /* mb-2 */
}

.donor-name {
  font-weight: 600; /* font-semibold */
  color: #1f2937; /* text-gray-800 */
  margin: 0;
}

.blood-group-badge {
  padding: 0.25rem 0.5rem; /* px-2 py-1 */
  background-color: #fef2f2; /* bg-red-100 */
  color: #dc2626; /* text-red-800 */
  border-radius: 0.25rem; /* rounded */
  font-size: 0.875rem; /* text-sm */
  font-weight: 500; /* font-medium */
}

.donor-email, .donor-address {
  color: #4b5563; /* text-gray-600 */
  font-size: 0.875rem; /* text-sm */
  margin: 0.25rem 0;
}

.donor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.distance {
  font-size: 0.875rem; /* text-sm */
  color: #6b7280; /* text-gray-500 */
}

.call-button {
  padding: 0.25rem 0.75rem; /* px-3 py-1 */
  background-color: #dc2626; /* bg-red-600 */
  color: white;
  border-radius: 0.25rem; /* rounded */
  text-decoration: none;
  font-size: 0.875rem; /* text-sm */
  font-weight: 500; /* font-medium */
  transition: all 0.2s; /* transition-colors */
  box-shadow: 0 1px 2px rgba(220, 38, 38, 0.2);
}

.call-button:hover {
  background-color: #b91c1c; /* hover:bg-red-700 */
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.3);
}

/* Empty States */
.empty-state, .welcome-state {
  text-align: center;
  padding: 3rem 0; /* py-12 */
}

.empty-icon, .welcome-icon {
  color: #d1d5db; /* text-gray-400 */
  margin-bottom: 1rem; /* mb-4 */
}

.welcome-icon {
  color: #fca5a5; /* text-red-400 */
}

.icon {
  width: 4rem; /* w-16 */
  height: 4rem; /* h-16 */
  margin: 0 auto;
}

.empty-title, .welcome-title {
  font-size: 1.125rem; /* text-lg */
  font-weight: 500; /* font-medium */
  color: #111827; /* text-gray-900 */
  margin-bottom: 0.5rem; /* mb-2 */
}

.empty-description, .welcome-description {
  color: #6b7280; /* text-gray-500 */
  max-width: 28rem; /* max-w-md */
  margin: 0 auto;
}
</style>