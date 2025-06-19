class Drink {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.isAlcoholic = data.is_alcoholic;
    this.baseSpirit = data.base_spirit;
    this.price = data.price;
    this.imageUrl = data.image_url;
    this.createdAt = data.created_at;
  }


  getAlcoholType() {
    return this.isAlcoholic ? 'Alcolico' : 'Analcolico';
  }

  getTypeIcon() {
    return this.isAlcoholic ? '🍸' : '🥤';
  }

  getSpiritCategory() {
    const categories = {
      'gin': 'Gin',
      'vodka': 'Vodka',
      'rum': 'Rum',
      'bourbon': 'Bourbon',
      'tequila': 'Tequila',
      'whiskey di segale': 'Whiskey',
      'aperol': 'Aperitivo',
      'birra': 'Birra',
      'caffè': 'Caffè',
      'tè chai': 'Tè',
      'tè alle erbe': 'Tè',
      'succo di mirtillo': 'Succo di Frutta',
      'limonata': 'Succo di Frutta',
      'soda': 'Bevanda Gassata'
    };
    return categories[this.baseSpirit] || 'Altro';
  }

  // Formatta il prezzo con il simbolo dell'euro
  getFormattedPrice() {
    return `€${this.price.toFixed(2)}`;
  }

  // Determina se è un drink "premium" (prezzo alto)
  isPremium() {
    return this.price >= 8.00;
  }

  // Restituisce una descrizione breve (prime 50 caratteri)
  getShortDescription() {
    if (!this.description) return 'Nessuna descrizione';
    return this.description.length > 50
      ? this.description.substring(0, 50) + '...'
      : this.description;
  }

  // Verifica se il drink è adatto per una fascia di prezzo
  isInPriceRange(minPrice, maxPrice) {
    return this.price >= minPrice && this.price <= maxPrice;
  }

  // Determina il livello di prezzo (economico, medio, premium)
  getPriceLevel() {
    if (this.price < 4.00) return 'Economico';
    if (this.price < 7.00) return 'Medio';
    return 'Premium';
  }

  // Restituisce suggerimenti di abbinamento basati sul tipo di drink
  getGameSuggestions() {
    if (this.isAlcoholic) {
      if (this.baseSpirit === 'bourbon' || this.baseSpirit === 'whiskey di segale') {
        return ['Giochi di strategia', 'Giochi lunghi', 'Giochi complessi'];
      }
      if (this.baseSpirit === 'vodka' || this.baseSpirit === 'gin') {
        return ['Party game', 'Giochi sociali', 'Giochi di gruppo'];
      }
      if (this.baseSpirit === 'birra' || this.baseSpirit === 'aperol') {
        return ['Tutti i tipi di giochi', 'Serate casual', 'Tornei'];
      }
    } else {
      if (this.baseSpirit === 'caffè' || this.baseSpirit === 'tè chai') {
        return ['Giochi di strategia', 'Sessioni mattutine', 'Giochi cerebrali'];
      }
      return ['Giochi family-friendly', 'Pomeriggi di gioco', 'Tutte le età'];
    }
    return ['Versatile per ogni occasione'];
  }
}

module.exports = Drink;
