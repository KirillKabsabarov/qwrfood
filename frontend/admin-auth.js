// frontend/admin-auth.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginMessage = document.getElementById('login-message');

    const API_BASE_URL = 'https://qrfood-backend.onrender.com/api'; // Убедись, что URL верный

    // Проверяем, не залогинен ли уже пользователь
    if (localStorage.getItem('authToken')) {
        // Если токен есть, пытаемся перейти на дашборд
        // В идеале, здесь нужна проверка валидности токена на сервере,
        // но для простоты пока просто перенаправляем.
        window.location.href = 'admin-dashboard.html';
    }


    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Предотвращаем стандартную отправку формы

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            showMessage('Пожалуйста, введите имя пользователя и пароль.', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                showMessage(data.message || 'Ошибка входа. Попробуйте снова.', 'error');
                throw new Error(data.message || `Ошибка: ${response.status}`);
            }
            
            // Успешный вход
            showMessage('Вход выполнен успешно! Перенаправление...', 'success');
            console.log('Токен получен:', data.token);
            console.log('Пользователь:', data.user);

            // Сохраняем токен в localStorage
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('authUser', JSON.stringify(data.user)); // Сохраняем инфо о пользователе

            // Перенаправляем на страницу администратора через 1.5 секунды
            setTimeout(() => {
                window.location.href = 'admin-dashboard.html';
            }, 1500);

        } catch (error) {
            console.error('Ошибка входа:', error);
            // Сообщение об ошибке уже показано, если оно пришло от сервера с !response.ok
            // Если это ошибка сети, покажем общее сообщение
            if (!loginMessage.textContent) { // Показываем только если другое сообщение не было установлено
                 showMessage('Произошла ошибка сети или сервера. Попробуйте позже.', 'error');
            }
        }
    });

    function showMessage(message, type) {
        loginMessage.textContent = message;
        loginMessage.className = `message-placeholder ${type}`; // Добавляем класс для стилизации
    }
});
