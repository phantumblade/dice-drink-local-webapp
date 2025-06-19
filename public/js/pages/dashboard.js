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
            <div class="dash-container">
                ${this.createDashboardHeaderHTML(user, role)}
                ${this.createDashboardGridHTML()}
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
            <div class="dash-header">
                <div class="dash-user-avatar">${this.getInitials(displayName)}</div>
                <div class="dash-user-info">
                    <h1>
                        ${displayName}
                        <span class="dash-role-badge ${role}">${roleLabels[role] || role}</span>
                    </h1>
                    <div class="dash-user-meta">
                        <span><i class="fas fa-envelope"></i>${user.email}</span>
                        <span><i class="fas fa-calendar-plus"></i>Registrato: ${this.formatDate(user.createdAt)}</span>
                        ${user.phone ? `<span><i class="fas fa-phone"></i>${user.phone}</span>` : ''}
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
                    ${this.createProfileSectionHTML()}
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
                { icon: 'fas fa-tachometer-alt', text: 'Dashboard', id: 'dashboard', active: true },
                { icon: 'fas fa-user', text: 'Il Mio Profilo', id: 'profile' },
                { icon: 'fas fa-heart', text: 'Preferenze', id: 'preferences' },
                { icon: 'fas fa-calendar-alt', text: 'Prenotazioni', id: 'bookings' },
            ],
            staff: [
                { icon: 'fas fa-tachometer-alt', text: 'Dashboard', id: 'dashboard', active: true },
                { icon: 'fas fa-user', text: 'Profilo Staff', id: 'profile' },
                { icon: 'fas fa-clipboard-list', text: 'Gestione Prenotazioni', id: 'manage-bookings' },
                { icon: 'fas fa-users', text: 'Lista Utenti', id: 'user-list' }
            ],
            admin: [
                { icon: 'fas fa-tachometer-alt', text: 'Dashboard', id: 'dashboard', active: true },
                { icon: 'fas fa-user', text: 'Profilo Admin', id: 'profile' },
                { icon: 'fas fa-chart-pie', text: 'Dashboard Sistema', id: 'system-dashboard' },
                { icon: 'fas fa-user-plus', text: 'Gestisci Utenti', id: 'manage-users' },
            ]
        };

        const menuItems = sections[role] || sections.customer;

        return `
            <div class="dash-sidebar">
                <nav>
                    <div class="dash-sidebar-section">
                        <div class="dash-sidebar-title">Menu</div>
                        <ul class="dash-sidebar-nav">
                            ${menuItems.map(item => `
                                <li>
                                    <a href="#${item.id}" class="${item.active ? 'active' : ''}"
                                       onclick="window.dashboardManager.scrollToSection('${item.id}')">
                                        <i class="${item.icon}"></i>${item.text}
                                    </a>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </nav>
            </div>
        `;
    }

    createProfileSectionHTML() {
        const { user, role } = this.dashboardData;

        return `
            <div class="dash-card" id="profile">
                <div class="dash-card-header">
                    <h2 class="dash-card-title">
                        <i class="fas fa-user-edit dash-card-icon"></i>
                        ${role === 'customer' ? 'Modifica Profilo' :
                          role === 'staff' ? 'Profilo Staff' : 'Profilo Admin'}
                    </h2>
                    <button class="dash-btn dash-btn-primary" onclick="window.dashboardManager.saveProfile()">
                        Salva Modifiche
                    </button>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                    <div class="dash-form-group">
                        <label class="dash-form-label">Nome</label>
                        <input type="text" class="dash-form-control" id="profile-firstname"
                               value="${user.firstName || ''}" placeholder="Il tuo nome">
                    </div>
                    <div class="dash-form-group">
                        <label class="dash-form-label">Cognome</label>
                        <input type="text" class="dash-form-control" id="profile-lastname"
                               value="${user.lastName || ''}" placeholder="Il tuo cognome">
                    </div>
                    <div class="dash-form-group">
                        <label class="dash-form-label">Email</label>
                        <input type="email" class="dash-form-control" id="profile-email"
                               value="${user.email || ''}" placeholder="La tua email">
                    </div>
                    <div class="dash-form-group">
                        <label class="dash-form-label">Telefono</label>
                        <input type="tel" class="dash-form-control" id="profile-phone"
                               value="${user.phone || ''}" placeholder="Il tuo telefono">
                    </div>
                </div>
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
                        <i class="fas fa-clipboard-list dash-card-icon"></i>
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
                            <i class="fas fa-sync-alt"></i>
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
                        <i class="fas fa-calendar-check"></i>
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
                        <i class="fas fa-sync-alt"></i>
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
                    <i class="fas fa-flag-checkered"></i>
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
    const confirmation = confirm('Confermare questa prenotazione?');
    if (!confirmation) return;

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
    const reason = prompt('Motivo dell\'annullamento (opzionale):');
    if (reason === null) return;

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
    const confirmation = confirm('Marcare come completata?');
    if (!confirmation) return;

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
        'completed': 'fas fa-flag-checkered',
        'cancelled': 'fas fa-times-circle'
    };
    return icons[status] || 'fas fa-question-circle';
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
        const preferences = {
            favorite_game_categories: Array.from(
                document.querySelectorAll('input[name="game-categories"]:checked')
            ).map(input => input.value),

            preferred_drink_types: Array.from(
                document.querySelectorAll('input[name="drink-types"]:checked')
            ).map(input => input.value),

            // Restrizioni dietetiche
            dietary_restrictions: Array.from(
                document.querySelectorAll('input[name="dietary-restrictions"]:checked')
            ).map(input => input.value),

            // Fasce orarie preferite
            preferred_time_slots: Array.from(
                document.querySelectorAll('input[name="time-slots"]:checked')
            ).map(input => input.value),

            // Complessità massima giochi
            max_game_complexity: parseInt(document.getElementById('max-game-complexity')?.value || 3),

            // Preferenze notifiche
            notification_preferences: {
                email_booking: document.getElementById('notify-email-booking')?.checked || false,
                email_reminder: document.getElementById('notify-email-reminder')?.checked || false,
                email_promotions: document.getElementById('notify-email-promotions')?.checked || false,
                new_games: document.getElementById('notify-new-games')?.checked || false
            }
        };

        console.log('📊 Preferenze raccolte:', preferences);

        // Chiama API per salvare
        const userInfo = this.getCurrentUserInfo();
        const token = this.getAuthToken();

        const response = await fetch(`/api/users/${userInfo.userId}/preferences`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preferences)
        });

        if (response.ok) {
            const result = await response.json();

            // Aggiorna i dati locali
            this.dashboardData.preferences = result.preferences || preferences;

            this.showNotification('success', 'Preferenze salvate con successo! 🎉');

            console.log('✅ Preferenze salvate nel database');
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Errore salvataggio preferenze');
        }

    } catch (error) {
        console.error('❌ Errore salvataggio preferenze:', error);
        this.showNotification('error', `Errore salvataggio preferenze: ${error.message}`);
    }
}



    createBookingsSectionHTML() {
        const bookings = this.dashboardData.recentBookings || [];

        return `
            <div class="dash-card dash-customer-only" id="bookings">
                <div class="dash-card-header">
                    <h2 class="dash-card-title">
                        <i class="fas fa-calendar-alt dash-card-icon"></i>
                        Le Tue Prenotazioni
                    </h2>
                    <button class="dash-btn dash-btn-primary" onclick="window.showPage('prenotazioni')">
                        Nuova Prenotazione
                    </button>
                </div>
                <table class="dash-data-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Orario</th>
                            <th>Persone</th>
                            <th>Stato</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bookings.length > 0 ? bookings.map(booking => `
                            <tr>
                                <td>${this.formatDate(booking.booking_date)}</td>
                                <td>${booking.booking_time}</td>
                                <td>${booking.party_size} persone</td>
                                <td><span class="dash-status-badge dash-status-${booking.status}">${this.getStatusLabel(booking.status)}</span></td>
                                <td>
                                    <button class="dash-btn dash-btn-outline dash-btn-sm">Dettagli</button>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="5" style="text-align: center; padding: 2rem;">
                                    Nessuna prenotazione trovata
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;
    }


