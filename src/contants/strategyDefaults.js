// src/constants/strategyDefaults.js
export const DEFAULT_STRATEGY_CONFIG = {
  risk_level: 'medium',
  max_position_size: 1000,
  daily_trade_limit: 50,
  stop_loss_percent: 5,
  take_profit_percent: 10,
  allowed_assets: ['BTC', 'ETH', 'SOL'],
};

export const RISK_LEVELS = [
  { value: 'low', label: 'Low Risk', color: 'green', description: 'Conservative trading with tight stop losses' },
  { value: 'medium', label: 'Medium Risk', color: 'yellow', description: 'Balanced approach with moderate risk' },
  { value: 'high', label: 'High Risk', color: 'red', description: 'Aggressive trading for higher returns' },
];

export const STRATEGY_TEMPLATES = [
  {
    id: 'mean_reversion_template',
    name: 'Mean Reversion',
    description: 'Buys dips and sells rips',
    config: {
      strategy_type: 'mean_reversion',
      lookback_period: 20,
      deviation_threshold: 2,
    },
  },
  {
    id: 'momentum_template',
    name: 'Momentum',
    description: 'Follows strong trends',
    config: {
      strategy_type: 'momentum',
      lookback_period: 14,
      momentum_threshold: 5,
    },
  },
  {
    id: 'ai_weighted_template',
    name: 'AI Weighted',
    description: 'Smart signal combination',
    config: {
      strategy_type: 'ai_weighted',
      weights: {
        momentum: 0.3,
        volume: 0.3,
        sentiment: 0.4,
      },
    },
  },
];