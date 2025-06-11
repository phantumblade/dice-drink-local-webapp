// COSA FA: Connessione al database SQLite
// RELAZIONI: Usato da tutti i DAO per aprire/chiudere DB

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function openDb() {
  return open({
    filename: './dice_drink.db',
    driver: sqlite3.Database
  });
}

module.exports = openDb;
