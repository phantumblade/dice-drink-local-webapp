console.log('🚀 Sistema auth autonomo - v5.0 ELEGANT NOTIFICATIONS');


if (window.SimpleAuth && window.SimpleAuth.isInitialized) {
    console.log('⚠️ SimpleAuth già inizializzato, evito duplicazione');
} else {

// ==========================================
// CONFIGURAZIONE
// ==========================================

const AUTH_CONFIG = {
    API_BASE: '/api/auth',
    STORAGE_KEY: 'authToken',
    REFRESH_KEY: 'refreshToken'
};

// ==========================================
// SISTEMA NOTIFICHE
// ==========================================

class NotificationSystem {
    static show(message, type = 'success', userName = null) {
        // Rimuovi notifiche esistenti
        const existing = document.querySelectorAll('.auth-notification');
        existing.forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `auth-notification ${type}`;

        // Messaggi personalizzati per tema D&D
        const icons = {
            success: 'fas fa-dragon',
            error: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle',
            warning: 'fas fa-exclamation-circle'
        };

        const titles = {
            success: ['Bentornato, Avventuriero!', 'Quest Completata!', 'Benvenuto nella Taverna!'],
            error: ['Ops, qualcosa è andato storto!', 'La magia ha fallito!', 'Errore nell\'incantesimo!'],
            info: ['Informazione importante', 'Avviso per l\'avventuriero', 'Nota dalla taverna'],
            warning: ['Attenzione, avventuriero!', 'Avvertimento magico!', 'Pericolo rilevato!']
        };

        const randomTitle = titles[type][Math.floor(Math.random() * titles[type].length)];

        // Personalizza messaggio per login/register
        let finalMessage = message;
        if (type === 'success' && userName) {
            const welcomeMessages = [
                `L'avventura ti aspetta, ${userName}! 🎲`,
                `Benvenuto nell'arena, ${userName}! ⚔️`,
                `Preparati al divertimento, ${userName}! 🎮`,
                `La taverna è pronta per te, ${userName}! 🍺`,
                `Che le tue partite siano leggendarie, ${userName}! ✨`
            ];
            finalMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
        }

        notification.innerHTML = `
            <div class="notification-header">
                <div class="notification-icon">
                    <i class="${icons[type]}"></i>
                </div>
                <h4 class="notification-title">${randomTitle}</h4>
                <button class="notification-close">×</button>
            </div>
            <p class="notification-message">${finalMessage}</p>
        `;

        document.body.appendChild(notification);

        // Animazione di entrata
        setTimeout(() => notification.classList.add('show'), 100);

        // Auto-hide dopo 5.5 secondi
        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => notification.remove(), 400);
        }, 5500);

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.add('hide');
            setTimeout(() => notification.remove(), 400);
        });

        return notification;
    }

    static showWelcome(userName) {
        if (window.CustomNotifications) {
            const welcomeMessages = [
                `L'avventura ti aspetta, ${userName}! 🎲`,
                `Benvenuto nell'arena, ${userName}! ⚔️`,
                `Preparati al divertimento, ${userName}! 🎮`,
                `La taverna è pronta per te, ${userName}! 🍺`,
                `Che le tue partite siano leggendarie, ${userName}! ✨`
            ];
            const message = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
            window.CustomNotifications.success('Benvenuto!', message, 4000);
        } else {
            this.show('', 'success', userName);
        }
    }

    static showError(message) {
        if (window.CustomNotifications) {
            window.CustomNotifications.error('Errore', message);
        } else {
            this.show(message, 'error');
        }
    }

    static showInfo(message) {
        if (window.CustomNotifications) {
            window.CustomNotifications.info('Informazione', message);
        } else {
            this.show(message, 'info');
        }
    }

    static showLogout() {
        if (window.CustomNotifications) {
            window.CustomNotifications.success('Logout Effettuato', 'Arrivederci, avventuriero! Torna presto per nuove quest! 👋');
        } else {
            this.show('Arrivederci, avventuriero! Torna presto per nuove quest! 👋', 'info');
        }
    }
}

