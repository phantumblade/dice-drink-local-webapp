/**
 * Sistema di Notifiche Personalizzate
 * Sostituisce gli alert browser con notifiche eleganti
 */

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.maxNotifications = 5;
    }

    /**
     * Mostra una notifica personalizzata
     * @param {string} title - Titolo della notifica
     * @param {string} message - Messaggio della notifica
     * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Durata in millisecondi (default: 4000)
     */
    show(title, message, type = 'info', duration = 4000) {
        // Rimuovi notifiche eccedenti
        if (this.notifications.length >= this.maxNotifications) {
            this.removeOldest();
        }

        const notification = this.createNotification(title, message, type, duration);
        document.body.appendChild(notification);
        this.notifications.push(notification);

        // Mostra con animazione
        setTimeout(() => notification.classList.add('show'), 10);

        // Auto-rimozione
        if (duration > 0) {
            setTimeout(() => this.remove(notification), duration);
        }

        return notification;
    }

    /**
     * Notifica di successo
     */
    success(title, message, duration = 3000) {
        return this.show(title, message, 'success', duration);
    }

    /**
     * Notifica di errore
     */
    error(title, message, duration = 5000) {
        return this.show(title, message, 'error', duration);
    }

    /**
     * Notifica di avviso
     */
    warning(title, message, duration = 4000) {
        return this.show(title, message, 'warning', duration);
    }

    /**
     * Notifica informativa
     */
    info(title, message, duration = 4000) {
        return this.show(title, message, 'info', duration);
    }

    /**
     * Crea l'elemento DOM della notifica
     */
    createNotification(title, message, type, duration) {
        const notification = document.createElement('div');
        notification.className = 'custom-notification';

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle', 
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        notification.innerHTML = `
            <div class="notification-header">
                <div class="notification-icon ${type}">
                    <i class="${icons[type]}"></i>
                </div>
                <div class="notification-content">
                    <h4>${title}</h4>
                    <p>${message}</p>
                </div>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            ${duration > 0 ? `
                <div class="notification-progress">
                    <div class="notification-progress-bar ${type}"></div>
                </div>
            ` : ''}
        `;

        // Event listener per chiusura
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.remove(notification));

        // Aggiorna posizioni
        this.updatePositions();

        return notification;
    }

    /**
     * Rimuove una notifica
     */
    remove(notification) {
        if (!notification || !notification.parentNode) return;

        notification.classList.remove('show');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
            
            this.updatePositions();
        }, 400);
    }

    /**
     * Rimuove la notifica più vecchia
     */
    removeOldest() {
        if (this.notifications.length > 0) {
            this.remove(this.notifications[0]);
        }
    }

    /**
     * Aggiorna le posizioni delle notifiche
     */
    updatePositions() {
        this.notifications.forEach((notification, index) => {
            if (notification.parentNode) {
                notification.style.top = `${20 + (index * 80)}px`;
            }
        });
    }

    /**
     * Rimuove tutte le notifiche
     */
    clear() {
        this.notifications.forEach(notification => this.remove(notification));
    }
}

// Crea istanza globale
window.CustomNotifications = new NotificationSystem();

/**
 * Funzioni di convenience globali per sostituire alert()
 */
window.showSuccess = (title, message, duration) => window.CustomNotifications.success(title, message, duration);
window.showError = (title, message, duration) => window.CustomNotifications.error(title, message, duration);
window.showWarning = (title, message, duration) => window.CustomNotifications.warning(title, message, duration);
window.showInfo = (title, message, duration) => window.CustomNotifications.info(title, message, duration);

/**
 * Sostituisce alert() con notifica personalizzata
 * Analizza il contenuto per determinare il tipo
 */
window.customAlert = function(message) {
    let title = 'Attenzione';
    let type = 'info';
    let cleanMessage = message;

    // Rileva tipo dal contenuto
    if (message.includes('❌') || message.includes('Errore') || message.includes('Error')) {
        type = 'error';
        title = 'Errore';
    } else if (message.includes('⚠️') || message.includes('Attenzione') || message.includes('Warning')) {
        type = 'warning';
        title = 'Attenzione';
    } else if (message.includes('✅') || message.includes('Successo') || message.includes('Completato')) {
        type = 'success';
        title = 'Successo';
    }

    // Pulisci messaggio da emoji iniziali
    cleanMessage = cleanMessage.replace(/^[❌⚠️✅📋🔧📊➕❤️]\s*/, '');

    // Estrai titolo se presente
    const lines = cleanMessage.split('\n');
    if (lines.length > 1 && lines[0].length < 50) {
        title = lines[0].trim();
        cleanMessage = lines.slice(1).join('\n').trim();
    }

    return window.CustomNotifications.show(title, cleanMessage, type);
};

console.log('✅ Sistema di notifiche personalizzate caricato');