import React from "react";
import { FaTwitter, FaDiscord, FaInstagram, FaFacebook, FaLinkedin, FaGithub } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-10 mt-16">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        <div>
          <h4 className="text-lg font-semibold mb-2">Social Links</h4>
          <ul className="space-y-2">
            <li><a href="https://x.com/imalidefi" target="_blank" rel="noopener noreferrer" className="hover:underline"><FaTwitter className="inline mr-2" />X (Twitter)</a></li>
            <li><a href="https://discord.gg/wSNq32q5" target="_blank" rel="noopener noreferrer" className="hover:underline"><FaDiscord className="inline mr-2" />Discord</a></li>
            <li><a href="https://www.instagram.com/imali_defi" target="_blank" rel="noopener noreferrer" className="hover:underline"><FaInstagram className="inline mr-2" />Instagram</a></li>
            <li><a href="https://www.facebook.com/share/1Krjwmf8yR/" target="_blank" rel="noopener noreferrer" className="hover:underline"><FaFacebook className="inline mr-2" />Facebook Page</a></li>
            <li><a href="https://www.facebook.com/share/g/193YA7oPzP/" target="_blank" rel="noopener noreferrer" className="hover:underline"><FaFacebook className="inline mr-2" />Facebook Group</a></li>
            <li><a href="https://www.linkedin.com/company/imali-defi/" target="_blank" rel="noopener noreferrer" className="hover:underline"><FaLinkedin className="inline mr-2" />LinkedIn</a></li>
            <li><a href="https://www.threads.net/@imali_defi" target="_blank" rel="noopener noreferrer" className="hover:underline">Threads</a></li>
            <li><a href="https://bsky.app/profile/imali-defi.bsky.socia" target="_blank" rel="noopener noreferrer" className="hover:underline">BlueSky</a></li>
            <li><a href="https://github.com/IMALI-DEFI/imali" target="_blank" rel="noopener noreferrer" className="hover:underline"><FaGithub className="inline mr-2" />GitHub</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-2">Contracts</h4>
          <ul className="text-sm space-y-1">
            <li>IMALIToken: <a href="https://polygonscan.com/address/0x15d3f466D34DF102383760CCc70f9F970fceAd09" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">0x15d3...eAd09</a></li>
            <li>LPToken: <a href="https://polygonscan.com/address/0xB4Af6D278Ae4A793a61e9a7955D7d0057965d5Db" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">0xB4Af...5d5Db</a></li>
            <li>YieldFarming: <a href="https://polygonscan.com/address/0xd52576610C03dc759be7c8D178F5eEFEDBFFd5Fe" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">0xd525...d5Fe</a></li>
            <li>Staking: <a href="https://polygonscan.com/address/0x4c6Cd37bAAb5BAFfC1BB94CdAAa10f1df7c19234" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">0x4c6C...9234</a></li>
            <li>NFT: <a href="https://polygonscan.com/address/0x28e84876803Ad8fe3a574A800e8FC05183Fb0D75" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">0x28e8...0D75</a></li>
            <li>DAO: <a href="https://polygonscan.com/address/0x53fe9aCCB3331b4aea49fA21F2E37f7Ad713CD9B" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">0x53fe...CD9B</a></li>
            <li>Presale: <a href="https://polygonscan.com/address/0x6c1dee29D8c828ed71364072A8da3B71B231472B" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">0x6c1d...472B</a></li>
            <li>Buyback: <a href="https://polygonscan.com/address/0x386e80D1AF3E72Efb2687CBa6029F1Aa4B5AE953" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">0x386e...E953</a></li>
            <li>VestingVault: <a href="https://polygonscan.com/address/0xF0fB8a0b882bd69dAD85f032F60DBD2af0f3EA0b" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">0xF0fB...EA0b</a></li>
            <li>AirdropDistributor: <a href="https://polygonscan.com/address/0xf3fC786b4da443ba9b39586bC777E6ff20Ca9C6A" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">0xf3fC...C6A</a></li>
            <li>LiquidityManager: <a href="https://polygonscan.com/address/0x6439Cbe9092E606096B5368d4b209b4cBBE57F21" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">0x6439...7F21</a></li>
            <li>LP Lottery: <a href="https://polygonscan.com/address/0x6E40af2d79e21eFe00A7b32eDc40e735B9b17E14" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">0x6E40...7E14</a></li>
            <li>Fee Distributor: <a href="https://polygonscan.com/address/0x6500307aAfC80a4A05D0e32189Ce73E57E2Eb64f" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">0x6500...b64f</a></li>
          </ul>
        </div>

        <div className="text-sm text-gray-400 sm:col-span-2 md:col-span-1">
          <p className="mb-2">&copy; {new Date().getFullYear()} IMALI DeFi. All rights reserved.</p>
          <p>Secure, multi-chain finance powered by transparency and community.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
