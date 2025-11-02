// Modified copy of tournaments.js with extra checks for empty My Tournaments
// ==========================================
// TOURNAMENTS PAGE - Dice & Drink
// Converted from HTML prototype to JS module
// ==========================================

// Simple notification function
function showNotification(message, type = 'info') {
    if (window.CustomNotifications) {
        const title = type === 'success' ? 'Successo' : type === 'error' ? 'Errore' : 'Info';
        window.CustomNotifications.show(title, message, type);
    } else {
        alert(message);
    }
}

// State management for tournaments
let tournamentState = {
    registeredTournaments: new Set(),
    completedTournaments: new Set(),
    currentView: 'all', // 'all' or 'my'
    userProfile: null,
    tournaments: []
};

// ==========================================
// MAIN PAGE FUNCTION
// ==========================================

export function showTournaments() {
    console.log('🏆 Loading tournaments page...');

    const content = document.getElementById('content');
    if (!content) {
        console.error('❌ Content element not found!');
        return;
    }

    content.innerHTML = '';

    // Create tournaments page structure
    const tournamentsPage = document.createElement('div');
    tournamentsPage.className = 'tournaments-page';
    tournamentsPage.innerHTML = generateTournamentsHTML();

    content.appendChild(tournamentsPage);

    // Initialize the page
    initializeTournamentsPage();
}

function generateTournamentsHTML() {
    return `
        <div class="container">
            <!-- Header -->
            <div class="tournaments-header">
                <h1>
                    <i class="fas fa-trophy"></i>
                    Tornei Dice & Drink
                </h1>
                <p>Partecipa ai nostri tornei di giochi da tavolo e divertiti con altri appassionati!</p>

                <!-- View Toggle -->
                <div class="view-toggle">
                    <button class="toggle-btn active" onclick="showAllTournaments(this)">
                        <i class="fas fa-list"></i>
                        Tutti i Tornei
                    </button>
                    <button class="toggle-btn" onclick="showMyTournaments(this)">
                        <i class="fas fa-user"></i>
                        I Miei Tornei
                    </button>
                    <button class="toggle-btn" id="createTournamentBtn" style="display:none" onclick="showCreateTournament(this)">
                        <i class="fas fa-plus"></i>
                        Crea Torneo
                    </button>
                </div>
            </div>

            <!-- I Miei Tornei Section -->
            <div class="my-tournaments-section" id="myTournamentsSection">
                <!-- User Profile Header -->
                <div class="user-profile-header">
                    <div class="user-profile-row">
                        <div class="user-avatar-block">
                            <div class="avatar-frame">
                                <img src="/images/avatars/cacciatore.png" alt="Foto profilo" class="profile-avatar">
                                <button type="button" class="avatar-change-btn" onclick="changeAvatar()">
                                    <i class="fas fa-camera"></i>
                                </button>
                            </div>
                        </div>
                        <div class="user-fields">
                            <div class="user-field">
                                <div class="field-label">
                                    <i class="fas fa-user"></i>
                                    Nome
                                </div>
                                <div class="field-value" id="username">Marco Rossi</div>
                                <button type="button" class="field-edit-btn" onclick="editField('username')">
                                    <i class="fas fa-pen"></i>
                                </button>
                            </div>
                            <div class="user-field">
                                <div class="field-label">
                                    <i class="fas fa-envelope"></i>
                                    Email
                                </div>
                                <div class="field-value" id="email">marco.rossi@email.com</div>
                                <button type="button" class="field-edit-btn" onclick="editField('email')">
                                    <i class="fas fa-pen"></i>
                                </button>
                            </div>
                            <div class="user-field">
                                <div class="field-label">
                                    <i class="fas fa-phone"></i>
                                    Telefono
                                </div>
                                <div class="field-value" id="phone">+39 333 123 4567</div>
                                <button type="button" class="field-edit-btn" onclick="editField('phone')">
                                    <i class="fas fa-pen"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Badges Section -->
                    <div class="badges-section">
                        <h3 class="badges-title">
                            <i class="fas fa-award"></i>
                            Coccarde e Riconoscimenti
                        </h3>
                        <div class="badges-grid" id="userBadges">
                            <!-- Populated dynamically -->
                        </div>
                    </div>

                    <!-- Stats Section -->
                    <div class="stats-section">
                        <h3 class="stats-title">
                            <i class="fas fa-chart-bar"></i>
                            Le Tue Statistiche
                        </h3>
                        <div class="stats-grid" id="userStats">
                            <!-- Populated dynamically -->
                        </div>
                    </div>
                </div>

                <!-- My Tournaments List -->
                <div id="upcomingTournaments">
                    <!-- Populated dynamically -->
                </div>

                <!-- Completed Tournaments -->
                <div id="completedTournaments">
                    <!-- Populated dynamically -->
                </div>
            </div>

            <!-- Tutti i Tornei Section -->
            <div class="all-tournaments-section active" id="allTournamentsSection">
                <div class="tournaments-timeline" id="allTournamentsList">
                    <div class="loading-placeholder" style="text-align: center; padding: 3rem; color: #666;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <p>Caricamento tornei in corso...</p>
                    </div>
                </div>
            </div>

            <!-- Create Tournament Section -->
            <div class="create-tournament-section" id="createTournamentSection"></div>
        </div>

        <!-- Modal Container -->
        <div id="modalContainer"></div>
    `;
}

// ==========================================
// INITIALIZATION
// ==========================================

async function initializeTournamentsPage() {
    try {
        console.log('🔄 Initializing tournaments system...');

        // Load user profile if authenticated
        await loadUserProfile();

        // Load tournaments
        await loadAllTournaments();

        // Initialize user badges and stats
        initializeUserProfile();

        // Setup scroll animations
        setTimeout(initScrollAnimations, 100);

        // React to auth events to keep UI in sync
        document.removeEventListener('userLoggedIn', handleAuthLoginEvent);
        document.removeEventListener('userLoggedOut', handleAuthLogoutEvent);
        document.addEventListener('userLoggedIn', handleAuthLoginEvent);
        document.addEventListener('userLoggedOut', handleAuthLogoutEvent);

        console.log('✅ Tournaments page loaded successfully!');

    } catch (error) {
        console.error('❌ Error initializing tournaments:', error);
        showErrorState('Errore durante il caricamento dei tornei');
    }
}

function handleAuthLoginEvent() {
    // Reload user profile and tournaments state
    loadUserProfile().then(() => {
        if (tournamentState.currentView === 'my') {
            loadUserTournaments();
        }
        updateAllTournamentsRegistrationState();
    });
}

function handleAuthLogoutEvent() {
    // Clear state and show prompt in My Tournaments
    tournamentState.userProfile = null;
    tournamentState.registeredTournaments.clear();
    updateAllTournamentsRegistrationState();
    if (tournamentState.currentView === 'my') {
        showAuthPromptInMyTournaments();
    }
}

// ==========================================
// DATA LOADING
// ==========================================

