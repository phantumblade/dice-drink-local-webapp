// public/js/auth-system.js - GAMING STYLE VERSION
// Sistema di autenticazione con design gaming/pixel art

console.log('🚀 Sistema auth autonomo - v3.3 GAMING STYLE');

// ==========================================
// CONTROLLO DUPLICAZIONE
// ==========================================

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

        if (!token) {
            this.isAuthenticated = false;
            this.updateUI();
            return;
        }

        try {
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
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('❌ Errore verifica auth:', error);
            this.logout();
        }
    },

    updateUI() {
        const profileIcon = document.querySelector('.navbar-profile-icon');
        if (profileIcon) {
            if (this.isAuthenticated) {
                profileIcon.style.color = '#4CAF50';
                profileIcon.title = `Loggato come ${this.currentUser?.first_name || 'Utente'}`;
            } else {
                profileIcon.style.color = '';
                profileIcon.title = 'Clicca per accedere';
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

        const menuText = [
            `👋 Ciao ${userName}!`,
            '',
            'Cosa vuoi fare?',
            '',
            '1️⃣ Visualizza Profilo',
            '2️⃣ Le Mie Prenotazioni',
            '3️⃣ Logout',
            '❌ Annulla'
        ].join('\n');

        const choice = prompt(menuText + '\n\nScegli un\'opzione (1-3):');

        switch(choice) {
            case '1':
                this.showProfile();
                break;
            case '2':
                this.showBookings();
                break;
            case '3':
                this.logout();
                break;
            default:
                console.log('Menu utente chiuso');
        }
    },

    showProfile() {
        const user = this.currentUser;
        const profileInfo = [
            '👤 IL TUO PROFILO',
            '',
            `📧 Email: ${user.email}`,
            `👤 Nome: ${user.first_name} ${user.last_name}`,
            `🎭 Ruolo: ${user.role}`,
            '',
            'Profilo caricato con successo! 🎉'
        ].join('\n');

        alert(profileInfo);
    },

    showBookings() {
        alert('📅 LE TUE PRENOTAZIONI\n\n🔄 Caricamento prenotazioni...\n\n(Funzionalità in sviluppo)\n\nProssimamente potrai vedere:\n• Prenotazioni attive\n• Storico prenotazioni\n• Modifica/cancella prenotazioni');
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
            this.showSimpleLoginMenu();
        }
    },

    showSimpleLoginMenu() {
        const options = [
            '🔑 ACCESSO ACCOUNT',
            '',
            '1️⃣ Login Rapido',
            '2️⃣ Registrazione',
            '3️⃣ Login Demo',
            '❌ Annulla'
        ];

        const choice = prompt(options.join('\n') + '\n\nScegli un\'opzione (1-3):');

        switch(choice) {
            case '1':
                this.showQuickLogin();
                break;
            case '2':
                this.showQuickRegister();
                break;
            case '3':
                this.loginDemo();
                break;
            default:
                console.log('Login annullato');
        }
    },

    showQuickLogin() {
        const email = prompt('🔑 LOGIN RAPIDO\n\n📧 Inserisci email:');
        if (!email) return;

        const password = prompt('🔑 LOGIN RAPIDO\n\n🔒 Inserisci password:');
        if (!password) return;

        this.login(email, password);
    },

    showQuickRegister() {
        const firstName = prompt('📝 REGISTRAZIONE\n\n👤 Nome:');
        if (!firstName) return;

        const lastName = prompt('📝 REGISTRAZIONE\n\n👤 Cognome:');
        if (!lastName) return;

        const email = prompt('📝 REGISTRAZIONE\n\n📧 Email:');
        if (!email) return;

        const password = prompt('📝 REGISTRAZIONE\n\n🔒 Password (min 6 caratteri):');
        if (!password || password.length < 6) {
            alert('❌ Password troppo corta (minimo 6 caratteri)');
            return;
        }

        this.register({ firstName, lastName, email, password });
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
        alert('✅ Login demo completato!\n\nBenvenuto Demo User!\n\n🎮 Ora sei loggato e puoi esplorare le funzionalità.');
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
                alert(`✅ Benvenuto ${this.currentUser.first_name || this.currentUser.email}!`);

                return { success: true, user: this.currentUser };
            } else {
                throw new Error(result.message || 'Errore durante il login');
            }
        } catch (error) {
            console.error('❌ Errore login:', error);
            alert(`❌ Errore login: ${error.message}`);
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

                    alert(`✅ Registrazione completata!\nBenvenuto ${result.user.first_name}!`);

                    return { success: true, user: this.currentUser, autoLogin: true };
                } else {
                    alert('✅ Registrazione completata!\nControlla la tua email per verificare l\'account.');
                    return { success: true, emailVerificationRequired: true };
                }
            } else {
                throw new Error(result.message || 'Errore durante la registrazione');
            }
        } catch (error) {
            console.error('❌ Errore registrazione:', error);
            alert(`❌ Errore registrazione: ${error.message}`);
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
            alert('👋 Logout completato!');
        }
    },

    onModalClosed() {
        this.currentModal = null;
        console.log('🧹 Modal chiuso e riferimento pulito');
    }
};

// ==========================================
// CLASSE MODALE GRAFICA - GAMING STYLE
// ==========================================

class AuthModal {
    constructor(authManager) {
        this.authManager = authManager;
        this.modal = null;
        this.isLoginMode = true;
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
            const firstInput = this.modal.querySelector('input[type="email"]');
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
            <div class="auth-modal gaming-style">
                <!-- SEZIONE SINISTRA: GAMING/PIXEL ART -->
                <div class="auth-modal-left">
                    <div class="gaming-background">
                        <div class="pixel-dice-container">
                            <div class="pixel-dice">
                                <div class="dice-face dice-face-1"></div>
                                <div class="dice-face dice-face-2"></div>
                                <div class="dice-face dice-face-3"></div>
                                <div class="dice-character">🎮</div>
                            </div>
                        </div>
                        <h2 class="gaming-title">Dice&Drink</h2>
                        <p class="gaming-subtitle">Identificati avventuriero!</p>
                    </div>
                </div>

                <!-- SEZIONE DESTRA: FORM -->
                <div class="auth-modal-right">
                    <button class="auth-modal-close" type="button">×</button>

                    <div class="auth-form-container">
                        <h2 class="form-title" id="form-title">Crea account</h2>
                        <p class="form-subtitle">
                            <span id="form-subtitle">Hai già un account?</span>
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
                                <label for="terms-checkbox">Accetto i Termini e Condizioni</label>
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
                                    <span class="social-icon">G</span>
                                    Google
                                </button>
                                <button type="button" class="auth-button social apple">
                                    <span class="social-icon">🍎</span>
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
        const formSubtitle = this.modal.querySelector('#form-subtitle');
        const loginForm = this.modal.querySelector('#login-form');
        const registerForm = this.modal.querySelector('#register-form');

        toggleLink.addEventListener('click', (e) => {
            e.preventDefault();

            if (this.isLoginMode) {
                // Switch to register
                formTitle.textContent = 'Crea account';
                formSubtitle.textContent = 'Hai già un account?';
                toggleLink.textContent = 'Log in';
                loginForm.classList.remove('active');
                registerForm.classList.add('active');
                this.isLoginMode = false;
            } else {
                // Switch to login
                formTitle.textContent = 'Bentornato!';
                formSubtitle.textContent = 'Non hai un account?';
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
        demoBtn.addEventListener('click', () => {
            this.hide();
            this.authManager.loginDemo();
        });

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

console.log('✅ Sistema auth autonomo caricato - v3.3 GAMING STYLE');

} 
