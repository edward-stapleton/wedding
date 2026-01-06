const ACCESS_CODE = 'STARFORD';
const STORAGE_KEY = 'weddingSiteUnlocked';
const EMAIL_STORAGE_KEY = 'weddingGuestEmail';
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

const passwordScreen = document.getElementById('password-screen');
const passwordForm = document.getElementById('password-form');
const emailInput = document.getElementById('guest-email');
const passwordInput = document.getElementById('access-code');
const passwordError = document.getElementById('password-error');
const rsvpModal = document.getElementById('rsvp-modal');
const rsvpForm = document.getElementById('rsvp-form');
const rsvpFeedback = document.getElementById('rsvp-feedback');
const rsvpEmailDisplay = document.querySelector('[data-guest-email]');
const primaryNameEl = document.querySelector('[data-guest-name="primary"]');
const plusOneNameEl = document.querySelector('[data-guest-name="plusOne"]');
const plusOneSection = document.querySelector('[data-guest-section="plusOne"]');
const primaryLegend = document.querySelector('[data-attendance-legend="primary"]');
const plusOneLegend = document.querySelector('[data-attendance-legend="plusOne"]');
const primaryDietaryLabel = document.querySelector('[data-dietary-label="primary"]');
const plusOneDietaryLabel = document.querySelector('[data-dietary-label="plusOne"]');
const primaryDietaryInput = document.getElementById('primary-dietary');
const plusOneDietaryInput = document.getElementById('plusone-dietary');
const rsvpEmailField = document.getElementById('rsvp-email');
const openRsvpButton = document.getElementById('open-rsvp');
const closeModalEls = document.querySelectorAll('[data-close-modal]');
const guestSections = document.querySelectorAll('.guest-response');
const mapContainer = document.querySelector('[data-map-container]');
const siteNav = document.querySelector('.site-nav');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelectorAll('.nav-links a');
const header = document.querySelector('.site-header');
const mobileModalMedia = window.matchMedia('(max-width: 600px)');
const mapReplayButton = document.querySelector('[data-map-replay]');

let mapLoaded = false;
let mapInstance;
let routeBoundsCache = null;
let initialCameraCache = null;
let guestProfile = null;

const ATTENDANCE_PROMPT = 'Able to come?';
const DIETARY_LABEL_TEXT = 'Any dietary requirements?';
const DIETARY_PLACEHOLDER = 'e.g. vegetarian, vegan, gluten-intolerant, allergies';

