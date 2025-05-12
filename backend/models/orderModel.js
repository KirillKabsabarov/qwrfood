// backend/models/orderModel.js
const db = require('../data/dbConfig.js');
const MenuItem = require('./menuItemModel.js');// Нужен для получения актуальных цен
const Table = require('./tableModel.js'); 

// Создать новый заказ
async function createOrder(orderData, itemsData) {
    let totalAmount = 0;
    const itemsToInsert = [];
    
    // Валидация и расчет totalAmount на бэкенде
    for (const item of itemsData) {
        const menuItem = await MenuItem.findById(item.menu_item_id);
        if (!menuItem) {
            throw new Error(`Позиция меню с ID ${item.menu_item_id} не найдена.`);
        }
        if (!item.quantity || item.quantity <= 0) {
            throw new Error(`Количество для позиции ${menuItem.name} должно быть положительным.`);
        }
        const price = parseFloat(menuItem.price);
        totalAmount += price * item.quantity;
        itemsToInsert.push({
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
            price_at_order: price 
        });
    }

    // Округляем до двух знаков после запятой
    totalAmount = parseFloat(totalAmount.toFixed(2));

    if (orderData.order_type === 'table') {
        if (!orderData.table_number) { // Эта проверка уже есть в роуте, но дублирование не помешает
            throw new Error('Номер столика обязателен для заказа за столиком.');
        }
        // Ищем столик по его номеру (table_number), а не по ID, т.к. с клиента приходит номер
        const tableExists = await db('tables').where({ table_number: orderData.table_number }).first();
        if (!tableExists) {
            throw new Error(`Столик с номером '${orderData.table_number}' не найден в системе.`);
        }
    }

    const orderPayload = {
        ...orderData, // table_number, pickup_time, order_type
        total_amount: totalAmount,
        status: 'new' // Статус по умолчанию
    };
    
    // Используем транзакцию, чтобы обеспечить целостность данных
    // Если что-то пойдет не так при вставке order_items, заказ тоже не будет создан
    return db.transaction(async trx => {
        const [orderIdObj] = await trx('orders').insert(orderPayload).returning('id');
        // .returning('id') для SQLite в knex может возвращать объект { id: new_id } или просто new_id 
        // в зависимости от версии knex и конфигурации. Проверим, что у нас.
        // Обычно для SQLite он возвращает массив с ID, как мы видели ранее.
        // Для PostgreSQL .returning('id') возвращает массив объектов [{id: X}]
        
        let orderId;
         // Knex для SQLite c .returning('id') часто возвращает просто id вставленной строки, а не массив id.
         // Для PostgreSQL он вернет массив объектов [{id: some_id}].
         // Сделаем универсальнее:
        if (Array.isArray(orderIdObj) && orderIdObj.length > 0 && typeof orderIdObj[0] === 'object') {
            orderId = orderIdObj[0].id; // Для PostgreSQL
        } else if (Array.isArray(orderIdObj) && orderIdObj.length > 0) {
             orderId = orderIdObj[0]; // Для SQLite, если возвращает массив ID
        } else if (typeof orderIdObj === 'number') {
            orderId = orderIdObj; // Для SQLite, если возвращает просто ID
        } else if (typeof orderIdObj === 'object' && orderIdObj.id) {
            orderId = orderIdObj.id; // Если возвращает объект с полем id
        } else {
            // Если не удалось получить ID, это проблема
            console.error("Не удалось получить ID заказа:", orderIdObj);
            throw new Error('Не удалось получить ID созданного заказа.');
        }


        if (!orderId) {
             throw new Error('Ошибка при создании заказа: ID заказа не получен.');
        }


        const orderItemsPayload = itemsToInsert.map(it => ({
            ...it,
            order_id: orderId
        }));

        await trx('order_items').insert(orderItemsPayload);

        // Возвращаем ID созданного заказа для примера
        // В роуте мы, вероятно, захотим вернуть весь объект заказа
        return orderId; 
    });
}

// Найти заказ по ID с его позициями
async function findOrderById(id) {
    const order = await db('orders').where({ id }).first();
    if (!order) {
        return null;
    }
    const items = await db('order_items')
        .join('menu_items', 'order_items.menu_item_id', '=', 'menu_items.id')
        .select(
            'order_items.quantity',
            'order_items.price_at_order',
            'menu_items.name as menu_item_name',
            'menu_items.id as menu_item_id'
        )
        .where({ order_id: id });
    
    return { ...order, items };
}

// (Добавить другие функции по мере необходимости: findAllOrders, updateOrderStatus и т.д.)
// Например, для админки
async function findAllOrders(filters = {}) {
    let query = db('orders').select('*');

    if (filters.status) {
        query = query.where('status', filters.status);
    }
    if (filters.date) {
        // Фильтрация по дате потребует работы с форматом даты в БД
        // Пример: query = query.whereRaw('date(created_at) = ?', [filters.date]);
        // Для SQLite: strftime('%Y-%m-%d', created_at)
         query = query.whereRaw("strftime('%Y-%m-%d', created_at) = ?", [filters.date]);
    }

    return query.orderBy('created_at', 'desc');
}

async function updateOrderStatus(id, status) {
    const validStatuses = ['new', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        throw new Error('Недопустимый статус заказа.');
    }
    const count = await db('orders').where({ id }).update({ status, updated_at: db.fn.now() });
    if (count > 0) {
        return findOrderById(id);
    }
    return null;
}


module.exports = {
  createOrder,
  findOrderById,
  findAllOrders,     // для будущей админки
  updateOrderStatus, // для будущей админки
};