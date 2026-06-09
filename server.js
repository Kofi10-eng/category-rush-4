const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
let Country, State, City;
try { ({ Country, State, City } = require('country-state-city')); } catch (e) { Country = State = City = null; }

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(l => !['Q','X','Z'].includes(l));
const CATEGORIES = ['name', 'animal', 'place', 'object'];
const RUSH_SECONDS = 5;
const ROUND_SECONDS = 90;

function list(words) { return new Set(words.split('|').map(w => w.trim().toLowerCase()).filter(Boolean)); }
function clean(value) { return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase(); }
function strip(value) { return clean(value).replace(/[^a-z0-9\s'-]/g, ''); }
function titleCase(value) { return String(value || '').trim().replace(/\w\S*/g, t => t[0].toUpperCase() + t.slice(1).toLowerCase()); }
function canonical(value) { return strip(value).replace(/\s+/g, ' '); }

const names = list(`
aaron|abdul|abena|abigail|adam|adele|adwoa|aisha|alex|alexander|alexandra|alice|amanda|ama|amelia|amina|andrew|angela|anthony|antonio|arthur|asma|barbara|benjamin|brian|caleb|camila|charles|charlotte|chloe|christian|christopher|daniel|david|diana|dorcas|edward|elijah|elizabeth|ella|emily|emma|emmanuel|esther|eva|felix|francis|frank|george|grace|hannah|harry|henry|isaac|isabella|jack|jacob|james|janet|jasmine|jerome|john|jonathan|joseph|joshua|julia|juliet|karen|kwame|kofi|kojo|kweku|kwesi|lawrence|leah|liam|lily|lucas|lucy|mabel|maria|mary|michael|michelle|mohammed|nathan|nicholas|oliver|olivia|patricia|paul|peter|philip|priscilla|rachael|rebecca|richard|robert|rose|sarah|samuel|sandra|sophia|stephen|susan|thomas|victoria|william|yaa|yaw|yvonne|zachary
`);

const animals = list(`
aardvark|albatross|alligator|alpaca|ant|anteater|antelope|ape|armadillo|baboon|badger|bat|bear|beaver|bee|beetle|bison|boar|buffalo|butterfly|camel|capybara|cat|caterpillar|cheetah|chicken|chimpanzee|cobra|cow|coyote|crab|crocodile|crow|deer|dog|dolphin|donkey|dove|dragonfly|duck|eagle|eel|elephant|falcon|ferret|fish|flamingo|fly|fox|frog|gazelle|gecko|giraffe|goat|goose|gorilla|grasshopper|hamster|hare|hawk|hedgehog|hippo|hippopotamus|horse|hyena|jaguar|jellyfish|kangaroo|koala|lemur|leopard|lion|lizard|llama|lobster|monkey|moose|mosquito|mouse|octopus|ostrich|otter|owl|panda|panther|parrot|peacock|penguin|pig|pigeon|polar bear|rabbit|raccoon|rat|raven|rhino|rhinoceros|salmon|scorpion|seahorse|seal|shark|sheep|skunk|sloth|snail|snake|sparrow|spider|squid|squirrel|swan|tiger|turkey|turtle|vulture|walrus|wasp|whale|wolf|wombat|zebra|gerbil|guinea pig|mole|marten|meerkat|mandrill|macaque|gibbon|orangutan|bonobo|wallaby|platypus|echidna|quokka|wolverine|weasel|stoat|mink|mongoose|porcupine|chipmunk|prairie dog|lynx|bobcat|ocelot|caracal|serval|tapir|okapi|warthog|meerkat|ibex|oryx|eland|gnu|wildebeest|impala|springbok|hartebeest|kudu|dik-dik|yak|zebu|musk ox|reindeer|caribou|gazelle|newt|salamander|toad|caiman|iguana|chameleon|skink|python|viper|adder|anaconda|boa|tarantula|termite|locust|cricket|moth|ladybird|ladybug|centipede|millipede|clam|oyster|mussel|shrimp|prawn|krill|starfish|sea urchin|sea cucumber|stingray|manta ray|marlin|cod|tuna|trout|herring|sardine|anchovy|swordfish|barracuda|pike|catfish|goldfish|guppy|koi|canary|finch|robin|seagull|pelican|stork|heron|crane|kingfisher|woodpecker|toucan|macaw|cockatoo|emu|kiwi|cassowary|quail|pheasant|partridge|hedgehog|shrew|vole|lemming
`);

const physicalObjects = list(`
accordion|adapter|air conditioner|air fryer|air mattress|air pump|airplane|alarm clock|album|anchor|anklet|antenna|anvil|apron|aquarium|arrow|ashtray|axe|backpack|badge|bag|ball|balloon|banana|bandage|banner|barbecue|barbell|barrel|baseball bat|basket|basketball|battery|bead|bed|bedsheet|bell|belt|bench|bicycle|bike|bin|binoculars|blanket|blender|block|board|boat|bolt|book|bookmark|boot|bottle|bowl|box|bracelet|brick|briefcase|broom|brush|bucket|button|cabinet|cable|calculator|calendar|camera|can|candle|canoe|cap|car|card|carpet|cart|case|cassette|cat food|chain|chair|chalk|charger|chessboard|chip|clock|cloth|coat|coin|comb|comic book|computer|console|container|controller|cooker|cooler|couch|crayon|cup|curtain|cushion|desk|diamond|diary|dice|dish|dishwasher|door|drawer|dress|drill|drone|drum|earphones|earring|envelope|eraser|fan|feather|file|filter|fish food|flashlight|flask|folder|football|fork|fridge|frying pan|gamepad|garment|glass|glove|glue|goggles|guitar|hairbrush|hammer|handbag|hanger|hat|helmet|hook|hose|ice cube|ink|iron|jacket|jar|jeans|joystick|jug|kettle|keyboard|key|keyring|kite|knife|ladder|lamp|lantern|laptop|lego brick|letter|lid|lighter|lightbulb|lock|magnet|mask|mat|matchstick|mattress|microphone|microscope|mirror|mop|motorbike|mouse|mug|nail|napkin|necklace|needle|newspaper|nikon camera|notebook|nut|oar|oil|oven|paint|paintbrush|pan|paper|paperclip|parachute|pen|pencil|phone|piano|picture|pillow|pin|pipe|plate|plug|pot|printer|purse|racket|radio|raincoat|remote|ring|rope|router|ruler|samsung phone|saw|scarf|scissors|screw|screwdriver|screen|seat|shirt|shoe|shoelace|shorts|shovel|sink|skateboard|skates|skirt|soap|socket|sofa|speaker|spoon|stapler|stick|sticker|stone|stool|string|suitcase|sunglasses|switch|table|tablet|tape|teapot|television|tennis racket|tent|thermometer|thread|ticket|tile|tissue|toaster|toothbrush|torch|towel|toy|train|tray|treehouse|trousers|trophy|tub|umbrella|uniform|vase|wallet|watch|wheel|whistle|window|wire|wrench|xbox controller|yarn|zip|zipper

abacus|adhesive|aerosol can|album cover|amplifier|ankle boot|armchair|armour|artwork|baby bottle|baking tray|bangle|banknote|bathrobe|beaker|beanie|bed frame|belt buckle|biscuit|blank disc|blouse|blue jeans|board game|body lotion|bookcase|boomerang|boots|bow|bow tie|bowl set|brace|brake|bread|breadboard|brooch|buckle|buggy|bulb|bunk bed|calculator|camcorder|camping stove|candy|canvas|car key|car seat|cardboard box|carriage|carrot|cash register|casserole dish|cd|ceiling fan|cellphone|cereal box|chainsaw|cheese|chisel|chocolate bar|clamp|clay pot|clip|clipboard|clutch bag|coffee mug|coffee table|coin purse|colander|combination lock|compact disc|compass|computer mouse|cooking oil|cooling fan|corkscrew|cot|cotton bud|credit card|cricket bat|crown|crutch|cucumber|cutlery|deodorant|detergent|diamond ring|dining table|door handle|doorbell|doormat|drinking glass|duvet|dvd|earbud|electric fan|extension lead|face mask|fidget spinner|fishing rod|flower pot|football boot|football shirt|fountain pen|freezer|golf club|grater|hair dryer|hair gel|hairpin|hand sanitiser|hard drive|headphones|highlighter|hoodie|ice cream|ink bottle|ink pen|jigsaw puzzle|juice bottle|jump rope|jumper|kitchen knife|knee pad|lab coat|lawn mower|leather belt|light switch|lip balm|luggage|lunchbox|makeup brush|memory card|metal spoon|milk bottle|mobile phone|monitor|motorcycle helmet|nail file|nail polish|neck tie|office chair|onion|orange|padlock|paint can|paper bag|paper towel|passport|pepper grinder|perfume bottle|photo frame|pizza box|plastic bag|plastic bottle|plastic cup|playing card|pocket watch|pool cue|popcorn|power bank|power cable|pressure cooker|projector|puzzle|qr code card|quilt|razor|rice cooker|roller skates|rubber band|safety pin|salad bowl|sandwich|satchel|school bag|seatbelt|sewing machine|shampoo bottle|shopping bag|sim card|sleeping bag|smart watch|soccer ball|socks|solar panel|spanner|spectacles|spray bottle|staple|steering wheel|sticky note|storage box|suit jacket|tablet pen|tea cup|tea towel|tennis ball|tin opener|toilet brush|toilet roll|toolbox|toothpaste|tracksuit|traffic cone|travel bag|tripod|tshirt|usb cable|usb stick|vacuum cleaner|video camera|violin|washing machine|water bottle|water gun|waterproof jacket|wheelchair|whiteboard|wine glass|wooden spoon|wristwatch|yoga mat
`);
const objectHeads = list(`food|camera|phone|controller|charger|bottle|bag|shoe|book|pen|pencil|laptop|computer|tablet|watch|ring|chair|table|cup|mug|plate|fork|spoon|knife|coat|jacket|hat|helmet|ball|toy|box|car|bike|bicycle|ink|kite|key|keyboard|kettle|lamp|paper|brush|pan|pot|jar|can|container|shirt|boot|glove|sock|scarf|blanket|pillow|towel|cable|wire|screen|monitor|speaker|microphone|guitar|drum|violin|racket|bat|stick|rod|wheel|card|coin|cash|bowl|dish|tray|case|folder|file|notebook|newspaper|magazine|soap|perfume|lotion|shampoo|detergent|oil|paint|glue|tape|string|yarn|thread|rope|tool|hammer|saw|drill|spanner|wrench|screwdriver|mower|cleaner|machine|printer|projector|router|remote|fan|clock|mirror|vase|wallet|purse|suitcase|luggage|backpack|basket|bucket|bin|trolley|cart|stroller|canoe|boat|skateboard|scooter|motorbike|train|airplane|drone|ticket|passport|badge|banner|sign|poster`);
const brands = list(`nikon|canon|sony|samsung|apple|dell|hp|lenovo|asus|acer|xbox|playstation|nintendo|lg|tesco|sainsburys|asda|aldi|lidl|nike|adidas|puma|gucci|lv|louis vuitton|tom ford|dior|ysl|valentino|jbl|bose|beats|logitech|dyson|shark|panasonic|philips|bosch|whirlpool|lego|barbie|hot wheels|fender|yamaha`);

const continents = list('africa|antarctica|asia|europe|north america|south america|australia|oceania');
const countries = list(`
afghanistan|albania|algeria|andorra|angola|argentina|armenia|australia|austria|azerbaijan|bahamas|bahrain|bangladesh|barbados|belarus|belgium|belize|benin|bhutan|bolivia|botswana|brazil|bulgaria|burkina faso|burundi|cambodia|cameroon|canada|chad|chile|china|colombia|congo|costa rica|croatia|cuba|cyprus|czech republic|denmark|djibouti|dominica|dominican republic|ecuador|egypt|england|eritrea|estonia|ethiopia|fiji|finland|france|gabon|gambia|georgia|germany|ghana|greece|grenada|guatemala|guinea|guyana|haiti|honduras|hungary|iceland|india|indonesia|iran|iraq|ireland|israel|italy|jamaica|japan|jordan|kazakhstan|kenya|kuwait|latvia|lebanon|liberia|libya|lithuania|luxembourg|madagascar|malawi|malaysia|mali|malta|mexico|moldova|monaco|mongolia|morocco|mozambique|namibia|nepal|netherlands|new zealand|nicaragua|niger|nigeria|north korea|norway|pakistan|panama|paraguay|peru|philippines|poland|portugal|qatar|romania|russia|rwanda|saudi arabia|scotland|senegal|serbia|singapore|slovakia|slovenia|somalia|south africa|south korea|spain|sri lanka|sudan|sweden|switzerland|syria|taiwan|tanzania|thailand|togo|tunisia|turkey|uganda|ukraine|united kingdom|uk|united states|usa|america|uruguay|venezuela|vietnam|wales|yemen|zambia|zimbabwe|ivory coast|cote divoire
`);
const cities = list(`
abuja|accra|addis ababa|amsterdam|athens|atlanta|barcelona|beijing|berlin|birmingham|bristol|brussels|cairo|cape town|cardiff|chicago|colchester|copenhagen|dakar|delhi|dubai|dublin|edinburgh|helsinki|hong kong|istanbul|jakarta|jerusalem|johannesburg|kampala|kumasi|lagos|lisbon|liverpool|london|los angeles|madrid|manchester|melbourne|miami|milan|montreal|moscow|mumbai|nairobi|new york|oslo|ottawa|paris|prague|rio de janeiro|rome|san francisco|seoul|shanghai|singapore|stockholm|sydney|tokyo|toronto|venice|vienna|warsaw|washington|zurich
`);
const regions = list(`
ashanti region|greater accra region|volta region|eastern region|western region|central region|northern region|california|texas|yorkshire|greater london|catalonia|bavaria|normandy|queensland|ontario|florida|new south wales|england|scotland|wales
`);
// Explicit banned place examples: broad macro-areas and shops are not allowed.
const bannedPlaces = list(`east africa|west africa|north africa|southern africa|sub-saharan africa|middle east|caribbean|latin america|scandinavia|balkans|southeast asia|south asia|east asia|tesco|asda|lidl|aldi|mcdonalds|kfc|shop|mall|supermarket`);

// Large offline place database, loaded from the country-state-city package when installed.
// It gives broad city/country/state coverage without accepting streets or shops.
if (Country && State && City) {
  for (const c of Country.getAllCountries()) {
    if (c.name) countries.add(c.name.toLowerCase());
    if (c.isoCode) countries.add(c.isoCode.toLowerCase());
  }
  for (const st of State.getAllStates()) {
    if (st.name) regions.add(st.name.toLowerCase());
  }
  for (const city of City.getAllCities()) {
    if (city.name && city.name.length > 1) cities.add(city.name.toLowerCase());
  }
}

function maybeAddPluralObjects() {
  const extra = [];
  for (const item of physicalObjects) {
    if (/^[a-z ]+$/.test(item) && !item.endsWith('s')) extra.push(item + 's');
  }
  for (const item of extra) physicalObjects.add(item);
}
maybeAddPluralObjects();


const rooms = new Map();
function roomCode() { let code; do code = Math.random().toString(36).slice(2, 6).toUpperCase(); while (rooms.has(code)); return code; }
function startsWithLetter(answer, letter) { return clean(answer).startsWith(letter.toLowerCase()); }

function levenshtein(a, b) {
  a = clean(a); b = clean(b);
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    const cost = a[i - 1] === b[j - 1] ? 0 : 1;
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
  }
  return dp[a.length][b.length];
}
function typoLimit(word) { const len = clean(word).replace(/\s/g, '').length; if (len < 4) return 0; if (len <= 7) return 1; return 2; }
function findCloseMatch(answer, sets, letter) {
  const a = canonical(answer); const limit = typoLimit(a); if (!limit) return null;
  let best = null;
  for (const set of sets) for (const word of set) {
    if (!word.startsWith(letter.toLowerCase())) continue;
    const d = levenshtein(a, word);
    if (d > 0 && d <= limit && (!best || d < best.distance)) best = { word, distance: d };
  }
  return best;
}

function objectLooksPhysicalPhrase(answer) {
  const a = canonical(answer);
  const parts = a.split(' ');
  if (physicalObjects.has(a)) return true;
  // Brand + physical head: Nikon camera, Samsung phone, Xbox controller.
  if (parts.length >= 2 && parts.length <= 3 && brands.has(parts[0]) && objectHeads.has(parts[parts.length - 1])) return true;
  // Animal/food owner + physical head: cat food, dog bowl, fish tank.
  if (parts.length >= 2 && parts.length <= 3 && (animals.has(parts[0]) || physicalObjects.has(parts[0])) && objectHeads.has(parts[parts.length - 1])) return true;
  // Adjective/material + physical head: red ball, plastic bottle, leather bag.
  const descriptors = list(`red|blue|green|black|white|yellow|pink|purple|orange|brown|grey|gray|gold|silver|metal|wooden|plastic|glass|paper|leather|cotton|wool|rubber|steel|iron|ceramic|digital|electric|wireless|portable|small|large|big|mini|smart|sports|school|office|kitchen|bathroom|garden|toy|baby`);
  if (parts.length >= 2 && parts.length <= 3 && descriptors.has(parts[0]) && objectHeads.has(parts[parts.length - 1])) return true;
  return false;
}

function validateAnswer(category, answer, letter) {
  const a = canonical(answer);
  if (!a) return { valid: false, typo: false, reason: 'Blank' };
  if (!startsWithLetter(a, letter)) return { valid: false, typo: false, reason: `Must start with ${letter}` };

  if (category === 'name') {
    if (names.has(a)) return { valid: true, typo: false, reason: 'Valid name' };
    const close = findCloseMatch(a, [names], letter);
    if (close) return { valid: false, typo: true, reason: `Typo: did you mean ${titleCase(close.word)}?`, correctWord: close.word };
    // Forbears-style guide: allow real-looking personal names, but mark as manual-checkable in disputes.
    if (/^[a-z][a-z'-]{1,28}$/.test(a)) return { valid: true, typo: false, reason: 'Likely name' };
    return { valid: false, typo: false, reason: 'Not a recognised name' };
  }

  if (category === 'animal') {
    if (animals.has(a)) return { valid: true, typo: false, reason: 'Valid animal' };
    const close = findCloseMatch(a, [animals], letter);
    if (close) return { valid: false, typo: true, reason: `Typo: did you mean ${titleCase(close.word)}?`, correctWord: close.word };
    return { valid: false, typo: false, reason: 'Not a recognised animal' };
  }

  if (category === 'place') {
    if (bannedPlaces.has(a)) return { valid: false, typo: false, reason: 'Not allowed: shops and broad macro-areas do not count' };
    if (cities.has(a) || countries.has(a) || continents.has(a) || regions.has(a)) return { valid: true, typo: false, reason: 'Valid geographical place' };
    const close = findCloseMatch(a, [cities, countries, continents, regions], letter);
    if (close) return { valid: false, typo: true, reason: `Typo: did you mean ${titleCase(close.word)}?`, correctWord: close.word };
    return { valid: false, typo: false, reason: 'Only cities, countries, states/provinces/regions and continents count — not streets or shops' };
  }

  if (category === 'object') {
    if (objectLooksPhysicalPhrase(a)) return { valid: true, typo: false, reason: 'Valid physical object' };
    const close = findCloseMatch(a, [physicalObjects], letter);
    if (close) return { valid: false, typo: true, reason: `Typo: did you mean ${titleCase(close.word)}?`, correctWord: close.word };
    return { valid: false, typo: false, reason: 'Must be a proper physical object you can touch' };
  }
  return { valid: false, typo: false, reason: 'Unknown category' };
}

function saveAnswers(room, socketId, answers) {
  room.answers[socketId] = {
    name: String(answers?.name || '').slice(0, 40),
    animal: String(answers?.animal || '').slice(0, 40),
    place: String(answers?.place || '').slice(0, 40),
    object: String(answers?.object || '').slice(0, 40)
  };
}

function scoreRound(room) {
  if (room.state === 'results' || room.state === 'ended') return;
  room.state = 'results'; room.roundEndsAt = null; clearTimeout(room.roundTimer); clearInterval(room.rushTimer);
  const answersByCategory = Object.fromEntries(CATEGORIES.map(c => [c, new Map()]));
  for (const [playerId, answers] of Object.entries(room.answers)) {
    for (const category of CATEGORIES) {
      const value = canonical(answers[category]); const check = validateAnswer(category, value, room.letter);
      if (!check.valid) continue;
      if (!answersByCategory[category].has(value)) answersByCategory[category].set(value, []);
      answersByCategory[category].get(value).push(playerId);
    }
  }
  room.roundNumber = (room.roundNumber || 0) + 1;
  const results = [];
  for (const player of room.players.values()) {
    const answers = room.answers[player.id] || {}; let roundScore = 0; const breakdown = {};
    for (const category of CATEGORIES) {
      const raw = answers[category] || ''; const value = canonical(raw); const check = validateAnswer(category, raw, room.letter);
      let points = 0; let status = check.reason;
      if (check.valid) { const count = answersByCategory[category].get(value)?.length || 0; points = count > 1 ? 5 : 10; status = count > 1 ? 'Duplicate valid answer' : 'Unique valid answer'; }
      else if (check.typo) { points = -1; status = check.reason; }
      roundScore += points;
      breakdown[category] = { answer: titleCase(raw), points, originalPoints: points, status, disputed: false, dispute: null };
    }
    player.score += roundScore;
    results.push({ id: player.id, name: player.name, roundScore, totalScore: player.score, breakdown });
  }
  room.results = results.sort((a,b) => b.roundScore - a.roundScore);
  room.disputes = [];
  emitRoom(room);
}

function recomputeTotalsFromResults(room) {
  const totals = new Map([...room.players.values()].map(p => [p.id, 0]));
  for (const round of room.history || []) for (const r of round.results) totals.set(r.id, (totals.get(r.id) || 0) + r.roundScore);
  for (const r of room.results || []) totals.set(r.id, (totals.get(r.id) || 0) + r.roundScore);
  for (const p of room.players.values()) p.score = totals.get(p.id) || 0;
  for (const r of room.results || []) r.totalScore = totals.get(r.id) || 0;
}

function publicRoom(room) {
  return { code: room.code, hostId: room.hostId, state: room.state, letter: room.letter, roundNumber: room.roundNumber || 0, usedLetters: room.usedLetters || [], remainingLetters: LETTERS.length - (room.usedLetters || []).length, rushBy: room.rushBy, rushRemaining: room.rushRemaining, roundEndsAt: room.roundEndsAt,
    players: [...room.players.values()].map(p => ({ id: p.id, name: p.name, score: p.score, isHost: p.id === room.hostId, submitted: !!room.answers[p.id] && CATEGORIES.every(c => clean(room.answers[p.id][c])) })),
    results: room.results, disputes: room.disputes || [], finalTable: room.finalTable || null };
}
function emitRoom(room) { io.to(room.code).emit('room:update', publicRoom(room)); }
function getRoom(code) { return rooms.get(String(code || '').trim().toUpperCase()); }
function nextUnusedLetter(room) {
  const used = new Set(room.usedLetters || []);
  const available = LETTERS.filter(letter => !used.has(letter));
  if (!available.length) return null;
  const letter = available[Math.floor(Math.random() * available.length)];
  room.usedLetters = [...used, letter];
  return letter;
}
function startRush(room, playerName) { if (room.state !== 'playing') return; room.state = 'rushing'; room.rushBy = playerName; room.rushRemaining = RUSH_SECONDS; clearInterval(room.rushTimer); room.rushTimer = setInterval(() => { room.rushRemaining -= 1; if (room.rushRemaining <= 0) scoreRound(room); else emitRoom(room); }, 1000); emitRoom(room); }

io.on('connection', (socket) => {
  socket.on('room:create', ({ name }, cb) => {
    const code = roomCode(); const room = { code, hostId: socket.id, players: new Map(), answers: {}, state: 'lobby', letter: null, results: [], disputes: [], history: [], roundNumber: 0, rushBy: null, rushRemaining: null, roundEndsAt: null, roundTimer: null, rushTimer: null, finalTable: null, usedLetters: [] };
    room.players.set(socket.id, { id: socket.id, name: String(name || 'Player').slice(0, 18), score: 0 }); rooms.set(code, room); socket.join(code); socket.data.roomCode = code; cb?.({ ok: true, code, playerId: socket.id }); emitRoom(room);
  });
  socket.on('room:join', ({ code, name }, cb) => {
    const room = getRoom(code); if (!room) return cb?.({ ok: false, error: 'Room not found' }); if (room.state === 'ended') return cb?.({ ok: false, error: 'Game has ended' });
    room.players.set(socket.id, { id: socket.id, name: String(name || 'Player').slice(0, 18), score: 0 }); socket.join(room.code); socket.data.roomCode = room.code; cb?.({ ok: true, code: room.code, playerId: socket.id }); emitRoom(room);
  });
  socket.on('round:start', (cb) => {
    const room = getRoom(socket.data.roomCode); if (!room) return cb?.({ ok: false, error: 'No room' }); if (room.hostId !== socket.id) return cb?.({ ok: false, error: 'Only host can start' });
    if (room.state === 'results' && room.results?.length) room.history.push({ roundNumber: room.roundNumber, letter: room.letter, results: room.results });
    clearTimeout(room.roundTimer); clearInterval(room.rushTimer); const nextLetter = nextUnusedLetter(room); if (!nextLetter) return cb?.({ ok: false, error: 'All letters have already been used. End the game or create a new room.' }); room.state = 'playing'; room.letter = nextLetter; room.answers = {}; room.results = []; room.disputes = []; room.rushBy = null; room.rushRemaining = null; room.roundEndsAt = Date.now() + ROUND_SECONDS * 1000; room.roundTimer = setTimeout(() => scoreRound(room), ROUND_SECONDS * 1000); cb?.({ ok: true, letter: nextLetter, usedLetters: room.usedLetters }); emitRoom(room);
  });
  socket.on('answer:submit', ({ answers }, cb) => { const room = getRoom(socket.data.roomCode); if (!room || !['playing','rushing'].includes(room.state)) return cb?.({ ok: false, error: 'Round not active' }); saveAnswers(room, socket.id, answers); cb?.({ ok: true }); emitRoom(room); });
  socket.on('rush:start', ({ answers } = {}, cb) => { const room = getRoom(socket.data.roomCode); if (!room || room.state !== 'playing') return cb?.({ ok: false, error: 'Rush unavailable' }); if (answers) saveAnswers(room, socket.id, answers); const a = room.answers[socket.id]; if (!a || CATEGORIES.some(c => !clean(a[c]))) return cb?.({ ok: false, error: 'Complete all 4 answers first' }); const player = room.players.get(socket.id); startRush(room, player?.name || 'Someone'); cb?.({ ok: true }); });

  socket.on('dispute:create', ({ playerId, category }, cb) => {
    const room = getRoom(socket.data.roomCode); if (!room || room.state !== 'results') return cb?.({ ok: false, error: 'You can only dispute after a round' });
    const result = room.results.find(r => r.id === playerId); if (!result || !CATEGORIES.includes(category)) return cb?.({ ok: false, error: 'Answer not found' });
    const key = `${playerId}:${category}`; if ((room.disputes || []).some(d => d.key === key)) return cb?.({ ok: false, error: 'Already disputed' });
    const challenger = room.players.get(socket.id)?.name || 'Someone';
    const dispute = { key, playerId, playerName: result.name, category, answer: result.breakdown[category].answer, currentPoints: result.breakdown[category].points, challengedBy: challenger, createdAt: Date.now(), yes: [], no: [], status: 'open' };
    result.breakdown[category].disputed = true; result.breakdown[category].dispute = dispute;
    room.disputes.push(dispute); cb?.({ ok: true }); emitRoom(room);
  });

  socket.on('dispute:vote', ({ key, vote }, cb) => {
    const room = getRoom(socket.data.roomCode); if (!room || room.state !== 'results') return cb?.({ ok: false, error: 'No active voting' });
    const d = (room.disputes || []).find(x => x.key === key); if (!d || d.status !== 'open') return cb?.({ ok: false, error: 'Vote closed' });
    d.yes = d.yes.filter(id => id !== socket.id); d.no = d.no.filter(id => id !== socket.id); (vote === 'yes' ? d.yes : d.no).push(socket.id);
    const needed = Math.max(1, Math.ceil(room.players.size / 2));
    if (d.yes.length >= needed || d.no.length >= needed) {
      d.status = 'closed'; d.passed = d.yes.length > d.no.length;
      const result = room.results.find(r => r.id === d.playerId); const item = result?.breakdown?.[d.category];
      if (result && item && d.passed) {
        const old = item.points; item.points = 10; item.status = 'Accepted by player vote'; result.roundScore += (10 - old); result.totalScore += (10 - old); room.players.get(result.id).score += (10 - old);
      }
    }
    cb?.({ ok: true }); emitRoom(room);
  });

  socket.on('game:end', (cb) => {
    const room = getRoom(socket.data.roomCode); if (!room) return cb?.({ ok: false, error: 'No room' }); if (room.hostId !== socket.id) return cb?.({ ok: false, error: 'Only host can end the game' });
    clearTimeout(room.roundTimer); clearInterval(room.rushTimer); if (room.state === 'results' && room.results?.length) room.history.push({ roundNumber: room.roundNumber, letter: room.letter, results: room.results });
    room.state = 'ended'; room.finalTable = [...room.players.values()].sort((a,b) => b.score - a.score).map((p, i) => ({ rank: i + 1, name: p.name, score: p.score })); cb?.({ ok: true }); emitRoom(room);
  });

  socket.on('disconnect', () => { const room = getRoom(socket.data.roomCode); if (!room) return; room.players.delete(socket.id); delete room.answers[socket.id]; if (room.hostId === socket.id) room.hostId = room.players.keys().next().value || null; if (room.players.size === 0) { clearTimeout(room.roundTimer); clearInterval(room.rushTimer); rooms.delete(room.code); } else emitRoom(room); });
});

server.listen(PORT, '0.0.0.0', () => console.log(`Category Rush running on http://localhost:${PORT}`));
