<template>
  <div class="app-container">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <div class="header-inner">
          <div class="logo-container">
            <div class="logo-icon">🩸</div>
            <h1 class="logo">BloodConnect</h1>
          </div>
          
          <!-- Navigation Menu -->
          <nav class="navigation">
            <a href="#" @click="currentSection = 'home'" class="nav-link" :class="{ active: currentSection === 'home' }">Home</a>
            <a href="#" @click="currentSection = 'find-donor'" class="nav-link" :class="{ active: currentSection === 'find-donor' }">Find Donor</a>
            <a href="#" @click="showRegisterModal" class="nav-link" :class="{ active: currentSection === 'register' }">Register</a>
          </nav>

          <!-- Login Button -->
          <button 
            @click="showAuthModal = !showAuthModal"
            class="login-button"
          >
            <svg v-if="!isAuthenticated" class="login-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
            {{ isAuthenticated ? 'Profile' : 'Login' }}
          </button>
          
          <!-- Auth Modal -->
          <div v-if="showAuthModal" class="auth-modal">
            <!-- Authenticated User View -->
            <div v-if="isAuthenticated && user" class="user-profile">
              <div class="modal-header">
                <h3 class="modal-title">Your Profile</h3>
                <p class="modal-subtitle">Donor Information</p>
              </div>
              <div class="modal-content">
                <div class="profile-info">
                  <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">{{ user.name }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Blood Group:</span>
                    <span class="blood-badge">{{ user.blood_group }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">{{ user.email }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">{{ user.phone }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Address:</span>
                    <span class="info-value">{{ user.address }}</span>
                  </div>
                </div>
                <button @click="handleLogout" class="logout-button">
                  Logout
                </button>
              </div>
            </div>

            <!-- Guest User View (Not Logged In) -->
            <div v-else>
              <!-- Show Login Form -->
              <div v-if="activeView === 'login'">
                <div class="modal-header">
                  <h3 class="modal-title">Login to Your Account</h3>
                  <p class="modal-subtitle">Access your donor profile</p>
                </div>
                <div class="modal-content">
                  <Login 
                    @login-success="handleLoginSuccess" 
                    @switch-to-register="activeView = 'register'"
                  />
                </div>
              </div>

              <!-- Show Register Form -->
              <div v-else-if="activeView === 'register'">
                <div class="modal-header">
                  <h3 class="modal-title">Register as a Donor</h3>
                  <p class="modal-subtitle">Join our community of life-savers</p>
                </div>
                <div class="modal-content">
                  <Register 
                    @register-success="handleRegisterSuccess" 
                    @switch-to-login="activeView = 'login'"
                  />
                </div>
              </div>

              <!-- Show Auth Options (Initial View) -->
              <div v-else>
                <div class="modal-header">
                  <h3 class="modal-title">Welcome to BloodConnect</h3>
                  <p class="modal-subtitle">Save lives by donating blood</p>
                </div>
                <div class="modal-content">
                  <div class="auth-options">
                    <button @click="activeView = 'register'" class="auth-option-button primary">
                      <svg class="option-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                      </svg>
                      <span>Register as a Donor</span>
                    </button>
                    <button @click="activeView = 'login'" class="auth-option-button secondary">
                      <svg class="option-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                      </svg>
                      <span>Login to Your Account</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Find Donor Page -->
      <FindDonor
        v-if="currentSection === 'find-donor'"
        :initial-location="searchForm.location"
        :initial-blood-group="searchForm.bloodGroup"
      />

      <!-- Home Sections -->
      <template v-else>
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-content">
          <h1 class="hero-title">Save Lives Through Blood Donation</h1>
          <p class="hero-subtitle">Connect with nearby blood donors instantly during emergencies. Fast, reliable, and life-saving.</p>
          
          <!-- Search Form -->
          <div class="search-form">
            <div class="search-inputs">
              <div class="blood-group-select">
                <select 
                  v-model="searchForm.bloodGroup"
                  class="blood-group-dropdown"
                >
                  <option value="" disabled>Select Blood Group</option>
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

              <div class="location-input">
                <svg class="location-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <LocationSearch 
                  @location-selected="handleLocationSelected"
                  placeholder="Enter your location"
                />
              </div>

              <button @click="searchDonors" class="search-button">
                <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                Find Blood Now
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- How It Works Section -->
      <section class="how-it-works-section">
        <div class="section-content">
          <div class="section-header">
            <h2 class="section-title">How BloodConnect Works</h2>
            <p class="section-subtitle">Simple steps to save a life</p>
          </div>

          <div class="steps-grid">
            <div class="step">
              <div class="step-icon search">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
              <div class="step-content">
                <h3 class="step-title">1. Search for Donors</h3>
                <p class="step-description">Enter the required blood group and your location to find nearby donors instantly.</p>
              </div>
            </div>

            <div class="step">
              <div class="step-icon location">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                </svg>
              </div>
              <div class="step-content">
                <h3 class="step-title">2. View on Map</h3>
                <p class="step-description">See available donors on an interactive map with distance and availability status.</p>
              </div>
            </div>

            <div class="step">
              <div class="step-icon heart">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
              </div>
              <div class="step-content">
                <h3 class="step-title">3. Contact & Save</h3>
                <p class="step-description">Connect with donors directly through call or message to arrange donation.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Statistics Section -->
      <section class="statistics-section">
        <div class="section-content">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon donors">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-1.5-6h-6v3h8v9h-3z"/>
                  <path d="M6 6c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-1.5-6H5v3h8v9H6z"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-number">1,247</div>
                <div class="stat-label">Registered Donors</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon lives">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-number">3,421</div>
                <div class="stat-label">Lives Saved</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon time">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-number">< 15 min</div>
                <div class="stat-label">Average Response Time</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Call to Action Section -->
      <section class="cta-section">
        <div class="cta-content">
          <h2 class="cta-title">Ready to Make a Difference?</h2>
          <p class="cta-subtitle">Join our community of life-savers today and help those in need during emergencies.</p>
          
          <div class="cta-buttons">
            <button @click="showRegisterModal" class="cta-button register">
              Register as Donor
            </button>
            <button @click="scrollToSearch" class="cta-button find">
              Find Blood Now
            </button>
          </div>
        </div>
      </section>
      </template>
    </main>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <p class="copyright">© 2026 BloodConnect. All rights reserved. Saving lives together.</p>
      </div>
    </footer>

    <!-- Overlay for modal -->
    <div v-if="showAuthModal" @click="showAuthModal = false" class="modal-overlay"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import FindDonor from './components/FindDonor.vue'
import LocationSearch from './components/LocationSearch.vue'
import Login from './components/Login.vue'
import Register from './components/Register.vue'
import { useAuth } from './composables/useAuth.ts'

// Interfaces
interface Location {
  lat: number
  lng: number
  address: string
}

// Composables
const { user, isAuthenticated, logout } = useAuth()

// Reactive state
const showAuthModal = ref<boolean>(false)
const activeView = ref<'options' | 'login' | 'register'>('options')
const currentSection = ref<string>('home')

// Search form
const searchForm = reactive({
  bloodGroup: '',
  location: null as Location | null
})

// Methods
const handleLocationSelected = (location: Location): void => {
  searchForm.location = location
}

const searchDonors = async (): Promise<void> => {
  if (!searchForm.location) {
    alert('Please select a location first')
    return
  }

  currentSection.value = 'find-donor'
}

const handleLoginSuccess = (): void => {
  showAuthModal.value = false
  activeView.value = 'options'
}

const handleRegisterSuccess = (): void => {
  showAuthModal.value = false
  activeView.value = 'options'
}

const handleLogout = (): void => {
  logout()
  showAuthModal.value = false
  activeView.value = 'options'
}

const showRegisterModal = (): void => {
  activeView.value = 'register'
  showAuthModal.value = true
  currentSection.value = 'register'
}

const scrollToSearch = (): void => {
  document.querySelector('.hero-section')?.scrollIntoView({ behavior: 'smooth' })
}

</script>

<style scoped>
/* Reset and Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app-container {
  min-height: 100vh;
  background-color: var(--white);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}

/* Header Styles */
.header {
  background-color: var(--white);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  width: 100%;
  margin: 0;
  padding: 0;
  border-bottom: 1px solid var(--gray-200);
}

.header-content {
  width: 100%;
  margin: 0;
  padding: 0 2rem;
}

.header-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 4rem;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary-red);
  margin: 0;
}

