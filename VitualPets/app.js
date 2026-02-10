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
app.get('/shop', (req, res) => {
    res.render('shop.ejs');
});
app.get('/fishing', (req, res) => {
    res.render('fishing.ejs');
});
app.get('/petpage', (req, res) => {
    const user = req.query.user;
    res.render('petpage.ejs', { user });
});
app.get('/map', (req, res) => {
    res.render('map.ejs');
});

// API endpoints for shop functionality
app.get('/api/items', (req, res) => {
    const db = new sqlite3.Database('./data.db', sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Database error' });
        }
    });

    db.all('SELECT * FROM Items', [], (err, rows) => {
        if (err) {
            console.error(err.message);
            db.close();
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
        db.close();
    });
});

app.get('/api/balance/:username', (req, res) => {
    const username = req.params.username;
    const db = new sqlite3.Database('./data.db', sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Database error' });
        }
    });

    db.get('SELECT coins FROM Users WHERE username = ?', [username], (err, row) => {
        if (err) {
            console.error(err.message);
            db.close();
            return res.status(500).json({ error: 'Database error' });
        }
        if (row) {
            res.json({ balance: row.coins });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
        db.close();
    });
});

app.post('/api/add-money', bodyParser.json(), (req, res) => {
    const { username, amount } = req.body;

    if (!username || !amount) {
        return res.status(400).json({ error: 'Username and amount required' });
    }

    const db = new sqlite3.Database('./data.db', sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Database error' });
        }
    });

    db.run('UPDATE Users SET coins = coins + ? WHERE username = ?', [amount, username], function(err) {
        if (err) {
            db.close();
            return res.status(500).json({ error: 'Failed to add money' });
        }

        if (this.changes === 0) {
            db.close();
            return res.status(404).json({ error: 'User not found' });
        }

        // Get updated balance
        db.get('SELECT coins FROM Users WHERE username = ?', [username], (err, row) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Failed to retrieve updated balance' });
            }
            res.json({ success: true, balance: row.coins });
            db.close();
        });
    });
});

app.post('/api/buy', bodyParser.json(), (req, res) => {
    const { username, itemId } = req.body;

    if (!username || !itemId) {
        return res.status(400).json({ error: 'Username and itemId required' });
    }

    const db = new sqlite3.Database('./data.db', sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Database error' });
        }
    });

    // Get item price
    db.get('SELECT price FROM Items WHERE id = ?', [itemId], (err, item) => {
        if (err || !item) {
            db.close();
            return res.status(404).json({ error: 'Item not found' });
        }

        // Get user balance
        db.get('SELECT coins FROM Users WHERE username = ?', [username], (err, user) => {
            if (err || !user) {
                db.close();
                return res.status(404).json({ error: 'User not found' });
            }

            if (user.coins < item.price) {
                db.close();
                return res.status(400).json({ error: 'Insufficient funds' });
            }

            // Deduct coins and add to inventory
            db.run('UPDATE Users SET coins = coins - ? WHERE username = ?', [item.price, username], (err) => {
                if (err) {
                    db.close();
                    return res.status(500).json({ error: 'Transaction failed' });
                }

                // Check if user already has this item
                db.get('SELECT * FROM UserInventory WHERE username = ? AND item_id = ?', [username, itemId], (err, existing) => {
                    if (err) {
                        db.close();
                        return res.status(500).json({ error: 'Transaction failed' });
                    }

                    if (existing) {
                        // Update quantity
                        db.run('UPDATE UserInventory SET quantity = quantity + 1 WHERE username = ? AND item_id = ?', [username, itemId], (err) => {
                            if (err) {
                                db.close();
                                return res.status(500).json({ error: 'Transaction failed' });
                            }
                            res.json({ success: true, balance: user.coins - item.price });
                            db.close();
                        });
                    } else {
                        // Insert new item - use INSERT OR IGNORE to handle race conditions
                        db.run('INSERT OR IGNORE INTO UserInventory (username, item_id, quantity) VALUES (?, ?, 1)', [username, itemId], function(err) {
                            if (err) {
                                db.close();
                                return res.status(500).json({ error: 'Transaction failed' });
                            }
                            // Check if insert succeeded (changes will be 1) or was ignored (changes will be 0)
                            if (this.changes === 0) {
                                // Item was already added by concurrent request, update quantity instead
                                db.run('UPDATE UserInventory SET quantity = quantity + 1 WHERE username = ? AND item_id = ?', [username, itemId], (err) => {
                                    if (err) {
                                        db.close();
                                        return res.status(500).json({ error: 'Transaction failed' });
                                    }
                                    res.json({ success: true, balance: user.coins - item.price });
                                    db.close();
                                });
                            } else {
                                res.json({ success: true, balance: user.coins - item.price });
                                db.close();
                            }
                        });
                    }
                });
            });
        });
    });
});

