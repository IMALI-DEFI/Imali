import React from "react";

const MetaMaskMobilePrompt = () => {
  const openInMetaMaskMobile = () => {
    const dAppUrl = window.location.href;
    const metamaskAppUrl = `https://metamask.app.link/dapp/${encodeURIComponent(dAppUrl)}`;
    window.location.href = metamaskAppUrl;
  };

  return (
    <div className="text-center p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
      <p className="text-yellow-800">
        MetaMask is not detected. Please open this dApp in the{" "}
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline"
        >
          MetaMask Mobile app
        </a>{" "}
        to connect your wallet.
      </p>
      <button
        onClick={openInMetaMaskMobile}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Open in MetaMask Mobile
      </button>
    </div>
  );
};

export default MetaMaskMobilePrompt;