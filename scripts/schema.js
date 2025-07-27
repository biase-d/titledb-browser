
export const schema = {
    tableName: 'games',
    extensions: [
        'CREATE EXTENSION IF NOT EXISTS pg_trgm;'
    ],
    columns: [
        { name: 'id', type: 'TEXT', constraints: 'PRIMARY KEY' },
        { name: 'names', type: 'TEXT[]' },
        { name: 'publisher', type: 'TEXT' },
        { name: 'release_date', type: 'INT' },
        { name: 'size_in_bytes', type: 'BIGINT' },
        { name: 'icon_url', type: 'TEXT' },
        { name: 'banner_url', type: 'TEXT' },
        { name: 'screenshots', type: 'TEXT[]' },
        { name: 'performance', type: 'JSONB' },
        { name: 'contributor', type: 'TEXT' },
        { name: 'last_updated', type: 'TIMESTAMPTZ', constraints: 'DEFAULT NOW()' }
    ],
    indexes: [
        'CREATE INDEX IF NOT EXISTS idx_games_publisher ON games (publisher);',
        'CREATE INDEX IF NOT EXISTS idx_games_release_date ON games (release_date DESC);',
        'CREATE INDEX IF NOT EXISTS idx_games_size ON games (size_in_bytes DESC);',
        'CREATE INDEX IF NOT EXISTS idx_games_names_gin ON games USING GIN (names);',
        'CREATE INDEX IF NOT EXISTS idx_games_names_gin_trgm ON games USING GIN (array_to_string(names, \' \') gin_trgm_ops);'
    ]
};
