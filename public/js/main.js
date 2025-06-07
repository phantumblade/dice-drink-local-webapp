import { createNavbar } from './navbar.js';
import { buildFooter } from './footer.js';
import { createEventCarousel } from './eventCarousel.js';

// Sezione 2: Funzione per creare la sezione di benvenuto + Call to Action
function createWelcomeSection() {
  const section = document.createElement('section');
  section.id = 'welcome-section';
  section.classList.add('welcome-section');

  // Container generale della sezione
  const container = document.createElement('div');
  container.classList.add('welcome-container');

  // Titolo principale
  const title = document.createElement('h1');
  title.classList.add('welcome-title');
  title.textContent = 'Benvenuti al Dice & Drink';
  container.appendChild(title);

  // Tagline
  const tagline = document.createElement('h2');
  tagline.classList.add('welcome-tagline');
  tagline.textContent = 'Dove vivrai serate indimenticabili, all’insegna di avventure, divertimento e drink speciali!';
  container.appendChild(tagline);

  // Grid a due colonne: sinistra testo+feature, destra immagine
  const grid = document.createElement('div');
  grid.classList.add('welcome-grid');

  // Colonna sinistra
  const leftCol = document.createElement('div');
  leftCol.classList.add('welcome-left-col');

  const description = document.createElement('p');
  description.classList.add('welcome-description');
  description.textContent = 'Unisciti a noi per serate di giochi da tavolo, drink artigianali e tanto divertimento! Scopri il nostro locale, partecipa ai tornei e agli eventi dal vivo, e goditi un’atmosfera unica con amici e appassionati di giochi.';
  leftCol.appendChild(description);

  const featuresList = document.createElement('ul');
  featuresList.classList.add('welcome-features');
  const features = [
    { icon: 'fas fa-dice', text: 'Ampia collezione di giochi' },
    { icon: 'fas fa-beer', text: 'Drink e cocktail unici' },
    { icon: 'fas fa-users', text: 'Eventi settimanali e tornei' },
    { icon: 'fas fa-utensils', text: 'Snack e piatti da condividere' }
  ];
  features.forEach((f) => {
    const li = document.createElement('li');
    li.innerHTML = `<i class="${f.icon}"></i><span>${f.text}</span>`;
    featuresList.appendChild(li);
  });
  leftCol.appendChild(featuresList);

  grid.appendChild(leftCol);

  // Colonna destra
  const rightCol = document.createElement('div');
  rightCol.classList.add('welcome-right-col');
  const img = document.createElement('img');
  img.src = 'assets/locale.jpg';
  img.alt = 'Interno del locale Dice & Drink';
  img.classList.add('welcome-image');
  rightCol.appendChild(img);

  grid.appendChild(rightCol);

  container.appendChild(grid);

  // Bottone CTA
  const ctaBtn = document.createElement('button');
  ctaBtn.id = 'welcome-cta-btn';
  ctaBtn.classList.add('btn-primary', 'welcome-cta-btn');
  ctaBtn.innerHTML = '<i class="fas fa-door-open"></i><span>Scopri il locale</span>';
  ctaBtn.addEventListener('click', () => {
    const menuSection = document.getElementById('menu-section');
    if (menuSection) menuSection.scrollIntoView({ behavior: 'smooth' });
  });
  container.appendChild(ctaBtn);

  // Scroll indicator
  const scrollIndicator = document.createElement('div');
  scrollIndicator.classList.add('scroll-down-indicator');
  scrollIndicator.innerHTML = '<i class="fas fa-chevron-down"></i>';
  scrollIndicator.addEventListener('click', () => {
    const howSection = document.getElementById('how-it-works-section');
    if (howSection) howSection.scrollIntoView({ behavior: 'smooth' });
  });
  container.appendChild(scrollIndicator);

  section.appendChild(container);

  // Animazione entrata
  setTimeout(() => section.classList.add('show'), 100);
  return section;
}

// Sezione 3: Funzione per creare la sezione "Come funziona il locale"
function createHowItWorksSection() {
  const section = document.createElement('section');
  section.id = 'how-it-works-section';
  section.classList.add('how-it-works-section');

  const container = document.createElement('div');
  container.classList.add('how-container');

  const title = document.createElement('h2');
  title.classList.add('how-title');
  title.textContent = 'Come funziona il locale';
  container.appendChild(title);

  const intro = document.createElement('p');
  intro.classList.add('how-intro');
  intro.textContent = 'Ecco come organizzare la tua serata al Dice & Drink in tre semplici passi:';
  container.appendChild(intro);

  const stepsWrapper = document.createElement('div');
  stepsWrapper.classList.add('how-steps-wrapper');

  const steps = [
    { icon: 'fas fa-dragon', heading: 'Scegli il gioco', description: 'Sfoglia il nostro catalogo e seleziona il gioco da tavolo che preferisci.' },
    { icon: 'fas fa-calendar-check', heading: 'Prenota il tavolo', description: 'Scegli data e orario, specifica il numero di partecipanti e conferma la prenotazione.' },
    { icon: 'fas fa-wine-glass-alt', heading: 'Goditi la serata', description: 'Ritira il gioco, ordina drink e snack, divertiti con i tuoi amici in un’atmosfera unica.' }
  ];

  steps.forEach((step, index) => {
    const stepDiv = document.createElement('div');
    stepDiv.classList.add('how-step');
    stepDiv.setAttribute('data-step', index + 1);

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

  setTimeout(() => section.classList.add('show'), 100);
  return section;
}

// Rendering della pagina
function showHomepage() {
  const content = document.getElementById('content');
  content.innerHTML = '';

  const homepage = document.createElement('div');
  homepage.classList.add('homepage');
  homepage.appendChild(createEventCarousel());
  homepage.appendChild(createWelcomeSection());
  homepage.appendChild(createHowItWorksSection());

  content.appendChild(homepage);
}

// Setup iniziale
document.body.prepend(createNavbar());
const content = document.createElement('div');
content.id = 'content';
document.body.appendChild(content);
document.body.appendChild(buildFooter());

document.addEventListener('DOMContentLoaded', showHomepage);

// Espongo showPage per la navbar
window.showPage = (pageId) => {
  if (pageId === 'homepage' || pageId === 'home') {
    showHomepage();
  } else {
    showHomepage(); // gestioni future pagine
  }
};
