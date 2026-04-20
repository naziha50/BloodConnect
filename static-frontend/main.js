// main.js - API handling for BloodConnect static frontend

const API_BASE = 'http://localhost:4000'; // Adjust if backend is on different port

// Utility functions
function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function removeToken() {
  localStorage.removeItem('token');
}

function showAlert(message, type = 'error') {
  // Simple alert, could be improved with a toast
  alert(message);
}

function updateAuthUI(user = null) {
  const loginBtn = document.querySelector('.login-button');
  const authModal = document.getElementById('auth-modal-toggle');

  if (user) {
    loginBtn.innerHTML = `
      <svg class="login-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
      </svg>
      Profile
    `;
    // Update modal to show profile
    const modalContent = document.querySelector('.modal-content');
    modalContent.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">Your Profile</h3>
        <p class="modal-subtitle">Donor Information</p>
      </div>
      <div class="modal-content">
        <div class="profile-info">
          <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">${user.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Blood Group:</span>
            <span class="blood-badge">${user.blood_group}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">${user.email}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Phone:</span>
            <span class="info-value">${user.phone}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Address:</span>
            <span class="info-value">${user.address || 'N/A'}</span>
          </div>
        </div>
        <button id="logout-btn" class="logout-button">Logout</button>
      </div>
    `;
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
  } else {
    loginBtn.innerHTML = `
      <svg class="login-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
      </svg>
      Login
    `;
    // Reset modal to login/register
    location.reload(); // Simple way to reset
  }
}

async function getLatLng(location) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`);
    const data = await response.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    throw new Error('Location not found');
  } catch (error) {
    console.error('Error getting lat/lng:', error);
    throw error;
  }
}

function parseQueryParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

function isFindDonorPage() {
  return window.location.pathname.endsWith('find-donor.html');
}

function buildFindDonorUrl({ blood_group, location, radius_km = '50', availability = '' }) {
  const params = new URLSearchParams();
  if (blood_group) params.set('blood_group', blood_group);
  if (location) params.set('location', location);
  if (radius_km) params.set('radius_km', radius_km);
  if (availability) params.set('availability', availability);
  return `find-donor.html?${params.toString()}`;
}

function renderSearchResults(donors) {
  const resultsContainer = document.getElementById('donor-list');
  const countEl = document.getElementById('results-count');
  if (!resultsContainer || !countEl) return;

  countEl.textContent = `${donors.length} result${donors.length === 1 ? '' : 's'}`;
  if (donors.length === 0) {
    resultsContainer.innerHTML = `
      <div class="state-box">
        <p class="state-title">No donors found</p>
        <p class="state-sub">Try widening the radius or searching another location.</p>
      </div>
    `;
    return;
  }

  resultsContainer.innerHTML = donors.map(createDonorCard).join('');
}

async function performSearch(bloodGroup, location, radiusKm = '50', availability = '') {
  const resultsContainer = document.getElementById('donor-list');
  if (!bloodGroup || !location) {
    showAlert('Please fill in all fields');
    return;
  }
  if (resultsContainer) {
    resultsContainer.innerHTML = `
      <div class="state-box">
        <p class="state-title">Searching for donors...</p>
      </div>
    `;
  }

  try {
    const coords = await getLatLng(location);
    const url = new URL(`${API_BASE}/donors/`);
    url.searchParams.set('blood_group', bloodGroup);
    url.searchParams.set('lat', coords.lat);
    url.searchParams.set('lng', coords.lng);
    url.searchParams.set('radius_km', radiusKm);
    if (availability) url.searchParams.set('availability', availability);

    const response = await fetch(url.toString());
    const donors = await response.json();

    if (response.ok) {
      renderSearchResults(donors);
    } else {
      showAlert(donors.error || 'Search failed');
      renderSearchResults([]);
    }
  } catch (error) {
    console.error('Search error:', error);
    showAlert('Network error. Please try again.');
    renderSearchResults([]);
  }
}

function initializeSearchFromQuery() {
  if (!isFindDonorPage()) return;
  const params = parseQueryParams();
  const bloodGroup = params.blood_group || '';
  const location = params.location || '';
  const radiusKm = params.radius_km || '50';
  const availability = params.availability || '';

  const bloodGroupInput = document.getElementById('blood-group');
  const locationInput = document.getElementById('location');
  const radiusSelect = document.getElementById('radius-km');
  const availabilitySelect = document.getElementById('availability');

  if (bloodGroupInput) bloodGroupInput.value = bloodGroup;
  if (locationInput) locationInput.value = location;
  if (radiusSelect) radiusSelect.value = radiusKm;
  if (availabilitySelect) availabilitySelect.value = availability;

  if (bloodGroup && location) {
    performSearch(bloodGroup, location, radiusKm, availability);
  }
}

