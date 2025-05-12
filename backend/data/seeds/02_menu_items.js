// backend/data/seeds/02_menu_items.js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('menu_items').del();
  await knex('menu_items').insert([
    {
      id: 1, // Явный ID
      name: 'Цезарь с курицей', 
      description: 'Салат с куриной грудкой, сухариками и соусом Цезарь', 
      price: 350.00, 
      category_id: 1, // Ссылка на ID категории "Еда"
      image_url: 'https://via.placeholder.com/150/FFC107/000000?Text=Caesar' 
    },
    {
      id: 2,
      name: 'Борщ', 
      description: 'Традиционный украинский борщ со сметаной', 
      price: 280.00, 
      category_id: 1, // "Еда"
      image_url: 'https://via.placeholder.com/150/F44336/FFFFFF?Text=Borsch'
    },
    {
      id: 3,
      name: 'Кофе Американо', 
      description: 'Черный кофе', 
      price: 120.00, 
      category_id: 2, // "Напитки"
      image_url: 'https://via.placeholder.com/150/607D8B/FFFFFF?Text=Americano'
    },
    {
      id: 4,
      name: 'Чизкейк Нью-Йорк', 
      description: 'Классический чизкейк', 
      price: 250.00, 
      category_id: 3, // "Десерты"
      image_url: 'https://via.placeholder.com/150/E91E63/FFFFFF?Text=Cheesecake'
    }
  ]);
};