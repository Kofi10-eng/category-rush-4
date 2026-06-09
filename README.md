# Category Rush

Multiplayer word game with mobile-first UI.

Rules included:
- Name, Animal, Place, Object categories
- Random letter per round
- RUSH button starts a 5-second countdown
- Unique valid answer = 10 points
- Duplicate valid answer = 5 points
- Typo of close valid answer = -1 point
- Invalid/blank answer = 0 points
- Objects must be physical things you can touch
- Multi-word objects such as `cat food` and `Nikon camera` can count if the final noun is a physical object
- Places must be geographical locations: cities, countries, continents, states, and official regions only
- Shops/businesses and broad areas like `East Africa` do not count
- Names are checked against a local name database; if the database misses a real name, players can challenge and vote
- Players can challenge/vote on answers after results

Run:
```bash
npm install
npm start
```

Open:
```text
http://localhost:3000
```
