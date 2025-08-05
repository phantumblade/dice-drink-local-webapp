export function showError404() {
    return `
        <div class="error-404-container">
            <div class="error-404-content">
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
                    <button onclick="window.location.href = '/'" class="btn-home">
                        <i class="fas fa-home"></i>
                        Torna alla Home
                    </button>
                    <button onclick="window.location.href = '/catalog'" class="btn-catalog">
                        <i class="fas fa-th-large"></i>
                        Sfoglia il Catalogo
                    </button>
                </div>
                
                <div class="error-404-suggestions">
                    <h3>Oppure prova una di queste:</h3>
                    <div class="suggestions-grid">
                        <a href="/games" class="suggestion-card">
                            <i class="fas fa-dice"></i>
                            <span>Giochi da Tavolo</span>
                        </a>
                        <a href="/drinks" class="suggestion-card">
                            <i class="fas fa-cocktail"></i>
                            <span>Cocktails & Drink</span>
                        </a>
                        <a href="/snacks" class="suggestion-card">
                            <i class="fas fa-cookie-bite"></i>
                            <span>Snacks & Stuzzichini</span>
                        </a>
                        <a href="/bookings" class="suggestion-card">
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
                text-align: center;
                max-width: 600px;
                animation: fadeInUp 0.8s ease-out;
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
                gap: 1rem;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .btn-home, .btn-catalog {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 1rem 2rem;
                border: 2px solid var(--color-text);
                border-radius: 0.5rem;
                background-color: var(--color-background);
                color: var(--color-primary);
                font-weight: bold;
                text-decoration: none;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 3px 3px 0 var(--color-text);
            }
            
            .btn-home:hover, .btn-catalog:hover {
                background-color: var(--color-primary);
                color: var(--color-background);
                transform: translate(-2px, -2px);
                box-shadow: 5px 5px 0 var(--color-text);
            }
            
            .btn-catalog {
                background-color: var(--color-secondary);
                color: var(--color-background);
            }
            
            .btn-catalog:hover {
                background-color: var(--color-primary-alt);
            }
            
            .error-404-suggestions {
                margin-top: 3rem;
                padding-top: 2rem;
                border-top: 2px dashed var(--color-border);
            }
            
            .error-404-suggestions h3 {
                color: var(--color-text);
                margin-bottom: 1.5rem;
                font-size: 1.3rem;
            }
            
            .suggestions-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                gap: 1rem;
                max-width: 500px;
                margin: 0 auto;
            }
            
            .suggestion-card {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
                padding: 1.5rem 1rem;
                border: 2px solid var(--color-border);
                border-radius: 0.5rem;
                background-color: rgba(255, 255, 255, 0.7);
                color: var(--color-text);
                text-decoration: none;
                transition: all 0.3s ease;
                backdrop-filter: blur(5px);
            }
            
            .suggestion-card:hover {
                border-color: var(--color-primary);
                background-color: rgba(102, 51, 204, 0.1);
                transform: translateY(-3px);
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            }
            
            .suggestion-card i {
                font-size: 2rem;
                color: var(--color-primary);
                margin-bottom: 0.5rem;
            }
            
            .suggestion-card span {
                font-size: 0.9rem;
                font-weight: 600;
                text-align: center;
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
                
                .error-404-icon .fas {
                    font-size: 3.5rem;
                }
                
                .error-code {
                    font-size: 3rem;
                }
                
                .error-404-message h1 {
                    font-size: 2rem;
                }
                
                .error-404-actions {
                    flex-direction: column;
                    align-items: center;
                }
                
                .suggestions-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 0.8rem;
                }
                
                .suggestion-card {
                    padding: 1rem 0.5rem;
                }
            }
        </style>
    `;
}