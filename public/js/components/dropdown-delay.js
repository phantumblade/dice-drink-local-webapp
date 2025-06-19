
document.addEventListener('DOMContentLoaded', function() {
  // Calcoliamo il ritardo (in ms) prima di chiudere il dropdown
  const CLOSE_DELAY = 40; // 40 ms è un buon compromesso
  // Troviamo tutti gli elementi che hanno un sottomenu
  const dropdownParents = document.querySelectorAll('.has-dropdown');

  dropdownParents.forEach(function(parent) {
    let closeTimeoutId = null;

    // Funzione di apertura immediata
    function openDropdown() {
      // Se era in corso un timeout di chiusura, lo annulliamo
      if (closeTimeoutId) {
        clearTimeout(closeTimeoutId);
        closeTimeoutId = null;
      }
      parent.classList.add('open');
    }

    // Funzione di programmazione chiusura con ritardo
    function closeDropdownWithDelay() {
      // Se c’è già un timeout in corso, non ne creiamo un altro
      if (closeTimeoutId) return;
      closeTimeoutId = setTimeout(function() {
        parent.classList.remove('open');
        closeTimeoutId = null;
      }, CLOSE_DELAY);
    }

    // Quando il mouse entra sul box “.has-dropdown” (sul link principale)
    parent.addEventListener('mouseenter', openDropdown);
    // Quando il mouse esce completamente dal box (sia sul link, sia sui sottomenu)
    parent.addEventListener('mouseleave', closeDropdownWithDelay);

    // In più, se il puntatore entra dentro ai singoli .dropdown-menu
    // (oppure mantiene il mouse su di essi), annulliamo la chiusura:
    const childMenu = parent.querySelector('.dropdown-menu');
    if (childMenu) {
      childMenu.addEventListener('mouseenter', openDropdown);
      childMenu.addEventListener('mouseleave', closeDropdownWithDelay);
    }
  });
});
