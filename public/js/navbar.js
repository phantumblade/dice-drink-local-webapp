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
  // Aggiunge la classe CSS al logo
  logo.classList.add('navbar-logo');

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
    { name: 'Home', id: 'home' },
    { name: 'Prenotazioni', id: 'prenotazioni' },
    { name: 'Eventi', id: 'eventi' },
    { name: 'AboutUs', id: 'AboutUs' }

  ];

  // Crea la lista non ordinata per i link
  const ul = document.createElement('ul');
  // Aggiunge la classe CSS alla lista
  ul.classList.add('navbar-links');

  // Per ogni pagina definita...
  pages.forEach(page => {
    // Crea un elemento <li>
    const li = document.createElement('li');
    // Crea un elemento <a> per il link
    const a = document.createElement('a');
    // Imposta l'attributo href (non cambia pagina)
    a.href = '#';
    // Imposta il testo del link
    a.textContent = page.name;
    // Salva l'id della pagina come data attribute
    a.dataset.page = page.id;

    // Aggiunge un listener per il click sul link
    a.addEventListener('click', (e) => {
      // Previene il comportamento di default del link
      e.preventDefault();
      // Chiama la funzione per mostrare la pagina selezionata
      showPage(page.id);
    });

    // Aggiunge il link al <li>
    li.appendChild(a);
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
  content.textContent = `Sei nella pagina: ${pageId}`;
}
