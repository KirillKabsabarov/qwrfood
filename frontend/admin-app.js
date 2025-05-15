// frontend/admin-app.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: Admin app started."); // Лог начала

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
        console.warn("Токен или данные пользователя отсутствуют. Перенаправление на страницу входа."); // Лог
        window.location.href = 'admin-login.html';
        return; // Прекращаем выполнение скрипта
    }

    // Отображение имени пользователя
    const adminUsernameElement = document.getElementById('admin-username');
    if (adminUsernameElement && authUser.username) {
        adminUsernameElement.textContent = authUser.username;
    } else {
        console.warn("Элемент для имени пользователя не найден или данные пользователя неполны."); // Лог
    }


    // --- Переменные и DOM элементы ---
    const logoutButton = document.getElementById('logout-button');
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const contentSections = document.querySelectorAll('.content-section');
    const currentSectionTitleElement = document.getElementById('current-section-title');

    //const API_BASE_URL_ADMIN = 'http://localhost:3001/api';
    const API_BASE_URL_ADMIN = 'https://qrfood-backend.onrender.com/api';
    const API_BASE_URL = 'https://qrfood-backend.onrender.com/api';
    // --- Переменная для отслеживания текущего активного раздела ---
    let currentActiveSectionId = null; // Инициализируем как null


    // --- Функция для принудительного обновления UI текущего раздела ---
    // Принимает sectionId для явного указания, какой раздел активировать
    function updateCurrentSectionUI(sectionIdToActivate) {
        if (!sectionIdToActivate) {
            console.error("updateCurrentSectionUI called without a sectionId."); // Лог ошибки
            return;
        }
        const targetContentId = `${sectionIdToActivate}-content`;
        const targetSection = document.getElementById(targetContentId);
        const targetNavLink = document.querySelector(`.sidebar-nav a[data-section="${sectionIdToActivate}"]`);

        if (!targetSection) {
            console.error(`updateCurrentSectionUI: Content element for section #${targetContentId} not found.`); // Лог ошибки
            return; // Не можем активировать несуществующий раздел
        }

        console.log(`updateCurrentSectionUI: Активация UI для раздела: ${sectionIdToActivate}`); // Лог

        // 1. Управление видимостью секций контента
        contentSections.forEach(section => {
            if (section.id === targetContentId) {
                section.classList.add('active-section');
                // Явно устанавливаем display: block, чтобы перекрыть возможные стили
                section.style.display = 'block'; // <<< ЯВНОЕ УПРАВЛЕНИЕ ВИДИМОСТЬЮ
            } else {
                section.classList.remove('active-section');
                // Явно устанавливаем display: none
                section.style.display = 'none'; // <<< ЯВНОЕ УПРАВЛЕНИЕ ВИДИМОСТЬЮ
            }
        });

        // 2. Управление активным состоянием ссылок
        navLinks.forEach(navLink => navLink.classList.remove('active'));
        if (targetNavLink) {
            targetNavLink.classList.add('active');
            // 3. Обновление заголовка секции на основе текста активной ссылки
            currentSectionTitleElement.textContent = targetNavLink.textContent;
        } else {
            console.warn(`updateCurrentSectionUI: Навигационная ссылка для раздела ${sectionIdToActivate} не найдена.`); // Лог
            // Fallback для заголовка
            currentSectionTitleElement.textContent = `${sectionIdToActivate.replace('-', ' ').replace('management', 'Управление').replace('overview', 'Обзор')} (Нет ссылки)`;
        }
    }

    // --- Вспомогательная функция для поиска и активации первого раздела ---
    function findAndActivateFirstSection() {
        const firstLink = document.querySelector('.sidebar-nav a');
        if (firstLink) {
            console.log("findAndActivateFirstSection: Активация первого раздела при загрузке."); // Лог
            // Имитируем клик через requestAnimationFrame для правильной отрисовки
            requestAnimationFrame(() => {
                if (firstLink) { // Проверка на случай удаления элемента за время RAF
                    firstLink.click(); // Этот клик вызовет обработчик навигации ниже
                }
            });
        } else {
            console.error("findAndActivateFirstSection: Нет навигационных ссылок в сайдбаре для активации."); // Лог ошибки
            // Возможно, показать сообщение об ошибке пользователю
        }
    }


    // --- Обработчики основных событий ---

    // Обработчик выхода
    logoutButton.addEventListener('click', () => {
        console.log("Logout button clicked."); // Лог
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        window.location.href = 'admin-login.html';
    });

    // Обработчик навигации по разделам
    navLinks.forEach(link => {
        link.addEventListener('click', async (event) => {
            event.preventDefault();

            const sectionId = link.dataset.section;
            const targetContentElement = document.getElementById(`${sectionId}-content`);

            console.log(`Nav click: Переход к разделу: ${sectionId}`); // Лог

            // === 1. Устанавливаем текущий активный раздел и обновляем UI немедленно ===
            currentActiveSectionId = sectionId; // <<< УСТАНАВЛИВАЕМ ПЕРЕМЕННУЮ
            updateCurrentSectionUI(sectionId); // <<< ОБНОВЛЯЕМ UI СРАЗУ

            // === 2. Загрузка/обновление контента для секции ===
            // Проверяем, загружена ли уже структура раздела с помощью data-атрибута
            const sectionContentLoaded = targetContentElement && targetContentElement.dataset.loaded === 'true';

            try {
                if (sectionId === 'menu-management') {
                    if (!sectionContentLoaded) {
                        console.log("Nav click: Загрузка структуры и данных для Управления меню."); // Лог
                        await loadMenuManagementContent(); // Эта функция сгенерирует структуру и вызовет fetchAndDisplay
                        if (targetContentElement) targetContentElement.dataset.loaded = 'true'; // Устанавливаем флаг
                    } else {
                        console.log("Nav click: Структура Управления меню уже загружена, обновляем данные."); // Лог
                        // Структура уже есть, просто обновляем данные
                        // fetchAndDisplay вызовет updateCurrentSectionUI в конце
                        await fetchAndDisplayAdminCategories();
                        await fetchAndDisplayAdminMenuItems();
                        await populateCategoryDropdown(); // Обновляем дропдаун на всякий случай
                    }
                } else if (sectionId === 'orders-management') {
                    if (!sectionContentLoaded) {
                        console.log("Nav click: Загрузка структуры и данных для Заказов."); // Лог
                        await loadOrdersManagementContent(); // Эта функция сгенерирует структуру и вызовет fetchAndDisplay
                        if (targetContentElement) targetContentElement.dataset.loaded = 'true'; // Устанавливаем флаг
                    } else {
                        console.log("Nav click: Структура Заказов уже загружена, обновляем данные."); // Лог
                        // fetchAndDisplay вызовет updateCurrentSectionUI в конце
                        await fetchAndDisplayAdminOrders({}); // При переходе просто обновляем все заказы
                    }
                } else if (sectionId === 'tables-management') {
                    if (!sectionContentLoaded) {
                        console.log("Nav click: Загрузка структуры и данных для Столиков."); // Лог
                        await loadTablesManagementContent(); // Эта функция сгенерирует структуру и вызовет fetchAndDisplay
                        if (targetContentElement) targetContentElement.dataset.loaded = 'true'; // Устанавливаем флаг
                    } else {
                        console.log("Nav click: Структура Столиков уже загружена, обновляем данные."); // Лог
                        // fetchAndDisplay вызовет updateCurrentSectionUI в конце
                        await fetchAndDisplayAdminTables();
                    }
                }
                // Добавить другие разделы по аналогии
                // Раздел "Обзор" удален, его логика больше не нужна

            } catch (error) {
                console.error(`Nav click: Ошибка при загрузке контента для раздела ${sectionId}:`, error); // Лог ошибки
                showAdminMessage(`Не удалось загрузить контент для раздела "${link.textContent}": ${error.message}`, 'error');
                // Даже при ошибке загрузки данных, пытаемся восстановить видимость раздела
                updateCurrentSectionUI(currentActiveSectionId); // ВОССТАНОВЛЕНИЕ UI
            }

            console.log(`Nav click: Обработчик клика для ${sectionId} завершен.`); // Лог
        });
    });


    // --- Глобальная функция для закрытия модальных окон ---
    window.closeModal = function (modalId) {
        console.log(`Closing modal: ${modalId}`); // Лог
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
            // Используем ID группы для формы столика
            if (modalId === 'table-modal') {
                const statusSelectGroup = document.getElementById('table-status-group-modal');
                // Показываем поле статуса обратно при закрытии, чтобы оно было видно при добавлении нового столика
                if (statusSelectGroup) statusSelectGroup.style.display = 'block';
            }
        }
    }

    // --- Функция для показа сообщений в админке ---
    function showAdminMessage(message, type = 'success', duration = 5000) {
        console.log(`Showing admin message (${type}): ${message}`); // Лог
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
            // Вставляем после заголовка
            mainContent.insertBefore(messageContainer, mainHeader.nextSibling);
        } else if (mainContent) {
            // Вставляем в начало контента
            mainContent.insertBefore(messageContainer, mainContent.firstChild);
        } else {
            // Вставляем в конец body как запасной вариант
            document.body.appendChild(messageContainer);
        }

        // Маленькая задержка для анимации opacity
        requestAnimationFrame(() => {
            messageContainer.style.opacity = '1';
        });


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
    // loadMenuManagementContent теперь только генерирует структуру при первом вызове
    async function loadMenuManagementContent() {
        const menuManagementSection = document.getElementById('menu-management-content');
        if (!menuManagementSection || menuManagementSection.dataset.loaded === 'true') {
            console.log("loadMenuManagementContent: Structure already loaded or element not found."); // Лог
            return; // Если уже загружено или элемента нет, ничего не делаем
        }

        console.log("loadMenuManagementContent: Generating structure..."); // Лог
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

        menuManagementSection.dataset.loaded = 'true'; // Устанавливаем флаг после создания структуры

        // Навешиваем обработчики на кнопки "Добавить" и формы (они теперь существуют)
        document.getElementById('add-category-btn').addEventListener('click', () => openCategoryModal());
        document.getElementById('add-menu-item-btn').addEventListener('click', () => openMenuItemModal());
        document.getElementById('category-form').addEventListener('submit', handleCategoryFormSubmit);
        document.getElementById('menu-item-form').addEventListener('submit', handleMenuItemFormSubmit);

        // Теперь загружаем и отображаем данные после создания структуры
        await fetchAndDisplayAdminCategories(); // fetchAndDisplay... вызовет updateCurrentSectionUI в конце
        await fetchAndDisplayAdminMenuItems(); // fetchAndDisplay... вызовет updateCurrentSectionUI в конце
        await populateCategoryDropdown(); // Просто загрузка данных в дропдаун, не влияет на UI секций

        console.log("loadMenuManagementContent: Structure and initial data loaded."); // Лог
    }


    async function fetchAndDisplayAdminCategories() {
        const categoriesListDiv = document.getElementById('categories-list');
        if (!categoriesListDiv) {
            console.warn("fetchAndDisplayAdminCategories: Контейнер #categories-list не найден."); // Лог
            return;
        }
        console.log("fetchAndDisplayAdminCategories: Загрузка и отображение категорий..."); // Лог
        categoriesListDiv.innerHTML = '<p>Загрузка категорий...</p>'; // Показываем индикатор загрузки

        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/categories`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ message: 'Ошибка загрузки категорий' }));
                throw new Error(errData.message || `Ошибка сервера: ${response.status}`);
            }
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

            console.log("fetchAndDisplayAdminCategories: Успех. Повторно применяем активное состояние UI."); // Лог
            // --- В КОНЦЕ УСПЕШНОГО ОТОБРАЖЕНИЯ ДАННЫХ ---
            // Используем RAF, чтобы убедиться, что DOM обновился после innerHTML
            requestAnimationFrame(() => {
                if (currentActiveSectionId) { // Проверяем, установлен ли раздел
                    updateCurrentSectionUI(currentActiveSectionId); // <<< ЯВНО ВОССТАНАВЛИВАЕМ UI
                }
            });

        } catch (error) {
            console.error("fetchAndDisplayAdminCategories: Ошибка при загрузке категорий:", error); // Лог ошибки
            categoriesListDiv.innerHTML = `<p class="error-text">Ошибка: ${error.message}</p>`;
            showAdminMessage(`Ошибка загрузки категорий: ${error.message}`, 'error');

            // --- ВОССТАНАВЛИВАЕМ UI ДАЖЕ ПРИ ОШИБКЕ ЗАГРУЗКИ ДАННЫХ ---
            requestAnimationFrame(() => {
                if (currentActiveSectionId) {
                    updateCurrentSectionUI(currentActiveSectionId); // <<< ЯВНО ВОССТАНАВЛИВАЕМ UI
                }
            });
        }
    }

    function openCategoryModal(id = null, name = '') {
        console.log(`openCategoryModal: ID=${id}`); // Лог
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
        console.log(`handleCategoryFormSubmit: Отправка формы (${id ? 'Ред' : 'Доб'}).`); // Лог

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
            showAdminMessage(id ? 'Категория успешно обновлена!' : 'Категория успешно добавлена!', 'success');

            // --- ОБНОВЛЯЕМ ДАННЫЕ ПОСЛЕ УСПЕХА ---
            // fetchAndDisplayAdminCategories в конце вызовет updateCurrentSectionUI(currentActiveSectionId)
            await fetchAndDisplayAdminCategories();
            await populateCategoryDropdown(); // Обновляем дропдаун, т.к. категории изменились

            console.log("handleCategoryFormSubmit: Успех."); // Лог

        } catch (error) {
            console.error("handleCategoryFormSubmit: Ошибка сохранения категории:", error); // Лог ошибки
            showAdminMessage(`Ошибка: ${error.message}`, 'error');
            // При ошибке, обновляем данные (если возможно) и восстанавливаем UI
            requestAnimationFrame(() => {
                if (currentActiveSectionId) {
                    // Можно попробовать обновить данные, чтобы показать актуальное состояние (если ошибка не в fetch)
                    // fetchAndDisplayAdminCategories(); // Или вызвать только updateCurrentSectionUI
                    updateCurrentSectionUI(currentActiveSectionId);
                }
            });

        } finally {
            formButton.disabled = false;
        }
    }

    async function deleteCategory(id) {
        console.log(`deleteCategory: ID=${id}`); // Лог
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

            showAdminMessage('Категория успешно удалена!', 'success');

            // --- ОБНОВЛЯЕМ ДАННЫЕ ПОСЛЕ УСПЕХА ---
            // fetchAndDisplayAdminCategories в конце вызовет updateCurrentSectionUI(currentActiveSectionId)
            await fetchAndDisplayAdminCategories();
            await populateCategoryDropdown(); // Обновляем дропдаун, т.к. категории изменились

            console.log("deleteCategory: Успех."); // Лог

        } catch (error) {
            console.error("deleteCategory: Ошибка удаления категории:", error); // Лог ошибки
            showAdminMessage(`Ошибка: ${error.message}`, 'error');
            // При ошибке, обновляем данные (если возможно) и восстанавливаем UI
            requestAnimationFrame(() => {
                if (currentActiveSectionId) {
                    // fetchAndDisplayAdminCategories(); // Можно попробовать обновить данные
                    updateCurrentSectionUI(currentActiveSectionId);
                }
            });
        }
    }


    // --- Позиции меню ---

    async function fetchAndDisplayAdminMenuItems() {
        const menuItemsListDiv = document.getElementById('menu-items-list');
        if (!menuItemsListDiv) {
            console.warn("fetchAndDisplayAdminMenuItems: Контейнер #menu-items-list не найден."); // Лог
            return;
        }
        console.log("fetchAndDisplayAdminMenuItems: Загрузка и отображение позиций меню..."); // Лог
        menuItemsListDiv.innerHTML = '<p>Загрузка позиций меню...</p>'; // Показываем индикатор загрузки

        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/menu`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ message: 'Ошибка загрузки позиций меню' }));
                throw new Error(errData.message || `Ошибка сервера: ${response.status}`);
            }
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

            console.log("fetchAndDisplayAdminMenuItems: Успех. Повторно применяем активное состояние UI."); // Лог
            // --- В КОНЦЕ УСПЕШНОГО ОТОБРАЖЕНИЯ ДАННЫХ ---
            requestAnimationFrame(() => { // Используем RAF
                if (currentActiveSectionId) {
                    updateCurrentSectionUI(currentActiveSectionId); // <<< ЯВНО ВОССТАНАВЛИВАЕМ UI
                }
            });


        } catch (error) {
            console.error("fetchAndDisplayAdminMenuItems: Ошибка при загрузке позиций меню:", error); // Лог ошибки
            menuItemsListDiv.innerHTML = `<p class="error-text">Ошибка: ${error.message}</p>`;
            showAdminMessage(`Ошибка загрузки позиций меню: ${error.message}`, 'error');
            // --- ВОССТАНАВЛИВАЕМ UI ДАЖЕ ПРИ ОШИБКЕ ---
            requestAnimationFrame(() => {
                if (currentActiveSectionId) {
                    updateCurrentSectionUI(currentActiveSectionId); // <<< ЯВНО ВОССТАНАВЛИВАЕМ UI
                }
            });
        }
    }

    async function populateCategoryDropdown() {
        const categorySelect = document.getElementById('menu-item-category');
        if (!categorySelect) {
            console.warn("populateCategoryDropdown: Контейнер #menu-item-category не найден."); // Лог
            return;
        }
        console.log("populateCategoryDropdown: Загрузка категорий для дропдауна..."); // Лог

        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/categories`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ message: 'Ошибка загрузки категорий' }));
                throw new Error(errData.message || `Ошибка сервера: ${response.status}`);
            }
            const categories = await response.json();

            categorySelect.innerHTML = '<option value="">-- Выберите категорию --</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                categorySelect.appendChild(option);
            });
            console.log("populateCategoryDropdown: Успех."); // Лог
        } catch (error) {
            console.error("populateCategoryDropdown: Ошибка:", error); // Лог ошибки
            categorySelect.innerHTML = '<option value="">Ошибка загрузки категорий</option>';
            showAdminMessage(`Ошибка загрузки категорий для формы: ${error.message}`, 'error');
        }
    }

    async function openMenuItemModal(id = null) {
        console.log(`openMenuItemModal: ID=${id}`); // Лог
        const modal = document.getElementById('menu-item-modal');
        const title = document.getElementById('menu-item-modal-title');
        const form = document.getElementById('menu-item-form');

        form.reset();
        document.getElementById('menu-item-id').value = id || '';

        // Всегда загружаем категории для дропдауна при открытии модалки
        await populateCategoryDropdown();

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
                    console.warn(`openMenuItemModal: Категория с ID ${itemData.category_id} для блюда ${itemData.name} не найдена в дропдауне.`); // Лог предупреждения
                }
                document.getElementById('menu-item-image-url').value = itemData.image_url || '';
                console.log(`openMenuItemModal: Loaded data for ID=${id}`); // Лог
            } catch (error) {
                console.error("openMenuItemModal: Ошибка загрузки данных блюда для редактирования:", error); // Лог ошибки
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
        console.log(`handleMenuItemFormSubmit: Отправка формы (${id ? 'Ред' : 'Доб'}).`); // Лог


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
            showAdminMessage(id ? 'Позиция меню успешно обновлена!' : 'Позиция меню успешно добавлена!', 'success');

            // --- ОБНОВЛЯЕМ ДАННЫЕ ПОСЛЕ УСПЕХА ---
            // fetchAndDisplayAdminMenuItems в конце вызовет updateCurrentSectionUI(currentActiveSectionId)
            await fetchAndDisplayAdminMenuItems();
            // populateCategoryDropdown не нужен после изменения блюда

            console.log("handleMenuItemFormSubmit: Успех."); // Лог

        } catch (error) {
            console.error("handleMenuItemFormSubmit: Ошибка сохранения позиции меню:", error); // Лог ошибки
            showAdminMessage(`Ошибка: ${error.message}`, 'error');
            // При ошибке, обновляем данные (если возможно) и восстанавливаем UI
            requestAnimationFrame(() => {
                if (currentActiveSectionId) {
                    // fetchAndDisplayAdminMenuItems(); // Можно попробовать обновить данные
                    updateCurrentSectionUI(currentActiveSectionId);
                }
            });
        } finally {
            formButton.disabled = false;
        }
    }

    async function deleteMenuItem(id) {
        console.log(`deleteMenuItem: ID=${id}`); // Лог
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

            showAdminMessage('Позиция меню успешно удалена!', 'success');

            // --- ОБНОВЛЯЕМ ДАННЫЕ ПОСЛЕ УСПЕХА ---
            // fetchAndDisplayAdminMenuItems в конце вызовет updateCurrentSectionUI(currentActiveSectionId)
            await fetchAndDisplayAdminMenuItems();
            // populateCategoryDropdown не нужен после удаления блюда

            console.log("deleteMenuItem: Успех."); // Лог

        } catch (error) {
            console.error("deleteMenuItem: Ошибка удаления позиции меню:", error); // Лог ошибки
            showAdminMessage(`Ошибка: ${error.message}`, 'error');
            // При ошибке, обновляем данные (если возможно) и восстанавливаем UI
            requestAnimationFrame(() => {
                if (currentActiveSectionId) {
                    // fetchAndDisplayAdminMenuItems(); // Можно попробовать обновить данные
                    updateCurrentSectionUI(currentActiveSectionId);
                }
            });
        }
    }


    // --- УПРАВЛЕНИЕ ЗАКАЗАМИ ---

    async function loadOrdersManagementContent() {
        const ordersManagementSection = document.getElementById('orders-management-content');
        if (!ordersManagementSection || ordersManagementSection.dataset.loaded === 'true') {
            console.log("loadOrdersManagementContent: Structure already loaded or element not found."); // Лог
            return; // Если уже загружено или элемента нет, ничего не делаем
        }

        console.log("loadOrdersManagementContent: Generating structure..."); // Лог

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

        ordersManagementSection.dataset.loaded = 'true'; // Устанавливаем флаг после создания структуры

        // Навешиваем обработчики на фильтры (они теперь существуют)
        document.getElementById('apply-order-filters-btn').addEventListener('click', () => {
            const statusFilter = document.getElementById('order-status-filter').value;
            const dateFilter = document.getElementById('order-date-filter').value;
            console.log(`Applying order filters: status=${statusFilter}, date=${dateFilter}`); // Лог
            fetchAndDisplayAdminOrders({ status: statusFilter, date: dateFilter }); // fetchAndDisplay... вызовет updateCurrentSectionUI
        });
        document.getElementById('reset-order-filters-btn').addEventListener('click', () => {
            console.log("Resetting order filters."); // Лог
            document.getElementById('order-status-filter').value = '';
            document.getElementById('order-date-filter').value = '';
            fetchAndDisplayAdminOrders({}); // fetchAndDisplay... вызовет updateCurrentSectionUI
        });


        const ordersListDiv = document.getElementById('orders-list');
        ordersListDiv.innerHTML = '<p>Загрузка заказов...</p>'; // Показываем индикатор загрузки

        // Загружаем и отображаем данные после создания структуры
        await fetchAndDisplayAdminOrders({}); // fetchAndDisplay... вызовет updateCurrentSectionUI в конце

        console.log("loadOrdersManagementContent: Structure and initial data loaded."); // Лог

    }

    async function fetchAndDisplayAdminOrders(filters = {}) {
        const ordersListDiv = document.getElementById('orders-list');
        if (!ordersListDiv) {
            console.warn("fetchAndDisplayAdminOrders: Контейнер #orders-list не найден."); // Лог
            return;
        }
        console.log("fetchAndDisplayAdminOrders: Загрузка и отображение заказов...", filters); // Лог
        // Не стираем сразу при фильтрации/обновлении статуса, только при первой загрузке
        if (!ordersListDiv.querySelector('table.admin-table')) {
            ordersListDiv.innerHTML = '<p>Загрузка заказов...</p>';
        }


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
            } else {
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
                ordersListDiv.innerHTML = ''; // Очищаем "Загрузка..."
                ordersListDiv.appendChild(table);

                // Навешиваем обработчики на элементы внутри таблицы (они теперь существуют)
                table.querySelectorAll('.order-status-select').forEach(select => {
                    // Сохраняем текущее значение как "предыдущее" перед навешиванием обработчика
                    select.dataset.previousStatus = select.value;
                    select.addEventListener('change', (e) => {
                        updateOrderStatus(e.target.dataset.orderId, e.target.value, e.target); // updateOrderStatus вызовет fetchAndDisplayOrders в конце
                    });
                });
                table.querySelectorAll('.view-order-details-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        openOrderDetailsModal(e.target.dataset.orderId);
                    });
                });

            }

            console.log("fetchAndDisplayAdminOrders: Успех. Повторно применяем активное состояние UI."); // Лог
            // --- В КОНЦЕ УСПЕШНОГО ОТОБРАЖЕНИЯ ДАННЫХ ---
            requestAnimationFrame(() => { // Используем RAF
                if (currentActiveSectionId) {
                    updateCurrentSectionUI(currentActiveSectionId); // <<< ЯВНО ВОССТАНАВЛИВАЕМ UI
                }
            });


        } catch (error) {
            console.error("fetchAndDisplayAdminOrders: Ошибка при загрузке заказов:", error); // Лог ошибки
            ordersListDiv.innerHTML = `<p class="error-text">Ошибка: ${error.message}</p>`;
            showAdminMessage(`Ошибка загрузки заказов: ${error.message}`, 'error');
            // --- ВОССТАНАВЛИВАЕМ UI ДАЖЕ ПРИ ОШИБКЕ ---
            requestAnimationFrame(() => {
                if (currentActiveSectionId) {
                    updateCurrentSectionUI(currentActiveSectionId); // <<< ЯВНО ВОССТАНАВЛИВАЕМ UI
                }
            });
        }
    }

    async function updateOrderStatus(orderId, newStatus, selectElement) {
        console.log(`Action: Attempting to update order status. Order ID=${orderId}, newStatus=${newStatus}`); // Лог

        const authToken = localStorage.getItem('authToken');
        // Сохраняем предыдущий статус из data-атрибута selectElement (передается из fetchAndDisplay)
        const oldStatus = selectElement ? selectElement.dataset.previousStatus : null;

        // Оптимистичное обновление UI (до отправки запроса) - опционально, но может улучшить отзывчивость
        // const originalSelectValue = selectElement.value;
        // if(selectElement) selectElement.value = newStatus;

        // Сохраняем текущее выбранное значение как "предыдущее" перед запросом
        // В случае ошибки, мы откатимся на это значение
        if (selectElement) {
            selectElement.dataset.previousStatus = selectElement.value;
            console.log(`UI: Temporarily set previous status for order ${orderId} to ${selectElement.value}.`); // Лог
        }


        try {
            console.log(`API: Sending PUT request to ${API_BASE_URL_ADMIN}/orders/${orderId}/status with data:`, { status: newStatus }); // Лог запроса
            const response = await fetch(`${API_BASE_URL_ADMIN}/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            const responseData = await response.json().catch(() => ({}));
            console.log(`API: Received response for PUT orders/${orderId}/status. Status: ${response.status}. Data:`, responseData); // Лог ответа

            if (!response.ok) {
                console.error("API Error: Update order status failed.", responseData); // Лог ошибки API
                // Откатываем UI, если оптимистично обновляли
                // if(selectElement) selectElement.value = originalSelectValue;
                throw new Error(responseData.message || `Ошибка обновления статуса: ${response.status}`);
            }

            // Предполагаем, что бэкенд возвращает обновленный заказ или подтверждение
            console.log('Action: Статус заказа успешно обновлен:', responseData); // Лог успеха
            showAdminMessage('Статус заказа успешно обновлен!', 'success');

            // --- ОБНОВЛЯЕМ UI ЛОКАЛЬНО ВМЕСТО ПЕРЕЗАГРУЗКИ СПИСКА ---
            if (selectElement) {
                // Если мы не делали оптимистичное обновление, устанавливаем значение сейчас
                selectElement.value = newStatus;
                selectElement.dataset.previousStatus = newStatus; // Обновляем на новый статус при успехе
                console.log(`UI: Updated status select for order ${orderId} to ${newStatus}.`); // Лог UI обновления
            }
            // *** ВАЖНО: НЕ ВЫЗЫВАЕМ fetchAndDisplayAdminOrders ЗДЕСЬ ***

            // UI текущего раздела уже активен.
            // После локального обновления DOM, можно еще раз вызвать updateCurrentSectionUI
            // на всякий случай, чтобы убедиться в видимости.
            requestAnimationFrame(() => {
                if (currentActiveSectionId) {
                    console.log("Action: updateOrderStatus success, reapplying active UI state."); // Лог
                    updateCurrentSectionUI(currentActiveSectionId);
                } else {
                    console.warn("Action: updateOrderStatus success, but currentActiveSectionId is null."); // Лог
                }
            });


        } catch (error) {
            console.error(`Action Error: Ошибка при обновлении статуса заказа ${orderId}:`, error); // Лог ошибки выполнения
            showAdminMessage(`Ошибка: ${error.message}`, 'error');

            // Откатываем UI, если была ошибка (и selectElement существует)
            if (selectElement && oldStatus !== null) {
                selectElement.value = oldStatus; // Визуально откатываем select
                selectElement.dataset.previousStatus = oldStatus; // Возвращаем старый статус в data-атрибут select
                console.log(`UI: Rolled back status select for order ${orderId} to ${oldStatus} due to error.`); // Лог отката UI
            }
            // При ошибке, явно восстанавливаем UI текущего раздела
            requestAnimationFrame(() => {
                if (currentActiveSectionId) {
                    console.log("Action: updateOrderStatus error, reapplying active UI state."); // Лог
                    updateCurrentSectionUI(currentActiveSectionId);
                } else {
                    console.warn("Action: updateOrderStatus error, but currentActiveSectionId is null."); // Лог
                }
            });
        }
    }

    async function openOrderDetailsModal(orderId) {
        console.log(`openOrderDetailsModal: Order ID=${orderId}`); // Лог
        const modal = document.getElementById('order-details-modal');
        const titleOrderIdSpan = document.getElementById('details-order-id');
        const contentDiv = document.getElementById('order-details-content');
        const authToken = localStorage.getItem('authToken');

        titleOrderIdSpan.textContent = orderId;
        contentDiv.innerHTML = '<p>Загрузка деталей...</p>'; // Показываем индикатор загрузки
        modal.style.display = 'block';
        // Даем фокус кнопке закрытия для доступности
        requestAnimationFrame(() => {
            const closeBtn = modal.querySelector('.close-btn');
            if (closeBtn) closeBtn.focus();
        });


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
            console.log(`openOrderDetailsModal: Loaded details for Order ID=${orderId}`); // Лог

        } catch (error) {
            console.error("openOrderDetailsModal: Ошибка при загрузке деталей заказа:", error); // Лог ошибки
            contentDiv.innerHTML = `<p class="error-text">Ошибка загрузки: ${error.message}</p>`;
            showAdminMessage(`Ошибка загрузки деталей заказа: ${error.message}`, 'error');
            // closeModal('order-details-modal'); // Не закрываем модалку при ошибке загрузки деталей, показываем ошибку внутри
        }
    }

    // Вспомогательная функция для форматирования времени (оставлена как есть)
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
                console.error("formatTime: Не удалось распарсить или отформатировать время:", timeString, e); // Лог ошибки
            }
            return timeString; // Возвращаем оригинальную строку или 'Некорректный формат времени'
        }
    }

    // --- УПРАВЛЕНИЕ СТОЛИКАМИ ---

    async function loadTablesManagementContent() {
        const tablesManagementSection = document.getElementById('tables-management-content');
        if (!tablesManagementSection || tablesManagementSection.dataset.loaded === 'true') {
            console.log("loadTablesManagementContent: Structure already loaded or element not found."); // Лог
            return; // Если уже загружено или элемента нет, ничего не делаем
        }

        console.log("loadTablesManagementContent: Generating structure..."); // Лог

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

        tablesManagementSection.dataset.loaded = 'true'; // Устанавливаем флаг после создания структуры

        // Навешиваем обработчики на кнопки и формы (они теперь существуют)
        document.getElementById('add-table-btn').addEventListener('click', () => openTableModal());
        document.getElementById('table-form').addEventListener('submit', handleTableFormSubmit); // handleTableFormSubmit вызовет fetchAndDisplayTables в конце

        const tablesGridDiv = document.getElementById('tables-grid-display');
        tablesGridDiv.innerHTML = '<p>Загрузка столиков...</p>'; // Показываем индикатор загрузки

        // Загружаем и отображаем данные после создания структуры
        await fetchAndDisplayAdminTables(); // fetchAndDisplay... вызовет updateCurrentSectionUI в конце

        console.log("loadTablesManagementContent: Structure and initial data loaded."); // Лог
    }

    async function fetchAndDisplayAdminTables() {
        const tablesGridDiv = document.getElementById('tables-grid-display');
        if (!tablesGridDiv) {
            console.warn("fetchAndDisplayAdminTables: Контейнер #tables-grid-display не найден."); // Лог
            return;
        }
        console.log("fetchAndDisplayAdminTables: Загрузка и отображение столиков..."); // Лог
        // Не стираем сразу, только при первой загрузке
        if (!tablesGridDiv.querySelector('.tables-grid-container')) {
            tablesGridDiv.innerHTML = '<p>Загрузка столиков...</p>';
        }


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
                tablesGridDiv.innerHTML = ''; // Очищаем "Загрузка..."
                const gridContainer = document.createElement('div');
                gridContainer.className = 'tables-grid-container';

                tables.forEach(table => {
                    const tableCard = document.createElement('div');
                    tableCard.className = `table-card status-${table.status}`;
                    tableCard.dataset.tableId = table.id;
                    tableCard.dataset.originalStatus = table.status; // Сохраняем оригинальный статус для отката UI при ошибке

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

                    // Навешиваем обработчики на элементы внутри карточки (они теперь существуют)
                    const statusSelect = tableCard.querySelector('.table-status-select-card');
                    statusSelect.addEventListener('change', (e) => {
                        const selectElement = e.target;
                        const tableId = selectElement.dataset.tableId;
                        const newStatus = selectElement.value;
                        const cardElement = selectElement.closest('.table-card');
                        updateTableStatus(tableId, newStatus, cardElement); // updateTableStatus вызовет fetchAndDisplayTables в конце
                    });
                    tableCard.querySelector('.edit-table-btn').addEventListener('click', (e) => {
                        const tableId = e.target.closest('.table-card').dataset.tableId;
                        const tableData = tables.find(t => String(t.id) === String(tableId));
                        if (tableData) {
                            openTableModal(tableData.id, tableData.table_number, tableData.status);
                        } else {
                            console.error("fetchAndDisplayAdminTables: Данные столика для редактирования не найдены."); // Лог ошибки
                            showAdminMessage("Ошибка: Не удалось получить данные столика для редактирования.", 'error');
                        }
                    });
                    tableCard.querySelector('.delete-table-btn').addEventListener('click', (e) => {
                        const tableId = e.target.closest('.table-card').dataset.tableId;
                        deleteTable(tableId); // deleteTable вызовет fetchAndDisplayTables в конце
                    });
                });
                tablesGridDiv.appendChild(gridContainer);
            }

            console.log("fetchAndDisplayAdminTables: Успех. Повторно применяем активное состояние UI."); // Лог
            // --- В КОНЦЕ УСПЕШНОГО ОТОБРАЖЕНИЯ ДАННЫХ ---
            requestAnimationFrame(() => { // Используем RAF
                if (currentActiveSectionId) {
                    updateCurrentSectionUI(currentActiveSectionId); // <<< ЯВНО ВОССТАНАВЛИВАЕМ UI
                }
            });


        } catch (error) {
            console.error("fetchAndDisplayAdminTables: Ошибка при загрузке столиков:", error); // Лог ошибки
            tablesGridDiv.innerHTML = `<p class="error-text">Ошибка: ${error.message}</p>`;
            showAdminMessage(`Ошибка загрузки столиков: ${error.message}`, 'error');
            // --- ВОССТАНАВЛИВАЕМ UI ДАЖЕ ПРИ ОШИБКЕ ---
            requestAnimationFrame(() => {
                if (currentActiveSectionId) {
                    updateCurrentSectionUI(currentActiveSectionId); // <<< ЯВНО ВОССТАНАВЛИВАЕМ UI
                }
            });
        }
    }

    function openTableModal(id = null, number = '', status = 'free') {
        console.log(`openTableModal: ID=${id}, Number=${number}, Status=${status}`); // Лог
        const modal = document.getElementById('table-modal');
        const title = document.getElementById('table-modal-title');
        const form = document.getElementById('table-form');
        const statusSelectGroup = document.getElementById('table-status-group-modal');

        form.reset();
        document.getElementById('table-id').value = id || '';
        document.getElementById('table-number-input').value = number || '';

        // Скрываем поле статуса при редактировании существующего столика
        if (statusSelectGroup) {
            statusSelectGroup.style.display = id ? 'none' : 'block';
            if (!id) { // Только при добавлении нового столика
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
        const status = document.getElementById('table-status-select-modal').value; // Только для добавления
        const authToken = localStorage.getItem('authToken');
        const formButton = event.submitter;

        formButton.disabled = true;
        console.log(`handleTableFormSubmit: Отправка формы (${id ? 'Ред' : 'Доб'}). ID=${id}, Number=${table_number}`); // Лог


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
            // При редактировании номер столика обновляется через этот эндпоинт
            // Статус обновляется через отдельный эндпоинт updateTableStatus
        } else {
            payload.status = status; // Статус только при создании
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
            showAdminMessage(id ? 'Столик успешно обновлен!' : 'Столик успешно добавлен!', 'success');

            // --- ОБНОВЛЯЕМ ДАННЫЕ ПОСЛЕ УСПЕХА ---
            // fetchAndDisplayAdminTables в конце вызовет updateCurrentSectionUI(currentActiveSectionId)
            await fetchAndDisplayAdminTables();

            console.log("handleTableFormSubmit: Успех."); // Лог

        } catch (error) {
            console.error("handleTableFormSubmit: Ошибка сохранения столика:", error); // Лог ошибки
            showAdminMessage(`Ошибка: ${error.message}`, 'error');
            // При ошибке, обновляем данные (если возможно) и восстанавливаем UI
            requestAnimationFrame(() => {
                if (currentActiveSectionId) {
                    // fetchAndDisplayAdminTables(); // Можно попробовать обновить данные
                    updateCurrentSectionUI(currentActiveSectionId);
                }
            });
        } finally {
            formButton.disabled = false;
        }
    }

    async function updateTableStatus(tableId, newStatus, tableCardElement) {
        console.log(`updateTableStatus: Table ID=${tableId}, newStatus=${newStatus}`); // Лог
        const authToken = localStorage.getItem('authToken');
        const selectElement = tableCardElement ? tableCardElement.querySelector('.table-status-select-card') : null;
        const oldStatus = selectElement ? selectElement.dataset.previousStatus : null;

        if (selectElement) {
            // Сохраняем текущее значение как "предыдущее" перед запросом
            // В случае ошибки, мы откатимся на это значение
            selectElement.dataset.previousStatus = selectElement.value;
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
            console.log('updateTableStatus: Статус столика успешно обновлен:', updatedTable); // Лог
            showAdminMessage('Статус столика успешно обновлен!', 'success');

            // Обновляем класс карточки сразу после успеха
            if (tableCardElement) {
                tableCardElement.classList.remove('status-free', 'status-occupied', 'status-reserved'); // Удаляем старые классы статуса
                tableCardElement.classList.add(`status-${updatedTable.status}`); // Добавляем новый
                tableCardElement.dataset.originalStatus = updatedTable.status; // Обновляем оригинальный статус
            }
            if (selectElement) {
                selectElement.dataset.previousStatus = newStatus; // Обновляем на новый статус при успехе
            }

            // --- ОБНОВЛЯЕМ ДАННЫЕ ПОСЛЕ УСПЕХА ---
            // fetchAndDisplayAdminTables в конце вызовет updateCurrentSectionUI(currentActiveSectionId)
            // В данном случае можно не вызывать полную fetchAndDisplayTables, если обновление UI карточки уже произошло.
            // Но вызов fetchAndDisplayAdminTables гарантирует актуальность всего списка и повторное применение UI.
            // Если только UI карточки обновляется, то явный вызов updateCurrentSectionUI нужен.
            // Выберем вызов fetchAndDisplayAdminTables для надежности, он перерисует всю сетку.
            await fetchAndDisplayAdminTables();


        } catch (error) {
            console.error(`updateTableStatus: Ошибка при обновлении статуса столика ${tableId}:`, error); // Лог ошибки
            showAdminMessage(`Ошибка: ${error.message}`, 'error');

            // Откатываем UI, если была ошибка
            if (selectElement && oldStatus !== null) {
                selectElement.value = oldStatus;
                selectElement.dataset.previousStatus = oldStatus; // Возвращаем старый статус в data-атрибут

                if (tableCardElement) {
                    const originalStatus = tableCardElement.dataset.originalStatus;
                    tableCardElement.classList.remove('status-free', 'status-occupied', 'status-reserved');
                    if (originalStatus) tableCardElement.classList.add(`status-${originalStatus}`);
                }
            }
            // При ошибке, явно восстанавливаем UI текущего раздела
            requestAnimationFrame(() => {
                if (currentActiveSectionId) {
                    updateCurrentSectionUI(currentActiveSectionId);
                }
            });
        }
    }

    async function deleteTable(id) {
        console.log(`deleteTable: ID=${id}`); // Лог
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

            showAdminMessage('Столик успешно удален!', 'success');

            // --- ОБНОВЛЯЕМ ДАННЫЕ ПОСЛЕ УСПЕХА ---
            // fetchAndDisplayAdminTables в конце вызовет updateCurrentSectionUI(currentActiveSectionId)
            await fetchAndDisplayAdminTables();

            console.log("deleteTable: Успех."); // Лог

        } catch (error) {
            console.error("deleteTable: Ошибка удаления столика:", error); // Лог ошибки
            showAdminMessage(`Ошибка: ${error.message}`, 'error');
            // При ошибке, обновляем данные (если возможно) и восстанавливаем UI
            requestAnimationFrame(() => {
                if (currentActiveSectionId) {
                    // fetchAndDisplayAdminTables(); // Можно попробовать обновить данные
                    updateCurrentSectionUI(currentActiveSectionId);
                }
            });
        }
    }


    // --- Инициализация ---
    // Находим ПЕРВУЮ ссылку навигации и имитируем клик по ней
    // Это загрузит контент для первого доступного раздела по умолчанию.
    findAndActivateFirstSection(); // Вызываем функцию активации

    console.log("Admin app initialized."); // Лог завершения инициализации
});
