const PDFDocument = require("pdfkit");
const fs = require("fs");
const mysql = require("mysql2/promise");



/**
 * Создает PDF-документ.
 * @param {mysql.createPool} pool - пул соединений
 * @param {} month
 * @param {} year 
 * @param {} productName 
 * @param {} firm 
 * @param {} model
 */
async function createPDF(pool = mysql.createPool({
                                                    host: 'localhost',
                                                    user: 'admin',
                                                    password: 'admin',
                                                    database: 'evm',
                                                    port: 33060,
                                                    waitForConnections: true,
                                                    connectionLimit: 10,
                                                    queueLimit: 0
                                                }), 
                                                    month = 1, 
                                                    year = 2020, 
                                                    productName = "1", 
                                                    firm = "1", 
                                                    model = "1") 
                                                    {

    

    const outputFileName = "output.pdf";
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

    console.log("Параметры запроса:", { productName, firm, model });

    const [rows] = await pool.execute(query, [productName, firm, model]);
    

    if (rows.length === 0) {
        doc.text("Данные для отчёта не найдены.", { align: "center" });
        doc.end();
        return;
    }

    // Заголовки таблицы
    const startX = 30;
    const startY = 150;
    const rowHeight = 35;
    const colWidths = [120, 65, 65, 65, 65, 60, 100];
    const columns = ["Интернет-магазин", "Дата заказа", "Время заказа", "Цена, руб.", "Количество", "ФИО клиента", "Стоимость заказа, руб."];

    // Рисуем рамку для заголовков
    doc.rect(startX, startY, 540, rowHeight).stroke();

    let currentX = startX;

    // Вывод заголовков с разграничением столбцов
    columns.forEach((col, i) => {
        doc.text(col, currentX, startY + 5, { width: colWidths[i], align: "center" });
        if (i > 0) {
            doc.moveTo(currentX, startY).lineTo(currentX, startY + rowHeight).stroke();
        }
        currentX += colWidths[i];
    });

    // Данные таблицы
    let currentY = startY + rowHeight;

    rows.forEach((row) => {
        currentX = startX;

        // Рисуем рамку для строки
        doc.rect(startX, currentY, 540, rowHeight).stroke();

        // Вывод данных строки с разграничением столбцов
        Object.values(row).forEach((value, i) => {
            doc.text(value.toString(), currentX, currentY + 5, { width: colWidths[i], align: "center" });
            if (i > 0) {
                doc.moveTo(currentX, currentY).lineTo(currentX, currentY + rowHeight).stroke();
            }
            currentX += colWidths[i];
        });

        currentY += rowHeight;
    });

    

    // Текст под таблицей
    const footerStartY = currentY + 10;

    doc.text(`Название товара: ${productName}`, startX, footerStartY);
    doc.text(`Фирма: ${firm}`, startX, footerStartY + 15);
    doc.text(`Модель: ${model}`, startX, footerStartY + 30);

    const totalCost = rows.reduce((sum, row) => sum + (parseFloat(row["Стоимость заказа, руб."]) || 0), 0);
    // Итог по модели
    doc.text(`Итого по модели: .............................................. ${totalCost.toFixed(2)}`, startX, footerStartY + 60);
    doc.moveTo(startX, footerStartY + 80).lineTo(startX + 540, footerStartY + 80).stroke();


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