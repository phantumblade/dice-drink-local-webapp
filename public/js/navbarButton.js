// navButton.js

/**
 * Crea un bottone di navigazione con testo e callback click
 * @param {string} label - testo del bottone
 * @param {function} onClick - funzione da eseguire al click
 * @returns {HTMLButtonElement} bottone creato
 */
export function createNavButton(label, onClick) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.className = 'nav-button';  // usa la tua classe CSS definita per lo stile

  if (typeof onClick === 'function') {
    btn.addEventListener('click', onClick);
  }

  return btn;
}
