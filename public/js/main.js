import { createNavbar } from './navbar.js';
import { buildFooter } from './footer.js';
import { createEventCarousel } from './eventCarousel.js';

document.body.prepend(createNavbar());

const content = document.createElement('div');
content.id = 'content';
document.body.appendChild(content);

document.body.appendChild(buildFooter());

// Funzione per mostrare la homepage
function showHomepage() {
  const content = document.getElementById('content');
  content.innerHTML = '';

  // Crea il container principale della homepage
  const homepage = document.createElement('div');
  homepage.classList.add('homepage');

  // Aggiunge il carosello degli eventi
  const eventCarousel = createEventCarousel();
  homepage.appendChild(eventCarousel);

  // Qui puoi aggiungere altre sezioni della homepage
  // Ad esempio: sezione giochi popolari, recensioni, info locale, etc.

  const welcomeSection = document.createElement('section');
  welcomeSection.classList.add('welcome-section');
  welcomeSection.innerHTML = `
    <div class="welcome-container">
      <h2>Benvenuti al Dice & Drink</h2>
      <p>Il tuo locale di riferimento per giochi da tavolo, eventi esclusivi e drink di qualità nel cuore di Novara.</p>
      <div class="welcome-features">
        <div class="feature">
          <i class="fas fa-dice"></i>
          <h3>500+ Giochi</h3>
          <p>La più grande collezione di giochi da tavolo della zona</p>
        </div>
        <div class="feature">
          <i class="fas fa-calendar-check"></i>
          <h3>Eventi Settimanali</h3>
          <p>Tornei, serate a tema e competizioni per tutti i livelli</p>
        </div>
        <div class="feature">
          <i class="fas fa-cocktail"></i>
          <h3>Drink & Snack</h3>
          <p>Bevande artigianali e snack per accompagnare le tue partite</p>
        </div>
      </div>
    </div>
  `;

  homepage.appendChild(welcomeSection);
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
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);

  // Mostra la homepage
  showHomepage();
});

const toggleTheme = () => {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  html.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
};

document.addEventListener("DOMContentLoaded", () => {
  const themeButton = document.getElementById("theme-switch-button");
  if (themeButton) {
    themeButton.addEventListener("click", toggleTheme);
  }
});
