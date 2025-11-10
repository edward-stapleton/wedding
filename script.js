const ACCESS_CODE = 'STARFORD';
const STORAGE_KEY = 'weddingSiteUnlocked';
const RSVP_ENDPOINT = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
const MAPBOX_TOKEN =
  'pk.eyJ1IjoiZWR3YXJkc3RhcGxldG9uIiwiYSI6ImNtaGwyMWE2YzBjbzcyanNjYms4ZTduMWoifQ.yo7R9MXXEfna7rzmFk2rQg';
const MAPBOX_DEFAULT_STYLE = 'mapbox://styles/mapbox/light-v11';
const mapElement = document.getElementById('map');
const MAPBOX_STYLE = mapElement?.dataset.style?.trim() || MAPBOX_DEFAULT_STYLE;
const CHURCH_COORDS = [-1.2684928, 51.7666909];
const GARDEN_COORDS = [-1.2801823, 51.7632022];

const passwordScreen = document.getElementById('password-screen');
const passwordForm = document.getElementById('password-form');
const passwordInput = document.getElementById('access-code');
const passwordError = document.getElementById('password-error');
const rsvpModal = document.getElementById('rsvp-modal');
const rsvpForm = document.getElementById('rsvp-form');
const rsvpFeedback = document.getElementById('rsvp-feedback');
const openRsvpButton = document.getElementById('open-rsvp');
const closeModalEls = document.querySelectorAll('[data-close-modal]');
const mapContainer = document.querySelector('[data-map-container]');
const siteNav = document.querySelector('.site-nav');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelectorAll('.nav-links a');
const header = document.querySelector('.site-header');

let mapLoaded = false;
let mapInstance;

function unlockSite() {
  passwordInput.removeAttribute('aria-invalid');
  passwordScreen.classList.add('hidden');
  setTimeout(() => {
    passwordScreen.style.display = 'none';
  }, 400);
}

function lockSite() {
  passwordScreen.style.display = 'flex';
  passwordScreen.classList.remove('hidden');
}

function handlePasswordSubmit(event) {
  event.preventDefault();
  const entered = passwordInput.value.trim().toUpperCase();
  if (entered === ACCESS_CODE) {
    localStorage.setItem(STORAGE_KEY, 'true');
    passwordError.textContent = '';
    unlockSite();
  } else {
    passwordError.textContent = 'That code is not quite right.';
    passwordInput.setAttribute('aria-invalid', 'true');
    passwordInput.focus();
  }
}

passwordInput.addEventListener('input', () => {
  passwordInput.removeAttribute('aria-invalid');
  passwordError.textContent = '';
});

if (localStorage.getItem(STORAGE_KEY) === 'true') {
  unlockSite();
} else {
  lockSite();
}

passwordForm.addEventListener('submit', handlePasswordSubmit);

function setupFadeSections() {
  const sections = document.querySelectorAll('[data-section], [data-map-container]');
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.25 }
  );

  sections.forEach(section => observer.observe(section));
}

setupFadeSections();

function toggleNavigation(force) {
  if (!siteNav || !navToggle) return;
  const isOpen =
    typeof force === 'boolean' ? force : !siteNav.classList.contains('open');
  siteNav.classList.toggle('open', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
  requestAnimationFrame(updateHeaderOffset);
}

if (navToggle) {
  navToggle.addEventListener('click', () => toggleNavigation());
}

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    if (window.matchMedia('(min-width: 768px)').matches) return;
    toggleNavigation(false);
  });
});

const desktopMedia = window.matchMedia('(min-width: 768px)');
const handleDesktopChange = event => {
  if (event.matches) {
    toggleNavigation(false);
  }
};
if (desktopMedia.addEventListener) {
  desktopMedia.addEventListener('change', handleDesktopChange);
} else if (desktopMedia.addListener) {
  desktopMedia.addListener(handleDesktopChange);
}

function updateHeaderOffset() {
  if (!header) return;
  const height = header.offsetHeight;
  document.documentElement.style.setProperty('--header-height', `${height}px`);
}

window.addEventListener('resize', updateHeaderOffset);
window.addEventListener('load', updateHeaderOffset);
updateHeaderOffset();

function openModal() {
  rsvpModal.hidden = false;
  rsvpModal.classList.add('open');
  document.body.style.overflow = 'hidden';
  const nameInput = document.getElementById('guest-name');
  setTimeout(() => nameInput?.focus(), 50);
}

function closeModal() {
  rsvpModal.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => {
    rsvpModal.hidden = true;
  }, 300);
}

openRsvpButton.addEventListener('click', openModal);
closeModalEls.forEach(el => el.addEventListener('click', closeModal));
rsvpModal.addEventListener('click', event => {
  if (event.target === rsvpModal) {
    closeModal();
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !rsvpModal.hidden) {
    closeModal();
  }
});

function validateForm(formData) {
  const errors = [];
  if (!formData.get('name')?.trim()) {
    errors.push('Please enter your name.');
  }
  if (!formData.get('attendance')) {
    errors.push('Please let us know if you can attend.');
  }
  return errors;
}

