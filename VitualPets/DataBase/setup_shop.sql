-- Add coins column to users table if it doesn't exist
ALTER TABLE Users ADD COLUMN coins INTEGER DEFAULT 1000;

-- Create items table for shop
CREATE TABLE IF NOT EXISTS Items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    type TEXT NOT NULL
);

-- Create user_inventory table
CREATE TABLE IF NOT EXISTS UserInventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(item_id) REFERENCES Items(id)
);

-- Insert sample items
INSERT INTO Items (name, description, price, type) VALUES
    ('Pet Food', 'Delicious food for your pet', 50, 'food'),
    ('Pet Toy', 'A fun toy to play with', 75, 'toy'),
    ('Pet Bed', 'A comfortable bed for your pet', 150, 'furniture'),
    ('Grooming Kit', 'Keep your pet clean and happy', 100, 'accessory'),
    ('Treats', 'Special treats for good pets', 30, 'food'),
    ('Leash', 'A sturdy leash for walks', 60, 'accessory'),
    ('Water Bowl', 'Fresh water for your pet', 40, 'furniture'),
    ('Pet Collar', 'A stylish collar', 80, 'accessory');
