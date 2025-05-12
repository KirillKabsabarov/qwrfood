// frontend/admin-app.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Авторизация и Инициализация ---
    const authToken = localStorage.getItem('authToken');
    const authUserString = localStorage.getItem('authUser');
    let authUser = null;

    // Проверка наличия токена и данных пользователя при загрузке страницы
    // Проверка наличия токена и данных пользователя при загрузке страницы
    if (authUserString) {
        try {
            authUser = JSON.parse(authUserString);
        } catch (e) {
            console.error("Ошибка парсинга данных пользователя:", e);
            // Если данные пользователя повреждены, лучше разлогинить
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            window.location.href = 'admin-login.html';
            return; // Прекращаем выполнение скрипта
        }
    }

    if (!authToken || !authUser) {
        console.warn("Токен или данные пользователя отсутствуют. Перенаправление на страницу входа.");
        window.location.href = 'admin-login.html';
        return; // Прекращаем выполнение скрипта
    }

    // Отображение имени пользователя
    const adminUsernameElement = document.getElementById('admin-username');
    if (adminUsernameElement && authUser.username) {
        adminUsernameElement.textContent = authUser.username;
    } else {
        console.warn("Элемент для имени пользователя не найден или данные пользователя неполны.");
    }


    // --- Переменные и DOM элементы ---
    const logoutButton = document.getElementById('logout-button');
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const contentSections = document.querySelectorAll('.content-section');
    const currentSectionTitleElement = document.getElementById('current-section-title');

    const API_BASE_URL_ADMIN = 'http://localhost:3001/api'; // URL бэкенда

    // --- Обработчики основных событий ---

    // Обработчик выхода
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        window.location.href = 'admin-login.html';
    });

    // Обработчик навигации по разделам
    navLinks.forEach(link => {
        link.addEventListener('click', async (event) => { // Сделаем async, т.к. загрузка контента асинхронная
            event.preventDefault();

            const sectionId = link.dataset.section; // 'dashboard-overview', 'menu-management', etc.
            const targetContentId = `${sectionId}-content`;

            // Управление активным состоянием ссылок
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            link.classList.add('active');

            // Управление видимостью секций контента
            contentSections.forEach(section => {
                if (section.id === targetContentId) {
                    section.classList.add('active-section');
                } else {
                    section.classList.remove('active-section');
                }
            });

            // Обновление заголовка секции
            currentSectionTitleElement.textContent = link.textContent; // Берем текст из ссылки

            // Загрузка контента для секции при первом переходе
            // Проверяем, если секция стала активной, и загружаем контент, если нужно
            if (document.getElementById(targetContentId).classList.contains('active-section')) {
                if (sectionId === 'menu-management') {
                    if (!document.getElementById('categories-list')) {
                        await loadMenuManagementContent();
                    } else {
                        await fetchAndDisplayAdminCategories();
                        await fetchAndDisplayAdminMenuItems();
                    }
                } else if (sectionId === 'orders-management') {
                    if (!document.getElementById('orders-list')) {
                        await loadOrdersManagementContent();
                    } else {
                        await fetchAndDisplayAdminOrders();
                    }
                } else if (sectionId === 'tables-management') {
                    if (!document.getElementById('tables-grid-display')) {
                        await loadTablesManagementContent();
                    } else {
                        await fetchAndDisplayAdminTables();
                    }
                }
                // Раздел "Обзор" не требует загрузки динамического контента
            }
        });
    });


    // --- Глобальная функция для закрытия модальных окон (или вынести в отдельный файл) ---
    // Сделаем глобальной, чтобы можно было использовать в inline onclick
    window.closeModal = function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            // Очищаем форму при закрытии модального окна, если она есть
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
            // Скрываем выбор статуса при закрытии модального окна столика
            if (modalId === 'table-modal') {
                const statusSelectGroup = document.getElementById('table-status-select-modal').closest('.form-group');
                if (statusSelectGroup) statusSelectGroup.style.display = 'block'; // Показываем обратно для нового столика
            }
        }
    }

    // --- Функция для показа сообщений в админке ---
    // Скопирована и адаптирована из app.js
    function showAdminMessage(message, type = 'success', duration = 5000) {
        let messageContainer = document.getElementById('admin-message-container');
        // Удаляем предыдущее сообщение, если оно есть
        if (messageContainer) {
            messageContainer.remove();
        }

        messageContainer = document.createElement('div');
        messageContainer.id = 'admin-message-container';
        messageContainer.className = `message admin-message ${type}`;
        messageContainer.textContent = message;

        // Вставляем в main-content
        const mainContent = document.querySelector('.main-content');
        const mainHeader = document.querySelector('.main-header'); // Вставляем после шапки
        if (mainContent && mainHeader) {
            mainContent.insertBefore(messageContainer, mainHeader.nextSibling);
        } else if (mainContent) {
            mainContent.insertBefore(messageContainer, mainContent.firstChild);
        }
        // Если mainContent не найден, используем body (менее идеально для админки)
        else {
            document.body.appendChild(messageContainer);
        }


        // Анимация и удаление
        // Используем CSS transition для opacity
        // Устанавливаем opacity в 1 через небольшой таймаут для запуска transition
        setTimeout(() => { messageContainer.style.opacity = '1'; }, 50);

        // Устанавливаем opacity в 0 через duration, чтобы начать fade-out
        setTimeout(() => {
            if (messageContainer.parentNode) {
                messageContainer.style.opacity = '0';
                // Удаляем элемент из DOM после завершения transition fade-out
                messageContainer.addEventListener('transitionend', function handler() {
                    messageContainer.removeEventListener('transitionend', handler); // Удаляем обработчик, чтобы избежать утечек
                    if (messageContainer.parentNode) { // Проверяем, что элемент все еще в DOM перед удалением
                        messageContainer.remove();
                    }
                });
            }
        }, duration);
    }


    // --- УПРАВЛЕНИЕ МЕНЮ ---

    async function loadMenuManagementContent() {
        const menuManagementSection = document.getElementById('menu-management-content');
        if (!menuManagementSection || document.getElementById('categories-list')) {
            // Если секция не найдена или структура уже загружена, выходим
            return;
        }

        // Генерируем структуру раздела
        menuManagementSection.innerHTML = `
        <h4>Управление категориями</h4>
        <div class="admin-button-bar">
            <button id="add-category-btn" class="btn btn-success">Добавить категорию</button>
        </div>
        <div id="categories-list"></div> 
        <hr style="margin: 30px 0;">
        <h4>Управление позициями меню</h4>
        <div class="admin-button-bar">
            <button id="add-menu-item-btn" class="btn btn-success">Добавить позицию</button>
        </div>
        <div id="menu-items-list"></div> 

        <!-- Модальное окно для добавления/редактирования категории -->
        <div id="category-modal" class="modal" style="display:none;">
            <div class="modal-content">
                <span class="close-btn" onclick="closeModal('category-modal')">×</span>
                <h5 id="category-modal-title">Добавить категорию</h5>
                <form id="category-form">
                    <input type="hidden" id="category-id">
                    <div class="form-group">
                        <label for="category-name">Название категории:</label>
                        <input type="text" id="category-name" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Сохранить</button>
                </form>
            </div>
        </div>
        <!-- Модальное окно для добавления/редактирования позиции меню -->
        <div id="menu-item-modal" class="modal" style="display:none;">
            <div class="modal-content">
                <span class="close-btn" onclick="closeModal('menu-item-modal')">×</span>
                <h5 id="menu-item-modal-title">Добавить позицию меню</h5>
                <form id="menu-item-form">
                    <input type="hidden" id="menu-item-id">
                    <div class="form-group">
                        <label for="menu-item-name">Название:</label>
                        <input type="text" id="menu-item-name" required>
                    </div>
                    <div class="form-group">
                        <label for="menu-item-description">Описание:</label>
                        <textarea id="menu-item-description" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="menu-item-price">Цена (руб.):</label>
                        <input type="number" id="menu-item-price" step="0.01" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="menu-item-category">Категория:</label>
                        <select id="menu-item-category" required></select>
                    </div>
                    <div class="form-group">
                        <label for="menu-item-image-url">URL изображения:</label>
                        <input type="url" id="menu-item-image-url">
                    </div>
                    <button type="submit" class="btn btn-primary">Сохранить</button>
                </form>
            </div>
        </div>
    `;

        // Загружаем и отображаем данные в соответствующие контейнеры
        await fetchAndDisplayAdminCategories();
        await fetchAndDisplayAdminMenuItems();
        await populateCategoryDropdown();

        // Навешиваем обработчики на кнопки "Добавить" (они теперь существуют)
        document.getElementById('add-category-btn').addEventListener('click', () => openCategoryModal());
        document.getElementById('add-menu-item-btn').addEventListener('click', () => openMenuItemModal());

        // Обработчики для форм в модальных окнах (они теперь существуют)
        document.getElementById('category-form').addEventListener('submit', handleCategoryFormSubmit);
        document.getElementById('menu-item-form').addEventListener('submit', handleMenuItemFormSubmit);
    }

    async function fetchAndDisplayAdminCategories() {
        const categoriesListDiv = document.getElementById('categories-list');
        if (!categoriesListDiv) {
            console.warn("Контейнер #categories-list не найден. Возможно, не в разделе 'Управление меню'.");
            return;
        }
        categoriesListDiv.innerHTML = '<p>Загрузка категорий...</p>';

        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/categories`);
            if (!response.ok) throw new Error('Ошибка загрузки категорий');
            const categories = await response.json();

            if (categories.length === 0) {
                categoriesListDiv.innerHTML = '<p>Категории не найдены. Добавьте первую!</p>';
                return;
            }

            const table = document.createElement('table');
            table.className = 'admin-table';
            table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Название</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
                ${categories.map(cat => `
                    <tr>
                        <td>${cat.id}</td>
                        <td>${cat.name}</td>
                        <td>
                            <button class="btn btn-sm btn-warning edit-category-btn" data-id="${cat.id}" data-name="${cat.name}">Ред.</button>
                            <button class="btn btn-sm btn-danger delete-category-btn" data-id="${cat.id}">Удал.</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
            categoriesListDiv.innerHTML = ''; // Очищаем "Загрузка..." или старую таблицу
            categoriesListDiv.appendChild(table);

            // Навешиваем обработчики на кнопки редактирования/удаления категорий (на новую таблицу)
            table.querySelectorAll('.edit-category-btn').forEach(btn => {
                btn.addEventListener('click', (e) => openCategoryModal(e.target.dataset.id, e.target.dataset.name));
            });
            table.querySelectorAll('.delete-category-btn').forEach(btn => {
                btn.addEventListener('click', (e) => deleteCategory(e.target.dataset.id));
            });

        } catch (error) {
            console.error("Ошибка при загрузке категорий в админке:", error);
            categoriesListDiv.innerHTML = `<p class="error-text">Ошибка: ${error.message}</p>`;
            showAdminMessage(`Ошибка загрузки категорий: ${error.message}`, 'error');
        }
    }

    function openCategoryModal(id = null, name = '') {
        const modal = document.getElementById('category-modal');
        const title = document.getElementById('category-modal-title');
        const form = document.getElementById('category-form');
        document.getElementById('category-id').value = id || '';
        document.getElementById('category-name').value = name || '';

        title.textContent = id ? 'Редактировать категорию' : 'Добавить категорию';
        modal.style.display = 'block';
        // Устанавливаем фокус с небольшой задержкой, чтобы модальное окно успело открыться
        setTimeout(() => document.getElementById('category-name').focus(), 50);
    }

    async function handleCategoryFormSubmit(event) {
        event.preventDefault();
        const id = document.getElementById('category-id').value;
        const name = document.getElementById('category-name').value.trim();
        const formButton = event.submitter; // Кнопка, которая отправила форму

        formButton.disabled = true; // Блокируем кнопку на время отправки

        if (!name) {
            showAdminMessage('Название категории не может быть пустым.', 'error');
            formButton.disabled = false;
            return;
        }

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE_URL_ADMIN}/categories/${id}` : `${API_BASE_URL_ADMIN}/categories`;

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ name })
            });

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(responseData.message || `Ошибка сервера: ${response.status}`);
            }

            closeModal('category-modal');
            await fetchAndDisplayAdminCategories(); // Обновляем список КАТЕГОРИЙ
            await populateCategoryDropdown();      // Обновляем ДРОПДАУН КАТЕГОРИЙ
            showAdminMessage(id ? 'Категория успешно обновлена!' : 'Категория успешно добавлена!', 'success');

        } catch (error) {
            console.error("Ошибка сохранения категории:", error);
            showAdminMessage(`Ошибка: ${error.message}`, 'error');
        } finally {
            formButton.disabled = false; // Разблокируем кнопку в любом случае
        }
    }

    async function deleteCategory(id) {
        // TODO: Сделать кастомное подтверждение вместо alert
        if (!confirm('Вы уверены, что хотите удалить эту категорию? Это также удалит все связанные с ней блюда!')) return;

        const authToken = localStorage.getItem('authToken'); // Получаем токен перед каждым запросом

        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/categories/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(responseData.message || `Ошибка сервера: ${response.status}`);
            }

            await fetchAndDisplayAdminCategories(); // Обновляем список КАТЕГОРИЙ
            await populateCategoryDropdown();      // Обновляем ДРОПДАУН КАТЕГОРИЙ
            showAdminMessage('Категория успешно удалена!', 'success');

        } catch (error) {
            console.error("Ошибка удаления категории:", error);
            showAdminMessage(`Ошибка: ${error.message}`, 'error');
        }
    }


    // --- Позиции меню ---

    async function fetchAndDisplayAdminMenuItems() {
        const menuItemsListDiv = document.getElementById('menu-items-list');
        if (!menuItemsListDiv) {
            console.warn("Контейнер #menu-items-list не найден. Возможно, не в разделе 'Управление меню'.");
            return;
        }
        menuItemsListDiv.innerHTML = '<p>Загрузка позиций меню...</p>';

        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/menu`);
            if (!response.ok) throw new Error('Ошибка загрузки позиций меню');
            const menuItems = await response.json();

            if (menuItems.length === 0) {
                menuItemsListDiv.innerHTML = '<p>Позиции меню не найдены. Добавьте первую!</p>';
                return;
            }

            const table = document.createElement('table');
            table.className = 'admin-table';
            table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Название</th>
                    <th>Цена</th>
                    <th>Категория</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
                ${menuItems.map(item => `
                    <tr>
                        <td>${item.id}</td>
                        <td>${item.name}</td>
                        <td>${parseFloat(item.price).toFixed(2)}</td>
                        <td>${item.category_name || 'N/A'}</td>
                        <td>
                            <button class="btn btn-sm btn-warning edit-menu-item-btn" data-id="${item.id}">Ред.</button>
                            <button class="btn btn-sm btn-danger delete-menu-item-btn" data-id="${item.id}">Удал.</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
            menuItemsListDiv.innerHTML = '';
            menuItemsListDiv.appendChild(table);

            table.querySelectorAll('.edit-menu-item-btn').forEach(btn => {
                btn.addEventListener('click', (e) => openMenuItemModal(e.target.dataset.id));
            });
            table.querySelectorAll('.delete-menu-item-btn').forEach(btn => {
                btn.addEventListener('click', (e) => deleteMenuItem(e.target.dataset.id));
            });

        } catch (error) {
            console.error("Ошибка при загрузке позиций меню в админке:", error);
            menuItemsListDiv.innerHTML = `<p class="error-text">Ошибка: ${error.message}</p>`;
            showAdminMessage(`Ошибка загрузки позиций меню: ${error.message}`, 'error');
        }
    }

    async function populateCategoryDropdown() {
        const categorySelect = document.getElementById('menu-item-category');
        if (!categorySelect) {
            // Если элемента нет на странице (например, мы не в разделе Меню), просто выходим
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/categories`);
            if (!response.ok) throw new Error('Ошибка загрузки категорий для дропдауна');
            const categories = await response.json();

            categorySelect.innerHTML = '<option value="">-- Выберите категорию --</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                categorySelect.appendChild(option);
            });
        } catch (error) {
            console.error("Ошибка populateCategoryDropdown:", error);
            // Вместо showAdminMessage здесь, т.к. это внутренняя ошибка загрузки
            // Просто обновим опции в дропдауне, показывая ошибку выбора
            categorySelect.innerHTML = '<option value="">Ошибка загрузки категорий</option>';
            // Возможно, стоит добавить disabled на select до успешной загрузки
        }
    }

    async function openMenuItemModal(id = null) {
        const modal = document.getElementById('menu-item-modal');
        const title = document.getElementById('menu-item-modal-title');
        const form = document.getElementById('menu-item-form');

        form.reset(); // Сбрасываем форму
        document.getElementById('menu-item-id').value = id || '';

        // Загружаем категории для дропдауна каждый раз
        await populateCategoryDropdown();

        title.textContent = id ? 'Редактировать позицию меню' : 'Добавить позицию меню';

        if (id) {
            // Загружаем данные для редактирования
            try {
                const response = await fetch(`${API_BASE_URL_ADMIN}/menu/${id}`);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `Ошибка загрузки данных блюда: ${response.status}`);
                }
                const itemData = await response.json();
                document.getElementById('menu-item-name').value = itemData.name;
                document.getElementById('menu-item-description').value = itemData.description || '';
                document.getElementById('menu-item-price').value = parseFloat(itemData.price).toFixed(2);
                // Убедимся, что опция категории существует перед установкой value
                const categorySelect = document.getElementById('menu-item-category');
                if (categorySelect && categorySelect.querySelector(`option[value="${itemData.category_id}"]`)) {
                    categorySelect.value = itemData.category_id;
                } else {
                    console.warn(`Категория с ID ${itemData.category_id} для блюда ${itemData.name} не найдена в дропдауне.`);
                }
                document.getElementById('menu-item-image-url').value = itemData.image_url || '';
            } catch (error) {
                console.error("Ошибка загрузки данных блюда для редактирования:", error);
                showAdminMessage(`Ошибка загрузки данных для редактирования: ${error.message}`, 'error');
                return; // Не открываем модальное окно, если данные не загружены
            }
        }

        modal.style.display = 'block';
        setTimeout(() => document.getElementById('menu-item-name').focus(), 50);
    }

    async function handleMenuItemFormSubmit(event) {
        event.preventDefault();
        const id = document.getElementById('menu-item-id').value;
        const formButton = event.submitter;

        formButton.disabled = true;

        const menuItemData = {
            name: document.getElementById('menu-item-name').value.trim(),
            description: document.getElementById('menu-item-description').value.trim(),
            price: parseFloat(document.getElementById('menu-item-price').value),
            category_id: parseInt(document.getElementById('menu-item-category').value),
            image_url: document.getElementById('menu-item-image-url').value.trim() || null
        };

        // Валидация на клиенте
        if (!menuItemData.name || isNaN(menuItemData.price) || menuItemData.price <= 0 || isNaN(menuItemData.category_id) || !menuItemData.category_id) {
            showAdminMessage('Заполните все обязательные поля (Название, Цена > 0, Категория).', 'error');
            formButton.disabled = false;
            return;
        }

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE_URL_ADMIN}/menu/${id}` : `${API_BASE_URL_ADMIN}/menu`;

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(menuItemData)
            });

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(responseData.message || `Ошибка сервера: ${response.status}`);
            }

            closeModal('menu-item-modal');
            await fetchAndDisplayAdminMenuItems(); // Обновляем список БЛЮД
            showAdminMessage(id ? 'Позиция меню успешно обновлена!' : 'Позиция меню успешно добавлена!', 'success');

        } catch (error) {
            console.error("Ошибка сохранения позиции меню:", error);
            showAdminMessage(`Ошибка: ${error.message}`, 'error');
        } finally {
            formButton.disabled = false;
        }
    }

    async function deleteMenuItem(id) {
        // TODO: Сделать кастомное подтверждение вместо alert
        if (!confirm('Вы уверены, что хотите удалить эту позицию меню?')) return;

        const authToken = localStorage.getItem('authToken');

        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/menu/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(responseData.message || `Ошибка сервера: ${response.status}`);
            }

            await fetchAndDisplayAdminMenuItems(); // Обновляем список БЛЮД
            showAdminMessage('Позиция меню успешно удалена!', 'success');

        } catch (error) {
            console.error("Ошибка удаления позиции меню:", error);
            showAdminMessage(`Ошибка: ${error.message}`, 'error');
        }
    }


    // --- УПРАВЛЕНИЕ ЗАКАЗАМИ ---

    async function loadOrdersManagementContent() {
        const ordersManagementSection = document.getElementById('orders-management-content');
        if (!ordersManagementSection || document.getElementById('orders-list')) {
            // Если секция не найдена или структура уже загружена
            return;
        }

        ordersManagementSection.innerHTML = `
        <h4>Управление Заказами</h4>
        <div class="order-filters admin-button-bar">
            <label for="order-status-filter">Фильтр по статусу:</label>
            <select id="order-status-filter">
                <option value="">Все статусы</option>
                <option value="new">Новый</option>
                <option value="preparing">Готовится</option>
                <option value="ready">Готов</option>
                <option value="completed">Выдан</option>
                <option value="cancelled">Отменен</option>
            </select>
            <label for="order-date-filter">Фильтр по дате:</label>
            <input type="date" id="order-date-filter">
            <button id="apply-order-filters-btn" class="btn btn-info btn-sm">Применить фильтры</button>
        </div>
        <div id="orders-list"></div> 

        <!-- Модальное окно для просмотра деталей заказа -->
        <div id="order-details-modal" class="modal" style="display:none;">
            <div class="modal-content modal-lg"> 
                <span class="close-btn" onclick="closeModal('order-details-modal')">×</span>
                <h5 id="order-details-modal-title">Детали заказа №<span id="details-order-id"></span></h5>
                <div id="order-details-content">
                    <!-- Детали будут загружены сюда -->
                </div>
            </div>
        </div>
    `;

        // Получаем ссылку на контейнер после того, как он создан
        const ordersListDiv = document.getElementById('orders-list');
        ordersListDiv.innerHTML = '<p>Загрузка заказов...</p>';

        await fetchAndDisplayAdminOrders();

        // Обработчики для фильтров (навешиваем один раз)
        document.getElementById('apply-order-filters-btn').addEventListener('click', () => {
            const statusFilter = document.getElementById('order-status-filter').value;
            const dateFilter = document.getElementById('order-date-filter').value;
            fetchAndDisplayAdminOrders({ status: statusFilter, date: dateFilter });
        });
    }

    async function fetchAndDisplayAdminOrders(filters = {}) {
        const ordersListDiv = document.getElementById('orders-list');
        if (!ordersListDiv) {
            console.warn("Контейнер #orders-list не найден. Возможно, не в разделе 'Заказы'.");
            return;
        }
        ordersListDiv.innerHTML = '<p>Загрузка заказов...</p>';

        const authToken = localStorage.getItem('authToken');

        let queryParams = new URLSearchParams();
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.date) queryParams.append('date', filters.date);

        const url = `${API_BASE_URL_ADMIN}/orders?${queryParams.toString()}`;

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(responseData.message || `Ошибка загрузки заказов: ${response.status}`);
            }
            const orders = responseData;

            if (orders.length === 0) {
                ordersListDiv.innerHTML = '<p>Заказы не найдены (или не соответствуют фильтрам).</p>';
                return;
            }

            const table = document.createElement('table');
            table.className = 'admin-table';
            table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Тип</th>
                    <th>Столик/Время</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                    <th>Дата создания</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(order => `
                    <tr data-order-id="${order.id}">
                        <td>${order.id}</td>
                        <td>${order.order_type === 'table' ? 'За столиком' : 'Самовывоз'}</td>
                        <td>${order.order_type === 'table' ? (order.table_number || 'N/A') : (order.pickup_time || 'N/A')}</td>
                        <td>${parseFloat(order.total_amount).toFixed(2)} руб.</td>
                        <td>
                            <select class="order-status-select" data-order-id="${order.id}">
                                <option value="new" ${order.status === 'new' ? 'selected' : ''}>Новый</option>
                                <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Готовится</option>
                                <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Готов</option>
                                <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Выдан</option>
                                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Отменен</option>
                            </select>
                        </td>
                        <td>${new Date(order.created_at).toLocaleString('ru-RU')}</td>
                        <td>
                            <button class="btn btn-sm btn-info view-order-details-btn" data-order-id="${order.id}">Детали</button>
                            <!-- Кнопка удаления заказа -->
                            <!-- <button class="btn btn-sm btn-danger delete-order-btn" data-order-id="${order.id}">Удалить</button> -->
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
            ordersListDiv.innerHTML = '';
            ordersListDiv.appendChild(table);

            // Навешиваем обработчики на изменение статуса
            table.querySelectorAll('.order-status-select').forEach(select => {
                // Сохраняем текущее значение как "предыдущее" перед навешиванием обработчика
                select.dataset.previousStatus = select.value;
                select.addEventListener('change', (e) => {
                    updateOrderStatus(e.target.dataset.orderId, e.target.value, e.target); // Передаем сам элемент select
                });
            });
            // Навешиваем обработчики на кнопки "Детали"
            table.querySelectorAll('.view-order-details-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    openOrderDetailsModal(e.target.dataset.orderId);
                });
            });
            // Если есть кнопки удаления заказов, навешиваем и на них
            table.querySelectorAll('.delete-order-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    // deleteOrder(e.target.dataset.orderId); // TODO
                });
            });


        } catch (error) {
            console.error("Ошибка при загрузке заказов в админке:", error);
            ordersListDiv.innerHTML = `<p class="error-text">Ошибка: ${error.message}</p>`;
            showAdminMessage(`Ошибка загрузки заказов: ${error.message}`, 'error');
        }
    }

    async function updateOrderStatus(orderId, newStatus, selectElement) {
        const authToken = localStorage.getItem('authToken');
        const oldStatus = selectElement ? selectElement.dataset.previousStatus : null;

        // Визуально меняем статус сразу (select уже изменен)
        // Если будет ошибка, откатим назад.

        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(responseData.message || `Ошибка обновления статуса: ${response.status}`);
            }

            console.log('Статус заказа обновлен:', responseData);
            showAdminMessage('Статус заказа успешно обновлен!', 'success');
            // Обновляем "предыдущий" статус в data атрибуте select'а на новый
            if (selectElement) {
                selectElement.dataset.previousStatus = newStatus;
            }

        } catch (error) {
            console.error(`Ошибка при обновлении статуса заказа ${orderId}:`, error);
            showAdminMessage(`Ошибка: ${error.message}`, 'error');

            // Откатываем значение select к старому статусу, если была ошибка
            if (selectElement && oldStatus !== null) { // Проверяем, что oldStatus не null/undefined
                selectElement.value = oldStatus; // Устанавливаем старое значение
                // Обновляем data-атрибут обратно
                selectElement.dataset.previousStatus = oldStatus;
            }
            // TODO: Возможно, лучше перезагрузить весь список fetchAndDisplayAdminOrders();
            // чтобы быть уверенным в данных, но это снижает отзывчивость.
        }
    }

    async function openOrderDetailsModal(orderId) {
        const modal = document.getElementById('order-details-modal');
        const titleOrderIdSpan = document.getElementById('details-order-id');
        const contentDiv = document.getElementById('order-details-content');
        const authToken = localStorage.getItem('authToken');

        titleOrderIdSpan.textContent = orderId;
        contentDiv.innerHTML = '<p>Загрузка деталей...</p>';
        modal.style.display = 'block';
        // Устанавливаем фокус с небольшой задержкой для доступности
        setTimeout(() => modal.querySelector('.close-btn').focus(), 50);


        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(responseData.message || `Ошибка загрузки деталей: ${response.status}`);
            }
            const order = responseData;

            let detailsHtml = `
            <p><strong>ID Заказа:</strong> ${order.id}</p>
            <p><strong>Тип:</strong> ${order.order_type === 'table' ? 'За столиком' : 'Самовывоз'}</p>
            ${order.order_type === 'table' ? `<p><strong>Столик:</strong> ${order.table_number || 'N/A'}</p>` : ''}
            ${order.order_type === 'takeaway' ? `<p><strong>Время самовывоза:</strong> ${order.pickup_time || 'N/A'}</p>` : ''}
            <p><strong>Статус:</strong> ${order.status}</p>
            <p><strong>Сумма:</strong> ${parseFloat(order.total_amount).toFixed(2)} руб.</p>
            <p><strong>Создан:</strong> ${new Date(order.created_at).toLocaleString('ru-RU')}</p>
            <p><strong>Обновлен:</strong> ${new Date(order.updated_at).toLocaleString('ru-RU')}</p>
            <h4>Позиции заказа:</h4>
        `;
            if (order.items && order.items.length > 0) {
                detailsHtml += '<ul>';
                order.items.forEach(item => {
                    detailsHtml += `<li>${item.menu_item_name} - ${item.quantity} шт. x ${parseFloat(item.price_at_order).toFixed(2)} руб.</li>`;
                });
                detailsHtml += '</ul>';
            } else {
                detailsHtml += '<p>Нет позиций в заказе.</p>';
            }
            contentDiv.innerHTML = detailsHtml;

        } catch (error) {
            console.error("Ошибка при загрузке деталей заказа:", error);
            contentDiv.innerHTML = `<p class="error-text">Ошибка загрузки: ${error.message}</p>`;
            showAdminMessage(`Ошибка загрузки деталей заказа: ${error.message}`, 'error');
        }
    }

    // TODO: Реализовать deleteOrder, если нужно удаление заказов


    // --- УПРАВЛЕНИЕ СТОЛИКАМИ ---

    async function loadTablesManagementContent() {
        const tablesManagementSection = document.getElementById('tables-management-content');
        if (!tablesManagementSection || document.getElementById('tables-grid-display')) {
            // Если секция не найдена или структура уже загружена
            return;
        }

        tablesManagementSection.innerHTML = `
        <h4>Управление Столиками</h4>
        <div class="admin-button-bar">
            <button id="add-table-btn" class="btn btn-success">Добавить столик</button>
        </div>
        <div id="tables-grid-display"></div> 

        <!-- Модальное окно для добавления/редактирования столика -->
        <div id="table-modal" class="modal" style="display:none;">
            <div class="modal-content">
                <span class="close-btn" onclick="closeModal('table-modal')">×</span>
                <h5 id="table-modal-title">Добавить столик</h5>
                <form id="table-form">
                    <input type="hidden" id="table-id">
                    <div class="form-group">
                        <label for="table-number-input">Номер/Название столика:</label>
                        <input type="text" id="table-number-input" required>
                    </div>
                    <div class="form-group">
                        <label for="table-status-select-modal">Статус (при создании):</label>
                        <select id="table-status-select-modal">
                            <option value="free">Свободен</option>
                            <option value="occupied">Занят</option>
                            <option value="reserved">Забронирован</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary">Сохранить</button>
                </form>
            </div>
        </div>
    `;

        // Получаем ссылку на контейнер после того, как он создан
        const tablesGridDiv = document.getElementById('tables-grid-display');
        tablesGridDiv.innerHTML = '<p>Загрузка столиков...</p>';

        await fetchAndDisplayAdminTables();

        // Навешиваем обработчики на кнопки и формы (навешиваем один раз)
        document.getElementById('add-table-btn').addEventListener('click', () => openTableModal());
        document.getElementById('table-form').addEventListener('submit', handleTableFormSubmit);
    }

    async function fetchAndDisplayAdminTables() {
        const tablesGridDiv = document.getElementById('tables-grid-display');
        if (!tablesGridDiv) {
            console.warn("Контейнер #tables-grid-display не найден. Возможно, не в разделе 'Столики'.");
            return;
        }
        tablesGridDiv.innerHTML = '<p>Загрузка столиков...</p>';

        const authToken = localStorage.getItem('authToken');

        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/tables`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const responseData = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(responseData.message || `Ошибка загрузки столиков: ${response.status}`);
            }
            const tables = responseData;

            if (tables.length === 0) {
                tablesGridDiv.innerHTML = '<p>Столики не найдены. Добавьте первый!</p>';
                return;
            }

            // Отображаем столики в виде плитки
            tablesGridDiv.innerHTML = '';
            const gridContainer = document.createElement('div');
            gridContainer.className = 'tables-grid-container';

            tables.forEach(table => {
                const tableCard = document.createElement('div');
                tableCard.className = `table-card status-${table.status}`; // Класс для статуса
                tableCard.dataset.tableId = table.id;
                // Сохраняем начальный статус для отката
                tableCard.dataset.originalStatus = table.status;


                tableCard.innerHTML = `
                <div class="table-card-number">${table.table_number}</div>
                <div class="table-card-status">
                    <select class="table-status-select-card" data-table-id="${table.id}">
                        <option value="free" ${table.status === 'free' ? 'selected' : ''}>Свободен</option>
                        <option value="occupied" ${table.status === 'occupied' ? 'selected' : ''}>Занят</option>
                        <option value="reserved" ${table.status === 'reserved' ? 'selected' : ''}>Забронирован</option>
                    </select>
                </div>
                <div class="table-card-actions">
                    <button class="btn btn-xs btn-warning edit-table-btn" title="Редактировать номер столика">✎</button> 
                    <button class="btn btn-xs btn-danger delete-table-btn" title="Удалить столик">×</button>
                </div>
            `;

                gridContainer.appendChild(tableCard);

                // Обработчик изменения статуса прямо на карточке
                tableCard.querySelector('.table-status-select-card').addEventListener('change', (e) => {
                    const selectElement = e.target;
                    const tableId = selectElement.dataset.tableId;
                    const newStatus = selectElement.value;
                    const cardElement = selectElement.closest('.table-card'); // Находим карточку-родителя
                    updateTableStatus(tableId, newStatus, cardElement);
                });
                // Обработчики для кнопок редактирования/удаления на карточке
                tableCard.querySelector('.edit-table-btn').addEventListener('click', (e) => {
                    const tableId = e.target.closest('.table-card').dataset.tableId; // Получаем ID с карточки
                    // Нужны также номер и статус для предзаполнения модалки редактирования.
                    // Можно найти их в текущем списке tables, или сделать доп. запрос findById.
                    // Для простоты, можно передать номер и статус как data-атрибуты кнопки или карточки
                    // или сделать модалку редактирования только номера, а статус менять на карточке.
                    // Давайте сделаем модалку только для номера, статус меняем на карточке.
                    // openTableModal(tableId, table.table_number); // Pass ID and Number
                    // Для предзаполнения модалки нужно знать номер. Найдем его из таблицы.
                    const tableData = tables.find(t => t.id == tableId); // Используем == для сравнения строки и числа
                    if (tableData) {
                        openTableModal(tableId, tableData.table_number, tableData.status); // Передаем все данные
                    } else {
                        console.error("Данные столика для редактирования не найдены в текущем списке!");
                        showAdminMessage("Ошибка: Не удалось получить данные столика для редактирования.", 'error');
                    }

                });
                tableCard.querySelector('.delete-table-btn').addEventListener('click', (e) => {
                    const tableId = e.target.closest('.table-card').dataset.tableId;
                    deleteTable(tableId);
                });
            });
            tablesGridDiv.appendChild(gridContainer);

        } catch (error) {
            console.error("Ошибка при загрузке столиков в админке:", error);
            tablesGridDiv.innerHTML = `<p class="error-text">Ошибка: ${error.message}</p>`;
            showAdminMessage(`Ошибка загрузки столиков: ${error.message}`, 'error');
        }
    }

    function openTableModal(id = null, number = '', status = 'free') {
        const modal = document.getElementById('table-modal');
        const title = document.getElementById('table-modal-title');
        const form = document.getElementById('table-form');
        document.getElementById('table-id').value = id || '';
        document.getElementById('table-number-input').value = number || '';
        document.getElementById('table-status-select-modal').value = status || 'free'; // Предзаполняем статус для нового столика

        // Скрываем выбор статуса при редактировании номера
        const statusSelectGroup = document.getElementById('table-status-select-modal').closest('.form-group');
        if (statusSelectGroup) statusSelectGroup.style.display = id ? 'none' : 'block';

        title.textContent = id ? 'Редактировать столик' : 'Добавить столик';
        modal.style.display = 'block';
        setTimeout(() => document.getElementById('table-number-input').focus(), 50);
    }

    async function handleTableFormSubmit(event) {
        event.preventDefault();
        const id = document.getElementById('table-id').value;
        const table_number = document.getElementById('table-number-input').value.trim();
        const status = document.getElementById('table-status-select-modal').value; // Используется только при создании
        const authToken = localStorage.getItem('authToken');
        const formButton = event.submitter;

        formButton.disabled = true;

        if (!table_number) {
            showAdminMessage('Номер/название столика не может быть пустым.', 'error');
            formButton.disabled = false;
            return;
        }

        const payload = { table_number };
        let method = 'POST';
        let url = `${API_BASE_URL_ADMIN}/tables`;

        if (id) { // Редактирование номера столика
            method = 'PUT';
            url = `${API_BASE_URL_ADMIN}/tables/${id}`;
            // При редактировании через эту форму меняем только номер.
        } else { // Создание нового столика
            payload.status = status;
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(payload)
            });

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(responseData.message || `Ошибка сервера: ${response.status}`);
            }

            closeModal('table-modal');
            await fetchAndDisplayAdminTables(); // Обновляем список СТОЛИКОВ
            showAdminMessage(id ? 'Столик успешно обновлен!' : 'Столик успешно добавлен!', 'success');

        } catch (error) {
            console.error("Ошибка сохранения столика:", error);
            showAdminMessage(`Ошибка: ${error.message}`, 'error');
        } finally {
            formButton.disabled = false;
        }
    }

    async function updateTableStatus(tableId, newStatus, tableCardElement) {
        const authToken = localStorage.getItem('authToken');
        // Сохраняем старый статус в data-атрибуте селекта перед изменением
        const selectElement = tableCardElement ? tableCardElement.querySelector('.table-status-select-card') : null;
        const oldStatus = selectElement ? selectElement.dataset.previousStatus : null;

        // Визуально меняем статус select сразу
        if (selectElement) {
            selectElement.dataset.previousStatus = selectElement.value; // Сохраняем текущий статус как предыдущий
            selectElement.value = newStatus; // Меняем UI
        }

        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/tables/${tableId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                // Если ошибка, выбрасываем ее, чтобы она была поймана в catch
                throw new Error(responseData.message || `Ошибка обновления статуса столика: ${response.status}`);
            }

            const updatedTable = responseData;
            console.log('Статус столика обновлен:', updatedTable);
            showAdminMessage('Статус столика успешно обновлен!', 'success');

            // Обновляем класс у карточки для изменения цвета
            if (tableCardElement) {
                // Удаляем все классы статусов и добавляем новый
                tableCardElement.classList.remove(...Array.from(tableCardElement.classList).filter(cls => cls.startsWith('status-')));
                tableCardElement.classList.add(`status-${updatedTable.status}`);
                // Обновляем data-атрибут в карточке на новый статус
                tableCardElement.dataset.originalStatus = updatedTable.status;
            }
            // Обновляем "предыдущий" статус в data атрибуте select'а на новый
            if (selectElement) {
                selectElement.dataset.previousStatus = newStatus;
            }


        } catch (error) {
            console.error(`Ошибка при обновлении статуса столика ${tableId}:`, error);
            showAdminMessage(`Ошибка: ${error.message}`, 'error');

            // Откатываем UI, если была ошибка
            if (selectElement && oldStatus !== null) {
                selectElement.value = oldStatus; // Возвращаем значение select
                selectElement.dataset.previousStatus = oldStatus; // Возвращаем data-атрибут
                // Откатываем класс карточки
                if (tableCardElement) {
                    const originalStatus = tableCardElement.dataset.originalStatus; // Берем статус из data-атрибута карточки
                    tableCardElement.classList.remove(...Array.from(tableCardElement.classList).filter(cls => cls.startsWith('status-')));
                    if (originalStatus) tableCardElement.classList.add(`status-${originalStatus}`); // Возвращаем оригинальный класс
                }
            }
            // TODO: Рассмотреть полную перезагрузку списка столиков в случае ошибки для надежности
            // await fetchAndDisplayAdminTables();
        }
    }

    async function deleteTable(id) {
        // TODO: Сделать кастомное подтверждение вместо alert
        if (!confirm('Вы уверены, что хотите удалить этот столик?')) return;
        const authToken = localStorage.getItem('authToken');

        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/tables/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(responseData.message || `Ошибка сервера: ${response.status}`);
            }

            await fetchAndDisplayAdminTables(); // Обновляем список СТОЛИКОВ
            showAdminMessage('Столик успешно удален!', 'success');

        } catch (error) {
            console.error("Ошибка удаления столика:", error);
            showAdminMessage(`Ошибка: ${error.message}`, 'error');
        }
    }


    // --- Инициализация ---
    // Находим ссылку на первый элемент навигации и имитируем клик по нему
    // Это загрузит контент для раздела "Обзор" по умолчанию
    const defaultSectionLink = document.querySelector('.sidebar-nav a[data-section="dashboard-overview"]');
    if (defaultSectionLink) {
        defaultSectionLink.click();
    } else {
        console.error("Ссылка на раздел 'Обзор' не найдена!");
    }
});