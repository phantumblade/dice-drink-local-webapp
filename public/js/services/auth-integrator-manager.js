// public/js/services/auth-integration-manager.js
// Coordinatore principale per tutti i sistemi di autenticazione

console.log('🎯 AuthIntegrationManager caricato');

// ==========================================
// GESTORE INTEGRAZIONE PRINCIPALE
// ==========================================

class AuthIntegrationManager {
    constructor() {
        this.systems = {
            simpleAuth: null,
            roleManager: null,
            routeTester: null
        };
        this.isInitialized = false;
        this.initAttempts = 0;
        this.maxInitAttempts = 20;
    }

    // Inizializzazione completa
    async init() {
        if (this.isInitialized) {
            console.log('⚠️ AuthIntegrationManager già inizializzato');
            return;
        }

        console.log('🔧 Inizializzazione AuthIntegrationManager...');

        try {
            // Attendi caricamento di tutti i sistemi
            await this.waitForSystems();

            // Configura integrazioni
            this.setupIntegrations();

            // Setup eventi globali
            this.setupGlobalEvents();

            // Verifica stato iniziale
            await this.checkInitialState();

            this.isInitialized = true;
            console.log('✅ AuthIntegrationManager inizializzato con successo');

            // Dispatch evento pronto
            this.dispatchReadyEvent();

        } catch (error) {
            console.error('❌ Errore inizializzazione AuthIntegrationManager:', error);
            throw error;
        }
    }

    // Attendi caricamento sistemi
    async waitForSystems() {
        console.log('⏳ Attendo caricamento sistemi...');

        return new Promise((resolve, reject) => {
            const checkSystems = () => {
                this.initAttempts++;

                // Verifica disponibilità sistemi
                const available = {
                    simpleAuth: !!window.SimpleAuth,
                    roleManager: !!window.UserRoleManager,
                    routeTester: !!window.AuthRouteTester,
                    profileIcon: !!document.querySelector('.navbar-profile-icon')
                };

                const allReady = Object.values(available).every(Boolean);

                console.log(`Tentativo ${this.initAttempts}/${this.maxInitAttempts}:`, available);

                if (allReady) {
                    this.systems.simpleAuth = window.SimpleAuth;
                    this.systems.roleManager = window.UserRoleManager;
                    this.systems.routeTester = window.AuthRouteTester;

                    console.log('✅ Tutti i sistemi sono pronti');
                    resolve();
                } else if (this.initAttempts >= this.maxInitAttempts) {
                    const missing = Object.entries(available)
                        .filter(([key, value]) => !value)
                        .map(([key]) => key);

                    reject(new Error(`Sistemi non disponibili dopo ${this.maxInitAttempts} tentativi: ${missing.join(', ')}`));
                } else {
                    setTimeout(checkSystems, 200);
                }
            };

            checkSystems();
        });
    }

    // Configura integrazioni tra sistemi
    setupIntegrations() {
        console.log('🔗 Configurazione integrazioni...');

        // Integrazione SimpleAuth -> UserRoleManager
        if (this.systems.simpleAuth && this.systems.roleManager) {
            this.integrateAuthWithRoleManager();
        }

        // Integrazione con navbar
        this.integrateWithNavbar();

        // Setup localStorage sync
        this.setupStorageSync();

        console.log('✅ Integrazioni configurate');
    }

    // Integra SimpleAuth con UserRoleManager
    integrateAuthWithRoleManager() {
        const auth = this.systems.simpleAuth;
        const roleManager = this.systems.roleManager;

        // Hook login success
        const originalLogin = auth.login;
        auth.login = async function(...args) {
            const result = await originalLogin.apply(this, args);

            if (result.success && this.currentUser) {
                console.log('🔄 Login riuscito, aggiorno ruolo:', this.currentUser.role);
                roleManager.setUserRole(this.currentUser.role, this.currentUser);
            }

            return result;
        };

        // Hook logout
        const originalLogout = auth.logout;
        auth.logout = async function(...args) {
            const result = await originalLogout.apply(this, args);

            console.log('🔄 Logout completato, reset a guest');
            roleManager.setUserRole('guest', null);

            return result;
        };

        // Hook demo login
        const originalLoginDemo = auth.loginDemo;
        auth.loginDemo = function(...args) {
            const result = originalLoginDemo.apply(this, args);

            if (this.currentUser) {
                console.log('🔄 Demo login, aggiorno ruolo:', this.currentUser.role);
                roleManager.setUserRole(this.currentUser.role, this.currentUser);
            }

            return result;
        };

        // Hook checkAuthStatus
        const originalCheckAuth = auth.checkAuthStatus;
        auth.checkAuthStatus = async function(...args) {
            const result = await originalCheckAuth.apply(this, args);

            if (this.isAuthenticated && this.currentUser) {
                console.log('🔄 Auth status verificato, sincronizzazione ruolo:', this.currentUser.role);
                roleManager.setUserRole(this.currentUser.role, this.currentUser);
            } else {
                roleManager.setUserRole('guest', null);
            }

            return result;
        };

        console.log('🔗 SimpleAuth integrato con UserRoleManager');
    }

