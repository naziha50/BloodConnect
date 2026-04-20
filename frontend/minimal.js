/**
 * minimal.js - Minimal JavaScript for BloodConnect Frontend
 * 
 * This file contains ONLY progressive enhancement features:
 * - Geolocation API (cannot be done with HTML/CSS)
 * - Basic form feedback
 * - DOM manipulation for non-critical features
 * 
 * All business logic, authentication, and data processing happens on the backend.
 * This file is intentionally small (~200 lines) to minimize client-side code.
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Show a temporary toast notification
 */
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    background-color: ${getToastColor(type)};
    color: white;
    border-radius: 0.5rem;
    font-weight: 600;
    z-index: 1000;
    animation: slideIn 0.3s ease;
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
    max-width: 300px;
  `;
  
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function getToastColor(type) {
  switch (type) {
    case 'success': return '#22c55e';
    case 'error': return '#ef4444';
    case 'warning': return '#f59e0b';
    default: return '#3b82f6';
  }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// ============================================================================
// GEOLOCATION FEATURES
// ============================================================================

/**
 * Handle geolocation button click
 * Used on registration page for adding user location
 */
function initGeolocationButton() {
  const button = document.getElementById('add-location');
  if (!button) return;

  button.addEventListener('click', function(e) {
    e.preventDefault();

    // Check if geolocation API is available
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }

    // Disable button and show loading state
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = '📍 Getting location...';

    navigator.geolocation.getCurrentPosition(
      function(position) {
        // Success - populate hidden lat/lng fields
        document.getElementById('lat').value = position.coords.latitude;
        document.getElementById('lng').value = position.coords.longitude;

        // Show success state
        const statusEl = document.getElementById('location-status');
        if (statusEl) {
          statusEl.style.display = 'block';
        }
        
        button.textContent = '📍 Location added';
        showToast('Location added successfully!', 'success');
      },
      function(error) {
        // Error handling
        let message = 'Unable to get location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable location access in browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            message = 'The request to get user location timed out.';
            break;
        }

        showToast(message, 'error');
        
        // Restore button state
        button.textContent = originalText;
        button.disabled = false;
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

// ============================================================================
// FORM ENHANCEMENTS
// ============================================================================

/**
 * Add visual feedback to forms when fields are filled
 * Optional progressive enhancement
 */
function initFormEnhancements() {
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    // Add focus styles
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      input.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
      });

      input.addEventListener('blur', function() {
        this.parentElement.classList.remove('focused');
      });

      // Real-time validation feedback (optional)
      if (input.type === 'email') {
        input.addEventListener('blur', function() {
          if (this.value && !isValidEmail(this.value)) {
            showToast('Please enter a valid email address', 'warning');
          }
        });
      }
    });
  });
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================================================
// SEARCH FORM INITIALIZATION
// ============================================================================

/**
 * Pre-fill search form from URL parameters (if coming from home page)
 */
function initSearchFormFromParams() {
  const params = new URLSearchParams(window.location.search);
  
  const bloodGroupField = document.getElementById('blood_group');
  const locationField = document.getElementById('location');
  const radiusField = document.getElementById('radius_km');

  if (bloodGroupField && params.get('blood_group')) {
    bloodGroupField.value = params.get('blood_group');
  }

  if (locationField && params.get('location')) {
    locationField.value = params.get('location');
  }

  if (radiusField && params.get('radius_km')) {
    radiusField.value = params.get('radius_km');
  }
}

// ============================================================================
// ACTIVE NAV LINK HIGHLIGHTING
// ============================================================================

/**
 * Highlight current page in navigation
 */
function initActiveNavLink() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    
    // Check if this link matches current page
    if (href && currentPath.includes(href.split('/').pop())) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize all features when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('[BloodConnect] Initializing frontend...');

  // Initialize geolocation feature
  initGeolocationButton();

  // Initialize form enhancements
  initFormEnhancements();

  // Initialize search form parameters
  initSearchFormFromParams();

  // Highlight active navigation link
  initActiveNavLink();

  console.log('[BloodConnect] Frontend initialized');
});

// ============================================================================
// EXPORT FOR TESTING
// ============================================================================

// Make functions available for testing if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showToast,
    isValidEmail,
    getToastColor
  };
}
