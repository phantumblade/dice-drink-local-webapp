// js/pages/catalog.js
// SCOPO: Pagina catalogo per giochi, drink e snack
// RELAZIONI: Chiamata da main.js, usa API /api/games, /api/drinks, /api/snacks

console.log('🎮 Caricamento pagina catalogo...');

// ==========================================
// CONFIGURAZIONE CATALOGO
// ==========================================

const CATALOG_CONFIG = {
    API_ENDPOINTS: {
        games: '/api/games',
        drinks: '/api/drinks',  // ✅ REALE - Ora funzionante
        snacks: '/api/snacks'   // ✅ REALE - Ora funzionante
    },
    CATEGORIES: {
        giochi: {
            label: 'Giochi',
            icon: 'fas fa-dragon',
            endpoint: 'games'
        },
        drink: {
            label: 'Drink',
            icon: 'fas fa-cocktail',
            endpoint: 'drinks'
        },
        snack: {
            label: 'Snack',
            icon: 'fas fa-cookie-bite',
            endpoint: 'snacks'
        }
    }
};

// ==========================================
// CLASSE MANAGER CATALOGO
// ==========================================

class CatalogPageManager {
    constructor() {
        this.currentCategory = 'giochi';
        this.currentItems = [];
        this.isModalOpen = false;
        this.searchTerm = '';
        this.selectedFilters = [];         // ← nuovo

        console.log('✅ CatalogPageManager inizializzato');
    }

    // ==========================================
    // CARICAMENTO DATI DA API - ORA TUTTO REALE
    // ==========================================

