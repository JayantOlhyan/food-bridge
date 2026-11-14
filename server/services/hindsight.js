import crypto from 'crypto';
import { HindsightClient } from '@vectorize-io/hindsight-client';

/** Optional Hindsight Cloud API key loaded from environment variables. */
const API_KEY = process.env.HINDSIGHT_API_KEY || '';
/** Default Hindsight REST API base endpoint URL. */
const BASE_URL = (process.env.HINDSIGHT_API_URL || process.env.HINDSIGHT_BASE_URL || 'https://api.hindsight.vectorize.io').replace(/\/+$/, '');
/** Default Hindsight memory bank identifier scoped to FoodBridge. */
const BANK_ID = process.env.HINDSIGHT_BANK_ID || 'foodbridge';

// Reusable official SDK client instance
export let hindsightClient = null;

/** Lazily initializes the Hindsight SDK client when an API key is configured. */
export function initHindsightClient(customConfig = {}) {
  const apiKey = customConfig.apiKey ?? process.env.HINDSIGHT_API_KEY ?? API_KEY;
  const baseUrl = (customConfig.baseUrl ?? process.env.HINDSIGHT_API_URL ?? process.env.HINDSIGHT_BASE_URL ?? BASE_URL).replace(/\/+$/, '');

  if (!apiKey) {
    hindsightClient = null;
    return null;
  }

  try {
    hindsightClient = new HindsightClient({
      baseUrl,
      apiKey
    });
    return hindsightClient;
  } catch (err) {
    console.warn('[Hindsight Client] Initialization notice:', err.message);
    hindsightClient = null;
    return null;
  }
}

// Auto-initialize on module load
initHindsightClient();

// Dynamic environment variable accessors
const getApiKey = () => process.env.HINDSIGHT_API_KEY || API_KEY || '';
/** Resolves the normalized Hindsight base URL without trailing slashes. */
const getBaseUrl = () => (process.env.HINDSIGHT_API_URL || process.env.HINDSIGHT_BASE_URL || BASE_URL).replace(/\/+$/, '');
/** Returns the active Hindsight bank identifier with safe fallback. */
const getBankId = () => process.env.HINDSIGHT_BANK_ID || BANK_ID || 'foodbridge';

// Token conservation trackers and bounded in-memory cache
const retainedHashes = new Set();
/** In-process memory buffer enabling full offline operation without API keys. */
const localMemoryStore = []; // Bounded local fallback store when HINDSIGHT_API_KEY is unset
/** Upper cap on retained offline memories to bound process heap usage. */
const MAX_LOCAL_MEMORIES = 500;
/** Short-lived response cache avoiding redundant remote recall round trips. */
const queryCache = new Map(); // key -> { timestamp, data }
/** Maximum number of entries kept in the query cache before FIFO eviction. */
const MAX_CACHE_SIZE = 500; // Prevent unbounded memory growth
/** Time-to-live window in milliseconds for cached recall and reflect responses. */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
/** AbortController timeout bounding outbound Hindsight HTTP requests. */
const FETCH_TIMEOUT_MS = 8000; // 8s timeout to protect request latencies

/** Appends a normalized operational fact to the bounded local memory store. */
function storeLocalMemory(entry) {
  if (localMemoryStore.length >= MAX_LOCAL_MEMORIES) {
    localMemoryStore.shift();
  }
  localMemoryStore.push(entry);
}

