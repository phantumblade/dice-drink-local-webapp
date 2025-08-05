console.log('🎮 Caricamento pagina catalogo con sistema carrello...');


// ==========================================
// CONFIGURAZIONE CATALOGO
// ==========================================

const CATALOG_CONFIG = {
    API_ENDPOINTS: {
        games: '/api/games',
        drinks: '/api/drinks',
        snacks: '/api/snacks'
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
    },
    CART_STORAGE_KEY: 'catalogSelection'
};

// ==========================================
// CONFIGURAZIONE IMMAGINI CON FALLBACK LOCALI
// ==========================================

const IMAGE_CONFIG = {
    // IMMAGINI LOCALI DI DEFAULT
    LOCAL_DEFAULTS: {
        games: '/assets/defaults/default-game.jpg',
        drinks: '/assets/defaults/default-drink.png',
        snacks: '/assets/defaults/default-snack.png'
    },

    // FALLBACK FINALE (SVG se mancano anche i default)
    CSS_FALLBACK: {
        games: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%236633cc"/><text x="150" y="100" text-anchor="middle" dy="0.3em" fill="white" font-family="Arial" font-size="20">🎲 Gioco</text></svg>',
        drinks: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23e53e3e"/><text x="150" y="100" text-anchor="middle" dy="0.3em" fill="white" font-family="Arial" font-size="20">🍹 Drink</text></svg>',
        snacks: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23f6ad55"/><text x="150" y="100" text-anchor="middle" dy="0.3em" fill="white" font-family="Arial" font-size="20">🍿 Snack</text></svg>'
    },

    imageCache: new Map(),
    TIMEOUT: 3000
};

// ==========================================
//  FUNZIONI GESTIONE IMMAGINI LOCALI
// ==========================================


function getImageUrlWithLocalFallback(item, category) {
    // Se l'item ha un imageUrl valido, prova a usarlo
    if (item.imageUrl && item.imageUrl.trim() !== '' && !item.imageUrl.includes('undefined')) {
        return item.imageUrl;
    }

    // Altrimenti usa il default locale per la categoria
    return getLocalDefaultUrl(category);
}


function getLocalDefaultUrl(category) {
    // Normalizza categoria
    const normalizedCategory = category === 'giochi' ? 'games' :
                              category === 'drink' ? 'drinks' :
                              category === 'snack' ? 'snacks' : category;

    return IMAGE_CONFIG.LOCAL_DEFAULTS[normalizedCategory] || IMAGE_CONFIG.LOCAL_DEFAULTS.games;
}

function getCSSFallbackUrl(category) {
    const normalizedCategory = category === 'giochi' ? 'games' :
                              category === 'drink' ? 'drinks' :
                              category === 'snack' ? 'snacks' : category;

    return IMAGE_CONFIG.CSS_FALLBACK[normalizedCategory] || IMAGE_CONFIG.CSS_FALLBACK.games;
}


function setupLocalImageFallback(element, category) {
    const bgImage = element.style.backgroundImage;
    if (!bgImage || bgImage === 'none') return;

    // Estrai URL dal background-image
    const urlMatch = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
    if (!urlMatch) return;

    const originalUrl = urlMatch[1];

    // Se è già un fallback locale o CSS, skip
    if (originalUrl.includes('/assets/defaults/') || originalUrl.startsWith('data:image/svg')) {
        return;
    }

    // Verifica se l'immagine originale esiste
    checkImageExists(originalUrl)
        .then(exists => {
            if (!exists) {
                console.log(`🖼️ Immagine non trovata: ${originalUrl}`);

                // Prova prima il default locale
                const localDefault = getLocalDefaultUrl(category);

                checkImageExists(localDefault)
                    .then(localExists => {
                        if (localExists) {
                            console.log(`✅ Usando default locale: ${localDefault}`);
                            element.style.backgroundImage = `url('${localDefault}')`;
                        } else {
                            console.log(`⚠️ Default locale non trovato, usando CSS fallback`);
                            element.style.backgroundImage = `url('${getCSSFallbackUrl(category)}')`;
                        }
                    });
            }
        })
        .catch(() => {
            // Errore nel check: usa direttamente il default locale
            element.style.backgroundImage = `url('${getLocalDefaultUrl(category)}')`;
        });
}

function checkImageExists(url) {
    return new Promise((resolve) => {
        // Se è un data URL (SVG), ritorna sempre true
        if (url.startsWith('data:')) {
            resolve(true);
            return;
        }

        const img = new Image();

        const timeout = setTimeout(() => {
            img.onload = img.onerror = null;
            resolve(false);
        }, IMAGE_CONFIG.TIMEOUT);

        img.onload = function() {
            clearTimeout(timeout);
            resolve(true);
        };

        img.onerror = function() {
            clearTimeout(timeout);
            resolve(false);
        };

        img.src = url;
    });
}

// ==========================================
// SETUP AUTOMATICO FALLBACK
// ==========================================

function setupAllLocalImageFallbacks() {
    console.log('🖼️ Setup fallback immagini locali...');

    // Seleziona tutti gli elementi con immagini
    const imageElements = document.querySelectorAll('.item-image');
    let processedCount = 0;

    imageElements.forEach(element => {
        // Determina categoria dal parent card
        const card = element.closest('.item-card');
        let category = 'games'; // default

        if (card) {
            if (card.classList.contains('game-card')) category = 'games';
            else if (card.classList.contains('drink-card')) category = 'drinks';
            else if (card.classList.contains('snack-card')) category = 'snacks';
        }

        setupLocalImageFallback(element, category);
        processedCount++;
    });

    console.log(`✅ Processati ${processedCount} elementi immagine`);
}

// ==========================================
// CLASSE MANAGER CATALOGO CON CARRELLO
// ==========================================

class CatalogPageManager {
    constructor() {
        this.currentCategory = 'giochi';
        this.currentItems = [];
        this.isModalOpen = false;
        this.searchTerm = '';
        this.selectedFilters = [];

        this.cart = this.loadCartFromStorage();

        console.log('✅ CatalogPageManager inizializzato con carrello');
        console.log('🛒 Carrello attuale:', this.cart);
        this.isEditingBooking = false;
        this.editContext = null;
    }
    
    // ==========================================
    // MODALITÀ EDITING PRENOTAZIONE
    // ==========================================
    setEditingMode(editContext) {
        this.isEditingBooking = true;
        this.editContext = editContext;
        console.log('📝 Attivata modalità editing prenotazione:', editContext);
        
        // Personalizza l'interfaccia per l'editing
        this.customizeForEditing();
    }
    
    customizeForEditing() {
        if (!this.isEditingBooking || !this.editContext) return;
        
        // Mostra notifica di editing
        this.showEditingNotification();
        
        // Personalizza il carrello per l'editing
        this.customizeCartForEditing();
    }
    
    showEditingNotification() {
        const editType = this.editContext.editType || 'prodotti';
        const bookingDate = this.editContext.bookingDate || 'N/A';
        
        setTimeout(() => {
            const notification = document.createElement('div');
            notification.className = 'editing-notification';
            notification.innerHTML = `
                <div class="editing-alert">
                    <i class="fas fa-edit"></i>
                    <div class="editing-info">
                        <h4>Modalità Modifica Prenotazione</h4>
                        <p>Stai modificando ${editType} per la prenotazione del ${bookingDate}</p>
                        <p class="editing-hint">Seleziona i nuovi prodotti e conferma le modifiche</p>
                    </div>
                    <button class="btn-back-to-booking" onclick="window.history.back()">
                        <i class="fas fa-arrow-left"></i> Torna alla Prenotazione
                    </button>
                </div>
            `;
            
            const content = document.getElementById('content');
            if (content && content.firstChild) {
                content.insertBefore(notification, content.firstChild);
            }
        }, 500);
    }
    
