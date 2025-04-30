import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getContractInstance } from "../utils/contracts";
import { 
  LineChart, 
  AdminControls, 
  WalletStatus, 
  LoadingSpinner,
  ErrorAlert
} from "../components/AdminComponents";
import {
  FaUsers, 
  FaRobot, 
  FaWallet,
  FaChartLine
} from "react-icons/fa";

const AdminPanel = () => {
  const { account, connectWallet, isConnecting } = useWallet();
  const [isOwner, setIsOwner] = useState(false);
  const [analytics, setAnalytics] = useState({
    data: [],
    loading: true,
    error: null,
    prediction: ""
  });
  const [contractState, setContractState] = useState({
    loading: false,
    error: null,
    success: null
  });

  // Check if connected wallet is the contract owner
  useEffect(() => {
    const checkOwnership = async () => {
      if (!account) {
        setIsOwner(false);
        return;
      }

      try {
        const lendingContract = await getContractInstance("Lending");
        const owner = await lendingContract.owner();
        setIsOwner(account.toLowerCase() === owner.toLowerCase());
      } catch (error) {
        console.error("Ownership check failed:", error);
        setIsOwner(false);
      }
    };

    checkOwnership();
  }, [account]);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setAnalytics(prev => ({ ...prev, loading: true, error: null }));
        
        const response = await fetch("/api/analytics");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.message || "Analytics fetch failed");
        }

        // Generate simple trend prediction
        const prediction = generateTrendPrediction(data);
        
        setAnalytics({
          data,
          loading: false,
          error: null,
          prediction
        });

      } catch (error) {
        console.error("Analytics fetch error:", error);
        setAnalytics({
          data: [],
          loading: false,
          error: error.message,
          prediction: ""
        });
      }
    };

    fetchAnalytics();
  }, []);

  // Generate simple trend prediction
  const generateTrendPrediction = (data) => {
    if (data.length < 2) return "Not enough data for prediction";
    
    const lastWeek = data.slice(-7);
    const total = lastWeek.reduce((sum, day) => sum + day.activeUsers, 0);
    const avg = total / lastWeek.length;
    
    if (data[data.length - 1].activeUsers > avg * 1.2) {
      return "📈 Strong upward trend detected!";
    } else if (data[data.length - 1].activeUsers < avg * 0.8) {
      return "📉 Downward trend detected";
    }
    return "➡️ Traffic is stable";
  };

  // Execute contract function
  const executeContractFunction = async (contractName, functionName, args = []) => {
    try {
      setContractState({ loading: true, error: null, success: null });
      
      const contract = await getContractInstance(contractName);
      const tx = await contract[functionName](...args);
      await tx.wait();
      
      setContractState({ 
        loading: false, 
        error: null, 
        success: `${functionName} executed successfully` 
      });
      
    } catch (error) {
      console.error(`${functionName} error:`, error);
      setContractState({
        loading: false,
        error: error.message || `Failed to execute ${functionName}`,
        success: null
      });
    }
  };

  return (
    <div className="admin-container">
      {/* Header Section */}
      <header className="admin-header">
        <h1>
          <FaChartLine className="icon" />
          Admin Dashboard
        </h1>
      </header>

      {/* Wallet Connection Status */}
      <WalletStatus 
        account={account}
        isOwner={isOwner}
        isConnecting={isConnecting}
        onConnect={connectWallet}
      />

      {/* Contract Execution Controls */}
      {isOwner && (
        <section className="admin-section">
          <h2>
            <FaRobot className="icon" />
            Contract Controls
          </h2>
          
          <AdminControls
            onBuyback={() => executeContractFunction("Buyback", "distribute")}
            onAirdrop={() => executeContractFunction("Airdrop", "executeAirdrop")}
            onLiquidity={() => executeContractFunction("Liquidity", "addLiquidity")}
            loading={contractState.loading}
          />
          
          {contractState.error && (
            <ErrorAlert message={contractState.error} />
          )}
          {contractState.success && (
            <div className="success-message">
              {contractState.success}
            </div>
          )}
        </section>
      )}

      {/* Analytics Section */}
      <section className="admin-section">
        <h2>
          <FaUsers className="icon" />
          User Analytics (30 Days)
        </h2>
        
        {analytics.loading ? (
          <LoadingSpinner />
        ) : analytics.error ? (
          <ErrorAlert message={analytics.error} />
        ) : (
          <>
            <LineChart 
              data={analytics.data}
              labels={analytics.data.map(d => d.date)}
              values={analytics.data.map(d => d.activeUsers)}
            />
            {analytics.prediction && (
              <div className="trend-prediction">
                {analytics.prediction}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default AdminPanel;
