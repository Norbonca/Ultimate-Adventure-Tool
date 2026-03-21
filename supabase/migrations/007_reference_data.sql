-- ============================================================================
-- 007 — Reference Data: Countries, Languages, Currencies, Timezones
-- ============================================================================
-- Modul:       Reference Data
-- Database:    Supabase PostgreSQL 16+
-- Encoding:    UTF-8
-- Dátum:       2026-03-21
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ref_languages
-- ============================================================================
-- Created first because ref_countries references primary_language

CREATE TABLE ref_languages (
  code            varchar(5)   PRIMARY KEY,
  name_en         varchar(80)  NOT NULL,
  name_hu         varchar(80)  NOT NULL,
  name_native     varchar(80)  NOT NULL,
  direction       varchar(3)   NOT NULL DEFAULT 'ltr',
  is_app_supported  boolean    NOT NULL DEFAULT false,
  is_content_language boolean  NOT NULL DEFAULT true,
  sort_order      integer      NOT NULL DEFAULT 999,
  is_active       boolean      NOT NULL DEFAULT true,
  created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_ref_languages_app_supported ON ref_languages (is_app_supported);
CREATE INDEX idx_ref_languages_active ON ref_languages (is_active);

-- ============================================================================
-- 2. ref_currencies
-- ============================================================================
-- Created before ref_countries because ref_countries references default_currency

CREATE TABLE ref_currencies (
  code              varchar(3)   PRIMARY KEY,
  numeric_code      varchar(3),
  name_en           varchar(80)  NOT NULL,
  name_hu           varchar(80)  NOT NULL,
  symbol            varchar(6)   NOT NULL,
  decimal_digits    integer      NOT NULL DEFAULT 2,
  thousands_separator varchar(1) NOT NULL DEFAULT ',',
  decimal_separator varchar(1)   NOT NULL DEFAULT '.',
  symbol_position   varchar(6)   NOT NULL DEFAULT 'prefix',
  format_example    varchar(30),
  is_stripe_supported boolean    NOT NULL DEFAULT false,
  is_active         boolean      NOT NULL DEFAULT true,
  sort_order        integer      NOT NULL DEFAULT 999,
  created_at        timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_ref_currencies_active ON ref_currencies (is_active);
CREATE INDEX idx_ref_currencies_stripe ON ref_currencies (is_stripe_supported);

-- ============================================================================
-- 3. ref_countries
-- ============================================================================

CREATE TABLE ref_countries (
  code              varchar(2)     PRIMARY KEY,
  alpha3            varchar(3)     NOT NULL,
  numeric_code      varchar(3)     NOT NULL,
  name_en           varchar(100)   NOT NULL,
  name_hu           varchar(100)   NOT NULL,
  name_de           varchar(100),
  name_native       varchar(100),
  continent         varchar(20)    NOT NULL,
  sub_region        varchar(50),
  phone_code        varchar(8)     NOT NULL,
  default_currency  varchar(3)     NOT NULL REFERENCES ref_currencies(code),
  primary_language  varchar(5)     NOT NULL REFERENCES ref_languages(code),
  flag_emoji        varchar(4),
  is_eu             boolean        NOT NULL DEFAULT false,
  is_eurozone       boolean        NOT NULL DEFAULT false,
  is_schengen       boolean        NOT NULL DEFAULT false,
  market_priority   integer,
  ppp_multiplier    decimal(3,2),
  is_active         boolean        NOT NULL DEFAULT true,
  sort_order        integer        NOT NULL DEFAULT 999,
  created_at        timestamptz    NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_ref_countries_alpha3 ON ref_countries (alpha3);
CREATE INDEX idx_ref_countries_continent ON ref_countries (continent);
CREATE INDEX idx_ref_countries_active ON ref_countries (is_active);
CREATE INDEX idx_ref_countries_market ON ref_countries (market_priority);

-- ============================================================================
-- 4. ref_timezones
-- ============================================================================

CREATE TABLE ref_timezones (
  tz_id             varchar(50)  PRIMARY KEY,
  display_name      varchar(80)  NOT NULL,
  utc_offset_minutes integer     NOT NULL,
  utc_offset_text   varchar(10)  NOT NULL,
  has_dst           boolean      NOT NULL DEFAULT false,
  country_code      varchar(2)   NOT NULL REFERENCES ref_countries(code),
  sort_order        integer      NOT NULL DEFAULT 999,
  is_active         boolean      NOT NULL DEFAULT true,
  created_at        timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_ref_timezones_country ON ref_timezones (country_code);
CREATE INDEX idx_ref_timezones_active ON ref_timezones (is_active);

-- ============================================================================
-- 5. RLS POLICIES — Public read access for all reference tables
-- ============================================================================

ALTER TABLE ref_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_timezones ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read reference data
CREATE POLICY ref_languages_read ON ref_languages
  FOR SELECT USING (true);

CREATE POLICY ref_currencies_read ON ref_currencies
  FOR SELECT USING (true);

CREATE POLICY ref_countries_read ON ref_countries
  FOR SELECT USING (true);

CREATE POLICY ref_timezones_read ON ref_timezones
  FOR SELECT USING (true);

-- Only service_role can modify reference data (implicit via RLS — no INSERT/UPDATE/DELETE policies)

-- ============================================================================
-- 6. SEED DATA — ref_languages
-- ============================================================================

INSERT INTO ref_languages (code, name_en, name_hu, name_native, direction, is_app_supported, is_content_language, sort_order) VALUES
  -- App-supported languages (sort_order 1-8)
  ('hu', 'Hungarian',   'Magyar',    'Magyar',     'ltr', true,  true, 1),
  ('en', 'English',     'Angol',     'English',    'ltr', true,  true, 2),
  ('de', 'German',      'Német',     'Deutsch',    'ltr', true,  true, 3),
  ('sk', 'Slovak',      'Szlovák',   'Slovenčina', 'ltr', true,  true, 4),
  ('cs', 'Czech',       'Cseh',      'Čeština',    'ltr', true,  true, 5),
  ('hr', 'Croatian',    'Horvát',    'Hrvatski',   'ltr', true,  true, 6),
  ('sl', 'Slovenian',   'Szlovén',   'Slovenščina','ltr', true,  true, 7),
  ('ro', 'Romanian',    'Román',     'Română',     'ltr', true,  true, 8),
  -- Content languages (sort_order 10+)
  ('fr', 'French',      'Francia',   'Français',   'ltr', false, true, 10),
  ('es', 'Spanish',     'Spanyol',   'Español',    'ltr', false, true, 11),
  ('it', 'Italian',     'Olasz',     'Italiano',   'ltr', false, true, 12),
  ('pt', 'Portuguese',  'Portugál',  'Português',  'ltr', false, true, 13),
  ('nl', 'Dutch',       'Holland',   'Nederlands', 'ltr', false, true, 14),
  ('pl', 'Polish',      'Lengyel',   'Polski',     'ltr', false, true, 15),
  ('sv', 'Swedish',     'Svéd',      'Svenska',    'ltr', false, true, 16),
  ('no', 'Norwegian',   'Norvég',    'Norsk',      'ltr', false, true, 17),
  ('da', 'Danish',      'Dán',       'Dansk',      'ltr', false, true, 18),
  ('fi', 'Finnish',     'Finn',      'Suomi',      'ltr', false, true, 19),
  ('bg', 'Bulgarian',   'Bolgár',    'Български',  'ltr', false, true, 20),
  ('sr', 'Serbian',     'Szerb',     'Српски',     'ltr', false, true, 21),
  ('el', 'Greek',       'Görög',     'Ελληνικά',   'ltr', false, true, 22),
  ('tr', 'Turkish',     'Török',     'Türkçe',     'ltr', false, true, 23),
  ('ja', 'Japanese',    'Japán',     '日本語',      'ltr', false, true, 24),
  ('th', 'Thai',        'Thai',      'ไทย',        'ltr', false, true, 25),
  ('ar', 'Arabic',      'Arab',      'العربية',    'rtl', false, true, 26),
  ('he', 'Hebrew',      'Héber',     'עברית',      'rtl', false, true, 27),
  ('uk', 'Ukrainian',   'Ukrán',     'Українська', 'ltr', false, true, 28),
  ('ru', 'Russian',     'Orosz',     'Русский',    'ltr', false, true, 29),
  ('ka', 'Georgian',    'Grúz',      'ქართული',    'ltr', false, true, 30),
  ('ne', 'Nepali',      'Nepáli',    'नेपाली',      'ltr', false, true, 31),
  ('hi', 'Hindi',       'Hindi',     'हिन्दी',       'ltr', false, true, 32),
  ('sw', 'Swahili',     'Szuahéli',  'Kiswahili',  'ltr', false, true, 33),
  ('sq', 'Albanian',    'Albán',     'Shqip',      'ltr', false, true, 34),
  ('mk', 'Macedonian',  'Macedón',   'Македонски', 'ltr', false, true, 35),
  ('bs', 'Bosnian',     'Bosnyák',   'Bosanski',   'ltr', false, true, 36),
  ('is', 'Icelandic',   'Izlandi',   'Íslenska',   'ltr', false, true, 37),
  ('et', 'Estonian',    'Észt',      'Eesti',      'ltr', false, true, 38),
  ('lv', 'Latvian',     'Lett',      'Latviešu',   'ltr', false, true, 39),
  ('lt', 'Lithuanian',  'Litván',    'Lietuvių',   'ltr', false, true, 40),
  ('mt', 'Maltese',     'Máltai',    'Malti',      'ltr', false, true, 41),
  ('ga', 'Irish',       'Ír',        'Gaeilge',    'ltr', false, true, 42),
  ('qu', 'Quechua',     'Kecsua',    'Runasimi',   'ltr', false, true, 43);

-- ============================================================================
-- 7. SEED DATA — ref_currencies
-- ============================================================================

INSERT INTO ref_currencies (code, numeric_code, name_en, name_hu, symbol, decimal_digits, thousands_separator, decimal_separator, symbol_position, format_example, is_stripe_supported, sort_order) VALUES
  -- Primary / European currencies
  ('EUR', '978', 'Euro',                           'Euró',                    '€',    2, '.', ',', 'prefix',  '€1.234,56',     true,  1),
  ('HUF', '348', 'Hungarian Forint',               'Magyar forint',           'Ft',   0, ' ', ',', 'suffix',  '1 234 Ft',      true,  2),
  ('CZK', '203', 'Czech Koruna',                   'Cseh korona',             'Kč',   2, ' ', ',', 'suffix',  '1 234,56 Kč',   true,  3),
  ('HRK', '191', 'Croatian Kuna',                  'Horvát kuna',             'kn',   2, '.', ',', 'suffix',  '1.234,56 kn',   false, 4),
  ('RON', '946', 'Romanian Leu',                    'Román lej',               'lei',  2, '.', ',', 'suffix',  '1.234,56 lei',  true,  5),
  ('PLN', '985', 'Polish Zloty',                    'Lengyel zloty',           'zł',   2, ' ', ',', 'suffix',  '1 234,56 zł',   true,  6),
  ('GBP', '826', 'British Pound',                   'Brit font',               '£',    2, ',', '.', 'prefix',  '£1,234.56',     true,  7),
  ('CHF', '756', 'Swiss Franc',                     'Svájci frank',            'CHF',  2, '''', '.', 'prefix', 'CHF 1''234.56', true,  8),
  ('SEK', '752', 'Swedish Krona',                   'Svéd korona',             'kr',   2, ' ', ',', 'suffix',  '1 234,56 kr',   true,  9),
  ('NOK', '578', 'Norwegian Krone',                 'Norvég korona',           'kr',   2, ' ', ',', 'suffix',  '1 234,56 kr',   true,  10),
  ('DKK', '208', 'Danish Krone',                    'Dán korona',              'kr',   2, '.', ',', 'suffix',  '1.234,56 kr',   true,  11),
  ('BGN', '975', 'Bulgarian Lev',                   'Bolgár leva',             'лв',   2, ' ', ',', 'suffix',  '1 234,56 лв',   true,  12),
  ('RSD', '941', 'Serbian Dinar',                   'Szerb dinár',             'din.', 2, '.', ',', 'suffix',  '1.234,56 din.', false, 13),
  ('BAM', '977', 'Bosnia-Herzegovina Conv. Mark',   'Bosnyák konv. márka',     'KM',   2, '.', ',', 'suffix',  '1.234,56 KM',   false, 14),
  ('MKD', '807', 'Macedonian Denar',                'Macedón dinár',           'ден',  2, '.', ',', 'suffix',  '1.234,56 ден',  false, 15),
  ('ALL', '008', 'Albanian Lek',                    'Albán lek',               'L',    2, '.', ',', 'suffix',  '1.234,56 L',    false, 16),
  ('ISK', '352', 'Icelandic Króna',                 'Izlandi korona',          'kr',   0, '.', ',', 'suffix',  '1.234 kr',      false, 17),
  ('TRY', '949', 'Turkish Lira',                    'Török líra',              '₺',    2, '.', ',', 'prefix',  '₺1.234,56',     true,  18),
  -- Global currencies
  ('USD', '840', 'US Dollar',                       'Amerikai dollár',         '$',    2, ',', '.', 'prefix',  '$1,234.56',     true,  20),
  ('CAD', '124', 'Canadian Dollar',                 'Kanadai dollár',          'CA$',  2, ',', '.', 'prefix',  'CA$1,234.56',   true,  21),
  ('AUD', '036', 'Australian Dollar',               'Ausztrál dollár',         'A$',   2, ',', '.', 'prefix',  'A$1,234.56',    true,  22),
  ('NZD', '554', 'New Zealand Dollar',              'Új-zélandi dollár',       'NZ$',  2, ',', '.', 'prefix',  'NZ$1,234.56',   true,  23),
  ('JPY', '392', 'Japanese Yen',                    'Japán jen',               '¥',    0, ',', '.', 'prefix',  '¥1,234',        true,  24),
  ('THB', '764', 'Thai Baht',                       'Thai baht',               '฿',    2, ',', '.', 'prefix',  '฿1,234.56',     true,  25),
  ('INR', '356', 'Indian Rupee',                    'Indiai rúpia',            '₹',    2, ',', '.', 'prefix',  '₹1,234.56',     true,  26),
  ('AED', '784', 'UAE Dirham',                      'Emírségek dirham',        'د.إ',  2, ',', '.', 'suffix',  '1,234.56 د.إ',  true,  27),
  ('ILS', '376', 'Israeli New Shekel',              'Izraeli sékel',           '₪',    2, ',', '.', 'prefix',  '₪1,234.56',     true,  28),
  ('ZAR', '710', 'South African Rand',              'Dél-afrikai rand',        'R',    2, ' ', ',', 'prefix',  'R 1 234,56',    true,  29),
  ('MXN', '484', 'Mexican Peso',                    'Mexikói peso',            'MX$',  2, ',', '.', 'prefix',  'MX$1,234.56',   true,  30),
  ('BRL', '986', 'Brazilian Real',                   'Brazil real',             'R$',   2, '.', ',', 'prefix',  'R$1.234,56',    true,  31),
  ('GEL', '981', 'Georgian Lari',                    'Grúz lari',              '₾',    2, ' ', ',', 'suffix',  '1 234,56 ₾',    false, 32),
  ('NPR', '524', 'Nepalese Rupee',                  'Nepáli rúpia',            'Rs',   2, ',', '.', 'prefix',  'Rs 1,234.56',   false, 33),
  ('PEN', '604', 'Peruvian Sol',                     'Perui sol',              'S/',   2, ',', '.', 'prefix',  'S/1,234.56',    false, 34),
  ('ARS', '032', 'Argentine Peso',                   'Argentin peso',          'AR$',  2, '.', ',', 'prefix',  'AR$1.234,56',   false, 35),
  ('CLP', '152', 'Chilean Peso',                     'Chilei peso',            'CL$',  0, '.', ',', 'prefix',  'CL$1.234',      false, 36),
  ('COP', '170', 'Colombian Peso',                   'Kolumbiai peso',         'CO$',  2, '.', ',', 'prefix',  'CO$1.234,56',   false, 37),
  ('CRC', '188', 'Costa Rican Colón',                'Costa Rica-i colón',     '₡',    2, '.', ',', 'prefix',  '₡1.234,56',     false, 38),
  ('KES', '404', 'Kenyan Shilling',                  'Kenyai shilling',        'KSh',  2, ',', '.', 'prefix',  'KSh 1,234.56',  false, 39),
  ('TZS', '834', 'Tanzanian Shilling',               'Tanzániai shilling',     'TSh',  2, ',', '.', 'prefix',  'TSh 1,234.56',  false, 40),
  ('MAD', '504', 'Moroccan Dirham',                  'Marokkói dirham',        'MAD',  2, '.', ',', 'suffix',  '1.234,56 MAD',  false, 41);

-- ============================================================================
-- 8. SEED DATA — ref_countries
-- ============================================================================

INSERT INTO ref_countries (code, alpha3, numeric_code, name_en, name_hu, name_de, name_native, continent, sub_region, phone_code, default_currency, primary_language, flag_emoji, is_eu, is_eurozone, is_schengen, market_priority, ppp_multiplier, sort_order) VALUES
  -- Target markets (market_priority = 1)
  ('HU', 'HUN', '348', 'Hungary',        'Magyarország',      'Ungarn',          'Magyarország',      'Europe', 'Central Europe',   '+36',  'HUF', 'hu', '🇭🇺', true,  false, true,  1, 0.65, 1),
  ('SK', 'SVK', '703', 'Slovakia',       'Szlovákia',          'Slowakei',        'Slovensko',         'Europe', 'Central Europe',   '+421', 'EUR', 'sk', '🇸🇰', true,  true,  true,  1, 0.70, 2),
  ('CZ', 'CZE', '203', 'Czechia',        'Csehország',         'Tschechien',      'Česko',             'Europe', 'Central Europe',   '+420', 'CZK', 'cs', '🇨🇿', true,  false, true,  1, 0.70, 3),
  ('HR', 'HRV', '191', 'Croatia',        'Horvátország',       'Kroatien',        'Hrvatska',          'Europe', 'Southern Europe',  '+385', 'EUR', 'hr', '🇭🇷', true,  true,  true,  1, 0.70, 4),
  ('SI', 'SVN', '705', 'Slovenia',       'Szlovénia',          'Slowenien',       'Slovenija',         'Europe', 'Central Europe',   '+386', 'EUR', 'sl', '🇸🇮', true,  true,  true,  1, 0.70, 5),
  ('RO', 'ROU', '642', 'Romania',        'Románia',            'Rumänien',        'România',           'Europe', 'Eastern Europe',   '+40',  'RON', 'ro', '🇷🇴', true,  false, true,  1, 0.60, 6),
  ('DE', 'DEU', '276', 'Germany',        'Németország',        'Deutschland',     'Deutschland',       'Europe', 'Western Europe',   '+49',  'EUR', 'de', '🇩🇪', true,  true,  true,  1, 1.00, 7),
  ('AT', 'AUT', '040', 'Austria',        'Ausztria',           'Österreich',      'Österreich',        'Europe', 'Western Europe',   '+43',  'EUR', 'de', '🇦🇹', true,  true,  true,  1, 1.00, 8),
  -- Secondary markets (market_priority = 2)
  ('PL', 'POL', '616', 'Poland',         'Lengyelország',      'Polen',           'Polska',            'Europe', 'Central Europe',   '+48',  'PLN', 'pl', '🇵🇱', true,  false, true,  2, 0.55, 10),
  ('IT', 'ITA', '380', 'Italy',          'Olaszország',        'Italien',         'Italia',            'Europe', 'Southern Europe',  '+39',  'EUR', 'it', '🇮🇹', true,  true,  true,  2, 0.85, 11),
  ('FR', 'FRA', '250', 'France',         'Franciaország',      'Frankreich',      'France',            'Europe', 'Western Europe',   '+33',  'EUR', 'fr', '🇫🇷', true,  true,  true,  2, 0.90, 12),
  ('ES', 'ESP', '724', 'Spain',          'Spanyolország',      'Spanien',         'España',            'Europe', 'Southern Europe',  '+34',  'EUR', 'es', '🇪🇸', true,  true,  true,  2, 0.80, 13),
  ('PT', 'PRT', '620', 'Portugal',       'Portugália',         'Portugal',        'Portugal',          'Europe', 'Southern Europe',  '+351', 'EUR', 'pt', '🇵🇹', true,  true,  true,  2, 0.70, 14),
  ('CH', 'CHE', '756', 'Switzerland',    'Svájc',              'Schweiz',         'Schweiz',           'Europe', 'Western Europe',   '+41',  'CHF', 'de', '🇨🇭', false, false, true,  2, 1.20, 15),
  ('GB', 'GBR', '826', 'United Kingdom', 'Egyesült Királyság', 'Vereinigtes Königreich', 'United Kingdom', 'Europe', 'Northern Europe', '+44', 'GBP', 'en', '🇬🇧', false, false, false, 2, 0.95, 16),
  ('NL', 'NLD', '528', 'Netherlands',    'Hollandia',          'Niederlande',     'Nederland',         'Europe', 'Western Europe',   '+31',  'EUR', 'nl', '🇳🇱', true,  true,  true,  2, 0.95, 17),
  ('BE', 'BEL', '056', 'Belgium',        'Belgium',            'Belgien',         'België',            'Europe', 'Western Europe',   '+32',  'EUR', 'nl', '🇧🇪', true,  true,  true,  2, 0.90, 18),
  ('SE', 'SWE', '752', 'Sweden',         'Svédország',         'Schweden',        'Sverige',           'Europe', 'Northern Europe',  '+46',  'SEK', 'sv', '🇸🇪', true,  false, true,  2, 1.05, 19),
  ('NO', 'NOR', '578', 'Norway',         'Norvégia',           'Norwegen',        'Norge',             'Europe', 'Northern Europe',  '+47',  'NOK', 'no', '🇳🇴', false, false, true,  2, 1.15, 20),
  ('DK', 'DNK', '208', 'Denmark',        'Dánia',              'Dänemark',        'Danmark',           'Europe', 'Northern Europe',  '+45',  'DKK', 'da', '🇩🇰', true,  false, true,  2, 1.10, 21),
  ('FI', 'FIN', '246', 'Finland',        'Finnország',         'Finnland',        'Suomi',             'Europe', 'Northern Europe',  '+358', 'EUR', 'fi', '🇫🇮', true,  true,  true,  2, 1.00, 22),
  -- Other European countries
  ('BG', 'BGR', '100', 'Bulgaria',                 'Bulgária',              'Bulgarien',         'България',          'Europe', 'Eastern Europe',   '+359', 'BGN', 'bg', '🇧🇬', true,  false, true, NULL, 0.45, 30),
  ('RS', 'SRB', '688', 'Serbia',                   'Szerbia',               'Serbien',           'Србија',           'Europe', 'Southern Europe',  '+381', 'RSD', 'sr', '🇷🇸', false, false, false, NULL, 0.45, 31),
  ('BA', 'BIH', '070', 'Bosnia and Herzegovina',   'Bosznia-Hercegovina',   'Bosnien-Herzegowina','Bosna i Hercegovina','Europe', 'Southern Europe', '+387', 'BAM', 'bs', '🇧🇦', false, false, false, NULL, 0.40, 32),
  ('ME', 'MNE', '499', 'Montenegro',               'Montenegró',            'Montenegro',        'Crna Gora',         'Europe', 'Southern Europe',  '+382', 'EUR', 'sr', '🇲🇪', false, false, false, NULL, 0.45, 33),
  ('MK', 'MKD', '807', 'North Macedonia',          'Észak-Macedónia',       'Nordmazedonien',    'Северна Македонија','Europe', 'Southern Europe',  '+389', 'MKD', 'mk', '🇲🇰', false, false, false, NULL, 0.40, 34),
  ('AL', 'ALB', '008', 'Albania',                  'Albánia',               'Albanien',          'Shqipëria',         'Europe', 'Southern Europe',  '+355', 'ALL', 'sq', '🇦🇱', false, false, false, NULL, 0.35, 35),
  ('GR', 'GRC', '300', 'Greece',                   'Görögország',           'Griechenland',      'Ελλάδα',            'Europe', 'Southern Europe',  '+30',  'EUR', 'el', '🇬🇷', true,  true,  true,  NULL, 0.65, 36),
  ('IE', 'IRL', '372', 'Ireland',                  'Írország',              'Irland',            'Éire',              'Europe', 'Northern Europe',  '+353', 'EUR', 'en', '🇮🇪', true,  true,  false, NULL, 1.05, 37),
  ('IS', 'ISL', '352', 'Iceland',                  'Izland',                'Island',            'Ísland',            'Europe', 'Northern Europe',  '+354', 'ISK', 'is', '🇮🇸', false, false, true,  NULL, 1.10, 38),
  ('LT', 'LTU', '440', 'Lithuania',                'Litvánia',              'Litauen',           'Lietuva',           'Europe', 'Northern Europe',  '+370', 'EUR', 'lt', '🇱🇹', true,  true,  true,  NULL, 0.55, 39),
  ('LV', 'LVA', '428', 'Latvia',                   'Lettország',            'Lettland',          'Latvija',           'Europe', 'Northern Europe',  '+371', 'EUR', 'lv', '🇱🇻', true,  true,  true,  NULL, 0.55, 40),
  ('EE', 'EST', '233', 'Estonia',                  'Észtország',            'Estland',           'Eesti',             'Europe', 'Northern Europe',  '+372', 'EUR', 'et', '🇪🇪', true,  true,  true,  NULL, 0.60, 41),
  ('LU', 'LUX', '442', 'Luxembourg',               'Luxemburg',             'Luxemburg',         'Lëtzebuerg',        'Europe', 'Western Europe',   '+352', 'EUR', 'fr', '🇱🇺', true,  true,  true,  NULL, 1.20, 42),
  ('MT', 'MLT', '470', 'Malta',                    'Málta',                 'Malta',             'Malta',             'Europe', 'Southern Europe',  '+356', 'EUR', 'mt', '🇲🇹', true,  true,  true,  NULL, 0.75, 43),
  ('CY', 'CYP', '196', 'Cyprus',                   'Ciprus',                'Zypern',            'Κύπρος',            'Europe', 'Southern Europe',  '+357', 'EUR', 'el', '🇨🇾', true,  true,  false, NULL, 0.75, 44),
  -- Adventure destinations
  ('US', 'USA', '840', 'United States',             'Egyesült Államok',      'Vereinigte Staaten','United States',     'North America', 'Northern America', '+1',   'USD', 'en', '🇺🇸', false, false, false, NULL, 1.00, 50),
  ('CA', 'CAN', '124', 'Canada',                   'Kanada',                'Kanada',            'Canada',            'North America', 'Northern America', '+1',   'CAD', 'en', '🇨🇦', false, false, false, NULL, 0.90, 51),
  ('NZ', 'NZL', '554', 'New Zealand',              'Új-Zéland',             'Neuseeland',        'New Zealand',       'Oceania',       'Oceania',          '+64',  'NZD', 'en', '🇳🇿', false, false, false, NULL, 0.85, 52),
  ('AU', 'AUS', '036', 'Australia',                'Ausztrália',            'Australien',        'Australia',         'Oceania',       'Oceania',          '+61',  'AUD', 'en', '🇦🇺', false, false, false, NULL, 0.95, 53),
  ('JP', 'JPN', '392', 'Japan',                    'Japán',                 'Japan',             '日本',               'Asia',          'Eastern Asia',     '+81',  'JPY', 'ja', '🇯🇵', false, false, false, NULL, 0.80, 54),
  ('TH', 'THA', '764', 'Thailand',                 'Thaiföld',              'Thailand',          'ประเทศไทย',          'Asia',          'South-Eastern Asia','+66', 'THB', 'th', '🇹🇭', false, false, false, NULL, 0.35, 55),
  ('NP', 'NPL', '524', 'Nepal',                    'Nepál',                 'Nepal',             'नेपाल',              'Asia',          'Southern Asia',    '+977', 'NPR', 'ne', '🇳🇵', false, false, false, NULL, 0.25, 56),
  ('PE', 'PER', '604', 'Peru',                     'Peru',                  'Peru',              'Perú',              'South America', 'South America',    '+51',  'PEN', 'es', '🇵🇪', false, false, false, NULL, 0.35, 57),
  ('AR', 'ARG', '032', 'Argentina',                'Argentína',             'Argentinien',       'Argentina',         'South America', 'South America',    '+54',  'ARS', 'es', '🇦🇷', false, false, false, NULL, 0.30, 58),
  ('CL', 'CHL', '152', 'Chile',                    'Chile',                 'Chile',             'Chile',             'South America', 'South America',    '+56',  'CLP', 'es', '🇨🇱', false, false, false, NULL, 0.45, 59),
  ('ZA', 'ZAF', '710', 'South Africa',             'Dél-Afrika',            'Südafrika',         'South Africa',      'Africa',        'Southern Africa',  '+27',  'ZAR', 'en', '🇿🇦', false, false, false, NULL, 0.40, 60),
  ('MA', 'MAR', '504', 'Morocco',                  'Marokkó',               'Marokko',           'المغرب',            'Africa',        'Northern Africa',  '+212', 'MAD', 'ar', '🇲🇦', false, false, false, NULL, 0.30, 61),
  ('GE', 'GEO', '268', 'Georgia',                  'Grúzia',                'Georgien',          'საქართველო',         'Asia',          'Western Asia',     '+995', 'GEL', 'ka', '🇬🇪', false, false, false, NULL, 0.35, 62),
  ('TR', 'TUR', '792', 'Turkey',                   'Törökország',           'Türkei',            'Türkiye',           'Asia',          'Western Asia',     '+90',  'TRY', 'tr', '🇹🇷', false, false, false, NULL, 0.35, 63),
  ('IL', 'ISR', '376', 'Israel',                   'Izrael',                'Israel',            'ישראל',             'Asia',          'Western Asia',     '+972', 'ILS', 'he', '🇮🇱', false, false, false, NULL, 0.85, 64),
  ('AE', 'ARE', '784', 'United Arab Emirates',     'Egyesült Arab Emírségek','Vereinigte Arabische Emirate','الإمارات','Asia',          'Western Asia',     '+971', 'AED', 'ar', '🇦🇪', false, false, false, NULL, 0.90, 65),
  ('IN', 'IND', '356', 'India',                    'India',                 'Indien',            'भारत',              'Asia',          'Southern Asia',    '+91',  'INR', 'hi', '🇮🇳', false, false, false, NULL, 0.25, 66),
  ('MX', 'MEX', '484', 'Mexico',                   'Mexikó',                'Mexiko',            'México',            'North America', 'Central America',  '+52',  'MXN', 'es', '🇲🇽', false, false, false, NULL, 0.40, 67),
  ('CO', 'COL', '170', 'Colombia',                 'Kolumbia',              'Kolumbien',         'Colombia',          'South America', 'South America',    '+57',  'COP', 'es', '🇨🇴', false, false, false, NULL, 0.30, 68),
  ('CR', 'CRI', '188', 'Costa Rica',               'Costa Rica',            'Costa Rica',        'Costa Rica',        'North America', 'Central America',  '+506', 'CRC', 'es', '🇨🇷', false, false, false, NULL, 0.45, 69),
  ('EC', 'ECU', '218', 'Ecuador',                  'Ecuador',               'Ecuador',           'Ecuador',           'South America', 'South America',    '+593', 'USD', 'es', '🇪🇨', false, false, false, NULL, 0.35, 70),
  ('KE', 'KEN', '404', 'Kenya',                    'Kenya',                 'Kenia',             'Kenya',             'Africa',        'Eastern Africa',   '+254', 'KES', 'sw', '🇰🇪', false, false, false, NULL, 0.25, 71),
  ('TZ', 'TZA', '834', 'Tanzania',                 'Tanzánia',              'Tansania',          'Tanzania',          'Africa',        'Eastern Africa',   '+255', 'TZS', 'sw', '🇹🇿', false, false, false, NULL, 0.25, 72);

-- ============================================================================
-- 9. SEED DATA — ref_timezones
-- ============================================================================

INSERT INTO ref_timezones (tz_id, display_name, utc_offset_minutes, utc_offset_text, has_dst, country_code, sort_order) VALUES
  -- Central European Time (CET/CEST) — UTC+1 / UTC+2
  ('Europe/Budapest',     'Budapest (CET/CEST)',      60,  'UTC+01:00', true,  'HU', 1),
  ('Europe/Bratislava',   'Bratislava (CET/CEST)',    60,  'UTC+01:00', true,  'SK', 2),
  ('Europe/Prague',       'Prague (CET/CEST)',        60,  'UTC+01:00', true,  'CZ', 3),
  ('Europe/Zagreb',       'Zagreb (CET/CEST)',        60,  'UTC+01:00', true,  'HR', 4),
  ('Europe/Ljubljana',    'Ljubljana (CET/CEST)',     60,  'UTC+01:00', true,  'SI', 5),
  ('Europe/Bucharest',    'Bucharest (EET/EEST)',     120, 'UTC+02:00', true,  'RO', 6),
  ('Europe/Berlin',       'Berlin (CET/CEST)',        60,  'UTC+01:00', true,  'DE', 7),
  ('Europe/Vienna',       'Vienna (CET/CEST)',        60,  'UTC+01:00', true,  'AT', 8),
  -- Secondary market timezones
  ('Europe/Warsaw',       'Warsaw (CET/CEST)',        60,  'UTC+01:00', true,  'PL', 10),
  ('Europe/Rome',         'Rome (CET/CEST)',          60,  'UTC+01:00', true,  'IT', 11),
  ('Europe/Paris',        'Paris (CET/CEST)',         60,  'UTC+01:00', true,  'FR', 12),
  ('Europe/Madrid',       'Madrid (CET/CEST)',        60,  'UTC+01:00', true,  'ES', 13),
  ('Atlantic/Canary',     'Canary Islands (WET/WEST)',0,   'UTC+00:00', true,  'ES', 14),
  ('Europe/Lisbon',       'Lisbon (WET/WEST)',        0,   'UTC+00:00', true,  'PT', 15),
  ('Europe/Zurich',       'Zurich (CET/CEST)',        60,  'UTC+01:00', true,  'CH', 16),
  ('Europe/London',       'London (GMT/BST)',         0,   'UTC+00:00', true,  'GB', 17),
  ('Europe/Amsterdam',    'Amsterdam (CET/CEST)',     60,  'UTC+01:00', true,  'NL', 18),
  ('Europe/Brussels',     'Brussels (CET/CEST)',      60,  'UTC+01:00', true,  'BE', 19),
  ('Europe/Stockholm',    'Stockholm (CET/CEST)',     60,  'UTC+01:00', true,  'SE', 20),
  ('Europe/Oslo',         'Oslo (CET/CEST)',          60,  'UTC+01:00', true,  'NO', 21),
  ('Europe/Copenhagen',   'Copenhagen (CET/CEST)',    60,  'UTC+01:00', true,  'DK', 22),
  ('Europe/Helsinki',     'Helsinki (EET/EEST)',      120, 'UTC+02:00', true,  'FI', 23),
  -- Other European
  ('Europe/Sofia',        'Sofia (EET/EEST)',         120, 'UTC+02:00', true,  'BG', 30),
  ('Europe/Belgrade',     'Belgrade (CET/CEST)',      60,  'UTC+01:00', true,  'RS', 31),
  ('Europe/Sarajevo',     'Sarajevo (CET/CEST)',      60,  'UTC+01:00', true,  'BA', 32),
  ('Europe/Podgorica',    'Podgorica (CET/CEST)',     60,  'UTC+01:00', true,  'ME', 33),
  ('Europe/Skopje',       'Skopje (CET/CEST)',        60,  'UTC+01:00', true,  'MK', 34),
  ('Europe/Tirane',       'Tirana (CET/CEST)',        60,  'UTC+01:00', true,  'AL', 35),
  ('Europe/Athens',       'Athens (EET/EEST)',        120, 'UTC+02:00', true,  'GR', 36),
  ('Europe/Dublin',       'Dublin (GMT/IST)',         0,   'UTC+00:00', true,  'IE', 37),
  ('Atlantic/Reykjavik',  'Reykjavik (GMT)',          0,   'UTC+00:00', false, 'IS', 38),
  ('Europe/Vilnius',      'Vilnius (EET/EEST)',       120, 'UTC+02:00', true,  'LT', 39),
  ('Europe/Riga',         'Riga (EET/EEST)',          120, 'UTC+02:00', true,  'LV', 40),
  ('Europe/Tallinn',      'Tallinn (EET/EEST)',       120, 'UTC+02:00', true,  'EE', 41),
  ('Europe/Luxembourg',   'Luxembourg (CET/CEST)',    60,  'UTC+01:00', true,  'LU', 42),
  ('Europe/Malta',        'Malta (CET/CEST)',         60,  'UTC+01:00', true,  'MT', 43),
  ('Asia/Nicosia',        'Nicosia (EET/EEST)',       120, 'UTC+02:00', true,  'CY', 44),
  -- Adventure destinations
  ('America/New_York',    'New York (EST/EDT)',       -300,'UTC-05:00', true,  'US', 50),
  ('America/Chicago',     'Chicago (CST/CDT)',        -360,'UTC-06:00', true,  'US', 51),
  ('America/Denver',      'Denver (MST/MDT)',         -420,'UTC-07:00', true,  'US', 52),
  ('America/Los_Angeles', 'Los Angeles (PST/PDT)',    -480,'UTC-08:00', true,  'US', 53),
  ('Pacific/Honolulu',    'Honolulu (HST)',           -600,'UTC-10:00', false, 'US', 54),
  ('America/Anchorage',   'Anchorage (AKST/AKDT)',    -540,'UTC-09:00', true,  'US', 55),
  ('America/Toronto',     'Toronto (EST/EDT)',        -300,'UTC-05:00', true,  'CA', 56),
  ('America/Vancouver',   'Vancouver (PST/PDT)',      -480,'UTC-08:00', true,  'CA', 57),
  ('Pacific/Auckland',    'Auckland (NZST/NZDT)',     720, 'UTC+12:00', true,  'NZ', 58),
  ('Australia/Sydney',    'Sydney (AEST/AEDT)',       600, 'UTC+10:00', true,  'AU', 59),
  ('Australia/Perth',     'Perth (AWST)',             480, 'UTC+08:00', false, 'AU', 60),
  ('Asia/Tokyo',          'Tokyo (JST)',              540, 'UTC+09:00', false, 'JP', 61),
  ('Asia/Bangkok',        'Bangkok (ICT)',            420, 'UTC+07:00', false, 'TH', 62),
  ('Asia/Kathmandu',      'Kathmandu (NPT)',          345, 'UTC+05:45', false, 'NP', 63),
  ('America/Lima',        'Lima (PET)',               -300,'UTC-05:00', false, 'PE', 64),
  ('America/Argentina/Buenos_Aires', 'Buenos Aires (ART)', -180, 'UTC-03:00', false, 'AR', 65),
  ('America/Santiago',    'Santiago (CLT/CLST)',      -240,'UTC-04:00', true,  'CL', 66),
  ('Africa/Johannesburg', 'Johannesburg (SAST)',      120, 'UTC+02:00', false, 'ZA', 67),
  ('Africa/Casablanca',   'Casablanca (WET+1)',       60,  'UTC+01:00', false, 'MA', 68),
  ('Asia/Tbilisi',        'Tbilisi (GET)',            240, 'UTC+04:00', false, 'GE', 69),
  ('Europe/Istanbul',     'Istanbul (TRT)',           180, 'UTC+03:00', false, 'TR', 70),
  ('Asia/Jerusalem',      'Jerusalem (IST/IDT)',      120, 'UTC+02:00', true,  'IL', 71),
  ('Asia/Dubai',          'Dubai (GST)',              240, 'UTC+04:00', false, 'AE', 72),
  ('Asia/Kolkata',        'Kolkata (IST)',            330, 'UTC+05:30', false, 'IN', 73),
  ('America/Mexico_City', 'Mexico City (CST)',        -360, 'UTC-06:00', false, 'MX', 74),
  ('America/Cancun',      'Cancún (EST)',             -300,'UTC-05:00', false, 'MX', 75),
  ('America/Bogota',      'Bogotá (COT)',             -300,'UTC-05:00', false, 'CO', 76),
  ('America/Costa_Rica',  'San José (CST)',           -360,'UTC-06:00', false, 'CR', 77),
  ('America/Guayaquil',   'Guayaquil (ECT)',          -300,'UTC-05:00', false, 'EC', 78),
  ('Pacific/Galapagos',   'Galápagos (GALT)',         -360,'UTC-06:00', false, 'EC', 79),
  ('Africa/Nairobi',      'Nairobi (EAT)',            180, 'UTC+03:00', false, 'KE', 80),
  ('Africa/Dar_es_Salaam','Dar es Salaam (EAT)',      180, 'UTC+03:00', false, 'TZ', 81);

COMMIT;