async function loadUserProfile() {
    try {
        if (window.SimpleAuth && window.SimpleAuth.isAuthenticated) {
            const user = window.SimpleAuth.currentUser;
            if (user) {
                tournamentState.userProfile = user;

                // Update user fields
                updateUserProfileDisplay(user);
                // Sync extra profile info (phone, avatar) from API
                await fetchAndSyncUserDetails(user.id);

                // Load user tournaments
                await loadUserTournaments();

                // Show admin/staff create button
                if (['admin', 'staff'].includes(user.role)) {
                    const btn = document.getElementById('createTournamentBtn');
                    if (btn) btn.style.display = '';
                }
            }
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

function updateUserProfileDisplay(user) {
    const usernameEl = document.getElementById('username');
    const emailEl = document.getElementById('email');
    const memberSinceEl = document.getElementById('memberSince');
    const phoneEl = document.getElementById('phone');
    const avatarImg = document.querySelector('.profile-avatar');

    if (usernameEl) usernameEl.textContent = `${user.first_name} ${user.last_name}`;
    if (emailEl) emailEl.textContent = user.email;
    if (memberSinceEl) {
        const date = new Date(user.created_at || Date.now());
        memberSinceEl.textContent = date.toLocaleDateString('it-IT', { year: 'numeric', month: 'short' });
    }
    if (phoneEl && user.phone) phoneEl.textContent = user.phone;
    if (avatarImg && user.profileImage) avatarImg.src = user.profileImage;
}

async function fetchAndSyncUserDetails(userId) {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
        if (!token || !userId) return;
        const [profileRes, avatarRes] = await Promise.all([
            fetch(`/api/users/${userId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`/api/users/${userId}/avatar`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        if (profileRes.ok) {
            const profileData = await profileRes.json();
            const u = profileData.user || {};
            const usernameEl = document.getElementById('username');
            const emailEl = document.getElementById('email');
            const phoneEl = document.getElementById('phone');
            if (usernameEl) usernameEl.textContent = `${u.firstName || u.first_name || ''} ${u.lastName || u.last_name || ''}`.trim();
            if (emailEl && u.email) emailEl.textContent = u.email;
            if (phoneEl && (u.phone || u.phone_number)) phoneEl.textContent = u.phone || u.phone_number;
        }
        if (avatarRes.ok) {
            const avatarData = await avatarRes.json();
            const avatarImg = document.querySelector('.profile-avatar');
            if (avatarImg && avatarData.avatarUrl) {
                const cacheBuster = `?t=${Date.now()}`;
                avatarImg.src = `${avatarData.avatarUrl}${cacheBuster}`;
            }
        }
        // Ensure profile header visible for authenticated users
        const header = document.querySelector('.user-profile-header');
        if (header) header.style.display = '';
    } catch (e) {
        console.warn('Failed syncing user details:', e);
    }
}

async function loadAllTournaments() {
    try {
        console.log('📡 Fetching tournaments from API...');
        const response = await apiFetch('/api/tournaments?orderBy=start_date&orderDir=ASC');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📊 Tournaments data received:', data);

        if (data.success && data.data) {
            tournamentState.tournaments = data.data;
            renderAllTournaments(data.data);
        } else {
            throw new Error(data.message || 'Failed to load tournaments');
        }

    } catch (error) {
        console.error('❌ Error loading tournaments:', error);
        showErrorInContainer('allTournamentsList', `Errore nel caricamento dei tornei: ${error.message}`);
    }
}

async function loadUserTournaments() {
    if (!window.SimpleAuth || !window.SimpleAuth.isAuthenticated) {
        showAuthPromptInMyTournaments();
        return;
    }

    try {
        const response = await apiFetch('/api/tournaments/user/my', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('authToken')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Update registered tournaments state
                tournamentState.registeredTournaments.clear();
                data.data.forEach(item => {
                    const tid = item.tournament_id || item.id; // DAO returns t.* (id) for joined rows
                    if (tid) tournamentState.registeredTournaments.add(parseInt(tid));
                });

                renderMyTournaments(data.data);
                updateAllTournamentsRegistrationState();

                // Ensure profile header is visible when logged-in view is shown
                const header = document.querySelector('.user-profile-header');
                if (header) header.style.display = '';
            }
        }
    } catch (error) {
        console.error('Error loading user tournaments:', error);
    }
}

// ==========================================
// RENDERING FUNCTIONS
// ==========================================

function renderAllTournaments(tournaments) {
    const container = document.getElementById('allTournamentsList');
    container.innerHTML = '';

    if (!tournaments || tournaments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>Nessun Torneo Disponibile</h3>
                <p>Al momento non ci sono tornei attivi. Torna presto per nuove opportunità di gioco!</p>
            </div>
        `;
        return;
    }

    const now = new Date();
    const available = tournaments.filter(t => {
        const start = new Date(t.start_date);
        return t.status !== 'completed' && t.status !== 'cancelled' && start >= now;
    });
    const past = tournaments.filter(t => !available.includes(t));

    if (available.length > 0) {
        const title = document.createElement('h3');
        title.style.cssText = 'color: var(--color-primary); margin-bottom:1.5rem;';
        title.innerHTML = '<i class="fas fa-calendar-alt"></i> Tornei Disponibili';
        container.appendChild(title);
        const timeline = document.createElement('div');
        timeline.className = 'tournaments-timeline';
        available.forEach(t => timeline.appendChild(createTournamentCard(t)));
        container.appendChild(timeline);
    }

    if (past.length > 0) {
        const title = document.createElement('h3');
        title.style.cssText = 'color: var(--color-primary); margin:2rem 0 1.5rem;';
        title.innerHTML = '<i class="fas fa-archive"></i> Tornei Conclusi o Passati';
        container.appendChild(title);
        const pastTimeline = document.createElement('div');
        pastTimeline.className = 'tournaments-timeline';
        past.forEach(t => pastTimeline.appendChild(createTournamentCard(t)));
        container.appendChild(pastTimeline);
    }

    showNotification(`${tournaments.length} tornei caricati con successo!`, 'success');
}

function renderMyTournaments(userTournaments) {
    const upcomingContainer = document.getElementById('upcomingTournaments');
    const completedContainer = document.getElementById('completedTournaments');
    const section = document.getElementById('myTournamentsSection');
    // Ensure profile header visible in authenticated context
    const header = document.querySelector('.user-profile-header');
    if (header) header.style.display = '';

    if (!userTournaments || userTournaments.length === 0) {
        if (section) section.classList.add('empty');
        upcomingContainer.innerHTML = '';
        completedContainer.innerHTML = '';
        return;
    }
    if (section) section.classList.remove('empty');

    // Group tournaments by status
    const upcoming = userTournaments.filter(t => t.status !== 'completed');
    const completed = userTournaments.filter(t => t.status === 'completed');

    // Render upcoming tournaments
    if (upcoming.length > 0) {
        const upcomingCardsHTML = upcoming.map(userTournament => {
            const tid = userTournament.tournament_id || userTournament.id;
            const tournament = tournamentState.tournaments.find(t => t.id === tid) || userTournament;
            if (!tournament) return '';

            const cardHTML = generateTournamentCardHTML(tournament, true);
            const themeClass = getTournamentThemeClass(tournament);

            return `<div class="tournament-card ${themeClass} registered" data-tournament-id="${tournament.id}">${cardHTML}</div>`;
        }).filter(html => html).join('');

        upcomingContainer.innerHTML = `
            <div style="margin-top: 2rem;">
                <h3 style="color: var(--color-primary); margin-bottom: 2rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-calendar-alt"></i>
                    Tornei in Corso e Prossimi (${upcoming.length})
                </h3>
                <div class="tournaments-timeline">
                    ${upcomingCardsHTML}
                </div>
            </div>
        `;
    } else {
        upcomingContainer.innerHTML = `
            <div style="margin-top: 2rem;">
                <h3 style="color: var(--color-primary); margin-bottom: 2rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-calendar-alt"></i>
                    Tornei in Corso e Prossimi
                </h3>
                <div style="text-align: center; padding: 3rem; background: #f8f9fa; border-radius: 12px; color: #666;">
                    <i class="fas fa-calendar-plus" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                    <h4>Nessun torneo in programma</h4>
                    <p>Vai alla sezione "Tutti i Tornei" per iscriverti a nuovi eventi!</p>
                </div>
            </div>
        `;
    }

    // Render completed tournaments
    if (completed.length > 0) {
        const completedCardsHTML = completed.map(userTournament => {
            const tid = userTournament.tournament_id || userTournament.id;
            const tournament = tournamentState.tournaments.find(t => t.id === tid) || userTournament;
            if (!tournament) return '';

            const cardHTML = generateTournamentCardHTML(tournament, true);
            const themeClass = getTournamentThemeClass(tournament);

            return `<div class="tournament-card ${themeClass} completed" data-tournament-id="${tournament.id}">${cardHTML}</div>`;
        }).filter(html => html).join('');

        completedContainer.innerHTML = `
            <div style="margin-top: 3rem;">
                <h3 style="color: var(--color-primary); margin-bottom: 2rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-trophy"></i>
                    Tornei Conclusi (${completed.length})
                </h3>
                <div class="tournaments-timeline">
                    ${completedCardsHTML}
                </div>
            </div>
        `;
    } else {
        completedContainer.innerHTML = '';
    }
}

function getTournamentThemeClass(tournament) {
    if (!tournament) return 'default-theme';

    const themeMap = {
        'strategy': 'strategy-theme',
        'party': 'party-theme',
        'dnd': 'dnd-theme',
        'card': 'card-theme',
        'racing': 'racing-theme',
        'puzzle': 'puzzle-theme'
    };

    let theme = themeMap[tournament.category] || 'default-theme';

    // Add special D&D class for campaigns
    if (tournament.category === 'dnd' && tournament.format === 'campaign') {
        theme += ' dnd-special';
    }

    return theme;
}

function createTournamentCard(tournament, isMyTournament = false) {
    const card = document.createElement('div');
    card.className = getTournamentCardClasses(tournament);
    card.dataset.tournamentId = tournament.id;

    card.innerHTML = generateTournamentCardHTML(tournament, isMyTournament);

    return card;
}

function getTournamentCardClasses(tournament) {
    let classes = 'tournament-card';

    // Add theme class
    if (tournament.category) {
        classes += ` ${tournament.category}-theme`;
    }

    // Add special D&D class for campaigns
    if (tournament.category === 'dnd' && tournament.format === 'campaign') {
        classes += ' dnd-special';
    }

    // Add registered state if user is registered
    if (tournamentState.registeredTournaments.has(tournament.id)) {
        classes += ' registered';
    }

    return classes;
}

function generateTournamentCardHTML(tournament, isMyTournament) {
    const displayDate = getDisplayDate(tournament.start_date);
    const isRegistered = tournamentState.registeredTournaments.has(tournament.id);
    const isAuthenticated = window.SimpleAuth && window.SimpleAuth.isAuthenticated;
    const isRecurring = tournament.is_recurring || tournament.isRecurring;

    return `
        <!-- Tournament Date -->
        <div class="tournament-date${isRecurring ? ' recurring' : ''}">
            <span class="day">${displayDate.day}</span>
            <span class="month">${displayDate.month}</span>
        </div>

        <!-- Tournament Header -->
        <div class="tournament-header">
            <div class="tournament-info">
                <h2 class="tournament-title">
                    <i class="fas ${getTournamentIcon(tournament)}"></i>
                    ${tournament.title}
                </h2>
                <div class="tournament-game">
                    ${tournament.gameName || tournament.game_name || 'Gioco da tavolo'}
                    <button class="game-info-btn" onclick="showGameInfo('${tournament.category}', '${(tournament.gameName || tournament.game_name || 'Gioco da tavolo').replace(/['"\\]/g, '\\$&')}', '${tournament.difficulty || ''}', ${tournament.min_participants || tournament.minParticipants || 'null'}, ${tournament.max_participants || tournament.maxParticipants || 'null'}, '${(tournament.start_time || tournament.startTime || '') && (tournament.end_time || tournament.endTime || '') ? `${tournament.start_time || tournament.startTime}-${tournament.end_time || tournament.endTime}` : ''}')">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
                <div class="tournament-tags">
                    ${generateTournamentTags(tournament, isRegistered, isMyTournament)}
                </div>
                <div class="tournament-time">
                    <i class="fas fa-clock"></i>
                    ${formatTournamentTime(tournament)}
                </div>
            </div>
            ${generateTournamentStatus(tournament)}
        </div>

        <!-- Tournament Details -->
        ${tournament.category === 'dnd'
            ? generateDnDTournamentDetails(tournament)
            : generateStandardTournamentDetails(tournament)}

        <!-- D&D Campaign Specific Content -->
        ${tournament.category === 'dnd' ? generateDnDContent(tournament) : ''}

        <!-- Tournament Actions -->
        ${generateTournamentActions(tournament, isRegistered, isAuthenticated, isMyTournament)}
    `;
}

function generateStandardTournamentDetails(tournament) {
    return `
        <div class="tournament-details">
            <div class="detail-item">
                <div class="detail-icon"><i class="fas fa-users"></i></div>
                <div class="detail-content">
                    <div class="detail-label">Partecipanti</div>
                    <div class="detail-value">${tournament.current_participants || 0} / ${tournament.max_participants || 'N/A'}</div>
                    ${generateParticipantsBar(tournament)}
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-icon"><i class="fas fa-euro-sign"></i></div>
                <div class="detail-content">
                    <div class="detail-label">Quota partecipazione</div>
                    <div class="detail-value">${tournament.entry_fee ? `€${tournament.entry_fee}` : 'Gratuito'}</div>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-icon"><i class="fas fa-gift"></i></div>
                <div class="detail-content">
                    <div class="detail-label">Premio</div>
                    <div class="detail-value">${getFirstPrize(tournament)}</div>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-icon"><i class="fas fa-star"></i></div>
                <div class="detail-content">
                    <div class="detail-label">Difficoltà</div>
                    <div class="detail-value">${getDifficultyText(tournament.difficulty)}</div>
                </div>
            </div>
        </div>
    `;
}

function generateDnDTournamentDetails(tournament) {
    const currentSession = tournament.current_session || tournament.currentSession;
    const totalSessions = tournament.total_sessions || tournament.totalSessions;
    const hoursPlayed = tournament.hours_played || tournament.played_hours || tournament.total_hours || tournament.totalHours;
    const currentLevel = tournament.current_level || tournament.currentLevel;
    const setting = tournament.dnd_setting || tournament.setting || tournament.dndSetting;
    return `
        <div class="tournament-details">
            <div class="detail-item">
                <div class="detail-icon"><i class="fas fa-scroll"></i></div>
                <div class="detail-content">
                    <div class="detail-label">Sessione Corrente</div>
                    <div class="detail-value">${currentSession || '?'}${totalSessions ? ` / ${totalSessions}` : ''}</div>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-icon"><i class="fas fa-hourglass-half"></i></div>
                <div class="detail-content">
                    <div class="detail-label">Ore di Gioco</div>
                    <div class="detail-value">${hoursPlayed || '0h'}</div>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-icon"><i class="fas fa-level-up-alt"></i></div>
                <div class="detail-content">
                    <div class="detail-label">Livello Gruppo</div>
                    <div class="detail-value">${currentLevel || '?'}°</div>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-icon"><i class="fas fa-map"></i></div>
                <div class="detail-content">
                    <div class="detail-label">Setting</div>
                    <div class="detail-value">${setting || 'N/D'}</div>
                </div>
            </div>
        </div>
    `;
}

function generateDnDContent(tournament) {
    // Parse party composition if it's a JSON string
    let partyComposition = tournament.partyComposition || tournament.party_composition;
    if (typeof partyComposition === 'string') {
        try { partyComposition = JSON.parse(partyComposition); } catch { partyComposition = []; }
    }

    let safetyTools = tournament.dndSafetyTools || tournament.dnd_safety_tools || [];
    if (typeof safetyTools === 'string') { try { safetyTools = JSON.parse(safetyTools); } catch { safetyTools = []; } }

    const dm = tournament.dungeonMaster || tournament.dungeon_master || '';
    const location = tournament.location || '';
    const playStyle = tournament.play_style || tournament.playStyle || '';
    const requiredExp = tournament.required_experience || tournament.requiredExperience || '';

    const maxSlots = tournament.max_participants || tournament.maxParticipants || 5;
    const emptySlotsCount = Math.max(0, maxSlots - (Array.isArray(partyComposition) ? partyComposition.length : 0));

    return `
        <div class="dnd-campaign-info" style="margin: 1.5rem 0; padding: 1.5rem; background: var(--color-dnd-bg); border-radius: 12px; border: 2px solid var(--color-dnd);">
            <div class="campaign-section">
                <h4><i class="fas fa-scroll"></i> Dettagli Campagna</h4>
                <div class="campaign-details-grid">
                    ${dm ? `<div class="campaign-detail-item"><div class="campaign-detail-icon"><i class="fas fa-user-tie"></i></div><div><div class="detail-label">Dungeon Master</div><div class="detail-value">${dm}</div></div></div>` : ''}
                    ${location ? `<div class="campaign-detail-item"><div class="campaign-detail-icon"><i class="fas fa-map-marker-alt"></i></div><div><div class="detail-label">Location</div><div class="detail-value">${location}</div></div></div>` : ''}
                    ${playStyle ? `<div class="campaign-detail-item"><div class="campaign-detail-icon"><i class="fas fa-theater-masks"></i></div><div><div class="detail-label">Stile di Gioco</div><div class="detail-value">${playStyle}</div></div></div>` : ''}
                    ${requiredExp ? `<div class="campaign-detail-item"><div class="campaign-detail-icon"><i class="fas fa-star"></i></div><div><div class="detail-label">Esperienza Richiesta</div><div class="detail-value">${requiredExp}</div></div></div>` : ''}
                </div>
            </div>

            <div class="campaign-section">
                <h4><i class="fas fa-users"></i> Composizione Party</h4>
                <div class="character-avatars">
                    ${(partyComposition || []).map(ch => `
                        <div class="character-avatar ${ch.leader ? 'party-leader' : ''}" onclick="showCharacterBio('${ch.id || ch.characterId || ch.name}')">
                            <img src="${ch.avatar || '/images/avatars/default.png'}" alt="${ch.characterName || ch.name}" onerror="this.src='/images/avatars/default.png'" />
                            ${ch.leader ? `<span class='crown'><i class="fas fa-crown"></i></span>` : ''}
                            <div class="character-tooltip">
                                <strong>${ch.accountName || ch.username || 'Giocatore'}</strong><br/>
                                ${ch.characterName || ch.name || ''}<br/>
                                <em>${ch.gender || ''}</em>
                            </div>
                        </div>
                    `).join('')}
                    ${Array.from({ length: emptySlotsCount }).map(() => `
                        <div class="character-avatar empty-slot" onclick="showDnDRegistrationModal('${tournament.id}')">
                            <div class="empty-avatar"><i class="fas fa-plus"></i></div>
                        </div>
                    `).join('')}
                </div>
            </div>

            ${(Array.isArray(tournament.rules) && tournament.rules.length) || (Array.isArray(tournament.included) && tournament.included.length) ? `
            <div class="campaign-section">
                <h4><i class="fas fa-scroll"></i> Regole & Inclusi</h4>
                <div class="campaign-details-grid">
                    ${Array.isArray(tournament.rules) && tournament.rules.length ? `
                        <div class="info-card"><h4><i class="fas fa-gavel"></i> Regole</h4><ul>${tournament.rules.map(r => `<li>${r}</li>`).join('')}</ul></div>` : ''}
                    ${Array.isArray(tournament.included) && tournament.included.length ? `
                        <div class="info-card"><h4><i class="fas fa-gift"></i> Incluso</h4><ul>${tournament.included.map(i => `<li>${i}</li>`).join('')}</ul></div>` : ''}
                    ${Array.isArray(safetyTools) && safetyTools.length ? `
                        <div class="info-card"><h4><i class="fas fa-shield-alt"></i> Safety Tools</h4><ul>${safetyTools.map(s => `<li>${s}</li>`).join('')}</ul></div>` : ''}
                </div>
            </div>` : ''}
        </div>
    `;
}

function generateTournamentTags(tournament, isRegistered, isMyTournament) {
    const tags = [];

    if (isRegistered) {
        tags.push('<span class="tag registered"><i class="fas fa-user-check"></i> Iscritto</span>');
    }

    if (tournament.status === 'ongoing') {
        tags.push('<span class="tag ongoing"><i class="fas fa-play"></i> In Corso</span>');
    }

    if (tournament.category) {
        tags.push(`<span class="tag ${tournament.category}"><i class="fas ${getCategoryIcon(tournament.category)}"></i> ${getCategoryName(tournament.category)}</span>`);
    }

    return tags.join('');
}

function generateTournamentActions(tournament, isRegistered, isAuthenticated, isMyTournament) {
    // Special case for D&D cards: show register + campaign info buttons
    if (tournament.category === 'dnd') {
        if (!isAuthenticated) {
            return `
            <div class="tournament-actions">
                <button class="btn btn-primary" onclick="showAuthPrompt()">
                    <i class="fas fa-user-plus"></i>
                    Accedi per Iscriverti
                </button>
                <button class="btn btn-secondary" onclick="showCampaignInfo('${tournament.id}')">
                    <i class="fas fa-scroll"></i>
                    Info Campagna
                </button>
            </div>
        `;
        }

        if (isRegistered) {
            return `
            <div class="tournament-actions">
                <button class="btn btn-success" disabled>
                    <i class="fas fa-check"></i>
                    Già Iscritto
                </button>
                <button class="btn btn-secondary" onclick="showCampaignInfo('${tournament.id}')">
                    <i class="fas fa-scroll"></i>
                    Info Campagna
                </button>
            </div>
        `;
        }

        return `
        <div class="tournament-actions">
            <button class="btn btn-primary" onclick="showDnDRegistrationModal('${tournament.id}')">
                <i class="fas fa-user-plus"></i>
                Richiedi Accesso
            </button>
            <button class="btn btn-secondary" onclick="showCampaignInfo('${tournament.id}')">
                <i class="fas fa-scroll"></i>
                Info Campagna
            </button>
        </div>
        `;
    }

    if (tournament.status === 'completed') {
        return `
            <div class="tournament-actions">
                <button class="btn btn-secondary" onclick="openTournamentModal('${tournament.id}')">
                    <i class="fas fa-info-circle"></i>
                    Informazioni
                </button>
            </div>
        `;
    }

    if (!isAuthenticated) {
        return `
            <div class="tournament-actions">
                <button class="btn btn-secondary" onclick="openTournamentModal('${tournament.id}')">
                    <i class="fas fa-info-circle"></i>
                    Informazioni
                </button>
                <button class="btn btn-primary" onclick="showAuthPrompt()">
                    <i class="fas fa-user-plus"></i>
                    Accedi per Iscriverti
                </button>
            </div>
        `;
    }

    if (isRegistered) {
        return `
            <div class="tournament-actions">
                <button class="btn btn-secondary" onclick="openTournamentModal('${tournament.id}')">
                    <i class="fas fa-info-circle"></i>
                    Informazioni
                </button>
                <button class="btn btn-danger" onclick="unregisterFromTournament('${tournament.id}')">
                    <i class="fas fa-times"></i>
                    Cancella Iscrizione
                </button>
            </div>
        `;
    }

    return `
        <div class="tournament-actions">
            <button class="btn btn-secondary" onclick="openTournamentModal('${tournament.id}')">
                <i class="fas fa-info-circle"></i>
                Informazioni
            </button>
            <button class="btn btn-primary" onclick="registerForTournament('${tournament.id}')">
                <i class="fas fa-plus"></i>
                Iscriviti
            </button>
        </div>
    `;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function getDisplayDate(dateString) {
    if (!dateString) {
        return {
            day: 'TBD',
            month: 'DATA'
        };
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return {
            day: 'TBD',
            month: 'DATA'
        };
    }

    return {
        day: date.getDate().toString().padStart(2, '0'),
        month: date.toLocaleString('it-IT', { month: 'short' }).toUpperCase()
    };
}

function getTournamentIcon(tournament) {
    const iconMap = {
        'strategy': 'fa-chess',
        'party': 'fa-wine-glass-alt',
        'dnd': 'fa-dragon',
        'card': 'fa-magic',
        'racing': 'fa-flag-checkered',
        'puzzle': 'fa-puzzle-piece'
    };
    return iconMap[tournament.category] || 'fa-trophy';
}

function getCategoryIcon(category) {
    const iconMap = {
        'strategy': 'fa-chess',
        'party': 'fa-wine-glass-alt',
        'dnd': 'fa-dice-d20',
        'card': 'fa-magic',
        'racing': 'fa-flag-checkered',
        'puzzle': 'fa-puzzle-piece'
    };
    return iconMap[category] || 'fa-gamepad';
}

function getCategoryName(category) {
    const nameMap = {
        'strategy': 'Strategia',
        'party': 'Party Game',
        'dnd': 'D&D',
        'card': 'Card Game',
        'racing': 'Racing',
        'puzzle': 'Puzzle'
    };
    return nameMap[category] || 'Gioco';
}

function formatTournamentTime(tournament) {
    if (tournament.is_recurring || tournament.isRecurring) {
        const recurringMap = {
            'weekly': 'Ogni Sabato',
            'monthly': 'Ogni Mese'
        };
        const pattern = recurringMap[tournament.recurring_pattern || tournament.recurringPattern] || 'Ricorrente';
        return `${pattern} • ${tournament.start_time || tournament.startTime || '15:00'} - ${tournament.end_time || tournament.endTime || '19:00'}`;
    }

    const dateString = tournament.start_date || tournament.startDate;
    if (!dateString) {
        return `Data da definire • ${tournament.start_time || tournament.startTime || '20:30'} - ${tournament.end_time || tournament.endTime || '23:00'}`;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return `Data da definire • ${tournament.start_time || tournament.startTime || '20:30'} - ${tournament.end_time || tournament.endTime || '23:00'}`;
    }

    const dayName = date.toLocaleDateString('it-IT', { weekday: 'long' });
    const dayNumber = date.getDate();
    const month = date.toLocaleDateString('it-IT', { month: 'long' });

    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayNumber} ${month} • ${tournament.start_time || tournament.startTime || '20:30'} - ${tournament.end_time || tournament.endTime || '23:00'}`;
}

function generateParticipantsBar(tournament) {
    if (!tournament.max_participants) return '';

    const current = tournament.current_participants || 0;
    const max = tournament.max_participants;
    const percentage = Math.min((current / max) * 100, 100);
    const progressClass = percentage < 50 ? 'low' : percentage < 80 ? 'medium' : 'high';

    return `
        <div class="participants-bar">
            <div class="participants-progress ${progressClass}" style="width: ${percentage}%"></div>
        </div>
    `;
}

function getFirstPrize(tournament) {
    if (tournament.prizes && Array.isArray(tournament.prizes)) {
        return tournament.prizes[0] || 'Da definire';
    }

    if (tournament.prizes && typeof tournament.prizes === 'string') {
        try {
            const prizes = JSON.parse(tournament.prizes);
            return prizes[0] || 'Da definire';
        } catch (e) {
            return tournament.prizes;
        }
    }

    if (tournament.prize_pool > 0) {
        return `€${tournament.prize_pool}`;
    }

    return 'Partecipazione';
}

function generateTournamentStatus(tournament) {
    const start = new Date(tournament.start_date);
    const now = new Date();
    let statusText = 'Posti disponibili';
    let statusClass = 'available';

    if (tournament.status === 'cancelled') {
        statusText = 'Cancellato';
        statusClass = 'closed';
    } else if (tournament.status === 'completed' || start < now) {
        statusText = 'Concluso';
        statusClass = 'closed';
    } else if (tournament.current_participants >= tournament.max_participants) {
        statusText = 'Pieno';
        statusClass = 'full';
    } else if (tournament.registration_open === false) {
        statusText = 'Iscrizioni chiuse';
        statusClass = 'closed';
    }

    return `<div class="tournament-status ${statusClass}"><i class="fas fa-users"></i> ${statusText}</div>`;
}

function getDifficultyText(difficulty) {
    const difficultyMap = {
        'easy': 'Principiante',
        'medium': 'Intermedio',
        'hard': 'Esperto'
    };
    return difficultyMap[difficulty] || 'Intermedio';
}

// ==========================================
// EVENT HANDLERS (from prototype)
// ==========================================

window.showAllTournaments = function(element = null) {
    if (element) {
        // Update toggle buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        element.classList.add('active');
    }

    // Show/hide sections
    document.getElementById('allTournamentsSection').classList.add('active');
    document.getElementById('myTournamentsSection').classList.remove('active');
    document.getElementById('createTournamentSection').classList.remove('active');

    tournamentState.currentView = 'all';
    console.log('📋 Showing all tournaments');
};

window.showMyTournaments = function(element = null) {
    if (element) {
        document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        element.classList.add('active');
    }

    const mySection = document.getElementById('myTournamentsSection');
    document.getElementById('allTournamentsSection').classList.remove('active');
    document.getElementById('createTournamentSection').classList.remove('active');

    tournamentState.currentView = 'my';

    if (window.SimpleAuth && window.SimpleAuth.isAuthenticated) {
        mySection.classList.add('active');
        mySection.classList.remove('empty');
        loadUserTournaments();
    } else {
        mySection.classList.remove('active');
        mySection.classList.add('empty');
    }

    console.log('👤 Showing my tournaments');
};

window.showCreateTournament = function(element = null) {
    if (element) {
        document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        element.classList.add('active');
    }

    document.getElementById('allTournamentsSection').classList.remove('active');
    document.getElementById('myTournamentsSection').classList.remove('active');
    document.getElementById('createTournamentSection').classList.add('active');

    tournamentState.currentView = 'create';
    renderCreateTournamentForm();
};

window.registerForTournament = async function(tournamentId, buttonElement = null) {
    const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
    if (!window.SimpleAuth || !window.SimpleAuth.isAuthenticated || !token) {
        showAuthPrompt();
        return;
    }

    try {
        const response = await fetch(`/api/tournaments/${tournamentId}/register`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            showAuthPrompt();
            return;
        }

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            tournamentState.registeredTournaments.add(parseInt(tournamentId));
            updateTournamentState(tournamentId, 'register');

            // Show success modal
            showRegistrationSuccessModal(tournamentId);

            // Reload user tournaments if in my tournaments view
            if (tournamentState.currentView === 'my') {
                await loadUserTournaments();
            }
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error registering for tournament:', error);
        showNotification('Errore durante la registrazione', 'error');
    }
};

window.unregisterFromTournament = async function(tournamentId) {
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
        const response = await fetch(`/api/tournaments/${tournamentId}/register`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            tournamentState.registeredTournaments.delete(parseInt(tournamentId));
            updateTournamentState(tournamentId, 'unregister');

            // Reload user tournaments if in my tournaments view
            if (tournamentState.currentView === 'my') {
                await loadUserTournaments();
            }
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error unregistering from tournament:', error);
        showNotification('Errore durante la cancellazione', 'error');
    }
};

window.showDnDRegistrationModal = function(tournamentId) {
    if (!window.SimpleAuth || !window.SimpleAuth.isAuthenticated) {
        showAuthPrompt();
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title"><i class="fas fa-user-plus"></i> Richiedi Accesso alla Campagna D&D</h2>
                <button class="modal-close" onclick="closeModal(this.closest('.modal'))"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="info-card" style="background: rgba(255, 193, 7, 0.1); border-color: #ffc107; margin-bottom: 1.5rem;">
                    <h4 style="color: #e67e22;"><i class="fas fa-exclamation-triangle"></i> Campagna in Corso</h4>
                    <p>Questa è una campagna D&D già iniziata. La tua richiesta sarà valutata dal party leader.</p>
                </div>
                <div class="info-card" style="margin-bottom: 1.5rem;">
                    <h4><i class="fas fa-envelope"></i> Messaggio per il Party Leader</h4>
                    <textarea id="dndRequestMessage" placeholder="Descrivi la tua esperienza e il personaggio che vorresti inserire..." style="width: 100%; min-height: 120px; padding: 1rem; border: 2px solid #ddd; border-radius: 8px; resize: vertical;"></textarea>
                </div>
                <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
                    <button class="btn btn-secondary" onclick="closeModal(this.closest('.modal'))"><i class="fas fa-times"></i> Annulla</button>
                    <button class="btn btn-primary" onclick="submitDnDRequest(this, '${tournamentId}')"><i class="fas fa-paper-plane"></i> Invia Richiesta</button>
                </div>
            </div>
        </div>`;
    document.getElementById('modalContainer').appendChild(modal);
    document.body.classList.add('modal-open');
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });
};

window.submitDnDRequest = async function(button, tournamentId) {
    const message = document.getElementById('dndRequestMessage').value.trim();
    if (message.length < 50) {
        showNotification('Il messaggio deve contenere almeno 50 caratteri', 'error');
        return;
    }
    try {
        button.disabled = true;
        const res = await fetch(`/api/tournaments/${tournamentId}/request`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });
            showNotification(data.message || 'Richiesta inviata', 'success');
            tournamentState.registeredTournaments.add(parseInt(tournamentId));
            updateTournamentState(tournamentId, 'register');
            closeModal(button.closest('.modal'));
            if (tournamentState.currentView === 'my') {
                await loadUserTournaments();
            }
        } else {
            showNotification(data.message || 'Errore invio richiesta', 'error');
            button.disabled = false;
        }
    } catch (err) {
        console.error('submitDnDRequest error:', err);
        showNotification('Errore invio richiesta', 'error');
        button.disabled = false;
    }
};

window.openTournamentModal = async function(tournamentId) {
    try {
        const [tRes, pRes] = await Promise.all([
            fetch(`/api/tournaments/${tournamentId}`),
            fetch(`/api/tournaments/${tournamentId}/participants`)
        ]);

        const tData = await tRes.json();
        const pData = pRes.ok ? await pRes.json() : { success: false };

        if (tData.success) {
            const participants = pData.success && pData.data ? pData.data.participants : [];
            createTournamentModal(tData.data, participants);
        } else {
            showNotification('Errore nel caricamento del torneo', 'error');
        }
    } catch (error) {
        console.error('Error loading tournament details:', error);
        showNotification('Errore nel caricamento del torneo', 'error');
    }
};

// Modal with detailed campaign information (based on HTML prototype)
window.showCampaignInfo = function(campaignId) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1000px; width: 90%; max-height: 85vh; overflow-y: auto;">
            <div class="modal-header" style="background: linear-gradient(135deg, var(--color-dnd), #9370db); color: white;">
                <h2 class="modal-title" style="color: white;">
                    <i class="fas fa-dragon"></i>
                    La Maledizione di Strahd - Informazioni Campagna
                </h2>
                <button class="modal-close" style="color: white;" onclick="closeModal(this.closest('.modal'))">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 2rem;">
                <div class="modal-section">
                    <h3><i class="fas fa-scroll"></i> Panoramica della Campagna</h3>
                    <div class="info-card" style="padding: 1.5rem; text-align: center; margin-bottom: 2rem;">
                        <p style="font-size: 1.1rem; line-height: 1.7; color: #666;">
                            <strong>Curse of Strahd</strong> è una delle campagne più iconiche di D&D 5e. I personaggi vengono trascinati nel dominio gotico di Barovia, intrappolati dalle nebbie che circondano questa terra maledetta, dove devono affrontare l'antico vampiro Strahd von Zarovich nel suo castello.
                        </p>
                    </div>
                </div>

                <div class="modal-section">
                    <h3><i class="fas fa-info-circle"></i> Dettagli della Campagna</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
                        <div class="info-card">
                            <h4><i class="fas fa-user-tie"></i> Dungeon Master</h4>
                            <div style="display: flex; align-items: center; gap: 1rem; margin-top: 0.8rem;">
                                <img src="/images/avatars/mago.png" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid var(--color-dnd);">
                                <div>
                                    <strong>Marco \"Il Narratore\" Rossi</strong><br>
                                    <small>5+ anni di esperienza • Specializzato in Horror Gothic</small>
                                </div>
                            </div>
                        </div>

                        <div class="info-card">
                            <h4><i class="fas fa-calendar-alt"></i> Programma</h4>
                            <p><strong>Quando:</strong> Ogni Sabato</p>
                            <p><strong>Orario:</strong> 15:00 - 19:00 (4 ore)</p>
                            <p><strong>Pausa:</strong> 17:00 - 17:15</p>
                            <p><strong>Prossima Sessione:</strong> 12 Gennaio 2025</p>
                        </div>

                        <div class="info-card">
                            <h4><i class="fas fa-map-marker-alt"></i> Ambientazione</h4>
                            <p><strong>Livello Attuale:</strong> 8° Livello</p>
                            <p><strong>Sessioni Completate:</strong> 12/20 (stimato)</p>
                            <p><strong>Ore Giocate:</strong> 48h totali</p>
                            <p><strong>Location:</strong> Barovia - Vallaki</p>
                        </div>

                        <div class="info-card">
                            <h4><i class="fas fa-cogs"></i> Stile di Gioco</h4>
                            <p><i class="fas fa-theater-masks"></i> <strong>Roleplay:</strong> 60%</p>
                            <p><i class="fas fa-sword"></i> <strong>Combattimento:</strong> 30%</p>
                            <p><i class="fas fa-search"></i> <strong>Esplorazione:</strong> 10%</p>
                            <p><strong>Tono:</strong> Horror Gothic Serio</p>
                        </div>
                    </div>
                </div>

                <div class="modal-section">
                    <h3><i class="fas fa-users"></i> Party Attuale (3/4 membri)</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
                        <div class="info-card">
                            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                                <div style="position: relative;">
                                    <img src="/images/avatars/dragonide.png" style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid #ffd700;">
                                    <i class="fas fa-crown" style="position: absolute; top: -8px; right: -5px; color: #ffd700; font-size: 1.2rem;"></i>
                                </div>
                                <div>
                                    <h4 style="color: var(--color-dnd); margin-bottom: 0.3rem;">Elena Drakemoor</h4>
                                    <p><strong>Party Leader</strong> • Paladino Dragonide</p>
                                    <small>Tank/Support • Specializzato in protezione gruppo</small>
                                </div>
                            </div>
                        </div>

                        <div class="info-card">
                            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                                <img src="/images/avatars/cacciatore.png" style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid var(--color-dnd);">
                                <div>
                                    <h4 style="color: var(--color-dnd); margin-bottom: 0.3rem;">Marcus Shadowbane</h4>
                                    <p>Ranger Umano • Cacciatore di Mostri</p>
                                    <small>DPS/Scout • Esperto in sopravvivenza</small>
                                </div>
                            </div>
                        </div>

                        <div class="info-card">
                            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                                <img src="/images/avatars/elfo.png" style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid var(--color-dnd);">
                                <div>
                                    <h4 style="color: var(--color-dnd); margin-bottom: 0.3rem;">Lyralei Moonwhisper</h4>
                                    <p>Druida Elfa • Guaritrice</p>
                                    <small>Healer/Utility • Magia della natura</small>
                                </div>
                            </div>
                        </div>

                        <div class="info-card" style="border: 3px dashed var(--color-dnd); text-align: center; display: flex; align-items: center; justify-content: center;">
                            <div>
                                <i class="fas fa-plus" style="font-size: 2rem; color: var(--color-dnd); margin-bottom: 0.5rem;"></i>
                                <h4 style="color: var(--color-dnd);">Slot Libero</h4>
                                <p>Ruolo consigliato: <strong>Wizard/Caster</strong></p>
                                <button class="btn" style="margin-top: 0.8rem; background: var(--color-dnd); color: white; border-color: var(--color-dnd);" onclick="registerForTournament('${campaignId}')">
                                    <i class="fas fa-user-plus"></i>
                                    Candidati
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-section">
                    <h3><i class="fas fa-gavel"></i> Regole della Campagna</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                        <div class="info-card">
                            <h4><i class="fas fa-book"></i> Regole Generali</h4>
                            <ul style="margin-left: 1rem; line-height: 1.6;">
                                <li>Puntualità richiesta (15:00 sharp)</li>
                                <li>Sessioni senza telefoni/distrazioni</li>
                                <li>Rispetto per tutti i giocatori</li>
                                <li>Backup del personaggio richiesto</li>
                                <li>Comunicazione assenze 24h prima</li>
                            </ul>
                        </div>
                        <div class="info-card">
                            <h4><i class="fas fa-dice-d20"></i> Regole di Gioco</h4>
                            <ul style="margin-left: 1rem; line-height: 1.6;">
                                <li>D&D 5e PHB + Xanathar's Guide</li>
                                <li>Point Buy per le statistiche</li>
                                <li>No multi-classing estremo</li>
                                <li>Background deve fits Barovia</li>
                                <li>Morte permanente possibile</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="modal-section">
                    <h3><i class="fas fa-map"></i> Stato Attuale della Campagna</h3>
                    <div class="info-card" style="background: rgba(220, 53, 69, 0.1); border-color: #dc3545; padding: 1.5rem;">
                        <h4 style="color: #dc3545;"><i class="fas fa-exclamation-triangle"></i> Attenzione: Spoiler Alert</h4>
                        <p style="margin-top: 0.8rem;">
                            <strong>Location Attuale:</strong> Il party si trova nella città di Vallaki, dopo aver scoperto i segreti del Burgomaster. Stanno investigando eventi misteriosi legati al Festival del Sole Ardente.
                        </p>
                        <p style="margin-top: 0.5rem;">
                            <strong>Obiettivi Principali:</strong> Trovare un modo per sconfiggere Strahd, liberare Ireena, e scoprire la verità su Barovia.
                        </p>
                    </div>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; padding-top: 1rem; border-top: 2px solid rgba(0,0,0,0.1);">
                    <button class="btn btn-secondary" onclick="closeModal(this.closest('.modal'))">
                        <i class="fas fa-times"></i>
                        Chiudi
                    </button>
                    <button class="btn btn-primary" onclick="registerForTournament('${campaignId}')">
                        <i class="fas fa-user-plus"></i>
                        Richiedi Accesso
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').appendChild(modal);
    document.body.classList.add('modal-open');
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });
};

