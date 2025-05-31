const express = require('express');
const app = express();
const port = 3000;

// Serve file statici dalla cartella public
app.use(express.static('public'));

app.listen(port, () => {
  console.log(`Server avviato su http://localhost:${port}`);
});
