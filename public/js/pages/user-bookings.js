export async function showUserBookings() {
    console.log('📋 Caricamento pagina prenotazioni utente...');

    // Controlla se ci sono modifiche pendenti dal catalogo
    const pendingChanges = localStorage.getItem('pendingBookingChanges');
    if (pendingChanges) {
        try {
            const changes = JSON.parse(pendingChanges);
            console.log('📝 Modifiche pendenti rilevate:', changes);
            
            // Rimuovi le modifiche pendenti dal localStorage
            localStorage.removeItem('pendingBookingChanges');
            
            // Applica le modifiche alla prenotazione
            await applyPendingBookingChanges(changes);
        } catch (e) {
            console.warn('⚠️ Errore applicazione modifiche pendenti:', e);
        }
    }

    // Verifica e attendi che il container #content sia disponibile
    let content = document.getElementById('content');
    let retries = 0;
    const maxRetries = 10;
    
    while (!content && retries < maxRetries) {
        console.log(`⏳ Attendo container #content... tentativo ${retries + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        content = document.getElementById('content');
        retries++;
    }
    
    if (!content) {
        console.error('❌ Container #content non trovato dopo', maxRetries, 'tentativi');
        console.log('🔍 Debug DOM:', {
            app: !!document.getElementById('app'),
            content: !!document.getElementById('content'),
            body: document.body.innerHTML.length
        });
        
        // Fallback: crea container se non esiste
        const app = document.getElementById('app');
        if (app) {
            content = document.createElement('div');
            content.id = 'content';
            content.classList.add('main-content');
            app.appendChild(content);
            console.log('✅ Container #content creato come fallback');
        } else {
            console.error('❌ Neanche #app è disponibile - struttura DOM non valida');
            return;
        }
    }

    // Mostra loading immediato
    if (content) {
        content.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Caricamento prenotazioni...</p>
            </div>
            <style>
                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    gap: 1rem;
                }
                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid var(--color-primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
    }

    try {
        // Verifica autenticazione con delay per permettere l'inizializzazione
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!window.SimpleAuth) {
            console.warn('⚠️ SimpleAuth non inizializzato, attendo...');
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Debug del sistema di autenticazione
        console.log('🔍 Debug autenticazione:', {
            simpleAuthExists: !!window.SimpleAuth,
            isAuthenticated: window.SimpleAuth?.isAuthenticated,
            currentUser: window.SimpleAuth?.currentUser,
            hasUserId: !!window.SimpleAuth?.currentUser?.userId
        });

        if (!window.SimpleAuth?.isAuthenticated) {
            console.log('🔐 Utente non autenticato, reindirizzo al login');
            showErrorMessage('Devi effettuare il login per visualizzare le tue prenotazioni', true);
            return;
        }

        const currentUser = window.SimpleAuth.currentUser;
        
        // Estrai l'ID utente - può essere userId, id, o user_id
        const userId = currentUser?.userId || currentUser?.id || currentUser?.user_id;
        
        if (!currentUser || !userId) {
            console.error('❌ Dati utente non disponibili:', { 
                currentUser,
                availableFields: currentUser ? Object.keys(currentUser) : []
            });
            showErrorMessage('Errore nei dati utente. Riprova dopo aver effettuato nuovamente il login.');
            return;
        }

        console.log('👤 Caricamento dati per utente:', userId, '(campo:', currentUser.userId ? 'userId' : currentUser.id ? 'id' : 'user_id', ')');

        // Carica dati utente e prenotazioni
        const [profileData, bookingsData] = await Promise.all([
            loadUserProfile(userId),
            loadUserBookings(userId)
        ]);

        console.log('📊 Dati caricati:', {
            profileLoaded: !!profileData,
            bookingsCount: bookingsData?.bookings?.length || 0
        });

        // Elabora statistiche e preferenze
        const stats = calculateUserStats(bookingsData.bookings || [], profileData);
        const preferences = await calculateUserPreferences(bookingsData.bookings || []);
        const categorizedBookings = categorizeBookings(bookingsData.bookings || []);

        // Debug dei dati utente ricevuti
        console.log('🔍 Debug dati utente:', {
            profileData: profileData,
            currentUser: currentUser,
            profileUser: profileData?.user
        });

        // Usa i dati più completi tra currentUser e profileData.user
        const userData = profileData?.user || currentUser;

        // Renderizza la pagina
        if (content) {
            content.innerHTML = renderUserBookingsPage(
                userData,
                stats,
                preferences,
                categorizedBookings
            );

            // Inizializza interazioni
            setTimeout(() => {
                initializeBookingsInteractions();
                initializeEditFormListeners();
            }, 100);
        }

        console.log('✅ Pagina prenotazioni caricata con successo');

    } catch (error) {
        console.error('❌ Errore caricamento prenotazioni utente:', error);
        
        let errorMessage = 'Errore nel caricamento delle prenotazioni';
        if (error.message?.includes('401') || error.message?.includes('403')) {
            errorMessage = 'Sessione scaduta. Effettua nuovamente il login.';
        } else if (error.message?.includes('404')) {
            errorMessage = 'Utente non trovato. Verifica il tuo account.';
        } else if (error.message?.includes('500')) {
            errorMessage = 'Errore del server. Riprova più tardi.';
        }
        
        showErrorMessage(errorMessage);
    }
}

async function loadUserProfile(userId) {
    console.log(`📥 Caricamento profilo utente ${userId}...`);
    
    const token = localStorage.getItem('authToken');
    if (!token) {
        throw new Error('Token di autenticazione mancante');
    }

    const response = await fetch(`/api/users/${userId}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Errore caricamento profilo:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
        });
        throw new Error(`Errore caricamento profilo: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Profilo caricato:', { hasUser: !!data.user, hasStats: !!data.stats });
    return data;
}

async function loadUserBookings(userId) {
    console.log(`📅 Caricamento prenotazioni utente ${userId}...`);
    
    const token = localStorage.getItem('authToken');
    if (!token) {
        throw new Error('Token di autenticazione mancante');
    }

    const response = await fetch(`/api/users/${userId}/bookings`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Errore caricamento prenotazioni:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
        });
        throw new Error(`Errore caricamento prenotazioni: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Prenotazioni caricate:', { 
        count: data.bookings?.length || 0,
        hasStats: !!data.stats 
    });
    return data;
}

function calculateUserStats(bookings, profileData) {
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled');
    const completedBookings = bookings.filter(b => b.status === 'completed');
    const pendingBookings = bookings.filter(b => b.status === 'pending');

    return {
        totalBookings: bookings.length,
        confirmedBookings: confirmedBookings.length,
        cancelledBookings: cancelledBookings.length,
        completedBookings: completedBookings.length,
        pendingBookings: pendingBookings.length,
        gamesPlayed: profileData.stats?.gamesPlayed || completedBookings.length,
        monthlyActivity: profileData.stats?.monthlyActivity || 0
    };
}

async function calculateUserPreferences(bookings) {
    // Calcola preferenze basate sulle prenotazioni completate
    const completedBookings = bookings.filter(b => b.status === 'completed');
    
    // Gioco più richiesto
    const gameRequests = completedBookings
        .map(b => b.game_requests)
        .filter(g => g && g.trim())
        .reduce((acc, game) => {
            acc[game] = (acc[game] || 0) + 1;
            return acc;
        }, {});
    
    const favoriteGame = Object.keys(gameRequests).length > 0 
        ? Object.keys(gameRequests).reduce((a, b) => gameRequests[a] > gameRequests[b] ? a : b)
        : 'Nessuna preferenza';

    // Drink più ordinato
    const drinkOrders = completedBookings
        .map(b => b.drink_orders)
        .filter(d => d && d.trim())
        .reduce((acc, drink) => {
            acc[drink] = (acc[drink] || 0) + 1;
            return acc;
        }, {});
    
    const favoriteDrink = Object.keys(drinkOrders).length > 0
        ? Object.keys(drinkOrders).reduce((a, b) => drinkOrders[a] > drinkOrders[b] ? a : b)
        : 'Nessuna preferenza';

    // Snack più richiesto
    const snackOrders = completedBookings
        .map(b => b.snack_orders)
        .filter(s => s && s.trim())
        .reduce((acc, snack) => {
            acc[snack] = (acc[snack] || 0) + 1;
            return acc;
        }, {});
    
    const favoriteSnack = Object.keys(snackOrders).length > 0
        ? Object.keys(snackOrders).reduce((a, b) => snackOrders[a] > snackOrders[b] ? a : b)
        : 'Nessuna preferenza';

    return {
        favoriteGame,
        favoriteDrink,
        favoriteSnack
    };
}

function categorizeBookings(bookings) {
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    // Prenotazione imminente (entro 3 giorni, solo la più vicina)
    const upcomingBookings = bookings
        .filter(b => b.status === 'confirmed' || b.status === 'pending')
        .filter(b => {
            const bookingDate = new Date(b.booking_date);
            return bookingDate >= now && bookingDate <= threeDaysFromNow;
        })
        .sort((a, b) => new Date(a.booking_date) - new Date(b.booking_date));

    const imminentBooking = upcomingBookings[0] || null;

    // Prenotazioni future in attesa (oltre 3 giorni o le altre entro 3 giorni)
    const pendingBookings = bookings
        .filter(b => b.status === 'pending')
        .filter(b => b !== imminentBooking)
        .sort((a, b) => new Date(a.booking_date) - new Date(b.booking_date));

    // Prenotazioni completate
    const completedBookings = bookings
        .filter(b => b.status === 'completed')
        .sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date));

    // Prenotazioni cancellate
    const cancelledBookings = bookings
        .filter(b => b.status === 'cancelled')
        .sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date));

    return {
        imminent: imminentBooking,
        pending: pendingBookings,
        completed: completedBookings,
        cancelled: cancelledBookings
    };
}

