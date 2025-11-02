# Dice & Drink


<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Node.js](https://img.shields.io/badge/node.js-18%2B-brightgreen.svg)
![SQLite](https://img.shields.io/badge/database-SQLite-003B57.svg)
![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E.svg)

**Single Page Application universitaria Di locale di giochi da tavolo e drink moderno**

[📖 Documentazione API](#-documentazione-api)

</div>

---

## 📋 Indice

- [🌟 Panoramica](#-panoramica)
- [✨ Caratteristiche](#-caratteristiche)
- [🏗️ Architettura](#️-architettura)
- [🛠️ Tecnologie](#️-tecnologie)
- [🚀 Installazione](#-installazione)
- [🔧 Configurazione](#-configurazione)
- [📖 Documentazione API](#-documentazione-api)
- [🎮 Utilizzo](#-utilizzo)
- [🧪 Testing e Debug](#-testing-e-debug)
- [📱 Responsive Design](#-responsive-design)
- [🔐 Sicurezza](#-sicurezza)
- [📄 Licenza](#-licenza)

---

## 🌟 Panoramica

**Dice & Drink** è una **Single Page Application** sviluppata per il corso universitario, che simula la gestione di un gaming café moderno. Il progetto dimostra l'implementazione di tecnologie web pure (HTML5, CSS3, JavaScript ES6+) senza l'uso di framework frontend, mantenendo un approccio didattico e professionale.

### 🎯 Obiettivi Didattici

- **Vanilla JavaScript**: Implementazione SPA senza framework frontend
- **Node.js Backend**: API REST complete con Express.js
- **Database Management**: SQLite con operazioni CRUD
- **Autenticazione**: Sistema JWT completo
- **Responsive Design**: Adattamento desktop-first verso mobile
- **Architettura Modulare**: Separazione logica e riutilizzo componenti

---

## ✨ Caratteristiche

### 🎮 Funzionalità Core

- **📚 Catalogo Prodotti**: Gestione completa di giochi da tavolo, bevande e snack
- **🔍 Ricerca e Filtri**: Sistema di ricerca avanzato con filtri multipli
- **📅 Sistema Prenotazioni**: Gestione completa prenotazioni tavoli
- **🏆 Sistema Tornei**: Gestione completa tornei con iscrizioni e timeline
- **🐉 Campagne D&D**: Sistema dedicato per campagne Dungeons & Dragons
- **⭐ Recensioni e Valutazioni**: Sistema di rating per prodotti
- **🛒 Wishlist**: Lista desideri personalizzata per utenti

### 👥 Gestione Utenti Multi-Ruolo

- **🔐 Autenticazione JWT**: Login sicuro con refresh token
- **🎭 Ruoli Utente**: Guest, Customer, Staff, Admin con permessi differenziati
- **👤 Profili Utente**: Gestione dati personali e preferenze
- **📊 Dashboard Admin**: Pannello di controllo per amministratori

### 🏗️ Architettura Tecnica

- **🌐 SPA Pura**: Navigazione fluida senza refresh pagina
- **🔄 Routing Client-Side**: Gestione URL con Page.js
- **📡 API REST**: Comunicazione asincrona client-server
- **🗄️ Database SQLite**: Persistenza dati locale
- **🛡️ Middleware Sicurezza**: Validazione e protezione endpoint

---

## 🏗️ Architettura

### 📁 Struttura del Progetto

```
dice-drink-local-webapp/
├── 📄 server.js                    # Server Express principale
├── 📄 main.js                      # Orchestratore SPA
├── 📄 index.html                   # Entry point applicazione
├── 📄 db.js                        # Configurazione database SQLite
├── 📄 package.json                 # Dipendenze e scripts npm
├── 📄 dice_drink.db                # Database SQLite
│
├── 📂 public/                      # Assets statici
│   ├── 📂 css/                     # Fogli di stile
│   │   ├── style.css               # Stili principali
│   │   ├── dashboard.css           # Stili pannello admin
│   │   └── media.css               # Media queries responsive
│   │
│   └── 📂 js/                      # JavaScript frontend
│       ├── 📄 auth-system.js       # Sistema autenticazione
│       ├── 📂 components/          # Componenti riutilizzabili
│       │   ├── navbar.js           # Barra navigazione
│       │   ├── footer.js           # Footer
│       │   └── dropdown-delay.js   # Utility dropdown
│       │
│       ├── 📂 pages/               # Pagine SPA
│       │   ├── homepage.js         # Pagina iniziale
│       │   ├── catalog.js          # Catalogo prodotti
│       │   ├── bookings.js         # Gestione prenotazioni
│       │   ├── tournaments.js      # Sistema tornei e D&D
│       │   ├── dashboard.js        # Pannello admin
│       │   └── aboutus.js          # Informazioni
│       │
│       └── 📂 services/            # Servizi e utility
│           ├── auth-integrator-manager.js  # Coordinatore sistemi
│           ├── auth-route-tester.js        # Testing automatico
│           ├── catalog-preview.js          # Preview catalogo
│           └── role-manager.js             # Gestione ruoli
│
├── 📂 routes/                      # API endpoints
│   ├── auth.js                     # Autenticazione
│   ├── games.js                    # Gestione giochi
│   ├── drinks.js                   # Gestione bevande
│   ├── snacks.js                   # Gestione snack
│   ├── users.js                    # Gestione utenti
│   └── admin.js                    # Funzioni amministrative
│
├── 📂 middleware/                  # Middleware Express
│   ├── auth.js                     # Verifica autenticazione
│   └── logging.js                  # Logging richieste
│
├── 📂 models/                      # Modelli dati
│   ├── User.js                     # Modello utente
│   ├── Game.js                     # Modello gioco
│   ├── Drink.js                    # Modello bevanda
│   └── Snack.js                    # Modello snack
│
├── 📂 daos/                        # Data Access Objects
│   ├── usersDao.js                 # Accesso dati utenti
│   ├── gamesDao.js                 # Accesso dati giochi
│   ├── drinksDao.js                # Accesso dati bevande
│   └── snacksDao.js                # Accesso dati snack
│
└── 📂 database_init/               # Inizializzazione database
    ├── initGamesDb.js              # Setup giochi
    ├── initDrinksDb.js             # Setup bevande
    ├── initSnacksDb.js             # Setup snack
    └── initUsersDb.js              # Setup utenti
```

### 🔄 Flusso Applicazione SPA

```
1. Browser → index.html
2. Caricamento → main.js
3. Inizializzazione → Page.js routing
4. Caricamento → componenti modulari
5. Setup → sistema autenticazione
6. Navigazione → aggiornamento dinamico contenuti
```

---

## 🛠️ Tecnologie

### 💻 Backend (Node.js)
- **Express.js** `^4.21.2` - Framework web minimalista
- **SQLite3** `^5.1.7` - Database relazionale leggero
- **JWT** `^9.0.2` - JSON Web Tokens per autenticazione
- **bcrypt** `^6.0.0` - Hashing password sicuro
- **Helmet** `^8.1.0` - Sicurezza HTTP headers
- **CORS** `^2.8.5` - Cross-Origin Resource Sharing
- **express-rate-limit** `^7.5.0` - Rate limiting per API
- **express-validator** `^7.2.1` - Validazione input
- **nodemailer** `^7.0.3` - Invio email
- **dotenv** `^16.5.0` - Gestione variabili ambiente

### 🎨 Frontend (Vanilla Web Technologies)
- **HTML5** - Markup semantico moderno
- **CSS3 Puro** - Styling con Flexbox/Grid (no framework CSS)
- **JavaScript ES6+** - Logica client-side nativa
- **Page.js** - Routing client-side
- **Bootstrap** `^5.3.6` - Solo per componenti UI specifici
- **Lucide Icons** `^0.511.0` - Iconografia moderna

### 🔧 Development Tools
- **nodemon** `^3.1.10` - Auto-restart server in development
- **PurgeCSS** `^7.0.2` - Ottimizzazione CSS

### 🏗️ Approccio Architetturale
- **SPA (Single Page Application)** - Navigazione senza refresh
- **Vanilla JavaScript** - Nessun framework frontend
- **REST API** - Comunicazione client-server
- **JWT Authentication** - Sicurezza stateless
- **Desktop-First Design** - Responsive design con adattamento mobile

---

## 🚀 Installazione

### 📋 Prerequisiti

- **Node.js** 18.0.0 o superiore
- **npm** 8.0.0 o superiore

### 🔧 Setup Progetto

```bash
# Clone del repository
git clone https://github.com/tuousername/dice-drink-local-webapp.git
cd dice-drink-local-webapp

# Installazione dipendenze
npm install

# Verifica presenza database (già incluso)
ls -la dice_drink.db
```

### 🗄️ Inizializzazione Database (opzionale)

Il database SQLite è già incluso con dati demo. Per rigenerarlo:

```bash
# Inizializzazione database completa (solo per ambiente locale)
node initGamesDb.js
node initDrinksDb.js
node initSnacksDb.js
node initTournamentsDb.js
node initUsersDb.js
node initUserStatsDb.js
```

### 🌐 Deploy Frontend su GitHub Pages

- Il workflow `.github/workflows/deploy-pages.yml` pubblica automaticamente la cartella `public/` su Pages ad ogni push su `main`.
- Se ti serve puntare il frontend a un backend esterno, aggiorna `public/js/config.js` (campo `API_BASE`) oppure definisci `window.GLOBAL_API_BASE` prima del caricamento di `config.js` in `index.html`.
- In assenza del backend, i dati mock (`public/data/mock-*.json`) mantengono navigabile il catalogo su Pages.

### 🚀 Avvio Applicazione

```bash
# Avvio produzione
npm start

# Avvio sviluppo (con auto-restart)
npm run dev
```

L'applicazione sarà disponibile su `http://localhost:3000`

---

## 🔧 Configurazione

### 🌍 Variabili d'Ambiente

Crea un file `.env` nella root del progetto:

```env
# Configurazione Server
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,https://<username>.github.io
# Imposta a "false" quando il frontend è servito da GitHub Pages
SERVE_STATIC=true

# Database
DB_PATH=./dice_drink.db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Email Configuration (opzionale)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Sicurezza
SESSION_SECRET=your-session-secret-here
BCRYPT_ROUNDS=12
```

---

## 📖 Documentazione API

### 🔐 Autenticazione

| Endpoint | Metodo | Descrizione | Autenticazione |
|----------|--------|-------------|----------------|
| `/api/auth/register` | POST | Registrazione nuovo utente | ❌ |
| `/api/auth/login` | POST | Login utente | ❌ |
| `/api/auth/logout` | POST | Logout utente | ✅ |
| `/api/auth/refresh` | POST | Refresh JWT token | ✅ |
| `/api/auth/me` | GET | Informazioni utente corrente | ✅ |

### 🎮 Catalogo

| Endpoint | Metodo | Descrizione | Parametri Query |
|----------|--------|-------------|-----------------|
| `/api/games` | GET | Lista giochi | `?limit=10&category=strategy` |
| `/api/games/:id` | GET | Dettaglio gioco | - |
| `/api/drinks` | GET | Lista bevande | `?alcoholic=true&limit=20` |
| `/api/drinks/:id` | GET | Dettaglio bevanda | - |
| `/api/snacks` | GET | Lista snack | `?type=sweet&limit=15` |
| `/api/snacks/:id` | GET | Dettaglio snack | - |

### 🏆 Tornei e D&D

| Endpoint | Metodo | Descrizione | Parametri Query |
|----------|--------|-------------|-----------------|
| `/api/tournaments` | GET | Lista tornei | `?status=upcoming&category=dnd` |
| `/api/tournaments/:id` | GET | Dettaglio torneo | - |
| `/api/tournaments/:id/register` | POST/DELETE | Iscrizione/cancellazione | ✅ Auth |
| `/api/tournaments/:id/campaign` | GET | Dettagli campagna D&D | - |
| `/api/tournaments/:id/characters` | GET | Personaggi campagna D&D | - |
| `/api/tournaments/:id/characters/:name` | GET | Dettagli personaggio D&D | - |

### 👤 Gestione Utenti

| Endpoint | Metodo | Descrizione | Ruolo Richiesto |
|----------|--------|-------------|-----------------|
| `/api/users/profile` | GET/PUT | Gestione profilo | Customer+ |
| `/api/users/bookings` | GET/POST | Prenotazioni utente | Customer+ |
| `/api/users/wishlist` | GET/POST/DELETE | Gestione wishlist | Customer+ |
| `/api/users/reviews` | GET/POST/PUT | Recensioni utente | Customer+ |

### 👨‍💼 Amministrazione

| Endpoint | Metodo | Descrizione | Ruolo Richiesto |
|----------|--------|-------------|-----------------|
| `/api/admin/dashboard` | GET | Statistiche dashboard | Staff+ |
| `/api/admin/users` | GET/PUT/DELETE | Gestione utenti | Admin |
| `/api/admin/bookings` | GET/PUT/DELETE | Gestione prenotazioni | Staff+ |
| `/api/admin/catalog` | POST/PUT/DELETE | Gestione catalogo | Staff+ |

### 🔍 Endpoint di Utilità

| Endpoint | Descrizione |
|----------|-------------|
| `/api/health` | Stato server e disponibilità endpoint |

---

## 🏆 Sistema Tornei e D&D

### 🎯 Caratteristiche Tornei

**Dice & Drink** include un sistema completo per la gestione dei tornei di giochi da tavolo:

#### 🏅 Tipi di Tornei Supportati
- **🏆 Tornei Standard**: Magic: The Gathering, Catan, Splendor, ecc.
- **🐉 Campagne D&D**: Gestione completa campagne Dungeons & Dragons
- **🎉 Tornei Party**: Eventi sociali e giochi di gruppo
- **⚡ Tornei Blitz**: Competizioni veloci e dinamiche

#### 🌟 Funzionalità Tornei
- **📅 Timeline Interattiva**: Visualizzazione cronologica tornei
- **📝 Sistema Iscrizioni**: Registrazione con lista d'attesa automatica
- **💰 Gestione Quote**: Entry fee e montepremi trasparenti
- **🏆 Sistema Premi**: Configurazione premi personalizzati
- **📊 Dashboard**: Pannello controllo per organizzatori

### 🐉 Sistema D&D Dedicato

#### 🎭 Gestione Campagne
- **👥 Party Composition**: Visualizzazione membri party con ruoli
- **📜 Schede Personaggio**: Dati completi (stats, background, personalità)
- **🎨 Avatar Personalizzati**: Sistema avatars per personaggi
- **👑 Party Leader**: Gestione leader party e permessi
- **🗓️ Programmazione Sessioni**: Calendario sessioni ricorrenti

#### 📋 Database D&D Integrato
```sql
-- Struttura campagne D&D
dnd_campaigns: setting, world, DM, safety_tools, play_style
dnd_characters: name, class, race, level, stats, personality, backstory
```

#### 🎪 Modali Interattivi
- **📖 Biografia Personaggi**: Modale dettagliata con tutte le informazioni
- **🏰 Info Campagna**: Dettagli setting, DM, regole di sicurezza
- **⚔️ Statistiche**: Visualizzazione stats D&D (FOR, DES, COS, INT, SAG, CAR)
- **📝 Background**: Personalità, ideali, legami, difetti

#### 🎲 Caratteristiche Uniche D&D
- **🔗 Richiesta Accesso**: Sistema permessi party leader
- **🛡️ Safety Tools**: X-Card, Lines & Veils configurabili  
- **🎯 Esperienza Richiesta**: Filtri per livello giocatori
- **📍 Location Dedicata**: Spazi specifici per sessioni D&D

### 🖥️ Interfaccia Utente Tornei

#### 📱 Design Responsive
- **🎨 Card Tornei**: Layout moderno con informazioni chiare
- **🏷️ Tag Categoria**: Etichette colorate per tipo torneo
- **📊 Progress Bar**: Stato partecipazione visuale
- **🎯 Azioni Dinamiche**: Bottoni contestuali per ogni torneo

#### 🔄 Stati Tornei
- **📅 Upcoming**: Tornei in arrivo con iscrizioni aperte
- **▶️ Ongoing**: Tornei in corso con dettagli sessione
- **✅ Completed**: Tornei conclusi con risultati
- **❌ Cancelled**: Tornei cancellati con refund automatico

---

## 🎮 Utilizzo

### 👤 Credenziali di Test

| Ruolo | Email | Password | Descrizione |
|-------|-------|----------|-------------|
| **Admin** | admin@diceanddrink.com | DiceAndDrink2025! | Controllo completo sistema |
| **Staff** | staff@diceanddrink.com | StaffDemo2025! | Gestione locale e prenotazioni |
| **Customer** | customer@diceanddrink.com | CustomerDemo2025! | Prenotazioni e recensioni |
| **Customer2** | customer2@diceanddrink.com | Customer2_2025! | Test con utenti multipli |
| **Customer3** | Utente3@gmail.com | Utente12345$ | Test con utenti multipli |


### 🚶‍♂️ Percorsi Utente

#### 🌟 Visitatore (Guest)
```
Homepage → Esplora Catalogo → Registrazione → Diventa Customer
```

#### 🎯 Cliente (Customer)
```
Login → Dashboard Personale → Prenotazioni → Gestione Wishlist → Recensioni
```

#### 👨‍💼 Staff/Admin
```
Login → Dashboard Admin → Gestione Prenotazioni → Gestione Catalogo → Analytics
```

---

## 🧪 Testing e Debug

### 🔬 Sistema di Testing Integrato

Il progetto include un avanzato sistema di testing e debug:

```javascript
// Pannello Debug (Ctrl+Shift+D)
// Testa automaticamente tutti i flussi
testAuth('customer')        // Test completo flusso cliente
testLogin('admin')          // Login rapido admin
testRoleIcons()            // Test cambio icone ruoli
testFullIntegration()      // Test integrazione completa
```

### 🎮 Testing Interattivo

**Accesso Pannello Debug:**
- **Hotkey**: `Ctrl+Shift+D`
- **Funzioni**: Test automatici per tutti i ruoli
- **Debugging**: Informazioni stato sistema in tempo reale

### 📊 Monitoraggio

```bash
# Verifica stato server
curl http://localhost:3000/api/health

# Test endpoint specifico
curl http://localhost:3000/api/games?limit=5
```

---

## 📱 Responsive Design

### 📐 Approccio Desktop-First

Il progetto utilizza un approccio **Desktop-First** con adattamento mobile:

```css
/* Stili base per desktop */
.container { width: 1200px; }

/* Adattamento tablet */
@media (max-width: 768px) {
  .container { width: 100%; }
}

/* Adattamento mobile */
@media (max-width: 480px) {
  .container { padding: 10px; }
}
```

### 📱 Ottimizzazioni Mobile

- **Navigation**: Menu hamburger per dispositivi mobili
- **Touch Interface**: Bottoni ottimizzati per touch
- **Content Scaling**: Adattamento automatico contenuti
- **Performance**: Lazy loading per immagini su mobile

**Nota**: Il design responsive è attualmente in fase di ottimizzazione per una migliore esperienza mobile.

---

## 🔐 Sicurezza

### 🛡️ Misure di Sicurezza Implementate

- **🔐 JWT Authentication**: Token sicuri con scadenza automatica
- **🔒 Password Hashing**: bcrypt per hashing sicuro
- **🛡️ HTTP Security Headers**: Helmet.js per protezione
- **🌐 CORS**: Configurazione Cross-Origin Resource Sharing
- **📝 Input Validation**: express-validator per validazione rigorosa
- **🚦 Rate Limiting**: Protezione contro attacchi DoS
- **🔍 SQL Injection Prevention**: Prepared statements SQLite
- **📊 Session Management**: Gestione sicura delle sessioni

### 🎭 Sistema Ruoli

```javascript
// Gerarchia permessi
const ROLES = {
  guest: ['read:public'],
  customer: ['read:catalog', 'write:bookings', 'write:reviews'],
  staff: ['read:all', 'write:bookings', 'write:catalog'],
  admin: ['read:all', 'write:all', 'delete:all']
};
```

---

## 🚀 Caratteristiche Tecniche Avanzate

### 🔄 Gestione Stato SPA

```javascript
// Routing con Page.js
page('/homepage', loadHomepage);
page('/catalog', loadCatalog);
page('/bookings', requireAuth, loadBookings);
page('/dashboard', requireAdmin, loadDashboard);
```

### 📡 Comunicazione API

```javascript
// Esempio chiamata API asincrona
async function fetchGames(filters = {}) {
  const response = await fetch('/api/games?' + new URLSearchParams(filters));
  return await response.json();
}
```

### 🔐 Gestione Autenticazione

```javascript
// Sistema JWT integrato
const token = localStorage.getItem('authToken');
const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
```

---

## 📊 Performance e Ottimizzazioni

### ⚡ Ottimizzazioni Attuali

- **🗜️ Database Indexing**: Indici ottimizzati per query veloci
- **📦 Code Splitting**: Caricamento modulare componenti
- **🔄 Async Loading**: Caricamento asincrono contenuti
- **💾 Local Storage**: Cache intelligente per dati utente

### 📈 Metriche Sviluppo

- **Bundle Size**: Mantenuto leggero senza framework
- **Load Time**: Ottimizzato per connessioni lente
- **Mobile Performance**: Ottimizzato con responsive design migliorato

### 🎨 Miglioramenti UX Recenti

- **🔔 Sistema Notifiche**: Notifiche animate personalizzate con slide-in, progress bar e auto-dismiss
- **⚙️ Controlli Quantità**: Interfaccia elegante con badge dinamici e pannello espandibile
- **🛒 Carrello Fluido**: Aggiornamenti incrementali senza scatti, micro-animazioni sui numeri
- **🔄 Transizioni Smooth**: Fade opacity per cambio categoria, skeleton loading per eliminare flash
- **📱 Mobile First**: Design responsive ottimizzato per dispositivi mobili
- **🏆 Sistema Tornei**: Timeline interattiva con card moderne e iscrizioni real-time
- **🐉 Campagne D&D**: Gestione completa personaggi con modali biografiche dettagliate
- **📅 Timeline Tornei**: Visualizzazione cronologica con date reali e stati dinamici
- **🎭 Avatar Personaggi**: Sistema avatar personalizzati con indicatori party leader

### 👾bug noti

- **Persistenza elementi carrello**: Nel carrello degli utenti loggati a volte persistono gli elementi alla futura riapertura del server anche da sloggato

### ✅ Bug risolti di recente

- ✅ **Errore funzioni su nuovo utente registrato**: RISOLTO - Rimossa verifica email obbligatoria per ordini immediati
- ✅ **Mobile view non visualizzata correttamente**: RISOLTO - Migliorata interfaccia responsive per mobile
- ✅ **Notifiche poco professionali**: RISOLTO - Implementato sistema notifiche personalizzate animate
- ✅ **Carrello scattoso**: RISOLTO - Ottimizzati aggiornamenti incrementali fluidi
- ✅ **Controlli quantità poco chiari**: RISOLTO - Migliorati controlli con badge e tooltip
- ✅ **Date tornei mostravano TBD**: RISOLTO - Sistema date reali con formato italiano
- ✅ **Modali personaggi D&D mancanti**: RISOLTO - Implementati modali biografici completi
- ✅ **Iscrizioni tornei richiedevano email**: RISOLTO - Disabilitata verifica email obbligatoria
- ✅ **Tornei completati non distinguibili**: RISOLTO - Stili differenziati con badge completamento
- ✅ **Padding eccessivo box informazioni**: RISOLTO - Ottimizzato spacing per migliore UX

---

## 🎓 Aspetti Didattici

### 📚 Concetti Implementati

- **MVC Pattern**: Separazione Model-View-Controller
- **RESTful API**: Progettazione endpoint standard
- **Async/Await**: Programmazione asincrona moderna
- **Modular Architecture**: Componenti riutilizzabili
- **Security Best Practices**: Implementazione sicurezza web

### 🎯 Obiettivi Raggiunti

- ✅ SPA completa senza framework frontend
- ✅ Sistema autenticazione JWT funzionante
- ✅ Database relazionale con SQLite
- ✅ API REST complete e documentate
- ✅ Interfaccia utente responsive
- ✅ Sistema di ruoli e permessi
- ✅ Testing e debugging integrati
- ✅ Sistema tornei completo con timeline interattiva
- ✅ Gestione campagne D&D con personaggi dettagliati
- ✅ Modali biografici per personaggi con stats complete
- ✅ Sistema iscrizioni real-time con gestione liste d'attesa

---

## 🛠️ Sviluppi Futuri

### 📋 Miglioramenti Pianificati

- [ ] **Ottimizzazione Mobile**: Miglioramento responsive design
- [ ] **PWA Features**: Service Worker per funzionalità offline
- [ ] **Testing Automatizzato**: Suite di test unitari
- [ ] **Deployment**: Configurazione per hosting cloud
- [ ] **Performance**: Ulteriori ottimizzazioni caricamento

---

## 📄 Licenza

Questo progetto è rilasciato sotto licenza **ISC**.

```
ISC License

Copyright (c) 2024 Dice & Drink Gaming Café

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

---

## 🙏 Ringraziamenti

- **Corso di Laurea** per l'opportunità di sviluppo
- **Express.js Community** per il framework backend
- **SQLite Team** per il database embedded
- **Page.js** per il routing client-side
- **Node.js Ecosystem** per l'ambiente di sviluppo

---

<div align="center">

**🎓 Progetto Universitario - Tecnologie Web**

![Footer](https://img.shields.io/badge/Made%20with-❤️-red.svg)
![Footer](https://img.shields.io/badge/Vanilla-JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Footer](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Footer](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)
![Footer](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![Footer](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)

**⭐ Progetto SPA completo con tecnologie web pure ⭐**

</div>