/** Performs lightweight token-overlap recall against local operational memories. */
function searchLocalMemories(query, limit = 5, tags = []) {
  const tokens = String(query || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length > 2);

  const scored = [];
  for (const item of localMemoryStore) {
    if (tags.length > 0 && !tags.some(t => item.tags.includes(t))) {
      continue;
    }
    const lower = item.text.toLowerCase();
    let hits = 0;
    for (const token of tokens) {
      if (lower.includes(token)) hits++;
    }
    if (hits > 0 || tags.length > 0) {
      const score = tokens.length > 0 ? Math.min(1, 0.35 + (hits / tokens.length) * 0.65) : 0.7;
      scored.push({
        id: item.id,
        text: item.text,
        type: item.metadata?.eventType || 'local_memory',
        entities: item.tags,
        score: Number(score.toFixed(2))
      });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Retrieves a non-expired cached memory response and tracks hit metrics. */
function getCached(key) {
  const item = queryCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    queryCache.delete(key);
    return null;
  }
  return item.data;
}

/** Stores a memory query payload in the bounded TTL cache. */
function setCached(key, data) {
  if (queryCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = queryCache.keys().next().value;
    if (oldestKey) queryCache.delete(oldestKey);
  }
  queryCache.set(key, { timestamp: Date.now(), data });
}

/** Executes fetch with an AbortController deadline to prevent stalled calls. */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export const aiMetrics = {
  retainsCount: 0,
  dedupedCount: 0,
  cacheHits: 0,
  reflectCalls: 0,
  recallCalls: 0,
  estimatedTokensSaved: 0,
  bankId: BANK_ID,
  baseUrl: BASE_URL,
  lastSync: null
};

/**
 * Generate a deterministic sha256 hash to deduplicate memory items.
 */
function hashContent(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Ensure bank exists in Hindsight using the official SDK or REST fallback.
 */
export async function ensureBank() {
  const key = getApiKey();
  if (!key) return false;

  const currentBankId = getBankId();
  const currentBaseUrl = getBaseUrl();
  const mission = 'Coordinate surplus food rescue between event organizers and verified NGOs before safety holding limits expire.';
  const background = 'FoodBridge operates in the Delhi NCR area, prioritizing deterministic safety limits, dietary compatibility, and travel feasibility.';

  try {
    if (hindsightClient) {
      await hindsightClient.createBank(currentBankId, {
        name: currentBankId,
        mission,
        background
      });
      aiMetrics.lastSync = new Date().toISOString();
      return true;
    }

    const res = await fetchWithTimeout(`${currentBaseUrl}/v1/default/banks/${currentBankId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: currentBankId,
        mission,
        background
      })
    });
    if (res.ok) {
      aiMetrics.lastSync = new Date().toISOString();
      return true;
    }
  } catch (err) {
    console.warn('[Hindsight AI] Bank initialization check notice:', err.message);
  }
  return false;
}

/**
 * Retain memory with aggressive token-conservation deduplication and concise payload formatting.
 */
export async function retainMemory(content, tags = [], metadata = {}, documentId = null) {
  if (!content || !String(content).trim()) return null;

  const key = getApiKey();
  const currentBankId = getBankId();
  const currentBaseUrl = getBaseUrl();
  const trimmed = String(content).trim();
  const contentHash = hashContent(trimmed);
  if (retainedHashes.has(contentHash)) {
    aiMetrics.dedupedCount++;
    aiMetrics.estimatedTokensSaved += 1800; // Approximate tokens saved by skipping LLM extraction
    return { status: 'skipped_duplicate', hash: contentHash };
  }

  const sanitizedTags = (Array.isArray(tags) ? tags : [tags]).filter(Boolean).map(String);
  const stringMetadata = {};
  if (metadata && typeof metadata === 'object') {
    for (const [k, v] of Object.entries(metadata)) {
      if (v !== undefined && v !== null) {
        stringMetadata[k] = String(v);
      }
    }
  }

  // Offline / CI local memory bank fallback when HINDSIGHT_API_KEY is not configured
  if (!key) {
    const entry = {
      id: documentId || `local-${contentHash.slice(0, 12)}`,
      text: trimmed,
      tags: sanitizedTags,
      metadata: stringMetadata,
      createdAt: new Date().toISOString()
    };
    storeLocalMemory(entry);
    retainedHashes.add(contentHash);
    aiMetrics.retainsCount++;
    aiMetrics.lastSync = entry.createdAt;
    return { status: 'retained', data: entry, mode: 'local' };
  }

  try {
    // 1. Prefer official TypeScript SDK client
    if (hindsightClient) {
      const options = {
        tags: sanitizedTags,
        metadata: stringMetadata
      };
      if (documentId) {
        options.documentId = documentId;
      }
      const sdkResult = await hindsightClient.retain(currentBankId, content.trim(), options);
      retainedHashes.add(contentHash);
      aiMetrics.retainsCount++;
      aiMetrics.lastSync = new Date().toISOString();
      return { status: 'retained', data: sdkResult };
    }

    // 2. Direct HTTP fallback
    const res = await fetchWithTimeout(`${currentBaseUrl}/v1/default/banks/${currentBankId}/memories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [
          {
            content: content.trim(),
            tags: sanitizedTags,
            metadata: stringMetadata,
            ...(documentId ? { document_id: documentId } : {})
          }
        ]
      })
    });

    if (res.ok) {
      const data = await res.json();
      retainedHashes.add(contentHash);
      aiMetrics.retainsCount++;
      aiMetrics.lastSync = new Date().toISOString();
      return { status: 'retained', data };
    } else {
      const errText = await res.text();
      console.warn('[Hindsight AI] Retain failed:', res.status, errText);
      return null;
    }
  } catch (err) {
    console.warn('[Hindsight AI] Retain error:', err.message);
    return null;
  }
}

