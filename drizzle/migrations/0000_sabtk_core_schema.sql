
create extension if not exists pg_trgm with schema extensions;

-- ========== Roles ==========
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ========== Store settings ==========
create table public.store_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);
grant select on public.store_settings to anon, authenticated;
grant all on public.store_settings to service_role;
alter table public.store_settings enable row level security;
create policy "Settings are public" on public.store_settings for select to anon, authenticated using (true);
create policy "Admins manage settings" on public.store_settings for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ========== Catalogue ==========
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant all on public.categories to service_role;
grant insert, update, delete on public.categories to authenticated;
alter table public.categories enable row level security;
create policy "Active categories are public" on public.categories for select to anon, authenticated using (is_active or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage categories" on public.categories for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  brand text,
  category_id uuid not null references public.categories(id),
  pack_size text not null,
  unit text,
  unit_quantity numeric(10,3),
  price numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2) check (compare_at_price is null or compare_at_price > price),
  sku text,
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  max_per_order int not null default 20,
  images text[] not null default '{}',
  description text,
  ingredients text,
  nutrition text,
  storage_instructions text,
  expiry_info text,
  points_eligible boolean not null default true,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products(category_id);
create index products_name_trgm on public.products using gin (name extensions.gin_trgm_ops);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "Active products are public" on public.products for select to anon, authenticated using (is_active or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage products" on public.products for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();

-- ========== Delivery ==========
create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  city text not null check (city in ('Islamabad','Rawalpindi')),
  area text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  unique (city, area)
);
grant select on public.delivery_zones to anon, authenticated;
grant all on public.delivery_zones to service_role;
alter table public.delivery_zones enable row level security;
create policy "Zones are public" on public.delivery_zones for select to anon, authenticated using (true);
create policy "Admins manage zones" on public.delivery_zones for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.delivery_windows (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  sort_order int not null default 0
);
grant select on public.delivery_windows to anon, authenticated;
grant all on public.delivery_windows to service_role;
alter table public.delivery_windows enable row level security;
create policy "Windows are public" on public.delivery_windows for select to anon, authenticated using (true);
create policy "Admins manage windows" on public.delivery_windows for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ========== Profiles ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  referral_code text not null unique,
  notify_email boolean not null default true,
  notify_sms boolean not null default false,
  notify_whatsapp boolean not null default false,
  reorder_reminders boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- referral_code must never be changed by the user
create or replace function public.protect_referral_code()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.referral_code is distinct from old.referral_code and coalesce(auth.role(), '') <> 'service_role' then
    new.referral_code := old.referral_code;
  end if;
  return new;
end; $$;
create trigger profiles_protect_code before update on public.profiles for each row execute function public.protect_referral_code();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  loop
    v_code := 'SBT' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.profiles where referral_code = v_code);
  end loop;
  insert into public.profiles (id, full_name, phone, referral_code)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'phone', v_code)
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text not null default 'Home',
  full_name text not null,
  phone text not null,
  zone_id uuid not null references public.delivery_zones(id),
  address_line text not null,
  instructions text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses(user_id);
grant select, insert, update, delete on public.addresses to authenticated;
grant all on public.addresses to service_role;
alter table public.addresses enable row level security;
create policy "Own addresses select" on public.addresses for select to authenticated using (auth.uid() = user_id);
create policy "Own addresses insert" on public.addresses for insert to authenticated with check (auth.uid() = user_id);
create policy "Own addresses update" on public.addresses for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own addresses delete" on public.addresses for delete to authenticated using (auth.uid() = user_id);

