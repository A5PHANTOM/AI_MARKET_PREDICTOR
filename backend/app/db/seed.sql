INSERT OR IGNORE INTO users_profile (id, cash_balance, created_at)
VALUES ('default', 10000.0, datetime('now'));

INSERT OR IGNORE INTO watchlist (id, user_id, ticker, added_at) VALUES
    ('seed-001', 'default', 'AAPL', datetime('now')),
    ('seed-002', 'default', 'GOOGL', datetime('now')),
    ('seed-003', 'default', 'MSFT', datetime('now')),
    ('seed-004', 'default', 'AMZN', datetime('now')),
    ('seed-005', 'default', 'TSLA', datetime('now')),
    ('seed-006', 'default', 'NVDA', datetime('now')),
    ('seed-007', 'default', 'META', datetime('now')),
    ('seed-008', 'default', 'JPM', datetime('now')),
    ('seed-009', 'default', 'V', datetime('now')),
    ('seed-010', 'default', 'NFLX', datetime('now'));
