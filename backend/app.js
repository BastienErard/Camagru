const express = require('express');
const app = express();
const port = process.env.BACKEND_CONTAINER_PORT || 4000;

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