    async loadCategoryData(category) {
        const config = CATALOG_CONFIG.CATEGORIES[category];

        if (!config) {
            throw new Error(`Categoria ${category} non supportata`);
        }

        const apiEndpoint = CATALOG_CONFIG.API_ENDPOINTS[config.endpoint];

        try {
            console.log(`🔄 Caricamento dati da ${apiEndpoint}...`);

            const response = await fetch(apiEndpoint);

            if (!response.ok) {
                throw new Error(`Errore API ${apiEndpoint}: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Gestisce sia array diretto che wrapper con paginazione
            this.currentItems = Array.isArray(data) ? data : data[config.endpoint] || data;

            console.log(`📊 Caricati ${this.currentItems.length} items per ${category}`);

        } catch (error) {
            console.error(`❌ Errore caricamento ${category}:`, error);
            throw new Error(`Impossibile caricare ${category}: ${error.message}`);
        }
    }

    // ==========================================
    // GENERAZIONE HTML PRINCIPALE
    // ==========================================

    createCatalogHTML() {
        return `
            <div class="catalog-page">
                ${this.createHeaderHTML()}
                ${this.createStatsBarHTML()}
                ${this.createItemsGridHTML()}
                ${this.createModalHTML()}
            </div>
        `;
    }

    createHeaderHTML() {
        const categories = Object.keys(CATALOG_CONFIG.CATEGORIES);

        return `
            <div class="catalog-header">
                <h1 class="catalog-title">
                    <i class="fas fa-dice-d20"></i>
                    Catalogo Completo
                </h1>
                <p class="catalog-subtitle">
                    Scopri la nostra collezione di giochi da tavolo, drink artigianali e snack gourmet
                </p>

                <div class="filter-switch">
                    ${categories.map(cat => {
                        const config = CATALOG_CONFIG.CATEGORIES[cat];
                        const isActive = cat === this.currentCategory ? 'active' : '';

                        return `
                            <button class="filter-btn ${isActive}" data-category="${cat}">
                                <i class="${config.icon}"></i> ${config.label}
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    createStatsBarHTML() {
        const stats = this.getCurrentStats();

        return `
            <div class="stats-bar">
                <div class="stats-info">
                    <div class="stat-item">
                        <i class="${stats.icon}"></i>
                        <span class="stat-number">${stats.count}</span>
                        <span class="stat-text">${stats.label}</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-star"></i>
                        <span class="stat-number">${stats.rating}</span>
                        <span class="stat-text">Rating Medio</span>
                    </div>
                    <div class="stat-item">
                        <i class="${stats.extraIcon}"></i>
                        <span class="stat-number">${stats.extraValue}</span>
                        <span class="stat-text">${stats.extraLabel}</span>
                    </div>
                </div>

                ${this.currentCategory === 'drink' ? this.createAdvancedFiltersHTML() : ''}

                <div class="search-container">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" class="search-input"
                           placeholder="Cerca ${this.currentCategory}..."
                           value="${this.searchTerm}">
                </div>
            </div>
        `;
    }

    createAdvancedFiltersHTML() {
        return `
            <div class="advanced-filters">
                <button class="filter-chip alcoholic" data-filter="alcoholic">
                    <i class="fas fa-wine-glass"></i> Alcolico
                </button>
                <button class="filter-chip non-alcoholic" data-filter="non-alcoholic">
                    <i class="fas fa-coffee"></i> Analcolico
                </button>
                <button class="filter-chip premium" data-filter="premium">
                    <i class="fas fa-crown"></i> Premium
                </button>
                <button class="filter-chip economic" data-filter="economic">
                    <i class="fas fa-piggy-bank"></i> Economico
                </button>
            </div>
        `;
    }

    createItemsGridHTML() {
        const filteredItems = this.getFilteredItems();

        if (filteredItems.length === 0) {
            return this.createEmptyStateHTML();
        }

        return `
            <div class="items-grid" id="itemsGrid">
                ${filteredItems.map(item => this.createItemCardHTML(item)).join('')}
            </div>
        `;
    }

    createItemCardHTML(item) {
        if (this.currentCategory === 'giochi') {
            return this.createGameCardHTML(item);
        } else if (this.currentCategory === 'drink') {
            return this.createDrinkCardHTML(item);
        } else if (this.currentCategory === 'snack') {
            return this.createSnackCardHTML(item);
        }
    }

    createGameCardHTML(game) {
        const imageUrl = game.imageUrl || '/assets/games/default.jpg';
        const price = game.rentalPrice ? `€${game.rentalPrice}/sera` : 'Prezzo su richiesta';

        return `
            <div class="item-card game-card" data-item-id="${game.id}">
                <div class="item-image" style="background-image: url('${imageUrl}');">
                    <button class="expand-btn" onclick="window.catalogPageManager.openItemModal(${game.id})">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>

                <div class="item-content">
                    <h3 class="item-title">${game.name}</h3>
                    <span class="item-category">${game.category || 'Gioco da Tavolo'}</span>

                    <div class="item-stats">
                        <div class="item-stat">
                            <div class="item-stat-icon">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="item-stat-value">${game.minPlayers}-${game.maxPlayers}</div>
                            <div class="item-stat-label">Giocatori</div>
                        </div>
                        <div class="item-stat">
                            <div class="item-stat-icon">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="item-stat-value">${this.formatDuration(game.durationMinutes)}</div>
                            <div class="item-stat-label">Durata</div>
                        </div>
                        <div class="item-stat">
                            <div class="item-stat-icon">
                                <i class="fas fa-brain"></i>
                            </div>
                            <div class="item-stat-value">${this.formatDifficulty(game.difficultyLevel)}</div>
                            <div class="item-stat-label">Difficoltà</div>
                        </div>
                    </div>

                    <button class="rent-btn" onclick="window.catalogPageManager.rentItem(${game.id})">
                        <i class="fas fa-shopping-cart"></i>
                        Noleggia - ${price}
                    </button>
                </div>
            </div>
        `;
    }

    createDrinkCardHTML(drink) {
        return `
            <div class="item-card drink-card" data-item-id="${drink.id}">
                <div class="item-image" style="background-image: url('${drink.imageUrl || '/assets/drinks/default.jpg'}');">
                    <button class="expand-btn" onclick="window.catalogPageManager.openItemModal(${drink.id})">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>

                <div class="item-content">
                    <h3 class="item-title">${drink.name}</h3>
                    <span class="item-category ${drink.isAlcoholic ? 'alcoholic' : 'non-alcoholic'}">
                        ${drink.isAlcoholic ? 'Alcolico' : 'Analcolico'}
                    </span>

                    <p class="item-description">
                        ${drink.description || 'Delizioso drink preparato con cura'}
                    </p>

                    <div class="item-stats">
                        <div class="item-stat">
                            <div class="item-stat-icon">
                                <i class="fas fa-flask"></i>
                            </div>
                            <div class="item-stat-value">${this.formatBaseSpirit(drink.baseSpirit)}</div>
                            <div class="item-stat-label">Base</div>
                        </div>
                        <div class="item-stat">
                            <div class="item-stat-icon">
                                <i class="fas fa-euro-sign"></i>
                            </div>
                            <div class="item-stat-value">€${drink.price}</div>
                            <div class="item-stat-label">Prezzo</div>
                        </div>
                        <div class="item-stat">
                            <div class="item-stat-icon">
                                <i class="fas fa-star"></i>
                            </div>
                            <div class="item-stat-value">${drink.price >= 8.00 ? 'Premium' : 'Classic'}</div>
                            <div class="item-stat-label">Qualità</div>
                        </div>
                    </div>

                    <button class="rent-btn" onclick="window.catalogPageManager.orderItem(${drink.id})">
                        <i class="fas fa-glass-cheers"></i>
                        Ordina - €${drink.price}
                    </button>
                </div>
            </div>
        `;
    }

    createSnackCardHTML(snack) {
        return `
            <div class="item-card snack-card" data-item-id="${snack.id}">
                <div class="item-image" style="background-image: url('${snack.imageUrl || '/assets/snacks/default.jpg'}');">
                    <button class="expand-btn" onclick="window.catalogPageManager.openItemModal(${snack.id})">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>

                <div class="item-content">
                    <h3 class="item-title">${snack.name}</h3>
                    <span class="item-category ${snack.isSweet ? 'sweet' : 'savory'}">
                        ${snack.isSweet ? 'Dolce' : 'Salato'}
                    </span>

                    <p class="item-description">
                        ${snack.description || 'Delizioso snack per accompagnare i tuoi giochi'}
                    </p>
                        ${snack.description || 'Delizioso snack per accompagnare i tuoi giochi'}
                    </p>

                    <div class="item-stats">
                        <div class="item-stat">
                            <div class="item-stat-icon">
                                <i class="fas fa-utensils"></i>
                            </div>
                            <div class="item-stat-value">${snack.isSweet ? '🍫' : '🧀'}</div>
                            <div class="item-stat-label">Tipo</div>
                        </div>
                        <div class="item-stat">
                            <div class="item-stat-icon">
                                <i class="fas fa-leaf"></i>
                            </div>
                            <div class="item-stat-value">${this.getIngredientCategory(snack.mainIngredient)}</div>
                            <div class="item-stat-label">Categoria</div>
                        </div>
                        <div class="item-stat">
                            <div class="item-stat-icon">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="item-stat-value">${this.getBestTime(snack)}</div>
                            <div class="item-stat-label">Momento</div>
                        </div>
                    </div>

                    <button class="rent-btn" onclick="window.catalogPageManager.orderItem(${snack.id})">
                        <i class="fas fa-shopping-cart"></i>
                        Ordina - €${snack.price}
                    </button>
                </div>
            </div>
        `;
    }

    // ==========================================
    // MODAL PER DETTAGLI ITEM
    // ==========================================

    createModalHTML() {
        return `
            <div class="modal-overlay" id="itemModal">
                <div class="modal-content">
                    <button class="modal-close" onclick="window.catalogPageManager.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>

                    <div class="modal-image" id="modalImage"></div>

                    <div class="modal-body">
                        <div class="modal-title">
                            <span id="modalTitle">Nome Item</span>
                            <button class="wishlist-btn" onclick="window.catalogPageManager.addToWishlist()">
                                <i class="fas fa-heart"></i>
                            </button>
                        </div>

                        <p class="modal-description" id="modalDescription">
                            Descrizione dettagliata dell'item...
                        </p>

                        <div class="modal-stats" id="modalStats">
                            <!-- Stats dinamiche -->
                        </div>

                        <div class="modal-actions">
                            <button class="btn-primary-c" id="modalActionBtn">
                                <i class="fas fa-shopping-cart"></i>
                                Azione Principale
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ==========================================
    // GESTIONE EVENTI
    // ==========================================

  setupEvents() {
    // 1) Bottoni di switch categoria
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const category = e.currentTarget.dataset.category;
        this.switchCategory(category);
      });
    });

    // 2) Ricerca live
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        this.searchTerm = e.target.value;
        this.refreshItemsGrid();
      });
    }

    // 3a) Chiusura modale al click sull'overlay
    const modalOverlay = document.getElementById('itemModal');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', e => {
        if (e.target === modalOverlay) {
          this.closeModal();
        }
      });
    }
    // 3b) Chiusura modale con tasto Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.isModalOpen) {
        this.closeModal();
      }
    });

    // 4) Inizializza click sui chip di filtro
    this.setupFilterChipEvents();
  }

    // ==========================================
    // METODI AZIONI UTENTE
    // ==========================================

    async switchCategory(category) {
        console.log(`🔄 Switch categoria: ${this.currentCategory} → ${category}`);

        if (category === this.currentCategory) return;

        // Update UI button states
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');

        // Update category and reload data
        this.currentCategory = category;
        this.searchTerm = '';

        try {
            // Show loading
            const itemsGrid = document.getElementById('itemsGrid');
            if (itemsGrid) {
                itemsGrid.innerHTML = '<div class="loading">Caricamento...</div>';
            }

            await this.loadCategoryData(category);
            this.refreshFullUI();

        } catch (error) {
            console.error('❌ Errore switch categoria:', error);
            this.showError('Errore nel caricamento della categoria: ' + error.message);
        }
    }

    refreshFullUI() {
        // Update stats bar
        const statsBar = document.querySelector('.stats-bar');
        if (statsBar) {
            const newStatsHTML = this.createStatsBarHTML();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newStatsHTML;
            const newStatsBar = tempDiv.firstElementChild;

            statsBar.parentNode.replaceChild(newStatsBar, statsBar);
        }

        // Update items grid
        this.refreshItemsGrid();

        // Re-setup search event
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.refreshItemsGrid();
            });
        }
    }

    refreshItemsGrid() {
        const itemsGrid = document.getElementById('itemsGrid');
        if (itemsGrid) {
            const filteredItems = this.getFilteredItems();

            if (filteredItems.length === 0) {
                itemsGrid.innerHTML = this.createEmptyStateHTML();
            } else {
                itemsGrid.innerHTML = filteredItems.map(item =>
                    this.createItemCardHTML(item)
                ).join('');
            }
        }
    }

    async openItemModal(itemId) {
        console.log(`🔍 Apertura modal per item ${itemId}`);

        const item = this.currentItems.find(i => i.id == itemId);
        if (!item) {
            console.error('❌ Item non trovato:', itemId);
            return;
        }

        const modal = document.getElementById('itemModal');
        const modalImage = document.getElementById('modalImage');
        const modalTitle = document.getElementById('modalTitle');
        const modalDescription = document.getElementById('modalDescription');
        const modalStats = document.getElementById('modalStats');
        const modalActionBtn = document.getElementById('modalActionBtn');

        // Populate modal content
        if (this.currentCategory === 'giochi') {
            this.populateGameModal(item, modalImage, modalTitle, modalDescription, modalStats, modalActionBtn);
        } else if (this.currentCategory === 'drink') {
            this.populateDrinkModal(item, modalImage, modalTitle, modalDescription, modalStats, modalActionBtn);
        } else if (this.currentCategory === 'snack') {
            this.populateSnackModal(item, modalImage, modalTitle, modalDescription, modalStats, modalActionBtn);
        }

        // Show modal
        modal.classList.add('active');
        this.isModalOpen = true;
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('itemModal');
        modal.classList.remove('active');
        this.isModalOpen = false;
        document.body.style.overflow = 'auto';
    }

        /**
     * Attacca l'evento click a tutti i .filter-chip
     */
    setupFilterChipEvents() {
        document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', e => this.handleFilterChipClick(e));
        });
    }

    /**
     * Toggle filtro selezionato e aggiorna la griglia
     */
    handleFilterChipClick(e) {
        const chip = e.currentTarget;
        const filter = chip.dataset.filter;
        if (this.selectedFilters.includes(filter)) {
        this.selectedFilters = this.selectedFilters.filter(f => f !== filter);
        } else {
        this.selectedFilters.push(filter);
        }
        chip.classList.toggle('active');
        this.refreshItemsGrid();
    }

    rentItem(itemId) {
        console.log(`🎮 Noleggio item ${itemId}`);

        // TODO: Integrare con sistema prenotazioni
        alert(`🎮 Noleggio gioco ${itemId}\n\nFunzionalità in sviluppo!\nSarai reindirizzato al sistema di prenotazione.`);
    }

    orderItem(itemId) {
        console.log(`🍻 Ordine item ${itemId}`);

        const item = this.currentItems.find(i => i.id == itemId);
        const itemName = item ? item.name : 'Item';

        // TODO: Integrare con sistema ordini
        alert(`🍻 Ordine: ${itemName}\n\nFunzionalità in sviluppo!\nSarai reindirizzato al carrello.`);
    }

    addToWishlist() {
        console.log('❤️ Aggiunta alla wishlist');

        // TODO: Integrare con sistema wishlist utente
        alert('❤️ Aggiunto alla wishlist!\n\n(Funzionalità in sviluppo)');
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    getCurrentStats() {
        const count = this.currentItems.length;

        if (this.currentCategory === 'giochi') {
            return {
                icon: 'fas fa-dragon',
                count: count,
                label: 'Giochi Disponibili',
                rating: '4.8',
                extraIcon: 'fas fa-users',
                extraValue: '2-10',
                extraLabel: 'Giocatori'
            };
        } else if (this.currentCategory === 'drink') {
            // Conta drink alcolici e analcolici
            const alcoholicCount = this.currentItems.filter(d => d.isAlcoholic).length;
            const nonAlcoholicCount = count - alcoholicCount;

            return {
                icon: 'fas fa-cocktail',
                count: count,
                label: 'Drink Disponibili',
                rating: '4.9',
                extraIcon: 'fas fa-wine-glass',
                extraValue: `${alcoholicCount}+${nonAlcoholicCount}`,
                extraLabel: 'Alc/Analc'
            };
        } else if (this.currentCategory === 'snack') {
            // Conta snack dolci e salati
            const sweetCount = this.currentItems.filter(s => s.isSweet).length;
            const savoryCount = count - sweetCount;

            return {
                icon: 'fas fa-cookie-bite',
                count: count,
                label: 'Snack Disponibili',
                rating: '4.7',
                extraIcon: 'fas fa-balance-scale',
                extraValue: `${sweetCount}+${savoryCount}`,
                extraLabel: 'Dolci/Salati'
            };
        }

        return { icon: 'fas fa-cube', count: 0, label: 'Items', rating: '0', extraIcon: 'fas fa-info', extraValue: '0', extraLabel: 'Info' };
    }


getFilteredItems() {
  // 1) Partiamo da tutti gli items
  let items = this.currentItems;

  // 2) Ricerca testuale (se this.searchTerm non è vuoto)
  if (this.searchTerm) {
    const term = this.searchTerm.toLowerCase();
    items = items.filter(item => (
      item.name?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      item.category?.toLowerCase().includes(term) ||
      item.baseSpirit?.toLowerCase().includes(term) ||
      item.mainIngredient?.toLowerCase().includes(term)
    ));
  }

  // 3) Filtri avanzati (se almeno un chip è attivo)
  if (this.selectedFilters.length > 0) {
    items = items.filter(item =>
      this.selectedFilters.every(filter => {
        switch (filter) {
          case 'alcoholic':
            // isAlcoholic è 1 per vero
            return item.isAlcoholic === 1;
          case 'non-alcoholic':
            // isAlcoholic è 0 per falso
            return item.isAlcoholic === 0;
          case 'premium':
            return item.price >= 8.00;
          case 'economic':
            return item.price < 8.00;
          default:
            return true;
        }
      })
    );
  }

  // 4) Ritorna l’array filtrato
  return items;
}


    formatDuration(minutes) {
        if (!minutes) return 'N/A';

        if (minutes < 60) return `${minutes}min`;

        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        if (mins === 0) return `${hours}h`;
        return `${hours}h${mins}m`;
    }

    formatDifficulty(level) {
        const stars = '★'.repeat(level || 1);
        return stars;
    }

    // Metodo helper per categoria ingrediente
    getIngredientCategory(ingredient) {
        const categories = {
            'formaggio': 'Latticini',
            'mais': 'Cereali',
            'pane': 'Panificati',
            'patate': 'Tuberi',
            'olive': 'Verdure',
            'farina': 'Panificati',
            'cioccolato': 'Dolciario',
            'zucchero': 'Dolciario',
            'mascarpone': 'Latticini'
        };
        return categories[ingredient] || 'Altro';
    }

    // Metodo helper per momento ideale
    getBestTime(snack) {
        if (snack.isSweet) {
            if (snack.mainIngredient === 'mascarpone') return 'Fine serata';
            if (snack.mainIngredient === 'cioccolato') return 'Pausa dolce';
            return 'Merenda';
        } else {
            if (snack.mainIngredient === 'olive') return 'Aperitivo';
            if (snack.mainIngredient === 'formaggio') return 'Durante il gioco';
            return 'Spuntino';
        }
    }

    // Metodo helper per formattare base spirit
    formatBaseSpirit(baseSpirit) {
        if (!baseSpirit) return 'Misto';

        // Capitalizza e accorcia alcuni nomi lunghi
        const formatted = {
            'gin': 'Gin',
            'vodka': 'Vodka',
            'rum': 'Rum',
            'bourbon': 'Bourbon',
            'tequila': 'Tequila',
            'whiskey di segale': 'Whiskey',
            'aperol': 'Aperol',
            'birra': 'Birra',
            'caffè': 'Caffè',
            'tè chai': 'Chai',
            'tè alle erbe': 'Tè',
            'succo di mirtillo': 'Mirtillo',
            'limonata': 'Limonata',
            'soda': 'Soda'
        };

        return formatted[baseSpirit] || baseSpirit;
    }

    // ==========================================
    // MODAL POPULATION METHODS
    // ==========================================

    populateGameModal(game, modalImage, modalTitle, modalDescription, modalStats, modalActionBtn) {
        const imageUrl = game.imageUrl || '/assets/games/default.jpg';

        modalImage.style.backgroundImage = `url('${imageUrl}')`;
        modalTitle.textContent = game.name;
        modalDescription.textContent = game.description || 'Descrizione non disponibile.';

        modalStats.innerHTML = `
            <div class="modal-stat">
                <div class="item-stat-icon"><i class="fas fa-users"></i></div>
                <div class="item-stat-value">${game.minPlayers}-${game.maxPlayers}</div>
                <div class="item-stat-label">Giocatori</div>
            </div>
            <div class="modal-stat">
                <div class="item-stat-icon"><i class="fas fa-clock"></i></div>
                <div class="item-stat-value">${this.formatDuration(game.durationMinutes)}</div>
                <div class="item-stat-label">Durata</div>
            </div>
            <div class="modal-stat">
                <div class="item-stat-icon"><i class="fas fa-brain"></i></div>
                <div class="item-stat-value">${this.formatDifficulty(game.difficultyLevel)}</div>
                <div class="item-stat-label">Difficoltà</div>
            </div>
            <div class="modal-stat">
                <div class="item-stat-icon"><i class="fas fa-euro-sign"></i></div>
                <div class="item-stat-value">€${game.rentalPrice || '0'}</div>
                <div class="item-stat-label">Prezzo/sera</div>
            </div>
        `;

        modalActionBtn.innerHTML = `
            <i class="fas fa-shopping-cart"></i>
            Noleggia Ora - €${game.rentalPrice || '0'}
        `;
        modalActionBtn.onclick = () => this.rentItem(game.id);
    }

    populateDrinkModal(drink, modalImage, modalTitle, modalDescription, modalStats, modalActionBtn) {
        modalImage.style.backgroundImage = `url('${drink.imageUrl || '/assets/drinks/default.jpg'}')`;
        modalTitle.textContent = drink.name;
        modalDescription.textContent = drink.description;

        modalStats.innerHTML = `
            <div class="modal-stat">
                <div class="item-stat-icon"><i class="fas fa-wine-glass"></i></div>
                <div class="item-stat-value">${drink.isAlcoholic ? 'Alcolico' : 'Analcolico'}</div>
                <div class="item-stat-label">Tipo</div>
            </div>
            <div class="modal-stat">
                <div class="item-stat-icon"><i class="fas fa-flask"></i></div>
                <div class="item-stat-value">${drink.baseSpirit || 'Misto'}</div>
                <div class="item-stat-label">Base Spirit</div>
            </div>
            <div class="modal-stat">
                <div class="item-stat-icon"><i class="fas fa-euro-sign"></i></div>
                <div class="item-stat-value">€${drink.price}</div>
                <div class="item-stat-label">Prezzo</div>
            </div>
            <div class="modal-stat">
                <div class="item-stat-icon"><i class="fas fa-star"></i></div>
                <div class="item-stat-value">${drink.price >= 8.00 ? 'Premium' : 'Classic'}</div>
                <div class="item-stat-label">Qualità</div>
            </div>
        `;

        modalActionBtn.innerHTML = `
            <i class="fas fa-glass-cheers"></i>
            Ordina - €${drink.price}
        `;
        modalActionBtn.onclick = () => this.orderItem(drink.id);
    }

    populateSnackModal(snack, modalImage, modalTitle, modalDescription, modalStats, modalActionBtn) {
        modalImage.style.backgroundImage = `url('${snack.imageUrl || '/assets/snacks/default.jpg'}')`;
        modalTitle.textContent = snack.name;
        modalDescription.textContent = snack.description;

        modalStats.innerHTML = `
            <div class="modal-stat">
                <div class="item-stat-icon"><i class="fas fa-utensils"></i></div>
                <div class="item-stat-value">${snack.isSweet ? 'Dolce' : 'Salato'}</div>
                <div class="item-stat-label">Tipo</div>
            </div>
            <div class="modal-stat">
                <div class="item-stat-icon"><i class="fas fa-leaf"></i></div>
                <div class="item-stat-value">${snack.mainIngredient}</div>
                <div class="item-stat-label">Ingrediente</div>
            </div>
            <div class="modal-stat">
                <div class="item-stat-icon"><i class="fas fa-euro-sign"></i></div>
                <div class="item-stat-value">€${snack.price}</div>
                <div class="item-stat-label">Prezzo</div>
            </div>
            <div class="modal-stat">
                <div class="item-stat-icon"><i class="fas fa-gamepad"></i></div>
                <div class="item-stat-value">${snack.suggestedGame || 'Universale'}</div>
                <div class="item-stat-label">Gioco Suggerito</div>
            </div>
            <div class="modal-stat">
                <div class="item-stat-icon"><i class="fas fa-glass-cheers"></i></div>
                <div class="item-stat-value">${snack.suggestedDrink || 'A piacere'}</div>
                <div class="item-stat-label">Drink Suggerito</div>
            </div>
        `;

        modalActionBtn.innerHTML = `
            <i class="fas fa-shopping-cart"></i>
            Ordina - €${snack.price}
        `;
        modalActionBtn.onclick = () => this.orderItem(snack.id);
    }

    // ==========================================
    // UTILITY HTML GENERATORS
    // ==========================================

    createLoader() {
        return `
            <div class="catalog-loader">
                <div class="loader-spinner"></div>
                <p>Caricamento catalogo in corso...</p>
            </div>
        `;
    }

    createErrorHTML(message) {
        return `
            <div class="catalog-error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Errore nel caricamento</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn-primary-c">
                    Ricarica Pagina
                </button>
            </div>
        `;
    }

    createEmptyStateHTML() {
        const config = CATALOG_CONFIG.CATEGORIES[this.currentCategory];

        return `
            <div class="empty-state">
                <i class="${config.icon}" style="font-size: 4rem; color: #6633cc; margin-bottom: 1rem;"></i>
                <h3>Nessun ${config.label.toLowerCase()} trovato</h3>
                <p>Prova a modificare i criteri di ricerca o torna più tardi.</p>
                ${this.searchTerm ? `<p><strong>Termine ricercato:</strong> "${this.searchTerm}"</p>` : ''}
            </div>
        `;
    }

    showError(message) {
        // Mostra errore nell'interfaccia
        const itemsGrid = document.getElementById('itemsGrid');
        if (itemsGrid) {
            itemsGrid.innerHTML = this.createErrorHTML(message);
        }
        console.error('❌ Errore catalogo:', message);
    }
}

