// backend/models/userModel.js
const db = require('../data/dbConfig.js');
const bcrypt = require('bcryptjs');

// Найти пользователя по ID
async function findById(id) {
  const user = await db('users').where({ id }).first();
  if (user) {
    delete user.password_hash; // Не возвращаем хэш пароля
  }
  return user;
}

// Найти пользователя по имени пользователя (для логина)
function findByUsername(username) {
  return db('users').where({ username }).first();
}

// Добавить нового пользователя (регистрация)
async function add(userData) {
  // Хэшируем пароль перед сохранением
  const saltRounds = 10; // Рекомендуемое количество раундов для bcrypt
  userData.password_hash = await bcrypt.hash(userData.password, saltRounds);
  delete userData.password; // Удаляем оригинальный пароль

  const [idObj] = await db('users').insert(userData).returning('id');
  
  let userId;
  if (Array.isArray(idObj) && idObj.length > 0 && typeof idObj[0] === 'object') {
    userId = idObj[0].id;
  } else if (Array.isArray(idObj) && idObj.length > 0) {
    userId = idObj[0];
  } else if (typeof idObj === 'number') {
    userId = idObj;
  } else if (typeof idObj === 'object' && idObj.id) {
    userId = idObj.id;
  } else {
    throw new Error('Не удалось получить ID созданного пользователя.');
  }

  if (!userId) {
    throw new Error('Ошибка при создании пользователя: ID пользователя не получен.');
  }

  return findById(userId); // Возвращаем пользователя без хэша пароля
}

// Проверка пароля (для логина)
async function verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}

module.exports = {
  findById,
  findByUsername,
  add,
  verifyPassword,
};