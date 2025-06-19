// js/pages/about.js
// SCOPO: Pagina About Us per Dice & Drink
// RELAZIONI: Chiamata da main.js tramite routing Page.js
// ✅ DESIGN: Coerente con homepage, semplice ma elegante

console.log('📄 Caricamento pagina About Us...');

/**
 * Funzione principale per mostrare la pagina About Us
 */
export function showAboutUs() {
    console.log('🎯 Apertura pagina About Us');

    const content = document.getElementById('content');
    if (!content) {
        console.error('❌ Container #content non trovato!');
        return;
    }

    // Renderizza la pagina
    content.innerHTML = createAboutHTML();

    // Setup animazioni
    setupAboutAnimations();

    console.log('✅ Pagina About Us caricata con successo');
}

/**
 * Crea l'HTML della pagina About Us
 */
function createAboutHTML() {
    return `
        <div class="about-page">
            <!-- Hero Section -->
            <section class="about-hero">
                <div class="hero-content">
                    <h1 class="about-title">
                        <i class="fas fa-dice-d20"></i>
                        Chi Siamo
                    </h1>
                    <p class="about-subtitle">
                        La passione per i giochi da tavolo incontra l'arte della mixology
                    </p>
                </div>
            </section>

            <!-- Story Section -->
            <section class="about-story">
                <div class="story-container">
                    <div class="story-content">
                        <h2 class="section-title">
                            <i class="fas fa-heart"></i>
                            La Nostra Storia
                        </h2>
                        <p class="story-text">
                            <strong>Dice & Drink</strong> nasce dalla passione di un gruppo di amici che ha deciso di
                            unire due mondi meravigliosi: i giochi da tavolo e l'arte dei cocktail.
                        </p>
                        <p class="story-text">
                            Nel <strong>2019</strong>, abbiamo aperto le porte del nostro locale con un sogno:
                            creare uno spazio dove le persone possano disconnettersi dal digitale e riconnettersi
                            tra loro attraverso il gioco, il buon cibo e drink artigianali.
                        </p>
                        <p class="story-text">
                            Oggi siamo diventati il punto di riferimento per gli appassionati di board games
                            della città, offrendo un'esperienza unica che combina divertimento, socializzazione
                            e alta qualità culinaria.
                        </p>
                    </div>
                    <div class="story-image">
                        <div class="image-placeholder">
                            <i class="fas fa-users"></i>
                            <span>Il nostro team</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Values Section -->
            <section class="about-values">
                <div class="values-container">
                    <h2 class="section-title centered">
                        <i class="fas fa-star"></i>
                        I Nostri Valori
                    </h2>
                    <div class="values-grid">
                        <div class="value-card">
                            <div class="value-icon">
                                <i class="fas fa-gamepad"></i>
                            </div>
                            <h3>Passione per il Gioco</h3>
                            <p>Crediamo nel potere del gioco di unire le persone e creare momenti indimenticabili</p>
                        </div>
                        <div class="value-card">
                            <div class="value-icon">
                                <i class="fas fa-cocktail"></i>
                            </div>
                            <h3>Qualità Artigianale</h3>
                            <p>Ogni drink è preparato con ingredienti selezionati e tecniche di mixology professionale</p>
                        </div>
                        <div class="value-card">
                            <div class="value-icon">
                                <i class="fas fa-handshake"></i>
                            </div>
                            <h3>Comunità</h3>
                            <p>Costruiamo una community di giocatori dove tutti si sentono benvenuti e valorizzati</p>
                        </div>
                        <div class="value-card">
                            <div class="value-icon">
                                <i class="fas fa-leaf"></i>
                            </div>
                            <h3>Sostenibilità</h3>
                            <p>Ci impegniamo per un futuro sostenibile con prodotti locali e pratiche eco-friendly</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Team Section -->
            <section class="about-team">
                <div class="team-container">
                    <h2 class="section-title centered">
                        <i class="fas fa-people-group"></i>
                        Il Nostro Team
                    </h2>
                    <div class="team-grid">
                        <div class="team-member">
                            <div class="member-avatar">
                                <i class="fas fa-user-tie"></i>
                            </div>
                            <h3>Marco Rossi</h3>
                            <p class="member-role">Fondatore & Game Master</p>
                            <p class="member-description">
                                Appassionato di strategici e collezionista di giochi da oltre 15 anni
                            </p>
                        </div>
                        <div class="team-member">
                            <div class="member-avatar">
                                <i class="fas fa-user-graduate"></i>
                            </div>
                            <h3>Elena Bianchi</h3>
                            <p class="member-role">Head Bartender</p>
                            <p class="member-description">
                                Esperta mixologist con certificazioni internazionali e creatività senza limiti
                            </p>
                        </div>
                        <div class="team-member">
                            <div class="member-avatar">
                                <i class="fas fa-user-friends"></i>
                            </div>
                            <h3>Luca Verde</h3>
                            <p class="member-role">Community Manager</p>
                            <p class="member-description">
                                Organizza tornei, eventi e cura le relazioni con la community di giocatori
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Location Section -->
            <section class="about-location">
                <div class="location-container">
                    <div class="location-content">
                        <h2 class="section-title">
                            <i class="fas fa-map-marker-alt"></i>
                            Dove Trovarci
                        </h2>
                        <div class="location-info">
                            <div class="info-item">
                                <i class="fas fa-home"></i>
                                <span>Via del Gioco 42, Milano</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-phone"></i>
                                <span>+39 02 1234 5678</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-envelope"></i>
                                <span>info@diceanddrink.it</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-clock"></i>
                                <span>Mar-Dom: 18:00 - 01:00</span>
                            </div>
                        </div>
                        <div class="location-actions">
                            <a href="/prenotazioni" class="btn-primary">
                                <i class="fas fa-calendar-plus"></i>
                                Prenota un Tavolo
                            </a>
                            <a href="/catalogo" class="btn-secondary">
                                <i class="fas fa-dice-d6"></i>
                                Scopri i Giochi
                            </a>
                        </div>
                    </div>
                    <div class="location-map">
                        <div class="map-placeholder">
                            <i class="fas fa-map"></i>
                            <span>Mappa interattiva</span>
                            <small>Zona Navigli, Milano</small>
                        </div>
                    </div>
                </div>
            </section>

            <!-- CTA Section -->
            <section class="about-cta">
                <div class="cta-container">
                    <h2>Pronto per la tua prima partita?</h2>
                    <p>Unisciti alla nostra community e scopri il piacere di giocare mentre gusti drink eccezionali</p>
                    <div class="cta-buttons">
                        <a href="/prenotazioni" class="btn-primary large">
                            <i class="fas fa-calendar-check"></i>
                            Prenota Ora
                        </a>
                        <a href="/catalogo" class="btn-outline large">
                            <i class="fas fa-dice-d20"></i>
                            Esplora il Catalogo
                        </a>
                    </div>
                </div>
            </section>
        </div>
    `;
}

