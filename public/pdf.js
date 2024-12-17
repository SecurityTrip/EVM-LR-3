// const PDFDocument = require("pdfkit");
// const fs = require("fs");
// const mysql = require("mysql2/promise");
//
// /**
//  * Создает PDF-документ с заданными данными из базы данных.
//  * @param {string} outputFileName - Имя выходного файла PDF.
//  * @param {string} header - Заголовок документа.
//  * @param {int} month - Месяц.
//  * @param {int} year - Год.
//  * @param {string} productName - Название товара.
//  * @param {string} firm - Фирма.
//  * @param {string} model - Модель.
//  * @param {string} dbConfig - Конфигурация подключения к базе данных.
//  */
// async function createPDF(outputFileName, header, month, year, productName, firm, model) {
//     const fontPath = "timesnewromanpsmt.ttf";
//     const doc = new PDFDocument({ margin: 30, size: "A4" });
//
//     // Подключаем шрифт
//     doc.registerFont("CustomFont", fontPath);
//     doc.font("CustomFont");
//
//     // Пишем поток в файл
//     doc.pipe(fs.createWriteStream(outputFileName));
//
//     // Заголовок
//     doc.fontSize(12).text(header, { align: "center" });
//     doc.text(`за ${month} месяц ${year} года`, { align: "center" });
//     doc.moveDown();
//
//     let connection;
//
//     try {
//         // Подключение к базе данных
//         connection = await mysql.createConnection({
//             host: "localhost",
//             user: "root",
//             database: "evm",
//             password: "admin"
//         });
//
//         // SQL-запрос
//         const query = `
//             SELECT
//                 p.name AS 'Название товара',
//                 p.firm AS 'Фирма',
//                 p.model AS 'Модель',
//                 s.email AS 'Интернет-магазин',
//                 o.order_date AS 'Дата заказа',
//                 o.order_time AS 'Время заказа',
//                 p.price AS 'Цена, руб.',
//                 o.quantity AS 'Количество',
//                 o.client_name AS 'ФИО клиента',
//                 (p.price * o.quantity) AS 'Стоимость заказа, руб.'
//             FROM
//                 evm.product AS p
//             JOIN
//                 evm.orders AS o ON p.id_product = o.product_id_product
//             JOIN
//                 evm.shop AS s ON o.shop_id_shop = s.id_shop
//             WHERE
//                 p.name = ? AND
//                 p.firm = ? AND
//                 p.model = ?;
//         `;
//
//         // Выполняем запрос
//         const [rows] = await connection.execute(query, [productName, firm, model]);
//
//         // Проверка на пустой результат
//         if (rows.length === 0) {
//             doc.text("Данные по запросу не найдены.", { align: "center" });
//             doc.end();
//             console.log("PDF создан, но данные отсутствуют.");
//             return;
//         }
//
//         // Настройки таблицы
//         const startX = 30;
//         const startY = 100;
//         const tableWidth = 540;
//         const rowHeight = 40;
//         const colWidths = [105, 70, 70, 50, 65, 105, 75]; // Ширина колонок
//         const columns = [
//             "Интернет-магазин", "Дата заказа", "Время заказа", "Цена, руб.",
//             "Количество", "ФИО клиента", "Стоимость заказа, руб."
//         ];
//
//         // Рисуем заголовки таблицы
//         doc.rect(startX, startY, tableWidth, rowHeight).stroke();
//         let currentX = startX;
//         columns.forEach((col, i) => {
//             const colWidth = colWidths[i];
//             doc.text(col, currentX, startY + 10, { width: colWidth, align: "center" });
//             doc.rect(currentX, startY, colWidth, rowHeight).stroke();
//             currentX += colWidth;
//         });
//
//         // Рисуем строки с данными
//         let currentY = startY + rowHeight;
//         rows.forEach((row) => {
//             currentX = startX;
//             Object.values(row).slice(3).forEach((value, i) => {
//                 const colWidth = colWidths[i];
//                 doc.text(value.toString(), currentX, currentY + 10, { width: colWidth, align: "center" });
//                 doc.rect(currentX, currentY, colWidth, rowHeight).stroke();
//                 currentX += colWidth;
//             });
//             currentY += rowHeight;
//         });
//
//     } catch (error) {
//         console.error("Ошибка при создании PDF:", error);
//         doc.text("Произошла ошибка при формировании отчёта.", { align: "center" });
//     } finally {
//         // Закрываем соединение с базой данных
//         if (connection) await connection.end();
//     }
//
//     // Завершаем документ
//     doc.end();
//     console.log(`PDF создан: ${outputFileName}`);
//
//
// }
