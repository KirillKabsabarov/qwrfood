// backend/routes/tableRoutes.js
const express = require('express');
const Tables = require('../models/tableModel.js');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware.js');

const router = express.Router();

// GET /api/tables - Получить все столики (может быть публичным или защищенным)
// Для админки точно нужен защищенный. Если клиенту тоже нужен список столиков, можно сделать отдельный публичный.
// Пока сделаем его доступным для админов. Клиенту номер столика передается при заказе.
router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const tables = await Tables.findAll();
        res.status(200).json(tables);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении столиков', error: error.message });
    }
});

// POST /api/tables - Создать новый столик (защищено)
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { table_number, status } = req.body;
    if (!table_number) {
        return res.status(400).json({ message: 'Номер столика (table_number) обязателен.' });
    }
    try {
        const newTable = await Tables.add({ table_number, status: status || 'free' });
        res.status(201).json(newTable);
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: `Столик с номером '${table_number}' уже существует.` });
        }
        res.status(500).json({ message: 'Ошибка при создании столика', error: error.message });
    }
});

// PUT /api/tables/:id/status - Обновить статус столика (защищено)
router.put('/:id/status', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
        return res.status(400).json({ message: 'Новый статус (status) не предоставлен.' });
    }
    try {
        const updatedTable = await Tables.updateStatus(id, status);
        if (updatedTable) {
            res.status(200).json(updatedTable);
        } else {
            res.status(404).json({ message: `Столик с ID ${id} не найден или статус не был обновлен.` });
        }
    } catch (error) {
        if (error.message.includes('Недопустимый статус столика')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Ошибка при обновлении статуса столика', error: error.message });
    }
});

// PUT /api/tables/:id - Обновить данные столика (например, номер) (защищено, опционально)
router.put('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const { table_number } = req.body; // Пока только номер
    if (!table_number) {
        return res.status(400).json({ message: 'Новый номер столика (table_number) не предоставлен.' });
    }
    try {
        const updatedTable = await Tables.update(id, { table_number });
        if (updatedTable) {
            res.status(200).json(updatedTable);
        } else {
            res.status(404).json({ message: `Столик с ID ${id} не найден.` });
        }
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: `Столик с номером '${table_number}' уже существует.` });
        }
        res.status(500).json({ message: 'Ошибка при обновлении столика', error: error.message });
    }
});


// DELETE /api/tables/:id - Удалить столик (защищено)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { id } = req.params;
    try {
        const count = await Tables.remove(id);
        if (count > 0) {
            res.status(200).json({ message: `Столик с ID ${id} успешно удален.` });
        } else {
            res.status(404).json({ message: `Столик с ID ${id} не найден.` });
        }
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении столика', error: error.message });
    }
});


module.exports = router;