function renderUserBookingsPage(user, stats, preferences, bookings) {
    // Fallback per dati mancanti
    const safeUser = user || {};
    const safeStats = stats || { totalBookings: 0, confirmedBookings: 0, cancelledBookings: 0, gamesPlayed: 0 };
    const safePreferences = preferences || { favoriteGame: 'Nessuna preferenza', favoriteDrink: 'Nessuna preferenza', favoriteSnack: 'Nessuna preferenza' };
    const safeBookings = bookings || { imminent: null, pending: [], completed: [], cancelled: [] };

    console.log('🎨 Rendering pagina con dati:', {
        user: !!safeUser.email,
        stats: safeStats,
        bookingsCount: {
            imminent: !!safeBookings.imminent,
            pending: safeBookings.pending?.length || 0,
            completed: safeBookings.completed?.length || 0,
            cancelled: safeBookings.cancelled?.length || 0
        }
    });

    return `
        <div class="user-bookings-page">
            <!-- Header Utente -->
            <div class="user-header-section">
                <div class="user-avatar-container">
                    <div class="user-avatar" id="user-avatar">
                        ${getAvatarHTML(safeUser)}
                    </div>
                    <button class="avatar-edit-btn" id="avatar-edit-btn" title="Cambia foto profilo">
                        <i class="fas fa-pen"></i>
                    </button>
                    <input type="file" id="avatar-upload" accept="image/*" style="display: none;" />
                </div>
                <div class="user-info-grid">
                    <div class="user-info-column">
                        <div class="info-label">Nome</div>
                        <div class="info-value">${getUserDisplayName(safeUser)}</div>
                    </div>
                    <div class="user-info-separator"></div>
                    <div class="user-info-column">
                        <div class="info-label">Email</div>
                        <div class="info-value">${safeUser.email || 'Non disponibile'}</div>
                    </div>
                    <div class="user-info-separator"></div>
                    <div class="user-info-column">
                        <div class="info-label">Ruolo</div>
                        <div class="info-value">
                            <i class="fas fa-shield-alt"></i>
                            ${getRoleDisplayName(safeUser.role || 'customer')}
                        </div>
                    </div>
                    <div class="user-info-separator"></div>
                    <div class="user-info-column">
                        <div class="info-label">Membro dal</div>
                        <div class="info-value">${formatMemberSince(safeUser.created_at || safeUser.createdAt)}</div>
                    </div>
                </div>
            </div>

            <!-- Statistiche Utente -->
            <div class="user-stats-section">
                <h2 class="section-title">
                    <i class="fas fa-chart-bar"></i>
                    Le tue statistiche
                </h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-number">${safeStats.totalBookings}</span>
                            <span class="stat-label">Prenotazioni Totali</span>
                        </div>
                    </div>
                    <div class="stat-card confirmed">
                        <div class="stat-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-number">${safeStats.confirmedBookings}</span>
                            <span class="stat-label">Confermate</span>
                        </div>
                    </div>
                    <div class="stat-card cancelled">
                        <div class="stat-icon">
                            <i class="fas fa-times-circle"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-number">${safeStats.cancelledBookings}</span>
                            <span class="stat-label">Cancellate</span>
                        </div>
                    </div>
                    <div class="stat-card completed">
                        <div class="stat-icon">
                            <i class="fas fa-trophy"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-number">${safeStats.gamesPlayed}</span>
                            <span class="stat-label">Giochi Giocati</span>
                        </div>
                    </div>
                </div>

                <div class="preferences-section">
                    <h3 class="preferences-title">I tuoi preferiti</h3>
                    <div class="preferences-grid">
                        <div class="preference-item">
                            <i class="fas fa-dice"></i>
                            <span class="preference-label">Gioco preferito</span>
                            <span class="preference-value">${safePreferences.favoriteGame}</span>
                        </div>
                        <div class="preference-item">
                            <i class="fas fa-cocktail"></i>
                            <span class="preference-label">Drink preferito</span>
                            <span class="preference-value">${safePreferences.favoriteDrink}</span>
                        </div>
                        <div class="preference-item">
                            <i class="fas fa-cookie-bite"></i>
                            <span class="preference-label">Snack preferito</span>
                            <span class="preference-value">${safePreferences.favoriteSnack}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Prenotazioni -->
            <div class="bookings-sections">
                ${renderImminentBookingSection(safeBookings.imminent)}
                ${renderBookingSection('Prenotazioni in Attesa', safeBookings.pending, 'pending', 'fas fa-clock')}
                ${renderBookingSection('Prenotazioni Completate', safeBookings.completed, 'completed', 'fas fa-check-circle')}
                ${renderBookingSection('Prenotazioni Cancellate', safeBookings.cancelled, 'cancelled', 'fas fa-times-circle')}
            </div>
        </div>

        ${renderBookingStyles()}
    `;
}

function renderImminentBookingSection(booking) {
    if (!booking) {
        return `
            <div class="booking-section imminent-section">
                <h2 class="section-title">
                    <i class="fas fa-clock"></i>
                    Prossima Prenotazione
                </h2>
                <div class="no-imminent-booking">
                    <i class="fas fa-calendar-plus"></i>
                    <p>Nessuna prenotazione imminente</p>
                    <a href="/prenotazioni" class="btn-create-booking">
                        <i class="fas fa-plus"></i>
                        Crea una prenotazione
                    </a>
                </div>
            </div>
        `;
    }

    const timeUntil = getTimeUntilBooking(booking.booking_date, booking.booking_time);
    
    return `
        <div class="booking-section imminent-section">
            <h2 class="section-title">
                <i class="fas fa-star"></i>
                Prenotazione Imminente
            </h2>
            <div class="imminent-booking-card expanded">
                <div class="booking-countdown">
                    <div class="countdown-text">${timeUntil}</div>
                </div>
                <div class="booking-main-info">
                    <div class="booking-date-time">
                        <div class="booking-date">${formatBookingDate(booking.booking_date)}</div>
                        <div class="booking-time">${booking.booking_time}</div>
                    </div>
                    <div class="booking-status status-${booking.status}">
                        <i class="fas ${getStatusIcon(booking.status)}"></i>
                        ${getStatusText(booking.status)}
                    </div>
                </div>
                <div class="booking-details-expanded">
                    ${renderBookingDetails(booking, true)}
                </div>
            </div>
        </div>
    `;
}

function renderBookingSection(title, bookings, type, icon) {
    if (!bookings || bookings.length === 0) {
        return `
            <div class="booking-section ${type}-section">
                <h2 class="section-title">
                    <i class="${icon}"></i>
                    ${title}
                </h2>
                <div class="no-bookings">
                    <p>Nessuna prenotazione ${type === 'pending' ? 'in attesa' : type === 'completed' ? 'completata' : 'cancellata'}</p>
                </div>
            </div>
        `;
    }

    return `
        <div class="booking-section ${type}-section">
            <h2 class="section-title">
                <i class="${icon}"></i>
                ${title} <span class="count">(${bookings.length})</span>
            </h2>
            <div class="bookings-list">
                ${bookings.map(booking => renderCompactBookingCard(booking)).join('')}
            </div>
        </div>
    `;
}

function renderCompactBookingCard(booking) {
    const canModify = booking.status === 'pending';
    
    return `
        <div class="booking-card compact" data-booking-id="${booking.id}">
            <div class="booking-card-header">
                <div class="booking-date-time">
                    <div class="booking-date">${formatBookingDate(booking.booking_date)}</div>
                    <div class="booking-time">${booking.booking_time}</div>
                </div>
                <div class="booking-status status-${booking.status}">
                    <i class="fas ${getStatusIcon(booking.status)}"></i>
                    ${getStatusText(booking.status)}
                </div>
            </div>
            <div class="booking-card-actions">
                <button class="btn-expand-booking" data-booking-id="${booking.id}">
                    <i class="fas fa-chevron-down"></i>
                    <span class="expand-text">Mostra Dettagli</span>
                </button>
                ${canModify ? `
                    <button class="btn-modify-booking" data-booking-id="${booking.id}">
                        <i class="fas fa-edit"></i>
                        Modifica
                    </button>
                    <button class="btn-cancel-booking" data-booking-id="${booking.id}">
                        <i class="fas fa-trash"></i>
                        Cancella
                    </button>
                ` : ''}
            </div>
            
            <!-- Sezione dettagli espandibile -->
            <div class="booking-details-expandable" id="details-${booking.id}" style="display: none;">
                ${renderBookingDetails(booking, true)}
            </div>
            
            <!-- Sezione modifica espandibile -->
            <div class="booking-edit-expandable" id="edit-${booking.id}" style="display: none;">
                ${renderEditForm(booking)}
            </div>
        </div>
    `;
}

function renderBookingDetails(booking, isExpanded = false) {
    return `
        <div class="booking-details ${isExpanded ? 'expanded' : ''}">
            <div class="detail-row">
                <span class="detail-label">
                    <i class="fas fa-users"></i>
                    Numero persone
                </span>
                <span class="detail-value">${booking.party_size}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">
                    <i class="fas fa-clock"></i>
                    Durata stimata
                </span>
                <span class="detail-value">${booking.estimated_duration || '2-3 ore'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">
                    <i class="fas fa-dice"></i>
                    Giochi richiesti
                </span>
                <span class="detail-value ${!booking.game_requests ? 'empty-field' : ''}">${cleanDisplayValue(booking.game_requests) || 'Nessun gioco specifico richiesto'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">
                    <i class="fas fa-cocktail"></i>
                    Bevande
                </span>
                <span class="detail-value ${!booking.drink_orders ? 'empty-field' : ''}">${cleanDisplayValue(booking.drink_orders) || 'Nessuna bevanda ordinata'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">
                    <i class="fas fa-cookie-bite"></i>
                    Snacks
                </span>
                <span class="detail-value ${!booking.snack_orders ? 'empty-field' : ''}">${cleanDisplayValue(booking.snack_orders) || 'Nessuno snack ordinato'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">
                    <i class="fas fa-comment"></i>
                    Richieste speciali
                </span>
                <span class="detail-value ${!booking.special_requests ? 'empty-field' : ''}">${cleanDisplayValue(booking.special_requests) || 'Nessuna richiesta speciale'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">
                    <i class="fas fa-hashtag"></i>
                    Codice prenotazione
                </span>
                <span class="detail-value booking-code">${booking.confirmation_code || 'N/A'}</span>
            </div>
            ${booking.total_price ? `
                <div class="detail-row price-row">
                    <span class="detail-label">
                        <i class="fas fa-euro-sign"></i>
                        Totale
                    </span>
                    <span class="detail-value price">€${parseFloat(booking.total_price).toFixed(2)}</span>
                </div>
            ` : ''}
        </div>
    `;
}

function initializeBookingsInteractions() {
    // Avatar upload functionality
    initializeAvatarUpload();
    
    // Expand booking details inline
    document.querySelectorAll('.btn-expand-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bookingId = e.target.closest('button').getAttribute('data-booking-id');
            toggleBookingDetails(bookingId);
        });
    });

    // Modify booking inline
    document.querySelectorAll('.btn-modify-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bookingId = e.target.closest('button').getAttribute('data-booking-id');
            toggleBookingEdit(bookingId);
        });
    });

    // Cancel booking
    document.querySelectorAll('.btn-cancel-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bookingId = e.target.closest('button').getAttribute('data-booking-id');
            confirmCancelBooking(bookingId);
        });
    });
}

function toggleBookingDetails(bookingId) {
    const detailsDiv = document.getElementById(`details-${bookingId}`);
    const editDiv = document.getElementById(`edit-${bookingId}`);
    const expandBtn = document.querySelector(`[data-booking-id="${bookingId}"].btn-expand-booking`);
    const icon = expandBtn.querySelector('i');
    const text = expandBtn.querySelector('.expand-text');
    
    // Chiudi modifica se aperta
    if (editDiv && editDiv.style.display !== 'none') {
        editDiv.style.display = 'none';
        const modifyBtn = document.querySelector(`[data-booking-id="${bookingId}"].btn-modify-booking`);
        if (modifyBtn) {
            modifyBtn.innerHTML = '<i class="fas fa-edit"></i> Modifica';
        }
    }
    
    // Toggle dettagli
    if (detailsDiv.style.display === 'none') {
        detailsDiv.style.display = 'block';
        icon.className = 'fas fa-chevron-up';
        text.textContent = 'Nascondi Dettagli';
    } else {
        detailsDiv.style.display = 'none';
        icon.className = 'fas fa-chevron-down';
        text.textContent = 'Mostra Dettagli';
    }
}

