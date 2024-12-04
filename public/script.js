// Обработчик кликов на пункты меню
document.querySelectorAll(".sidebar ul li").forEach((item) => {
    item.addEventListener("click", () => {
        const tableKey = item.dataset.table;
        renderTable(tableKey);
    });
});

// URL API
const apiUrl = "http://localhost:3000/api";

// Обработчик кликов на пункты меню
document.querySelectorAll(".sidebar ul li").forEach((item) => {
    item.addEventListener("click", async () => {
        const tableKey = item.dataset.table;
        await fetchTableData(tableKey);
    });
});

// Получение данных и рендер таблицы
async function fetchTableData(tableKey) {
    const container = document.getElementById("table-container");
    const title = document.getElementById("table-title");

    try {
        const response = await fetch(`${apiUrl}/${tableKey}`);
        if (!response.ok) {
            throw new Error("Ошибка загрузки данных");
        }

        const data = await response.json();
        renderTable(data, tableKey);
    } catch (error) {
        console.error("Ошибка:", error);
        container.innerHTML = "<p>Ошибка загрузки данных</p>";
        title.textContent = "Ошибка";
    }
}

// Рендер таблицы с кнопками управления
function renderTable(data, tableName) {
    const container = document.getElementById("table-container");
    const title = document.getElementById("table-title");



    if (!data.length) {
        container.innerHTML = "<p>Данные отсутствуют</p>";
        title.textContent = `Таблица: ${tableName}`;
        return;
    }

    title.textContent = `Таблица: ${tableName}`;
    let tableHtml = "<table><thead><tr>";

    // Генерация заголовков
    Object.keys(data[0]).forEach((col) => {
        tableHtml += `<th>${col}</th>`;
    });
    tableHtml += "<th>Действия</th></tr></thead><tbody>";

    const tablePrimaryKeys = {
        delivery: "id_delivery",
        order: "id_orders",
        product: "id_product",
        shop: "id_shop",
    };

    // Генерация строк
    data.forEach((row) => {
        tableHtml += "<tr>";
        Object.values(row).forEach((value) => {
            tableHtml += `<td>${value}</td>`;
        });

        const primaryKey = tablePrimaryKeys[tableName]; // Получаем ключ для текущей таблицы

        tableHtml += `
      <td>
        <button onclick="deleteRecord('${tableName}', ${row[primaryKey]})">Удалить</button>
        <button onclick="editRecord('${tableName}', ${row[primaryKey]})">Изменить</button>
      </td>
    `;
        tableHtml += "</tr>";
    });

    tableHtml += "</tbody></table>";
    container.innerHTML = tableHtml;

    // Добавить кнопку для создания новой записи
    container.innerHTML += `<button onclick="createRecord('${tableName}')">Добавить запись</button>`;
}

// Удаление записи
async function deleteRecord(tableName, id) {
    if (!confirm("Вы уверены, что хотите удалить эту запись?")) return;

    try {
        const response = await fetch(`${apiUrl}/${tableName}/${id}`, {
            method: "DELETE",
        });

        if (!response.ok) throw new Error("Ошибка при удалении записи");

        alert("Запись удалена");
        await fetchTableData(tableName);
    } catch (error) {
        console.error("Ошибка:", error);
    }
}

// Добавление записи
function createRecord(tableName) {
    const formData = prompt("Введите данные в формате JSON (например, {\"name\": \"Магазин\"}):");
    if (!formData) return;

    try {
        const data = JSON.parse(formData);
        fetch(`${apiUrl}/${tableName}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
            .then((response) => {
                if (!response.ok) throw new Error("Ошибка при добавлении записи");
                return response.json();
            })
            .then(() => {
                alert("Запись добавлена");
                fetchTableData(tableName);
            });
    } catch (error) {
        console.error("Ошибка:", error);
        alert("Ошибка: некорректный формат данных");
    }
}

// Изменение записи
function editRecord(tableName, id) {
    const formData = prompt("Введите новые данные в формате JSON (например, {\"name\": \"Новый магазин\"}):");
    if (!formData) return;

    try {
        const data = JSON.parse(formData);
        fetch(`${apiUrl}/${tableName}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
            .then((response) => {
                if (!response.ok) throw new Error("Ошибка при изменении записи");
                return response.json();
            })
            .then(() => {
                alert("Запись обновлена");
                fetchTableData(tableName);
            });
    } catch (error) {
        console.error("Ошибка:", error);
        alert("Ошибка: некорректный формат данных");
    }
}


