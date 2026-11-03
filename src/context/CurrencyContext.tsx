import React, { createContext, useContext, useState, useEffect } from 'react';

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
  convertFromCAD: (amountInCAD: number) => number;
  currencyConfig: CurrencyConfig;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyCode>(() => {
    return (localStorage.getItem('propertyflow_currency') as CurrencyCode) || 'CAD';
  });

  const setCurrency = (code: CurrencyCode) => {
    setCurrentCurrency(code);
    localStorage.setItem('propertyflow_currency', code);
  };

  const currencyConfig = CURRENCIES[currentCurrency] || CURRENCIES.CAD;

  const convertFromCAD = (amountInCAD: number): number => {
    return amountInCAD * currencyConfig.exchangeRateFromCAD;
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
        convertFromCAD,
        currencyConfig
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
