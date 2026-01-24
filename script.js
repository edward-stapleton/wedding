import { CHURCH_FOOTPRINT, GARDEN_FOOTPRINT, WALKING_ROUTE } from './data/map.js';
import { GUIDE_CATEGORY_INTROS } from './data/guide.js';

const APP_CONFIG = window.__APP_CONFIG__ ?? window.APP_CONFIG ?? {};
const SUPABASE_URL =
  APP_CONFIG.supabaseUrl ?? 'https://ipxbndockmhkfuwjyevi.supabase.co';
const SUPABASE_ANON_KEY =
  APP_CONFIG.supabaseAnonKey ??
  'sb_publishable_VatpUfqGmaOnMBMvbEr8sQ_mmhphftT';
const SITE_BASE_URL =
  APP_CONFIG.siteBaseUrl ?? `${window.location.origin}/`;
const SITE_BASE_PATH = new URL(SITE_BASE_URL).pathname.replace(/\/?$/, '/');
const RSVP_ROUTE_PATH = 'rsvp/';
const RSVP_ROUTE_URL = new URL(RSVP_ROUTE_PATH, SITE_BASE_URL).toString();
const RSVP_COUPLE_ROUTE_PATH = 'rsvp-couple/';
const HEADER_TEMPLATE_PATH = 'partials/site-header.html';
const HEADER_TEMPLATE_URL = new URL(HEADER_TEMPLATE_PATH, SITE_BASE_URL).toString();
const normalizePath = path => {
  let normalized = path || '/';
  if (SITE_BASE_PATH !== '/' && normalized.startsWith(SITE_BASE_PATH)) {
    normalized = `/${normalized.slice(SITE_BASE_PATH.length)}`;
  }
  normalized = normalized.replace(/index\.html$/i, '');
  if (!normalized.endsWith('/')) {
    normalized = `${normalized}/`;
  }
  return normalized;
};
const currentPath = normalizePath(window.location.pathname);
const isRsvpSingleRoute = currentPath === `/${RSVP_ROUTE_PATH}`;
const isRsvpCoupleRoute = currentPath === `/${RSVP_COUPLE_ROUTE_PATH}`;
const isRsvpRoute = isRsvpSingleRoute || isRsvpCoupleRoute;
const isHomeRoute = currentPath === '/';
const allowedRoutes = new Set(['/', `/${RSVP_ROUTE_PATH}`, `/${RSVP_COUPLE_ROUTE_PATH}`]);
if (!allowedRoutes.has(currentPath)) {
  window.location.replace(SITE_BASE_URL);
}
const EMAIL_STORAGE_KEY = 'weddingGuestEmail';
const INVITE_TOKEN_STORAGE_KEY = 'weddingInviteToken';
const INVITE_TYPE_STORAGE_KEY = 'weddingInviteType';
const RSVP_COMPLETED_KEY_PREFIX = 'weddingRsvpCompleted:';
const RSVP_ACCESS_STORAGE_KEY = 'weddingRsvpAccessEmail';
const RSVP_ENDPOINT = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
const MAPBOX_TOKEN = APP_CONFIG.mapboxToken;
const MAPBOX_DEFAULT_STYLE = APP_CONFIG.mapboxStyle;
const mapElement = document.getElementById('map');
const MAPBOX_STYLE = mapElement?.dataset.style?.trim() || MAPBOX_DEFAULT_STYLE;
const CHURCH_COORDS = [-1.2684928, 51.7666909];

const rsvpAccessEmailInput = document.getElementById('rsvp-access-email');
const rsvpAccessLink = document.querySelector('.rsvp-access-link');
const rsvpAccessFeedback = document.getElementById('rsvp-access-feedback');
const returningEmailField = document.querySelector('[data-returning-email]');
const siteAccessSection = document.querySelector('[data-site-access]');
const siteContent = document.querySelector('[data-site-content]');
const siteAccessForm = document.getElementById('site-access-form');
const siteAccessEmailInput = document.getElementById('site-access-email');
const siteAccessPasswordInput = document.getElementById('site-access-password');
const siteAccessFeedback = document.getElementById('site-access-feedback');
if (returningEmailField) {
  returningEmailField.hidden = true;
}
const stepOneSection = document.querySelector('[data-rsvp-step="1"]');
const stepOneTitle = stepOneSection?.querySelector('.rsvp-step-title');
const stepOneIntro = stepOneSection?.querySelector('.rsvp-step-intro');
const rsvpSection = document.getElementById('rsvp-page');
const rsvpForm = document.getElementById('rsvp-form');
const rsvpFeedback = document.getElementById('rsvp-feedback');
const primaryNameEl = document.querySelector('[data-guest-name="primary"]');
const plusOneNameEl = document.querySelector('[data-guest-name="plusOne"]');
const plusOneSections = document.querySelectorAll('[data-guest-section="plusOne"]');
const primaryLegend = document.querySelector('[data-attendance-legend="primary"]');
const plusOneLegend = document.querySelector('[data-attendance-legend="plusOne"]');
const primaryDietaryLabel = document.querySelector('[data-dietary-label="primary"]');
const plusOneDietaryLabel = document.querySelector('[data-dietary-label="plusOne"]');
const primaryFirstNameInput = document.getElementById('primary-first-name');
const primaryLastNameInput = document.getElementById('primary-last-name');
const primaryDietaryInput = document.getElementById('primary-dietary');
const plusOneDietaryInput = document.getElementById('plusone-dietary');
const plusOneFirstNameInput = document.getElementById('plusone-first-name');
const plusOneLastNameInput = document.getElementById('plusone-last-name');
const rsvpPasswordInput = document.getElementById('rsvp-password');
const rsvpEmailField = document.getElementById('rsvp-email');
const inviteTokenField = document.getElementById('invite-token');
const rsvpTriggers = document.querySelectorAll('[data-rsvp-trigger]');
const guestSections = document.querySelectorAll('.guest-response');
const stepIndicators = document.querySelectorAll('[data-step-indicator]');
const rsvpProgress = document.querySelector('.rsvp-steps.rsvp-progress');
const stepSections = document.querySelectorAll('[data-rsvp-step]');
const stepPrevButton = document.querySelector('[data-step-prev]');
const stepNextButton = document.querySelector('[data-step-next]');
const stepSubmitButton = document.querySelector('[data-step-submit]');
const stepEnterButton = document.querySelector('[data-step-enter]');
const mapContainer = document.querySelector('[data-map-container]');
let siteNav = document.querySelector('.site-nav');
let navToggle = document.querySelector('.nav-toggle');
let navLinks = Array.from(document.querySelectorAll('.nav-links a'));
let header = document.querySelector('.site-header');
const mobileModalMedia = window.matchMedia('(max-width: 600px)');
const mapReplayButton = document.querySelector('[data-map-replay]');
const thankYouMessageEl = document.getElementById('rsvp-thank-you-message');
const thankYouPersonalEl = document.getElementById('rsvp-thank-you-personal');
const stepOneTitleDefault = stepOneTitle?.textContent?.trim() || 'Welcome';
const stepOneIntroDefault =
  stepOneIntro?.textContent?.trim() ||
  'Saturday 22 August 2026 · Oxford. Please enter the password from your invitation to begin your RSVP.';
const NAV_LINK_TARGETS = {
  home: `${SITE_BASE_URL}#home`,
  rsvp: new URL('rsvp/index.html', SITE_BASE_URL).toString(),
  schedule: `${SITE_BASE_URL}#schedule`,
  guide: `${SITE_BASE_URL}#guide`,
  faqs: `${SITE_BASE_URL}#faqs`,
};

let mapLoaded = false;
let mapInstance;
let routeBoundsCache = null;
let initialCameraCache = null;
const rsvpState = {
  guestProfile: null,
  inviteDetails: null,
  currentStep: 1,
  inviteToken: null,
  inviteTypeOverride: '',
  inviteTypeFromUrl: '',
  inviteTypeFromRoute: '',
  authenticatedEmail: '',
  invitationGroupId: '',
  inviteLookupFailed: false,
  storedEmail: '',
  hasAppliedCompletionDismissal: false,
  isReturningRsvp: false,
  hasRequestedReturning: false,
  hasCompletedRsvp: false,
};
const rsvpCompletionCache = new Map();

