import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Alert,
  Paper,
  Grid,
  LinearProgress
} from "@mui/material";
import { 
  FaChartLine,
  FaUsers,
  FaWallet,
  FaRobot
} from "react-icons/fa";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const AdminPanel = () => {
  const { account, connectWallet, isConnecting } = useWallet();
  const [isOwner, setIsOwner] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    loading: true,
    error: null,
    data: [],
    prediction: ""
  });
  const [contractState, setContractState] = useState({
    loading: false,
    error: null,
    success: null
  });

  // Improved fetch analytics with better error handling
  const fetchAnalytics = async () => {
    try {
      setAnalyticsData(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('/api/analytics');
      
      // First check if response is HTML (error page)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.indexOf('text/html') !== -1) {
        const text = await response.text();
        throw new Error('Server returned HTML instead of JSON. The API endpoint may be misconfigured.');
      }
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate the response structure
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format from API');
      }
      
      // Generate simple trend prediction
      const prediction = generateTrendPrediction(data);
      
      setAnalyticsData({
        loading: false,
        error: null,
        data,
        prediction
      });
    } catch (error) {
      console.error("Analytics fetch error:", error);
      
      // Fallback to sample data if API fails
      const fallbackData = generateSampleData();
      const prediction = generateTrendPrediction(fallbackData);
      
      setAnalyticsData({
        loading: false,
        error: error.message,
        data: fallbackData,
        prediction
      });
    }
  };

  // Generate sample data for fallback
  const generateSampleData = () => {
    const data = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        activeUsers: Math.floor(Math.random() * 1000) + 500
      });
    }
    return data;
  };

  // Generate trend prediction
  const generateTrendPrediction = (data) => {
    if (!data || data.length < 7) return "Insufficient data for prediction";
    
    const lastWeek = data.slice(-7);
    const total = lastWeek.reduce((sum, day) => sum + day.activeUsers, 0);
    const avg = total / 7;
    const latest = data[data.length - 1].activeUsers;
    
    if (latest > avg * 1.2) return "📈 Strong upward trend detected";
    if (latest < avg * 0.8) return "📉 Downward trend detected";
    return "➡️ Traffic is stable";
  };

  // Check ownership (simplified for example)
  const checkOwnership = async () => {
    // Your ownership check logic here
    setIsOwner(true); // Temporarily set to true for demo
  };

  // Contract interaction handlers
  const handleContractAction = async (action) => {
    try {
      setContractState({ loading: true, error: null, success: null });
      // Your contract interaction logic here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async call
      setContractState({ 
        loading: false, 
        error: null, 
        success: `${action} executed successfully` 
      });
    } catch (error) {
      setContractState({
        loading: false,
        error: error.message,
        success: null
      });
    }
  };

  useEffect(() => {
    if (account) {
      checkOwnership();
      fetchAnalytics();
    }
  }, [account]);

  // Chart data configuration
  const chartData = {
    labels: analyticsData.data.map(d => d.date),
    datasets: [
      {
        label: 'Active Users',
        data: analyticsData.data.map(d => d.activeUsers),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'User Activity (Last 30 Days)',
      },
    },
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Admin Dashboard
      </Typography>

      {/* Wallet Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {!account ? (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              style={{
                padding: '10px 20px',
                background: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <Box>
              <Typography variant="body1">
                <FaWallet style={{ marginRight: 8 }} />
                Connected: {`${account.slice(0, 6)}...${account.slice(-4)}`}
              </Typography>
              <Typography 
                variant="body2" 
                color={isOwner ? "success.main" : "error.main"}
                sx={{ mt: 1 }}
              >
                {isOwner ? "Owner Access" : "Unauthorized"}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Analytics Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 2 }}>
            <FaChartLine style={{ marginRight: 8 }} />
            Analytics Dashboard
          </Typography>
          
          {analyticsData.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {analyticsData.error && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {analyticsData.error} - Showing sample data
                </Alert>
              )}
              <Box sx={{ height: 400 }}>
                <Line data={chartData} options={chartOptions} />
              </Box>
              {analyticsData.prediction && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {analyticsData.prediction}
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Admin Controls */}
      {isOwner && (
        <Card>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 2 }}>
              <FaRobot style={{ marginRight: 8 }} />
              Admin Controls
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <button
                  onClick={() => handleContractAction("Buyback")}
                  disabled={contractState.loading}
                  className="admin-button"
                >
                  Trigger Buyback
                </button>
              </Grid>
              <Grid item xs={12} sm={4}>
                <button
                  onClick={() => handleContractAction("Airdrop")}
                  disabled={contractState.loading}
                  className="admin-button"
                >
                  Execute Airdrop
                </button>
              </Grid>
              <Grid item xs={12} sm={4}>
                <button
                  onClick={() => handleContractAction("Liquidity")}
                  disabled={contractState.loading}
                  className="admin-button"
                >
                  Add Liquidity
                </button>
              </Grid>
            </Grid>

            {contractState.loading && (
              <LinearProgress sx={{ mt: 2 }} />
            )}
            {contractState.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {contractState.error}
              </Alert>
            )}
            {contractState.success && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {contractState.success}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AdminPanel;
