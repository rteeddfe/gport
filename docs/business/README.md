# Business processes (purchase flows)

The store sells several kinds of digital goods and services, and each kind is
a **separate business process** with its own inputs, fulfillment and failure
modes. They must not be merged into one universal purchase abstraction. In
particular **Steam Top Up ≠ Steam Gift**.

| Document | Process |
| --- | --- |
| [steam-topup.md](steam-topup.md) | Steam wallet top-up |
| [steam-gift.md](steam-gift.md) | Steam gift (gifting a game) |
| [games.md](games.md) | Game purchase (activation keys) |
| [game-currency.md](game-currency.md) | In-game currency top-up |
| [subscriptions.md](subscriptions.md) | Subscription services |

Every process is designed through the same pipeline, in this order:

```
Business requirements → Purchase flow → Domain model → Database model → API → Implementation
```

No document here contains invented business logic. Each one is filled in only
after the corresponding requirements have been described and confirmed.
Related confirmed principles that span processes (order price snapshot,
payment/acquiring webhook rules) live in [docs/database.md](../database.md),
[docs/api.md](../api.md) and [docs/architecture.md](../architecture.md).
