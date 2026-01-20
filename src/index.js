import { initGuide } from './guide/index.js';
import { initMap } from './map/index.js';
import { initNav } from './nav/index.js';
import { initRsvp } from './rsvp/index.js';
import { initAccordion } from './utils/accordion.js';
import { initFadeSections } from './utils/fade.js';

function initSite() {
  initNav();
  initGuide();
  initMap();
  initRsvp();
  initFadeSections();
  initAccordion();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSite);
} else {
  initSite();
}
