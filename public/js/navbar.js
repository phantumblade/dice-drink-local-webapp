// js/navbar.js

export function createNavbar() {
  const nav = document.createElement('nav');
  nav.classList.add('navbar'); // per il CSS

  // Sezione sinistra: logo + titolo
  const leftSection = document.createElement('div');
  leftSection.classList.add('navbar-left');

  const logo = document.createElement('img');
  logo.src = 'assets/Logo.png'; // metti il path corretto
  logo.alt = 'Logo';
  logo.classList.add('navbar-logo');

  const title = document.createElement('span');
  title.textContent = 'Dice & Drink';
  title.classList.add('navbar-title');

  leftSection.appendChild(logo);
  leftSection.appendChild(title);

  // Sezione centrale: link di navigazione
  const centerSection = document.createElement('div');
  centerSection.classList.add('navbar-center');

  const pages = [
    { name: 'Home', id: 'home' },
    { name: 'Prenotazioni', id: 'prenotazioni' },
    { name: 'Eventi', id: 'eventi' },
    { name: 'Contatti', id: 'contatti' }
  ];

  const ul = document.createElement('ul');
  ul.classList.add('navbar-links');

  pages.forEach(page => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = page.name;
    a.dataset.page = page.id;

    a.addEventListener('click', (e) => {
      e.preventDefault();
      showPage(page.id);
    });

    li.appendChild(a);
    ul.appendChild(li);
  });

  centerSection.appendChild(ul);

  // Sezione destra: ricerca + icona profilo
  const rightSection = document.createElement('div');
  rightSection.classList.add('navbar-right');

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Cerca...';
  searchInput.classList.add('navbar-search');

  const profileIcon = document.createElement('img');
  profileIcon.src = 'assets/profile-icon.png'; // path all’icona
  profileIcon.alt = 'Profilo';
  profileIcon.classList.add('navbar-profile-icon');

  rightSection.appendChild(searchInput);
  rightSection.appendChild(profileIcon);

  // Componi tutto
  nav.appendChild(leftSection);
  nav.appendChild(centerSection);
  nav.appendChild(rightSection);

  return nav;
}

// Funzione esempio per cambiare pagina
function showPage(pageId) {
  const content = document.getElementById('content');
  content.textContent = `Sei nella pagina: ${pageId}`;
}
