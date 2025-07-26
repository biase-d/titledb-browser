DROP TABLE IF EXISTS games;

CREATE TABLE games (
    id TEXT PRIMARY KEY,
    names TEXT[],
    publisher TEXT,
    release_date INT,
    size_in_bytes BIGINT,
    icon_url TEXT,
    banner_url TEXT,
    screenshots TEXT[],
    performance JSONB,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_games_publisher ON games (publisher);
CREATE INDEX idx_games_release_date ON games (release_date DESC);
CREATE INDEX idx_games_size ON games (size_in_bytes DESC);

CREATE INDEX idx_games_names_gin ON games USING GIN (names);