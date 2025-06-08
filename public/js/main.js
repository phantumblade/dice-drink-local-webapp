import { createNavbar } from './navbar.js';
import { buildFooter } from './footer.js';
import { createEventCarousel } from './eventCarousel.js';


// Sezione 3: Funzione per creare la sezione "Come funziona il locale"
function createExpandableCards() {
  const section = document.createElement('section');
  section.classList.add('expandable-cards-section');

  // —————— Nuova intestazione per la sezione ——————
  const titleEl = document.createElement('h2');
  titleEl.classList.add('expandable-section-title');
  titleEl.textContent = 'Come funziona il locale';
  section.appendChild(titleEl);

const introEl = document.createElement('p');
introEl.classList.add('expandable-section-intro');

const text = 'Ecco come organizzare la tua serata al Dice & Drink in tre semplici passi:';
const highlight = 'tre semplici passi';
const [before, after] = text.split(highlight);

// testo prima
introEl.appendChild(document.createTextNode(before));

// span della parte evidenziata
const span = document.createElement('span');
span.classList.add('highlight-passi');
span.textContent = highlight;
introEl.appendChild(span);

// testo dopo
introEl.appendChild(document.createTextNode(after));

section.appendChild(introEl);



  const container = document.createElement('div');
  container.classList.add('cards-container');

  // Dati delle card
  const cardsData = [
    {
      id: 1,
      title: 'Scegli il gioco',
      subtitle: 'Sfoglia il catalogo e seleziona il tuo gioco da tavolo preferito.',
      icon: 'fas fa-dragon',
      description: 'Esplora la nostra vasta collezione di giochi da tavolo per tutte le età e tutti i gusti. Dalle strategie complesse ai party game, troverai il gioco perfetto per ogni occasione.',
      features: [
        'Oltre 500 giochi disponibili',
        'Filtri per età, durata e categoria',
        'Da one-shot a sessioni mensili di gioco',
        'Anteprime e tutorial video',
        'Giochi da bar/pub (biliardino, freccette, air hockey)'
      ],
      buttonText: 'Sfoglia catalogo'
    },
    {
      id: 2,
      title: 'Prenota il tavolo',
      subtitle: 'Scegli data e orario ed evento a cui partecipare.',
      icon: 'fas fa-calendar-check',
      description: 'Prenota facilmente il tuo tavolo per la data e l\'orario che preferisci. Il nostro sistema di prenotazione ti garantisce il posto perfetto per giocare con i tuoi amici o partecipare ad eventi aperti e fare nuove conoscenze!',
      features: [
        'Prenotazione online istantanea',
        'Scelta di tavoli e sale diverse',
        'Conferma immediata via email',
        'Possibilità di modificare la prenotazione',
        'Promemoria automatici'
      ],
      buttonText: 'Prenota ora'
    },
    {
      id: 3,
      title: 'Divertiti!',
      subtitle: 'Goditi la serata, tra giochi e drink in compagnia!',
      icon: 'fas fa-wine-glass-alt',
      description: 'Arriva al locale, ritira il tuo gioco e immergiti in una serata di divertimento con gli amici. Il nostro staff è sempre disponibile per aiutarti con le regole.',
      features: [
        'Spiegazione regole inclusa',
        'Assistenza durante il gioco',
        'Snack e bevande disponibili',
        'Atmosfera accogliente e rilassata',
        'Possibilità di cambiare gioco'
      ],
      buttonText: 'Scopri di più'
    }
  ];

  // Creazione delle card
  cardsData.forEach((cardData) => {
    const card = document.createElement('div');
    card.classList.add('card');
    card.setAttribute('data-card', cardData.id);

    // Numero della card (badge) – figlio diretto di .card
    const cardNumber = document.createElement('div');
    cardNumber.classList.add('card-number');
    cardNumber.textContent = cardData.id;
    card.appendChild(cardNumber);

    // Sezione principale della card
    const cardMain = document.createElement('div');
    cardMain.classList.add('card-main');

    // Icona
    const cardIcon = document.createElement('div');
    cardIcon.classList.add('card-icon');
    const icon = document.createElement('i');
    icon.className = cardData.icon;
    cardIcon.appendChild(icon);
    cardMain.appendChild(cardIcon);

    // Titolo
    const cardTitle = document.createElement('h3');
    cardTitle.classList.add('card-title');
    cardTitle.textContent = cardData.title;
    cardMain.appendChild(cardTitle);

    // Sottotitolo
    const cardSubtitle = document.createElement('p');
    cardSubtitle.classList.add('card-subtitle');
    cardSubtitle.textContent = cardData.subtitle;
    cardMain.appendChild(cardSubtitle);

    // Freccia di espansione
    const expandArrow = document.createElement('div');
    expandArrow.classList.add('expand-arrow');
    const arrowIcon = document.createElement('i');
    arrowIcon.className = 'fas fa-chevron-down';
    expandArrow.appendChild(arrowIcon);
    cardMain.appendChild(expandArrow);

    card.appendChild(cardMain);

    // Sezione espandibile
    const cardExpanded = document.createElement('div');
    cardExpanded.classList.add('card-expanded');
    const cardContent = document.createElement('div');
    cardContent.classList.add('card-content');

    // Descrizione
    const cardDescription = document.createElement('p');
    cardDescription.classList.add('card-description');
    cardDescription.textContent = cardData.description;
    cardContent.appendChild(cardDescription);

    // Lista features
    const cardFeatures = document.createElement('ul');
    cardFeatures.classList.add('card-features');
    cardData.features.forEach((feature) => {
      const li = document.createElement('li');
      li.textContent = feature;
      cardFeatures.appendChild(li);
    });
    cardContent.appendChild(cardFeatures);

    // Bottone
    const cardButton = document.createElement('button');
    cardButton.classList.add('card-button');
    cardButton.textContent = cardData.buttonText;
    cardButton.addEventListener('click', (e) => {
      e.stopPropagation();
      alert(`Azione per: ${cardData.title}`);
    });
    cardContent.appendChild(cardButton);

    cardExpanded.appendChild(cardContent);
    card.appendChild(cardExpanded);

    // Listener per l'espansione
    card.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      const isActive = card.classList.contains('active');
      container.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
      if (!isActive) card.classList.add('active');
    });

    container.appendChild(card);
  });

  section.appendChild(container);
  return section;
}

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
  tagline.textContent = 'Dove vivrai serate indimenticabili, all insegna di avventure, divertimento e drink speciali!';
  container.appendChild(tagline);

  // Grid a due colonne: sinistra testo+feature, destra immagine
  const grid = document.createElement('div');
  grid.classList.add('welcome-grid');

  // Colonna sinistra
  const leftCol = document.createElement('div');
  leftCol.classList.add('welcome-left-col');

  const description = document.createElement('p');
  description.classList.add('welcome-description');
  description.textContent = 'Unisciti a noi per serate di giochi da tavolo, drink artigianali e tanto divertimento! Scopri il nostro locale, partecipa ai tornei e agli eventi dal vivo, e goditi un atmosfera unica con amici e appassionati di giochi.';
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
    const howSection = document.getElementById('expandable-cards-section');
    if (howSection) howSection.scrollIntoView({ behavior: 'smooth' });
  });
  container.appendChild(scrollIndicator);

  section.appendChild(container);

  // Animazione entrata
  setTimeout(() => section.classList.add('show'), 100);
  return section;
}