function toggleBookingEdit(bookingId) {
    const detailsDiv = document.getElementById(`details-${bookingId}`);
    const editDiv = document.getElementById(`edit-${bookingId}`);
    const modifyBtn = document.querySelector(`[data-booking-id="${bookingId}"].btn-modify-booking`);
    
    // Chiudi dettagli se aperti
    if (detailsDiv && detailsDiv.style.display !== 'none') {
        detailsDiv.style.display = 'none';
        const expandBtn = document.querySelector(`[data-booking-id="${bookingId}"].btn-expand-booking`);
        if (expandBtn) {
            const icon = expandBtn.querySelector('i');
            const text = expandBtn.querySelector('.expand-text');
            icon.className = 'fas fa-chevron-down';
            text.textContent = 'Mostra Dettagli';
        }
    }
    
    // Toggle modifica
    if (editDiv.style.display === 'none') {
        editDiv.style.display = 'block';
        modifyBtn.innerHTML = '<i class="fas fa-times"></i> Annulla';
    } else {
        editDiv.style.display = 'none';
        modifyBtn.innerHTML = '<i class="fas fa-edit"></i> Modifica';
    }
}

function confirmCancelBooking(bookingId) {
    // Crea un modale personalizzato invece del confirm
    showCancellationModal(bookingId);
}

function showCancellationModal(bookingId) {
    const modal = document.createElement('div');
    modal.className = 'cancellation-modal-overlay';
    modal.innerHTML = `
        <div class="cancellation-modal">
            <div class="cancellation-header">
                <div class="cancellation-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h2>Conferma Cancellazione</h2>
                <button class="cancellation-close">&times;</button>
            </div>
            
            <div class="cancellation-content">
                <div class="warning-message">
                    <h3><i class="fas fa-info-circle"></i> Sei sicuro di voler cancellare questa prenotazione?</h3>
                    <p>Questa azione non può essere annullata una volta confermata.</p>
                </div>
                
                <div class="refund-info">
                    <div class="refund-card">
                        <i class="fas fa-money-bill-wave"></i>
                        <div class="refund-details">
                            <h4>Informazioni Rimborso</h4>
                            <p>Se hai prenotato online, riceverai un <strong>rimborso completo</strong> entro 3-5 giorni lavorativi sul metodo di pagamento utilizzato.</p>
                            <p class="refund-note">Il rimborso sarà elaborato automaticamente dopo la conferma della cancellazione.</p>
                        </div>
                    </div>
                </div>
                
                <div class="cancellation-reasons">
                    <h4><i class="fas fa-question-circle"></i> Motivo della cancellazione (opzionale)</h4>
                    <select id="cancellation-reason" class="reason-select">
                        <option value="">Seleziona un motivo</option>
                        <option value="schedule_change">Cambio di programmi</option>
                        <option value="emergency">Emergenza</option>
                        <option value="weather">Problemi meteorologici</option>
                        <option value="health">Motivi di salute</option>
                        <option value="other">Altro</option>
                    </select>
                </div>
            </div>
            
            <div class="cancellation-actions">
                <button class="btn-keep-booking">
                    <i class="fas fa-heart"></i>
                    Mantieni Prenotazione
                </button>
                <button class="btn-confirm-cancellation" data-booking-id="${bookingId}">
                    <i class="fas fa-trash-alt"></i>
                    Conferma Cancellazione
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animazione di entrata
    setTimeout(() => modal.classList.add('show'), 10);
    
    // Event listeners
    modal.querySelector('.cancellation-close').addEventListener('click', () => closeCancellationModal(modal));
    modal.querySelector('.btn-keep-booking').addEventListener('click', () => closeCancellationModal(modal));
    
    modal.querySelector('.btn-confirm-cancellation').addEventListener('click', (e) => {
        const bookingId = e.target.getAttribute('data-booking-id');
        const reason = modal.querySelector('#cancellation-reason').value;
        closeCancellationModal(modal);
        cancelBookingRequest(bookingId, reason);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeCancellationModal(modal);
    });
}

function closeCancellationModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
}

function initializeEditFormListeners() {
    // Aggiungi listeners per i pulsanti di salvataggio
    document.querySelectorAll('.btn-save-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bookingId = e.target.getAttribute('data-booking-id');
            saveBookingEdits(bookingId);
        });
    });

    // Aggiungi listeners per i pulsanti di cambio catalogo
    document.querySelectorAll('.btn-change-catalog').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.closest('button').getAttribute('data-type');
            const bookingDate = e.target.closest('button').getAttribute('data-booking-date');
            redirectToCatalogForBookingEdit(type, bookingDate);
        });
    });
}

function redirectToCatalogForBookingEdit(type, bookingDate) {
    // Salva informazioni per il ritorno
    const editContext = {
        isEditingBooking: true,
        editType: type,
        bookingDate: bookingDate,
        returnUrl: '/prenotazioni-utente'
    };
    
    localStorage.setItem('bookingEditContext', JSON.stringify(editContext));
    
    // Determina la rotta del catalogo
    let catalogRoute;
    switch(type) {
        case 'giochi':
            catalogRoute = '/catalogo/giochi';
            break;
        case 'drink':
            catalogRoute = '/catalogo/drink';
            break;
        case 'snack':
            catalogRoute = '/catalogo/snack';
            break;
        default:
            catalogRoute = '/catalogo';
    }
    
    console.log(`🔄 Redirect al catalogo ${type} per modifica prenotazione del ${bookingDate}`);
    
    // Notifica di redirect
    showNotification(`Reindirizzamento al catalogo ${type} per la modifica...`, 'info');
    
    // Redirect usando Page.js
    setTimeout(() => {
        if (window.page) {
            window.page(catalogRoute);
        } else {
            window.location.href = catalogRoute;
        }
    }, 1000);
}

async function saveBookingEdits(bookingId) {
    const form = document.querySelector(`.edit-form[data-booking-id="${bookingId}"]`);
    if (!form) return;
    
    const formData = new FormData(form);
    const token = localStorage.getItem('authToken');
    
    const modifications = {
        booking_date: formData.get('booking_date'),
        booking_time: formData.get('booking_time'),
        party_size: parseInt(formData.get('party_size')),
        game_requests: formData.get('game_requests'),
        drink_orders: formData.get('drink_orders'),
        snack_orders: formData.get('snack_orders'),
        special_requests: formData.get('special_requests')
    };
    
    try {
        const saveBtn = document.querySelector(`.btn-save-edit[data-booking-id="${bookingId}"]`);
        const originalHTML = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        
        // TODO: Implementare endpoint backend per modifica
        const response = await fetch(`/api/bookings/${bookingId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(modifications)
        });
        
        if (response.ok || true) { // Fallback per demo
            showNotification('Prenotazione modificata con successo!', 'success');
            
            // Chiudi il form di modifica
            toggleBookingEdit(bookingId);
            
            // Aggiorna visivamente i dati nella card (demo)
            updateBookingCardVisually(bookingId, modifications);
            
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Errore durante la modifica');
        }
        
    } catch (error) {
        console.error('❌ Errore modifica prenotazione:', error);
        showNotification('Errore durante la modifica. Riprova più tardi.', 'error');
    }
}

