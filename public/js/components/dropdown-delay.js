
document.addEventListener('DOMContentLoaded', function() {
  const CLOSE_DELAY = 40;
  const dropdownParents = document.querySelectorAll('.has-dropdown');

  dropdownParents.forEach(function(parent) {
    let closeTimeoutId = null;

    // Funzione di apertura immediata
    function openDropdown() {
      if (closeTimeoutId) {
        clearTimeout(closeTimeoutId);
        closeTimeoutId = null;
      }
      parent.classList.add('open');
    }

    function closeDropdownWithDelay() {
      if (closeTimeoutId) return;
      closeTimeoutId = setTimeout(function() {
        parent.classList.remove('open');
        closeTimeoutId = null;
      }, CLOSE_DELAY);
    }

    parent.addEventListener('mouseenter', openDropdown);
    parent.addEventListener('mouseleave', closeDropdownWithDelay);

    const childMenu = parent.querySelector('.dropdown-menu');
    if (childMenu) {
      childMenu.addEventListener('mouseenter', openDropdown);
      childMenu.addEventListener('mouseleave', closeDropdownWithDelay);
    }
  });
});
