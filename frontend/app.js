// frontend/app.js
document.addEventListener('DOMContentLoaded', () => {
    const categoryTabsContainer = document.getElementById('category-tabs');
    const menuItemsGridContainer = document.getElementById('menu-items-grid');

    // Элементы корзины
    const cartItemsListContainer = document.getElementById('cart-items-list');
    const cartTotalAmountElement = document.getElementById('cart-total-amount');
    const checkoutButton = document.getElementById('checkout-button');
    const checkoutButtonText = checkoutButton.querySelector('.btn-text'); // Текст внутри кнопки оформления

    // Элементы формы опций заказа
    const orderTypeRadios = document.querySelectorAll('input[name="orderType"]');
    const tableNumberGroup = document.getElementById('table-number-group');
    const pickupTimeGroup = document.getElementById('pickup-time-group');
    const tableNumberInput = document.getElementById('table-number');
    const pickupTimeInput = document.getElementById('pickup-time');

    //const API_BASE_URL = 'http://localhost:3001/api';
    const API_BASE_URL = 'https://qrfood-backend.onrender.com/api';
    let allMenuItems = [];
    let currentCategoryId = null;
    let cart = []; // Наша корзина - массив объектов { menuItem, quantity }

    // Функция для загрузки категорий
    async function fetchCategories() {
        try {
            const response = await fetch(`${API_BASE_URL}/categories`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const categories = await response.json();
            displayCategories(categories);
        } catch (error) {
            console.error("Ошибка при загрузке категорий:", error);
            categoryTabsContainer.innerHTML = '<p class="error-text">Не удалось загрузить категории. Попробуйте позже.</p>';
            showMessage('Не удалось загрузить категории.', 'error');
        }
    }

    // Функция для отображения категорий в виде табов
    function displayCategories(categories) {
        if (!categories || categories.length === 0) {
            categoryTabsContainer.innerHTML = '<p>Категории не найдены.</p>';
            return;
        }
        categoryTabsContainer.innerHTML = '';

        const allButton = document.createElement('button');
        allButton.classList.add('category-tab', 'active');
        allButton.textContent = 'Все';
        allButton.dataset.categoryId = 'all';
        allButton.addEventListener('click', () => handleCategoryClick(null, allButton));
        categoryTabsContainer.appendChild(allButton);

        categories.forEach(category => {
            const tabButton = document.createElement('button');
            tabButton.classList.add('category-tab');
            tabButton.textContent = category.name;
            tabButton.dataset.categoryId = category.id;

            tabButton.addEventListener('click', () => handleCategoryClick(category.id, tabButton));
            categoryTabsContainer.appendChild(tabButton);
        });
    }

    // Функция для загрузки всех позиций меню
    async function fetchMenuItems() {
        try {
            const response = await fetch(`${API_BASE_URL}/menu`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allMenuItems = await response.json();
            displayMenuItems(allMenuItems);
        } catch (error) {
            console.error("Ошибка при загрузке меню:", error);
            menuItemsGridContainer.innerHTML = '<p class="error-text">Не удалось загрузить меню. Попробуйте позже.</p>';
            showMessage('Не удалось загрузить меню.', 'error');
        }
    }

    // Функция для отображения позиций меню (карточки)
    function displayMenuItems(itemsToDisplay) {
        menuItemsGridContainer.innerHTML = '';

        if (!itemsToDisplay || itemsToDisplay.length === 0) {
            menuItemsGridContainer.innerHTML = '<p>В данной категории блюд нет.</p>';
            return;
        }

        itemsToDisplay.forEach(item => {
            const card = document.createElement('div');
            card.classList.add('menu-item-card');
            const imageUrl = item.image_url || `https://via.placeholder.com/300x200/CCCCCC/FFFFFF?Text=${encodeURIComponent(item.name)}`;

            card.innerHTML = `
                <div class="card-image-container">
                    ${item.card_badge ? `<div class="card-badge">${item.card_badge}</div>` : ''} 
                    <img src="${imageUrl}" alt="${item.name}" class="menu-item-image">
                </div>
                
                <div class="text-content"> 
                    <h3 class="item-title">${item.name}</h3>
                    <p class="item-description">${item.description || 'Описание отсутствует.'}</p>
                </div>
                
                <div class="item-footer"> 
                    <span class="item-price">${parseFloat(item.price).toFixed(2)} ₽</span> 
                    <button class="add-to-cart-btn" data-item-id="${item.id}">+</button>
                </div>
            `;



            const addToCartButton = card.querySelector('.add-to-cart-btn');
            addToCartButton.addEventListener('click', () => {
                const selectedItem = allMenuItems.find(menuItem => menuItem.id === parseInt(item.id));
                if (selectedItem) {
                    addItemToCart(selectedItem);
                }
            });

            menuItemsGridContainer.appendChild(card);
        });
    }

    // Обработчик клика по табу категории
    function handleCategoryClick(categoryId, clickedButton) {
        currentCategoryId = categoryId;

        document.querySelectorAll('.category-tab').forEach(button => {
            button.classList.remove('active');
        });
        clickedButton.classList.add('active');

        if (categoryId === null || categoryId === 'all') {
            displayMenuItems(allMenuItems);
        } else {
            const filteredItems = allMenuItems.filter(item => item.category_id === parseInt(categoryId));
            displayMenuItems(filteredItems);
        }
    }

    // Функция добавления товара в корзину
    function addItemToCart(item) {
        const existingItem = cart.find(cartItem => cartItem.menuItem.id === item.id);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ menuItem: item, quantity: 1 });
        }
        renderCart();
    }

    // Функция отображения (рендеринга) корзины
    function renderCart() {
        cartItemsListContainer.innerHTML = ''; 
        let totalAmount = 0;
    
        if (cart.length === 0) {
            cartItemsListContainer.innerHTML = '<p class="empty-cart-message">Корзина пуста. Добавьте что-нибудь вкусненькое!</p>';
            checkoutButton.disabled = true; 
        } else {
            cart.forEach((cartItem, index) => {
                const listItem = document.createElement('div');
                listItem.classList.add('cart-item');
                
                const itemPrice = parseFloat(cartItem.menuItem.price);
                const itemTotal = itemPrice * cartItem.quantity;
                totalAmount += itemTotal;
    
                listItem.innerHTML = `
                    <div class="cart-item-info">
                        <div class="cart-item-name">${cartItem.menuItem.name} (x${cartItem.quantity})</div>
                        ${/* Опционально: описание */ '' /* cartItem.menuItem.description ? `<div class="cart-item-description">${cartItem.menuItem.description}</div>` : '' */}
                    </div>
                    <div class="cart-item-controls">
                        <div class="cart-item-price">${itemTotal.toFixed(2)} ₽</div> 
                        <button class="remove-item-btn" data-cart-item-index="${index}" title="Удалить из корзины">
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                             </svg>
                         </button> 
                    </div>
                `;

                listItem.querySelector('.remove-item-btn').addEventListener('click', (event) => {
                    const itemIndexToRemove = parseInt(event.currentTarget.dataset.cartItemIndex);
                    removeItemFromCart(itemIndexToRemove);
                });
    
                // TODO: Навесить обработчики на кнопки +/- количества, если они добавлены в HTML
                /*
                if (listItem.querySelector('.quantity-btn.decrease')) {
                     listItem.querySelector('.quantity-btn.decrease').addEventListener('click', () => decreaseItemQuantity(cartItem.menuItem.id));
                }
                if (listItem.querySelector('.quantity-btn.increase')) {
                     listItem.querySelector('.quantity-btn.increase').addEventListener('click', () => increaseItemQuantity(cartItem.menuItem.id));
                }
                */
    
    
                cartItemsListContainer.appendChild(listItem);
            });
            checkoutButton.disabled = false; 
        }
    
        cartTotalAmountElement.textContent = totalAmount.toFixed(2);
        updateCartIndicator(); // Вызываем функцию обновления индикатора
    
    }

    function updateCartIndicator() {
        const cartCountSpan = document.querySelector('.cart-indicator .cart-count');
        if (cartCountSpan) {
            // Считаем общее количество штук в корзине
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            cartCountSpan.textContent = totalItems;
            // Опционально, скрыть индикатор или показать 0, если корзина пуста
            // cartCountSpan.style.visibility = totalItems > 0 ? 'visible' : 'hidden';
        }
    }

    // Функция удаления товара из корзины
    function removeItemFromCart(itemIndex) {
        if (itemIndex >= 0 && itemIndex < cart.length) {
            const itemToRemove = cart[itemIndex];
            if (itemToRemove.quantity > 1) {
                itemToRemove.quantity -= 1;
            } else {
                cart.splice(itemIndex, 1);
            }
            renderCart();
        }
    }

    // Функция для обновления видимости полей в зависимости от типа заказа
    function updateOrderOptionsVisibility() {
        const selectedOrderType = document.querySelector('input[name="orderType"]:checked').value;
        if (selectedOrderType === 'table') {
            tableNumberGroup.style.display = 'block';
            pickupTimeGroup.style.display = 'none';
            pickupTimeInput.value = '';
        } else if (selectedOrderType === 'takeaway') {
            tableNumberGroup.style.display = 'none';
            pickupTimeGroup.style.display = 'block';
            tableNumberInput.value = '';
        }
    }

    // Добавляем обработчики на изменение радиокнопок
    orderTypeRadios.forEach(radio => {
        radio.addEventListener('change', updateOrderOptionsVisibility);
    });

    // Обработчик кнопки "Оформить заказ"
    checkoutButton.addEventListener('click', async () => {
        if (cart.length === 0) {
            showMessage('Ваша корзина пуста!', 'error', 3000);
            return;
        }

        const selectedOrderType = document.querySelector('input[name="orderType"]:checked').value;
        let orderSpecificDetails = {};

        if (selectedOrderType === 'table') {
            const tableNumber = tableNumberInput.value.trim();
            if (!tableNumber) {
                showMessage('Пожалуйста, укажите номер столика.', 'error', 3000);
                tableNumberInput.focus();
                return;
            }
            orderSpecificDetails = {
                table_number: tableNumber,
                pickup_time: null
            };
        } else if (selectedOrderType === 'takeaway') {
            const pickupTime = pickupTimeInput.value;
            orderSpecificDetails = {
                pickup_time: pickupTime || null,
                table_number: null
            };
        }

        const orderPayload = {
            order_type: selectedOrderType,
            ...orderSpecificDetails,
            items: cart.map(cartItem => ({
                menu_item_id: cartItem.menuItem.id,
                quantity: cartItem.quantity,
            })),
        };

        console.log('Отправка заказа:', orderPayload);

        checkoutButton.disabled = true;
        checkoutButtonText.style.display = 'none'; // Скрываем текст
        const spinner = document.createElement('span');
        spinner.classList.add('btn-spinner');
        checkoutButton.appendChild(spinner); // Добавляем спиннер

        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderPayload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Не удалось разобрать ошибку сервера.' }));
                throw new Error(errorData.message || `Ошибка сервера: ${response.status}`);
            }

            const createdOrder = await response.json();
            console.log('Заказ успешно создан:', createdOrder);

            showMessage(`Заказ успешно оформлен! Сумма: ${parseFloat(createdOrder.total_amount).toFixed(2)} руб.`, 'success');

            cart = [];
            renderCart();
            tableNumberInput.value = '';
            pickupTimeInput.value = '';
            // Опционально сбросить тип заказа
            // document.querySelector('input[name="orderType"][value="table"]').checked = true;
            // updateOrderOptionsVisibility();

        } catch (error) {
            console.error('Ошибка при оформлении заказа:', error);
            showMessage(`Произошла ошибка: ${error.message}`, 'error', 7000);
        } finally {
            checkoutButton.disabled = cart.length === 0;
            checkoutButtonText.style.display = 'inline';
            if (checkoutButton.contains(spinner)) {
                checkoutButton.removeChild(spinner);
            }
        }
    });

    // Функция для показа сообщений
    function showMessage(message, type = 'success', duration = 5000) {
        let messageContainer = document.getElementById('message-container');
        if (messageContainer) {
            messageContainer.remove();
        }

        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        messageContainer.className = `message ${type}`;
        messageContainer.textContent = message;

        document.body.appendChild(messageContainer);

        setTimeout(() => {
            if (document.body.contains(messageContainer)) {
                document.body.removeChild(messageContainer);
            }
        }, duration);
    }

    // Инициализация
    async function init() {
        await fetchCategories();
        await fetchMenuItems();
        renderCart();
        updateOrderOptionsVisibility();
    }

    init();
});