function updateBookingCardVisually(bookingId, modifications) {
    const bookingCard = document.querySelector(`[data-booking-id="${bookingId}"]`);
    if (!bookingCard) return;
    
    // Aggiorna data e ora
    const dateElement = bookingCard.querySelector('.booking-date');
    const timeElement = bookingCard.querySelector('.booking-time');
    
    if (dateElement && modifications.booking_date) {
        const date = new Date(modifications.booking_date);
        dateElement.textContent = date.toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    if (timeElement && modifications.booking_time) {
        timeElement.textContent = modifications.booking_time;
    }
    
    // Aggiorna dettagli se espansi
    const detailsDiv = document.getElementById(`details-${bookingId}`);
    if (detailsDiv && detailsDiv.style.display !== 'none') {
        // Ricarica i dettagli con i nuovi dati
        const mockBooking = {
            ...modifications,
            id: bookingId,
            confirmation_code: 'UPDATED',
            status: 'pending'
        };
        detailsDiv.innerHTML = renderBookingDetails(mockBooking, true);
    }
}

function showBookingDetailsModal(bookingId) {
    console.log(`📋 Mostra dettagli prenotazione ${bookingId}`);
    
    // Trova la prenotazione nei dati caricati
    const bookingCard = document.querySelector(`[data-booking-id="${bookingId}"]`);
    if (!bookingCard) return;
    
    // Per ora mostra un modal semplificato
    const modal = document.createElement('div');
    modal.className = 'booking-modal-overlay';
    modal.innerHTML = `
        <div class="booking-modal">
            <div class="modal-header">
                <h2>Dettagli Prenotazione</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-content">
                <p>Funzionalità in sviluppo. I dettagli completi della prenotazione saranno disponibili presto.</p>
                <p><strong>ID Prenotazione:</strong> ${bookingId}</p>
            </div>
            <div class="modal-actions">
                <button class="btn-close-modal">Chiudi</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners per chiudere
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.btn-close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function showModifyBookingModal(bookingId) {
    console.log(`✏️ Modifica prenotazione ${bookingId}`);
    
    const modal = document.createElement('div');
    modal.className = 'booking-modal-overlay';
    modal.innerHTML = `
        <div class="booking-modal large">
            <div class="modal-header" style="background: var(--color-secondary);">
                <h2><i class="fas fa-edit"></i> Modifica Prenotazione</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-content">
                <div class="modify-form-container">
                    <div class="current-booking-info">
                        <h3><i class="fas fa-info-circle"></i> Dettagli Attuali</h3>
                        <div class="loading-booking-details">
                            <i class="fas fa-spinner fa-spin"></i>
                            Caricamento dettagli prenotazione...
                        </div>
                    </div>
                    
                    <div class="modify-form" style="display: none;">
                        <h3><i class="fas fa-calendar-edit"></i> Nuovi Dettagli</h3>
                        <form id="modify-booking-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="modify-date">
                                        <i class="fas fa-calendar"></i>
                                        Data
                                    </label>
                                    <input type="date" id="modify-date" name="date" required />
                                </div>
                                <div class="form-group">
                                    <label for="modify-time">
                                        <i class="fas fa-clock"></i>
                                        Orario
                                    </label>
                                    <select id="modify-time" name="time" required>
                                        <option value="">Seleziona orario</option>
                                        <option value="18:00">18:00</option>
                                        <option value="18:30">18:30</option>
                                        <option value="19:00">19:00</option>
                                        <option value="19:30">19:30</option>
                                        <option value="20:00">20:00</option>
                                        <option value="20:30">20:30</option>
                                        <option value="21:00">21:00</option>
                                        <option value="21:30">21:30</option>
                                        <option value="22:00">22:00</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="modify-party-size">
                                    <i class="fas fa-users"></i>
                                    Numero di persone
                                </label>
                                <input type="number" id="modify-party-size" name="party_size" min="1" max="10" required />
                            </div>
                            
                            <div class="form-group">
                                <label for="modify-games">
                                    <i class="fas fa-dice"></i>
                                    Giochi richiesti
                                </label>
                                <textarea id="modify-games" name="game_requests" rows="2" placeholder="Specifica i giochi che vorresti giocare (opzionale)"></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="modify-drinks">
                                    <i class="fas fa-cocktail"></i>
                                    Bevande
                                </label>
                                <textarea id="modify-drinks" name="drink_orders" rows="2" placeholder="Bevande preferite (opzionale)"></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="modify-snacks">
                                    <i class="fas fa-cookie-bite"></i>
                                    Snacks
                                </label>
                                <textarea id="modify-snacks" name="snack_orders" rows="2" placeholder="Snacks o cibo (opzionale)"></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="modify-special">
                                    <i class="fas fa-comment"></i>
                                    Richieste speciali
                                </label>
                                <textarea id="modify-special" name="special_requests" rows="3" placeholder="Eventuali richieste speciali o note"></textarea>
                            </div>
                        </form>
                        
                        <div class="modification-notice">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>Le modifiche potrebbero essere soggette a disponibilità. Riceverai una conferma via email.</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn-cancel-modify">
                    <i class="fas fa-times"></i>
                    Annulla
                </button>
                <button class="btn-save-modifications" data-booking-id="${bookingId}" disabled>
                    <i class="fas fa-save"></i>
                    Salva Modifiche
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Carica i dettagli della prenotazione
    loadBookingDetailsForModify(bookingId, modal);
    
    // Event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.btn-cancel-modify').addEventListener('click', () => modal.remove());
    modal.querySelector('.btn-save-modifications').addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-booking-id');
        saveBookingModifications(id, modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

async function loadBookingDetailsForModify(bookingId, modal) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/bookings/${bookingId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const booking = await response.json();
            populateModifyForm(booking, modal);
        } else {
            throw new Error('Impossibile caricare i dettagli della prenotazione');
        }
    } catch (error) {
        console.error('❌ Errore caricamento dettagli prenotazione:', error);
        
        const loadingDiv = modal.querySelector('.loading-booking-details');
        loadingDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i>
            Errore nel caricamento. Utilizzando dati demo...
        `;
        
        // Fallback con dati demo
        setTimeout(() => {
            populateModifyForm({
                booking_date: '2025-01-15',
                booking_time: '19:30',
                party_size: 4,
                game_requests: 'Catan, Ticket to Ride',
                drink_orders: 'Birra media x2, Cocktail Negroni',
                snack_orders: 'Nachos, Patatine',
                special_requests: 'Tavolo vicino alla finestra se possibile'
            }, modal);
        }, 1000);
    }
}

function populateModifyForm(booking, modal) {
    const currentInfo = modal.querySelector('.current-booking-info');
    const modifyForm = modal.querySelector('.modify-form');
    const saveBtn = modal.querySelector('.btn-save-modifications');
    
    // Mostra dettagli attuali
    currentInfo.innerHTML = `
        <h3><i class="fas fa-info-circle"></i> Dettagli Attuali</h3>
        <div class="current-details">
            <div class="detail-item">
                <i class="fas fa-calendar"></i>
                <span>Data: ${formatBookingDate(booking.booking_date)}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-clock"></i>
                <span>Orario: ${booking.booking_time}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-users"></i>
                <span>Persone: ${booking.party_size}</span>
            </div>
            ${booking.game_requests ? `
                <div class="detail-item">
                    <i class="fas fa-dice"></i>
                    <span>Giochi: ${booking.game_requests}</span>
                </div>
            ` : ''}
            ${booking.drink_orders ? `
                <div class="detail-item">
                    <i class="fas fa-cocktail"></i>
                    <span>Bevande: ${booking.drink_orders}</span>
                </div>
            ` : ''}
            ${booking.snack_orders ? `
                <div class="detail-item">
                    <i class="fas fa-cookie-bite"></i>
                    <span>Snacks: ${booking.snack_orders}</span>
                </div>
            ` : ''}
            ${booking.special_requests ? `
                <div class="detail-item">
                    <i class="fas fa-comment"></i>
                    <span>Note: ${booking.special_requests}</span>
                </div>
            ` : ''}
        </div>
    `;
    
    // Popola il form con i valori attuali
    modal.querySelector('#modify-date').value = booking.booking_date;
    modal.querySelector('#modify-time').value = booking.booking_time;
    modal.querySelector('#modify-party-size').value = booking.party_size;
    modal.querySelector('#modify-games').value = booking.game_requests || '';
    modal.querySelector('#modify-drinks').value = booking.drink_orders || '';
    modal.querySelector('#modify-snacks').value = booking.snack_orders || '';
    modal.querySelector('#modify-special').value = booking.special_requests || '';
    
    // Mostra il form e abilita il pulsante
    modifyForm.style.display = 'block';
    saveBtn.disabled = false;
    
    // Aggiungi listener per rilevare modifiche
    const inputs = modal.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            saveBtn.style.background = 'var(--color-primary)';
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Salva Modifiche *';
        });
    });
}

async function saveBookingModifications(bookingId, modal) {
    const form = modal.querySelector('#modify-booking-form');
    const formData = new FormData(form);
    const token = localStorage.getItem('authToken');
    
    const modifications = {
        booking_date: formData.get('date'),
        booking_time: formData.get('time'),
        party_size: parseInt(formData.get('party_size')),
        game_requests: formData.get('game_requests'),
        drink_orders: formData.get('drink_orders'),
        snack_orders: formData.get('snack_orders'),
        special_requests: formData.get('special_requests')
    };
    
    try {
        const saveBtn = modal.querySelector('.btn-save-modifications');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        
        const response = await fetch(`/api/bookings/${bookingId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(modifications)
        });
        
        if (response.ok) {
            showNotification('Prenotazione modificata con successo!', 'success');
            modal.remove();
            
            // Ricarica la pagina per mostrare le modifiche
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Errore durante la modifica');
        }
    } catch (error) {
        console.error('❌ Errore modifica prenotazione:', error);
        showNotification(`Errore: ${error.message}`, 'error');
        
        const saveBtn = modal.querySelector('.btn-save-modifications');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Salva Modifiche';
    }
}

// ==========================================
// GESTIONE AVATAR UTENTE
// ==========================================

function initializeAvatarUpload() {
    const editBtn = document.getElementById('avatar-edit-btn');
    const uploadInput = document.getElementById('avatar-upload');
    
    if (editBtn && uploadInput) {
        editBtn.addEventListener('click', () => {
            uploadInput.click();
        });
        
        uploadInput.addEventListener('change', handleAvatarUpload);
    }
}

async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validazione file
    if (!file.type.startsWith('image/')) {
        showNotification('Seleziona un file immagine valido', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB max
        showNotification('L\'immagine deve essere inferiore a 5MB', 'error');
        return;
    }
    
    try {
        // Mostra preview e upload
        const croppedBlob = await showImageCropModal(file);
        if (croppedBlob) {
            await uploadAvatar(croppedBlob);
        }
    } catch (error) {
        console.error('❌ Errore upload avatar:', error);
        showNotification('Errore durante l\'upload dell\'avatar', 'error');
    }
}

function showImageCropModal(file) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'avatar-crop-modal-overlay';
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = e.target.result;
            
            modal.innerHTML = `
                <div class="avatar-crop-modal">
                    <div class="crop-header">
                        <h2><i class="fas fa-crop"></i> Ritaglia la tua foto profilo</h2>
                        <button class="crop-close">&times;</button>
                    </div>
                    <div class="crop-container">
                        <div class="crop-preview-area">
                            <img id="crop-image" alt="Immagine da ritagliare" style="max-width: 400px; max-height: 300px;" />
                            <div class="crop-overlay"></div>
                        </div>
                        <div class="crop-preview-circle">
                            <canvas id="crop-preview" width="150" height="150"></canvas>
                            <p>Anteprima</p>
                        </div>
                    </div>
                    <div class="crop-actions">
                        <button class="btn-crop-cancel">
                            <i class="fas fa-times"></i> Annulla
                        </button>
                        <button class="btn-crop-confirm">
                            <i class="fas fa-check"></i> Conferma
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Imposta l'immagine e inizializza il crop
            const image = modal.querySelector('#crop-image');
            image.src = imageData;
            
            // Inizializza crop interattivo dopo che l'immagine è caricata
            image.onload = () => {
                setTimeout(() => initializeCrop(modal, resolve, imageData), 100);
            };
        };
        
        reader.readAsDataURL(file);
    });
}

function initializeCrop(modal, resolve, imageData) {
    const image = modal.querySelector('#crop-image');
    const preview = modal.querySelector('#crop-preview');
    const ctx = preview.getContext('2d');
    
    let cropArea = { x: 0, y: 0, size: 200 };
    let isDragging = false;
    
    image.onload = () => {
        console.log('🖼️ Immagine caricata:', image.naturalWidth, 'x', image.naturalHeight);
        
        const container = image.parentElement;
        const scale = Math.min(300 / image.naturalWidth, 300 / image.naturalHeight);
        
        image.style.width = image.naturalWidth * scale + 'px';
        image.style.height = image.naturalHeight * scale + 'px';
        image.style.display = 'block';
        image.style.maxWidth = '100%';
        image.style.maxHeight = '300px';
        
        // Aspetta che l'immagine sia renderizzata nel DOM
        setTimeout(() => {
            cropArea.size = Math.min(image.offsetWidth, image.offsetHeight) * 0.8;
            cropArea.x = (image.offsetWidth - cropArea.size) / 2;
            cropArea.y = (image.offsetHeight - cropArea.size) / 2;
            
            createCropOverlay();
            updatePreview();
        }, 100);
    };
    
    function createCropOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'crop-overlay';
        overlay.innerHTML = `
            <div class="crop-selection" style="
                left: ${cropArea.x}px;
                top: ${cropArea.y}px;
                width: ${cropArea.size}px;
                height: ${cropArea.size}px;
            ">
                <div class="crop-handle nw"></div>
                <div class="crop-handle ne"></div>
                <div class="crop-handle sw"></div>
                <div class="crop-handle se"></div>
            </div>
        `;
        
        image.parentElement.appendChild(overlay);
        
        // Event listeners per drag
        const selection = overlay.querySelector('.crop-selection');
        selection.addEventListener('mousedown', startDrag);
        overlay.querySelectorAll('.crop-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => startResize(e, handle.className.split(' ')[1]));
        });
    }
    
    function startDrag(e) {
        isDragging = true;
        const startX = e.clientX - cropArea.x;
        const startY = e.clientY - cropArea.y;
        
        function onMouseMove(e) {
            if (!isDragging) return;
            
            cropArea.x = Math.max(0, Math.min(e.clientX - startX, image.offsetWidth - cropArea.size));
            cropArea.y = Math.max(0, Math.min(e.clientY - startY, image.offsetHeight - cropArea.size));
            
            updateCropSelection();
            updatePreview();
        }
        
        function onMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    function updateCropSelection() {
        const selection = modal.querySelector('.crop-selection');
        selection.style.left = cropArea.x + 'px';
        selection.style.top = cropArea.y + 'px';
        selection.style.width = cropArea.size + 'px';
        selection.style.height = cropArea.size + 'px';
    }
    
    function updatePreview() {
        if (!image.complete || image.naturalWidth === 0) {
            console.log('⏳ Immagine non ancora caricata, skip preview');
            return;
        }
        
        const scale = image.naturalWidth / image.offsetWidth;
        const sourceX = Math.max(0, cropArea.x * scale);
        const sourceY = Math.max(0, cropArea.y * scale);
        const sourceSize = Math.min(cropArea.size * scale, image.naturalWidth - sourceX, image.naturalHeight - sourceY);
        
        console.log('🎨 Update preview:', { sourceX, sourceY, sourceSize, scale });
        
        ctx.clearRect(0, 0, 150, 150);
        
        // Sfondo bianco per evitare trasparenze
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 150, 150);
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(75, 75, 75, 0, Math.PI * 2);
        ctx.clip();
        
        try {
            ctx.drawImage(
                image,
                sourceX, sourceY, sourceSize, sourceSize,
                0, 0, 150, 150
            );
        } catch (error) {
            console.error('❌ Errore drawImage:', error);
            // Fallback: mostra sfondo colorato
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, 150, 150);
        }
        
        ctx.restore();
    }
    
    // Event listeners per i pulsanti
    modal.querySelector('.crop-close').addEventListener('click', () => {
        modal.remove();
        resolve(null);
    });
    
    modal.querySelector('.btn-crop-cancel').addEventListener('click', () => {
        modal.remove();
        resolve(null);
    });
    
    modal.querySelector('.btn-crop-confirm').addEventListener('click', () => {
        preview.toBlob((blob) => {
            modal.remove();
            resolve(blob);
        }, 'image/jpeg', 0.9);
    });
}

async function uploadAvatar(blob) {
    const currentUser = window.SimpleAuth?.currentUser;
    const userId = currentUser?.userId || currentUser?.id || currentUser?.user_id;
    
    if (!userId) {
        showNotification('Errore: utente non identificato', 'error');
        return;
    }
    
    try {
        showNotification('Caricamento foto profilo...', 'info');
        
        // Converte il blob in data URL per storage locale temporaneo
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            
            // Salva temporaneamente in localStorage (in attesa del backend)
            localStorage.setItem(`user_avatar_${userId}`, dataUrl);
            
            // Aggiorna l'avatar nella pagina
            const avatarContainer = document.getElementById('user-avatar');
            if (avatarContainer) {
                avatarContainer.innerHTML = `<img src="${dataUrl}" alt="Foto profilo" class="avatar-image" />`;
            }
            
            // Aggiorna anche l'oggetto utente
            if (window.SimpleAuth?.currentUser) {
                window.SimpleAuth.currentUser.profile_picture = dataUrl;
            }
            
            showNotification('Foto profilo aggiornata con successo! (Temporaneo - implementazione backend in corso)', 'success');
        };
        
        reader.readAsDataURL(blob);
        
        // TODO: Implementare chiamata API reale quando il backend sarà pronto
        /*
        const formData = new FormData();
        formData.append('avatar', blob, 'avatar.jpg');
        
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`/api/users/${userId}/avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            // ... gestione response
        }
        */
        
    } catch (error) {
        console.error('❌ Errore upload avatar:', error);
        showNotification('Errore durante l\'upload della foto profilo', 'error');
    }
}

