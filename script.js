const SUPABASE_URL = 'https://ipxbndockmhkfuwjyevi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VatpUfqGmaOnMBMvbEr8sQ_mmhphftT';
const SITE_BASE_URL = 'https://edward-stapleton.github.io/wedding/';
const RSVP_ROUTE_PATH = 'rsvp/';
const RSVP_ROUTE_URL = new URL(RSVP_ROUTE_PATH, SITE_BASE_URL).toString();
const isRsvpRoute = window.location.pathname.includes(`/${RSVP_ROUTE_PATH}`);
const EMAIL_STORAGE_KEY = 'weddingGuestEmail';
const INVITE_TOKEN_STORAGE_KEY = 'weddingInviteToken';
const INVITE_TYPE_STORAGE_KEY = 'weddingInviteType';
const RSVP_COMPLETED_KEY_PREFIX = 'weddingRsvpCompleted:';
const RSVP_ACCESS_STORAGE_KEY = 'weddingRsvpAccessEmail';
const RSVP_ENDPOINT = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
const MAPBOX_TOKEN =
  'pk.eyJ1IjoiZWR3YXJkc3RhcGxldG9uIiwiYSI6ImNtaGwyMWE2YzBjbzcyanNjYms4ZTduMWoifQ.yo7R9MXXEfna7rzmFk2rQg';
const MAPBOX_DEFAULT_STYLE = 'mapbox://styles/mapbox/standard?optimize=true';
const mapElement = document.getElementById('map');
const MAPBOX_STYLE = mapElement?.dataset.style?.trim() || MAPBOX_DEFAULT_STYLE;
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

const rsvpAccessEmailInput = document.getElementById('rsvp-access-email');
const rsvpAccessLink = document.querySelector('.rsvp-access-link');
const rsvpAccessFeedback = document.getElementById('rsvp-access-feedback');
const returningEmailField = document.querySelector('[data-returning-email]');
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
const stepSections = document.querySelectorAll('[data-rsvp-step]');
const stepPrevButton = document.querySelector('[data-step-prev]');
const stepNextButton = document.querySelector('[data-step-next]');
const stepSubmitButton = document.querySelector('[data-step-submit]');
const mapContainer = document.querySelector('[data-map-container]');
const siteNav = document.querySelector('.site-nav');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelectorAll('.nav-links a');
const header = document.querySelector('.site-header');
const mobileModalMedia = window.matchMedia('(max-width: 600px)');
const mapReplayButton = document.querySelector('[data-map-replay]');
const thankYouMessageEl = document.getElementById('rsvp-thank-you-message');
const thankYouPersonalEl = document.getElementById('rsvp-thank-you-personal');
const stepOneTitleDefault = stepOneTitle?.textContent?.trim() || 'Welcome';
const stepOneIntroDefault =
  stepOneIntro?.textContent?.trim() ||
  'Saturday 22 August 2026 · Oxford. Please enter the password from your invitation to begin your RSVP.';

let mapLoaded = false;
let mapInstance;
let routeBoundsCache = null;
let initialCameraCache = null;
let guestProfile = null;
let inviteToken = null;
let inviteDetails = null;
let inviteTypeOverride = '';
let inviteTypeFromUrl = '';
let authenticatedEmail = '';
let currentStep = 1;
let invitationGroupId = '';
let inviteLookupFailed = false;
let storedEmail = '';
let hasAppliedCompletionDismissal = false;
let isReturningRsvp = false;
const rsvpCompletionCache = new Map();

const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ATTENDANCE_PROMPT = 'Able to come?';
const DIETARY_LABEL_TEXT = 'Any dietary requirements?';
const DIETARY_PLACEHOLDER = 'e.g. vegetarian, vegan, gluten-intolerant, allergies';
const INVITE_TYPE_QUERY_KEY = 'invite';
const RSVP_PASSWORD = 'STARFORD';

