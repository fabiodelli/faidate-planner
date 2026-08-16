-- Schema AI DIY Project Planner
-- Idempotente: eseguibile più volte senza errori.

CREATE TABLE IF NOT EXISTS materials (
  id              serial PRIMARY KEY,
  slug            text UNIQUE NOT NULL,
  name            text NOT NULL,
  category        text NOT NULL,
  material_unit   text NOT NULL,            -- unità del materiale: l, kg, mq, ml, pz, rotolo
  work_unit       text NOT NULL,            -- unità di lavoro: mq, ml, mc, pz, plinto...
  consumption_min numeric NOT NULL,         -- consumo materiale per unità di lavoro (min)
  consumption_max numeric NOT NULL,         -- consumo materiale per unità di lavoro (max)
  passes_default  integer NOT NULL DEFAULT 1, -- mani/passate consigliate
  waste_factor    numeric NOT NULL DEFAULT 0.1, -- fattore di scarto consigliato
  packages        jsonb,                    -- formati confezione tipici [2.5, 5, 14]
  notes           text,
  search          tsvector GENERATED ALWAYS AS (
                    to_tsvector('italian', coalesce(name,'') || ' ' || coalesce(category,'') || ' ' || coalesce(notes,''))
                  ) STORED
);
CREATE INDEX IF NOT EXISTS materials_search_idx ON materials USING gin(search);

CREATE TABLE IF NOT EXISTS products (
  id          serial PRIMARY KEY,
  external_id text UNIQUE,                  -- id prodotto dal feed Awin
  merchant    text NOT NULL DEFAULT 'leroymerlin_it',
  name        text NOT NULL,
  description text,
  category    text,
  brand       text,
  price       numeric NOT NULL,
  currency    text NOT NULL DEFAULT 'EUR',
  in_stock    boolean NOT NULL DEFAULT true,
  image_url   text,
  deeplink    text NOT NULL,                -- link affiliato
  is_sample   boolean NOT NULL DEFAULT false, -- true per i dati demo pre-feed
  updated_at  timestamptz NOT NULL DEFAULT now(),
  search      tsvector GENERATED ALWAYS AS (
                to_tsvector('italian', coalesce(name,'') || ' ' || coalesce(category,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(description,''))
              ) STORED
);
CREATE INDEX IF NOT EXISTS products_search_idx ON products USING gin(search);
CREATE INDEX IF NOT EXISTS products_price_idx ON products(price);

CREATE TABLE IF NOT EXISTS plans (
  id         serial PRIMARY KEY,
  slug       text UNIQUE NOT NULL,
  title      text NOT NULL,
  plan       jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id         serial PRIMARY KEY,
  type       text NOT NULL,                 -- plan_generated | affiliate_click | chat_started
  plan_slug  text,
  payload    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_type_idx ON events(type, created_at);
