console.log('👤 Caricamento pagina dashboard...');

// ==========================================
// CONFIGURAZIONE DASHBOARD
// ==========================================

const DASHBOARD_CONFIG = {
    API_ENDPOINTS: {
        dashboard: '/api/users/:userId/',
        updateProfile: '/api/users/:userId',
        updatePassword: '/api/users/:userId/password',
        updateSettings: '/api/users/:userId/settings',
        updatePreferences: '/api/users/:userId/preferences',
        userBookings: '/api/users/:userId/bookings',
        userStats: '/api/users/:userId/stats',
        userPreferences: '/api/users/:userId/preferences',
        exportUserData: '/api/users/:userId/export',
        bookingDetails: '/api/admin/bookings/:bookingId',
        confirmBooking: '/api/admin/bookings/:bookingId/confirm',
        cancelBooking: '/api/admin/bookings/:bookingId/cancel',
        allBookings: '/api/admin/bookings',
        allUsers: '/api/admin/users',
        systemInventory: '/api/admin/analytics',
        systemStats: '/api/admin/system/stats',
        inventoryDetails: '/api/admin/inventory/details',
        availableGameCategories: '/api/games/categories',
        availableDrinkTypes: '/api/drinks/types',
        availableTimeSlots: '/api/system/time-slots'
    },
    REFRESH_INTERVAL: 30000,
    MAX_RETRIES: 3,
    STICKY_CONFIG: {
        navbarSelector: 'nav, .navbar, header',
        defaultNavbarHeight: 80,
        stickyOffset: 20,
        mobileBreakpoint: 768
    }
};

// ==========================================
// CLASSE MANAGER DASHBOARD
// ==========================================

class DashboardPageManager {
    constructor() {
        this.currentUser = null;
        this.dashboardData = null;
        this.isLoading = false;
        this.refreshInterval = null;

        console.log('✅ DashboardPageManager inizializzato');
    }

    // ==========================================
    // CONTROLLO AUTENTICAZIONE E UTENTE
    // ==========================================

    get isAuthenticated() {
        return (window.SimpleAuth && window.SimpleAuth.isAuthenticated) ||
               Boolean(window.currentUser) ||
               Boolean(localStorage.getItem('authToken'));
    }

    getCurrentUserInfo() {
        // Strategia 1: SimpleAuth
        if (window.SimpleAuth && window.SimpleAuth.currentUser) {
            return {
                userId: window.SimpleAuth.currentUser.id || window.SimpleAuth.currentUser.userId,
                email: window.SimpleAuth.currentUser.email,
                role: window.SimpleAuth.currentUser.role,
                firstName: window.SimpleAuth.currentUser.first_name,
                lastName: window.SimpleAuth.currentUser.last_name
            };
        }

        // Strategia 2: window.currentUser
        if (window.currentUser) {
            return {
                userId: window.currentUser.id || window.currentUser.userId,
                email: window.currentUser.email,
                role: window.currentUser.role,
                firstName: window.currentUser.first_name,
                lastName: window.currentUser.last_name
            };
        }

        // Strategia 3: localStorage
        try {
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                const user = JSON.parse(stored);
                return {
                    userId: user.id || user.userId,
                    email: user.email,
                    role: user.role,
                    firstName: user.first_name,
                    lastName: user.last_name
                };
            }
        } catch (e) {
            console.warn('⚠️ Errore parsing localStorage user:', e);
        }