window.showGameInfo = function(category, gameName = null, difficulty = null, minPlayers = null, maxPlayers = null, durationStr = '') {
    const nameByCategory = {
        'strategy': 'Gioco di Strategia',
        'party': 'Party Game',
        'card': 'Card Game',
        'dnd': 'Dungeons & Dragons 5e',
        'racing': 'Racing Game',
        'puzzle': 'Puzzle Game'
    };

    const defaultMechanics = {
        'strategy': ['Gestione risorse', 'Pianificazione', 'Tattica a turni', 'Interazione moderata'],
        'party': ['Team play', 'Indizi/Associazioni', 'Ronde veloci', 'Alta interazione'],
        'card': ['Deck/Hand management', 'Combo', 'Draft', 'Tattica'],
        'dnd': ['Narrazione collaborativa', 'Interpretazione', 'Combattimento tattico', 'Progressione personaggio'],
        'racing': ['Spinta fortuna', 'Scelte rapide', 'Ottimizzazione traiettorie'],
        'puzzle': ['Pattern building', 'Ottimizzazione', 'Basso aleatorio']
    };

    const defaultTips = {
        'strategy': 'Perfetto per chi ama la strategia con una curva accessibile ma profonda!',
        'party': 'Ideale per gruppi numerosi che vogliono ridere e rompere il ghiaccio!',
        'card': 'Consigliato a chi ama combo e decisioni rapide con un pizzico di fortuna!',
        'dnd': 'Ottimo per immergersi in storie epiche e vivere avventure con gli amici!',
        'racing': 'Partite rapide e adrenaliniche: perfetto tra un drink e l’altro!',
        'puzzle': 'Per chi adora costruire e ottimizzare senza troppo conflitto diretto.'
    };

    const prettyName = gameName || `Informazioni ${getCategoryName(category)}`;
    const mechanics = defaultMechanics[category] || defaultMechanics['strategy'];
    const tips = defaultTips[category] || defaultTips['strategy'];
    const playersText = (minPlayers && maxPlayers) ? `${minPlayers}-${maxPlayers} giocatori` : (category === 'dnd' ? '3-6 giocatori + DM' : '2-4 giocatori');
    const durationText = durationStr || (category === 'dnd' ? '3-4 ore per sessione' : '60-90 minuti');
    const difficultyText = getDifficultyText(difficulty) || (category === 'party' ? 'Principiante' : 'Intermedio');
    const categoryText = getCategoryName(category);

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1200px; width: 95%; height: 80vh; max-height: 800px; overflow: hidden; position: relative; display: flex; flex-direction: column;">
            <div class="modal-header" style="padding: 1.5rem 2rem 1rem 2rem; height: 80px; flex-shrink: 0;">
                <h2 class="modal-title">
                    <i class="fas ${getCategoryIcon(category)}"></i>
                    ${prettyName}
                </h2>
                <button class="modal-close" onclick="closeModal(this.closest('.modal'))">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="flex: 1; overflow-y: auto; padding: 2rem; padding-bottom: 120px;">
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; min-height: 0;">
                    <div style="display: flex; flex-direction: column; gap: 1.2rem;">
                        <div class="info-card" style="text-align: center; padding: 1.2rem;">
                            <p style="font-size: 1.1rem; color: #666; line-height: 1.5;">${category === 'dnd' ? 'Il più famoso gioco di ruolo fantasy al mondo. Crea il tuo personaggio e vivi avventure epiche!' : 'Scopri le caratteristiche principali di questo gioco e preparati a divertirti!'}</p>
                        </div>

                        <div class="info-card">
                            <h4 style="margin-bottom: 1rem;"><i class="fas fa-cogs"></i> Meccaniche di Gioco</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                                ${mechanics.map(m => `<div style="padding: 0.6rem; background: rgba(102, 51, 204, 0.1); border-radius: 6px; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;"><i class=\"fas fa-check-circle\" style=\"color: var(--color-success); flex-shrink: 0;\"></i><span>${m}</span></div>`).join('')}
                            </div>
                        </div>

                        <div class="info-card" style="background: rgba(40, 167, 69, 0.1); border-color: #28a745;">
                            <h4 style="color: #28a745; margin-bottom: 0.8rem;"><i class="fas fa-lightbulb"></i> Consiglio del Locale</h4>
                            <p style="font-style: italic; font-size: 0.95rem; line-height: 1.4;">${tips}</p>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; min-height: 0;">
                        <div class="info-card" style="text-align: center; padding: 0.8rem;">
                            <div style="background: var(--color-primary); color: white; padding: 0.6rem; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.5rem auto;">
                                <i class="fas fa-users" style="font-size: 1rem;"></i>
                            </div>
                            <h4 style="font-size: 0.95rem; margin-bottom: 0.2rem;">Giocatori</h4>
                            <p style="font-size: 0.95rem; font-weight: 600; color: var(--color-primary);">${playersText}</p>
                        </div>

                        <div class="info-card" style="text-align: center; padding: 0.8rem;">
                            <div style="background: var(--color-info); color: white; padding: 0.6rem; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.5rem auto;">
                                <i class="fas fa-clock" style="font-size: 1rem;"></i>
                            </div>
                            <h4 style="font-size: 0.95rem; margin-bottom: 0.2rem;">Durata</h4>
                            <p style="font-size: 0.95rem; font-weight: 600; color: var(--color-info);">${durationText}</p>
                        </div>

                        <div class="info-card" style="text-align: center; padding: 0.8rem;">
                            <div style="background: var(--color-warning); color: white; padding: 0.6rem; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.5rem auto;">
                                <i class="fas fa-signal" style="font-size: 1rem;"></i>
                            </div>
                            <h4 style="font-size: 0.95rem; margin-bottom: 0.2rem;">Difficoltà</h4>
                            <p style="font-size: 0.95rem; font-weight: 600; color: var(--color-warning);">${difficultyText}</p>
                        </div>

                        <div class="info-card" style="text-align: center; padding: 0.8rem;">
                            <div style="background: var(--color-success); color: white; padding: 0.6rem; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.5rem auto;">
                                <i class="fas fa-tag" style="font-size: 1rem;"></i>
                            </div>
                            <h4 style="font-size: 0.95rem; margin-bottom: 0.2rem;">Categoria</h4>
                            <p style="font-size: 0.95rem; font-weight: 600; color: var(--color-success);">${categoryText}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div style="position: absolute; bottom: 1.5rem; left: 50%; transform: translateX(-50%);">
                <button class="btn btn-primary" onclick="closeModal(this.closest('.modal'))">
                    <i class="fas fa-check"></i>
                    Ho Capito!
                </button>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').appendChild(modal);
    document.body.classList.add('modal-open');
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });
};

