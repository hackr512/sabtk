
insert into public.store_settings (key, value) values
  ('catalog_is_sample', 'true'),
  ('support_phone', ''),
  ('whatsapp_number', ''),
  ('support_email', ''),
  ('facebook_url', ''),
  ('instagram_url', ''),
  ('tiktok_url', ''),
  ('digital_payments_enabled', 'false');

insert into public.categories (slug, name, image_url, sort_order) values
  ('atta-rice-flour', 'Atta, Rice & Flour', '/images/cat-atta-rice.jpg', 1),
  ('pulses-grains', 'Pulses and Grains', '/images/cat-pulses.jpg', 2),
  ('cooking-oil-ghee', 'Cooking Oil & Ghee', '/images/cat-oil-ghee.jpg', 3),
  ('sugar-salt-spices', 'Sugar, Salt & Spices', '/images/cat-spices.jpg', 4),
  ('tea-coffee-beverages', 'Tea, Coffee & Beverages', '/images/cat-tea.jpg', 5),
  ('milk-dairy-eggs', 'Milk, Dairy & Eggs', '/images/cat-dairy.jpg', 6),
  ('snacks-biscuits', 'Snacks & Biscuits', '/images/cat-snacks.jpg', 7),
  ('fruits-vegetables', 'Fruits & Vegetables', '/images/cat-fruits-veg.jpg', 8),
  ('cleaning-household', 'Cleaning & Household', '/images/cat-cleaning.jpg', 9),
  ('personal-care', 'Personal Care', '/images/cat-personal-care.jpg', 10),
  ('baby-care', 'Baby Care', '/images/cat-baby.jpg', 11);

