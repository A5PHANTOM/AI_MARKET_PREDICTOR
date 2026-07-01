INSERT OR IGNORE INTO users_profile (id, cash_balance, created_at)
VALUES ('default', 10000.0, datetime('now'));

INSERT OR IGNORE INTO watchlist (id, user_id, ticker, added_at) VALUES
    ('seed-001', 'default', 'BTC', datetime('now')),
    ('seed-002', 'default', 'ETH', datetime('now')),
    ('seed-003', 'default', 'SOL', datetime('now')),
    ('seed-004', 'default', 'XRP', datetime('now')),
    ('seed-005', 'default', 'BNB', datetime('now')),
    ('seed-006', 'default', 'DOGE', datetime('now')),
    ('seed-007', 'default', 'ADA', datetime('now')),
    ('seed-008', 'default', 'AVAX', datetime('now')),
    ('seed-009', 'default', 'DOT', datetime('now')),
    ('seed-010', 'default', 'LINK', datetime('now'));