    // Integra con navbar
    integrateWithNavbar() {
        // Assicurati che l'icona profilo abbia i listener corretti
        const profileIcon = document.querySelector('.navbar-profile-icon');
        if (profileIcon) {
            // Rimuovi vecchi listener
            profileIcon.removeEventListener('click', this.handleProfileClick);

            // Aggiungi nuovo listener integrato
            profileIcon.addEventListener('click', this.handleProfileClick.bind(this));

            console.log('🔗 Navbar integrata con sistema auth');
        }
    }

    // Gestore click profilo integrato
    handleProfileClick(e) {
        e.preventDefault();
        e.stopPropagation();

        console.log('👤 Click profilo (integrato)');

        // Usa SimpleAuth se disponibile
        if (this.systems.simpleAuth) {
            this.systems.simpleAuth.handleProfileClick(e);
        } else {
            console.warn('⚠️ SimpleAuth non disponibile');
        }
    }

    // Setup sync localStorage
    setupStorageSync() {
        // Listener per cambiamenti storage (multi-tab)
        window.addEventListener('storage', (e) => {
            if (e.key === 'authToken') {
                console.log('🔄 Token cambiato in altro tab, sincronizzazione...');

                if (this.systems.simpleAuth) {
                    this.systems.simpleAuth.checkAuthStatus();
                }
            }
        });

        console.log('🔗 Storage sync configurato');
    }

    // Setup eventi globali
    setupGlobalEvents() {
        // Evento personalizzato per login
        document.addEventListener('userLogin', (e) => {
            console.log('🎉 Evento userLogin ricevuto:', e.detail);
            this.handleUserLogin(e.detail);
        });

        // Evento personalizzato per logout
        document.addEventListener('userLogout', (e) => {
            console.log('🎉 Evento userLogout ricevuto');
            this.handleUserLogout();
        });

        // Evento cambio ruolo
        document.addEventListener('roleChanged', (e) => {
            console.log('🎉 Evento roleChanged ricevuto:', e.detail);
            this.handleRoleChange(e.detail);
        });

        console.log('🔗 Eventi globali configurati');
    }

    // Gestori eventi
    handleUserLogin(userData) {
        if (this.systems.roleManager) {
            this.systems.roleManager.setUserRole(userData.role, userData);
        }
    }

    handleUserLogout() {
        if (this.systems.roleManager) {
            this.systems.roleManager.setUserRole('guest', null);
        }
    }

    handleRoleChange(roleData) {
        console.log('🔄 Cambio ruolo gestito:', roleData);
    }

    // Verifica stato iniziale
    async checkInitialState() {
        console.log('🔍 Verifica stato iniziale...');

        // Controlla se c'è un token salvato
        const token = localStorage.getItem('authToken');

        if (token && this.systems.simpleAuth) {
            console.log('🎟️ Token trovato, verifica autenticazione...');
            await this.systems.simpleAuth.checkAuthStatus();
        } else {
            console.log('🚶 Nessun token, stato guest');
            if (this.systems.roleManager) {
                this.systems.roleManager.setUserRole('guest', null);
            }
        }
    }

    // Dispatch evento pronto
    dispatchReadyEvent() {
        const event = new CustomEvent('authSystemReady', {
            detail: {
                systems: this.systems,
                timestamp: Date.now()
            }
        });

        document.dispatchEvent(event);
        console.log('🎉 Evento authSystemReady dispatched');
    }

    // ==========================================
    // API PUBBLICHE
    // ==========================================

    // Ottieni stato attuale completo
    getFullAuthState() {
        return {
            isAuthenticated: this.systems.simpleAuth?.isAuthenticated || false,
            currentUser: this.systems.simpleAuth?.currentUser || null,
            currentRole: this.systems.roleManager?.getCurrentRole() || 'guest',
            systems: {
                simpleAuth: !!this.systems.simpleAuth,
                roleManager: !!this.systems.roleManager,
                routeTester: !!this.systems.routeTester
            },
            timestamp: Date.now()
        };
    }

    // Login programmatico
    async programmaticLogin(email, password, rememberMe = false) {
        if (!this.systems.simpleAuth) {
            throw new Error('SimpleAuth non disponibile');
        }

        return await this.systems.simpleAuth.login(email, password, rememberMe);
    }

