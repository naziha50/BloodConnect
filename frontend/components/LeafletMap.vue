<template>
  <div ref="mapContainer" class="leaflet-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import type * as L from 'leaflet'

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

interface Center {
  lat: number
  lng: number
}

const props = defineProps<{
  center: Center
  donors: Donor[]
  radiusKm?: number
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
const map = ref<L.Map | null>(null)
const searchMarker = ref<L.Marker | null>(null)
const radiusCircle = ref<L.Circle | null>(null)
const donorMarkers = ref<L.Marker[]>([])
let leaflet: typeof import('leaflet').default | null = null

onMounted(async () => {
  console.log('LeafletMap mounting...')
  console.log('Props received:', { center: props.center, donorCount: props.donors.length })
  
  try {
    // Import Leaflet dynamically to avoid SSR issues
    leaflet = (await import('leaflet')).default
    console.log('Leaflet imported successfully')
    
    // Fix leaflet marker icons for bundlers
    delete leaflet.Icon.Default.prototype._getIconUrl
    leaflet.Icon.Default.mergeOptions({
      iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
      iconUrl: '/leaflet/images/marker-icon.png', 
      shadowUrl: '/leaflet/images/marker-shadow.png',
    })

    // Initialize map
    const safeCenter = getSafeCenter()
    const initialZoom = 13 // City/neighbourhood level zoom
    console.log('Initializing map with center:', safeCenter, 'zoom:', initialZoom)
    map.value = leaflet.map(mapContainer.value).setView([safeCenter.lat, safeCenter.lng], initialZoom)

    // Add tile layer
    leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map.value)
    
    console.log('Map initialized successfully')

    // Add markers
    updateSearchMarker()
    updateDonorMarkers()
  } catch (error) {
    console.error('Error initializing map:', error)
  }
})

const getSafeCenter = (): { lat: number; lng: number } => {
  return {
    lat: Number.isFinite(props.center.lat) ? props.center.lat : 0,
    lng: Number.isFinite(props.center.lng) ? props.center.lng : 0
  }
}

