const PDFDocument = require("pdfkit");
const fs = require("fs");
const mysql = require("mysql2");


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

/**
 * Создает PDF-документ с заданным заголовком, именем файла и шрифтом.
 * @param {string} outputFileName - Имя выходного файла PDF.
 * @param {string} fontPath - Путь к шрифту, поддерживающему кириллицу.
 * @param {string} header - Заголовок документа.
 */
async function createPDF(month, year, productName, firm, model) {
    const outputFileName = "output.pdf";
    const header = "Сведения об исполненных заказах товаров в интернет-магазинах";
    const fontPath = "timesnewromanpsmt.ttf";
    // Создаем новый PDF-документ
    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    // Подключаем шрифт
    doc.registerFont('CustomFont', fontPath);
    doc.font('CustomFont');

    // Пишем поток в файл
    doc.pipe(fs.createWriteStream(outputFileName));

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

    // Когда процесс завершится, вызовем callback
    doc.on('finish', () => callback(null));
    doc.on('finish', () => console.log("finish"));
    doc.on('error', (err) => callback(err));

    console.log(`PDF создан: ${outputFileName}`);
}

// Экспортируем функцию для использования в других модулях
module.exports = createPDF;


createPDF();