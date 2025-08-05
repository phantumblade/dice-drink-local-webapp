export function showError404() {
    return `
        <div class="error-404-container">
            <div class="error-404-content">
                <div class="error-404-main-section">
                    <div class="error-404-icon">
                        <i class="fas fa-dice-d20"></i>
                        <span class="error-code">404</span>
                    </div>
                    
                    <div class="error-404-message">
                        <h1>Pagina non trovata</h1>
                        <p>Ops! Sembra che questa pagina sia sparita nel vuoto cosmico...</p>
                        <p>Forse stavi cercando uno dei nostri fantastici giochi o drink?</p>
                    </div>
                    
                    <div class="error-404-actions">
                        <a href="/" class="btn-main btn-home">
                            <i class="fas fa-home"></i>
                            <span>Torna alla Home</span>
                        </a>
                        <a href="/catalogo" class="btn-main btn-catalog">
                            <i class="fas fa-th-large"></i>
                            <span>Sfoglia il Catalogo</span>
                        </a>
                    </div>
                </div>
                
                <div class="error-404-divider"></div>
                
                <div class="error-404-suggestions">
                    <h3>Oppure prova una di queste:</h3>
                    <div class="suggestions-list">
                        <a href="/catalogo/giochi" class="suggestion-link">
                            <i class="fas fa-dice"></i>
                            <span>Giochi da Tavolo</span>
                        </a>
                        <a href="/catalogo/drink" class="suggestion-link">
                            <i class="fas fa-cocktail"></i>
                            <span>Cocktails & Drink</span>
                        </a>
                        <a href="/catalogo/snack" class="suggestion-link">
                            <i class="fas fa-cookie-bite"></i>
                            <span>Snacks & Stuzzichini</span>
                        </a>
                        <a href="/prenotazioni" class="suggestion-link">
                            <i class="fas fa-calendar-alt"></i>
                            <span>Prenotazioni</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
        
        <style>
            .error-404-container {
                min-height: calc(100vh - 160px);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
                background: linear-gradient(135deg, 
                    var(--color-background) 0%, 
                    rgba(102, 51, 204, 0.05) 100%);
            }
            
            .error-404-content {
                display: flex;
                gap: 3rem;
                max-width: 1200px;
                width: 100%;
                animation: fadeInUp 0.8s ease-out;
                align-items: flex-start;
            }
            
            .error-404-main-section {
                flex: 1;
                text-align: center;
                min-width: 300px;
            }
            
            .error-404-divider {
                width: 2px;
                background: linear-gradient(
                    to bottom,
                    transparent 0%,
                    var(--color-primary) 20%,
                    var(--color-secondary) 50%,
                    var(--color-primary) 80%,
                    transparent 100%
                );
                margin: 0 1rem;
                min-height: 400px;
                border-radius: 1px;
            }
            
            .error-404-suggestions {
                flex: 0 0 300px;
                text-align: left;
            }
            
            .error-404-icon {
                margin-bottom: 2rem;
                position: relative;
            }
            
            .error-404-icon .fas {
                font-size: 5rem;
                color: var(--color-primary);
                opacity: 0.3;
                animation: spin 8s linear infinite;
            }
            
            .error-code {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 4rem;
                font-weight: bold;
                color: var(--color-primary);
                font-family: 'Courier New', monospace;
            }
            
            .error-404-message h1 {
                color: var(--color-text);
                font-size: 2.5rem;
                margin-bottom: 1rem;
                font-weight: bold;
            }
            
            .error-404-message p {
                color: var(--color-text);
                font-size: 1.1rem;
                margin-bottom: 0.5rem;
                opacity: 0.8;
            }
            
            .error-404-actions {
                margin: 2rem 0;
                display: flex;
                flex-direction: column;
                gap: 1rem;
                align-items: center;
            }
            
            .btn-main {
                display: inline-flex;
                align-items: center;
                gap: 0.8rem;
                padding: 1rem 2rem;
                border: 2px solid var(--color-text);
                border-radius: 0.5rem;
                background-color: var(--color-background);
                color: var(--color-primary);
                font-weight: bold;
                text-decoration: none;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 3px 3px 0 var(--color-text);
                min-width: 200px;
                justify-content: center;
            }
            
            .btn-main:hover {
                text-decoration: none;
                transform: translate(-2px, -2px);
                box-shadow: 5px 5px 0 var(--color-text);
            }
            
            .btn-main:active {
                transform: translate(1px, 1px);
                box-shadow: 2px 2px 0 var(--color-text);
            }
            
            .btn-home {
                background-color: var(--color-background);
                color: var(--color-primary);
            }
            
            .btn-home:hover {
                background-color: var(--color-primary);
                color: var(--color-background);
            }
            
            .btn-catalog {
                background-color: var(--color-secondary);
                color: var(--color-background);
            }
            
            .btn-catalog:hover {
                background-color: var(--color-primary-alt);
            }
            
            .error-404-suggestions h3 {
                color: var(--color-text);
                margin-bottom: 1.5rem;
                font-size: 1.3rem;
                text-align: center;
            }
            
            .suggestions-list {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                width: 100%;
            }
            
            .suggestion-link {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem 1.5rem;
                border: 2px solid var(--color-text);
                border-radius: 0.5rem;
                background-color: var(--color-background);
                color: var(--color-text);
                text-decoration: none;
                transition: all 0.2s ease;
                box-shadow: 2px 2px 0 var(--color-text);
                cursor: pointer;
            }
            
            .suggestion-link:hover {
                text-decoration: none;
                transform: translate(-1px, -1px);
                box-shadow: 3px 3px 0 var(--color-text);
                background-color: rgba(102, 51, 204, 0.05);
                border-color: var(--color-primary);
            }
            
            .suggestion-link:active {
                transform: translate(1px, 1px);
                box-shadow: 1px 1px 0 var(--color-text);
            }
            
            .suggestion-link:hover span {
                text-decoration: underline;
            }
            
            .suggestion-link i {
                font-size: 1.5rem;
                color: var(--color-primary);
                min-width: 24px;
                text-align: center;
                transition: transform 0.2s ease;
            }
            
            .suggestion-link:hover i {
                transform: scale(1.1);
            }
            
            .suggestion-link span {
                font-size: 1rem;
                font-weight: 600;
                transition: text-decoration 0.2s ease;
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            @media (max-width: 768px) {
                .error-404-container {
                    padding: 1rem;
                    min-height: calc(100vh - 120px);
                }
                
                .error-404-content {
                    flex-direction: column;
                    gap: 2rem;
                    max-width: 100%;
                    padding: 0 0.5rem;
                }
                
                .error-404-main-section {
                    min-width: auto;
                }
                
                .error-404-divider {
                    display: none;
                }
                
                .error-404-suggestions {
                    flex: none;
                    text-align: center;
                }
                
                .error-404-icon .fas {
                    font-size: 3.5rem;
                }
                
                .error-code {
                    font-size: 3rem;
                }
                
                .error-404-message h1 {
                    font-size: 2rem;
                    margin-bottom: 0.8rem;
                }
                
                .error-404-message p {
                    font-size: 1rem;
                    margin-bottom: 0.4rem;
                }
                
                .error-404-actions {
                    margin: 1.5rem 0;
                }
                
                .btn-main {
                    width: 100%;
                    max-width: 280px;
                }
                
                .suggestions-list {
                    gap: 0.8rem;
                }
                
                .suggestion-link {
                    padding: 0.8rem 1rem;
                }
                
                .suggestion-link i {
                    font-size: 1.3rem;
                }
                
                .suggestion-link span {
                    font-size: 0.9rem;
                }
            }
            
            @media (max-width: 480px) {
                .error-404-container {
                    padding: 0.8rem;
                }
                
                .error-404-content {
                    gap: 1.5rem;
                }
                
                .error-404-message h1 {
                    font-size: 1.8rem;
                }
                
                .error-404-message p {
                    font-size: 0.95rem;
                }
                
                .suggestion-link {
                    padding: 0.7rem 0.8rem;
                    gap: 0.8rem;
                }
                
                .suggestion-link i {
                    font-size: 1.2rem;
                }
                
                .suggestion-link span {
                    font-size: 0.85rem;
                }
            }
            
            @media (min-width: 769px) and (max-width: 1024px) {
                .error-404-content {
                    gap: 2.5rem;
                }
                
                .error-404-divider {
                    min-height: 350px;
                }
                
                .error-404-suggestions {
                    flex: 0 0 280px;
                }
            }
            
            @media (min-width: 1025px) {
                .error-404-content {
                    gap: 3rem;
                }
                
                .error-404-divider {
                    min-height: 450px;
                }
                
                .error-404-suggestions {
                    flex: 0 0 320px;
                }
                
                .suggestion-link {
                    padding: 1.2rem 1.8rem;
                }
                
                .suggestion-link i {
                    font-size: 1.6rem;
                }
                
                .suggestion-link span {
                    font-size: 1.1rem;
                }
            }
        </style>
    `;
}