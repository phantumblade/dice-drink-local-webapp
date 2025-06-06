import { createNavbar } from './navbar.js';
import { buildFooter } from './footer.js';
import { createEventCarousel } from './eventCarousel.js';

// Sezione 2: Funzione per creare la sezione di benvenuto + Call to Action
function createWelcomeSection() {
  const section = document.createElement('section');
  section.id = 'welcome-section';
  section.classList.add('welcome-section');

  const container = document.createElement('div');
  container.classList.add('welcome-container');

  const title = document.createElement('h1');
  title.textContent = 'Benvenuti al Dice & Drink';

  const description = document.createElement('p');
  description.textContent = 'Il tuo punto di riferimento a Novara per giochi da tavolo, eventi esclusivi, cibo e drink di qualità.';

  const ctaBtn = document.createElement('button');
  ctaBtn.id = 'welcome-cta-btn';
  ctaBtn.classList.add('btn-primary');
  ctaBtn.innerHTML = '<i class="fas fa-door-open"></i> Scopri il locale';
  // Al click, scrolla alla sezione del menù (da implementare quando la sezione avrà id="menu-section")
  ctaBtn.addEventListener('click', () => {
    const menuSection = document.getElementById('menu-section');
    if (menuSection) {
      menuSection.scrollIntoView({ behavior: 'smooth' });
    }
  });

  container.appendChild(title);
  container.appendChild(description);
  container.appendChild(ctaBtn);

  section.appendChild(container);
  return section;
}

// Inizio del rendering della pagina
document.body.prepend(createNavbar());

const content = document.createElement('div');
content.id = 'content';
document.body.appendChild(content);

// Funzione per mostrare la homepage
function showHomepage() {
  const content = document.getElementById('content');
  content.innerHTML = '';

  // Crea il container principale della homepage
  const homepage = document.createElement('div');
  homepage.classList.add('homepage');

  // 1. Aggiunge il carosello degli eventi
  const eventCarousel = createEventCarousel();
  homepage.appendChild(eventCarousel);

  // 2. Aggiunge la sezione di benvenuto e Call to Action
  const welcomeSection = createWelcomeSection();
  homepage.appendChild(welcomeSection);

  // (In futuro: 3. createHowItWorksSection(), 4. createMenuSection(), 5. createReviewsSection())

  content.appendChild(homepage);
}

// Gestione della navigazione
function showPage(pageId) {
  const content = document.getElementById('content');

  switch(pageId) {
    case 'homepage':
    case 'home':
      showHomepage();
      break;
    case 'catalogo-giochi':
      content.innerHTML = `<div class="page-content">
        <h1>Catalogo Giochi</h1>
        <p>Scopri la nostra vasta collezione di giochi da tavolo</p>
      </div>`;
      break;
    case 'menu-bevande':
      content.innerHTML = `<div class="page-content">
        <h1>Menù Bevande</h1>
        <p>Cocktail, birre artigianali e bevande analcoliche</p>
      </div>`;
      break;
    case 'menu-snack-food':
      content.innerHTML = `<div class="page-content">
        <h1>Menù Snack & Food</h1>
        <p>Snack, panini e piatti per accompagnare le tue partite</p>
      </div>`;
      break;
    case 'tornei':
      content.innerHTML = `<div class="page-content">
        <h1>Tornei</h1>
        <p>Partecipa ai nostri tornei settimanali e mensili</p>
      </div>`;
      break;
    case 'eventi-dal-vivo':
      content.innerHTML = `<div class="page-content">
        <h1>Eventi dal Vivo</h1>
        <p>Serate speciali, presentazioni e eventi unici</p>
      </div>`;
      break;
    case 'proponi-torneo':
      content.innerHTML = `<div class="page-content">
        <h1>Proponi un Torneo</h1>
        <p>Hai un'idea per un torneo? Proponicela!</p>
      </div>`;
      break;
    case 'prenotazioni':
      content.innerHTML = `<div class="page-content">
        <h1>Prenotazioni</h1>
        <p>Prenota il tuo tavolo o partecipa ai nostri eventi</p>
      </div>`;
      break;
    case 'aboutus':
      content.innerHTML = `<div class="page-content">
        <h1>Chi Siamo</h1>
        <p>La storia del Dice & Drink e del nostro team</p>
      </div>`;
      break;
    default:
      showHomepage();
  }
}

// Esponi la funzione showPage globalmente per navbar.js
window.showPage = showPage;

// Mostra la homepage all'avvio
const toggleTheme = () => {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
};

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);

  // Mostra la homepage
  showHomepage();

  const themeButton = document.getElementById('theme-switch-button');
  if (themeButton) {
    themeButton.addEventListener('click', toggleTheme);
  }
});

// Aggiunge il footer di base (verrà renderizzato sotto il 'content')
document.body.appendChild(buildFooter());