.navigation {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.nav-link {
  color: var(--gray-700);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  padding: 0.5rem 0;
  border-bottom: 2px solid transparent;
}

.nav-link:hover,
.nav-link.active {
  color: var(--primary-red);
  border-bottom-color: var(--primary-red);
}

.login-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--primary-red);
  color: var(--white);
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.login-button:hover {
  background: var(--primary-red-dark);
  transform: translateY(-1px);
}

.login-icon {
  width: 1.25rem;
  height: 1.25rem;
}

/* Auth Modal Styles */
.auth-modal {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--white);
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  min-width: 320px;
  max-width: 400px;
  z-index: 1001;
  margin-top: 0.5rem;
}

.modal-header {
  padding: 1.5rem 1.5rem 0;
  border-bottom: 1px solid var(--gray-200);
  margin-bottom: 1rem;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: 0.25rem;
}

.modal-subtitle {
  font-size: 0.875rem;
  color: var(--gray-600);
  margin-bottom: 1rem;
}

.modal-content {
  padding: 0 1.5rem 1.5rem;
}

/* Profile Info Styles */
.profile-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--gray-100);
}

.info-label {
  font-weight: 500;
  color: var(--gray-700);
  font-size: 0.875rem;
}

.info-value {
  color: var(--gray-900);
  font-size: 0.875rem;
}

