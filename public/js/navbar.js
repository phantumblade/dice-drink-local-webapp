// js/navbar.js

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
  logo.src = 'assets/Logo.png'; // metti il path corretto
  // Imposta il testo alternativo per l'immagine
  logo.alt = 'Logo Dice & Drink';
  logo.alt = 'Logo Dice & Drink';
  // Aggiunge la classe CSS al logo
  logo.classList.add('navbar-logo');

  // Rendi il logo cliccabile per tornare alla homepage
  logo.style.cursor = 'pointer';
  logo.addEventListener('click', () => {
    window.location.href = './'; // oppure './' se lavori in locale
  });

  // Crea l'elemento <span> per il titolo
  const title = document.createElement('span');
  // Imposta il testo del titolo
  title.textContent = 'Dice & Drink';
  // Aggiunge la classe CSS al titolo
  title.classList.add('navbar-title');

  // Aggiunge logo e titolo alla sezione sinistra
  leftSection.appendChild(logo);
  leftSection.appendChild(title);

  // --- Sezione centrale: link di navigazione ---
  // Crea il contenitore per la sezione centrale
  const centerSection = document.createElement('div');
  // Aggiunge la classe CSS per la sezione centrale
  centerSection.classList.add('navbar-center');

  // Definisce le pagine da mostrare nella navbar
  const pages = [
    { name: 'Catalogo', id: 'catalogo', hasDropdown: true },
    { name: 'Eventi', id: 'eventi', hasDropdown: true },
    { name: 'Prenotazioni', id: 'prenotazioni', hasDropdown: false },
    { name: 'AboutUs', id: 'aboutus', hasDropdown: false },

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
    // Crea un elemento <a> per il link
    const a = document.createElement('a');
    // Imposta l'attributo href (non cambia pagina)
    a.href = '#';
    // Imposta il testo del link
    a.textContent = page.name;
    // Aggiunge la classe CSS al link
    a.classList.add('navbar-link');
    // Salva l'id della pagina come data attribute
    a.dataset.page = page.id;

    // Se ha dropdown, aggiungiamo anche la freccia
    if (page.hasDropdown) {
      const arrow = document.createElement('span');
      arrow.classList.add('dropdown-arrow');
      arrow.textContent = '▾'; // simbolo freccia verso il basso
      a.appendChild(arrow);
    }

    // Listener click su link di primo livello (non sulle sottovoci)
    a.addEventListener('click', (e) => {
      // Previene il comportamento di default del link
      e.preventDefault();

      // Se la voce ha dropdown, apriamo/chiudiamo (qui non cambiamo pagina)
      if (!page.hasDropdown) {
        showPage(page.id);
      }
      // Se ha dropdown, non facciamo nulla al click (solo hover apre/chiude)
    });

    // Aggiunge il link al <li>
    li.appendChild(a);

    // Se la voce ha dropdown, creiamo il <ul class="dropdown-menu">
    if (page.hasDropdown) {
      const dropdownMenu = document.createElement('ul');
      dropdownMenu.classList.add('dropdown-menu');

      // Definiamo le sottovoci in base a page.id
      let submenuItems;
      if (page.id === 'catalogo') {
        submenuItems = [
          { name: 'Catalogo Giochi',   id: 'catalogo-giochi' },
          { name: 'Menù Drink',      id: 'menu-bevande' },
          { name: 'Menù Snack & Food', id: 'menu-snack-food' }
        ];
      } else if (page.id === 'eventi') {
        submenuItems = [
          { name: 'Tornei',           id: 'tornei' },
          { name: 'Eventi dal vivo',  id: 'eventi-dal-vivo' },
          { name: 'Proponi Torneo',   id: 'proponi-torneo' }
        ];
      } else {
        submenuItems = [];
      }

      submenuItems.forEach(sub => {
        const subLi = document.createElement('li');
        subLi.classList.add('dropdown-item');

        const subA = document.createElement('a');
        subA.href = '#';
        subA.textContent = sub.name;
        subA.classList.add('dropdown-link');
        subA.dataset.page = sub.id;

        subA.addEventListener('click', ev => {
          ev.preventDefault();
          showPage(sub.id);
        });

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

  const searchWrapper = document.createElement('div');
  searchWrapper.classList.add('search-wrapper');

  searchWrapper.appendChild(searchInput);
  searchContainer.appendChild(searchWrapper);

  rightSection.appendChild(searchContainer);

  // Crea l'icona profilo come immagine
  const profileIcon = document.createElement('span');
  profileIcon.classList.add('material-symbols-rounded', 'navbar-profile-icon');
  profileIcon.textContent = 'person_add';

  // Aggiunge l'icona profilo alla sezione destra
  rightSection.appendChild(profileIcon);

  // --- Componi la navbar completa ---
  // Aggiunge la sezione sinistra alla navbar
  nav.appendChild(leftSection);
  // Aggiunge la sezione centrale alla navbar
  nav.appendChild(centerSection);
  // Aggiunge la sezione destra alla navbar
  nav.appendChild(rightSection);

  // Ritorna l'elemento navbar completo
  return nav;
}

// Funzione di esempio per cambiare pagina (aggiorna il contenuto)
function showPage(pageId) {
  // Seleziona l'elemento con id 'content'
  const content = document.getElementById('content');
  // Cambia il testo per mostrare la pagina attuale
  content.innerHTML = `<div id="content-placeholder">Sei nella pagina: ${pageId}</div>`;
}
