// backend/models/tableModel.js
const db = require('../data/dbConfig.js');

function findAll() {
    return db('tables').orderBy('table_number'); // Сортируем по номеру столика
}

function findById(id) {
    return db('tables').where({ id }).first();
}

async function add(tableData) {
    const [idObj] = await db('tables').insert(tableData).returning('id');
    let tableId;
    // Универсальное получение ID (как в других моделях)
    if (Array.isArray(idObj) && idObj.length > 0 && typeof idObj[0] === 'object') tableId = idObj[0].id;
    else if (Array.isArray(idObj) && idObj.length > 0) tableId = idObj[0];
    else if (typeof idObj === 'number') tableId = idObj;
    else if (typeof idObj === 'object' && idObj.id) tableId = idObj.id;
    else throw new Error('Не удалось получить ID созданного столика.');
    
    if (!tableId) throw new Error('Ошибка при создании столика: ID не получен.');
    return findById(tableId);
}

async function updateStatus(id, status) {
    const validStatuses = ['free', 'occupied', 'reserved'];
    if (!validStatuses.includes(status)) {
        throw new Error('Недопустимый статус столика.');
    }
    const count = await db('tables').where({ id }).update({ status, updated_at: db.fn.now() });
    if (count > 0) {
        return findById(id);
    }
    return null;
}

// Опционально: обновление номера столика (если нужно)
async function update(id, changes) {
    const count = await db('tables').where({ id }).update({...changes, updated_at: db.fn.now()});
    if (count > 0) {
        return findById(id);
    }
    return null;
}

async function remove(id) {
    return db('tables').where({ id }).del();
}

module.exports = {
    findAll,
    findById,
    add,
    updateStatus,
    update,
    remove,
};