window.showCharacterBio = function(characterId) {
    // Find character data from tournaments state
    let character = null;
    (tournamentState.tournaments || []).forEach(t => {
        const party = t.partyComposition || t.party_composition || [];
        const found = party.find(ch => (ch.id || ch.characterId || ch.name) === characterId);
        if (found) character = found;
    });
    if (!character) {
        showNotification('Personaggio non trovato', 'error');
        return;
    }

    const avatar = character.avatar || '/images/avatars/default.png';
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header" style="background: linear-gradient(135deg, var(--color-dnd), #9370db); color: white;">
                <h2 class="modal-title" style="color: white;">
                    <i class="fas fa-user"></i>
                    ${character.characterName || character.name}
                </h2>
                <button class="modal-close" onclick="closeModal(this.closest('.modal'))" style="color: white;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div style="display: flex; gap: 2rem; margin-bottom: 2rem; align-items: center;">
                    <img src="${avatar}" alt="${character.characterName || character.name}" style="width: 120px; height: 120px; border-radius: 50%; border: 4px solid var(--color-dnd); object-fit: cover;">
                    <div style="flex: 1;">
                        <div class="info-card">
                            <h4><i class="fas fa-id-card"></i> Informazioni Base</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                                ${character.class ? `<div><strong>Classe:</strong> ${character.class}</div>` : ''}
                                ${character.race ? `<div><strong>Razza:</strong> ${character.race}</div>` : ''}
                                ${character.level ? `<div><strong>Livello:</strong> ${character.level}</div>` : ''}
                                ${character.background ? `<div><strong>Background:</strong> ${character.background}</div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                ${character.bio ? `<div class="info-card" style="margin-bottom: 1.5rem;"><h4><i class='fas fa-book'></i> Storia del Personaggio</h4><p style='line-height:1.7; margin-top:0.8rem;'>${character.bio}</p></div>` : ''}

                <div style="text-align: center; margin-top: 2rem;">
                    <button class="btn btn-primary" onclick="closeModal(this.closest('.modal'))">
                        <i class="fas fa-times"></i>
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').appendChild(modal);
    document.body.classList.add('modal-open');
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });
};

window.showAuthPrompt = function() {
    if (window.SimpleAuth && window.SimpleAuth.showLoginModal) {
        window.SimpleAuth.showLoginModal();
    } else {
        showNotification('Effettua il login per accedere a questa funzione', 'info');
    }
};

// Additional helper functions
window.changeAvatar = async function() {
    try {
        if (!window.SimpleAuth || !window.SimpleAuth.isAuthenticated) {
            showAuthPrompt();
            return;
        }

        const userId = window.SimpleAuth.currentUser?.id;
        const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
        if (!userId || !token) {
            showAuthPrompt();
            return;
        }

        const res = await apiFetch('/api/users/avatars/list', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) {
            showNotification('Impossibile caricare gli avatar disponibili', 'error');
            return;
        }
        const data = await res.json();
        const avatars = data.avatars || [];

        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 720px;">
                <div class="modal-header">
                    <h2 class="modal-title"><i class="fas fa-user-circle"></i> Scegli un Avatar</h2>
                    <button class="modal-close" onclick="closeModal(this.closest('.modal'))"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="info-card">
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 1rem;">
                            ${avatars.map(av => `
                                <button class="avatar-option" data-avatar-id="${av.id}" style="background:#fff; border:2px solid #e9ecef; border-radius:12px; padding:0.75rem; display:flex; flex-direction:column; align-items:center; gap:0.5rem; cursor:pointer;">
                                    <img src="${av.url}" alt="${av.name}" style="width:72px; height:72px; border-radius:50%; object-fit:cover; border:2px solid var(--color-primary);"/>
                                    <span style="font-size:0.9rem; color:#555;">${av.name}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').appendChild(modal);
        document.body.classList.add('modal-open');
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });

        modal.querySelectorAll('.avatar-option').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const avatarId = e.currentTarget.getAttribute('data-avatar-id');
                try {
                    const selRes = await fetch(`/api/users/${userId}/avatar/select`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ avatarId })
                    });
                    const selData = await selRes.json();
                    if (selRes.ok && selData.success !== false) {
                        const avatarImg = document.querySelector('.profile-avatar');
                        if (avatarImg && selData.avatarUrl) {
                            const cacheBuster = `?t=${Date.now()}`;
                            avatarImg.src = `${selData.avatarUrl}${cacheBuster}`;
                        }
                        if (window.SimpleAuth?.updateNavbarProfileButton) {
                            window.SimpleAuth.updateNavbarProfileButton();
                        }
                        showNotification('Avatar aggiornato con successo', 'success');
                        closeModal(modal);
                    } else {
                        showNotification(selData.message || 'Errore durante l\'aggiornamento avatar', 'error');
                    }
                } catch (err) {
                    console.error('Avatar select error:', err);
                    showNotification('Errore durante l\'aggiornamento avatar', 'error');
                }
            });
        });

    } catch (error) {
        console.error('Error opening avatar selector:', error);
        showNotification('Errore apertura selettore avatar', 'error');
    }
};

