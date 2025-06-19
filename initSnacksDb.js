const openDb = require('./db');

async function initSnacksDatabase() {
  try {
    const db = await openDb();

    // Crea tabella snacks
    await db.exec(`
      CREATE TABLE IF NOT EXISTS snacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        is_sweet BOOLEAN NOT NULL DEFAULT 0,
        main_ingredient TEXT,
        price REAL NOT NULL,
        suggested_game TEXT,
        suggested_drink TEXT,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Dati iniziali dei 10 snack (5 salati + 5 dolci)
    const snacks = [
      // SNACK SALATI (5)
      {
        name: "Dadi di Formaggio Critico",
        description: "Cubetti di formaggio stagionato serviti con bastoncini di pretzel - perfetti per spiluccare durante i turni",
        is_sweet: false,
        main_ingredient: "formaggio",
        price: 6.50,
        suggested_game: "Giochi di strategia",
        suggested_drink: "Lager delle Regole della Casa",
        image_url: "/assets/snacks/dadi-formaggio.jpg"
      },
      {
        name: "Popcorn della Fortuna",
        description: "Popcorn gourmet al parmigiano e rosmarino - croccante e saporito, facile da condividere",
        is_sweet: false,
        main_ingredient: "mais",
        price: 4.50,
        suggested_game: "Party game",
        suggested_drink: "Pozione di Mana Moscow Mule",
        image_url: "/assets/snacks/popcorn-fortuna.jpg"
      },
      {
        name: "Mini Bruschette del Conquistatore",
        description: "Piccole bruschette con pomodorini, basilico e mozzarella - un boccone di pura Italia",
        is_sweet: false,
        main_ingredient: "pane",
        price: 7.00,
        suggested_game: "Giochi cooperativi",
        suggested_drink: "Spritz dell'Aperitivo",
        image_url: "/assets/snacks/bruschette-conquistatore.jpg"
      },
      {
        name: "Chips della Vittoria",
        description: "Patatine artigianali al tartufo servite in ciotole individuali - eleganti e gustose",
        is_sweet: false,
        main_ingredient: "patate",
        price: 5.50,
        suggested_game: "Giochi di carte",
        suggested_drink: "Negroni Colpo Critico",
        image_url: "/assets/snacks/chips-vittoria.jpg"
      },
      {
        name: "Olive del Strategist",
        description: "Mix di olive ascolane e verdi condite con erbe aromatiche - per i pensatori raffinati",
        is_sweet: false,
        main_ingredient: "olive",
        price: 5.00,
        suggested_game: "Giochi lunghi",
        suggested_drink: "Old Fashioned Boss Finale",
        image_url: "/assets/snacks/olive-strategist.jpg"
      },

      // SNACK DOLCI (5)
      {
        name: "Biscotti del Meeple",
        description: "Biscotti a forma di meeple con glassa colorata - dolci e divertenti da mordere",
        is_sweet: true,
        main_ingredient: "farina",
        price: 4.00,
        suggested_game: "Giochi family",
        suggested_drink: "Cold Brew del Respawn",
        image_url: "/assets/snacks/biscotti-meeple.jpg"
      },
      {
        name: "Brownies del Boss Finale",
        description: "Brownies al cioccolato fondente con noci - ricchi e decadenti per celebrare la vittoria",
        is_sweet: true,
        main_ingredient: "cioccolato",
        price: 5.50,
        suggested_game: "Giochi completati",
        suggested_drink: "White Russian del Maestro di Gilda",
        image_url: "/assets/snacks/brownies-boss.jpg"
      },
      {
        name: "Cioccolatini del Dungeon Master",
        description: "Cioccolatini assortiti a forma di dadi e simboli gaming - piccoli tesori dolci",
        is_sweet: true,
        main_ingredient: "cioccolato",
        price: 6.00,
        suggested_game: "RPG e giochi narrativi",
        suggested_drink: "Dirty Chai del Power-Up",
        image_url: "/assets/snacks/cioccolatini-dm.jpg"
      },
      {
        name: "Marshmallow della Quest",
        description: "Marshmallow gourmet da tostare al tavolo con mini fornelletto - esperienza interattiva",
        is_sweet: true,
        main_ingredient: "zucchero",
        price: 7.50,
        suggested_game: "Giochi di gruppo",
        suggested_drink: "Tè all'Ibisco del Dissetatore",
        image_url: "/assets/snacks/marshmallow-quest.jpg"
      },
      {
        name: "Tiramisù del Campione",
        description: "Mini tiramisù in bicchierini monoporzione - il dolce perfetto per chiudere la serata",
        is_sweet: true,
        main_ingredient: "mascarpone",
        price: 6.50,
        suggested_game: "Fine serata",
        suggested_drink: "Limonata della Condizione di Vittoria",
        image_url: "/assets/snacks/tiramisu-campione.jpg"
      }
    ];

    // Inserisci i dati (solo se la tabella è vuota)
    const count = await db.get('SELECT COUNT(*) as count FROM snacks');
    if (count.count === 0) {
      for (const snack of snacks) {
        await db.run(
          `INSERT INTO snacks (name, description, is_sweet, main_ingredient, price, suggested_game, suggested_drink, image_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [snack.name, snack.description, snack.is_sweet,
           snack.main_ingredient, snack.price, snack.suggested_game,
           snack.suggested_drink, snack.image_url]
        );
      }
      console.log(`✅ Inseriti ${snacks.length} snack nel database`);
    } else {
      console.log('⚠️ Database snacks già popolato, skip inserimento');
    }

    // Verifica inserimento
    const totalSnacks = await db.get('SELECT COUNT(*) as count FROM snacks');
    console.log(`📊 Totale snack nel database: ${totalSnacks.count}`);

    await db.close();
    console.log('🍿 Database snacks inizializzato con successo!');

  } catch (error) {
    console.error('❌ Errore nell\'inizializzazione database snacks:', error);
  }
}

if (require.main === module) {
  initSnacksDatabase();
}

module.exports = initSnacksDatabase;