const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Supabase Edge Functions (RSVP) ---
const EDGE_FUNCTION_BASE_URL = `${SUPABASE_URL}/functions/v1`;
const RSVP_LOOKUP_FUNCTION_URL = `${EDGE_FUNCTION_BASE_URL}/rsvp-lookup`;
const RSVP_SUBMIT_FUNCTION_URL = `${EDGE_FUNCTION_BASE_URL}/rsvp-submit`;

async function callRsvpFunction(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let json;
  try {
    json = await response.json();
  } catch {
    throw new Error('RSVP service returned an invalid response.');
  }

  if (!response.ok || !json?.ok) {
    const message = json?.details || json?.message || json?.error || 'RSVP service error.';
    throw new Error(message);
  }

  return json;
}

const ATTENDANCE_PROMPT = 'Able to come?';
const DIETARY_LABEL_TEXT = 'Any dietary requirements?';
const DIETARY_PLACEHOLDER = 'e.g. vegetarian, vegan, gluten-intolerant, allergies';
const INVITE_TYPE_QUERY_KEY = 'invite';
const RSVP_PASSWORD = APP_CONFIG.rsvpPassword ?? 'STARFORD';
const routeInviteTypeOverride = normalizeInviteType(document.body?.dataset.rsvpEntry) ||
  (isRsvpSingleRoute ? 'single' : isRsvpCoupleRoute ? 'plusone' : '');

function refreshNavigationElements() {
  siteNav = document.querySelector('.site-nav');
  navToggle = document.querySelector('.nav-toggle');
  navLinks = Array.from(document.querySelectorAll('.nav-links a'));
  header = document.querySelector('.site-header');
}

function applySharedNavLinks(root = document) {
  const links = root.querySelectorAll('[data-nav-link]');
  links.forEach(link => {
    const key = link.dataset.navLink;
    const target = NAV_LINK_TARGETS[key];
    if (target) {
      link.setAttribute('href', target);
    }
  });
}

async function loadSharedHeader() {
  const host = document.querySelector('[data-shared-header]');
  if (!host) return;

  try {
    const response = await fetch(HEADER_TEMPLATE_URL, { cache: 'no-store' });
    if (!response.ok) return;
    const templateMarkup = await response.text();
    const parsed = new DOMParser().parseFromString(templateMarkup, 'text/html');
    const template = parsed.querySelector('#site-header-template');
    if (!template) return;
    const fragment = template.content.cloneNode(true);
    host.replaceWith(fragment);
    applySharedNavLinks(document);
    refreshNavigationElements();
  } catch (error) {
    console.warn('Unable to load shared header template', error);
  }
}

function createGuestProfile(email) {
  return {
    email,
    primary: { name: 'Guest 1', firstName: '', lastName: '' },
    plusOne: null,
  };
}

function normalizeEmailForStorage(email) {
  return email?.trim().toLowerCase() || '';
}

function getRsvpCompletionKey(email) {
  const normalized = normalizeEmailForStorage(email);
  return normalized ? `${RSVP_COMPLETED_KEY_PREFIX}${normalized}` : '';
}

function isRsvpCompleted(email) {
  const key = getRsvpCompletionKey(email);
  return key ? localStorage.getItem(key) === 'true' : false;
}

function setRsvpCompleted(email) {
  const key = getRsvpCompletionKey(email);
  if (!key) return;
  localStorage.setItem(key, 'true');
  const normalizedEmail = normalizeEmailForStorage(email);
  if (normalizedEmail) {
    rsvpCompletionCache.set(normalizedEmail, true);
  }
}

async function fetchRsvpCompletionStatus(email) {
  const normalizedEmail = normalizeEmailForStorage(email);
  if (!normalizedEmail) return false;

  if (rsvpCompletionCache.has(normalizedEmail)) {
    return rsvpCompletionCache.get(normalizedEmail);
  }

  // Fallback to local storage if Edge Functions are unreachable.
  try {
    const result = await callRsvpFunction(RSVP_LOOKUP_FUNCTION_URL, {
      email: normalizedEmail,
      sitePassword: RSVP_PASSWORD,
      inviteToken: rsvpState.inviteToken || '',
    });

    const completed = Boolean(result.rsvp_completed);

    if (completed) {
      setRsvpCompleted(normalizedEmail);
    } else {
      const key = getRsvpCompletionKey(normalizedEmail);
      if (key) localStorage.removeItem(key);
    }

    rsvpCompletionCache.set(normalizedEmail, completed);
    return completed;
  } catch (error) {
    const cachedCompletion = isRsvpCompleted(normalizedEmail);
    rsvpCompletionCache.set(normalizedEmail, cachedCompletion);
    return cachedCompletion;
  }
}

function setRsvpAccessEmail(email) {
  const normalized = normalizeEmailForStorage(email);
  if (!normalized) return;
  localStorage.setItem(RSVP_ACCESS_STORAGE_KEY, normalized);
}

function getStoredRsvpAccessEmail() {
  return localStorage.getItem(RSVP_ACCESS_STORAGE_KEY) || '';
}

function setSiteAccessFeedback(message) {
  if (siteAccessFeedback) {
    siteAccessFeedback.textContent = message;
  }
}

function setSiteAccessVisibility(shouldShow) {
  if (!siteAccessSection || !siteContent) return;
  document.body.classList.toggle('site-locked', shouldShow);
  siteAccessSection.hidden = !shouldShow;
  siteAccessSection.setAttribute('aria-hidden', String(!shouldShow));
  siteContent.hidden = shouldShow;
  siteContent.setAttribute('aria-hidden', String(shouldShow));
  if (shouldShow) {
    siteAccessEmailInput?.focus();
  }
}

