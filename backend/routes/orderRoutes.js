// backend/routes/orderRoutes.js
const express = require('express');
const Order = require('../models/orderModel.js');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware.js');

const router = express.Router();

// POST /api/orders - Создать новый заказ
router.post('/', async (req, res) => {
    const { order_type, table_number, pickup_time, items } = req.body;

    // Базовая валидация
    if (!order_type || !['table', 'takeaway'].includes(order_type)) {
        return res.status(400).json({ message: 'Некорректный или отсутствующий тип заказа (order_type).' });
    }
    if (order_type === 'table' && !table_number) {
        return res.status(400).json({ message: 'Номер столика (table_number) обязателен для заказа за столиком.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Заказ должен содержать хотя бы одну позицию (items).' });
    }
    for (const item of items) {
        if (item.menu_item_id == null || item.quantity == null || typeof item.quantity !== 'number' || item.quantity <= 0) {
            return res.status(400).json({ message: 'Каждая позиция в заказе (item) должна содержать корректные menu_item_id и quantity > 0.' });
        }
    }

    const orderData = { order_type, table_number, pickup_time };

    try {
        const newOrderId = await Order.createOrder(orderData, items);
        const newOrder = await Order.findOrderById(newOrderId); // Получаем полный заказ для ответа
        res.status(201).json(newOrder);
    } catch (error) {
        console.error("Ошибка при создании заказа:", error);
        // Если ошибка из-за ненайденного menu_item_id или некорректного quantity (из модели)
        if (error.message.includes('не найдена') || error.message.includes('должно быть положительным')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Ошибка на сервере при создании заказа.', error: error.message });
    }
});

// GET /api/orders - Получить все заказы (ЗАЩИЩЕНО)
router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const { status, date } = req.query; // Пример фильтров
        const orders = await Order.findAllOrders({ status, date });
        res.status(200).json(orders);
    } catch (error) {
        console.error("Ошибка при получении заказов:", error);
        res.status(500).json({ message: 'Ошибка на сервере при получении заказов.', error: error.message });
    }
});

// GET /api/orders/:id - Получить заказ по ID (ЗАЩИЩЕНО)
router.get('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { id } = req.params;
    try {
        const order = await Order.findOrderById(id);
        if (order) {
            res.status(200).json(order);
        } else {
            res.status(404).json({ message: `Заказ с ID ${id} не найден.` });
        }
    } catch (error) {
        console.error(`Ошибка при получении заказа ${id}:`, error);
        res.status(500).json({ message: 'Ошибка на сервере при получении заказа.', error: error.message });
    }
});

// PUT /api/orders/:id/status - Обновить статус заказа (ЗАЩИЩЕНО)
router.put('/:id/status', authenticateToken, authorizeRole(['admin']), async (req, res) => { 
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ message: 'Новый статус (status) не предоставлен.'});
    }

    try {
        const updatedOrder = await Order.updateOrderStatus(id, status);
        if (updatedOrder) {
            res.status(200).json(updatedOrder);
        } else {
            // Либо заказ не найден, либо статус не изменился (хотя модель должна была бы вернуть заказ)
            res.status(404).json({ message: `Заказ с ID ${id} не найден или статус не был обновлен.` });
        }
    } catch (error) {
        if (error.message.includes('Недопустимый статус заказа')) {
             return res.status(400).json({ message: error.message });
        }
        console.error(`Ошибка при обновлении статуса заказа ${id}:`, error);
        res.status(500).json({ message: 'Ошибка на сервере при обновлении статуса заказа.', error: error.message });
    }
});


module.exports = router;