    customizeCartForEditing() {
        // Il carrello mostrerà opzioni specifiche per l'editing
        this.cart.isEditingMode = true;
        this.cart.editContext = this.editContext;
    }

    // ==========================================
    // CONTROLLO AUTENTICAZIONE
    // ==========================================

    get isAuthenticated() {
        return (window.SimpleAuth && window.SimpleAuth.isAuthenticated) ||
               Boolean(window.currentUser) ||
               Boolean(localStorage.getItem('authToken'));
    }

    getCurrentUserName() {
        if (window.SimpleAuth && window.SimpleAuth.currentUser) {
            const user = window.SimpleAuth.currentUser;
            return user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.email;
        }

        if (window.currentUser) {
            return window.currentUser.first_name ?
                   `${window.currentUser.first_name} ${window.currentUser.last_name || ''}`.trim() :
                   window.currentUser.email;
        }

        return 'Utente Autenticato';
    }

    // ==========================================
    // SISTEMA CARRELLO COMPLETO
    // ==========================================

    loadCartFromStorage() {
        try {
            const stored = sessionStorage.getItem(CATALOG_CONFIG.CART_STORAGE_KEY);
            if (stored) {
                const cart = JSON.parse(stored);
                console.log('📦 Carrello caricato dal storage:', cart);
                return cart;
            }
        } catch (error) {
            console.warn('⚠️ Errore caricamento carrello:', error);
        }

        // Ritorna carrello vuoto
        return {
            games: [],
            drinks: [],
            snacks: []
        };
    }

    saveCartToStorage() {
        try {
            sessionStorage.setItem(CATALOG_CONFIG.CART_STORAGE_KEY, JSON.stringify(this.cart));
            console.log('💾 Carrello salvato:', this.cart);
            this.updateCartUI();
        } catch (error) {
            console.error('❌ Errore salvataggio carrello:', error);
        }
    }

    addToCart(item, quantity = 1, category = null) {
        // Determina categoria se non specificata
        if (!category) {
            category = this.currentCategory === 'giochi' ? 'games' :
                      this.currentCategory === 'drink' ? 'drinks' : 'snacks';
        }

        // Prepara oggetto per il carrello
        const cartItem = {
            id: item.id,
            name: item.name,
            price: category === 'games' ? item.rentalPrice : item.price,
            quantity: category === 'games' ? 1 : quantity, // Giochi sempre 1
            category: category,
            imageUrl: item.imageUrl,
            originalItem: item
        };

        // Controlla se l'item è già nel carrello
        const existingIndex = this.cart[category].findIndex(cartItem => cartItem.id === item.id);

        if (existingIndex >= 0) {
            // Aggiorna quantità esistente (solo per drink/snack)
            if (category !== 'games') {
                this.cart[category][existingIndex].quantity += quantity;
            }
            console.log(`🔄 Aggiornata quantità ${item.name}: ${this.cart[category][existingIndex].quantity}`);
        } else {
            // Aggiungi nuovo item
            this.cart[category].push(cartItem);
            console.log(`➕ Aggiunto al carrello: ${item.name} (${quantity}x)`);
        }

        this.saveCartToStorage();
        this.showCartNotification(item, quantity, 'added');

        return true;
    }

    removeFromCart(itemId, category) {
        const index = this.cart[category].findIndex(item => item.id === itemId);
        if (index >= 0) {
            const removedItem = this.cart[category].splice(index, 1)[0];
            console.log(`🗑️ Rimosso dal carrello: ${removedItem.name}`);
            this.saveCartToStorage();
            this.showCartNotification(removedItem, 0, 'removed');
            return true;
        }
        return false;
    }

    updateQuantity(itemId, category, newQuantity) {
        if (category === 'games') return false; // Giochi sempre quantità 1

        const index = this.cart[category].findIndex(item => item.id === itemId);
        if (index >= 0) {
            if (newQuantity <= 0) {
                return this.removeFromCart(itemId, category);
            } else {
                this.cart[category][index].quantity = newQuantity;
                console.log(`🔄 Quantità aggiornata: ${this.cart[category][index].name} = ${newQuantity}`);
                this.saveCartToStorage();
                return true;
            }
        }
        return false;
    }

    clearCart() {
        // Svuota completamente il carrello
        this.cart = { games: [], drinks: [], snacks: [] };
        
        // Pulisci anche il sessionStorage per evitare dati residui
        try {
            sessionStorage.removeItem(CATALOG_CONFIG.CART_STORAGE_KEY);
            sessionStorage.setItem(CATALOG_CONFIG.CART_STORAGE_KEY, JSON.stringify(this.cart));
        } catch (error) {
            console.warn('⚠️ Errore pulizia storage carrello:', error);
        }
        
        // Aggiorna UI
        this.updateCartUI();
        console.log('🧹 Carrello completamente svuotato e storage pulito');
    }

    getCartSummary() {
        const summary = {
            totalItems: 0,
            totalPrice: 0,
            itemsByCategory: {
                games: { count: 0, total: 0 },
                drinks: { count: 0, total: 0 },
                snacks: { count: 0, total: 0 }
            }
        };

        // Calcola totali per categoria
        Object.keys(this.cart).forEach(category => {
            this.cart[category].forEach(item => {
                const itemTotal = item.price * item.quantity;
                summary.totalItems += item.quantity;
                summary.totalPrice += itemTotal;
                summary.itemsByCategory[category].count += item.quantity;
                summary.itemsByCategory[category].total += itemTotal;
            });
        });

        return summary;
    }

    updateCartUI() {
        // Aggiorna badge navbar
        this.updateCartBadge();

        // Aggiorna box carrello se visibile con transizioni fluide
        const cartBox = document.getElementById('catalog-cart-box');
        if (cartBox) {
            const summary = this.getCartSummary();

            // ✅ CARRELLO SEMPRE VISIBILE PER UTENTI AUTENTICATI
            if (this.isAuthenticated) {
                cartBox.style.display = 'block';
                
                // Aggiornamento fluido senza scatti
                if (summary.totalItems > 0) {
                    this.updateCartBoxSmooth(cartBox, summary);
                } else {
                    this.showEmptyCartSmooth(cartBox);
                }
                console.log('🛒 Carrello aggiornato fluido:', summary.totalItems, 'elementi');
            } else {
                // Utente non loggato: nascondi carrello
                cartBox.style.display = 'none';
                console.log('🚫 Carrello nascosto per utente non autenticato');
            }
        } else {
            console.warn('⚠️ Elemento carrello non trovato nel DOM');
        }
    }

    updateCartBoxSmooth(cartBox, summary) {
        // Controlla se dobbiamo ricreare la struttura
        const existingContent = cartBox.querySelector('.cart-summary');
        
        if (!existingContent) {
            // Prima volta: crea con fade-in
            cartBox.style.opacity = '0';
            cartBox.innerHTML = this.createCartBoxHTML();
            setTimeout(() => {
                cartBox.style.opacity = '1';
            }, 50);
            return;
        }

        // Aggiorna solo i valori che cambiano
        this.updateCartNumbers(cartBox, summary);
        this.updateCartItems(cartBox);
    }

    updateCartNumbers(cartBox, summary) {
        const totalItemsEl = cartBox.querySelector('.cart-total-items');
        const totalPriceEl = cartBox.querySelector('.cart-total-price');
        
        if (totalItemsEl && totalItemsEl.textContent != summary.totalItems) {
            totalItemsEl.style.transform = 'scale(1.1)';
            totalItemsEl.textContent = summary.totalItems;
            setTimeout(() => totalItemsEl.style.transform = 'scale(1)', 200);
        }
        
        if (totalPriceEl) {
            totalPriceEl.textContent = `€${summary.totalPrice.toFixed(2)}`;
        }
    }

