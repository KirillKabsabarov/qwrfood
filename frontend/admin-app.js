// frontend/admin-app.js
document.addEventListener('DOMContentLoaded', () => {
    const authToken = localStorage.getItem('authToken');
    const authUserString = localStorage.getItem('authUser');
    let authUser = null;

    if (authUserString) {
        try {
            authUser = JSON.parse(authUserString);
        } catch (e) {
            console.error("Ошибка парсинга данных пользователя:", e);
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            window.location.href = 'admin-login.html';
            return;
        }
    }

    if (!authToken || !authUser) {
        window.location.href = 'admin-login.html';
        return; 
    }

    const adminUsernameElement = document.getElementById('admin-username');
    if (adminUsernameElement && authUser.username) {
        adminUsernameElement.textContent = authUser.username;
    }

    const logoutButton = document.getElementById('logout-button');
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const contentSections = document.querySelectorAll('.content-section');
    const currentSectionTitleElement = document.getElementById('current-section-title');

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        window.location.href = 'admin-login.html';
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            
            const sectionId = link.dataset.section; 
            
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            link.classList.add('active');

            contentSections.forEach(section => {
                if (section.id === `${sectionId}-content`) {
                    section.classList.add('active-section');
                } else {
                    section.classList.remove('active-section');
                }
            });
            
            currentSectionTitleElement.textContent = link.textContent; 

            if (sectionId === 'menu-management') {
                loadMenuManagementContent(); 
            } else if (sectionId === 'orders-management') {
                loadOrdersManagementContent(); 
            } else if (sectionId === 'tables-management') {
                loadTablesManagementContent(); // TODO
            }
        });
    });

    const API_BASE_URL_ADMIN = 'http://localhost:3001/api';

    // --- Глобальные функции для модальных окон ---
    window.closeModal = function(modalId) { 
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // --- УПРАВЛЕНИЕ МЕНЮ ---
    async function loadMenuManagementContent() {
        const menuManagementSection = document.getElementById('menu-management-content');
        if (!menuManagementSection) return;

        menuManagementSection.innerHTML = `
            <h4>Управление категориями</h4>
            <div class="admin-button-bar">
                <button id="add-category-btn" class="btn btn-success">Добавить категорию</button>
            </div>
            <div id="categories-list">Загрузка категорий...</div>
            <hr style="margin: 30px 0;">
            <h4>Управление позициями меню</h4>
            <div class="admin-button-bar">
                <button id="add-menu-item-btn" class="btn btn-success">Добавить позицию</button>
            </div>
            <div id="menu-items-list">Загрузка позиций меню...</div>

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
        
        await fetchAndDisplayAdminCategories();
        await fetchAndDisplayAdminMenuItems();
        await populateCategoryDropdown(); 

        document.getElementById('add-category-btn').addEventListener('click', () => openCategoryModal());
        document.getElementById('add-menu-item-btn').addEventListener('click', () => openMenuItemModal());

        document.getElementById('category-form').addEventListener('submit', handleCategoryFormSubmit);
        document.getElementById('menu-item-form').addEventListener('submit', handleMenuItemFormSubmit);
    }
    
    async function fetchAndDisplayAdminCategories() {
        const categoriesListDiv = document.getElementById('categories-list');
        if (!categoriesListDiv) return;
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
            categoriesListDiv.innerHTML = '';
            categoriesListDiv.appendChild(table);

            table.querySelectorAll('.edit-category-btn').forEach(btn => {
                btn.addEventListener('click', (e) => openCategoryModal(e.target.dataset.id, e.target.dataset.name));
            });
            table.querySelectorAll('.delete-category-btn').forEach(btn => {
                btn.addEventListener('click', (e) => deleteCategory(e.target.dataset.id));
            });

        } catch (error) {
            categoriesListDiv.innerHTML = `<p class="error-text">Ошибка: ${error.message}</p>`;
        }
    }

    function openCategoryModal(id = null, name = '') {
        const modal = document.getElementById('category-modal');
        if (!modal) return;
        const title = document.getElementById('category-modal-title');
        document.getElementById('category-id').value = id || '';
        document.getElementById('category-name').value = name || '';
        
        title.textContent = id ? 'Редактировать категорию' : 'Добавить категорию';
        modal.style.display = 'block';
        document.getElementById('category-name').focus();
    }

    async function handleCategoryFormSubmit(event) {
        event.preventDefault();
        const id = document.getElementById('category-id').value;
        const name = document.getElementById('category-name').value.trim();

        if (!name) {
            alert('Название категории не может быть пустым.');
            return;
        }

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE_URL_ADMIN}/categories/${id}` : `${API_BASE_URL_ADMIN}/categories`;
        const currentAuthToken = localStorage.getItem('authToken');
        
        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentAuthToken}`
                },
                body: JSON.stringify({ name })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Ошибка сервера');
            }
            
            closeModal('category-modal');
            await fetchAndDisplayAdminCategories(); 
            await populateCategoryDropdown(); 
            // TODO: showMessage об успехе

        } catch (error) {
            alert(`Ошибка: ${error.message}`); 
        }
    }

    async function deleteCategory(id) {
        if (!confirm('Вы уверены, что хотите удалить эту категорию? Это также удалит все связанные с ней блюда!')) return;
        const currentAuthToken = localStorage.getItem('authToken');
        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/categories/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${currentAuthToken}` }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Ошибка удаления категории');
            }
            
            await fetchAndDisplayAdminCategories(); 
            await populateCategoryDropdown(); 
            // TODO: showMessage об успехе

        } catch (error) {
            alert(`Ошибка: ${error.message}`); 
        }
    }

    async function fetchAndDisplayAdminMenuItems() {
        const menuItemsListDiv = document.getElementById('menu-items-list');
        if (!menuItemsListDiv) return;
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
            menuItemsListDiv.innerHTML = `<p class="error-text">Ошибка: ${error.message}</p>`;
        }
    }
    
    async function populateCategoryDropdown() {
        const categorySelect = document.getElementById('menu-item-category');
        if (!categorySelect) return;

        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/categories`);
            if (!response.ok) throw new Error('Ошибка загрузки категорий для дропдауна');
            const categories = await response.json();
            
            const currentValue = categorySelect.value; // Сохраняем текущее значение, если оно есть
            categorySelect.innerHTML = '<option value="">-- Выберите категорию --</option>'; 
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                categorySelect.appendChild(option);
            });
            if (currentValue) categorySelect.value = currentValue; // Восстанавливаем, если было
        } catch (error) {
            console.error(error);
            categorySelect.innerHTML = '<option value="">Ошибка загрузки категорий</option>';
        }
    }

    async function openMenuItemModal(id = null) {
        const modal = document.getElementById('menu-item-modal');
        if (!modal) return;
        const title = document.getElementById('menu-item-modal-title');
        const form = document.getElementById('menu-item-form');
        form.reset(); 
        document.getElementById('menu-item-id').value = id || '';
        await populateCategoryDropdown(); 

        title.textContent = id ? 'Редактировать позицию меню' : 'Добавить позицию меню';

        if (id) {
            try {
                const response = await fetch(`${API_BASE_URL_ADMIN}/menu/${id}`);
                if (!response.ok) throw new Error('Не удалось загрузить данные блюда');
                const itemData = await response.json();
                document.getElementById('menu-item-name').value = itemData.name;
                document.getElementById('menu-item-description').value = itemData.description || '';
                document.getElementById('menu-item-price').value = parseFloat(itemData.price).toFixed(2);
                document.getElementById('menu-item-category').value = itemData.category_id;
                document.getElementById('menu-item-image-url').value = itemData.image_url || '';
            } catch (error) {
                alert(`Ошибка загрузки данных для редактирования: ${error.message}`); 
                return; 
            }
        }
        
        modal.style.display = 'block';
        document.getElementById('menu-item-name').focus();
    }

    async function handleMenuItemFormSubmit(event) {
        event.preventDefault();
        const id = document.getElementById('menu-item-id').value;
        const menuItemData = {
            name: document.getElementById('menu-item-name').value.trim(),
            description: document.getElementById('menu-item-description').value.trim(),
            price: parseFloat(document.getElementById('menu-item-price').value),
            category_id: parseInt(document.getElementById('menu-item-category').value),
            image_url: document.getElementById('menu-item-image-url').value.trim() || null
        };

        if (!menuItemData.name || menuItemData.price <= 0 || !menuItemData.category_id) {
            alert('Заполните все обязательные поля (Название, Цена, Категория) корректно.'); 
            return;
        }

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE_URL_ADMIN}/menu/${id}` : `${API_BASE_URL_ADMIN}/menu`;
        const currentAuthToken = localStorage.getItem('authToken');

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentAuthToken}`
                },
                body: JSON.stringify(menuItemData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Ошибка сервера');
            }
            
            closeModal('menu-item-modal');
            await fetchAndDisplayAdminMenuItems(); 
            // TODO: showMessage об успехе

        } catch (error) {
            alert(`Ошибка: ${error.message}`); 
        }
    }

    async function deleteMenuItem(id) {
        if (!confirm('Вы уверены, что хотите удалить эту позицию меню?')) return;
        const currentAuthToken = localStorage.getItem('authToken');
        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/menu/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${currentAuthToken}` }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Ошибка удаления позиции меню');
            }
            
            await fetchAndDisplayAdminMenuItems(); 
            // TODO: showMessage об успехе

        } catch (error) {
            alert(`Ошибка: ${error.message}`);
        }
    }

    // --- УПРАВЛЕНИЕ ЗАКАЗАМИ ---
    async function loadOrdersManagementContent() {
        const ordersManagementSection = document.getElementById('orders-management-content');
        if (!ordersManagementSection) return;

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
            <div id="orders-list">Загрузка заказов...</div>

            <div id="order-details-modal" class="modal" style="display:none;">
                <div class="modal-content modal-lg">
                    <span class="close-btn" onclick="closeModal('order-details-modal')">×</span>
                    <h5 id="order-details-modal-title">Детали заказа №<span id="details-order-id"></span></h5>
                    <div id="order-details-content"></div>
                </div>
            </div>
        `;

        await fetchAndDisplayAdminOrders(); 

        document.getElementById('apply-order-filters-btn').addEventListener('click', () => {
            const statusFilter = document.getElementById('order-status-filter').value;
            const dateFilter = document.getElementById('order-date-filter').value;
            fetchAndDisplayAdminOrders({ status: statusFilter, date: dateFilter });
        });
    }

    async function fetchAndDisplayAdminOrders(filters = {}) {
        const ordersListDiv = document.getElementById('orders-list');
        if (!ordersListDiv) return;
        ordersListDiv.innerHTML = '<p>Загрузка заказов...</p>';
        
        const currentAuthToken = localStorage.getItem('authToken');

        let queryParams = new URLSearchParams();
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.date) queryParams.append('date', filters.date);
        
        const url = `${API_BASE_URL_ADMIN}/orders?${queryParams.toString()}`;

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${currentAuthToken}` }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Ошибка загрузки заказов: ${response.status}`);
            }
            const orders = await response.json();

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
                        <tr>
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
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
            ordersListDiv.innerHTML = '';
            ordersListDiv.appendChild(table);

            table.querySelectorAll('.order-status-select').forEach(select => {
                select.addEventListener('change', (e) => {
                    updateOrderStatus(e.target.dataset.orderId, e.target.value);
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
        }
    }

    async function updateOrderStatus(orderId, newStatus) {
        const currentAuthToken = localStorage.getItem('authToken');
        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentAuthToken}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Ошибка обновления статуса: ${response.status}`);
            }
            
            const updatedOrder = await response.json();
            console.log('Статус заказа обновлен:', updatedOrder);
             // TODO: Показать сообщение об успехе
            alert('Статус заказа успешно обновлен!'); // Заменить на showMessage

        } catch (error) {
            console.error(`Ошибка при обновлении статуса заказа ${orderId}:`, error);
            alert(`Ошибка обновления статуса: ${error.message}. Обновите страницу, чтобы увидеть актуальные данные.`); // Заменить на showMessage
        }
    }
    
    async function openOrderDetailsModal(orderId) {
        const modal = document.getElementById('order-details-modal');
        if (!modal) return;
        const titleOrderIdSpan = document.getElementById('details-order-id');
        const contentDiv = document.getElementById('order-details-content');
        const currentAuthToken = localStorage.getItem('authToken');

        titleOrderIdSpan.textContent = orderId;
        contentDiv.innerHTML = '<p>Загрузка деталей...</p>';
        modal.style.display = 'block';

        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${currentAuthToken}` }
            });
            if (!response.ok) throw new Error('Не удалось загрузить детали заказа');
            const order = await response.json();

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
        }
    }
    
    async function loadTablesManagementContent() {
        const tablesManagementSection = document.getElementById('tables-management-content');
        if (!tablesManagementSection) return;

        tablesManagementSection.innerHTML = `
            <h4>Управление Столиками</h4>
            <div class="admin-button-bar">
                <button id="add-table-btn" class="btn btn-success">Добавить столик</button>
            </div>
            <div id="tables-grid-display">Загрузка столиков...</div>

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

        await fetchAndDisplayAdminTables();

        document.getElementById('add-table-btn').addEventListener('click', () => openTableModal());
        document.getElementById('table-form').addEventListener('submit', handleTableFormSubmit);
    }

    async function fetchAndDisplayAdminTables() {
        const tablesGridDiv = document.getElementById('tables-grid-display');
        if (!tablesGridDiv) return;
        tablesGridDiv.innerHTML = '<p>Загрузка столиков...</p>';
        
        const authToken = localStorage.getItem('authToken');

        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/tables`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!response.ok) throw new Error('Ошибка загрузки столиков');
            const tables = await response.json();

            if (tables.length === 0) {
                tablesGridDiv.innerHTML = '<p>Столики не найдены. Добавьте первый!</p>';
                return;
            }

            // Отображаем столики в виде плитки
            tablesGridDiv.innerHTML = ''; // Очищаем
            const gridContainer = document.createElement('div');
            gridContainer.className = 'tables-grid-container'; // Для CSS стилей плитки

            tables.forEach(table => {
                const tableCard = document.createElement('div');
                tableCard.className = `table-card status-${table.status}`; // Класс для статуса
                tableCard.dataset.tableId = table.id;

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
                        <button class="btn btn-xs btn-warning edit-table-btn" title="Редактировать номер столика">✎</button> <!-- Карандаш -->
                        <button class="btn btn-xs btn-danger delete-table-btn" title="Удалить столик">×</button>
                    </div>
                `;
                // ✎ это HTML entity для карандаша ✎

                gridContainer.appendChild(tableCard);

                // Обработчик изменения статуса прямо на карточке
                tableCard.querySelector('.table-status-select-card').addEventListener('change', (e) => {
                    updateTableStatus(e.target.dataset.tableId, e.target.value, tableCard);
                });
                // Обработчики для кнопок редактирования/удаления на карточке
                tableCard.querySelector('.edit-table-btn').addEventListener('click', () => openTableModal(table.id, table.table_number, table.status));
                tableCard.querySelector('.delete-table-btn').addEventListener('click', () => deleteTable(table.id));
            });
            tablesGridDiv.appendChild(gridContainer);

        } catch (error) {
            console.error("Ошибка при загрузке столиков в админке:", error);
            tablesGridDiv.innerHTML = `<p class="error-text">Ошибка: ${error.message}</p>`;
        }
    }

    function openTableModal(id = null, number = '', status = 'free') {
        const modal = document.getElementById('table-modal');
        const title = document.getElementById('table-modal-title');
        document.getElementById('table-id').value = id || '';
        document.getElementById('table-number-input').value = number || '';
        document.getElementById('table-status-select-modal').value = status || 'free';
        
        // Скрываем выбор статуса при редактировании, т.к. он меняется на карточке
        // Или можно оставить, если хотим менять статус и тут. Пока скроем.
        document.getElementById('table-status-select-modal').closest('.form-group').style.display = id ? 'none' : 'block';

        title.textContent = id ? 'Редактировать столик' : 'Добавить столик';
        modal.style.display = 'block';
        document.getElementById('table-number-input').focus();
    }

    async function handleTableFormSubmit(event) {
        event.preventDefault();
        const id = document.getElementById('table-id').value;
        const table_number = document.getElementById('table-number-input').value.trim();
        const status = document.getElementById('table-status-select-modal').value; // Используется только при создании нового столика
        const authToken = localStorage.getItem('authToken');

        if (!table_number) {
            alert('Номер/название столика не может быть пустым.'); // TODO: showMessage
            return;
        }

        const payload = { table_number };
        let method = 'POST';
        let url = `${API_BASE_URL_ADMIN}/tables`;

        if (id) { // Редактирование существующего
            method = 'PUT';
            url = `${API_BASE_URL_ADMIN}/tables/${id}`; 
            // При редактировании через эту форму меняем только номер, статус меняется на карточке.
            // Если бы хотели менять и статус: payload.status = status;
        } else { // Создание нового
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

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Ошибка сервера');
            }
            
            closeModal('table-modal');
            await fetchAndDisplayAdminTables(); // Обновляем список
            // TODO: showMessage об успехе

        } catch (error) {
            alert(`Ошибка: ${error.message}`); // TODO: Заменить на showMessage
        }
    }

    async function updateTableStatus(tableId, newStatus, tableCardElement) {
        const authToken = localStorage.getItem('authToken');
        try {
            const response = await fetch(`${API_BASE_URL_ADMIN}/tables/${tableId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) throw new Error('Ошибка обновления статуса столика');
            
            const updatedTable = await response.json();
            // Обновляем класс у карточки для изменения цвета
            if (tableCardElement) {
                tableCardElement.className = `table-card status-${updatedTable.status}`;
            }
            console.log('Статус столика обновлен:', updatedTable);
            // TODO: showMessage об успехе

        } catch (error) {
            console.error(`Ошибка при обновлении статуса столика ${tableId}:`, error);
            alert(`Ошибка: ${error.message}. Обновите страницу.`); // TODO: showMessage
            // Можно попробовать откатить select, если ошибка
            if (tableCardElement) {
                const select = tableCardElement.querySelector('.table-status-select-card');
                // Попытка найти предыдущий статус (сложно без хранения старого значения)
                // Проще всего просто перезагрузить: fetchAndDisplayAdminTables();
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
            if (!response.ok) throw new Error('Ошибка удаления столика');
            await fetchAndDisplayAdminTables();
            // TODO: showMessage об успехе
        } catch (error) {
            alert(`Ошибка: ${error.message}`); // TODO: showMessage
        }
    }


    // Инициализация: по умолчанию показываем первую секцию (Обзор)
    // Это поведение управляется классами 'active' в HTML и логикой в navLinks.forEach
    // Если нужно принудительно открыть определенную секцию при загрузке:
    // const initialSectionLink = document.querySelector('.sidebar-nav a[data-section="dashboard-overview"]');
    // if (initialSectionLink) initialSectionLink.click();
});