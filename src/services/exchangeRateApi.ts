/**
 * Live Exchange Rate & Currency API Service
 * Uses open.er-api.com (open, CORS-enabled, reliable financial FX feed)
 * with localStorage caching and offline fallback to ensure instant loading.
 */

import { CurrencyCode, CURRENCIES } from '../context/CurrencyContext';

const CACHE_KEY = 'propertyflow_live_fx_rates';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

export interface ExchangeRateApiResponse {
  result: string;
  provider: string;
  time_last_update_utc: string;
  time_next_update_utc: string;
  base_code: string;
  rates: Record<string, number>;
}

export interface LiveFxState {
  rates: Record<string, number>; // USD based rates: rates['NGN'], rates['CAD'], etc.
  lastUpdated: string;
  isLive: boolean;
  source: string;
}

// Default fallback rates (USD based) in case network is disconnected
const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1.0,
  CAD: 1.41,
  EUR: 0.90,
  GBP: 0.75,
  NGN: 1348.0,
  AED: 3.6725
};

export async function fetchLiveExchangeRates(): Promise<LiveFxState> {
  // 1. Check cache first
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      const isFresh = Date.now() - (parsed.timestamp || 0) < CACHE_TTL_MS;
      if (isFresh && parsed.rates) {
        return {
          rates: parsed.rates,
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
          isLive: true,
          source: 'Live FX Feed (Cached)'
        };
      }
    }
  } catch (err) {
    console.warn('FX cache read error:', err);
  }

  // 2. Fetch fresh rates from live open exchange rates endpoint
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: ExchangeRateApiResponse = await res.json();

    if (data && data.rates) {
      const liveState: LiveFxState = {
        rates: {
          ...FALLBACK_USD_RATES,
          ...data.rates
        },
        lastUpdated: data.time_last_update_utc || new Date().toISOString(),
        isLive: true,
        source: 'Live Exchange Rate API (open.er-api.com)'
      };

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          rates: liveState.rates,
          lastUpdated: liveState.lastUpdated,
          timestamp: Date.now()
        }));
      } catch (e) {
        // LocalStorage quota error guard
      }

      return liveState;
    }
  } catch (error) {
    console.warn('Live FX fetch failed, falling back to static/cached benchmark:', error);
  }

  // 3. Fallback
  return {
    rates: FALLBACK_USD_RATES,
    lastUpdated: new Date().toISOString(),
    isLive: false,
    source: 'Default Benchmark Rates'
  };
}

/**
 * Calculates current market rate between any two currency codes
 */
export function calculateLiveCrossRate(
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Record<string, number>
): number {
  const fromRate = rates[from] || FALLBACK_USD_RATES[from] || 1.0;
  const toRate = rates[to] || FALLBACK_USD_RATES[to] || 1.0;
  // 1 USD = fromRate [from], 1 USD = toRate [to]
  // 1 [from] = (toRate / fromRate) [to]
  return toRate / fromRate;
}
