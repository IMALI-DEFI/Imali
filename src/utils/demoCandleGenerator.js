// src/utils/demoCandleGenerator.js

const roundPrice = (value) => Number(value.toFixed(2));

export function createInitialCandles({
  count = 60,
  startPrice = 64250,
  intervalSeconds = 60,
} = {}) {
  const candles = [];
  const now = Math.floor(Date.now() / 1000);

  let previousClose = startPrice;

  for (let index = count - 1; index >= 0; index -= 1) {
    const time = now - index * intervalSeconds;
    const open = previousClose;

    const movement = (Math.random() - 0.48) * startPrice * 0.002;
    const close = Math.max(1, open + movement);

    const wickSize = Math.random() * startPrice * 0.001;

    const high = Math.max(open, close) + wickSize;
    const low = Math.max(1, Math.min(open, close) - wickSize);

    candles.push({
      time,
      open: roundPrice(open),
      high: roundPrice(high),
      low: roundPrice(low),
      close: roundPrice(close),
    });

    previousClose = close;
  }

  return candles;
}

export function updateLiveCandle(
  currentCandle,
  {
    volatility = 0.0007,
    intervalSeconds = 60,
  } = {}
) {
  if (!currentCandle) return null;

  const movement =
    (Math.random() - 0.5) * currentCandle.close * volatility;

  const close = Math.max(1, currentCandle.close + movement);

  return {
    ...currentCandle,
    high: roundPrice(Math.max(currentCandle.high, close)),
    low: roundPrice(Math.min(currentCandle.low, close)),
    close: roundPrice(close),
    intervalSeconds,
  };
}

export function createNextCandle(
  previousCandle,
  intervalSeconds = 60
) {
  const open = previousCandle.close;
  const movement = (Math.random() - 0.48) * open * 0.002;
  const close = Math.max(1, open + movement);
  const wickSize = Math.random() * open * 0.001;

  return {
    time: previousCandle.time + intervalSeconds,
    open: roundPrice(open),
    high: roundPrice(Math.max(open, close) + wickSize),
    low: roundPrice(Math.max(1, Math.min(open, close) - wickSize)),
    close: roundPrice(close),
  };
}