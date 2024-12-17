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

    // Добавляем кнопку добавления записи под заголовком
    const addButtonHtml = `<button onclick="createRecord('${tableName}')">Добавить запись</button>`;

    let tableHtml = "<table><thead><tr>";

    // Генерация заголовков
    Object.keys(data[0]).forEach((col) => {
        tableHtml += `<th>${col}</th>`;
    });
    tableHtml += "<th>Действия</th></tr></thead><tbody>";

    const tablePrimaryKeys = {
        delivery: "id_delivery",
        orders: "id_order",
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

    // Объединяем таблицу и кнопку
    container.innerHTML = addButtonHtml + tableHtml;
}

//CRUD
// Create
function createRecord(tableName) {

    // Определяем обязательные поля для каждой таблицы
    const tableFields = {
        shop: ["email", "payment_for_delivery"],
        product: ["name", "firm", "model", "tech_spec", "price", "warranty_period", "image"],
        orders: ["shop_id_shop", "product_id_product", "order_date", "order_time", "quantity", "client_name", "client_phone", "confirmation"],
        delivery: ["order_id_order", "date", "address", "client_name", "courier_name"],
    };

    const requiredFields = tableFields[tableName] || [];
    if (!requiredFields.length) {
        alert("Неизвестная таблица.");
        return;
    }

    // Генерируем форму с обязательными полями
    const formFields = requiredFields
        .map(
            (field) => `
                <label for="${field}">${field}:</label>
                <input type="text" id="${field}" name="${field}" required>
                <br>
            `
        )
        .join("");

    openModal(
        "Добавить запись",
        `<form id="create-form">${formFields}</form>`,
        () => {
            const form = document.getElementById("create-form");
            const formData = Object.fromEntries(new FormData(form));

            // Выполняем запрос на сервер для добавления записи
            fetch(`/api/${tableName}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Ошибка при добавлении записи");
                    }
                    return response.json();
                })
                .then((data) => {
                    console.log("Запись добавлена:", data);
                    closeModal();
                    refreshTable(tableName); // Обновляем таблицу
                })
                .catch((error) => {
                    console.error("Ошибка:", error);
                    alert("Не удалось добавить запись.");
                });
        }
    );
}


//TODO
//Read

//Update
function editRecord(tableName, id) {
    // Получаем данные записи по ID
    fetch(`/api/${tableName}/${id}`)
        .then((response) => {
            if (!response.ok) {
                throw new Error("Ошибка при получении записи");
            }
            return response.json();
        })
        .then((record) => {
            // Генерируем форму с текущими значениями
            const formFields = Object.keys(record)
                .map(
                    (key) => `
                        <label for="${key}">${key}:</label>
                        <input type="text" id="${key}" name="${key}" value="${record[key]}" required>
                        <br>
                    `
                )
                .join("");

            // Открываем модальное окно с формой
            openModal(
                "Изменить запись",
                `<form id="edit-form">${formFields}</form>`,
                () => {
                    const form = document.getElementById("edit-form");
                    const formData = Object.fromEntries(new FormData(form));

                    // Отправляем обновлённые данные на сервер
                    fetch(`/api/${tableName}/${id}`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(formData),
                    })
                        .then((response) => {
                            if (!response.ok) {
                                throw new Error("Ошибка при изменении записи");
                            }
                            return response.json();
                        })
                        .then((data) => {
                            console.log("Запись изменена:", data);
                            closeModal();
                            refreshTable(tableName); // Обновляем таблицу
                        })
                        .catch((error) => {
                            console.error("Ошибка:", error);
                            alert("Не удалось изменить запись.");
                        });
                }
            );
        })
        .catch((error) => {
            console.error("Ошибка при получении записи:", error);
            alert("Не удалось загрузить данные записи.");
        });
}


// Delete
function deleteRecord(tableName, id) {
    openModal(
        "Удалить запись",
        `<p>Вы уверены, что хотите удалить запись с ID: ${id}?</p>`,
        () => {
            fetch(`/api/${tableName}/${id}`, {
                method: "DELETE",
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Ошибка при удалении записи");
                    }
                    return response.json();
                })
                .then((data) => {
                    console.log("Запись удалена:", data);
                    closeModal();
                    refreshTable(tableName); // Обновить таблицу
                })
                .catch((error) => {
                    console.error("Ошибка:", error);
                    alert("Не удалось удалить запись.");
                });
        }
    );
}

function refreshTable(tableName) {
    fetch(`/api/${tableName}`)
        .then((response) => response.json())
        .then((data) => {
            renderTable(data, tableName); // Обновляем таблицу
        })
        .catch((error) => {
            console.error("Ошибка при обновлении таблицы:", error);
        });
}


function openModal(title, bodyContent, actionCallback) {
    const modal = document.getElementById("modal");
    const modalTitle = document.getElementById("modal-title");
    const modalBody = document.getElementById("modal-body");
    const modalActionButton = document.getElementById("modal-action-button");

    modalTitle.textContent = title; // Устанавливаем заголовок
    modalBody.innerHTML = bodyContent; // Устанавливаем контент
    modalActionButton.onclick = actionCallback; // Устанавливаем действие

    modal.style.display = "block"; // Показываем модальное окно
}

function closeModal() {
    const modal = document.getElementById("modal");
    modal.style.display = "none"; // Скрываем модальное окно
}

// Закрытие модального окна при клике вне его
window.onclick = function (event) {
    const modal = document.getElementById("modal");
    if (event.target === modal) {
        closeModal();
    }
};


// function generateReport() {
//     console.log("Запрос на генерацию отчёта отправлен.");
//
//     fetch(`/api/report`, {
//         method: "GET",
//     })
//         .then((response) => {
//             if (!response.ok) {
//                 throw new Error("Ошибка формирования отчёта");
//             }
//             return response.blob(); // Получаем файл как Blob
//         })
//         .then((blob) => {
//             // Создаём ссылку для скачивания файла
//             const url = window.URL.createObjectURL(blob);
//             const a = document.createElement("a");
//             a.href = url;
//             a.download = "output.pdf"; // Имя сохраняемого файла
//             a.click();
//             window.URL.revokeObjectURL(url);
//             console.log("Отчёт успешно скачан.");
//         })
//         .catch((error) => {
//             console.error("Ошибка:", error);
//             alert("Не удалось сформировать отчёт.");
//         });
// };
document.getElementById("generateReportButton").addEventListener("click", generateReport);

function generateReport() {
    // Получаем данные из полей формы
    const productName = document.getElementById("productName").value.trim();
    const firm = document.getElementById("firm").value.trim();
    const model = document.getElementById("model").value.trim();
    const month = document.getElementById("month").value;
    const year = document.getElementById("year").value;

    // Проверка на заполнение всех полей
    if (!productName || !firm || !model || !month || !year) {
        alert("Пожалуйста, заполните все поля!");
        return;
    }

    // Отправка POST-запроса на сервер
    fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, firm, model, month, year })
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Ошибка формирования отчёта.");
            }
            return response.blob();
        })
        .then((blob) => {
            // Создаём ссылку для скачивания PDF-файла
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "output.pdf";
            a.click();
            window.URL.revokeObjectURL(url);
            console.log("Отчёт успешно скачан.");

            // Закрываем модальное окно после успешного скачивания
            closeModal();
        })
        .catch((error) => {
            console.error("Ошибка:", error);
            alert("Не удалось сформировать отчёт.");
        });
}

// Открытие модального окна
function openReportModal() {
    document.getElementById("modal").style.display = "block";
}

// Закрытие модального окна
function closeModal() {
    document.getElementById("modal").style.display = "none";
}

// Закрытие модального окна при клике вне модального контента
window.addEventListener("click", (event) => {
    if (event.target === document.getElementById("modal")) {
        closeModal();
    }
});

// function generateCustomReport() {
//     const productName = prompt("Введите название товара:");
//     const firm = prompt("Введите фирму товара:");
//     const model = prompt("Введите модель товара:");
//
//     if (!productName || !firm || !model) {
//         alert("Все поля должны быть заполнены!");
//         return;
//     }
//
//     console.log("Отправка запроса с параметрами:", { productName, firm, model });
//     fetch(`/api/report/custom?name=${encodeURIComponent(productName)}&firm=${encodeURIComponent(firm)}&model=${encodeURIComponent(model)}`)
//         .then((response) => {
//             if (!response.ok) {
//                 throw new Error("Ошибка при получении отчёта");
//             }
//             return response.json();
//         })
//         .then((data) => {
//             renderReportTable(data);
//         })
//         .catch((error) => {
//             console.error("Ошибка:", error);
//             alert("Не удалось получить отчёт.");
//         });
// }
//
// function renderReportTable(data) {
//     const container = document.getElementById("table-container");
//     let tableHtml = "<table border='1'><thead><tr>";
//
//     if (data.length === 0) {
//         container.innerHTML = "<p>Данные для отчёта отсутствуют</p>";
//         return;
//     }
//
//     // Заголовки таблицы
//     Object.keys(data[0]).forEach((key) => {
//         tableHtml += `<th>${key}</th>`;
//     });
//     tableHtml += "</tr></thead><tbody>";
//
//     // Строки таблицы
//     data.forEach((row) => {
//         tableHtml += "<tr>";
//         Object.values(row).forEach((value) => {
//             tableHtml += `<td>${value}</td>`;
//         });
//         tableHtml += "</tr>";
//     });
//
//     tableHtml += "</tbody></table>";
//     container.innerHTML = tableHtml;
// }
