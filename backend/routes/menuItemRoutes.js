// backend/routes/menuItemRoutes.js
const express = require('express');
const MenuItems = require('../models/menuItemModel.js');
const Categories = require('../models/categoryModel.js'); // Может понадобиться для валидации
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware.js');

const router = express.Router();

// GET /api/menu - Получить все позиции меню (опционально фильтр по ?category_id=X)
router.get('/', async (req, res) => {
  const { category_id } = req.query; // Получаем category_id из query параметров
  try {
    const items = await MenuItems.findAll(category_id);
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении позиций меню', error: error.message });
  }
});

// GET /api/menu/:id - Получить позицию меню по ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const item = await MenuItems.findById(id);
    if (item) {
      res.status(200).json(item);
    } else {
      res.status(404).json({ message: `Позиция меню с ID ${id} не найдена` });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении позиции меню', error: error.message });
  }
});

// POST /api/menu - Создать новую позицию меню (ЗАЩИЩЕНО)
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const itemData = req.body;
  // Базовая валидация
  if (!itemData.name || !itemData.price || !itemData.category_id) {
    return res.status(400).json({ message: 'Отсутствуют обязательные поля: name, price, category_id' });
  }
  if (isNaN(parseFloat(itemData.price)) || !isFinite(itemData.price) || itemData.price <= 0) {
    return res.status(400).json({ message: 'Цена должна быть положительным числом' });
  }
  if (isNaN(parseInt(itemData.category_id)) || !isFinite(itemData.category_id)) {
      return res.status(400).json({ message: 'category_id должен быть числом' });
  }


  try {
    const newItem = await MenuItems.add(itemData);
    res.status(201).json(newItem);
  } catch (error) {
    // Если ошибка из-за несуществующей категории (из модели)
    if (error.message.includes('не существует')) {
        return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Ошибка при создании позиции меню', error: error.message });
  }
});

// PUT /api/menu/:id - Обновить позицию меню (ЗАЩИЩЕНО)
router.put('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const changes = req.body;

  if (Object.keys(changes).length === 0) {
    return res.status(400).json({ message: 'Нет данных для обновления' });
  }
  if (changes.price && (isNaN(parseFloat(changes.price)) || !isFinite(changes.price) || changes.price <= 0)) {
      return res.status(400).json({ message: 'Цена должна быть положительным числом, если предоставлена' });
  }
  if (changes.category_id && (isNaN(parseInt(changes.category_id)) || !isFinite(changes.category_id))) {
      return res.status(400).json({ message: 'category_id должен быть числом, если предоставлен' });
  }


  try {
    const updatedItem = await MenuItems.update(id, changes);
    if (updatedItem) {
      res.status(200).json(updatedItem);
    } else {
      res.status(404).json({ message: `Позиция меню с ID ${id} не найдена для обновления` });
    }
  } catch (error) {
    if (error.message.includes('не существует')) {
        return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Ошибка при обновлении позиции меню', error: error.message });
  }
});

// DELETE /api/menu/:id - Удалить позицию меню (ЗАЩИЩЕНО)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const count = await MenuItems.remove(id);
    if (count > 0) {
      res.status(200).json({ message: `Позиция меню с ID ${id} успешно удалена` });
    } else {
      res.status(404).json({ message: `Позиция меню с ID ${id} не найдена для удаления` });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при удалении позиции меню', error: error.message });
  }
});

module.exports = router;