// ==========================================
// MAIN.JS - APP ENTRY POINT & ROUTER
// ==========================================
//
// SCOPO:
// - Setup iniziale dell'applicazione SPA
// - Gestione routing client-side tra pagine
// - Configurazione layout fisso (navbar + footer)
// - Orchestrazione generale dell'app

import { createNavbar } from './components/navbar.js';
import { buildFooter } from './components/footer.js';
import { showHomepage } from './pages/homepage.js';

// ==========================================
// SETUP LAYOUT FISSO DELL'APPLICAZIONE
// ==========================================

// Crea e inserisce la navbar in cima alla pagina
document.body.prepend(createNavbar());

// Crea il container principale per il contenuto dinamico delle pagine
const content = document.createElement('div');
content.id = 'content';
content.classList.add('main-content'); // Classe CSS per styling
document.body.appendChild(content);

// Crea e inserisce il footer in fondo alla pagina
document.body.appendChild(buildFooter());

// ==========================================
// SISTEMA ROUTING CLIENT-SIDE
// ==========================================

/**
 * Router principale dell'applicazione
 * Gestisce la navigazione tra le diverse pagine della SPA
 *
 * @param {string} pageId - ID della pagina da mostrare
 *
 * PAGINE DISPONIBILI:
 * - homepage/home: Pagina principale con carousel, catalogo preview, ecc.
 * - catalogo-giochi: Catalogo completo giochi da tavolo (TODO)
 * - menu-bevande: Menu drink e cocktail (TODO)
 * - menu-snack-food: Menu snack e cibo (TODO)
 * - prenotazioni: Sistema prenotazioni tavoli (TODO)
 * - tornei: Lista tornei e eventi (TODO)
 * - eventi-dal-vivo: Eventi live e serate speciali (TODO)
 * - proponi-torneo: Form per proporre tornei (TODO)
 * - aboutus: Pagina informazioni locale (TODO)
 * - login: Login e registrazione utenti (TODO)
 * - profile: Area personale utente (TODO)
 * - admin: Dashboard amministrativa (TODO)
 */