.blood-badge {
  background: var(--primary-red);
  color: var(--white);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.logout-button {
  width: 100%;
  background: var(--primary-red);
  color: var(--white);
  border: none;
  padding: 0.75rem;
  border-radius: 0.375rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 1rem;
  transition: all 0.2s ease;
}

.logout-button:hover {
  background: var(--primary-red-dark);
}

/* Auth Options */
.auth-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.auth-option-button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border: 2px solid;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  background: transparent;
}

.auth-option-button.primary {
  border-color: var(--primary-red);
  color: var(--primary-red);
  background: var(--white);
}

.auth-option-button.primary:hover {
  background: var(--primary-red);
  color: var(--white);
}

.auth-option-button.secondary {
  border-color: var(--gray-300);
  color: var(--gray-700);
}

.auth-option-button.secondary:hover {
  border-color: var(--gray-400);
  background: var(--gray-50);
}

.option-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

/* Main Content */
.main-content {
  flex: 1;
  width: 100%;
  margin: 0;
  padding: 0;
  padding-top: 4rem;
}

/* Hero Section */
.hero-section {
  background: linear-gradient(135deg, var(--primary-red) 0%, var(--primary-red-dark) 100%);
  color: var(--white);
  padding: 4rem 0;
  text-align: center;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 2rem;
}

.hero-title {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 1rem;
  line-height: 1.1;
}

.hero-subtitle {
  font-size: 1.25rem;
  margin-bottom: 3rem;
  opacity: 0.95;
  line-height: 1.6;
}

/* Search Form */
.search-form {
  background: var(--white);
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  margin: 0 auto;
  max-width: 900px;
  width: calc(100% - 4rem);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.search-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 1rem;
  align-items: center;
}

