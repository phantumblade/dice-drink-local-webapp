const openDb = require('./db');

async function checkTable() {
  const db = await openDb();
  
  // Mostra la struttura della tabella tournaments
  const schema = await db.all("PRAGMA table_info(tournaments)");
  console.log('📋 Struttura tabella tournaments:');
  schema.forEach(col => {
    console.log(`  ${col.cid}: ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
  });
  
  // Mostra alcuni dati di esempio
  const sample = await db.all("SELECT id, title, start_date, start_time FROM tournaments LIMIT 3");
  console.log('\n📊 Dati di esempio:');
  console.table(sample);
  
  await db.close();
}

checkTable().catch(console.error);