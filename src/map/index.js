import { MAPBOX_DEFAULT_STYLE, MAPBOX_TOKEN } from '../config.js';

const CHURCH_COORDS = [-1.2684928, 51.7666909];
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

const GARDEN_FOOTPRINT = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'The Medley Walled Garden',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-1.2802992622484908, 51.76347306334887],
            [-1.2805981364095942, 51.76335837809077],
            [-1.2804885492170115, 51.7632547911563],
            [-1.2810125752451142, 51.7630426838337],
            [-1.280522421622038, 51.76256420551704],
            [-1.2798748609405095, 51.76280221211758],
            [-1.2801637726291517, 51.76319189897248],
            [-1.2801518176624995, 51.76321902894463],
            [-1.2802992622484908, 51.76347306334887],
          ],
        ],
      },
    },
  ],
};

let mapLoaded = false;
let mapInstance;
let routeBoundsCache = null;
let initialCameraCache = null;

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
  if (!map.getSource('medley-footprint')) {
    map.addSource('medley-footprint', {
      type: 'geojson',
      data: GARDEN_FOOTPRINT,
    });
  } else {
    map.getSource('medley-footprint').setData(GARDEN_FOOTPRINT);
  }

  if (!map.getLayer('medley-extrusion')) {
    map.addLayer({
      id: 'medley-extrusion',
      type: 'fill-extrusion',
      source: 'medley-footprint',
      paint: {
        'fill-extrusion-color': '#4ba87d',
        'fill-extrusion-height': 14,
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.95,
        'fill-extrusion-vertical-gradient': true,
      },
    });
  }

  if (!map.getLayer('medley-label')) {
    map.addLayer({
      id: 'medley-label',
      type: 'symbol',
      source: 'medley-footprint',
      layout: {
        'text-field': ['get', 'name'],
        'text-offset': [0, 1.1],
        'text-anchor': 'top',
        'text-size': 13,
        'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(75, 168, 125, 0.85)',
        'text-halo-width': 1.8,
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
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 4, 16, 18],
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
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 3, 17, 10],
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

function getRouteBounds() {
  const coordinates = WALKING_ROUTE.features?.[0]?.geometry?.coordinates;

  if (typeof mapboxgl === 'undefined' || !Array.isArray(coordinates) || coordinates.length === 0) {
    return null;
  }

  return coordinates.reduce((bounds, coord) => {
    if (!Array.isArray(coord) || coord.length < 2) {
      return bounds;
    }

    if (!bounds) {
      return new mapboxgl.LngLatBounds(coord, coord);
    }

    return bounds.extend(coord);
  }, null);
}

function animateRouteFlyover(map, routeBounds, initialCamera) {
  const coordinates = WALKING_ROUTE.features?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length === 0) return;

  const bounds = routeBounds || getRouteBounds();

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

        if (initialCamera) {
          map.once('moveend', () => {
            map.easeTo({
              center: initialCamera.center,
              zoom: initialCamera.zoom,
              pitch: initialCamera.pitch,
              bearing: initialCamera.bearing,
              duration: 2200,
              essential: true,
            });
          });
        }
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

export function initMap() {
  const mapElement = document.getElementById('map');
  const mapContainer = document.querySelector('[data-map-container]');
  const mapReplayButton = document.querySelector('[data-map-replay]');

  if (!mapElement || !mapContainer) {
    return;
  }

  const mapStyle = mapElement.dataset.style?.trim() || MAPBOX_DEFAULT_STYLE;

  const initialiseMap = () => {
    if (mapLoaded) return;
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN.includes('YOUR_MAPBOX_ACCESS_TOKEN')) {
      mapElement.textContent = 'Add your Mapbox token in src/config.js to display the map.';
      mapLoaded = true;
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;
    mapInstance = new mapboxgl.Map({
      container: mapElement || 'map',
      style: mapStyle,
      center: CHURCH_COORDS,
      zoom: 15.4,
      pitch: 64,
      bearing: 135,
      antialias: true,
      attributionControl: false,
    });

    mapInstance.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    mapInstance.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');

    const routeBounds = getRouteBounds();

    mapInstance.on('load', () => {
      addTerrainAndBuildings(mapInstance);
      addLocationLayers(mapInstance);
      addWalkingRoute(mapInstance);

      if (routeBounds) {
        mapInstance.fitBounds(routeBounds, {
          padding: { top: 120, bottom: 160, left: 160, right: 160 },
          duration: 0,
          pitch: 64,
          bearing: 135,
          essential: true,
        });
      }

      const initialCamera = {
        center: mapInstance.getCenter(),
        zoom: mapInstance.getZoom(),
        pitch: mapInstance.getPitch(),
        bearing: mapInstance.getBearing(),
      };

      routeBoundsCache = routeBounds;
      initialCameraCache = initialCamera;

      animateRouteFlyover(mapInstance, routeBounds, initialCamera);

      if (mapReplayButton) {
        mapReplayButton.disabled = false;
      }
    });

    mapLoaded = true;
  };

  const observeMap = () => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            loadMapboxResources()
              .then(initialiseMap)
              .catch(() => {
                mapElement.textContent = 'The map is unavailable right now.';
              });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(mapContainer);
  };

  observeMap();

  if (mapReplayButton) {
    mapReplayButton.disabled = true;
    mapReplayButton.addEventListener('click', () => {
      if (!mapInstance || !routeBoundsCache || !initialCameraCache) {
        return;
      }

      mapInstance.stop();
      animateRouteFlyover(mapInstance, routeBoundsCache, initialCameraCache);
    });
  }
}
