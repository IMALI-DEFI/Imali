.wallet-connector {
  position: relative;
  display: inline-block;
}

.wallet-button {
  padding: 10px 16px;
  font-weight: bold;
  border-radius: 6px;
  background: #1e1e1e;
  color: white;
  cursor: pointer;
}

.wallet-dropdown {
  position: absolute;
  top: 40px;
  left: 0;
  background: #333;
  border-radius: 6px;
  padding: 10px;
  z-index: 10;
}

.wallet-dropdown button {
  display: block;
  background: none;
  border: none;
  color: white;
  padding: 6px 10px;
  cursor: pointer;
  text-align: left;
}

.wallet-dropdown button:hover {
  background: #444;
}

.wallet-connected {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chain-name {
  font-size: 0.9em;
  opacity: 0.8;
}

.disconnect {
  padding: 6px 10px;
  background: #800000;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
}