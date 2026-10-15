-- =========================================================
--  Base de datos del taller: API de Personajes Marvel
--  Se ejecuta automáticamente la PRIMERA vez que se crea el
--  contenedor. Para reiniciar: docker compose down -v
-- =========================================================

CREATE TABLE teams (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    base          VARCHAR(150),
    founded_year  INTEGER CHECK (founded_year BETWEEN 1900 AND 2100),
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE characters (
    id           SERIAL PRIMARY KEY,
    real_name    VARCHAR(100) NOT NULL,
    alias        VARCHAR(100) NOT NULL UNIQUE,
    main_power   VARCHAR(150) NOT NULL,
    power_level  INTEGER NOT NULL CHECK (power_level BETWEEN 1 AND 100),
    status       VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                 CHECK (status IN ('ACTIVE', 'INJURED', 'MISSING', 'RETIRED')),
    is_villain   BOOLEAN NOT NULL DEFAULT FALSE,
    team_id      INTEGER REFERENCES teams(id) ON DELETE RESTRICT,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_characters_team   ON characters(team_id);
CREATE INDEX idx_characters_status ON characters(status);

-- ---------------------------------------------------------
--  Datos iniciales
-- ---------------------------------------------------------
INSERT INTO teams (name, base, founded_year, active) VALUES
('Avengers',                'Avengers Tower, New York',             1963, TRUE),
('X-Men',                   'Xavier Institute, Westchester',        1963, TRUE),
('Guardians of the Galaxy', 'The Milano, outer space',              2008, TRUE),
('Fantastic Four',          'Baxter Building, New York',            1961, TRUE),
('Brotherhood of Mutants',  'Asteroid M',                           1964, TRUE),
('Thunderbolts',            'Thunderbolts Mountain, Colorado',      1997, FALSE);

INSERT INTO characters (real_name, alias, main_power, power_level, status, is_villain, team_id) VALUES
('Tony Stark',        'Iron Man',          'Powered armor suit',          85, 'RETIRED', FALSE, 1),
('Steve Rogers',      'Captain America',   'Super soldier',               75, 'RETIRED', FALSE, 1),
('Thor Odinson',      'Thor',              'Thunder control',             95, 'ACTIVE',  FALSE, 1),
('Natasha Romanoff',  'Black Widow',       'Espionage and combat',        60, 'MISSING', FALSE, 1),
('Bruce Banner',      'Hulk',              'Superhuman strength',         92, 'ACTIVE',  FALSE, 1),
('Logan',             'Wolverine',         'Healing factor',              80, 'ACTIVE',  FALSE, 2),
('Ororo Munroe',      'Storm',             'Weather control',             88, 'ACTIVE',  FALSE, 2),
('Charles Xavier',    'Professor X',       'Telepathy',                   90, 'INJURED', FALSE, 2),
('Peter Quill',       'Star-Lord',         'Combat and leadership',       55, 'ACTIVE',  FALSE, 3),
('Gamora',            'Gamora',            'Expert assassin',             70, 'ACTIVE',  FALSE, 3),
('Groot',             'Groot',             'Plant regeneration',          72, 'ACTIVE',  FALSE, 3),
('Reed Richards',     'Mister Fantastic',  'Elasticity',                  78, 'ACTIVE',  FALSE, 4),
('Susan Storm',       'Invisible Woman',   'Invisibility and force fields', 83, 'ACTIVE', FALSE, 4),
('Erik Lehnsherr',    'Magneto',           'Magnetism control',           94, 'ACTIVE',  TRUE,  5),
('Raven Darkholme',   'Mystique',          'Shapeshifting',               68, 'INJURED', TRUE,  5),
('Peter Parker',      'Spider-Man',        'Spider-sense and agility',    78, 'ACTIVE',  FALSE, NULL),
('Wanda Maximoff',    'Scarlet Witch',     'Reality manipulation',        98, 'MISSING', FALSE, NULL),
('Thanos',            'Thanos',            'Titanic strength',            97, 'RETIRED', TRUE,  NULL);
