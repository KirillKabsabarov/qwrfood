// backend/data/migrations/YYYYMMDDHHMMSS_create_users_table.js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('users', table => {
      table.increments('id').primary();
      table.string('username', 128).notNullable().unique();
      table.string('password_hash', 255).notNullable(); // Будем хранить хэш пароля
      table.string('role', 50).notNullable().defaultTo('admin'); // По умолчанию 'admin'
      table.timestamps(true, true);
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.dropTableIfExists('users');
  };