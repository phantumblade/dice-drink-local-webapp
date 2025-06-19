// js/navbar.js
// AGGIORNATO: Ora usa Page.js router con href reali

// Esporta la funzione per creare la navbar
export function createNavbar() {
  // Crea l'elemento <nav>
  const nav = document.createElement('nav');
  // Aggiunge la classe CSS 'navbar'
  nav.classList.add('navbar');

  // --- Sezione sinistra: logo + titolo ---
  // Crea il contenitore per la sezione sinistra
  const leftSection = document.createElement('div');
  // Aggiunge la classe CSS per la sezione sinistra
  leftSection.classList.add('navbar-left');

  // Crea l'elemento immagine per il logo
  const logo = document.createElement('img');
  // Imposta il percorso dell'immagine del logo
  logo.src = '/assets/Logo.png'; // metti il path corretto
  // Imposta il testo alternativo per l'immagine
  logo.alt = 'Logo Dice & Drink';
  // Aggiunge la classe CSS al logo
  logo.classList.add('navbar-logo');

  // ✅ AGGIORNATO: Logo ora usa Page.js router
  logo.style.cursor = 'pointer';
  logo.addEventListener('click', (e) => {
    e.preventDefault();
    // Usa Page.js per navigare alla home
    if (window.diceRouter) {
      window.diceRouter.goHome();
    } else {
      // Fallback se Page.js non è ancora pronto
      window.location.href = '/';
    }
  });

  // Crea l'elemento <span> per il titolo
  const title = document.createElement('span');
  // Imposta il testo del titolo
  title.textContent = 'Dice & Drink';
  // Aggiunge la classe CSS al titolo
  title.classList.add('navbar-title');

  // ✅ AGGIORNATO: Titolo cliccabile per tornare home
  title.style.cursor = 'pointer';
  title.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.diceRouter) {
      window.diceRouter.goHome();
    } else {
      window.location.href = '/';
    }
  });

  // Aggiunge logo e titolo alla sezione sinistra
  leftSection.appendChild(logo);
  leftSection.appendChild(title);

  // --- Sezione centrale: link di navigazione ---
  // Crea il contenitore per la sezione centrale
  const centerSection = document.createElement('div');
  // Aggiunge la classe CSS per la sezione centrale
  centerSection.classList.add('navbar-center');

  // ✅ AGGIORNATO: Pagine con URL reali per Page.js
  const pages = [
    {
      name: 'Catalogo',
      id: 'catalogo',
      href: '/catalogo',
      hasDropdown: true
    },
    {
      name: 'Eventi',
      id: 'eventi',
      href: '/eventi',
      hasDropdown: true
    },
    {
      name: 'Prenotazioni',
      id: 'prenotazioni',
      href: '/prenotazioni',
      hasDropdown: false
    },
    {
      name: 'AboutUs',
      id: 'aboutus',
      href: '/about',
      hasDropdown: false
    }
  ];

  // Crea la lista non ordinata per i link
  const ul = document.createElement('ul');
  // Aggiunge la classe CSS alla lista
  ul.classList.add('navbar-links');

  // Per ogni pagina definita...
  pages.forEach(page => {
    // Crea un elemento <li>
    const li = document.createElement('li');
    li.classList.add('navbar-item');

    // Se la pagina ha un dropdown, aggiungi la classe
    if (page.hasDropdown) {
        li.classList.add('has-dropdown');
    }

    // ✅ AGGIORNATO: Crea link con href reale
    const a = document.createElement('a');
    // Imposta l'attributo href REALE per Page.js
    a.href = page.href;
    // Imposta il testo del link
    a.textContent = page.name;
    // Aggiunge la classe CSS al link
    a.classList.add('navbar-link');
    // Salva l'id della pagina come data attribute per compatibilità
    a.dataset.page = page.id;

    // Se ha dropdown, aggiungiamo anche la freccia
    if (page.hasDropdown) {
      const arrow = document.createElement('span');
      arrow.classList.add('dropdown-arrow');
      arrow.textContent = '▾'; // simbolo freccia verso il basso
      a.appendChild(arrow);
    }

    // ✅ AGGIORNATO: Gestione click per dropdown
    a.addEventListener('click', (e) => {
      // Se la voce ha dropdown, previeni navigazione immediata
      if (page.hasDropdown) {
        e.preventDefault();
        // Non navigare, lascia che l'hover gestisca il dropdown
        // Page.js gestirà automaticamente i link dei sottomenu
      }
      // Se NON ha dropdown, Page.js gestirà automaticamente la navigazione
    });

    // Aggiunge il link al <li>
    li.appendChild(a);

    // ✅ AGGIORNATO: Dropdown con link href reali
    if (page.hasDropdown) {
      const dropdownMenu = document.createElement('ul');
      dropdownMenu.classList.add('dropdown-menu');

      // Definiamo le sottovoci con URL reali
      let submenuItems;
      if (page.id === 'catalogo') {
        submenuItems = [
          {
            name: 'Catalogo Giochi',
            id: 'catalogo-giochi',
            href: '/catalogo/giochi'
          },
          {
            name: 'Menù Drink',
            id: 'menu-bevande',
            href: '/catalogo/drink'
          },
          {
            name: 'Menù Snack & Food',
            id: 'menu-snack-food',
            href: '/catalogo/snack'
          }
        ];
      } else if (page.id === 'eventi') {
        submenuItems = [
          {
            name: 'Tornei',
            id: 'tornei',
            href: '/tornei'
          },
          {
            name: 'Eventi dal vivo',
            id: 'eventi-dal-vivo',
            href: '/eventi'
          },
          {
            name: 'Proponi Torneo',
            id: 'proponi-torneo',
            href: '/proponi-torneo'
          }
        ];
      } else {
        submenuItems = [];
      }

      submenuItems.forEach(sub => {
        const subLi = document.createElement('li');
        subLi.classList.add('dropdown-item');

        // ✅ AGGIORNATO: Link dropdown con href reale
        const subA = document.createElement('a');
        subA.href = sub.href; // URL reale per Page.js
        subA.textContent = sub.name;
        subA.classList.add('dropdown-link');
        subA.dataset.page = sub.id; // Mantieni per compatibilità

        // ✅ RIMOSSO: addEventListener click non più necessario
        // Page.js gestirà automaticamente la navigazione

        subLi.appendChild(subA);
        dropdownMenu.appendChild(subLi);
      });

      li.appendChild(dropdownMenu);
    }

    // Aggiunge il <li> alla lista
    ul.appendChild(li);
  });

  // Aggiunge la lista dei link alla sezione centrale
  centerSection.appendChild(ul);

  // --- Sezione destra: ricerca + icona profilo ---
  // Crea il contenitore per la sezione destra
  const rightSection = document.createElement('div');
  // Aggiunge la classe CSS per la sezione destra
  rightSection.classList.add('navbar-right');

  // Crea il campo di input per la ricerca
  const searchInput = document.createElement('input');
  // Imposta il tipo di input come ricerca
  searchInput.type = 'search';
  // Imposta il placeholder del campo ricerca
  searchInput.placeholder = 'Cerca...';
  // Aggiunge la classe CSS al campo ricerca
  searchInput.classList.add('navbar-search');

  const searchContainer = document.createElement('div');
  searchContainer.classList.add('navbar-search-container');

  // Direttamente nel container senza wrapper
  searchContainer.appendChild(searchInput);
  rightSection.appendChild(searchContainer);

  // ✅ AGGIORNATO: Icona profilo migliorata
  const profileIcon = document.createElement('span');
  profileIcon.classList.add('material-symbols-rounded', 'navbar-profile-icon');
  profileIcon.textContent = 'person_add';

  // Configura l'icona profilo
  profileIcon.style.cursor = 'pointer';
  profileIcon.title = 'Clicca per accedere';

  // Event listener per l'icona profilo (mantenuto invariato)
  profileIcon.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      console.log('👤 Click su icona profilo da navbar');

      // Usa il sistema SimpleAuth se disponibile
      if (window.SimpleAuth) {
          console.log('✅ Uso SimpleAuth dal navbar');
          window.SimpleAuth.handleProfileClick(e);
      } else {
          console.warn('⚠️ SimpleAuth non ancora caricato, riprovo...');

          // Riprova dopo un breve delay
          setTimeout(() => {
              if (window.SimpleAuth) {
                  window.SimpleAuth.handleProfileClick(e);
              } else {
                  console.error('❌ SimpleAuth non disponibile');
                  alert('Sistema di autenticazione non disponibile.\nRicarica la pagina e riprova.');
              }
          }, 100);
      }
  });

  // Aggiunge l'icona profilo alla sezione destra
  rightSection.appendChild(profileIcon);

  // --- Componi la navbar completa ---
  // Aggiunge la sezione sinistra alla navbar
  nav.appendChild(leftSection);
  // Aggiunge la sezione centrale alla navbar
  nav.appendChild(centerSection);
  // Aggiunge la sezione destra alla navbar
  nav.appendChild(rightSection);

  // ✅ AGGIUNTO: Setup indicatore pagina attiva dopo creazione
  setupActivePageIndicator(nav);

  // Ritorna l'elemento navbar completo
  return nav;
}

