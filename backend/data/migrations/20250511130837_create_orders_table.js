// backend/data/migrations/YYYYMMDDHHMMSS_create_orders_table.js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('orders', table => {
      table.increments('id').primary();
      table.string('table_number', 50).nullable(); // Может быть null для самовывоза
      table.string('pickup_time').nullable(); // Храним как строку HH:MM, или можно DATETIME
      table.enu('order_type', ['table', 'takeaway']).notNullable(); // ENUM для типа заказа
      table.decimal('total_amount', 10, 2).notNullable();
      table.enu('status', ['new', 'preparing', 'ready', 'completed', 'cancelled'], { 
          useNative: true, // Используем нативный ENUM, если поддерживается БД
          enumName: 'order_status_type' // Имя для типа ENUM в PostgreSQL
      }).notNullable().defaultTo('new');
      table.timestamps(true, true);
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.dropTableIfExists('orders')
      .then(() => {
          // Для PostgreSQL нужно еще удалить тип ENUM, если он был создан
          if (knex.client.config.client === 'pg') { 
              return knex.raw('DROP TYPE IF EXISTS order_status_type;');
          }
      });
  };