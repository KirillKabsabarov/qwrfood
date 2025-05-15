// backend/knexfile.js
require('dotenv').config({ path: './.env' }); // Убедимся, что .env загружен для knexfile

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DB_FILENAME || './qrfood.db3' // Имя файла нашей БД
    },
    useNullAsDefault: true, // Необходимо для SQLite
    migrations: {
      directory: './data/migrations' // Папка, где будут храниться файлы миграций
    },
    seeds: {
      directory: './data/seeds' // Папка для файлов с начальными данными (сидов)
    }
  },

  production: { // <--- ДОБАВИМ ЭТУ СЕКЦИЮ
    client: 'sqlite3',
    connection: {
      filename: process.env.DB_FILENAME || './data/qrfood_prod.db3' 
    },
    useNullAsDefault: true,
    migrations: {
      directory: './data/migrations'
    },
    seeds: {
      directory: './data/seeds'
    },
  }
};
