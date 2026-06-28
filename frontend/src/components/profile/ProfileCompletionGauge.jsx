import { useMemo } from 'react';

export default function ProfileCompletionGauge({ percentage, size = 'md' }) {
  const sizeClasses = {
    sm: { svg: 80, stroke: 6, radius: 32 },
    md: { svg: 120, stroke: 8, radius: 48 },
    lg: { svg: 160, stroke: 10, radius: 64 },
  };

  const dimensions = sizeClasses[size];
  const circumference = 2 * Math.PI * dimensions.radius;
  const offset = circumference - (percentage / 100) * circumference;

  const colorClass = useMemo(() => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 50) return 'text-orange-500';
    return 'text-red-500';
  }, [percentage]);

  const strokeColorClass = useMemo(() => {
    if (percentage >= 80) return 'stroke-green-500';
    if (percentage >= 50) return 'stroke-orange-500';
    return 'stroke-red-500';
  }, [percentage]);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: dimensions.svg, height: dimensions.svg }}>
        <svg
          width={dimensions.svg}
          height={dimensions.svg}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={dimensions.svg / 2}
            cy={dimensions.svg / 2}
            r={dimensions.radius}
            stroke="currentColor"
            strokeWidth={dimensions.stroke}
            fill="none"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx={dimensions.svg / 2}
            cy={dimensions.svg / 2}
            r={dimensions.radius}
            stroke="currentColor"
            strokeWidth={dimensions.stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`${strokeColorClass} transition-all duration-500`}
          />
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-2xl font-bold ${colorClass}`}>
              {percentage}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Complete</div>
          </div>
        </div>
      </div>
    </div>
  );
}

