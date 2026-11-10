import React from 'react';
import { useCurrency, CurrencyCode } from '../context/CurrencyContext';

interface DualCurrencyDisplayProps {
  amount: number;
  nativeCurrency?: CurrencyCode;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
  prefix?: string; // e.g. '-' or '+'
  showOriginCode?: boolean;
}

/**
 * Universal Dual-Currency Display Component
 * Renders the primary converted amount based on active live FX rates,
 * and if native currency differs from active target currency, renders
 * the exact original fixed native value side by side.
 */
export const DualCurrencyDisplay: React.FC<DualCurrencyDisplayProps> = ({
  amount,
  nativeCurrency = 'CAD',
  className = 'inline-flex items-baseline gap-1.5 flex-wrap',
  primaryClassName = 'font-bold text-stone-900',
  secondaryClassName = 'text-[11px] text-stone-400 font-normal whitespace-nowrap',
  prefix = ''
}) => {
  const { formatDualCurrency } = useCurrency();
  const { primary, secondary, isConverted } = formatDualCurrency(amount, nativeCurrency);

  return (
    <span className={className}>
      <span className={primaryClassName}>
        {prefix}{primary}
      </span>
      {isConverted && secondary && (
        <span className={secondaryClassName}>
          {prefix ? `(${prefix}${secondary.replace('(', '').replace(')', '')})` : secondary}
        </span>
      )}
    </span>
  );
};
