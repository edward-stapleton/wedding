const ACCESS_CODE = 'STARFORD';
const STORAGE_KEY = 'weddingSiteUnlocked';
const RSVP_ENDPOINT = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
const MAPBOX_TOKEN =
  'pk.eyJ1IjoiZWR3YXJkc3RhcGxldG9uIiwiYSI6ImNtaGwyMWE2YzBjbzcyanNjYms4ZTduMWoifQ.yo7R9MXXEfna7rzmFk2rQg';
const MAPBOX_DEFAULT_STYLE = 'mapbox://styles/mapbox/standard?optimize=true';
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
          [-1.268910374597823, 51.76645696949447],
          [-1.2692626919094323, 51.76765240358776],
          [-1.2757564118993514, 51.76682913633243],
          [-1.2758821253287351, 51.76461556119929],
          [-1.279199506591283, 51.762487079908624],
          [-1.2801810281823407, 51.76384317739718],
          [-1.2805189580681429, 51.76376221749646],
          [-1.2803336416793627, 51.763438376441684],
        ],
      },
    },
  ],
};

const CHURCH_FOOTPRINT = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-1.2684455873902891, 51.766878097709906],
            [-1.268418708679235, 51.76682661078229],
            [-1.2687681319231956, 51.76677116325658],
            [-1.268747652905546, 51.76673234994786],
            [-1.2687719717386017, 51.76672680518672],
            [-1.2687374133956553, 51.766657099560405],
            [-1.268715654439518, 51.76665947589035],
            [-1.2686990152373028, 51.76661670193235],
            [-1.2687284538253039, 51.76661036504598],
            [-1.268702855053732, 51.76656283837164],
            [-1.2686170991655956, 51.76657709637948],
            [-1.2686337383678108, 51.76662224670696],
            [-1.2684993448124544, 51.76664680212909],
            [-1.2684878253651561, 51.76662779148094],
            [-1.268234397518171, 51.766667396989305],
            [-1.2682612762292536, 51.76673472627388],
            [-1.2682036789916822, 51.76674423157644],
            [-1.268248476842416, 51.766833739745124],
            [-1.2683188734668533, 51.76682265024709],
            [-1.2683367926075562, 51.76685908715885],
            [-1.2683035142040637, 51.76686700822279],
            [-1.2683175935283373, 51.76689948456996],
            [-1.2684455873902891, 51.766878097709906],
          ],
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
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Map could not load.'));

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css';

    document.head.appendChild(link);
    document.head.appendChild(script);
  });
}

function addLocationLayers(map) {
  const gardenPoint = {
    type: 'FeatureCollection',
    features: [
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
      data: gardenPoint,
    });
  } else {
    map.getSource('wedding-locations').setData(gardenPoint);
  }

  if (!map.getLayer('wedding-locations-circle')) {
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
  }

  if (!map.getLayer('wedding-locations-labels')) {
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

  if (!map.getSource('st-margarets-footprint')) {
    map.addSource('st-margarets-footprint', {
      type: 'geojson',
      data: CHURCH_FOOTPRINT,
    });
  } else {
    map.getSource('st-margarets-footprint').setData(CHURCH_FOOTPRINT);
  }

  if (!map.getLayer('st-margarets-extrusion')) {
    map.addLayer({
      id: 'st-margarets-extrusion',
      type: 'fill-extrusion',
      source: 'st-margarets-footprint',
      paint: {
        'fill-extrusion-color': '#f05a7e',
        'fill-extrusion-height': 16,
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.95,
        'fill-extrusion-vertical-gradient': true,
      },
    });
  }

  if (!map.getLayer('st-margarets-label')) {
    map.addLayer({
      id: 'st-margarets-label',
      type: 'symbol',
      source: 'st-margarets-footprint',
      layout: {
        'text-field': "St Margaret's Church",
        'text-offset': [0, 1.1],
        'text-anchor': 'top',
        'text-size': 13,
        'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(240, 90, 126, 0.85)',
        'text-halo-width': 1.8,
      },
    });
  }
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

  const southeastBearing = 135;

  if (bounds) {
    map.fitBounds(bounds, {
      padding: { top: 120, bottom: 160, left: 160, right: 160 },
      duration: 2000,
      pitch: 68,
      bearing: southeastBearing,
      essential: true,
    });
  }

  let stepIndex = 0;
  const stepDuration = 1600;

  function advanceAlongRoute() {
    if (stepIndex >= coordinates.length) return;
    const current = coordinates[stepIndex];

    map.easeTo({
      center: current,
      zoom: 16.2,
      pitch: 72,
      bearing: southeastBearing,
      duration: stepDuration,
      essential: true,
    });

    stepIndex += 1;

    if (stepIndex < coordinates.length) {
      map.once('moveend', () => {
        setTimeout(advanceAlongRoute, 150);
      });
    } else {
      map.once('moveend', () => {
        map.easeTo({
          center: coordinates[coordinates.length - 1],
          zoom: 15.8,
          pitch: 64,
          bearing: southeastBearing,
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

  const style = map.getStyle();
  const layers = style?.layers ?? [];
  const labelLayerId = layers.find(
    layer => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
  )?.id;

  if (map.getLayer('3d-buildings')) {
    return;
  }

  const sourceId = style?.sources?.composite
    ? 'composite'
    : style?.sources?.basemap
    ? 'basemap'
    : null;

  if (!sourceId) {
    return;
  }

  map.addLayer(
    {
      id: '3d-buildings',
      source: sourceId,
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
    bearing: 135,
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
