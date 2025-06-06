// js/eventCarousel.js

export function createEventCarousel() {
  // Dati di esempio per gli eventi (sostituisci con dati reali)
  const events = [
    {
      id: 1,
      title: "Torneo di Catan",
      gameType: "Strategia",
      image: "https://unsplash.com/it/foto/scatole-di-cartone-bianche-e-rosse-su-tavolo-di-legno-marrone-RhYiBB-_FR8",
      date: "2025-06-15",
      maxPlayers: 16,
      currentPlayers: 12,
      description: "Battaglia epica per il controllo dell'isola di Catan"
    },
    {
      id: 2,
      title: "Serata D&D - Campagna Epica",
      gameType: "RPG",
      image: "assets/games.jpg",
      date: "2025-06-20",
      maxPlayers: 6,
      currentPlayers: 4,
      description: "Avventura fantasy in un mondo di magia e draghi"
    },
    {
      id: 3,
      title: "Magic: The Gathering Draft",
      gameType: "TCG",
      image: "assets/games.jpg",
      date: "2025-06-25",
      maxPlayers: 8,
      currentPlayers: 6,
      description: "Torneo di drafting con premi esclusivi"
    },
    {
      id: 4,
      title: "Wingspan Tournament",
      gameType: "Engine Building",
      image: "assets/games.jpg",
      date: "2025-07-02",
      maxPlayers: 12,
      currentPlayers: 8,
      description: "Costruisci il tuo habitat per uccelli perfetto"
    },
    {
      id: 5,
      title: "Azul Championship",
      gameType: "Strategia Astratta",
      image: "assets/games.jpg",
      date: "2025-07-10",
      maxPlayers: 20,
      currentPlayers: 15,
      description: "Campionato del celebre gioco di piastrelle portoghesi"
    }
  ];

  // Crea il container principale del carosello
  const carousel = document.createElement('div');
  carousel.classList.add('event-carousel');

  // Header del carosello
  const header = document.createElement('div');
  header.classList.add('carousel-header');

  // Container per le slide
  const slidesContainer = document.createElement('div');
  slidesContainer.classList.add('carousel-slides-container');

  const slidesWrapper = document.createElement('div');
  slidesWrapper.classList.add('carousel-slides-wrapper');

  // Crea le slide
  events.forEach((event, index) => {
    const slide = createEventSlide(event, index);
    slidesWrapper.appendChild(slide);
  });

  slidesContainer.appendChild(slidesWrapper);

  // Controlli di navigazione
  const controls = document.createElement('div');
  controls.classList.add('carousel-controls');

  const prevBtn = document.createElement('button');
  prevBtn.classList.add('carousel-btn', 'carousel-prev');
  prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';

  const nextBtn = document.createElement('button');
  nextBtn.classList.add('carousel-btn', 'carousel-next');
  nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';

  controls.appendChild(prevBtn);
  controls.appendChild(nextBtn);

  // Indicatori (dots)
  const indicators = document.createElement('div');
  indicators.classList.add('carousel-indicators');

  events.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.classList.add('carousel-indicator');
    if (index === 0) dot.classList.add('active');
    dot.dataset.slide = index;
    indicators.appendChild(dot);
  });

  // Assembla il carosello
  carousel.appendChild(header);
  carousel.appendChild(slidesContainer);
  carousel.appendChild(controls);
  carousel.appendChild(indicators);

  // Inizializza la logica del carosello
  initCarouselLogic(carousel, events.length);

  return carousel;
}