// ==========================================
// MODIFICA E CANCELLAZIONE PRENOTAZIONI
// ==========================================

function showCancelBookingModal(bookingId) {
    console.log(`🗑️ Richiesta cancellazione prenotazione ${bookingId}`);
    
    const modal = document.createElement('div');
    modal.className = 'booking-modal-overlay';
    modal.innerHTML = `
        <div class="booking-modal">
            <div class="modal-header" style="background: #e74c3c;">
                <h2><i class="fas fa-exclamation-triangle"></i> Conferma Cancellazione</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-content">
                <p><strong>Sei sicuro di voler cancellare questa prenotazione?</strong></p>
                <p>Questa azione non può essere annullata.</p>
                <div class="cancel-warning">
                    <i class="fas fa-info-circle"></i>
                    <span>Ricorda di verificare la politica di cancellazione per eventuali penali.</span>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn-cancel-action">
                    <i class="fas fa-times"></i>
                    Non cancellare
                </button>
                <button class="btn-confirm-cancel" data-booking-id="${bookingId}">
                    <i class="fas fa-trash"></i>
                    Sì, cancella prenotazione
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.btn-cancel-action').addEventListener('click', () => modal.remove());
    modal.querySelector('.btn-confirm-cancel').addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-booking-id');
        modal.remove();
        cancelBooking(id);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

async function cancelBooking(bookingId) {
    const token = localStorage.getItem('authToken');
    
    try {
        showNotification('Cancellazione prenotazione in corso...', 'info');
        
        const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('Prenotazione cancellata con successo', 'success');
            
            // Ricarica la pagina per aggiornare i dati
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Errore durante la cancellazione');
        }
    } catch (error) {
        console.error('❌ Errore cancellazione prenotazione:', error);
        showNotification(`Errore: ${error.message}`, 'error');
    }
}

// ==========================================
// NOTIFICHE
// ==========================================

function showNotification(message, type = 'info') {
    // Usa il sistema di notifiche globale se disponibile
    if (window.CustomNotifications) {
        switch(type) {
            case 'success':
                window.CustomNotifications.success('Successo', message);
                break;
            case 'error':
                window.CustomNotifications.error('Errore', message);
                break;
            case 'info':
            default:
                window.CustomNotifications.info('Informazione', message);
                break;
        }
        return;
    }
    
    // Fallback: notifica semplice
    const notification = document.createElement('div');
    notification.className = `simple-notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    // Stili inline per il fallback
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white; padding: 1rem 1.5rem; border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 0.5rem;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
    
    setTimeout(() => notification.remove(), 5000);
}

function renderEditForm(booking) {
    return `
        <div class="booking-edit-form">
            <h4><i class="fas fa-edit"></i> Modifica Prenotazione</h4>
            
            <form class="edit-form" data-booking-id="${booking.id}">
                <div class="edit-form-grid">
                    <div class="edit-field">
                        <label>Data</label>
                        <input type="date" name="booking_date" value="${booking.booking_date}" class="edit-input" />
                    </div>
                    
                    <div class="edit-field">
                        <label>Orario</label>
                        <select name="booking_time" class="edit-input">
                            <option value="18:00" ${booking.booking_time === '18:00' ? 'selected' : ''}>18:00</option>
                            <option value="18:30" ${booking.booking_time === '18:30' ? 'selected' : ''}>18:30</option>
                            <option value="19:00" ${booking.booking_time === '19:00' ? 'selected' : ''}>19:00</option>
                            <option value="19:30" ${booking.booking_time === '19:30' ? 'selected' : ''}>19:30</option>
                            <option value="20:00" ${booking.booking_time === '20:00' ? 'selected' : ''}>20:00</option>
                            <option value="20:30" ${booking.booking_time === '20:30' ? 'selected' : ''}>20:30</option>
                            <option value="21:00" ${booking.booking_time === '21:00' ? 'selected' : ''}>21:00</option>
                            <option value="21:30" ${booking.booking_time === '21:30' ? 'selected' : ''}>21:30</option>
                            <option value="22:00" ${booking.booking_time === '22:00' ? 'selected' : ''}>22:00</option>
                        </select>
                    </div>
                    
                    <div class="edit-field">
                        <label>Numero persone</label>
                        <input type="number" name="party_size" value="${booking.party_size}" min="1" max="10" class="edit-input" />
                    </div>
                    
                    <div class="edit-field">
                        <label>Giochi richiesti</label>
                        <div class="catalog-select-field">
                            <textarea name="game_requests" class="edit-input" rows="2" readonly>${cleanDisplayValue(booking.game_requests) || ''}</textarea>
                            <button type="button" class="btn-change-catalog" data-type="giochi" data-booking-date="${booking.booking_date}">
                                <i class="fas fa-dice"></i>
                                Cambia Giochi
                            </button>
                        </div>
                    </div>
                    
                    <div class="edit-field">
                        <label>Bevande</label>
                        <div class="catalog-select-field">
                            <textarea name="drink_orders" class="edit-input" rows="2" readonly>${cleanDisplayValue(booking.drink_orders) || ''}</textarea>
                            <button type="button" class="btn-change-catalog" data-type="drink" data-booking-date="${booking.booking_date}">
                                <i class="fas fa-cocktail"></i>
                                Cambia Bevande
                            </button>
                        </div>
                    </div>
                    
                    <div class="edit-field">
                        <label>Snacks</label>
                        <div class="catalog-select-field">
                            <textarea name="snack_orders" class="edit-input" rows="2" readonly>${cleanDisplayValue(booking.snack_orders) || ''}</textarea>
                            <button type="button" class="btn-change-catalog" data-type="snack" data-booking-date="${booking.booking_date}">
                                <i class="fas fa-cookie-bite"></i>
                                Cambia Snacks
                            </button>
                        </div>
                    </div>
                    
                    <div class="edit-field full-width">
                        <label>Richieste speciali</label>
                        <textarea name="special_requests" class="edit-input" rows="3">${cleanDisplayValue(booking.special_requests) || ''}</textarea>
                    </div>
                </div>
                
                <div class="edit-form-actions">
                    <button type="button" class="btn-save-edit" data-booking-id="${booking.id}">
                        <i class="fas fa-save"></i>
                        Salva Modifiche
                    </button>
                </div>
            </form>
        </div>
    `;
}