function createGuestProfile(email) {
  return {
    email,
    primary: { name: 'Joe Bloggs' },
    plusOne: { name: 'Jill Bloggs' },
  };
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

function resetGuestSectionStateForModal() {
  applyGuestSectionResponsiveState(mobileModalMedia.matches);
}

function updateGuestUi(profile) {
  if (!profile) return;

  const primaryName = profile.primary?.name || 'Joe Bloggs';
  const plusOneName = profile.plusOne?.name || 'Jill Bloggs';
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

  if (plusOneSection) {
    plusOneSection.hidden = !hasPlusOne;
    if (!hasPlusOne) {
      setGuestSectionState(plusOneSection, false);
    }
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

    if (rsvpForm) {
      const plusOneRadios = rsvpForm.querySelectorAll('[name="plusone-attendance"]');
      plusOneRadios.forEach(input => {
        input.disabled = false;
        input.required = true;
      });
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
  }

  const emailValue = profile.email || '';

  if (rsvpEmailDisplay) {
    rsvpEmailDisplay.textContent = emailValue || 'Not provided yet';
  }

  if (rsvpEmailField) {
    rsvpEmailField.value = emailValue;
  }

  if (emailInput && emailValue) {
    emailInput.value = emailValue;
  }
}

function setGuestProfile(profile) {
  guestProfile = profile;
  updateGuestUi(profile);
}

function unlockSite() {
  passwordInput?.removeAttribute('aria-invalid');
  emailInput?.removeAttribute('aria-invalid');
  if (!passwordScreen) return;
  passwordScreen.classList.add('hidden');
  setTimeout(() => {
    passwordScreen.style.display = 'none';
  }, 400);
}

function lockSite() {
  if (!passwordScreen) return;
  passwordScreen.style.display = 'flex';
  passwordScreen.classList.remove('hidden');
}

function handlePasswordSubmit(event) {
  event.preventDefault();
  if (!emailInput || !passwordInput) return;

  passwordError.textContent = '';
  emailInput.removeAttribute('aria-invalid');
  passwordInput.removeAttribute('aria-invalid');

  const emailValue = emailInput.value.trim();
  const entered = passwordInput.value.trim().toUpperCase();

  if (!emailValue || !emailValue.includes('@')) {
    passwordError.textContent = 'Please enter a valid email address to continue.';
    emailInput.setAttribute('aria-invalid', 'true');
    emailInput.focus();
    return;
  }

  if (entered !== ACCESS_CODE) {
    passwordError.textContent = 'That code is not quite right.';
    passwordInput.setAttribute('aria-invalid', 'true');
    passwordInput.focus();
    return;
  }

  localStorage.setItem(STORAGE_KEY, 'true');
  localStorage.setItem(EMAIL_STORAGE_KEY, emailValue);
  passwordError.textContent = '';
  setGuestProfile(createGuestProfile(emailValue));
  unlockSite();
}

passwordInput?.addEventListener('input', () => {
  passwordInput.removeAttribute('aria-invalid');
  passwordError.textContent = '';
});

emailInput?.addEventListener('input', () => {
  emailInput.removeAttribute('aria-invalid');
  passwordError.textContent = '';
});

const storedEmail = localStorage.getItem(EMAIL_STORAGE_KEY) || '';
setGuestProfile(createGuestProfile(storedEmail));

if (localStorage.getItem(STORAGE_KEY) === 'true') {
  unlockSite();
} else {
  if (emailInput && storedEmail) {
    emailInput.value = storedEmail;
  }
  lockSite();
}

passwordForm?.addEventListener('submit', handlePasswordSubmit);

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
    accommodation:
      "Aside from Airbnb and Booking.com, here are some other places that we'd suggest checking out for accommodation:",
    coffee: "These are the places that we tend to pick up a flat white when we're in Oxford:",
    pubs:
      "There's a great mix of historic watering holes in central Oxford, with craft beer places further out of town:",
    restaurants:
      'From riverside lunches to modern small plates, there is no shortage of wonderful dining in Oxford. Here are a few of our favourite tables:',
    sightseeing:
      'If you have time to explore, Oxford is packed with architecture, museums, and iconic views. These are a few must-see stops:',
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

setupGuestSectionToggles();

function openModal() {
  if (!rsvpModal) return;
  rsvpModal.hidden = false;
  rsvpModal.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (rsvpFeedback) {
    rsvpFeedback.textContent = '';
  }

  if (!guestProfile) {
    const fallbackEmail = emailInput?.value.trim() || storedEmail || '';
    setGuestProfile(createGuestProfile(fallbackEmail));
  } else {
    updateGuestUi(guestProfile);
  }

  resetGuestSectionStateForModal();

  const initialFocusControl = rsvpForm?.querySelector('[data-initial-focus]');
  setTimeout(() => initialFocusControl?.focus(), 50);
}

function closeModal() {
  if (!rsvpModal) return;
  rsvpModal.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => {
    rsvpModal.hidden = true;
  }, 300);
}

openRsvpButton?.addEventListener('click', openModal);
closeModalEls.forEach(el => el.addEventListener('click', closeModal));
rsvpModal?.addEventListener('click', event => {
  if (event.target === rsvpModal) {
    closeModal();
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && rsvpModal && !rsvpModal.hidden) {
    closeModal();
  }
});

function validateForm(formData, profile) {
  const errors = [];
  if (!profile) {
    errors.push('Please unlock the site with your email before responding.');
    return errors;
  }

  const primaryName = profile.primary?.name || 'Joe Bloggs';
  const plusOneName = profile.plusOne?.name || 'Jill Bloggs';
  const hasPlusOne = Boolean(profile.plusOne && profile.plusOne.name);

  if (!formData.get('guest-email')) {
    errors.push('We could not detect your email. Please reload the page and try again.');
  }

  if (!formData.get('primary-attendance')) {
    errors.push(`Please let us know if ${primaryName} can make it.`);
  }

  if (hasPlusOne && !formData.get('plusone-attendance')) {
    errors.push(`Please let us know if ${plusOneName} can make it.`);
  }

  return errors;
}

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

  const payload = {
    email: (formData.get('guest-email') || profile.email || '').trim(),
    guests: [
      {
        name: profile.primary?.name || 'Joe Bloggs',
        attendance: formData.get('primary-attendance'),
        dietary: formData.get('primary-dietary')?.trim() ?? '',
      },
    ],
    submittedAt: new Date().toISOString(),
  };

  if (profile.plusOne && profile.plusOne.name) {
    payload.guests.push({
      name: profile.plusOne.name,
      attendance: formData.get('plusone-attendance'),
      dietary: formData.get('plusone-dietary')?.trim() ?? '',
    });
  }

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
    updateGuestUi(profile);
    rsvpForm.innerHTML = '<p class="thank-you">Thank you for letting us know. We will be in touch soon.</p>';
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
