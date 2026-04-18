<template>
  <div>
    <div v-if="!showLocationInput">
    <form @submit.prevent="submit" class="form">
      <div>
        <input 
          v-model="form.name"
          placeholder="Full Name" 
          required
          class="input-field"
        />
      </div>
      <div>
        <select 
          v-model="form.blood_group"
          required
          class="input-field"
        >
          <option value="">Select Blood Group</option>
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
      <div>
        <input 
          v-model="form.phone"
          placeholder="Phone Number" 
          type="tel"
          required
          class="input-field"
        />
      </div>
      <div>
        <input 
          v-model="form.email"
          placeholder="Email Address" 
          type="email"
          required
          class="input-field"
        />
      </div>
      <div>
        <textarea 
          v-model="form.address"
          placeholder="Full Address" 
          required
          rows="3"
          class="input-field textarea"
        ></textarea>
      </div>
      <div class="button-row">
        <button 
          type="button"
          @click="showLocationInput = true"
          class="location-button"
        >
          <span v-if="!form.lat || !form.lng">📍 Add your location</span>
          <span v-else class="location-text">📍 {{ locationText }}</span>
        </button>
      </div>
      <button 
        type="submit" 
        :disabled="loading"
        class="submit-button"
      >
        <span v-if="loading">Saving...</span>
        <span v-else>Save Donor Information</span>
      </button>
    </form>
    
    <div v-if="status" class="status-message" :class="statusClass">
      {{ status }}
    </div>
    </div>
    
    <!-- Location Input Step -->
    <div v-else>
      <h3 class="location-title">Add Your Location</h3>
      <div class="location-form">
        <LocationSearch @location-selected="handleLocationSelected" />
        <div class="back-button-container">
          <button 
            @click="showLocationInput = false"
            class="back-button"
          >
            ← Back to form
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useApi } from '../composables/useApi.ts'
import LocationSearch from './LocationSearch.vue'

interface Location {
  lat: number
  lng: number
  address: string
}

interface DonorFormData {
  name: string
  blood_group: string
  phone: string
  email: string
  address: string
  lat: string
  lng: string
}

const emit = defineEmits<{
  'donor-saved': []
}>()

const { createDonor, loading } = useApi()

const form = reactive<DonorFormData>({
  name: '',
  blood_group: '',
  phone: '',
  email: '',
  address: '',
  lat: '',
  lng: ''
})

const status = ref<string>('')
const isError = ref<boolean>(false)
const showLocationInput = ref<boolean>(false)

const statusClass = computed(() => {
  return isError.value 
    ? 'bg-red-100 text-red-700 border border-red-300'
    : 'bg-green-100 text-green-700 border border-green-300'
})

const locationText = computed(() => {
  if (form.lat && form.lng) {
    return `${Number(form.lat).toFixed(4)}, ${Number(form.lng).toFixed(4)}`
  }
  return ''
})

const submit = async () => {
  try {
    await createDonor({
      ...form,
      lat: Number(form.lat),
      lng: Number(form.lng)
    })
    status.value = 'Donor information saved successfully!'
    isError.value = false
    
    // Clear form
    Object.keys(form).forEach(key => {
      form[key] = ''
    })
    
    // Clear status after 3 seconds
    setTimeout(() => {
      status.value = ''
    }, 3000)
    
    // Emit event to close modal
    emit('donor-saved')
  } catch (err) {
    status.value = 'Failed to save donor information. Please try again.'
    isError.value = true
    console.error(err)
  }
}

const handleLocationSelected = (location: Location): void => {
  form.lat = location.lat.toString()
  form.lng = location.lng.toString()
  showLocationInput.value = false
}
</script>

<style scoped>
/* Form Styles */
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem; /* space-y-4 */
}

.form * {
  box-sizing: border-box; /* ensure all children use border-box sizing */
}

/* Input Field Styles */
.input-field {
  width: 100%; /* w-full */
  padding: 0.75rem; /* p-3 */
  border: 1px solid #d1d5db; /* border-gray-300 */
  border-radius: 0.5rem; /* rounded-lg */
  font-size: 1rem;
  transition: all 0.2s;
  box-sizing: border-box; /* ensure padding doesn't cause overflow */
}

.input-field:focus {
  outline: 2px solid #dc2626; /* focus:ring-2 focus:ring-red-600 */
  outline-offset: 2px;
  border-color: transparent; /* focus:border-transparent */
}

.textarea {
  resize: none;
  min-height: 4.5rem;
}

/* Button Row */
.button-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .button-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Location Button */
.location-button {
  width: 100%; /* w-full */
  padding: 0.75rem; /* p-3 */
  border: 1px solid #d1d5db; /* border-gray-300 */
  border-radius: 0.5rem; /* rounded-lg */
  text-align: left;
  color: #6b7280; /* text-gray-500 */
  background-color: white;
  cursor: pointer;
  transition: background-color 0.2s;
  box-sizing: border-box; /* ensure padding doesn't cause overflow */
}

.location-button:hover {
  background-color: #f9fafb; /* hover:bg-gray-50 */
}

.location-button:focus {
  outline: 2px solid #dc2626;
  outline-offset: 2px;
  border-color: transparent;
}

.location-text {
  color: #374151; /* text-gray-700 */
}

/* Submit Button */
.submit-button {
  width: 100%; /* w-full */
  padding: 0.75rem 1.5rem; /* px-6 py-3 */
  background-color: #dc2626; /* bg-red-600 */
  color: white;
  border-radius: 0.5rem; /* rounded-lg */
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
  box-sizing: border-box; /* ensure padding doesn't cause overflow */
  box-shadow: 0 4px 6px rgba(220, 38, 38, 0.2);
}

.submit-button:hover:not(:disabled) {
  background-color: #b91c1c; /* hover:bg-red-700 */
  transform: translateY(-1px);
  box-shadow: 0 6px 8px rgba(220, 38, 38, 0.3);
}

.submit-button:focus {
  outline: 2px solid #dc2626;
  outline-offset: 2px;
}

.submit-button:disabled {
  opacity: 0.5; /* disabled:opacity-50 */
  cursor: not-allowed; /* disabled:cursor-not-allowed */
}

/* Status Message */
.status-message {
  margin-top: 1rem; /* mt-4 */
  padding: 0.75rem; /* p-3 */
  border-radius: 0.5rem; /* rounded-lg */
  border: 1px solid;
}

.success {
  background-color: #f0fdf4; /* bg-green-100 */
  color: #15803d; /* text-green-700 */
  border-color: #bbf7d0; /* border-green-300 */
}

.error {
  background-color: #fef2f2; /* bg-red-100 */
  color: #dc2626; /* text-red-700 */
  border-color: #fecaca; /* border-red-300 */
}

/* Location Input Section */
.location-title {
  font-size: 1.125rem; /* text-lg */
  font-weight: 600; /* font-semibold */
  margin-bottom: 1rem; /* mb-4 */
  color: #1f2937; /* text-gray-800 */
}

.location-form {
  display: flex;
  flex-direction: column;
  gap: 1rem; /* space-y-4 */
}

.back-button-container {
  text-align: center; /* text-center */
}

.back-button {
  font-size: 0.875rem; /* text-sm */
  color: #6b7280; /* text-gray-500 */
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
}

.back-button:hover {
  color: #374151; /* hover:text-gray-700 */
}
</style>