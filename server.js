const express = require('express');
const path = require('path');
const mysql = require("mysql2");

const app = express();

// Middleware для обработки JSON и данных форм
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Указываем папку с вашими статическими файлами
app.use(express.static(path.join(__dirname, 'public')));

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

// Обработчики форм

// Добавление магазина
app.post('/add-shop', (req, res) => {
    const { email, payment_for_delivery } = req.body;

    // Убедимся, что все поля заполнены
    if (!email) {
        return res.status(400).send('Все поля обязательны');
    }

    // Преобразуем значение чекбокса
    const payment = payment_for_delivery === "on" ? "Yes" : "No";

    // SQL-запрос на добавление
    const sql = "INSERT INTO shop (email, payment_for_delivery) VALUES (?, ?)";
    connection.query(sql, [email, payment], (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Ошибка добавления магазина');
        } else {
            res.send('Магазин успешно добавлен');
        }
    });
});


// Добавление товара
app.post('/add-product', (req, res) => {
    const { id_product, name, firm, model, tech_spec, price, warranty_period, image } = req.body;
    if (!id_product || !name || !firm || !model || !tech_spec || !price || !warranty_period || !image) {
        return res.status(400).send('Все поля обязательны');
    }
    const sql = "INSERT INTO product (id_product, name, firm, model, tech_spec, price, warranty_period, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    connection.query(sql, [id_product, name, firm, model, tech_spec, price, warranty_period, image], (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Ошибка добавления товара');
        } else {
            res.send('Товар успешно добавлен');
        }
    });
});

// Добавление заказа
app.post('/add-order', (req, res) => {
    const { id_order, shop_id_shop, product_id_product, order_date, order_time, quantity, client_name, client_phone, confirmation } = req.body;
    if (!id_order || !shop_id_shop || !product_id_product || !order_date || !order_time || !quantity || !client_name || !client_phone) {
        return res.status(400).send('Все поля обязательны');
    }

    // Преобразуем значение чекбокса
    const confirmationCheck = confirmation === "on" ? "Confirmed" : "Unconfirmed";

    const sql = "INSERT INTO `order` (id_order, shop_id_shop, product_id_product, order_date, order_time, quantity, client_name, client_phone, confirmation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    connection.query(sql, [id_order, shop_id_shop, product_id_product, order_date, order_time, quantity, client_name, client_phone, confirmationCheck], (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Ошибка добавления заказа');
        } else {
            res.send('Заказ успешно добавлен');
        }
    });
});

// Добавление доставки
app.post('/add-delivery', (req, res) => {
    const { id_delivery, order_id_order, date, address, client_name, courier_name } = req.body;
    if (!id_delivery || !order_id_order || !date || !address || !client_name || !courier_name) {
        return res.status(400).send('Все поля обязательны');
    }
    const sql = "INSERT INTO delivery (id_delivery, order_id_order, date, address, client_name, courier_name) VALUES (?, ?, ?, ?, ?, ?)";
    connection.query(sql, [id_delivery, order_id_order, date, address, client_name, courier_name], (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Ошибка добавления доставки');
        } else {
            res.send('Доставка успешно добавлена');
        }
    });
});

// Запуск сервера
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