// ==========================================
// GESTORE AUTENTICAZIONE PRINCIPALE
// ==========================================

window.SimpleAuth = {
    isAuthenticated: false,
    currentUser: null,
    isInitialized: false,
    currentModal: null,

    async init() {
        if (this.isInitialized) {
            console.log('⚠️ SimpleAuth già inizializzato, skip');
            return;
        }

        console.log('🔧 Inizializzazione SimpleAuth...');
        this.isInitialized = true;
        await this.checkAuthStatus();
        this.setupProfileIcon();
    },

    async checkAuthStatus() {
        const token = localStorage.getItem(AUTH_CONFIG.STORAGE_KEY);

        try {
            if (!token) {
                this.isAuthenticated = false;
                this.updateUI();
                return;
            }

            const response = await fetch(`${AUTH_CONFIG.API_BASE}/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.isAuthenticated = true;
                this.currentUser = data.user;
                console.log('✅ Utente autenticato:', this.currentUser.email);
                this.updateUI();
                // Dispatch login event to notify other modules
                document.dispatchEvent(new CustomEvent('userLoggedIn', { detail: this.currentUser }));
            } else {
                await this.logout();
            }
        } catch (error) {
            console.error('❌ Errore verifica auth:', error);
            await this.logout();
        } finally {
            // Signal that the authentication check is complete
            console.log('🚀 Dispatching authStatusReady event');
            document.dispatchEvent(new CustomEvent('authStatusReady', {
                detail: {
                    isAuthenticated: this.isAuthenticated,
                    currentUser: this.currentUser
                }
            }));
        }
    },

    updateUI() {
        const profileIcon = document.querySelector('.navbar-profile-icon');
        if (profileIcon) {
            if (this.isAuthenticated) {
                profileIcon.style.color = '#4CAF50';
                profileIcon.title = `Loggato come ${this.currentUser?.first_name || 'Utente'}`;

                // Carica avatar nella navbar dopo un breve delay
                setTimeout(() => {
                    this.updateNavbarProfileButton();
                }, 300);
            } else {
                profileIcon.style.color = '';
                profileIcon.title = 'Clicca per accedere';
                // Ripristina l'icona originale per il logout
                profileIcon.innerHTML = '';
                profileIcon.textContent = 'person_add';
            }
        }
    },

    setupProfileIcon() {
        let attempts = 0;
        const maxAttempts = 10;

        const findAndSetupIcon = () => {
            const profileIcon = document.querySelector('.navbar-profile-icon');

            if (profileIcon) {
                profileIcon.style.cursor = 'pointer';
                profileIcon.removeEventListener('click', this.handleProfileClick.bind(this));
                profileIcon.addEventListener('click', this.handleProfileClick.bind(this));

                console.log('✅ Icona profilo collegata');
                this.updateUI();
                return true;
            }

            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(findAndSetupIcon, 500);
            } else {
                console.warn('⚠️ Icona profilo non trovata dopo', maxAttempts, 'tentativi');
            }
            return false;
        };

        findAndSetupIcon();
    },

    handleProfileClick(e) {
        e.preventDefault();
        e.stopPropagation();

        console.log('👤 Click su profilo - stato:', this.isAuthenticated);

        if (this.isAuthenticated) {
            this.showUserMenu();
        } else {
            this.showLoginModal();
        }
    },

    showUserMenu() {
        const userName = this.currentUser?.first_name || this.currentUser?.email || 'Utente';

        // Crea menu elegante invece di prompt
        const existingMenu = document.querySelector('.user-menu-overlay');
        if (existingMenu) existingMenu.remove();

        const menuOverlay = document.createElement('div');
        menuOverlay.className = 'user-menu-overlay';

        menuOverlay.innerHTML = `
            <div class="user-menu">
                <div class="user-menu-header">
                    <div class="user-avatar" id="user-menu-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="user-info">
                        <h3>Ciao ${userName}!</h3>
                        <p>${this.currentUser?.email || ''}</p>
                    </div>
                    <button class="user-menu-close">×</button>
                </div>
                <div class="user-menu-options">
                    <button class="user-menu-option" data-action="profile">
                        <i class="fas fa-user"></i>
                        <span>Visualizza Profilo</span>
                    </button>
                    <button class="user-menu-option" data-action="bookings">
                        <i class="fas fa-calendar"></i>
                        <span>Le Mie Prenotazioni</span>
                    </button>
                    <button class="user-menu-option logout" data-action="logout">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(menuOverlay);
        setTimeout(() => menuOverlay.classList.add('show'), 10);

        // Carica avatar utente nel menu
        this.loadUserMenuAvatar();

        // Event listeners
        menuOverlay.addEventListener('click', (e) => {
            if (e.target === menuOverlay) this.closeUserMenu();
        });

        menuOverlay.querySelector('.user-menu-close').addEventListener('click', () => {
            this.closeUserMenu();
        });

        menuOverlay.querySelectorAll('.user-menu-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.closeUserMenu();

                switch(action) {
                    case 'profile':
                        this.showProfile();
                        break;
                    case 'bookings':
                        this.showBookings();
                        break;
                    case 'logout':
                        this.logout();
                        break;
                }
            });
        });
    },

    closeUserMenu() {
        const menu = document.querySelector('.user-menu-overlay');
        if (menu) {
            menu.classList.remove('show');
            setTimeout(() => menu.remove(), 300);
        }
    },

