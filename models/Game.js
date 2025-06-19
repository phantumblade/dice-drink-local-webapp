class Game {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.minPlayers = data.min_players;
    this.maxPlayers = data.max_players;
    this.rentalPrice = data.rental_price;
    this.durationMinutes = data.duration_minutes;
    this.difficultyLevel = data.difficulty_level;
    this.category = data.category;
    this.imageUrl = data.image_url;
    this.createdAt = data.created_at;
  }


  getPlayerRange() {
    if (this.minPlayers === this.maxPlayers) {
      return `${this.minPlayers} giocatori`;
    }
    return `${this.minPlayers}-${this.maxPlayers} giocatori`;
  }

  // Converte minuti in formato leggibile con ore
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
