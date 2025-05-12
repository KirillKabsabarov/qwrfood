// backend/routes/authRoutes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel.js');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined.");
    process.exit(1); // Выход, если секрет не задан
}

// Вспомогательная функция для генерации токена
function generateToken(user) {
    const payload = {
        userId: user.id,
        username: user.username,
        role: user.role,
    };
    const options = {
        expiresIn: '1d', // Токен будет действителен 1 день (1h, 7d, etc.)
    };
    return jwt.sign(payload, JWT_SECRET, options);
}

// POST /api/auth/login - Вход пользователя
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Имя пользователя и пароль обязательны.' });
    }

    try {
        const user = await User.findByUsername(username);
        if (!user) {
            return res.status(401).json({ message: 'Неверные учетные данные.' }); // Unauthorized
        }

        const passwordIsValid = await User.verifyPassword(password, user.password_hash);
        if (!passwordIsValid) {
            return res.status(401).json({ message: 'Неверные учетные данные.' }); // Unauthorized
        }

        // Пароль верный, генерируем токен
        const token = generateToken(user);

        // Не возвращаем хэш пароля клиенту
        const userToReturn = { ...user };
        delete userToReturn.password_hash;

        res.status(200).json({
            message: `Добро пожаловать, ${user.username}!`,
            token: token,
            user: userToReturn 
        });

    } catch (error) {
        console.error("Ошибка входа:", error);
        res.status(500).json({ message: 'Ошибка сервера при попытке входа.', error: error.message });
    }
});

// POST /api/auth/register - Регистрация (если нужна, но для админов лучше через сиды или спец. команды)
// Оставим для примера, но в реальном приложении этот эндпоинт для админов лучше защитить или убрать
router.post('/register', async (req, res) => {
    const { username, password, role } = req.body; // role можно опустить, если всегда 'admin'

    if (!username || !password) {
        return res.status(400).json({ message: 'Имя пользователя и пароль обязательны.' });
    }
    // Дополнительная валидация (длина пароля и т.д.)
    if (password.length < 6) {
        return res.status(400).json({ message: 'Пароль должен быть не менее 6 символов.' });
    }

    try {
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            return res.status(409).json({ message: 'Пользователь с таким именем уже существует.' }); // Conflict
        }

        const newUser = await User.add({ username, password, role: role || 'admin' });
        // Можно сразу выдать токен при регистрации, если это нужно
        // const token = generateToken(newUser);
        res.status(201).json({ 
            message: 'Пользователь успешно зарегистрирован.',
            user: newUser 
            // token: token // если выдаем токен сразу
        });
    } catch (error) {
        console.error("Ошибка регистрации:", error);
        if (error.message.includes('UNIQUE constraint failed')) { // SQLite specific
            return res.status(409).json({ message: 'Пользователь с таким именем уже существует.' });
        }
        res.status(500).json({ message: 'Ошибка сервера при регистрации.', error: error.message });
    }
});


module.exports = router;