// js/pages/bookings.js
// SCOPO: Pagina prenotazioni tavolo per giochi, drink e snack
// RELAZIONI: Chiamata da main.js via showPage('prenotazioni'), usa sistema auth

console.log('🎮 Caricamento pagina prenotazioni...');

// ==========================================
// CONFIGURAZIONE PRENOTAZIONI
// ==========================================

const BOOKINGS_CONFIG = {
    API_ENDPOINTS: {
        bookings: '/api/bookings',
        tables: '/api/tables',
        validate: '/api/bookings/validate'
    },
DEFAULT_BOOKING: {
    date: new Date().toISOString().split('T')[0], // Solo la data di oggi come minimo
    time: '',        // Vuoto - utente deve scegliere
    duration: '',    // Vuoto - utente deve scegliere
    players: '',     // Vuoto - utente deve scegliere
    tableId: null,   // Assegnazione automatica sempre
    specialRequests: ''
},
    TIME_SLOTS: [
        { value: '18:00', label: '18:00 - Aperitivo' },
        { value: '19:00', label: '19:00 - Prima serata' },
        { value: '20:00', label: '20:00 - Serata completa' },
        { value: '21:00', label: '21:00 - Tarda serata' },
        { value: '22:00', label: '22:00 - Night gaming' }
    ],
    DURATION_OPTIONS: [
        { value: 2, label: '2 ore - Partita veloce' },
        { value: 3, label: '3 ore - Serata standard' },
        { value: 4, label: '4 ore - Serata estesa' },
        { value: 5, label: '5+ ore - Maratona gaming' }
    ]
};

// ==========================================
// CLASSE MANAGER PRENOTAZIONI
// ==========================================

class BookingsPageManager {
    constructor() {
        this.currentStep = 1;
        this.bookingData = { ...BOOKINGS_CONFIG.DEFAULT_BOOKING };
        this.selectedItems = this.getSelectedItemsFromStorage();
        this.isSubmitting = false;

        console.log('✅ BookingsPageManager inizializzato');
    }

    // ==========================================
    // CONTROLLO AUTENTICAZIONE
    // ==========================================

    get isAuthenticated() {
        // Usa il sistema auth integrato del main.js
        return (window.SimpleAuth && window.SimpleAuth.isAuthenticated) ||
               Boolean(window.currentUser) ||
               Boolean(localStorage.getItem('authToken'));
    }

