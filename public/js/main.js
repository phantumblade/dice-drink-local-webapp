import { createNavbar } from './navbar.js';
import { buildFooter } from './footer.js';
import { createEventCarousel } from './eventCarousel.js';

// Sezione 2: Funzione per creare la sezione di benvenuto + Call to Action
function createWelcomeSection() {
  const section = document.createElement('section');
  section.id = 'welcome-section';
  section.classList.add('welcome-section');

  // 1. Container generale della sezione
  const container = document.createElement('div');
  container.classList.add('welcome-container');

  // 2. Titolo principale (centrato sopra le colonne)
  const title = document.createElement('h1');
  title.textContent = 'Benvenuti al Dice & Drink';
  title.classList.add('welcome-title');
  container.appendChild(title);

  // 3. Tagline (centrata sotto il titolo)
  const tagline = document.createElement('h2');
  tagline.classList.add('welcome-tagline');
  tagline.textContent = 'Dove vivrai serate indimenticabili, all’insegna di avventure, divertimento e drink speciali!';
  container.appendChild(tagline);

  // 4. Grid a due colonne: sinistra = testo+feature, destra = immagine
  const grid = document.createElement('div');
  grid.classList.add('welcome-grid');

  // 4a. Colonna di sinistra (testo, lista feature)
  const leftCol = document.createElement('div');
  leftCol.classList.add('welcome-left-col');

  // Descrizione breve sotto la tagline
  const description = document.createElement('p');
  description.classList.add('welcome-description');
  description.textContent = 'Unisciti a noi per serate di giochi da tavolo, drink artigianali e tanto divertimento! Scopri il nostro locale, partecipa ai tornei e agli eventi dal vivo, e goditi un’atmosfera unica con amici e appassionati di giochi.';
  leftCol.appendChild(description);

  // Lista di feature con icone (due colonne di icon+testo)
  const featuresList = document.createElement('ul');
  featuresList.classList.add('welcome-features');
  const features = [
    { icon: 'fas fa-dice', text: 'Ampia collezione di giochi' },
    { icon: 'fas fa-beer', text: 'Drink e cocktail unici' },
    { icon: 'fas fa-users', text: 'Eventi settimanali e tornei' },
    { icon: 'fas fa-utensils', text: 'Snack e piatti da condividere' }
  ];
  features.forEach(f => {
    const li = document.createElement('li');
    li.innerHTML = `<i class="${f.icon}"></i><span>${f.text}</span>`;
    featuresList.appendChild(li);
  });
  leftCol.appendChild(featuresList);

  grid.appendChild(leftCol);

  // 4b. Colonna di destra (immagine)
  const rightCol = document.createElement('div');
  rightCol.classList.add('welcome-right-col');
  const img = document.createElement('img');
  img.src = 'assets/locale.jpg'; // Sostituisci con il percorso corretto della tua immagine
  img.alt = 'Interno del locale Dice & Drink';
  img.classList.add('welcome-image');
  rightCol.appendChild(img);

  grid.appendChild(rightCol);

  container.appendChild(grid);

  // 5. Bottone CTA (centrato sotto le due colonne)
  const ctaBtn = document.createElement('button');
  ctaBtn.id = 'welcome-cta-btn';
  ctaBtn.classList.add('btn-primary', 'welcome-cta-btn');
  ctaBtn.innerHTML = '<i class="fas fa-door-open"></i><span>Scopri il locale</span>';
  ctaBtn.addEventListener('click', () => {
    const menuSection = document.getElementById('menu-section');
    if (menuSection) {
      menuSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
  container.appendChild(ctaBtn);

  // 6. Freccia “Scroll down” (centrata sotto il bottone)
  const scrollIndicator = document.createElement('div');
  scrollIndicator.classList.add('scroll-down-indicator');
  scrollIndicator.innerHTML = '<i class="fas fa-chevron-down"></i>';
  scrollIndicator.addEventListener('click', () => {
    const howSection = document.getElementById('how-it-works-section');
    if (howSection) howSection.scrollIntoView({ behavior: 'smooth' });
  });
  container.appendChild(scrollIndicator);

  section.appendChild(container);

  // 7. Animazione di comparsa: aggiungo la classe .show dopo un piccolo delay
  setTimeout(() => {
    section.classList.add('show');
  }, 100);

  return section;
}

// Inizio del rendering della pagina
document.body.prepend(createNavbar());

const content = document.createElement('div');
content.id = 'content';
document.body.appendChild(content);

// Aggiunge il footer di base (verrà renderizzato sotto il 'content')
document.body.appendChild(buildFooter());

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

// Funzione per gestire il toggle del tema chiaro/scuro
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

  // Mostra la homepage all'avvio
  showHomepage();

  const themeButton = document.getElementById('theme-switch-button');
  if (themeButton) {
    themeButton.addEventListener('click', toggleTheme);
  }
});