window.editField = function(fieldName) {
    showNotification(`Modifica ${fieldName} - Feature in sviluppo`, 'info');
};

window.closeModal = function(modal) {
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    setTimeout(() => modal.remove(), 300);
};

// ==========================================
// ADDITIONAL FUNCTIONS
// ==========================================

function updateAllTournamentsRegistrationState() {
    document.querySelectorAll('.tournament-card').forEach(card => {
        const tournamentId = parseInt(card.dataset.tournamentId);

        if (tournamentState.registeredTournaments.has(tournamentId)) {
            card.classList.add('registered');
        } else {
            card.classList.remove('registered');
        }
    });
}

function updateTournamentState(tournamentId, action) {
    const card = document.querySelector(`[data-tournament-id="${tournamentId}"]`);
    if (card) {
        if (action === 'register') {
            card.classList.add('registered');
        } else if (action === 'unregister') {
            card.classList.remove('registered');
        }
    }
}

// ==========================================
// CREATE TOURNAMENT FORM
// ==========================================

function renderCreateTournamentForm() {
    const section = document.getElementById('createTournamentSection');
    if (!section) return;

    section.innerHTML = `
        <form id="tournamentForm" class="tournament-form">
            <div class="form-group">
                <label for="tournamentType">Tipo Torneo</label>
                <select id="tournamentType">
                    <option value="standard">Torneo Normale</option>
                    <option value="dnd">Campagna D&D</option>
                </select>
            </div>
            <div class="form-group">
                <label for="tournamentTitle">Titolo</label>
                <input type="text" id="tournamentTitle" required>
            </div>
            <div class="form-group">
                <label for="tournamentStartDate">Data Inizio</label>
                <input type="date" id="tournamentStartDate" required>
            </div>
            <div class="form-group">
                <label for="tournamentMax">Max Partecipanti</label>
                <input type="number" id="tournamentMax" required>
            </div>
            <div id="dndExtraFields" style="display:none">
                <div class="form-group">
                    <label for="dndDM">Dungeon Master</label>
                    <input type="text" id="dndDM">
                </div>
                <div class="form-group">
                    <label for="dndSetting">Setting</label>
                    <input type="text" id="dndSetting">
                </div>
            </div>
            <button type="submit" class="btn btn-primary" style="margin-top:1rem;">Concludi Operazione</button>
        </form>
    `;

    const typeSelect = document.getElementById('tournamentType');
    typeSelect.addEventListener('change', () => {
        const isDnd = typeSelect.value === 'dnd';
        document.getElementById('dndExtraFields').style.display = isDnd ? '' : 'none';
        document.getElementById('tournamentForm').classList.toggle('dnd-theme', isDnd);
    });

    document.getElementById('tournamentForm').addEventListener('submit', handleCreateTournamentSubmit);
}

