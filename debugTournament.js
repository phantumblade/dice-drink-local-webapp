const openDb = require('./db');

async function debug() {
  const db = await openDb();
  
  // Query diretta dei primi tornei
  const raw = await db.all("SELECT id, title, start_date FROM tournaments ORDER BY id DESC LIMIT 3");
  console.log('📋 Dati raw dal database:');
  console.table(raw);
  
  // Query del DAO
  const TournamentsDao = require('./daos/tournamentsDao');
  const tournaments = await TournamentsDao.findAll({limit: 3});
  console.log('\n📊 Dati dal DAO:');
  tournaments.forEach(t => {
    console.log(`ID: ${t.id}, Title: ${t.title}, start_date: ${t.start_date}, startDate: ${t.startDate}`);
  });
  
  await db.close();
}

debug().catch(console.error);