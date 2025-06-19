// Sistema per testare tutte le rotte di autenticazione e registrazione

console.log('🧪 AuthRouteTester caricato');

// ==========================================
// CONFIGURAZIONE TEST
// ==========================================

const TEST_CONFIG = {
    API_BASE: '/api/auth',
    TEST_USERS: {
        admin: {
            email: 'admin@dicedrink.com',
            password: 'AdminPass123!',
            firstName: 'Admin',
            lastName: 'Sistema',
            role: 'admin'
        },
        staff: {
            email: 'staff@dicedrink.com',
            password: 'StaffPass123!',
            firstName: 'Mario',
            lastName: 'Staff',
            role: 'staff'
        },
        customer: {
            email: 'customer@dicedrink.com',
            password: 'CustomerPass123!',
            firstName: 'Luigi',
            lastName: 'Cliente',
            role: 'customer'
        }
    },
    DEMO_DELAY: 1000 // ms tra operazioni demo
};

// ==========================================
// CLASSE TESTER PRINCIPALE
// ==========================================

class AuthRouteTester {
    constructor() {
        this.testResults = [];
        this.isRunning = false;
        this.currentTest = null;
    }

    // ==========================================
    // TEST REGISTRAZIONE
    // ==========================================

    async testRegistration(userType = 'customer') {
        console.log(`🧪 Test registrazione ${userType}...`);

        const testUser = {
            ...TEST_CONFIG.TEST_USERS[userType],
            email: `test_${userType}_${Date.now()}@dicedrink.com` // Email unica
        };

        try {
            const response = await fetch(`${TEST_CONFIG.API_BASE}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    firstName: testUser.firstName,
                    lastName: testUser.lastName,
                    email: testUser.email,
                    password: testUser.password,
                    role: testUser.role
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log(`✅ Registrazione ${userType} riuscita:`, result);
                return {
                    success: true,
                    userType,
                    testUser,
                    response: result,
                    tokens: result.tokens
                };
            } else {
                throw new Error(result.message || 'Errore registrazione');
            }

        } catch (error) {
            console.error(`❌ Errore registrazione ${userType}:`, error);
            return {
                success: false,
                userType,
                error: error.message,
                testUser
            };
        }
    }

    // ==========================================
    // TEST LOGIN
    // ==========================================

    async testLogin(email, password) {
        console.log(`🧪 Test login per: ${email}`);

        try {
            const response = await fetch(`${TEST_CONFIG.API_BASE}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    rememberMe: false
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ Login riuscito:', result);

                // Aggiorna SimpleAuth se disponibile
                if (window.SimpleAuth) {
                    window.SimpleAuth.isAuthenticated = true;
                    window.SimpleAuth.currentUser = result.user;
                    window.SimpleAuth.updateUI();
                }

                return {
                    success: true,
                    user: result.user,
                    tokens: result.tokens,
                    response: result
                };
            } else {
                throw new Error(result.message || 'Errore login');
            }

        } catch (error) {
            console.error(`❌ Errore login:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ==========================================
    // TEST VERIFICA TOKEN
    // ==========================================

    async testTokenVerification(token) {
        console.log('🧪 Test verifica token...');

        try {
            const response = await fetch(`${TEST_CONFIG.API_BASE}/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok) {
                console.log('✅ Token valido:', result);
                return {
                    success: true,
                    user: result.user,
                    response: result
                };
            } else {
                throw new Error(result.message || 'Token non valido');
            }

        } catch (error) {
            console.error('❌ Errore verifica token:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ==========================================
    // TEST LOGOUT
    // ==========================================

    async testLogout(token, refreshToken) {
        console.log('🧪 Test logout...');

        try {
            const response = await fetch(`${TEST_CONFIG.API_BASE}/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refreshToken
                })
            });

            const result = await response.json();

            if (response.ok) {
                console.log('✅ Logout riuscito:', result);

                // Aggiorna SimpleAuth se disponibile
                if (window.SimpleAuth) {
                    window.SimpleAuth.isAuthenticated = false;
                    window.SimpleAuth.currentUser = null;
                    window.SimpleAuth.updateUI();
                }

                return {
                    success: true,
                    response: result
                };
            } else {
                throw new Error(result.message || 'Errore logout');
            }

        } catch (error) {
            console.error('❌ Errore logout:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ==========================================
    // TEST REFRESH TOKEN
    // ==========================================

    async testRefreshToken(refreshToken) {
        console.log('🧪 Test refresh token...');

        try {
            const response = await fetch(`${TEST_CONFIG.API_BASE}/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refreshToken
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ Refresh token riuscito:', result);
                return {
                    success: true,
                    tokens: result.tokens,
                    response: result
                };
            } else {
                throw new Error(result.message || 'Errore refresh token');
            }

        } catch (error) {
            console.error('❌ Errore refresh token:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ==========================================
    // TEST COMPLETO FLUSSO AUTENTICAZIONE
    // ==========================================

    async runCompleteAuthFlow(userType = 'customer') {
        console.log(`🚀 Avvio test completo flusso autenticazione per: ${userType}`);

        this.isRunning = true;
        this.testResults = [];

        try {
            // 1. Test Registrazione
            console.log('\n📝 STEP 1: Registrazione');
            const regResult = await this.testRegistration(userType);
            this.testResults.push({ step: 'registration', ...regResult });

            if (!regResult.success) {
                throw new Error('Registrazione fallita');
            }

            await this.delay(TEST_CONFIG.DEMO_DELAY);

            // 2. Test Login
            console.log('\n🔑 STEP 2: Login');
            const loginResult = await this.testLogin(
                regResult.testUser.email,
                regResult.testUser.password
            );
            this.testResults.push({ step: 'login', ...loginResult });

            if (!loginResult.success) {
                throw new Error('Login fallito');
            }

            await this.delay(TEST_CONFIG.DEMO_DELAY);

            // 3. Test Verifica Token
            console.log('\n STEP 3: Verifica Token');
            const tokenResult = await this.testTokenVerification(loginResult.tokens.accessToken);
            this.testResults.push({ step: 'token_verification', ...tokenResult });

            await this.delay(TEST_CONFIG.DEMO_DELAY);

            // 4. Test Refresh Token
            console.log('\n🔄 STEP 4: Refresh Token');
            const refreshResult = await this.testRefreshToken(loginResult.tokens.refreshToken);
            this.testResults.push({ step: 'refresh_token', ...refreshResult });

            await this.delay(TEST_CONFIG.DEMO_DELAY);

            // 5. Test Logout
            console.log('\n👋 STEP 5: Logout');
            const logoutResult = await this.testLogout(
                loginResult.tokens.accessToken,
                loginResult.tokens.refreshToken
            );
            this.testResults.push({ step: 'logout', ...logoutResult });

            console.log('\n✅ TEST COMPLETO COMPLETATO!');
            this.displayTestSummary();

            return {
                success: true,
                userType,
                steps: this.testResults
            };

        } catch (error) {
            console.error('\n❌ TEST COMPLETO FALLITO:', error);
            this.displayTestSummary();

            return {
                success: false,
                error: error.message,
                userType,
                steps: this.testResults
            };
        } finally {
            this.isRunning = false;
        }
    }

    // ==========================================
    // TEST DEMO RAPIDI
    // ==========================================

    async quickLoginDemo(userType = 'customer') {
        console.log(`⚡ Demo login rapido: ${userType}`);

        if (userType === 'demo') {
            // Usa il demo login di SimpleAuth
            if (window.SimpleAuth) {
                window.SimpleAuth.loginDemo();
                return { success: true, type: 'demo' };
            }
        }

        // Login con credenziali test predefinite
        const testUser = TEST_CONFIG.TEST_USERS[userType];
        if (!testUser) {
            console.error('❌ Tipo utente non supportato:', userType);
            return { success: false, error: 'Tipo utente non supportato' };
        }

        return await this.testLogin(testUser.email, testUser.password);
    }

    // ==========================================
    // TEST ICONE RUOLI
    // ==========================================

    async testRoleIcons() {
        console.log('🎭 Test icone ruoli...');

        const roles = ['guest', 'customer', 'staff', 'admin'];

        for (const role of roles) {
            console.log(`Testando icona per ruolo: ${role}`);

            if (window.testUserRole) {
                window.testUserRole(role);
                await this.delay(2000); // 2 secondi per vedere il cambio
            }
        }

        // Torna a guest
        if (window.testUserRole) {
            window.testUserRole('guest');
        }

        console.log('✅ Test icone ruoli completato');
    }

    // ==========================================
    // UTILITÀ E HELPER
    // ==========================================

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    displayTestSummary() {
        console.log('\n📊 RIASSUNTO TEST:');
        console.log('='.repeat(50));

        let passed = 0;
        let failed = 0;

        this.testResults.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            const step = result.step.replace('_', ' ').toUpperCase();

            console.log(`${index + 1}. ${status} ${step}`);

            if (result.success) {
                passed++;
            } else {
                failed++;
                console.log(`   Errore: ${result.error}`);
            }
        });

        console.log('='.repeat(50));
        console.log(`📈 Passati: ${passed} | ❌ Falliti: ${failed}`);
        console.log(`🎯 Successo: ${(passed / (passed + failed) * 100).toFixed(1)}%`);
    }

    // Crea report dettagliato
    generateDetailedReport() {
        return {
            timestamp: new Date().toISOString(),
            totalTests: this.testResults.length,
            passed: this.testResults.filter(r => r.success).length,
            failed: this.testResults.filter(r => !r.success).length,
            results: this.testResults,
            environment: {
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: Date.now()
            }
        };
    }
}

// ==========================================
// ISTANZA GLOBALE E FUNZIONI HELPER
// ==========================================

// Crea istanza globale
window.AuthRouteTester = new AuthRouteTester();

// Funzioni globali di comodo
window.testAuth = async function(userType = 'customer') {
    return await window.AuthRouteTester.runCompleteAuthFlow(userType);
};

window.testLogin = async function(userType = 'customer') {
    return await window.AuthRouteTester.quickLoginDemo(userType);
};

window.testRoleIcons = async function() {
    return await window.AuthRouteTester.testRoleIcons();
};

window.testAllRoles = async function() {
    console.log('🧪 Test di tutti i ruoli utente...');

    const roles = ['customer', 'staff', 'admin'];
    const results = [];

    for (const role of roles) {
        console.log(`\n🎭 Testing ${role.toUpperCase()}...`);
        const result = await window.AuthRouteTester.quickLoginDemo(role);
        results.push({ role, ...result });

        if (result.success) {
            await window.AuthRouteTester.delay(2000); // Pausa per vedere l'icona
        }
    }

    console.log('\n📊 Risultati test ruoli:', results);
    return results;
};

// ==========================================
// PANNELLO DI CONTROLLO DEBUG
// ==========================================

function createDebugControlPanel() {
    // Verifica se il pannello esiste già
    if (document.getElementById('auth-debug-panel')) {
        return;
    }

    const panel = document.createElement('div');
    panel.id = 'auth-debug-panel';
    panel.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 15px;
        border-radius: 10px;
        z-index: 99999;
        font-family: monospace;
        font-size: 12px;
        min-width: 250px;
        display: none;
    `;

    panel.innerHTML = `
        <h4 style="margin: 0 0 10px 0;">🧪 Auth Debug Panel</h4>
        <button onclick="testAuth('customer')" style="display: block; margin: 5px 0; padding: 5px; width: 100%;">Test Customer Flow</button>
        <button onclick="testAuth('staff')" style="display: block; margin: 5px 0; padding: 5px; width: 100%;">Test Staff Flow</button>
        <button onclick="testAuth('admin')" style="display: block; margin: 5px 0; padding: 5px; width: 100%;">Test Admin Flow</button>
        <hr style="margin: 10px 0;">
        <button onclick="testLogin('demo')" style="display: block; margin: 5px 0; padding: 5px; width: 100%;">Demo Login</button>
        <button onclick="testRoleIcons()" style="display: block; margin: 5px 0; padding: 5px; width: 100%;">Test Role Icons</button>
        <button onclick="testAllRoles()" style="display: block; margin: 5px 0; padding: 5px; width: 100%;">Test All Roles</button>
        <hr style="margin: 10px 0;">
        <button onclick="showRoleManager()" style="display: block; margin: 5px 0; padding: 5px; width: 100%;">Show Role Info</button>
        <button onclick="document.getElementById('auth-debug-panel').style.display='none'" style="display: block; margin: 10px 0 0 0; padding: 5px; width: 100%; background: #f44336;">Close Panel</button>
    `;

    document.body.appendChild(panel);
}

// Funzione per mostrare/nascondere il pannello debug
window.toggleDebugPanel = function() {
    const panel = document.getElementById('auth-debug-panel');
    if (!panel) {
        createDebugControlPanel();
        document.getElementById('auth-debug-panel').style.display = 'block';
    } else {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
};

// Crea il pannello al caricamento (nascosto)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createDebugControlPanel);
} else {
    createDebugControlPanel();
}

// Hotkey per aprire il pannello debug (Ctrl+Shift+D)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        window.toggleDebugPanel();
    }
});

// ==========================================
// INTEGRATION TEST SUITE
// ==========================================

class AuthIntegrationTestSuite {
    constructor() {
        this.tests = [];
        this.currentSuite = null;
    }

    // Test completo integrazione SimpleAuth + UserRoleManager
    async testFullIntegration() {
        console.log('🔗 Test integrazione completa...');

        const results = [];

        try {
            // Test 1: Verifica che tutti i sistemi siano caricati
            console.log('1️⃣ Verifica caricamento sistemi...');
            const systemsCheck = this.checkSystemsLoaded();
            results.push(systemsCheck);

            if (!systemsCheck.success) {
                throw new Error('Sistemi non caricati correttamente');
            }

            // Test 2: Demo login + cambio icona
            console.log('2️⃣ Test demo login con cambio icona...');
            const demoResult = await this.testDemoLoginWithIcon();
            results.push(demoResult);

            // Test 3: Test cambio ruoli
            console.log('3️⃣ Test cambio ruoli...');
            const roleResult = await this.testRoleChanges();
            results.push(roleResult);

            // Test 4: Test logout + reset icona
            console.log('4️⃣ Test logout e reset icona...');
            const logoutResult = await this.testLogoutWithIcon();
            results.push(logoutResult);

            console.log('✅ Test integrazione completato!');
            return {
                success: true,
                results
            };

        } catch (error) {
            console.error('❌ Test integrazione fallito:', error);
            return {
                success: false,
                error: error.message,
                results
            };
        }
    }

    checkSystemsLoaded() {
        const systems = {
            SimpleAuth: !!window.SimpleAuth,
            UserRoleManager: !!window.UserRoleManager,
            AuthRouteTester: !!window.AuthRouteTester,
            profileIcon: !!document.querySelector('.navbar-profile-icon')
        };

        const allLoaded = Object.values(systems).every(Boolean);

        return {
            success: allLoaded,
            systems,
            message: allLoaded ? 'Tutti i sistemi caricati' : 'Alcuni sistemi mancanti'
        };
    }

    async testDemoLoginWithIcon() {
        try {
            // Stato iniziale
            const initialRole = window.UserRoleManager.getCurrentRole();

            // Demo login
            if (window.SimpleAuth) {
                window.SimpleAuth.loginDemo();
            }

            // Attendi aggiornamento icona
            await new Promise(resolve => setTimeout(resolve, 500));

            // Verifica cambio ruolo
            const newRole = window.UserRoleManager.getCurrentRole();
            const success = newRole !== initialRole && newRole === 'customer';

            return {
                success,
                initialRole,
                newRole,
                message: success ? 'Demo login e cambio icona riusciti' : 'Cambio icona fallito'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async testRoleChanges() {
        const roles = ['staff', 'admin', 'customer'];
        const results = [];

        for (const role of roles) {
            try {
                if (window.testUserRole) {
                    window.testUserRole(role);
                    await new Promise(resolve => setTimeout(resolve, 300));

                    const currentRole = window.UserRoleManager.getCurrentRole();
                    const success = currentRole === role;

                    results.push({
                        role,
                        success,
                        currentRole
                    });
                }
            } catch (error) {
                results.push({
                    role,
                    success: false,
                    error: error.message
                });
            }
        }

        const allSuccess = results.every(r => r.success);
        return {
            success: allSuccess,
            roleTests: results,
            message: allSuccess ? 'Tutti i ruoli testati con successo' : 'Alcuni test ruoli falliti'
        };
    }

    async testLogoutWithIcon() {
        try {
            // Logout
            if (window.SimpleAuth) {
                await window.SimpleAuth.logout();
            }

            // Attendi aggiornamento icona
            await new Promise(resolve => setTimeout(resolve, 500));

            // Verifica reset a guest
            const currentRole = window.UserRoleManager.getCurrentRole();
            const success = currentRole === 'guest';

            return {
                success,
                currentRole,
                message: success ? 'Logout e reset icona riusciti' : 'Reset icona fallito'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Istanza test suite
window.AuthIntegrationTestSuite = new AuthIntegrationTestSuite();

// Funzione globale per test integrazione
window.testFullIntegration = async function() {
    return await window.AuthIntegrationTestSuite.testFullIntegration();
};

// ==========================================
// GUIDA UTILIZZO
// ==========================================

console.log(`
🧪 AUTH ROUTE TESTER - GUIDA UTILIZZO
=====================================

FUNZIONI DISPONIBILI:
▪️ testAuth('customer|staff|admin') - Test flusso completo
▪️ testLogin('customer|staff|admin|demo') - Test login rapido
▪️ testRoleIcons() - Test cambio icone
▪️ testAllRoles() - Test tutti i ruoli
▪️ testFullIntegration() - Test integrazione completa
▪️ toggleDebugPanel() - Apri/chiudi pannello debug

HOTKEY:
▪️ Ctrl+Shift+D - Apri pannello debug

ESEMPI:
▪️ testAuth('customer') - Test completo cliente
▪️ testLogin('demo') - Login demo rapido
▪️ testRoleIcons() - Vedi tutte le icone
▪️ testFullIntegration() - Test tutto insieme

ROLE ICONS:
▪️ Guest: person_add (grigio)
▪️ Customer: person (verde)
▪️ Staff: badge (arancione)
▪️ Admin: admin_panel_settings (rosso con glow)
`);

console.log('✅ AuthRouteTester caricato e pronto per i test!')
