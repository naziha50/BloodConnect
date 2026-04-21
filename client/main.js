// main.js - Static frontend functionality for BloodConnect

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
  // Simple alert for static version
  alert(message);
}

function updateAuthUI(user = null) {
  // For static version, just redirect to profile if "logged in"
  if (user || getToken()) {
    if (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html')) {
      window.location.href = 'profile.html';
    }
  }
}

function parseQueryParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

let hasLocation = false;

const DHAKA_CENTER = {
  lat: 23.8103,
  lng: 90.4125
};
function isFindDonorPage() {
  return window.location.pathname.includes('find-donor.html');
}

// Mock data for demonstration
const mockDonors = [
  {
    id: 1,
    name: "Rahim Ahmed",
    blood_group: "O+",
    phone: "+8801712345678",
    email: "rahim@example.com",
    address: "Dhanmondi, Dhaka",
    last_donation_date: "2023-12-01",
    lat: 23.7470499,
    lng: 90.3655622,
    availability: "available"
  },
  {
    id: 2,
    name: "Nusrat Jahan",
    blood_group: "A-",
    phone: "+8801812345678",
    email: "nusrat@example.com",
    address: "Gulshan, Dhaka",
    last_donation_date: "2023-11-15",
    lat: 23.7806808,
    lng: 90.40614,
    availability: "available"
  },
  {
    id: 3,
    name: "Tanvir Hasan",
    blood_group: "B+",
    phone: "+8801912345678",
    email: "tanvir@example.com",
    address: "Mirpur, Dhaka",
    last_donation_date: "2023-10-20",
    lat: 23.806296,
    lng: 90.3460622,
    availability: "unavailable"
  },
  {
    id: 4,
    name: "Farzana Akter",
    blood_group: "AB+",
    phone: "+8801612345678",
    email: "farzana@example.com",
    address: "Uttara, Dhaka",
    last_donation_date: "2023-09-10",
    lat: 23.8766874,
    lng: 90.3576884,
    availability: "available"
  }
];

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
  const mapSubtitle = document.getElementById('map-subtitle');
  
  if (!resultsContainer || !countEl) return;

  countEl.textContent = `${donors.length} result${donors.length === 1 ? '' : 's'}`;
  if (mapSubtitle) {
    mapSubtitle.textContent = `${donors.length} donors found in your area`;
  }

  if (donors.length === 0) {
    resultsContainer.innerHTML = `
      <div class="state-box">
        <svg fill="none" stroke="#9ca3af" viewBox="0 0 24 24" style="width:3rem;height:3rem;margin-bottom:0.75rem;">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="state-title">No donors found</p>
        <p class="state-sub">Try expanding the distance or adjusting filters.</p>
      </div>
    `;
    return;
  }

  resultsContainer.innerHTML = donors.map(createDonorCard).join('');
}

function updateLocationBanner() {
  const banner = document.getElementById('location-banner');
  if (banner) {
    banner.style.display = hasLocation ? 'none' : 'flex';
  }
}

function updateContentGridVisibility() {
  const contentGrid = document.getElementById('content-grid');
  if (contentGrid) {
    contentGrid.style.display = hasLocation ? 'grid' : 'none';
  }
}

function handleManualLocationSearch() {
  const manualLocationInput = document.getElementById('manual-location');
  if (manualLocationInput) {
    const location = manualLocationInput.value.trim();
    if (location) {
      // Update the main location input
      const mainLocationInput = document.getElementById('location');
      if (mainLocationInput) {
        mainLocationInput.value = location;
      }
      // Trigger search
      handleSearch();
    }
  }
}