    updateCartItems(cartBox) {
        // Aggiorna contenuto items senza reflow
        const categoriesContainer = cartBox.querySelector('.cart-categories');
        if (categoriesContainer) {
            const newContent = this.createCartCategoriesHTML();
            if (categoriesContainer.innerHTML !== newContent) {
                categoriesContainer.style.transition = 'opacity 0.2s ease';
                categoriesContainer.style.opacity = '0.7';
                categoriesContainer.innerHTML = newContent;
                setTimeout(() => {
                    categoriesContainer.style.opacity = '1';
                }, 100);
            }
        }
    }

    showEmptyCartSmooth(cartBox) {
        const isCurrentlyEmpty = cartBox.querySelector('.cart-empty-state');
        if (!isCurrentlyEmpty) {
            cartBox.style.transition = 'opacity 0.3s ease';
            cartBox.style.opacity = '0.7';
            cartBox.innerHTML = this.createEmptyCartHTML();
            setTimeout(() => {
                cartBox.style.opacity = '1';
            }, 150);
        }
    }

    createCartCategoriesHTML() {
        return `
            ${this.createCartCategoryHTML('games', 'Giochi', 'fas fa-dice-d20')}
            ${this.createCartCategoryHTML('drinks', 'Drink', 'fas fa-cocktail')}
            ${this.createCartCategoryHTML('snacks', 'Snack', 'fas fa-cookie-bite')}
        `;
    }

    createEmptyCartHTML() {
        return `
            <div id="catalog-cart-box" class="catalog-cart-box">
                <div class="cart-box-header">
                    <h3 class="cart-box-title">
                        <i class="fas fa-shopping-basket"></i>
                        Carrello
                        <span class="cart-box-count">(vuoto)</span>
                    </h3>
                    <button class="cart-box-toggle" onclick="window.catalogPageManager.toggleCartBox()">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                </div>
                <div class="cart-box-content">
                    <div style="text-align: center; padding: 2rem; color: #718096;">
                        <i class="fas fa-shopping-basket" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                        <p>Il tuo carrello è vuoto</p>
                        <p style="font-size: 0.9rem;">Aggiungi giochi, drink o snack per iniziare!</p>
                    </div>
                </div>
            </div>
        `;
    }

    updateCartBadge() {
        const summary = this.getCartSummary();
        const badge = document.querySelector('.cart-badge');

        if (summary.totalItems > 0) {
            if (!badge) {
                // Crea badge se non esiste
                const prenotazioniBtn = document.querySelector('[onclick*="prenotazioni"]');
                if (prenotazioniBtn) {
                    const badgeElement = document.createElement('span');
                    badgeElement.className = 'cart-badge';
                    badgeElement.textContent = summary.totalItems;
                    prenotazioniBtn.style.position = 'relative';
                    prenotazioniBtn.appendChild(badgeElement);
                }
            } else {
                // Aggiorna badge esistente
                badge.textContent = summary.totalItems;
            }
        } else {
            // Rimuovi badge se carrello vuoto
            if (badge) {
                badge.remove();
            }
        }
    }

    showCartNotification(item, quantity, action) {
        if (window.NotificationSystem) {
            const messages = {
                added: `✅ ${item.name} aggiunto al carrello${quantity > 1 ? ` (${quantity}x)` : ''}`,
                removed: `🗑️ ${item.name} rimosso dal carrello`,
                updated: `🔄 ${item.name} aggiornato nel carrello`
            };

            window.NotificationSystem.show(
                messages[action] || 'Carrello aggiornato',
                'success',
                'Dice & Drink'
            );
        } else {
            console.log(`🛒 ${action}: ${item.name} ${quantity > 1 ? `(${quantity}x)` : ''}`);
        }
    }

    // ==========================================
    // MODAL QUANTITÀ PER DRINK/SNACK
    // ==========================================

