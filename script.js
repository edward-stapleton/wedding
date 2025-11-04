const ACCESS_CODE = 'STARFORD';
const STORAGE_KEY = 'weddingSiteUnlocked';
const RSVP_ENDPOINT = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
const MAPBOX_TOKEN = 'pk.eyJ1IjoiZWR3YXJkc3RhcGxldG9uIiwiYSI6ImNtaGwyMWE2YzBjbzcyanNjYms4ZTduMWoifQ.yo7R9MXXEfna7rzmFk2rQg';

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

let mapLoaded = false;
let mapInstance;
let walkLayerId;
let driveLayerId;
let driveFillId;

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

function configureMapStyle(map) {
  const style = map?.getStyle?.();
  if (!style?.layers) return;
  style.layers.forEach(layer => {
    if (layer.type === 'background') {
      map.setPaintProperty(layer.id, 'background-color', '#ffffff');
      return;
    }
    const paint = layer.paint || {};
    Object.keys(paint).forEach(prop => {
      if (prop.includes('color')) {
        let value = '#000000';
        if (prop.includes('fill') && !prop.includes('outline')) {
          value = '#f5f5f5';
        }
        if (prop.includes('halo')) {
          value = '#ffffff';
        }
        map.setPaintProperty(layer.id, prop, value);
      }
      if (prop.includes('saturation')) {
        map.setPaintProperty(layer.id, prop, -100);
      }
    });
  });
}

function addMapLayers(map) {
  const church = [-1.26493, 51.7692];
  const garden = [-1.2713, 51.7697];

  new mapboxgl.Marker({ color: '#000000' }).setLngLat(church).addTo(map);
  new mapboxgl.Marker({ color: '#000000' }).setLngLat(garden).addTo(map);

  const walkRoute = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        church,
        [-1.26525, 51.76903],
        [-1.26735, 51.76954],
        [-1.26881, 51.7699],
        [-1.2702, 51.76989],
        garden,
      ],
    },
  };

  const parkingArea = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-1.27225, 51.7701],
          [-1.2729, 51.76985],
          [-1.2716, 51.7693],
          [-1.2709, 51.7695],
          [-1.27225, 51.7701],
        ],
      ],
    },
  };

  if (!map.getSource('walk-route')) {
    map.addSource('walk-route', {
      type: 'geojson',
      data: walkRoute,
    });
  }

  if (!map.getSource('parking-area')) {
    map.addSource('parking-area', {
      type: 'geojson',
      data: parkingArea,
    });
  }

  walkLayerId = 'walk-line';
  driveLayerId = 'drive-outline';
  driveFillId = 'drive-fill';

  map.addLayer({
    id: walkLayerId,
    type: 'line',
    source: 'walk-route',
    paint: {
      'line-color': '#000000',
      'line-width': 3,
      'line-opacity': 0.8,
      'line-dasharray': [0.5, 1.5],
    },
  });

  map.addLayer({
    id: driveFillId,
    type: 'fill',
    source: 'parking-area',
    layout: { visibility: 'none' },
    paint: {
      'fill-color': '#000000',
      'fill-opacity': 0.1,
    },
  });

  map.addLayer({
    id: driveLayerId,
    type: 'line',
    source: 'parking-area',
    layout: { visibility: 'none' },
    paint: {
      'line-color': '#000000',
      'line-width': 2,
    },
  });

  return { church, garden };
}

function initialiseMap() {
  if (mapLoaded) return;
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN.includes('YOUR_MAPBOX_ACCESS_TOKEN')) {
    const mapElement = document.getElementById('map');
    mapElement.textContent = 'Add your Mapbox token in script.js to display the map.';
    mapLoaded = true;
    return;
  }

  mapboxgl.accessToken = MAPBOX_TOKEN;
  mapInstance = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [-1.268, 51.7695],
    zoom: 14,
    attributionControl: false,
  });

  mapInstance.once('styledata', () => configureMapStyle(mapInstance));

  mapInstance.on('load', () => {
    const { church, garden } = addMapLayers(mapInstance);
    mapInstance.fitBounds([church, garden], { padding: 60 });
    setupRouteToggle();
  });

  mapLoaded = true;
}

function setupRouteToggle() {
  const toggleButtons = document.querySelectorAll('.map-toggle button');
  toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
      const selected = button.getAttribute('data-route');
      toggleButtons.forEach(btn => btn.classList.toggle('active', btn === button));
      if (!mapInstance) return;
      if (selected === 'walk') {
        mapInstance.setLayoutProperty(walkLayerId, 'visibility', 'visible');
        mapInstance.setLayoutProperty(driveLayerId, 'visibility', 'none');
        mapInstance.setLayoutProperty(driveFillId, 'visibility', 'none');
      } else {
        mapInstance.setLayoutProperty(walkLayerId, 'visibility', 'none');
        mapInstance.setLayoutProperty(driveLayerId, 'visibility', 'visible');
        mapInstance.setLayoutProperty(driveFillId, 'visibility', 'visible');
      }
    });
  });
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
              const mapElement = document.getElementById('map');
              mapElement.textContent = 'The map is unavailable right now.';
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
