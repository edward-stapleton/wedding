export function initGuide() {
  setupGuideCarousel();
}

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