create table public.wishlists (
  user_id uuid not null,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
grant select, insert, delete on public.wishlists to authenticated;
grant all on public.wishlists to service_role;
alter table public.wishlists enable row level security;
create policy "Own wishlist select" on public.wishlists for select to authenticated using (auth.uid() = user_id);
create policy "Own wishlist insert" on public.wishlists for insert to authenticated with check (auth.uid() = user_id);
create policy "Own wishlist delete" on public.wishlists for delete to authenticated using (auth.uid() = user_id);

-- ========== Promo codes (server only) ==========
create table public.promo_codes (
  code text primary key,
  description text,
  discount_type text not null check (discount_type in ('flat','percent')),
  value numeric(10,2) not null check (value > 0),
  min_subtotal numeric(10,2) not null default 0,
  max_discount numeric(10,2),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit int,
  used_count int not null default 0,
  is_active boolean not null default true
);
grant all on public.promo_codes to service_role;
alter table public.promo_codes enable row level security;
create policy "Admins manage promo codes" on public.promo_codes for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
grant select, insert, update, delete on public.promo_codes to authenticated;

-- ========== Rewards & loyalty ==========
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  points_required int not null check (points_required > 0),
  product_id uuid references public.products(id),
  is_active boolean not null default true,
  sort_order int not null default 0
);
grant select on public.rewards to anon, authenticated;
grant all on public.rewards to service_role;
alter table public.rewards enable row level security;
create policy "Rewards are public" on public.rewards for select to anon, authenticated using (is_active);
create policy "Admins manage rewards" on public.rewards for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create type public.order_status as enum ('pending_confirmation','confirmed','preparing','out_for_delivery','delivered','cancelled','refunded');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null,
  status public.order_status not null default 'pending_confirmation',
  payment_method text not null check (payment_method in ('cod')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded')),
  customer_name text not null,
  phone text not null,
  zone_id uuid not null references public.delivery_zones(id),
  city text not null,
  area text not null,
  address_line text not null,
  instructions text,
  delivery_date date not null,
  delivery_window text not null,
  subtotal numeric(10,2) not null,
  discount_total numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null,
  total numeric(10,2) not null,
  eligible_points_subtotal numeric(10,2) not null default 0,
  points_to_earn int not null default 0,
  points_redeemed int not null default 0,
  reward_id uuid references public.rewards(id),
  promo_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on public.orders(user_id, created_at desc);
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "Own orders select" on public.orders for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Admins update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
grant update on public.orders to authenticated;
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  name text not null,
  brand text,
  pack_size text not null,
  image text,
  unit_price numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  line_total numeric(10,2) not null,
  is_reward boolean not null default false
);
create index order_items_order_idx on public.order_items(order_id);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "Own order items select" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))));

create table public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  note text,
  actor uuid,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_status_events(order_id, created_at);
grant select on public.order_status_events to authenticated;
grant all on public.order_status_events to service_role;
alter table public.order_status_events enable row level security;
create policy "Own order events select" on public.order_status_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))));

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null,
  referred_id uuid not null unique,
  status text not null default 'pending' check (status in ('pending','rewarded','rejected')),
  qualifying_order_id uuid references public.orders(id),
  created_at timestamptz not null default now(),
  rewarded_at timestamptz,
  check (referrer_id <> referred_id)
);
grant select on public.referrals to authenticated;
grant all on public.referrals to service_role;
alter table public.referrals enable row level security;
create policy "Own referrals select" on public.referrals for select to authenticated using (auth.uid() = referrer_id or auth.uid() = referred_id);

create table public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  points int not null check (points <> 0),
  kind text not null check (kind in ('earn_order','earn_referral','redeem','redeem_reversal','adjustment')),
  order_id uuid references public.orders(id),
  referral_id uuid references public.referrals(id),
  description text not null,
  created_at timestamptz not null default now()
);
create index loyalty_user_idx on public.loyalty_ledger(user_id, created_at desc);
create unique index loyalty_order_kind_uniq on public.loyalty_ledger(order_id, kind) where order_id is not null;
create unique index loyalty_referral_uniq on public.loyalty_ledger(referral_id) where referral_id is not null;
grant select on public.loyalty_ledger to authenticated;
grant all on public.loyalty_ledger to service_role;
alter table public.loyalty_ledger enable row level security;
create policy "Own ledger select" on public.loyalty_ledger for select to authenticated using (auth.uid() = user_id);