async function doesGuestExist(email) {
  if (!email) return false;
  const normalized = normalizeEmailForStorage(email);
  if (!normalized) return false;

  try {
    const result = await callRsvpFunction(RSVP_LOOKUP_FUNCTION_URL, {
      email: normalized,
      sitePassword: RSVP_PASSWORD,
      inviteToken: rsvpState.inviteToken || '',
    });
    return (result.guests?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

function formatGuestName(firstName, lastName, fallback) {
  const trimmedFirst = firstName?.trim() || '';
  const trimmedLast = lastName?.trim() || '';
  if (trimmedFirst || trimmedLast) {
    return `${trimmedFirst} ${trimmedLast}`.trim();
  }
  return fallback;
}

function setInputValueIfEmpty(input, value) {
  if (!input) return;
  if (!input.value && value) {
    input.value = value;
  }
}

function setInputValue(input, value) {
  if (!input) return;
  input.value = value ?? '';
}

function setInviteDetails(invite) {
  rsvpState.inviteDetails = invite;
  if (invite?.id) {
    rsvpState.invitationGroupId = invite.id;
  }
  updateStepIndicatorVisibility();
}

function setGuestProfile(profile) {
  rsvpState.guestProfile = profile;
  updateGuestUi(profile);
  updateStepIndicatorVisibility();
}

function applyInviteDetailsToProfile(invite, emailFallback) {
  if (!invite) {
    setInviteDetails(null);
    setGuestProfile(createGuestProfile(emailFallback));
    return;
  }

  const primaryFirst = invite.primary_first_name || '';
  const primaryLast = invite.primary_last_name || '';
  const primaryName = formatGuestName(primaryFirst, primaryLast, 'Guest 1');
  const hasPlusOne = invite.invite_type === 'plusone';

  setInviteDetails(invite);
  setGuestProfile({
    email: invite.primary_email || emailFallback,
    primary: {
      name: primaryName,
      firstName: primaryFirst,
      lastName: primaryLast,
    },
    plusOne: hasPlusOne
      ? {
          name: 'Guest 2',
          firstName: '',
          lastName: '',
        }
      : null,
  });
}

function applyInviteTypeOverride(inviteType, emailFallback) {
  const normalized = normalizeInviteType(inviteType);
  if (!normalized) {
    return false;
  }
  applyInviteDetailsToProfile(
    {
      invite_type: normalized,
      primary_email: emailFallback || '',
    },
    emailFallback
  );
  return true;
}

async function fetchInviteDetails(token) {
  // With strict RLS, we do not query invites from the browser.
  // Keep the token in state; Edge Functions will validate it when we lookup/submit.
  if (!token) {
    setInviteDetails(null);
    return null;
  }

  rsvpState.inviteToken = token;
  if (inviteTokenField) inviteTokenField.value = token;

  // We can still drive UI from route overrides.
  rsvpState.inviteLookupFailed = false;
  return null;
}

function setGuestSectionState(section, expanded) {
  if (!section) return;
  const body = section.querySelector('[data-guest-body]');
  const toggle = section.querySelector('.guest-toggle');
  if (!body || !toggle) return;
  body.hidden = !expanded;
  section.classList.toggle('collapsed', !expanded);
  toggle.setAttribute('aria-expanded', String(expanded));
}

function applyGuestSectionResponsiveState(isMobile) {
  guestSections.forEach((section, index) => {
    const expanded = !isMobile || index === 0;
    setGuestSectionState(section, expanded);
  });
}

function setupGuestSectionToggles() {
  guestSections.forEach(section => {
    const toggle = section.querySelector('.guest-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      setGuestSectionState(section, !expanded);
    });
  });

  const handleChange = event => {
    const matches = typeof event === 'boolean' ? event : event.matches;
    applyGuestSectionResponsiveState(matches);
  };

  if (mobileModalMedia.addEventListener) {
    mobileModalMedia.addEventListener('change', handleChange);
  } else if (mobileModalMedia.addListener) {
    mobileModalMedia.addListener(handleChange);
  }

  handleChange(mobileModalMedia.matches);
}

function resetGuestSectionState() {
  applyGuestSectionResponsiveState(mobileModalMedia.matches);
}

function getRsvpStepSequence() {
  return [2, 3, 4];
}

function getRsvpNavigationSequence() {
  const hasPlusOne =
    isPlusOneActive(rsvpState.guestProfile) || rsvpState.inviteDetails?.invite_type === 'plusone';
  return hasPlusOne ? [1, 2, 3, 4, 5] : [1, 2, 4, 5];
}

function getNearestRsvpStep(step) {
  const sequence = getRsvpNavigationSequence();
  if (sequence.includes(step)) {
    return step;
  }
  const priorStep = sequence.filter(sequenceStep => sequenceStep <= step).pop();
  return priorStep ?? sequence[0];
}

function getRsvpStepByOffset(step, offset) {
  const sequence = getRsvpNavigationSequence();
  const currentIndex = sequence.indexOf(step);
  if (currentIndex === -1) {
    return sequence[0];
  }
  const nextIndex = Math.min(Math.max(currentIndex + offset, 0), sequence.length - 1);
  return sequence[nextIndex];
}

function updateStepIndicators(activeStep) {
  const sequence = getRsvpStepSequence();
  const activeIndex = sequence.indexOf(activeStep);
  const maxStep = sequence[sequence.length - 1];
  const isAfterProgress = activeIndex === -1 && activeStep > maxStep;

  stepIndicators.forEach(indicator => {
    const indicatorIndex = Number(indicator.dataset.stepIndicator) - 1;
    const indicatorStep = sequence[indicatorIndex];
    const isActive = indicatorStep === activeStep;
    const isComplete =
      typeof indicatorStep === 'number' &&
      ((activeIndex !== -1 && indicatorIndex < activeIndex) || (isAfterProgress && indicatorStep <= maxStep));

    indicator.classList.toggle('is-active', Boolean(isActive));
    indicator.classList.toggle('is-complete', Boolean(isComplete));
  });
}

function updateStepIndicatorVisibility() {
  const plusOneIndicator = Array.from(stepIndicators).find(
    indicator => indicator.dataset.stepIndicator === '2'
  );
  if (!plusOneIndicator) return;
  const hasPlusOne =
    rsvpState.inviteDetails?.invite_type === 'plusone' || isPlusOneActive(rsvpState.guestProfile);
  const shouldHide = !hasPlusOne;
  plusOneIndicator.hidden = shouldHide;
  plusOneIndicator.setAttribute('aria-hidden', String(shouldHide));
}

function getStepOneButtonLabel() {
  return rsvpState.isReturningRsvp ? 'Enter' : 'RSVP';
}

function setReturningRsvpState(shouldReturn) {
  const canReturn = Boolean(shouldReturn && rsvpState.hasRequestedReturning);
  rsvpState.isReturningRsvp = canReturn;
  if (returningEmailField) {
    returningEmailField.hidden = !canReturn;
  }
  if (rsvpAccessEmailInput) {
    rsvpAccessEmailInput.required = canReturn;
    if (!canReturn) {
      rsvpAccessEmailInput.removeAttribute('required');
      rsvpAccessEmailInput.removeAttribute('aria-invalid');
    }
  }

  if (stepOneTitle) {
    stepOneTitle.textContent = canReturn ? 'Welcome back' : stepOneTitleDefault;
  }

  if (stepOneIntro) {
    stepOneIntro.textContent = canReturn
      ? 'Enter the email address you used before along with the invitation password to reopen your RSVP.'
      : stepOneIntroDefault;
  }

  if (rsvpState.currentStep === 1 && stepNextButton) {
    stepNextButton.textContent = getStepOneButtonLabel();
  }
}

function resetReturningRsvpRequest() {
  rsvpState.hasRequestedReturning = false;
  setReturningRsvpState(false);
}

function setStep(step) {
  const resolvedStep = getNearestRsvpStep(step);
  rsvpState.currentStep = resolvedStep;
  stepSections.forEach(section => {
    const sectionStep = Number(section.dataset.rsvpStep);
    section.hidden = sectionStep !== resolvedStep;
  });

  updateStepIndicators(resolvedStep);
  updateStepIndicatorVisibility();

  if (rsvpProgress) {
    const shouldHideProgress = resolvedStep === 1 || resolvedStep === 5;
    rsvpProgress.hidden = shouldHideProgress;
    rsvpProgress.setAttribute('aria-hidden', String(shouldHideProgress));
  }

  if (stepPrevButton) {
    stepPrevButton.hidden = resolvedStep === 1 || resolvedStep === 5;
  }

  if (stepNextButton) {
    stepNextButton.hidden = resolvedStep < 1 || resolvedStep >= 4;
    stepNextButton.textContent = resolvedStep === 1 ? getStepOneButtonLabel() : 'Next';
  }

  if (stepSubmitButton) {
    stepSubmitButton.hidden = resolvedStep !== 4;
  }

  if (stepEnterButton) {
    stepEnterButton.hidden = resolvedStep !== 5;
  }

  const activeSection = Array.from(stepSections).find(section => Number(section.dataset.rsvpStep) === resolvedStep);
  const focusTarget = activeSection?.querySelector(
    'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), button:not([disabled])'
  );
  if (focusTarget) {
    setTimeout(() => focusTarget.focus(), 50);
  }

  updatePasswordGate();
}
 
function updateGuestUi(profile) {
  if (!profile) return;

  const primaryName = profile.primary?.name || 'Guest 1';
  const plusOneName = profile.plusOne?.name || 'Guest 2';
  const hasPlusOne = Boolean(profile.plusOne && profile.plusOne.name);

  if (primaryNameEl) {
    primaryNameEl.textContent = primaryName;
  }

  if (primaryLegend) {
    primaryLegend.textContent = ATTENDANCE_PROMPT;
  }

  if (primaryDietaryLabel) {
    primaryDietaryLabel.textContent = DIETARY_LABEL_TEXT;
  }

  if (primaryDietaryInput) {
    primaryDietaryInput.placeholder = DIETARY_PLACEHOLDER;
  }

  setInputValueIfEmpty(primaryFirstNameInput, profile.primary?.firstName);
  setInputValueIfEmpty(primaryLastNameInput, profile.primary?.lastName);

  if (plusOneSections.length > 0) {
    plusOneSections.forEach(section => {
      section.hidden = !hasPlusOne;
      if (!hasPlusOne) {
        setGuestSectionState(section, false);
      }
    });
  }

  if (hasPlusOne) {
    if (plusOneNameEl) {
      plusOneNameEl.textContent = plusOneName;
    }

    if (plusOneLegend) {
      plusOneLegend.textContent = ATTENDANCE_PROMPT;
    }

    if (plusOneDietaryLabel) {
      plusOneDietaryLabel.textContent = DIETARY_LABEL_TEXT;
    }

    if (plusOneDietaryInput) {
      plusOneDietaryInput.placeholder = DIETARY_PLACEHOLDER;
    }

    setInputValueIfEmpty(plusOneFirstNameInput, profile.plusOne?.firstName);
    setInputValueIfEmpty(plusOneLastNameInput, profile.plusOne?.lastName);

    if (rsvpForm) {
      const plusOneRadios = rsvpForm.querySelectorAll('[name="plusone-attendance"]');
      plusOneRadios.forEach(input => {
        input.disabled = false;
        input.required = true;
      });
    }

    if (plusOneFirstNameInput) {
      plusOneFirstNameInput.disabled = false;
      plusOneFirstNameInput.required = true;
    }

    if (plusOneLastNameInput) {
      plusOneLastNameInput.disabled = false;
      plusOneLastNameInput.required = true;
    }
  } else {
    if (rsvpForm) {
      const plusOneRadios = rsvpForm.querySelectorAll('[name="plusone-attendance"]');
      plusOneRadios.forEach(input => {
        input.checked = false;
        input.disabled = true;
        input.required = false;
      });
    }

    if (plusOneDietaryInput) {
      plusOneDietaryInput.value = '';
    }

    if (plusOneFirstNameInput) {
      plusOneFirstNameInput.value = '';
      plusOneFirstNameInput.disabled = true;
      plusOneFirstNameInput.required = false;
    }

    if (plusOneLastNameInput) {
      plusOneLastNameInput.value = '';
      plusOneLastNameInput.disabled = true;
      plusOneLastNameInput.required = false;
    }
  }

  const emailValue = profile.email || '';

  if (rsvpEmailField) {
    rsvpEmailField.value = emailValue;
  }
}

function isPlusOneActive(profile) {
  if (profile?.plusOne && profile.plusOne.name) {
    return true;
  }
  if (rsvpState.inviteDetails?.invite_type === 'plusone') {
    return true;
  }
  return rsvpState.inviteTypeOverride === 'plusone';
}

function normalizeInviteType(value) {
  const normalized = value?.toString().trim().toLowerCase();
  if (normalized === 'single' || normalized === 'solo') return 'single';
  if (normalized === 'plusone' || normalized === 'plus-one' || normalized === 'couple') return 'plusone';
  return '';
}

function resolveInviteToken() {
  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get('i');
  rsvpState.inviteTypeFromUrl = normalizeInviteType(params.get(INVITE_TYPE_QUERY_KEY));
  const storedToken = localStorage.getItem(INVITE_TOKEN_STORAGE_KEY);
  const activeToken = tokenFromUrl || storedToken || '';
  const storedInviteType = localStorage.getItem(INVITE_TYPE_STORAGE_KEY);

  if (tokenFromUrl) {
    localStorage.setItem(INVITE_TOKEN_STORAGE_KEY, tokenFromUrl);
  }
  if (rsvpState.inviteTypeFromUrl) {
    localStorage.setItem(INVITE_TYPE_STORAGE_KEY, rsvpState.inviteTypeFromUrl);
  }

  rsvpState.inviteToken = activeToken;
  rsvpState.inviteTypeFromRoute = routeInviteTypeOverride;
  rsvpState.inviteTypeOverride =
    rsvpState.inviteTypeFromRoute || rsvpState.inviteTypeFromUrl || storedInviteType || '';

  if (inviteTokenField) {
    inviteTokenField.value = rsvpState.inviteToken;
  }
}

function setAttendanceValue(name, attendance) {
  if (!rsvpForm) return;
  const normalized = attendance?.toString().toLowerCase();
  const value = normalized === 'yes' ? 'Yes' : normalized === 'no' ? 'No' : '';
  if (!value) return;
  const input = rsvpForm.querySelector(`input[name="${name}"][value="${value}"]`);
  if (input) {
    input.checked = true;
  }
}

function populateRsvpFromGuests(guestRows, email) {
  if (!guestRows || guestRows.length === 0) return;

  const primary = guestRows.find(row => row.role === 'primary') || guestRows[0];
  const plusOne = guestRows.find(row => row.role === 'plusone') || null;

  rsvpState.invitationGroupId = primary?.invitation_group_id || rsvpState.invitationGroupId;

  setInputValue(primaryFirstNameInput, primary?.first_name);
  setInputValue(primaryLastNameInput, primary?.last_name);
  setAttendanceValue('primary-attendance', primary?.attendance);
  if (primaryDietaryInput) {
    primaryDietaryInput.value = primary?.dietary ?? '';
  }

  if (rsvpEmailField) {
    rsvpEmailField.value = email || primary?.email || '';
  }

  setInputValue(document.getElementById('address-line-1'), primary?.address_line_1);
  setInputValue(document.getElementById('address-line-2'), primary?.address_line_2);
  setInputValue(document.getElementById('address-city'), primary?.city);
  setInputValue(document.getElementById('address-postcode'), primary?.postcode);
  setInputValue(document.getElementById('address-country'), primary?.country);

  if (plusOne) {
    setInputValue(plusOneFirstNameInput, plusOne.first_name);
    setInputValue(plusOneLastNameInput, plusOne.last_name);
    setAttendanceValue('plusone-attendance', plusOne.attendance);
    if (plusOneDietaryInput) {
      plusOneDietaryInput.value = plusOne.dietary ?? '';
    }
  }

  setGuestProfile({
    email: email || primary?.email || '',
    primary: {
      name: formatGuestName(primary?.first_name, primary?.last_name, 'Guest 1'),
      firstName: primary?.first_name || '',
      lastName: primary?.last_name || '',
    },
    plusOne: plusOne
      ? {
          name: formatGuestName(plusOne?.first_name, plusOne?.last_name, 'Guest 2'),
          firstName: plusOne?.first_name || '',
          lastName: plusOne?.last_name || '',
        }
      : null,
  });

  setInviteDetails(
    rsvpState.inviteDetails ||
      (rsvpState.invitationGroupId
        ? {
            id: rsvpState.invitationGroupId,
            invite_type: plusOne ? 'plusone' : 'single',
            primary_email: email || primary?.email || '',
            primary_first_name: primary?.first_name || '',
            primary_last_name: primary?.last_name || '',
          }
        : null)
  );
}

async function loadGuestRowsByEmail(email) {
  if (!email) return [];

  try {
    const result = await callRsvpFunction(RSVP_LOOKUP_FUNCTION_URL, {
      email: normalizeEmailForStorage(email),
      sitePassword: RSVP_PASSWORD,
      inviteToken: rsvpState.inviteToken || '',
    });
    return result.guests || [];
  } catch (error) {
    if (rsvpFeedback) {
      rsvpFeedback.textContent = 'We could not load your saved RSVP yet. Please try again soon.';
    }
    return [];
  }
}

function isGuestRsvpComplete(guestRows) {
  if (!guestRows.length) return false;
  return guestRows.some(guest => typeof guest.attendance === 'string' && guest.attendance.trim() !== '');
}

async function enforceSiteGate() {
  if (isRsvpRoute) return true;
  if (!siteAccessSection || !siteContent) return true;
  if (!isHomeRoute) {
    window.location.replace(SITE_BASE_URL);
    return false;
  }

  const email = getStoredRsvpAccessEmail();
  if (email && (await doesGuestExist(email))) {
    setSiteAccessVisibility(false);
    return true;
  }

  setSiteAccessVisibility(true);
  return false;
}

function getActiveRsvpEmail() {
  return (
    rsvpState.authenticatedEmail ||
    rsvpState.guestProfile?.email ||
    rsvpState.storedEmail ||
    rsvpEmailField?.value ||
    rsvpAccessEmailInput?.value ||
    ''
  );
}

async function updateRsvpTriggerLabels() {
  if (!rsvpTriggers.length) return;
  const email = getActiveRsvpEmail();
  const completed = await fetchRsvpCompletionStatus(email);
  rsvpTriggers.forEach(trigger => {
    if (!trigger.dataset.rsvpDefaultLabel) {
      trigger.dataset.rsvpDefaultLabel = trigger.textContent?.trim() || 'RSVP';
    }
    trigger.textContent = completed ? 'Edit RSVP' : trigger.dataset.rsvpDefaultLabel;
  });
}

function setRsvpSectionVisibility(shouldShow) {
  if (!rsvpSection) return;
  rsvpSection.hidden = !shouldShow;
  rsvpSection.setAttribute('aria-hidden', String(!shouldShow));
}

async function applyRsvpCompletionDismissal() {
  if (rsvpState.hasAppliedCompletionDismissal) {
    await updateRsvpTriggerLabels();
    return;
  }
  const email = getActiveRsvpEmail();
  await updateRsvpTriggerLabels();
  const completed = await fetchRsvpCompletionStatus(email);
  if (completed) {
    setRsvpSectionVisibility(false);
  }
  rsvpState.hasAppliedCompletionDismissal = true;
}

async function setAuthEmail(email) {
  rsvpState.authenticatedEmail = email;
  if (email) {
    localStorage.setItem(EMAIL_STORAGE_KEY, email);
  }
  if (rsvpState.inviteDetails) {
    const updatedInvite = {
      ...rsvpState.inviteDetails,
      primary_email: email || rsvpState.inviteDetails.primary_email,
    };
    applyInviteDetailsToProfile(updatedInvite, email);
  } else {
    setGuestProfile(createGuestProfile(email));
  }
  await updateRsvpTriggerLabels();
  await refreshRsvpCompletionGate(email);
}

function setRsvpAccessFeedback(message) {
  if (rsvpAccessFeedback) {
    rsvpAccessFeedback.textContent = message;
    return;
  }
  if (rsvpFeedback) {
    rsvpFeedback.textContent = message;
  }
}

function setRsvpAccessLinkState(canAccess) {
  if (!rsvpAccessLink) return;
  const isEnabled = Boolean(canAccess);
  rsvpAccessLink.hidden = false;
  rsvpAccessLink.setAttribute('aria-hidden', 'false');
  rsvpAccessLink.setAttribute('aria-disabled', String(!isEnabled));
  rsvpAccessLink.tabIndex = 0;
}

function applyRsvpCompletionGateState(completed) {
  rsvpState.hasCompletedRsvp = Boolean(completed);
  setRsvpAccessLinkState(rsvpState.hasCompletedRsvp);
  if (!rsvpState.hasCompletedRsvp && rsvpState.isReturningRsvp) {
    setReturningRsvpState(false);
  }
  updateRsvpNavigationVisibility();
}

async function refreshRsvpCompletionGate(email, { showFeedback = false } = {}) {
  const normalizedEmail = normalizeEmailForStorage(email);
  if (!normalizedEmail) {
    applyRsvpCompletionGateState(false);
    if (showFeedback) {
      setRsvpAccessFeedback('Please RSVP first to unlock the returning option.');
    }
    return false;
  }

  const completed = await fetchRsvpCompletionStatus(normalizedEmail);
  applyRsvpCompletionGateState(completed);
  if (!completed && showFeedback) {
    setRsvpAccessFeedback('We could not find a completed RSVP for that email yet.');
  }
  return completed;
}

async function handleRsvpAccessSubmit() {
  if (!rsvpAccessEmailInput || !rsvpPasswordInput) return false;
  if (!supabaseClient) {
    setRsvpAccessFeedback('RSVP access is unavailable right now. Please try again later.');
    return false;
  }

  setRsvpAccessFeedback('');
  rsvpAccessEmailInput.removeAttribute('aria-invalid');
  rsvpPasswordInput.removeAttribute('aria-invalid');

  const emailValue = rsvpAccessEmailInput.value.trim();
  const passwordValue = rsvpPasswordInput.value.trim().toUpperCase();

  if (!emailValue || !emailValue.includes('@')) {
    setRsvpAccessFeedback('Please enter a valid email address to continue.');
    rsvpAccessEmailInput.setAttribute('aria-invalid', 'true');
    rsvpAccessEmailInput.focus();
    return false;
  }

  if (!passwordValue || passwordValue !== RSVP_PASSWORD) {
    setRsvpAccessFeedback('Please enter the invitation password to continue.');
    rsvpPasswordInput.setAttribute('aria-invalid', 'true');
    rsvpPasswordInput.focus();
    return false;
  }

  setRsvpAccessFeedback('Checking your RSVP...');
  const completed = await fetchRsvpCompletionStatus(emailValue);
  if (!completed) {
    setRsvpAccessFeedback('We could not find an RSVP for that email address.');
    rsvpAccessEmailInput.setAttribute('aria-invalid', 'true');
    rsvpAccessEmailInput.focus();
    return false;
  }

  const guestRows = await loadGuestRowsByEmail(emailValue);
  if (!guestRows.length) {
    setRsvpAccessFeedback('We could not load your RSVP right now. Please try again soon.');
    return false;
  }
  localStorage.setItem(EMAIL_STORAGE_KEY, emailValue);
  setRsvpAccessEmail(emailValue);
  await setAuthEmail(emailValue);
  populateRsvpFromGuests(guestRows, emailValue);
  setRsvpAccessFeedback('Welcome back! We have loaded your saved RSVP.');
  return true;
}

async function handleSiteAccessSubmit() {
  if (!siteAccessEmailInput || !siteAccessPasswordInput) return false;
  if (!supabaseClient) {
    setSiteAccessFeedback('Website access is unavailable right now. Please try again later.');
    return false;
  }

  setSiteAccessFeedback('');
  siteAccessEmailInput.removeAttribute('aria-invalid');
  siteAccessPasswordInput.removeAttribute('aria-invalid');

  const emailValue = siteAccessEmailInput.value.trim();
  const passwordValue = siteAccessPasswordInput.value.trim().toUpperCase();

  if (!emailValue || !emailValue.includes('@')) {
    setSiteAccessFeedback('Please enter a valid email address to continue.');
    siteAccessEmailInput.setAttribute('aria-invalid', 'true');
    siteAccessEmailInput.focus();
    return false;
  }

  if (!passwordValue || passwordValue !== RSVP_PASSWORD) {
    setSiteAccessFeedback('Please enter the website password to continue.');
    siteAccessPasswordInput.setAttribute('aria-invalid', 'true');
    siteAccessPasswordInput.focus();
    return false;
  }

  setSiteAccessFeedback('Checking your RSVP...');
  const exists = await doesGuestExist(emailValue);
  if (!exists) {
    setSiteAccessFeedback('We could not find an RSVP for that email address.');
    siteAccessEmailInput.setAttribute('aria-invalid', 'true');
    siteAccessEmailInput.focus();
    return false;
  }

  localStorage.setItem(EMAIL_STORAGE_KEY, normalizeEmailForStorage(emailValue));
  setRsvpAccessEmail(emailValue);
  setSiteAccessVisibility(false);
  setSiteAccessFeedback('');
  return true;
}

rsvpAccessEmailInput?.addEventListener('input', () => {
  rsvpAccessEmailInput.removeAttribute('aria-invalid');
  setRsvpAccessFeedback('');
});

siteAccessEmailInput?.addEventListener('input', () => {
  siteAccessEmailInput.removeAttribute('aria-invalid');
  setSiteAccessFeedback('');
});

siteAccessPasswordInput?.addEventListener('input', () => {
  siteAccessPasswordInput.removeAttribute('aria-invalid');
  setSiteAccessFeedback('');
});

async function initAuth() {
  resetReturningRsvpRequest();
  resolveInviteToken();
  rsvpState.storedEmail = localStorage.getItem(EMAIL_STORAGE_KEY) || '';
  const allowDirectInvite = Boolean(rsvpState.inviteTypeOverride);
  const shouldAutoOpenInvite = Boolean(rsvpState.inviteTypeFromUrl);
  const storedAccessEmail = getStoredRsvpAccessEmail();

  if (rsvpAccessEmailInput && rsvpState.storedEmail) {
    rsvpAccessEmailInput.value = rsvpState.storedEmail;
  }

  if (!supabaseClient) {
    if (rsvpState.inviteTypeOverride) {
      applyInviteTypeOverride(rsvpState.inviteTypeOverride, rsvpState.storedEmail);
    } else {
      applyInviteDetailsToProfile(null, rsvpState.storedEmail);
    }
    if (rsvpState.hasRequestedReturning) {
      await applyRsvpCompletionDismissal();
    }
    return;
  }

  if (rsvpState.inviteToken) {
    const invite = await fetchInviteDetails(rsvpState.inviteToken);
    if (invite) {
      applyInviteDetailsToProfile(invite, rsvpState.storedEmail);
    } else if (!applyInviteTypeOverride(rsvpState.inviteTypeOverride, rsvpState.storedEmail)) {
      applyInviteDetailsToProfile(null, rsvpState.storedEmail);
      setRsvpAccessFeedback(
        'This invite link looks invalid or has expired. Please contact us for a fresh link.'
      );
    }
  } else if (!applyInviteTypeOverride(rsvpState.inviteTypeOverride, rsvpState.storedEmail)) {
    applyInviteDetailsToProfile(null, rsvpState.storedEmail);
  }

  if (storedAccessEmail && rsvpState.hasRequestedReturning) {
    await setAuthEmail(storedAccessEmail);
    const guestRows = await loadGuestRowsByEmail(storedAccessEmail);
    populateRsvpFromGuests(guestRows, storedAccessEmail);
  } else if (allowDirectInvite) {
    applyInviteDetailsToProfile(rsvpState.inviteDetails, rsvpState.storedEmail);
    if (shouldAutoOpenInvite) {
      openModal();
    }
  } else {
    applyInviteDetailsToProfile(rsvpState.inviteDetails, rsvpState.storedEmail);
    if (
      rsvpState.hasRequestedReturning &&
      rsvpState.storedEmail &&
      (await fetchRsvpCompletionStatus(rsvpState.storedEmail))
    ) {
      const guestRows = await loadGuestRowsByEmail(rsvpState.storedEmail);
      populateRsvpFromGuests(guestRows, rsvpState.storedEmail);
    }
  }

  if (rsvpState.hasRequestedReturning) {
    await applyRsvpCompletionDismissal();
  }
}

enforceSiteGate().then(shouldInit => {
  if (shouldInit && isRsvpRoute) {
    initAuth();
  }
});

async function handleReturningRsvpRequest() {
  const activeEmail = getActiveRsvpEmail();
  const canReturn = await refreshRsvpCompletionGate(activeEmail, { showFeedback: true });
  if (!canReturn) {
    return;
  }
  rsvpState.hasRequestedReturning = true;
  setReturningRsvpState(true);
  if (rsvpFeedback) {
    rsvpFeedback.textContent = '';
  }
}

rsvpAccessLink?.addEventListener('click', event => {
  event.preventDefault();
  void handleReturningRsvpRequest();
});

siteAccessForm?.addEventListener('submit', event => {
  event.preventDefault();
  void handleSiteAccessSubmit();
});

function setupGuideCarousel() {
  const carousel = document.querySelector('[data-guide-carousel]');
  if (!carousel || carousel.dataset.carouselInitialised === 'true') {
    return;
  }

  const track = carousel.querySelector('[data-carousel-track]');
  const prevButton = carousel.querySelector('[data-carousel-prev]');
  const nextButton = carousel.querySelector('[data-carousel-next]');
  const dotsContainer = carousel.querySelector('[data-carousel-dots]');
  const carouselLabel = carousel.dataset.carouselLabel || 'carousel';
  const guideIntro = document.querySelector('[data-guide-intro]');
  const tabList = document.querySelector('[data-guide-tabs]');
  const guidePanel = document.querySelector('[data-guide-panel]');
  const tabs = tabList ? Array.from(tabList.querySelectorAll('[data-guide-tab]')) : [];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!track) {
    return;
  }

  const originalSlides = Array.from(track.children).filter(child => child instanceof HTMLElement);
  if (originalSlides.length === 0) {
    return;
  }

  carousel.setAttribute('role', carousel.getAttribute('role') || 'region');
  carousel.dataset.carouselInitialised = 'true';
  carousel.setAttribute('tabindex', '0');

  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    dotsContainer.setAttribute('role', 'tablist');
  }

  let slides = [];
  let currentIndex = 0;
  let slideStride = 1;
  let slidesPerView = 1;
  let dots = [];
  let isDragging = false;
  let dragStartX = 0;
  let dragStartTranslate = 0;
  let currentTranslate = 0;
  let activePointerId = null;

  const getSlidesPerView = () => (window.matchMedia('(min-width: 768px)').matches ? 3 : 1);
  const isInteractiveElement = target => target instanceof Element && target.closest('a, button');

  const calculateStride = () => {
    const first = slides[0];
    const second = slides[1];
    if (!first) {
      slideStride = 1;
      return slideStride;
    }
    const firstRect = first.getBoundingClientRect();
    const stride = second ? second.offsetLeft - first.offsetLeft : firstRect.width;
    slideStride = stride || firstRect.width || 1;
    return slideStride;
  };

  const buildDots = () => {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    dots = [];
    originalSlides.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', `Go to ${carouselLabel} slide ${index + 1} of ${originalSlides.length}`);
      dot.setAttribute('role', 'tab');
      dot.addEventListener('click', () => moveTo(slidesPerView + index));
      dotsContainer.appendChild(dot);
      dots.push(dot);
    });
  };

  const updateDots = index => {
    dots.forEach((dot, dotIndex) => {
      dot.setAttribute('aria-current', dotIndex === index ? 'true' : 'false');
    });
  };

  const scrollTabIntoView = tab => {
    if (!tabList || !tab) return;
    const containerRect = tabList.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    const inset = 16;
    let targetScroll = tabList.scrollLeft;

    if (tabRect.left < containerRect.left + inset) {
      targetScroll -= containerRect.left + inset - tabRect.left;
    } else if (tabRect.right > containerRect.right - inset) {
      targetScroll += tabRect.right - (containerRect.right - inset);
    } else {
      return;
    }

    tabList.scrollTo({
      left: targetScroll,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  const setActiveCategory = (category, activeIndex) => {
    if (!category) return;
    let activeTab = null;
    tabs.forEach(tab => {
      const isActive = tab.dataset.guideCategory === category;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
      tab.setAttribute('tabindex', isActive ? '0' : '-1');
      if (isActive && guidePanel && tab.id) {
        guidePanel.setAttribute('aria-labelledby', tab.id);
      }
      if (isActive) {
        activeTab = tab;
      }
    });

    if (activeTab) {
      scrollTabIntoView(activeTab);
    }

    if (guideIntro && GUIDE_CATEGORY_INTROS[category]) {
      guideIntro.textContent = GUIDE_CATEGORY_INTROS[category];
    }

    if (typeof activeIndex === 'number') {
      updateDots(activeIndex);
    }
  };

  const updateActiveFromTranslate = () => {
    const stride = slideStride || calculateStride();
    const rawIndex = Math.floor((currentTranslate + stride * 0.5) / stride);
    const total = originalSlides.length;
    const normalized = ((rawIndex - slidesPerView) % total + total) % total;
    const activeSlide = originalSlides[normalized];
    const category = activeSlide?.dataset.guideCategory;
    setActiveCategory(category, normalized);
  };

  const applyTranslate = animate => {
    calculateStride();
    currentTranslate = currentIndex * slideStride;
    track.style.transition = animate ? 'transform 0.45s ease' : 'none';
    track.style.transform = `translateX(-${currentTranslate}px)`;
    updateActiveFromTranslate();
  };

  const normalizeIndex = () => {
    const total = originalSlides.length;
    if (currentIndex >= total + slidesPerView) {
      currentIndex = slidesPerView;
      applyTranslate(false);
    } else if (currentIndex < slidesPerView) {
      currentIndex = total + slidesPerView - 1;
      applyTranslate(false);
    }
  };

  function moveTo(index) {
    currentIndex = index;
    applyTranslate(true);
  }

  const buildSlides = () => {
    slidesPerView = getSlidesPerView();
    track.innerHTML = '';
    const headClones = originalSlides.slice(-slidesPerView).map(slide => slide.cloneNode(true));
    const tailClones = originalSlides.slice(0, slidesPerView).map(slide => slide.cloneNode(true));

    headClones.forEach(clone => {
      clone.setAttribute('data-carousel-clone', 'true');
      track.appendChild(clone);
    });
    originalSlides.forEach(slide => {
      track.appendChild(slide);
    });
    tailClones.forEach(clone => {
      clone.setAttribute('data-carousel-clone', 'true');
      track.appendChild(clone);
    });

    slides = Array.from(track.children).filter(child => child instanceof HTMLElement);
    slides.forEach((slide, index) => {
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      const labelIndex = ((index - slidesPerView + originalSlides.length) % originalSlides.length) + 1;
      slide.setAttribute('aria-label', `${labelIndex} of ${originalSlides.length}`);
    });

    currentIndex = slidesPerView;
    buildDots();
    applyTranslate(false);
  };

  const startDrag = (x, pointerId = null) => {
    isDragging = true;
    dragStartX = x;
    dragStartTranslate = currentTranslate;
    activePointerId = pointerId;
    track.style.transition = 'none';
  };

  const handleDrag = (event, x) => {
    if (!isDragging) return;
    const delta = x - dragStartX;
    currentTranslate = dragStartTranslate - delta;
    track.style.transform = `translateX(-${currentTranslate}px)`;
    updateActiveFromTranslate();
    if (event.cancelable) {
      event.preventDefault();
    }
  };

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    activePointerId = null;
    const targetIndex = Math.round(currentTranslate / slideStride);
    currentIndex = targetIndex;
    applyTranslate(true);
  };

  if (window.PointerEvent) {
    track.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (isInteractiveElement(event.target)) return;
      startDrag(event.clientX, event.pointerId);
      track.setPointerCapture(event.pointerId);
    });

    track.addEventListener(
      'pointermove',
      event => {
        if (!isDragging || (activePointerId !== null && activePointerId !== event.pointerId)) return;
        handleDrag(event, event.clientX);
      },
      { passive: false }
    );

    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
  } else {
    track.addEventListener('touchstart', event => {
      if (isInteractiveElement(event.target)) return;
      const touch = event.touches?.[0];
      if (!touch) return;
      startDrag(touch.clientX);
    });

    track.addEventListener(
      'touchmove',
      event => {
        const touch = event.touches?.[0];
        if (!touch) return;
        handleDrag(event, touch.clientX);
      },
      { passive: false }
    );

    track.addEventListener('touchend', endDrag);
    track.addEventListener('touchcancel', endDrag);
  }

  track.addEventListener('transitionend', normalizeIndex);
  prevButton?.addEventListener('click', () => moveTo(currentIndex - 1));
  nextButton?.addEventListener('click', () => moveTo(currentIndex + 1));

  carousel.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveTo(currentIndex - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveTo(currentIndex + 1);
    }
  });

  if (tabList) {
    const setCategoryByTab = tab => {
      const category = tab.dataset.guideCategory;
      if (!category) return;
      const targetIndex = originalSlides.findIndex(
        slide => slide.dataset.guideCategory === category
      );
      if (targetIndex >= 0) {
        moveTo(slidesPerView + targetIndex);
      }
    };

    tabs.forEach(tab => {
      tab.addEventListener('click', () => setCategoryByTab(tab));
    });

    tabList.addEventListener('keydown', event => {
      const currentIndex = tabs.findIndex(tab => tab === document.activeElement);
      if (currentIndex === -1) return;

      let nextIndex = null;
      if (event.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (event.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = tabs.length - 1;
      }

      if (nextIndex === null) return;
      event.preventDefault();
      tabs[nextIndex].focus();
      setCategoryByTab(tabs[nextIndex]);
    });
  }

  if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(() => {
      buildSlides();
    });
    resizeObserver.observe(track);
  } else {
    window.addEventListener('resize', buildSlides);
  }

  buildSlides();
  setActiveCategory(originalSlides[0]?.dataset.guideCategory, 0);
}

