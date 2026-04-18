<template>
  <div class="login-container">
    <form @submit.prevent="handleLogin" class="login-form">
      <div class="form-group">
        <label for="email" class="form-label">Email</label>
        <input
          id="email"
          v-model="credentials.email"
          type="email"
          required
          placeholder="your.email@example.com"
          class="form-input"
        />
      </div>

      <div class="form-group">
        <label for="password" class="form-label">Password</label>
        <input
          id="password"
          v-model="credentials.password"
          type="password"
          required
          placeholder="Enter your password"
          class="form-input"
        />
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="submit-button"
      >
        {{ loading ? 'Logging in...' : 'Login' }}
      </button>

      <div class="form-footer">
        <button
          type="button"
          @click="$emit('switch-to-register')"
          class="link-button"
        >
          Don't have an account? Register as a donor
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const emit = defineEmits<{
  (e: 'login-success'): void
  (e: 'switch-to-register'): void
}>()

const { login, loading, error: authError } = useAuth()

const credentials = reactive({
  email: '',
  password: ''
})

const error = ref<string | null>(null)

const handleLogin = async (): Promise<void> => {
  error.value = null
  
  try {
    await login(credentials)
    emit('login-success')
  } catch (err) {
    error.value = authError.value || 'Login failed. Please check your credentials.'
  }
}
</script>

<style scoped>
.login-container {
  width: 100%;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.form-input {
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  position: relative;
  z-index: 1;
}

.form-input:focus {
  outline: none;
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
  z-index: 1001; /* Ensure focused inputs appear above other elements */
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
  padding: 0.625rem 1rem;
  background-color: #dc2626;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
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
</style>