create or replace function public.my_points_balance()
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(points), 0)::int from public.loyalty_ledger where user_id = auth.uid()
$$;
grant execute on function public.my_points_balance() to authenticated;

-- ========== Ration bundles ==========
create table public.ration_bundles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  household_label text not null,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true
);
grant select on public.ration_bundles to anon, authenticated;
grant all on public.ration_bundles to service_role;
alter table public.ration_bundles enable row level security;
create policy "Bundles are public" on public.ration_bundles for select to anon, authenticated using (is_active);
create policy "Admins manage bundles" on public.ration_bundles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.ration_bundle_items (
  bundle_id uuid not null references public.ration_bundles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null check (quantity > 0),
  primary key (bundle_id, product_id)
);
grant select on public.ration_bundle_items to anon, authenticated;
grant all on public.ration_bundle_items to service_role;
alter table public.ration_bundle_items enable row level security;
create policy "Bundle items are public" on public.ration_bundle_items for select to anon, authenticated using (true);
create policy "Admins manage bundle items" on public.ration_bundle_items for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ========== Ration Circle ==========
create type public.campaign_status as enum ('collecting','goal_reached','confirming_supplier','confirmed','failed','cancelled','completed');

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  product_id uuid not null references public.products(id),
  price numeric(10,2) not null check (price > 0),
  price_is_confirmed boolean not null default false,
  min_quantity int not null check (min_quantity > 0),
  max_per_user int not null default 5,
  deadline timestamptz not null,
  delivery_window_text text not null,
  status public.campaign_status not null default 'collecting',
  payment_rule text not null default 'Reservation only. No advance payment. Pay cash on delivery once the campaign is confirmed.',
  failure_policy text not null default 'If the minimum is not reached by the deadline, the campaign is cancelled and every reservation is released. Nothing is charged.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.campaigns to anon, authenticated;
grant all on public.campaigns to service_role;
alter table public.campaigns enable row level security;
create policy "Campaigns are public" on public.campaigns for select to anon, authenticated using (true);
create policy "Admins manage campaigns" on public.campaigns for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
grant insert, update, delete on public.campaigns to authenticated;
create trigger campaigns_touch before update on public.campaigns for each row execute function public.touch_updated_at();

create table public.campaign_participants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null,
  quantity int not null check (quantity > 0),
  status text not null default 'reserved' check (status in ('reserved','confirmed','cancelled','released','fulfilled')),
  zone_id uuid references public.delivery_zones(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);
grant select on public.campaign_participants to authenticated;
grant all on public.campaign_participants to service_role;
alter table public.campaign_participants enable row level security;
create policy "Own participation select" on public.campaign_participants for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create trigger campaign_participants_touch before update on public.campaign_participants for each row execute function public.touch_updated_at();

create or replace function public.campaign_progress()
returns table (campaign_id uuid, committed_quantity bigint, participant_count bigint)
language sql stable security definer set search_path = public as $$
  select c.id, coalesce(sum(p.quantity) filter (where p.status in ('reserved','confirmed','fulfilled')), 0),
         count(p.id) filter (where p.status in ('reserved','confirmed','fulfilled'))
  from public.campaigns c left join public.campaign_participants p on p.campaign_id = c.id
  group by c.id
$$;
grant execute on function public.campaign_progress() to anon, authenticated;

create or replace function public.campaign_check_goal()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_total bigint; v_min int; v_status public.campaign_status;
begin
  select min_quantity, status into v_min, v_status from public.campaigns where id = new.campaign_id;
  select coalesce(sum(quantity),0) into v_total from public.campaign_participants
    where campaign_id = new.campaign_id and status in ('reserved','confirmed');
  if v_status = 'collecting' and v_total >= v_min then
    update public.campaigns set status = 'goal_reached' where id = new.campaign_id;
  elsif v_status = 'goal_reached' and v_total < v_min then
    update public.campaigns set status = 'collecting' where id = new.campaign_id;
  end if;
  return new;
