const express = require('express');
const path = require('path');
const mysql = require("mysql2");
const cors = require("cors");
const fs = require("fs");

const app = express();

// Middleware для обработки JSON и данных форм
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Указываем папку с вашими статическими файлами
app.use(express.static(path.join(__dirname, 'public')));

// Подключение к базе данных
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    database: "evm",
    password: "admin"
});

connection.connect(err => {
    if (err) {
        console.error("Ошибка подключения к базе данных:", err.message);
    } else {
        console.log("Подключение к серверу MySQL успешно установлено");
    }
});



//CRUD
// Добавление записи
app.post("/api/:table", (req, res) => {
    const { table } = req.params;
    const data = req.body;

    console.log("Параметр table:", table);
    console.log("Полученные данные:", data);

    // Определяем разрешённые таблицы и их поля
    const tableFields = {
        shop: ["email", "payment_for_delivery"],
        product: ["name", "firm", "model", "tech_spec", "price", "warranty_period", "image"],
        orders: ["shop_id_shop", "product_id_product", "order_date", "order_time", "quantity", "client_name", "client_phone", "confirmation"],
        delivery: ["order_id_order", "date", "address", "client_name", "courier_name"],
    };

    // Проверка на существование таблицы
    const requiredFields = tableFields[table];
    if (!requiredFields) {
        return res.status(400).json({
            error: "Таблица недоступна или не существует.",
            table: table
        });
    }

    // Проверка на наличие обязательных полей
    const missingFields = requiredFields.filter((field) => !(field in data));
    if (missingFields.length) {
        return res.status(400).json({
            error: "Отсутствуют обязательные поля",
            missingFields,
        });
    }

    // Генерация SQL-запроса
    const sql = `INSERT INTO ${table} (${requiredFields.join(", ")}) VALUES (${requiredFields.map(() => "?").join(", ")})`;

    // Выполнение SQL-запроса
    connection.query(sql, requiredFields.map((field) => data[field]), (err, result) => {
        if (err) {
            console.error("Ошибка добавления:", err.message);
            return res.status(500).json({ error: "Ошибка сервера", details: err.message });
        }
        res.json({ message: "Запись добавлена", insertId: result.insertId });
    });
});


// Получение данных из таблицы
app.get("/api/:table", (req, res) => {
    const table = req.params.table;

    // Проверка на доступные таблицы
    const allowedTables = ["delivery", "orders", "product", "shop"];
    if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: "Таблица недоступна" });
    }

    // Запрос к базе данных
    connection.query(`SELECT * FROM ${table}`, (err, results) => {
        if (err) {
            console.error("Ошибка запроса:", err.message);
            return res.status(500).json({ error: "Ошибка сервера" });
        }
        res.json(results);
    });
});

// Изменение записи
app.put("/api/:table/:id", (req, res) => {
    const { table, id } = req.params;
    const data = req.body;

    // Список разрешенных таблиц и их ключей
    const tableKeys = {
        delivery: "id_delivery",
        orders: "id_order",
        product: "id_product",
        shop: "id_shop",
    };

    // Проверяем, существует ли таблица
    const primaryKey = tableKeys[table];
    if (!primaryKey) {
        return res.status(400).json({ error: "Таблица недоступна" });
    }

    connection.query(`UPDATE ${table} SET ? WHERE ${primaryKey} = ?`, [data, id], (err, result) => {
        if (err) {
            console.error("Ошибка изменения:", err.message);
            return res.status(500).json({ error: "Ошибка сервера" });
        }
        res.json({ message: "Запись обновлена", affectedRows: result.affectedRows });
    });
});


// Удаление записи
app.delete("/api/:table/:id", (req, res) => {
    const { table, id } = req.params;

    // Список разрешенных таблиц и их ключей
    const tableKeys = {
        delivery: "id_delivery",
        order: "id_orders",
        product: "id_product",
        shop: "id_shop",
    };

    // Проверяем, существует ли таблица
    const primaryKey = tableKeys[table];
    if (!primaryKey) {
        return res.status(400).json({ error: "Таблица недоступна" });
    }

    // Выполняем запрос на удаление
    connection.query(`DELETE FROM ${table} WHERE ${primaryKey} = ?`, [id], (err, result) => {
        if (err) {
            console.error("Ошибка удаления:", err.message);
            return res.status(500).json({ error: "Ошибка сервера" });
        }
        res.json({ message: "Запись удалена", affectedRows: result.affectedRows });
    });
});


// Получение записи по ID
app.get("/api/:table/:id", (req, res) => {
    const { table, id } = req.params;

    const tablePrimaryKeys = {
        delivery: "id_delivery",
        orders: "id_order",
        product: "id_product",
        shop: "id_shop",
    };

    const primaryKey = tablePrimaryKeys[table];

    if (!primaryKey) {
        return res.status(400).json({ error: "Таблица недоступна" });
    }

    connection.query(
        `SELECT * FROM ${table} WHERE ${primaryKey} = ?`,
        [id],
        (err, results) => {
            if (err) {
                console.error("Ошибка при получении записи:", err.message);
                return res.status(500).json({ error: "Ошибка сервера" });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: "Запись не найдена" });
            }
            res.json(results[0]); // Возвращаем первую запись
        }
    );
});


