// backend/data/migrations/YYYYMMDDHHMMSS_create_order_items_table.js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('order_items', table => {
      table.increments('id').primary();
      
      table.integer('order_id')
           .unsigned()
           .notNullable()
           .references('id')
           .inTable('orders')
           .onDelete('CASCADE') // Если заказ удаляется, удалить и его позиции
           .onUpdate('CASCADE');
  
      table.integer('menu_item_id')
           .unsigned()
           .notNullable()
           .references('id')
           .inTable('menu_items')
           .onDelete('RESTRICT') // Не удалять позицию меню, если она есть в заказах (или SET NULL, если разрешаем)
           .onUpdate('CASCADE');
      
      table.integer('quantity').unsigned().notNullable();
      table.decimal('price_at_order', 10, 2).notNullable(); // Цена на момент заказа
      // created_at и updated_at не всегда нужны для связующих таблиц, но можно добавить
      // table.timestamps(true, true); 
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.dropTableIfExists('order_items');
  };