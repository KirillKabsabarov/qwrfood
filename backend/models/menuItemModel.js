// backend/models/menuItemModel.js
const db = require('../data/dbConfig.js');

// Получить все позиции меню (можно добавить фильтрацию по категории позже)
function findAll(categoryId) {
  let query = db('menu_items')
                .join('categories', 'menu_items.category_id', '=', 'categories.id')
                .select(
                    'menu_items.id', 
                    'menu_items.name', 
                    'menu_items.description', 
                    'menu_items.price', 
                    'menu_items.image_url', 
                    'menu_items.category_id', 
                    'categories.name as category_name' // Добавляем имя категории
                );
  
  if (categoryId) {
    query = query.where('menu_items.category_id', categoryId);
  }
  return query.orderBy('menu_items.id');
}

// Найти позицию меню по ID
function findById(id) {
  return db('menu_items')
         .join('categories', 'menu_items.category_id', '=', 'categories.id')
         .select(
            'menu_items.id', 
            'menu_items.name', 
            'menu_items.description', 
            'menu_items.price', 
            'menu_items.image_url', 
            'menu_items.category_id', 
            'categories.name as category_name'
         )
         .where('menu_items.id', id)
         .first();
}

// Добавить новую позицию меню
async function add(item) {
  // Проверка существования категории перед добавлением
  const categoryExists = await db('categories').where({ id: item.category_id }).first();
  if (!categoryExists) {
    throw new Error(`Категория с ID ${item.category_id} не существует.`);
  }

  const [id] = await db('menu_items').insert(item);
  return findById(id);
}

// Обновить позицию меню
async function update(id, changes) {
  // Если в changes есть category_id, проверить его существование
  if (changes.category_id) {
    const categoryExists = await db('categories').where({ id: changes.category_id }).first();
    if (!categoryExists) {
      throw new Error(`Категория с ID ${changes.category_id} не существует для обновления.`);
    }
  }

  return db('menu_items')
    .where({ id })
    .update(changes)
    .then(count => (count > 0 ? findById(id) : null));
}

// Удалить позицию меню
function remove(id) {
  return db('menu_items').where({ id }).del();
}

module.exports = {
  findAll,
  findById,
  add,
  update,
  remove,
};