showProfile() {
    console.log('📱 Apertura dashboard da menu utente...');
    window.showPage('dashboard');
},

    showBookings() {
        console.log('📋 Navigazione alla pagina prenotazioni utente...');

        // Carica direttamente il modulo - approccio più semplice e affidabile
        this.loadBookingsPage();
    },

    async loadBookingsPage() {
        try {
            console.log('🔄 Caricamento modulo prenotazioni...');

            // Cambia l'URL senza ricaricare la pagina
            if (window.history && window.history.pushState) {
                window.history.pushState({}, '', '/prenotazioni-utente');
            }

            // Cambia il titolo della pagina
            document.title = 'Le Mie Prenotazioni - Dice & Drink';

            // Importa e carica il modulo
            const module = await import('./pages/user-bookings.js');
            await module.showUserBookings();

            console.log('✅ Pagina prenotazioni caricata con successo');

        } catch (error) {
            console.error('❌ Errore caricamento pagina prenotazioni:', error);

            // Mostra errore user-friendly
            let content = document.getElementById('content');

            // Fallback: se #content non esiste, prova a crearlo
            if (!content) {
                const app = document.getElementById('app');
                if (app) {
                    content = document.createElement('div');
                    content.id = 'content';
                    content.classList.add('main-content');
                    app.appendChild(content);
                    console.log('✅ Container #content creato come fallback in auth-system');
                }
            }

            if (content) {
                content.innerHTML = `
                    <div class="error-page" style="
                        min-height: calc(100vh - 160px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 2rem;
                        text-align: center;
                    ">
                        <div class="error-content" style="
                            background: white;
                            padding: 3rem 2rem;
                            border-radius: 16px;
                            border: 2px solid var(--color-text);
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                            max-width: 500px;
                        ">
                            <i class="fas fa-exclamation-triangle" style="
                                font-size: 3rem;
                                color: #e74c3c;
                                margin-bottom: 1rem;
                            "></i>
                            <h2 style="color: var(--color-text); margin-bottom: 1rem;">Errore di Caricamento</h2>
                            <p style="color: var(--color-text); opacity: 0.8; margin-bottom: 2rem;">
                                Si è verificato un errore nel caricamento della pagina prenotazioni.
                            </p>
                            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                                <button onclick="window.SimpleAuth.loadBookingsPage()" style="
                                    padding: 1rem 2rem;
                                    background: var(--color-primary);
                                    color: white;
                                    border: 2px solid var(--color-text);
                                    border-radius: 8px;
                                    cursor: pointer;
                                    font-weight: bold;
                                    box-shadow: 3px 3px 0 var(--color-text);
                                ">
                                    <i class="fas fa-redo"></i> Riprova
                                </button>
                                <a href="/" style="
                                    padding: 1rem 2rem;
                                    background: var(--color-background);
                                    color: var(--color-primary);
                                    border: 2px solid var(--color-text);
                                    border-radius: 8px;
                                    text-decoration: none;
                                    font-weight: bold;
                                    box-shadow: 3px 3px 0 var(--color-text);
                                ">
                                    <i class="fas fa-home"></i> Torna alla Home
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    },

    showLoginModal() {
        console.log('🔑 Apertura modale di login');

        if (this.currentModal) {
            console.log('⚠️ Modal già aperto, lo chiudo prima di aprirne uno nuovo');
            this.currentModal.hide();
            this.currentModal = null;
        }

        const existingModals = document.querySelectorAll('.auth-modal-overlay');
        existingModals.forEach(modal => {
            console.log('🧹 Rimuovo modal orfano dal DOM');
            modal.remove();
        });

        try {
            this.currentModal = new AuthModal(this);
            this.currentModal.show();
        } catch (error) {
            console.error('❌ Errore apertura modale:', error);
            this.currentModal = null;
            NotificationSystem.showError('Errore apertura login. Riprova.');
        }
    },

    loginDemo() {
        const demoToken = 'demo_token_' + Date.now();
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEY, demoToken);
        localStorage.setItem(AUTH_CONFIG.REFRESH_KEY, 'demo_refresh_' + Date.now());

        this.isAuthenticated = true;
        this.currentUser = {
            id: 999,
            first_name: 'Demo',
            last_name: 'User',
            email: 'demo@dicedrink.com',
            role: 'customer'
        };

        this.updateUI();
        NotificationSystem.showWelcome('Demo');
        console.log('✅ Demo login attivato');
    },

    async login(email, password, rememberMe = false) {
        console.log('🔄 Tentativo login per:', email);

        try {
            const response = await fetch(`${AUTH_CONFIG.API_BASE}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, rememberMe })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                localStorage.setItem(AUTH_CONFIG.STORAGE_KEY, result.tokens.accessToken);
                localStorage.setItem(AUTH_CONFIG.REFRESH_KEY, result.tokens.refreshToken);

                this.isAuthenticated = true;
                this.currentUser = result.user;
                this.updateUI();

                console.log('✅ Login riuscito:', this.currentUser.email);
                NotificationSystem.showWelcome(this.currentUser.first_name || this.currentUser.email);

                return { success: true, user: this.currentUser };
            } else {
                throw new Error(result.message || 'Errore durante il login');
            }
        } catch (error) {
            console.error('❌ Errore login:', error);
            return { success: false, error: error.message };
        }
    },

    async register(userData) {
        console.log('🔄 Tentativo registrazione per:', userData.email);

        try {
            const response = await fetch(`${AUTH_CONFIG.API_BASE}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                if (result.tokens) {
                    localStorage.setItem(AUTH_CONFIG.STORAGE_KEY, result.tokens.accessToken);
                    localStorage.setItem(AUTH_CONFIG.REFRESH_KEY, result.tokens.refreshToken);

                    this.isAuthenticated = true;
                    this.currentUser = result.user;
                    this.updateUI();

                    NotificationSystem.showWelcome(result.user.first_name);
                    return { success: true, user: this.currentUser, autoLogin: true };
                } else {
                    NotificationSystem.showInfo('Registrazione completata! Controlla la tua email per verificare l\'account.');
                    return { success: true, emailVerificationRequired: true };
                }
            } else {
                throw new Error(result.message || 'Errore durante la registrazione');
            }
        } catch (error) {
            console.error('❌ Errore registrazione:', error);
            return { success: false, error: error.message };
        }
    },

    async logout() {
        console.log('🔄 Logout in corso...');

        try {
            const token = localStorage.getItem(AUTH_CONFIG.STORAGE_KEY);
            const refreshToken = localStorage.getItem(AUTH_CONFIG.REFRESH_KEY);

            if (token) {
                await fetch(`${AUTH_CONFIG.API_BASE}/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ refreshToken })
                });
            }
        } catch (error) {
            console.error('❌ Errore logout:', error);
        } finally {
            localStorage.removeItem(AUTH_CONFIG.STORAGE_KEY);
            localStorage.removeItem(AUTH_CONFIG.REFRESH_KEY);
            this.isAuthenticated = false;
            this.currentUser = null;
            this.updateUI();

            console.log('✅ Logout completato');
            NotificationSystem.showLogout();

            // Redirect automatico alla home se si è in una pagina riservata
            this.redirectToHomeIfRestricted();
        }
    },

    redirectToHomeIfRestricted() {
        const currentPath = window.location.pathname;
        const restrictedPaths = ['/prenotazioni-utente', '/dashboard', '/profile'];

        if (restrictedPaths.includes(currentPath)) {
            console.log('🏠 Redirect automatico alla home dopo logout da pagina riservata');

            // Usa Page.js se disponibile, altrimenti window.location
            if (window.page) {
                window.page('/');
            } else {
                window.location.href = '/';
            }
        }
    },

    onModalClosed() {
        this.currentModal = null;
        console.log('🧹 Modal chiuso e riferimento pulito');
    },

    // ==========================================
    // GESTIONE AVATAR MENU UTENTE
    // ==========================================

    async loadUserMenuAvatar() {
        const avatarContainer = document.getElementById('user-menu-avatar');
        if (!avatarContainer || !this.currentUser?.id) return;

        try {
            const response = await fetch(`/api/users/${this.currentUser.id}/avatar`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                const avatarUrl = result.avatarUrl || '/images/avatars/default.png';
                const cacheBuster = `?t=${Date.now()}`;

                avatarContainer.innerHTML = `
                    <img src="${avatarUrl}${cacheBuster}"
                         alt="Avatar profilo"
                         style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover;" />
                `;

                console.log('✅ Avatar menu utente aggiornato:', avatarUrl);
            }
        } catch (error) {
            console.error('❌ Errore caricamento avatar menu:', error);
        }
    },

    async updateNavbarProfileButton() {
        const profileButton = document.getElementById('navbar-profile-button');
        if (!profileButton || !this.currentUser?.id) return;

        try {
            const response = await fetch(`/api/users/${this.currentUser.id}/avatar`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                const avatarUrl = result.avatarUrl || '/images/avatars/default.png';
                const cacheBuster = `?t=${Date.now()}`;

                // Sostituisce l'icona con l'immagine avatar
                profileButton.innerHTML = `
                    <img src="${avatarUrl}${cacheBuster}"
                         alt="Il tuo profilo"
                         style="width: 46px; height: 46px; border-radius: 50%; object-fit: cover; border: 2px solid var(--color-primary);" />
                `;

                profileButton.title = 'Il tuo profilo';
                console.log('✅ Avatar navbar aggiornato:', avatarUrl);
            }
        } catch (error) {
            console.error('❌ Errore aggiornamento avatar navbar:', error);
        }
    }
};

