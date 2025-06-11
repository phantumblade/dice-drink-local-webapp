// SCOPO: Definisce la struttura di uno "snack" e metodi di utilità
// RELAZIONI: Usato da snacksDao.js per restituire oggetti strutturati

class Snack {
  constructor(data) {
    // Mappa i campi del database agli attributi dell'oggetto
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.isSweet = data.is_sweet;                // Converte snake_case -> camelCase
    this.mainIngredient = data.main_ingredient;
    this.price = data.price;
    this.suggestedGame = data.suggested_game;
    this.suggestedDrink = data.suggested_drink;
    this.imageUrl = data.image_url;
    this.createdAt = data.created_at;
  }

  // METODI DI UTILITÀ: Trasformano i dati grezzi in formato user-friendly

  // Restituisce "Dolce" o "Salato"
  getType() {
    return this.isSweet ? 'Dolce' : 'Salato';
  }

  // Restituisce l'icona appropriata per il tipo di snack
  getTypeIcon() {
    return this.isSweet ? '🍫' : '🧀';
  }

  // Restituisce la categoria dell'ingrediente principale
  getIngredientCategory() {
    const categories = {
      'formaggio': 'Latticini',
      'mais': 'Cereali',
      'pane': 'Panificati',
      'patate': 'Tuberi',
      'olive': 'Verdure',
      'farina': 'Panificati',
      'cioccolato': 'Dolciario',
      'zucchero': 'Dolciario',
      'mascarpone': 'Latticini'
    };
    return categories[this.mainIngredient] || 'Altro';
  }

  // Formatta il prezzo con il simbolo dell'euro
  getFormattedPrice() {
    return `€${this.price.toFixed(2)}`;
  }

  // Determina se è uno snack "premium" (prezzo alto)
  isPremium() {
    return this.price >= 6.00;
  }

  // Restituisce una descrizione breve (prime 50 caratteri)
  getShortDescription() {
    if (!this.description) return 'Nessuna descrizione';
    return this.description.length > 50
      ? this.description.substring(0, 50) + '...'
      : this.description;
  }

  // Verifica se lo snack è adatto per una fascia di prezzo
  isInPriceRange(minPrice, maxPrice) {
    return this.price >= minPrice && this.price <= maxPrice;
  }

  // Determina il livello di prezzo (economico, medio, premium)
  getPriceLevel() {
    if (this.price < 5.00) return 'Economico';
    if (this.price < 6.50) return 'Medio';
    return 'Premium';
  }

  // Verifica se è adatto per persone con allergie comuni
  isAllergenFriendly() {
    // Lista ingredienti generalmente sicuri per allergie comuni
    const safeIngredients = ['olive', 'patate', 'mais'];
    return safeIngredients.includes(this.mainIngredient);
  }

  // Restituisce consigli nutrizionali basati sull'ingrediente
  getNutritionalInfo() {
    const nutritionInfo = {
      'formaggio': 'Ricco di proteine e calcio',
      'mais': 'Fonte di fibre e antiossidanti',
      'pane': 'Carboidrati per energia',
      'patate': 'Potassio e vitamina C',
      'olive': 'Grassi buoni e vitamina E',
      'farina': 'Carboidrati complessi',
      'cioccolato': 'Antiossidanti e magnesio',
      'zucchero': 'Energia rapida',
      'mascarpone': 'Calcio e proteine'
    };
    return nutritionInfo[this.mainIngredient] || 'Nutriente e gustoso';
  }

  // Determina il momento ideale per consumarlo
  getBestTime() {
    if (this.isSweet) {
      if (this.mainIngredient === 'mascarpone') return 'Fine serata';
      if (this.mainIngredient === 'cioccolato') return 'Pausa dolce';
      return 'Merenda';
    } else {
      if (this.mainIngredient === 'olive') return 'Aperitivo';
      if (this.mainIngredient === 'formaggio') return 'Durante il gioco';
      return 'Spuntino';
    }
  }

  // Verifica se è facile da mangiare durante il gioco (finger food)
  isGameFriendly() {
    // Snack che non sporcano le mani o le carte
    const gameFriendlyIngredients = ['olive', 'mais', 'farina'];
    return gameFriendlyIngredients.includes(this.mainIngredient);
  }

  // Restituisce suggerimenti di abbinamento con tipologie di giochi
  getGameTypeRecommendations() {
    if (this.isSweet) {
      return {
        'Giochi family': 'Dolcezza per tutta la famiglia',
        'Giochi di ruolo': 'Energia per lunghe sessioni',
        'Party game': 'Divertimento garantito'
      };
    } else {
      return {
        'Giochi di strategia': 'Concentrazione e gusto',
        'Giochi cooperativi': 'Condivisione perfetta',
        'Giochi di carte': 'Pratico e veloce'
      };
    }
  }

  // Restituisce il livello di "messiness" per la sicurezza dei giochi
  getMessinessLevel() {
    const messinessLevels = {
      'olive': 1,        // Molto pulito
      'formaggio': 1,    // Pulito se a cubetti
      'mais': 2,         // Popcorn può fare briciole
      'farina': 2,       // Biscotti = briciole leggere
      'patate': 3,       // Chips possono ungere
      'pane': 3,         // Bruschette possono cadere
      'cioccolato': 4,   // Può sciogliersi
      'zucchero': 4,     // Marshmallow appiccicosi
      'mascarpone': 5    // Tiramisù richiede cucchiaino
    };
    return messinessLevels[this.mainIngredient] || 3;
  }

  // Restituisce consigli per il servizio
  getServingTips() {
    if (this.getMessinessLevel() <= 2) {
      return 'Servire direttamente sul tavolo da gioco';
    } else if (this.getMessinessLevel() <= 3) {
      return 'Fornire tovaglioli e ciotole individuali';
    } else {
      return 'Consigliare pausa dal gioco per gustare';
    }
  }
}

module.exports = Snack;
