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
const WALKING_ROUTE = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [-1.2685999267090438, 51.76648498246533],
          [-1.2688935299391062, 51.76645418556669],
          [-1.269074797597483, 51.76733425005639],
          [-1.2692134415083842, 51.76757326555489],
          [-1.269644227948021, 51.76761616563837],
          [-1.2704839775425683, 51.76750202248476],
          [-1.2714353151561966, 51.767336814777195],
          [-1.2715103618206456, 51.76734614605388],
          [-1.2715505705211854, 51.7673088209352],
          [-1.2717817705466246, 51.76724972276793],
          [-1.272988031548266, 51.76699155618175],
          [-1.2737125882784426, 51.766927770752005],
          [-1.2739261592040236, 51.76690373967139],
          [-1.2749357672171584, 51.76675354512608],
          [-1.2751302975135843, 51.766759523104014],
          [-1.2757598452428454, 51.7668368491336],
          [-1.2757742623636261, 51.76676556682756],
          [-1.2757646509470533, 51.76667039616083],
          [-1.2757165938691344, 51.766384882956174],
          [-1.2757213995764687, 51.766197513934856],
          [-1.2758847936443658, 51.764793708587945],
          [-1.2758799879360936, 51.76463012673537],
          [-1.2762067760699551, 51.76409178954455],
          [-1.2764662842947132, 51.76382410567874],
          [-1.2776545475779528, 51.763151562655764],
          [-1.278620494856682, 51.76265187441598],
          [-1.2792164026308797, 51.762491259164676],
          [-1.2793173224960128, 51.76259833606238],
          [-1.280172738494997, 51.76383862495547],
          [-1.2804851095059746, 51.763755345233534],
          [-1.2803265211463497, 51.763475762186744],
        ],
      },
    },
  ],
};

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

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function calculateBearing(start, end) {
  if (!start || !end) return -35;
  const [lng1, lat1] = start.map(Number);
  const [lng2, lat2] = end.map(Number);
  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);
  const deltaLng = toRadians(lng2 - lng1);
  const y = Math.sin(deltaLng) * Math.cos(radLat2);
  const x =
    Math.cos(radLat1) * Math.sin(radLat2) -
    Math.sin(radLat1) * Math.cos(radLat2) * Math.cos(deltaLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

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
  document.body.classList.toggle('nav-open', isOpen);
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
  const isDesktop = window.matchMedia('(min-width: 768px)').matches;
  const height = isDesktop ? header.offsetHeight : 0;
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
      'text-color': '#ffffff',
      'text-halo-color': 'rgba(3, 138, 93, 0.8)',
      'text-halo-width': 1.6,
    },
  });
}

function addWalkingRoute(map) {
  const sourceId = 'wedding-walking-route';
  const lineData = WALKING_ROUTE;

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'geojson',
      data: lineData,
      lineMetrics: true,
    });
  } else {
    const existingSource = map.getSource(sourceId);
    existingSource.setData(lineData);
  }

  if (!map.getLayer('wedding-walking-route-glow')) {
    map.addLayer({
      id: 'wedding-walking-route-glow',
      type: 'line',
      source: sourceId,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': 'rgba(255, 255, 255, 0.55)',
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12,
          4,
          16,
          18,
        ],
        'line-blur': 6,
        'line-opacity': 0.6,
      },
    });
  }

  if (!map.getLayer('wedding-walking-route-line')) {
    map.addLayer({
      id: 'wedding-walking-route-line',
      type: 'line',
      source: sourceId,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#ffffff',
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12,
          3,
          17,
          10,
        ],
        'line-gradient': [
          'interpolate',
          ['linear'],
          ['line-progress'],
          0,
          'rgba(255, 255, 255, 0.6)',
          1,
          '#ffffff',
        ],
        'line-opacity': 0.95,
      },
    });
  }
}

function animateRouteFlyover(map) {
  const coordinates = WALKING_ROUTE.features?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length === 0) return;

  const bounds = coordinates.reduce((acc, coord) => {
    if (!acc) {
      return new mapboxgl.LngLatBounds(coord, coord);
    }
    return acc.extend(coord);
  }, null);

  if (bounds) {
    map.fitBounds(bounds, {
      padding: { top: 120, bottom: 160, left: 160, right: 160 },
      duration: 2000,
      pitch: 68,
      bearing: calculateBearing(coordinates[0], coordinates[1]) - 20,
      essential: true,
    });
  }

  let stepIndex = 0;
  const stepDuration = 1600;

  function advanceAlongRoute() {
    if (stepIndex >= coordinates.length) return;
    const current = coordinates[stepIndex];
    const next = coordinates[Math.min(stepIndex + 1, coordinates.length - 1)];
    const bearing = calculateBearing(current, next);

    map.easeTo({
      center: current,
      zoom: 16.2,
      pitch: 72,
      bearing,
      duration: stepDuration,
      essential: true,
    });

    stepIndex += 1;

    if (stepIndex < coordinates.length) {
      map.once('moveend', () => {
        setTimeout(advanceAlongRoute, 150);
      });
    } else {
      const finalBearing = calculateBearing(
        coordinates[coordinates.length - 2] ?? current,
        coordinates[coordinates.length - 1]
      );
      map.once('moveend', () => {
        map.easeTo({
          center: coordinates[coordinates.length - 1],
          zoom: 15.8,
          pitch: 64,
          bearing: finalBearing,
          duration: 1800,
          essential: true,
        });
      });
    }
  }

  map.once('moveend', () => {
    setTimeout(advanceAlongRoute, 400);
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
    addWalkingRoute(mapInstance);
    animateRouteFlyover(mapInstance);
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
