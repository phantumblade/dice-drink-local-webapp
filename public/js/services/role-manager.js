// public/js/services/user-role-manager.js
// Sistema per gestire icone dinamiche in base al ruolo utente

console.log('🎭 UserRoleManager caricato');

// ==========================================
// CONFIGURAZIONE ICONE PER RUOLO
// ==========================================

const ROLE_ICONS = {
    // Utente non loggato
    guest: {
        icon: 'person_add',
        color: '#999',
        title: 'Clicca per accedere',
        bgColor: 'transparent'
    },

    // Cliente normale
    customer: {
        icon: 'person',
        color: '#4CAF50',
        title: 'Profilo Cliente',
        bgColor: 'rgba(76, 175, 80, 0.1)'
    },

    // Staff del locale
    staff: {
        icon: 'badge',
        color: '#FF9800',
        title: 'Staff - Pannello Gestione',
        bgColor: 'rgba(255, 152, 0, 0.1)'
    },

    // Amministratore
    admin: {
        icon: 'admin_panel_settings',
        color: '#F44336',
        title: 'Admin - Controllo Totale',
        bgColor: 'rgba(244, 67, 54, 0.1)'
    }
};

// ==========================================
// CLASSE PRINCIPALE
// ==========================================

class UserRoleManager {
    constructor() {
        this.currentRole = 'guest';
        this.currentUser = null;
        this.profileIcon = null;
        this.isInitialized = false;
    }

    // Inizializzazione
    init() {
        if (this.isInitialized) {
            console.log('⚠️ UserRoleManager già inizializzato');
            return;
        }

        console.log('🔧 Inizializzazione UserRoleManager...');

        this.findProfileIcon();
        this.setupEventListeners();
        this.updateIconForCurrentState();

        this.isInitialized = true;
        console.log('✅ UserRoleManager inizializzato');
    }

    // Trova l'icona profilo nella navbar
    findProfileIcon() {
        let attempts = 0;
        const maxAttempts = 10;

        const findIcon = () => {
            this.profileIcon = document.querySelector('.navbar-profile-icon');

            if (this.profileIcon) {
                console.log('✅ Icona profilo trovata');
                return true;
            }

            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(findIcon, 500);
            } else {
                console.warn('⚠️ Icona profilo non trovata dopo', maxAttempts, 'tentativi');
            }
            return false;
        };

        findIcon();
    }

    // Setup event listeners
    setupEventListeners() {
        // Ascolta cambiamenti di autenticazione dal SimpleAuth
        if (window.SimpleAuth) {
            // Hook nel sistema esistente
            const originalUpdateUI = window.SimpleAuth.updateUI;
            window.SimpleAuth.updateUI = () => {
                originalUpdateUI.call(window.SimpleAuth);
                this.syncWithSimpleAuth();
            };
        }

        // Ascolta eventi personalizzati
        document.addEventListener('userRoleChanged', (e) => {
            this.handleRoleChange(e.detail);
        });

        document.addEventListener('userLoggedIn', (e) => {
            this.handleUserLogin(e.detail);
        });

        document.addEventListener('userLoggedOut', () => {
            this.handleUserLogout();
        });
    }

    // Sincronizza con SimpleAuth
    syncWithSimpleAuth() {
        if (!window.SimpleAuth) return;

        if (window.SimpleAuth.isAuthenticated && window.SimpleAuth.currentUser) {
            const user = window.SimpleAuth.currentUser;
            this.setUserRole(user.role, user);
        } else {
            this.setUserRole('guest', null);
        }
    }

    // Imposta ruolo utente
    setUserRole(role, user = null) {
        console.log('🎭 Cambio ruolo:', this.currentRole, '->', role);

        this.currentRole = role;
        this.currentUser = user;

        this.updateProfileIcon();

        // Dispatch evento personalizzato
        const event = new CustomEvent('roleIconUpdated', {
            detail: { role, user, iconConfig: ROLE_ICONS[role] }
        });
        document.dispatchEvent(event);
    }

    // Aggiorna icona profilo
    updateProfileIcon() {
        if (!this.profileIcon) {
            console.warn('⚠️ Icona profilo non disponibile per aggiornamento');
            return;
        }

        const config = ROLE_ICONS[this.currentRole] || ROLE_ICONS.guest;

        // Aggiorna icona
        this.profileIcon.textContent = config.icon;
        this.profileIcon.style.color = config.color;
        this.profileIcon.style.backgroundColor = config.bgColor;

        // Aggiorna tooltip
        let title = config.title;
        if (this.currentUser && this.currentUser.first_name) {
            title = `${title} - ${this.currentUser.first_name}`;
        }
        this.profileIcon.title = title;

        // Aggiorna classe CSS per ruolo
        this.profileIcon.className = this.profileIcon.className
            .replace(/role-\w+/g, '') + ` role-${this.currentRole}`;

        // Animazione di cambio
        this.profileIcon.style.transform = 'scale(1.1)';
        setTimeout(() => {
            this.profileIcon.style.transform = 'scale(1)';
        }, 200);

        console.log(`✅ Icona aggiornata per ruolo: ${this.currentRole}`);
    }

    // Gestione login utente
    handleUserLogin(userData) {
        console.log('👤 Utente loggato:', userData);
        this.setUserRole(userData.role || 'customer', userData);
    }

    // Gestione logout utente
    handleUserLogout() {
        console.log('👋 Utente disconnesso');
        this.setUserRole('guest', null);
    }

    // Gestione cambio ruolo
    handleRoleChange(roleData) {
        console.log('🔄 Cambio ruolo richiesto:', roleData);
        this.setUserRole(roleData.newRole, roleData.user);
    }

    // Aggiorna per stato corrente
    updateIconForCurrentState() {
        // Controlla se SimpleAuth ha già un utente loggato
        if (window.SimpleAuth && window.SimpleAuth.isAuthenticated) {
            this.syncWithSimpleAuth();
        } else {
            this.setUserRole('guest', null);
        }
    }

    // Ottieni configurazione icona per ruolo
    getIconConfigForRole(role) {
        return ROLE_ICONS[role] || ROLE_ICONS.guest;
    }

    // Ottieni ruolo attuale
    getCurrentRole() {
        return this.currentRole;
    }

    // Ottieni utente attuale
    getCurrentUser() {
        return this.currentUser;
    }

    // Debug info
    getDebugInfo() {
        return {
            currentRole: this.currentRole,
            currentUser: this.currentUser,
            iconElement: !!this.profileIcon,
            isInitialized: this.isInitialized,
            availableRoles: Object.keys(ROLE_ICONS)
        };
    }
}

