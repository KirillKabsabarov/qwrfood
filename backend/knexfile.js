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

  // Можно добавить конфигурации для других окружений (testing, production) позже
  // production: {
  //   client: 'pg', // Например, PostgreSQL для продакшена
  //   connection: process.env.DATABASE_URL, // URL подключения к БД из переменных окружения
  //   migrations: {
  //     directory: './data/migrations'
  //   },
  //   seeds: {
  //     directory: './data/seeds'
  //   }
  // }
};