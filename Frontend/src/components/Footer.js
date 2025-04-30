import React from "react";
import { Link } from "react-router-dom";
import Logo from "../assets/images/DefiFinanceLogo.png";

const Footer = () => {
  return (
    <footer className="bg-green-800 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Branding */}
          <div className="text-center md:text-left">
            <div className="flex flex-col items-center md:items-start">
              <img src={Logo} alt="IMALI DeFi Logo" className="h-8 w-auto mb-2" />
              <p className="text-sm text-green-200 max-w-xs">
                Decentralized finance solutions for the next generation
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <div className="grid grid-cols-2 gap-2">
              <FooterLink to="/">Home</FooterLink>
              <FooterLink to="/lending">Lending</FooterLink>
              <FooterLink to="/staking">Staking</FooterLink>
              <FooterLink to="/yield-farming">Yield Farming</FooterLink>
              <FooterLink to="/fee-distributor">Fee Distributor</FooterLink>
              <FooterLink to="/lottery">Lottery</FooterLink>
              <FooterLink to="/nft">NFT</FooterLink>
              <FooterLink to="/how-to-use">How To</FooterLink>
            </div>
          </div>

          {/* Social Links */}
          <div className="text-center md:text-right">
            <h3 className="text-lg font-semibold mb-4">Connect With Us</h3>
            <div className="flex justify-center md:justify-end flex-wrap gap-2">
              <SocialIcon href="https://www.facebook.com/share/1Krjwmf8yR/?mibextid=wwXIfr" icon="facebook" label="Facebook Page" />
              <SocialIcon href="https://www.facebook.com/share/g/193YA7oPzP/?mibextid=wwXIfr" icon="facebook-f" label="Facebook Group" />
              <SocialIcon href="https://www.linkedin.com/company/imali-defi/" icon="linkedin" label="LinkedIn" />
              <SocialIcon href="https://www.instagram.com/imali_defi?igsh=MXZieHV1MTJnem5weA%3D%3D&utm_source=qr" icon="instagram" label="Instagram" />
              <SocialIcon href="https://bsky.app/profile/imali-defi.bsky.socia" icon="square" label="Bluesky" />
              <SocialIcon href="https://discord.gg/wSNq32q5" icon="discord" label="Discord" />
              <SocialIcon href="https://www.threads.net/@imali_defi" icon="threads" label="Threads" />
              <SocialIcon href="https://x.com/imalidefi?s=21&t=zPxjF8QLzW9SL7pH-m60Hw" icon="x-twitter" label="X (Twitter)" />
              <SocialIcon href="https://github.com/IMALI-DEFI/imali" icon="github" label="GitHub" />
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-green-700 mt-8 pt-6 text-center text-sm text-green-300">
          <p>&copy; {new Date().getFullYear()} IMALI DeFi Protocol. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

// Safe FooterLink
const FooterLink = ({ to, children }) => {
  if (!children) return null;
  return (
    <Link to={to} className="text-green-200 hover:text-white text-sm transition-colors">
      {children}
    </Link>
  );
};

// Safe SocialIcon
const SocialIcon = ({ href, icon, label }) => {
  if (!href || !icon) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-green-300 hover:text-white transition-colors"
      aria-label={label}
      title={label}
    >
      <i className={`fab fa-${icon} text-xl`} />
    </a>
  );
};

export default Footer;
