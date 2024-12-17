# Требования
* [NodeJS](https://nodejs.org/en) - скачать и установить

# Использование
1. Запустить ```npm install``` - устанавливает зависимости (если npm не работает перезагрузить комп)
2. В коде в файле [server.js](server.js)
```js
const pool = mysql.createPool({
    host: 'localhost',
    user: 'admin',
    password: 'admin',
    database: 'evm',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
```
нужно заменить ```host```, ```user```, ```password```, ```database```  на свои имя пользователя и его пароль
3. БД нужно создавать и заполнять с помощью файла [DB_create_fill.sql](DB_create_fill.sql)

# Запуск
```node server.js``` - запускает приложение в консоли будет адрес по которому работает сервер
