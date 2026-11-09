CREATE TABLE public.budget_categories (
 id text PRIMARY KEY, name text NOT NULL, priority integer NOT NULL DEFAULT 1 CHECK(priority BETWEEN 1 AND 100), minimum_budget numeric NOT NULL DEFAULT 0 CHECK(minimum_budget >= 0), enabled boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.budget_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.budget_categories TO authenticated;
GRANT ALL ON public.budget_categories TO service_role;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public budget categories" ON public.budget_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin budget categories" ON public.budget_categories FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.budget_consumption_rules (
 id text PRIMARY KEY, category_id text NOT NULL REFERENCES public.budget_categories(id), name text NOT NULL, unit text NOT NULL DEFAULT 'kg', household_base numeric NOT NULL DEFAULT 0 CHECK(household_base >= 0), per_person numeric NOT NULL DEFAULT 1 CHECK(per_person >= 0), min_packs integer NOT NULL DEFAULT 1 CHECK(min_packs BETWEEN 1 AND 100), max_packs integer NOT NULL DEFAULT 20 CHECK(max_packs BETWEEN 1 AND 100 AND max_packs >= min_packs), essential boolean NOT NULL DEFAULT true, enabled boolean NOT NULL DEFAULT true, allow_substitution boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.budget_consumption_rules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.budget_consumption_rules TO authenticated;
GRANT ALL ON public.budget_consumption_rules TO service_role;
ALTER TABLE public.budget_consumption_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public consumption rules" ON public.budget_consumption_rules FOR SELECT TO anon, authenticated USING(true);
CREATE POLICY "Admin consumption rules" ON public.budget_consumption_rules FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.budget_product_rules (
 product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE, rule_id text NOT NULL REFERENCES public.budget_consumption_rules(id), quality_tiers text[] NOT NULL DEFAULT ARRAY['standard']::text[] CHECK(quality_tiers <@ ARRAY['basic','standard','premium']::text[] AND cardinality(quality_tiers) > 0), enabled boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.budget_product_rules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.budget_product_rules TO authenticated;
GRANT ALL ON public.budget_product_rules TO service_role;
ALTER TABLE public.budget_product_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public quality mappings" ON public.budget_product_rules FOR SELECT TO anon, authenticated USING(true);
CREATE POLICY "Admin quality mappings" ON public.budget_product_rules FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.budget_plans ADD COLUMN quality_tier text NOT NULL DEFAULT 'standard' CHECK(quality_tier IN ('basic','standard','premium'));
INSERT INTO public.budget_categories(id,name,priority) SELECT * FROM (VALUES ('staples','Core food staples',1),('pulses','Pulses and protein',2),('cooking','Cooking essentials',3),('breakfast','Tea and breakfast',4),('cleaning','Household cleaning',5),('personal','Personal care',6)) AS v(id,name,priority);
INSERT INTO public.budget_consumption_rules(id,category_id,name,unit,household_base,per_person,essential) SELECT * FROM (VALUES
 ('atta','staples','Wheat flour','kg',0::numeric,3::numeric,true),('rice','staples','Rice','kg',0,1,true),('sugar','staples','Sugar','kg',0.5,0.4,true),('salt','staples','Salt','kg',0.2,0.05,true),
 ('masoor','pulses','Daal Masoor','kg',0,0.3,true),('chana','pulses','Daal Chana','kg',0,0.3,true),('moong','pulses','Daal Moong','kg',0,0.2,true),('mash','pulses','Daal Mash','kg',0,0.2,true),
 ('oil','cooking','Cooking oil','L',0.5,0.6,true),('ghee','cooking','Ghee','kg',0,0.2,false),('chilli','cooking','Red chilli powder','kg',0.05,0.02,true),('turmeric','cooking','Turmeric','kg',0.03,0.01,true),('coriander','cooking','Coriander powder','kg',0.05,0.02,true),('spices','cooking','Other spices','kg',0.05,0.01,false),
 ('tea','breakfast','Tea','kg',0.1,0.08,true),('milk','breakfast','Milk','L',0,3,true),('biscuits','breakfast','Biscuits','pc',1,0.5,false),
 ('dishwash','cleaning','Dishwashing','pc',1,0.3,true),('laundry','cleaning','Laundry detergent','kg',0.5,0.3,true),('toilet','cleaning','Toilet cleaner','L',0.25,0.05,true),
 ('soap','personal','Soap','pc',0,1,true),('toothpaste','personal','Toothpaste','kg',0.05,0.025,true),('shampoo','personal','Shampoo','L',0.1,0.04,true)
 ) AS v(id,category_id,name,unit,household_base,per_person,essential);
INSERT INTO public.budget_product_rules(product_id,rule_id,quality_tiers)
 SELECT p.id,v.rule_id,v.tiers FROM public.products p JOIN (VALUES
 ('chakki-atta-5kg','atta',ARRAY['basic','standard','premium']),('chakki-atta-10kg','atta',ARRAY['basic','standard','premium']),
 ('sella-basmati-rice-1kg','rice',ARRAY['basic','standard']),('super-basmati-rice-5kg','rice',ARRAY['premium']),
 ('sugar-1kg','sugar',ARRAY['basic','standard','premium']),('iodized-salt-800g','salt',ARRAY['basic','standard','premium']),
 ('daal-masoor-1kg','masoor',ARRAY['basic','standard','premium']),('daal-chana-1kg','chana',ARRAY['basic','standard','premium']),('daal-moong-1kg','moong',ARRAY['basic','standard','premium']),
 ('cooking-oil-1l','oil',ARRAY['basic','standard']),('cooking-oil-5l','oil',ARRAY['premium']),('banaspati-ghee-1kg','ghee',ARRAY['standard','premium']),
 ('red-chilli-powder-200g','chilli',ARRAY['basic','standard','premium']),('haldi-powder-200g','turmeric',ARRAY['basic','standard','premium']),('biryani-masala-50g','spices',ARRAY['standard','premium']),
 ('yellow-label-tea-475g','tea',ARRAY['basic','standard']),('danedar-tea-900g','tea',ARRAY['premium']),('uht-milk-1l','milk',ARRAY['basic','standard']),('full-cream-milk-1l','milk',ARRAY['premium']),
 ('sooper-biscuits-family','biscuits',ARRAY['basic','standard']),('prince-biscuits-family','biscuits',ARRAY['premium']),
 ('dishwash-bar','dishwash',ARRAY['basic','standard','premium']),('washing-powder-1kg','laundry',ARRAY['basic','standard','premium']),('toilet-cleaner-500ml','toilet',ARRAY['basic','standard','premium']),
 ('beauty-soap-3pack','soap',ARRAY['basic','standard','premium']),('toothpaste-150g','toothpaste',ARRAY['basic','standard','premium']),('shampoo-360ml','shampoo',ARRAY['basic','standard','premium'])
 ) AS v(slug,rule_id,tiers) ON p.slug=v.slug;
COMMENT ON TABLE public.budget_consumption_rules IS 'Editable initial monthly estimates, not dietary advice. Review for local household needs.';
COMMENT ON TABLE public.budget_product_rules IS 'Explicit editable quality eligibility; shared essentials can be mapped to more than one tier.';