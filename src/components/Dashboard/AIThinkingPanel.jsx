import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { FaBrain, FaCheckCircle } from "react-icons/fa";

const GlassCard = ({ children, className = "", contentClassName = "p-4 sm:p-5 md:p-6", gradient = "from-emerald-500/10 to-cyan-500/10" }) => (
  <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br ${gradient} backdrop-blur-xl shadow-xl ${className}`}>
    <div className="absolute inset-0 bg-white/5" />
    <div className={`relative z-10 ${contentClassName}`}>{children}</div>
  </div>
);

const AIThinkingPanel = ({ strategy, stats, effectiveTier }) => {
  const signal = useMemo(() => ({
    regime: strategy?.regime || "Neutral",
    confidence: strategy?.confidence || 50,
    reasoning: strategy?.reasoning || ["Awaiting analysis..."],
    decision: strategy?.decision || "WAIT",
  }), [strategy]);

  const isDemo = effectiveTier === "starter";

  return (
    <GlassCard contentClassName="p-4 sm:p-5">
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <FaBrain className="text-cyan-400 text-lg sm:text-xl" />
        <h3 className="text-base sm:text-lg font-bold text-white">AI Analysis</h3>
        <span className={`ml-auto text-[10px] sm:text-xs ${isDemo ? 'text-cyan-400' : 'text-emerald-400'} animate-pulse`}>
          ● {isDemo ? 'SIMULATED' : 'LIVE'}
        </span>
        {strategy?.name && (
          <span className="text-[10px] sm:text-xs text-white/30">
            {strategy.name}
          </span>
        )}
      </div>
      
      <div className="space-y-2 sm:space-y-3">
        <div className="flex justify-between items-center p-1.5 sm:p-2 rounded-xl bg-white/5">
          <span className="text-white/60 text-xs sm:text-sm">Market Regime</span>
          <span className={`font-bold text-xs sm:text-sm ${signal.regime === 'Bullish' ? 'text-emerald-400' : signal.regime === 'Bearish' ? 'text-red-400' : 'text-yellow-400'}`}>
            {signal.regime}
          </span>
        </div>
        
        <div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-white/60">Confidence</span>
            <span className="text-white font-bold">{signal.confidence}%</span>
          </div>
          <div className="mt-1 h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, signal.confidence))}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
        
        <div>
          <span className="text-white/60 text-[10px] sm:text-xs">Reasoning</span>
          <ul className="mt-0.5 sm:mt-1 space-y-0.5">
            {Array.isArray(signal.reasoning) && signal.reasoning.length > 0 ? (
              signal.reasoning.map((item, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-white/70"
                >
                  <FaCheckCircle className="text-emerald-400 text-[8px] sm:text-[10px] flex-shrink-0" />
                  <span className="truncate">{item}</span>
                </motion.li>
              ))
            ) : (
              <li className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-white/70">
                <FaCheckCircle className="text-emerald-400 text-[8px] sm:text-[10px] flex-shrink-0" />
                <span className="truncate">No analysis available</span>
              </li>
            )}
          </ul>
        </div>
        
        <div className="flex justify-between items-center pt-1.5 sm:pt-2 border-t border-white/10">
          <span className="text-white/60 text-xs sm:text-sm">Decision</span>
          <motion.span
            key={signal.decision}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className={`font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs ${
              signal.decision === 'LONG' || signal.decision === 'BUY' || signal.decision === 'ACCUMULATE'
                ? 'bg-emerald-500/20 text-emerald-400' 
              : signal.decision === 'SHORT' || signal.decision === 'SELL' || signal.decision === 'REDUCE'
                ? 'bg-red-500/20 text-red-400' 
              : 'bg-yellow-500/20 text-yellow-400'
            }`}
          >
            {signal.decision}
          </motion.span>
        </div>

        {isDemo && (
          <div className="text-[10px] text-white/20 text-center mt-2 border-t border-white/5 pt-2">
            💡 Analysis is simulated for demo purposes
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default AIThinkingPanel;