function createEventSlide(event, index) {
  const slide = document.createElement('div');
  slide.classList.add('carousel-slide');
  if (index === 0) slide.classList.add('active');

  // Calcola giorni mancanti
  const eventDate = new Date(event.date);
  const today = new Date();
  const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

  // Formatta la data
  const formattedDate = eventDate.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calcola la percentuale di posti occupati
  const occupancyPercent = Math.round((event.currentPlayers / event.maxPlayers) * 100);

  slide.innerHTML = `
    <div class="slide-image-container">
      <img src="${event.image}" alt="${event.title}" class="slide-image"
           onerror="this.src='assets/games.jpg';">
      <div class="slide-overlay"></div>

      <div class="slide-content slide-content-columns">
        <div class="slide-col slide-col-main">
          <h3 class="event-title">${event.title}</h3>
          <p class="event-description">${event.description}</p>
          <div class="event-details">
            <div class="event-date">
              <i class="fas fa-calendar"></i>
              <span>${formattedDate}</span>
            </div>
            <div class="event-players">
              <div class="players-info">
                <i class="fas fa-users"></i>
                <span>${event.currentPlayers}/${event.maxPlayers} giocatori</span>
              </div>
              <div class="players-bar">
                <div class="players-progress" style="width: ${occupancyPercent}%"></div>
              </div>
              <span class="occupancy-percent">${occupancyPercent}% occupato</span>
            </div>
          </div>
        </div>
        <div class="slide-col slide-col-side">
          <div class="slide-tags">
            <span class="event-game-type">${event.gameType}</span>
            <span class="event-countdown">${daysUntil > 0 ? `${daysUntil} giorni` : 'Oggi!'}</span>
          </div>
          <div class="slide-separator"></div>
          <div class="slide-actions">
            <button class="btn-primary event-book-btn" data-event-id="${event.id}">
              <i class="fas fa-ticket-alt"></i>
              Prenota Posto
            </button>
            <button class="btn-secondary event-details-btn" data-event-id="${event.id}">
              <i class="fas fa-info-circle"></i>
              Dettagli
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  return slide;
}

function initCarouselLogic(carousel, slideCount) {
  const slidesWrapper = carousel.querySelector('.carousel-slides-wrapper');
  const slides = carousel.querySelectorAll('.carousel-slide');
  const indicators = carousel.querySelectorAll('.carousel-indicator');
  const prevBtn = carousel.querySelector('.carousel-prev');
  const nextBtn = carousel.querySelector('.carousel-next');

  let currentSlide = 0;
  let isTransitioning = false;
  let autoSlideInterval;

  // Pausa auto-slide SOLO quando il mouse è sopra la card attiva
  function addHoverListenersToActiveSlide() {
    // Rimuovi eventuali listener precedenti
    slides.forEach(slide => {
      slide.removeEventListener('mouseenter', stopAutoSlide);
      slide.removeEventListener('mouseleave', startAutoSlide);
    });
    // Aggiungi solo alla slide attiva
    const activeSlide = carousel.querySelector('.carousel-slide.active');
    if (activeSlide) {
      activeSlide.addEventListener('mouseenter', stopAutoSlide);
      activeSlide.addEventListener('mouseleave', startAutoSlide);
    }
  }

  // Aggiorna anche i listener ogni volta che cambia la slide
  function updateCarousel() {
    if (isTransitioning) return;
    isTransitioning = true;

    slides.forEach((slide, index) => {
      slide.classList.toggle('active', index === currentSlide);
    });

    indicators.forEach((indicator, index) => {
      indicator.classList.toggle('active', index === currentSlide);
    });

    const translateX = -currentSlide * 100;
    slidesWrapper.style.transform = `translateX(${translateX}%)`;

    setTimeout(() => {
      isTransitioning = false;
    }, 500);

    // Aggiorna i listener hover sulla slide attiva
    addHoverListenersToActiveSlide();
  }

  function nextSlide() {
    if (isTransitioning) return;
    currentSlide = (currentSlide + 1) % slideCount;
    updateCarousel();
  }

  function prevSlide() {
    if (isTransitioning) return;
    currentSlide = (currentSlide - 1 + slideCount) % slideCount;
    updateCarousel();
  }

  function goToSlide(index) {
    if (isTransitioning || index === currentSlide) return;
    currentSlide = index;
    updateCarousel();
  }

  function startAutoSlide() {
    autoSlideInterval = setInterval(nextSlide, 5000); // Cambia slide ogni 5 secondi
  }

  function stopAutoSlide() {
    clearInterval(autoSlideInterval);
  }

  // Event listeners
  nextBtn.addEventListener('click', () => {
    nextSlide();
    stopAutoSlide();
    startAutoSlide();
  });

  prevBtn.addEventListener('click', () => {
    prevSlide();
    stopAutoSlide();
    startAutoSlide();
  });

  indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => {
      goToSlide(index);
      stopAutoSlide();
      startAutoSlide();
    });
  });

  // Pausa auto-slide al hover
  carousel.addEventListener('mouseenter', stopAutoSlide);
  carousel.addEventListener('mouseleave', startAutoSlide);

  // Touch/swipe support per mobile
  let startX = 0;
  let isDragging = false;

  carousel.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
    stopAutoSlide();
  });

  carousel.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
  });

  carousel.addEventListener('touchend', (e) => {
    if (!isDragging) return;

    const endX = e.changedTouches[0].clientX;
    const diffX = startX - endX;

    if (Math.abs(diffX) > 50) { // Soglia minima per lo swipe
      if (diffX > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }

    isDragging = false;
    startAutoSlide();
  });

  // Gestione click sui bottoni degli eventi
  carousel.addEventListener('click', (e) => {
    if (e.target.classList.contains('event-book-btn')) {
      const eventId = e.target.dataset.eventId;
      handleEventBooking(eventId);
    } else if (e.target.classList.contains('event-details-btn')) {
      const eventId = e.target.dataset.eventId;
      handleEventDetails(eventId);
    }
  });

  // Avvia auto-slide
  startAutoSlide();

  // Supporto tastiera
  document.addEventListener('keydown', (e) => {
    if (carousel.matches(':hover')) {
      if (e.key === 'ArrowLeft') {
        prevSlide();
        stopAutoSlide();
        startAutoSlide();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
        stopAutoSlide();
        startAutoSlide();
      }
    }
  });
}

// Funzioni di gestione eventi (da implementare)
function handleEventBooking(eventId) {
  console.log(`Prenotazione evento ID: ${eventId}`);
  // Qui puoi implementare la logica di prenotazione
  // Ad esempio aprire un modal o navigare a una pagina di prenotazione
  alert(`Prenotazione per evento ${eventId} - Funzionalità da implementare!`);
}

function handleEventDetails(eventId) {
  console.log(`Dettagli evento ID: ${eventId}`);
  // Qui puoi implementare la logica per mostrare i dettagli
  // Ad esempio aprire un modal con più informazioni
  alert(`Dettagli evento ${eventId} - Funzionalità da implementare!`);
}
