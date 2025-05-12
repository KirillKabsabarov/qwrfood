// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware для проверки аутентификации
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    // Токен обычно передается в формате "Bearer TOKEN_STRING"
    const token = authHeader && authHeader.split(' ')[1]; 

    if (token == null) {
        // Нет токена
        return res.status(401).json({ message: 'Отсутствует токен авторизации.' }); 
    }

    jwt.verify(token, JWT_SECRET, (err, decodedPayload) => {
        if (err) {
            // Токен недействителен (например, истек срок или неверная подпись)
            console.error('Ошибка верификации токена:', err.message);
            return res.status(403).json({ message: 'Недействительный или просроченный токен.' }); // Forbidden
        }

        // Токен валиден, сохраняем payload в req.user для использования в защищенных роутах
        req.user = decodedPayload; 
        next(); // Передаем управление следующему обработчику
    });
}

// Middleware для проверки роли (опционально, но полезно)
// Позволяет указать, какие роли имеют доступ к маршруту
function authorizeRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            // Это не должно произойти, если authenticateToken отработал правильно
            return res.status(401).json({ message: 'Пользователь не аутентифицирован или роль не определена.' });
        }

        const hasRequiredRole = allowedRoles.includes(req.user.role);

        if (hasRequiredRole) {
            next(); // У пользователя есть необходимая роль
        } else {
            // У пользователя нет необходимой роли
            return res.status(403).json({ message: 'Доступ запрещен. Недостаточно прав.' }); // Forbidden
        }
    };
}


module.exports = {
    authenticateToken,
    authorizeRole
};