// ✅ NUOVO: Funzione per gestire indicatore pagina attiva
function setupActivePageIndicator(navbar) {
  // Funzione per aggiornare lo stato attivo dei link
  function updateActiveState() {
    // Rimuovi active da tutti i link
    navbar.querySelectorAll('.navbar-link, .dropdown-link').forEach(link => {
      link.classList.remove('active');
      // Rimuovi anche da parent li
      link.closest('li')?.classList.remove('active');
    });

    // Ottieni il path corrente
    const currentPath = window.location.pathname;

    // Trova il link corrispondente al path corrente
    const activeLink = navbar.querySelector(`a[href="${currentPath}"]`);

    if (activeLink) {
      activeLink.classList.add('active');
      activeLink.closest('li')?.classList.add('active');

      // Se è un link dropdown, attiva anche il parent
      if (activeLink.classList.contains('dropdown-link')) {
        const parentItem = activeLink.closest('.has-dropdown');
        if (parentItem) {
          parentItem.classList.add('active');
          parentItem.querySelector('.navbar-link')?.classList.add('active');
        }
      }
    }
  }

  // Aggiorna stato iniziale
  setTimeout(updateActiveState, 100);

  // Ascolta i cambi di rotta di Page.js
  let lastPath = window.location.pathname;
  const observer = new MutationObserver(() => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      updateActiveState();
    }
  });

  // Ascolta anche eventi popstate (back/forward)
  window.addEventListener('popstate', updateActiveState);

  // Backup: controlla periodicamente (fallback)
  setInterval(() => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      updateActiveState();
    }
  }, 1000);
}

// ✅ AGGIUNTO: Utility per debugging
if (window.location.hostname === 'localhost') {
  window.debugNavbar = () => {
    console.log('🔍 Navbar Debug Info:');
    console.log('Current URL:', window.location.pathname);
    console.log('Active links:', document.querySelectorAll('.navbar-link.active, .dropdown-link.active'));
    console.log('All navbar links:', document.querySelectorAll('.navbar-link, .dropdown-link'));
  };
}
