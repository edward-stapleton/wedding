import {
  EMAIL_STORAGE_KEY,
  INVITE_TOKEN_STORAGE_KEY,
  INVITE_TYPE_STORAGE_KEY,
  INVITE_TYPE_QUERY_KEY,
  RSVP_ACCESS_STORAGE_KEY,
  RSVP_COMPLETED_KEY_PREFIX,
  RSVP_PASSWORD,
  RSVP_ROUTE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isRsvpRoute,
} from '../config.js';
import {
  formatGuestName,
  normalizeEmailForStorage,
  setInputValue,
  setInputValueIfEmpty,
} from '../utils/helpers.js';

export function initRsvp() {
  const rsvpAccessEmailInput = document.getElementById('rsvp-access-email');
  const rsvpAccessLink = document.querySelector('.rsvp-access-link');
  const rsvpAccessFeedback = document.getElementById('rsvp-access-feedback');
  const returningEmailField = document.querySelector('[data-returning-email]');
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
  const mobileModalMedia = window.matchMedia('(max-width: 600px)');
  const thankYouMessageEl = document.getElementById('rsvp-thank-you-message');
  const thankYouPersonalEl = document.getElementById('rsvp-thank-you-personal');
  const stepOneTitleDefault = stepOneTitle?.textContent?.trim() || 'Welcome';
  const stepOneIntroDefault =
    stepOneIntro?.textContent?.trim() ||
    'Saturday 22 August 2026 · Oxford. Please enter the password from your invitation to begin your RSVP.';

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
  let hasRequestedReturning = false;
  let hasCompletedRsvp = false;
  const rsvpCompletionCache = new Map();

  const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const ATTENDANCE_PROMPT = 'Able to come?';
  const DIETARY_LABEL_TEXT = 'Any dietary requirements?';
  const DIETARY_PLACEHOLDER = 'e.g. vegetarian, vegan, gluten-intolerant, allergies';

  function createGuestProfile(email) {
    return {
      email,
      primary: { name: 'Guest 1', firstName: '', lastName: '' },
      plusOne: { name: 'Guest 2', firstName: '', lastName: '' },
    };
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

  function applyInviteDetailsToProfile(invite, emailFallback) {
    if (!invite) {
      setGuestProfile(createGuestProfile(emailFallback));
      inviteDetails = null;
      updateStepIndicatorVisibility();
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
    updateStepIndicatorVisibility();
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
    updateStepIndicatorVisibility();
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
    return [2, 3, 4];
  }

  function getRsvpNavigationSequence() {
    const hasPlusOne = isPlusOneActive(guestProfile) || inviteDetails?.invite_type === 'plusone';
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
    const hasPlusOne = inviteDetails?.invite_type === 'plusone' || isPlusOneActive(guestProfile);
    const shouldHide = !hasPlusOne;
    plusOneIndicator.hidden = shouldHide;
    plusOneIndicator.setAttribute('aria-hidden', String(shouldHide));
  }

  function getStepOneButtonLabel() {
    return isReturningRsvp ? 'Enter' : 'RSVP';
  }

  function setReturningRsvpState(shouldReturn) {
    const canReturn = Boolean(shouldReturn && hasRequestedReturning);
    isReturningRsvp = canReturn;
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

    if (currentStep === 1 && stepNextButton) {
      stepNextButton.textContent = getStepOneButtonLabel();
    }
  }

  function resetReturningRsvpRequest() {
    hasRequestedReturning = false;
    setReturningRsvpState(false);
  }

  function showStep(step) {
    const resolvedStep = getNearestRsvpStep(step);
    currentStep = resolvedStep;
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
    hasCompletedRsvp = Boolean(completed);
    setRsvpAccessLinkState(hasCompletedRsvp);
    if (!hasCompletedRsvp && isReturningRsvp) {
      setReturningRsvpState(false);
    }
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

  if (rsvpAccessEmailInput) {
    rsvpAccessEmailInput.addEventListener('input', () => {
      rsvpAccessEmailInput.removeAttribute('aria-invalid');
      setRsvpAccessFeedback('');
    });
  }

  async function initAuth() {
    resetReturningRsvpRequest();
    resolveInviteToken();
    storedEmail = localStorage.getItem(EMAIL_STORAGE_KEY) || '';
    const allowDirectInvite = Boolean(inviteTypeOverride);
    const shouldAutoOpenInvite = Boolean(inviteTypeFromUrl);
    const storedAccessEmail = getStoredRsvpAccessEmail();

    if (rsvpAccessEmailInput && storedEmail) {
      rsvpAccessEmailInput.value = storedEmail;
    }
    await refreshRsvpCompletionGate(storedAccessEmail || storedEmail);

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
      if (shouldAutoOpenInvite && typeof window.openModal === 'function') {
        window.openModal();
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

  rsvpAccessLink?.addEventListener('click', async event => {
    event.preventDefault();
    const activeEmail = getActiveRsvpEmail();
    const canReturn = await refreshRsvpCompletionGate(activeEmail, { showFeedback: true });
    if (!canReturn) {
      return;
    }
    hasRequestedReturning = true;
    setReturningRsvpState(true);
    if (rsvpFeedback) {
      rsvpFeedback.textContent = '';
    }
  });

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
    resetReturningRsvpRequest();
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

      if (isReturningRsvp && hasRequestedReturning) {
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
      applyRsvpCompletionGateState(true);
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
}