// ==========================================
// CLASSE MODALE GRAFICA
// ==========================================

class AuthModal {
    constructor(authManager) {
        this.authManager = authManager;
        this.modal = null;
        this.isLoginMode = false; // Inizia con registrazione
    }

    show() {
        const existingModal = document.querySelector('.auth-modal-overlay');
        if (existingModal) {
            console.log('⚠️ Modal esistente trovato, lo rimuovo');
            existingModal.remove();
        }

        this.createModal();
        document.body.appendChild(this.modal);

        this.modal.offsetHeight;

        setTimeout(() => {
            this.modal.classList.add('active');
        }, 10);

        setTimeout(() => {
            const firstInput = this.modal.querySelector('input[type="text"], input[type="email"]');
            if (firstInput) firstInput.focus();
        }, 150);

        document.body.style.overflow = 'hidden';

        console.log('✅ Modal mostrato correttamente');
    }

    hide() {
        if (this.modal) {
            this.modal.classList.remove('active');

            setTimeout(() => {
                if (this.modal && this.modal.parentNode) {
                    this.modal.parentNode.removeChild(this.modal);
                    console.log('🧹 Modal rimosso dal DOM');
                }
                document.body.style.overflow = 'auto';

                if (this.authManager && this.authManager.onModalClosed) {
                    this.authManager.onModalClosed();
                }
            }, 300);
        }
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'auth-modal-overlay';

        this.modal.innerHTML = `
            <div class="auth-modal">
                <button class="auth-modal-close" type="button">×</button>

                <!-- SEZIONE SINISTRA: CARD CON LOGO -->
                <div class="auth-modal-left">
                    <div class="image-wrapper">
                        <img src="/assets/Logo.png"
                             alt="Dice&Drink Logo"
                             class="background-img"
                             onerror="this.style.display='none'; this.parentNode.classList.add('no-image');" />
                        <div class="overlay-text">
                            <h2 class="logo">Dice&Drink</h2>
                            <p class="caption">Identificati avventuriero!</p>
                        </div>
                    </div>
                </div>

                <!-- SEZIONE DESTRA: FORM -->
                <div class="auth-modal-right">
                    <div class="auth-form-container">
                        <h2 class="form-title" id="form-title">Crea account</h2>
                        <p class="form-subtitle" id="form-subtitle">
                            <span id="form-subtitle-text">Hai già un account?</span>
                            <a href="#" class="toggle-link" id="toggle-link">Log in</a>
                        </p>

                        <!-- FORM REGISTRAZIONE -->
                        <form class="auth-form active" id="register-form">
                            <div class="form-row">
                                <input type="text" class="form-input" id="register-firstName" placeholder="Nome" required>
                                <input type="text" class="form-input" id="register-lastName" placeholder="Cognome" required>
                            </div>

                            <input type="email" class="form-input" id="register-email" placeholder="Email" required>
                            <input type="password" class="form-input" id="register-password" placeholder="Inserisci la password" required>

                            <div class="checkbox-container">
                                <input type="checkbox" id="terms-checkbox" required>
                                <label for="terms-checkbox">Accetto i <a href="#">Termini e Condizioni</a></label>
                            </div>

                            <div id="register-error" class="error-message"></div>

                            <button type="submit" class="auth-button primary" id="register-submit">
                                Crea account
                            </button>

                            <div class="divider">
                                <span>Oppure registrati con</span>
                            </div>

                            <div class="social-buttons">
                                <button type="button" class="auth-button social google">
                                    <i class="fab fa-google"></i>
                                    Google
                                </button>
                                <button type="button" class="auth-button social apple">
                                    <i class="fab fa-apple"></i>
                                    Apple
                                </button>
                            </div>
                        </form>

                        <!-- FORM LOGIN -->
                        <form class="auth-form" id="login-form">
                            <input type="email" class="form-input" id="login-email" placeholder="Email" required>
                            <input type="password" class="form-input" id="login-password" placeholder="Password" required>

                            <div class="checkbox-container">
                                <input type="checkbox" id="remember-me">
                                <label for="remember-me">Ricordami per 30 giorni</label>
                            </div>

                            <div id="login-error" class="error-message"></div>

                            <button type="submit" class="auth-button primary" id="login-submit">
                                Accedi
                            </button>

                            <button type="button" class="auth-button demo" id="demo-login">
                                🎮 Demo Login
                            </button>

                            <div class="divider">
                                <span>Oppure accedi con</span>
                            </div>

                            <div class="social-buttons">
                                <button type="button" class="auth-button social google">
                                    <i class="fab fa-google"></i>
                                    Google
                                </button>
                                <button type="button" class="auth-button social apple">
                                    <i class="fab fa-apple"></i>
                                    Apple
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        this.setupModalEvents();
    }

    setupModalEvents() {
        // Toggle between login/register
        const toggleLink = this.modal.querySelector('#toggle-link');
        const formTitle = this.modal.querySelector('#form-title');
        const formSubtitleText = this.modal.querySelector('#form-subtitle-text');
        const loginForm = this.modal.querySelector('#login-form');
        const registerForm = this.modal.querySelector('#register-form');

        toggleLink.addEventListener('click', (e) => {
            e.preventDefault();

            if (this.isLoginMode) {
                // Switch to register
                formTitle.textContent = 'Crea account';
                formSubtitleText.textContent = 'Hai già un account?';
                toggleLink.textContent = 'Log in';
                loginForm.classList.remove('active');
                registerForm.classList.add('active');
                this.isLoginMode = false;
            } else {
                // Switch to login
                formTitle.textContent = 'Bentornato!';
                formSubtitleText.textContent = 'Non hai un account?';
                toggleLink.textContent = 'Registrati';
                registerForm.classList.remove('active');
                loginForm.classList.add('active');
                this.isLoginMode = true;
            }
        });

        // Close button
        const closeBtn = this.modal.querySelector('.auth-modal-close');
        closeBtn.addEventListener('click', () => this.hide());

        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        // Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.hide();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Demo login
        const demoBtn = this.modal.querySelector('#demo-login');
        if (demoBtn) {
            demoBtn.addEventListener('click', () => {
                this.hide();
                this.authManager.loginDemo();
            });
        }

        // Form submissions
        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }

    async handleLogin(e) {
        e.preventDefault();

        const submitBtn = this.modal.querySelector('#login-submit');
        const errorDiv = this.modal.querySelector('#login-error');
        const email = this.modal.querySelector('#login-email').value;
        const password = this.modal.querySelector('#login-password').value;
        const rememberMe = this.modal.querySelector('#remember-me').checked;

        errorDiv.textContent = '';
        errorDiv.classList.remove('show');

        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.textContent = 'Accesso in corso...';

        try {
            const result = await this.authManager.login(email, password, rememberMe);

            if (result.success) {
                this.hide();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.add('show');
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            submitBtn.textContent = originalText;
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        const submitBtn = this.modal.querySelector('#register-submit');
        const errorDiv = this.modal.querySelector('#register-error');
        const firstName = this.modal.querySelector('#register-firstName').value;
        const lastName = this.modal.querySelector('#register-lastName').value;
        const email = this.modal.querySelector('#register-email').value;
        const password = this.modal.querySelector('#register-password').value;
        const termsAccepted = this.modal.querySelector('#terms-checkbox').checked;

        errorDiv.textContent = '';
        errorDiv.classList.remove('show');

        if (!firstName || !lastName) {
            errorDiv.textContent = 'Nome e cognome sono obbligatori';
            errorDiv.classList.add('show');
            return;
        }

        if (password.length < 6) {
            errorDiv.textContent = 'La password deve essere di almeno 6 caratteri';
            errorDiv.classList.add('show');
            return;
        }

        if (!termsAccepted) {
            errorDiv.textContent = 'Devi accettare i Termini e Condizioni';
            errorDiv.classList.add('show');
            return;
        }

        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.textContent = 'Registrazione...';

        try {
            const userData = { firstName, lastName, email, password };
            const result = await this.authManager.register(userData);

            if (result.success) {
                this.hide();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.add('show');
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            submitBtn.textContent = originalText;
        }
    }
}

// ==========================================
// AUTO-INIZIALIZZAZIONE PROTETTA
// ==========================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.SimpleAuth && !window.SimpleAuth.isInitialized) {
            window.SimpleAuth.init();
        }
    });
} else {
    if (window.SimpleAuth && !window.SimpleAuth.isInitialized) {
        window.SimpleAuth.init();
    }
}

console.log('✅ Sistema auth autonomo caricato - v5.0 ELEGANT NOTIFICATIONS');

}