end; $$;
create trigger campaign_participants_goal after insert or update on public.campaign_participants for each row execute function public.campaign_check_goal();

create or replace function public.campaign_release_on_fail()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('failed','cancelled') and old.status is distinct from new.status then
    update public.campaign_participants set status = 'released' where campaign_id = new.id and status in ('reserved','confirmed');
  end if;
  return new;
end; $$;
create trigger campaigns_release after update on public.campaigns for each row execute function public.campaign_release_on_fail();

-- ========== GharBudget ==========
create table public.budget_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  month date not null,
  budget_amount numeric(10,2) not null check (budget_amount >= 0),
  household_size int not null default 4 check (household_size between 1 and 20),
  preferred_brands text[] not null default '{}',
  reminders_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);
grant select, insert, update, delete on public.budget_plans to authenticated;
grant all on public.budget_plans to service_role;
alter table public.budget_plans enable row level security;
create policy "Own plans select" on public.budget_plans for select to authenticated using (auth.uid() = user_id);
create policy "Own plans insert" on public.budget_plans for insert to authenticated with check (auth.uid() = user_id);
create policy "Own plans update" on public.budget_plans for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own plans delete" on public.budget_plans for delete to authenticated using (auth.uid() = user_id);
create trigger budget_plans_touch before update on public.budget_plans for each row execute function public.touch_updated_at();

create table public.budget_plan_items (
  plan_id uuid not null references public.budget_plans(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null check (quantity > 0),
  primary key (plan_id, product_id)
);
grant select, insert, update, delete on public.budget_plan_items to authenticated;
grant all on public.budget_plan_items to service_role;
alter table public.budget_plan_items enable row level security;
create policy "Own plan items all" on public.budget_plan_items for all to authenticated
  using (exists (select 1 from public.budget_plans b where b.id = plan_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.budget_plans b where b.id = plan_id and b.user_id = auth.uid()));

-- ========== Support ==========
create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  order_id uuid references public.orders(id),
  kind text not null check (kind in ('question','cancellation','return','refund','missing_item','other')),
  message text not null check (char_length(message) between 5 and 2000),
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  created_at timestamptz not null default now()
);
grant select, insert on public.support_requests to authenticated;
grant all on public.support_requests to service_role;
alter table public.support_requests enable row level security;
create policy "Own support select" on public.support_requests for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Own support insert" on public.support_requests for insert to authenticated
  with check (auth.uid() = user_id and status = 'open' and (order_id is null or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())));

-- ========== Audit log ==========
create table public.audit_log (
  id bigserial primary key,
  table_name text not null,
  row_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  actor uuid,
  created_at timestamptz not null default now()
);
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "Admins read audit" on public.audit_log for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (table_name, row_id, action, old_data, new_data, actor)
  values (tg_table_name,
    case when tg_op = 'DELETE' then (to_jsonb(old)->>'id')::uuid else (to_jsonb(new)->>'id')::uuid end,
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
    auth.uid());
  return coalesce(new, old);
end; $$;
create trigger audit_orders after insert or update or delete on public.orders for each row execute function public.audit_row();
create trigger audit_campaigns after insert or update or delete on public.campaigns for each row execute function public.audit_row();
create trigger audit_campaign_participants after insert or update or delete on public.campaign_participants for each row execute function public.audit_row();

-- ========== Order lifecycle ==========
create sequence public.order_number_seq start 1001;

