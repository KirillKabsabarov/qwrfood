// backend/data/seeds/01_categories.js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('categories').del() // Очищаем таблицу перед заполнением
  await knex('categories').insert([
    {id: 1, name: 'Еда'}, // Явно указываем ID для предсказуемости
    {id: 2, name: 'Напитки'},
    {id: 3, name: 'Десерты'}
  ]);
};