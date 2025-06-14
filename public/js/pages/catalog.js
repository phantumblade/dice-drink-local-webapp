// js/pages/catalog.js
// SCOPO: Pagina catalogo per giochi, drink e snack
// RELAZIONI: Chiamata da main.js, usa API /api/games, mostra contenuto in div#content

console.log('🎮 Caricamento pagina catalogo...');

// ==========================================
// CONFIGURAZIONE CATALOGO
// ==========================================

const CATALOG_CONFIG = {
    API_ENDPOINTS: {
        games: '/api/games',
        drinks: '/api/drinks', // TODO: Implementare quando pronto
        snacks: '/api/snacks'  // TODO: Implementare quando pronto
    },
    CATEGORIES: {
        giochi: {
            label: 'Giochi',
            icon: 'fas fa-gamepad',
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

        console.log('✅ CatalogPageManager inizializzato');
    }

    // ==========================================
    // CARICAMENTO DATI DA API
    // ==========================================

    async loadCategoryData(category) {
        const config = CATALOG_CONFIG.CATEGORIES[category];

        if (!config) {
            throw new Error(`Categoria ${category} non supportata`);
        }

        if (category === 'giochi') {
            // Carica giochi da API esistente
            const response = await fetch(CATALOG_CONFIG.API_ENDPOINTS.games);

            if (!response.ok) {
                throw new Error(`Errore API: ${response.status}`);
            }

            this.currentItems = await response.json();

        } else if (category === 'drink') {
            // TODO: Implementare quando API drink sarà pronta
            this.currentItems = this.getMockDrinks();

        } else if (category === 'snack') {
            // TODO: Implementare quando API snack sarà pronta
            this.currentItems = this.getMockSnacks();
        }

        console.log(`📊 Caricati ${this.currentItems.length} items per ${category}`);
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
                        <span>${stats.label}</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-star"></i>
                        <span class="stat-number">${stats.rating}</span>
                        <span>Rating Medio</span>
                    </div>
                    <div class="stat-item">
                        <i class="${stats.extraIcon}"></i>
                        <span class="stat-number">${stats.extraValue}</span>
                        <span>${stats.extraLabel}</span>
                    </div>
                </div>

                <div class="search-container">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" class="search-input"
                           placeholder="Cerca ${this.currentCategory}..."
                           value="${this.searchTerm}">
                </div>
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
                <div class="item-image" style="background-image: url('${drink.image}');">
                    <button class="expand-btn" onclick="window.catalogPageManager.openItemModal(${drink.id})">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>

                <div class="item-content">
                    <h3 class="item-title">${drink.name}</h3>
                    <span class="item-category">${drink.category}</span>

                    <div class="item-description">
                        ${drink.description}
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
                <div class="item-image" style="background-image: url('${snack.image}');">
                    <button class="expand-btn" onclick="window.catalogPageManager.openItemModal(${snack.id})">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>

                <div class="item-content">
                    <h3 class="item-title">${snack.name}</h3>
                    <span class="item-category">${snack.category}</span>

                    <div class="item-description">
                        ${snack.description}
                    </div>

                    <button class="rent-btn" onclick="window.catalogPageManager.orderItem(${snack.id})">
                        <i class="fas fa-utensils"></i>
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
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.closest('.filter-btn').dataset.category;
                this.switchCategory(category);
            });
        });

        // Search input
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.refreshItemsGrid();
            });
        }

        // Modal events
        const modal = document.getElementById('itemModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }

        // Escape key per chiudere modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen) {
                this.closeModal();
            }
        });
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
            this.showError('Errore nel caricamento della categoria');
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

    rentItem(itemId) {
        console.log(`🎮 Noleggio item ${itemId}`);

        // TODO: Integrare con sistema prenotazioni
        alert(`🎮 Noleggio gioco ${itemId}\n\nFunzionalità in sviluppo!\nSarai reindirizzato al sistema di prenotazione.`);
    }

    orderItem(itemId) {
        console.log(`🍻 Ordine item ${itemId}`);

        // TODO: Integrare con sistema ordini
        alert(`🍻 Ordine item ${itemId}\n\nFunzionalità in sviluppo!\nSarai reindirizzato al carrello.`);
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
                icon: 'fas fa-gamepad',
                count: count,
                label: 'Giochi Disponibili',
                rating: '4.8',
                extraIcon: 'fas fa-users',
                extraValue: '2-10',
                extraLabel: 'Giocatori'
            };
        } else if (this.currentCategory === 'drink') {
            return {
                icon: 'fas fa-cocktail',
                count: count,
                label: 'Drink Disponibili',
                rating: '4.9',
                extraIcon: 'fas fa-glass-cheers',
                extraValue: 'Vario',
                extraLabel: 'Tipologie'
            };
        } else if (this.currentCategory === 'snack') {
            return {
                icon: 'fas fa-cookie-bite',
                count: count,
                label: 'Snack Disponibili',
                rating: '4.7',
                extraIcon: 'fas fa-leaf',
                extraValue: 'Gourmet',
                extraLabel: 'Qualità'
            };
        }

        return { icon: 'fas fa-cube', count: 0, label: 'Items', rating: '0', extraIcon: 'fas fa-info', extraValue: '0', extraLabel: 'Info' };
    }

    getFilteredItems() {
        if (!this.searchTerm) {
            return this.currentItems;
        }

        const term = this.searchTerm.toLowerCase();
        return this.currentItems.filter(item => {
            return item.name?.toLowerCase().includes(term) ||
                   item.description?.toLowerCase().includes(term) ||
                   item.category?.toLowerCase().includes(term);
        });
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
        modalImage.style.backgroundImage = `url('${drink.image}')`;
        modalTitle.textContent = drink.name;
        modalDescription.textContent = drink.description;

        modalStats.innerHTML = `
            <div class="modal-stat">
                <div class="item-stat-icon"><i class="fas fa-tag"></i></div>
                <div class="item-stat-value">${drink.category}</div>
                <div class="item-stat-label">Categoria</div>
            </div>
            <div class="modal-stat">
                <div class="item-stat-icon"><i class="fas fa-euro-sign"></i></div>
                <div class="item-stat-value">€${drink.price}</div>
                <div class="item-stat-label">Prezzo</div>
            </div>
        `;

        modalActionBtn.innerHTML = `
            <i class="fas fa-glass-cheers"></i>
            Ordina - €${drink.price}
        `;
        modalActionBtn.onclick = () => this.orderItem(drink.id);
    }

    populateSnackModal(snack, modalImage, modalTitle, modalDescription, modalStats, modalActionBtn) {
        modalImage.style.backgroundImage = `url('${snack.image}')`;
        modalTitle.textContent = snack.name;
        modalDescription.textContent = snack.description;

        modalStats.innerHTML = `
            <div class="modal-stat">
                <div class="item-stat-icon"><i class="fas fa-tag"></i></div>
                <div class="item-stat-value">${snack.category}</div>
                <div class="item-stat-label">Categoria</div>
            </div>
            <div class="modal-stat">
                <div class="item-stat-icon"><i class="fas fa-euro-sign"></i></div>
                <div class="item-stat-value">€${snack.price}</div>
                <div class="item-stat-label">Prezzo</div>
            </div>
        `;

        modalActionBtn.innerHTML = `
            <i class="fas fa-utensils"></i>
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
                <i class="${config.icon}" style="font-size: 4rem; color: var(--catalog-primary); margin-bottom: 1rem;"></i>
                <h3>Nessun ${config.label.toLowerCase()} trovato</h3>
                <p>Prova a modificare i criteri di ricerca o torna più tardi.</p>
            </div>
        `;
    }

    showError(message) {
        // TODO: Implementare sistema notifiche toast
        alert('❌ ' + message);
    }

    // ==========================================
    // MOCK DATA (TEMPORARY)
    // ==========================================

    getMockDrinks() {
        return [
            {
                id: 1,
                name: 'Dice Cocktail',
                category: 'Cocktail Signature',
                description: 'Il nostro cocktail esclusivo con gin, liquore ai frutti di bosco e lime.',
                price: 8.50,
                image: '/assets/drinks/dice-cocktail.jpg'
            },
            {
                id: 2,
                name: 'Potion Master',
                category: 'Cocktail Fantasy',
                description: 'Un cocktail magico che cambia colore mentre lo bevi.',
                price: 9.00,
                image: '/assets/drinks/potion-master.jpg'
            },
            {
                id: 3,
                name: 'Birra Artigianale IPA',
                category: 'Birre',
                description: 'IPA americana con note floreali e agrumate.',
                price: 6.00,
                image: '/assets/drinks/craft-ipa.jpg'
            }
        ];
    }

    getMockSnacks() {
        return [
            {
                id: 1,
                name: 'Tagliere del Guerriero',
                category: 'Taglieri',
                description: 'Selezione di formaggi e salumi locali con miele e noci.',
                price: 12.00,
                image: '/assets/snacks/warrior-board.jpg'
            },
            {
                id: 2,
                name: 'Patatine del Mago',
                category: 'Stuzzichini',
                description: 'Patatine croccanti con spezie segrete e salsa blu.',
                price: 5.50,
                image: '/assets/snacks/magic-chips.jpg'
            },
            {
                id: 3,
                name: 'Nachos Epici',
                category: 'Stuzzichini',
                description: 'Nachos con formaggio fuso, jalapeños e guacamole.',
                price: 8.00,
                image: '/assets/snacks/epic-nachos.jpg'
            },
            {
                id: 4,
                name: 'Dolce della Vittoria',
                category: 'Dolci',
                description: 'Tiramisù della casa con decorazione a tema gaming.',
                price: 6.50,
                image: '/assets/snacks/victory-dessert.jpg'
            }
        ];
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

        console.log(`✅ Catalogo ${category} caricato con successo`);

    } catch (error) {
        console.error('❌ Errore caricamento catalogo:', error);
        content.innerHTML = manager.createErrorHTML(error.message);
    }
}

// ==========================================
// INIZIALIZZAZIONE AL CARICAMENTO
// ==========================================

console.log('✅ Pagina catalogo caricata e pronta per l\'uso');
