import React from "react";
import { Link } from "react-router-dom";

import { MascotLogo } from "../components/game/GameKit";

const H2 = ({ children }) => <h2 className="text-xl font-semibold pt-2">{children}</h2>;
const P = ({ children }) => <p className="text-white/80 leading-relaxed">{children}</p>;
const UL = ({ children }) => <ul className="list-disc pl-6 text-white/80 space-y-1">{children}</ul>;
const A = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-indigo-300">
    {children}
  </a>
);

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-14 space-y-5">
        <MascotLogo size={84} className="block mx-auto mb-3" />
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <P>Last updated: November 2, 2026</P>
        <P>
          This policy explains what information IMALI collects when you visit imali-defi.com or use
          the IMALI app, how we use it, who we share it with, and the choices you have. By using
          IMALI, you agree to the practices described here.
        </P>

        <H2>Information We Collect</H2>
        <UL>
          <li>Account details you give us, such as your name, email address and password.</li>
          <li>Subscription and billing records. Card payments are handled by our payment processor; we do not store full card numbers.</li>
          <li>Exchange and broker connections you choose to set up, and the wallet addresses you connect.</li>
          <li>Trading settings, bot activity and demo (practice) activity inside IMALI.</li>
          <li>Messages you send to support.</li>
          <li>Usage information collected automatically, such as pages visited, device and browser type, approximate location from IP address, and referring links.</li>
        </UL>

        <H2>How We Use Information</H2>
        <UL>
          <li>To run your account and the trading features you turn on.</li>
          <li>To process subscriptions and payments.</li>
          <li>To send service messages, security notices and, if you opt in, newsletters. You can unsubscribe from marketing emails at any time.</li>
          <li>To understand how IMALI is used and improve it.</li>
          <li>To prevent fraud and abuse and to meet legal obligations.</li>
        </UL>

        <H2>Your Funds and Exchange Connections</H2>
        <P>
          IMALI is noncustodial. Your money stays in your own exchange, broker or wallet account;
          IMALI does not hold your funds. When you connect an account, IMALI uses that connection only
          to provide the features you enable, and you can disconnect it at any time.
        </P>

        <H2>Cookies and Similar Technologies</H2>
        <P>
          We use cookies and similar technologies to keep you signed in, remember your preferences,
          measure site traffic and, where ads are shown, to serve and measure advertising. You can
          control or delete cookies through your browser settings; some features may not work
          without them.
        </P>

        <H2>Advertising</H2>
        <P>
          We may show ads on our website through Google AdSense. Third-party vendors, including Google,
          use cookies to serve ads based on your prior visits to this website or other websites.
          Google's use of advertising cookies enables it and its partners to serve ads to you based on
          your visits to this site and/or other sites on the Internet.
        </P>
        <P>
          You may opt out of personalized advertising by visiting{" "}
          <A href="https://adssettings.google.com">Google Ads Settings</A>. You can also opt out of some
          third-party vendors' use of cookies for personalized advertising at{" "}
          <A href="https://www.aboutads.info/choices/">www.aboutads.info</A>. To learn more about how
          Google uses information from sites that use its services, see{" "}
          <A href="https://policies.google.com/technologies/partner-sites">
            How Google uses information from sites or apps that use its services
          </A>
          .
        </P>

        <H2>How We Share Information</H2>
        <P>We do not sell your personal information. We share it only:</P>
        <UL>
          <li>With service providers that help us run IMALI (hosting, payments, email delivery, analytics and advertising), under their own privacy and security terms.</li>
          <li>With the exchanges and brokers you connect, as needed to carry out the actions you request.</li>
          <li>When required by law or to protect the rights, safety and security of IMALI and its users.</li>
          <li>As part of a merger, acquisition or sale of assets, with notice to you where required.</li>
        </UL>

        <H2>Data Retention and Security</H2>
        <P>
          We keep information for as long as your account is active or as needed to provide the
          service, meet legal requirements and resolve disputes. We use reasonable safeguards to protect
          your information, but no online service can guarantee complete security.
        </P>

        <H2>Your Rights and Choices</H2>
        <P>
          You can request access to, correction of, or deletion of your personal information. Depending
          on where you live, you may have additional rights under laws such as the GDPR or California
          privacy law. To delete your data, see our{" "}
          <Link to="/data-deletion" className="underline text-indigo-300">Data Deletion</Link> page, or
          contact us through <Link to="/support" className="underline text-indigo-300">Support</Link>.
        </P>

        <H2>Children</H2>
        <P>
          IMALI is not intended for anyone under 18, and we do not knowingly collect information from
          children. If you believe a child has given us information, contact us and we will delete it.
        </P>

        <H2>Changes to This Policy</H2>
        <P>
          We may update this policy from time to time. When we do, we will change the "Last updated"
          date above, and for significant changes we will provide additional notice.
        </P>

        <H2>Contact</H2>
        <P>
          Questions about this policy? Reach us through the{" "}
          <Link to="/support" className="underline text-indigo-300">Support</Link> page. See also our{" "}
          <Link to="/terms" className="underline text-indigo-300">Terms of Service</Link>.
        </P>
      </div>
    </div>
  );
}