// ==========================================
// FUNZIONE PRINCIPALE DELLA PAGINA
// ==========================================

export async function showCatalog(category = 'giochi') {
    console.log(`🎯 Apertura catalogo categoria: ${category}`);

    const content = document.getElementById('content');
    if (!content) {
        console.error('❌ Container #content non trovato!');
        return;
    }

    // Crea manager se non esiste
    if (!window.catalogPageManager) {
        window.catalogPageManager = new CatalogPageManager();
    }

    const manager = window.catalogPageManager;

    try {
        // Mostra loader durante caricamento
        content.innerHTML = manager.createLoader();

        // Imposta categoria e carica dati
        manager.currentCategory = category;
        await manager.loadCategoryData(category);

        // Renderizza il catalogo completo
        content.innerHTML = manager.createCatalogHTML();

        // Setup eventi e inizializzazioni
        manager.setupEvents();

        console.log(`✅ Catalogo ${category} caricato con successo con ${manager.currentItems.length} items`);

    } catch (error) {
        console.error('❌ Errore caricamento catalogo:', error);
        content.innerHTML = manager.createErrorHTML(`Errore nel caricamento del catalogo: ${error.message}`);
    }
}

// ==========================================
// INIZIALIZZAZIONE AL CARICAMENTO
// ==========================================

console.log('✅ Pagina catalogo completata con API reali per drink e snack');
