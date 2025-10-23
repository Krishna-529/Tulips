import React, { useState } from "react";
import Marketplace from "./Marketplace";
import OwnedNFTs from "./OwnedNFTs";
import MintNFT from "./MintNFT";

export default function NFTDashboard() {
  const [activeTab, setActiveTab] = useState("marketplace");

  const tabs = [
    { id: "marketplace", label: "Marketplace" },
    { id: "owned", label: "My NFTs" },
    { id: "mint", label: "Create NFT" }
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
            data-testid={`tab-${tab.id}`}
          >
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