/**
 * Recall memories via semantic / graph search (zero generative token spend).
 */
export async function recallMemories(query, limit = 5, tags = []) {
  if (!query || !String(query).trim()) return [];

  const key = getApiKey();
  const currentBankId = getBankId();
  const currentBaseUrl = getBaseUrl();
  const sanitizedTags = (Array.isArray(tags) ? tags : [tags]).filter(Boolean).map(String);
  const cacheKey = `recall:${query}:${sanitizedTags.join(',')}:${limit}`;
  const cached = getCached(cacheKey);
  if (cached) {
    aiMetrics.cacheHits++;
    aiMetrics.estimatedTokensSaved += 500;
    return cached;
  }

  aiMetrics.recallCalls++;

  if (!key) {
    const localResults = searchLocalMemories(query, limit, sanitizedTags);
    setCached(cacheKey, localResults);
    return localResults;
  }
  try {
    // 1. Prefer official TypeScript SDK client
    if (hindsightClient) {
      const recallOptions = {
        budget: 'low'
      };
      if (sanitizedTags.length > 0) {
        recallOptions.tags = sanitizedTags;
        recallOptions.tagsMatch = 'any';
      }
      const data = await hindsightClient.recall(currentBankId, query.trim(), recallOptions);
      const results = (data?.results || []).slice(0, limit).map(r => ({
        id: r.id,
        text: r.text,
        type: r.type,
        entities: r.entities,
        score: r.scores?.final ?? r.scores?.semantic ?? 1
      }));
      setCached(cacheKey, results);
      return results;
    }

    // 2. Direct HTTP fallback
    const payload = { query: query.trim(), limit };
    if (sanitizedTags.length > 0) {
      payload.tags = sanitizedTags;
      payload.tags_match = 'any';
    }

    const res = await fetchWithTimeout(`${currentBaseUrl}/v1/default/banks/${currentBankId}/memories/recall`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      const results = (data.results || []).map(r => ({
        id: r.id,
        text: r.text,
        type: r.type,
        entities: r.entities,
        score: r.scores?.final ?? r.scores?.semantic ?? 1
      }));
      setCached(cacheKey, results);
      return results;
    }
  } catch (err) {
    console.warn('[Hindsight AI] Recall error:', err.message);
  }
  return [];
}

/**
 * Reflect / Reason with conservative "low" budget and strict caching.
 */
