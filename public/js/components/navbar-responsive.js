// js/navbar-responsive.js
// Sistema per gestire ricerca espandibile e responsive behavior

class NavbarResponsive {
    constructor() {
        this.searchContainer = null;
        this.searchInput = null;
        this.searchOverlay = null;
        this.isSearchExpanded = false;

        this.init();
    }

    init() {
        // Aspetta che la navbar sia creata
        this.waitForNavbar();
    }

    waitForNavbar() {
        const checkNavbar = () => {
            this.searchContainer = document.querySelector('.navbar-search-container');

            if (this.searchContainer) {
                this.setupSearchToggle();
                this.setupResponsiveLayout();
                console.log('✅ Navbar responsive attivata');
            } else {
                // Riprova dopo 100ms
                setTimeout(checkNavbar, 100);
            }
        };

        checkNavbar();
    }

    setupSearchToggle() {
        this.searchInput = this.searchContainer.querySelector('.navbar-search');

        // Event listener per l'icona lente (solo su mobile)
        this.searchContainer.addEventListener('click', (e) => {
            // Solo se è l'icona e non l'input
            if (e.target === this.searchContainer && window.innerWidth <= 767) {
                e.preventDefault();
                this.toggleSearch();
            }
        });

        // Event listener per chiudere con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isSearchExpanded) {
                this.closeSearch();
            }
        });

        // Event listener per il click sull'input (impedisce chiusura)
        if (this.searchInput) {
            this.searchInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    toggleSearch() {
        if (this.isSearchExpanded) {
            this.closeSearch();
        } else {
            this.openSearch();
        }
    }

    openSearch() {
        if (this.isSearchExpanded) return;

        this.isSearchExpanded = true;
        this.searchContainer.classList.add('expanded');

        // Crea overlay per chiudere cliccando fuori
        this.createOverlay();

        // Focus sull'input dopo l'animazione
        setTimeout(() => {
            if (this.searchInput) {
                this.searchInput.focus();
            }
        }, 100);

        console.log('🔍 Ricerca espansa');
    }

    closeSearch() {
        if (!this.isSearchExpanded) return;

        this.isSearchExpanded = false;
        this.searchContainer.classList.remove('expanded');

        // Rimuovi overlay
        this.removeOverlay();

        // Pulisci il campo se vuoto
        if (this.searchInput && this.searchInput.value.trim() === '') {
            this.searchInput.blur();
        }

        console.log('🔍 Ricerca chiusa');
    }

    createOverlay() {
        if (this.searchOverlay) return;

        this.searchOverlay = document.createElement('div');
        this.searchOverlay.className = 'search-overlay';

        this.searchOverlay.addEventListener('click', () => {
            this.closeSearch();
        });

        document.body.appendChild(this.searchOverlay);
    }

    removeOverlay() {
        if (this.searchOverlay) {
            this.searchOverlay.remove();
            this.searchOverlay = null;
        }
    }

    setupResponsiveLayout() {
        // Gestisce il cambio di layout quando la finestra cambia dimensione
        let resizeTimeout;

        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 150);
        });

        // Setup iniziale
        this.handleResize();
    }

    handleResize() {
        const width = window.innerWidth;

        // Chiudi ricerca se si passa a desktop
        if (width > 767 && this.isSearchExpanded) {
            this.closeSearch();
        }

        // Aggiorna layout per mobile small
        if (width <= 480) {
            this.setupTwoRowLayout();
        } else {
            this.removeTwoRowLayout();
        }

        console.log(`📱 Navbar adattata per ${width}px`);
    }

    setupTwoRowLayout() {
        const navbar = document.querySelector('.navbar');
        if (!navbar || navbar.classList.contains('two-row-layout')) return;

        navbar.classList.add('two-row-layout');

        // Riorganizza elementi se necessario
        const leftSection = navbar.querySelector('.navbar-left');
        const centerSection = navbar.querySelector('.navbar-center');
        const rightSection = navbar.querySelector('.navbar-right');

        if (leftSection && centerSection && rightSection) {
            // Crea contenitori per le righe se non esistono
            if (!navbar.querySelector('.navbar-top-row')) {
                const topRow = document.createElement('div');
                topRow.className = 'navbar-top-row';

                const bottomRow = document.createElement('div');
                bottomRow.className = 'navbar-bottom-row';

                // Sposta elementi
                topRow.appendChild(leftSection);
                topRow.appendChild(rightSection);
                bottomRow.appendChild(centerSection);

                // Pulisci e riorganizza navbar
                navbar.innerHTML = '';
                navbar.appendChild(topRow);
                navbar.appendChild(bottomRow);
            }
        }
    }

    removeTwoRowLayout() {
        const navbar = document.querySelector('.navbar');
        if (!navbar || !navbar.classList.contains('two-row-layout')) return;

        navbar.classList.remove('two-row-layout');

        // Ripristina layout originale se necessario
        const topRow = navbar.querySelector('.navbar-top-row');
        const bottomRow = navbar.querySelector('.navbar-bottom-row');

        if (topRow && bottomRow) {
            const leftSection = topRow.querySelector('.navbar-left');
            const centerSection = bottomRow.querySelector('.navbar-center');
            const rightSection = topRow.querySelector('.navbar-right');

            // Ripristina struttura originale
            navbar.innerHTML = '';
            if (leftSection) navbar.appendChild(leftSection);
            if (centerSection) navbar.appendChild(centerSection);
            if (rightSection) navbar.appendChild(rightSection);
        }
    }

    // Metodo pubblico per controllare lo stato
    getSearchState() {
        return {
            isExpanded: this.isSearchExpanded,
            currentWidth: window.innerWidth,
            isMobile: window.innerWidth <= 767,
            isSmallMobile: window.innerWidth <= 480
        };
    }
}

// Auto-inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    // Aspetta che il sistema navbar principale sia pronto
    setTimeout(() => {
        window.navbarResponsive = new NavbarResponsive();
        console.log('🚀 Sistema navbar responsive inizializzato');
    }, 500);
});

// Esporta per uso esterno
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavbarResponsive;
}
