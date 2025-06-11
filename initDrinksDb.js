// SCOPO: Crea tabella drinks e inserisce dati iniziali
// ESEGUIRE UNA SOLA VOLTA: node initDrinksDb.js

const openDb = require('./db');

async function initDrinksDatabase() {
  try {
    const db = await openDb();

    // Crea tabella drinks
    await db.exec(`
      CREATE TABLE IF NOT EXISTS drinks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        is_alcoholic BOOLEAN NOT NULL DEFAULT 0,
        base_spirit TEXT,
        price REAL NOT NULL,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Dati iniziali dei 15 drink dal catalogo
    const drinks = [
      // DRINK ALCOLICI (9)
      {
        name: "Negroni Colpo Critico",
        description: "Gin, Campari e vermouth dolce in parti uguali - un cocktail sofisticato e amaro che non delude mai",
        is_alcoholic: true,
        base_spirit: "gin",
        price: 9.50,
        image_url: "/assets/drinks/negroni-colpo-critico.jpg"
      },
      {
        name: "Pozione di Mana Moscow Mule",
        description: "Vodka, ginger beer e lime serviti in una tazza di rame con una magica decorazione blu",
        is_alcoholic: true,
        base_spirit: "vodka",
        price: 8.00,
        image_url: "/assets/drinks/pozione-mana-mule.jpg"
      },
      {
        name: "Soffio del Drago Dark & Stormy",
        description: "Rum scuro e ginger beer piccante con lime - una combinazione infuocata che scalda l'anima",
        is_alcoholic: true,
        base_spirit: "rum",
        price: 7.50,
        image_url: "/assets/drinks/soffio-drago-stormy.jpg"
      },
      {
        name: "Old Fashioned Boss Finale",
        description: "Bourbon, zucchero e bitter su un grande cubetto di ghiaccio - il drink definitivo di fine partita",
        is_alcoholic: true,
        base_spirit: "bourbon",
        price: 10.00,
        image_url: "/assets/drinks/old-fashioned-boss.jpg"
      },
      {
        name: "Paloma del Paladino",
        description: "Tequila, succo di pompelmo fresco, lime e acqua frizzante - giusto e rinfrescante",
        is_alcoholic: true,
        base_spirit: "tequila",
        price: 8.50,
        image_url: "/assets/drinks/paloma-paladino.jpg"
      },
      {
        name: "Tiro di Dadi Segale & Arancia",
        description: "Whiskey di segale, succo d'arancia fresco e sciroppo semplice con un twist di arancia fortunato",
        is_alcoholic: true,
        base_spirit: "whiskey di segale",
        price: 9.00,
        image_url: "/assets/drinks/tiro-dadi-segale.jpg"
      },
      {
        name: "White Russian del Maestro di Gilda",
        description: "Vodka, liquore al caffè e panna - leadership fluida in un bicchiere",
        is_alcoholic: true,
        base_spirit: "vodka",
        price: 8.50,
        image_url: "/assets/drinks/white-russian-maestro.jpg"
      },
      {
        name: "Spritz dell'Aperitivo",
        description: "Aperol, prosecco e acqua gassata - frizzante e brillante per socializzare prima del gioco",
        is_alcoholic: true,
        base_spirit: "aperol",
        price: 7.00,
        image_url: "/assets/drinks/spritz-aperitivo.jpg"
      },
      {
        name: "Lager delle Regole della Casa",
        description: "Birra artigianale locale alla spina - la scelta affidabile che non delude mai",
        is_alcoholic: true,
        base_spirit: "birra",
        price: 5.50,
        image_url: "/assets/drinks/lager-casa.jpg"
      },

      // DRINK ANALCOLICI (6)
      {
        name: "Pozione di Guarigione",
        description: "Succo di mirtillo, ginger ale e lime con un bagliore rosso mistico",
        is_alcoholic: false,
        base_spirit: "succo di mirtillo",
        price: 4.50,
        image_url: "/assets/drinks/pozione-guarigione.jpg"
      },
      {
        name: "Cold Brew del Respawn",
        description: "Cold brew fatto in casa con sciroppo opzionale di vaniglia o caramello",
        is_alcoholic: false,
        base_spirit: "caffè",
        price: 4.00,
        image_url: "/assets/drinks/cold-brew-respawn.jpg"
      },
      {
        name: "Dirty Chai del Power-Up",
        description: "Tè chai speziato con un shot di espresso - doppia energia per la tua prossima mossa",
        is_alcoholic: false,
        base_spirit: "tè chai",
        price: 4.50,
        image_url: "/assets/drinks/dirty-chai-powerup.jpg"
      },
      {
        name: "Limonata della Condizione di Vittoria",
        description: "Limonata alla fragola appena spremuta con menta - dolce successo in ogni sorso",
        is_alcoholic: false,
        base_spirit: "limonata",
        price: 3.50,
        image_url: "/assets/drinks/limonata-vittoria.jpg"
      },
      {
        name: "Soda Italiana del Bottino Leggendario",
        description: "Sciroppo aromatizzato con acqua frizzante e panna opzionale (scegli il gusto: vaniglia, ciliegia o arancia)",
        is_alcoholic: false,
        base_spirit: "soda",
        price: 3.00,
        image_url: "/assets/drinks/soda-bottino.jpg"
      },
      {
        name: "Tè all'Ibisco del Dissetatore di Quest",
        description: "Tè all'ibisco freddo con miele e limone - naturalmente rosso rubino e rinfrescante",
        is_alcoholic: false,
        base_spirit: "tè alle erbe",
        price: 3.50,
        image_url: "/assets/drinks/te-ibisco-quest.jpg"
      }
    ];

    // Inserisci i dati (solo se la tabella è vuota)
    const count = await db.get('SELECT COUNT(*) as count FROM drinks');
    if (count.count === 0) {
      for (const drink of drinks) {
        await db.run(
          `INSERT INTO drinks (name, description, is_alcoholic, base_spirit, price, image_url)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [drink.name, drink.description, drink.is_alcoholic,
           drink.base_spirit, drink.price, drink.image_url]
        );
      }
      console.log(`✅ Inseriti ${drinks.length} drink nel database`);
    } else {
      console.log('⚠️ Database drinks già popolato, skip inserimento');
    }

    // Verifica inserimento
    const totalDrinks = await db.get('SELECT COUNT(*) as count FROM drinks');
    console.log(`📊 Totale drink nel database: ${totalDrinks.count}`);

    await db.close();
    console.log('🍹 Database drinks inizializzato con successo!');

  } catch (error) {
    console.error('❌ Errore nell\'inizializzazione database drinks:', error);
  }
}

// Esegui se chiamato direttamente
if (require.main === module) {
  initDrinksDatabase();
}

module.exports = initDrinksDatabase;