    showQuantityModal(item) {
        const category = this.currentCategory;

        // Giochi non hanno modal quantità
        if (category === 'giochi') {
            return this.addToCart(item, 1);
        }

        // Crea modal quantità
        const modalHTML = `
            <div class="modal-overlay quantity-modal" id="quantityModal">
                <div class="modal-content">
                    <button class="modal-close" onclick="window.catalogPageManager.closeQuantityModal()">
                        <i class="fas fa-times"></i>
                    </button>

                    <div class="quantity-modal-header">
                        <img src="${item.imageUrl || '/assets/default.jpg'}" alt="${item.name}" class="quantity-item-image">
                        <div class="quantity-item-info">
                            <h3>${item.name}</h3>
                            <p class="quantity-item-price">€${item.price} cad.</p>
                        </div>
                    </div>

                    <div class="quantity-selector">
                        <label class="quantity-label">Seleziona quantità:</label>
                        <div class="quantity-controls">
                            <button class="quantity-control-btn" onclick="window.catalogPageManager.adjustQuantity(-1)">-</button>
                            <input type="number" id="quantity-input" value="1" min="1" max="10">
                            <button class="quantity-control-btn" onclick="window.catalogPageManager.adjustQuantity(1)">+</button>
                        </div>
                        <p class="quantity-total">Totale: €<span id="quantity-total">${item.price}</span></p>
                    </div>

                    <div class="quantity-actions">
                        <button class="quantity-cancel-btn" onclick="window.catalogPageManager.closeQuantityModal()">
                            Annulla
                        </button>
                        <button class="quantity-add-btn" onclick="window.catalogPageManager.confirmAddToCart(${item.id})">
                            <i class="fas fa-cart-plus"></i>
                            Aggiungi al Carrello
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Aggiungi al DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Store item temporaneo
        this.tempQuantityItem = item;

        // Setup eventi
        this.setupQuantityModalEvents();

        // Mostra modal
        document.getElementById('quantityModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    setupQuantityModalEvents() {
        const input = document.getElementById('quantity-input');
        if (input) {
            input.addEventListener('input', () => this.updateQuantityTotal());
        }
    }

    adjustQuantity(change) {
        const input = document.getElementById('quantity-input');
        if (input) {
            const newValue = Math.max(1, parseInt(input.value) + change);
            input.value = Math.min(10, newValue);
            this.updateQuantityTotal();
        }
    }

    updateQuantityTotal() {
        const input = document.getElementById('quantity-input');
        const totalSpan = document.getElementById('quantity-total');

        if (input && totalSpan && this.tempQuantityItem) {
            const quantity = parseInt(input.value) || 1;
            const total = (this.tempQuantityItem.price * quantity).toFixed(2);
            totalSpan.textContent = total;
        }
    }

    confirmAddToCart(itemId) {
        const input = document.getElementById('quantity-input');
        const quantity = parseInt(input.value) || 1;

        if (this.tempQuantityItem && this.tempQuantityItem.id === itemId) {
            this.addToCart(this.tempQuantityItem, quantity);
        }

        this.closeQuantityModal();
    }

    closeQuantityModal() {
        const modal = document.getElementById('quantityModal');
        if (modal) {
            modal.remove();
        }
        this.tempQuantityItem = null;
        document.body.style.overflow = 'auto';
    }

    // ==========================================
    // CARICAMENTO DATI DA API
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
                ${this.createCartBoxHTML()}
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

        // Se non ci sono items ancora caricati, mostra skeleton loader
        if (!this.currentItems || this.currentItems.length === 0) {
            return this.createSkeletonGridHTML();
        }

        if (filteredItems.length === 0) {
            return this.createEmptyStateHTML();
        }

        return `
            <div class="items-grid" id="itemsGrid">
                ${filteredItems.map(item => this.createItemCardHTML(item)).join('')}
            </div>
        `;
    }

    createSkeletonGridHTML() {
        // Crea 6 skeleton cards per un caricamento più fluido
        const skeletonCards = Array(6).fill().map(() => `
            <div class="skeleton-card">
                <div class="skeleton-image"></div>
                <div class="skeleton-content">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-description"></div>
                    <div class="skeleton-price"></div>
                    <div class="skeleton-button"></div>
                </div>
            </div>
        `).join('');

        return `
            <div class="items-grid" id="itemsGrid">
                ${skeletonCards}
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
        const imageUrl = getImageUrlWithLocalFallback(game, 'games');
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

                    <button class="rent-btn" onclick="window.catalogPageManager.handleRentGame(${game.id})">
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
<div class="item-image" style="background-image: url('${getImageUrlWithLocalFallback(drink, 'drinks')}');">
                    <button class="expand-btn" onclick="window.catalogPageManager.openItemModal(${drink.id})">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>

                <div class="item-content">
                    <h3 class="item-title">${drink.name}</h3>
                    <span class="item-category ${drink.isAlcoholic ? 'alcoholic' : 'non-alcoholic'}">
                        ${drink.isAlcoholic ? 'Alcolico' : 'Analcolico'}
                    </span>

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

                    <button class="rent-btn" onclick="window.catalogPageManager.handleOrderDrink(${drink.id})">
                        <i class="fas fa-glass-cheers"></i>
                        Ordina
                    </button>
                </div>
            </div>
        `;
    }

    createSnackCardHTML(snack) {
        return `
            <div class="item-card snack-card" data-item-id="${snack.id}">
<div class="item-image" style="background-image: url('${getImageUrlWithLocalFallback(snack, 'snacks')}');">
                    <button class="expand-btn" onclick="window.catalogPageManager.openItemModal(${snack.id})">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>

                <div class="item-content">
                    <h3 class="item-title">${snack.name}</h3>
                    <span class="item-category ${snack.isSweet ? 'sweet' : 'savory'}">
                        ${snack.isSweet ? 'Dolce' : 'Salato'}
                    </span>

                    <div class="item-stats">
                        <div class="item-stat">
                            <div class="item-stat-icon">
                                <i class="fas fa-euro-sign"></i>
                            </div>
                            <div class="item-stat-value">€${snack.price}</div>
                            <div class="item-stat-label">Prezzo</div>
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

                    <button class="rent-btn" onclick="window.catalogPageManager.handleOrderSnack(${snack.id})">
                        <i class="fas fa-shopping-cart"></i>
                        Ordina
                    </button>
                </div>
            </div>
        `;
    }

    // ==========================================
    // ✅ BOX CARRELLO FISSO IN FONDO
    // ==========================================

    createCartBoxHTML() {
        const summary = this.getCartSummary();

        if (summary.totalItems === 0) {
            return '<div id="catalog-cart-box" style="display: none;"></div>';
        }

        return `
            <div id="catalog-cart-box" class="catalog-cart-box">
                <div class="cart-box-header">
                    <h3 class="cart-box-title">
                        <i class="fas fa-shopping-basket"></i>
                        Carrello
                        <span class="cart-box-count">(${summary.totalItems} elementi)</span>
                    </h3>
                    <button class="cart-box-toggle" onclick="window.catalogPageManager.toggleCartBox()">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                </div>

                <div class="cart-box-content">
                    <div class="cart-categories">
                        ${this.createCartCategoryHTML('games', 'Giochi', 'fas fa-dice-d20')}
                        ${this.createCartCategoryHTML('drinks', 'Drink', 'fas fa-cocktail')}
                        ${this.createCartCategoryHTML('snacks', 'Snack', 'fas fa-cookie-bite')}
                    </div>

                    <div class="cart-box-summary">
                        <div class="cart-summary-row cart-total">
                            <span><strong>Totale Carrello:</strong></span>
                            <span><strong>€${summary.totalPrice.toFixed(2)}</strong></span>
                        </div>
                    </div>

                    <div class="cart-box-actions">
                        <button class="cart-btn-clear" onclick="window.catalogPageManager.clearCartConfirm()">
                            <i class="fas fa-trash-alt"></i>
                            Svuota
                        </button>
                        ${this.isEditingBooking ? `
                            <button class="cart-btn-edit-confirm" onclick="window.catalogPageManager.confirmBookingChanges()">
                                <i class="fas fa-save"></i>
                                Conferma Modifiche
                            </button>
                            <button class="cart-btn-edit-cancel" onclick="window.catalogPageManager.cancelBookingEdit()">
                                <i class="fas fa-times"></i>
                                Annulla
                            </button>
                        ` : `
                            <button class="cart-btn-primary" onclick="window.catalogPageManager.goToBookings()">
                                <i class="fas fa-arrow-right"></i>
                                Vai alle Prenotazioni
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }
createCartCategoryHTML(category, title, icon) {
        const items = this.cart[category];
        if (!items || items.length === 0) return '';

        const categoryTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        return `
            <div class="cart-category">
                <div class="cart-category-header">
                    <i class="${icon}"></i>
                    <span class="cart-category-title">${title}</span>
                    <span class="cart-category-count">(${items.length})</span>
                </div>
                <div class="cart-category-divider"></div>
                <ul class="cart-item-list">
                    ${items.map(item => `
                        <li class="cart-item-entry">
                            <span class="cart-item-name">
                                ${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}
                            </span>
                            <div class="cart-item-controls">
                                <span class="cart-item-price">€${(item.price * item.quantity).toFixed(2)}</span>
                                ${category !== 'games' ? `
                                    <div class="cart-quantity-controls">
                                        <button class="cart-qty-btn" onclick="window.catalogPageManager.updateQuantity(${item.id}, '${category}', ${item.quantity - 1})">-</button>
                                        <span class="cart-qty-display">${item.quantity}</span>
                                        <button class="cart-qty-btn" onclick="window.catalogPageManager.updateQuantity(${item.id}, '${category}', ${item.quantity + 1})">+</button>
                                    </div>
                                ` : ''}
                                <button class="cart-item-remove" onclick="window.catalogPageManager.removeFromCart(${item.id}, '${category}')" title="Rimuovi">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </li>
                    `).join('')}
                </ul>
                <div class="cart-category-total">
                    <span>Subtotale ${title}:</span>
                    <span>€${categoryTotal.toFixed(2)}</span>
                </div>
            </div>
        `;
    }

    toggleCartBox() {
        const cartBox = document.getElementById('catalog-cart-box');
        const content = cartBox.querySelector('.cart-box-content');
        const toggle = cartBox.querySelector('.cart-box-toggle i');

        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.className = 'fas fa-chevron-up';
        } else {
            content.style.display = 'none';
            toggle.className = 'fas fa-chevron-down';
        }
    }

    clearCartConfirm() {
        // Crea modal personalizzato
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay custom-confirm-modal';
        modalOverlay.style.zIndex = '10000';
        
        modalOverlay.innerHTML = `
            <div class="modal-content confirm-modal-content">
                <div class="confirm-modal-header">
                    <div class="confirm-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3 class="confirm-title">Svuota Carrello</h3>
                </div>
                
                <div class="confirm-modal-body">
                    <p class="confirm-message">
                        Sei sicuro di voler rimuovere <strong>tutti gli elementi</strong> dal carrello?
                    </p>
                    <p class="confirm-warning">
                        <i class="fas fa-info-circle"></i>
                        Questa azione non può essere annullata.
                    </p>
                </div>
                
                <div class="confirm-modal-actions">
                    <button class="confirm-btn confirm-cancel">
                        <i class="fas fa-times"></i>
                        Annulla
                    </button>
                    <button class="confirm-btn confirm-delete">
                        <i class="fas fa-trash-alt"></i>
                        Svuota Carrello
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalOverlay);
        
        // Animazione di entrata
        setTimeout(() => modalOverlay.classList.add('active'), 10);
        
        // Event listeners
        modalOverlay.querySelector('.confirm-cancel').addEventListener('click', () => {
            this.closeConfirmModal(modalOverlay);
        });
        
        modalOverlay.querySelector('.confirm-delete').addEventListener('click', () => {
            this.clearCart();
            this.closeConfirmModal(modalOverlay);
            console.log('🧹 Carrello svuotato dall\'utente');
        });
        
        // Chiudi cliccando fuori
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                this.closeConfirmModal(modalOverlay);
            }
        });
        
        // Chiudi con Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeConfirmModal(modalOverlay);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    closeConfirmModal(modalOverlay) {
        modalOverlay.classList.remove('active');
        setTimeout(() => {
            if (modalOverlay.parentNode) {
                modalOverlay.parentNode.removeChild(modalOverlay);
            }
        }, 300);
    }

    goToBookings() {
        console.log('🎯 Reindirizzamento alle prenotazioni con carrello...');
        window.showPage('prenotazioni');
    }

    // ==========================================
    // GESTIONE EDITING PRENOTAZIONI
    // ==========================================
    
    confirmBookingChanges() {
        if (!this.isEditingBooking || !this.editContext) {
            console.warn('⚠️ Non in modalità editing');
            return;
        }
        
        const summary = this.getCartSummary();
        if (summary.totalItems === 0) {
            alert('Seleziona almeno un prodotto per confermare le modifiche');
            return;
        }
        
        console.log('💾 Conferma modifiche prenotazione:', this.editContext);
        
        // Prepara i dati delle modifiche
        const modifications = this.prepareBookingModifications();
        
        // Salva le modifiche nel localStorage per il ritorno
        localStorage.setItem('pendingBookingChanges', JSON.stringify(modifications));
        
        // Torna alla pagina delle prenotazioni
        this.returnToBookings();
    }
    
    cancelBookingEdit() {
        if (confirm('Sei sicuro di voler annullare le modifiche? Tutte le selezioni verranno perse.')) {
            console.log('❌ Modifica prenotazione annullata');
            
            // Pulisci il carrello e il context
            this.clearCart();
            this.clearEditingContext();
            
            // Torna alla pagina delle prenotazioni
            this.returnToBookings();
        }
    }
    
    prepareBookingModifications() {
        const summary = this.getCartSummary();
        const editType = this.editContext.editType;
        
        const modifications = {
            bookingDate: this.editContext.bookingDate,
            editType: editType,
            timestamp: Date.now()
        };
        
        // Converte il carrello nel formato appropriato per l'editing
        switch(editType) {
            case 'giochi':
                modifications.game_requests = this.formatCartItemsForBooking(this.cart.games);
                break;
            case 'drink':
                modifications.drink_orders = this.formatCartItemsForBooking(this.cart.drinks);
                break;
            case 'snack':
                modifications.snack_orders = this.formatCartItemsForBooking(this.cart.snacks);
                break;
        }
        
        console.log('📋 Modifiche preparate:', modifications);
        return modifications;
    }
    
    formatCartItemsForBooking(items) {
        if (!items || items.length === 0) return '';
        
        return items.map(item => {
            if (item.quantity > 1) {
                return `${item.name} (x${item.quantity})`;
            }
            return item.name;
        }).join(', ');
    }
    
    returnToBookings() {
        // Pulisci il context di editing
        this.clearEditingContext();
        
        // Reindirizza alla pagina prenotazioni
        const returnUrl = this.editContext?.returnUrl || '/prenotazioni-utente';
        
        if (window.page) {
            window.page(returnUrl);
        } else {
            window.location.href = returnUrl;
        }
    }
    
    clearEditingContext() {
        localStorage.removeItem('bookingEditContext');
        this.isEditingBooking = false;
        this.editContext = null;
        
        // Rimuovi la notifica di editing se presente
        const editingNotification = document.querySelector('.editing-notification');
        if (editingNotification) {
            editingNotification.remove();
        }
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

        // 5)Setup eventi carrello
        this.updateCartUI();
    }

    setupFilterChipEvents() {
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', e => this.handleFilterChipClick(e));
        });

        // Forza aggiornamento UI carrello all'inizio
        this.updateCartUI();
    }

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

    // ==========================================
    // METODI AZIONI UTENTE - CON CARRELLO
    // ==========================================

    async switchCategory(category) {
        console.log(`🔄 Switch categoria: ${this.currentCategory} → ${category}`);

        if (category === this.currentCategory) return;

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');

        this.currentCategory = category;
        this.searchTerm = '';

        try {
            const itemsGrid = document.getElementById('itemsGrid');
            if (itemsGrid) {
                // Transizione fluida invece di svuotamento immediato
                itemsGrid.style.opacity = '0.6';
                itemsGrid.style.pointerEvents = 'none';
            }

            await this.loadCategoryData(category);
            this.refreshFullUISmooth();

        } catch (error) {
            console.error('❌ Errore switch categoria:', error);
            window.showError('Errore Categoria', 'Errore nel caricamento della categoria: ' + error.message);
            
            // Ripristina in caso di errore
            const itemsGrid = document.getElementById('itemsGrid');
            if (itemsGrid) {
                itemsGrid.style.opacity = '1';
                itemsGrid.style.pointerEvents = 'auto';
            }
        }
    }

    refreshFullUI() {
        const statsBar = document.querySelector('.stats-bar');
        if (statsBar) {
            const newStatsHTML = this.createStatsBarHTML();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newStatsHTML;
            const newStatsBar = tempDiv.firstElementChild;

            statsBar.parentNode.replaceChild(newStatsBar, statsBar);
        }

        this.refreshItemsGrid();

        this.updateCartUI();

        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.refreshItemsGrid();
            });
        }

        this.setupFilterChipEvents();
    }

    refreshFullUISmooth() {
        // Aggiorna stats bar senza flash
        const statsBar = document.querySelector('.stats-bar');
        if (statsBar) {
            const newStatsHTML = this.createStatsBarHTML();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newStatsHTML;
            const newStatsBar = tempDiv.firstElementChild;

            statsBar.style.transition = 'opacity 0.2s ease';
            statsBar.style.opacity = '0.7';
            setTimeout(() => {
                statsBar.parentNode.replaceChild(newStatsBar, statsBar);
            }, 100);
        }

        // Aggiorna grid con fade-in fluido
        this.refreshItemsGridSmooth();

        // Aggiorna carrello
        this.updateCartUI();

        // Setup eventi
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.refreshItemsGrid();
            });
        }

        this.setupFilterChipEvents();
    }

    refreshItemsGridSmooth() {
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

            // Ripristina opacità e interattività con transizione
            setTimeout(() => {
                itemsGrid.style.transition = 'opacity 0.3s ease';
                itemsGrid.style.opacity = '1';
                itemsGrid.style.pointerEvents = 'auto';
                setupAllLocalImageFallbacks();
            }, 50);
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
            setTimeout(() => setupAllLocalImageFallbacks(), 100);

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

        if (this.currentCategory === 'giochi') {
            this.populateGameModal(item, modalImage, modalTitle, modalDescription, modalStats, modalActionBtn);
        } else if (this.currentCategory === 'drink') {
            this.populateDrinkModal(item, modalImage, modalTitle, modalDescription, modalStats, modalActionBtn);
        } else if (this.currentCategory === 'snack') {
            this.populateSnackModal(item, modalImage, modalTitle, modalDescription, modalStats, modalActionBtn);
        }

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

    // ==========================================
    // NUOVI HANDLER PER CARRELLO
    // ==========================================

    handleRentGame(gameId) {
        console.log(`🎮 Tentativo noleggio gioco ${gameId}`);

        // CONTROLLO AUTENTICAZIONE
        if (!this.isAuthenticated) {
            console.log('❌ Utente non autenticato per noleggio, mostra modal login');
            this.openAuthModal();
            return;
        }

        // Utente autenticato, aggiungi al carrello
        const game = this.currentItems.find(g => g.id == gameId);
        if (game) {
            this.addToCart(game, 1, 'games');
        } else {
            console.error('❌ Gioco non trovato:', gameId);
        }
    }

    handleOrderDrink(drinkId) {
        console.log(`🍻 Tentativo ordine drink ${drinkId}`);

        // CONTROLLO AUTENTICAZIONE
        if (!this.isAuthenticated) {
            console.log('❌ Utente non autenticato per ordine, mostra modal login');
            this.openAuthModal();
            return;
        }

        // Utente autenticato, attiva controlli inline
        const drink = this.currentItems.find(d => d.id == drinkId);
        if (drink) {
            this.activateInlineQuantityControls(drinkId, 'drinks', drink);
        } else {
            console.error('❌ Drink non trovato:', drinkId);
        }
    }

    handleOrderSnack(snackId) {
        console.log(`🍿 Tentativo ordine snack ${snackId}`);

        // CONTROLLO AUTENTICAZIONE
        if (!this.isAuthenticated) {
            console.log('❌ Utente non autenticato per ordine, mostra modal login');
            this.openAuthModal();
            return;
        }

        // Utente autenticato, attiva controlli inline
        const snack = this.currentItems.find(s => s.id == snackId);
        if (snack) {
            this.activateInlineQuantityControls(snackId, 'snacks', snack);
        } else {
            console.error('❌ Snack non trovato:', snackId);
        }
    }

    // ==========================================
    // CONTROLLI QUANTITÀ ELEGANTI
    // ==========================================
    
    activateInlineQuantityControls(itemId, category, item) {
        // Trova il container del bottone
        const allButtons = document.querySelectorAll('.rent-btn');
        let targetButton = null;
        
        for (let btn of allButtons) {
            if (btn.onclick && btn.onclick.toString().includes(itemId)) {
                targetButton = btn;
                break;
            }
        }
        
        if (targetButton) {
            this.createQuantitySelector(targetButton, itemId, category, item);
        }
    }
    
    createQuantitySelector(button, itemId, category, item) {
        // Verifica se i controlli esistono già
        const buttonContainer = button.parentNode;
        if (buttonContainer.querySelector('.quantity-selector')) {
            return; // Già attivati
        }
        
        // Crea wrapper per bottone + controlli quantità
        const wrapper = document.createElement('div');
        wrapper.className = 'button-quantity-wrapper';
        
        // Modifica il bottone originale per mostrare quantità
        button.classList.add('quantity-enabled');
        button.innerHTML = `
            <span class="btn-icon">${category === 'drinks' ? '<i class="fas fa-glass-cheers"></i>' : '<i class="fas fa-shopping-cart"></i>'}</span>
            <span class="btn-text">Scegli Quantità</span>
            <span class="quantity-badge" title="Quantità selezionata">1</span>
        `;
        
        // Aggiungi tooltip al bottone
        button.title = "Clicca per scegliere la quantità e aggiungere al carrello";
        
        // Crea controlli quantità compatti
        const quantitySelector = document.createElement('div');
        quantitySelector.className = 'quantity-selector';
        quantitySelector.innerHTML = `
            <button class="qty-btn qty-minus" data-item-id="${itemId}" title="Riduci quantità">
                <i class="fas fa-minus"></i>
            </button>
            <button class="qty-btn qty-plus" data-item-id="${itemId}" title="Aumenta quantità">
                <i class="fas fa-plus"></i>
            </button>
            <button class="qty-confirm" data-item-id="${itemId}" data-category="${category}" title="Aggiungi al carrello">
                <i class="fas fa-check"></i>
            </button>
        `;
        
        // Sostituisci il bottone con il wrapper
        buttonContainer.replaceChild(wrapper, button);
        wrapper.appendChild(button);
        wrapper.appendChild(quantitySelector);
        
        // Aggiungi event listeners
        this.setupQuantityEvents(wrapper, itemId, category, item);
    }
    
    setupQuantityEvents(wrapper, itemId, category, item) {
        const quantityBadge = wrapper.querySelector('.quantity-badge');
        const minusBtn = wrapper.querySelector('.qty-minus');
        const plusBtn = wrapper.querySelector('.qty-plus');
        const confirmBtn = wrapper.querySelector('.qty-confirm');
        const orderBtn = wrapper.querySelector('.rent-btn');
        
        let currentQuantity = 1;
        
        // Aggiorna badge quantità
        const updateQuantityBadge = () => {
            quantityBadge.textContent = currentQuantity;
            quantityBadge.style.background = currentQuantity > 1 ? '#10b981' : '#8B5CF6';
        };
        
        // Diminuisci quantità
        minusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentQuantity > 1) {
                currentQuantity--;
                updateQuantityBadge();
            }
        });
        
        // Aumenta quantità
        plusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentQuantity < 10) {
                currentQuantity++;
                updateQuantityBadge();
            }
        });
        
        // Conferma e aggiungi al carrello
        confirmBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.addToCart(item, currentQuantity, category);
            this.resetQuantitySelector(wrapper);
            console.log(`✅ Aggiunto al carrello: ${item.name} x${currentQuantity}`);
        });
        
        // Click sul bottone principale: attiva/disattiva controlli
        orderBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const selector = wrapper.querySelector('.quantity-selector');
            selector.classList.toggle('active');
        });
    }
    
    resetQuantitySelector(wrapper) {
        const quantityBadge = wrapper.querySelector('.quantity-badge');
        const selector = wrapper.querySelector('.quantity-selector');
        
        // Reset a quantità 1
        quantityBadge.textContent = '1';
        quantityBadge.style.background = '#8B5CF6';
        
        // Nascondi controlli
        selector.classList.remove('active');
        
        // Breve animazione di conferma
        wrapper.classList.add('added-to-cart');
        setTimeout(() => {
            wrapper.classList.remove('added-to-cart');
        }, 1000);
    }
    
    restoreOriginalButton(container, itemId) {
        const originalHtml = container.previousElementSibling?.dataset?.originalHtml || 
                           container.dataset.originalHtml;
        
        if (originalHtml) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = originalHtml;
            const originalButton = tempDiv.firstElementChild;
            container.parentNode.replaceChild(originalButton, container);
        } else {
            // Fallback: ricostruisci il bottone base
            const fallbackButton = document.createElement('button');
            fallbackButton.className = 'rent-btn';
            
            if (category === 'drinks') {
                fallbackButton.innerHTML = `<i class="fas fa-glass-cheers"></i> Ordina`;
                fallbackButton.onclick = () => this.handleOrderDrink(itemId);
            } else if (category === 'snacks') {
                fallbackButton.innerHTML = `<i class="fas fa-shopping-cart"></i> Ordina`;
                fallbackButton.onclick = () => this.handleOrderSnack(itemId);
            }
            
            container.parentNode.replaceChild(fallbackButton, container);
        }
    }

    // ==========================================
    // PROTEZIONE AUTENTICAZIONE
    // ==========================================

    openAuthModal() {
        console.log('🔐 Apertura modal di autenticazione per guest');

        // Usa il sistema SimpleAuth esistente
        if (window.SimpleAuth && typeof window.SimpleAuth.showLoginModal === 'function') {
            console.log('✅ Utilizzo SimpleAuth.showLoginModal()');
            window.SimpleAuth.showLoginModal();
        } else {
            console.warn('⚠️ SimpleAuth non disponibile, fallback al prompt');
            this.showGuestPrompt();
        }
    }

    showGuestPrompt() {
        const choice = confirm(
            "🔐 ACCESSO RICHIESTO\n\n" +
            "Per ordinare drink e snack o noleggiare giochi devi essere registrato.\n\n" +
            "Vuoi accedere ora?\n\n" +
            "• OK = Vai al login/registrazione\n" +
            "• Annulla = Continua a navigare"
        );

        if (choice) {
            // Simula click sull'icona profilo per aprire il login
            const profileIcon = document.querySelector('.navbar-profile-icon');
            if (profileIcon) {
                profileIcon.click();
            } else {
                window.showError("Sistema non disponibile", "Sistema di autenticazione non disponibile. Ricarica la pagina e riprova.");
            }
        }
    }

    addToWishlist() {
        console.log('❤️ Aggiunta alla wishlist');
        window.showInfo('Wishlist', 'Aggiunto alla wishlist! Funzionalità in sviluppo.');
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
            const alcoholicCount = this.currentItems.filter(d => d.isAlcoholic).length;
            const nonAlcoholicCount = count - alcoholicCount;

            return {
                icon: 'fas fa-cocktail',
                count: count,
                label: 'Drink Disponibili',
                rating: '4.9',
                extraIcon: 'fas fa-wine-glass',
                extraValue: `${alcoholicCount}/${nonAlcoholicCount}`,
                extraLabel: 'Alc/Analc'
            };
        } else if (this.currentCategory === 'snack') {
            const sweetCount = this.currentItems.filter(s => s.isSweet).length;
            const savoryCount = count - sweetCount;

            return {
                icon: 'fas fa-cookie-bite',
                count: count,
                label: 'Snack Disponibili',
                rating: '4.7',
                extraIcon: 'fas fa-balance-scale',
                extraValue: `${sweetCount}/${savoryCount}`,
                extraLabel: 'Dolci/Salati'
            };
        }

        return { icon: 'fas fa-cube', count: 0, label: 'Items', rating: '0', extraIcon: 'fas fa-info', extraValue: '0', extraLabel: 'Info' };
    }

    getFilteredItems() {
        let items = this.currentItems;

        // Ricerca testuale
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

        // Filtri avanzati
        if (this.selectedFilters.length > 0) {
            items = items.filter(item =>
                this.selectedFilters.every(filter => {
                    switch (filter) {
                        case 'alcoholic':
                            return item.isAlcoholic === 1;
                        case 'non-alcoholic':
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

    formatBaseSpirit(baseSpirit) {
        if (!baseSpirit) return 'Misto';

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
        modalActionBtn.onclick = () => this.handleRentGame(game.id);
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
        modalActionBtn.onclick = () => this.handleOrderDrink(drink.id);
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
            <div class="modal-stat">
                <div class="item-stat-icon"><i class="fas fa-clock"></i></div>
                <div class="item-stat-value">${this.getBestTime(snack)}</div>
                <div class="item-stat-label">Momento Ideale</div>
            </div>
        `;

        modalActionBtn.innerHTML = `
            <i class="fas fa-shopping-cart"></i>
            Ordina - €${snack.price}
        `;
        modalActionBtn.onclick = () => this.handleOrderSnack(snack.id);
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

    // Controlla se siamo in modalità editing prenotazione
    const bookingEditContext = localStorage.getItem('bookingEditContext');
    if (bookingEditContext) {
        try {
            const editContext = JSON.parse(bookingEditContext);
            if (editContext.isEditingBooking === true) {
                console.log('📝 Modalità editing prenotazione attiva:', editContext);
                manager.setEditingMode(editContext);
            }
        } catch (e) {
            console.warn('⚠️ Errore parsing context editing:', e);
        }
    }

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
        console.log(`🛒 Carrello attuale:`, manager.getCartSummary());
        setTimeout(() => {
            console.log('🎯 Setup immagini finale...');
            setupAllLocalImageFallbacks();
        }, 100);

    } catch (error) {
        console.error('❌ Errore caricamento catalogo:', error);
        content.innerHTML = manager.createErrorHTML(`Errore nel caricamento del catalogo: ${error.message}`);
    }
}

// ==========================================
// FUNZIONI UTILITY GLOBALI PER TEST
// ==========================================

// Funzione per test rapido del carrello
window.testCartSystem = function() {
    console.log('🧪 Test sistema carrello...');

    if (!window.catalogPageManager) {
        console.warn('⚠️ Manager non trovato, carica prima il catalogo');
        return;
    }

    const manager = window.catalogPageManager;

    // Crea items di test
    const testGame = { id: 1, name: 'Test Game', rentalPrice: 10.00, imageUrl: '/test.jpg' };
    const testDrink = { id: 1, name: 'Test Drink', price: 6.50, imageUrl: '/test.jpg' };
    const testSnack = { id: 1, name: 'Test Snack', price: 4.00, imageUrl: '/test.jpg' };

    // Test aggiunta al carrello
    manager.addToCart(testGame, 1, 'games');
    manager.addToCart(testDrink, 2, 'drinks');
    manager.addToCart(testSnack, 3, 'snacks');

    console.log('✅ Test completato - controlla il carrello!');
    console.log('💰 Summary:', manager.getCartSummary());
};

// Funzione per debug stato carrello
window.debugCartState = function() {
    console.log('🔍 Debug stato carrello:');

    if (window.catalogPageManager) {
        const manager = window.catalogPageManager;
        console.log('🛒 Carrello:', manager.cart);
        console.log('📊 Summary:', manager.getCartSummary());
        console.log('💾 Storage:', sessionStorage.getItem(CATALOG_CONFIG.CART_STORAGE_KEY));
    } else {
        console.log('❌ Manager non inizializzato');
    }
};

// Funzione per pulire carrello
window.clearTestCart = function() {
    if (window.catalogPageManager) {
        window.catalogPageManager.clearCart();
        console.log('🧹 Carrello di test pulito');
    }
};

// Funzione per test autenticazione
window.testAuthSystem = function() {
    console.log('🔐 Test sistema autenticazione...');

    if (window.catalogPageManager) {
        const manager = window.catalogPageManager;
        console.log('✅ Autenticato:', manager.isAuthenticated);
        console.log('👤 Utente:', manager.getCurrentUserName());
        console.log('🔑 Token presente:', !!localStorage.getItem('authToken'));
        console.log('🪟 SimpleAuth:', !!window.SimpleAuth);
    } else {
        console.log('❌ Manager non inizializzato');
    }
};

// Funzione per test completo catalogo
window.testFullCatalog = function() {
    console.log('🧪 Test completo catalogo...');

    if (!window.catalogPageManager) {
        console.warn('⚠️ Manager non trovato, carica prima il catalogo');
        return;
    }

    const manager = window.catalogPageManager;

    // Test stato manager
    console.log('📊 Stato Manager:');
    console.log('  - Categoria corrente:', manager.currentCategory);
    console.log('  - Items caricati:', manager.currentItems.length);
    console.log('  - Termine ricerca:', manager.searchTerm);
    console.log('  - Filtri attivi:', manager.selectedFilters);

    // Test funzioni utility
    console.log('\n🔧 Test funzioni utility:');
    console.log('  - getCurrentStats():', manager.getCurrentStats());
    console.log('  - getFilteredItems():', manager.getFilteredItems().length, 'items');
    console.log('  - getCartSummary():', manager.getCartSummary());

    // Test metodi di formattazione
    console.log('\n📝 Test formattatori:');
    console.log('  - formatDuration(90):', manager.formatDuration(90));
    console.log('  - formatDifficulty(3):', manager.formatDifficulty(3));
    console.log('  - formatBaseSpirit("gin"):', manager.formatBaseSpirit('gin'));

    console.log('\n✅ Test completato!');
};

// Funzione per test modal
window.testModal = function(itemId = 1) {
    console.log(`🪟 Test apertura modal per item ${itemId}...`);

    if (window.catalogPageManager) {
        window.catalogPageManager.openItemModal(itemId);
    } else {
        console.log('❌ Manager non inizializzato');
    }
};

// Funzione per simulare errore
window.testError = function() {
    console.log('💥 Test gestione errori...');

    if (window.catalogPageManager) {
        const manager = window.catalogPageManager;
        manager.showError('Questo è un errore di test per verificare la gestione errori del catalogo.');
    } else {
        console.log('❌ Manager non inizializzato');
    }
};

// Funzione per test filtri
window.testFilters = function() {
    console.log('🔍 Test sistema filtri...');

    if (!window.catalogPageManager) {
        console.warn('⚠️ Manager non trovato');
        return;
    }

    const manager = window.catalogPageManager;

    // Test filtri drink se siamo nella categoria drink
    if (manager.currentCategory === 'drink') {
        console.log('🍺 Test filtri drink:');

        // Simula click sui filtri
        const filters = ['alcoholic', 'premium', 'economic'];
        filters.forEach(filter => {
            manager.selectedFilters.push(filter);
            console.log(`  - Filtro "${filter}" aggiunto`);
        });

        console.log('  - Filtri attivi:', manager.selectedFilters);
        console.log('  - Items filtrati:', manager.getFilteredItems().length);

        // Reset filtri
        manager.selectedFilters = [];
        console.log('  - Filtri resettati');
    } else {
        console.log('⚠️ Cambia categoria a "drink" per testare i filtri');
    }
};

// Funzione per test performance
window.testPerformance = function() {
    console.log('⚡ Test performance catalogo...');

    if (!window.catalogPageManager) {
        console.warn('⚠️ Manager non trovato');
        return;
    }

    const manager = window.catalogPageManager;

    // Test velocità rendering
    console.time('Rendering items grid');
    manager.refreshItemsGrid();
    console.timeEnd('Rendering items grid');

    // Test velocità filtri
    console.time('Filtro items');
    const filteredItems = manager.getFilteredItems();
    console.timeEnd('Filtro items');
    console.log(`📊 Items filtrati: ${filteredItems.length}`);

    // Test velocità stats
    console.time('Calcolo stats');
    const stats = manager.getCurrentStats();
    console.timeEnd('Calcolo stats');
    console.log('📈 Stats:', stats);

    // Test velocità carrello
    console.time('Calcolo summary carrello');
    const summary = manager.getCartSummary();
    console.timeEnd('Calcolo summary carrello');
    console.log('🛒 Summary:', summary);
};

// ==========================================
// INIZIALIZZAZIONE AL CARICAMENTO
// ==========================================

console.log('✅ Pagina catalogo completata con sistema carrello completo');

// Log delle funzioni di test disponibili
console.log('🧪 Funzioni di test carrello disponibili:');
console.log('   🛒 window.testCartSystem() - Test aggiunta elementi');
console.log('   🔍 window.debugCartState() - Debug stato carrello');
console.log('   🧹 window.clearTestCart() - Pulisci carrello di test');
console.log('   🔐 window.testAuthSystem() - Test autenticazione');
console.log('   📊 window.testFullCatalog() - Test completo funzionalità');
console.log('   🪟 window.testModal(id) - Test apertura modal');
console.log('   💥 window.testError() - Test gestione errori');
console.log('   🔍 window.testFilters() - Test sistema filtri');
console.log('   ⚡ window.testPerformance() - Test performance');

// Funzione di help per sviluppatori
window.catalogHelp = function() {
    console.log(`
🎮 DICE & DRINK - CATALOGO HELP
================================

📋 STATO ATTUALE:
   Manager: ${!!window.catalogPageManager ? '✅ Attivo' : '❌ Non inizializzato'}
   Categoria: ${window.catalogPageManager?.currentCategory || 'N/A'}
   Items: ${window.catalogPageManager?.currentItems.length || 0}
   Carrello: ${window.catalogPageManager?.getCartSummary().totalItems || 0} elementi

🧪 COMANDI TEST DISPONIBILI:
   window.testCartSystem()     → Test sistema carrello
   window.debugCartState()    → Debug stato carrello
   window.clearTestCart()     → Pulisci carrello
   window.testAuthSystem()    → Test autenticazione
   window.testFullCatalog()   → Test completo
   window.testModal(1)        → Test modal item
   window.testError()         → Test errori
   window.testFilters()       → Test filtri
   window.testPerformance()   → Test performance

🔧 UTILITY SVILUPPO:
   window.catalogPageManager  → Accesso diretto al manager
   CATALOG_CONFIG             → Configurazione globale

💡 SUGGERIMENTI:
   - Usa testFullCatalog() per overview completa
   - debugCartState() per vedere stato carrello
   - testPerformance() per ottimizzazioni
   - F12 → Console per logs dettagliati

🚀 READY TO ROCK!
    `);
};

// Log automatico dello stato al caricamento
if (typeof window !== 'undefined') {
    console.log('🎯 Stato iniziale storage:');
    console.log('   sessionStorage:', !!sessionStorage.getItem('catalogSelection'));
    console.log('   localStorage:', !!localStorage.getItem('bookingItems'));
    console.log('   📞 Digita: window.catalogHelp() per la guida completa');
}

// ==========================================
// EXPORT FUNZIONI IMMAGINI GLOBALI
// ==========================================

if (typeof window !== 'undefined') {
    window.getImageUrlWithLocalFallback = getImageUrlWithLocalFallback;
    window.getLocalDefaultUrl = getLocalDefaultUrl;
    window.getCSSFallbackUrl = getCSSFallbackUrl;
    window.setupLocalImageFallback = setupLocalImageFallback;
    window.setupAllLocalImageFallbacks = setupAllLocalImageFallbacks;
    window.checkImageExists = checkImageExists;
    window.IMAGE_CONFIG = IMAGE_CONFIG;

    // Funzione test sistema immagini
    window.testLocalImageSystem = function() {
        console.log('🖼️ Test sistema immagini locali...');
        console.log('📁 Default locali:', IMAGE_CONFIG.LOCAL_DEFAULTS);

        setupAllLocalImageFallbacks();
        console.log('✅ Setup automatico completato');

        console.log('\n🔗 Test URL:');
        console.log('  Games:', getLocalDefaultUrl('games'));
        console.log('  Drinks:', getLocalDefaultUrl('drinks'));
        console.log('  Snacks:', getLocalDefaultUrl('snacks'));
    };
}

// ==========================================
// EXPORT E COMPATIBILITÀ
// ==========================================

// Assicura compatibilità con diversi sistemi di module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showCatalog };
}

// Support per AMD
if (typeof define === 'function' && define.amd) {
    define([], function() {
        return { showCatalog };
    });
}

// Global fallback
if (typeof window !== 'undefined') {
    window.showCatalog = showCatalog;
}

console.log('📁 Catalog module con carrello caricato completamente');

// ==========================================
// EVENT LISTENERS GLOBALI
// ==========================================

// Listener per cleanup quando la pagina cambia
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', function() {
        // Salva lo stato del carrello prima di chiudere
        if (window.catalogPageManager) {
            window.catalogPageManager.saveCartToStorage();
            console.log('💾 Stato carrello salvato prima della chiusura');
        }
    });

    // Listener per debug con tasti rapidi (solo in development)
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        document.addEventListener('keydown', function(e) {
            // Ctrl + Shift + C = Debug carrello
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                window.debugCartState();
            }

            // Ctrl + Shift + H = Help
            if (e.ctrlKey && e.shiftKey && e.key === 'H') {
                e.preventDefault();
                window.catalogHelp();
            }

            // Ctrl + Shift + T = Test completo
            if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                window.testFullCatalog();
            }
        });

        console.log('🎹 Tasti rapidi development attivi:');
        console.log('   Ctrl+Shift+C → Debug carrello');
        console.log('   Ctrl+Shift+H → Help');
        console.log('   Ctrl+Shift+T → Test completo');
    }
}

