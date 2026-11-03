/** Permitted food storage regimes used to determine safe holding hours. */
export type HoldingCondition =
  | 'hot-held'
  | 'refrigerated'
  | 'room-temperature'
  | 'packaged-sealed';

/** Dietary classification tag applied to surplus food items. */
export type DietType = 'veg' | 'non-veg';

/** Lifecycle states a surplus food listing transitions through. */
export type ListingStatus =
  | 'POSTED'
  | 'ACCEPTED'
  | 'COLLECTED'
  | 'DELIVERED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'INELIGIBLE';

/** Logistics states tracked for an assigned NGO pickup record. */
export type PickupStatus = 'ACCEPTED' | 'COLLECTED' | 'DELIVERED' | 'EXPIRED' | 'CANCELLED';

/** Geographic coordinates and human-readable venue address. */
export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
}

/** Individual surplus food dish included in a listing manifest. */
export interface FoodItem {
  name: string;
  dietType: DietType;
  category: string;
}

/** Outcome of safety window and lead-time validation for a listing. */
export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  safeDeadline: string | null;
}

/** Food donor entity such as a caterer, banquet hall, or campus kitchen. */
export interface Organizer {
  _id: string;
  name: string;
  type: string;
  phone: string;
  location: GeoLocation;
}

export interface Ngo {
  _id: string;
  name: string;
  location: GeoLocation;
  dailyCapacityMeals: number;
  remainingCapacityMeals: number;
  acceptsVeg: boolean;
  acceptsNonVeg: boolean;
  availableFrom: string;
  availableTo: string;
  hasVehicle: boolean;
  active: boolean;
}

