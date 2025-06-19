# Dice & Drink – SPA per giochi da tavolo e drink a tema

Applicazione web che unisce un **catalogo di giochi da tavolo**, un **menu di drink e snack** e un modulo di prenotazione tavoli. Il sistema prevede registrazione e login, gestione profilo personale, wishlist e rating. Gli utenti possono prenotare un tavolo scegliendo durata e numero di giocatori, mentre staff e amministratori dispongono di un pannello gestionale con analytics e strumenti di moderazione.

---

## ✨ Funzionalità principali

- **Esplora il catalogo** di oltre 15 giochi, 15 drink e 10 snack con filtri per categoria, fascia di prezzo e ingredienti.
- **Ricerca e filtri avanzati** tramite query agli endpoint REST (`/api/games`, `/api/drinks`, `/api/snacks`).
- **Registrazione e autenticazione** con JWT e sessioni: ruoli `customer`, `staff` e `admin`.
- **Gestione profilo**: modifica dati personali, cambio password, preferenze (giochi preferiti, tipi di drink, restrizioni alimentari), cronologia prenotazioni e wishlist.
- **Prenotazioni tavolo** con scelta orario, durata e numero di partecipanti. Notifiche di conferma via email (se configurato).
- **Recensioni e rating** di giochi, drink e snack.
- **Pannello Staff/Admin** per gestire catalogo, utenti, prenotazioni e audit log, con dashboard analitica.
- **Endpoint di salute** [`/api/health`](http://localhost:3000/api/health) per verifica rapida dello stato del server e degli endpoint disponibili.

---

## 🚀 Avvio rapido

1. Clona o estrai la cartella del progetto.
2. Installa le dipendenze:
   ```bash
   npm install
   ```
3. Verifica la presenza del database `dice_drink.db` (già incluso con dati demo). Se vuoi ricrearlo da zero esegui nell'ordine:
   ```bash
   node initGamesDb.js
   node initDrinksDb.js
   node initSnacksDb.js
   node initUsersDb.js
   ```
4. Avvia il server:
   ```bash
   npm start
   ```
5. Apri il browser su [http://localhost:3000](http://localhost:3000).

---

## 🧪 Credenziali di test

| Ruolo       | Email                         | Password            |
|-------------|------------------------------|--------------------|
| **Admin**   | admin@diceanddrink.com       | DiceAndDrink2025!  |
| **Staff**   | staff@diceanddrink.com       | StaffDemo2025!     |
| **Customer**| customer@diceanddrink.com    | CustomerDemo2025!  |
| **Customer2**| customer2@diceanddrink.com  | Customer2_2025!    |

L'utente Guest non richiede autenticazione.

---

## 🗃️ Database

- Utilizza SQLite con file `dice_drink.db` già presente nella root del progetto.
- Contiene dati di esempio per giochi, drink, snack e utenti.
- Puoi rigenerare il database tramite gli script `init*.js` come mostrato sopra.

---

## 🌐 Principali endpoint API

| Categoria | Endpoint base | Descrizione |
|-----------|---------------|-------------|
| Giochi    | `/api/games`  | catalogo giochi, ricerca, categorie, giochi popolari |
| Drink     | `/api/drinks` | menu drink, filtri alcolici, base spirit, fasce prezzo |
| Snack     | `/api/snacks` | snack dolci/salati, per ingredienti o abbinate ai giochi |
| Auth      | `/api/auth`   | registrazione, login, refresh token, logout |
| Utenti    | `/api/users`  | profilo, prenotazioni, wishlist e rating |
| Admin     | `/api/admin`  | dashboard gestionale, utenti, prenotazioni, audit log |

Consulta [`/api/health`](http://localhost:3000/api/health) per l'elenco completo degli endpoint disponibili e lo stato del database.

---

## 📽️ Video dimostrativo

- [YouTube Demo](https://youtu.be/xztiRkXSNmI) *(sostituisci con il tuo link)*
- Durata suggerita: **3–5 minuti**
- Mostra layout, struttura del progetto e funzionalità principali.

---

## 🛠️ Tecnologie e librerie

- **Backend**: Node.js, Express, SQLite
- **Frontend**: HTML, CSS, JavaScript (Page.js, Bootstrap)
- **Varie**: JWT, bcrypt, express-session, nodemailer, helmet, cors

---

## 📎 Note aggiuntive

- Alcune funzioni come l'invio email richiedono variabili ambiente (.env).
- In sviluppo puoi utilizzare `npm run dev` per avviare il server con nodemon.
- Endpoint utile di diagnostica: [http://localhost:3000/api/health](http://localhost:3000/api/health).
