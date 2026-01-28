import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../../context/WalletContext";
import getContractInstance from "../../getContractInstance";
import { FaTrophy, FaTicketAlt, FaHistory, FaInfoCircle } from "react-icons/fa";
import Countdown from "react-countdown";

const LPLottery = () => {
  const { account, chainId } = useWallet();
  const [lotteryContract, setLotteryContract] = useState(null);
  const [lotteryData, setLotteryData] = useState({
    active: false,
    lastWinner: "—",
    lastPrize: "—",
    prizePool: "0",
    tickets: 0,
    endTime: 0,
    userTickets: 0,
  });
  const [lpBalance, setLpBalance] = useState("0");
  const [ticketAmount, setTicketAmount] = useState("1");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ message: "", type: "" });

  useEffect(() => {
    const initContracts = async () => {
      if (!account || !chainId) return;

      try {
        const lottery = await getContractInstance("LPLottery");
        const lpToken = await getContractInstance("LPToken");

        setLotteryContract(lottery);

        const [
          active,
          prizePool,
          lastTime,
          userTickets,
          balance,
          ticketCount,
        ] = await Promise.all([
          lottery.lotteryActive(),
          lottery.prizePool(),
          lottery.lastLotteryTime(),
          lottery.tickets(account),
          lpToken.balanceOf(account),
          lottery.tickets(account),
        ]);

        setLotteryData((prev) => ({
          ...prev,
          active,
          prizePool: ethers.utils.formatUnits(prizePool, 18),
          endTime: (Number(lastTime) + 604800) * 1000, // 7 days in ms
          tickets: ticketCount.toString(),
          userTickets: userTickets.toString(),
        }));

        setLpBalance(ethers.utils.formatUnits(balance, 18));

        // Setup WinnerSelected event listener
        lottery.on("WinnerSelected", (winner, prize) => {
          setLotteryData((prev) => ({
            ...prev,
            lastWinner: `${winner.slice(0, 6)}...${winner.slice(-4)}`,
            lastPrize: ethers.utils.formatUnits(prize, 18),
          }));
          setStatus({ 
            message: `New winner selected! ${winner.slice(0, 6)}...${winner.slice(-4)} won ${ethers.utils.formatUnits(prize, 18)} IMALI!`, 
            type: "success" 
          });
        });
      } catch (err) {
        console.error("LPLottery init error:", err);
        setStatus({ message: "Failed to initialize lottery", type: "error" });
      }
    };

    initContracts();

    return () => {
      if (lotteryContract) {
        lotteryContract.removeAllListeners("WinnerSelected");
      }
    };
  }, [account, chainId]);

  const enterLottery = async () => {
    if (!account || !lotteryContract || !ticketAmount) {
      setStatus({ message: "Please connect wallet and enter amount", type: "error" });
      return;
    }

    const amount = parseFloat(ticketAmount);
    if (amount <= 0 || isNaN(amount)) {
      setStatus({ message: "Please enter a valid amount", type: "error" });
      return;
    }

    if (amount > parseFloat(lpBalance)) {
      setStatus({ message: "Insufficient LP balance", type: "error" });
      return;
    }

    setLoading(true);
    setStatus({ message: "Processing transaction...", type: "info" });
    
    try {
      const amountWei = ethers.utils.parseUnits(ticketAmount, 18);
      const tx = await lotteryContract.enterLottery(amountWei);
      setStatus({ message: "Transaction submitted...", type: "info" });
      await tx.wait();

      // Refresh ticket count and LP balance
      const [newTickets, newBalance] = await Promise.all([
        lotteryContract.tickets(account),
        (await getContractInstance("LPToken")).balanceOf(account),
      ]);

      setLotteryData((prev) => ({
        ...prev,
        tickets: newTickets.toString(),
        userTickets: newTickets.toString(),
      }));

      setLpBalance(ethers.utils.formatUnits(newBalance, 18));
      setTicketAmount("1");
      setStatus({ 
        message: `Successfully bought ${ticketAmount} tickets!`, 
        type: "success" 
      });
    } catch (err) {
      console.error("Lottery entry failed:", err);
      setStatus({ 
        message: err.reason || err.message || "Transaction failed", 
        type: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  const countdownRenderer = ({ days, hours, minutes, seconds, completed }) => {
    if (completed) {
      return (
        <div className="text-center">
          <span className="text-red-600 font-bold">Drawing winner...</span>
          <div className="text-sm text-gray-500">Results will be announced shortly</div>
        </div>
      );
    }
    return (
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-800">
          {days}d {hours}h {minutes}m {seconds}s
        </div>
        <div className="text-sm text-gray-500 mt-1">until next draw</div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      {status.message && (
        <div className={`mb-6 p-4 rounded-xl ${
          status.type === 'error' ? 'bg-red-100 border-red-300 text-red-800' : 
          status.type === 'success' ? 'bg-green-100 border-green-300 text-green-800' :
          'bg-blue-100 border-blue-300 text-blue-800'
        } border`}>
          <div className="flex items-center justify-between">
            <span>{status.message}</span>
            <button 
              onClick={() => setStatus({ message: "", type: "" })}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-xl p-8 mb-8 border border-amber-200">
        <h1 className="text-4xl font-bold text-center mb-6 text-amber-700 flex justify-center items-center">
          <FaTrophy className="mr-4 text-amber-600" size={40} />
          LP TOKEN LOTTERY
        </h1>
        <p className="text-center text-gray-600 mb-2">Stake LP tokens for a chance to win big!</p>
        <p className="text-center text-sm text-gray-500">Weekly drawings • Automatic entries • No gas fees on win</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Current Prize Pool" 
          value={`${lotteryData.prizePool} IMALI`} 
          subtitle="10% awarded to winner"
          icon={<FaTrophy className="text-yellow-500" />}
          gradient="from-yellow-50 to-amber-50"
          border="border-yellow-200"
        />
        
        <StatCard
          title="Time Remaining"
          value={
            lotteryData.endTime ? (
              <Countdown date={lotteryData.endTime} renderer={countdownRenderer} />
            ) : (
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">Loading...</div>
                <div className="text-sm text-gray-500">Fetching lottery data</div>
              </div>
            )
          }
          subtitle="Next draw countdown"
          icon={<FaHistory className="text-blue-500" />}
          gradient="from-blue-50 to-cyan-50"
          border="border-blue-200"
        />
        
        <StatCard
          title="Last Winner"
          value={
            <div className="text-center">
              <div className="text-xl font-bold text-purple-700 truncate">
                {lotteryData.lastWinner}
              </div>
              <div className="text-lg font-semibold text-green-600 mt-2">
                Won {lotteryData.lastPrize} IMALI
              </div>
            </div>
          }
          subtitle="Previous lottery results"
          icon={<FaTicketAlt className="text-purple-500" />}
          gradient="from-purple-50 to-violet-50"
          border="border-purple-200"
        />
      </div>

      {/* Buy Tickets Section */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 shadow-lg mb-8 border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-800">
          <FaTicketAlt className="mr-3 text-amber-600" size={24} />
          Buy Lottery Tickets
        </h2>
        
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <label className="block text-lg font-semibold mb-3 text-gray-700">
                  LP Tokens to Stake
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={ticketAmount}
                    onChange={(e) => setTicketAmount(e.target.value)}
                    className="w-full p-4 text-xl border-2 border-gray-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                    min="0.01"
                    step="0.01"
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                    LP
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Wallet Balance:</span>
                    <span className="font-bold text-gray-800">{lpBalance} LP</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ticket Rate:</span>
                    <span className="font-bold text-green-600">1 LP = 1 Ticket</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Your Tickets:</span>
                    <span className="font-bold text-amber-600">{lotteryData.userTickets} Tickets</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setTicketAmount((parseFloat(lpBalance) / 4).toFixed(2))}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                >
                  25%
                </button>
                <button
                  onClick={() => setTicketAmount((parseFloat(lpBalance) / 2).toFixed(2))}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                >
                  50%
                </button>
                <button
                  onClick={() => setTicketAmount(lpBalance)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={enterLottery}
            disabled={loading || !lotteryData.active || !ticketAmount || parseFloat(ticketAmount) <= 0 || parseFloat(ticketAmount) > parseFloat(lpBalance)}
            className={`w-full py-5 rounded-xl font-bold text-xl transition-all duration-200 ${
              lotteryData.active && ticketAmount && parseFloat(ticketAmount) > 0 && parseFloat(ticketAmount) <= parseFloat(lpBalance)
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                Processing Transaction...
              </div>
            ) : !lotteryData.active ? (
              "Lottery Not Active"
            ) : !ticketAmount || parseFloat(ticketAmount) <= 0 ? (
              "Enter Amount"
            ) : parseFloat(ticketAmount) > parseFloat(lpBalance) ? (
              "Insufficient Balance"
            ) : (
              `Buy ${ticketAmount} Tickets`
            )}
          </button>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 shadow-lg border border-gray-200">
        <h3 className="text-2xl font-bold mb-6 flex items-center text-gray-800">
          <FaInfoCircle className="mr-3 text-blue-500" size={24} />
          How The Lottery Works
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: "Stake LP Tokens",
              description: "Stake your IMALI LP tokens to get lottery tickets (1 LP = 1 ticket)",
              color: "text-amber-600"
            },
            {
              title: "Weekly Drawings",
              description: "Automatic drawings every Friday at 12:00 PM UTC",
              color: "text-blue-600"
            },
            {
              title: "Win Big",
              description: "Winner receives 10% of the total prize pool in IMALI tokens",
              color: "text-green-600"
            },
            {
              title: "Growing Pool",
              description: "Prize pool grows from staking fees and new entries",
              color: "text-purple-600"
            },
            {
              title: "Weekly Reset",
              description: "Tickets reset each week - enter again for new drawings",
              color: "text-red-600"
            },
            {
              title: "No Gas on Win",
              description: "Winnings are automatically credited - no claim transaction needed",
              color: "text-emerald-600"
            }
          ].map((item, index) => (
            <div key={index} className="bg-white p-5 rounded-xl border border-gray-200 hover:border-amber-300 transition-colors">
              <h4 className={`font-bold text-lg mb-3 ${item.color}`}>{item.title}</h4>
              <p className="text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 📦 Enhanced StatCard component
const StatCard = ({ title, value, subtitle, icon, gradient, border }) => {
  return (
    <div className={`bg-gradient-to-br ${gradient} p-6 rounded-2xl border ${border} shadow-lg hover:shadow-xl transition-shadow`}>
      <div className="flex items-center mb-4">
        <div className="mr-3">{icon}</div>
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
      </div>
      <div className="mb-2">{value}</div>
      {subtitle && (
        <div className="text-sm text-gray-500 mt-2">{subtitle}</div>
      )}
    </div>
  );
};

export default LPLottery;