async function submitRsvp(event) {
  event.preventDefault();
  rsvpFeedback.textContent = '';

  const formData = new FormData(rsvpForm);
  const errors = validateForm(formData);

  if (errors.length > 0) {
    rsvpFeedback.textContent = errors.join(' ');
    return;
  }

  const payload = {
    name: formData.get('name').trim(),
    attendance: formData.get('attendance'),
    dietary: formData.get('dietary')?.trim() ?? '',
    submittedAt: new Date().toISOString(),
  };

  try {
    const response = await fetch(RSVP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    rsvpForm.reset();
    rsvpForm.innerHTML = '<p class="thank-you">Thank you for letting us know. We will be in touch soon.</p>';
  } catch (error) {
    rsvpFeedback.textContent = 'We could not send your response. Please try again later or contact us directly.';
  }
}

rsvpForm.addEventListener('submit', submitRsvp);

function loadMapboxResources() {
  return new Promise((resolve, reject) => {
    if (mapLoaded) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Map could not load.'));

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';

    document.head.appendChild(link);
    document.head.appendChild(script);
  });
}

function addLocationLayers(map) {
  const points = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          name: "St Margaret's Church",
          color: '#f05a7e',
        },
        geometry: {
          type: 'Point',
          coordinates: CHURCH_COORDS,
        },
      },
      {
        type: 'Feature',
        properties: {
          name: 'The Medley Walled Garden',
          color: '#4ba87d',
        },
        geometry: {
          type: 'Point',
          coordinates: GARDEN_COORDS,
        },
      },
    ],
  };

  if (!map.getSource('wedding-locations')) {
    map.addSource('wedding-locations', {
      type: 'geojson',
      data: points,
    });
  }

  map.addLayer({
    id: 'wedding-locations-circle',
    type: 'circle',
    source: 'wedding-locations',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        12,
        6,
        16,
        16,
      ],
      'circle-color': ['get', 'color'],
      'circle-opacity': 0.9,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  });

  map.addLayer({
    id: 'wedding-locations-labels',
    type: 'symbol',
    source: 'wedding-locations',
    layout: {
      'text-field': ['get', 'name'],
      'text-offset': [0, 1.2],
      'text-anchor': 'top',
      'text-size': 14,
      'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
    },
    paint: {
      'text-color': '#1f2933',
      'text-halo-color': 'rgba(255, 255, 255, 0.95)',
      'text-halo-width': 1.4,
    },
  });
}

function addTerrainAndBuildings(map) {
  if (!map.getSource('mapbox-dem')) {
    map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    });
  }

  map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.3 });

  const layers = map.getStyle().layers;
  const labelLayerId = layers.find(
    layer => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
  )?.id;

  map.addLayer(
    {
      id: '3d-buildings',
      source: 'composite',
      'source-layer': 'building',
      filter: ['==', 'extrude', 'true'],
      type: 'fill-extrusion',
      minzoom: 15,
      paint: {
        'fill-extrusion-color': '#d4d4d4',
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': ['get', 'min_height'],
        'fill-extrusion-opacity': 0.6,
      },
    },
    labelLayerId
  );
}

function initialiseMap() {
  if (mapLoaded) return;
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN.includes('YOUR_MAPBOX_ACCESS_TOKEN')) {
    if (mapElement) {
      mapElement.textContent = 'Add your Mapbox token in script.js to display the map.';
    }
    mapLoaded = true;
    return;
  }

  mapboxgl.accessToken = MAPBOX_TOKEN;
  mapInstance = new mapboxgl.Map({
    container: mapElement || 'map',
    style: MAPBOX_STYLE,
    center: CHURCH_COORDS,
    zoom: 15.4,
    pitch: 64,
    bearing: -28,
    antialias: true,
    attributionControl: false,
  });

  mapInstance.addControl(new mapboxgl.FullscreenControl(), 'top-right');

  mapInstance.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');

  mapInstance.on('load', () => {
    addTerrainAndBuildings(mapInstance);
    addLocationLayers(mapInstance);
    mapInstance.easeTo({
      center: CHURCH_COORDS,
      zoom: 16,
      pitch: 68,
      bearing: -35,
      duration: 1800,
    });
  });

  mapLoaded = true;
}

function observeMap() {
  if (!mapContainer) return;
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadMapboxResources()
            .then(initialiseMap)
            .catch(() => {
              if (mapElement) {
                mapElement.textContent = 'The map is unavailable right now.';
              }
            });
          observer.disconnect();
        }
      });
    },
    { threshold: 0.2 }
  );

  observer.observe(mapContainer);
}

observeMap();

function setupAccordion() {
  const buttons = document.querySelectorAll('.accordion-item button');
  buttons.forEach(button => {
    const panel = button.nextElementSibling;
    if (!panel) return;
    panel.style.maxHeight = '0px';
    panel.addEventListener('transitionend', event => {
      if (event.propertyName !== 'max-height') return;
      if (button.getAttribute('aria-expanded') === 'true') {
        panel.style.maxHeight = 'none';
      } else {
        panel.hidden = true;
      }
    });
    button.addEventListener('click', () => {
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      const nextState = !isExpanded;
      button.setAttribute('aria-expanded', String(nextState));
      if (nextState) {
        panel.hidden = false;
        panel.classList.add('open');
        panel.style.maxHeight = '0px';
        requestAnimationFrame(() => {
          panel.style.maxHeight = panel.scrollHeight + 'px';
        });
      } else {
        panel.classList.remove('open');
        if (panel.style.maxHeight === 'none') {
          panel.style.maxHeight = panel.scrollHeight + 'px';
        }
        requestAnimationFrame(() => {
          panel.style.maxHeight = '0px';
        });
      }
    });
  });
}

setupAccordion();
