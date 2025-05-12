require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const menuItemRoutes = require('./routes/menuItemRoutes');
const orderRoutes = require('./routes/orderRoutes');
const tableRoutes = require('./routes/tableRoutes');


const app = express();
const PORT = process.env.PORT || 3001; // Порт для сервера, из .env или по умолчанию 3001

// Middlewares
app.use(cors()); // Разрешаем CORS-запросы (чтобы frontend мог обращаться)
app.use(express.json()); // Позволяем Express разбирать JSON в теле запроса

// Подключаем роуты
app.use('/api/auth', authRoutes); 
app.use('/api/categories', categoryRoutes);
app.use('/api/menu', menuItemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);

// Простой тестовый маршрут
app.get('/', (req, res) => {
  res.send('Привет от QrFood Backend!');
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер QrFood Backend запущен на порту ${PORT}`);
});