const updateSearchMarker = (): void => {
  if (!leaflet || !map.value) return

  // Remove existing search marker and radius circle
  if (searchMarker.value) {
    map.value.removeLayer(searchMarker.value)
  }
  if (radiusCircle.value) {
    map.value.removeLayer(radiusCircle.value)
  }

  const safeCenter = getSafeCenter()

  // Only add marker if we have valid coordinates
  if (safeCenter.lat !== 0 || safeCenter.lng !== 0) {
    // "You" marker — blue circle with label
    const searchIcon = leaflet.divIcon({
      html: `<div style="display:flex;flex-direction:column;align-items:center;"><div style="background:#3B82F6;width:38px;height:38px;border-radius:50%;border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:700;">You</div></div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      className: 'search-center-marker'
    })

    searchMarker.value = leaflet.marker([safeCenter.lat, safeCenter.lng], { icon: searchIcon })
      .addTo(map.value)
      .bindPopup('<b>Your Location</b>')

    // Draw search radius circle
    const km = props.radiusKm ?? 10
    radiusCircle.value = leaflet.circle([safeCenter.lat, safeCenter.lng], {
      radius: km * 1000,
      color: '#3B82F6',
      fillColor: '#3B82F6',
      fillOpacity: 0.08,
      weight: 1.5
    }).addTo(map.value)

    // Update map view to city-level zoom on new search location
    map.value.setView([safeCenter.lat, safeCenter.lng], 13, { animate: true })
  }
}

const updateDonorMarkers = (): void => {
  console.log('Updating donor markers for', props.donors.length, 'donors')
  if (!leaflet || !map.value) {
    console.log('Map or Leaflet not ready')
    return
  }

  // Remove existing donor markers
  donorMarkers.value.forEach(marker => {
    map.value!.removeLayer(marker)
  })
  donorMarkers.value = []

  // Add new donor markers
  props.donors.forEach((donor, index) => {
    console.log(`Processing donor ${index}:`, donor)
    if (Number.isFinite(donor.lat) && Number.isFinite(donor.lng)) {
      const pinColor = donor.available !== false ? '#DC2626' : '#9CA3AF'
      const donorIcon = leaflet.divIcon({
        html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;"><div style="background:${pinColor};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.35);"></div><span style="background:white;padding:1px 5px;border-radius:3px;font-size:10px;font-weight:700;color:#1f2937;box-shadow:0 1px 3px rgba(0,0,0,0.2);white-space:nowrap;">${donor.blood_group}</span></div>`,
        iconSize: [36, 48],
        iconAnchor: [18, 28],
        className: 'donor-marker'
      })

      const marker = leaflet.marker([donor.lat, donor.lng], { icon: donorIcon })
        .addTo(map.value)
        .bindPopup(`
          <div style="padding:0.625rem;min-width:180px;">
            <h4 style="font-weight:700;color:#1f2937;margin:0 0 0.4rem;font-size:1rem;">${donor.name}</h4>
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem;">
              <span style="background:${pinColor};color:white;padding:0.2rem 0.5rem;border-radius:50%;font-weight:700;font-size:0.8rem;width:2rem;height:2rem;display:flex;align-items:center;justify-content:center;">${donor.blood_group}</span>
              <span style="font-size:0.8rem;color:${donor.available !== false ? '#15803d' : '#6b7280'};font-weight:600;">${donor.available !== false ? 'Available' : 'Not Available'}</span>
            </div>
            <p style="font-size:0.8rem;color:#4b5563;margin:0.3rem 0;">${donor.address || ''}</p>
            ${donor.distance_km !== undefined ? `<p style="font-size:0.8rem;color:#6b7280;margin:0.3rem 0;">📍 ${donor.distance_km.toFixed(1)} km away</p>` : ''}
            <div style="margin-top:0.625rem;display:flex;gap:0.4rem;">
              <a href="tel:${donor.phone}" style="flex:1;text-align:center;padding:0.4rem 0.75rem;background:#dc2626;color:white;border-radius:0.375rem;font-size:0.8rem;text-decoration:none;font-weight:600;">Call</a>
              <a href="mailto:${donor.email || ''}" style="flex:1;text-align:center;padding:0.4rem 0.75rem;background:white;color:#dc2626;border:1px solid #dc2626;border-radius:0.375rem;font-size:0.8rem;text-decoration:none;font-weight:600;">Message</a>
            </div>
          </div>
        `)
      
      donorMarkers.value.push(marker)
      console.log(`Added marker for donor ${donor.name}`)
    } else {
      console.log(`Invalid coordinates for donor ${donor.name}:`, donor.lat, donor.lng)
    }
  })

  console.log(`Added ${donorMarkers.value.length} donor markers`)

  // Adjust map bounds to show all markers
  if (props.donors.length > 0) {
    const validMarkers = [searchMarker.value, ...donorMarkers.value].filter(Boolean)
    if (validMarkers.length > 0) {
      const group = new leaflet.featureGroup(validMarkers)
      if (group.getBounds().isValid()) {
        // If we have a search location but also donors, fit to show both
        if (searchMarker.value && donorMarkers.value.length > 0) {
          map.value.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 13 })
        } else if (donorMarkers.value.length === 1) {
          // If only one donor, zoom to it but not too close
          map.value.setView([props.donors[0].lat, props.donors[0].lng], 13)
        } else {
          // Multiple donors, fit bounds
          map.value.fitBounds(group.getBounds(), { padding: [25, 25] })
        }
      }
    }
  }
}

// Watch for changes in center and donors
watch(() => props.center, updateSearchMarker, { deep: true })
watch(() => props.donors, updateDonorMarkers, { deep: true })
watch(() => props.radiusKm, updateSearchMarker)

onUnmounted(() => {
  if (map.value) {
    map.value.remove()
    map.value = null
  }
})
</script>

<style scoped>
/* Leaflet Container */
.leaflet-container {
  width: 100%; /* w-full */
  height: 24rem; /* h-96 */
  border-radius: 0.5rem; /* rounded-lg */
  border: 2px solid #e5e7eb; /* border-gray-200 */
  overflow: hidden;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05); /* shadow-lg */
}

/* Custom marker styles */
:deep(.search-center-marker) {
  background: transparent !important;
  border: none !important;
}

:deep(.donor-marker) {
  background: transparent !important;
  border: none !important;
}
</style>