app.get('/api/inventory/:username', (req, res) => {
    const username = req.params.username;
    const db = new sqlite3.Database('./data.db', sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Database error' });
        }
    });

    db.all(`
        SELECT i.id, i.name, i.description, i.price, i.type, ui.quantity
        FROM UserInventory ui
        JOIN Items i ON ui.item_id = i.id
        WHERE ui.username = ?
    `, [username], (err, rows) => {
        if (err) {
            console.error(err.message);
            db.close();
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
        db.close();
    });
});

app.post('/api/sell', bodyParser.json(), (req, res) => {
    const { username, itemId } = req.body;

    if (!username || !itemId) {
        return res.status(400).json({ error: 'Username and itemId required' });
    }

    const db = new sqlite3.Database('./data.db', sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Database error' });
        }
    });

    // Get item price (sell for 50% of original price)
    db.get('SELECT price FROM Items WHERE id = ?', [itemId], (err, item) => {
        if (err || !item) {
            db.close();
            return res.status(404).json({ error: 'Item not found' });
        }

        const sellPrice = Math.floor(item.price * 0.5);

        // Check if user has this item
        db.get('SELECT quantity FROM UserInventory WHERE username = ? AND item_id = ?', [username, itemId], (err, inventory) => {
            if (err || !inventory) {
                db.close();
                return res.status(404).json({ error: 'Item not in inventory' });
            }

            // Add coins to user
            db.run('UPDATE Users SET coins = coins + ? WHERE username = ?', [sellPrice, username], (err) => {
                if (err) {
                    db.close();
                    return res.status(500).json({ error: 'Transaction failed' });
                }

                if (inventory.quantity > 1) {
                    // Decrease quantity
                    db.run('UPDATE UserInventory SET quantity = quantity - 1 WHERE username = ? AND item_id = ?', [username, itemId], (err) => {
                        if (err) {
                            db.close();
                            return res.status(500).json({ error: 'Transaction failed' });
                        }
                        
                        // Get updated balance
                        db.get('SELECT coins FROM Users WHERE username = ?', [username], (err, user) => {
                            db.close();
                            if (err || !user) {
                                return res.status(500).json({ error: 'Could not fetch balance' });
                            }
                            res.json({ success: true, balance: user.coins });
                        });
                    });
                } else {
                    // Remove item from inventory
                    db.run('DELETE FROM UserInventory WHERE username = ? AND item_id = ?', [username, itemId], (err) => {
                        if (err) {
                            db.close();
                            return res.status(500).json({ error: 'Transaction failed' });
                        }
                        
                        // Get updated balance
                        db.get('SELECT coins FROM Users WHERE username = ?', [username], (err, user) => {
                            db.close();
                            if (err || !user) {
                                return res.status(500).json({ error: 'Could not fetch balance' });
                            }
                            res.json({ success: true, balance: user.coins });
                        });
                    });
                }
            });
        });
    });
});

// Pet endpoints
app.get('/api/pet/:username', (req, res) => {
    const username = req.params.username;
    const db = new sqlite3.Database('./data.db', sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Database error' });
        }
    });

    db.get('SELECT name, type, color1, color2 FROM Pets WHERE username = ?', [username], (err, row) => {
        if (err) {
            console.error(err.message);
            db.close();
            return res.status(500).json({ error: 'Database error' });
        }
        if (row) {
            res.json(row);
        } else {
            res.json(null);
        }
        db.close();
    });
});

app.post('/api/pet', bodyParser.json(), (req, res) => {
    const { username, name, type, color1, color2 } = req.body;

    console.log('Received pet save request:', { username, name, type, color1, color2 });

    if (!username || !name || !type || !color1 || !color2) {
        console.error('Missing required fields');
        return res.status(400).json({ error: 'All fields required' });
    }

    const db = new sqlite3.Database('./data.db', sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error('Database connection error:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
    });

    // Insert or replace pet data
    const sql = `INSERT INTO Pets (username, name, type, color1, color2, updated_at) 
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(username) DO UPDATE SET 
                 name = excluded.name, 
                 type = excluded.type, 
                 color1 = excluded.color1, 
                 color2 = excluded.color2,
                 updated_at = CURRENT_TIMESTAMP`;
    
    console.log('Executing SQL with params:', [username, name, type, color1, color2]);
    
    db.run(sql,
        [username, name, type, color1, color2],
        function(err) {
            if (err) {
                console.error('SQL execution error:', err.message);
                db.close();
                return res.status(500).json({ error: 'Failed to save pet', details: err.message });
            }
            console.log('Pet saved successfully');
            res.json({ success: true });
            db.close();
        }
    );
});

app.get('/inventory', (req, res) => {
    res.render('inventory.ejs');
});
    
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});