    getCurrentUser() {
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
    // GESTIONE DATI SELEZIONATI - ✅ MIGLIORATA
    // ==========================================

    getSelectedItemsFromStorage() {
        // ✅ FIX: Controlla prima se ci sono dati reali nel localStorage/sessionStorage
        try {
            // Prova a recuperare selezioni reali dal catalogo
            const catalogSelection = sessionStorage.getItem('catalogSelection');
            if (catalogSelection) {
                const parsed = JSON.parse(catalogSelection);
                console.log('📦 Elementi selezionati trovati nel catalogo:', parsed);
                return parsed;
            }

            // Prova con localStorage come fallback
            const bookingItems = localStorage.getItem('bookingItems');
            if (bookingItems) {
                const parsed = JSON.parse(bookingItems);
                console.log('📦 Elementi selezionati trovati in localStorage:', parsed);
                return parsed;
            }
        } catch (error) {
            console.warn('⚠️ Errore nel recupero elementi selezionati:', error);
        }

        // ✅ FIX: Ritorna struttura vuota invece di mock data
        console.log('📦 Nessun elemento selezionato - inizializzazione vuota');
        return {
            games: [],
            drinks: [],
            snacks: []
        };

        // 🗑️ RIMOSSO: Mock data che causava il problema
        // return {
        //     games: [
        //         { id: 1, name: 'Catan', price: 8.00 },
        //         { id: 2, name: 'Azul', price: 6.00 }
        //     ],
        //     drinks: [
        //         { id: 1, name: 'Coca Cola', quantity: 2, price: 4.00 },
        //         { id: 2, name: 'Sprite', quantity: 2, price: 4.00 }
        //     ],
        //     snacks: [
        //         { id: 1, name: 'Patatine Classic', price: 3.50 },
        //         { id: 2, name: 'Mix Olive', price: 4.00 }
        //     ]
        // };
    }

    calculateTotalPrice() {
        const gamesTotal = this.selectedItems.games.reduce((sum, game) => sum + game.price, 0);
        const drinksTotal = this.selectedItems.drinks.reduce((sum, drink) => sum + (drink.price * (drink.quantity || 1)), 0);
        const snacksTotal = this.selectedItems.snacks.reduce((sum, snack) => sum + snack.price, 0);
        const tableReservation = 2.50;

        return {
            games: gamesTotal,
            drinks: drinksTotal,
            snacks: snacksTotal,
            table: tableReservation,
            total: gamesTotal + drinksTotal + snacksTotal + tableReservation
        };
    }

    // ==========================================
    // GENERAZIONE HTML PRINCIPALE
    // ==========================================

    createBookingsHTML() {
        return `
            <div class="bookings-page">
                ${this.createPageHeaderHTML()}
                ${this.createBookingFormHTML()}
            </div>
        `;
    }

    createPageHeaderHTML() {
        return `
            <div class="page-header">
                <h1 class="page-title">
                    <i class="fas fa-calendar-check"></i>
                    Prenota il Tuo Tavolo
                </h1>
                <p class="page-subtitle">
                    Completa la tua prenotazione scegliendo data, orario e configurando la tua esperienza di gioco perfetta
                </p>
            </div>
        `;
    }

    createBookingFormHTML() {
        return `
            <div class="booking-wizard">
                ${this.createFormSectionsHTML()}
                ${this.createSelectedItemsHTML()}
                ${this.createPricingSummaryHTML()}
                ${this.createSpecialRequestsHTML()}
                ${this.createActionButtonsHTML()}
            </div>
        `;
    }

    createFormSectionsHTML() {
        return `
            <!-- Data e Orario -->
            <div class="form-section">
                <h3 class="section-title">
                    <i class="fas fa-calendar-alt"></i>
                    Data e Orario
                </h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-calendar"></i>
                            Data Prenotazione *
                        </label>
                        <input type="date"
                               class="form-select"
                               id="booking-date"
                               value="${this.bookingData.date}"
                               min="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-clock"></i>
                            Orario Inizio (opzionale)
                        </label>
                        <select class="form-select" id="booking-time">
                            <option value="">Seleziona orario...</option>
                            ${BOOKINGS_CONFIG.TIME_SLOTS.map(slot =>
                                `<option value="${slot.value}" ${slot.value === this.bookingData.time ? 'selected' : ''}>${slot.label}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-hourglass-half"></i>
                            Durata Stimata (opzionale)
                        </label>
                    <select class="form-select" id="booking-duration">
                        <option value="">Durata non specificata</option>
                        ${BOOKINGS_CONFIG.DURATION_OPTIONS.map(option =>
                            `<option value="${option.value}" ${option.value === this.bookingData.duration ? 'selected' : ''}>${option.label}</option>`
                        ).join('')}
                    </select>
                    </div>
                </div>
            </div>

            <!-- Configurazione Tavolo -->
            <div class="form-section">
                <h3 class="section-title">
                    <i class="fas fa-users"></i>
                    Configurazione Tavolo
                </h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-hashtag"></i>
                            Numero Giocatori
                        </label>
                    <select class="form-select" id="booking-players">
                        <option value="">Quanti giocatori?</option>
                        ${[2,3,4,5,6,7].map(num =>
                            `<option value="${num}" ${num === this.bookingData.players ? 'selected' : ''}>${num} giocatori${num === 7 ? '+' : ''}</option>`
                        ).join('')}
                    </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-chair"></i>
                            Tavolo Preferito (opzionale)
                        </label>
                        <select class="form-select" id="booking-table">
                            <option value="">Assegnazione automatica</option>
                            <option value="2">Tavolo 2 - Piccolo (2-4 persone)</option>
                            <option value="3" selected>Tavolo 3 - Standard (4-6 persone)</option>
                            <option value="7">Tavolo 7 - Grande (6-8 persone)</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    // ==========================================
    // ✅ SEZIONE ELEMENTI SELEZIONATI MIGLIORATA
    // ==========================================

    createSelectedItemsHTML() {
        const hasItems = this.selectedItems.games.length > 0 ||
                        this.selectedItems.drinks.length > 0 ||
                        this.selectedItems.snacks.length > 0;

        if (!hasItems) {
            return `
                <div class="form-section empty-selection-section">
                    <h3 class="section-title">
                        <i class="fas fa-shopping-basket"></i>
                        Elementi Selezionati
                    </h3>
                    <div class="empty-selection-compact">
                        <div class="empty-content">
                            <i class="fas fa-shopping-cart"></i>
                            <div class="empty-text">
                                <p class="main-message">Nessun elemento selezionato</p>
                                <p class="sub-message">Aggiungi giochi, drink e snack dal catalogo per completare la tua esperienza</p>
                            </div>
                        </div>
                        <div class="empty-actions">
                            <button class="booking-btn-add-items" onclick="window.showPage('catalogo-giochi')">
                                <i class="fas fa-plus"></i>
                                Sfoglia Catalogo
                            </button>
                            <p class="skip-info">
                                <i class="fas fa-info-circle"></i>
                                Puoi procedere anche senza selezioni e ordinare al tavolo
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="form-section">
                <h3 class="section-title">
                    <i class="fas fa-shopping-basket"></i>
                    Elementi Selezionati
                    <span class="items-count">(${this.getTotalItemsCount()} elementi)</span>
                </h3>
                <div class="selected-items">
                    <div class="items-grid">
                        ${this.createItemCategoryHTML('games', 'Giochi Selezionati', 'fas fa-dice-d20')}
                        ${this.createItemCategoryHTML('drinks', 'Drink Ordinati', 'fas fa-cocktail')}
                        ${this.createItemCategoryHTML('snacks', 'Snack Ordinati', 'fas fa-cookie-bite')}
                    </div>
                    <div class="selection-actions">
                            <button class="booking-btn-modify-selection" onclick="window.showPage('catalogo-giochi')">
                            <i class="fas fa-edit"></i>
                            Modifica Selezione
                        </button>
                        <button class="booking-btn-clear-selection" onclick="window.bookingsPageManager.clearSelection()">
                            <i class="fas fa-trash-alt"></i>
                            Rimuovi Tutto
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    createItemCategoryHTML(category, title, icon) {
        const items = this.selectedItems[category];

        if (!items || items.length === 0) return '';

        return `
            <div class="item-category">
                <div class="category-header">
                    <i class="${icon}"></i>
                    ${title}
                    <span class="category-count">(${items.length})</span>
                </div>
                <ul class="item-list">
                    ${items.map(item => `
                        <li class="item-entry">
                            <span class="item-name">
                                ${item.name}${item.quantity ? ` x${item.quantity}` : ''}
                            </span>
                            <span class="item-price">
                                €${(item.price * (item.quantity || 1)).toFixed(2)}
                            </span>
                            <button class="booking-item-remove" onclick="window.bookingsPageManager.removeItem('${category}', ${item.id})" title="Rimuovi elemento">
                                <i class="fas fa-times"></i>
                            </button>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    createPricingSummaryHTML() {
        const pricing = this.calculateTotalPrice();

        return `
            <div class="pricing-summary">
                <h3>
                    <i class="fas fa-receipt"></i>
                    Riepilogo Costi
                </h3>
                <div class="summary-row">
                    <span>Noleggio Giochi:</span>
                    <span>€${pricing.games.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Drink:</span>
                    <span>€${pricing.drinks.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Snack:</span>
                    <span>€${pricing.snacks.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Prenotazione Tavolo:</span>
                    <span>€${pricing.table.toFixed(2)}</span>
                </div>
                <div class="summary-row total-row">
                    <span><strong>Totale:</strong></span>
                    <span><strong>€${pricing.total.toFixed(2)}</strong></span>
                </div>
            </div>
        `;
    }

    createSpecialRequestsHTML() {
        return `
            <div class="form-section">
                <h3 class="section-title">
                    <i class="fas fa-comment-alt"></i>
                    Richieste Speciali
                </h3>
                <div class="form-group">
                    <label class="form-label">Note aggiuntive (opzionale)</label>
                    <textarea class="form-input textarea"
                              id="special-requests"
                              placeholder="Eventuali richieste speciali, allergie, preferenze per il tavolo...">${this.bookingData.specialRequests}</textarea>
                </div>
            </div>
        `;
    }

    createActionButtonsHTML() {
        return `
            <div class="booking-action-buttons">
                <!-- Torna al Catalogo -->
                <div class="booking-btn-container">
                    <button class="booking-btn booking-btn-back" onclick="window.bookingsPageManager.goToCatalog()">
                        <i class="fas fa-arrow-left"></i>
                        Torna al Catalogo
                    </button>
                    <div class="booking-btn-description">Modifica selezione</div>
                </div>

                <!-- Conferma Prenotazione -->
                <div class="booking-btn-container">
                    <button class="booking-btn booking-btn-primary"
                            id="confirm-booking-btn"
                            onclick="window.bookingsPageManager.handleBooking()">
                        <i class="fas fa-calendar-check"></i>
                        Conferma Prenotazione
                    </button>
                    <div class="booking-btn-description">Procedi con il pagamento</div>
                </div>

                <!-- Annulla e vai alla Homepage -->
                <div class="booking-btn-container">
                    <button class="booking-btn booking-btn-cancel" onclick="window.bookingsPageManager.cancelBooking()">
                        <i class="fas fa-home"></i>
                        Annulla
                    </button>
                    <div class="booking-btn-description">Torna alla homepage</div>
                </div>
            </div>
        `;
    }

    // ==========================================
    // GESTIONE EVENTI E INTERAZIONI
    // ==========================================

    setupEvents() {
        // Form inputs
        const dateInput = document.getElementById('booking-date');
        const timeSelect = document.getElementById('booking-time');
        const durationSelect = document.getElementById('booking-duration');
        const playersSelect = document.getElementById('booking-players');
        const tableSelect = document.getElementById('booking-table');
        const specialRequestsTextarea = document.getElementById('special-requests');

        // Event listeners per aggiornare i dati
        if (dateInput) dateInput.addEventListener('change', (e) => {
            this.bookingData.date = e.target.value;
            this.validateForm();
        });

        if (timeSelect) timeSelect.addEventListener('change', (e) => {
            this.bookingData.time = e.target.value;
            this.validateForm();
        });

        if (durationSelect) durationSelect.addEventListener('change', (e) => {
            this.bookingData.duration = parseInt(e.target.value);
            this.validateForm();
        });

        if (playersSelect) playersSelect.addEventListener('change', (e) => {
            this.bookingData.players = parseInt(e.target.value);
            this.validateForm();
        });

        if (tableSelect) tableSelect.addEventListener('change', (e) => {
            this.bookingData.tableId = e.target.value;
            this.validateForm();
        });

        if (specialRequestsTextarea) specialRequestsTextarea.addEventListener('input', (e) => {
            this.bookingData.specialRequests = e.target.value;
        });

        console.log('✅ Event listeners prenotazioni setup completato');
    }

    validateForm() {
        // Solo data e giocatori sono obbligatori
        const requiredFields = ['date', 'players'];
        const isValid = requiredFields.every(field =>
            this.bookingData[field] && this.bookingData[field] !== ''
        );

        const confirmBtn = document.getElementById('confirm-booking-btn');
        if (confirmBtn) {
            confirmBtn.disabled = !isValid;
            if (!isValid) {
                confirmBtn.classList.add('booking-btn-disabled');
            } else {
                confirmBtn.classList.remove('booking-btn-disabled');
            }
        }

        return isValid;
    }

    // ==========================================
    // ✅ NUOVI METODI PER GESTIONE SELEZIONI
    // ==========================================

    getTotalItemsCount() {
        return this.selectedItems.games.length +
               this.selectedItems.drinks.length +
               this.selectedItems.snacks.length;
    }

    removeItem(category, itemId) {
        this.selectedItems[category] = this.selectedItems[category].filter(item => item.id !== itemId);

        // Aggiorna il localStorage/sessionStorage
        this.saveSelectionToStorage();

        // Ricarica la pagina per aggiornare l'UI
        this.refreshPage();

        console.log(`🗑️ Rimosso elemento ${itemId} dalla categoria ${category}`);
    }

    clearSelection() {
        const confirm = window.confirm(
            '⚠️ RIMUOVI TUTTI GLI ELEMENTI\n\n' +
            'Sei sicuro di voler rimuovere tutti gli elementi selezionati?\n\n' +
            'Questa azione non può essere annullata.'
        );

        if (confirm) {
            this.selectedItems = { games: [], drinks: [], snacks: [] };
            this.saveSelectionToStorage();
            this.refreshPage();
            console.log('🧹 Selezione completamente pulita');
        }
    }

    saveSelectionToStorage() {
        try {
            sessionStorage.setItem('catalogSelection', JSON.stringify(this.selectedItems));
            localStorage.setItem('bookingItems', JSON.stringify(this.selectedItems));
        } catch (error) {
            console.warn('⚠️ Errore nel salvataggio selezioni:', error);
        }
    }

    refreshPage() {
        // Ricarica la pagina prenotazioni per aggiornare l'UI
        window.showPage('prenotazioni');
    }

    // ==========================================
    // AZIONI UTENTE CON PROTEZIONE AUTH
    // ==========================================

    goToCatalog() {
        console.log('🔄 Reindirizzamento al catalogo...');
        window.showPage('catalogo-giochi');
    }

    cancelBooking() {
        const confirmCancel = confirm(
            '⚠️ ANNULLA PRENOTAZIONE\n\n' +
            'Sei sicuro di voler annullare?\n' +
            'Perderai tutta la selezione corrente.\n\n' +
            'OK = Torna alla homepage\n' +
            'Annulla = Rimani qui'
        );

        if (confirmCancel) {
            console.log('🏠 Reindirizzamento alla homepage...');
            this.clearBookingData();
            window.showPage('homepage');
        }
    }

    async handleBooking() {
        console.log('📋 Tentativo prenotazione...');

        // 🔐 CONTROLLO AUTENTICAZIONE
        if (!this.isAuthenticated) {
            console.log('❌ Utente non autenticato, mostra modal login');
            this.showAuthRequiredModal();
            return;
        }

        // Validazione form
        if (!this.validateForm()) {
            alert('⚠️ Completa tutti i campi obbligatori prima di procedere.');
            return;
        }

        // ✅ Utente autenticato - procedi con prenotazione
        await this.submitBooking();
    }

    showAuthRequiredModal() {
        console.log('🔐 Apertura modal di autenticazione per prenotazione');

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
            "Per completare la prenotazione devi essere registrato.\n\n" +
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
                alert("Sistema di autenticazione non disponibile.\nRicarica la pagina e riprova.");
            }
        }
    }

// SOSTITUZIONE per il metodo submitBooking in bookings.js
// Trova questo metodo e sostituisci la sezione "Prepara i dati per l'invio"

// SOSTITUZIONE COMPLETA del metodo submitBooking() in bookings.js
// Obiettivi: Debug avanzato, auto-recovery auth, logging dettagliato, validazione robusta

async submitBooking() {
    const confirmBtn = document.getElementById('confirm-booking-btn');

    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const originalContent = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<div class="loading"></div> Elaborazione...';

    try {
        console.log('🎯 ===== INIZIO PROCESSO PRENOTAZIONE =====');
        console.log('📊 Timestamp:', new Date().toISOString());

        // ==========================================
        // 🔍 FASE 1: ANALISI COMPLETA SISTEMA AUTH
        // ==========================================
        console.log('🔍 FASE 1: Analisi Sistema di Autenticazione');

        // Inventario completo di tutti i sistemi auth possibili
        const authSources = {
            simpleAuth: window.SimpleAuth,
            currentUser: window.currentUser,
            localStorage: {
                authToken: localStorage.getItem('authToken'),
                token: localStorage.getItem('token'),
                currentUser: localStorage.getItem('currentUser'),
                user: localStorage.getItem('user')
            },
            sessionStorage: {
                authToken: sessionStorage.getItem('authToken'),
                token: sessionStorage.getItem('token'),
                currentUser: sessionStorage.getItem('currentUser'),
                user: sessionStorage.getItem('user')
            }
        };

        console.log('📋 Inventario Sistemi Auth:', {
            simpleAuthPresent: !!authSources.simpleAuth,
            currentUserPresent: !!authSources.currentUser,
            localStorageTokens: Object.keys(authSources.localStorage).filter(k => authSources.localStorage[k]),
            sessionStorageTokens: Object.keys(authSources.sessionStorage).filter(k => authSources.sessionStorage[k])
        });

        // Analisi dettagliata SimpleAuth
        if (authSources.simpleAuth) {
            console.log('🔐 SimpleAuth Dettagliato:', {
                isAuthenticated: authSources.simpleAuth.isAuthenticated,
                currentUser: authSources.simpleAuth.currentUser,
                hasToken: !!authSources.simpleAuth.token,
                userProperties: authSources.simpleAuth.currentUser ? Object.keys(authSources.simpleAuth.currentUser) : []
            });
        }

        // Analisi dettagliata window.currentUser
        if (authSources.currentUser) {
            console.log('👤 CurrentUser Dettagliato:', {
                properties: Object.keys(authSources.currentUser),
                hasId: !!authSources.currentUser.id,
                hasUserId: !!authSources.currentUser.userId,
                hasToken: !!authSources.currentUser.token,
                email: authSources.currentUser.email
            });
        }

        // ==========================================
        // 🎯 FASE 2: AUTO-RECOVERY INTELLIGENTE
        // ==========================================
        console.log('🎯 FASE 2: Auto-Recovery Dati Utente');

        let userId = null;
        let authToken = null;
        let userEmail = null;
        let authMethod = null;

        // Strategia 1: SimpleAuth con isAuthenticated
        if (authSources.simpleAuth?.isAuthenticated && authSources.simpleAuth.currentUser) {
            userId = authSources.simpleAuth.currentUser.id || authSources.simpleAuth.currentUser.userId;
            authToken = authSources.simpleAuth.token || authSources.localStorage.authToken;
            userEmail = authSources.simpleAuth.currentUser.email;
            authMethod = 'SimpleAuth';
            console.log('✅ Strategia 1 SUCCESS: SimpleAuth', { userId, hasToken: !!authToken, email: userEmail });
        }
        // Strategia 2: window.currentUser diretto
        else if (authSources.currentUser?.id || authSources.currentUser?.userId) {
            userId = authSources.currentUser.id || authSources.currentUser.userId;
            authToken = authSources.currentUser.token || authSources.localStorage.authToken || authSources.localStorage.token;
            userEmail = authSources.currentUser.email;
            authMethod = 'currentUser';
            console.log('✅ Strategia 2 SUCCESS: currentUser', { userId, hasToken: !!authToken, email: userEmail });
        }
        // Strategia 3: localStorage parsing
        else if (authSources.localStorage.currentUser) {
            try {
                const parsed = JSON.parse(authSources.localStorage.currentUser);
                userId = parsed.id || parsed.userId;
                authToken = parsed.token || authSources.localStorage.authToken || authSources.localStorage.token;
                userEmail = parsed.email;
                authMethod = 'localStorage';
                console.log('✅ Strategia 3 SUCCESS: localStorage', { userId, hasToken: !!authToken, email: userEmail });
            } catch (e) {
                console.warn('⚠️ Strategia 3 FAILED: Errore parsing localStorage:', e);
            }
        }
        // Strategia 4: sessionStorage parsing
        else if (authSources.sessionStorage.currentUser) {
            try {
                const parsed = JSON.parse(authSources.sessionStorage.currentUser);
                userId = parsed.id || parsed.userId;
                authToken = parsed.token || authSources.sessionStorage.authToken || authSources.sessionStorage.token;
                userEmail = parsed.email;
                authMethod = 'sessionStorage';
                console.log('✅ Strategia 4 SUCCESS: sessionStorage', { userId, hasToken: !!authToken, email: userEmail });
            } catch (e) {
                console.warn('⚠️ Strategia 4 FAILED: Errore parsing sessionStorage:', e);
            }
        }

        console.log('🎯 RISULTATO AUTO-RECOVERY:', {
            userId: userId,
            hasToken: !!authToken,
            tokenPreview: authToken ? authToken.substring(0, 20) + '...' : null,
            userEmail: userEmail,
            authMethod: authMethod
        });

        // ==========================================
        // 🛡️ FASE 3: VALIDAZIONE AUTENTICAZIONE
        // ==========================================
        console.log('🛡️ FASE 3: Validazione Autenticazione');

        if (!userId) {
            console.error('❌ ERRORE CRITICO: Nessun userId trovato');
            console.log('💡 Suggerimenti:');
            console.log('   - Verifica di essere loggato');
            console.log('   - Controlla la console per errori di login');
            console.log('   - Prova a rifare il login');
            throw new Error(
                'Sistema di autenticazione non funzionante.\n\n' +
                '• Verifica di essere correttamente loggato\n' +
                '• Prova a ricaricare la pagina\n' +
                '• Se il problema persiste, effettua logout e login'
            );
        }

        if (!authToken) {
            console.error('❌ ERRORE CRITICO: Nessun token di autenticazione');
            throw new Error(
                'Token di autenticazione mancante.\n\n' +
                '• Il tuo login potrebbe essere scaduto\n' +
                '• Effettua nuovamente il login per continuare'
            );
        }

        console.log('✅ Autenticazione VALIDATA:', {
            userId: userId,
            tokenLength: authToken.length,
            userEmail: userEmail,
            method: authMethod
        });

        // ==========================================
        // 📊 FASE 4: PREPARAZIONE DATI PRENOTAZIONE
        // ==========================================
        console.log('📊 FASE 4: Preparazione Dati Prenotazione');

        // Validazione dati form prima della preparazione
        const formValidation = {
            hasDate: !!this.bookingData.date,
            hasPlayers: !!this.bookingData.players && parseInt(this.bookingData.players) > 0,
            validPlayers: parseInt(this.bookingData.players) >= 1 && parseInt(this.bookingData.players) <= 20,
            hasTime: !!this.bookingData.time
        };

        console.log('📋 Validazione Form:', formValidation);

        if (!formValidation.hasDate) {
            throw new Error('Data prenotazione non selezionata');
        }
        if (!formValidation.hasPlayers) {
            throw new Error('Numero giocatori non specificato');
        }
        if (!formValidation.validPlayers) {
            throw new Error('Numero giocatori deve essere tra 1 e 20');
        }

        // Preparazione payload con mapping ottimizzato
        const bookingPayload = {
            // Campi obbligatori
            booking_date: this.bookingData.date,
            booking_time: this.bookingData.time || '18:00',
            party_size: parseInt(this.bookingData.players),

            // Campi opzionali
            duration_hours: parseInt(this.bookingData.duration) || 2,
            table_number: this.bookingData.tableId || null,
            special_requests: this.bookingData.specialRequests?.trim() || null,

            // Elementi selezionati (convertiti in array di stringhe)
            game_requests: this.selectedItems.games.map(g => g.name),
            drink_orders: this.selectedItems.drinks.map(d =>
                d.quantity && d.quantity > 1 ? `${d.name} x${d.quantity}` : d.name
            ),
            snack_orders: this.selectedItems.snacks.map(s => s.name),

            // Pricing
            total_price: parseFloat(this.calculateTotalPrice().total.toFixed(2))
        };

        console.log('📦 Payload Prenotazione Preparato:', {
            booking_date: bookingPayload.booking_date,
            booking_time: bookingPayload.booking_time,
            party_size: bookingPayload.party_size,
            duration_hours: bookingPayload.duration_hours,
            total_price: bookingPayload.total_price,
            table_number: bookingPayload.table_number,
            items_count: {
                games: bookingPayload.game_requests.length,
                drinks: bookingPayload.drink_orders.length,
                snacks: bookingPayload.snack_orders.length
            },
            has_special_requests: !!bookingPayload.special_requests
        });

        // ==========================================
        // 🌐 FASE 5: CHIAMATA API
        // ==========================================
        console.log('🌐 FASE 5: Chiamata API');

        const apiUrl = `/api/users/${userId}/bookings`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        };

        console.log('🚀 Preparazione chiamata API:', {
            url: apiUrl,
            method: 'POST',
            hasAuth: headers.Authorization.startsWith('Bearer '),
            contentType: headers['Content-Type'],
            payloadSize: JSON.stringify(bookingPayload).length
        });

        // Esecuzione chiamata API
        console.log('📡 Invio richiesta al server...');
        const requestStart = Date.now();

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(bookingPayload)
        });

        const requestDuration = Date.now() - requestStart;
        console.log('📡 Risposta ricevuta:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            duration: `${requestDuration}ms`,
            headers: Object.fromEntries(response.headers.entries())
        });

        // ==========================================
        // 📋 FASE 6: ELABORAZIONE RISPOSTA
        // ==========================================
        console.log('📋 FASE 6: Elaborazione Risposta');

        let result;
        try {
            result = await response.json();
            console.log('✅ JSON Response parsato:', result);
        } catch (parseError) {
            console.error('❌ Errore parsing JSON response:', parseError);
            throw new Error('Risposta del server non valida');
        }

        if (!response.ok) {
            console.error('❌ Errore HTTP:', {
                status: response.status,
                statusText: response.statusText,
                errorData: result
            });

            const errorMessage = result.message || result.error || `Errore ${response.status}: ${response.statusText}`;
            throw new Error(errorMessage);
        }

        // ==========================================
        // 🎉 FASE 7: SUCCESSO E CLEANUP
        // ==========================================
        console.log('🎉 FASE 7: Prenotazione Completata con Successo');

        const pricing = this.calculateTotalPrice();
        const confirmationCode = result.booking?.confirmation_code || result.confirmation_code || 'In elaborazione';

        console.log('✅ PRENOTAZIONE SALVATA NEL DATABASE:', {
            bookingId: result.booking?.id || result.id,
            confirmationCode: confirmationCode,
            status: result.booking?.status || 'pending',
            totalPrice: pricing.total,
            userId: userId,
            authMethod: authMethod
        });

        // Notifica utente del successo
        const successMessage =
            '🎉 PRENOTAZIONE CONFERMATA!\n\n' +
            `📧 Codice Conferma: ${confirmationCode}\n` +
            `💰 Totale: €${pricing.total.toFixed(2)}\n` +
            `📅 Data: ${this.formatDate(this.bookingData.date)}\n` +
            `⏰ Orario: ${this.bookingData.time || '18:00'}\n` +
            `👥 Giocatori: ${this.bookingData.players}\n\n` +
            '📧 Riceverai email di conferma entro 5 minuti\n' +
            '🎮 Preparati per una serata fantastica!';

        alert(successMessage);

        // Cleanup e reindirizzamento
        console.log('🧹 Pulizia dati e reindirizzamento...');
        this.clearBookingData();
        window.showPage('homepage');

        console.log('🎯 ===== PROCESSO PRENOTAZIONE COMPLETATO =====');

    } catch (error) {
        console.error('❌ ===== ERRORE DURANTE PRENOTAZIONE =====');
        console.error('🔍 Tipo errore:', error.name);
        console.error('📝 Messaggio:', error.message);
        console.error('📊 Stack trace:', error.stack);
        console.error('⏰ Timestamp:', new Date().toISOString());

        // Messaggio user-friendly basato sul tipo di errore
        let userMessage = error.message;

        if (error.message.includes('non identificato') || error.message.includes('autenticazione')) {
            userMessage =
                '🔐 Problema di Autenticazione\n\n' +
                'Il tuo login potrebbe essere scaduto.\n' +
                'Prova a:\n' +
                '• Ricaricare la pagina\n' +
                '• Effettuare logout e login\n' +
                '• Controllare la connessione internet';
        } else if (error.message.includes('fetch') || error.message.includes('network')) {
            userMessage =
                '🌐 Problema di Connessione\n\n' +
                'Impossibile contattare il server.\n' +
                'Verifica la connessione internet e riprova.';
        } else if (error.message.includes('Data') || error.message.includes('giocatori')) {
            userMessage =
                '📋 Dati Incompleti\n\n' +
                'Controlla di aver compilato tutti i campi obbligatori:\n' +
                '• Data prenotazione\n' +
                '• Numero giocatori (1-20)';
        }

        alert(`❌ ${userMessage}`);

    } finally {
        // Ripristina sempre il bottone
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalContent;
        this.isSubmitting = false;

        console.log('🔄 Stato bottone ripristinato');
    }
}

    async simulateAPICall(data) {
        // Simula delay API
        await new Promise(resolve => setTimeout(resolve, 2500));

        // Simula possibile errore (5% di probabilità)
        if (Math.random() < 0.05) {
            throw new Error('Errore di rete. Riprova.');
        }

        // Simula successo
        return { success: true, id: Date.now() };
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    generateConfirmationCode() {
        const prefix = 'DCK';
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
        return `${prefix}${date}${random}`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    clearBookingData() {
        this.bookingData = { ...BOOKINGS_CONFIG.DEFAULT_BOOKING };
        this.selectedItems = { games: [], drinks: [], snacks: [] };

        // Pulisci anche il storage
        try {
            sessionStorage.removeItem('catalogSelection');
            localStorage.removeItem('bookingItems');
        } catch (error) {
            console.warn('⚠️ Errore pulizia storage:', error);
        }

        console.log('🧹 Dati prenotazione e selezioni puliti');
    }

    showError(message) {
        console.error('❌ Errore prenotazioni:', message);
        // Implementare UI per errori se necessario
    }
}

// ==========================================
// FUNZIONE PRINCIPALE DELLA PAGINA
// ==========================================

export function showBookings() {
    console.log('🎯 Apertura pagina prenotazioni');

    const content = document.getElementById('content');
    if (!content) {
        console.error('❌ Container #content non trovato!');
        return;
    }

    // Crea manager se non esiste
    if (!window.bookingsPageManager) {
        window.bookingsPageManager = new BookingsPageManager();
    }

    const manager = window.bookingsPageManager;

    try {
        // Renderizza la pagina prenotazioni
        content.innerHTML = manager.createBookingsHTML();

        // Setup eventi e inizializzazioni
        manager.setupEvents();

        console.log('✅ Pagina prenotazioni caricata con successo');

    } catch (error) {
        console.error('❌ Errore caricamento pagina prenotazioni:', error);
        content.innerHTML = `
            <div class="error-page">
                <h2>Errore nel caricamento</h2>
                <p>${error.message}</p>
                <button onclick="window.showPage('homepage')" class="booking-btn booking-btn-primary">
                    <i class="fas fa-home"></i>
                    Torna alla Homepage
                </button>
            </div>
        `;
    }
}

// ==========================================
// FUNZIONI UTILITY GLOBALI PER TEST
// ==========================================

// Funzione per test rapido della pagina con elementi selezionati
window.testBookingsWithItems = function() {
    console.log('🧪 Test pagina prenotazioni con elementi...');

    // Crea elementi di test per tutte le categorie
    const testItems = {
        games: [
            { id: 1, name: 'Catan Deluxe', price: 12.00 },
            { id: 2, name: 'Azul: Summer Pavilion', price: 8.50 },
            { id: 3, name: 'Wingspan', price: 10.00 }
        ],
        drinks: [
            { id: 1, name: 'Coca Cola', quantity: 2, price: 3.50 },
            { id: 2, name: 'Birra Artigianale IPA', quantity: 1, price: 6.00 },
            { id: 3, name: 'Cocktail Negroni', quantity: 1, price: 8.50 }
        ],
        snacks: [
            { id: 1, name: 'Patatine Gourmet', price: 4.50 },
            { id: 2, name: 'Mix Olive Premium', price: 5.00 },
            { id: 3, name: 'Tagliere Formaggi', price: 12.00 }
        ]
    };

    // Salva nel storage
    sessionStorage.setItem('catalogSelection', JSON.stringify(testItems));
    localStorage.setItem('bookingItems', JSON.stringify(testItems));

    // Ricarica la pagina
    window.showPage('prenotazioni');

    console.log('✅ Test completato - pagina ricaricata con 9 elementi di test');
    console.log('💰 Totale stimato: €', (12+8.5+10 + 3.5*2+6+8.5 + 4.5+5+12 + 2.5).toFixed(2));
};

// Funzione per test stato vuoto
window.testEmptyBookings = function() {
    console.log('🧪 Test stato vuoto prenotazioni...');

    // Rimuovi tutti gli elementi dal storage
    sessionStorage.removeItem('catalogSelection');
    localStorage.removeItem('bookingItems');

    // Ricarica la pagina
    window.showPage('prenotazioni');

    console.log('✅ Test completato - pagina ricaricata senza elementi');
    console.log('📦 Storage pulito - dovrebbe mostrare stato vuoto compatto');
};

// Funzione per test con pochi elementi
window.testPartialBookings = function() {
    console.log('🧪 Test pagina prenotazioni con selezione parziale...');

    const partialItems = {
        games: [
            { id: 1, name: 'Monopoly Classic', price: 6.00 }
        ],
        drinks: [], // Vuoto
        snacks: [
            { id: 1, name: 'Popcorn Caramellati', price: 3.00 }
        ]
    };

    sessionStorage.setItem('catalogSelection', JSON.stringify(partialItems));
    window.showPage('prenotazioni');

    console.log('✅ Test completato - 1 gioco + 1 snack, 0 drink');
};

// Funzione per simulare rimozione elemento
window.testRemoveItem = function() {
    console.log('🧪 Test rimozione elemento...');

    if (!window.bookingsPageManager) {
        console.warn('⚠️ Manager non trovato, carica prima la pagina prenotazioni');
        return;
    }

    const manager = window.bookingsPageManager;
    const items = manager.selectedItems;

    if (items.games.length > 0) {
        const removedGame = items.games[0];
        manager.removeItem('games', removedGame.id);
        console.log(`🗑️ Rimosso gioco: ${removedGame.name}`);
    } else {
        console.log('📭 Nessun gioco da rimuovere');
    }
};

// ==========================================
// DEBUG E MONITORING
// ==========================================

// Funzione per ispezionare stato corrente
window.debugBookingsState = function() {
    console.log('🔍 Debug stato prenotazioni:');

    if (window.bookingsPageManager) {
        const manager = window.bookingsPageManager;
        console.log('👤 Manager esistente:', !!manager);
        console.log('🔐 Autenticato:', manager.isAuthenticated);
        console.log('📋 Dati prenotazione:', manager.bookingData);
        console.log('🛒 Elementi selezionati:', manager.selectedItems);
        console.log('💰 Prezzi calcolati:', manager.calculateTotalPrice());
        console.log('📊 Totale elementi:', manager.getTotalItemsCount());
    } else {
        console.log('❌ Manager non inizializzato');
    }

    // Controlla storage
    console.log('💾 Storage sessionStorage:', sessionStorage.getItem('catalogSelection'));
    console.log('💾 Storage localStorage:', localStorage.getItem('bookingItems'));
};

// Funzione per pulire completamente tutto
window.resetBookingsCompletely = function() {
    const confirm = window.confirm(
        '⚠️ RESET COMPLETO\n\n' +
        'Questo cancellerà:\n' +
        '• Tutti gli elementi selezionati\n' +
        '• Dati di prenotazione\n' +
        '• Cache del manager\n\n' +
        'Procedere?'
    );

    if (confirm) {
        // Pulisci storage
        sessionStorage.removeItem('catalogSelection');
        localStorage.removeItem('bookingItems');

        // Reset manager
        if (window.bookingsPageManager) {
            window.bookingsPageManager.clearBookingData();
            delete window.bookingsPageManager;
        }

        // Ricarica homepage
        window.showPage('homepage');

        console.log('🧹 Reset completo effettuato');
    }
};

// ==========================================
// INIZIALIZZAZIONE E LOGS
// ==========================================

console.log('✅ Pagina prenotazioni caricata con sezione elementi selezionati migliorata');

// Log delle funzioni di test disponibili
console.log('🧪 Funzioni di test disponibili:');
console.log('   📦 window.testBookingsWithItems() - Test con molti elementi');
console.log('   📭 window.testEmptyBookings() - Test stato vuoto');
console.log('   📄 window.testPartialBookings() - Test selezione parziale');
console.log('   🗑️ window.testRemoveItem() - Test rimozione elemento');
console.log('   🔍 window.debugBookingsState() - Ispeziona stato corrente');
console.log('   🧹 window.resetBookingsCompletely() - Reset completo');

// Log dello stato iniziale
if (typeof window !== 'undefined') {
    console.log('🎯 Stato iniziale storage:');
    console.log('   sessionStorage:', !!sessionStorage.getItem('catalogSelection'));
    console.log('   localStorage:', !!localStorage.getItem('bookingItems'));
}

// ==========================================
// EXPORT E COMPATIBILITÀ
// ==========================================

// Assicura compatibilità con diversi sistemi di module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showBookings };
}

// Support per AMD
if (typeof define === 'function' && define.amd) {
    define([], function() {
        return { showBookings };
    });
}

// Global fallback
if (typeof window !== 'undefined') {
    window.showBookings = showBookings;
}

console.log('📁 Bookings module parte 2 caricato completamente');
