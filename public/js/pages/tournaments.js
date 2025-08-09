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
        const response = await fetch('/api/tournaments?orderBy=start_date&orderDir=ASC');

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
        const response = await fetch('/api/tournaments/user/my', {
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

    tournaments.forEach(tournament => {
        const tournamentCard = createTournamentCard(tournament);
        container.appendChild(tournamentCard);
    });

    showNotification(`${tournaments.length} tornei caricati con successo!`, 'success');
}

function renderMyTournaments(userTournaments) {
    const upcomingContainer = document.getElementById('upcomingTournaments');
    const completedContainer = document.getElementById('completedTournaments');
    // Ensure profile header visible in authenticated context
    const header = document.querySelector('.user-profile-header');
    if (header) header.style.display = '';

    if (!userTournaments || userTournaments.length === 0) {
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
        completedContainer.innerHTML = '';
        return;
    }

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
        </div>

        <!-- Tournament Details -->
        <div class="tournament-details">
            <div class="detail-item">
                <div class="detail-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="detail-content">
                    <div class="detail-label">Partecipanti</div>
                    <div class="detail-value">${tournament.current_participants || 0} / ${tournament.max_participants || 'N/A'}</div>
                    ${generateParticipantsBar(tournament)}
                </div>
            </div>

            <div class="detail-item">
                <div class="detail-icon">
                    <i class="fas fa-euro-sign"></i>
                </div>
                <div class="detail-content">
                    <div class="detail-label">Quota partecipazione</div>
                    <div class="detail-value">${tournament.entry_fee ? `€${tournament.entry_fee}` : 'Gratuito'}</div>
                </div>
            </div>

            <div class="detail-item">
                <div class="detail-icon">
                    <i class="fas fa-gift"></i>
                </div>
                <div class="detail-content">
                    <div class="detail-label">Premio</div>
                    <div class="detail-value">${getFirstPrize(tournament)}</div>
                </div>
            </div>

            <div class="detail-item">
                <div class="detail-icon">
                    <i class="fas fa-star"></i>
                </div>
                <div class="detail-content">
                    <div class="detail-label">Difficoltà</div>
                    <div class="detail-value">${getDifficultyText(tournament.difficulty)}</div>
                </div>
            </div>
        </div>

        <!-- D&D Campaign Specific Content -->
        ${tournament.category === 'dnd' && tournament.format === 'campaign' ? generateDnDContent(tournament) : ''}

        <!-- Tournament Actions -->
        ${generateTournamentActions(tournament, isRegistered, isAuthenticated, isMyTournament)}
    `;
}

function generateDnDContent(tournament) {
    // Parse party composition if it's a JSON string
    let partyComposition = tournament.partyComposition || tournament.party_composition;
    if (typeof partyComposition === 'string') {
        try { partyComposition = JSON.parse(partyComposition); } catch { partyComposition = []; }
    }

    const dndSetting = tournament.dndSetting || tournament.dnd_setting || null;
    const dndWorld = tournament.dndWorld || tournament.dnd_world || null;
    let dndTags = tournament.dndTags || tournament.dnd_tags || [];
    if (typeof dndTags === 'string') { try { dndTags = JSON.parse(dndTags); } catch { dndTags = []; } }
    const dndDays = tournament.dndDays || tournament.dnd_days || null;
    const dndSessionDuration = tournament.dndSessionDuration || tournament.dnd_session_duration || null;
    let safetyTools = tournament.dndSafetyTools || tournament.dnd_safety_tools || [];
    if (typeof safetyTools === 'string') { try { safetyTools = JSON.parse(safetyTools); } catch { safetyTools = []; } }

    const currentSession = tournament.current_session || tournament.currentSession;
    const totalSessions = tournament.total_sessions || tournament.totalSessions;
    const currentLevel = tournament.current_level || tournament.currentLevel;

    const maxSlots = tournament.max_participants || tournament.maxParticipants || 5;
    const emptySlotsCount = Math.max(0, maxSlots - (Array.isArray(partyComposition) ? partyComposition.length : 0));

    return `
        <div class="dnd-campaign-info" style="margin: 1.5rem 0; padding: 1.5rem; background: var(--color-dnd-bg); border-radius: 12px; border: 2px solid var(--color-dnd);">
            <div class="campaign-section">
                <h4><i class="fas fa-dragon"></i> Dettagli Campagna</h4>
                <div class="campaign-details-grid">
                    ${dndSetting ? `
                        <div class="campaign-detail-item">
                            <div class="campaign-detail-icon"><i class="fas fa-globe"></i></div>
                            <div><div class="detail-label">Ambientazione</div><div class="detail-value">${dndSetting}${dndWorld ? ` • ${dndWorld}` : ''}</div></div>
                        </div>` : ''}
                    ${(currentSession && totalSessions) ? `
                        <div class="campaign-detail-item">
                            <div class="campaign-detail-icon"><i class="fas fa-book-open"></i></div>
                            <div><div class="detail-label">Sessione</div><div class="detail-value">${currentSession} / ${totalSessions}</div></div>
                        </div>` : ''}
                    ${currentLevel ? `
                        <div class="campaign-detail-item">
                            <div class="campaign-detail-icon"><i class="fas fa-star"></i></div>
                            <div><div class="detail-label">Livello</div><div class="detail-value">${currentLevel}</div></div>
                        </div>` : ''}
                    ${dndDays ? `
                        <div class="campaign-detail-item">
                            <div class="campaign-detail-icon"><i class="fas fa-calendar-alt"></i></div>
                            <div><div class="detail-label">Giorni</div><div class="detail-value">${dndDays}</div></div>
                        </div>` : ''}
                    ${dndSessionDuration ? `
                        <div class="campaign-detail-item">
                            <div class="campaign-detail-icon"><i class="fas fa-hourglass-half"></i></div>
                            <div><div class="detail-label">Durata Sessione</div><div class="detail-value">${dndSessionDuration}</div></div>
                        </div>` : ''}
                </div>
                ${Array.isArray(dndTags) && dndTags.length ? `<div class="tournament-tags">${dndTags.map(tag => `<span class="tag dnd">${tag}</span>`).join('')}</div>` : ''}
            </div>

            <div class="campaign-section">
                <h4><i class="fas fa-users-cog"></i> Composizione del Party</h4>
                <div class="character-avatars">
                    ${(partyComposition || []).map(ch => `
                        <div class="character-avatar ${/leader/i.test(ch.role || '') ? 'party-leader' : ''}" onclick="showCharacterBio('${ch.name}')">
                            <img src="/images/avatars/${(ch.class || 'default').toLowerCase().replace(/\s+/g,'-')}.png" alt="${ch.name}" onerror="this.src='/images/avatars/default.png'" />
                            ${/leader/i.test(ch.role || '') ? `<i class='fas fa-crown crown'></i>` : ''}
                            <div class="character-tooltip">
                                <strong>${ch.name}</strong><br/>
                                ${ch.class || ''} • Liv. ${ch.level || '?'}<br/>
                                ${ch.role || ''}
                            </div>
                        </div>
                    `).join('')}
                    ${Array.from({ length: emptySlotsCount }).map(() => `
                        <div class="character-avatar empty-slot">
                            <div class="empty-avatar">?</div>
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

    tournamentState.currentView = 'all';
    console.log('📋 Showing all tournaments');
};

window.showMyTournaments = function(element = null) {
    if (element) {
        // Update toggle buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        element.classList.add('active');
    }

    // Show/hide sections
    document.getElementById('allTournamentsSection').classList.remove('active');
    document.getElementById('myTournamentsSection').classList.add('active');

    tournamentState.currentView = 'my';

    // Load user tournaments if authenticated
    if (window.SimpleAuth && window.SimpleAuth.isAuthenticated) {
        loadUserTournaments();
    } else {
        showAuthPromptInMyTournaments();
    }

    console.log('👤 Showing my tournaments');
};

window.registerForTournament = async function(tournamentId, buttonElement = null) {
    if (!window.SimpleAuth || !window.SimpleAuth.isAuthenticated) {
        showAuthPrompt();
        return;
    }

    try {
        const response = await fetch(`/api/tournaments/${tournamentId}/register`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });

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
        const response = await fetch(`/api/tournaments/${tournamentId}/register`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('authToken')}`
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

window.openTournamentModal = async function(tournamentId) {
    try {
        const response = await fetch(`/api/tournaments/${tournamentId}`);
        const data = await response.json();

        if (data.success) {
            createTournamentModal(data.data);
        } else {
            showNotification('Errore nel caricamento del torneo', 'error');
        }
    } catch (error) {
        console.error('Error loading tournament details:', error);
        showNotification('Errore nel caricamento del torneo', 'error');
    }
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
    showNotification(`Biografia di ${characterId} - Feature in sviluppo`, 'info');
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

        const res = await fetch('/api/users/avatars/list', { headers: { 'Authorization': `Bearer ${token}` } });
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

function createTournamentModal(tournament) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
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
                <div class="info-card" style="text-align: center; margin-bottom: 2rem;">
                    <p style="font-size: 1.1rem;">${tournament.description || 'Partecipa a questo fantastico torneo!'}</p>
                </div>

                <div class="info-grid">
                    <div class="info-card">
                        <h4><i class="fas fa-gamepad"></i> Gioco</h4>
                        <p><strong>${tournament.gameName || tournament.game_name || 'Gioco da tavolo'}</strong></p>
                        <p>Categoria: ${getCategoryName(tournament.category)}</p>
                    </div>

                    <div class="info-card">
                        <h4><i class="fas fa-calendar-alt"></i> Data e Orario</h4>
                        <p><strong>Data:</strong> ${tournament.start_date ? new Date(tournament.start_date).toLocaleDateString('it-IT') : 'Da definire'}</p>
                        <p><strong>Orario:</strong> ${tournament.start_time || '20:30'} - ${tournament.end_time || '23:00'}</p>
                    </div>

                    <div class="info-card">
                        <h4><i class="fas fa-users"></i> Partecipanti</h4>
                        <p><strong>Iscritti:</strong> ${tournament.current_participants || 0}/${tournament.max_participants || 'N/A'}</p>
                        <p><strong>Quota:</strong> ${tournament.entry_fee ? `€${tournament.entry_fee}` : 'Gratuito'}</p>
                    </div>

                    <div class="info-card">
                        <h4><i class="fas fa-trophy"></i> Premio</h4>
                        <p><strong>${getFirstPrize(tournament)}</strong></p>
                        <p>Difficoltà: ${getDifficultyText(tournament.difficulty)}</p>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 2rem;">
                    <button class="btn btn-secondary" onclick="closeModal(this.closest('.modal'))">
                        <i class="fas fa-times"></i>
                        Chiudi
                    </button>
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
    const upcomingContainer = document.getElementById('upcomingTournaments');
    const completedContainer = document.getElementById('completedTournaments');
    // Hide profile header when not authenticated
    const header = document.querySelector('.user-profile-header');
    if (header) header.style.display = 'none';

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

// Funzione per creare una card di torneo D&D (es. campagna)
// userState: { isRegistered: boolean, isLoggedIn: boolean }
function createDndTournamentCard(userState) {
    // Dati statici (da DB o mock)
    const campaignInfo = {
        title: 'Campagna D&D - La Maledizione di Strahd',
        game: 'Dungeons & Dragons 5e',
        date: 'Ogni SAB',
        time: 'Ogni Sabato • 15:00 - 19:00',
        theme: 'dnd-special dnd-theme',
        tags: [
            { class: 'tag dnd', icon: 'fas fa-dice-d20', text: 'Campagna Epica' },
            { class: 'tag ongoing', icon: 'fas fa-play', text: 'In Corso' }
        ],
        details: [
            { icon: 'fas fa-scroll', label: 'Sessione Corrente', value: '12 / 20' },
            { icon: 'fas fa-hourglass-half', label: 'Ore di Gioco', value: '48h totali' },
            { icon: 'fas fa-level-up-alt', label: 'Livello Gruppo', value: '8° Livello' },
            { icon: 'fas fa-map', label: 'Setting', value: 'Barovia' }
        ],
        party: [
            {
                name: 'Elena Drakemoor',
                role: 'Party Leader',
                class: 'Paladino Dragonide',
                avatar: 'public/images/avatars/dragonide.png',
                leader: true
            },
            {
                name: 'Marcus Shadowbane',
                role: 'Cacciatore di Mostri',
                class: 'Ranger Umano',
                avatar: 'public/images/avatars/cacciatore.png'
            },
            {
                name: 'Lyralei Moonwhisper',
                role: 'Guaritrice della Natura',
                class: 'Druida Elfa',
                avatar: 'public/images/avatars/elfo.png'
            },
            {
                empty: true
            }
        ]
    };

    // Crea la card
    const card = document.createElement('div');
    card.className = `tournament-card ${campaignInfo.theme}`;

    // Data
    const dateDiv = document.createElement('div');
    dateDiv.className = 'tournament-date recurring';
    dateDiv.innerHTML = `<span class="day">Ogni</span><span class="month">SAB</span>`;
    card.appendChild(dateDiv);

    // Header
    const header = document.createElement('div');
    header.className = 'tournament-header';
    header.innerHTML = `
        <div class="tournament-info">
            <h2 class="tournament-title">
                <i class="fas fa-dragon"></i>
                ${campaignInfo.title}
            </h2>
            <div class="tournament-game">
                ${campaignInfo.game}
                <button class="game-info-btn" onclick="showGameInfo('dnd')">
                    <i class="fas fa-info-circle"></i>
                </button>
            </div>
            <div class="tournament-tags">
                ${campaignInfo.tags.map(tag => `<span class="${tag.class}"><i class="${tag.icon}"></i> ${tag.text}</span>`).join('')}
            </div>
            <div class="tournament-time">
                <i class="fas fa-clock"></i>
                ${campaignInfo.time}
            </div>
        </div>
    `;
    card.appendChild(header);

    // Details
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'tournament-details';
    detailsDiv.innerHTML = campaignInfo.details.map(detail => `
        <div class="detail-item">
            <div class="detail-icon">
                <i class="${detail.icon}"></i>
            </div>
            <div class="detail-content">
                <div class="detail-label">${detail.label}</div>
                <div class="detail-value">${detail.value}</div>
            </div>
        </div>
    `).join('');
    card.appendChild(detailsDiv);

    // Campaign Info (party composition)
    const campaignInfoDiv = document.createElement('div');
    campaignInfoDiv.className = 'dnd-campaign-info';
    campaignInfoDiv.innerHTML = `
        <div class="campaign-section">
            <h4><i class="fas fa-users"></i> Composizione Party Attuale</h4>
            <div class="character-avatars">
                ${campaignInfo.party.map(member => member.empty
                    ? `<div class="character-avatar empty-slot" id="dnd-strahd-slot" onclick="showRegistrationModal('dnd-strahd')">
                            <div class="empty-avatar"><i class="fas fa-plus"></i></div>
                            <div class="character-tooltip">
                                <strong>Slot Libero</strong><br>
                                Clicca per richiedere<br>
                                l'accesso alla campagna
                            </div>
                        </div>`
                    : `<div class="character-avatar${member.leader ? ' party-leader' : ''}" onclick="showCharacterBio('${member.name.toLowerCase().split(' ')[0]}')">
                            <img src="${member.avatar}" alt="${member.name}">
                            ${member.leader ? '<span class="crown"><i class="fas fa-crown"></i></span>' : ''}
                            <div class="character-tooltip">
                                <strong>${member.name}</strong><br>
                                ${member.class}<br>
                                <em>${member.role}</em>
                            </div>
                        </div>`
                ).join('')}
            </div>
        </div>
    `;
    card.appendChild(campaignInfoDiv);

    // Actions
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'tournament-actions';

    // Bottone Iscriviti
    const registerBtn = document.createElement('button');
    registerBtn.className = userState.isRegistered ? 'btn btn-success' : 'btn btn-primary';
    registerBtn.id = 'dnd-strahd-register-btn';
    registerBtn.innerHTML = userState.isRegistered
        ? '<i class="fas fa-check"></i> Già Iscritto'
        : '<i class="fas fa-user-plus"></i> Richiedi Accesso';
    registerBtn.disabled = userState.isRegistered || !userState.isLoggedIn;
    if (!userState.isRegistered && userState.isLoggedIn) {
        registerBtn.onclick = function() { showRegistrationModal('dnd-strahd'); };
    }

    // Bottone Info Campagna
    const infoBtn = document.createElement('button');
    infoBtn.className = 'btn btn-secondary';
    infoBtn.innerHTML = '<i class="fas fa-scroll"></i> Info Campagna';
    infoBtn.onclick = function() { showCampaignInfo('dnd-strahd'); };

    actionsDiv.appendChild(registerBtn);
    actionsDiv.appendChild(infoBtn);
    card.appendChild(actionsDiv);

    return card;
}

// Esempio di utilizzo:
// const userState = { isRegistered: true, isLoggedIn: true };
// document.querySelector('.tournaments-timeline').appendChild(createDndTournamentCard(userState));

console.log('✅ Tournaments page module loaded successfully');