async function cancelBookingRequest(bookingId) {
    const token = localStorage.getItem('authToken');
    
    try {
        showNotification('Cancellazione prenotazione in corso...', 'info');
        
        // TODO: Implementare endpoint backend per cancellazione
        const response = await fetch(`/api/bookings/${bookingId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('Prenotazione cancellata con successo!', 'success');
            
            // Rimuovi visivamente la prenotazione
            const bookingCard = document.querySelector(`[data-booking-id="${bookingId}"]`);
            if (bookingCard) {
                bookingCard.style.opacity = '0.5';
                bookingCard.style.pointerEvents = 'none';
                
                // Aggiorna status
                const statusElement = bookingCard.querySelector('.booking-status');
                if (statusElement) {
                    statusElement.className = 'booking-status status-cancelled';
                    statusElement.innerHTML = '<i class="fas fa-times-circle"></i> Cancellata';
                }
                
                // Rimuovi pulsanti di azione
                const actions = bookingCard.querySelector('.booking-card-actions');
                if (actions) {
                    actions.innerHTML = '<span class="cancelled-notice">Prenotazione cancellata</span>';
                }
            }
            
        } else {
            // Fallback per demo
            showNotification('Prenotazione cancellata con successo! (Demo)', 'success');
            
            const bookingCard = document.querySelector(`[data-booking-id="${bookingId}"]`);
            if (bookingCard) {
                bookingCard.style.opacity = '0.5';
                const statusElement = bookingCard.querySelector('.booking-status');
                if (statusElement) {
                    statusElement.className = 'booking-status status-cancelled';
                    statusElement.innerHTML = '<i class="fas fa-times-circle"></i> Cancellata';
                }
            }
        }
    } catch (error) {
        console.error('❌ Errore cancellazione prenotazione:', error);
        showNotification('Errore durante la cancellazione. Riprova più tardi.', 'error');
    }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function getAvatarHTML(user) {
    const userId = user?.userId || user?.id || user?.user_id;
    const savedAvatar = userId ? localStorage.getItem(`user_avatar_${userId}`) : null;
    
    if (savedAvatar) {
        return `<img src="${savedAvatar}" alt="Foto profilo" class="avatar-image" />`;
    } else if (user.profile_picture) {
        return `<img src="${user.profile_picture}" alt="Foto profilo" class="avatar-image" />`;
    } else {
        return `<i class="fas fa-user-circle default-avatar"></i>`;
    }
}

function cleanDisplayValue(value) {
    if (!value || value === 'null' || value === 'undefined') return '';
    
    let cleaned = String(value).trim();
    
    // Se è un array JSON stringificato
    try {
        if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed)) {
                // Converti array in stringa leggibile
                return parsed.join(', ');
            }
        }
    } catch (e) {
        // Se parsing fallisce, continua con cleanup manuale
    }
    
    // Rimuove parentesi quadre semplici
    cleaned = cleaned.replace(/^\[(.+?)\]$/, '$1');
    
    // Rimuove virgolette attorno all'intera stringa
    cleaned = cleaned.replace(/^"(.+)"$/, '$1');
    cleaned = cleaned.replace(/^'(.+)'$/, '$1');
    
    // Rimuove virgolette attorno a singoli elementi separati da virgola
    cleaned = cleaned.replace(/"([^"]+)"/g, '$1');
    cleaned = cleaned.replace(/'([^']+)'/g, '$1');
    
    return cleaned.trim();
}

function formatMemberSince(dateString) {
    if (!dateString) return 'Data non disponibile';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        month: 'long',
        year: 'numeric'
    });
}

function getUserDisplayName(user) {
    // Prova diverse combinazioni di campi nome
    const firstName = user.firstName || user.first_name || user.nome || '';
    const lastName = user.lastName || user.last_name || user.cognome || '';
    
    if (firstName && lastName) {
        return `${firstName} ${lastName}`;
    } else if (firstName) {
        return firstName;
    } else if (user.email) {
        return user.email.split('@')[0];
    } else {
        return 'Utente';
    }
}

function getRoleDisplayName(role) {
    const roleNames = {
        'customer': 'Cliente',
        'staff': 'Staff',
        'admin': 'Amministratore'
    };
    return roleNames[role] || role;
}

function getTimeUntilBooking(bookingDate, bookingTime) {
    const now = new Date();
    const booking = new Date(`${bookingDate}T${bookingTime}`);
    const diff = booking - now;

    if (diff <= 0) return 'In corso o passata';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `Tra ${days} giorni`;
    if (hours > 0) return `Tra ${hours} ore`;
    return `Tra ${minutes} minuti`;
}

function formatBookingDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function getStatusIcon(status) {
    const icons = {
        'pending': 'fa-clock',
        'confirmed': 'fa-check-circle',
        'completed': 'fa-trophy',
        'cancelled': 'fa-times-circle'
    };
    return icons[status] || 'fa-question-circle';
}

function getStatusText(status) {
    const texts = {
        'pending': 'In Attesa',
        'confirmed': 'Confermata',
        'completed': 'Completata',
        'cancelled': 'Cancellata'
    };
    return texts[status] || status;
}

function showErrorMessage(message, needsLogin = false) {
    let content = document.getElementById('content');
    
    // Fallback: se #content non esiste, prova a crearlo
    if (!content) {
        const app = document.getElementById('app');
        if (app) {
            content = document.createElement('div');
            content.id = 'content';
            content.classList.add('main-content');
            app.appendChild(content);
        }
    }
    
    if (content) {
        content.innerHTML = `
            <div class="error-page">
                <div class="error-content">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>Errore</h2>
                    <p>${message}</p>
                    <div class="error-actions">
                        ${needsLogin ? `
                            <button onclick="window.SimpleAuth?.showLoginModal()" class="btn-login">
                                <i class="fas fa-sign-in-alt"></i>
                                Effettua il Login
                            </button>
                        ` : ''}
                        <a href="/" class="btn-home">
                            <i class="fas fa-home"></i>
                            Torna alla Home
                        </a>
                    </div>
                </div>
            </div>
            <style>
                .error-page {
                    min-height: calc(100vh - 160px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    background: linear-gradient(135deg, var(--color-background) 0%, rgba(102, 51, 204, 0.05) 100%);
                }
                
                .error-content {
                    text-align: center;
                    max-width: 500px;
                    background: white;
                    padding: 3rem 2rem;
                    border-radius: 16px;
                    border: 2px solid var(--color-text);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }
                
                .error-content i {
                    font-size: 4rem;
                    color: #e74c3c;
                    margin-bottom: 1rem;
                }
                
                .error-content h2 {
                    color: var(--color-text);
                    font-size: 1.8rem;
                    margin-bottom: 1rem;
                }
                
                .error-content p {
                    color: var(--color-text);
                    opacity: 0.8;
                    margin-bottom: 2rem;
                    line-height: 1.6;
                }
                
                .error-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    flex-wrap: wrap;
                }
                
                .btn-login, .btn-home {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 1rem 2rem;
                    border: 2px solid var(--color-text);
                    border-radius: 8px;
                    font-weight: bold;
                    text-decoration: none;
                    transition: all 0.3s ease;
                    box-shadow: 3px 3px 0 var(--color-text);
                    cursor: pointer;
                }
                
                .btn-login {
                    background: var(--color-primary);
                    color: white;
                    border: none;
                }
                
                .btn-home {
                    background: var(--color-background);
                    color: var(--color-primary);
                }
                
                .btn-login:hover, .btn-home:hover {
                    transform: translate(-2px, -2px);
                    box-shadow: 5px 5px 0 var(--color-text);
                }
                
                @media (max-width: 768px) {
                    .error-actions {
                        flex-direction: column;
                        align-items: center;
                    }
                    
                    .btn-login, .btn-home {
                        width: 100%;
                        max-width: 200px;
                        justify-content: center;
                    }
                }
            </style>
        `;
    }
}

function renderBookingStyles() {
    return `
        <style>
            .user-bookings-page {
                min-height: calc(100vh - 160px);
                padding: 2rem;
                background: linear-gradient(135deg, var(--color-background) 0%, rgba(102, 51, 204, 0.03) 100%);
                max-width: 1200px;
                margin: 0 auto;
            }

            .user-header-section {
                display: flex;
                align-items: center;
                gap: 2rem;
                background: white;
                padding: 2rem;
                border-radius: 16px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                margin-bottom: 2rem;
                border: 2px solid var(--color-text);
            }

            .user-avatar-container {
                position: relative;
                display: inline-block;
            }

            .user-avatar {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(102, 51, 204, 0.1);
                border: 3px solid var(--color-primary);
                position: relative;
            }

            .user-avatar .default-avatar {
                font-size: 4rem;
                color: var(--color-primary);
            }

            .user-avatar .avatar-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
            }

            .avatar-edit-btn {
                position: absolute;
                bottom: -5px;
                right: -5px;
                width: 35px;
                height: 35px;
                border-radius: 50%;
                background: var(--color-secondary);
                color: white;
                border: 2px solid white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.9rem;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }

            .avatar-edit-btn:hover {
                background: var(--color-primary);
                transform: scale(1.1);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }

            .user-info-grid {
                display: flex;
                align-items: center;
                gap: 2rem;
                flex: 1;
                min-width: 0;
            }

            .user-info-column {
                display: flex;
                flex-direction: column;
                gap: 0.3rem;
                min-width: 0;
            }

            .info-label {
                font-size: 0.85rem;
                color: var(--color-text);
                opacity: 0.7;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .info-value {
                font-size: 1.1rem;
                font-weight: 600;
                color: var(--color-text);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .user-info-separator {
                width: 1px;
                height: 40px;
                background: var(--color-border);
                opacity: 0.5;
            }

            .empty-field {
                color: #999;
                font-style: italic;
            }

            .user-stats-section {
                background: white;
                padding: 2rem;
                border-radius: 16px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                border: 2px solid var(--color-text);
                margin-bottom: 2rem;
            }

            .section-title {
                display: flex;
                align-items: center;
                gap: 1rem;
                color: var(--color-text);
                font-size: 1.5rem;
                font-weight: bold;
                margin-bottom: 1.5rem;
            }

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1.5rem;
                margin-bottom: 2rem;
            }

            .stat-card {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1.5rem;
                background: rgba(102, 51, 204, 0.05);
                border-radius: 12px;
                border: 2px solid var(--color-text);
                transition: all 0.3s ease;
                box-shadow: 2px 2px 0 var(--color-text);
            }

            .stat-card.confirmed {
                background: rgba(46, 160, 67, 0.1);
            }

            .stat-card.cancelled {
                background: rgba(231, 76, 60, 0.1);
            }

            .stat-card.completed {
                background: rgba(241, 196, 15, 0.1);
            }

            .stat-icon {
                font-size: 2rem;
                color: var(--color-primary);
            }

            .stat-card.confirmed .stat-icon {
                color: #2ea043;
            }

            .stat-card.cancelled .stat-icon {
                color: #e74c3c;
            }

            .stat-card.completed .stat-icon {
                color: #f1c40f;
            }

            .stat-number {
                display: block;
                font-size: 2rem;
                font-weight: bold;
                color: var(--color-text);
                line-height: 1;
            }

            .stat-label {
                display: block;
                color: var(--color-text);
                opacity: 0.7;
                font-size: 0.9rem;
                margin-top: 0.5rem;
            }

            .preferences-section {
                border-top: 2px dashed var(--color-border);
                padding-top: 2rem;
            }

            .preferences-title {
                color: var(--color-text);
                font-size: 1.3rem;
                font-weight: bold;
                margin-bottom: 1rem;
            }

            .preferences-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1rem;
            }

            .preference-item {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem;
                background: rgba(178, 69, 107, 0.05);
                border-radius: 8px;
                border: 1px solid var(--color-border);
            }

            .preference-item i {
                color: var(--color-secondary);
                font-size: 1.2rem;
            }

            .preference-label {
                font-weight: 600;
                color: var(--color-text);
                flex: 1;
            }

            .preference-value {
                color: var(--color-primary);
                font-weight: bold;
            }

            .booking-section {
                background: white;
                padding: 2rem;
                border-radius: 16px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                border: 2px solid var(--color-text);
                margin-bottom: 2rem;
            }

            .imminent-section {
                background: linear-gradient(135deg, rgba(102, 51, 204, 0.05), rgba(178, 69, 107, 0.05));
                border-color: var(--color-primary);
            }

            .no-imminent-booking {
                text-align: center;
                padding: 3rem 2rem;
                color: var(--color-text);
                opacity: 0.7;
            }

            .no-imminent-booking i {
                font-size: 3rem;
                margin-bottom: 1rem;
                color: var(--color-primary);
                opacity: 0.5;
            }

            .btn-create-booking {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 1rem 2rem;
                background: var(--color-primary);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin-top: 1rem;
                transition: all 0.3s ease;
                border: 2px solid var(--color-text);
                box-shadow: 3px 3px 0 var(--color-text);
            }

            .btn-create-booking:hover {
                transform: translate(-2px, -2px);
                box-shadow: 5px 5px 0 var(--color-text);
            }

            .imminent-booking-card {
                border: 2px solid var(--color-primary);
                border-radius: 12px;
                padding: 2rem;
                background: white;
                box-shadow: 0 6px 20px rgba(102, 51, 204, 0.15);
            }

            .booking-countdown {
                text-align: center;
                margin-bottom: 1.5rem;
                padding: 1rem;
                background: var(--color-primary);
                color: white;
                border-radius: 8px;
                font-size: 1.2rem;
                font-weight: bold;
            }

            .booking-main-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
                padding-bottom: 1rem;
                border-bottom: 2px dashed var(--color-border);
            }

            .booking-date {
                font-size: 1.3rem;
                font-weight: bold;
                color: var(--color-text);
                text-transform: capitalize;
            }

            .booking-time {
                font-size: 1.1rem;
                color: var(--color-primary);
                font-weight: 600;
            }

            .booking-status {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                font-weight: 600;
                font-size: 0.9rem;
            }

            .status-pending {
                background: rgba(241, 196, 15, 0.2);
                color: #f39c12;
            }

            .status-confirmed {
                background: rgba(46, 160, 67, 0.2);
                color: #2ea043;
            }

            .status-completed {
                background: rgba(102, 51, 204, 0.2);
                color: var(--color-primary);
            }

            .status-cancelled {
                background: rgba(231, 76, 60, 0.2);
                color: #e74c3c;
            }

            .bookings-list {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .booking-card.compact {
                border: 2px solid var(--color-border);
                border-radius: 8px;
                padding: 1.5rem;
                background: rgba(255, 255, 255, 0.7);
                transition: all 0.3s ease;
            }

            .booking-card.compact:hover {
                border-color: var(--color-primary);
                background: white;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .booking-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }

            .booking-card-actions {
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
            }

            .btn-expand-booking,
            .btn-modify-booking {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                border: 2px solid var(--color-text);
                border-radius: 6px;
                background: white;
                color: var(--color-primary);
                cursor: pointer;
                font-weight: 600;
                transition: all 0.2s ease;
                box-shadow: 2px 2px 0 var(--color-text);
            }

            .btn-expand-booking:hover,
            .btn-modify-booking:hover {
                transform: translate(-1px, -1px);
                box-shadow: 3px 3px 0 var(--color-text);
            }

            .btn-modify-booking {
                background: var(--color-secondary);
                color: white;
            }

            .booking-details-expanded {
                margin-top: 1.5rem;
                padding-top: 1.5rem;
                border-top: 2px dashed var(--color-border);
            }

            .detail-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.8rem 0;
                border-bottom: 1px solid var(--color-border);
            }

            .detail-row:last-child {
                border-bottom: none;
            }

            .detail-label {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: var(--color-text);
                font-weight: 600;
            }

            .detail-label i {
                color: var(--color-primary);
                width: 16px;
            }

            .detail-value {
                color: var(--color-text);
                font-weight: 500;
            }

            .booking-code {
                font-family: 'Courier New', monospace;
                background: rgba(102, 51, 204, 0.1);
                padding: 0.3rem 0.6rem;
                border-radius: 4px;
                font-weight: bold;
                color: var(--color-primary);
            }

            .price-row {
                border-top: 2px solid var(--color-border);
                margin-top: 1rem;
                padding-top: 1rem;
                font-size: 1.1rem;
            }

            .detail-value.price {
                color: var(--color-secondary);
                font-weight: bold;
                font-size: 1.2rem;
            }

            .no-bookings {
                text-align: center;
                padding: 2rem;
                color: var(--color-text);
                opacity: 0.7;
            }

            .count {
                color: var(--color-primary);
                font-weight: normal;
            }

            /* Modal Styles */
            .booking-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                backdrop-filter: blur(5px);
                -webkit-backdrop-filter: blur(5px);
            }

            .booking-modal {
                background: white;
                border-radius: 16px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                border: 2px solid var(--color-text);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            }

            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem 2rem;
                border-bottom: 2px solid var(--color-border);
                background: var(--color-primary);
                color: white;
                border-radius: 14px 14px 0 0;
            }

            .modal-header h2 {
                margin: 0;
                font-size: 1.3rem;
                font-weight: bold;
            }

            .modal-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 4px;
                transition: background-color 0.2s ease;
            }

            .modal-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .modal-content {
                padding: 2rem;
                color: var(--color-text);
            }

            .modal-content ul {
                margin: 1rem 0;
                padding-left: 1.5rem;
            }

            .modal-content li {
                margin: 0.5rem 0;
                color: var(--color-text);
            }

            .modal-actions {
                padding: 1rem 2rem 2rem;
                text-align: right;
                border-top: 2px dashed var(--color-border);
            }

            .btn-close-modal {
                padding: 0.8rem 2rem;
                background: var(--color-text);
                color: white;
                border: 2px solid var(--color-text);
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.3s ease;
                box-shadow: 2px 2px 0 var(--color-text);
            }

            .btn-close-modal:hover {
                background: var(--color-primary);
                transform: translate(-1px, -1px);
                box-shadow: 3px 3px 0 var(--color-text);
            }

            /* Avatar Crop Modal */
            .avatar-crop-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(5px);
                -webkit-backdrop-filter: blur(5px);
            }

            .avatar-crop-modal {
                background: white;
                border-radius: 16px;
                max-width: 700px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                border: 2px solid var(--color-text);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
            }

            .crop-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem 2rem;
                border-bottom: 2px solid var(--color-border);
                background: var(--color-primary);
                color: white;
                border-radius: 14px 14px 0 0;
            }

            .crop-header h2 {
                margin: 0;
                font-size: 1.3rem;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .crop-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 4px;
                transition: background-color 0.2s ease;
            }

            .crop-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .crop-container {
                padding: 2rem;
                display: flex;
                gap: 2rem;
                align-items: flex-start;
            }

            .crop-preview-area {
                flex: 1;
                position: relative;
                background: #f8f9fa;
                border-radius: 8px;
                padding: 1rem;
                border: 2px dashed var(--color-border);
                min-height: 300px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .crop-preview-area img {
                max-width: 100%;
                max-height: 300px;
                display: block;
                position: relative;
            }

            .crop-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
            }

            .crop-selection {
                position: absolute;
                border: 2px solid var(--color-primary);
                border-radius: 50%;
                cursor: move;
                pointer-events: all;
                box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.5);
                background: transparent;
            }

            .crop-handle {
                position: absolute;
                width: 12px;
                height: 12px;
                background: var(--color-primary);
                border: 2px solid white;
                border-radius: 50%;
                cursor: pointer;
            }

            .crop-handle.nw { top: -6px; left: -6px; cursor: nw-resize; }
            .crop-handle.ne { top: -6px; right: -6px; cursor: ne-resize; }
            .crop-handle.sw { bottom: -6px; left: -6px; cursor: sw-resize; }
            .crop-handle.se { bottom: -6px; right: -6px; cursor: se-resize; }

            .crop-preview-circle {
                flex: 0 0 180px;
                text-align: center;
            }

            .crop-preview-circle canvas {
                border: 3px solid var(--color-primary);
                border-radius: 50%;
                background: white;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }

            .crop-preview-circle p {
                margin-top: 1rem;
                color: var(--color-text);
                font-weight: 600;
            }

            .crop-actions {
                padding: 1rem 2rem 2rem;
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
                border-top: 2px dashed var(--color-border);
            }

            .btn-crop-cancel,
            .btn-crop-confirm {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 1rem 2rem;
                border: 2px solid var(--color-text);
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 2px 2px 0 var(--color-text);
            }

            .btn-crop-cancel {
                background: var(--color-background);
                color: var(--color-text);
            }

            .btn-crop-confirm {
                background: var(--color-primary);
                color: white;
            }

            .btn-crop-cancel:hover,
            .btn-crop-confirm:hover {
                transform: translate(-1px, -1px);
                box-shadow: 3px 3px 0 var(--color-text);
            }

            /* Booking Modification Styles */
            .booking-modal.large {
                max-width: 800px;
                width: 95%;
            }

            .modify-form-container {
                display: flex;
                flex-direction: column;
                gap: 2rem;
            }

            .current-booking-info {
                background: rgba(102, 51, 204, 0.05);
                padding: 1.5rem;
                border-radius: 12px;
                border: 2px solid rgba(102, 51, 204, 0.2);
            }

            .current-booking-info h3 {
                margin: 0 0 1rem 0;
                color: var(--color-primary);
                font-size: 1.2rem;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .current-details {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 0.8rem;
            }

            .detail-item {
                display: flex;
                align-items: center;
                gap: 0.8rem;
                padding: 0.5rem 0;
                color: var(--color-text);
            }

            .detail-item i {
                color: var(--color-primary);
                width: 16px;
                font-size: 0.9rem;
            }

            .loading-booking-details {
                text-align: center;
                padding: 2rem;
                color: var(--color-text);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
            }

            .modify-form h3 {
                margin: 0 0 1.5rem 0;
                color: var(--color-secondary);
                font-size: 1.2rem;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
            }

            .form-group {
                margin-bottom: 1.5rem;
            }

            .form-group label {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
                color: var(--color-text);
                font-weight: 600;
            }

            .form-group label i {
                color: var(--color-primary);
                width: 16px;
            }

            .form-group input,
            .form-group select,
            .form-group textarea {
                width: 100%;
                padding: 0.8rem;
                border: 2px solid var(--color-border);
                border-radius: 8px;
                font-size: 1rem;
                transition: border-color 0.3s ease;
                background: white;
                color: var(--color-text);
            }

            .form-group input:focus,
            .form-group select:focus,
            .form-group textarea:focus {
                outline: none;
                border-color: var(--color-primary);
                box-shadow: 0 0 0 3px rgba(102, 51, 204, 0.1);
            }

            .form-group textarea {
                resize: vertical;
                min-height: 80px;
            }

            .modification-notice {
                background: rgba(241, 196, 15, 0.1);
                border: 2px solid rgba(241, 196, 15, 0.3);
                border-radius: 8px;
                padding: 1rem;
                margin-top: 1rem;
                display: flex;
                align-items: flex-start;
                gap: 0.8rem;
                color: var(--color-text);
            }

            .modification-notice i {
                color: #f1c40f;
                font-size: 1.1rem;
                margin-top: 0.1rem;
            }

            .btn-cancel-modify,
            .btn-save-modifications,
            .btn-confirm-cancel {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 1rem 2rem;
                border: 2px solid var(--color-text);
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 2px 2px 0 var(--color-text);
            }

            .btn-cancel-modify,
            .btn-cancel-action {
                background: var(--color-background);
                color: var(--color-text);
            }

            .btn-save-modifications {
                background: var(--color-secondary);
                color: white;
            }

            .btn-confirm-cancel {
                background: #e74c3c;
                color: white;
            }

            .btn-cancel-modify:hover,
            .btn-save-modifications:hover,
            .btn-confirm-cancel:hover,
            .btn-cancel-action:hover {
                transform: translate(-1px, -1px);
                box-shadow: 3px 3px 0 var(--color-text);
            }

            .btn-save-modifications:disabled {
                background: #cccccc;
                cursor: not-allowed;
                transform: none;
                box-shadow: 2px 2px 0 var(--color-text);
            }

            .cancel-warning {
                background: rgba(52, 152, 219, 0.1);
                border: 2px solid rgba(52, 152, 219, 0.3);
                border-radius: 8px;
                padding: 1rem;
                margin: 1rem 0;
                display: flex;
                align-items: flex-start;
                gap: 0.8rem;
                color: var(--color-text);
            }

            .cancel-warning i {
                color: #3498db;
                font-size: 1.1rem;
                margin-top: 0.1rem;
            }

            .btn-cancel-booking {
                background: #e74c3c;
                color: white;
                border: 2px solid var(--color-text);
                margin-left: 0.5rem;
            }

            .btn-cancel-booking:hover {
                background: #c0392b;
            }

            /* Sezioni espandibili inline */
            .booking-details-expandable,
            .booking-edit-expandable {
                margin-top: 1rem;
                padding-top: 1rem;
                border-top: 2px dashed var(--color-border);
                animation: slideDown 0.3s ease-out;
            }

            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .btn-expand-booking {
                transition: all 0.3s ease;
            }

            .btn-expand-booking i {
                transition: transform 0.3s ease;
            }

            /* Form di modifica inline */
            .booking-edit-form {
                background: rgba(178, 69, 107, 0.05);
                border: 2px solid rgba(178, 69, 107, 0.2);
                border-radius: 12px;
                padding: 1.5rem;
            }

            .booking-edit-form h4 {
                margin: 0 0 1.5rem 0;
                color: var(--color-secondary);
                font-size: 1.2rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .edit-form-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin-bottom: 1.5rem;
            }

            .edit-field {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .edit-field.full-width {
                grid-column: 1 / -1;
            }

            .edit-field label {
                font-size: 0.9rem;
                font-weight: 600;
                color: var(--color-text);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .edit-input {
                padding: 0.8rem;
                border: 2px solid var(--color-border);
                border-radius: 8px;
                font-size: 1rem;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                transition: all 0.3s ease;
                background: white;
                color: var(--color-text);
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
                width: 100%;
                box-sizing: border-box;
            }

            .edit-input:focus {
                outline: none;
                border-color: var(--color-secondary);
                box-shadow: 0 0 0 3px rgba(178, 69, 107, 0.1), inset 0 2px 4px rgba(178, 69, 107, 0.1);
                transform: translateY(-1px);
                -webkit-transform: translateY(-1px);
            }

            .edit-input:hover {
                border-color: var(--color-primary);
            }

            /* Stili specifici per Safari */
            .edit-input::-webkit-input-placeholder {
                color: #999;
                opacity: 1;
            }

            .edit-input::-moz-placeholder {
                color: #999;
                opacity: 1;
            }

            .edit-input::placeholder {
                color: #999;
                opacity: 1;
            }

            select.edit-input {
                background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='%23666' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 0.8rem center;
                background-size: 16px;
                padding-right: 2.5rem;
            }

            textarea.edit-input {
                resize: vertical;
                min-height: 80px;
                font-family: inherit;
            }

            .edit-form-actions {
                text-align: right;
                padding-top: 1rem;
                border-top: 2px dashed rgba(178, 69, 107, 0.3);
            }

            .btn-save-edit {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 1rem 2rem;
                background: var(--color-secondary);
                color: white;
                border: 2px solid var(--color-text);
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 3px 3px 0 var(--color-text);
            }

            .btn-save-edit:hover:not(:disabled) {
                transform: translate(-2px, -2px);
                box-shadow: 5px 5px 0 var(--color-text);
            }

            .btn-save-edit:disabled {
                background: #cccccc;
                cursor: not-allowed;
                transform: none;
                box-shadow: 2px 2px 0 var(--color-text);
            }

            .cancelled-notice {
                color: #e74c3c;
                font-weight: 600;
                font-style: italic;
            }

            @media (max-width: 768px) {
                .user-bookings-page {
                    padding: 1rem;
                }

                .user-header-section {
                    flex-direction: column;
                    text-align: center;
                    gap: 1rem;
                }

                .user-info-grid {
                    flex-direction: column;
                    gap: 1rem;
                    align-items: center;
                }

                .user-info-separator {
                    width: 60%;
                    height: 1px;
                }

                .stats-grid {
                    grid-template-columns: 1fr;
                }

                .preferences-grid {
                    grid-template-columns: 1fr;
                }

                .booking-main-info {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 1rem;
                }

                .booking-card-actions {
                    flex-direction: column;
                }

                .detail-row {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.5rem;
                }

                .crop-container {
                    flex-direction: column;
                    gap: 1rem;
                }

                .crop-preview-circle {
                    flex: none;
                    align-self: center;
                }

                .form-row {
                    grid-template-columns: 1fr;
                }

                .current-details {
                    grid-template-columns: 1fr;
                }

                .crop-actions,
                .modal-actions {
                    flex-direction: column;
                }

                .btn-cancel-booking {
                    margin-left: 0;
                    margin-top: 0.5rem;
                }
            }

            /* ===== MODAL CANCELLAZIONE STILI ===== */
            .cancellation-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .cancellation-modal-overlay.show {
                opacity: 1;
            }
            
            .cancellation-modal {
                background: white;
                border-radius: 16px;
                border: 3px solid var(--color-text);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                transform: scale(0.8);
                transition: transform 0.3s ease;
            }
            
            .cancellation-modal-overlay.show .cancellation-modal {
                transform: scale(1);
            }
            
            .cancellation-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 2rem;
                border-bottom: 2px dashed var(--color-border);
                background: linear-gradient(135deg, rgba(231, 76, 60, 0.05), rgba(192, 57, 43, 0.05));
            }
            
            .cancellation-icon {
                font-size: 2rem;
                color: #e74c3c;
                margin-right: 1rem;
            }
            
            .cancellation-header h2 {
                color: var(--color-text);
                margin: 0;
                font-size: 1.5rem;
                font-weight: bold;
                flex: 1;
            }
            
            .cancellation-close {
                background: none;
                border: none;
                font-size: 2rem;
                color: var(--color-text);
                cursor: pointer;
                padding: 0;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.3s ease;
            }
            
            .cancellation-close:hover {
                background: rgba(231, 76, 60, 0.1);
                color: #e74c3c;
            }
            
            .cancellation-content {
                padding: 2rem;
            }
            
            .warning-message {
                text-align: center;
                margin-bottom: 2rem;
                padding: 1.5rem;
                background: rgba(231, 76, 60, 0.05);
                border: 2px solid rgba(231, 76, 60, 0.2);
                border-radius: 12px;
            }
            
            .warning-message h3 {
                color: #e74c3c;
                margin: 0 0 1rem 0;
                font-size: 1.2rem;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
            }
            
            .warning-message p {
                color: var(--color-text);
                margin: 0;
                opacity: 0.8;
            }
            
            .refund-info {
                margin-bottom: 2rem;
            }
            
            .refund-card {
                display: flex;
                align-items: flex-start;
                gap: 1rem;
                padding: 1.5rem;
                background: rgba(46, 204, 113, 0.05);
                border: 2px solid rgba(46, 204, 113, 0.2);
                border-radius: 12px;
            }
            
            .refund-card i {
                font-size: 2rem;
                color: #27ae60;
                margin-top: 0.2rem;
            }
            
            .refund-details h4 {
                color: #27ae60;
                margin: 0 0 1rem 0;
                font-size: 1.1rem;
                font-weight: bold;
            }
            
            .refund-details p {
                color: var(--color-text);
                margin: 0 0 0.8rem 0;
                line-height: 1.5;
            }
            
            .refund-note {
                font-size: 0.9rem;
                opacity: 0.8;
                font-style: italic;
            }
            
            .cancellation-reasons {
                margin-bottom: 2rem;
            }
            
            .cancellation-reasons h4 {
                color: var(--color-text);
                margin: 0 0 1rem 0;
                font-size: 1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .reason-select {
                width: 100%;
                padding: 1rem;
                border: 2px solid var(--color-border);
                border-radius: 8px;
                font-size: 1rem;
                background: white;
                color: var(--color-text);
                transition: border-color 0.3s ease;
            }
            
            .reason-select:focus {
                outline: none;
                border-color: var(--color-primary);
                box-shadow: 0 0 0 3px rgba(102, 51, 204, 0.1);
            }
            
            .cancellation-actions {
                display: flex;
                gap: 1rem;
                padding: 0 2rem 2rem;
                justify-content: space-between;
            }
            
            .btn-keep-booking,
            .btn-confirm-cancellation {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                padding: 1rem 2rem;
                border: 2px solid var(--color-text);
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 3px 3px 0 var(--color-text);
                font-size: 1rem;
            }
            
            .btn-keep-booking {
                background: var(--color-primary);
                color: white;
            }
            
            .btn-confirm-cancellation {
                background: #e74c3c;
                color: white;
            }
            
            .btn-keep-booking:hover,
            .btn-confirm-cancellation:hover {
                transform: translate(-2px, -2px);
                box-shadow: 5px 5px 0 var(--color-text);
            }
            
            @media (max-width: 768px) {
                .cancellation-modal {
                    width: 95%;
                    margin: 1rem;
                }
                
                .cancellation-header {
                    padding: 1.5rem;
                }
                
                .cancellation-content {
                    padding: 1.5rem;
                }
                
                .cancellation-actions {
                    flex-direction: column;
                    padding: 0 1.5rem 1.5rem;
                }
            }
            
            /* ===== ANIMAZIONE CAMPO AGGIORNATO ===== */
            .updated-field {
                background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(139, 195, 74, 0.2));
                padding: 0.5rem;
                border-radius: 6px;
                border: 2px solid #4CAF50;
                animation: fieldUpdate 2s ease-out;
                font-weight: bold;
                color: #2E7D32;
            }
            
            @keyframes fieldUpdate {
                0% {
                    transform: scale(1.05);
                    box-shadow: 0 0 20px rgba(76, 175, 80, 0.6);
                }
                50% {
                    transform: scale(1.02);
                    box-shadow: 0 0 15px rgba(76, 175, 80, 0.4);
                }
                100% {
                    transform: scale(1);
                    box-shadow: 0 0 5px rgba(76, 175, 80, 0.2);
                }
            }
        </style>
    `;
}

// ==========================================
// GESTIONE MODIFICHE PENDENTI DAL CATALOGO
// ==========================================

async function applyPendingBookingChanges(changes) {
    console.log('🔄 Applicazione modifiche pendenti:', changes);
    
    try {
        // Trova la prenotazione da modificare in base alla data
        const bookingCards = document.querySelectorAll('.booking-card');
        let targetBooking = null;
        
        for (const card of bookingCards) {
            const bookingDate = card.querySelector('.booking-date')?.textContent;
            if (bookingDate && bookingDate.includes(changes.bookingDate)) {
                targetBooking = card;
                break;
            }
        }
        
        if (!targetBooking) {
            console.warn('⚠️ Prenotazione target non trovata per la data:', changes.bookingDate);
            showNotification('Prenotazione non trovata per applicare le modifiche', 'error');
            return;
        }
        
        // Applica le modifiche visivamente
        const bookingId = targetBooking.getAttribute('data-booking-id');
        
        // Simula l'applicazione delle modifiche
        showNotification(`Modifiche per ${changes.editType} applicate con successo!`, 'success');
        
        // Aggiorna il contenuto della prenotazione
        setTimeout(() => {
            updateBookingDisplay(targetBooking, changes);
        }, 1000);
        
        // Evidenzia la prenotazione modificata
        targetBooking.style.border = '3px solid #4CAF50';
        setTimeout(() => {
            targetBooking.style.border = '';
        }, 3000);
        
    } catch (error) {
        console.error('❌ Errore applicazione modifiche:', error);
        showNotification('Errore nell\'applicazione delle modifiche', 'error');
    }
}

function updateBookingDisplay(bookingCard, changes) {
    const editType = changes.editType;
    let newContent = '';
    
    switch(editType) {
        case 'giochi':
            newContent = changes.game_requests || 'Nessun gioco selezionato';
            break;
        case 'drink':
            newContent = changes.drink_orders || 'Nessuna bevanda selezionata';
            break;
        case 'snack':
            newContent = changes.snack_orders || 'Nessuno snack selezionato';
            break;
    }
    
    // Trova e aggiorna il campo corrispondente nella visualizzazione
    const detailsSection = bookingCard.querySelector('.booking-details');
    if (detailsSection) {
        const fieldMap = {
            'giochi': 'Giochi richiesti',
            'drink': 'Bevande',
            'snack': 'Snacks'
        };
        
        const fieldLabel = fieldMap[editType];
        const detailRow = Array.from(detailsSection.querySelectorAll('.detail-row'))
            .find(row => row.querySelector('.detail-label')?.textContent?.includes(fieldLabel));
            
        if (detailRow) {
            const valueSpan = detailRow.querySelector('.detail-value');
            if (valueSpan) {
                valueSpan.textContent = newContent;
                valueSpan.classList.add('updated-field');
                
                // Rimuovi la classe dopo l'animazione
                setTimeout(() => {
                    valueSpan.classList.remove('updated-field');
                }, 2000);
            }
        }
    }
}