const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;
const path = require('path');

const SECRET_KEY = 'keep_this_secret';

app.set('trust proxy', true);
app.set('view engine', 'ejs');
app.set("views", path.join(__dirname, "views"));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render('index.ejs');
});
app.get('/login', (req, res) => {
    res.render('login.ejs');
});
app.post('/login', bodyParser.urlencoded({ extended: true }), (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('error.ejs');
    }

    const db = new sqlite3.Database('./data.db', sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(err.message);
            return res.render('error.ejs');
        }
    });

    const hashedPassword = crypto.createHmac('sha256', SECRET_KEY).update(password).digest('hex');

    const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.get(sql, [username, hashedPassword], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.render('error.ejs');
        }

        if (row) {
            const userEmail = row.email;

            const encodedUsername = encodeURIComponent(username);
            const encodedEmail = encodeURIComponent(userEmail);
    
            res.redirect(`/home?user=${encodedUsername}&email=${encodedEmail}`);
        } else {
            res.render('error.ejs');
        }
    });

    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
    });
});
app.get('/signup', (req, res) => {
    res.render('signup.ejs');
});
app.post('/signup', bodyParser.urlencoded({ extended: true }), (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.render('error.ejs');
    }

    const db = new sqlite3.Database('./data.db', sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
            return res.render('error.ejs');
        }
    });

    const hashedPassword = crypto.createHmac('sha256', SECRET_KEY).update(password).digest('hex');

    const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
    db.run(sql, [username, email, hashedPassword], function(err) {
        if (err) {
            console.error(err.message);
            return res.render('error.ejs');
        }

        res.redirect('/login');
    });

    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
    });
});
app.get('/home', (req,res) => {
    res.render('home.ejs');
});

app.get('/error', (req, res) => {
    res.render('error.ejs');
});
app.get('/petpage', (req, res) => {
    const user = req.query.user;
    res.render('petpage.ejs', { user });
});
app.get('/map', (req, res) => {
    res.render('map.ejs');
});
    
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});