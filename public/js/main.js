// ==========================================
// MAIN.JS - APP ENTRY POINT & ROUTER + AUTH SYSTEM
// ==========================================
//
// SCOPO:
// - Setup iniziale dell'applicazione SPA
// - Gestione routing client-side tra pagine
// - Configurazione layout fisso (navbar + footer)
// - Sistema di autenticazione integrato
// - Gestione ruoli utente e icone dinamiche
// - Orchestrazione generale dell'app

import { createNavbar } from './components/navbar.js';
import { buildFooter } from './components/footer.js';
import { showHomepage } from './pages/homepage.js';
import { showCatalog } from './pages/catalog.js';
import { showBookings } from './pages/bookings.js';
// ==========================================
// SISTEMA RUOLI E ICONE UTENTE
// ==========================================

const ROLE_ICONS = {
    guest: {
        icon: 'person_add',
        color: '#999',
        title: 'Clicca per accedere',
        bgColor: 'white'
    },
    customer: {
        icon: 'person',
        color: '#4CAF50',
        title: 'Profilo Cliente',
        bgColor: 'white'
    },
    staff: {
        icon: 'badge',
        color: '#FF9800',
        title: 'Staff - Pannello Gestione',
        bgColor: 'white'
    },
    admin: {
        icon: 'admin_panel_settings',
        color: '#F44336',
        title: 'Admin - Controllo Totale',
        bgColor: 'white'
    }
};

// ==========================================
// GESTORE RUOLI UTENTE
// ==========================================

class UserRoleManager {
    constructor() {
        this.currentRole = 'guest';
        this.currentUser = null;
        this.profileIcon = null;
    }

    init() {
        console.log('🎭 Inizializzazione UserRoleManager...');
        this.findProfileIcon();
        this.setupEventListeners();
        this.updateIconForCurrentState();
        console.log('✅ UserRoleManager inizializzato');
    }

    findProfileIcon() {
        this.profileIcon = document.querySelector('.navbar-profile-icon');
        if (this.profileIcon) {
            console.log('✅ Icona profilo trovata');
        } else {
            console.warn('⚠️ Icona profilo non trovata');
        }
    }

    setupEventListeners() {
        // Integrazione con SimpleAuth se disponibile
        if (window.SimpleAuth) {
            const originalUpdateUI = window.SimpleAuth.updateUI;
            window.SimpleAuth.updateUI = () => {
                originalUpdateUI.call(window.SimpleAuth);
                this.syncWithSimpleAuth();
            };
        }

        // Eventi personalizzati
        document.addEventListener('userLoggedIn', (e) => {
            this.setUserRole(e.detail.role, e.detail);
        });

        document.addEventListener('userLoggedOut', () => {
            this.setUserRole('guest', null);
        });
    }

    syncWithSimpleAuth() {
        if (window.SimpleAuth?.isAuthenticated && window.SimpleAuth.currentUser) {
            const user = window.SimpleAuth.currentUser;
            this.setUserRole(user.role, user);
        } else {
            this.setUserRole('guest', null);
        }
    }

    setUserRole(role, user = null) {
        console.log('🎭 Cambio ruolo:', this.currentRole, '->', role);

        this.currentRole = role;
        this.currentUser = user;
        this.updateProfileIcon();
    }

    updateProfileIcon() {
        if (!this.profileIcon) return;

        const config = ROLE_ICONS[this.currentRole] || ROLE_ICONS.guest;

        // Aggiorna icona
        this.profileIcon.textContent = config.icon;
        this.profileIcon.style.color = config.color;
        this.profileIcon.style.backgroundColor = config.bgColor;

        // Aggiorna tooltip
        let title = config.title;
        if (this.currentUser?.first_name) {
            title = `${title} - ${this.currentUser.first_name}`;
        }
        this.profileIcon.title = title;

        // Aggiorna classe CSS
        this.profileIcon.className = this.profileIcon.className
            .replace(/role-\w+/g, '') + ` role-${this.currentRole}`;

        // Animazione
        this.profileIcon.style.transform = 'scale(1.1)';
        setTimeout(() => {
            this.profileIcon.style.transform = 'scale(1)';
        }, 200);

        console.log(`✅ Icona aggiornata per ruolo: ${this.currentRole}`);
    }