export interface Listing {
  _id: string;
  organizerId: string;
  eventName: string;
  eventType: string;
  location: GeoLocation;
  foodItems: FoodItem[];
  quantityMeals: number;
  quantityKg?: number;
  preparedAt: string;
  holdingCondition: HoldingCondition;
  packagingAvailable: boolean;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  notes?: string;
  safeDeadline: string | null;
  status: ListingStatus;
  eligibility: {
    eligible: boolean;
    reasons: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface Pickup {
  _id: string;
  listingId: string;
  ngoId: string;
  volunteerName?: string;
  status: PickupStatus;
  acceptedAt: string;
  collectedAt?: string;
  deliveredAt?: string;
  deliveredMeals?: number;
  deliveredKg?: number;
  goodCondition?: boolean;
}

export interface PopulatedPickup extends Omit<Pickup, 'listingId' | 'ngoId'> {
  listingId: Listing | null;
  ngoId: Ngo | null;
}

export interface DemoNotification {
  _id: string;
  recipientType: 'organizer' | 'ngo';
  recipientId: string;
  listingId?: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface MatchResult {
  ngoId: string;
  ngo: Ngo;
  feasible: boolean;
  matchType: 'Full match' | 'Partial' | 'Excluded';
  score: number;
  distanceKm: number;
  etaMinutes: number;
  reasons: string[];
  margin: number;
}

export interface DemoConfig {
  maxHoldHours: Record<HoldingCondition, number>;
  minLeadMinutes: number;
  avgSpeedKmh: number;
  bufferMinutes: number;
  weights: { timeMargin: number; distance: number; capacityFit: number };
  urgencyMinutes: { high: number; medium: number };
  co2Factor: number;
  co2Assumption: string;
}

interface DemoStore {
  version: number;
  seededAt: number;
  dirty: boolean;
  seq: number;
  organizers: Organizer[];
  ngos: Ngo[];
  listings: Listing[];
  pickups: Pickup[];
  notifications: DemoNotification[];
}

const STORAGE_KEY = 'foodbridge_demo_store_v1';
const STORE_VERSION = 1;

export const demoConfig: DemoConfig = {
  // DEMO ONLY: not food-safety guidance. Real thresholds must follow FSSAI/local rules.
  maxHoldHours: {
    'hot-held': 4,
    refrigerated: 8,
    'room-temperature': 2,
    'packaged-sealed': 6
  },
  minLeadMinutes: 30,
  avgSpeedKmh: 20,
  bufferMinutes: 8,
  weights: { timeMargin: 0.4, distance: 0.35, capacityFit: 0.25 },
  urgencyMinutes: { high: 60, medium: 180 },
  co2Factor: 2.5,
  co2Assumption: 'Illustrative demo assumption, not a measured emissions assessment.'
};

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (n: number) => (n * Math.PI) / 180;
  const dlat = rad(b.lat - a.lat);
  const dlng = rad(b.lng - a.lng);
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dlng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function estimateTravel(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  cfg: DemoConfig = demoConfig
) {
  const distanceKm = haversineKm(from, to);
  const etaMinutes = Math.ceil((distanceKm / cfg.avgSpeedKmh) * 60 + cfg.bufferMinutes);
  return { distanceKm, etaMinutes };
}

export function eligibility(
  listing: {
    eventName?: string;
    location?: GeoLocation;
    foodItems?: FoodItem[];
    quantityMeals: number;
    preparedAt: string;
    holdingCondition: HoldingCondition;
    pickupWindowStart: string;
    pickupWindowEnd: string;
  },
  now: Date = new Date(),
  cfg: DemoConfig = demoConfig
): EligibilityResult {
  const reasons: string[] = [];
  const prepared = +new Date(listing.preparedAt);
  const end = +new Date(listing.pickupWindowEnd);
  const start = +new Date(listing.pickupWindowStart);
  const hold = cfg.maxHoldHours[listing.holdingCondition];

  if (
    !listing.eventName ||
    !listing.location ||
    !listing.foodItems?.length ||
    !Number.isFinite(prepared) ||
    !Number.isFinite(end) ||
    !Number.isFinite(start) ||
    !hold
  ) {
    reasons.push('Required listing fields are missing or invalid.');
  }
  if (!(listing.quantityMeals > 0)) {
    reasons.push('Quantity must be greater than zero.');
  }
  if (prepared > +now) {
    reasons.push('Preparation time cannot be in the future.');
  }
  if (start >= end) {
    reasons.push('Pickup window must end after it starts.');
  }

  const deadline = Math.min(end, prepared + hold * 3600000);
  if (deadline <= +now) {
    reasons.push('Safe collection deadline has expired.');
  } else if (deadline - +now < cfg.minLeadMinutes * 60000) {
    reasons.push(`At least ${cfg.minLeadMinutes} minutes of lead time is required.`);
  }

  return {
    eligible: reasons.length === 0,
    reasons: reasons.length
      ? reasons
      : ['Within the configured holding limit.', 'Sufficient collection lead time.'],
    safeDeadline: Number.isFinite(deadline) ? new Date(deadline).toISOString() : null
  };
}

function delhiMinutes(date: number): number {
  const d = new Date(date + 330 * 60000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function timeMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function availableAt(ngo: Ngo, dateMs: number): boolean {
  const t = delhiMinutes(dateMs);
  const a = timeMinutes(ngo.availableFrom);
  const b = timeMinutes(ngo.availableTo);
  return a <= b ? t >= a && t <= b : t >= a || t <= b;
}

export function match(
  listing: Listing,
  ngos: Ngo[],
  now: Date = new Date(),
  cfg: DemoConfig = demoConfig
): MatchResult[] {
  const safety = eligibility(listing, now, cfg);
  const deadline = safety.safeDeadline ? +new Date(safety.safeDeadline) : 0;

  const results: MatchResult[] = ngos.map(ngo => {
    const { distanceKm, etaMinutes } = estimateTravel(listing.location, ngo.location, cfg);
    const arrival = Math.max(+now + etaMinutes * 60000, +new Date(listing.pickupWindowStart));
    const reasons: string[] = [];

    if (!safety.eligible) reasons.push('Excluded: listing is not safety-eligible.');
    if (!ngo.active) reasons.push('Excluded: NGO is inactive.');
    if (!availableAt(ngo, arrival)) reasons.push('Excluded: outside NGO availability hours.');
    if (
      listing.foodItems.some(f =>
        f.dietType === 'non-veg' ? !ngo.acceptsNonVeg : !ngo.acceptsVeg
      )
    ) {
      reasons.push('Excluded: diet mismatch.');
    }
    if (arrival > deadline) reasons.push('Excluded: cannot arrive before deadline.');
    if (ngo.remainingCapacityMeals <= 0) reasons.push('Excluded: no remaining capacity.');

    const feasible = reasons.length === 0;
    const full = ngo.remainingCapacityMeals >= listing.quantityMeals;

    if (feasible) {
      reasons.push(
        `Arrives ${Math.floor((deadline - arrival) / 60000)} min before deadline`,
        full
          ? `Capacity ${ngo.remainingCapacityMeals} ≥ ${listing.quantityMeals} needed`
          : `Partial — can accept ${ngo.remainingCapacityMeals} of ${listing.quantityMeals} meals. Split pickups are out of scope.`
      );
    }

    return {
      ngoId: String(ngo._id),
      ngo,
      feasible,
      matchType: !feasible ? 'Excluded' : full ? 'Full match' : 'Partial',
      score: 0,
      distanceKm,
      etaMinutes,
      reasons,
      margin: Math.max(0, deadline - arrival)
    };
  });

  const fullMatches = results.filter(r => r.feasible && r.matchType === 'Full match');
  const maxDistance = Math.max(...fullMatches.map(r => r.distanceKm), 1);
  const maxMargin = Math.max(deadline - +now, 1);

  for (const r of fullMatches) {
    r.score = Math.round(
      100 *
        (cfg.weights.timeMargin * Math.min(1, r.margin / maxMargin) +
          cfg.weights.distance * (1 - r.distanceKm / maxDistance) +
          (cfg.weights.capacityFit * listing.quantityMeals) / r.ngo.remainingCapacityMeals)
    );
  }

  const tier = (r: MatchResult) => (!r.feasible ? 2 : r.matchType === 'Full match' ? 0 : 1);
  return results.sort(
    (a, b) =>
      tier(a) - tier(b) ||
      b.score - a.score ||
      a.distanceKm - b.distanceKm ||
      a.ngoId.localeCompare(b.ngoId)
  );
}

export function urgency(
  deadline: string | null,
  now: Date = new Date(),
  cfg: DemoConfig = demoConfig
): 'High' | 'Medium' | 'Low' {
  if (!deadline) return 'Low';
  const minutes = (+new Date(deadline) - +now) / 60000;
  return minutes < cfg.urgencyMinutes.high
    ? 'High'
    : minutes < cfg.urgencyMinutes.medium
      ? 'Medium'
      : 'Low';
}

function makeId(prefix: string, seq: number): string {
  return `${prefix}${seq.toString(16).padStart(24 - prefix.length, '0')}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createSeedStore(): DemoStore {
  const now = Date.now();
  const at = (minutes: number) => new Date(now + minutes * 60000).toISOString();
  const venueLocation: GeoLocation = {
    lat: 28.592,
    lng: 77.046,
    address: 'Sample event venue, Dwarka, New Delhi'
  };

  let seq = 1;
  const nextId = (prefix: string) => makeId(prefix, seq++);

  const organizer: Organizer = {
    _id: nextId('aa00'),
    name: 'Sample Wedding Caterer',
    type: 'wedding caterer',
    phone: 'Demo account',
    location: venueLocation
  };

  const ngoNames = [
    'Community Kitchen',
    'Seva Kitchen',
    'Hope Shelter',
    'Meal Collective',
    'Community Table',
    'Neighbourhood Pantry',
    'Care Kitchen'
  ];
  const latOffsets = [0.017986, 0.008993, 0.06745, 0.025, -0.028, 0.04, -0.055];
  const capacities = [50, 10, 100, 80, 60, 120, 35];

  const ngos: Ngo[] = ngoNames.map((name, i) => ({
    _id: nextId('bb00'),
    name: `NGO ${String.fromCharCode(65 + i)} – ${name}`,
    location: {
      lat: venueLocation.lat + latOffsets[i],
      lng: venueLocation.lng,
      address: `Mock Delhi location ${String.fromCharCode(65 + i)}`
    },
    dailyCapacityMeals: capacities[i],
    remainingCapacityMeals: capacities[i],
    acceptsVeg: true,
    acceptsNonVeg: i % 2 === 0,
    availableFrom: i === 2 ? '02:00' : '00:00',
    availableTo: i === 2 ? '02:01' : '23:59',
    hasVehicle: i !== 5,
    active: i !== 6
  }));

  const listings: Listing[] = [];
  const pickups: Pickup[] = [];
  const notifications: DemoNotification[] = [];

  function addListing(
    eventName: string,
    quantityMeals: number,
    extra: Partial<Listing> = {},
    createdOffsetMin = -5
  ): Listing {
    const base = {
      organizerId: organizer._id,
      eventName,
      eventType: 'Wedding',
      location: venueLocation,
      foodItems: [
        {
          name: 'Veg pulao, dal makhani, paneer butter masala, roti',
          dietType: 'veg' as DietType,
          category: 'Prepared meal'
        }
      ],
      quantityMeals,
      quantityKg: 18,
      preparedAt: at(-60),
      holdingCondition: 'hot-held' as HoldingCondition,
      packagingAvailable: true,
      pickupWindowStart: at(-15),
      pickupWindowEnd: at(120),
      notes: 'Packed in sealed containers',
      ...extra
    };
    const e = eligibility(base);
    const createdAt = extra.createdAt ?? at(createdOffsetMin);
    const listing: Listing = {
      ...base,
      _id: nextId('cc00'),
      safeDeadline: e.safeDeadline,
      eligibility: { eligible: e.eligible, reasons: e.reasons },
      status: extra.status ?? (e.eligible ? 'POSTED' : 'INELIGIBLE'),
      createdAt,
      updatedAt: createdAt
    };
    listings.push(listing);
    return listing;
  }

  const wedding = addListing('Sample Wedding Reception', 40, {}, -2);
  const sangeet = addListing(
    'Sangeet Night · Banquet hall',
    60,
    { pickupWindowEnd: at(50), quantityKg: 26, eventType: 'Banquet' },
    -4
  );
  const concert = addListing(
    'Concert Food Stall',
    30,
    { holdingCondition: 'packaged-sealed', pickupWindowEnd: at(240), quantityKg: 12, eventType: 'Concert' },
    -8
  );
  addListing(
    'Birthday Dinner',
    15,
    { preparedAt: at(-360), pickupWindowEnd: at(-60), eventType: 'Other' },
    -15
  );

  const active = addListing(
    'Corporate Lunch – Hall B',
    25,
    { status: 'ACCEPTED', quantityKg: 10, eventType: 'Other' },
    -20
  );
  pickups.push({
    _id: nextId('dd00'),
    listingId: active._id,
    ngoId: ngos[3]._id,
    volunteerName: 'Rahul Sharma',
    status: 'ACCEPTED',
    acceptedAt: at(-10)
  });
  ngos[3].remainingCapacityMeals -= 25;

  const historical: Array<[number, string, number, number, string]> = [
    [0, 'Office Event', 35, 15, 'Priya Verma'],
    [1, 'Community Bhandara', 40, 18, 'Amit Nair']
  ];
  for (const [index, title, meals, kg, volunteerName] of historical) {
    const baseMin = -1440 * (index + 1);
    const item = addListing(
      title,
      meals,
      {
        status: 'DELIVERED',
        eventType: index === 0 ? 'Other' : 'Bhandara',
        preparedAt: at(baseMin - 60),
        pickupWindowStart: at(baseMin),
        pickupWindowEnd: at(baseMin + 120),
        quantityKg: kg,
        createdAt: at(baseMin - 5)
      },
      baseMin - 5
    );
    pickups.push({
      _id: nextId('dd00'),
      listingId: item._id,
      ngoId: ngos[index === 0 ? 0 : 4]._id,
      volunteerName,
      status: 'DELIVERED',
      acceptedAt: at(baseMin + 10),
      collectedAt: at(baseMin + 20),
      deliveredAt: at(baseMin + 40),
      deliveredMeals: meals,
      deliveredKg: kg,
      goodCondition: true
    });
  }

  // Organizer simulated alert
  notifications.push({
    _id: nextId('ee00'),
    recipientType: 'organizer',
    recipientId: organizer._id,
    listingId: active._id,
    message: 'NGO D accepted Corporate Lunch – Hall B. Simulated alert.',
    read: false,
    createdAt: at(-10)
  });

  // NGO simulated alerts for active posted listings
  for (const posted of [wedding, sangeet, concert]) {
    const matched = match(posted, ngos);
    for (const m of matched.filter(item => item.feasible)) {
      notifications.push({
        _id: nextId('ee00'),
        recipientType: 'ngo',
        recipientId: m.ngoId,
        listingId: posted._id,
        message: `New listing near you: ${posted.eventName}. Simulated alert.`,
        read: false,
        createdAt: posted.createdAt
      });
    }
  }

  return {
    version: STORE_VERSION,
    seededAt: now,
    dirty: false,
    seq,
    organizers: [organizer],
    ngos,
    listings,
    pickups,
    notifications
  };
}

let memoryStore: DemoStore | null = null;

function saveStore(store: DemoStore): void {
  memoryStore = store;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }
  } catch {
    // Ignore storage quota or private-mode restrictions; memoryStore still persists for the session.
  }
}

function loadStore(): DemoStore {
  if (memoryStore) return memoryStore;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoStore;
        if (parsed && parsed.version === STORE_VERSION && Array.isArray(parsed.ngos)) {
          // If the user never interacted with an older snapshot and all posted items have expired,
          // automatically refresh timestamps so the demo always starts fresh.
          const hasLivePosted = parsed.listings.some(
            l => l.status === 'POSTED' && l.safeDeadline && +new Date(l.safeDeadline) > Date.now()
          );
          if (!parsed.dirty && !hasLivePosted) {
            const fresh = createSeedStore();
            saveStore(fresh);
            return fresh;
          }
          memoryStore = parsed;
          return parsed;
        }
      }
    }
  } catch {
    // Fall back to fresh seed store.
  }
  const fresh = createSeedStore();
  saveStore(fresh);
  return fresh;
}

function sweepExpired(store: DemoStore): void {
  const nowMs = Date.now();
  let changed = false;

  for (const listing of store.listings) {
    if (
      (listing.status === 'POSTED' || listing.status === 'ACCEPTED') &&
      listing.safeDeadline &&
      +new Date(listing.safeDeadline) < nowMs
    ) {
      if (listing.status === 'ACCEPTED') {
        const pickup = store.pickups.find(
          p => p.listingId === listing._id && p.status === 'ACCEPTED'
        );
        if (pickup) {
          pickup.status = 'EXPIRED';
          const ngo = store.ngos.find(n => n._id === pickup.ngoId);
          if (ngo) ngo.remainingCapacityMeals += listing.quantityMeals;
        }
      }
      listing.status = 'EXPIRED';
      listing.updatedAt = new Date(nowMs).toISOString();
      changed = true;
    }
  }

  if (changed) saveStore(store);
}

function populatePickup(store: DemoStore, pickup: Pickup): PopulatedPickup {
  return {
    ...pickup,
    listingId: store.listings.find(l => l._id === pickup.listingId) ?? null,
    ngoId: store.ngos.find(n => n._id === pickup.ngoId) ?? null
  };
}

function nextStoreId(store: DemoStore, prefix: string): string {
  store.seq += 1;
  return makeId(prefix, store.seq);
}

export async function handleDemoApi(path: string, body?: unknown): Promise<unknown> {
  const store = loadStore();
  const [pathname, queryString = ''] = path.split('?');
  const query = new URLSearchParams(queryString);
  const isPost = body !== undefined;

  if (!isPost || /accept|collect|cancel/.test(pathname)) {
    sweepExpired(store);
  }

  // GET /bootstrap
  if (!isPost && pathname === '/bootstrap') {
    return clone({
      organizers: store.organizers,
      ngos: store.ngos,
      config: demoConfig,
      demoMode: true,
      ephemeral: true,
      standaloneDemo: true
    });
  }

  // GET /listings
  if (!isPost && pathname === '/listings') {
    const organizerId = query.get('organizerId');
    const items = store.listings
      .filter(l => (!organizerId ? true : l.organizerId === organizerId))
      .slice()
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return clone(items);
  }

  // POST /listings
  if (isPost && pathname === '/listings') {
    const payload = body as {
      organizerId: string;
      eventName: string;
      eventType: string;
      location: GeoLocation;
      foodItems: FoodItem[];
      quantityMeals: number;
      quantityKg?: number;
      preparedAt: string;
      holdingCondition: HoldingCondition;
      packagingAvailable: boolean;
      pickupWindowStart: string;
      pickupWindowEnd: string;
      notes?: string;
    };

    if (!payload.eventName?.trim()) throw new Error('Event name is required.');
    if (!store.organizers.some(o => o._id === payload.organizerId)) {
      throw new Error('Organizer not found');
    }

    const e = eligibility(payload);
    const nowIso = new Date().toISOString();
    const listing: Listing = {
      _id: nextStoreId(store, 'cc00'),
      organizerId: payload.organizerId,
      eventName: payload.eventName.trim(),
      eventType: payload.eventType || 'Wedding',
      location: payload.location,
      foodItems: payload.foodItems,
      quantityMeals: Number(payload.quantityMeals),
      ...(payload.quantityKg ? { quantityKg: Number(payload.quantityKg) } : {}),
      preparedAt: payload.preparedAt,
      holdingCondition: payload.holdingCondition,
      packagingAvailable: Boolean(payload.packagingAvailable),
      pickupWindowStart: payload.pickupWindowStart,
      pickupWindowEnd: payload.pickupWindowEnd,
      notes: payload.notes,
      safeDeadline: e.safeDeadline,
      eligibility: { eligible: e.eligible, reasons: e.reasons },
      status: e.eligible ? 'POSTED' : 'INELIGIBLE',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    store.listings.unshift(listing);

    if (e.eligible) {
      const matched = match(listing, store.ngos);
      for (const m of matched.filter(item => item.feasible)) {
        store.notifications.unshift({
          _id: nextStoreId(store, 'ee00'),
          recipientType: 'ngo',
          recipientId: m.ngoId,
          listingId: listing._id,
          message: `New listing near you: ${listing.eventName}. Simulated alert.`,
          read: false,
          createdAt: nowIso
        });
      }
    }

    store.dirty = true;
    saveStore(store);
    return clone(listing);
  }

  // GET /listings/:id
  const listingMatch = pathname.match(/^\/listings\/([^/]+)$/);
  if (!isPost && listingMatch) {
    const item = store.listings.find(l => l._id === listingMatch[1]);
    if (!item) throw new Error('Listing not found');
    return clone(item);
  }

  // GET /listings/:id/matches
  const matchesRoute = pathname.match(/^\/listings\/([^/]+)\/matches$/);
  if (!isPost && matchesRoute) {
    const item = store.listings.find(l => l._id === matchesRoute[1]);
    if (!item) throw new Error('Listing not found');
    return clone(match(item, store.ngos));
  }

  // GET /ngo/:ngoId/feed
  const feedRoute = pathname.match(/^\/ngo\/([^/]+)\/feed$/);
  if (!isPost && feedRoute) {
    const ngo = store.ngos.find(n => n._id === feedRoute[1]);
    if (!ngo) throw new Error('NGO not found');
    const feed = store.listings
      .filter(l => l.status === 'POSTED')
      .map(l => ({
        ...l,
        match: match(l, [ngo])[0],
        urgency: urgency(l.safeDeadline)
      }))
      .filter(l => l.match.feasible)
      .sort(
        (a, b) =>
          +(a.safeDeadline ? new Date(a.safeDeadline) : 0) -
          +(b.safeDeadline ? new Date(b.safeDeadline) : 0)
      );
    return clone(feed);
  }

  // POST /listings/:id/accept
  const acceptRoute = pathname.match(/^\/listings\/([^/]+)\/accept$/);
  if (isPost && acceptRoute) {
    const listingId = acceptRoute[1];
    const { ngoId } = body as { ngoId: string };
    const listing = store.listings.find(l => l._id === listingId && l.status === 'POSTED');
    if (!listing) {
      throw new Error('Already accepted by another NGO, or listing is no longer available');
    }
    if (!listing.safeDeadline || +new Date(listing.safeDeadline) <= Date.now()) {
      throw new Error('Safe collection deadline has expired');
    }
    const ngo = store.ngos.find(n => n._id === ngoId);
    if (!ngo) throw new Error('NGO not found');

    const result = match(listing, [ngo])[0];
    if (!result.feasible || result.matchType !== 'Full match') {
      throw new Error(result.reasons.join(' '));
    }
    if (ngo.remainingCapacityMeals < listing.quantityMeals) {
      throw new Error('NGO capacity is no longer sufficient');
    }

    const nowIso = new Date().toISOString();
    listing.status = 'ACCEPTED';
    listing.updatedAt = nowIso;
    ngo.remainingCapacityMeals -= listing.quantityMeals;

    const pickup: Pickup = {
      _id: nextStoreId(store, 'dd00'),
      listingId: listing._id,
      ngoId: ngo._id,
      volunteerName: 'Rahul Sharma',
      status: 'ACCEPTED',
      acceptedAt: nowIso
    };
    store.pickups.unshift(pickup);

    store.notifications.unshift({
      _id: nextStoreId(store, 'ee00'),
      recipientType: 'organizer',
      recipientId: listing.organizerId,
      listingId: listing._id,
      message: `${ngo.name} accepted ${listing.eventName}. Simulated alert.`,
      read: false,
      createdAt: nowIso
    });

    store.dirty = true;
    saveStore(store);
    return clone(pickup);
  }

  // POST /listings/:id/cancel
  const cancelRoute = pathname.match(/^\/listings\/([^/]+)\/cancel$/);
  if (isPost && cancelRoute) {
    const listingId = cancelRoute[1];
    const listing = store.listings.find(
      l => l._id === listingId && (l.status === 'POSTED' || l.status === 'ACCEPTED')
    );
    if (!listing) throw new Error('Only posted or accepted listings can be cancelled');

    const wasAccepted = listing.status === 'ACCEPTED';
    listing.status = 'CANCELLED';
    listing.updatedAt = new Date().toISOString();

    if (wasAccepted) {
      const pickup = store.pickups.find(p => p.listingId === listingId && p.status === 'ACCEPTED');
      if (pickup) {
        pickup.status = 'CANCELLED';
        const ngo = store.ngos.find(n => n._id === pickup.ngoId);
        if (ngo) ngo.remainingCapacityMeals += listing.quantityMeals;
      }
    }

    store.dirty = true;
    saveStore(store);
    return { ok: true };
  }

  // GET /pickups
  if (!isPost && pathname === '/pickups') {
    const ngoId = query.get('ngoId');
    const organizerId = query.get('organizerId');
    let list = store.pickups
      .filter(p => (!ngoId ? true : p.ngoId === ngoId))
      .map(p => populatePickup(store, p));
    if (organizerId) {
      list = list.filter(p => p.listingId?.organizerId === organizerId);
    }
    list.sort((a, b) => +new Date(b.acceptedAt) - +new Date(a.acceptedAt));
    return clone(list);
  }

  // POST /pickups/:id/collect
  const collectRoute = pathname.match(/^\/pickups\/([^/]+)\/collect$/);
  if (isPost && collectRoute) {
    const pickup = store.pickups.find(p => p._id === collectRoute[1] && p.status === 'ACCEPTED');
    if (!pickup) throw new Error('Only an accepted pickup can be collected');
    const listing = store.listings.find(l => l._id === pickup.listingId && l.status === 'ACCEPTED');
    if (!listing) throw new Error('Listing is no longer available for collection');

    const nowIso = new Date().toISOString();
    pickup.status = 'COLLECTED';
    pickup.collectedAt = nowIso;
    listing.status = 'COLLECTED';
    listing.updatedAt = nowIso;

    store.dirty = true;
    saveStore(store);
    return clone(pickup);
  }

  // POST /pickups/:id/deliver
  const deliverRoute = pathname.match(/^\/pickups\/([^/]+)\/deliver$/);
  if (isPost && deliverRoute) {
    const pickup = store.pickups.find(p => p._id === deliverRoute[1] && p.status === 'COLLECTED');
    if (!pickup) throw new Error('Only a collected pickup can be delivered');
    const listing = store.listings.find(l => l._id === pickup.listingId);
    if (!listing) throw new Error('Listing not found');

    const data = body as {
      deliveredMeals: number;
      deliveredKg?: number;
      goodCondition: boolean;
    };
    const deliveredMeals = Number(data.deliveredMeals);
    if (!Number.isInteger(deliveredMeals) || deliveredMeals < 0) {
      throw new Error('Please enter a valid number of delivered meals');
    }
    if (deliveredMeals > listing.quantityMeals) {
      throw new Error('Delivered meals cannot exceed listed meals');
    }
    if (!data.goodCondition) {
      throw new Error('Food condition confirmation is required');
    }

    const nowIso = new Date().toISOString();
    pickup.status = 'DELIVERED';
    pickup.deliveredAt = nowIso;
    pickup.deliveredMeals = deliveredMeals;
    if (data.deliveredKg !== undefined && Number.isFinite(Number(data.deliveredKg))) {
      pickup.deliveredKg = Number(data.deliveredKg);
    }
    pickup.goodCondition = true;
    listing.status = 'DELIVERED';
    listing.updatedAt = nowIso;

    store.dirty = true;
    saveStore(store);
    return clone(pickup);
  }

  // GET /notifications
  if (!isPost && pathname === '/notifications') {
    const recipientId = query.get('recipientId');
    const items = store.notifications
      .filter(n => (!recipientId ? true : n.recipientId === recipientId))
      .slice()
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 30);
    return clone(items);
  }

  // POST /notifications/:id/read
  const readRoute = pathname.match(/^\/notifications\/([^/]+)\/read$/);
  if (isPost && readRoute) {
    const notif = store.notifications.find(n => n._id === readRoute[1]);
    if (!notif) throw new Error('Notification not found');
    notif.read = true;
    store.dirty = true;
    saveStore(store);
    return clone(notif);
  }

  // GET /impact
  if (!isPost && pathname === '/impact') {
    const ngoId = query.get('ngoId');
    const organizerId = query.get('organizerId');
    let delivered = store.pickups
      .filter(p => p.status === 'DELIVERED' && (!ngoId ? true : p.ngoId === ngoId))
      .map(p => populatePickup(store, p));
    if (organizerId) {
      delivered = delivered.filter(p => p.listingId?.organizerId === organizerId);
    }

    const meals = delivered.reduce((sum, p) => sum + (p.deliveredMeals || 0), 0);
    const kg = delivered.reduce((sum, p) => sum + (p.deliveredKg || 0), 0);
    const days: Record<string, number> = {};
    for (const p of delivered) {
      if (p.deliveredAt) {
        const day = p.deliveredAt.slice(0, 10);
        days[day] = (days[day] || 0) + (p.deliveredMeals || 0);
      }
    }

    return clone({
      meals,
      kg,
      deliveries: delivered.length,
      co2: kg * demoConfig.co2Factor,
      factor: demoConfig.co2Factor,
      assumption: demoConfig.co2Assumption,
      history: Object.entries(days)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, dayMeals]) => ({ date, meals: dayMeals })),
      recent: delivered.sort(
        (a, b) =>
          +(b.deliveredAt ? new Date(b.deliveredAt) : 0) -
          +(a.deliveredAt ? new Date(a.deliveredAt) : 0)
      )
    });
  }

  // POST /demo/reset
  if (isPost && pathname === '/demo/reset') {
    const fresh = createSeedStore();
    saveStore(fresh);
    return { ok: true };
  }

  throw new Error(`Demo API route not found: ${pathname}`);
}
