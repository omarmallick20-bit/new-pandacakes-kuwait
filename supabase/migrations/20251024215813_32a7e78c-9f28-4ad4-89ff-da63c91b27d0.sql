-- Update category image URLs to match actual file paths in public/images/categories/
UPDATE categories 
SET image_url = CASE name
  WHEN 'Boys Cakes' THEN '/images/categories/Boys Cakes.jpg'
  WHEN 'Candles & Toppers' THEN '/images/categories/Candles & Toppers.jpg'
  WHEN 'Chocolates & Brownies' THEN '/images/categories/Chocolates & Brownies.jpg'
  WHEN 'Classic Cakes' THEN '/images/categories/Classic Cakes.jpg'
  WHEN 'Comic Cakes' THEN '/images/categories/Comic Cakes.jpg'
  WHEN 'Cupcakes' THEN '/images/categories/Cupcakes.jpg'
  WHEN 'Customized Cakes' THEN '/images/categories/Customized Cakes.jpg'
  WHEN 'European Cakes' THEN '/images/categories/European Cakes.jpg'
  WHEN 'Family Cakes' THEN '/images/categories/Family Cakes.jpg'
  WHEN 'Flower & Balloon Cakes' THEN '/images/categories/Flower & Balloon Cakes.jpg'
  WHEN 'For Girls' THEN '/images/categories/For Girls.jpg'
  WHEN 'Graduation Corner' THEN '/images/categories/Graduation Corner.jpg'
  WHEN 'Islamic Cakes' THEN '/images/categories/Islamic Cakes.jpg'
  WHEN 'Marble Cakes' THEN '/images/categories/Marble Cakes.jpg'
  WHEN 'Movies & TV' THEN '/images/categories/Movies & TV.jpg'
  WHEN 'Photo Cakes' THEN '/images/categories/Photo Cakes.jpg'
  WHEN 'Retro Cakes' THEN '/images/categories/Retro Cakes.jpg'
  WHEN 'Small Cakes' THEN '/images/categories/Small Cakes.jpg'
  WHEN 'Special Items' THEN '/images/categories/Special Items.jpg'
  WHEN 'Sports Corner' THEN '/images/categories/Sports Corner.jpg'
  WHEN 'Valentine Corner' THEN '/images/categories/Valentine Corner.jpg'
  WHEN 'Wedding Corner' THEN '/images/categories/Wedding Corner.jpg'
  WHEN 'Zodiac Sign Cakes' THEN '/images/categories/Zodiac Sign Cakes.jpg'
  ELSE image_url
END
WHERE is_active = true;