# CSV Import Schema

## Required columns

| Column | Format | Example | Notes |
|---|---|---|---|
| `draw_date` | `YYYY-MM-DD` (ISO 8601) | `2024-01-16` | Unique per draw; GLO draws on 1st and 16th of each month |
| `first_prize` | 6-digit zero-padded string | `123456` | Full 1st prize number |
| `two_lower` | 2-digit zero-padded string | `05` | Official GLO 2-digit bottom prize |

## Optional columns

| Column | Format | Example | Notes |
|---|---|---|---|
| `two_upper` | 2-digit string | `56` | If provided, must match `first_prize[-2:]`; otherwise derived automatically |
| `three_front` | Comma-separated 3-digit strings | `123,456` | Front 3-digit prizes |
| `three_back` | Comma-separated 3-digit strings | `789,012` | Back 3-digit prizes |

## Rules

- First row must be a header row with the column names above.
- Extra columns are ignored.
- `draw_date` must be a valid calendar date.
- `first_prize` must match `/^\d{6}$/`.
- `two_lower` must match `/^\d{2}$/`.
- If `two_upper` is provided, it must equal `first_prize.slice(-2)`.
- Duplicate `draw_date` values within a file are rejected (only the first occurrence is kept).
- Re-importing the same file is idempotent: rows whose `draw_date` already exists in the database are skipped silently.

## Example

```csv
draw_date,first_prize,two_lower,three_front,three_back
2024-01-16,512345,67,"123,456","789,012"
2024-02-01,098765,43,,
```
