// backend/data/migrations/YYYYMMDDHHMMSS_create_menu_items_table.js
// (замени YYYYMMDDHHMMSS на реальную временную метку)

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('menu_items', table => {
      table.increments('id').primary(); // PK, Auto-incrementing ID
      table.string('name', 255).notNullable();
      table.text('description'); // Для более длинных описаний
      table.decimal('price', 10, 2).notNullable(); // 10 цифр всего, 2 после запятой
      table.string('image_url', 255);
      
      table.integer('category_id')
           .unsigned() // т.к. id в categories тоже unsigned (по умолчанию для increments)
           .notNullable()
           .references('id') // Внешний ключ
           .inTable('categories') // Ссылается на таблицу 'categories'
           .onDelete('CASCADE') // Если категория удаляется, удалить связанные menu_items
           .onUpdate('CASCADE'); // Если id категории обновляется, обновить и здесь
  
      table.timestamps(true, true); // created_at, updated_at
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.dropTableIfExists('menu_items');
  };