async function handleCreateTournamentSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('tournamentType').value;
    const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
    if (!token) {
        showAuthPrompt();
        return;
    }

    const body = {
        title: document.getElementById('tournamentTitle').value,
        start_date: document.getElementById('tournamentStartDate').value,
        max_participants: parseInt(document.getElementById('tournamentMax').value) || 0,
        category: type === 'dnd' ? 'dnd' : 'strategy',
        format: type === 'dnd' ? 'campaign' : 'elimination',
        game_id: 1
    };

    if (type === 'dnd') {
        body.dungeon_master = document.getElementById('dndDM').value;
        body.dnd_setting = document.getElementById('dndSetting').value;
    }

    try {
        const res = await apiFetch('/api/tournaments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) {
            showNotification(data.message, 'success');
            loadAllTournaments();
            showAllTournaments(document.querySelector('.view-toggle .toggle-btn'));
        } else {
            showNotification(data.message || 'Errore creazione torneo', 'error');
        }
    } catch (err) {
        console.error('Error creating tournament:', err);
        showNotification('Errore creazione torneo', 'error');
    }
}

function showRegistrationSuccessModal(tournamentId) {
    const tournament = tournamentState.tournaments.find(t => t.id == tournamentId);
    if (!tournament) return;

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2 class="modal-title" style="color: var(--color-success);">
                    <i class="fas fa-check-circle"></i>
                    Iscrizione Confermata!
                </h2>
                <button class="modal-close" onclick="closeModal(this.closest('.modal'))">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="text-align: center;">
                <div class="info-card">
                    <p style="font-size: 1.1rem; margin-bottom: 1.5rem;">
                        Ti sei iscritto con successo al torneo:<br>
                        <strong style="color: var(--color-primary);">${tournament.title}</strong>
                    </p>
                    <p style="color: #666; margin-bottom: 1.5rem;">
                        Riceverai una email di conferma con tutti i dettagli.
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button class="btn btn-primary" onclick="showMyTournaments(); closeModal(this.closest('.modal'))">
                            <i class="fas fa-user"></i>
                            I Miei Tornei
                        </button>
                        <button class="btn btn-secondary" onclick="closeModal(this.closest('.modal'))">
                            <i class="fas fa-times"></i>
                            Chiudi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').appendChild(modal);
    document.body.classList.add('modal-open');

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
    });
}