setupGuideCarousel();

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

const sharedHeaderPromise = loadSharedHeader();
sharedHeaderPromise.finally(() => {
  setupNavigation();
});

let navigationInitialized = false;

function setupNavigation() {
  refreshNavigationElements();
  if (navigationInitialized) return;
  if (navToggle) {
    navToggle.addEventListener('click', () => toggleNavigation());
  }

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (siteNav?.classList.contains('open')) {
        toggleNavigation(false);
      }
    });
  });

  navigationInitialized = true;
  updateHeaderOffset();
  updateRsvpNavigationVisibility();
}

function toggleNavigation(force) {
  if (!siteNav || !navToggle) return;
  const isOpen =
    typeof force === 'boolean' ? force : !siteNav.classList.contains('open');
  siteNav.classList.toggle('open', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('nav-open', isOpen);
  requestAnimationFrame(updateHeaderOffset);
}

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

function updateRsvpNavigationVisibility() {
  if (!header) return;
  const shouldHideNav = isRsvpRoute && !rsvpState.hasCompletedRsvp;
  document.body.classList.toggle('rsvp-nav-hidden', shouldHideNav);
  if (shouldHideNav) {
    toggleNavigation(false);
  }
  updateHeaderOffset();
}

window.addEventListener('resize', updateHeaderOffset);
window.addEventListener('load', updateHeaderOffset);
updateHeaderOffset();

setupGuestSectionToggles();

function dismissRsvpSection() {
  setRsvpSectionVisibility(false);
  const target = document.querySelector('#schedule') || document.querySelector('#home');
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function getInitialRsvpStep() {
  if (!rsvpState.hasRequestedReturning) {
    return 1;
  }
  const email = getActiveRsvpEmail();
  const completed = await fetchRsvpCompletionStatus(email);
  return completed ? 2 : 1;
}

async function openRsvpSection() {
  if (!rsvpSection) return;
  setRsvpSectionVisibility(true);
  rsvpSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (rsvpFeedback) {
    rsvpFeedback.textContent = '';
  }

  if (!rsvpState.guestProfile) {
    const fallbackEmail =
      rsvpEmailField?.value.trim() || rsvpAccessEmailInput?.value.trim() || rsvpState.storedEmail || '';
    setGuestProfile(createGuestProfile(fallbackEmail));
  } else {
    updateGuestUi(rsvpState.guestProfile);
  }

  const initialStep = await getInitialRsvpStep();
  setStep(initialStep);
  resetGuestSectionState();
}

rsvpTriggers.forEach(trigger => {
  trigger.addEventListener('click', event => {
    if (trigger instanceof HTMLAnchorElement) {
      event.preventDefault();
    }
    void openRsvpSection();
  });
});

document.addEventListener('DOMContentLoaded', () => {
  if (!isRsvpRoute && !rsvpSection) return;
  setRsvpSectionVisibility(true);
  resetReturningRsvpRequest();
  setStep(1);
  void openRsvpSection();
});

function validateStep(step, formData, profile) {
  const errors = [];
  const activeProfile =
    profile || createGuestProfile(rsvpEmailField?.value.trim() || rsvpState.storedEmail || '');
  const primaryName = activeProfile.primary?.name || 'Guest 1';
  const plusOneName = activeProfile.plusOne?.name || 'Guest 2';
  const hasPlusOne = isPlusOneActive(activeProfile);

  if (step === 1) {
    const passwordValue = formData.get('rsvp-password')?.toString().trim().toUpperCase() || '';
    if (!passwordValue) {
      errors.push('Please enter the RSVP password from your invitation.');
    } else if (passwordValue !== RSVP_PASSWORD) {
      errors.push('The RSVP password is incorrect. Please check your invitation.');
    }

    if (rsvpState.isReturningRsvp && rsvpState.hasRequestedReturning) {
      const returningEmail = formData.get('rsvp-access-email')?.toString().trim() || '';
      if (!returningEmail || !returningEmail.includes('@')) {
        errors.push('Please enter a valid email address to continue.');
      }
    }
  }

  const validatePlusOne = () => {
    if (!formData.get('plusone-first-name') || !formData.get('plusone-last-name')) {
      errors.push(`Please enter ${plusOneName}'s first name and surname.`);
    }

    if (!formData.get('plusone-attendance')) {
      errors.push(`Please let us know if ${plusOneName} can make it.`);
    }
  };

  if (step === 2) {
    if (!formData.get('primary-first-name') || !formData.get('primary-last-name')) {
      errors.push(`Please enter ${primaryName}'s first name and surname.`);
    }

    if (!formData.get('primary-attendance')) {
      errors.push(`Please let us know if ${primaryName} can make it.`);
    }
  }

  if (step === 3 && hasPlusOne) {
    validatePlusOne();
  }

  if (step === 4) {
    const emailValue = formData.get('guest-email')?.toString().trim() || '';
    if (!emailValue || !emailValue.includes('@')) {
      errors.push('Please enter a valid email address so we can keep in touch.');
    }

    if (!formData.get('address-line-1')) {
      errors.push('Please enter the primary guest address line 1.');
    }

    if (!formData.get('address-city')) {
      errors.push('Please enter the primary guest city.');
    }

    if (!formData.get('address-postcode')) {
      errors.push('Please enter the primary guest postcode.');
    }
  }

  return errors;
}

function validateForm(formData, profile) {
  const stepOneErrors = validateStep(1, formData, profile);
  const stepTwoErrors = validateStep(2, formData, profile);
  const stepThreeErrors = validateStep(3, formData, profile);
  const stepFourErrors = validateStep(4, formData, profile);
  return [...stepOneErrors, ...stepTwoErrors, ...stepThreeErrors, ...stepFourErrors];
}

function normalizeAttendance(value) {
  const trimmed = value?.toString().trim().toLowerCase();
  if (trimmed === 'yes' || trimmed === 'y') return 'yes';
  if (trimmed === 'no' || trimmed === 'n') return 'no';
  return '';
}

function isRsvpPasswordValid(value) {
  return value?.toString().trim().toUpperCase() === RSVP_PASSWORD;
}

function updatePasswordGate() {
  if (!stepNextButton) return;
  if (rsvpState.currentStep !== 1) {
    stepNextButton.disabled = false;
    return;
  }
  const passwordValue = rsvpPasswordInput?.value || '';
  const isValid = isRsvpPasswordValid(passwordValue);
  stepNextButton.disabled = !isValid;
  if (rsvpPasswordInput) {
    const shouldFlag = passwordValue.trim() !== '' && !isValid;
    rsvpPasswordInput.setAttribute('aria-invalid', String(shouldFlag));
  }
}

rsvpPasswordInput?.addEventListener('input', () => {
  if (rsvpFeedback) {
    rsvpFeedback.textContent = '';
  }
  updatePasswordGate();
});

async function handleStepAdvance() {
  if (!rsvpForm) return;
  const formData = new FormData(rsvpForm);
  const errors = validateStep(rsvpState.currentStep, formData, rsvpState.guestProfile);
  if (errors.length > 0) {
    if (rsvpFeedback) {
      rsvpFeedback.textContent = errors.join(' ');
    }
    return;
  }
  if (rsvpState.currentStep === 1 && rsvpState.isReturningRsvp) {
    const wasLoaded = await handleRsvpAccessSubmit();
    if (!wasLoaded) {
      return;
    }
  }
  if (rsvpFeedback) {
    rsvpFeedback.textContent = '';
  }
  setStep(getRsvpStepByOffset(rsvpState.currentStep, 1));
}

function handleStepBack() {
  if (rsvpFeedback) {
    rsvpFeedback.textContent = '';
  }
  setStep(getRsvpStepByOffset(rsvpState.currentStep, -1));
}

stepNextButton?.addEventListener('click', () => {
  void handleStepAdvance();
});

stepPrevButton?.addEventListener('click', () => {
  handleStepBack();
});

async function submitRsvp(event) {
  event.preventDefault();
  if (event?.stopImmediatePropagation) event.stopImmediatePropagation();
  if (event?.stopPropagation) event.stopPropagation();
  if (rsvpFeedback) {
    rsvpFeedback.textContent = '';
  }

  if (!rsvpForm) return;

  const formData = new FormData(rsvpForm);
  const profile =
    rsvpState.guestProfile || createGuestProfile(formData.get('guest-email')?.trim() || '');
  const errors = validateForm(formData, profile);

  if (errors.length > 0) {
    if (rsvpFeedback) {
      rsvpFeedback.textContent = errors.join(' ');
    }
    return;
  }

  // We submit via Edge Functions (no browser-to-DB writes).

  const token = (formData.get('invite-token') || rsvpState.inviteToken || '').trim();
  if (token && (!rsvpState.inviteDetails || rsvpState.inviteDetails.token !== token)) {
    await fetchInviteDetails(token);
  }

  if (!rsvpState.inviteDetails && rsvpState.inviteTypeOverride) {
    applyInviteTypeOverride(rsvpState.inviteTypeOverride, profile.email);
  }

  if (!rsvpState.inviteDetails && !rsvpState.invitationGroupId) {
    if (rsvpFeedback) {
      rsvpFeedback.textContent =
        rsvpState.inviteLookupFailed
          ? 'This invite link looks invalid or expired. Please contact us for a fresh link.'
          : 'We could not detect your invite details. Please use your invite link or contact us for help.';
    }
    return;
  }

  const email = (formData.get('guest-email') || profile.email || rsvpState.authenticatedEmail || '').trim();
  if (rsvpState.authenticatedEmail && email && rsvpState.authenticatedEmail !== email) {
    if (rsvpFeedback) {
      rsvpFeedback.textContent =
        'Please use the same email you signed in with so we can keep your RSVP linked correctly.';
    }
    return;
  }
  const now = new Date().toISOString();
  const inviteType =
    rsvpState.inviteDetails?.invite_type || (isPlusOneActive(profile) ? 'plusone' : 'single');
  const includesPlusOne = inviteType === 'plusone';
  const primaryAttendance = normalizeAttendance(formData.get('primary-attendance'));
  const plusOneAttendance = normalizeAttendance(formData.get('plusone-attendance'));
  let groupId = rsvpState.inviteDetails?.id || rsvpState.invitationGroupId;
  if (!groupId) {
    groupId = crypto.randomUUID();
    rsvpState.invitationGroupId = groupId;
  }

  const guestRows = [
    {
      invitation_group_id: groupId,
      role: 'primary',
      first_name: formData.get('primary-first-name')?.trim() ?? '',
      last_name: formData.get('primary-last-name')?.trim() ?? '',
      email,
      attendance: primaryAttendance,
      dietary: formData.get('primary-dietary')?.trim() ?? '',
      address_line_1: formData.get('address-line-1')?.trim() ?? '',
      address_line_2: formData.get('address-line-2')?.trim() ?? '',
      city: formData.get('address-city')?.trim() ?? '',
      postcode: formData.get('address-postcode')?.trim() ?? '',
      country: formData.get('address-country')?.trim() ?? '',
      updated_at: now,
    },
  ];

  if (includesPlusOne) {
    guestRows.push({
      invitation_group_id: groupId,
      role: 'plusone',
      first_name: formData.get('plusone-first-name')?.trim() ?? '',
      last_name: formData.get('plusone-last-name')?.trim() ?? '',
      email,
      attendance: plusOneAttendance,
      dietary: formData.get('plusone-dietary')?.trim() ?? '',
      address_line_1: formData.get('address-line-1')?.trim() ?? '',
      address_line_2: formData.get('address-line-2')?.trim() ?? '',
      city: formData.get('address-city')?.trim() ?? '',
      postcode: formData.get('address-postcode')?.trim() ?? '',
      country: formData.get('address-country')?.trim() ?? '',
      updated_at: now,
    });
  }

  try {
    if (rsvpFeedback) {
      rsvpFeedback.textContent = 'Submitting your RSVP...';
    }

    const primaryRow = guestRows.find(row => row.role === 'primary') || guestRows[0];
    const plusOneRow = guestRows.find(row => row.role === 'plusone') || null;

    const result = await callRsvpFunction(RSVP_SUBMIT_FUNCTION_URL, {
      email: primaryRow.email,
      sitePassword: RSVP_PASSWORD,
      inviteToken: rsvpState.inviteToken || '',
      first_name: primaryRow.first_name,
      last_name: primaryRow.last_name,
      address_line_1: primaryRow.address_line_1,
      address_line_2: primaryRow.address_line_2,
      city: primaryRow.city,
      postcode: primaryRow.postcode,
      country: primaryRow.country,
      rsvp: {
        attending: primaryRow.attendance,
        dietary_requirements: primaryRow.dietary,
        plusone: plusOneRow
          ? {
              first_name: plusOneRow.first_name,
              last_name: plusOneRow.last_name,
              attending: plusOneRow.attendance,
              dietary_requirements: plusOneRow.dietary,
            }
          : null,
      },
    });

    // Persist completion + allow returning access.
    const normalizedEmail = normalizeEmailForStorage(primaryRow.email);
    setRsvpCompleted(normalizedEmail);
    setRsvpAccessEmail(normalizedEmail);

    // Mark as authenticated for this session/UI.
    await setAuthEmail(normalizedEmail);

    // Refresh UI from server response.
    if (Array.isArray(result.guests)) {
      populateRsvpFromGuests(result.guests, normalizedEmail);
    }

    // Ensure UI knows we've completed (nav + "Edit RSVP" behave).
    applyRsvpCompletionGateState(true);

    // Clear any returning-mode flags so we don't bounce to Step 1.
    rsvpState.hasRequestedReturning = false;
    setReturningRsvpState(false);

    if (rsvpFeedback) {
      rsvpFeedback.textContent = 'Thanks! Your RSVP has been saved.';
    }

    // Move to the thank-you step (with the Enter button).
    setStep(5);

    // Keep RSVP section visible and update nav state.
    setRsvpSectionVisibility(true);
    updateRsvpNavigationVisibility();

    return;
  } catch (error) {
    if (rsvpFeedback) {
      rsvpFeedback.textContent = error?.message || 'We could not save your RSVP right now. Please try again.';
    }
    return;
  }
}