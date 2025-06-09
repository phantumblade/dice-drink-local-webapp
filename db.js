// db.js
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function openDb() {
  return open({
    filename: './dice_drink.db',
    driver: sqlite3.Database
  });
}

module.exports = openDb;