// Main search function
async function performSearch(bloodGroup, radiusKm = '50', availability = '') {
  const resultsContainer = document.getElementById('donor-list');

  hasLocation = true;
  updateLocationBanner();
  updateContentGridVisibility();

  if (resultsContainer) {
    resultsContainer.innerHTML = `
      <div class="state-box">
        <p class="state-title">Searching for donors...</p>
      </div>
    `;
  }

  if (!donorMap && isFindDonorPage()) {
    setTimeout(() => initializeMap(), 100);
  }

  try {
    const params = new URLSearchParams();
    if (bloodGroup)   params.set('blood_group',  bloodGroup);
    if (availability) params.set('availability', availability);

    const res  = await fetch(`/api/donors?${params.toString()}`);
    const donors = await res.json();

    renderSearchResults(donors);
    updateMapMarkers(donors);  // <-- updates map with real results

  } catch (err) {
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="state-box">
          <p class="state-title">Failed to load donors</p>
          <p class="state-sub">Make sure the server is running.</p>
        </div>
      `;
    }
  }
}

function initializeSearchFromQuery() {
  if (!isFindDonorPage()) return;

  const params = parseQueryParams();
  const bloodGroup = params.blood_group || '';
  const radiusKm = params.radius_km || '50';
  const availability = params.availability || '';

  const bloodGroupInput = document.getElementById('blood-group');
  const radiusSelect = document.getElementById('radius-km');
  const availabilitySelect = document.getElementById('availability');

  if (bloodGroupInput) bloodGroupInput.value = bloodGroup;
  if (radiusSelect) radiusSelect.value = radiusKm;
  if (availabilitySelect) availabilitySelect.value = availability;

  hasLocation = true;
  updateLocationBanner();
  updateContentGridVisibility();

  if (bloodGroup || availability || radiusKm) {
    performSearch(bloodGroup, radiusKm, availability);
  }
}
function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => deg * (Math.PI / 180);
  const earthRadiusKm = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function createDonorCard(donor) {
  const availability = donor.is_available === true || donor.availability === 'available';
  const lastDonation = donor.last_donation_date
    ? new Date(donor.last_donation_date).toLocaleDateString()
    : 'No previous donation';

  const distanceKm =
    typeof donor.lat === 'number' && typeof donor.lng === 'number'
      ? calculateDistanceKm(DHAKA_CENTER.lat, DHAKA_CENTER.lng, donor.lat, donor.lng).toFixed(1)
      : null;

  return `
    <div class="donor-card">
      <div class="card-top no-avatar">
        <div class="donor-info">
          <h3 class="donor-name">${donor.name}</h3>
          <div class="donor-location-row">
            <svg class="loc-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span>${donor.address || 'Unknown location'}${distanceKm ? ` · ${distanceKm} km` : ''}</span>
          </div>
          <p class="donor-last-donation">Last donation: ${lastDonation}</p>
        </div>

        <div class="donor-badges">
          <span class="blood-type-badge">${donor.blood_group || 'N/A'}</span>
          <span class="avail-badge ${availability ? 'avail-yes' : 'avail-no'}">
            ${availability ? 'Available' : 'Not Available'}
          </span>
        </div>
      </div>

      ${availability ? `
        <div class="card-actions">
          <a href="tel:${donor.phone}" class="btn-call">Call</a>
          <a href="mailto:${donor.email || ''}" class="btn-message">Message</a>
        </div>
      ` : ''}
    </div>
  `;
}

// Event handlers
async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email')?.value;
  const password = document.getElementById('login-password')?.value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      const errorEl = document.getElementById('error-message');
      if (errorEl) errorEl.classList.remove('hidden');
      return;
    }

    setToken(data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = 'profile.html';

  } catch (err) {
    alert('Network error. Is the server running?');
  }
}

// Registration Handler
async function handleRegister(event) {
  event.preventDefault();
  const name       = document.getElementById('register-name')?.value;
  const email      = document.getElementById('register-email')?.value;
  const phone      = document.getElementById('register-phone')?.value;
  const blood_group = document.getElementById('register-blood-group')?.value;
  const address    = document.getElementById('register-address')?.value;
  const password   = document.getElementById('register-password')?.value;

  if (!name || !email || !phone || !blood_group || !address || !password) {
    alert('Please fill in all fields');
    return;
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, blood_group, address, password })
    });

    const data = await res.json();

    if (!res.ok) {
      const errorEl = document.getElementById('error-message');
      if (errorEl) {
        errorEl.textContent = data.error || 'Registration failed.';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    setToken(data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = 'profile.html';

  } catch (err) {
    alert('Network error. Is the server running?');
  }
}

function handleLogout() {
  removeToken();
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

function handleSearch(event) {
  if (event) event.preventDefault();

  const bloodGroupInput = document.getElementById('blood-group');
  const radiusSelect = document.getElementById('radius-km');
  const availabilitySelect = document.getElementById('availability');

  const bloodGroup = bloodGroupInput ? bloodGroupInput.value : '';
  const radiusKm = radiusSelect ? radiusSelect.value : '50';
  const availability = availabilitySelect ? availabilitySelect.value : '';

  if (!isFindDonorPage()) {
    const locationInput = document.getElementById('location');
    const location = locationInput ? locationInput.value.trim() : '';

    if (!bloodGroup || !location) {
      showAlert('Please fill in all fields');
      return;
    }

    window.location.href = buildFindDonorUrl({
      blood_group: bloodGroup,
      location,
      radius_km: radiusKm,
      availability
    });
    return;
  }

  performSearch(bloodGroup, radiusKm, availability);
}

function loadNearbyDonors() {
  // Load some mock donors for the home page
  const container = document.getElementById('nearby-donors');
  if (container) {
    const nearbyDonors = mockDonors.slice(0, 6);
    container.innerHTML = nearbyDonors.map(createDonorCard).join('');
  }
}

// Authentication check on page load
async function checkAuth() {
  const token = getToken();

  if (!token) {
    if (window.location.pathname.includes('profile.html')) {
      window.location.href = 'login.html';
    }
    return;
  }

  // If on profile page, fetch real user data from the API
  if (window.location.pathname.includes('profile.html')) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        // Token expired or invalid
        removeToken();
        window.location.href = 'login.html';
        return;
      }

      const user = await res.json();

      // Populate profile fields
      document.getElementById('profile-name').textContent        = user.name        || '—';
      document.getElementById('profile-email').textContent       = user.email       || '—';
      document.getElementById('profile-phone').textContent       = user.phone       || '—';
      document.getElementById('profile-blood-group').textContent = user.blood_group || '—';
      document.getElementById('profile-address').textContent     = user.address     || '—';

    } catch (err) {
      alert('Failed to load profile. Is the server running?');
    }
  }
}

// Map initialization for find-donor page
let donorMap = null;
let mapMarkers = [];

function initializeMap() {
  if (!isFindDonorPage()) return;
  
  const mapElement = document.getElementById('donor-map');
  if (!mapElement) return;

  // Load Leaflet if not already loaded
  if (typeof L === 'undefined') {
    const leafletScript = document.createElement('script');
    leafletScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    leafletScript.onload = () => {
      createMap();
    };
    document.head.appendChild(leafletScript);
  } else {
    createMap();
  }
}

function createMap() {
  const mapElement = document.getElementById('donor-map');
  if (!mapElement || donorMap) return;

  // Ensure element is visible
  mapElement.style.display = 'block';
  mapElement.style.height = '24rem';

  // Center coordinates (Dhaka)
  const centerLat = DHAKA_CENTER.lat;
  const centerLng = DHAKA_CENTER.lng;

  // Initialize Leaflet map
  donorMap = L.map('donor-map', {
    center: [centerLat, centerLng],
    zoom: 13,
    scrollWheelZoom: true,
    dragging: true
  });

  // Add OpenStreetMap tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(donorMap);

  // Add donor markers
  addDonorMarkers();

  // Add current location marker
  addCurrentLocationMarker(centerLat, centerLng);
}

function addDonorMarkers() {
  if (!donorMap) return;

  mockDonors.forEach(donor => {
    // Create custom icon based on availability
    const iconColor = donor.availability === 'available' ? '#22c55e' : '#f97316';
    
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${iconColor};
          border: 3px solid white;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          font-size: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          🩸
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36]
    });

    // Create marker
    const marker = L.marker([donor.lat, donor.lng], { icon: customIcon }).addTo(donorMap);

    // Create popup content
    const popupContent = `
      <div style="font-size: 13px; width: 200px;">
        <strong style="font-size: 14px;">${donor.name}</strong><br/>
        <span style="background-color: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 9999px; font-weight: 600; font-size: 12px;">
          ${donor.blood_group}
        </span>
        <span style="background-color: ${donor.availability === 'available' ? '#dcfce7' : '#fee2e2'}; color: ${donor.availability === 'available' ? '#166534' : '#b91c1c'}; padding: 2px 8px; border-radius: 9999px; font-weight: 600; font-size: 12px; margin-left: 4px;">
          ${donor.availability === 'available' ? 'Available' : 'Not Available'}
        </span><br/>
        <small style="color: #6b7280;">📍 ${donor.address}</small><br/>
        <small style="color: #6b7280;">📞 ${donor.phone}</small><br/>
        <small style="color: #9ca3af;">Last donation: ${donor.last_donation_date}</small>
      </div>
    `;

    marker.bindPopup(popupContent);

    mapMarkers.push(marker);
  });

  // Update donor count
  const subtitleElement = document.getElementById('map-subtitle');
  if (subtitleElement) {
    subtitleElement.textContent = `${mockDonors.length} donors found in your area`;
  }
}

// ADD this new function after addDonorMarkers()
function updateMapMarkers(donors) {
  if (!donorMap) return;

  // Clear existing markers
  mapMarkers.forEach(m => donorMap.removeLayer(m));
  mapMarkers = [];

  donors.forEach(donor => {
    // Skip donors without coordinates
    if (!donor.latitude || !donor.longitude) return;

    const iconColor = donor.is_available ? '#22c55e' : '#f97316';

    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${iconColor};
          border: 3px solid white;
          border-radius: 50%;
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          font-weight: bold; color: white; font-size: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">🩸</div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36]
    });

    const marker = L.marker([donor.latitude, donor.longitude], { icon: customIcon }).addTo(donorMap);

    marker.bindPopup(`
      <div style="font-size:13px; width:200px;">
        <strong>${donor.name}</strong><br/>
        <span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:9999px;font-size:12px;">
          ${donor.blood_group}
        </span>
        <span style="background:${donor.is_available ? '#dcfce7' : '#fee2e2'};
                     color:${donor.is_available ? '#166534' : '#b91c1c'};
                     padding:2px 8px;border-radius:9999px;font-size:12px;margin-left:4px;">
          ${donor.is_available ? 'Available' : 'Not Available'}
        </span><br/>
        <small>📍 ${donor.address || 'Unknown'}</small><br/>
        <small>📞 ${donor.phone || 'N/A'}</small>
      </div>
    `);

    mapMarkers.push(marker);
  });

  const subtitleEl = document.getElementById('map-subtitle');
  if (subtitleEl) subtitleEl.textContent = `${donors.length} donors found in your area`;
}

function addCurrentLocationMarker(lat, lng) {
  if (!donorMap) return;

  const userIcon = L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div style="
        background-color: #64748b;
        border: 3px solid white;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        ●
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  const userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(donorMap);
  userMarker.bindPopup('Your Location');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const searchForm = document.getElementById('search-form');
  const searchButton = document.getElementById('search-button');
  const logoutBtn = document.getElementById('logout-btn');

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (searchForm) searchForm.addEventListener('submit', handleSearch);
  if (searchButton) searchButton.addEventListener('click', handleSearch);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  // Manual location search for find-donor page
  const manualLocationBtn = document.getElementById('manual-location-btn');
  if (manualLocationBtn) manualLocationBtn.addEventListener('click', handleManualLocationSearch);

  initializeSearchFromQuery();
  if (!isFindDonorPage()) {
    loadNearbyDonors();
  } else {
    initializeMap();
  }
  checkAuth();
});
