// src/context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import socketService from '../services/socketService';
import { useAuth } from './AuthContext';

// Create and export the context
export const SocketContext = createContext(null);

// ✅ Export the useSocket hook
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    console.warn('useSocket used outside of SocketProvider - returning mock');
    return {
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      reconnect: () => {},
      socket: null,
      lastTrade: null,
      lastPnlUpdate: null,
      trades: [],
      announcements: [],
      liveStats: {
        totalTrades: 0,
        totalPnl: 0,
        activeBots: 0,
        winRate: 0,
        wins: 0,
        losses: 0,
        totalReferrals: 0,
        totalRewardsPaid: 0,
        activeUsers: 0
      },
      botStatuses: [],
      leaderboard: [],
      referralEvents: [],
      systemMetrics: { cpu: 0, memory: 0, active_users: 0, tps: 0 },
      subscribeToTrades: () => {},
      subscribeToPnl: () => {},
      subscribeToAnnouncements: () => {},
      subscribeToReferrals: () => {},
      subscribeToLeaderboard: () => {},
      subscribeToSystemMetrics: () => {},
      clearAnnouncements: () => {},
      clearTrades: () => {},
      clearReferralEvents: () => {}
    };
  }
  return context;
};

// ✅ Export the useSafeSocket hook
export const useSafeSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    return {
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      reconnect: () => {},
      socket: null,
      lastTrade: null,
      lastPnlUpdate: null,
      trades: [],
      announcements: [],
      liveStats: {
        totalTrades: 0,
        totalPnl: 0,
        activeBots: 0,
        winRate: 0,
        wins: 0,
        losses: 0,
        totalReferrals: 0,
        totalRewardsPaid: 0,
        activeUsers: 0
      },
      botStatuses: [],
      leaderboard: [],
      referralEvents: [],
      systemMetrics: { cpu: 0, memory: 0, active_users: 0, tps: 0 },
      subscribeToTrades: () => {},
      subscribeToPnl: () => {},
      subscribeToAnnouncements: () => {},
      subscribeToReferrals: () => {},
      subscribeToLeaderboard: () => {},
      subscribeToSystemMetrics: () => {},
      clearAnnouncements: () => {},
      clearTrades: () => {},
      clearReferralEvents: () => {}
    };
  }
  return context;
};

// ... rest of SocketProvider component
export function SocketProvider({ children }) {
  // ... (keep your existing SocketProvider implementation)
}

export default SocketProvider;