    updateIconForCurrentState() {
        if (window.SimpleAuth?.isAuthenticated) {
            this.syncWithSimpleAuth();
        } else {
            this.setUserRole('guest', null);
        }
    }

    getCurrentRole() {
        return this.currentRole;
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// ==========================================
// TESTER ROTTE AUTENTICAZIONE
// ==========================================

class AuthRouteTester {
    constructor() {
        this.testResults = [];
        this.API_BASE = '/api/auth';
    }

    async testLogin(email, password) {
        console.log(`🧪 Test login per: ${email}`);

        try {
            const response = await fetch(`${this.API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, rememberMe: false })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ Login riuscito:', result);

                // Aggiorna SimpleAuth
                if (window.SimpleAuth) {
                    window.SimpleAuth.isAuthenticated = true;
                    window.SimpleAuth.currentUser = result.user;
                    window.SimpleAuth.updateUI();
                }

                // Dispatch evento
                document.dispatchEvent(new CustomEvent('userLoggedIn', {
                    detail: result.user
                }));

                return { success: true, user: result.user, tokens: result.tokens };
            } else {
                throw new Error(result.message || 'Errore login');
            }

        } catch (error) {
            console.error('❌ Errore login:', error);
            return { success: false, error: error.message };
        }
    }

    async testRegistration(userData) {
        console.log('🧪 Test registrazione...');

        try {
            const response = await fetch(`${this.API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ Registrazione riuscita:', result);
                return { success: true, user: result.user, tokens: result.tokens };
            } else {
                throw new Error(result.message || 'Errore registrazione');
            }

        } catch (error) {
            console.error('❌ Errore registrazione:', error);
            return { success: false, error: error.message };
        }
    }

    async testLogout() {
        console.log('🧪 Test logout...');

        try {
            const token = localStorage.getItem('authToken');
            const refreshToken = localStorage.getItem('refreshToken');

            if (token) {
                await fetch(`${this.API_BASE}/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ refreshToken })
                });
            }

            // Pulisci storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');

            // Aggiorna SimpleAuth
            if (window.SimpleAuth) {
                window.SimpleAuth.isAuthenticated = false;
                window.SimpleAuth.currentUser = null;
                window.SimpleAuth.updateUI();
            }

            // Dispatch evento
            document.dispatchEvent(new CustomEvent('userLoggedOut'));

            console.log('✅ Logout completato');
            return { success: true };

        } catch (error) {
            console.error('❌ Errore logout:', error);
            return { success: false, error: error.message };
        }
    }

    // Test rapidi per demo
    async quickLoginDemo(userType = 'customer') {
        const testUsers = {
            demo: null, // Usa SimpleAuth demo
            customer: {
                email: 'customer@diceanddrink.com',
                password: 'CustomerDemo2025!'
            },
            staff: {
                email: 'staff@diceanddrink.com',
                password: 'StaffDemo2025!'
            },
            admin: {
                email: 'admin@diceanddrink.com',
                password: 'DiceAndDrink2025!'
            }
        };

        if (userType === 'demo' && window.SimpleAuth) {
            window.SimpleAuth.loginDemo();
            return { success: true, type: 'demo' };
        }

        const testUser = testUsers[userType];
        if (!testUser) {
            return { success: false, error: 'Tipo utente non supportato' };
        }

        return await this.testLogin(testUser.email, testUser.password);
    }

    async testRoleIcons() {
        console.log('🎭 Test icone ruoli...');
        const roles = ['guest', 'customer', 'staff', 'admin'];

        for (const role of roles) {
            console.log(`Testando icona per ruolo: ${role}`);
            this.testUserRole(role);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        this.testUserRole('guest');
        console.log('✅ Test icone ruoli completato');
    }

    testUserRole(role) {
        const testUser = {
            id: 999,
            first_name: 'Test',
            last_name: 'User',
            email: `test.${role}@dicedrink.com`,
            role: role
        };

        window.userRoleManager.setUserRole(role, role !== 'guest' ? testUser : null);
    }
}

// ==========================================
// GESTORE INTEGRAZIONE AUTH
// ==========================================

class AuthIntegrationManager {
    constructor() {
        this.userRoleManager = new UserRoleManager();
        this.authTester = new AuthRouteTester();
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;

        console.log('🎯 Inizializzazione AuthIntegrationManager...');

        // Attendi caricamento SimpleAuth
        await this.waitForSimpleAuth();

        // Inizializza componenti
        this.userRoleManager.init();
        this.setupIntegrations();
        this.setupGlobalFunctions();
        this.addRoleStyles();

        // Verifica stato iniziale
        await this.checkInitialAuthState();

        this.isInitialized = true;
        console.log('✅ AuthIntegrationManager inizializzato');
    }

    async waitForSimpleAuth() {
        let attempts = 0;
        const maxAttempts = 20;

        return new Promise((resolve) => {
            const check = () => {
                if (window.SimpleAuth || attempts >= maxAttempts) {
                    resolve();
                } else {
                    attempts++;
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    setupIntegrations() {
        // Integra SimpleAuth con UserRoleManager
        if (window.SimpleAuth) {
            const auth = window.SimpleAuth;

            // Hook login
            const originalLogin = auth.login;
            auth.login = async function(...args) {
                const result = await originalLogin.apply(this, args);
                if (result.success && this.currentUser) {
                    document.dispatchEvent(new CustomEvent('userLoggedIn', {
                        detail: this.currentUser
                    }));
                }
                return result;
            };

            // Hook logout
            const originalLogout = auth.logout;
            auth.logout = async function(...args) {
                const result = await originalLogout.apply(this, args);
                document.dispatchEvent(new CustomEvent('userLoggedOut'));
                return result;
            };

            // Hook demo login
            const originalLoginDemo = auth.loginDemo;
            auth.loginDemo = function(...args) {
                const result = originalLoginDemo.apply(this, args);
                if (this.currentUser) {
                    document.dispatchEvent(new CustomEvent('userLoggedIn', {
                        detail: this.currentUser
                    }));
                }
                return result;
            };
        }
    }

    setupGlobalFunctions() {
        // Funzioni globali per testing
        window.testLogin = (userType = 'customer') => {
            return this.authTester.quickLoginDemo(userType);
        };

        window.testUserRole = (role) => {
            return this.authTester.testUserRole(role);
        };

        window.testRoleIcons = () => {
            return this.authTester.testRoleIcons();
        };

        window.testLogout = () => {
            return this.authTester.testLogout();
        };

        window.getAuthState = () => {
            return {
                isAuthenticated: window.SimpleAuth?.isAuthenticated || false,
                currentUser: window.SimpleAuth?.currentUser || null,
                currentRole: this.userRoleManager.getCurrentRole(),
                timestamp: Date.now()
            };
        };

        window.resetAuthSystem = async () => {
            await this.authTester.testLogout();
            this.userRoleManager.setUserRole('guest', null);
            console.log('✅ Sistema auth resetttato');
        };

        // Pannello debug (Ctrl+Shift+D)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.showDebugPanel();
            }
        });
    }

    showDebugPanel() {
        const existingPanel = document.getElementById('auth-debug-panel');
        if (existingPanel) {
            existingPanel.style.display = existingPanel.style.display === 'none' ? 'block' : 'none';
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'auth-debug-panel';
        panel.style.cssText = `
            position: fixed; top: 20px; right: 20px; background: rgba(0,0,0,0.9);
            color: white; padding: 15px; border-radius: 10px; z-index: 99999;
            font-family: monospace; font-size: 12px; min-width: 250px;
        `;

        panel.innerHTML = `
            <h4 style="margin: 0 0 10px 0;">🧪 Auth Debug Panel</h4>
            <button onclick="testLogin('customer')" style="display: block; margin: 5px 0; padding: 5px; width: 100%;">Test Customer</button>
            <button onclick="testLogin('staff')" style="display: block; margin: 5px 0; padding: 5px; width: 100%;">Test Staff</button>
            <button onclick="testLogin('admin')" style="display: block; margin: 5px 0; padding: 5px; width: 100%;">Test Admin</button>
            <hr style="margin: 10px 0;">
            <button onclick="testLogin('demo')" style="display: block; margin: 5px 0; padding: 5px; width: 100%;">Demo Login</button>
            <button onclick="testRoleIcons()" style="display: block; margin: 5px 0; padding: 5px; width: 100%;">Test Role Icons</button>
            <button onclick="console.log(getAuthState())" style="display: block; margin: 5px 0; padding: 5px; width: 100%;">Show Auth State</button>
            <hr style="margin: 10px 0;">
            <button onclick="testLogout()" style="display: block; margin: 5px 0; padding: 5px; width: 100%;">Logout</button>
            <button onclick="resetAuthSystem()" style="display: block; margin: 5px 0; padding: 5px; width: 100%;">Reset System</button>
            <button onclick="document.getElementById('auth-debug-panel').style.display='none'" style="display: block; margin: 10px 0 0 0; padding: 5px; width: 100%; background: #f44336;">Close</button>
        `;

        document.body.appendChild(panel);
    }


    async checkInitialAuthState() {
        const token = localStorage.getItem('authToken');

        if (token && window.SimpleAuth) {
            console.log('🔍 Token trovato, verifica autenticazione...');
            await window.SimpleAuth.checkAuthStatus();
        } else {
            console.log('🚶 Nessun token, stato guest');
            this.userRoleManager.setUserRole('guest', null);
        }
    }
}

// ==========================================
// SETUP LAYOUT FISSO DELL'APPLICAZIONE
// ==========================================

// Crea e inserisce la navbar in cima alla pagina
document.body.prepend(createNavbar());

// Crea il container principale per il contenuto dinamico delle pagine
const content = document.createElement('div');
content.id = 'content';
content.classList.add('main-content');
document.body.appendChild(content);

// Crea e inserisce il footer in fondo alla pagina
document.body.appendChild(buildFooter());

// ==========================================
// SISTEMA ROUTING CLIENT-SIDE
// ==========================================

/**
 * Router principale dell'applicazione
 * Gestisce la navigazione tra le diverse pagine della SPA
 */
window.showPage = (pageId) => {
    const content = document.getElementById('content');
    if (!content) {
        console.error('Container #content non trovato!');
        return;
    }

    console.log(`🧭 Navigazione verso: ${pageId}`);

    switch(pageId) {
        case 'homepage':
        case 'home':
            showHomepage();
            break;

        case 'catalogo-giochi':
            showCatalog('giochi');
            break;

        case 'menu-bevande':
            showCatalog('drink');
            break;

        case 'menu-snack-food':
            showCatalog('snack');
            break;

        case 'prenotazioni':
            showBookings();
            break;

        case 'tornei':
            showPlaceholderPage('Tornei', 'Partecipa ai tornei organizzati dal locale');
            break;

        case 'eventi-dal-vivo':
            showPlaceholderPage('Eventi dal Vivo', 'Serate speciali, workshop e eventi live');
            break;

        case 'proponi-torneo':
            showPlaceholderPage('Proponi Torneo', 'Proponi un torneo per il tuo gioco preferito');
            break;

        case 'aboutus':
            showPlaceholderPage('About Us', 'Chi siamo, la nostra storia e la nostra passione');
            break;

        case 'login':
            showPlaceholderPage('Login', 'Accedi al tuo account o registrati');
            break;

        case 'profile':
            showPlaceholderPage('Il Mio Profilo', 'Gestisci il tuo account e le tue prenotazioni');
            break;

        case 'admin':
            showPlaceholderPage('Dashboard Admin', 'Pannello di controllo amministrativo');
            break;

        default:
            console.warn(`⚠️ Pagina non trovata: ${pageId}. Reindirizzamento alla homepage.`);
            showHomepage();
            break;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function showPlaceholderPage(title, description) {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="placeholder-page">
            <div class="placeholder-container">
                <div class="placeholder-icon">
                    <i class="fas fa-tools"></i>
                </div>
                <h1 class="placeholder-title">${title}</h1>
                <p class="placeholder-description">${description}</p>
                <div class="placeholder-status">
                    <span class="status-badge">🚧 In sviluppo</span>
                </div>
                <button class="btn-primary placeholder-back-btn" onclick="showPage('homepage')">
                    <i class="fas fa-home"></i>
                    Torna alla Homepage
                </button>
            </div>
        </div>
    `;

    // Stili placeholder
    if (!document.getElementById('placeholder-styles')) {
        const styles = document.createElement('style');
        styles.id = 'placeholder-styles';
        styles.textContent = `
            .placeholder-page {
                min-height: 70vh; display: flex; align-items: center; justify-content: center;
                padding: 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .placeholder-container {
                text-align: center; background: white; padding: 3rem; border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 500px;
            }
            .placeholder-icon { font-size: 4rem; color: #667eea; margin-bottom: 1.5rem; }
            .placeholder-title { color: #2d3748; margin-bottom: 1rem; font-size: 2rem; }
            .placeholder-description { color: #718096; margin-bottom: 2rem; line-height: 1.6; }
            .status-badge {
                background: #fed7c3; color: #c53030; padding: 0.5rem 1rem;
                border-radius: 20px; font-weight: bold; font-size: 0.9rem;
            }
            .placeholder-back-btn {
                margin-top: 2rem; background: #667eea; color: white; border: none;
                padding: 0.75rem 2rem; border-radius: 10px; cursor: pointer;
                font-size: 1rem; transition: transform 0.2s;
            }
            .placeholder-back-btn:hover { transform: translateY(-2px); background: #5a67d8; }
        `;
        document.head.appendChild(styles);
    }
}

// ==========================================
// INIZIALIZZAZIONE APP COMPLETA
// ==========================================

// Istanza globale del gestore auth
window.authIntegrationManager = new AuthIntegrationManager();
window.userRoleManager = window.authIntegrationManager.userRoleManager;

/**
 * Avvio dell'applicazione quando il DOM è pronto
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Dice & Drink SPA - Applicazione avviata');

    // Carica la homepage come pagina iniziale
    showHomepage();

    // Inizializza sistema auth (con delay per assicurarsi che tutto sia caricato)
    setTimeout(async () => {
        try {
            await window.authIntegrationManager.init();
            console.log('✅ Sistema auth inizializzato');
        } catch (error) {
            console.error('❌ Errore inizializzazione auth:', error);
        }
    }, 100);

    console.log('✅ Setup completato - App pronta');

    // Mostra guida in console
    console.log(`
🎯 DICE & DRINK - SISTEMA AUTH INTEGRATO
=======================================

TESTING FUNZIONI:
▪️ testLogin('demo') - Login demo rapido
▪️ testLogin('customer') - Test login cliente
▪️ testLogin('staff') - Test login staff
▪️ testLogin('admin') - Test login admin
▪️ testRoleIcons() - Test cambio icone
▪️ testLogout() - Test logout
▪️ getAuthState() - Stato autenticazione
▪️ resetAuthSystem() - Reset completo

HOTKEY:
▪️ Ctrl+Shift+D - Pannello debug

ICONE RUOLI:
▪️ 🚶 Guest: person_add (grigio)
▪️ 👤 Customer: person (verde)
▪️ 👨‍💼 Staff: badge (arancione)
▪️ 👑 Admin: admin_panel_settings (rosso glow)
    `);
});
