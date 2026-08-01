// src/components/charts/CandlestickChart.jsx

import React, { memo, useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
} from "lightweight-charts";

function CandlestickChart({
  data = [],
  height = 360,
  liveCandle = null,
  showGrid = true,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return undefined;

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: {
          type: ColorType.Solid,
          color: "transparent",
        },
        textColor: "rgba(255,255,255,0.65)",
      },
      grid: {
        vertLines: {
          visible: showGrid,
          color: "rgba(255,255,255,0.05)",
        },
        horzLines: {
          visible: showGrid,
          color: "rgba(255,255,255,0.05)",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.10)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.10)",
        timeVisible: true,
        secondsVisible: true,
        rightOffset: 5,
        barSpacing: 10,
      },
      crosshair: {
        vertLine: {
          color: "rgba(34,211,238,0.40)",
          labelBackgroundColor: "#0891b2",
        },
        horzLine: {
          color: "rgba(34,211,238,0.40)",
          labelBackgroundColor: "#0891b2",
        },
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
      priceLineVisible: true,
      lastValueVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    if (data.length > 0) {
      candlestickSeries.setData(data);
      chart.timeScale().fitContent();
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry || !chartRef.current) return;

      chartRef.current.applyOptions({
        width: entry.contentRect.width,
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();

      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height, showGrid]);

  useEffect(() => {
    if (!seriesRef.current || !data.length) return;

    seriesRef.current.setData(data);
  }, [data]);

  useEffect(() => {
    if (!seriesRef.current || !liveCandle) return;

    seriesRef.current.update(liveCandle);
  }, [liveCandle]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-2xl"
      style={{ height }}
    />
  );
}

export default memo(CandlestickChart);