// Формирование отчёта
async function createPDF(outputFileName, month, year, productName, firm, model) {
    return new Promise(async (resolve, reject) => {
        const doc = new PDFDocument({ margin: 30, size: "A4" });
        const tempPath = path.join(__dirname, outputFileName);
        const writeStream = fs.createWriteStream(tempPath);
        doc.pipe(writeStream);

        try {
            // Заголовок
            doc.fontSize(14).text("Сведения об исполненных заказах товаров в интернет-магазинах", { align: "center" });
            doc.fontSize(12).text(`за ${month} месяц ${year} года`, { align: "center" });
            doc.moveDown();

            // SQL-запрос для получения данных
            const query = `
                SELECT
                    s.email AS 'Интернет-магазин',
                    o.order_date AS 'Дата заказа',
                    o.order_time AS 'Время заказа',
                    p.price AS 'Цена, руб.',
                    o.quantity AS 'Количество',
                    o.client_name AS 'ФИО клиента',
                    (p.price * o.quantity) AS 'Стоимость заказа, руб.'
                FROM
                    evm.product AS p
                JOIN
                    evm.orders AS o ON p.id_product = o.product_id_product
                JOIN
                    evm.shop AS s ON o.shop_id_shop = s.id_shop
                WHERE
                    p.name = ? AND p.firm = ? AND p.model = ?;
            `;

            const [rows] = await connection.execute(query, [productName, firm, model]);

            if (rows.length === 0) {
                doc.text("Данные для отчёта не найдены.", { align: "center" });
                doc.end();
                return resolve();
            }

            // Заголовки таблицы
            const startX = 30;
            const startY = 150;
            const rowHeight = 20;
            const colWidths = [150, 70, 70, 70, 70, 120, 100];
            const columns = ["Интернет-магазин", "Дата", "Время", "Цена", "Кол-во", "ФИО клиента", "Стоимость"];

            doc.rect(startX, startY, 540, rowHeight).stroke();
            let currentX = startX;
            columns.forEach((col, i) => {
                doc.text(col, currentX, startY + 5, { width: colWidths[i], align: "center" });
                currentX += colWidths[i];
            });

            // Данные таблицы
            let currentY = startY + rowHeight;
            rows.forEach((row) => {
                currentX = startX;
                Object.values(row).forEach((value, i) => {
                    doc.text(value.toString(), currentX, currentY + 5, { width: colWidths[i], align: "center" });
                    currentX += colWidths[i];
                });
                currentY += rowHeight;
            });

            doc.end();

            writeStream.on("finish", () => resolve());
        } catch (error) {
            reject(error);
        }
    });
}

// Маршрут для генерации отчёта
app.post("/api/report", async (req, res) => {
    const { productName, firm, model, month, year } = req.body;

    console.log("Получены параметры:", { productName, firm, model, month, year });

    if (!productName || !firm || !model || !month || !year) {
        return res.status(400).json({ error: "Все параметры обязательны." });
    }

    try {
        const outputFileName = "output.pdf";
        await createPDF(outputFileName, month, year, productName, firm, model);

        const filePath = path.join(__dirname, outputFileName);
        res.download(filePath, outputFileName, () => {
            fs.unlinkSync(filePath); // Удаление файла после отправки
        });
    } catch (error) {
        console.error("Ошибка генерации отчёта:", error.message);
        res.status(500).json({ error: "Ошибка сервера при создании отчёта." });
    }
});




// // Получение отчёта по запросу с параметрами
// app.get("/api/report/custom", (req, res) => {
//     const { name, firm, model } = req.query;
//
//     console.log("Получены параметры запроса:", { name, firm, model });
//     const sql = `
//         SELECT
//             p.name AS 'Название товара',
//             p.firm AS 'Фирма',
//             p.model AS 'Модель',
//             s.email AS 'Интернет-магазин',
//             o.order_date AS 'Дата заказа',
//             o.order_time AS 'Время заказа',
//             CAST(p.price AS DECIMAL(10, 2)) AS 'Цена, руб.',
//             CAST(o.quantity AS INT) AS 'Количество',
//             o.client_name AS 'ФИО клиента',
//             CAST(p.price AS DECIMAL(10, 2)) * CAST(o.quantity AS INT) AS 'Стоимость заказа, руб.'
//         FROM
//             evm.product AS p
//         JOIN
//             evm.orders AS o ON p.id_product = o.product_id_product
//         JOIN
//             evm.shop AS s ON o.shop_id_shop = s.id_shop
//         WHERE
//             p.name = ? AND
//             p.firm = ? AND
//             p.model = ?
//     `;
//
//     connection.query(sql, [name, firm, model], (err, results) => {
//         if (err) {
//             console.error("Ошибка при получении отчёта:", err.message);
//             return res.status(500).json({ error: "Ошибка сервера" });
//         }
//         res.json(results);
//     });
// });




// Запуск сервера
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});


