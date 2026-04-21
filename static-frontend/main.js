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

function performSearch(bloodGroup, radiusKm = '50', availability = '') {
  const resultsContainer = document.getElementById('donor-list');

  hasLocation = true;
  updateLocationBanner();
  updateContentGridVisibility();

  if (resultsContainer) {
    resultsContainer.innerHTML = `
      <div class="state-box">
        <svg class="spin-icon large" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="#dc2626" stroke-width="4" style="opacity:0.25"></circle>
          <path fill="#dc2626" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="state-title">Searching for donors...</p>
      </div>
    `;
  }

  if (!donorMap && isFindDonorPage()) {
    setTimeout(() => initializeMap(), 100);
  }

  setTimeout(() => {
    let filteredDonors = mockDonors.filter(donor => {
      const bloodMatch = !bloodGroup || donor.blood_group === bloodGroup;
      const availabilityMatch = !availability || donor.availability === availability;
      return bloodMatch && availabilityMatch;
    });

    renderSearchResults(filteredDonors);
  }, 500);
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

function createDonorCard(donor) {
  const availability = donor.availability === 'available';
  const lastDonation = donor.last_donation_date
    ? new Date(donor.last_donation_date).toLocaleDateString()
    : 'No previous donation';

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
            <span>${donor.address || 'Unknown location'} · 2.3 km</span>
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
function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email')?.value || document.getElementById('email')?.value;
  const password = document.getElementById('login-password')?.value || document.getElementById('password')?.value;

  // Mock login - accept demo credentials
  if (email === 'demo@bloodconnect.com' && password === 'demo123') {
    setToken('mock-token');
    showAlert('Login successful!', 'success');
    setTimeout(() => {
      window.location.href = 'profile.html';
    }, 1000);
  } else {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
      errorEl.classList.remove('hidden');
    }
    showAlert('Invalid email or password. Please try again.');
  }
}

function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById('register-name')?.value || document.getElementById('name')?.value;
  const email = document.getElementById('register-email')?.value || document.getElementById('email')?.value;
  const phone = document.getElementById('register-phone')?.value || document.getElementById('phone')?.value;
  const bloodGroup = document.getElementById('register-blood-group')?.value || document.getElementById('blood-group')?.value;
  const address = document.getElementById('register-address')?.value || document.getElementById('address')?.value;
  const password = document.getElementById('register-password')?.value || document.getElementById('password')?.value;

  if (!name || !email || !phone || !bloodGroup || !address || !password) {
    showAlert('Please fill in all fields');
    return;
  }

  // Mock registration
  setToken('mock-token');
  localStorage.setItem('user', JSON.stringify({
    name,
    email,
    phone,
    blood_group: bloodGroup,
    address
  }));

  showAlert('Registration successful!', 'success');
  setTimeout(() => {
    window.location.href = 'profile.html';
  }, 1000);
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

function checkAuth() {
  const token = getToken();
  if (token) {
    // For profile page, load user data
    if (window.location.pathname.includes('profile.html')) {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        document.getElementById('profile-name').textContent = user.name;
        document.getElementById('profile-email').textContent = user.email;
        document.getElementById('profile-phone').textContent = user.phone;
        document.getElementById('profile-blood-group').textContent = user.blood_group;
        document.getElementById('profile-address').textContent = user.address;
      } else {
        // Mock user data
        document.getElementById('profile-name').textContent = 'Demo User';
        document.getElementById('profile-email').textContent = 'demo@bloodconnect.com';
        document.getElementById('profile-phone').textContent = '+18801712332230';
        document.getElementById('profile-blood-group').textContent = 'O+';
        document.getElementById('profile-address').textContent = 'Banani, Dhaka';
      }
    }
  } else {
    // Redirect to login if trying to access profile without auth
    if (window.location.pathname.includes('profile.html')) {
      window.location.href = 'login.html';
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
  const centerLat = 23.8103;
  const centerLng = 90.4125;

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
