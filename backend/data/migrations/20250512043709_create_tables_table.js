// backend/data/migrations/YYYYMMDDHHMMSS_create_tables_table.js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('tables', table => {
      table.increments('id').primary();
      table.string('table_number', 50).notNullable().unique(); // Номер/название столика
      table.enu('status', ['free', 'occupied', 'reserved'], {
          useNative: true,
          enumName: 'table_status_type'
      }).notNullable().defaultTo('free');
      table.timestamps(true, true);
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.dropTableIfExists('tables')
      .then(() => {
          if (knex.client.config.client === 'pg') {
              return knex.raw('DROP TYPE IF EXISTS table_status_type;');
          }
      });
  };