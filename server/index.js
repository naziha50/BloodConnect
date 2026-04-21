const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve your existing HTML/CSS/JS files
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/donors', require('./routes/donors'));

// Fallback: serve index.html for any unknown route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(3000, () => console.log('BloodConnect running on http://localhost:3000'));