        return null;
    }

    getAuthToken() {
        return window.SimpleAuth?.token ||
               localStorage.getItem('authToken') ||
               localStorage.getItem('token');
    }

    // ==========================================
    // CARICAMENTO DATI DASHBOARD
    // ==========================================

    async loadDashboardData() {
        console.log('📊 Caricamento dati dashboard...');

        if (!this.isAuthenticated) {
            throw new Error('Utente non autenticato');
        }

        const userInfo = this.getCurrentUserInfo();
        if (!userInfo || !userInfo.userId) {
            throw new Error('Informazioni utente non disponibili');
        }

        const token = this.getAuthToken();
        if (!token) {
            throw new Error('Token di autenticazione mancante');
        }

        this.isLoading = true;

        try {
            const apiUrl = DASHBOARD_CONFIG.API_ENDPOINTS.dashboard.replace(':userId', userInfo.userId);

            console.log('🌐 Chiamata API dashboard:', { apiUrl, userId: userInfo.userId });

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Errore HTTP ${response.status}`);
            }

            this.dashboardData = await response.json();
            this.currentUser = userInfo;

            console.log('✅ Dati dashboard caricati:', {
                role: this.dashboardData.role,
                hasStats: !!this.dashboardData.stats,
                hasPreferences: !!this.dashboardData.preferences
            });

            // Carica avatar utente dopo il rendering della dashboard
            setTimeout(() => {
                this.loadUserAvatar(userInfo.userId);
            }, 500);

            return this.dashboardData;

        } catch (error) {
            console.error('❌ Errore caricamento dashboard:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    async fetchUserBookings() {
        const userInfo = this.getCurrentUserInfo();
        const token = this.getAuthToken();
        const apiUrl = DASHBOARD_CONFIG.API_ENDPOINTS.userBookings.replace(':userId', userInfo.userId);

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Errore caricamento prenotazioni');
        return await response.json();
    }

    async fetchUserPreferences() {
        const userInfo = this.getCurrentUserInfo();
        const token = this.getAuthToken();
        const apiUrl = DASHBOARD_CONFIG.API_ENDPOINTS.updatePreferences.replace(':userId', userInfo.userId);

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Errore caricamento preferenze');
        return await response.json();
    }

    async fetchAllBookings() {
        const token = this.getAuthToken();
        const apiUrl = DASHBOARD_CONFIG.API_ENDPOINTS.allBookings;

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Errore caricamento prenotazioni');
        return await response.json();
    }

    // ==========================================
    // GENERAZIONE HTML DASHBOARD
    // ==========================================

    createDashboardHTML() {
        if (!this.dashboardData) {
            return this.createLoadingHTML();
        }

        const { user, role, stats } = this.dashboardData;

        return `
            <div class="dash-page">
                <div class="dash-container">
                    ${this.createDashboardHeaderHTML(user, role)}
                    ${this.createDashboardGridHTML()}
                </div>
            </div>
        `;
    }

    createLoadingHTML() {
        return `
            <div class="dash-loading">
                <div class="dash-loading-spinner"></div>
                <p>Caricamento dashboard...</p>
            </div>
        `;
    }

    createDashboardHeaderHTML(user, role) {
        const roleLabels = {
            customer: 'Cliente',
            staff: 'Staff',
            admin: 'Admin'
        };

        const displayName = user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.email;

        return `
            <!-- Header Utente -->
            <div class="user-header-section">
                <div class="user-avatar-container">
                    <div class="user-avatar" id="dash-user-avatar-container">
                        ${this.createAvatarHTML(user, displayName)}
                    </div>
                    <button class="avatar-edit-btn" id="avatar-edit-btn" title="Cambia foto profilo" onclick="window.dashboardManager.openAvatarModal()">
                        <i class="fas fa-pen"></i>
                    </button>
                </div>
                <div class="user-info-grid">
                    <div class="user-info-column">
                        <div class="info-label">Nome</div>
                        <div class="info-value" id="user-name-display" onclick="window.dashboardManager.editField('name')" title="Clicca per modificare">
                            ${displayName}
                            <i class="fas fa-pen edit-icon"></i>
                        </div>
                    </div>
                    <div class="user-info-separator"></div>
                    <div class="user-info-column">
                        <div class="info-label">Email</div>
                        <div class="info-value" id="user-email-display" onclick="window.dashboardManager.editField('email')" title="Clicca per modificare">
                            ${user.email}
                            <i class="fas fa-pen edit-icon"></i>
                        </div>
                    </div>
                    <div class="user-info-separator"></div>
                    <div class="user-info-column">
                        <div class="info-label">Ruolo</div>
                        <div class="info-value">
                            <i class="fas fa-shield-alt"></i>
                            ${roleLabels[role] || role}
                        </div>
                    </div>
                    <div class="user-info-separator"></div>
                    <div class="user-info-column">
                        <div class="info-label">Telefono</div>
                        <div class="info-value" id="user-phone-display" onclick="window.dashboardManager.editField('phone')" title="Clicca per modificare">
                            ${user.phone || '<span style="opacity: 0.6; font-style: italic;">Non inserito</span>'}
                            <i class="fas fa-pen edit-icon"></i>
                        </div>
                    </div>
                    <div class="user-info-separator"></div>
                    <div class="user-info-column">
                        <div class="info-label">Membro dal</div>
                        <div class="info-value">${this.formatDate(user.createdAt)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    createDashboardGridHTML() {
        const { role } = this.dashboardData;

        return `
            <div class="dash-grid">
                ${this.createSidebarHTML(role)}
                <div class="dash-main">
                    ${role === 'customer' ? this.createCustomerSectionsHTML() : ''}
                    ${role === 'staff' ? this.createStaffSectionsHTML() : ''}
                    ${role === 'admin' ? this.createAdminSectionsHTML() : ''}
                </div>
            </div>
        `;
    }

    createSidebarHTML(role) {
        const sections = {
            customer: [
                { 
                    icon: 'fas fa-home', 
                    text: 'Panoramica', 
                    id: 'dashboard', 
                    active: true,
                    description: 'Riepilogo generale account'
                },
                { 
                    icon: 'fas fa-calendar-check', 
                    text: 'Le Tue Prenotazioni', 
                    id: 'bookings',
                    description: 'Gestisci prenotazioni attive'
                },
                { 
                    icon: 'fas fa-heart', 
                    text: 'Preferenze Personali', 
                    id: 'preferences',
                    description: 'Personalizza la tua esperienza'
                }
            ],
            staff: [
                { 
                    icon: 'fas fa-tachometer-alt', 
                    text: 'Dashboard Staff', 
                    id: 'dashboard', 
                    active: true,
                    description: 'Pannello controllo staff'
                },
                { 
                    icon: 'fas fa-clipboard-list', 
                    text: 'Gestione Prenotazioni', 
                    id: 'manage-bookings',
                    description: 'Amministra prenotazioni clienti'
                },
                { 
                    icon: 'fas fa-users', 
                    text: 'Clienti Registrati', 
                    id: 'user-list',
                    description: 'Visualizza clienti registrati'
                }
            ],
            admin: [
                { 
                    icon: 'fas fa-crown', 
                    text: 'Dashboard Admin', 
                    id: 'dashboard', 
                    active: true,
                    description: 'Controllo amministratore'
                },
                { 
                    icon: 'fas fa-chart-line', 
                    text: 'Sistema & Analytics', 
                    id: 'system-dashboard',
                    description: 'Monitoraggio sistema e inventario'
                },
                { 
                    icon: 'fas fa-calendar-alt', 
                    text: 'Gestione Prenotazioni', 
                    id: 'manage-bookings',
                    description: 'Controllo completo prenotazioni'
                },
                { 
                    icon: 'fas fa-users-cog', 
                    text: 'Gestione Utenti', 
                    id: 'manage-users',
                    description: 'Amministrazione utenti sistema'
                }
            ]
        };

        const menuItems = sections[role] || sections.customer;

        return `
            <div class="dash-sidebar">
                <nav>
                    <div class="dash-sidebar-section">
                        <div class="dash-sidebar-title">
                            <i class="fas fa-bars"></i>
                            Menu Navigazione
                        </div>
                        <ul class="dash-sidebar-nav">
                            ${menuItems.map(item => `
                                <li class="dash-nav-item ${item.active ? 'active' : ''}">
                                    <a href="#${item.id}" class="dash-nav-link main-link ${item.active ? 'active' : ''}"
                                       onclick="window.dashboardManager.scrollToSection('${item.id}')"
                                       title="${item.description || item.text}">
                                        <div class="nav-link-content">
                                            <i class="${item.icon}"></i>
                                            <span class="nav-text">${item.text}</span>
                                        </div>
                                    </a>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    
                    <!-- Azioni rapide -->
                    <div class="dash-sidebar-section dash-quick-actions">
                        <div class="dash-sidebar-title">
                            <i class="fas fa-bolt"></i>
                            Azioni Rapide
                        </div>
                        <div class="quick-action-buttons">
                            <button class="quick-btn" onclick="window.dashboardManager.savePreferences()" title="Salva Preferenze">
                                <i class="fas fa-save"></i>
                                <span>Salva</span>
                            </button>
                            <button class="quick-btn" onclick="window.dashboardManager.refreshDashboard()" title="Aggiorna Dashboard">
                                <i class="fas fa-sync-alt"></i>
                                <span>Aggiorna</span>
                            </button>
                            <button class="quick-btn" onclick="window.dashboardManager.logout()" title="Logout">
                                <i class="fas fa-sign-out-alt"></i>
                                <span>Esci</span>
                            </button>
                        </div>
                    </div>
                </nav>
            </div>
        `;
    }


    createCustomerSectionsHTML() {
        return `
            ${this.createPreferencesSectionHTML()}
            ${this.createBookingsSectionHTML()}
        `;
    }

// ==========================================
// SEZIONE STAFF
// ==========================================

createStaffSectionsHTML() {
        return `
            <!-- Gestione Prenotazioni Staff -->
            <div class="dash-card dash-staff-section" id="manage-bookings">
                <div class="dash-card-header">
                    <h2 class="dash-card-title">
                        <i class="fas fa-clipboard dash-card-icon"></i>
                        Gestione Prenotazioni
                    </h2>
                    <div class="staff-section-controls">
                        <select id="booking-status-filter" onchange="window.dashboardManager.filterBookings(this.value)">
                            <option value="all">Tutte le prenotazioni</option>
                            <option value="pending" selected>In attesa di conferma</option>
                            <option value="confirmed">Confermate</option>
                            <option value="completed">Completate</option>
                            <option value="cancelled">Annullate</option>
                        </select>
                        <button class="dash-btn dash-btn-secondary" onclick="window.dashboardManager.refreshBookings()">
                            <i class="fas fa-rotate"></i>
                            Aggiorna
                        </button>
                    </div>
                </div>

                <!-- Container prenotazioni staff -->
                <div id="staff-bookings-container" class="staff-bookings-container">
                    <div class="loading-bookings">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Caricamento prenotazioni...</span>
                    </div>
                </div>
            </div>

            <!-- Utenti Lista (Staff) -->
            <div class="dash-card dash-staff-section" id="user-list">
                <div class="dash-card-header">
                    <h2 class="dash-card-title">
                        <i class="fas fa-users dash-card-icon"></i>
                        Lista Utenti Registrati
                    </h2>
                    <button class="dash-btn dash-btn-outline" onclick="window.dashboardManager.showAllUsers()">
                        Vedi Tutto
                    </button>
                </div>
                <div id="users-list-container">
                    ${this.generateRecentUsersHTML()}
                </div>
            </div>
        `;
    }

// ==========================================
// METODI PER CARICAMENTO PRENOTAZIONI STAFF
// ==========================================

async loadStaffBookings(status = 'pending') {
    console.log('📋 Caricamento prenotazioni staff, status:', status);

    try {
        const token = this.getAuthToken();
        const apiUrl = DASHBOARD_CONFIG.API_ENDPOINTS.allBookings;

        const queryParams = new URLSearchParams();

        if (status && status !== 'all') {
            queryParams.append('status', status);
        }

        queryParams.append('limit', '1000'); // Limite alto per vedere tutto
        queryParams.append('page', '1');
        queryParams.append('sortBy', 'booking_date');
        queryParams.append('sortOrder', 'ASC');

        const finalUrl = queryParams.toString() ? `${apiUrl}?${queryParams.toString()}` : apiUrl;

        console.log('🌐 Chiamata API prenotazioni completa:', {
            url: finalUrl,
            status: status,
            params: Object.fromEntries(queryParams)
        });

        const response = await fetch(finalUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Errore HTTP:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`Errore HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Risposta API completa:', result);

        let bookings = [];

        if (result.success === true && Array.isArray(result.bookings)) {
            bookings = result.bookings;
        } else if (Array.isArray(result.data)) {
            bookings = result.data;
        } else if (Array.isArray(result)) {
            bookings = result;
        } else {
            console.warn('⚠️ Formato risposta API non riconosciuto:', result);
            throw new Error('Formato risposta API non valido');
        }

        console.log('📊 Prenotazioni processate:', {
            totaleRicevute: bookings.length,
            filtroApplicato: status,
            primiTreIds: bookings.slice(0, 3).map(b => b.id)
        });

        return bookings;

    } catch (error) {
        console.error('❌ Errore caricamento prenotazioni:', error);

        if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
            console.log('🔄 Modalità sviluppo: utilizzo dati mock...');
            return this.getMockBookingsForStaff(status);
        }

        throw error;
    }
}

// ==========================================
// RENDERING PRENOTAZIONI STAFF
// ==========================================

async renderStaffBookings(status = 'pending') {
    const container = document.getElementById('staff-bookings-container');
    if (!container) {
        console.warn('⚠️ Container staff-bookings-container non trovato');
        return;
    }

    container.innerHTML = `
        <div class="loading-bookings">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Caricamento prenotazioni ${status === 'all' ? 'tutte' : status}...</span>
        </div>
    `;

    try {
        const bookings = await this.loadStaffBookings(status);

        console.log('📊 Renderizzazione prenotazioni:', {
            status: status,
            totalBookings: bookings.length,
            bookingIds: bookings.map(b => b.id),
            bookingStatuses: [...new Set(bookings.map(b => b.status))]
        });

        if (!Array.isArray(bookings)) {
            console.error('❌ bookings non è un array:', bookings);
            throw new Error('Dati prenotazioni non validi');
        }

        if (bookings.length === 0) {
            container.innerHTML = `
                <div class="no-bookings-staff">
                    <div class="no-bookings-icon">
                        <i class="fas fa-calendar"></i>
                    </div>
                    <h3>Nessuna prenotazione ${this.getStatusLabel(status)}</h3>
                    <p>Non ci sono prenotazioni ${status === 'all' ? 'nel sistema' : `con status "${status}"`}.</p>
                    ${status !== 'all' ? `
                        <button class="dash-btn dash-btn-outline" onclick="window.dashboardManager.filterBookings('all')">
                            Mostra tutte le prenotazioni
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }

        const bookingCards = bookings.map((booking, index) => {
            try {
                return this.renderBookingCard(booking);
            } catch (error) {
                console.error(`❌ Errore rendering card prenotazione ${index}:`, booking, error);
                return `
                    <div class="staff-booking-card booking-status-error">
                        <div class="booking-card-header">
                            <div class="booking-info-main">
                                <h4 class="customer-name">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    Errore caricamento prenotazione #${booking?.id || 'N/A'}
                                </h4>
                                <small>Errore: ${error.message}</small>
                            </div>
                        </div>
                    </div>
                `;
            }
        }).join('');

        container.innerHTML = bookingCards;

        const filterDropdown = document.getElementById('booking-status-filter');
        if (filterDropdown && filterDropdown.value !== status) {
            filterDropdown.value = status;
        }

        console.log('✅ Prenotazioni staff renderizzate:', {
            status: status,
            cardsRendered: bookings.length,
            containerFilled: container.children.length > 0
        });

    } catch (error) {
        console.error('❌ Errore rendering prenotazioni:', error);
        container.innerHTML = `
            <div class="error-bookings-staff">
                <h3>Errore caricamento prenotazioni</h3>
                <p><strong>Dettaglio errore:</strong> ${error.message}</p>
                <div style="margin-top: 1rem;">
                    <button class="dash-btn dash-btn-primary" onclick="window.dashboardManager.renderStaffBookings('${status}')">
                        <i class="fas fa-rotate"></i>
                        Riprova
                    </button>
                    <button class="dash-btn dash-btn-outline" onclick="window.dashboardManager.filterBookings('all')">
                        <i class="fas fa-list"></i>
                        Mostra Tutto
                    </button>
                    <button class="dash-btn dash-btn-secondary" onclick="window.debugDashboard()">
                        <i class="fas fa-bug"></i>
                        Debug
                    </button>
                </div>
            </div>
        `;
    }
}

// ==========================================
// CARD SINGOLA PRENOTAZIONE
// ==========================================

renderBookingCard(booking, isAdminView = false) {
    const statusClass = `booking-status-${booking.status}`;
    const statusIcon = this.getStatusIcon(booking.status);
    const statusLabel = this.getStatusLabel(booking.status);

    return `
        <div class="staff-booking-card ${statusClass}" data-booking-id="${booking.id}" data-view="${isAdminView ? 'admin' : 'staff'}">
            <!-- Header prenotazione migliorato -->
            <div class="booking-card-header">
                <div class="booking-info-main">
                    <h4 class="customer-name">
                        <i class="fas fa-user"></i>
                        ${this.getCustomerDisplayName(booking)}
                        ${isAdminView ? '<span class="admin-indicator">👑 Admin</span>' : ''}
                    </h4>
                    <div class="booking-meta">
                        <span class="booking-time">
                            <i class="fas fa-clock"></i>
                            ${booking.booking_time || booking.time_slot || '18:00'}
                        </span>
                        <span class="booking-players">
                            <i class="fas fa-users"></i>
                            ${booking.party_size || booking.number_of_people} persone
                        </span>
                        <span class="booking-date">
                            <i class="fas fa-calendar"></i>
                            ${this.formatDate(booking.booking_date || booking.date)}
                        </span>
                    </div>
                </div>
                <div class="booking-status-badge">
                    <i class="${statusIcon}"></i>
                    <span>${statusLabel}</span>
                </div>
            </div>

            <!-- Dettagli ordinazione -->
            <div class="booking-order-details">
                ${booking.special_requests ? `
                    <div class="special-requests">
                        <strong><i class="fas fa-comment"></i> Note:</strong>
                        <span>${booking.special_requests}</span>
                    </div>
                ` : ''}

                <div class="booking-additional-info">
                    <div class="booking-code">
                        <strong>ID:</strong>
                        <span class="confirmation-code">#${booking.id}</span>
                    </div>
                    ${booking.total_cost ? `
                        <div class="booking-total">
                            <strong>Totale:</strong> €${parseFloat(booking.total_cost).toFixed(2)}
                        </div>
                    ` : ''}
                    ${isAdminView ? `
                        <div class="booking-admin-info">
                            <strong>Gestito da:</strong> Admin Panel
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Azioni staff -->
            <div class="booking-actions">
                ${this.generateBookingActions(booking, isAdminView)}
            </div>
        </div>
    `;
}


// ==========================================
// AZIONI PRENOTAZIONI
// ==========================================

generateBookingActions(booking, isAdminView = false) {
    const actions = [];
    const viewPrefix = isAdminView ? 'Admin' : 'Staff';

    switch (booking.status) {
        case 'pending':
            actions.push(`
                <button class="action-btn action-btn-confirm"
                        onclick="window.dashboardManager.confirmBooking(${booking.id})"
                        title="${viewPrefix}: Conferma prenotazione">
                    <i class="fas fa-check"></i>
                    Conferma
                </button>
            `);
            actions.push(`
                <button class="action-btn action-btn-reject"
                        onclick="window.dashboardManager.rejectBooking(${booking.id})"
                        title="${viewPrefix}: Rifiuta prenotazione">
                    <i class="fas fa-times"></i>
                    Rifiuta
                </button>
            `);
            break;

        case 'confirmed':
            actions.push(`
                <button class="action-btn action-btn-complete"
                        onclick="window.dashboardManager.markAsCompleted(${booking.id})"
                        title="${viewPrefix}: Marca come completata">
                    <i class="fas fa-flag"></i>
                    Completa
                </button>
            `);
            break;

        default:
            actions.push(`
                <button class="action-btn action-btn-view"
                        onclick="window.dashboardManager.viewBookingDetails(${booking.id})"
                        title="${viewPrefix}: Visualizza dettagli">
                    <i class="fas fa-eye"></i>
                    Dettagli
                </button>
            `);
    }

    // Azione extra per admin
    if (isAdminView && booking.status !== 'cancelled') {
        actions.push(`
            <button class="action-btn action-btn-view"
                    onclick="window.dashboardManager.editBookingAdmin(${booking.id})"
                    title="Admin: Modifica avanzata">
                <i class="fas fa-edit"></i>
                Modifica
            </button>
        `);
    }

    return actions.join('');
}


// ==========================================
// AZIONI API
// ==========================================

async confirmBooking(bookingId) {
    const confirmed = await new Promise(resolve => {
        this.showConfirmationModal({
            title: 'Conferma Prenotazione',
            message: 'Sei sicuro di voler confermare questa prenotazione?',
            icon: 'fas fa-check-circle',
            type: 'success',
            confirmText: 'Conferma',
            cancelText: 'Annulla',
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false)
        });
    });
    if (!confirmed) return;

    try {
        const token = this.getAuthToken();
        const apiUrl =DASHBOARD_CONFIG.API_ENDPOINTS.confirmBooking.replace(':bookingId', bookingId);

        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Errore conferma prenotazione');
        }

        this.showNotification('success', 'Prenotazione confermata!');
        this.refreshBookings();

    } catch (error) {
        console.error('❌ Errore conferma:', error);
        this.showNotification('error', 'Errore conferma prenotazione');
    }
}

async rejectBooking(bookingId) {
    const result = await new Promise(resolve => {
        this.showConfirmationModal({
            title: 'Annulla Prenotazione',
            message: 'Inserisci il motivo dell\'annullamento (opzionale)',
            icon: 'fas fa-times-circle',
            type: 'danger',
            confirmText: 'Annulla Prenotazione',
            cancelText: 'Mantieni',
            showInput: true,
            inputPlaceholder: 'es. Cliente non presentato, problemi tecnici...',
            inputLabel: 'Motivo annullamento:',
            onConfirm: (inputValue) => resolve({ confirmed: true, reason: inputValue || '' }),
            onCancel: () => resolve({ confirmed: false })
        });
    });
    if (!result.confirmed) return;
    const reason = result.reason;

    try {
        const token = this.getAuthToken();
        const apiUrl = DASHBOARD_CONFIG.API_ENDPOINTS.cancelBooking.replace(':bookingId', bookingId);

                const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Errore annullamento prenotazione');
        }

        this.showNotification('success', 'Prenotazione annullata');
        this.refreshBookings();

    } catch (error) {
        console.error('❌ Errore annullamento:', error);
        this.showNotification('error', 'Errore rifiuto prenotazione');
    }
}

async markAsCompleted(bookingId) {
    const confirmed = await new Promise(resolve => {
        this.showConfirmationModal({
            title: 'Completa Prenotazione',
            message: 'Confermi che questa prenotazione è stata completata con successo?',
            icon: 'fas fa-check-double',
            type: 'success',
            confirmText: 'Marca Completata',
            cancelText: 'Annulla',
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false)
        });
    });
    if (!confirmed) return;

    try {
        console.log('✅ Completa prenotazione:', bookingId);

        // TODO: Chiamata API reale

        this.showNotification('success', 'Prenotazione completata!');
        this.refreshBookings();

    } catch (error) {
        console.error('❌ Errore completamento:', error);
        this.showNotification('error', 'Errore completamento prenotazione');
    }
}

// ==========================================
// HELPER METHODS
// ==========================================

getStatusIcon(status) {
    const icons = {
        'pending': 'fas fa-clock',
        'confirmed': 'fas fa-check-circle',
        'completed': 'fas fa-flag',
        'cancelled': 'fas fa-times-circle'
    };
    return icons[status] || 'fas fa-circle-question';
}

getStatusLabel(status) {
    const labels = {
        'pending': 'In attesa',
        'confirmed': 'Confermata',
        'completed': 'Completata',
        'cancelled': 'Annullata',
        'all': ''
    };
    return labels[status] || status;
}

getCustomerDisplayName(booking) {
    if (booking.customer_name) return booking.customer_name;
    if (booking.user_name) return booking.user_name;
    if (booking.name) return booking.name;

    if (booking.first_name || booking.last_name) {
        return `${booking.first_name || ''} ${booking.last_name || ''}`.trim();
    }

    if (booking.email) {
        return booking.email.split('@')[0];
    }

    return `Cliente #${booking.user_id || booking.id}`;
}

// ==========================================
// INTERFACE METHODS
// ==========================================

filterBookings(status) {
    console.log('🔍 Filtraggio per status:', status);
    this.renderStaffBookings(status);
}

refreshBookings() {
    console.log('🔄 Refresh prenotazioni');
    const currentFilter = document.getElementById('booking-status-filter')?.value || 'pending';
    this.renderStaffBookings(currentFilter);
}

generateRecentUsersHTML() {
    // Mock data per ora
    const recentUsers = [
        { name: 'Marco Rossi', email: 'marco@email.com', date: '2 giorni fa' },
        { name: 'Giulia Bianchi', email: 'giulia@email.com', date: '3 giorni fa' },
        { name: 'Alessandro Verdi', email: 'alex@email.com', date: '1 settimana fa' }
    ];

    return `
        <div class="users-list-preview">
            ${recentUsers.map(user => `
                <div class="user-item">
                    <div class="user-avatar">${user.name.split(' ').map(n => n[0]).join('')}</div>
                    <div class="user-info">
                        <strong>${user.name}</strong>
                        <small>${user.email} • ${user.date}</small>
                    </div>
                </div>
            `).join('')}
            <button class="dash-btn dash-btn-outline" onclick="window.dashboardManager.showAllUsers()">
                Vedi tutti gli utenti
            </button>
        </div>
    `;
}

showAllUsers() {
    alert('📋 LISTA UTENTI COMPLETA\n\nQuesta funzione mostrerà:\n• Tutti gli utenti registrati\n• Filtri per ruolo\n• Ricerca per nome/email\n• Statistiche utente\n\n(In fase di sviluppo)');
}

viewBookingDetails(bookingId) {
    alert(`📋 DETTAGLI PRENOTAZIONE #${bookingId}\n\nQuesta funzione mostrerà:\n• Dettagli completi prenotazione\n• Storia modifiche\n• Informazioni cliente\n\n(In fase di sviluppo)`);
}

// ==========================================
// MOCK DATA PER TEST
// ==========================================

getMockBookingsForStaff(status) {
    const allMockBookings = [
        {
            id: 1,
            user_id: 5,
            customer_name: 'Marco Rossi',
            booking_date: '2025-06-20',
            booking_time: '19:00',
            party_size: 4,
            status: 'pending',
            special_requests: 'Tavolo vicino alla finestra',
            total_cost: 45.50
        },
        {
            id: 2,
            user_id: 8,
            customer_name: 'Giulia Bianchi',
            booking_date: '2025-06-20',
            booking_time: '20:30',
            party_size: 2,
            status: 'confirmed',
            special_requests: null,
            total_cost: 28.00
        },
        {
            id: 3,
            user_id: 12,
            customer_name: 'Alessandro Verdi',
            booking_date: '2025-06-21',
            booking_time: '18:00',
            party_size: 6,
            status: 'pending',
            special_requests: 'Compleanno - servono candeline',
            total_cost: 67.50
        }
    ];

    if (status === 'all') {
        return allMockBookings;
    }

    return allMockBookings.filter(booking => booking.status === status);
}


createPreferencesSectionHTML() {
    const preferences = this.dashboardData.preferences || {
        favorite_game_categories: [],
        preferred_drink_types: [],
        dietary_restrictions: [],
        preferred_time_slots: [],
        max_game_complexity: 3,
        notification_preferences: {}
    };

    return `
        <div class="dash-card dash-customer-only" id="preferences">
            <div class="dash-card-header">
                <h2 class="dash-card-title">
                    <i class="fas fa-heart dash-card-icon"></i>
                    Le Tue Preferenze
                </h2>
                <button class="dash-btn dash-btn-primary" onclick="window.dashboardManager.savePreferences()">
                    <i class="fas fa-save"></i>
                    Salva Modifiche
                </button>
            </div>

            <div class="dash-preferences-container">
                <!-- Categorie Giochi -->
                <div class="dash-preference-section">
                    <h3><i class="fas fa-gamepad"></i> Categorie Giochi Preferite</h3>
                    <div class="dash-checkbox-group" id="game-categories">
                        <!-- Caricato dinamicamente -->
                        <div class="dash-loading-preferences">
                            <i class="fas fa-spinner fa-spin"></i>
                            Caricamento categorie...
                        </div>
                    </div>
                </div>

                <!-- Complessità Giochi -->
                <div class="dash-preference-section">
                    <h3><i class="fas fa-brain"></i> Complessità Massima Giochi</h3>
                    <div class="dash-complexity-slider">
                        <label class="dash-form-label">Livello: <span id="complexity-value">${preferences.max_game_complexity || 3}</span>/5</label>
                        <input type="range"
                               id="max-game-complexity"
                               min="1"
                               max="5"
                               value="${preferences.max_game_complexity || 3}"
                               class="dash-slider"
                               oninput="document.getElementById('complexity-value').textContent = this.value">
                        <div class="dash-complexity-labels">
                            <span>Semplice</span>
                            <span>Medio</span>
                            <span>Avanzato</span>
                            <span>Esperto</span>
                            <span>Estremo</span>
                        </div>
                    </div>
                </div>

                <!-- Tipi Bevande -->
                <div class="dash-preference-section">
                    <h3><i class="fas fa-glass-cheers"></i> Bevande Preferite</h3>
                    <div class="dash-checkbox-group" id="drink-types">
                        <!-- Caricato dinamicamente -->
                        <div class="dash-loading-preferences">
                            <i class="fas fa-spinner fa-spin"></i>
                            Caricamento bevande...
                        </div>
                    </div>
                </div>

                <!-- Restrizioni Dietetiche -->
                <div class="dash-preference-section">
                    <h3><i class="fas fa-utensils"></i> Restrizioni Dietetiche</h3>
                    <div class="dash-checkbox-group" id="dietary-restrictions">
                        ${this.createDietaryRestrictionsHTML(preferences.dietary_restrictions)}
                    </div>
                </div>

                <!-- Fasce Orarie Preferite -->
                <div class="dash-preference-section">
                    <h3><i class="fas fa-clock"></i> Fasce Orarie Preferite</h3>
                    <div class="dash-checkbox-group" id="time-slots">
                        ${this.createTimeSlotPreferencesHTML(preferences.preferred_time_slots)}
                    </div>
                </div>

                <!-- Notifiche -->
                <div class="dash-preference-section">
                    <h3><i class="fas fa-bell"></i> Preferenze Notifiche</h3>
                    <div class="dash-notification-preferences">
                        <label class="dash-checkbox-label">
                            <input type="checkbox"
                                   id="notify-email-booking"
                                   ${preferences.notification_preferences?.email_booking ? 'checked' : ''}>
                            <span>Email per conferme prenotazioni</span>
                        </label>
                        <label class="dash-checkbox-label">
                            <input type="checkbox"
                                   id="notify-email-reminder"
                                   ${preferences.notification_preferences?.email_reminder ? 'checked' : ''}>
                            <span>Promemoria email (24h prima)</span>
                        </label>
                        <label class="dash-checkbox-label">
                            <input type="checkbox"
                                   id="notify-email-promotions"
                                   ${preferences.notification_preferences?.email_promotions ? 'checked' : ''}>
                            <span>Offerte speciali e promozioni</span>
                        </label>
                        <label class="dash-checkbox-label">
                            <input type="checkbox"
                                   id="notify-new-games"
                                   ${preferences.notification_preferences?.new_games ? 'checked' : ''}>
                            <span>Notifiche per nuovi giochi</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==========================================
// 3. NUOVI METODI HELPER PER PREFERENZE
// ==========================================

createDietaryRestrictionsHTML(selectedRestrictions = []) {
    const dietaryOptions = [
        { value: 'vegetariano', label: 'Vegetariano', icon: 'fas fa-leaf' },
        { value: 'vegano', label: 'Vegano', icon: 'fas fa-seedling' },
        { value: 'senza_glutine', label: 'Senza Glutine', icon: 'fas fa-wheat' },
        { value: 'senza_lattosio', label: 'Senza Lattosio', icon: 'fas fa-cow' },
        { value: 'senza_noci', label: 'Senza Frutta Secca', icon: 'fas fa-allergies' },
        { value: 'keto', label: 'Chetogenica', icon: 'fas fa-fish' },
        { value: 'halal', label: 'Halal', icon: 'fas fa-moon' },
        { value: 'kosher', label: 'Kosher', icon: 'fas fa-star-of-david' }
    ];

    return dietaryOptions.map(option => `
        <label class="dash-checkbox-label">
            <input type="checkbox"
                   name="dietary-restrictions"
                   value="${option.value}"
                   ${selectedRestrictions.includes(option.value) ? 'checked' : ''}>
            <span><i class="${option.icon}"></i> ${option.label}</span>
        </label>
    `).join('');
}

createTimeSlotPreferencesHTML(selectedSlots = []) {
    const timeSlots = [
        { value: 'mattina', label: 'Mattina (9:00-12:00)', icon: 'fas fa-sun' },
        { value: 'pranzo', label: 'Pranzo (12:00-14:00)', icon: 'fas fa-utensils' },
        { value: 'pomeriggio', label: 'Pomeriggio (14:00-18:00)', icon: 'fas fa-coffee' },
        { value: 'serale', label: 'Serale (18:00-22:00)', icon: 'fas fa-moon' },
        { value: 'notturno', label: 'Tarda Sera (22:00-24:00)', icon: 'fas fa-star' }
    ];

    return timeSlots.map(slot => `
        <label class="dash-checkbox-label">
            <input type="checkbox"
                   name="time-slots"
                   value="${slot.value}"
                   ${selectedSlots.includes(slot.value) ? 'checked' : ''}>
            <span><i class="${slot.icon}"></i> ${slot.label}</span>
        </label>
    `).join('');
}

// ==========================================
// 4. CARICAMENTO DINAMICO OPZIONI DA DATABASE
// ==========================================

async loadGameCategories() {
    console.log('📦 Caricamento categorie giochi statiche...');

    return [
        { value: 'Strategia', label: 'Strategia', icon: 'fas fa-chess', description: 'Giochi di strategia complessi' },
        { value: 'Famiglia', label: 'Famiglia', icon: 'fas fa-users', description: 'Giochi adatti a tutti' },
        { value: 'Party', label: 'Party', icon: 'fas fa-party-horn', description: 'Giochi per gruppi numerosi' },
        { value: 'Cooperativo', label: 'Cooperativo', icon: 'fas fa-handshake', description: 'Giochi di squadra' },
        { value: 'Gestionale', label: 'Gestionale', icon: 'fas fa-city', description: 'Giochi di costruzione e gestione' },
        { value: 'Avventura', label: 'Avventura', icon: 'fas fa-map', description: 'Esplorazione e narrativa' },
        { value: 'Card Game', label: 'Carte', icon: 'fas fa-cards', description: 'Giochi di carte' },
        { value: 'Dadi', label: 'Dadi', icon: 'fas fa-dice', description: 'Giochi basati sui dadi' }
    ];
}

async loadDrinkTypes() {
    console.log('🥤 Caricamento tipi bevande statiche...');

    return [
        { value: 'analcolici', label: 'Analcolici', icon: 'fas fa-glass-water', description: 'Succhi, bibite, acqua' },
        { value: 'caffe', label: 'Caffè', icon: 'fas fa-mug-hot', description: 'Espresso, cappuccino, americano' },
        { value: 'te', label: 'Tè e Tisane', icon: 'fas fa-leaf', description: 'Tè caldi e freddi, tisane' },
        { value: 'birra', label: 'Birra', icon: 'fas fa-beer', description: 'Birre artigianali e commerciali' },
        { value: 'vino', label: 'Vino', icon: 'fas fa-wine-glass', description: 'Vini rossi, bianchi, rosati' },
        { value: 'cocktail', label: 'Cocktail', icon: 'fas fa-cocktail', description: 'Cocktail alcolici e analcolici' },
        { value: 'spirits', label: 'Distillati', icon: 'fas fa-whiskey-glass', description: 'Whiskey, rum, gin, vodka' },
        { value: 'dolci', label: 'Bevande Dolci', icon: 'fas fa-ice-cream', description: 'Frappè, milkshake, cioccolate' }
    ];
}

// ==========================================
// 5. POPOLAMENTO DINAMICO INTERFACCIA
// ==========================================

async populateGameCategories() {
    const container = document.getElementById('game-categories');
    if (!container) {
        console.warn('⚠️ Container game-categories non trovato');
        return;
    }

    try {
        console.log('🎮 Popolamento categorie giochi...');

        const categories = await this.loadGameCategories();

        let userPreferences = [];
        if (this.dashboardData && this.dashboardData.preferences) {
            userPreferences = this.dashboardData.preferences.favorite_game_categories || [];
        }

        if (typeof userPreferences === 'string') {
            try {
                userPreferences = JSON.parse(userPreferences);
            } catch (e) {
                console.warn('⚠️ Errore parsing preferenze giochi:', e);
                userPreferences = [];
            }
        }

        if (!Array.isArray(userPreferences)) {
            userPreferences = [];
        }

        console.log('🎯 Preferenze giochi utente:', userPreferences);

        const html = categories.map(category => {
            const isChecked = userPreferences.includes(category.value);

            return `
                <label class="dash-checkbox-label dash-category-option">
                    <input type="checkbox"
                           name="game-categories"
                           value="${category.value}"
                           ${isChecked ? 'checked' : ''}>
                    <span class="dash-category-content">
                        <i class="${category.icon}"></i>
                        <div class="dash-category-info">
                            <strong>${category.label}</strong>
                            <small>${category.description}</small>
                        </div>
                    </span>
                </label>
            `;
        }).join('');

        container.innerHTML = html;
        console.log('✅ Categorie giochi popolate con successo');

    } catch (error) {
        console.error('❌ Errore popolamento categorie giochi:', error);
        container.innerHTML = `
            <div class="dash-error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Errore caricamento categorie</span>
            </div>
        `;
    }
}



async populateDrinkTypes() {
    const container = document.getElementById('drink-types');
    if (!container) {
        console.warn('⚠️ Container drink-types non trovato');
        return;
    }

    try {
        console.log('🥤 Popolamento tipi bevande...');

        const drinkTypes = await this.loadDrinkTypes();

        let userPreferences = [];
        if (this.dashboardData && this.dashboardData.preferences) {
            userPreferences = this.dashboardData.preferences.preferred_drink_types || [];
        }

        if (typeof userPreferences === 'string') {
            try {
                userPreferences = JSON.parse(userPreferences);
            } catch (e) {
                console.warn('⚠️ Errore parsing preferenze bevande:', e);
                userPreferences = [];
            }
        }

        if (!Array.isArray(userPreferences)) {
            userPreferences = [];
        }

        console.log('🍹 Preferenze bevande utente:', userPreferences);

        const html = drinkTypes.map(drink => {
            const isChecked = userPreferences.includes(drink.value);

            return `
                <label class="dash-checkbox-label dash-category-option">
                    <input type="checkbox"
                           name="drink-types"
                           value="${drink.value}"
                           ${isChecked ? 'checked' : ''}>
                    <span class="dash-category-content">
                        <i class="${drink.icon}"></i>
                        <div class="dash-category-info">
                            <strong>${drink.label}</strong>
                            <small>${drink.description}</small>
                        </div>
                    </span>
                </label>
            `;
        }).join('');

        container.innerHTML = html;
        console.log('✅ Tipi bevande popolate con successo');

    } catch (error) {
        console.error('❌ Errore popolamento tipi bevande:', error);
        container.innerHTML = `
            <div class="dash-error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Errore caricamento bevande</span>
            </div>
        `;
    }
}

// ==========================================
// 6. SALVATAGGIO PREFERENZE DINAMICO
// ==========================================

async savePreferences() {
    console.log('❤️ Salvataggio preferenze dinamiche...');

    try {
        const confirmed = await new Promise(resolve => {
            this.showConfirmationModal({
                title: 'Salva Preferenze',
                message: 'Vuoi salvare le modifiche alle tue preferenze? Questo aggiornerà il tuo profilo utente.',
                icon: 'fas fa-heart',
                type: 'info',
                confirmText: 'Salva Preferenze',
                cancelText: 'Annulla',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
        if (!confirmed) return;
    } catch (modalError) {
        console.error('❌ Errore modal di conferma:', modalError);
        this.showNotification('error', 'Errore nell\'apertura del modal di conferma');
        return;
    }

    try {
        // Controllo di sicurezza che i form element esistano
        const gameCategories = document.querySelectorAll('input[name="game-categories"]:checked');
        const drinkTypes = document.querySelectorAll('input[name="drink-types"]:checked');
        const dietaryRestrictions = document.querySelectorAll('input[name="dietary-restrictions"]:checked');
        const timeSlots = document.querySelectorAll('input[name="time-slots"]:checked');
        
        console.log('📋 Elementi trovati:', {
            gameCategories: gameCategories.length,
            drinkTypes: drinkTypes.length,
            dietaryRestrictions: dietaryRestrictions.length,
            timeSlots: timeSlots.length
        });

        const preferences = {
            favorite_game_categories: Array.from(gameCategories).map(input => input.value),
            preferred_drink_types: Array.from(drinkTypes).map(input => input.value),
            dietary_restrictions: Array.from(dietaryRestrictions).map(input => input.value),
            preferred_time_slots: Array.from(timeSlots).map(input => input.value),

            // Complessità massima giochi con controllo di esistenza
            max_game_complexity: (() => {
                const complexityElement = document.getElementById('max-game-complexity');
                if (complexityElement) {
                    const value = parseInt(complexityElement.value);
                    return !isNaN(value) && value >= 1 && value <= 5 ? value : 3;
                }
                return 3;
            })(),

            // Preferenze notifiche con controlli di sicurezza
            notification_preferences: {
                email_booking: document.getElementById('notify-email-booking')?.checked || false,
                email_reminder: document.getElementById('notify-email-reminder')?.checked || false,
                email_promotions: document.getElementById('notify-email-promotions')?.checked || false,
                new_games: document.getElementById('notify-new-games')?.checked || false
            }
        };

        console.log('📊 Preferenze raccolte:', preferences);

        // Controlli di sicurezza per autenticazione
        const userInfo = this.getCurrentUserInfo();
        if (!userInfo || !userInfo.userId) {
            throw new Error('Informazioni utente non disponibili. Effettua nuovamente il login.');
        }

        const token = this.getAuthToken();
        if (!token) {
            throw new Error('Token di autenticazione mancante. Effettua nuovamente il login.');
        }

        console.log('🔐 Dati autenticazione validi:', {
            userId: userInfo.userId,
            hasToken: !!token
        });

        // Chiama API per salvare
        const apiUrl = `/api/users/${userInfo.userId}/preferences`;
        console.log('🌐 Chiamata API:', apiUrl);

        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preferences)
        });

        console.log('📡 Risposta server - Status:', response.status, response.statusText);

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Risposta server positiva:', result);

            // Aggiorna i dati locali
            if (this.dashboardData) {
                this.dashboardData.preferences = result.preferences || preferences;
            }

            this.showNotification('success', 'Preferenze salvate con successo! 🎉');
            console.log('✅ Preferenze salvate nel database');
        } else {
            // Gestione dettagliata degli errori HTTP
            let errorMessage = 'Errore salvataggio preferenze';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (parseError) {
                console.warn('⚠️ Impossibile parsare errore server:', parseError);
                errorMessage = `Errore HTTP ${response.status}: ${response.statusText}`;
            }
            
            console.error('❌ Errore server:', {
                status: response.status,
                statusText: response.statusText,
                message: errorMessage
            });

            throw new Error(errorMessage);
        }

    } catch (error) {
        console.error('❌ Errore completo salvataggio preferenze:', error);
        
        // Messaggio di errore user-friendly
        let userMessage = 'Errore salvataggio preferenze';
        if (error.message) {
            userMessage += `: ${error.message}`;
        }
        
        this.showNotification('error', userMessage);
        
        // Se è un errore di autenticazione, suggerisci il re-login
        if (error.message && error.message.includes('autenticazione')) {
            setTimeout(() => {
                this.showNotification('warning', 'Effettua nuovamente il login per continuare');
            }, 3000);
        }
    }
}



    createBookingsSectionHTML() {
        const bookings = this.dashboardData.recentBookings || [];

        return `
            <div class="dash-card dash-customer-only compact-bookings-section" id="bookings">
                <div class="dash-card-header">
                    <h2 class="dash-card-title">
                        <i class="fas fa-calendar dash-card-icon"></i>
                        Le Tue Prenotazioni Recenti
                    </h2>
                    <div class="bookings-header-actions">
                        <button class="dash-btn dash-btn-outline dash-btn-sm" onclick="window.SimpleAuth?.showBookings()">
                            <i class="fas fa-list"></i> Vedi Tutto
                        </button>
                        <button class="dash-btn dash-btn-primary dash-btn-sm" onclick="window.showPage('prenotazioni')">
                            <i class="fas fa-plus"></i> Nuova
                        </button>
                    </div>
                </div>
                <div class="compact-bookings-container">
                    ${bookings.length > 0 ? bookings.slice(0, 3).map(booking => `
                        <div class="compact-booking-card">
                            <div class="booking-date-info">
                                <div class="booking-day">${new Date(booking.booking_date).getDate()}</div>
                                <div class="booking-month">${new Date(booking.booking_date).toLocaleDateString('it-IT', {month: 'short'})}</div>
                            </div>
                            <div class="booking-details">
                                <div class="booking-title">
                                    <i class="fas fa-clock"></i>
                                    ${booking.booking_time} • ${booking.party_size} persone
                                </div>
                                <div class="booking-status">
                                    <span class="compact-status-badge status-${booking.status}">
                                        ${this.getStatusIcon(booking.status)} ${this.getStatusLabel(booking.status)}
                                    </span>
                                </div>
                            </div>
                            <div class="booking-actions">
                                <button class="compact-action-btn" title="Dettagli" onclick="alert('Dettagli prenotazione: ${booking.id}')">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="no-bookings-message">
                            <i class="fas fa-calendar-plus"></i>
                            <h3>Nessuna prenotazione attiva</h3>
                            <p>Inizia prenotando il tuo primo tavolo!</p>
                            <button class="dash-btn dash-btn-primary" onclick="window.showPage('prenotazioni')">
                                <i class="fas fa-plus"></i> Prenota Ora
                            </button>
                        </div>
                    `}
                </div>
            </div>
        `;
    }


createAdminSectionsHTML() {
    return `
        <!-- Dashboard Sistema Admin con Inventario -->
        <div class="dash-card dash-admin-section" id="system-dashboard">
            <div class="dash-card-header">
                <h2 class="dash-card-title">
                    <i class="fas fa-chart-simple dash-card-icon"></i>
                    Dashboard Sistema & Inventario
                </h2>
                <div class="admin-dashboard-controls">
                    <select id="inventory-period" onchange="window.dashboardManager.refreshInventoryData(this.value)">
                        <option value="7">Ultimi 7 giorni</option>
                        <option value="30">Ultimi 30 giorni</option>
                        <option value="90">Ultimi 90 giorni</option>
                    </select>
                    <button class="dash-btn dash-btn-primary" onclick="window.dashboardManager.refreshInventoryData()">
                        <i class="fas fa-rotate"></i>
                        Aggiorna Dati
                    </button>
                </div>
            </div>

            <!-- Container inventario sistema -->
            <div id="admin-system-inventory" class="admin-system-inventory">
                <div class="loading-inventory">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Caricamento inventario sistema...</span>
                </div>
            </div>
        </div>

        <!-- Gestione Prenotazioni Admin (come staff) -->
        <div class="dash-card dash-admin-section" id="manage-bookings">
            <div class="dash-card-header">
                <h2 class="dash-card-title">
                    <i class="fas fa-clipboard dash-card-icon"></i>
                    Gestione Prenotazioni (Admin)
                </h2>
                <div class="staff-section-controls">
                    <select id="admin-booking-status-filter" onchange="window.dashboardManager.filterAdminBookings(this.value)">
                        <option value="all">Tutte le prenotazioni</option>
                        <option value="pending">In attesa di conferma</option>
                        <option value="confirmed">Confermate</option>
                        <option value="completed">Completate</option>
                        <option value="cancelled">Annullate</option>
                    </select>
                    <button class="dash-btn dash-btn-secondary" onclick="window.dashboardManager.refreshBookings()">
                        <i class="fas fa-rotate"></i>
                        Aggiorna
                    </button>
                    <button class="dash-btn dash-btn-primary" onclick="window.dashboardManager.exportBookingsData()">
                        <i class="fas fa-download"></i>
                        Esporta Dati
                    </button>
                </div>
            </div>

            <!-- Container prenotazioni admin -->
            <div id="admin-bookings-container" class="staff-bookings-container">
                <div class="loading-bookings">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Caricamento prenotazioni admin...</span>
                </div>
            </div>
        </div>

        <!-- Gestione Utenti Admin -->
        <div class="dash-card dash-admin-section" id="manage-users">
            <div class="dash-card-header">
                <h2 class="dash-card-title">
                    <i class="fas fa-user-plus dash-card-icon"></i>
                    Gestisci Utenti Sistema
                </h2>
                <div class="admin-user-controls">
                    <button class="dash-btn dash-btn-primary" onclick="window.dashboardManager.showAllUsers()">
                        <i class="fas fa-users"></i>
                        Vedi Tutti gli Utenti
                    </button>
                    <button class="dash-btn dash-btn-outline" onclick="window.dashboardManager.createNewUser()">
                        <i class="fas fa-user-plus"></i>
                        Nuovo Utente
                    </button>
                </div>
            </div>
            <div id="admin-users-preview">
                ${this.generateRecentUsersHTML()}
            </div>
        </div>
    `;
}



    // ==========================================
// VERSIONE SOLO DATI REALI
// ==========================================

async loadSystemInventory(period = 7) {
    console.log('📊 Caricamento inventario sistema REALE, period:', period);

    try {
        const token = this.getAuthToken();
        const apiUrl = DASHBOARD_CONFIG.API_ENDPOINTS.systemInventory;

        const params = new URLSearchParams();
        params.append('type', 'inventory');
        params.append('period', period.toString());

        const finalUrl = `${apiUrl}?${params.toString()}`;

        console.log('🌐 Chiamata API inventario (SOLO DATI REALI):', finalUrl);

        const response = await fetch(finalUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Errore HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Inventario sistema REALE caricato:', result);

        if (result.success && result.data) {
            return result.data;
        } else if (result.data) {
            return result.data;
        } else {
            throw new Error('Formato risposta API non valido - dati mancanti');
        }

    } catch (error) {
        console.error('❌ Errore caricamento inventario REALE:', error);
        throw new Error(`Impossibile caricare inventario dal database: ${error.message}`);
    }
}


// ==========================================
// RENDERING CON GESTIONE ERRORI
// ==========================================

async renderSystemInventory(period = 7) {
    const container = document.getElementById('admin-system-inventory');
    if (!container) {
        console.warn('⚠️ Container admin-system-inventory non trovato');
        return;
    }

    container.innerHTML = `
        <div class="loading-inventory">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Caricamento inventario dal database (${period} giorni)...</span>
        </div>
    `;

    try {
        const inventoryData = await this.loadSystemInventory(period);

        console.log('📊 Rendering inventario REALE:', inventoryData);

        if (!inventoryData || !inventoryData.games || !inventoryData.drinks || !inventoryData.snacks) {
            throw new Error('Dati inventario incompleti dal database');
        }

        const inventoryHTML = this.createInventoryHTML(inventoryData);
        container.innerHTML = inventoryHTML;

        console.log('✅ Inventario REALE renderizzato dal database');

    } catch (error) {
        console.error('❌ Errore rendering inventario REALE:', error);

        container.innerHTML = `
            <div class="error-inventory">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Errore Caricamento Inventario</h3>
                <p><strong>Impossibile caricare dati dal database:</strong></p>
                <p class="error-details">${error.message}</p>

                <div class="error-actions">
                    <button class="dash-btn dash-btn-primary" onclick="window.dashboardManager.renderSystemInventory(${period})">
                        <i class="fas fa-rotate"></i>
                        Riprova dal Database
                    </button>
                    <button class="dash-btn dash-btn-outline" onclick="window.dashboardManager.checkAPIStatus()">
                        <i class="fas fa-heartbeat"></i>
                        Verifica API
                    </button>
                </div>
            </div>
        `;
    }
}


// ==========================================
// METODO PER VERIFICARE STATO API
// ==========================================

checkAPIStatus() {
    console.log('🔍 Verifica stato API...');

    try {
        const token = this.getAuthToken();

        fetch('/api/admin/analytics', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }).then(response => {
            if (response.ok) {
                this.showNotification('success', '✅ API funzionante - Database connesso');
                console.log('✅ API Status: OK');
            } else {
                this.showNotification('error', `❌ API Error: ${response.status} ${response.statusText}`);
                console.error('❌ API Status:', response.status, response.statusText);
            }
        });

    } catch (error) {
        this.showNotification('error', `❌ Errore connessione: ${error.message}`);
        console.error('❌ API Connection Error:', error);
    }
}

// ==========================================
// VALIDAZIONE DATI RICEVUTI DAL DATABASE
// ==========================================

validateInventoryData(data) {
    console.log('🔍 Validazione dati inventario dal database...');

    // Verifica struttura games
    if (!data.games || typeof data.games.totalGames !== 'number') {
        throw new Error('Dati games mancanti o non validi nel database');
    }

    // Verifica struttura drinks
    if (!data.drinks || typeof data.drinks.total_drinks !== 'number') {
        throw new Error('Dati drinks mancanti o non validi nel database');
    }

    // Verifica struttura snacks
    if (!data.snacks || typeof data.snacks.total_snacks !== 'number') {
        throw new Error('Dati snacks mancanti o non validi nel database');
    }

    console.log('✅ Dati inventario validati correttamente');
    return true;
}

// ==========================================
// CREAZIONE HTML CON DATI REALI VALIDATI
// ==========================================

createInventoryHTML(data) {
    const { games, drinks, snacks } = data;

    return `
        <div class="inventory-dashboard" data-source="database">
            <div class="data-source-badge">
                <i class="fas fa-database"></i>
                <span>Dati in tempo reale dal database</span>
                <small>Ultimo aggiornamento: ${new Date().toLocaleString('it-IT')}</small>
            </div>

            <!-- Sezione Giochi -->
            <div class="inventory-section games-section">
                <div class="inventory-section-header">
                    <h3>
                        <i class="fas fa-dice inventory-icon games-icon"></i>
                        Inventario Giochi
                    </h3>
                    <span class="inventory-total">${games.totalGames} totali</span>
                </div>
                <div class="inventory-stats-grid">
                    <div class="inventory-stat-card">
                        <div class="stat-value">${games.totalGames}</div>
                        <div class="stat-label">Giochi Totali</div>
                    </div>
                    <div class="inventory-stat-card">
                        <div class="stat-value">${games.totalCategories}</div>
                        <div class="stat-label">Categorie</div>
                    </div>
                    <div class="inventory-stat-card">
                        <div class="stat-value">${Number(games.avgDifficulty).toFixed(1)}</div>
                        <div class="stat-label">Difficoltà Media</div>
                    </div>
                    <div class="inventory-stat-card highlight">
                        <div class="stat-value">€${Number(games.avgRentalPrice).toFixed(2)}</div>
                        <div class="stat-label">Prezzo Medio</div>
                    </div>
                </div>
            </div>

            <!-- Sezione Bevande -->
            <div class="inventory-section drinks-section">
                <div class="inventory-section-header">
                    <h3>
                        <i class="fas fa-glass-cheers inventory-icon drinks-icon"></i>
                        Inventario Bevande
                    </h3>
                    <span class="inventory-total">${drinks.total_drinks} totali</span>
                </div>
                <div class="inventory-stats-grid">
                    <div class="inventory-stat-card">
                        <div class="stat-value">${drinks.total_drinks}</div>
                        <div class="stat-label">Bevande Totali</div>
                    </div>
                    <div class="inventory-stat-card">
                        <div class="stat-value">${drinks.alcoholic_drinks}</div>
                        <div class="stat-label">Alcoliche</div>
                    </div>
                    <div class="inventory-stat-card">
                        <div class="stat-value">${drinks.non_alcoholic_drinks}</div>
                        <div class="stat-label">Analcoliche</div>
                    </div>
                    <div class="inventory-stat-card">
                        <div class="stat-value">${drinks.total_spirits}</div>
                        <div class="stat-label">Distillati</div>
                    </div>
                    <div class="inventory-stat-card highlight">
                        <div class="stat-value">€${Number(drinks.avg_price).toFixed(2)}</div>
                        <div class="stat-label">Prezzo Medio</div>
                    </div>
                </div>
            </div>

            <!-- Sezione Snack -->
            <div class="inventory-section snacks-section">
                <div class="inventory-section-header">
                    <h3>
                        <i class="fas fa-cookie-bite inventory-icon snacks-icon"></i>
                        Inventario Snack
                    </h3>
                    <span class="inventory-total">${snacks.total_snacks} totali</span>
                </div>
                <div class="inventory-stats-grid">
                    <div class="inventory-stat-card">
                        <div class="stat-value">${snacks.total_snacks}</div>
                        <div class="stat-label">Snack Totali</div>
                    </div>
                    <div class="inventory-stat-card">
                        <div class="stat-value">${snacks.sweet_snacks}</div>
                        <div class="stat-label">Dolci</div>
                    </div>
                    <div class="inventory-stat-card">
                        <div class="stat-value">${snacks.savory_snacks}</div>
                        <div class="stat-label">Salati</div>
                    </div>
                    <div class="inventory-stat-card highlight">
                        <div class="stat-value">€${Number(snacks.avg_price).toFixed(2)}</div>
                        <div class="stat-label">Prezzo Medio</div>
                    </div>
                </div>
            </div>

            <!-- Riepilogo -->
            <div class="inventory-summary">
                <div class="summary-card">
                    <h4>📊 Riepilogo Inventario Database</h4>
                    <div class="summary-stats">
                        <div class="summary-item">
                            <span class="summary-label">Totale Prodotti:</span>
                            <span class="summary-value">${games.totalGames + drinks.total_drinks + snacks.total_snacks}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Periodo Analisi:</span>
                            <span class="summary-value">${data.period} giorni</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Fonte Dati:</span>
                            <span class="summary-value">Database Live</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Status:</span>
                            <span class="summary-value">🟢 Online</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async renderAdminBookings(status = 'pending') {
    const container = document.getElementById('admin-bookings-container');
    if (!container) {
        console.warn('⚠️ Container admin-bookings-container non trovato');
        return;
    }

    container.innerHTML = `
        <div class="loading-bookings">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Caricamento prenotazioni admin ${status === 'all' ? 'tutte' : status}...</span>
        </div>
    `;

    try {
        const bookings = await this.loadStaffBookings(status);

        if (bookings.length === 0) {
            container.innerHTML = `
                <div class="no-bookings-staff">
                    <div class="no-bookings-icon">
                        <i class="fas fa-calendar"></i>
                    </div>
                    <h3>Nessuna prenotazione ${this.getStatusLabel(status)} (Pannello Admin)</h3>
                    <p>Non ci sono prenotazioni ${status === 'all' ? 'nel sistema' : `con status "${status}"`}.</p>
                    ${status !== 'all' ? `
                        <button class="dash-btn dash-btn-outline" onclick="window.dashboardManager.filterAdminBookings('all')">
                            Mostra tutte le prenotazioni
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }

        const bookingCards = bookings.map((booking, index) => {
            try {
                return this.renderBookingCard(booking, true);
            } catch (error) {
                console.error(`❌ Errore rendering card prenotazione admin ${index}:`, booking, error);
                return `
                    <div class="staff-booking-card booking-status-error">
                        <div class="booking-card-header">
                            <div class="booking-info-main">
                                <h4 class="customer-name">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    Errore caricamento prenotazione #${booking?.id || 'N/A'} (Admin)
                                </h4>
                            </div>
                        </div>
                    </div>
                `;
            }
        }).join('');

        container.innerHTML = bookingCards;

        const filterDropdown = document.getElementById('admin-booking-status-filter');
        if (filterDropdown && filterDropdown.value !== status) {
            filterDropdown.value = status;
        }

        console.log('✅ Prenotazioni admin renderizzate:', bookings.length);

    } catch (error) {
        console.error('❌ Errore rendering prenotazioni admin:', error);
        container.innerHTML = `
            <div class="error-bookings-staff">
                <h3>Errore caricamento prenotazioni (Pannello Admin)</h3>
                <p><strong>Dettaglio errore:</strong> ${error.message}</p>
                <div style="margin-top: 1rem;">
                    <button class="dash-btn dash-btn-primary" onclick="window.dashboardManager.renderAdminBookings('${status}')">
                        <i class="fas fa-rotate"></i>
                        Riprova
                    </button>
                    <button class="dash-btn dash-btn-outline" onclick="window.dashboardManager.filterAdminBookings('all')">
                        <i class="fas fa-list"></i>
                        Mostra Tutto
                    </button>
                </div>
            </div>
        `;
    }
}

editBookingAdmin(bookingId) {
    console.log('✏️ Modifica avanzata prenotazione admin:', bookingId);

    alert(`🔧 MODIFICA AVANZATA ADMIN\n\nPrenotazione #${bookingId}\n\nFunzionalità amministratore:\n• Modifica date/orari\n• Cambio cliente\n• Note interne\n• Log modifiche\n• Rimborsi\n\n(In fase di sviluppo)`);
}

// Metodi di notifica rimossi - ora usa window.CustomNotifications
// Le notifiche sono gestite dal metodo showNotification() nelle utility methods


// Metodi interfaccia admin
refreshInventoryData(period) {
    const selectedPeriod = period || document.getElementById('inventory-period')?.value || 7;
    console.log('🔄 Refresh inventario, period:', selectedPeriod);
    this.renderSystemInventory(parseInt(selectedPeriod));
}

filterAdminBookings(status) {
    console.log('🔍 Admin - Filtraggio per status:', status);
    this.renderAdminBookings(status);
}

exportBookingsData() {
    console.log('📥 Export dati prenotazioni admin...');
    alert('📊 EXPORT PRENOTAZIONI\n\nQuesta funzione permetterà di:\n• Esportare tutte le prenotazioni in CSV/Excel\n• Filtrare per periodo e status\n• Includere statistiche di riepilogo\n\n(In fase di sviluppo)');
}

createNewUser() {
    console.log('👤 Creazione nuovo utente admin...');
    alert('➕ NUOVO UTENTE\n\nQuesta funzione permetterà di:\n• Creare nuovi utenti staff/customer\n• Assegnare ruoli e permessi\n• Inviare credenziali via email\n\n(In fase di sviluppo)');
}



    // ==========================================
    // METODI DI INTERAZIONE
    // ==========================================

    // Funzione per lo scroll automatico alle sezioni
    scrollToSection(sectionId) {
        console.log(`📄 Scroll alla sezione: ${sectionId}`);

        // Prevent default link behavior
        event?.preventDefault();

        // Aggiorna sidebar attiva con animazione fluida
        document.querySelectorAll('.dash-sidebar-nav a').forEach(link => {
            link.classList.remove('active');
        });

        // Trova il link corrispondente e marcalo come attivo
        const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Scroll alla sezione con animazione personalizzata fluida
        let targetElement = null;
        let targetPosition = 0;

        if (sectionId === 'dashboard') {
            // Per dashboard, scroll all'inizio della pagina
            targetPosition = 0;
        } else {
            // Trova l'elemento target
            targetElement = document.getElementById(sectionId);
            
            if (targetElement) {
                // Calcola la posizione target con offset fluido
                const rect = targetElement.getBoundingClientRect();
                const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                const navbarHeight = 80; // Altezza navbar
                const extraPadding = 20; // Padding extra per miglior visibilità
                
                targetPosition = currentScroll + rect.top - navbarHeight - extraPadding;
            } else {
                console.warn(`⚠️ Sezione ${sectionId} non trovata`);
                return;
            }
        }

        // Scroll fluido personalizzato
        this.smoothScrollTo(targetPosition, 800); // 800ms di durata
    }

    smoothScrollTo(targetPosition, duration = 600) {
        const startPosition = window.pageYOffset || document.documentElement.scrollTop;
        const distance = targetPosition - startPosition;
        let startTime = null;

        // Easing function per movimento più naturale
        const easeInOutCubic = (t) => {
            return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
        };

        const animate = (currentTime) => {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);

            const easedProgress = easeInOutCubic(progress);
            const currentPosition = startPosition + (distance * easedProgress);

            window.scrollTo(0, currentPosition);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    async saveProfile() {
        console.log('💾 Salvataggio profilo...');

        const profileData = {
            first_name: document.getElementById('profile-firstname')?.value,
            last_name: document.getElementById('profile-lastname')?.value,
            email: document.getElementById('profile-email')?.value,
            phone: document.getElementById('profile-phone')?.value
        };

        try {
            const userInfo = this.getCurrentUserInfo();
            const token = this.getAuthToken();
            const apiUrl = DASHBOARD_CONFIG.API_ENDPOINTS.updateProfile.replace(':userId', userInfo.userId);

            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                this.showNotification('success', 'Profilo aggiornato con successo!');
                await this.refreshDashboard();
            } else {
                throw new Error('Errore aggiornamento profilo');
            }
        } catch (error) {
            console.error('❌ Errore salvataggio profilo:', error);
            this.showNotification('error', 'Errore aggiornamento profilo');
        }
    }

    async refreshDashboard() {
        console.log('🔄 Refresh dashboard...');
        try {
            await this.loadDashboardData();
            window.showPage('dashboard'); // Ricarica la pagina
        } catch (error) {
            console.error('❌ Errore refresh dashboard:', error);
        }
    }

    async logout() {
        const confirmed = await new Promise(resolve => {
            this.showConfirmationModal({
                title: 'Conferma Logout',
                message: 'Sei sicuro di voler uscire dal tuo account? Dovrai effettuare nuovamente il login per accedere alla dashboard.',
                icon: 'fas fa-sign-out-alt',
                type: 'warning',
                confirmText: 'Esci',
                cancelText: 'Rimani',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });

        if (confirmed) {
            if (window.SimpleAuth && typeof window.SimpleAuth.logout === 'function') {
                window.SimpleAuth.logout();
            } else {
                localStorage.clear();
                sessionStorage.clear();
                window.showPage('homepage');
            }
        }
    }

    // ==========================================
    // DEBUG E TESTING FUNCTIONS
    // ==========================================

    testAllModals() {
        console.log('🧪 Test di tutti i modali di conferma...');
        
        const tests = [
            {
                name: 'Modal Success',
                options: {
                    title: 'Test Successo',
                    message: 'Questo è un test del modal di successo',
                    type: 'success',
                    icon: 'fas fa-check-circle',
                    onConfirm: () => console.log('✅ Success modal confermato'),
                    onCancel: () => console.log('❌ Success modal annullato')
                }
            },
            {
                name: 'Modal con Input',
                options: {
                    title: 'Test Input',
                    message: 'Inserisci un valore di test',
                    type: 'info',
                    showInput: true,
                    inputLabel: 'Valore Test:',
                    inputPlaceholder: 'Scrivi qualcosa...',
                    onConfirm: (value) => console.log('✅ Input ricevuto:', value),
                    onCancel: () => console.log('❌ Input annullato')
                }
            }
        ];

        let currentTest = 0;
        const runNextTest = () => {
            if (currentTest < tests.length) {
                const test = tests[currentTest];
                console.log(`🔄 Avvio test: ${test.name}`);
                
                const originalOnConfirm = test.options.onConfirm;
                const originalOnCancel = test.options.onCancel;
                
                test.options.onConfirm = (value) => {
                    if (originalOnConfirm) originalOnConfirm(value);
                    currentTest++;
                    setTimeout(runNextTest, 1000);
                };
                
                test.options.onCancel = () => {
                    if (originalOnCancel) originalOnCancel();
                    currentTest++;
                    setTimeout(runNextTest, 1000);
                };
                
                this.showConfirmationModal(test.options);
            } else {
                console.log('✅ Tutti i test modali completati!');
            }
        };

        runNextTest();
    }

    testNotifications() {
        console.log('🧪 Test sistema notifiche...');
        
        const types = ['success', 'error', 'warning', 'info'];
        let index = 0;
        
        const showNext = () => {
            if (index < types.length) {
                const type = types[index];
                this.showNotification(type, `Test notifica ${type} - Messaggio di prova #${index + 1}`);
                index++;
                setTimeout(showNext, 2000);
            } else {
                console.log('✅ Test notifiche completato!');
            }
        };
        
        showNext();
    }

    // Funzione per testare tutto il sistema
    runFullSystemTest() {
        console.log('🔬 AVVIO TEST COMPLETO DASHBOARD...');
        
        // Test 1: Notifiche
        console.log('1️⃣ Test notifiche...');
        this.testNotifications();
        
        // Test 2: Modali (dopo 10 secondi)
        setTimeout(() => {
            console.log('2️⃣ Test modali...');
            this.testAllModals();
        }, 10000);
        
        // Test 3: Funzioni principali (dopo 20 secondi)
        setTimeout(() => {
            console.log('3️⃣ Test funzioni principali...');
            this.testMainFunctions();
        }, 20000);
    }

    testMainFunctions() {
        console.log('🧪 Test funzioni principali dashboard...');
        
        const functions = [
            'getCurrentUserInfo',
            'getAuthToken',
            'scrollToSection',
            'showAllUsers',
            'refreshBookings',
            'checkAPIStatus'
        ];
        
        functions.forEach(funcName => {
            try {
                if (typeof this[funcName] === 'function') {
                    console.log(`✅ ${funcName}: OK`);
                } else {
                    console.error(`❌ ${funcName}: NON TROVATA`);
                }
            } catch (error) {
                console.error(`❌ ${funcName}: ERRORE -`, error.message);
            }
        });
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    getInitials(name) {
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    }

    // ==========================================
    // GESTIONE AVATAR
    // ==========================================

    createAvatarHTML(user, displayName) {
        return `<div class="avatar-loading">${this.getInitials(displayName)}</div>`;
    }

    async loadUserAvatar(userId) {
        if (!userId) return;

        try {
            const response = await fetch(`/api/users/${userId}/avatar`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                await this.updateDashboardAvatar(result);
            }
        } catch (error) {
            console.error('❌ Errore caricamento avatar dashboard:', error);
        }
    }

    async updateDashboardAvatar(avatarData) {
        const container = document.getElementById('dash-user-avatar-container');
        if (!container) return;

        const avatarUrl = avatarData.avatarUrl || '/images/avatars/default.png';
        const cacheBuster = `?t=${Date.now()}`;

        container.innerHTML = `
            <img src="${avatarUrl}${cacheBuster}" 
                 alt="Avatar profilo" 
                 class="avatar-image" />
        `;

        console.log('✅ Avatar dashboard aggiornato:', avatarUrl);
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('it-IT');
    }

    getStatusLabel(status) {
        const labels = {
            confirmed: 'Confermata',
            pending: 'In Attesa',
            cancelled: 'Cancellata',
            completed: 'Completata'
        };
        return labels[status] || status;
    }

    getStatusIcon(status) {
        const icons = {
            confirmed: '<i class="fas fa-check-circle"></i>',
            pending: '<i class="fas fa-clock"></i>',
            cancelled: '<i class="fas fa-times-circle"></i>',
            completed: '<i class="fas fa-flag"></i>'
        };
        return icons[status] || '<i class="fas fa-circle-question"></i>';
    }

    showNotification(type, message) {
        // Usa il sistema di notifiche personalizzato globale
        if (window.CustomNotifications) {
            const titles = {
                'success': 'Successo',
                'error': 'Errore',
                'warning': 'Attenzione',
                'info': 'Informazione'
            };
            
            const title = titles[type] || 'Notifica';
            
            // Usa il metodo appropriato del sistema notifiche
            switch (type) {
                case 'success':
                    window.CustomNotifications.success(title, message);
                    break;
                case 'error':
                    window.CustomNotifications.error(title, message);
                    break;
                case 'warning':
                    window.CustomNotifications.warning(title, message);
                    break;
                default:
                    window.CustomNotifications.info(title, message);
            }
        } else {
            // Fallback se il sistema notifiche non è disponibile
            const alertType = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
            alert(`${alertType} ${message}`);
        }
    }

    // ==========================================
    // GESTIONE MODIFICA PROFILO
    // ==========================================

    openAvatarModal() {
        // Usa il sistema avatar delle prenotazioni se disponibile
        if (window.openAvatarModal) {
            window.openAvatarModal();
        } else {
            // Apre la pagina prenotazioni dove c'è il sistema avatar
            if (window.SimpleAuth?.showBookings) {
                window.SimpleAuth.showBookings();
            } else {
                alert('Per cambiare avatar, vai alle prenotazioni utente');
            }
        }
    }

    editField(fieldType) {
        const currentUser = this.dashboardData?.user;
        if (!currentUser) return;

        let currentValue, fieldLabel, fieldPlaceholder;
        
        switch (fieldType) {
            case 'name':
                currentValue = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
                fieldLabel = 'Nome Completo';
                fieldPlaceholder = 'Inserisci il tuo nome e cognome';
                break;
                
            case 'email':
                currentValue = currentUser.email;
                fieldLabel = 'Indirizzo Email';
                fieldPlaceholder = 'Inserisci la tua email';
                break;
                
            case 'phone':
                currentValue = currentUser.phone || '';
                fieldLabel = 'Numero di Telefono';
                fieldPlaceholder = 'Inserisci il tuo numero di telefono (es. +39 123 456 7890)';
                break;
                
            default:
                return;
        }

        this.showEditFieldModal(fieldType, fieldLabel, currentValue, fieldPlaceholder);
    }

    showEditFieldModal(fieldType, fieldLabel, currentValue, placeholder) {
        // Rimuove eventuali modal esistenti
        const existingModal = document.querySelector('.edit-field-modal');
        if (existingModal) existingModal.remove();

        // Crea il modal
        const modal = document.createElement('div');
        modal.className = 'edit-field-modal';
        modal.innerHTML = `
            <div class="edit-field-overlay">
                <div class="edit-field-container">
                    <div class="edit-field-header">
                        <h3>
                            <i class="fas fa-pen"></i>
                            Modifica ${fieldLabel}
                        </h3>
                        <button class="edit-field-close" onclick="this.closest('.edit-field-modal').remove()">×</button>
                    </div>
                    
                    <div class="edit-field-body">
                        <div class="edit-field-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Stai per modificare <strong>${fieldLabel.toLowerCase()}</strong>. Questa modifica sarà permanente e sincronizzata con il database.</p>
                        </div>
                        
                        <div class="edit-field-form">
                            <label class="edit-field-label">${fieldLabel}</label>
                            <input type="${fieldType === 'email' ? 'email' : fieldType === 'phone' ? 'tel' : 'text'}" 
                                   class="edit-field-input" 
                                   value="${currentValue}" 
                                   placeholder="${placeholder}"
                                   id="edit-field-input"
                                   autocomplete="${fieldType === 'email' ? 'email' : fieldType === 'phone' ? 'tel' : 'name'}"
                                   ${fieldType === 'email' || fieldType === 'name' ? 'required' : ''}>
                            <div class="edit-field-help">
                                ${fieldType === 'email' ? 
                                    'Inserisci un indirizzo email valido. Riceverai una conferma al nuovo indirizzo.' : 
                                    fieldType === 'phone' ?
                                    'Inserisci un numero di telefono valido con prefisso internazionale (opzionale). Può essere lasciato vuoto.' :
                                    'Inserisci il tuo nome completo (nome e cognome).'}
                            </div>
                        </div>
                    </div>
                    
                    <div class="edit-field-actions">
                        <button class="btn-cancel" onclick="this.closest('.edit-field-modal').remove()">
                            <i class="fas fa-times"></i>
                            Annulla
                        </button>
                        <button class="btn-save" onclick="window.dashboardManager.confirmFieldUpdate('${fieldType}')">
                            <i class="fas fa-check"></i>
                            Conferma Modifica
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);

        // Focus sull'input
        const input = modal.querySelector('#edit-field-input');
        input.focus();
        input.select();

        // Enter per salvare, Escape per chiudere
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.confirmFieldUpdate(fieldType);
            } else if (e.key === 'Escape') {
                modal.remove();
            }
        });
    }

    confirmFieldUpdate(fieldType) {
        const modal = document.querySelector('.edit-field-modal');
        const input = modal.querySelector('#edit-field-input');
        const newValue = input.value.trim();
        
        // Validazioni per campi obbligatori
        if ((fieldType === 'name' || fieldType === 'email') && !newValue) {
            this.showFieldError('Il campo non può essere vuoto');
            return;
        }

        if (fieldType === 'email' && !this.isValidEmail(newValue)) {
            this.showFieldError('Inserisci un indirizzo email valido');
            return;
        }

        if (fieldType === 'phone' && newValue && !this.isValidPhone(newValue)) {
            this.showFieldError('Inserisci un numero di telefono valido (es. +39 123 456 7890)');
            return;
        }

        // Mostra loading
        const saveBtn = modal.querySelector('.btn-save');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        saveBtn.disabled = true;

        // Aggiorna il campo
        this.updateUserField(fieldType, newValue)
            .then(() => {
                modal.remove();
            })
            .catch(() => {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
                this.showFieldError('Errore durante il salvataggio. Riprova.');
            });
    }

    showFieldError(message) {
        const modal = document.querySelector('.edit-field-modal');
        let errorDiv = modal.querySelector('.edit-field-error');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'edit-field-error';
            modal.querySelector('.edit-field-form').appendChild(errorDiv);
        }
        
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            ${message}
        `;
        
        setTimeout(() => errorDiv.remove(), 5000);
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        // Regex per telefono: può iniziare con +, seguita da numeri, spazi, trattini, parentesi
        const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{8,20}$/;
        return phoneRegex.test(phone);
    }

    // ==========================================
    // PANNELLI CONFERMA PERSONALIZZATI
    // ==========================================

    showConfirmationModal(options) {
        const {
            title,
            message,
            icon = 'fas fa-question-circle',
            type = 'warning', // warning, danger, info, success
            confirmText = 'Conferma',
            cancelText = 'Annulla',
            onConfirm,
            onCancel,
            showInput = false,
            inputPlaceholder = '',
            inputLabel = ''
        } = options;

        // Rimuove eventuali modal esistenti
        const existingModal = document.querySelector('.confirmation-modal');
        if (existingModal) existingModal.remove();

        // Colori per i diversi tipi
        const typeColors = {
            warning: '#ffc107',
            danger: '#e74c3c', 
            info: '#17a2b8',
            success: '#28a745'
        };

        const modal = document.createElement('div');
        modal.className = 'confirmation-modal';
        modal.innerHTML = `
            <div class="confirmation-overlay">
                <div class="confirmation-container">
                    <div class="confirmation-header">
                        <div class="confirmation-icon" style="color: ${typeColors[type]};">
                            <i class="${icon}"></i>
                        </div>
                        <h3>${title}</h3>
                        <button class="confirmation-close" onclick="this.closest('.confirmation-modal').remove()">×</button>
                    </div>
                    
                    <div class="confirmation-body">
                        <p>${message}</p>
                        ${showInput ? `
                            <div class="confirmation-input-group">
                                <label class="confirmation-input-label">${inputLabel}</label>
                                <input type="text" 
                                       class="confirmation-input" 
                                       id="confirmation-input"
                                       placeholder="${inputPlaceholder}">
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="confirmation-actions">
                        <button class="btn-confirmation-cancel" onclick="this.closest('.confirmation-modal').remove()">
                            <i class="fas fa-times"></i>
                            ${cancelText}
                        </button>
                        <button class="btn-confirmation-confirm" style="background: ${typeColors[type]}; border-color: ${typeColors[type]};">
                            <i class="fas fa-check"></i>
                            ${confirmText}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);

        // Event listeners
        const confirmBtn = modal.querySelector('.btn-confirmation-confirm');
        const cancelBtn = modal.querySelector('.btn-confirmation-cancel');
        const closeBtn = modal.querySelector('.confirmation-close');

        confirmBtn.addEventListener('click', () => {
            let inputValue = '';
            if (showInput) {
                inputValue = modal.querySelector('#confirmation-input').value.trim();
            }
            modal.remove();
            if (onConfirm) onConfirm(inputValue);
        });

        [cancelBtn, closeBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                modal.remove();
                if (onCancel) onCancel();
            });
        });

        // Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                if (onCancel) onCancel();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Focus input se presente
        if (showInput) {
            setTimeout(() => {
                const input = modal.querySelector('#confirmation-input');
                if (input) input.focus();
            }, 100);
        }
    }

    async updateUserField(fieldType, newValue) {
        try {
            console.log(`🔄 Aggiornamento ${fieldType}:`, newValue);
            
            // Preparazione dei dati per l'API
            let updateData = {};
            if (fieldType === 'name') {
                const nameParts = newValue.split(' ');
                updateData.firstName = nameParts[0] || '';
                updateData.lastName = nameParts.slice(1).join(' ') || '';
            } else if (fieldType === 'email') {
                updateData.email = newValue;
            } else if (fieldType === 'phone') {
                updateData.phone = newValue || null; // Permetti vuoto
            }

            // Chiamata API al database usando l'endpoint esistente
            const userId = this.dashboardData.user.id;
            const response = await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Errore durante l\'aggiornamento');
            }

            // Effetto dissolve e aggiornamento in tempo reale
            await this.applyFieldDissolveEffect(fieldType, newValue);
            
            // Aggiorna i dati locali
            if (fieldType === 'name') {
                this.dashboardData.user.firstName = updateData.firstName;
                this.dashboardData.user.lastName = updateData.lastName;
            } else if (fieldType === 'email') {
                this.dashboardData.user.email = updateData.email;
            } else if (fieldType === 'phone') {
                this.dashboardData.user.phone = updateData.phone;
            }
            
            // Notifica di successo con stile personalizzato
            this.showProfileUpdateNotification(fieldType, newValue);
            
            console.log('✅ Aggiornamento campo completato con successo');
            
        } catch (error) {
            console.error(`❌ Errore aggiornamento ${fieldType}:`, error);
            throw error; // Rilancia per gestione nel modal
        }
    }

    async applyFieldDissolveEffect(fieldType, newValue) {
        // Trova l'elemento da aggiornare nell'header
        let targetElement;
        switch (fieldType) {
            case 'name':
                targetElement = document.getElementById('user-name-display');
                break;
            case 'email':
                targetElement = document.getElementById('user-email-display');
                break;
            case 'phone':
                targetElement = document.getElementById('user-phone-display');
                break;
            default:
                return;
        }
            
        if (!targetElement) return;

        // Effetto dissolve out
        targetElement.style.transition = 'opacity 0.4s ease';
        targetElement.style.opacity = '0';

        await new Promise(resolve => setTimeout(resolve, 400));

        // Aggiorna il contenuto
        let newContent;
        if (fieldType === 'phone' && !newValue) {
            newContent = '<span style="opacity: 0.6; font-style: italic;">Non inserito</span>';
        } else {
            newContent = newValue;
        }
        targetElement.innerHTML = `${newContent}<i class="fas fa-pen edit-icon"></i>`;

        // Effetto dissolve in con highlight
        targetElement.style.background = 'rgba(76, 175, 80, 0.2)';
        targetElement.style.opacity = '1';
        targetElement.style.borderRadius = '4px';
        targetElement.style.padding = '0.2rem 1.5rem 0.2rem 0.3rem';

        // Rimuove l'highlight dopo 2 secondi
        setTimeout(() => {
            targetElement.style.background = '';
            targetElement.style.borderRadius = '';
            targetElement.style.padding = '0.2rem 1.5rem 0.2rem 0.3rem';
        }, 2000);
    }

    showProfileUpdateNotification(fieldType, newValue) {
        // Crea notifica personalizzata
        const notification = document.createElement('div');
        notification.className = 'profile-update-notification';
        
        const fieldDisplayName = fieldType === 'name' ? 'Nome' : fieldType === 'email' ? 'Email' : 'Telefono';
        
        notification.innerHTML = `
            <div class="profile-notification-content">
                <div class="profile-notification-icon">
                    <i class="fas fa-user-check"></i>
                </div>
                <div class="profile-notification-text">
                    <div class="profile-notification-title">Profilo Aggiornato!</div>
                    <div class="profile-notification-subtitle">${fieldDisplayName} modificato in: <strong>${newValue}</strong></div>
                </div>
                <button class="profile-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Animazione di entrata
        setTimeout(() => notification.classList.add('show'), 100);

        // Auto-rimozione dopo 5 secondi
        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => notification.remove(), 500);
        }, 5000);
    }

    // ==========================================
    // LIFECYCLE METHODS
    // ==========================================

    startAutoRefresh() {
        if (this.refreshInterval) return;

        this.refreshInterval = setInterval(async () => {
            try {
                await this.loadDashboardData();
                console.log('🔄 Auto-refresh dashboard completato');
            } catch (error) {
                console.warn('⚠️ Errore auto-refresh:', error);
            }
        }, DASHBOARD_CONFIG.REFRESH_INTERVAL);

        console.log('⏰ Auto-refresh attivato ogni 30 secondi');
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('⏰ Auto-refresh disattivato');
        }
    }

    cleanup() {
        this.stopAutoRefresh();

        // Rimuovi event listeners
        window.removeEventListener('beforeunload', this.handleBeforeUnload);

        // Pulisci notifiche attive
        document.querySelectorAll('.dash-notification').forEach(notification => {
            notification.remove();
        });

        // Reset dati
        this.dashboardData = null;
        this.currentUser = null;

        // Rimuovi classi dal body
        document.body.classList.remove('role-customer', 'role-staff', 'role-admin');

        console.log('🧹 Dashboard cleanup completato');
    }

    handleBeforeUnload = () => {
    if (window.dashboardManager) {
        window.dashboardManager.cleanup();
    }
};




initializeDashboard() {
    console.log('🚀 Inizializzazione dashboard ottimizzata...');

    // Rimuove classe di loading se presente
    document.body.classList.remove('loading');

    setTimeout(() => {
        if (this.dashboardData && this.dashboardData.role) {
            document.body.classList.add(`role-${this.dashboardData.role}`);

            // Pulizia classi precedenti
            document.body.classList.remove('role-customer', 'role-staff', 'role-admin');
            document.body.classList.add(`role-${this.dashboardData.role}`);
        }

        // Customer
        if (this.dashboardData?.role === 'customer') {
            console.log('👤 Utente customer - popolamento preferenze...');
            this.populateGameCategories();
            this.populateDrinkTypes();
        }

        // Staff - Gestione prenotazioni standard
        if (this.dashboardData?.role === 'staff') {
            console.log('👨‍💼 Utente staff - inizializzazione gestione prenotazioni...');
            setTimeout(() => {
                this.renderStaffBookings('pending');
            }, 300);
        }

        // Admin - Gestione completa
        if (this.dashboardData?.role === 'admin') {
            console.log('🔧 Utente admin - inizializzazione completa...');

            // Inizializza inventario sistema
            setTimeout(() => {
                this.renderSystemInventory(7);
            }, 300);

            // Inizializza prenotazioni admin
            setTimeout(() => {
                this.renderAdminBookings('pending');
            }, 500);
        }

        console.log('✅ Dashboard inizializzata completamente per ruolo:', this.dashboardData?.role);
    }, 200);
}

}
// ==========================================
// FUNZIONE PRINCIPALE DELLA PAGINA
// ==========================================

export async function showDashboard() {
    console.log('🎯 Apertura pagina dashboard...');

    const content = document.getElementById('content');
    if (!content) {
        console.error('❌ Container #content non trovato!');
        return;
    }

    // Verifica autenticazione prima di procedere
    const isAuthenticated = (window.SimpleAuth && window.SimpleAuth.isAuthenticated) ||
                           Boolean(window.currentUser) ||
                           Boolean(localStorage.getItem('authToken'));

    if (!isAuthenticated) {
        console.warn('⚠️ Utente non autenticato per dashboard');
        content.innerHTML = `
            <div class="dash-auth-required-page">
                <div class="dash-auth-message">
                    <i class="fas fa-lock"></i>
                    <h2>Accesso Richiesto</h2>
                    <p>Devi essere loggato per accedere alla dashboard</p>
                    <button class="dash-btn dash-btn-primary" onclick="window.SimpleAuth?.showLoginModal() || alert('Sistema auth non disponibile')">
                        <i class="fas fa-sign-in-alt"></i>
                        Accedi Ora
                    </button>
                </div>
            </div>
        `;
        return;
    }

    // Crea o recupera manager
    if (!window.dashboardManager) {
        window.dashboardManager = new DashboardPageManager();
    }

    const manager = window.dashboardManager;

    try {
        // Mostra loading iniziale
        content.innerHTML = manager.createLoadingHTML();

        // Carica dati dashboard
        await manager.loadDashboardData();

        // Renderizza dashboard completa
        content.innerHTML = manager.createDashboardHTML();

        // ✅ NUOVO: Inizializza preferenze dinamiche dopo il render
        manager.initializeDashboard();

        // Attiva auto-refresh
        manager.startAutoRefresh();

        console.log('✅ Dashboard caricata con successo');

    } catch (error) {
        console.error('❌ Errore caricamento dashboard:', error);

        // Gestione errori specifici
        let errorHTML = '';

        if (error.message.includes('autenticazione') || error.message.includes('401')) {
            errorHTML = `
                <div class="dash-error-page">
                    <i class="fas fa-user-times"></i>
                    <h2>Sessione Scaduta</h2>
                    <p>La tua sessione è scaduta. Effettua nuovamente il login.</p>
                    <button class="dash-btn dash-btn-primary" onclick="window.SimpleAuth?.showLoginModal()">
                        <i class="fas fa-sign-in-alt"></i>
                        Accedi di Nuovo
                    </button>
                </div>
            `;
        } else if (error.message.includes('rete') || error.message.includes('fetch')) {
            errorHTML = `
                <div class="dash-error-page">
                    <i class="fas fa-wifi"></i>
                    <h2>Errore di Connessione</h2>
                    <p>Impossibile caricare i dati. Verifica la connessione internet.</p>
                    <button class="dash-btn dash-btn-primary" onclick="window.dashboardManager?.refreshDashboard()">
                        <i class="fas fa-rotate"></i>
                        Riprova
                    </button>
                </div>
            `;
        } else {
            errorHTML = `
                <div class="dash-error-page">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>Errore Caricamento Dashboard</h2>
                    <p>${error.message}</p>
                    <div class="dash-error-actions">
                        <button class="dash-btn dash-btn-primary" onclick="window.dashboardManager?.refreshDashboard()">
                            <i class="fas fa-rotate"></i>
                            Ricarica Dashboard
                        </button>
                        <button class="dash-btn dash-btn-outline" onclick="window.showPage('homepage')">
                            <i class="fas fa-home"></i>
                            Torna alla Home
                        </button>
                    </div>
                </div>
            `;
        }

        content.innerHTML = errorHTML;
    }
}

// ==========================================
// INTEGRAZIONE CON NAVBAR
// ==========================================

// Funzione chiamata dal click navbar "Visualizza Profilo"
window.openDashboard = function() {
    console.log('📱 Apertura dashboard da navbar...');

    // Usa il router SPA esistente
    if (window.showPage) {
        window.showPage('dashboard');
    } else if (window.location) {
        // Fallback con history API
        window.history.pushState({}, '', '/dashboard');
        showDashboard();
    }
};

// ==========================================
// FUNZIONI UTILITY E TEST
// ==========================================

// Funzione per test dashboard con dati mock
window.testDashboard = function(role = 'customer') {
    console.log(`🧪 Test dashboard come ${role}...`);

    // Mock user data per testing
    const mockUsers = {
        customer: {
            userId: 1,
            email: 'test@customer.com',
            role: 'customer',
            firstName: 'Giulia',
            lastName: 'Bianchi'
        },
        staff: {
            userId: 2,
            email: 'staff@diceanddrink.com',
            role: 'staff',
            firstName: 'Marco',
            lastName: 'Rossi'
        },
        admin: {
            userId: 3,
            email: 'admin@diceanddrink.com',
            role: 'admin',
            firstName: 'Admin',
            lastName: 'Sistema'
        }
    };

    // Simula login e crea dati mock per test senza API
    const mockUser = mockUsers[role];

    // Mock auth data
    if (window.SimpleAuth) {
        window.SimpleAuth.currentUser = mockUser;
        window.SimpleAuth.isAuthenticated = true;
        window.SimpleAuth.token = 'mock-token-' + role;
    }

    localStorage.setItem('authToken', 'mock-token-' + role);
    localStorage.setItem('currentUser', JSON.stringify(mockUser));

    // Mock dashboard data per evitare chiamate API
    const mockDashboardData = {
        user: {
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            email: mockUser.email,
            phone: '+39 333 123 4567',
            createdAt: '2024-01-15T10:30:00Z'
        },
        role: mockUser.role,
        stats: role === 'customer' ? {
            activeBookings: 3,
            monthlyActivity: 12,
            gamesPlayed: 45
        } : role === 'staff' ? {
            totalUsers: 128,
            todayBookings: 8
        } : {
            totalUsers: 256,
            todayBookings: 15,
            monthlySessions: 847,
            catalogGames: 120
        },
        preferences: {
            gameCategories: ['strategia', 'famiglia'],
            drinks: ['analcolici', 'caffe']
        },
        recentBookings: role === 'customer' ? [
            {
                booking_date: '2024-06-25',
                booking_time: '20:00',
                party_size: 4,
                status: 'confirmed'
            },
            {
                booking_date: '2024-06-28',
                booking_time: '19:30',
                party_size: 2,
                status: 'pending'
            }
        ] : []
    };

    // Crea manager e inietta dati mock
    if (!window.dashboardManager) {
        window.dashboardManager = new DashboardPageManager();
    }

    // Inietta i dati mock direttamente
    window.dashboardManager.dashboardData = mockDashboardData;
    window.dashboardManager.currentUser = mockUser;

    // Apri dashboard
    window.showPage('dashboard');

    console.log(`✅ Test dashboard ${role} avviato con dati mock`);
};

// Funzione per debug stato dashboard
window.debugDashboard = function() {
    console.log('🔍 Debug stato dashboard:');

    if (window.dashboardManager) {
        const manager = window.dashboardManager;
        console.log('👤 Manager esistente:', !!manager);
        console.log('🔐 Autenticato:', manager.isAuthenticated);
        console.log('👤 User corrente:', manager.currentUser);
        console.log('📊 Dati dashboard:', manager.dashboardData);
        console.log('🔄 Auto-refresh attivo:', !!manager.refreshInterval);
    } else {
        console.log('❌ Manager non inizializzato');
    }

    // Info autenticazione globale
    console.log('🔐 SimpleAuth:', {
        presente: !!window.SimpleAuth,
        autenticato: window.SimpleAuth?.isAuthenticated,
        utente: window.SimpleAuth?.currentUser
    });

    console.log('💾 Storage:', {
        authToken: !!localStorage.getItem('authToken'),
        currentUser: !!localStorage.getItem('currentUser')
    });
};

// Reset completo dashboard per test
window.resetDashboard = function() {
    console.log('🧹 Reset completo dashboard...');

    // Cleanup manager
    if (window.dashboardManager) {
        window.dashboardManager.cleanup();
        delete window.dashboardManager;
    }

    // Reset autenticazione mock
    if (window.SimpleAuth) {
        window.SimpleAuth.currentUser = null;
        window.SimpleAuth.isAuthenticated = false;
        window.SimpleAuth.token = null;
    }

    // Pulisci storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');

    // Torna alla homepage
    window.showPage('homepage');

    console.log('✅ Reset dashboard completato');
};

// ==========================================
// MOCK API INTERCEPT PER TEST
// ==========================================

// Override del loadDashboardData per test senza backend
const originalLoadDashboardData = DashboardPageManager.prototype.loadDashboardData;

DashboardPageManager.prototype.loadDashboardData = async function() {
    // Se abbiamo già dati mock, usali
    if (this.dashboardData && this.dashboardData.user) {
        console.log('📊 Utilizzo dati mock esistenti');
        return this.dashboardData;
    }

    // Altrimenti prova API reale
    try {
        return await originalLoadDashboardData.call(this);
    } catch (error) {
        console.warn('⚠️ API non disponibile, utilizzo dati mock:', error.message);

        // Fallback con dati mock se API non disponibile
        const userInfo = this.getCurrentUserInfo();
        if (!userInfo) throw error;

        const mockData = {
            user: {
                firstName: userInfo.firstName || 'Test',
                lastName: userInfo.lastName || 'User',
                email: userInfo.email,
                phone: '+39 333 123 4567',
                createdAt: '2024-01-15T10:30:00Z'
            },
            role: userInfo.role,
            stats: this.generateMockStats(userInfo.role),
            preferences: { gameCategories: [], drinks: [] },
            recentBookings: this.generateMockBookings(userInfo.role)
        };

        this.dashboardData = mockData;
        this.currentUser = userInfo;
        return mockData;
    }
};

// Metodi helper per dati mock
DashboardPageManager.prototype.generateMockStats = function(role) {
    const stats = {
        customer: { activeBookings: 3, monthlyActivity: 12, gamesPlayed: 45 },
        staff: { totalUsers: 128, todayBookings: 8 },
        admin: { totalUsers: 256, todayBookings: 15, monthlySessions: 847, catalogGames: 120 }
    };
    return stats[role] || stats.customer;
};

DashboardPageManager.prototype.generateMockBookings = function(role) {
    if (role !== 'customer') return [];
    return [
        {
            booking_date: '2024-06-25',
            booking_time: '20:00',
            party_size: 4,
            status: 'confirmed'
        },
        {
            booking_date: '2024-06-28',
            booking_time: '19:30',
            party_size: 2,
            status: 'pending'
        }
    ];
};

// ==========================================
// INIZIALIZZAZIONE E LOGS
// ==========================================

// Funzioni di test modali e notifiche
window.testDashboardModals = () => {
    if (window.dashboardManager && typeof window.dashboardManager.testAllModals === 'function') {
        window.dashboardManager.testAllModals();
    } else {
        console.error('❌ Dashboard manager non disponibile o metodo testAllModals mancante');
    }
};

window.testDashboardNotifications = () => {
    if (window.dashboardManager && typeof window.dashboardManager.testNotifications === 'function') {
        window.dashboardManager.testNotifications();
    } else {
        console.error('❌ Dashboard manager non disponibile o metodo testNotifications mancante');
    }
};

window.runFullDashboardTest = () => {
    if (window.dashboardManager && typeof window.dashboardManager.runFullSystemTest === 'function') {
        window.dashboardManager.runFullSystemTest();
    } else {
        console.error('❌ Dashboard manager non disponibile o metodo runFullSystemTest mancante');
    }
};

console.log('✅ Dashboard module caricato completamente');
console.log('🧪 Funzioni di test disponibili:');
console.log('   📦 testDashboard("customer|staff|admin") - Test dashboard per ruolo');
console.log('   🔧 testDashboardModals() - Test modali di conferma');
console.log('   📢 testDashboardNotifications() - Test notifiche');
console.log('   🔬 runFullDashboardTest() - Test completo sistema');
console.log('   🔍 debugDashboard() - Debug stato corrente');
console.log('   🧹 resetDashboard() - Reset completo');
console.log('   📱 openDashboard() - Apertura da navbar');

// Auto-cleanup quando si cambia pagina
window.addEventListener('beforeunload', () => {
    if (window.dashboardManager) {
        window.dashboardManager.cleanup();
    }
});

// ==========================================
// EXPORT E COMPATIBILITÀ
// ==========================================

// Assicura compatibilità con diversi sistemi di module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showDashboard };
}

// Support per AMD
if (typeof define === 'function' && define.amd) {
    define([], function() {
        return { showDashboard };
    });
}

// Global fallback
if (typeof window !== 'undefined') {
    window.showDashboard = showDashboard;
}

console.log('📁 Dashboard module caricato completamente');
