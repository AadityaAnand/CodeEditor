require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { User, Project, File } = require('./models');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => console.log('❌ MongoDB connection error:', err));

const fileRoutes = require('./routes/fileRoutes');
console.log('✅ File routes loaded');

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is running!' });
});

app.get('/api/debug/files', async (req, res) => {
  try {
    const files = await File.find({}).limit(10);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api', fileRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});