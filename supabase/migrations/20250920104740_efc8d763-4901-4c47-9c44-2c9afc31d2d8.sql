-- Clear existing test data and migrate categories from mockData.ts to Supabase with Qatar labeling
DELETE FROM menu_items WHERE country_id = 'qa';
DELETE FROM categories WHERE name IN ('Boys Cakes', 'Chocolates & Brownies', 'Classic Cakes', 'Comic Cakes', 'Cupcakes', 'Customized Cakes', 'European Cakes', 'Family Cakes', 'Flower & Balloon Cakes', 'For Girls', 'Graduation Corner', 'Islamic Cakes', 'Marble Cakes', 'Movies & TV', 'Photo Cakes', 'Retro Cakes', 'Small Cakes', 'Special Items', 'Sports Corner', 'Valentine Corner', 'Wedding Corner', 'Zodiac Sign Cakes', 'Candles & Toppers');

-- Insert all categories from mockData.ts
INSERT INTO categories (name, image_url, is_active) VALUES 
('Boys Cakes', '/images/categories/boy.jpg', true),
('Chocolates & Brownies', '/images/categories/chocolatebrownie.jpg', true),
('Classic Cakes', '/images/categories/classic.jpg', true),
('Comic Cakes', '/images/categories/comic.jpg', true),
('Cupcakes', '/images/categories/Cupcakes.jpg', true),
('Customized Cakes', '/images/categories/customized-cakes.jpg', true),
('European Cakes', '/images/categories/european.jpg', true),
('Family Cakes', '/images/categories/family.jpg', true),
('Flower & Balloon Cakes', '/images/categories/flower.jpg', true),
('For Girls', '/images/categories/girls.jpg', true),
('Graduation Corner', '/images/categories/graduation.jpg', true),
('Islamic Cakes', '/images/categories/islamic.jpg', true),
('Marble Cakes', '/images/categories/marble.jpg', true),
('Movies & TV', '/images/categories/movies.jpg', true),
('Photo Cakes', '/images/categories/photo.jpg', true),
('Retro Cakes', '/images/categories/retro.jpg', true),
('Small Cakes', '/images/categories/small.jpg', true),
('Special Items', '/images/categories/special.jpg', true),
('Sports Corner', '/images/categories/sports.jpg', true),
('Valentine Corner', '/images/categories/valentine.jpg', true),
('Wedding Corner', '/images/categories/wedding-corner.jpg', true),
('Zodiac Sign Cakes', '/images/categories/zodiac.jpg', true),
('Candles & Toppers', '/images/categories/candles-toppers.jpg', true);

-- Get category IDs and insert menu items
DO $$
DECLARE
    classic_cakes_id uuid;
    cupcakes_id uuid;
    family_cakes_id uuid;
    chocolates_brownies_id uuid;
    european_cakes_id uuid;
    boys_cakes_id uuid;
    girls_id uuid;
BEGIN
    -- Get category IDs
    SELECT id INTO classic_cakes_id FROM categories WHERE name = 'Classic Cakes';
    SELECT id INTO cupcakes_id FROM categories WHERE name = 'Cupcakes';
    SELECT id INTO family_cakes_id FROM categories WHERE name = 'Family Cakes';
    SELECT id INTO chocolates_brownies_id FROM categories WHERE name = 'Chocolates & Brownies';
    SELECT id INTO european_cakes_id FROM categories WHERE name = 'European Cakes';
    SELECT id INTO boys_cakes_id FROM categories WHERE name = 'Boys Cakes';
    SELECT id INTO girls_id FROM categories WHERE name = 'For Girls';

    -- Insert menu items from mockData.ts with Qatar country_id
    INSERT INTO menu_items (name, description, category_id, category, image_url, price, country_id, is_active, preparation_time) VALUES 
    ('Chocolate Layer Cake', 'Rich chocolate cake with smooth cream frosting', classic_cakes_id, 'Classic Cakes', '/cakes/cake1.jpg', 45.00, 'qa', true, 1440),
    ('Red Velvet Cupcake', 'Classic red velvet with cream cheese frosting', cupcakes_id, 'Cupcakes', '/cakes/cake2.jpg', 8.00, 'qa', true, 720),
    ('Birthday Celebration Cake', 'Vanilla cake with colorful sprinkles and candles', family_cakes_id, 'Family Cakes', '/cakes/cake3.jpg', 35.00, 'qa', true, 1440),
    ('Chocolate Fudge Brownies', 'Decadent brownies with rich fudge topping', chocolates_brownies_id, 'Chocolates & Brownies', '/cakes/cake4.jpg', 25.00, 'qa', true, 360),
    ('Strawberry Shortcake', 'Fresh strawberries with fluffy whipped cream', classic_cakes_id, 'Classic Cakes', '/cakes/cake5.jpg', 30.00, 'qa', true, 1440),
    ('Lemon Cheesecake', 'Creamy cheesecake with graham cracker crust', european_cakes_id, 'European Cakes', '/cakes/cake6.jpg', 28.00, 'qa', true, 2880),
    ('Superhero Adventure Cake', 'Action-packed superhero themed cake', boys_cakes_id, 'Boys Cakes', '/cakes/cake7.jpg', 55.00, 'qa', true, 2880),
    ('Princess Castle Cake', 'Magical princess castle with pink decorations', girls_id, 'For Girls', '/cakes/cake8.jpg', 65.00, 'qa', true, 2880);
END $$;