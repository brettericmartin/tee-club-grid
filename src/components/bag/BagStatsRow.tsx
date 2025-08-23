import { FC } from 'react';
import { formatCompactNumber, formatCompactCurrency } from '@/lib/formatters';

interface BagStatsRowProps {
  totalItems: number;
  bagTees: number;
  views: number;
  estimatedValue: number;
  className?: string;
}

const BagStatsRow: FC<BagStatsRowProps> = ({
  totalItems,
  bagTees,
  views,
  estimatedValue,
  className = ""
}) => {
  const formatValue = (value: number) => {
    return formatCompactNumber(value);
  };

  const stats = [
    {
      label: "Total Items",
      value: totalItems,
      format: formatValue
    },
    {
      label: "Bag Tees",
      value: bagTees,
      format: formatValue
    },
    {
      label: "Views",
      value: views,
      format: formatValue
    },
    {
      label: "Est. Value",
      value: estimatedValue,
      format: (val) => formatCompactCurrency(val)
    }
  ];

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-1 gap-2 sm:gap-3 ${className}`}>
      {stats.map((stat, index) => (
        <div 
          key={stat.label}
          className="bg-gray-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center"
        >
          <p className="text-lg sm:text-2xl font-bold text-primary">
            {stat.format(stat.value)}
          </p>
          <p className="text-white/70 text-xs sm:text-sm mt-0.5 sm:mt-1">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
};

export default BagStatsRow;