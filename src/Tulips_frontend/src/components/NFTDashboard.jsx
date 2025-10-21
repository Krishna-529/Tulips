import React, { useState } from "react";
import Marketplace from "./Marketplace";
import OwnedNFTs from "./OwnedNFTs";
import MintNFT from "./MintNFT";

export default function NFTDashboard() {
  const [activeTab, setActiveTab] = useState("marketplace");

  const tabs = [
    { id: "marketplace", label: "Marketplace", icon: "🏪" },
    { id: "owned", label: "My NFTs", icon: "📦" },
    { id: "mint", label: "Create NFT", icon: "✨" }
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case "marketplace":
        return <Marketplace />;
      case "owned":
        return <OwnedNFTs />;
      case "mint":
        return <MintNFT />;
      default:
        return <Marketplace />;
    }
  };

  return (
    <div className="nft-dashboard">
      <div className="dashboard-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="dashboard-content">
        {renderActiveTab()}
      </div>
    </div>
  );
}
