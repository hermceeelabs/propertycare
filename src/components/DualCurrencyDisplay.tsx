import React from 'react';
import { useCurrency, CurrencyCode } from '../context/CurrencyContext';

interface DualCurrencyDisplayProps {
  amount: number;
  nativeCurrency?: CurrencyCode;
  sourceCurrency?: CurrencyCode; // Alias for nativeCurrency for backwards compatibility
  className?: string;
  primaryClassName?: string;
  amountClassName?: string; // Alias for primaryClassName
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
  nativeCurrency,
  sourceCurrency,
  className = 'inline-flex items-baseline gap-1.5 flex-wrap',
  primaryClassName,
  amountClassName,
  secondaryClassName = 'text-[11px] text-stone-400 font-normal whitespace-nowrap',
  prefix = ''
}) => {
  const { formatDualCurrency } = useCurrency();
  const effectiveNativeCurrency = nativeCurrency || sourceCurrency || 'CAD';
  const effectivePrimaryClass = primaryClassName || amountClassName || 'font-bold text-stone-900';
  const { primary, secondary, isConverted } = formatDualCurrency(amount, effectiveNativeCurrency);

  return (
    <span className={className}>
      <span className={effectivePrimaryClass}>
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