function createCatalogSection() {
  const section = document.createElement('section');
  section.id = 'catalog-section';
  section.classList.add('catalog-section');

  // Titolo e filtri
  const header = document.createElement('div');
  header.classList.add('catalog-header');

  const title = document.createElement('h2');
  title.classList.add('catalog-title');
  title.textContent = 'Catalogo di ';

  const filters = ['Giochi', 'Drink', 'Snack', 'Special D&D'];
  let activeFilter = 0; // default: Giochi

  const buttonsContainer = document.createElement('span');
  buttonsContainer.classList.add('catalog-filters');

  filters.forEach((label, idx) => {
    const btn = document.createElement('button');
    btn.classList.add('filter-btn');
    if (idx === activeFilter) btn.classList.add('active');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      // Aggiorna stato attivo
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = idx;
      // Aggiorna titolo
      title.textContent = `Catalogo di ${label}`;
      // Ricarica contenuto prodotto
      populateCatalogItems(label);
    });
    buttonsContainer.appendChild(btn);
  });

  header.appendChild(title);
  header.appendChild(buttonsContainer);
  section.appendChild(header);

  // Contenitore prodotti
  const listContainer = document.createElement('div');
  listContainer.classList.add('catalog-list');
  section.appendChild(listContainer);

  // Bottone "Sfoglia intero catalogo"
  const browseBtn = document.createElement('button');
  browseBtn.classList.add('browse-catalog-btn');
  browseBtn.textContent = 'Sfoglia intero catalogo';
  browseBtn.addEventListener('click', () => {
    // Naviga alla pagina completa del catalogo
    window.location.href = `/catalog?filter=${encodeURIComponent(filters[activeFilter].toLowerCase())}`;
  });
  section.appendChild(browseBtn);

  // Funzione per popolare voci (stub, sostituire con dati reali)
  function populateCatalogItems(filter) {
    listContainer.innerHTML = '';
    // Simula 5 elementi
    for (let i = 1; i <= 5; i++) {
      const item = document.createElement('div');
      item.classList.add('catalog-item');
      item.textContent = `${filter} Prodotto ${i}`;
      listContainer.appendChild(item);
    }
  }

  // Popola inizialmente con filtro di default
  populateCatalogItems(filters[activeFilter]);
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
  homepage.appendChild(createExpandableCards());
  homepage.appendChild(createCatalogSection());

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
