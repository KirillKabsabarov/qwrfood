// backend/routes/categoryRoutes.js
const express = require('express');
const Categories = require('../models/categoryModel.js'); // Импортируем нашу модель
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware.js');

const router = express.Router();

// GET /api/categories - Получить все категории
router.get('/', async (req, res) => {
  try {
    const categories = await Categories.findAll();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении категорий', error: error.message });
  }
});

// GET /api/categories/:id - Получить категорию по ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const category = await Categories.findById(id);
    if (category) {
      res.status(200).json(category);
    } else {
      res.status(404).json({ message: `Категория с ID ${id} не найдена` });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении категории', error: error.message });
  }
});

// POST /api/categories - Создать новую категорию (ЗАЩИЩЕНО)
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res) => { 
  const categoryData = req.body;
  if (!categoryData.name) {
      return res.status(400).json({ message: 'Отсутствует обязательное поле "name"' });
  }

  try {
    const newCategory = await Categories.add(categoryData);
    res.status(201).json(newCategory);
  } catch (error) {
    // Обработка ошибки уникальности имени (специфично для SQLite)
    if (error.message.includes('UNIQUE constraint failed: categories.name')) {
         return res.status(409).json({ message: 'Категория с таким именем уже существует' }); // 409 Conflict
    }
    res.status(500).json({ message: 'Ошибка при создании категории', error: error.message });
  }
});

// PUT /api/categories/:id - Обновить категорию (пока без защиты админки)
router.put('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const changes = req.body;

  if (!changes.name && Object.keys(changes).length === 0) {
      return res.status(400).json({ message: 'Нет данных для обновления или отсутствует поле "name"' });
  }
  if (changes.name !== undefined && !changes.name.trim()) {
    return res.status(400).json({ message: 'Поле "name" не может быть пустым, если предоставлено для обновления' });
  }

  try {
    const updatedCategory = await Categories.update(id, changes);
    if (updatedCategory) {
      res.status(200).json(updatedCategory);
    } else {
      res.status(404).json({ message: `Категория с ID ${id} не найдена для обновления` });
    }
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed: categories.name')) {
        return res.status(409).json({ message: 'Категория с таким именем уже существует' });
    }
    res.status(500).json({ message: 'Ошибка при обновлении категории', error: error.message });
  }
});

// DELETE /api/categories/:id - Удалить категорию (пока без защиты админки)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const count = await Categories.remove(id);
    if (count > 0) {
      res.status(200).json({ message: `Категория с ID ${id} успешно удалена` });
      // или res.status(204).end(); // No Content
    } else {
      res.status(404).json({ message: `Категория с ID ${id} не найдена для удаления` });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при удалении категории', error: error.message });
  }
});

module.exports = router;