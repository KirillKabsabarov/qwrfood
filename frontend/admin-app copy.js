// frontend/admin-app.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Авторизация и Инициализация ---
    const authToken = localStorage.getItem('authToken');
    const authUserString = localStorage.getItem('authUser');
    let authUser = null;

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


    // --- Функция для принудительного обновления UI текущего раздела ---
    // Принимает sectionId для явного указания, какой раздел активировать
    function updateCurrentSectionUI(sectionId) {
        const targetContentId = `${sectionId}-content`;
        const targetSection = document.getElementById(targetContentId);
        const targetNavLink = document.querySelector(`.sidebar-nav a[data-section="${sectionId}"]`); // Находим соответствующую ссылку

        if (targetSection) {
            // 1. Управление видимостью секций контента
            contentSections.forEach(section => {
                if (section.id === targetContentId) {
                    section.classList.add('active-section');
                } else {
                    section.classList.remove('active-section');
                }
            });

            // 2. Управление активным состоянием ссылок
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            if (targetNavLink) {
                targetNavLink.classList.add('active');
                 // 3. Обновление заголовка секции на основе текста активной ссылки
                currentSectionTitleElement.textContent = targetNavLink.textContent;
            } else {
                console.warn(`Навигационная ссылка для раздела ${sectionId} не найдена при обновлении UI.`);
                 // Fallback для заголовка
                currentSectionTitleElement.textContent = `${sectionId.replace('-', ' ').replace('management', 'Управление').replace('overview', 'Обзор')} (Не найдена ссылка)`;
            }

        } else {
            console.error(`Элемент контента для раздела #${targetContentId} не найден при обновлении UI.`);
             // Если целевой элемент секции не найден, что-то пошло не так.
             // Возможно, как крайний случай, активировать первый доступный раздел?
             // findAndActivateFirstSection(); // Может быть добавлено как fallback
        }
    }

    // --- Вспомогательная функция для поиска и активации первого раздела ---
     function findAndActivateFirstSection() {
        const firstLink = document.querySelector('.sidebar-nav a');
        if (firstLink) {
             // Имитируем клик через requestAnimationFrame для правильной отрисовки
             requestAnimationFrame(() => {
                  if (firstLink) { // Проверка на случай удаления элемента за время RAF
                       firstLink.click();
                  }
             });
        } else {
             console.error("Нет навигационных ссылок в сайдбаре для активации.");
             // Возможно, показать сообщение об ошибке пользователю
        }
     }


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

            const sectionId = link.dataset.section; // 'menu-management', 'orders-management', etc.
            const targetContentId = `${sectionId}-content`;
            const targetSectionElement = document.getElementById(targetContentId);


            // === Управление активным состоянием ссылок и видимостью секций ===
            // Вызываем обновление UI сразу после клика по ссылке
             updateCurrentSectionUI(sectionId); // <--- Передаем sectionId

            // Загрузка контента для секции при первом переходе или при необходимости обновления
            if (targetSectionElement && targetSectionElement.classList.contains('active-section')) {
                if (sectionId === 'menu-management') {
                    // Проверяем наличие ключевых элементов раздела, чтобы понять, загружать структуру или только данные
                    if (!document.getElementById('categories-list') || !document.getElementById('menu-items-list')) {
                         await loadMenuManagementContent(); // Загрузка полной структуры и данных
                    } else {
                         await fetchAndDisplayAdminCategories(); // Просто обновляем списки
                         await fetchAndDisplayAdminMenuItems();
                         await populateCategoryDropdown(); // Обновляем дропдаун на всякий случай
                    }
                } else if (sectionId === 'orders-management') {
                    if (!document.getElementById('orders-list')) {
                        await loadOrdersManagementContent();
                    } else {
                         await fetchAndDisplayAdminOrders(); // Просто обновляем список
                    }
                } else if (sectionId === 'tables-management') {
                    if (!document.getElementById('tables-grid-display')) {
                        await loadTablesManagementContent();
                    } else {
                        await fetchAndDisplayAdminTables(); // Просто обновляем список
                    }
                }
                 // Раздел "Обзор" удален, его логика больше не нужна

                 // После загрузки/отображения контента, принудительно восстанавливаем состояние активности
                 // Это может помочь, если какие-то асинхронные операции или отрисовка сбивают состояние
                 // Вызываем updateCurrentSectionUI снова, чтобы быть уверенным, что состояние сохранено
                 requestAnimationFrame(() => updateCurrentSectionUI(sectionId)); // <--- Вызов здесь, передаем sectionId
            }
        });
    });


    // --- Глобальная функция для закрытия модальных окон ---
    window.closeModal = function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
             // Используем ID группы
            if (modalId === 'table-modal') {
                 const statusSelectGroup = document.getElementById('table-status-group-modal');
                 if (statusSelectGroup) statusSelectGroup.style.display = 'block'; // Показываем обратно для нового столика
            }
        }
    }

    // --- Функция для показа сообщений в админке ---
    function showAdminMessage(message, type = 'success', duration = 5000) {
        let messageContainer = document.getElementById('admin-message-container');
        if (messageContainer) {
            messageContainer.remove();
        }

        messageContainer = document.createElement('div');
        messageContainer.id = 'admin-message-container';
        messageContainer.className = `message admin-message ${type}`;
        messageContainer.textContent = message;

        const mainContent = document.querySelector('.main-content');
        const mainHeader = document.querySelector('.main-header');
        if (mainContent && mainHeader) {
            mainContent.insertBefore(messageContainer, mainHeader.nextSibling);
        } else if (mainContent) {
            mainContent.insertBefore(messageContainer, mainContent.firstChild);
        } else {
            document.body.appendChild(messageContainer);
        }

        setTimeout(() => { messageContainer.style.opacity = '1'; }, 50);

        setTimeout(() => {
            if (messageContainer.parentNode) {
                messageContainer.style.opacity = '0';
                messageContainer.addEventListener('transitionend', function handler() {
                    messageContainer.removeEventListener('transitionend', handler);
                    if (messageContainer.parentNode) {
                        messageContainer.remove();
                    }
                });
            }
        }, duration);
    }


    // --- УПРАВЛЕНИЕ МЕНЮ ---
    async function loadMenuManagementContent() {
         const menuManagementSection = document.getElementById('menu-management-content');
         if (!menuManagementSection) return;

         // Проверяем, загружена ли уже структура по наличию ключевых элементов
         if (document.getElementById('categories-list') && document.getElementById('menu-items-list')) {
             // Структура уже есть, просто обновляем данные
             await fetchAndDisplayAdminCategories();
             await fetchAndDisplayAdminMenuItems();
             await populateCategoryDropdown();
             return;
         }

        // Генерируем структуру раздела, если ее нет
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

        // Загружаем и отображаем данные после создания структуры
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
             // Если контейнера нет, возможно, мы не в этом разделе
             // console.warn("Контейнер #categories-list не найден.");
             return;
        }
        categoriesListDiv.innerHTML = '<p>Загрузка категорий...</p>';

        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/categories`);
            if (!response.ok) throw new Error('Ошибка загрузки категорий');
            const categories = await response.json();

            if (categories.length === 0) {
                categoriesListDiv.innerHTML = '<p>Категории не найдены. Добавьте первую!</p>';
            } else {
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
                categoriesListDiv.innerHTML = ''; // Очищаем "Загрузка..."
                categoriesListDiv.appendChild(table);

                // Навешиваем обработчики на кнопки (на новую таблицу)
                table.querySelectorAll('.edit-category-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => openCategoryModal(e.target.dataset.id, e.target.dataset.name));
                });
                table.querySelectorAll('.delete-category-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => deleteCategory(e.target.dataset.id));
                });
            }


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
        setTimeout(() => document.getElementById('category-name').focus(), 50);
    }

    async function handleCategoryFormSubmit(event) {
        event.preventDefault();
        const id = document.getElementById('category-id').value;
        const name = document.getElementById('category-name').value.trim();
        const formButton = event.submitter;

        formButton.disabled = true;

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
            await populateCategoryDropdown();      // Обновляем ДРОПДАУН КАТЕГОРИЙ (т.к. категории изменились)
            showAdminMessage(id ? 'Категория успешно обновлена!' : 'Категория успешно добавлена!', 'success');

             // Найдем активную ссылку, чтобы получить sectionId
             const activeLink = document.querySelector('.sidebar-nav a.active');
             if(activeLink) {
                 const currentSectionId = activeLink.dataset.section;
                 // Принудительно обновляем UI текущего раздела после успешного действия
                 requestAnimationFrame(() => updateCurrentSectionUI(currentSectionId));
             } else {
                 console.warn("Нет активной ссылки после сохранения категории. Не удалось обновить UI.");
             }


        } catch (error) {
            console.error("Ошибка сохранения категории:", error);
            showAdminMessage(`Ошибка: ${error.message}`, 'error');
        } finally {
            formButton.disabled = false;
        }
    }

    async function deleteCategory(id) {
        if (!confirm('Вы уверены, что хотите удалить эту категорию? Это также удалит все связанные с ней блюда!')) return;

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
            await populateCategoryDropdown();      // Обновляем ДРОПДАУН КАТЕГОРИЙ (т.к. категории изменились)
            showAdminMessage('Категория успешно удалена!', 'success');

             // Найдем активную ссылку, чтобы получить sectionId
             const activeLink = document.querySelector('.sidebar-nav a.active');
             if(activeLink) {
                 const currentSectionId = activeLink.dataset.section;
                 // Принудительно обновляем UI текущего раздела после успешного действия
                 requestAnimationFrame(() => updateCurrentSectionUI(currentSectionId));
             } else {
                 console.warn("Нет активной ссылки после удаления категории. Не удалось обновить UI.");
             }

        } catch (error) {
            console.error("Ошибка удаления категории:", error);
            showAdminMessage(`Ошибка: ${error.message}`, 'error');
        }
    }


    // --- Позиции меню ---

    async function fetchAndDisplayAdminMenuItems() {
        const menuItemsListDiv = document.getElementById('menu-items-list');
         if (!menuItemsListDiv) {
             // Если контейнера нет, возможно, мы не в этом разделе
             // console.warn("Контейнер #menu-items-list не найден.");
             return;
         }
        menuItemsListDiv.innerHTML = '<p>Загрузка позиций меню...</p>';

        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/menu`);
            if (!response.ok) throw new Error('Ошибка загрузки позиций меню');
            const menuItems = await response.json();

            if (menuItems.length === 0) {
                menuItemsListDiv.innerHTML = '<p>Позиции меню не найдены. Добавьте первую!</p>';
            } else {
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
            }

        } catch (error) {
            console.error("Ошибка при загрузке позиций меню в админке:", error);
            menuItemsListDiv.innerHTML = `<p class="error-text">Ошибка: ${error.message}</p>`;
            showAdminMessage(`Ошибка загрузки позиций меню: ${error.message}`, 'error');
        }
    }

    async function populateCategoryDropdown() {
        const categorySelect = document.getElementById('menu-item-category');
        if (!categorySelect) {
             // Если элемента нет, возможно, мы не в разделе Меню
             // console.warn("Контейнер #menu-item-category не найден.");
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
            categorySelect.innerHTML = '<option value="">Ошибка загрузки категорий</option>';
        }
    }

    async function openMenuItemModal(id = null) {
        const modal = document.getElementById('menu-item-modal');
        const title = document.getElementById('menu-item-modal-title');
        const form = document.getElementById('menu-item-form');

        form.reset();
        document.getElementById('menu-item-id').value = id || '';

        await populateCategoryDropdown(); // Загружаем категории для дропдауна каждый раз

        title.textContent = id ? 'Редактировать позицию меню' : 'Добавить позицию меню';

        if (id) {
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
                closeModal('menu-item-modal'); // Закрываем модалку при ошибке
                return;
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
            //populateCategoryDropdown(); // Обновляем дропдаун категорий не нужно при изменении блюда
            showAdminMessage(id ? 'Позиция меню успешно обновлена!' : 'Позиция меню успешно добавлена!', 'success');

             // Найдем активную ссылку, чтобы получить sectionId
             const activeLink = document.querySelector('.sidebar-nav a.active');
             if(activeLink) {
                 const currentSectionId = activeLink.dataset.section;
                 // Принудительно обновляем UI текущего раздела после успешного действия
                 requestAnimationFrame(() => updateCurrentSectionUI(currentSectionId));
             } else {
                  console.warn("Нет активной ссылки после сохранения позиции меню. Не удалось обновить UI.");
             }


        } catch (error) {
            console.error("Ошибка сохранения позиции меню:", error);
            showAdminMessage(`Ошибка: ${error.message}`, 'error');
        } finally {
            formButton.disabled = false;
        }
    }

    async function deleteMenuItem(id) {
        if (!confirm('Вы уверены, что хотите удалить эту позицию меню?')) return;

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
             //populateCategoryDropdown(); // Обновляем дропдаун категорий не нужно при удалении блюда
            showAdminMessage('Позиция меню успешно удалена!', 'success');

             // Найдем активную ссылку, чтобы получить sectionId
             const activeLink = document.querySelector('.sidebar-nav a.active');
             if(activeLink) {
                 const currentSectionId = activeLink.dataset.section;
                 // Принудительно обновляем UI текущего раздела после успешного действия
                 requestAnimationFrame(() => updateCurrentSectionUI(currentSectionId));
             } else {
                 console.warn("Нет активной ссылки после удаления позиции меню. Не удалось обновить UI.");
             }


        } catch (error) {
            console.error("Ошибка удаления позиции меню:", error);
            showAdminMessage(`Ошибка: ${error.message}`, 'error');
        }
    }


    // --- УПРАВЛЕНИЕ ЗАКАЗАМИ ---

    async function loadOrdersManagementContent() {
        const ordersManagementSection = document.getElementById('orders-management-content');
         if (!ordersManagementSection) return;

         if (document.getElementById('orders-list')) {
             await fetchAndDisplayAdminOrders(); // Структура есть, просто обновляем данные
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
                 <button id="reset-order-filters-btn" class="btn btn-secondary btn-sm">Сбросить фильтры</button>
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

        const ordersListDiv = document.getElementById('orders-list');
        ordersListDiv.innerHTML = '<p>Загрузка заказов...</p>';

        await fetchAndDisplayAdminOrders();

        document.getElementById('apply-order-filters-btn').addEventListener('click', () => {
            const statusFilter = document.getElementById('order-status-filter').value;
            const dateFilter = document.getElementById('order-date-filter').value;
            fetchAndDisplayAdminOrders({ status: statusFilter, date: dateFilter });
        });
         document.getElementById('reset-order-filters-btn').addEventListener('click', () => {
            document.getElementById('order-status-filter').value = '';
            document.getElementById('order-date-filter').value = '';
            fetchAndDisplayAdminOrders({});
        });
    }

    async function fetchAndDisplayAdminOrders(filters = {}) {
        const ordersListDiv = document.getElementById('orders-list');
         if (!ordersListDiv) return; // Если контейнера нет

        // ordersListDiv.innerHTML = '<p>Загрузка заказов...</p>'; // Не стираем сразу при фильтрации/обновлении статуса

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
                            <td>${order.order_type === 'table' ? (order.table_number || 'N/A') : (order.pickup_time ? formatTime(order.pickup_time) : 'N/A')}</td>
                            <td>${parseFloat(order.total_amount).toFixed(2)} руб.</td>
                            <td>
                                <select class="order-status-select" data-order-id="${order.id}" data-previous-status="${order.status}">
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

            table.querySelectorAll('.order-status-select').forEach(select => {
                // Сохраняем текущее значение как "предыдущее" перед навешиванием обработчика
                select.dataset.previousStatus = select.value;
                select.addEventListener('change', (e) => {
                    updateOrderStatus(e.target.dataset.orderId, e.target.value, e.target);
                });
            });
            table.querySelectorAll('.view-order-details-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    openOrderDetailsModal(e.target.dataset.orderId);
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

         if (selectElement) {
             selectElement.dataset.previousStatus = selectElement.value; // Сохраняем текущее перед запросом
         }

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

            if (selectElement) {
                selectElement.dataset.previousStatus = newStatus; // Обновляем на новый статус при успехе
            }

             // Найдем активную ссылку, чтобы получить sectionId
             const activeLink = document.querySelector('.sidebar-nav a.active');
             if(activeLink) {
                 const currentSectionId = activeLink.dataset.section;
                 // Принудительно обновляем UI текущего раздела после успешного действия
                 requestAnimationFrame(() => updateCurrentSectionUI(currentSectionId));
             } else {
                  console.warn("Нет активной ссылки после обновления статуса заказа. Не удалось обновить UI.");
             }


        } catch (error) {
            console.error(`Ошибка при обновлении статуса заказа ${orderId}:`, error);
            showAdminMessage(`Ошибка: ${error.message}`, 'error');

            if (selectElement && oldStatus !== null) {
                selectElement.value = oldStatus;
                selectElement.dataset.previousStatus = oldStatus; // Возвращаем старый статус в data-атрибут
            }
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
                ${order.order_type === 'takeaway' ? 
                    `<p><strong>Время самовывоза:</strong> ${order.pickup_time ? formatTime(order.pickup_time) : 'N/A'}</p>` 
                : ''}
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
            closeModal('order-details-modal'); // Закрываем модалку при ошибке
        }
    }

    function formatTime(timeString) {
        if (!timeString) return 'N/A';
        // Проверяем, соответствует ли строка формату HH:MM
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (timeRegex.test(timeString)) {
            return timeString; // Просто возвращаем строку, если она в нужном формате
        } else {
            // Если формат другой (например, придет ISO), попробуем распарсить как дату
            try {
                const date = new Date(timeString);
                if (!isNaN(date.getTime())) { // Проверяем, что дата валидна
                     return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                }
            } catch (e) {
                console.error("Не удалось распарсить или отформатировать время:", timeString, e);
            }
             return timeString; // Возвращаем оригинальную строку или 'Некорректный формат времени'
        }
    }

    // --- УПРАВЛЕНИЕ СТОЛИКАМИ ---

    async function loadTablesManagementContent() {
        const tablesManagementSection = document.getElementById('tables-management-content');
         if (!tablesManagementSection) return;

         if (document.getElementById('tables-grid-display')) {
             await fetchAndDisplayAdminTables(); // Структура есть, просто обновляем данные
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
                        <div class="form-group" id="table-status-group-modal">
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

        const tablesGridDiv = document.getElementById('tables-grid-display');
        tablesGridDiv.innerHTML = '<p>Загрузка столиков...</p>';

        await fetchAndDisplayAdminTables();

        document.getElementById('add-table-btn').addEventListener('click', () => openTableModal());
        document.getElementById('table-form').addEventListener('submit', handleTableFormSubmit);
    }

    async function fetchAndDisplayAdminTables() {
        const tablesGridDiv = document.getElementById('tables-grid-display');
         if (!tablesGridDiv) return; // Если контейнера нет

        // tablesGridDiv.innerHTML = '<p>Загрузка столиков...</p>'; // Не стираем сразу

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
            } else {
                tablesGridDiv.innerHTML = '';
                const gridContainer = document.createElement('div');
                gridContainer.className = 'tables-grid-container';

                tables.forEach(table => {
                    const tableCard = document.createElement('div');
                    tableCard.className = `table-card status-${table.status}`;
                    tableCard.dataset.tableId = table.id;
                    tableCard.dataset.originalStatus = table.status;

                    tableCard.innerHTML = `
                        <div class="table-card-number">${table.table_number}</div>
                        <div class="table-card-status">
                            <select class="table-status-select-card" data-table-id="${table.id}" data-previous-status="${table.status}">
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

                    const statusSelect = tableCard.querySelector('.table-status-select-card');
                    statusSelect.addEventListener('change', (e) => {
                        const selectElement = e.target;
                        const tableId = selectElement.dataset.tableId;
                        const newStatus = selectElement.value;
                        const cardElement = selectElement.closest('.table-card');
                        updateTableStatus(tableId, newStatus, cardElement);
                    });
                    tableCard.querySelector('.edit-table-btn').addEventListener('click', (e) => {
                        const tableId = e.target.closest('.table-card').dataset.tableId;
                        const tableData = tables.find(t => String(t.id) === String(tableId));
                        if (tableData) {
                            openTableModal(tableData.id, tableData.table_number, tableData.status);
                        } else {
                            console.error("Данные столика для редактирования не найдены.");
                            showAdminMessage("Ошибка: Не удалось получить данные столика для редактирования.", 'error');
                        }
                    });
                    tableCard.querySelector('.delete-table-btn').addEventListener('click', (e) => {
                        const tableId = e.target.closest('.table-card').dataset.tableId;
                        deleteTable(tableId);
                    });
                });
                tablesGridDiv.appendChild(gridContainer);
            }


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
        const statusSelectGroup = document.getElementById('table-status-group-modal');

        form.reset();
        document.getElementById('table-id').value = id || '';
        document.getElementById('table-number-input').value = number || '';

        if (statusSelectGroup) {
             statusSelectGroup.style.display = id ? 'none' : 'block';
             if (!id) {
                  document.getElementById('table-status-select-modal').value = status || 'free';
             }
        }


        title.textContent = id ? 'Редактировать столик' : 'Добавить столик';
        modal.style.display = 'block';
        setTimeout(() => document.getElementById('table-number-input').focus(), 50);
    }

    async function handleTableFormSubmit(event) {
        event.preventDefault();
        const id = document.getElementById('table-id').value;
        const table_number = document.getElementById('table-number-input').value.trim();
        const status = document.getElementById('table-status-select-modal').value;
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

        if (id) {
            method = 'PUT';
            url = `${API_BASE_URL_ADMIN}/tables/${id}`;
        } else {
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

             // Найдем активную ссылку, чтобы получить sectionId
             const activeLink = document.querySelector('.sidebar-nav a.active');
             if(activeLink) {
                 const currentSectionId = activeLink.dataset.section;
                 // Принудительно обновляем UI текущего раздела после успешного действия
                 requestAnimationFrame(() => updateCurrentSectionUI(currentSectionId));
             } else {
                  console.warn("Нет активной ссылки после сохранения столика. Не удалось обновить UI.");
             }


        } catch (error) {
            console.error("Ошибка сохранения столика:", error);
            showAdminMessage(`Ошибка: ${error.message}`, 'error');
        } finally {
            formButton.disabled = false;
        }
    }

    async function updateTableStatus(tableId, newStatus, tableCardElement) {
        const authToken = localStorage.getItem('authToken');
        const selectElement = tableCardElement ? tableCardElement.querySelector('.table-status-select-card') : null;
        const oldStatus = selectElement ? selectElement.dataset.previousStatus : null;

        if (selectElement) {
             selectElement.dataset.previousStatus = selectElement.value; // Сохраняем текущее перед запросом
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
                throw new Error(responseData.message || `Ошибка обновления статуса столика: ${response.status}`);
            }

            const updatedTable = responseData;
            console.log('Статус столика обновлен:', updatedTable);
            showAdminMessage('Статус столика успешно обновлен!', 'success');

            if (tableCardElement) {
                tableCardElement.classList.remove(...Array.from(tableCardElement.classList).filter(cls => cls.startsWith('status-')));
                tableCardElement.classList.add(`status-${updatedTable.status}`);
                tableCardElement.dataset.originalStatus = updatedTable.status;
            }
             if (selectElement) {
                 selectElement.dataset.previousStatus = newStatus; // Обновляем на новый статус при успехе
             }

             // Найдем активную ссылку, чтобы получить sectionId
             const activeLink = document.querySelector('.sidebar-nav a.active');
             if(activeLink) {
                 const currentSectionId = activeLink.dataset.section;
                 // Принудительно обновляем UI текущего раздела после успешного действия
                 requestAnimationFrame(() => updateCurrentSectionUI(currentSectionId));
             } else {
                  console.warn("Нет активной ссылки после обновления статуса столика. Не удалось обновить UI.");
             }


        } catch (error) {
            console.error(`Ошибка при обновлении статуса столика ${tableId}:`, error);
            showAdminMessage(`Ошибка: ${error.message}`, 'error');

            // Откатываем UI, если была ошибка
            if (selectElement && oldStatus !== null) {
                selectElement.value = oldStatus;
                selectElement.dataset.previousStatus = oldStatus; // Возвращаем старый статус в data-атрибут

                if (tableCardElement) {
                    const originalStatus = tableCardElement.dataset.originalStatus;
                    tableCardElement.classList.remove(...Array.from(tableCardElement.classList).filter(cls => cls.startsWith('status-')));
                    if (originalStatus) tableCardElement.classList.add(`status-${originalStatus}`);
                }
            }
        }
    }

    async function deleteTable(id) {
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

             // Найдем активную ссылку, чтобы получить sectionId
             const activeLink = document.querySelector('.sidebar-nav a.active');
             if(activeLink) {
                 const currentSectionId = activeLink.dataset.section;
                 // Принудительно обновляем UI текущего раздела после успешного действия
                 requestAnimationFrame(() => updateCurrentSectionUI(currentSectionId));
             } else {
                  console.warn("Нет активной ссылки после удаления столика. Не удалось обновить UI.");
             }


        } catch (error) {
            console.error("Ошибка удаления столика:", error);
            showAdminMessage(`Ошибка: ${error.message}`, 'error');
        }
    }


    // --- Инициализация ---
    // Находим ПЕРВУЮ ссылку навигации и имитируем клик по ней
    // Это загрузит контент для первого доступного раздела по умолчанию.
    findAndActivateFirstSection(); // Вызываем новую функцию
});