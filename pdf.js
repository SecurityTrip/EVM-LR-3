const PDFDocument = require("pdfkit");
const fs = require("fs");

/**
 * Создает PDF-документ с заданным заголовком, именем файла и шрифтом.
 * @param {string} outputFileName - Имя выходного файла PDF.
 * @param {string} fontPath - Путь к шрифту, поддерживающему кириллицу.
 * @param {string} header - Заголовок документа.
 */
function createPDF(outputFileName, header) {
    const fontPath = "timesnewromanpsmt.ttf";
    // Создаем новый PDF-документ
    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    // Подключаем шрифт
    doc.registerFont('CustomFont', fontPath);
    doc.font('CustomFont');

    // Пишем поток в файл
    doc.pipe(fs.createWriteStream(outputFileName));

    // Заголовок
    doc.fontSize(12).text(header, { align: "center" });
    doc.text(`за ______ месяц ______ года`, { align: "center" });
    doc.moveDown();

    // Рисуем таблицу
    const startX = 30;
    const startY = 100;
    const tableWidth = 540;
    const rowHeight = 30;
    const colWidths = [100, 70, 70, 50, 50, 120, 80]; // Ширина колонок
    const columns = [
        "Интернет-магазин", "Дата заказа", "Время заказа", "Цена, руб.",
        "Количество", "ФИО клиента", "Стоимость заказа, руб."
    ];

    // Рисуем заголовки таблицы
    doc.rect(startX, startY, tableWidth, rowHeight).stroke();
    let currentX = startX;
    columns.forEach((col, i) => {
        const colWidth = colWidths[i];
        doc.text(col, currentX + 5, startY + 10, { width: colWidth, align: "center" });
        doc.rect(currentX, startY, colWidth, rowHeight).stroke();
        currentX += colWidth;
    });

    // Добавляем строки для данных
    doc.rect(startX, startY + rowHeight, tableWidth, rowHeight).stroke(); // Первая строка

    // Подписи под таблицей
    doc.moveDown(3).text("Название товара: ______________________________", startX);
    doc.text("Фирма: _________________________________________", startX);
    doc.text("Модель: ________________________________________", startX);
    doc.moveDown();
    doc.text("Итого по модели: ............................................... руб. ", startX);

    // Завершаем документ
    doc.end();

    console.log(`PDF создан: ${outputFileName}`);
}

// Экспортируем функцию для использования в других модулях
module.exports = createPDF;

const outputFileName = "output.pdf";
const header = "Сведения об исполненных заказах товаров в интернет-магазинах";
createPDF(outputFileName, header);