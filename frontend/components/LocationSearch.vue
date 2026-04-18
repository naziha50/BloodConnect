<template>
  <div class="search-container">
    <div class="input-container">
      <input
        v-model="searchQuery"
        @input="handleInput"
        @focus="showSuggestions = true"
        @keydown.enter.prevent="handleEnterKey"
        @keydown.arrow-down.prevent="navigateDown"
        @keydown.arrow-up.prevent="navigateUp"
        @keydown.escape="clearSearch"
        :placeholder="placeholder || 'Search by city, province, or country...'"
        class="search-input"
      />
      
      <!-- Loading Spinner -->
      <div v-if="loading" class="loading-container">
        <svg class="loading-spinner" fill="none" viewBox="0 0 24 24">
          <circle class="loading-circle" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="loading-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    </div>

    <!-- Suggestions Dropdown -->
    <div 
      v-if="showSuggestions && suggestions.length > 0" 
      class="suggestions-dropdown"
    >
      <div
        v-for="(suggestion, index) in suggestions"
        :key="suggestion.place_id"
        @click="selectLocation(suggestion)"
        @mouseenter="selectedIndex = index"
        :class="[
          'suggestion-item',
          selectedIndex === index ? 'selected' : ''
        ]"
      >
        <div class="suggestion-name">{{ suggestion.display_name }}</div>
        <div class="suggestion-details">{{ suggestion.type }} • {{ suggestion.country }}</div>
      </div>
    </div>

    <!-- No Results -->
    <div 
      v-if="showSuggestions && searchQuery && suggestions.length === 0 && !loading"
      class="no-results"
    >
      <div class="no-results-text">No locations found for "{{ searchQuery }}"</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Suggestion {
  place_id: string
  display_name: string
  lat: number
  lng: number
  type: string
  country: string
}

interface LocationData {
  lat: number
  lng: number
  address: string
}

// Props
const props = defineProps<{
  placeholder?: string
}>()

const emit = defineEmits<{
  'location-selected': [location: LocationData]
}>()

const searchQuery = ref<string>('')
const suggestions = ref<Suggestion[]>([])
const showSuggestions = ref<boolean>(false)
const loading = ref<boolean>(false)
const selectedIndex = ref<number>(-1)
let searchTimeout: NodeJS.Timeout | null = null

const handleInput = (): void => {
  selectedIndex.value = -1
  
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  if (searchQuery.value.length < 2) {
    suggestions.value = []
    return
  }
  
  searchTimeout = setTimeout(() => {
    searchLocation()
  }, 300)
}

const searchLocation = async () => {
  if (searchQuery.value.length < 2) return
  
  loading.value = true
  console.log('Searching for:', searchQuery.value)
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.value)}&limit=10&addressdetails=1`
    )
    
    if (!response.ok) throw new Error('Search failed')
    
    const data = await response.json()
    console.log('Search results:', data)
    
    suggestions.value = data.map(item => ({
      place_id: item.place_id,
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type || 'location',
      country: item.address?.country || ''
    }))
    
    console.log('Processed suggestions:', suggestions.value)
  } catch (error) {
    console.error('Location search failed:', error)
    suggestions.value = []
  } finally {
    loading.value = false
  }
}

const selectLocation = (location: Suggestion): void => {
  searchQuery.value = location.display_name
  showSuggestions.value = false
  suggestions.value = []
  selectedIndex.value = -1
  
  emit('location-selected', {
    lat: location.lat,
    lng: location.lng,
    address: location.display_name
  })
}

const navigateDown = () => {
  if (selectedIndex.value < suggestions.value.length - 1) {
    selectedIndex.value++
  }
}

const navigateUp = () => {
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  } else if (selectedIndex.value === -1) {
    selectedIndex.value = suggestions.value.length - 1
  }
}

const handleEnterKey = () => {
  if (selectedIndex.value >= 0 && selectedIndex.value < suggestions.value.length) {
    selectLocation(suggestions.value[selectedIndex.value])
  } else if (suggestions.value.length > 0) {
    selectLocation(suggestions.value[0])
  }
}

const clearSearch = () => {
  showSuggestions.value = false
  selectedIndex.value = -1
}

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target?.closest('.search-container')) {
    showSuggestions.value = false
  }
})
</script>

<style scoped>
.search-container {
  position: relative;
  width: 100%;
  height: 100%;
  flex: 1;
}

.input-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  font-size: 1rem;
  font-weight: 400;
  color: #374151;
  background: transparent;
  padding: 0;
  padding-left: 8px;
}

.search-input::placeholder {
  color: #9CA3AF;
  font-weight: 400;
}

/* Loading Container */
.loading-container {
  position: absolute;
  right: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Loading Spinner */
.loading-spinner {
  animation: spin 1s linear infinite;
  height: 1rem;
  width: 1rem;
  color: #6B7280;
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

/* Suggestions Dropdown */
.suggestions-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: -0.75rem;
  right: -0.75rem;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  border: 1px solid #E5E7EB;
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
}

/* Suggestion Item */
.suggestion-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid #F3F4F6;
  transition: background-color 0.2s ease;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover,
.suggestion-item.selected {
  background-color: #FEF2F2;
  border-left: 3px solid #DC2626;
}

.suggestion-name {
  font-size: 0.875rem;
  color: #1F2937;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.suggestion-details {
  font-size: 0.75rem;
  color: #6B7280;
}

/* No Results */
.no-results {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: -0.75rem;
  right: -0.75rem;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  border: 1px solid #E5E7EB;
  z-index: 1000;
  padding: 1rem;
}

.no-results-text {
  font-size: 0.875rem;
  color: #6B7280;
  text-align: center;
}
</style>