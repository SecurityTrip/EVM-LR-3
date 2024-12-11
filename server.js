const express = require('express');
const path = require('path');
const mysql = require("mysql2");
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

// Подключение к базе данных
const connection = mysql.createConnection({
    host: "localhost",
    user: "admin",
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

// Формирование отчёта
app.get("/api/createReport", (req, res) => {
    const outputFileName = "output.pdf";
    const header = "Сведения об исполненных заказах товаров в интернет-магазинах";

    createPDF(outputFileName, header);

    const filePath = path.join(__dirname, outputFileName);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error("Ошибка: PDF не найден или повреждён.");
            return res.status(500).send({ error: "Ошибка формирования отчёта" });
        }

        res.download(filePath, outputFileName, (err) => {
            if (err) {
                console.error("Ошибка при отправке файла:", err);
                return res.status(500).send({ error: "Ошибка отправки файла" });
            }

            console.log("Отчёт успешно отправлен.");
            fs.unlink(filePath, (err) => {
                if (err) console.error("Ошибка удаления файла:", err);
            });
        });
    });
});

//CRUD
// Добавление записи
app.post("/api/:table", (req, res) => {
    const { table } = req.params;
    const data = req.body;

    // Определяем разрешённые таблицы и их поля
    const tableFields = {
        shop: ["email", "payment_for_delivery"],
        product: ["name", "firm", "model", "tech_spec", "price", "warranty_period", "image"],
        orders: ["shop_id_shop", "product_id_product", "order_date", "order_time", "quantity", "client_name", "client_phone", "confirmation"],
        delivery: ["order_id_order", "date", "address", "client_name", "courier_name"],
    };

    // Проверка наличия таблицы в списке разрешённых
    if (!Object.keys(tableFields).includes(table)) {
        return res.status(400).json({ error: "Таблица недоступна" });
    }

    // Проверка наличия обязательных полей
    const requiredFields = tableFields[table];
    const missingFields = requiredFields.filter((field) => !(field in data));
    if (missingFields.length) {
        return res.status(400).json({
            error: "Отсутствуют обязательные поля",
            missingFields,
        });
    }

    // Генерация запроса
    const sql = `INSERT INTO ${table} (${requiredFields.join(", ")}) VALUES (${requiredFields.map(() => "?").join(", ")})`;

    // Выполнение запроса
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




// Запуск сервера
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