// ==========================================
// INTEGRAZIONE CON SISTEMA AUTH ESISTENTE
// ==========================================

// Estendi SimpleAuth con gestione ruoli
if (window.SimpleAuth) {
    // Hook nel login esistente
    const originalLogin = window.SimpleAuth.login;
    window.SimpleAuth.login = async function(...args) {
        const result = await originalLogin.apply(this, args);

        if (result.success && this.currentUser) {
            // Notifica cambio ruolo
            const event = new CustomEvent('userLoggedIn', {
                detail: this.currentUser
            });
            document.dispatchEvent(event);
        }

        return result;
    };

    // Hook nel logout esistente
    const originalLogout = window.SimpleAuth.logout;
    window.SimpleAuth.logout = async function(...args) {
        const result = await originalLogout.apply(this, args);

        // Notifica logout
        const event = new CustomEvent('userLoggedOut');
        document.dispatchEvent(event);

        return result;
    };

    // Hook nel demo login
    const originalLoginDemo = window.SimpleAuth.loginDemo;
    window.SimpleAuth.loginDemo = function(...args) {
        const result = originalLoginDemo.apply(this, args);

        if (this.currentUser) {
            // Notifica login demo
            const event = new CustomEvent('userLoggedIn', {
                detail: this.currentUser
            });
            document.dispatchEvent(event);
        }

        return result;
    };
}

// ==========================================
// ISTANZA GLOBALE E AUTO-INIT
// ==========================================

// Crea istanza globale
window.UserRoleManager = new UserRoleManager();

// Auto-inizializzazione
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.UserRoleManager.init();
        }, 100); // Piccolo delay per assicurarsi che tutto sia caricato
    });
} else {
    // DOM già caricato
    setTimeout(() => {
        window.UserRoleManager.init();
    }, 100);
}

// ==========================================
// UTILITÀ PER SVILUPPATORI
// ==========================================

// Funzioni globali per testing/debug
window.testUserRole = function(role) {
    console.log(`🧪 Test ruolo: ${role}`);

    const testUser = {
        id: 999,
        first_name: 'Test',
        last_name: 'User',
        email: `test.${role}@dicedrink.com`,
        role: role
    };

    window.UserRoleManager.setUserRole(role, testUser);
};

window.showRoleManager = function() {
    console.log('🔍 UserRoleManager Debug Info:', window.UserRoleManager.getDebugInfo());
};

console.log('✅ Sistema UserRoleManager caricato e pronto');

// Export per moduli ES6 se necessario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserRoleManager;
}
