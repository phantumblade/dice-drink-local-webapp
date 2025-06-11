// SCOPO: Definisce la struttura di un "gioco da tavolo" e metodi di utilità
// RELAZIONI: Usato da gamesDao.js per restituire oggetti strutturati

class Game {
  constructor(data) {
    // Mappa i campi del database agli attributi dell'oggetto
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.minPlayers = data.min_players;        // Converte snake_case -> camelCase
    this.maxPlayers = data.max_players;
    this.rentalPrice = data.rental_price;
    this.durationMinutes = data.duration_minutes;
    this.difficultyLevel = data.difficulty_level;
    this.category = data.category;
    this.imageUrl = data.image_url;
    this.createdAt = data.created_at;
  }

  // METODI DI UTILITÀ: Trasformano i dati grezzi in formato user-friendly

  // Restituisce "3-4 giocatori" invece di numeri separati
  getPlayerRange() {
    if (this.minPlayers === this.maxPlayers) {
      return `${this.minPlayers} giocatori`;
    }
    return `${this.minPlayers}-${this.maxPlayers} giocatori`;
  }

  // Converte minuti in formato leggibile: "1h 30min"
  getDurationFormatted() {
    if (!this.durationMinutes) return 'Non specificato';

    const hours = Math.floor(this.durationMinutes / 60);
    const minutes = this.durationMinutes % 60;

    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}min`;
  }

  // Converte numero difficoltà in testo
  getDifficultyText() {
    const levels = {
      1: 'Principiante',
      2: 'Facile',
      3: 'Intermedio',
      4: 'Avanzato',
      5: 'Esperto'
    };
    return levels[this.difficultyLevel] || 'Non specificato';
  }

  // IMPORTANTE: Calcola prezzo per giocatore (per sessioni aperte)
  getPricePerPlayer(actualPlayers = null) {
    const players = actualPlayers || this.minPlayers;
    return (this.rentalPrice / players).toFixed(2);
  }

  // Verifica se il gioco supporta un certo numero di giocatori
  canPlay(playerCount) {
    return playerCount >= this.minPlayers && playerCount <= this.maxPlayers;
  }
}

module.exports = Game;
