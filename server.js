const express = require('express');
const path = require('path');
const mysql = require("mysql2/promise");
const cors = require("cors");
const fs = require("fs");
const createPDF = require("./pdf.js");

const app = express();

// Middleware для обработки JSON и данных форм
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Указываем папку с вашими статическими файлами
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    console.log(`Запрос: ${req.method} ${req.url}`);
    next();
});

// Создаем пул соединений
const pool = mysql.createPool({
    host: 'localhost',
    user: 'admin',
    password: 'admin',
    database: 'evm',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Проверяем подключение при запуске сервера
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Успешное подключение к базе данных!');
        connection.release(); // Освобождаем соединение
    } catch (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    }
})();

// Формирование отчёта
app.get("/api/createReport/:name/:firm/:model/:month/:year", async (req, res) => {
    console.log("Запрос на формирование отчёта получен.");
    const { name, firm, model, month, year } = req.params;

    console.log("Название товара:", name);
    console.log("Фирма:", firm);
    console.log("Модель:", model);
    console.log("Месяц:", month);
    console.log("Год:", year);

    const outputFileName = "output.pdf";

    try {
        // Генерация PDF
        await createPDF(pool, month, year, name, firm, model);
        console.log("PDF отчёт успешно сгенерирован.");

        const filePath = path.join(__dirname, outputFileName);
        console.log("Путь к файлу:", filePath);

        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                console.error("Файл не найден после генерации:", err);
                return res.status(500).send({ error: "Ошибка формирования отчёта" });
            }

            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Content-Disposition', `attachment; filename=${outputFileName}`);
            res.setHeader('Content-Type', 'application/pdf');

            // Отправляем файл
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);

            fileStream.on('error', (error) => {
                res.status(500).send('Error occurred while reading the file');
            });
        });
    } catch (error) {
        console.error("Ошибка при формировании отчёта:", error.message);
        res.status(500).send({ error: "Ошибка формирования отчёта" });
    }
});

// CRUD
// Добавление записи
app.post("/api/:table", async (req, res) => {
    const { table } = req.params;
    const data = req.body;

    const tableFields = {
        shop: ["email", "payment_for_delivery"],
        product: ["name", "firm", "model", "tech_spec", "price", "warranty_period", "image"],
        orders: ["shop_id_shop", "product_id_product", "order_date", "order_time", "quantity", "client_name", "client_phone", "confirmation"],
        delivery: ["order_id_order", "date", "address", "client_name", "courier_name"],
    };

    if (!Object.keys(tableFields).includes(table)) {
        return res.status(400).json({ error: "Таблица недоступна" });
    }

    const requiredFields = tableFields[table];
    const missingFields = requiredFields.filter((field) => !(field in data));
    if (missingFields.length) {
        return res.status(400).json({
            error: "Отсутствуют обязательные поля",
            missingFields,
        });
    }

    const sql = `INSERT INTO ${table} (${requiredFields.join(", ")}) VALUES (${requiredFields.map(() => "?").join(", ")})`;

    try {
        const [result] = await pool.query(sql, requiredFields.map((field) => data[field]));
        res.json({ message: "Запись добавлена", insertId: result.insertId });
    } catch (err) {
        console.error("Ошибка добавления:", err.message);
        res.status(500).json({ error: "Ошибка сервера", details: err.message });
    }
});

// Получение данных из таблицы
app.get("/api/:table", async (req, res) => {
    const { table } = req.params;

    const allowedTables = ["delivery", "orders", "product", "shop"];
    if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: "Таблица недоступна" });
    }

    try {
        const [results] = await pool.query(`SELECT * FROM ${table}`);
        res.json(results);
    } catch (err) {
        console.error("Ошибка запроса:", err.message);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Изменение записи
app.put("/api/:table/:id", async (req, res) => {
    const { table, id } = req.params;
    const data = req.body;

    const tableKeys = {
        delivery: "id_delivery",
        orders: "id_order",
        product: "id_product",
        shop: "id_shop",
    };

    const primaryKey = tableKeys[table];
    if (!primaryKey) {
        return res.status(400).json({ error: "Таблица недоступна" });
    }

    try {
        const [result] = await pool.query(`UPDATE ${table} SET ? WHERE ${primaryKey} = ?`, [data, id]);
        res.json({ message: "Запись обновлена", affectedRows: result.affectedRows });
    } catch (err) {
        console.error("Ошибка изменения:", err.message);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Удаление записи
app.delete("/api/:table/:id", async (req, res) => {
    const { table, id } = req.params;

    const tableKeys = {
        delivery: "id_delivery",
        orders: "id_order",
        product: "id_product",
        shop: "id_shop",
    };

    const primaryKey = tableKeys[table];
    if (!primaryKey) {
        return res.status(400).json({ error: "Таблица недоступна" });
    }

    try {
        const [result] = await pool.query(`DELETE FROM ${table} WHERE ${primaryKey} = ?`, [id]);
        res.json({ message: "Запись удалена", affectedRows: result.affectedRows });
    } catch (err) {
        console.error("Ошибка удаления:", err.message);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Получение записи по ID
app.get("/api/:table/:id", async (req, res) => {
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

    try {
        const [results] = await pool.query(`SELECT * FROM ${table} WHERE ${primaryKey} = ?`, [id]);
        if (results.length === 0) {
            return res.status(404).json({ error: "Запись не найдена" });
        }
        res.json(results[0]);
    } catch (err) {
        console.error("Ошибка при получении записи:", err.message);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Запуск сервера
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
