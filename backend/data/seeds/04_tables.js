// backend/data/seeds/04_tables.js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  await knex('tables').del()
  await knex('tables').insert([
    {id: 1, table_number: '1A', status: 'free'},
    {id: 2, table_number: '1B', status: 'free'},
    {id: 3, table_number: '2', status: 'occupied'},
    {id: 4, table_number: 'VIP', status: 'reserved'},
    {id: 5, table_number: 'Bar 1', status: 'free'},
  ]);
};