with c as (select id, slug, image_url from public.categories)
insert into public.products (slug, name, brand, category_id, pack_size, unit, unit_quantity, price, stock_quantity, images, is_featured, sku)
select v.slug, v.name, nullif(v.brand,''), c.id, v.pack, v.unit, v.uq, v.price, v.stock, array[c.image_url], v.featured, v.sku
from (values
  ('chakki-atta-10kg','Chakki Atta','Sunridge','atta-rice-flour','10 kg','kg',10,1350,40,true,'ATR-001'),
  ('chakki-atta-5kg','Chakki Atta','Sunridge','atta-rice-flour','5 kg','kg',5,720,60,false,'ATR-002'),
  ('super-basmati-rice-5kg','Super Kernel Basmati Rice','Guard','atta-rice-flour','5 kg','kg',5,2150,25,true,'ATR-003'),
  ('sella-basmati-rice-1kg','Sella Basmati Rice','Falak','atta-rice-flour','1 kg','kg',1,450,50,false,'ATR-004'),
  ('maida-1kg','Maida (Fine Flour)','Sunridge','atta-rice-flour','1 kg','kg',1,160,45,false,'ATR-005'),
  ('daal-masoor-1kg','Daal Masoor (Red Lentils)','','pulses-grains','1 kg','kg',1,380,70,true,'PUL-001'),
  ('daal-chana-1kg','Daal Chana','','pulses-grains','1 kg','kg',1,320,60,false,'PUL-002'),
  ('daal-moong-1kg','Daal Moong','','pulses-grains','1 kg','kg',1,420,40,false,'PUL-003'),
  ('safaid-chana-1kg','Safaid Chana (Chickpeas)','','pulses-grains','1 kg','kg',1,440,35,false,'PUL-004'),
  ('cooking-oil-5l','Cooking Oil','Dalda','cooking-oil-ghee','5 L','L',5,2850,20,true,'OIL-001'),
  ('cooking-oil-1l','Cooking Oil','Sufi','cooking-oil-ghee','1 L','L',1,590,60,false,'OIL-002'),
  ('banaspati-ghee-1kg','Banaspati Ghee','Dalda','cooking-oil-ghee','1 kg','kg',1,560,40,false,'OIL-003'),
  ('sugar-1kg','Sugar (Cheeni)','','sugar-salt-spices','1 kg','kg',1,165,120,true,'SSS-001'),
  ('iodized-salt-800g','Iodized Salt','National','sugar-salt-spices','800 g','kg',0.8,70,90,false,'SSS-002'),
  ('biryani-masala-50g','Biryani Masala','Shan','sugar-salt-spices','50 g','g',50,120,80,false,'SSS-003'),
  ('red-chilli-powder-200g','Red Chilli Powder','National','sugar-salt-spices','200 g','g',200,330,50,false,'SSS-004'),
  ('haldi-powder-200g','Haldi (Turmeric) Powder','National','sugar-salt-spices','200 g','g',200,240,50,false,'SSS-005'),
  ('danedar-tea-900g','Danedar Tea','Tapal','tea-coffee-beverages','900 g','g',900,1650,30,true,'TEA-001'),
  ('yellow-label-tea-475g','Yellow Label Tea','Lipton','tea-coffee-beverages','475 g','g',475,980,30,false,'TEA-002'),
  ('instant-coffee-50g','Classic Instant Coffee','Nescafé','tea-coffee-beverages','50 g','g',50,650,25,false,'TEA-003'),
  ('full-cream-milk-1l','Full Cream Milk','Olpers','milk-dairy-eggs','1 L','L',1,290,100,true,'DAI-001'),
  ('uht-milk-1l','UHT Milk','Milkpak','milk-dairy-eggs','1 L','L',1,295,100,false,'DAI-002'),
  ('farm-eggs-12','Farm Eggs','','milk-dairy-eggs','12 pcs','pc',12,380,40,true,'DAI-003'),
  ('butter-200g','Salted Butter','Nurpur','milk-dairy-eggs','200 g','g',200,520,25,false,'DAI-004'),
  ('plain-yogurt-1kg','Plain Yogurt (Dahi)','Nestlé','milk-dairy-eggs','1 kg','kg',1,330,20,false,'DAI-005'),
  ('sooper-biscuits-family','Sooper Biscuits Family Pack','Peek Freans','snacks-biscuits','Family pack','pc',1,320,40,false,'SNK-001'),
  ('prince-biscuits-family','Prince Chocolate Biscuits','LU','snacks-biscuits','Family pack','pc',1,300,40,false,'SNK-002'),
  ('nimko-mix-400g','Nimko Mix','','snacks-biscuits','400 g','g',400,450,30,false,'SNK-003'),
  ('potatoes-1kg','Potatoes (Aloo)','','fruits-vegetables','1 kg','kg',1,120,80,true,'FV-001'),
  ('onions-1kg','Onions (Pyaz)','','fruits-vegetables','1 kg','kg',1,180,80,true,'FV-002'),
  ('tomatoes-1kg','Tomatoes (Tamatar)','','fruits-vegetables','1 kg','kg',1,220,60,false,'FV-003'),
  ('bananas-12','Bananas (Kela)','','fruits-vegetables','12 pcs','pc',12,240,40,false,'FV-004'),
  ('washing-powder-1kg','Washing Powder','Surf Excel','cleaning-household','1 kg','kg',1,750,40,false,'CLN-001'),
  ('dishwash-bar','Dishwash Bar','Lemon Max','cleaning-household','1 bar','pc',1,120,80,false,'CLN-002'),
  ('toilet-cleaner-500ml','Toilet Cleaner','Harpic','cleaning-household','500 ml','ml',500,420,30,false,'CLN-003'),
  ('beauty-soap-3pack','Beauty Soap (3 pack)','Lux','personal-care','3 x 100 g','pc',3,480,40,false,'PC-001'),
  ('toothpaste-150g','Toothpaste','Colgate','personal-care','150 g','g',150,390,40,false,'PC-002'),
  ('shampoo-360ml','Shampoo','Sunsilk','personal-care','360 ml','ml',360,780,25,false,'PC-003'),
  ('diapers-size4','Baby Diapers Size 4','Pampers','baby-care','Pack','pc',1,2900,15,false,'BBY-001'),
  ('baby-lotion-200ml','Baby Lotion','Johnson''s','baby-care','200 ml','ml',200,850,20,false,'BBY-002'),
  ('baby-wipes-72','Baby Wipes','Pampers','baby-care','72 wipes','pc',72,550,30,false,'BBY-003')
) as v(slug, name, brand, cat, pack, unit, uq, price, stock, featured, sku)
join c on c.slug = v.cat;

insert into public.delivery_zones (city, area, sort_order) values
  ('Islamabad','F-6',1),('Islamabad','F-7',2),('Islamabad','F-8',3),('Islamabad','F-10',4),('Islamabad','F-11',5),
  ('Islamabad','G-9',6),('Islamabad','G-10',7),('Islamabad','G-11',8),('Islamabad','I-8',9),('Islamabad','E-11',10),
  ('Islamabad','DHA Phase 2',11),('Islamabad','Bahria Town',12),
  ('Rawalpindi','Saddar',20),('Rawalpindi','Satellite Town',21),('Rawalpindi','Chaklala Scheme III',22),
  ('Rawalpindi','Bahria Town Phase 7',23),('Rawalpindi','DHA Phase 1',24);

