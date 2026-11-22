-- FORGE: Bangladesh region setup for BDT pricing
-- Run against Medusa PostgreSQL database to enable BDT prices for Bangladesh customers

-- Create Bangladesh region with BDT currency
INSERT INTO region (id, name, currency_code, automatic_taxes, created_at, updated_at)
VALUES ('reg_01M27QBX4C3XKZFWCQD47CM2EJ', 'Bangladesh', 'bdt', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  currency_code = 'bdt',
  name = 'Bangladesh',
  updated_at = NOW();

-- Associate Bangladesh (bd) country with Bangladesh region
UPDATE region_country
SET region_id = 'reg_01M27QBX4C3XKZFWCQD47CM2EJ'
WHERE iso_2 = 'bd';

-- Set Default Sales Channel's default region to Bangladesh (via metadata)
UPDATE sales_channel
SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{region_id}', '"reg_01M27QBX4C3XKZFWCQD47CM2EJ"')
WHERE id = 'sc_01M7YAZ02XJRBK06Y495NRC5NJ';

-- Verify
SELECT 'Region:' as check, id, name, currency_code FROM region WHERE id = 'reg_01M27QBX4C3XKZFWCQD47CM2EJ'
UNION ALL
SELECT 'Country:' as check, rc.iso_2, rc.name, r.currency_code
FROM region_country rc
JOIN region r ON rc.region_id = r.id
WHERE rc.iso_2 = 'bd'
UNION ALL
SELECT 'SalesChannel:' as check, sc.id, sc.name, sc.metadata->>'region_id' as region_id
FROM sales_channel sc
WHERE sc.id = 'sc_01M7YAZ02XJRBK06Y495NRC5NJ';

-- FORGE: Add Bangladesh geo_zone for shipping (linked to Europe service_zone)
INSERT INTO geo_zone (id, type, country_code, province_code, service_zone_id, created_at, updated_at)
VALUES ('fgz_bangladesh', 'country', 'bd', NULL, 'serzo_01M7ZMQKSF5AK1CHPEPYPCFSQZ', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- FORGE: Add BDT shipping prices for Standard Shipping (100 BDT) and Express Shipping (200 BDT)
-- Standard Shipping price_set: pset_01M7ZMQKVJZ7XQZSDA09HQ2350
INSERT INTO price (id, price_set_id, currency_code, amount, raw_amount, created_at, updated_at)
VALUES ('pri_bdt_standard', 'pset_01M7ZMQKVJZ7XQZSDA09HQ2350', 'bdt', 10000, '{"value": "100", "precision": 20}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Express Shipping price_set: pset_01M7ZMQKVJHMPJAHPB7YYJG1X4
INSERT INTO price (id, price_set_id, currency_code, amount, raw_amount, created_at, updated_at)
VALUES ('pri_bdt_express', 'pset_01M7ZMQKVJHMPJAHPB7YYJG1X4', 'bdt', 20000, '{"value": "200", "precision": 20}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- FORGE: Enable payment provider for Bangladesh region (system default for now; bKash integration TBD)
INSERT INTO region_payment_provider (id, region_id, payment_provider_id, created_at, updated_at)
VALUES ('rpp_bangladesh_default', 'reg_01M27QBX4C3XKZFWCQD47CM2EJ', 'pp_system_default', NOW(), NOW())
ON CONFLICT (region_id, payment_provider_id) DO NOTHING;