.blood-group-select:hover .blood-group-dropdown,
.location-input:hover {
  border-color: var(--gray-300);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.blood-group-select {
  position: relative;
  display: flex;
  align-items: center;
  height: 60px;
  min-width: 0;
}

.location-icon {
  position: absolute;
  left: 1rem;
  width: 1.25rem;
  height: 1.25rem;
  color: var(--gray-400);
  z-index: 2;
  pointer-events: none;
}

.blood-group-dropdown {
  width: 100%;
  height: 60px;
  padding: 0 3rem 0 1rem;
  border: 2px solid var(--gray-300);
  border-radius: 0.75rem;
  font-size: 1rem;
  font-weight: 400;
  background: var(--white);
  color: var(--gray-600);
  appearance: none;
  cursor: pointer;
  transition: all 0.2s ease;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
}

.blood-group-dropdown option {
  color: var(--gray-900);
  font-weight: 500;
}

.blood-group-dropdown option:disabled {
  color: var(--gray-400);
}

.blood-group-dropdown:focus {
  outline: none;
  border-color: var(--primary-red);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.location-input {
  position: relative;
  display: flex;
  align-items: center;
  height: 60px;
  min-width: 0;
  border: 2px solid var(--gray-300);
  border-radius: 0.75rem;
  background: var(--white);
  padding: 0 1rem 0 3rem;
  transition: all 0.2s ease;
}

.location-input:focus-within {
  border-color: var(--primary-red);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.search-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: var(--primary-red);
  color: var(--white);
  border: none;
  padding: 0 2rem;
  height: 60px;
  border-radius: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-width: 160px;
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
}

.search-button:hover {
  background: var(--primary-red-dark);
  transform: translateY(-2px);
  box-shadow: 0 6px 8px rgba(220, 38, 38, 0.3);
}

.search-icon {
  width: 1.125rem;
  height: 1.125rem;
}

/* Nearby Donors Section */
.nearby-donors-section {
  padding: 4rem 2rem;
  background: var(--white);
}

.section-content {
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 3rem;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary-red);
  margin-bottom: 1rem;
}

.section-subtitle {
  font-size: 1.1rem;
  color: var(--gray-600);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

.map-container {
  background: var(--white);
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  height: 400px;
}

.donors-list {
  background: var(--white);
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* How It Works Section */
.how-it-works-section {
  padding: 4rem 2rem;
  background: var(--white);
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.step {
  text-align: center;
  padding: 2rem;
}

.step-icon {
  width: 4rem;
  height: 4rem;
  margin: 0 auto 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fde8e8;
  color: var(--primary-red);
}

.step-icon svg {
  width: 2rem;
  height: 2rem;
}

.step-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: 1rem;
}

.step-description {
  color: var(--gray-600);
  line-height: 1.6;
}

/* Statistics Section */
.statistics-section {
  padding: 4rem 0;
  background: #f8f9fa;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
}

.stats-grid {
  display: flex;
  justify-content: center;
  align-items: stretch;
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
  flex-wrap: nowrap;
  padding: 0 2rem;
}

.stat-card {
  text-align: center;
  padding: 2rem 2.5rem;
  flex: 1;
  min-width: 200px;
  background: var(--white);
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
}

.stat-icon {
  width: 3.5rem;
  height: 3.5rem;
  margin: 0 auto 1rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fde8e8;
  color: var(--primary-red);
}

.stat-icon svg {
  width: 1.75rem;
  height: 1.75rem;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  color: var(--gray-900);
}

.stat-label {
  font-size: 1rem;
  color: var(--gray-600);
  font-weight: 500;
}

/* Call to Action Section */
.cta-section {
  padding: 4rem 0;
  background: var(--primary-red);
  text-align: center;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
}

.cta-content {
  max-width: 600px;
  margin: 0 auto;
  padding: 0 2rem;
}

.cta-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--white);
  margin-bottom: 1rem;
}

.cta-subtitle {
  font-size: 1.1rem;
  color: var(--white);
  margin-bottom: 2rem;
  line-height: 1.6;
  opacity: 0.95;
}

.cta-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 400px;
  margin: 0 auto;
}

.cta-button {
  padding: 1rem 2rem;
  border-radius: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid;
}

.cta-button.register {
  background: var(--white);
  border-color: var(--white);
  color: var(--primary-red);
}

.cta-button.register:hover {
  background: var(--gray-100);
  border-color: var(--gray-100);
  transform: translateY(-2px);
}

.cta-button.find {
  background: transparent;
  border-color: var(--white);
  color: var(--white);
}

.cta-button.find:hover {
  background: var(--white);
  color: var(--primary-red);
  transform: translateY(-2px);
}

/* Footer */
.footer {
  background: var(--gray-800);
  color: var(--gray-300);
  padding: 2rem 1rem;
  text-align: center;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
}

.copyright {
  font-size: 0.875rem;
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  z-index: 999;
}

/* Responsive Design */
@media (min-width: 768px) {
  .search-inputs {
    grid-template-columns: 1fr 1fr auto;
    align-items: center;
  }

  .search-button {
    min-width: 160px;
  }

  .cta-buttons {
    flex-direction: row;
    justify-content: center;
  }

  .hero-title {
    font-size: 3.5rem;
  }
}

@media (max-width: 767px) {
  .search-inputs {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .search-button {
    min-width: auto;
    width: 100%;
  }
  .header-inner {
    flex-direction: column;
    height: auto;
    padding: 1rem 0;
    gap: 1rem;
  }

  .navigation {
    gap: 1rem;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1.1rem;
  }
  
  .hero-content {
    padding: 0 1rem;
  }
  
  .search-form {
    width: calc(100% - 2rem);
    margin: 0 1rem;
    padding: 1.5rem;
    max-width: none;
  }

  .section-title {
    font-size: 2rem;
  }

  .cta-title {
    font-size: 2rem;
  }
  
  .cta-content {
    padding: 0 1rem;
  }

  .stats-grid {
    flex-direction: column;
    gap: 1.5rem;
    padding: 0 1rem;
  }

  .stat-card {
    min-width: auto;
    padding: 1.5rem;
  }

  .auth-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    right: auto;
    margin: 0;
    max-width: 90vw;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }
}
</style>