/**
 * Setup animazioni e interazioni
 */
function setupAboutAnimations() {
    // Animazione di entrata per le sezioni
    const sections = document.querySelectorAll('.about-page section');

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        section.classList.add('animate-ready');
        observer.observe(section);
    });

    // Click handlers per navigazione
    setupNavigationHandlers();

    // Parallax leggero per hero
    setupParallaxEffect();
}

/**
 * Setup handler per navigazione
 */
function setupNavigationHandlers() {
    document.querySelectorAll('a[href^="/"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            if (window.diceRouter) {
                window.diceRouter.navigateTo(href);
            } else {
                window.location.href = href;
            }
        });
    });
}

/**
 * Effetto parallax leggero per l'hero
 */
function setupParallaxEffect() {
    const hero = document.querySelector('.about-hero');
    if (!hero) return;

    let ticking = false;

    function updateParallax() {
        const scrolled = window.pageYOffset;
        const parallax = scrolled * 0.5;
        hero.style.transform = `translateY(${parallax}px)`;
        ticking = false;
    }

    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }

    window.addEventListener('scroll', requestTick);
}

// ==========================================
// EXPORT E COMPATIBILITÀ
// ==========================================

// Support per AMD
if (typeof define === 'function' && define.amd) {
    define([], function() {
        return { showAboutUs };
    });
}

// Support per CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showAboutUs };
}

// Global fallback
if (typeof window !== 'undefined') {
    window.showAboutUs = showAboutUs;
}

console.log('✅ About Us module caricato completamente');