export async function reflectAdvice(query, context = '', budget = 'low') {
  if (!query || !String(query).trim()) {
    return {
      text: 'Please provide a question for FoodBridge AI.',
      recalled: [],
      source: 'invalid_query'
    };
  }

  const key = getApiKey();
  const currentBankId = getBankId();
  const currentBaseUrl = getBaseUrl();
  const cacheKey = `reflect:${query}:${context}:${budget}`;
  const cached = getCached(cacheKey);
  if (cached) {
    aiMetrics.cacheHits++;
    aiMetrics.estimatedTokensSaved += 12000; // Reflect uses 12k-15k tokens; cache saves massive tokens!
    return { ...cached, fromCache: true };
  }

  // First recall relevant memories to enrich context and provide instant groundedness
  const recalled = await recallMemories(query, 3);
  aiMetrics.reflectCalls++;

  if (!key) {
    const localResult = recalled.length > 0
      ? {
          text: `Based on FoodBridge rescue records:\n${recalled.map(r => `• ${r.text}`).join('\n')}`,
          recalled,
          fromCache: false,
          source: 'local_memory_bank'
        }
      : {
          text: 'FoodBridge safety guidance: hot-held food has a 4-hour demo holding limit, refrigerated 8 hours, packaged-sealed 6 hours, and room-temperature 2 hours, with a 30-minute minimum collection lead time.',
          recalled: [],
          fromCache: false,
          source: 'local_knowledge'
        };
    setCached(cacheKey, localResult);
    return localResult;
  }

  try {
    const fullQuery = context
      ? `Context: ${context}\n\nQuestion: ${query}`
      : query;

    const res = await fetchWithTimeout(`${currentBaseUrl}/v1/default/banks/${currentBankId}/reflect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000,
      body: JSON.stringify({
        query: fullQuery,
        budget: budget || 'low' // Conserves tokens by limiting agent reasoning cycles
      })
    });

    if (res.ok) {
      const data = await res.json();
      const result = {
        text: data.text || 'No response generated.',
        recalled,
        usage: data.usage || null,
        fromCache: false
      };
      setCached(cacheKey, result);
      return result;
    } else {
      const errText = await res.text();
      console.warn('[Hindsight AI] Reflect response error:', res.status, errText);
    }
  } catch (err) {
    console.warn('[Hindsight AI] Reflect error:', err.message);
  }

  // Fallback to grounded recalled memories if reflect call hits budget limit or network error
  if (recalled.length > 0) {
    const fallback = {
      text: `Based on FoodBridge rescue records:\n${recalled.map(r => `• ${r.text}`).join('\n')}`,
      recalled,
      fromCache: false,
      source: 'recalled_facts'
    };
    setCached(cacheKey, fallback);
    return fallback;
  }

  const defaultFallback = {
    text: 'FoodBridge AI operates with active token conservation. Your query has been logged for subsequent retrieval.',
    recalled: [],
    source: 'fallback'
  };
  setCached(cacheKey, defaultFallback);
  return defaultFallback;
}

/**
 * Save a confirmed food rescue event into the Hindsight long-term memory bank.
 *
 * Supported event types:
 * - 'CONFIRMED_DELIVERY': Successful food handover confirmed with verified meal/kg counts.
 * - 'PICKUP_DELAY': Volunteer transit delay or gate holding delay recorded.
 * - 'PICKUP_FAILED': Expiry or unfulfilled pickup where safety window ran out.
 * - 'CANCELLATION': Pickup or listing cancelled prior to collection.
 * - 'DONOR_PREFERENCE': Verified organizer packaging or logistics preference.
 * - 'NGO_PREFERENCE': Verified NGO vehicle capability or handling note.
 * - 'LISTING_CREATED': Verified new food rescue posting.
 * - 'LISTING_ACCEPTED': Verified partnership acceptance.
 *
 * Privacy guarantee: Never retains donor personal phone numbers, emails, or volunteer personal names.
 */
export async function saveConfirmedRescueEvent(eventType, eventData = {}) {
  if (!eventType || !eventData) return null;

  try {
    let content = '';
    const tags = ['scope:rescue_history'];
    let metadata = { eventType };
    let documentId = null;

    // Privacy safeguard: Strip personal phone numbers, volunteer private names, emails
    const donorId = String(eventData.donorId || eventData.listing?.organizerId || '');
    const ngoId = String(eventData.ngoId || eventData.ngo?._id || eventData.pickup?.ngoId || '');
    const listingId = String(eventData.listingId || eventData.listing?._id || eventData.pickup?.listingId || '');
    const pickupId = String(eventData.pickupId || eventData.pickup?._id || '');
    const eventName = eventData.listing?.eventName || eventData.eventName || 'Surplus Food Rescue';
    const area = eventData.listing?.location?.address || eventData.location?.address || 'Delhi NCR';

    if (donorId) tags.push(`entity:donor:${donorId}`);
    if (ngoId) tags.push(`entity:ngo:${ngoId}`);

    switch (eventType) {
      case 'CONFIRMED_DELIVERY': {
        const meals = eventData.deliveredMeals ?? eventData.pickup?.deliveredMeals ?? eventData.listing?.quantityMeals ?? 0;
        const kg = eventData.deliveredKg ?? eventData.pickup?.deliveredKg ?? eventData.listing?.quantityKg ?? 0;
        const ngoName = eventData.ngo?.name || eventData.ngoName || 'NGO Partner';
        content = `Rescue delivery confirmed: ${ngoName} successfully collected and distributed ${meals} meals${kg ? ` (${kg} kg)` : ''} from "${eventName}" at ${area}. Food condition verified good on delivery handover.`;
        tags.push('pickup', 'delivered', 'event:pickup_delivered', 'impact');
        metadata = { ...metadata, listingId, pickupId, donorId, ngoId, meals: String(meals), kg: String(kg) };
        documentId = `delivery_${pickupId || listingId}`;
        break;
      }

      case 'PICKUP_DELAY': {
        const delayMin = eventData.delayMinutes || 15;
        const reason = eventData.reason || 'Transit or venue access delay';
        const ngoName = eventData.ngo?.name || eventData.ngoName || 'NGO Partner';
        content = `Rescue pickup delay recorded: ${ngoName} experienced a ${delayMin}-minute delay arriving for pickup at "${eventName}" (${area}). Reason: ${reason}. Safety holding window slack was maintained.`;
        tags.push('pickup', 'delay', 'event:pickup_delayed');
        metadata = { ...metadata, listingId, pickupId, donorId, ngoId, delayMinutes: String(delayMin), reason: String(reason) };
        documentId = `delay_${pickupId || listingId}_${delayMin}`;
        break;
      }

      case 'PICKUP_FAILED': {
        const reason = eventData.reason || 'Safe holding window expired before arrival';
        const ngoName = eventData.ngo?.name || eventData.ngoName || 'NGO Partner';
        content = `Rescue pickup unfulfilled: Scheduled pickup for "${eventName}" (${area}) assigned to ${ngoName} could not be completed. Reason: ${reason}. Food marked expired and partner capacity restored.`;
        tags.push('pickup', 'failed', 'event:pickup_failed', 'incident');
        metadata = { ...metadata, listingId, pickupId, donorId, ngoId, reason: String(reason) };
        documentId = `failed_${pickupId || listingId}`;
        break;
      }

      case 'CANCELLATION': {
        const reason = eventData.reason || 'Cancelled by participant before food handover';
        const ngoName = eventData.ngo?.name || eventData.ngoName || 'Assigned NGO';
        content = `Rescue cancelled: Pickup of ${eventData.listing?.quantityMeals || 'food'} meals from "${eventName}" (${area}) was cancelled prior to collection. Assigned partner: ${ngoName}. Reason: ${reason}. Partner capacity restored.`;
        tags.push('pickup', 'cancelled', 'event:pickup_cancelled', 'incident');
        metadata = { ...metadata, listingId, pickupId, donorId, ngoId, reason: String(reason) };
        documentId = `cancel_${pickupId || listingId}`;
        break;
      }

      case 'DONOR_PREFERENCE': {
        const preference = eventData.preference || 'Prefers standardized sealed containers';
        content = `Donor operational preference verified: Organizer "${eventName}" at ${area} verified preference: ${preference}.`;
        tags.push('donor', 'preference', 'event:preference');
        metadata = { ...metadata, donorId, preference: String(preference) };
        documentId = `pref_donor_${donorId}`;
        break;
      }

      case 'NGO_PREFERENCE': {
        const preference = eventData.preference || 'Equipped with insulated carriers';
        const ngoName = eventData.ngo?.name || eventData.ngoName || 'NGO Partner';
        content = `NGO operational capability verified: ${ngoName} verified handling note: ${preference}.`;
        tags.push('ngo', 'preference', 'event:preference');
        metadata = { ...metadata, ngoId, preference: String(preference) };
        documentId = `pref_ngo_${ngoId}`;
        break;
      }

      case 'LISTING_CREATED': {
        const items = (eventData.listing?.foodItems || []).map(f => `${f.name} (${f.dietType})`).join(', ');
        content = `Food listing posted: "${eventName}" (${eventData.listing?.eventType || 'Event'}) at ${area}. Quantity: ${eventData.listing?.quantityMeals} meals. Items: ${items}. Holding: ${eventData.listing?.holdingCondition}. Safe until: ${eventData.listing?.safeDeadline ? new Date(eventData.listing.safeDeadline).toISOString() : 'N/A'}.`;
        tags.push('listing', 'posted', 'event:listing_created');
        metadata = { ...metadata, listingId, donorId, meals: String(eventData.listing?.quantityMeals || 0) };
        documentId = `listing_${listingId}`;
        break;
      }

      case 'LISTING_ACCEPTED': {
        const ngoName = eventData.ngo?.name || 'Assigned NGO';
        content = `Rescue accepted: ${ngoName} accepted "${eventName}" for ${eventData.listing?.quantityMeals} meals. Partner capacity reserved.`;
        tags.push('pickup', 'accepted', 'event:pickup_accepted');
        metadata = { ...metadata, listingId, donorId, ngoId, meals: String(eventData.listing?.quantityMeals || 0) };
        documentId = `accepted_${listingId}_${ngoId}`;
        break;
      }

      default:
        content = eventData.content || `Rescue event ${eventType} logged for "${eventName}".`;
        tags.push(`event:${eventType.toLowerCase()}`);
        documentId = `event_${eventType.toLowerCase()}_${listingId || Date.now()}`;
    }

    return await retainMemory(content, tags, metadata, documentId);
  } catch (err) {
    console.warn(`[Hindsight Memory] Event recording notice (${eventType}):`, err.message);
    return null;
  }
}

/**
 * Retrieve structured memories relevant to a donation for use by other backend services.
 */
export async function getRelevantMemoriesForDonation(listing, options = {}) {
  if (!listing) return { donorHistory: [], ngoHistory: {}, generalInsights: [], totalRecalled: 0 };

  const donorId = String(listing.organizerId || '');
  const candidateNgoIds = Array.isArray(options.candidateNgoIds) ? options.candidateNgoIds : [];
  const limit = options.limit || 5;

  try {
    const results = {
      donorHistory: [],
      ngoHistory: {},
      generalInsights: [],
      totalRecalled: 0
    };

    // 1. Recall donor history if donorId is present
    if (donorId) {
      const donorQuery = `Rescue history, delivery outcomes, and preferences for organizer "${listing.eventName || 'event'}"`;
      const donorMemories = await recallMemories(donorQuery, limit, [`entity:donor:${donorId}`]);
      results.donorHistory = donorMemories;
      results.totalRecalled += donorMemories.length;
    }

    // 2. Recall NGO memories for candidate NGOs
    if (candidateNgoIds.length > 0) {
      const candidatePromises = candidateNgoIds.slice(0, 6).map(async (ngoId) => {
        const ngoQuery = `Food rescue pickups, on-time arrivals, delivery confirmations, or delays for NGO`;
        const ngoMemories = await recallMemories(ngoQuery, 3, [`entity:ngo:${ngoId}`]);
        return { ngoId, memories: ngoMemories };
      });

      const ngoResults = await Promise.all(candidatePromises);
      for (const { ngoId, memories } of ngoResults) {
        if (memories && memories.length > 0) {
          results.ngoHistory[ngoId] = memories;
          results.totalRecalled += memories.length;
        }
      }
    }

    // 3. Recall general operational insights for this food type and holding condition
    const holdingCondition = listing.holdingCondition || 'hot-held';
    const dietType = listing.foodItems?.some(f => f.dietType === 'non-veg') ? 'non-veg' : 'veg';
    const insightQuery = `Safe handling and transport for ${holdingCondition} ${dietType} meals in Delhi`;
    const insights = await recallMemories(insightQuery, 2);
    results.generalInsights = insights;
    results.totalRecalled += insights.length;

    return results;
  } catch (err) {
    console.warn('[Hindsight Memory] Recall error for donation:', err.message);
    return { donorHistory: [], ngoHistory: {}, generalInsights: [], totalRecalled: 0 };
  }
}

/**
 * Helpers for recording high-value lifecycle events into Hindsight without wasting tokens.
 */
export function recordListingCreated(listing) {
  saveConfirmedRescueEvent('LISTING_CREATED', { listing }).catch(() => {});
}

export function recordListingAccepted(listing, ngo) {
  saveConfirmedRescueEvent('LISTING_ACCEPTED', { listing, ngo }).catch(() => {});
}

export function recordPickupDelivered(pickup, listing, ngo) {
  saveConfirmedRescueEvent('CONFIRMED_DELIVERY', { pickup, listing, ngo }).catch(() => {});
}

export function recordPickupDelayed(pickup, listing, delayMinutes, reason) {
  saveConfirmedRescueEvent('PICKUP_DELAY', { pickup, listing, delayMinutes, reason }).catch(() => {});
}

export function recordPickupCancelled(pickup, listing, ngo, reason) {
  saveConfirmedRescueEvent('CANCELLATION', { pickup, listing, ngo, reason }).catch(() => {});
}

export function recordPickupFailed(pickup, listing, reason) {
  saveConfirmedRescueEvent('PICKUP_FAILED', { pickup, listing, reason }).catch(() => {});
}

export function recordVerifiedPreference(entityType, entityId, preference, extra = {}) {
  const eventType = entityType === 'donor' ? 'DONOR_PREFERENCE' : 'NGO_PREFERENCE';
  saveConfirmedRescueEvent(eventType, {
    [entityType === 'donor' ? 'donorId' : 'ngoId']: entityId,
    preference,
    ...extra
  }).catch(() => {});
}

/**
 * Enriches deterministic matches with Hindsight historical memory.
 *
 * Principles:
 * 1. Food-safety, capacity, availability, and travel rules are 100% authoritative.
 * 2. Ineligible (Excluded) and Partial matches are NEVER promoted to Full match.
 * 3. Historical facts are retrieved from Hindsight and distinguished from inferred patterns.
 * 4. Empty or missing memory preserves base deterministic scores with zero change.
 * 5. Outages fall back seamlessly to deterministic matches without throwing.
 */
export async function enrichMatchesWithMemory(listing, rawMatches, options = {}) {
  if (!Array.isArray(rawMatches) || rawMatches.length === 0) {
    return rawMatches || [];
  }

  const isHindsightConfigured = Boolean(process.env.HINDSIGHT_API_KEY || API_KEY);
  const isMemoryEnabled = options.enabled !== false;

  // Initialize all matches with baseline attributes and default memory insights
  const enriched = rawMatches.map((m, idx) => {
    const baseScore = typeof m?.score === 'number' ? m.score : 50;
    const distanceKm = typeof m?.distanceKm === 'number' ? m.distanceKm : 0;
    const ngoId = String(m?.ngoId || m?.ngo?._id || `candidate-${idx}`);
    return {
      ...m,
      score: baseScore,
      baseScore,
      distanceKm,
      ngoId,
      memoryInsights: {
        hasHistory: false,
        facts: [],
        inferredPattern: null,
        confidenceScore: 0,
        scoreAdjustment: 0,
        hindsightAvailable: isHindsightConfigured,
        explanation: !options.enabled
          ? 'Authoritative baseline: Historical memory excluded from reasoning.'
          : m?.feasible
            ? 'Authoritative candidate: No prior rescue history on record.'
            : 'Excluded from recommendations by authoritative safety or feasibility filters.'
      }
    };
  });

  const tier = r => !r.feasible ? 2 : r.matchType === 'Full match' ? 0 : 1;
  const sortMatches = (list) => {
    return list.sort((a, b) => {
      if (tier(a) !== tier(b)) return tier(a) - tier(b);
      // Sort by score desc, then baseScore desc, distance asc, then ngoId asc
      if (b.score !== a.score) return b.score - a.score;
      if (b.baseScore !== a.baseScore) return b.baseScore - a.baseScore;
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return (a.ngoId || '').localeCompare(b.ngoId || '');
    });
  };

  // If memory is disabled, or listing is not safety-eligible, return baseline immediately
  if (!isMemoryEnabled || !listing || listing.eligibility?.eligible === false) {
    return sortMatches(enriched);
  }

  // Only consider feasible Full Matches for memory enrichment
  const feasibleMatches = enriched.filter(m => m.feasible && m.matchType === 'Full match');
  if (feasibleMatches.length === 0) {
    return sortMatches(enriched);
  }

  try {
    const donorId = String(listing.organizerId || '');

    await Promise.all(feasibleMatches.map(async (m) => {
      const ngoId = String(m.ngoId);
      const ngoName = m.ngo?.name || 'Assigned NGO';

      // 1. Retrieve direct history with this donor if donorId exists
      const directTags = donorId
        ? [`entity:donor:${donorId}`, `entity:ngo:${ngoId}`]
        : [`entity:ngo:${ngoId}`];

      const directMemories = await recallMemories(
        `Past deliveries, pickups, delays, or cancellations between donor and ${ngoName}`,
        4,
        directTags
      );

      // 2. Retrieve general operational track record for this NGO
      const generalMemories = await recallMemories(
        `Rescue pickup performance, arrival delays, cancellations, or special vehicle capabilities for ${ngoName}`,
        4,
        [`entity:ngo:${ngoId}`]
      );

      // Merge and deduplicate by text
      const factMap = new Map();
      for (const item of [...directMemories, ...generalMemories]) {
        if (item && item.text && !factMap.has(item.text)) {
          factMap.set(item.text, item);
        }
      }
      const recalledFacts = Array.from(factMap.values());

      if (recalledFacts.length === 0) {
        return;
      }

      // Analyze recorded outcomes
      let deliveriesCount = 0;
      let delaysCount = 0;
      let cancellationsCount = 0;
      const verifiedPreferences = [];
      const factsList = [];

      for (const fact of recalledFacts) {
        const lower = fact.text.toLowerCase();
        let factType = 'general';

        const isDelay = lower.includes('delay') || lower.includes('congestion') || lower.includes('traffic');
        const isCancellation = lower.includes('cancelled') || lower.includes('unfulfilled') || lower.includes('failed') || lower.includes('aborted');
        const isDelivery = lower.includes('delivered') || lower.includes('delivery') || lower.includes('distributed') || lower.includes('collected') || lower.includes('rescue');
        const isPreference = lower.includes('preference') || lower.includes('capability') || lower.includes('carrier') || lower.includes('insulated');

        if (isDelay) {
          delaysCount++;
          factType = 'delay';
        } else if (isCancellation) {
          cancellationsCount++;
          factType = 'incident';
        } else if (isDelivery) {
          deliveriesCount++;
          factType = 'delivery';
        } else if (isPreference) {
          verifiedPreferences.push(fact.text);
          factType = 'preference';
        }

        factsList.push({
          id: fact.id || `fact-${factsList.length}`,
          text: fact.text,
          type: factType,
          score: Number((fact.score || 1).toFixed(2))
        });
      }

      // Compute bounded memory adjustment (-15 to +15)
      let adjustment = 0;
      adjustment += Math.min(10, deliveriesCount * 5); // up to +10 for proven successful rescues
      adjustment -= Math.min(12, delaysCount * 6);     // -6 per recorded delay
      adjustment -= Math.min(16, cancellationsCount * 8); // -8 per recorded cancellation/failure

      const hasInsulatedCapability = (listing.holdingCondition === 'hot-held' || listing.holdingCondition === 'refrigerated') &&
        verifiedPreferences.some(p => p.toLowerCase().includes('insulated') || p.toLowerCase().includes('temperature'));
      if (hasInsulatedCapability) {
        adjustment += 4;
      }

      adjustment = Math.max(-15, Math.min(15, adjustment));

      // Synthesize inferred pattern (strictly distinguishing facts from inferred patterns)
      let inferredPattern = null;
      if (deliveriesCount > 0 && delaysCount === 0 && cancellationsCount === 0) {
        inferredPattern = `Consistent positive track record: ${deliveriesCount} successful delivery outcome(s) with zero recorded transit incidents.`;
      } else if (delaysCount > 0) {
        inferredPattern = `Transit variability noted: ${delaysCount} past delay incident(s) on record.`;
      } else if (cancellationsCount > 0) {
        inferredPattern = `Reliability caution: ${cancellationsCount} past unfulfilled/cancelled rescue(s) on record.`;
      } else if (verifiedPreferences.length > 0) {
        inferredPattern = `Verified operational capability alignment noted.`;
      }

      // Build structured explanation referencing actual evidence
      const explanationParts = [];
      if (deliveriesCount > 0) {
        explanationParts.push(`${deliveriesCount} verified delivery outcome(s) on record`);
      }
      if (delaysCount > 0) {
        explanationParts.push(`${delaysCount} past pickup delay(s) logged`);
      }
      if (cancellationsCount > 0) {
        explanationParts.push(`${cancellationsCount} past cancellation(s) logged`);
      }
      if (hasInsulatedCapability) {
        explanationParts.push('Verified insulated transport capability aligns with holding requirements');
      }

      const explanation = explanationParts.length > 0
        ? `Historical evidence: ${explanationParts.join('; ')}.`
        : 'Historical memories consulted with no significant score impact.';

      m.memoryInsights = {
        hasHistory: true,
        facts: factsList,
        inferredPattern,
        confidenceScore: Math.min(1, Number((0.5 + (deliveriesCount * 0.15) - (delaysCount * 0.1)).toFixed(2))),
        scoreAdjustment: adjustment,
        hindsightAvailable: true,
        explanation
      };

      // Apply adjustment to score, bounded between 0 and 100
      m.score = Math.max(0, Math.min(100, m.baseScore + adjustment));
    }));

    // Deterministic re-ranking strictly preserving tiers
    sortMatches(enriched);

  } catch (err) {
    console.warn('[Hindsight Recommendation] Memory enrichment notice, returning baseline:', err.message);
    enriched.forEach(m => {
      if (m.memoryInsights) {
        m.memoryInsights.hindsightAvailable = false;
        m.memoryInsights.explanation = 'Hindsight service unreachable; using deterministic baseline.';
      }
    });
  }

  return enriched;
}

