// src/components/SocialMediaManager.js
import React, { useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import axios from "axios";

const SocialMediaManager = () => {
  const { account, connectWallet } = useWallet();
  const [post, setPost] = useState("");
  const [status, setStatus] = useState("");
  const [scheduled, setScheduled] = useState(false);
  const [time, setTime] = useState("");

  const handlePost = async () => {
    if (!account) return setStatus("Please connect your wallet.");
    if (!post) return setStatus("Post cannot be empty.");

    try {
      setStatus("Sending post to all platforms...");
      const payload = { message: post, wallet: account };

      // Example calls to hypothetical API endpoints
      await Promise.all([
        axios.post("/api/twitter/post", payload),
        axios.post("/api/facebook/post", payload),
        axios.post("/api/instagram/post", payload),
      ]);

      setStatus("Post successfully sent to all platforms.");
      setPost("");
    } catch (err) {
      console.error(err);
      setStatus("Failed to post. Check console.");
    }
  };

  const handleSchedule = async () => {
    if (!post || !time) return setStatus("Post and time required.");
    try {
      await axios.post("/api/scheduler", { message: post, time, wallet: account });
      setScheduled(true);
      setStatus("Scheduled successfully.");
    } catch (err) {
      console.error(err);
      setStatus("Failed to schedule post.");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white shadow rounded">
      <h2 className="text-2xl font-bold mb-4">Social Media Manager</h2>
      {!account ? (
        <button
          onClick={connectWallet}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Connect Wallet
        </button>
      ) : (
        <>
          <textarea
            value={post}
            onChange={(e) => setPost(e.target.value)}
            className="w-full border p-2 rounded mb-4"
            placeholder="Write your announcement..."
            rows={4}
          ></textarea>
          <div className="space-x-2 mb-4">
            <button
              onClick={handlePost}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Post Now
            </button>
            <input
              type="datetime-local"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="border p-2 rounded"
            />
            <button
              onClick={handleSchedule}
              className="px-4 py-2 bg-purple-500 text-white rounded"
            >
              Schedule Post
            </button>
          </div>
          {status && <p className="text-sm text-gray-600">{status}</p>}
        </>
      )}
    </div>
  );
};

export default SocialMediaManager;
