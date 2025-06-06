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
    li.innerHTML = `<i class=\"${f.icon}\"></i><span>${f.text}</span>`;
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
  ctaBtn.innerHTML = '<i class=\"fas fa-door-open\"></i><span>Scopri il locale</span>';
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
  scrollIndicator.innerHTML = '<i class=\"fas fa-chevron-down\"></i>';
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

// Sezione 3: Funzione per creare la sezione "Come funziona il locale"
function createHowItWorksSection() {
  const section = document.createElement('section');
  section.id = 'how-it-works-section';
  section.classList.add('how-it-works-section');

  // Container interno
  const container = document.createElement('div');
  container.classList.add('how-container');

  // Titolo
  const title = document.createElement('h2');
  title.classList.add('how-title');
  title.textContent = 'Come funziona il locale';
  container.appendChild(title);

  // Introduzione
  const intro = document.createElement('p');
  intro.classList.add('how-intro');
  intro.textContent = 'Ecco come organizzare la tua serata al Dice & Drink in tre semplici passi:';
  container.appendChild(intro);

  // Lista di step
  const stepsWrapper = document.createElement('div');
  stepsWrapper.classList.add('how-steps-wrapper');

  const steps = [
    {
      icon: 'fas fa-gamepad',
      heading: 'Scegli il gioco',
      description: 'Sfoglia il nostro catalogo e seleziona il gioco da tavolo che preferisci.'
    },
    {
      icon: 'fas fa-calendar-check',
      heading: 'Prenota il tavolo',
      description: 'Scegli data e orario, specifica il numero di partecipanti e conferma la prenotazione.'
    },
    {
      icon: 'fas fa-wine-glass-alt',
      heading: 'Goditi la serata',
      description: 'Ritira il gioco, ordina drink e snack, divertiti con i tuoi amici in unatmosfera unica.'
    }
  ];

  steps.forEach(step => {
    const stepDiv = document.createElement('div');
    stepDiv.classList.add('how-step');

    const icon = document.createElement('i');
    icon.className = step.icon;
    icon.classList.add('how-step-icon');
    stepDiv.appendChild(icon);

    const textDiv = document.createElement('div');
    textDiv.classList.add('how-step-text');

    const heading = document.createElement('h3');
    heading.classList.add('how-step-heading');
    heading.textContent = step.heading;
    textDiv.appendChild(heading);

    const desc = document.createElement('p');
    desc.classList.add('how-step-desc');
    desc.textContent = step.description;
    textDiv.appendChild(desc);

    stepDiv.appendChild(textDiv);
    stepsWrapper.appendChild(stepDiv);
  });

  container.appendChild(stepsWrapper);
  section.appendChild(container);

  // Animazione di comparsa
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

  // 3. Aggiunge la sezione "Come funziona il locale"
  const howSection = createHowItWorksSection();
  homepage.appendChild(howSection);

  // (In futuro: 4. createMenuSection(), 5. createReviewsSection())

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
      content.innerHTML = `<div class=\"page-content\">\n        <h1>Catalogo Giochi</h1>\n        <p>Scopri la nostra vasta collezione di giochi da tavolo</p>\n      </div>`;
      break;
    case 'menu-bevande':
      content.innerHTML = `<div class=\"page-content\">\n        <h1>Menù Bevande</h1>\n        <p>Cocktail, birre artigianali e bevande analcoliche</p>\n      </div>`;
      break;
    case 'menu-snack-food':
      content.innerHTML = `<div class=\"page-content\">\n        <h1>Menù Snack & Food</h1>\n        <p>Snack, panini e piatti per accompagnare le tue partite</p>\n      </div>`;
      break;
    case 'tornei':
      content.innerHTML = `<div class=\"page-content\">\n        <h1>Tornei</h1>\n        <p>Partecipa ai nostri tornei settimanali e mensili</p>\n      </div>`;
      break;
    case 'eventi-dal-vivo':
      content.innerHTML = `<div class=\"page-content\">\n        <h1>Eventi dal Vivo</h1>\n        <p>Serate speciali, presentazioni e eventi unici</p>\n      </div>`;
      break;
    case 'proponi-torneo':
      content.innerHTML = `<div class=\"page-content\">\n        <h1>Proponi un Torneo</h1>\n        <p>Hai un'idea per un torneo? Proponicela!</p>\n      </div>`;
      break;
    case 'prenotazioni':
      content.innerHTML = `<div class=\"page-content\">\n        <h1>Prenotazioni</h1>\n        <p>Prenota il tuo tavolo o partecipa ai nostri eventi</p>\n      </div>`;
      break;
    case 'aboutus':
      content.innerHTML = `<div class=\"page-content\">\n        <h1>Chi Siamo</h1>\n        <p>La storia del Dice & Drink e del nostro team</p>\n      </div>`;
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
