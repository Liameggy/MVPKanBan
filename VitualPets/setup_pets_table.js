const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./data.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the database.');
});

const sql = fs.readFileSync('./DataBase/setup_pets.sql', 'utf8');

db.exec(sql, (err) => {
    if (err) {
        console.error('Error executing SQL:', err.message);
        process.exit(1);
    }
    console.log('Pets table created successfully!');
    
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        }
    });
});