function createGuestProfile(email) {
  return {
    email,
    primary: { name: 'Guest 1', firstName: '', lastName: '' },
    plusOne: { name: 'Guest 2', firstName: '', lastName: '' },
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

  if (!supabaseClient) {
    const cachedCompletion = isRsvpCompleted(normalizedEmail);
    rsvpCompletionCache.set(normalizedEmail, cachedCompletion);
    return cachedCompletion;
  }

  const { data, error } = await supabaseClient
    .from('guests')
    .select('attendance')
    .eq('email', normalizedEmail);

  if (error) {
    const cachedCompletion = isRsvpCompleted(normalizedEmail);
    rsvpCompletionCache.set(normalizedEmail, cachedCompletion);
    return cachedCompletion;
  }

  const completed =
    data?.some(guest => typeof guest.attendance === 'string' && guest.attendance.trim() !== '') ?? false;

  if (completed) {
    setRsvpCompleted(normalizedEmail);
  } else {
    const key = getRsvpCompletionKey(normalizedEmail);
    if (key) {
      localStorage.removeItem(key);
    }
  }

  rsvpCompletionCache.set(normalizedEmail, completed);
  return completed;
}

function setRsvpAccessEmail(email) {
  const normalized = normalizeEmailForStorage(email);
  if (!normalized) return;
  localStorage.setItem(RSVP_ACCESS_STORAGE_KEY, normalized);
}

function getStoredRsvpAccessEmail() {
  return localStorage.getItem(RSVP_ACCESS_STORAGE_KEY) || '';
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

function applyInviteDetailsToProfile(invite, emailFallback) {
  if (!invite) {
    setGuestProfile(createGuestProfile(emailFallback));
    inviteDetails = null;
    return;
  }

  const primaryFirst = invite.primary_first_name || '';
  const primaryLast = invite.primary_last_name || '';
  const primaryName = formatGuestName(primaryFirst, primaryLast, 'Guest 1');
  const hasPlusOne = invite.invite_type === 'plusone';

  inviteDetails = invite;
  invitationGroupId = invite.id || invitationGroupId;
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
  if (!supabaseClient || !token) {
    inviteDetails = null;
    return null;
  }

  const { data, error } = await supabaseClient
    .from('invites')
    .select('id, token, invite_type, primary_email, primary_first_name, primary_last_name')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) {
    inviteDetails = null;
    inviteLookupFailed = true;
    return null;
  }

  inviteDetails = data;
  inviteLookupFailed = false;
  return data;
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
  const hasPlusOne = isPlusOneActive(guestProfile) || inviteDetails?.invite_type === 'plusone';
  return hasPlusOne ? [1, 2, 3, 4, 5] : [1, 2, 4, 5];
}

function getNearestRsvpStep(step) {
  const sequence = getRsvpStepSequence();
  if (sequence.includes(step)) {
    return step;
  }
  const priorStep = sequence.filter(sequenceStep => sequenceStep <= step).pop();
  return priorStep ?? sequence[0];
}

function getRsvpStepByOffset(step, offset) {
  const sequence = getRsvpStepSequence();
  const currentIndex = sequence.indexOf(step);
  if (currentIndex === -1) {
    return sequence[0];
  }
  const nextIndex = Math.min(Math.max(currentIndex + offset, 0), sequence.length - 1);
  return sequence[nextIndex];
}

function updateStepIndicators(activeStep) {
  stepIndicators.forEach(indicator => {
    const indicatorStep = Number(indicator.dataset.stepIndicator);
    indicator.classList.toggle('is-active', indicatorStep === activeStep);
    indicator.classList.toggle('is-complete', indicatorStep < activeStep);
  });
}

function getStepOneButtonLabel() {
  return isReturningRsvp ? 'Enter' : 'RSVP';
}

function setReturningRsvpState(shouldReturn) {
  isReturningRsvp = shouldReturn;
  if (returningEmailField) {
    returningEmailField.hidden = !shouldReturn;
  }
  if (rsvpAccessEmailInput) {
    rsvpAccessEmailInput.required = shouldReturn;
    if (!shouldReturn) {
      rsvpAccessEmailInput.removeAttribute('aria-invalid');
    }
  }

  if (stepOneTitle) {
    stepOneTitle.textContent = shouldReturn ? 'Welcome back' : stepOneTitleDefault;
  }

  if (stepOneIntro) {
    stepOneIntro.textContent = shouldReturn
      ? 'Enter the email address you used before along with the invitation password to reopen your RSVP.'
      : stepOneIntroDefault;
  }

  if (currentStep === 1 && stepNextButton) {
    stepNextButton.textContent = getStepOneButtonLabel();
  }
}

function showStep(step) {
  const resolvedStep = getNearestRsvpStep(step);
  currentStep = resolvedStep;
  stepSections.forEach(section => {
    const sectionStep = Number(section.dataset.rsvpStep);
    section.hidden = sectionStep !== resolvedStep;
  });

  updateStepIndicators(resolvedStep);

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
  const plusOneIndicator = Array.from(stepIndicators).find(
    indicator => indicator.dataset.stepIndicator === '3'
  );

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

  if (plusOneIndicator) {
    plusOneIndicator.hidden = !hasPlusOne;
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

function setGuestProfile(profile) {
  guestProfile = profile;
  updateGuestUi(profile);
}

function isPlusOneActive(profile) {
  if (profile?.plusOne && profile.plusOne.name) {
    return true;
  }
  return Array.from(plusOneSections).some(section => !section.hidden);
}

function normalizeInviteType(value) {
  const normalized = value?.toString().trim().toLowerCase();
  if (normalized === 'single' || normalized === 'solo') return 'single';
  if (normalized === 'plusone' || normalized === 'plus-one') return 'plusone';
  return '';
}

function resolveInviteToken() {
  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get('i');
  inviteTypeFromUrl = normalizeInviteType(params.get(INVITE_TYPE_QUERY_KEY));
  const storedToken = localStorage.getItem(INVITE_TOKEN_STORAGE_KEY);
  const activeToken = tokenFromUrl || storedToken || '';
  const storedInviteType = localStorage.getItem(INVITE_TYPE_STORAGE_KEY);

  if (tokenFromUrl) {
    localStorage.setItem(INVITE_TOKEN_STORAGE_KEY, tokenFromUrl);
  }
  if (inviteTypeFromUrl) {
    localStorage.setItem(INVITE_TYPE_STORAGE_KEY, inviteTypeFromUrl);
  }

  inviteToken = activeToken;
  inviteTypeOverride = inviteTypeFromUrl || storedInviteType || '';

  if (inviteTokenField) {
    inviteTokenField.value = inviteToken;
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

  invitationGroupId = primary?.invitation_group_id || invitationGroupId;

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

  inviteDetails =
    inviteDetails ||
    (invitationGroupId
      ? {
          id: invitationGroupId,
          invite_type: plusOne ? 'plusone' : 'single',
          primary_email: email || primary?.email || '',
          primary_first_name: primary?.first_name || '',
          primary_last_name: primary?.last_name || '',
        }
      : null);
}

async function loadGuestRowsByEmail(email) {
  if (!supabaseClient || !email) return [];
  const { data, error } = await supabaseClient
    .from('guests')
    .select(
      'invitation_group_id, role, first_name, last_name, email, attendance, dietary, address_line_1, address_line_2, city, postcode, country'
    )
    .eq('email', email);

  if (error) {
    if (rsvpFeedback) {
      rsvpFeedback.textContent = 'We could not load your saved RSVP yet. Please try again soon.';
    }
    return [];
  }

  return data || [];
}

function isGuestRsvpComplete(guestRows) {
  if (!guestRows.length) return false;
  return guestRows.some(guest => typeof guest.attendance === 'string' && guest.attendance.trim() !== '');
}

async function enforceRsvpGate() {
  if (isRsvpRoute) return true;
  const email = getStoredRsvpAccessEmail();
  if (!email) {
    window.location.href = RSVP_ROUTE_URL;
    return false;
  }

  const completed = await fetchRsvpCompletionStatus(email);
  if (!completed) {
    window.location.href = RSVP_ROUTE_URL;
    return false;
  }

  return true;
}

function getActiveRsvpEmail() {
  return (
    authenticatedEmail ||
    guestProfile?.email ||
    storedEmail ||
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
  if (hasAppliedCompletionDismissal) {
    await updateRsvpTriggerLabels();
    return;
  }
  const email = getActiveRsvpEmail();
  await updateRsvpTriggerLabels();
  const completed = await fetchRsvpCompletionStatus(email);
  if (completed) {
    setRsvpSectionVisibility(false);
  }
  hasAppliedCompletionDismissal = true;
}

async function setAuthEmail(email) {
  authenticatedEmail = email;
  if (email) {
    localStorage.setItem(EMAIL_STORAGE_KEY, email);
  }
  if (inviteDetails) {
    const updatedInvite = {
      ...inviteDetails,
      primary_email: email || inviteDetails.primary_email,
    };
    applyInviteDetailsToProfile(updatedInvite, email);
  } else {
    setGuestProfile(createGuestProfile(email));
  }
  await updateRsvpTriggerLabels();
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

rsvpAccessEmailInput?.addEventListener('input', () => {
  rsvpAccessEmailInput.removeAttribute('aria-invalid');
  setRsvpAccessFeedback('');
});

async function initAuth() {
  resolveInviteToken();
  storedEmail = localStorage.getItem(EMAIL_STORAGE_KEY) || '';
  const allowDirectInvite = Boolean(inviteTypeOverride);
  const shouldAutoOpenInvite = Boolean(inviteTypeFromUrl);
  const storedAccessEmail = getStoredRsvpAccessEmail();

  if (rsvpAccessEmailInput && storedEmail) {
    rsvpAccessEmailInput.value = storedEmail;
  }

  if (!supabaseClient) {
    if (inviteTypeOverride) {
      applyInviteTypeOverride(inviteTypeOverride, storedEmail);
    } else {
      applyInviteDetailsToProfile(null, storedEmail);
    }
    await applyRsvpCompletionDismissal();
    return;
  }

  if (inviteToken) {
    const invite = await fetchInviteDetails(inviteToken);
    if (invite) {
      applyInviteDetailsToProfile(invite, storedEmail);
    } else if (!applyInviteTypeOverride(inviteTypeOverride, storedEmail)) {
      applyInviteDetailsToProfile(null, storedEmail);
      setRsvpAccessFeedback(
        'This invite link looks invalid or has expired. Please contact us for a fresh link.'
      );
    }
  } else if (!applyInviteTypeOverride(inviteTypeOverride, storedEmail)) {
    applyInviteDetailsToProfile(null, storedEmail);
  }

  if (storedAccessEmail) {
    await setAuthEmail(storedAccessEmail);
    const guestRows = await loadGuestRowsByEmail(storedAccessEmail);
    populateRsvpFromGuests(guestRows, storedAccessEmail);
  } else if (allowDirectInvite) {
    applyInviteDetailsToProfile(inviteDetails, storedEmail);
    if (shouldAutoOpenInvite) {
      openModal();
    }
  } else {
    applyInviteDetailsToProfile(inviteDetails, storedEmail);
    if (storedEmail && (await fetchRsvpCompletionStatus(storedEmail))) {
      const guestRows = await loadGuestRowsByEmail(storedEmail);
      populateRsvpFromGuests(guestRows, storedEmail);
    }
  }

  await applyRsvpCompletionDismissal();
}

enforceRsvpGate().then(shouldInit => {
  if (shouldInit) {
    initAuth();
  }
});

rsvpAccessLink?.addEventListener('click', () => {
  setReturningRsvpState(!isReturningRsvp);
  if (rsvpFeedback) {
    rsvpFeedback.textContent = '';
  }
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

  const categoryIntros = {
    accommodation: 'Aside from Airbnb and Booking.com, here are some tips for accommodation:',
    coffee: "These are the places that we tend to pick up a flat white when we're in Oxford:",
    pubs:
      "There's a great mix of historic watering holes in central Oxford, with craft beer places further out of town:",
    restaurants:
      "If you're looking for a nice spot for a meal, consider these places:",
    sightseeing:
      "If you're out for a stroll or jog, try to swing past these places:",
  };

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

    if (guideIntro && categoryIntros[category]) {
      guideIntro.textContent = categoryIntros[category];
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
    if (siteNav?.classList.contains('open')) {
      toggleNavigation(false);
    }
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

setupGuestSectionToggles();

function dismissRsvpSection() {
  setRsvpSectionVisibility(false);
  const target = document.querySelector('#schedule') || document.querySelector('#home');
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function getInitialRsvpStep() {
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

  if (!guestProfile) {
    const fallbackEmail = rsvpEmailField?.value.trim() || rsvpAccessEmailInput?.value.trim() || storedEmail || '';
    setGuestProfile(createGuestProfile(fallbackEmail));
  } else {
    updateGuestUi(guestProfile);
  }

  const initialStep = await getInitialRsvpStep();
  showStep(initialStep);
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
  setReturningRsvpState(false);
  showStep(1);
  void openRsvpSection();
});

function validateStep(step, formData, profile) {
  const errors = [];
  const activeProfile = profile || createGuestProfile(rsvpEmailField?.value.trim() || storedEmail || '');
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

    if (isReturningRsvp) {
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

    if (hasPlusOne) {
      validatePlusOne();
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
  if (currentStep !== 1) {
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

stepNextButton?.addEventListener('click', async () => {
  if (!rsvpForm) return;
  const formData = new FormData(rsvpForm);
  const errors = validateStep(currentStep, formData, guestProfile);
  if (errors.length > 0) {
    if (rsvpFeedback) {
      rsvpFeedback.textContent = errors.join(' ');
    }
    return;
  }
  if (currentStep === 1 && isReturningRsvp) {
    const wasLoaded = await handleRsvpAccessSubmit();
    if (!wasLoaded) {
      return;
    }
  }
  if (rsvpFeedback) {
    rsvpFeedback.textContent = '';
  }
  showStep(getRsvpStepByOffset(currentStep, 1));
});

stepPrevButton?.addEventListener('click', () => {
  if (rsvpFeedback) {
    rsvpFeedback.textContent = '';
  }
  showStep(getRsvpStepByOffset(currentStep, -1));
});

rsvpPasswordInput?.addEventListener('input', () => {
  if (rsvpFeedback) {
    rsvpFeedback.textContent = '';
  }
  updatePasswordGate();
});

async function submitRsvp(event) {
  event.preventDefault();
  if (rsvpFeedback) {
    rsvpFeedback.textContent = '';
  }

  if (!rsvpForm) return;

  const formData = new FormData(rsvpForm);
  const profile = guestProfile || createGuestProfile(formData.get('guest-email')?.trim() || '');
  const errors = validateForm(formData, profile);

  if (errors.length > 0) {
    if (rsvpFeedback) {
      rsvpFeedback.textContent = errors.join(' ');
    }
    return;
  }

  if (!supabaseClient) {
    if (rsvpFeedback) {
      rsvpFeedback.textContent = 'We could not connect to the RSVP service. Please try again later.';
    }
    return;
  }

  const token = (formData.get('invite-token') || inviteToken || '').trim();
  if (token && (!inviteDetails || inviteDetails.token !== token)) {
    await fetchInviteDetails(token);
  }

  if (!inviteDetails && inviteTypeOverride) {
    applyInviteTypeOverride(inviteTypeOverride, profile.email);
  }

  if (!inviteDetails && !invitationGroupId) {
    if (rsvpFeedback) {
      rsvpFeedback.textContent =
        inviteLookupFailed
          ? 'This invite link looks invalid or expired. Please contact us for a fresh link.'
          : 'We could not detect your invite details. Please use your invite link or contact us for help.';
    }
    return;
  }

  const email = (formData.get('guest-email') || profile.email || authenticatedEmail || '').trim();
  if (authenticatedEmail && email && authenticatedEmail !== email) {
    if (rsvpFeedback) {
      rsvpFeedback.textContent =
        'Please use the same email you signed in with so we can keep your RSVP linked correctly.';
    }
    return;
  }
  const now = new Date().toISOString();
  const inviteType = inviteDetails?.invite_type || (isPlusOneActive(profile) ? 'plusone' : 'single');
  const includesPlusOne = inviteType === 'plusone';
  const primaryAttendance = normalizeAttendance(formData.get('primary-attendance'));
  const plusOneAttendance = normalizeAttendance(formData.get('plusone-attendance'));
  let groupId = inviteDetails?.id || invitationGroupId;
  if (!groupId) {
    groupId = crypto.randomUUID();
    invitationGroupId = groupId;
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
      address_line_1: null,
      address_line_2: null,
      city: null,
      postcode: null,
      country: null,
      updated_at: now,
    });
  }

  try {
    const { error } = await supabaseClient
      .from('guests')
      .upsert(guestRows, { onConflict: 'invitation_group_id,role' });

    if (error) {
      throw error;
    }

    if (inviteDetails?.id) {
      const { error: inviteError } = await supabaseClient
        .from('invites')
        .update({
          redeemed_at: now,
          primary_email: inviteDetails.primary_email || email,
        })
        .eq('id', inviteDetails.id);

      if (inviteError) {
        throw inviteError;
      }
    }

    rsvpForm.reset();
    updateGuestUi(profile);
    const primaryFirstName = formData.get('primary-first-name')?.trim() ?? '';
    const plusOneFirstName = formData.get('plusone-first-name')?.trim() ?? '';
    const formattedName = formatGuestName(
      primaryFirstName,
      formData.get('primary-last-name'),
      profile.primary?.name || 'there'
    );
    const nameParts = [primaryFirstName || formattedName].filter(Boolean);
    if (includesPlusOne && plusOneFirstName) {
      nameParts.push(plusOneFirstName);
    }
    const greetingName = nameParts.join(' and ');
    const thankYouNameSegment = greetingName ? `, ${greetingName}` : '';
    const thankYouMessage =
      primaryAttendance === 'yes'
        ? `Thank you for your RSVP${thankYouNameSegment} — we can't wait to celebrate with you!`
        : "Thank you for letting us know. We're sure we'll see you soon.";
    const personalMessage =
      primaryAttendance === 'yes'
        ? `We’re so excited to celebrate with you${thankYouNameSegment}.`
        : `We’ll miss you${thankYouNameSegment}.`;
    if (thankYouMessageEl) {
      thankYouMessageEl.textContent = thankYouMessage;
    }
    if (thankYouPersonalEl) {
      thankYouPersonalEl.textContent = personalMessage;
    }
    storedEmail = email;
    localStorage.setItem(EMAIL_STORAGE_KEY, email);
    setRsvpAccessEmail(email);
    setRsvpCompleted(email);
    await updateRsvpTriggerLabels();
    showStep(5);
    dismissRsvpSection();
  } catch (error) {
    if (rsvpFeedback) {
      rsvpFeedback.textContent =
        'We could not send your response. Please try again later or contact us directly.';
    }
  }
}

rsvpForm?.addEventListener('submit', submitRsvp);

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