function createDonorCard(donor) {
  return `
    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">${donor.name}</h3>
        <span class="blood-badge">${donor.blood_group}</span>
      </div>
      <div class="space-y-2 text-sm text-gray-600">
        <p><strong>Phone:</strong> ${donor.phone}</p>
        <p><strong>Email:</strong> ${donor.email || 'N/A'}</p>
        <p><strong>Address:</strong> ${donor.address || 'N/A'}</p>
        <p><strong>Last Donation:</strong> ${donor.last_donation_date ? new Date(donor.last_donation_date).toLocaleDateString() : 'N/A'}</p>
      </div>
      <div class="mt-4 flex gap-2">
        <button class="btn-secondary flex-1" onclick="window.location.href='tel:${donor.phone}'">Call</button>
        ${donor.email ? `<button class="btn-primary flex-1" onclick="window.location.href='mailto:${donor.email}'">Email</button>` : ''}
      </div>
    </div>
  `;
}

// Event handlers
async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      setToken(data.token);
      updateAuthUI(data.user);
      document.getElementById('auth-modal-toggle').checked = false;
      showAlert('Login successful!', 'success');
    } else {
      showAlert(data.error || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    showAlert('Network error. Please try again.');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const phone = document.getElementById('register-phone').value;
  const bloodGroup = document.getElementById('register-blood-group').value;
  const address = document.getElementById('register-address').value;
  const password = document.getElementById('register-password').value;

  // Get lat/lng from address
  let lat, lng;
  try {
    const coords = await getLatLng(address);
    lat = coords.lat;
    lng = coords.lng;
  } catch (error) {
    showAlert('Could not find location. Please enter a valid address.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, blood_group: bloodGroup, phone, address, lat, lng })
    });

    const data = await response.json();

    if (response.ok) {
      setToken(data.token);
      updateAuthUI(data.user);
      document.getElementById('auth-modal-toggle').checked = false;
      showAlert('Registration successful!', 'success');
    } else {
      showAlert(data.error || 'Registration failed');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showAlert('Network error. Please try again.');
  }
}

function handleLogout() {
  removeToken();
  updateAuthUI();
  document.getElementById('auth-modal-toggle').checked = false;
}

async function handleSearch(event) {
  if (event) event.preventDefault();
  const bloodGroupInput = document.getElementById('blood-group');
  const locationInput = document.getElementById('location');
  const radiusSelect = document.getElementById('radius-km');
  const availabilitySelect = document.getElementById('availability');

  const bloodGroup = bloodGroupInput ? bloodGroupInput.value : '';
  const location = locationInput ? locationInput.value : '';
  const radiusKm = radiusSelect ? radiusSelect.value : '50';
  const availability = availabilitySelect ? availabilitySelect.value : '';

  if (!bloodGroup || !location) {
    showAlert('Please fill in all fields');
    return;
  }

  if (!isFindDonorPage()) {
    window.location.href = buildFindDonorUrl({
      blood_group: bloodGroup,
      location,
      radius_km: radiusKm,
      availability
    });
    return;
  }

  await performSearch(bloodGroup, location, radiusKm, availability);
}

async function loadNearbyDonors() {
  try {
    // For demo, get user's location or use default
    const defaultLat = 40.7128; // NYC
    const defaultLng = -74.0060;

    const response = await fetch(`${API_BASE}/donors/?lat=${defaultLat}&lng=${defaultLng}&radius_km=100`);
    const donors = await response.json();

    if (response.ok && donors.length > 0) {
      const container = document.getElementById('nearby-donors');
      container.innerHTML = donors.slice(0, 6).map(createDonorCard).join('');
    }
  } catch (error) {
    console.error('Error loading nearby donors:', error);
  }
}

async function checkAuth() {
  const token = getToken();
  if (token) {
    try {
      // Assuming there's a /auth/me endpoint, or decode token
      // For simplicity, assume token is valid and fetch user
      // Actually, backend doesn't have /me, so perhaps store user in localStorage too
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        updateAuthUI(user);
      } else {
        removeToken();
      }
    } catch (error) {
      removeToken();
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const searchForm = document.getElementById('search-form');
  const searchButton = document.getElementById('search-button');

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (searchForm) searchForm.addEventListener('submit', handleSearch);
  if (searchButton) searchButton.addEventListener('click', handleSearch);

  initializeSearchFromQuery();
  if (!isFindDonorPage()) {
    loadNearbyDonors();
  }
  checkAuth();
});