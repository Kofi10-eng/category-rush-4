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

## Latest validation update

This build uses `country-state-city` for a very large offline list of countries, states/provinces and cities, then adds relaxed city/region validation so real places such as Frankfurt and Gabasawa are not rejected just because a dataset uses a longer official name. It still blocks shops, streets, airports, schools, stadiums and other non-geographical locations.

GeoNames is the largest public place database direction for a future production build, but the full allCountries dump is too large to bundle directly in this small ZIP. This version is designed to be deployable on Render without a huge data file.

Rules updated:
- The challenge creator cannot vote on their own challenge.
- Typo scoring is now: points the answer would have received if spelt correctly, minus 1. So a unique typo scores 9, a duplicate typo scores 4.
- A letter cannot repeat in the same game.


## Validation database upgrade

This build uses a legal offline approach:

- `country-state-city` for broad worldwide countries, states/provinces/regions and cities.
- Built-in seeded lists for names, animals and physical objects.
- Optional import files in `/data` for even bigger databases.
- GeoNames dump support: put `allCountries.txt` or `cities500.txt` inside `data/geonames/` and restart.

Google Maps data is not copied into the project because Google Maps data is licensed for live API use, not cloning into a local game database. The legal big-database option is GeoNames/OpenStreetMap-style downloadable data.

Rules added:

- Browser autofill/autocorrect/autosuggest are disabled on answer inputs.
- The player who creates a dispute cannot vote in that dispute.
- Typo scoring is normal score minus 1: unique typo = 9, duplicate typo = 4.
- Place validation is relaxed enough for short city names like Frankfurt, while blocking streets, shops, airports, stadiums and similar non-valid places.


## Super object database update
This version includes a much larger local object database in `data/objects.txt`, loads `data/animals.txt`, accepts common brand/object phrases like `Nikon camera`, and handles plurals such as `kites`, `pens`, and `bottles`. To expand further, add one physical object per line to `data/objects.txt` and restart the server.
