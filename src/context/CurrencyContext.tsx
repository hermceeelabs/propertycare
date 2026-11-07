import React, { createContext, useContext, useState, useEffect } from 'react';
import { store } from '../services/supabase';
import { fetchLiveExchangeRates, calculateLiveCrossRate, LiveFxState } from '../services/exchangeRateApi';

export type CurrencyCode = 'CAD' | 'USD' | 'EUR' | 'GBP' | 'NGN' | 'AED';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  exchangeRateFromCAD: number; // 1 CAD = X foreign currency
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', exchangeRateFromCAD: 1.0 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', exchangeRateFromCAD: 0.74 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateFromCAD: 0.68 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', exchangeRateFromCAD: 0.58 },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', exchangeRateFromCAD: 1180.0 },
  AED: { code: 'AED', symbol: 'AED ', name: 'UAE Dirham', exchangeRateFromCAD: 2.72 }
};

interface CurrencyContextType {
  currentCurrency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  formatMoney: (amountInCAD: number, options?: { showCode?: boolean; maximumFractionDigits?: number }) => string;
  formatNativeMoney: (amount: number, nativeCurrency: CurrencyCode, options?: { showCode?: boolean; maximumFractionDigits?: number }) => string;
  convertToCAD: (amount: number, fromCurrency: CurrencyCode) => number;
  convertFromCAD: (amountInCAD: number) => number;
  currencyConfig: CurrencyConfig;
  getExchangeRate: (from: CurrencyCode, to: CurrencyCode) => number;
  liveFx: LiveFxState | null;
  refreshLiveFx: () => Promise<void>;
  getLiveRateVsUsd: (code: CurrencyCode) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [liveFx, setLiveFx] = useState<LiveFxState | null>(null);

  const [currentCurrency, setCurrentCurrency] = useState<CurrencyCode>(() => {
    // 1. Check database state
    const dbCurrency = store.getState().currency;
    if (dbCurrency && CURRENCIES[dbCurrency]) {
      return dbCurrency;
    }
    // 2. Check localStorage
    const saved = localStorage.getItem('propertyflow_currency') as CurrencyCode;
    if (saved && CURRENCIES[saved]) {
      return saved;
    }
    return 'CAD';
  });

  const loadFxRates = async () => {
    try {
      const live = await fetchLiveExchangeRates();
      setLiveFx(live);
    } catch (e) {
      console.warn('Could not load live rates:', e);
    }
  };

  useEffect(() => {
    loadFxRates();
  }, []);

  // Sync when store state changes externally
  useEffect(() => {
    const unsub = store.subscribe(() => {
      const dbCurr = store.getState().currency;
      if (dbCurr && CURRENCIES[dbCurr] && dbCurr !== currentCurrency) {
        setCurrentCurrency(dbCurr);
      }
    });
    return () => unsub();
  }, [currentCurrency]);

  const setCurrency = (code: CurrencyCode) => {
    setCurrentCurrency(code);
    localStorage.setItem('propertyflow_currency', code);
    // Persist directly on database level
    store.setCurrency(code);
  };

  const currencyConfig = CURRENCIES[currentCurrency] || CURRENCIES.CAD;

  const convertFromCAD = (amountInCAD: number): number => {
    return amountInCAD * currencyConfig.exchangeRateFromCAD;
  };

  const convertToCAD = (amount: number, fromCurrency: CurrencyCode): number => {
    if (fromCurrency === 'CAD') return amount;
    const rateToFrom = CURRENCIES[fromCurrency]?.exchangeRateFromCAD || 1.0;
    return rateToFrom !== 0 ? amount / rateToFrom : amount;
  };

  const formatNativeMoney = (
    amount: number,
    nativeCurrency: CurrencyCode,
    options?: { showCode?: boolean; maximumFractionDigits?: number }
  ): string => {
    const cadAmount = convertToCAD(amount, nativeCurrency);
    return formatMoney(cadAmount, options);
  };

  const getExchangeRate = (from: CurrencyCode, to: CurrencyCode): number => {
    if (liveFx?.rates) {
      return calculateLiveCrossRate(from, to, liveFx.rates);
    }
    const fromRate = CURRENCIES[from]?.exchangeRateFromCAD || 1.0;
    const toRate = CURRENCIES[to]?.exchangeRateFromCAD || 1.0;
    // 1 CAD = fromRate (from), 1 CAD = toRate (to) => 1 from = (toRate / fromRate) to
    return toRate / fromRate;
  };

  const getLiveRateVsUsd = (code: CurrencyCode): number => {
    if (code === 'USD') return 1.0;
    if (liveFx?.rates && liveFx.rates[code]) {
      return liveFx.rates[code];
    }
    // Fallback based on CAD base
    const usdFromCad = CURRENCIES.USD.exchangeRateFromCAD;
    const targetFromCad = CURRENCIES[code]?.exchangeRateFromCAD || 1.0;
    return targetFromCad / usdFromCad;
  };

  const formatMoney = (
    amountInCAD: number,
    options?: { showCode?: boolean; maximumFractionDigits?: number }
  ): string => {
    const converted = convertFromCAD(amountInCAD);
    const maxDigits = options?.maximumFractionDigits !== undefined ? options.maximumFractionDigits : 2;
    const formatted = converted.toLocaleString(undefined, {
      minimumFractionDigits: maxDigits > 0 ? 2 : 0,
      maximumFractionDigits: maxDigits
    });

    const codeSuffix = options?.showCode ? ` ${currencyConfig.code}` : '';
    return `${currencyConfig.symbol}${formatted}${codeSuffix}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currentCurrency,
        setCurrency,
        formatMoney,
        formatNativeMoney,
        convertToCAD,
        convertFromCAD,
        currencyConfig,
        getExchangeRate,
        liveFx,
        refreshLiveFx: loadFxRates,
        getLiveRateVsUsd
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