function createTournamentModal(tournament, participants = []) {
    const modal = document.createElement('div');
    modal.className = 'modal show';

    const isAuthenticated = window.SimpleAuth && window.SimpleAuth.isAuthenticated;
    const isRegistered = tournamentState.registeredTournaments.has(parseInt(tournament.id));

    const participantsHTML = participants.map(p => {
        const name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
        const avatar = p.profile_image || '/images/avatars/default.png';
        return `
            <div class="info-card" style="display: flex; align-items: center; gap: 1rem;">
                <img src="${avatar}" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid var(--color-primary);">
                <div>
                    <div style="font-weight: bold;">${name}</div>
                </div>
            </div>
        `;
    }).join('');

    const prizesHTML = Array.isArray(tournament.prizes) && tournament.prizes.length
        ? `<h5 style="margin-bottom: 0.5rem;">Premi:</h5><ul style="margin-left: 1rem;">${tournament.prizes.map(prize => `<li>${prize}</li>`).join('')}</ul>`
        : '';

    const rulesHTML = Array.isArray(tournament.rules) && tournament.rules.length
        ? `<div class="info-card"><h4><i class="fas fa-gavel"></i> Regole Principali</h4><ul style="margin-left: 1rem;">${tournament.rules.map(rule => `<li>${rule}</li>`).join('')}</ul></div>`
        : '';

    const includedHTML = Array.isArray(tournament.included) && tournament.included.length
        ? `<div class="modal-section"><h3><i class="fas fa-gift"></i> Cosa è Incluso</h3><div class="info-card"><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">${tournament.included.map(item => `<div style="display: flex; align-items: center; gap: 0.5rem;"><i class="fas fa-check-circle" style="color: var(--color-success);"></i><span>${item}</span></div>`).join('')}</div></div></div>`
        : '';

    const formatSection = (tournament.format || prizesHTML || rulesHTML)
        ? `<div class="modal-section"><h3><i class="fas fa-cogs"></i> Formato e Regole</h3><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">${(tournament.format || prizesHTML) ? `<div class="info-card"><h4><i class="fas fa-trophy"></i> Formato Torneo</h4>${tournament.format ? `<p style="margin-bottom: 1rem;">${tournament.format}</p>` : ''}${prizesHTML}</div>` : ''}${rulesHTML}</div></div>`
        : '';

    const playersSection = participants.length
        ? `<div class="modal-section"><h3><i class="fas fa-users"></i> Giocatori Iscritti (${participants.length}/${tournament.maxParticipants || '?'})</h3><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">${participantsHTML}</div></div>`
        : '';

    const actionButton = isAuthenticated
        ? (isRegistered
            ? `<button class="btn btn-danger" onclick="unregisterFromTournament('${tournament.id}')"><i class="fas fa-times"></i> Cancella Iscrizione</button>`
            : `<button class="btn btn-primary" onclick="registerForTournament('${tournament.id}')"><i class="fas fa-plus"></i> Iscriviti al Torneo</button>`)
        : `<button class="btn btn-primary" onclick="showAuthPrompt()"><i class="fas fa-user-plus"></i> Accedi per Iscriverti</button>`;

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1000px; width: 90%; max-height: 85vh; overflow-y: auto;">
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="fas fa-trophy"></i>
                    ${tournament.title}
                </h2>
                <button class="modal-close" onclick="closeModal(this.closest('.modal'))">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="modal-section">
                    <div class="info-card" style="text-align: center; padding: 1.5rem; margin-bottom: 2rem;">
                        <p style="font-size: 1.1rem; line-height: 1.7;">${tournament.description || ''}</p>
                    </div>
                </div>

                <div class="modal-section">
                    <h3><i class="fas fa-info-circle"></i> Dettagli del Torneo</h3>
                    <div class="info-grid">
                        <div class="info-card">
                            <h4><i class="fas fa-gamepad"></i> Gioco</h4>
                            <p><strong>${tournament.gameName || tournament.game_name || ''}</strong></p>
                            ${tournament.category ? `<p>Categoria: ${getCategoryName(tournament.category)}</p>` : ''}
                        </div>

                        <div class="info-card">
                            <h4><i class="fas fa-calendar-alt"></i> Data e Orario</h4>
                            <p><strong>Data:</strong> ${tournament.start_date ? new Date(tournament.start_date).toLocaleDateString('it-IT') : 'Da definire'}</p>
                            <p><strong>Orario:</strong> ${tournament.start_time || ''}${tournament.end_time ? ' - ' + tournament.end_time : ''}</p>
                        </div>

                        <div class="info-card">
                            <h4><i class="fas fa-map-marker-alt"></i> Luogo</h4>
                            <p><strong>Location:</strong> ${tournament.location || 'Da definire'}</p>
                        </div>

                        <div class="info-card">
                            <h4><i class="fas fa-users"></i> Partecipanti</h4>
                            <p><strong>Iscritti:</strong> ${tournament.currentParticipants || 0}/${tournament.maxParticipants || 'N/A'}</p>
                            ${tournament.waitlistCount ? `<p><strong>Lista d'attesa:</strong> ${tournament.waitlistCount}</p>` : ''}
                            <p><strong>Quota:</strong> ${tournament.entryFee ? `€${tournament.entryFee}` : 'Gratuito'}</p>
                        </div>
                    </div>
                </div>

                ${formatSection}

                ${includedHTML}

                ${playersSection}

                <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; padding-top: 1rem; border-top: 2px solid rgba(0,0,0,0.1);">
                    <button class="btn btn-secondary" onclick="closeModal(this.closest('.modal'))">
                        <i class="fas fa-times"></i> Chiudi
                    </button>
                    ${actionButton}
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').appendChild(modal);
    document.body.classList.add('modal-open');

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
    });
}

