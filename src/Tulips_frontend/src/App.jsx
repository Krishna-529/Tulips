import React, { useState } from "react";
import { useBank } from "./hooks/useBank";
import Bank from "./components/Bank";
import NFTDashboard from "./components/NFTDashboard";
import "./nft-style.css";

export default function App() {
  const { principal } = useBank();
  const [currentSection, setCurrentSection] = useState("bank");

  const sections = [
    { id: "nft", label: "NFT Marketplace" },
    { id: "bank", label: "Banking" }
  ];

  const renderCurrentSection = () => {
    switch (currentSection) {
      case "bank":
        return <Bank />;
      case "nft":
        return <NFTDashboard />;
      default:
        return <Bank />;
    }
  };

  return (
    <div className="app">
      <nav className="main-navbar">
        <div className="brand-logo">
          <span className="brand-name">TULIPS</span>
        </div>

        <div className="nav-links">
          {sections.map(section => (
            <button
              key={section.id}
              className={currentSection === section.id ? "nav-active" : ""}
              onClick={() => setCurrentSection(section.id)}
              data-testid={`nav-${section.id}`}
            >
              {section.label}
            </button>
          ))}
        </div>

        <div className="nav-user">
          {principal ? (
            <div className="user-principal">
              {principal.slice(0, 8)}...{principal.slice(-4)}
            </div>
          ) : (
            <div className="user-principal">Connecting...</div>
          )}
        </div>
      </nav>

      <main className="main-content">
        {renderCurrentSection()}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>TULIPS - Decentralized NFT Marketplace</p>
          <div className="footer-links">
            <span>Built on Internet Computer</span>
            <span>•</span>
            <span>ICRC-1 Token Standard</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