insert into public.delivery_windows (label, start_time, end_time, sort_order) values
  ('10:00 AM – 1:00 PM','10:00','13:00',1),
  ('1:00 PM – 4:00 PM','13:00','16:00',2),
  ('4:00 PM – 7:00 PM','16:00','19:00',3),
  ('7:00 PM – 9:00 PM','19:00','21:00',4);

insert into public.rewards (name, description, points_required, product_id, sort_order)
select 'Free Sugar 1 kg', 'Redeem at checkout. Added to your order as a free item, subject to stock.', 30, id, 1
from public.products where slug = 'sugar-1kg';

insert into public.ration_bundles (slug, name, household_label, description, sort_order) values
  ('small-family', 'Small Family Ration', '1–2 people', 'Core monthly staples for a couple or a small household.', 1),
  ('medium-family', 'Medium Family Ration', '3–5 people', 'A balanced monthly basket for a typical family.', 2),
  ('large-family', 'Large Family Ration', '6+ people', 'Bigger packs and quantities for joint families.', 3);

insert into public.ration_bundle_items (bundle_id, product_id, quantity)
select b.id, p.id, v.qty from (values
  ('small-family','chakki-atta-5kg',1),('small-family','sella-basmati-rice-1kg',2),('small-family','daal-masoor-1kg',1),
  ('small-family','daal-chana-1kg',1),('small-family','cooking-oil-1l',2),('small-family','sugar-1kg',2),
  ('small-family','iodized-salt-800g',1),('small-family','danedar-tea-900g',1),('small-family','full-cream-milk-1l',4),
  ('medium-family','chakki-atta-10kg',1),('medium-family','chakki-atta-5kg',1),('medium-family','super-basmati-rice-5kg',1),
  ('medium-family','daal-masoor-1kg',2),('medium-family','daal-chana-1kg',1),('medium-family','daal-moong-1kg',1),
  ('medium-family','cooking-oil-5l',1),('medium-family','banaspati-ghee-1kg',1),('medium-family','sugar-1kg',4),
  ('medium-family','iodized-salt-800g',2),('medium-family','red-chilli-powder-200g',1),('medium-family','danedar-tea-900g',1),
  ('medium-family','full-cream-milk-1l',8),('medium-family','washing-powder-1kg',1),('medium-family','dishwash-bar',2),
  ('large-family','chakki-atta-10kg',2),('large-family','super-basmati-rice-5kg',1),('large-family','sella-basmati-rice-1kg',3),
  ('large-family','daal-masoor-1kg',3),('large-family','daal-chana-1kg',2),('large-family','daal-moong-1kg',2),
  ('large-family','safaid-chana-1kg',1),('large-family','cooking-oil-5l',2),('large-family','banaspati-ghee-1kg',2),
  ('large-family','sugar-1kg',6),('large-family','iodized-salt-800g',2),('large-family','red-chilli-powder-200g',1),
  ('large-family','haldi-powder-200g',1),('large-family','biryani-masala-50g',2),('large-family','danedar-tea-900g',2),
  ('large-family','full-cream-milk-1l',12),('large-family','washing-powder-1kg',2),('large-family','dishwash-bar',3),
  ('large-family','toilet-cleaner-500ml',1)
) as v(bundle, product, qty)
join public.ration_bundles b on b.slug = v.bundle
join public.products p on p.slug = v.product;

insert into public.campaigns (slug, title, description, product_id, price, price_is_confirmed, min_quantity, max_per_user, deadline, delivery_window_text)
select 'basmati-5kg-circle', 'Basmati Rice 5 kg Circle',
  'Neighbours pooling orders for 5 kg basmati packs so we can request a bulk rate from the supplier.',
  id, 1990, false, 40, 4, now() + interval '12 days', 'Expected 3–5 days after the campaign is confirmed'
from public.products where slug = 'super-basmati-rice-5kg';

insert into public.campaigns (slug, title, description, product_id, price, price_is_confirmed, min_quantity, max_per_user, deadline, delivery_window_text)
select 'cooking-oil-5l-circle', 'Cooking Oil 5 L Circle',
  'Group order for 5 L cooking oil tins. The final price is confirmed only after the supplier agrees.',
  id, 2700, false, 30, 3, now() + interval '9 days', 'Expected 3–5 days after the campaign is confirmed'
from public.products where slug = 'cooking-oil-5l';