function initializeUserProfile() {
    // Initialize user badges (following original HTML)
    const badgesContainer = document.getElementById('userBadges');
    if (badgesContainer) {
        badgesContainer.innerHTML = `
            <div class="badge-item">
                <div class="badge-icon">
                    <i class="fas fa-crown"></i>
                </div>
                <div class="badge-info">
                    <h4>Il Conquistatore</h4>
                    <p>Ha vinto 5 tornei consecutivi di strategia nel 2024</p>
                </div>
            </div>
            <div class="badge-item">
                <div class="badge-icon">
                    <i class="fas fa-dice-d20"></i>
                </div>
                <div class="badge-info">
                    <h4>Master del D&D</h4>
                    <p>Ha completato 3 campagne complete come party leader</p>
                </div>
            </div>
            <div class="badge-item">
                <div class="badge-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="badge-info">
                    <h4>Animatore Social</h4>
                    <p>Ha organizzato più di 10 serate di gioco per il locale</p>
                </div>
            </div>
            <div class="badge-item">
                <div class="badge-icon">
                    <i class="fas fa-star"></i>
                </div>
                <div class="badge-info">
                    <h4>Veterano</h4>
                    <p>Cliente fedele da oltre 2 anni</p>
                </div>
            </div>
        `;
    }

    // Initialize user stats (following original HTML)
    const statsContainer = document.getElementById('userStats');
    if (statsContainer) {
        const registeredCount = tournamentState.registeredTournaments.size;
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${registeredCount}</div>
                <div class="stat-label">Tornei Attivi</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">23</div>
                <div class="stat-label">Tornei Giocati</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">7</div>
                <div class="stat-label">Vittorie</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">95%</div>
                <div class="stat-label">Tasso Partecipazione</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">4.8</div>
                <div class="stat-label">Rating Medio</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">156h</div>
                <div class="stat-label">Ore di Gioco</div>
            </div>
        `;
    }
}

function showAuthPromptInMyTournaments() {
    const section = document.getElementById('myTournamentsSection');
    const upcomingContainer = document.getElementById('upcomingTournaments');
    const completedContainer = document.getElementById('completedTournaments');
    // Hide profile header when not authenticated
    const header = document.querySelector('.user-profile-header');
    if (header) header.style.display = 'none';

    if (section) section.classList.add('empty');
    const authPromptHTML = `
        <div style="margin-top: 2rem;">
            <div class="auth-prompt">
                <div class="auth-prompt-content">
                    <i class="fas fa-user-lock"></i>
                    <h3 style="font-size: 1.8rem;">Accedi o registrati per vedere i tuoi tornei</h3>
                    <p>Effettua l'accesso per visualizzare le tue iscrizioni e questa sezione.</p>
                </div>
            </div>
        </div>
    `;

    upcomingContainer.innerHTML = authPromptHTML;
    completedContainer.innerHTML = '';
}

function showErrorInContainer(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Errore di Caricamento</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="window.location.reload()">
                    <i class="fas fa-refresh"></i>
                    Riprova
                </button>
            </div>
        `;
    }
}

function showErrorState(message) {
    const container = document.getElementById('allTournamentsList');
    if (container) {
        showErrorInContainer('allTournamentsList', message);
    }
}

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateX(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.tournament-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateX(-50px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}
console.log('✅ Tournaments page module loaded successfully');