window.showPage = (pageId) => {
  // Pulizia contenuto precedente
  const content = document.getElementById('content');
  if (!content) {
    console.error('Container #content non trovato!');
    return;
  }

  // Debug routing
  console.log(`🧭 Navigazione verso: ${pageId}`);

  // Router switch - gestisce tutte le pagine dell'app
  switch(pageId) {
    // ==========================================
    // HOMEPAGE
    // ==========================================
    case 'homepage':
    case 'home':
      showHomepage();
      break;

    // ==========================================
    // CATALOGO E MENU (TODO)
    // ==========================================
    case 'catalogo-giochi':
      showPlaceholderPage('Catalogo Giochi', 'Lista completa dei giochi da tavolo disponibili');
      // TODO: import('./pages/catalog.js').then(m => m.showGamesCatalog());
      break;

    case 'menu-bevande':
      showPlaceholderPage('Menu Bevande', 'Drink, cocktail e bevande del locale');
      // TODO: import('./pages/catalog.js').then(m => m.showDrinksCatalog());
      break;

    case 'menu-snack-food':
      showPlaceholderPage('Menu Snack & Food', 'Snack, appetizer e piatti da condividere');
      // TODO: import('./pages/catalog.js').then(m => m.showSnacksCatalog());
      break;

    // ==========================================
    // PRENOTAZIONI E EVENTI (TODO)
    // ==========================================
    case 'prenotazioni':
      showPlaceholderPage('Prenotazioni', 'Prenota il tuo tavolo per una serata di gioco');
      // TODO: import('./pages/booking.js').then(m => m.showBookingPage());
      break;

    case 'tornei':
      showPlaceholderPage('Tornei', 'Partecipa ai tornei organizzati dal locale');
      // TODO: import('./pages/events.js').then(m => m.showTournaments());
      break;

    case 'eventi-dal-vivo':
      showPlaceholderPage('Eventi dal Vivo', 'Serate speciali, workshop e eventi live');
      // TODO: import('./pages/events.js').then(m => m.showLiveEvents());
      break;

    case 'proponi-torneo':
      showPlaceholderPage('Proponi Torneo', 'Proponi un torneo per il tuo gioco preferito');
      // TODO: import('./pages/events.js').then(m => m.showProposeTournament());
      break;

    // ==========================================
    // INFO E SERVIZI (TODO)
    // ==========================================
    case 'aboutus':
      showPlaceholderPage('About Us', 'Chi siamo, la nostra storia e la nostra passione');
      // TODO: import('./pages/about.js').then(m => m.showAboutPage());
      break;

    // ==========================================
    // AREA UTENTE (TODO)
    // ==========================================
    case 'login':
      showPlaceholderPage('Login', 'Accedi al tuo account o registrati');
      // TODO: import('./pages/auth.js').then(m => m.showLoginPage());
      break;

    case 'profile':
      showPlaceholderPage('Il Mio Profilo', 'Gestisci il tuo account e le tue prenotazioni');
      // TODO: import('./pages/profile.js').then(m => m.showProfilePage());
      break;

    case 'admin':
      showPlaceholderPage('Dashboard Admin', 'Pannello di controllo amministrativo');
      // TODO: import('./pages/admin.js').then(m => m.showAdminDashboard());
      break;

    // ==========================================
    // FALLBACK
    // ==========================================
    default:
      console.warn(`⚠️ Pagina non trovata: ${pageId}. Reindirizzamento alla homepage.`);
      showHomepage();
      break;
  }

  // Scroll to top dopo il cambio pagina
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Mostra una pagina placeholder per le funzionalità non ancora implementate
 * Utile durante lo sviluppo per testare il routing
 */
function showPlaceholderPage(title, description) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="placeholder-page">
      <div class="placeholder-container">
        <div class="placeholder-icon">
          <i class="fas fa-tools"></i>
        </div>
        <h1 class="placeholder-title">${title}</h1>
        <p class="placeholder-description">${description}</p>
        <div class="placeholder-status">
          <span class="status-badge">🚧 In sviluppo</span>
        </div>
        <button class="btn-primary placeholder-back-btn" onclick="showPage('homepage')">
          <i class="fas fa-home"></i>
          Torna alla Homepage
        </button>
      </div>
    </div>
  `;

  // Aggiungi stili inline per il placeholder (temporaneo)
  if (!document.getElementById('placeholder-styles')) {
    const styles = document.createElement('style');
    styles.id = 'placeholder-styles';
    styles.textContent = `
      .placeholder-page {
        min-height: 70vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      .placeholder-container {
        text-align: center;
        background: white;
        padding: 3rem;
        border-radius: 20px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        max-width: 500px;
      }
      .placeholder-icon {
        font-size: 4rem;
        color: #667eea;
        margin-bottom: 1.5rem;
      }
      .placeholder-title {
        color: #2d3748;
        margin-bottom: 1rem;
        font-size: 2rem;
      }
      .placeholder-description {
        color: #718096;
        margin-bottom: 2rem;
        line-height: 1.6;
      }
      .status-badge {
        background: #fed7c3;
        color: #c53030;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-weight: bold;
        font-size: 0.9rem;
      }
      .placeholder-back-btn {
        margin-top: 2rem;
        background: #667eea;
        color: white;
        border: none;
        padding: 0.75rem 2rem;
        border-radius: 10px;
        cursor: pointer;
        font-size: 1rem;
        transition: transform 0.2s;
      }
      .placeholder-back-btn:hover {
        transform: translateY(-2px);
        background: #5a67d8;
      }
    `;
    document.head.appendChild(styles);
  }
}

// ==========================================
// INIZIALIZZAZIONE APP
// ==========================================

/**
 * Avvio dell'applicazione quando il DOM è pronto
 * - Carica la homepage come pagina default
 * - Inizializza eventuali servizi globali
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Dice & Drink SPA - Applicazione avviata');

  // Carica la homepage come pagina iniziale
  showHomepage();

  // TODO: Inizializza servizi globali
  // - Controllo autenticazione esistente
  // - Setup event listeners globali
  // - Caricamento configurazioni

  console.log('✅ Setup completato - App pronta');
});