create or replace function public.create_order(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := (p->>'user_id')::uuid;
  v_order_id uuid;
  v_number text;
  v_item jsonb;
  v_points int := coalesce((p->>'points_redeemed')::int, 0);
  v_balance int;
  v_updated int;
begin
  perform pg_advisory_xact_lock(hashtext(v_user::text));

  if v_points > 0 then
    select coalesce(sum(points),0) into v_balance from public.loyalty_ledger where user_id = v_user;
    if v_balance < v_points then
      raise exception 'INSUFFICIENT_POINTS';
    end if;
  end if;

  v_number := 'SBT-' || to_char(now() at time zone 'Asia/Karachi', 'YYMMDD') || '-' || nextval('public.order_number_seq');

  insert into public.orders (order_number, user_id, payment_method, customer_name, phone, zone_id, city, area, address_line, instructions,
    delivery_date, delivery_window, subtotal, discount_total, delivery_fee, total, eligible_points_subtotal, points_to_earn,
    points_redeemed, reward_id, promo_code, notes)
  values (v_number, v_user, p->>'payment_method', p->>'customer_name', p->>'phone', (p->>'zone_id')::uuid, p->>'city', p->>'area',
    p->>'address_line', nullif(p->>'instructions',''), (p->>'delivery_date')::date, p->>'delivery_window',
    (p->>'subtotal')::numeric, (p->>'discount_total')::numeric, (p->>'delivery_fee')::numeric, (p->>'total')::numeric,
    (p->>'eligible_points_subtotal')::numeric, (p->>'points_to_earn')::int, v_points,
    nullif(p->>'reward_id','')::uuid, nullif(p->>'promo_code',''), nullif(p->>'notes',''))
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p->'items') loop
    update public.products set stock_quantity = stock_quantity - (v_item->>'quantity')::int
      where id = (v_item->>'product_id')::uuid and is_active and stock_quantity >= (v_item->>'quantity')::int;
    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      raise exception 'OUT_OF_STOCK:%', v_item->>'name';
    end if;
    insert into public.order_items (order_id, product_id, name, brand, pack_size, image, unit_price, quantity, line_total, is_reward)
    values (v_order_id, (v_item->>'product_id')::uuid, v_item->>'name', nullif(v_item->>'brand',''), v_item->>'pack_size',
      nullif(v_item->>'image',''), (v_item->>'unit_price')::numeric, (v_item->>'quantity')::int, (v_item->>'line_total')::numeric,
      coalesce((v_item->>'is_reward')::boolean, false));
  end loop;

  if v_points > 0 then
    insert into public.loyalty_ledger (user_id, points, kind, order_id, description)
    values (v_user, -v_points, 'redeem', v_order_id, 'Redeemed on order ' || v_number);
  end if;

  if nullif(p->>'promo_code','') is not null then
    update public.promo_codes set used_count = used_count + 1 where code = p->>'promo_code';
  end if;

  insert into public.order_status_events (order_id, status, note, actor) values (v_order_id, 'pending_confirmation', 'Order placed', v_user);

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_number);
end; $$;
revoke all on function public.create_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;

create or replace function public.order_status_changed()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_ref public.referrals%rowtype; v_item record;
begin
  if new.status is not distinct from old.status then return new; end if;

  insert into public.order_status_events (order_id, status, actor) values (new.id, new.status, auth.uid());

  if new.status = 'delivered' then
    if new.points_to_earn > 0 then
      insert into public.loyalty_ledger (user_id, points, kind, order_id, description)
      values (new.user_id, new.points_to_earn, 'earn_order', new.id, 'Earned on delivered order ' || new.order_number)
      on conflict do nothing;
    end if;
    if new.subtotal >= 1500 then
      select * into v_ref from public.referrals where referred_id = new.user_id and status = 'pending' for update;
      if found and v_ref.referrer_id <> new.user_id then
        update public.referrals set status = 'rewarded', qualifying_order_id = new.id, rewarded_at = now() where id = v_ref.id;
        insert into public.loyalty_ledger (user_id, points, kind, referral_id, description)
        values (v_ref.referrer_id, 30, 'earn_referral', v_ref.id, 'Referral reward: friend completed first qualifying order')
        on conflict do nothing;
      end if;
    end if;
  end if;

  if new.status in ('cancelled','refunded') then
    if new.points_redeemed > 0 then
      insert into public.loyalty_ledger (user_id, points, kind, order_id, description)
      values (new.user_id, new.points_redeemed, 'redeem_reversal', new.id, 'Points returned for order ' || new.order_number)
      on conflict do nothing;
    end if;
    if new.status = 'cancelled' and old.status in ('pending_confirmation','confirmed','preparing') then
      for v_item in select product_id, quantity from public.order_items where order_id = new.id loop
        update public.products set stock_quantity = stock_quantity + v_item.quantity where id = v_item.product_id;
      end loop;
    end if;
  end if;
  return new;
