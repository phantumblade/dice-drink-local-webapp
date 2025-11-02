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
        this.filteredCount = 0;
        this.categoryFilters = {
            giochi: [],
            drink: [],
            snack: []
        };
        this.selectedFilters = this.categoryFilters[this.currentCategory];
        this.itemQuantities = {};
        this.maxQuantity = 10;

        this.cart = this.loadCartFromStorage();
        this.globalEventsBound = false;

        // Validazione struttura carrello
        this.validateCartStructure();

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

        // Forza ricreazione carrello per applicare stili editing
        this.refreshCartForEditing();
    }

    refreshCartForEditing() {
        const cartBox = document.getElementById('catalog-cart-box');
        if (cartBox && this.isAuthenticated) {
            // Rimuovi il carrello esistente per forzare la ricreazione
            cartBox.innerHTML = '';
            // Aggiorna il carrello che ricreerà l'HTML con gli stili editing
            this.updateCartUI();
        }
    }

    customizeForEditing() {
        if (!this.isEditingBooking || !this.editContext) return;

        // Mostra notifica di editing
        this.showEditingNotification();

        // Personalizza il carrello per l'editing
        this.customizeCartForEditing();
    }

    showEditingNotification() {
        // Controlla se la notifica esiste già
        const existingNotification = document.querySelector('.editing-notification');
        if (existingNotification) {
            console.log('⚠️ Notifica editing già presente, skip');
            return;
        }

        if (!this.editContext) {
            console.log('⚠️ Nessun context editing, skip notifica');
            return;
        }

        const editType = this.editContext.editType || 'prodotti';
        const bookingDate = this.editContext.bookingDate || 'N/A';

        setTimeout(() => {
            // Doppio controllo per evitare race conditions
            const existingCheck = document.querySelector('.editing-notification');
            if (existingCheck) return;

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
        // Invece di modificare la struttura del carrello, usiamo proprietà separate
        // per evitare di corrompere la struttura degli array
        console.log('🔧 Personalizzazione carrello per editing');
        // Le proprietà isEditingBooking e editContext sono già sulla classe
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

    validateCartStructure() {
        const validCategories = ['games', 'drinks', 'snacks'];

        // Assicurati che il carrello sia un oggetto
        if (typeof this.cart !== 'object' || this.cart === null) {
            console.warn('⚠️ Carrello corrotto, ripristino struttura base');
            this.cart = {
                games: [],
                drinks: [],
                snacks: []
            };
            return;
        }

        // Assicurati che tutte le categorie siano array
        validCategories.forEach(category => {
            if (!Array.isArray(this.cart[category])) {
                console.warn(`⚠️ Categoria ${category} non è un array, ripristino`);
                this.cart[category] = [];
            }
        });

        // Rimuovi proprietà non valide che possono causare errori
        Object.keys(this.cart).forEach(key => {
            if (!validCategories.includes(key)) {
                console.warn(`⚠️ Rimozione proprietà non valida dal carrello: ${key}`);
                delete this.cart[key];
            }
        });

        console.log('✅ Struttura carrello validata');
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

        // Calcola totali per categoria (solo per array validi)
        const validCategories = ['games', 'drinks', 'snacks'];
        validCategories.forEach(category => {
            if (this.cart[category] && Array.isArray(this.cart[category])) {
                this.cart[category].forEach(item => {
                    const itemTotal = item.price * item.quantity;
                    summary.totalItems += item.quantity;
                    summary.totalPrice += itemTotal;
                    if (summary.itemsByCategory[category]) {
                        summary.itemsByCategory[category].count += item.quantity;
                        summary.itemsByCategory[category].total += itemTotal;
                    }
                });
            }
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
                        <img src="${item.imageUrl || 'assets/default.jpg'}" alt="${item.name}" class="quantity-item-image">
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
            this.filteredCount = this.currentItems.length;

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
        const filteredCount = this.filteredCount || this.currentItems.length;
        const searchActive = (this.searchTerm && this.searchTerm.trim().length > 0) || (this.selectedFilters && this.selectedFilters.length > 0);

        return `
            <div class="stats-bar">
                <div class="stats-info">
                    <div class="stat-item">
                        <i class="${stats.icon}"></i>
                        <span class="stat-number">${filteredCount}</span>
                        <span class="stat-text">${searchActive ? 'Risultati filtrati' : stats.label}</span>
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

                ${this.createAdvancedFiltersHTML()}

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
        const filterSets = {
            drink: [
                { key: 'alcoholic', icon: 'fas fa-wine-glass', label: 'Alcolico' },
                { key: 'non-alcoholic', icon: 'fas fa-coffee', label: 'Analcolico' },
                { key: 'premium', icon: 'fas fa-crown', label: 'Premium' },
                { key: 'economic', icon: 'fas fa-piggy-bank', label: 'Economico' }
            ],
            snack: [
                { key: 'sweet', icon: 'fas fa-ice-cream', label: 'Dolce' },
                { key: 'savory', icon: 'fas fa-cheese', label: 'Salato' },
                { key: 'game-friendly', icon: 'fas fa-gamepad', label: 'Game Friendly' },
                { key: 'premium', icon: 'fas fa-star', label: 'Gourmet' }
            ],
            giochi: [
                { key: 'party', icon: 'fas fa-user-friends', label: 'Party Game' },
                { key: 'strategy', icon: 'fas fa-chess-knight', label: 'Strategia' },
                { key: 'cooperative', icon: 'fas fa-handshake', label: 'Cooperativi' },
                { key: 'solo', icon: 'fas fa-user', label: 'Giocabili in Solitario' }
            ]
        };

        const filters = filterSets[this.currentCategory];
        if (!filters || filters.length === 0) return '';

        return `
            <div class="advanced-filters">
                ${filters.map(filter => {
                    const isActive = this.selectedFilters.includes(filter.key) ? 'active' : '';
                    return `
                        <button class="filter-chip ${filter.key} ${isActive}" data-filter="${filter.key}" data-category="${this.currentCategory}">
                            <i class="${filter.icon}"></i> ${filter.label}
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    }

    createItemsGridHTML() {
        const filteredItems = this.getFilteredItems();
        this.filteredCount = filteredItems.length;
        const isExtendedLayout = filteredItems.length > 0 && filteredItems.length <= 2;
        const gridClass = isExtendedLayout ? 'extended-grid' : '';

        // Se non ci sono items ancora caricati, mostra skeleton loader
        if (!this.currentItems || this.currentItems.length === 0) {
            return this.createSkeletonGridHTML();
        }

        return `
            <div class="items-grid ${gridClass}" id="itemsGrid">
                ${filteredItems.length === 0
                    ? this.createEmptyStateHTML()
                    : filteredItems.map(item => this.createItemCardHTML(item, isExtendedLayout)).join('')}
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

    createItemCardHTML(item, extended = false) {
        if (this.currentCategory === 'giochi') {
            return this.createGameCardHTML(item, extended);
        } else if (this.currentCategory === 'drink') {
            return this.createDrinkCardHTML(item, extended);
        } else if (this.currentCategory === 'snack') {
            return this.createSnackCardHTML(item, extended);
        }
    }

    createGameCardHTML(game, extended = false) {
        const imageUrl = getImageUrlWithLocalFallback(game, 'games');
        const price = game.rentalPrice ? `€${game.rentalPrice}/sera` : 'Prezzo su richiesta';
        const gameDescription = game.description || 'Descrizione non disponibile. Seleziona il gioco per scoprire tutti i dettagli della serata.';
        const highlights = this.getGameHighlights(game);

        return `
            <div class="item-card game-card ${extended ? 'extended' : ''}" data-item-id="${game.id}">
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

                    ${extended ? `
                        <div class="item-extended">
                            <p class="item-description">${gameDescription}</p>
                            <div class="item-extended-meta">
                                ${highlights.map(block => `
                                    <div class="item-extended-stat">
                                        <h4><i class="${block.icon}"></i> ${block.label}</h4>
                                        <p>${block.value}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    createDrinkCardHTML(drink, extended = false) {
        const quantity = this.getItemQuantity('drinks', drink.id);
        const quantityKey = this.getQuantityKey('drinks', drink.id);
        const isAlcoholic = drink.isAlcoholic === true || drink.isAlcoholic === 1 || drink.isAlcoholic === '1';
        const priceValue = Number(drink.price || 0);
        const drinkDescription = drink.description || 'Un drink artigianale, perfetto per accompagnare le partite del tuo gruppo.';
        const pairing = this.getDrinkPairing(drink);
        const mood = this.getDrinkMood(drink);
        const temperature = this.getDrinkServiceTemp(drink);

        return `
            <div class="item-card drink-card ${extended ? 'extended' : ''}" data-item-id="${drink.id}">
                <div class="item-image" style="background-image: url('${getImageUrlWithLocalFallback(drink, 'drinks')}');">
                    <button class="expand-btn" onclick="window.catalogPageManager.openItemModal(${drink.id})">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>

                <div class="item-content">
                    <h3 class="item-title">${drink.name}</h3>
                    <span class="item-category ${isAlcoholic ? 'alcoholic' : 'non-alcoholic'}">
                        ${isAlcoholic ? 'Alcolico' : 'Analcolico'}
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
                            <div class="item-stat-value">€${priceValue.toFixed(2)}</div>
                            <div class="item-stat-label">Prezzo</div>
                        </div>
                        <div class="item-stat">
                            <div class="item-stat-icon">
                                <i class="fas fa-star"></i>
                            </div>
                            <div class="item-stat-value">${priceValue >= 8.00 ? 'Premium' : 'Classic'}</div>
                            <div class="item-stat-label">Qualità</div>
                        </div>
                    </div>

                    <div class="item-actions">
                        <button class="rent-btn add-to-cart-btn" data-category="drinks" data-item-id="${drink.id}">
                            <span class="btn-icon"><i class="fas fa-glass-cheers"></i></span>
                            <span class="btn-text">Aggiungi</span>
                            <span class="quantity-badge" data-item-key="${quantityKey}">x${quantity}</span>
                        </button>
                        <div class="quantity-stepper" data-category="drinks" data-item-id="${drink.id}">
                            <button class="step-btn step-plus" title="Aumenta quantità">+</button>
                            <button class="step-btn step-minus" title="Diminuisci quantità">-</button>
                        </div>
                    </div>

                    ${extended ? `
                        <div class="item-extended">
                            <p class="item-description">${drinkDescription}</p>
                            <div class="item-extended-meta">
                                <div class="item-extended-stat">
                                    <h4><i class="fas fa-utensils"></i> Abbinamento ideale</h4>
                                    <p>${pairing}</p>
                                </div>
                                <div class="item-extended-stat">
                                    <h4><i class="fas fa-music"></i> Atmosfera consigliata</h4>
                                    <p>${mood}</p>
                                </div>
                                <div class="item-extended-stat">
                                    <h4><i class="fas fa-thermometer-half"></i> Servizio</h4>
                                    <p>${temperature}</p>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    createSnackCardHTML(snack, extended = false) {
        const quantity = this.getItemQuantity('snacks', snack.id);
        const quantityKey = this.getQuantityKey('snacks', snack.id);
        const snackPriceValue = Number(snack.price || 0);
        const snackDescription = snack.description || 'Snack preparato con ingredienti freschi, perfetto per una pausa di gusto durante le tue partite.';
        const pairing = this.getSnackPairing(snack);
        const tip = this.getSnackServingTip(snack);

        return `
            <div class="item-card snack-card ${extended ? 'extended' : ''}" data-item-id="${snack.id}">
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
                            <div class="item-stat-value">€${snackPriceValue.toFixed(2)}</div>
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

                    <div class="item-actions">
                        <button class="rent-btn add-to-cart-btn" data-category="snacks" data-item-id="${snack.id}">
                            <span class="btn-icon"><i class="fas fa-shopping-cart"></i></span>
                            <span class="btn-text">Aggiungi</span>
                            <span class="quantity-badge" data-item-key="${quantityKey}">x${quantity}</span>
                        </button>
                        <div class="quantity-stepper" data-category="snacks" data-item-id="${snack.id}">
                            <button class="step-btn step-plus" title="Aumenta quantità">+</button>
                            <button class="step-btn step-minus" title="Diminuisci quantità">-</button>
                        </div>
                    </div>

                    ${extended ? `
                        <div class="item-extended">
                            <p class="item-description">${snackDescription}</p>
                            <div class="item-extended-meta">
                                <div class="item-extended-stat">
                                    <h4><i class="fas fa-gamepad"></i> Si abbina a</h4>
                                    <p>${snack.suggestedGame || 'Party e giochi cooperativi'}</p>
                                </div>
                                <div class="item-extended-stat">
                                    <h4><i class="fas fa-glass-cheers"></i> Drink consigliato</h4>
                                    <p>${snack.suggestedDrink || pairing}</p>
                                </div>
                                <div class="item-extended-stat">
                                    <h4><i class="fas fa-concierge-bell"></i> Servizio</h4>
                                    <p>${tip}</p>
                                </div>
                            </div>
                        </div>
                    ` : ''}
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
            <div id="catalog-cart-box" class="catalog-cart-box ${this.isEditingBooking ? 'editing-mode' : ''}">
                <div class="cart-box-header">
                    <h3 class="cart-box-title">
                        <i class="fas fa-${this.isEditingBooking ? 'edit' : 'shopping-basket'}"></i>
                        ${this.isEditingBooking ? 'Modifica Ordine' : 'Carrello'}
                        <span class="cart-box-count">(${summary.totalItems} elementi)</span>
                    </h3>
                    <button class="cart-box-toggle" onclick="window.catalogPageManager.toggleCartBox()">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                </div>

                ${this.isEditingBooking ? `
                    <div class="editing-info">
                        <div class="editing-banner">
                            <i class="fas fa-info-circle"></i>
                            <span>Stai modificando una prenotazione</span>
                        </div>
                        <div class="editing-instructions">
                            <p><i class="fas fa-lightbulb"></i> Aggiungi o rimuovi elementi dal carrello, poi conferma le modifiche</p>
                        </div>
                    </div>
                ` : ''}

                <div class="cart-box-content">
                    <div class="cart-categories">
                        ${this.createCartCategoryHTML('games', 'Giochi', 'fas fa-dice-d20')}
                        ${this.createCartCategoryHTML('drinks', 'Drink', 'fas fa-cocktail')}
                        ${this.createCartCategoryHTML('snacks', 'Snack', 'fas fa-cookie-bite')}
                    </div>

                    <div class="cart-box-summary">
                        <div class="cart-summary-row cart-total">
                            <span><strong>${this.isEditingBooking ? 'Nuova Selezione:' : 'Totale Carrello:'}</strong></span>
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
        if (!items || !Array.isArray(items) || items.length === 0) return '';

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

    async confirmBookingChanges() {
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

        try {
            // Invia le modifiche al backend
            await this.sendBookingUpdates(modifications);

            // Salva le modifiche nel localStorage per il messaggio di ritorno
            localStorage.setItem('pendingBookingChanges', JSON.stringify(modifications));

            // Torna alla pagina delle prenotazioni
            this.returnToBookings();
        } catch (error) {
            console.error('❌ Errore invio modifiche:', error);
            alert('Errore durante il salvataggio delle modifiche. Riprova.');
        }
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
        // Salva l'URL di ritorno prima di pulire il context
        const returnUrl = this.editContext?.returnUrl || '/prenotazioni-utente';

        // Prepara messaggio di ritorno se ci sono modifiche pendenti
        const pendingChanges = localStorage.getItem('pendingBookingChanges');
        if (pendingChanges) {
            const changes = JSON.parse(pendingChanges);
            const returnMessage = this.createReturnMessage(changes);
            localStorage.setItem('bookingReturnMessage', JSON.stringify(returnMessage));
        }

        // Pulisci il context di editing
        this.clearEditingContext();

        // Reindirizza alla pagina prenotazioni
        console.log('🔙 Ritorno alla pagina:', returnUrl);

        if (window.page) {
            window.page(returnUrl);
        } else {
            window.location.href = returnUrl;
        }
    }

    createReturnMessage(changes) {
        const editType = changes.editType;
        const bookingDate = changes.bookingDate;

        let items = [];
        let categoryLabel = '';

        switch(editType) {
            case 'giochi':
                items = changes.game_requests || [];
                categoryLabel = 'giochi';
                break;
            case 'drink':
                items = changes.drink_orders || [];
                categoryLabel = 'drink';
                break;
            case 'snack':
                items = changes.snack_orders || [];
                categoryLabel = 'snack';
                break;
        }

        const itemCount = items.length;
        const itemsText = items.join(', ');

        return {
            type: 'success',
            title: `🎉 Modifiche confermate per ${categoryLabel}`,
            message: `La prenotazione del ${bookingDate} è stata aggiornata con ${itemCount} ${categoryLabel}${itemCount > 1 ? '' : ''}: ${itemsText}`,
            bookingDate: bookingDate,
            category: categoryLabel,
            items: items,
            timestamp: Date.now()
        };
    }

    async sendBookingUpdates(modifications) {
        if (!this.editContext?.confirmationCode) {
            throw new Error('Codice conferma prenotazione mancante');
        }

        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!currentUser.id) {
            throw new Error('Utente non autenticato');
        }

        const updates = {};

        // Converti le modifiche nel formato del backend
        switch(modifications.editType) {
            case 'giochi':
                updates.game_requests = modifications.game_requests || [];
                break;
            case 'drink':
                updates.drink_orders = modifications.drink_orders || [];
                break;
            case 'snack':
                updates.snack_orders = modifications.snack_orders || [];
                break;
        }

        // Calcola nuovo prezzo totale se necessario
        if (modifications.totalPrice) {
            updates.total_price = modifications.totalPrice;
        }

        const url = `/api/users/${currentUser.id}/bookings/${this.editContext.confirmationCode}`;

        console.log('🌐 Invio PATCH a:', url, updates);

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Errore HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Modifiche salvate:', result);

        return result;
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
        this.bindGlobalEvents();

        // 1) Bottoni di switch categoria
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const category = e.currentTarget.dataset.category;
                this.switchCategory(category);
            });
        });

        // 2) Ricerca live
        this.setupSearchInput();

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

        // 5) Controlli quantità nelle card
        this.setupCardQuantityControls();

        // 6)Setup eventi carrello
        this.updateCartUI();
    }

    setupSearchInput() {
        const searchInput = document.querySelector('.search-input');
        if (!searchInput) return;

        if (searchInput.dataset.listenerAttached !== 'true') {
            searchInput.dataset.listenerAttached = 'true';
            searchInput.addEventListener('input', e => {
                const position = e.target.selectionStart;
                this.searchTerm = e.target.value;
                this.applyFiltersAndRefresh(true);
                requestAnimationFrame(() => {
                    if (document.activeElement === searchInput) {
                        searchInput.setSelectionRange(position, position);
                    }
                });
            });
        }

        if (searchInput.value !== this.searchTerm) {
            searchInput.value = this.searchTerm;
        }
    }

    applyFiltersAndRefresh(updateStats = false) {
        const currentSearchInput = document.querySelector('.search-input');
        const hadFocus = currentSearchInput && document.activeElement === currentSearchInput;
        const caretPosition = hadFocus ? currentSearchInput.selectionStart : null;

        const filteredItems = this.getFilteredItems();
        this.filteredCount = filteredItems.length;

        if (updateStats) {
            const statsBar = document.querySelector('.stats-bar');
            if (statsBar) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = this.createStatsBarHTML();
                const newBar = tempDiv.firstElementChild;
                statsBar.parentNode.replaceChild(newBar, statsBar);
            }
        }

        this.refreshItemsGrid();
        this.refreshFilterChipState();
        this.setupFilterChipEvents();
        this.setupSearchInput();
        if (hadFocus) {
            const newInput = document.querySelector('.search-input');
            if (newInput) {
                newInput.focus();
                const pos = caretPosition !== null ? Math.min(caretPosition, newInput.value.length) : newInput.value.length;
                newInput.setSelectionRange(pos, pos);
            }
        }
        this.setupCardQuantityControls();
        this.updateCartUI();

        const itemsGrid = document.getElementById('itemsGrid');
        if (itemsGrid) {
            itemsGrid.style.opacity = '1';
            itemsGrid.style.pointerEvents = 'auto';
        }
    }

    bindGlobalEvents() {
        if (this.globalEventsBound) return;

        document.addEventListener('click', (event) => {
            const stepPlus = event.target.closest('.quantity-stepper .step-plus');
            const stepMinus = event.target.closest('.quantity-stepper .step-minus');

            if (stepPlus || stepMinus) {
                event.preventDefault();
                event.stopPropagation();
            }
        });

        this.globalEventsBound = true;
    }

    setupFilterChipEvents() {
        const chips = document.querySelectorAll('.filter-chip');

        chips.forEach(chip => {
            const filter = chip.dataset.filter;
            chip.classList.toggle('active', this.selectedFilters.includes(filter));

            if (chip.dataset.listenerAttached !== 'true') {
                chip.dataset.listenerAttached = 'true';
                chip.addEventListener('click', e => this.handleFilterChipClick(e));
                chip.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        this.handleFilterChipClick(e);
                    }
                });
            }
        });
    }

    refreshFilterChipState() {
        const chips = document.querySelectorAll('.filter-chip');
        chips.forEach(chip => {
            const filter = chip.dataset.filter;
            chip.classList.toggle('active', this.selectedFilters.includes(filter));
        });
    }

    handleFilterChipClick(e) {
        const chip = e.currentTarget;
        const filter = chip.dataset.filter;

        if (e && e.preventDefault) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (!Array.isArray(this.categoryFilters[this.currentCategory])) {
            this.categoryFilters[this.currentCategory] = [];
        }

        let filtersForCategory = this.categoryFilters[this.currentCategory];

        const alreadyActive = filtersForCategory.includes(filter);
        if (alreadyActive) {
            this.categoryFilters[this.currentCategory] = filtersForCategory.filter(f => f !== filter);
            filtersForCategory = this.categoryFilters[this.currentCategory];
        } else {
            // Regole mutuali per drink
            if (this.currentCategory === 'drink') {
                if (filter === 'alcoholic') {
                    this.categoryFilters[this.currentCategory] = filtersForCategory.filter(f => f !== 'non-alcoholic');
                } else if (filter === 'non-alcoholic') {
                    this.categoryFilters[this.currentCategory] = filtersForCategory.filter(f => f !== 'alcoholic');
                }
            }

            if (this.currentCategory === 'snack') {
                if (filter === 'sweet') {
                    this.categoryFilters[this.currentCategory] = filtersForCategory.filter(f => f !== 'savory');
                } else if (filter === 'savory') {
                    this.categoryFilters[this.currentCategory] = filtersForCategory.filter(f => f !== 'sweet');
                }
            }

            this.categoryFilters[this.currentCategory].push(filter);
            filtersForCategory = this.categoryFilters[this.currentCategory];
        }

        this.selectedFilters = this.categoryFilters[this.currentCategory];
        this.refreshFilterChipState();
        this.applyFiltersAndRefresh(true);
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
        const btn = document.querySelector(`[data-category="${category}"]`);
        if (btn) btn.classList.add('active');

        // Salva filtri categoria corrente
        this.categoryFilters[this.currentCategory] = [...(this.selectedFilters || [])];

        this.currentCategory = category;
        this.categoryFilters[this.currentCategory] = this.categoryFilters[this.currentCategory] || [];
        this.selectedFilters = this.categoryFilters[this.currentCategory] || [];
        this.searchTerm = '';

        try {
            const itemsGrid = document.getElementById('itemsGrid');
            if (itemsGrid) {
                // Transizione fluida invece di svuotamento immediato
                itemsGrid.style.opacity = '0.6';
                itemsGrid.style.pointerEvents = 'none';
            }

            await this.loadCategoryData(category);
            this.applyFiltersAndRefresh(true);
            this.setupFilterChipEvents();

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
        this.applyFiltersAndRefresh(true);
    }

    refreshFullUISmooth() {
        this.applyFiltersAndRefresh(true);
    }

    refreshItemsGridSmooth() {
        const itemsGrid = document.getElementById('itemsGrid');
        if (itemsGrid) {
            const filteredItems = this.getFilteredItems();
            this.filteredCount = filteredItems.length;

            itemsGrid.classList.add('grid-filtering');
            const isExtendedLayout = filteredItems.length > 0 && filteredItems.length <= 2;
            itemsGrid.classList.toggle('extended-grid', isExtendedLayout);

            if (filteredItems.length === 0) {
                itemsGrid.innerHTML = this.createEmptyStateHTML();
            } else {
                itemsGrid.innerHTML = filteredItems.map(item =>
                    this.createItemCardHTML(item, isExtendedLayout)
                ).join('');
            }

            // Ripristina opacità e interattività con transizione
            setTimeout(() => {
                itemsGrid.style.transition = 'opacity 0.3s ease';
                itemsGrid.style.opacity = '1';
                itemsGrid.style.pointerEvents = 'auto';
                setupAllLocalImageFallbacks();
                this.setupCardQuantityControls();
                itemsGrid.classList.remove('grid-filtering');
            }, 50);
        }
    }

    refreshItemsGrid() {
        const itemsGrid = document.getElementById('itemsGrid');
        if (itemsGrid) {
            const filteredItems = this.getFilteredItems();
            this.filteredCount = filteredItems.length;

            itemsGrid.classList.add('grid-filtering');
            const isExtendedLayout = filteredItems.length > 0 && filteredItems.length <= 2;
            itemsGrid.classList.toggle('extended-grid', isExtendedLayout);

            if (filteredItems.length === 0) {
                itemsGrid.innerHTML = this.createEmptyStateHTML();
            } else {
                itemsGrid.innerHTML = filteredItems.map(item =>
                    this.createItemCardHTML(item, isExtendedLayout)
                ).join('');
            }
            setTimeout(() => {
                setupAllLocalImageFallbacks();
                this.setupCardQuantityControls();
                itemsGrid.classList.remove('grid-filtering');
            }, 100);

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

        const drink = this.currentItems.find(d => d.id == drinkId);
        if (drink) {
            const quantity = this.getItemQuantity('drinks', drinkId);
            this.addToCart(drink, quantity, 'drinks');
            this.flashAddToCartState('drinks', drinkId);
            this.setItemQuantity('drinks', drinkId, 1);
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

        const snack = this.currentItems.find(s => s.id == snackId);
        if (snack) {
            const quantity = this.getItemQuantity('snacks', snackId);
            this.addToCart(snack, quantity, 'snacks');
            this.flashAddToCartState('snacks', snackId);
            this.setItemQuantity('snacks', snackId, 1);
        } else {
            console.error('❌ Snack non trovato:', snackId);
        }
    }

    flashAddToCartState(category, itemId) {
        const button = document.querySelector(`.add-to-cart-btn[data-category="${category}"][data-item-id="${itemId}"]`);
        if (!button) return;

        button.classList.add('added');
        setTimeout(() => button.classList.remove('added'), 600);
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
        if (!Array.isArray(this.categoryFilters[this.currentCategory])) {
            this.categoryFilters[this.currentCategory] = [];
        }
        this.selectedFilters = this.categoryFilters[this.currentCategory] || [];
        let items = this.currentItems;

        // Ricerca testuale
        if (this.searchTerm) {
            const term = this.searchTerm.trim().toLowerCase();
            items = items.filter(item => (
                item.name?.toLowerCase().includes(term) ||
                item.description?.toLowerCase().includes(term) ||
                item.category?.toLowerCase().includes(term) ||
                item.baseSpirit?.toLowerCase().includes(term) ||
                item.mainIngredient?.toLowerCase().includes(term)
            ));
        }

        // Filtri avanzati
        if (this.currentCategory === 'drink' && this.selectedFilters.length > 0) {
            items = items.filter(item => {
                const isAlcoholic = item.isAlcoholic === true || item.isAlcoholic === 1 || item.isAlcoholic === '1' || item.isAlcoholic === 'true';
                const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;

                return this.selectedFilters.every(filter => {
                    switch (filter) {
                        case 'alcoholic':
                            return isAlcoholic;
                        case 'non-alcoholic':
                            return !isAlcoholic;
                        case 'premium':
                            return price >= 8.00;
                        case 'economic':
                            return price < 8.00;
                        default:
                            return true;
                    }
                });
            });
        } else if (this.currentCategory === 'snack' && this.selectedFilters.length > 0) {
            items = items.filter(item => {
                const isSweet = item.isSweet === true || item.isSweet === 1 || item.isSweet === '1' || item.isSweet === 'true';
                const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
                const mainIngredient = (item.mainIngredient || '').toLowerCase();

                return this.selectedFilters.every(filter => {
                    switch (filter) {
                        case 'sweet':
                            return isSweet;
                        case 'savory':
                            return !isSweet;
                        case 'game-friendly':
                            return ['olive', 'mais', 'farina', 'pane', 'formaggio'].includes(mainIngredient);
                        case 'premium':
                            return price >= 6.00;
                        default:
                            return true;
                    }
                });
            });
        } else if (this.currentCategory === 'giochi' && this.selectedFilters.length > 0) {
            items = items.filter(item => {
                const category = (item.category || '').toLowerCase();
                const minPlayers = parseInt(item.minPlayers || item.min_players || 0, 10);

                return this.selectedFilters.every(filter => {
                    switch (filter) {
                        case 'party':
                            return category.includes('party');
                        case 'strategy':
                            return category.includes('strategia') || category.includes('strategy');
                        case 'cooperative':
                            return category.includes('cooperativo') || category.includes('cooperative');
                        case 'solo':
                            return !isNaN(minPlayers) && minPlayers <= 1;
                        default:
                            return true;
                    }
                });
            });
        }

        return items;
    }

    getQuantityKey(category, itemId) {
        return `${category}-${itemId}`;
    }

    getItemQuantity(category, itemId) {
        const key = this.getQuantityKey(category, itemId);
        if (!this.itemQuantities[key]) {
            this.itemQuantities[key] = 1;
        }
        return this.itemQuantities[key];
    }

    setItemQuantity(category, itemId, quantity) {
        const key = this.getQuantityKey(category, itemId);
        const clamped = Math.min(this.maxQuantity, Math.max(1, quantity));
        this.itemQuantities[key] = clamped;
        this.updateQuantityDisplay(category, itemId, clamped);
    }

    updateQuantityDisplay(category, itemId, quantity) {
        const key = this.getQuantityKey(category, itemId);
        const badge = document.querySelector(`.quantity-badge[data-item-key="${key}"]`);

        if (badge) {
            badge.textContent = `x${quantity}`;
            if (quantity > 1) {
                badge.classList.add('multiple');
            } else {
                badge.classList.remove('multiple');
            }
        }
    }

    adjustItemQuantity(category, itemId, delta) {
        const current = this.getItemQuantity(category, itemId);
        this.setItemQuantity(category, itemId, current + delta);
    }

    setupCardQuantityControls() {
        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            const category = button.dataset.category;
            const itemId = parseInt(button.dataset.itemId, 10);

            const currentQuantity = this.getItemQuantity(category, itemId);
            this.updateQuantityDisplay(category, itemId, currentQuantity);

            if (button.dataset.listenerAttached === 'true') {
                return;
            }
            button.dataset.listenerAttached = 'true';

            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (category === 'drinks') {
                    this.handleOrderDrink(itemId);
                } else if (category === 'snacks') {
                    this.handleOrderSnack(itemId);
                }
            });
        });

        document.querySelectorAll('.quantity-stepper').forEach(stepper => {
            const category = stepper.dataset.category;
            const itemId = parseInt(stepper.dataset.itemId, 10);
            const plusBtn = stepper.querySelector('.step-plus');
            const minusBtn = stepper.querySelector('.step-minus');

            this.updateQuantityDisplay(category, itemId, this.getItemQuantity(category, itemId));

            if (plusBtn) {
                if (plusBtn.dataset.listenerAttached !== 'true') {
                    plusBtn.dataset.listenerAttached = 'true';
                    plusBtn.addEventListener('click', (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        this.adjustItemQuantity(category, itemId, 1);
                    });
                }
            }

            if (minusBtn) {
                if (minusBtn.dataset.listenerAttached !== 'true') {
                    minusBtn.dataset.listenerAttached = 'true';
                    minusBtn.addEventListener('click', (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        this.adjustItemQuantity(category, itemId, -1);
                    });
                }
            }
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

    describePlayers(minPlayers, maxPlayers) {
        if (!minPlayers && !maxPlayers) return 'Gruppi fino a 6 giocatori';
        if (minPlayers === maxPlayers) {
            return `${minPlayers} giocatori dedicato`;
        }
        if (minPlayers <= 1) {
            return `Da solo o fino a ${maxPlayers} giocatori`;
        }
        return `${minPlayers}-${maxPlayers} giocatori`;
    }

    describeDifficulty(level) {
        if (!level) return 'Tutti i livelli';
        if (level <= 1) return 'Perfetto per principianti';
        if (level === 2) return 'Richiede un minimo di esperienza';
        if (level === 3) return 'Sfida intermedia';
        if (level === 4) return 'Ideale per gruppi esperti';
        return 'Solo per veri strategist';
    }

    getGameHighlights(game) {
        const duration = this.formatDuration(game.durationMinutes);
        return [
            {
                icon: 'fas fa-layer-group',
                label: 'Categoria',
                value: game.category || 'Gioco da tavolo'
            },
            {
                icon: 'fas fa-users-cog',
                label: 'Composizione',
                value: this.describePlayers(game.minPlayers, game.maxPlayers)
            },
            {
                icon: 'fas fa-lightbulb',
                label: 'Curva di apprendimento',
                value: this.describeDifficulty(game.difficultyLevel)
            },
            {
                icon: 'fas fa-hourglass-half',
                label: 'Durata media',
                value: duration
            }
        ];
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

    getDrinkPairing(drink) {
        const base = (drink.baseSpirit || '').toLowerCase();
        if (base.includes('gin')) return 'Provalo con snack agrumati o olive verdi.';
        if (base.includes('vodka')) return 'Perfetto con appetizer leggeri e finger food.';
        if (base.includes('rum')) return 'Si abbina a dessert al cioccolato e spezie tropicali.';
        if (base.includes('tequila')) return 'Ideale con snack speziati o tacos del giorno.';
        if (base.includes('birra')) return 'Abbinalo a focacce, pizza e stuzzichini salati.';
        return 'Si abbina perfettamente ai nostri snack gourmet.';
    }

    getDrinkMood(drink) {
        const alcoholic = drink.isAlcoholic === true || drink.isAlcoholic === 1 || drink.isAlcoholic === '1';
        if (alcoholic) {
            return 'Ideale per serate social e momenti celebrativi.';
        }
        return 'Perfetto per giocatori concentrati e pause analcoliche.';
    }

    getDrinkServiceTemp(drink) {
        const base = (drink.baseSpirit || '').toLowerCase();
        if (base.includes('gin') || base.includes('vodka')) return 'Servire molto freddo, con ghiaccio e garnish.';
        if (base.includes('rum')) return 'Servire con ghiaccio e agrumi freschi.';
        if (base.includes('caffè')) return 'Servire caldo, in tazza da degustazione.';
        if (base.includes('birra')) return 'Servire a 4-6°C in bicchiere alto.';
        return 'Servire fresco, seguito da una breve spiegazione dello staff.';
    }

    getSnackPairing(snack) {
        if (snack.suggestedDrink) return snack.suggestedDrink;
        const ingredient = (snack.mainIngredient || '').toLowerCase();
        if (ingredient.includes('formaggio')) return 'Ottimo con vini bianchi o cocktail speziati.';
        if (ingredient.includes('olive')) return 'Match perfetto con gin tonic o spritz.';
        if (ingredient.includes('cioccolato')) return 'Da gustare con drink dolci o caffè.';
        return 'Si abbina bene con le nostre proposte artigianali.';
    }

    getSnackServingTip(snack) {
        const messiness = this.getSnackMessinessLevel(snack);
        if (messiness <= 2) return 'Servire direttamente al tavolo, ideale durante la partita.';
        if (messiness === 3) return 'Consigliato con tovaglioli e piccole ciotole individuali.';
        return 'Suggeriamo una breve pausa dal gioco per gustarlo al meglio.';
    }

    getSnackMessinessLevel(snack) {
        const ingredient = (snack.mainIngredient || '').toLowerCase();
        if (['olive', 'formaggio', 'mais', 'mandorle'].includes(ingredient)) return 1;
        if (['patate', 'pane', 'farina'].includes(ingredient)) return 2;
        if (['cioccolato', 'zucchero', 'mascarpone'].includes(ingredient)) return 4;
        return 3;
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
        const filters = this.selectedFilters && this.selectedFilters.length > 0
            ? `<p class="empty-filters">Filtri attivi: ${this.selectedFilters.map(f => `#${f}`).join(', ')}</p>`
            : '';

        return `
            <div class="empty-state">
                <i class="${config.icon}" style="font-size: 4rem; color: #6633cc; margin-bottom: 1rem;"></i>
                <h3>Nessun ${config.label.toLowerCase()} trovato</h3>
                <p>Prova a modificare i criteri di ricerca o torna più tardi.</p>
                ${this.searchTerm ? `<p><strong>Ricerca corrente:</strong> "${this.searchTerm}"</p>` : ''}
                ${filters}
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
            if (editContext.isEditingBooking === true && editContext.editType) {
                console.log('📝 Modalità editing prenotazione attiva:', editContext);
                manager.setEditingMode(editContext);
            } else {
                // Context non valido, rimuovilo
                console.log('🧹 Context editing non valido, rimozione...');
                localStorage.removeItem('bookingEditContext');
            }
        } catch (e) {
            console.warn('⚠️ Errore parsing context editing:', e);
            // Rimuovi context corrotto
            localStorage.removeItem('bookingEditContext');
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
        manager.applyFiltersAndRefresh(true);

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
