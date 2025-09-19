import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";
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
          prizePool: ethers.formatUnits(prizePool, 18),
          endTime: (Number(lastTime) + 604800) * 1000, // 7 days in ms
          tickets: ticketCount.toString(),
          userTickets: userTickets.toString(),
        }));

        setLpBalance(ethers.formatUnits(balance, 18));

        // Setup WinnerSelected event listener
        lottery.on("WinnerSelected", (winner, prize) => {
          setLotteryData((prev) => ({
            ...prev,
            lastWinner: `${winner.slice(0, 6)}...${winner.slice(-4)}`,
            lastPrize: ethers.formatUnits(prize, 18),
          }));
        });
      } catch (err) {
        console.error("LPLottery init error:", err);
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
    if (!account || !lotteryContract || !ticketAmount) return;

    setLoading(true);
    try {
      const amountWei = ethers.parseUnits(ticketAmount, 18);
      const tx = await lotteryContract.enterLottery(amountWei);
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

      setLpBalance(ethers.formatUnits(newBalance, 18));
    } catch (err) {
      console.error("Lottery entry failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const countdownRenderer = ({ days, hours, minutes, seconds, completed }) => {
    if (completed) {
      return <span>Drawing winner...</span>;
    }
    return (
      <span className="font-bold">
        {days}d {hours}h {minutes}m {seconds}s
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h1 className="text-3xl font-bold text-center mb-6 text-yellow-600 flex justify-center items-center">
          <FaTrophy className="mr-3" />
          LP Lottery
        </h1>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Current Prize Pool" value={`${lotteryData.prizePool} IMALI`} color="yellow" />
          <StatCard
            title="Time Remaining"
            value={
              lotteryData.endTime ? (
                <Countdown date={lotteryData.endTime} renderer={countdownRenderer} />
              ) : "Loading..."
            }
            color="blue"
          />
          <StatCard
            title="Last Winner"
            value={
              <>
                <p className="text-center">{lotteryData.lastWinner}</p>
                <p className="text-center">Won {lotteryData.lastPrize} IMALI</p>
              </>
            }
            color="purple"
          />
        </div>

        {/* Buy Tickets */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FaTicketAlt className="mr-2 text-yellow-500" />
            Buy Tickets
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-medium">LP Tokens to Stake</label>
              <input
                type="number"
                placeholder="0.0"
                value={ticketAmount}
                onChange={(e) => setTicketAmount(e.target.value)}
                className="w-full p-3 border rounded-lg"
                min="1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Wallet Balance: {lpBalance} LP (1 LP = 1 ticket)
              </p>
            </div>

            <button
              onClick={enterLottery}
              disabled={loading || !lotteryData.active || !ticketAmount}
              className={`w-full py-3 rounded-lg font-medium ${
                lotteryData.active && ticketAmount
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? 'Processing...' : 'Buy Tickets'}
            </button>
          </div>
        </div>

        {/* Your Tickets */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
          <h3 className="font-semibold mb-3 text-green-800 flex items-center">
            <FaTicketAlt className="mr-2" />
            Your Tickets
          </h3>
          <p className="text-xl font-bold text-center">
            {lotteryData.userTickets} Tickets
          </p>
          <p className="text-center text-sm text-gray-600 mt-1">
            Each ticket gives you a chance to win 10% of the prize pool
          </p>
        </div>

        {/* How It Works */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="font-semibold mb-3 flex items-center">
            <FaInfoCircle className="mr-2 text-blue-500" />
            How the Lottery Works
          </h3>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>Stake LP tokens to get lottery tickets (1 LP = 1 ticket)</li>
            <li>Weekly drawings every Friday at 12PM UTC</li>
            <li>Winner receives 10% of the prize pool</li>
            <li>Prize pool grows from staking fees</li>
            <li>Tickets are valid for the current week only</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// 📦 Reusable StatCard component
const StatCard = ({ title, value, color }) => {
  const colorClasses = {
    yellow: "from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-800",
    blue: "from-blue-50 to-blue-100 border-blue-200 text-blue-800",
    purple: "from-purple-50 to-purple-100 border-purple-200 text-purple-800",
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} p-5 rounded-xl border`}>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <div className="text-xl font-bold text-center">{value}</div>
    </div>
  );
};

export default LPLottery;
