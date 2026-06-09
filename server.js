const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
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
function clean(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase(); }
function strip(value) { return clean(value).replace(/[^a-z0-9\s'-]/g, ''); }
function titleCase(value) { return String(value || '').trim().replace(/\w\S*/g, t => t[0].toUpperCase() + t.slice(1).toLowerCase()); }
function canonical(value) { return strip(value).replace(/\s+/g, ' '); }

function addWords(targetSet, values) {
  if (!values) return;
  if (Array.isArray(values)) values.forEach(v => addPlace(targetSet, v));
  else if (typeof values === 'string') values.split(/\r?\n|\|/).forEach(v => addPlace(targetSet, v));
}
function addRawWords(targetSet, values) {
  if (!values) return;
  if (Array.isArray(values)) values.forEach(v => { const x = canonical(v); if (x) targetSet.add(x); });
  else if (typeof values === 'string') values.split(/\r?\n|\|/).forEach(v => { const x = canonical(v); if (x) targetSet.add(x); });
}
function readJsonIfExists(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}
function loadPlainList(file, targetSet, mode = 'raw') {
  try {
    const text = fs.readFileSync(file, 'utf8');
    const add = mode === 'place' ? addWords : addRawWords;
    add(targetSet, text);
    console.log(`Loaded ${file}`);
  } catch {}
}
function loadGeoNamesDump(file, targetSets) {
  // Supports GeoNames allCountries.txt / cities*.txt format.
  // We only import populated places and administrative divisions, not streets, shops, buildings or landmarks.
  try {
    const text = fs.readFileSync(file, 'utf8');
    let added = 0;
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const cols = line.split('\t');
      const name = cols[1];
      const ascii = cols[2];
      const alternates = cols[3] || '';
      const featureClass = cols[6];
      const featureCode = cols[7];
      if (!name || !featureClass) continue;
      // P = populated place. A = country/state/province/region/admin division.
      if (featureClass === 'P') {
        addPlace(targetSets.cities, name); addPlace(targetSets.cities, ascii);
        for (const alt of alternates.split(',').slice(0, 25)) addPlace(targetSets.cities, alt);
        added++;
      } else if (featureClass === 'A' && /^ADM|PCL/.test(featureCode || '')) {
        const target = /^PCL/.test(featureCode || '') ? targetSets.countries : targetSets.regions;
        addPlace(target, name); addPlace(target, ascii);
        for (const alt of alternates.split(',').slice(0, 25)) addPlace(target, alt);
        added++;
      }
    }
    console.log(`Loaded GeoNames places from ${file}: ${added}`);
  } catch {}
}

function addPlace(set, value) {
  const v = canonical(value);
  if (!v || v.length < 2) return;
  set.add(v);
  const noParens = canonical(v.replace(/\([^)]*\)/g, ''));
  if (noParens && noParens !== v) set.add(noParens);
  const beforeComma = canonical(v.split(',')[0]);
  if (beforeComma && beforeComma.length >= 3) set.add(beforeComma);
  // Common city short-name forms: Frankfurt am Main -> Frankfurt, Newcastle upon Tyne -> Newcastle.
  const short = canonical(v.split(/\s+(am|upon|on|by|under|sur|del|de|da|do|du|la|le|el)\s+/i)[0]);
  if (short && short.length >= 4) set.add(short);
}


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


// Extra seeded databases. These are intentionally broad, and the app also supports
// adding even larger local files in /data without changing code.
addRawWords(names, `aaliyah|abbas|abdullah|abe|abraham|ada|adams|ade|adebayo|adeola|adesua|adelaide|adeline|adrian|agatha|agnes|ahmed|akosua|akua|alan|albert|alberta|aldo|alejandro|alfred|ali|alicia|aline|alison|allan|alonso|alvin|alyssa|amara|amber|ameen|amir|anastasia|anderson|andre|andrea|angel|angelina|anita|ann|anna|anne|annie|ansah|anton|april|araba|archie|ariana|ariel|arnold|ashley|asiedu|asmaa|augustine|ava|avery|ayan|ayesha|bailey|balogun|becky|bella|bernard|bernice|bertie|beth|betty|beverly|blessing|brandon|brenda|bridget|brittany|brooke|bryan|caitlin|cameron|carla|carl|caroline|carolyn|casey|cassandra|catherine|cecilia|celine|chelsea|cheryl|chidera|chinedu|chloe|chris|christina|claire|clara|claudia|clement|clifford|cynthia|daisy|damian|danielle|danny|daphne|darren|deborah|dennis|desmond|doris|douglas|dylan|edem|edgar|edith|edmund|edna|edwin|eileen|elaine|eleanor|elena|eli|eliana|elise|ella|ellen|elliot|elsie|elvis|enoch|eric|erica|erin|ernest|ethel|eugene|eunice|eva|eve|ezra|faith|fatima|fiona|florence|fred|frederick|gabriel|gabriella|gareth|gary|geoffrey|georgia|gerald|geraldine|gideon|gilbert|gloria|godwin|gordon|graham|gregory|hadassah|hafsa|harriet|hazel|helen|helena|herbert|hillary|howard|hussein|ian|ibrahim|idris|ike|imogen|irene|isaiah|ismael|ivan|ivy|jackie|jade|jamal|jared|jasper|jean|jeffrey|jennifer|jenny|jessica|joanna|joanne|joel|joey|joy|joyce|judith|judy|justin|kafui|kamal|kate|katherine|kathryn|keith|kelly|kenneth|kevin|kim|kimberly|kingsley|kobina|kobby|koku|korkor|kristen|kristin|kwaku|kyle|larry|laura|lauren|lawson|leila|lena|leo|leon|leonard|leslie|levi|linda|lindsay|lisa|lois|lorraine|louise|luke|lydia|malcolm|marcus|margaret|margot|marian|marie|marilyn|mark|martha|martin|matilda|maureen|max|maxwell|melissa|mercy|miriam|mohamed|mohammad|mohammed|morgan|musa|nadia|naomi|natalie|nathaniel|neil|nelson|nigel|nina|noah|nora|norman|oscar|owen|pamela|patrick|paula|pauline|pearl|precious|quentin|quincy|ralph|raymond|regina|renee|rita|ronald|ruth|sabrina|sally|samantha|sampson|sebastian|selina|serena|seth|sharon|sheila|simon|solomon|stella|stephanie|steven|sylvia|teresa|terry|theodore|theresa|timothy|tina|toby|tony|tracy|vanessa|vera|veronica|vincent|vivian|walter|wendy|wilfred|winston|xavier|yasmine|yusif|yusuf|zara|zoe`);
addRawWords(physicalObjects, `airpods|apple watch|baby food|bagel|basketball hoop|binder|bird cage|biro|blazer|bluetooth speaker|bread knife|bus ticket|camera lens|candle holder|canvas bag|car charger|car tyre|cell phone|cereal|charging cable|chewing gum|chopping board|clothes hanger|coffee beans|contact lens|cooking pot|cushion cover|desk lamp|digital camera|door key|duffel bag|electric guitar|energy drink|exercise bike|face cream|football boots|gaming chair|gaming mouse|garden hose|gift card|glass bottle|glue stick|goalpost|hair clip|hand cream|hand towel|hooded jacket|ink cartridge|inkpot|iron board|kitchen towel|kite string|laptop charger|laundry basket|lemonade bottle|marker pen|measuring cup|memory stick|micro sd card|milk carton|mouse pad|neck pillow|nikon lens|paint roller|phone case|phone charger|plastic fork|remote control|ring binder|running shoes|school tie|shopping trolley|shower gel|sim tray|sketchbook|soccer boot|soup bowl|sports bag|suit trousers|sweatshirt|table lamp|tea bag|tennis shoe|toothpaste tube|train ticket|tv remote|water glass|whiteboard marker|wireless mouse|wool hat`);
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

const streetOrBusinessWords = list(`street|road|avenue|lane|drive|close|way|boulevard|high street|shopping centre|shopping center|mall|shop|store|restaurant|hotel|airport|terminal|station|market|stadium|school|university|church|mosque|temple|hospital|park|square|bridge|museum|tower|building|campus|branch`);
const placeAliases = list(`frankfurt|frankfurt am main|gabasawa|newcastle|newcastle upon tyne|washington dc|washington d c|los angeles|new york|mexico city|sao paulo|rio de janeiro|cape town|hong kong|abu dhabi|addis ababa|buenos aires|dar es salaam|kuala lumpur|san francisco|st petersburg|saint petersburg|ho chi minh city|phnom penh|tel aviv|la paz|port of spain|port au prince|port harcourt|kumasi|accra|colchester|london|manchester|birmingham`);
for (const p of placeAliases) cities.add(p);


// Large offline place database, loaded from the country-state-city package when installed.
// It gives broad city/country/state coverage without accepting streets or shops.
if (Country && State && City) {
  console.log('Loading country-state-city offline geo database...');
  for (const c of Country.getAllCountries()) {
    addPlace(countries, c.name);
    if (c.isoCode) countries.add(c.isoCode.toLowerCase());
  }
  for (const st of State.getAllStates()) addPlace(regions, st.name);
  for (const city of City.getAllCities()) addPlace(cities, city.name);
}

// Optional local mega-database support. Add GeoNames files into /data/geonames/
// and restart the server; the game will import cities, countries, states, provinces and regions.
const dataDir = path.join(__dirname, 'data');
const customPlaces = readJsonIfExists(path.join(dataDir, 'places.json'));
if (customPlaces) { addWords(cities, customPlaces.cities); addWords(regions, customPlaces.regions); addWords(countries, customPlaces.countries); }
const customNames = readJsonIfExists(path.join(dataDir, 'names.json'));
if (customNames) { addRawWords(names, customNames.firstNames); addRawWords(names, customNames.surnames); addRawWords(names, customNames.names); }
const customObjects = readJsonIfExists(path.join(dataDir, 'objects.json'));
if (customObjects) { addRawWords(physicalObjects, customObjects.objects || customObjects); }
loadPlainList(path.join(dataDir, 'names.txt'), names);
loadPlainList(path.join(dataDir, 'objects.txt'), physicalObjects);
loadPlainList(path.join(dataDir, 'animals.txt'), animals);
loadGeoNamesDump(path.join(dataDir, 'geonames', 'allCountries.txt'), { cities, regions, countries });
loadGeoNamesDump(path.join(dataDir, 'geonames', 'cities500.txt'), { cities, regions, countries });
console.log(`Validation DB loaded: ${cities.size} cities/place names, ${regions.size} regions/states, ${countries.size} countries, ${names.size} names, ${physicalObjects.size} objects.`);

function looksLikeGeographicalPlace(answer) {
  const a = canonical(answer);
  if (!a || a.length < 3 || a.length > 45) return false;
  if (!/^[a-z][a-z '-]*$/.test(a)) return false;
  if (bannedPlaces.has(a)) return false;
  const words = a.split(' ');
  if (words.length > 4) return false;
  // Keep streets, shops, businesses and landmarks out. Cities/regions only.
  for (const w of streetOrBusinessWords) {
    if (a === w || a.endsWith(' ' + w) || a.includes(w + ' ')) return false;
  }
  // Do not allow vague macro-area phrases like East Africa, West Asia, etc.
  if (/^(north|south|east|west|central|northern|southern|eastern|western)\s+(africa|asia|europe|america|americas)$/.test(a)) return false;
  // Relaxed city/region fallback: allows real-but-missing GeoNames/country-state-city entries like Gabasawa.
  // It still blocks streets/shops through the filters above.
  return true;
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

function singulariseObjectWord(a) {
  if (physicalObjects.has(a)) return a;
  if (a.endsWith('ies') && physicalObjects.has(a.slice(0, -3) + 'y')) return a.slice(0, -3) + 'y';
  if (a.endsWith('es') && physicalObjects.has(a.slice(0, -2))) return a.slice(0, -2);
  if (a.endsWith('s') && physicalObjects.has(a.slice(0, -1))) return a.slice(0, -1);
  return null;
}
function objectLooksPhysicalPhrase(answer) {
  const a = canonical(answer);
  const parts = a.split(' ');
  if (singulariseObjectWord(a)) return true;
  // Brand + physical head: Nikon camera, Samsung phone, Xbox controller.
  if (parts.length >= 2 && parts.length <= 4 && brands.has(parts[0]) && (objectHeads.has(parts[parts.length - 1]) || physicalObjects.has(parts[parts.length - 1]))) return true;
  // Animal/food owner + physical head: cat food, dog bowl, fish tank.
  if (parts.length >= 2 && parts.length <= 4 && (animals.has(parts[0]) || physicalObjects.has(parts[0])) && (objectHeads.has(parts[parts.length - 1]) || physicalObjects.has(parts[parts.length - 1]))) return true;
  // Adjective/material + physical head: red ball, plastic bottle, leather bag.
  const descriptors = list(`red|blue|green|black|white|yellow|pink|purple|orange|brown|grey|gray|gold|silver|metal|wooden|plastic|glass|paper|leather|cotton|wool|rubber|steel|iron|ceramic|digital|electric|wireless|portable|small|large|big|mini|smart|sports|school|office|kitchen|bathroom|garden|toy|baby|cleaning|cooking|gaming|football|phone|laptop`);
  if (parts.length >= 2 && parts.length <= 4 && descriptors.has(parts[0]) && (objectHeads.has(parts[parts.length - 1]) || physicalObjects.has(parts[parts.length - 1]))) return true;
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
    if (looksLikeGeographicalPlace(a)) return { valid: true, typo: false, reason: 'Accepted as a likely city/state/province/region' };
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
  const validationCache = new Map();
  const getCheck = (category, raw) => {
    const key = `${category}:${canonical(raw)}`;
    if (!validationCache.has(key)) validationCache.set(key, validateAnswer(category, raw, room.letter));
    return validationCache.get(key);
  };
  const intendedKey = (category, raw, check) => {
    if (check.valid) return canonical(raw);
    if (check.typo && check.correctWord) return canonical(check.correctWord);
    return null;
  };

  // Count valid answers and close misspellings together so typo points are based on
  // what the player would have scored if they had spelt it correctly.
  for (const [playerId, answers] of Object.entries(room.answers)) {
    for (const category of CATEGORIES) {
      const raw = answers[category];
      const check = getCheck(category, raw);
      const key = intendedKey(category, raw, check);
      if (!key) continue;
      if (!answersByCategory[category].has(key)) answersByCategory[category].set(key, []);
      answersByCategory[category].get(key).push(playerId);
    }
  }

  room.roundNumber = (room.roundNumber || 0) + 1;
  const results = [];
  for (const player of room.players.values()) {
    const answers = room.answers[player.id] || {}; let roundScore = 0; const breakdown = {};
    for (const category of CATEGORIES) {
      const raw = answers[category] || ''; const check = getCheck(category, raw);
      const key = intendedKey(category, raw, check);
      const count = key ? (answersByCategory[category].get(key)?.length || 0) : 0;
      const basePoints = count > 1 ? 5 : 10;
      let points = 0; let status = check.reason;
      if (check.valid) { points = basePoints; status = count > 1 ? 'Duplicate valid answer' : 'Unique valid answer'; }
      else if (check.typo) { points = basePoints - 1; status = `${check.reason} · spelling penalty -1`; }
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
    const dispute = { key, playerId, playerName: result.name, category, answer: result.breakdown[category].answer, currentPoints: result.breakdown[category].points, challengedBy: challenger, challengedById: socket.id, createdAt: Date.now(), yes: [], no: [], status: 'open' };
    result.breakdown[category].disputed = true; result.breakdown[category].dispute = dispute;
    room.disputes.push(dispute); cb?.({ ok: true }); emitRoom(room);
  });

  socket.on('dispute:vote', ({ key, vote }, cb) => {
    const room = getRoom(socket.data.roomCode); if (!room || room.state !== 'results') return cb?.({ ok: false, error: 'No active voting' });
    const d = (room.disputes || []).find(x => x.key === key); if (!d || d.status !== 'open') return cb?.({ ok: false, error: 'Vote closed' });
    if (d.challengedById === socket.id) return cb?.({ ok: false, error: 'You created this challenge, so you cannot vote on it' });
    d.yes = d.yes.filter(id => id !== socket.id); d.no = d.no.filter(id => id !== socket.id); (vote === 'yes' ? d.yes : d.no).push(socket.id);
    const eligibleVoters = Math.max(1, room.players.size - 1);
    const needed = Math.max(1, Math.ceil(eligibleVoters / 2));
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
