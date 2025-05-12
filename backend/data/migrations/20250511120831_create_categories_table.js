// backend/data/migrations/YYYYMMDDHHMMSS_create_categories_table.js
// (замени YYYYMMDDHHMMSS на реальную временную метку из имени твоего файла)

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('categories', table => {
      table.increments('id').primary(); // PK, Auto-incrementing ID
      table.string('name', 128).notNullable().unique();
      table.timestamps(true, true); // Adds created_at and updated_at columns
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.dropTableIfExists('categories');
  };