// backend/data/seeds/03_users.js
const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries from users table
  await knex('users').del();

  const username = 'admin';
  const password = 'qwerty'; // Выбери надежный пароль!
  const saltRounds = 10;
  const password_hash = await bcrypt.hash(password, saltRounds);

  await knex('users').insert([
    {
      id: 1, // Явный ID для простоты
      username: username,
      password_hash: password_hash,
      role: 'admin'
    }
  ]);
  console.log(`Создан пользователь-администратор: ${username} с паролем: ${password}`);
  console.log('ВАЖНО: Измените этот пароль в реальном приложении и не храните его в коде!');
};