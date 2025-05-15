require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const menuItemRoutes = require('./routes/menuItemRoutes');
const orderRoutes = require('./routes/orderRoutes');
const tableRoutes = require('./routes/tableRoutes');

const whitelist = [
    'https://qrfood-client.netlify.app', // ЗАМЕНИ НА РЕАЛЬНЫЙ URL ТВОЕГО ФРОНТЕНДА С NETLIFY
    'http://localhost:5500', // Если используешь Live Server локально (порт может отличаться)
    'http://127.0.0.1:5500'  // Альтернативный адрес Live Server
];

const corsOptions = {
  origin: function (origin, callback) {
    // Для локальной разработки через открытие файла напрямую origin может быть null
    if (whitelist.indexOf(origin) !== -1 || !origin) { 
      callback(null, true);
    } else {
      console.warn(`CORS: Запрос от ${origin} заблокирован.`); // Логируем заблокированные запросы
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Укажи разрешенные методы
  allowedHeaders: ['Content-Type', 'Authorization'] // Укажи разрешенные заголовки
};

const app = express();
const PORT = process.env.PORT || 3001; // Порт для сервера, из .env или по умолчанию 3001

// Middlewares
app.use(cors(corsOptions));
//app.options('*', cors(corsOptions)); // Разрешаем CORS-запросы (чтобы frontend мог обращаться)
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
