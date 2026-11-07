import React, { useState, useMemo } from 'react';
import { ChartDataPoint } from '../types/portfolio';
import { TrendingUp, TrendingDown, BarChart2, Activity } from 'lucide-react';

interface InteractiveChartProps {
  data: ChartDataPoint[];
  symbol: string;
  title?: string;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  isLoading?: boolean;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  data,
  symbol,
  title,
  timeframe,
  onTimeframeChange,
  isLoading = false
}) => {
  const [chartMode, setChartMode] = useState<'area' | 'candlestick'>('area');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showBenchmark, setShowBenchmark] = useState<boolean>(false);

  const timeframes = ['1D', '1W', '1M', '6M', '1Y', '5Y'];

  // Calculate statistics
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return { min: 0, max: 0, startPrice: 0, endPrice: 0, change: 0, changePercent: 0, isPositive: true };
    }
    const prices = data.map(d => d.price);
    const min = Math.min(...data.map(d => chartMode === 'candlestick' ? d.low : d.price));
    const max = Math.max(...data.map(d => chartMode === 'candlestick' ? d.high : d.price));
    const startPrice = prices[0] || 0;
    const endPrice = prices[prices.length - 1] || 0;
    const change = +(endPrice - startPrice).toFixed(2);
    const changePercent = startPrice > 0 ? +((change / startPrice) * 100).toFixed(2) : 0;
    const isPositive = change >= 0;

    return { min, max, startPrice, endPrice, change, changePercent, isPositive };
  }, [data, chartMode]);

  // Chart dimensions
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 55, bottom: 35, left: 15 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Scale calculations
  const priceRange = stats.max - stats.min || 1;
  const yMin = stats.min - priceRange * 0.05;
  const yMax = stats.max + priceRange * 0.05;
  const actualYRange = yMax - yMin;

  const getY = (val: number) => {
    return padding.top + innerHeight - ((val - yMin) / actualYRange) * innerHeight;
  };

  const getX = (index: number) => {
    if (data.length <= 1) return padding.left;
    return padding.left + (index / (data.length - 1)) * innerWidth;
  };

  // Generate SVG path for area/line
  const { linePath, areaPath } = useMemo(() => {
    if (!data || data.length === 0) return { linePath: '', areaPath: '' };

    const points = data.map((d, i) => `${getX(i).toFixed(1)},${getY(d.price).toFixed(1)}`);
    const line = `M ${points.join(' L ')}`;
    const baselineY = padding.top + innerHeight;
    const area = `${line} L ${getX(data.length - 1).toFixed(1)},${baselineY} L ${getX(0).toFixed(1)},${baselineY} Z`;

    return { linePath: line, areaPath: area };
  }, [data, yMin, actualYRange]);

  // S&P 500 Benchmark line simulation
  const benchmarkPath = useMemo(() => {
    if (!showBenchmark || !data || data.length === 0) return '';
    // Normalize benchmark to start at startPrice
    const startP = data[0].price;
    const benchPoints = data.map((_, i) => {
      const benchDrift = 1 + (i / data.length) * 0.035 + Math.sin(i * 0.2) * 0.015;
      const benchVal = startP * benchDrift;
      return `${getX(i).toFixed(1)},${getY(benchVal).toFixed(1)}`;
    });
    return `M ${benchPoints.join(' L ')}`;
  }, [showBenchmark, data, yMin, actualYRange]);

  const activePoint = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : data[data.length - 1];
  const activeChange = activePoint
    ? +(activePoint.price - (data[0]?.price || activePoint.price)).toFixed(2)
    : stats.change;
  const activeChangePct = data[0]?.price
    ? +((activeChange / data[0].price) * 100).toFixed(2)
    : stats.changePercent;
  const isCurrentlyPositive = activeChange >= 0;

  // Horizontal price grid lines
  const gridTicks = useMemo(() => {
    const ticks = [];
    const step = actualYRange / 4;
    for (let i = 0; i <= 4; i++) {
      const val = yMin + step * i;
      ticks.push({ val, y: getY(val) });
    }
    return ticks;
  }, [yMin, actualYRange]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
      {/* Chart Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              {title || `${symbol} Real-Time Chart`}
            </h3>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              LIVE FEED
            </span>
          </div>

          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-3xl font-bold tracking-tight text-white font-mono-numbers">
              ${activePoint ? activePoint.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
            </span>
            <div className={`flex items-center gap-1 font-mono-numbers font-medium text-sm ${isCurrentlyPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isCurrentlyPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{isCurrentlyPositive ? '+' : ''}${activeChange.toFixed(2)}</span>
              <span>({isCurrentlyPositive ? '+' : ''}{activeChangePct.toFixed(2)}%)</span>
              <span className="text-slate-500 text-xs ml-1">in {timeframe}</span>
            </div>
          </div>
        </div>

        {/* Chart Controls & Timeframe Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Type Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setChartMode('area')}
              className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
                chartMode === 'area' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Line / Area Chart"
            >
              <Activity className="w-3.5 h-3.5" />
              Line
            </button>
            <button
              onClick={() => setChartMode('candlestick')}
              className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
                chartMode === 'candlestick' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Candlestick Chart"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Candles
            </button>
          </div>

          {/* Benchmark Compare */}
          <button
            onClick={() => setShowBenchmark(!showBenchmark)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              showBenchmark
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            vs S&P 500
          </button>

          {/* Timeframe Buttons */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            {timeframes.map(tf => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-all ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full h-[300px]">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-20">
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              Updating market data...
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible select-none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const svgX = (mouseX / rect.width) * width;
            if (svgX >= padding.left && svgX <= width - padding.right && data.length > 1) {
              const ratio = (svgX - padding.left) / innerWidth;
              const idx = Math.min(Math.max(0, Math.round(ratio * (data.length - 1))), data.length - 1);
              setHoverIndex(idx);
            }
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="chartGradientPositive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="90%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="chartGradientNegative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
              <stop offset="90%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-axis labels */}
          {gridTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={width - padding.right}
                y2={tick.y}
                stroke="#1e293b"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={width - padding.right + 8}
                y={tick.y + 4}
                fill="#64748b"
                fontSize="10"
                fontFamily="JetBrains Mono"
                textAnchor="start"
              >
                ${tick.val.toFixed(tick.val >= 1000 ? 0 : 2)}
              </text>
            </g>
          ))}

          {/* Benchmark comparison line if enabled */}
          {showBenchmark && benchmarkPath && (
            <path
              d={benchmarkPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.8"
            />
          )}

          {/* Render Area or Candlestick */}
          {chartMode === 'area' ? (
            <>
              {/* Gradient Area */}
              <path
                d={areaPath}
                fill={stats.isPositive ? 'url(#chartGradientPositive)' : 'url(#chartGradientNegative)'}
              />
              {/* Main Line */}
              <path
                d={linePath}
                fill="none"
                stroke={stats.isPositive ? '#10b981' : '#f43f5e'}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Live Ticker Endpoint Pulsing Dot */}
              {data.length > 0 && (
                <g>
                  <circle
                    cx={getX(data.length - 1)}
                    cy={getY(data[data.length - 1].price)}
                    r="4"
                    fill={stats.isPositive ? '#10b981' : '#f43f5e'}
                  />
                  <circle
                    cx={getX(data.length - 1)}
                    cy={getY(data[data.length - 1].price)}
                    r="9"
                    fill={stats.isPositive ? '#10b981' : '#f43f5e'}
                    opacity="0.3"
                    className="animate-ping"
                  />
                </g>
              )}
            </>
          ) : (
            /* Candlestick Rendering */
            <g>
              {data.map((d, i) => {
                const x = getX(i);
                const openY = getY(d.open);
                const closeY = getY(d.close);
                const highY = getY(d.high);
                const lowY = getY(d.low);
                const isGreen = d.close >= d.open;
                const candleColor = isGreen ? '#10b981' : '#f43f5e';
                const bodyTop = Math.min(openY, closeY);
                const bodyHeight = Math.max(Math.abs(closeY - openY), 2);
                const candleWidth = Math.max(innerWidth / data.length * 0.65, 3);

                return (
                  <g key={i}>
                    {/* Wick */}
                    <line
                      x1={x}
                      y1={highY}
                      x2={x}
                      y2={lowY}
                      stroke={candleColor}
                      strokeWidth="1.2"
                    />
                    {/* Body */}
                    <rect
                      x={x - candleWidth / 2}
                      y={bodyTop}
                      width={candleWidth}
                      height={bodyHeight}
                      fill={isGreen ? '#10b981' : '#f43f5e'}
                      rx="1"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Hover Crosshair & Details Tooltip */}
          {hoverIndex !== null && data[hoverIndex] && (
            <g>
              {/* Vertical Crosshair Line */}
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={padding.top + innerHeight}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {/* Point Indicator */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(data[hoverIndex].price)}
                r="5"
                fill="#ffffff"
                stroke={stats.isPositive ? '#10b981' : '#f43f5e'}
                strokeWidth="2.5"
              />
            </g>
          )}
        </svg>

        {/* Dynamic Tooltip Overlay */}
        {hoverIndex !== null && data[hoverIndex] && (
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full bg-slate-950/95 border border-slate-700/80 px-3 py-2 rounded-lg shadow-2xl z-30 text-xs backdrop-blur-md"
            style={{
              left: `${(getX(hoverIndex) / width) * 100}%`,
              top: `${Math.max(getY(data[hoverIndex].price) - 12, 35)}px`
            }}
          >
            <div className="text-slate-400 font-mono text-[11px] mb-1">{data[hoverIndex].time}</div>
            <div className="font-bold text-white text-sm font-mono-numbers">
              ${data[hoverIndex].price.toFixed(2)}
            </div>
            {chartMode === 'candlestick' && (
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1 text-[10px] text-slate-400 font-mono">
                <div>O: ${data[hoverIndex].open.toFixed(2)}</div>
                <div>C: ${data[hoverIndex].close.toFixed(2)}</div>
                <div>H: ${data[hoverIndex].high.toFixed(2)}</div>
                <div>L: ${data[hoverIndex].low.toFixed(2)}</div>
              </div>
            )}
            <div className="text-slate-400 text-[10px] mt-1 font-mono">
              Vol: {data[hoverIndex].volume.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info: Range bounds & benchmark legend */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400 font-mono">
        <div>
          Period Range: <span className="text-slate-200">${stats.min.toFixed(2)}</span> - <span className="text-slate-200">${stats.max.toFixed(2)}</span>
        </div>
        {showBenchmark && (
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2.5 h-0.5 bg-amber-400 border-dashed inline-block"></span>
            S&P 500 Normalized Index
          </div>
        )}
      </div>
    </div>
  );
};