    // Logout programmatico
    async programmaticLogout() {
        if (!this.systems.simpleAuth) {
            throw new Error('SimpleAuth non disponibile');
        }

        return await this.systems.simpleAuth.logout();
    }

    // Cambio ruolo programmatico (per test)
    changeRole(role, userData = null) {
        if (!this.systems.roleManager) {
            throw new Error('UserRoleManager non disponibile');
        }

        this.systems.roleManager.setUserRole(role, userData);
    }

    // Test completo sistema
    async runFullSystemTest() {
        if (!this.systems.routeTester) {
            throw new Error('AuthRouteTester non disponibile');
        }

        return await this.systems.routeTester.runCompleteAuthFlow('customer');
    }

    // ==========================================
    // UTILITÀ DEBUG
    // ==========================================

    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            initAttempts: this.initAttempts,
            systems: {
                simpleAuth: {
                    available: !!this.systems.simpleAuth,
                    authenticated: this.systems.simpleAuth?.isAuthenticated,
                    user: this.systems.simpleAuth?.currentUser?.email
                },
                roleManager: {
                    available: !!this.systems.roleManager,
                    currentRole: this.systems.roleManager?.getCurrentRole()
                },
                routeTester: {
                    available: !!this.systems.routeTester,
                    running: this.systems.routeTester?.isRunning
                }
            },
            dom: {
                profileIcon: !!document.querySelector('.navbar-profile-icon'),
                authModal: !!document.querySelector('.auth-modal-overlay')
            }
        };
    }

    // Reset completo sistema (per debug)
    async resetSystem() {
        console.log('🔄 Reset sistema completo...');

        // Logout se autenticato
        if (this.systems.simpleAuth?.isAuthenticated) {
            await this.systems.simpleAuth.logout();
        }

        // Reset ruolo a guest
        if (this.systems.roleManager) {
            this.systems.roleManager.setUserRole('guest', null);
        }

        // Pulisci storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');

        console.log('✅ Sistema resetttato');
    }
}

// ==========================================
// ISTANZA GLOBALE E AUTO-INIT
// ==========================================

// Crea istanza globale
window.AuthIntegrationManager = new AuthIntegrationManager();

// Auto-inizializzazione
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await window.AuthIntegrationManager.init();
        } catch (error) {
            console.error('❌ Errore auto-init AuthIntegrationManager:', error);
        }
    });
} else {
    // DOM già caricato, init con delay
    setTimeout(async () => {
        try {
            await window.AuthIntegrationManager.init();
        } catch (error) {
            console.error('❌ Errore auto-init AuthIntegrationManager:', error);
        }
    }, 500);
}

// ==========================================
// API GLOBALI
// ==========================================

// Funzioni globali di comodo
window.getAuthState = function() {
    return window.AuthIntegrationManager.getFullAuthState();
};

window.loginAs = async function(email, password) {
    return await window.AuthIntegrationManager.programmaticLogin(email, password);
};

window.logoutUser = async function() {
    return await window.AuthIntegrationManager.programmaticLogout();
};

window.setRole = function(role, userData = null) {
    return window.AuthIntegrationManager.changeRole(role, userData);
};

window.resetAuthSystem = async function() {
    return await window.AuthIntegrationManager.resetSystem();
};

window.getAuthDebug = function() {
    console.log('🔍 Auth Debug Info:');
    console.table(window.AuthIntegrationManager.getDebugInfo());
    return window.AuthIntegrationManager.getDebugInfo();
};

// ==========================================
// GUIDA UTILIZZO INTEGRATA
// ==========================================

console.log(`
🎯 AUTH INTEGRATION MANAGER - GUIDA UTILIZZO
============================================

STATO SISTEMA:
▪️ getAuthState() - Stato completo autenticazione
▪️ getAuthDebug() - Info debug dettagliate

CONTROLLO UTENTE:
▪️ loginAs('email', 'password') - Login programmatico
▪️ logoutUser() - Logout programmatico
▪️ setRole('role', userData) - Cambio ruolo (test)

TESTING:
▪️ testAuth('customer') - Test flusso completo
▪️ testFullIntegration() - Test integrazione
▪️ resetAuthSystem() - Reset completo

EVENTI ASCOLTATI:
▪️ authSystemReady - Tutti i sistemi pronti
▪️ userLogin - Utente loggato
▪️ userLogout - Utente sconnesso
▪️ roleChanged - Cambio ruolo

HOTKEY:
▪️ Ctrl+Shift+D - Pannello debug
`);

console.log('✅ AuthIntegrationManager caricato e pronto')
