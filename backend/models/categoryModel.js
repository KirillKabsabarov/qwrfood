// backend/models/categoryModel.js
const db = require('../data/dbConfig.js'); // Наш настроенный экземпляр Knex

// Функция для получения всех категорий
function findAll() {
  return db('categories'); // SELECT * FROM categories
}

// Функция для поиска категории по ID
function findById(id) {
  return db('categories').where({ id }).first(); // SELECT * FROM categories WHERE id = ? LIMIT 1
}

// Функция для добавления новой категории
async function add(category) {
  // db('categories').insert(category) возвращает массив с ID вставленной записи для SQLite
  const [id] = await db('categories').insert(category); 
  return findById(id); // Возвращаем созданную категорию целиком
}

// Функция для обновления категории
function update(id, changes) {
  return db('categories')
    .where({ id })
    .update(changes)
    .then(count => (count > 0 ? findById(id) : null)); // Возвращаем обновленную категорию или null, если не найдена
}

// Функция для удаления категории
function remove(id) {
  return db('categories').where({ id }).del(); // Возвращает количество удаленных строк
}

module.exports = {
  findAll,
  findById,
  add,
  update,
  remove,
};