createAdminSectionsHTML() {
    return `
        <!-- Dashboard Sistema Admin con Inventario -->
        <div class="dash-card dash-admin-section" id="system-dashboard">
            <div class="dash-card-header">
                <h2 class="dash-card-title">
                    <i class="fas fa-chart-pie dash-card-icon"></i>
                    Dashboard Sistema & Inventario
                </h2>
                <div class="admin-dashboard-controls">
                    <select id="inventory-period" onchange="window.dashboardManager.refreshInventoryData(this.value)">
                        <option value="7">Ultimi 7 giorni</option>
                        <option value="30">Ultimi 30 giorni</option>
                        <option value="90">Ultimi 90 giorni</option>
                    </select>
                    <button class="dash-btn dash-btn-primary" onclick="window.dashboardManager.refreshInventoryData()">
                        <i class="fas fa-sync-alt"></i>
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
                    <i class="fas fa-clipboard-list dash-card-icon"></i>
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
                        <i class="fas fa-sync-alt"></i>
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
                        <i class="fas fa-sync-alt"></i>
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
                        <i class="fas fa-calendar-check"></i>
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
                        <i class="fas fa-sync-alt"></i>
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

showNotification(type, message) {

    // Altrimenti crea notifica inline elegante
    const notification = document.createElement('div');
    notification.className = `dash-notification dash-notification-${type}`;
    notification.innerHTML = `
        <div class="dash-notification-content">
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="dash-notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Stili inline per notifica
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${this.getNotificationColor(type)};
        color: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 9999;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    // Auto-remove dopo 5 secondi
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-triangle',
        warning: 'exclamation-circle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

getNotificationColor(type) {
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    return colors[type] || '#17a2b8';
}


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

        // Aggiorna sidebar attiva
        document.querySelectorAll('.dash-sidebar-nav a').forEach(link => {
            link.classList.remove('active');
        });

        // Trova il link corrispondente e marcalo come attivo
        const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Scroll alla sezione
        let targetElement = null;

        if (sectionId === 'dashboard') {
            // Per dashboard, scroll all'inizio
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        } else {
            // Trova l'elemento target
            targetElement = document.getElementById(sectionId);
        }

        if (targetElement) {
            // Scroll smooth con offset per navbar
            const yOffset = -140; // Compensazione per navbar e spacing
            const y = targetElement.getBoundingClientRect().top + window.pageYOffset + yOffset;

            window.scrollTo({ top: y, behavior: 'smooth' });
        } else {
            console.warn(`⚠️ Sezione ${sectionId} non trovata`);
        }
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

    logout() {
        if (confirm('Sei sicuro di voler effettuare il logout?')) {
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
    // UTILITY METHODS
    // ==========================================

    getInitials(name) {
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
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

    showNotification(type, message) {
        // Integrazione con sistema notifiche (non corretto)
        if (window.showNotification) {
            window.showNotification(type, message);
        } else {
            // Fallback semplice
            const alertType = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
            alert(`${alertType} ${message}`);
        }
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
                        <i class="fas fa-sync-alt"></i>
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
                            <i class="fas fa-sync-alt"></i>
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

console.log('✅ Dashboard module caricato completamente');
console.log('🧪 Funzioni di test disponibili:');
console.log('   📦 testDashboard("customer|staff|admin") - Test dashboard per ruolo');
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