end; $$;
create trigger orders_status_changed after update on public.orders for each row execute function public.order_status_changed();

-- ========== Search ==========
create or replace function public.search_products(
  p_q text default null, p_category text default null, p_brands text[] default null,
  p_min numeric default null, p_max numeric default null, p_in_stock boolean default false,
  p_sort text default 'relevance', p_limit int default 24, p_offset int default 0)
returns table (
  id uuid, slug text, name text, brand text, category_id uuid, category_slug text, category_name text,
  pack_size text, unit text, unit_quantity numeric, price numeric, compare_at_price numeric,
  stock_quantity int, max_per_order int, images text[], points_eligible boolean, created_at timestamptz, total_count bigint)
language sql stable security invoker set search_path = public, extensions as $$
  with q as (select nullif(trim(coalesce(p_q,'')), '') as term),
  base as (
    select p.*, c.slug as c_slug, c.name as c_name,
      case when (select term from q) is null then 0::real
        else greatest(extensions.word_similarity((select term from q), p.name),
                      extensions.similarity(coalesce(p.brand,''), (select term from q))) end as score
    from public.products p join public.categories c on c.id = p.category_id
    where p.is_active and c.is_active
      and (p_category is null or c.slug = p_category)
      and (p_brands is null or cardinality(p_brands) = 0 or p.brand = any(p_brands))
      and (p_min is null or p.price >= p_min)
      and (p_max is null or p.price <= p_max)
      and (not coalesce(p_in_stock,false) or p.stock_quantity > 0)
      and ((select term from q) is null
        or p.name ilike '%' || (select term from q) || '%'
        or coalesce(p.brand,'') ilike '%' || (select term from q) || '%'
        or c.name ilike '%' || (select term from q) || '%'
        or extensions.word_similarity((select term from q), p.name) > 0.4
        or extensions.similarity(coalesce(p.brand,''), (select term from q)) > 0.35)
  )
  select b.id, b.slug, b.name, b.brand, b.category_id, b.c_slug, b.c_name, b.pack_size, b.unit, b.unit_quantity::numeric,
    b.price::numeric, b.compare_at_price::numeric, b.stock_quantity, b.max_per_order, b.images, b.points_eligible, b.created_at,
    count(*) over () as total_count
  from base b
  order by
    case when p_sort = 'price_asc' then b.price end asc nulls last,
    case when p_sort = 'price_desc' then b.price end desc nulls last,
    case when p_sort = 'newest' then b.created_at end desc nulls last,
    b.score desc, b.is_featured desc, b.name asc
  limit greatest(1, least(coalesce(p_limit,24), 60)) offset greatest(0, coalesce(p_offset,0))
$$;
grant execute on function public.search_products(text, text, text[], numeric, numeric, boolean, text, int, int) to anon, authenticated;

create or replace function public.frequently_bought_with(p_product uuid, p_limit int default 6)
returns table (product_id uuid, together_count bigint)
language sql stable security definer set search_path = public as $$
  select oi2.product_id, count(distinct oi2.order_id)
  from public.order_items oi1
  join public.order_items oi2 on oi2.order_id = oi1.order_id and oi2.product_id <> oi1.product_id
  join public.orders o on o.id = oi1.order_id and o.status not in ('cancelled','refunded')
  where oi1.product_id = p_product and not oi2.is_reward
  group by oi2.product_id
  order by 2 desc
  limit p_limit
$$;
grant execute on function public.frequently_bought_with(uuid, int) to anon, authenticated;
