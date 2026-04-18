<template>
  <div>
    <div v-if="!showLocationInput">
      <form @submit.prevent="handleRegister" class="form">
        <div>
          <input 
            v-model="form.name"
            placeholder="Full Name" 
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
          <input 
            v-model="form.password"
            placeholder="Password (min 6 characters)" 
            type="password"
            required
            minlength="6"
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
            <span v-else class="location-text">📍 Location added</span>
          </button>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button 
          type="submit" 
          :disabled="loading || !form.lat || !form.lng"
          class="submit-button"
        >
          <span v-if="loading">Registering...</span>
          <span v-else>Register as Donor</span>
        </button>

        <div class="form-footer">
          <button
            type="button"
            @click="$emit('switch-to-login')"
            class="link-button"
          >
            Already have an account? Login
          </button>
        </div>
      </form>
    </div>
    
    <!-- Location Input Step -->
    <div v-else>
      <h3 class="location-title">Add Your Location</h3>
      <p class="location-subtitle">Search and select your location on the map</p>
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
import { reactive, ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import LocationSearch from './LocationSearch.vue'

const emit = defineEmits<{
  (e: 'register-success'): void
  (e: 'switch-to-login'): void
}>()

const { register, loading, error: authError } = useAuth()

const showLocationInput = ref(false)
const error = ref<string | null>(null)

const form = reactive({
  name: '',
  email: '',
  password: '',
  blood_group: '',
  phone: '',
  address: '',
  lat: 0,
  lng: 0
})

const handleLocationSelected = (location: { lat: number; lng: number; address: string }): void => {
  form.lat = location.lat
  form.lng = location.lng
  if (!form.address) {
    form.address = location.address
  }
  showLocationInput.value = false
}

const handleRegister = async (): Promise<void> => {
  error.value = null
  
  if (!form.lat || !form.lng) {
    error.value = 'Please add your location'
    return
  }

  try {
    await register({
      name: form.name,
      email: form.email,
      password: form.password,
      blood_group: form.blood_group,
      phone: form.phone,
      address: form.address,
      lat: form.lat,
      lng: form.lng
    })
    emit('register-success')
  } catch (err) {
    error.value = authError.value || 'Registration failed. Please try again.'
  }
}
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.input-field {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  position: relative;
  z-index: 1;
}

.input-field:focus {
  outline: none;
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
  z-index: 1001; /* Ensure focused inputs appear above other elements */
}

.textarea {
  resize: vertical;
  min-height: 4rem;
}

.button-row {
  margin: 0.25rem 0;
}

.location-button {
  width: 100%;
  padding: 0.625rem;
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.location-button:hover {
  background-color: #e5e7eb;
}

.location-text {
  color: #059669;
  font-weight: 500;
}

.error-message {
  padding: 0.75rem;
  background-color: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 0.375rem;
  color: #991b1b;
  font-size: 0.875rem;
}

.submit-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #dc2626;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 0.5rem;
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
}

.submit-button:hover:not(:disabled) {
  background-color: #b91c1c;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);
}

.submit-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.form-footer {
  text-align: center;
  padding-top: 0.5rem;
}

.link-button {
  background: none;
  border: none;
  color: #dc2626;
  font-size: 0.875rem;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.link-button:hover {
  color: #b91c1c;
}

.location-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.location-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 1rem 0;
}

.location-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.back-button-container {
  margin-top: 0.5rem;
}

.back-button {
  padding: 0.5rem 1rem;
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.back-button:hover {
  background-color: #e5e7eb;
}
</style>
