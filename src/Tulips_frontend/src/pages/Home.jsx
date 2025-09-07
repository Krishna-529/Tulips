import React from "react";
export default function Home() {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1>
          <span role="img" aria-label="Diamond NFT">💎</span>
          DSurv NFT Bank
        </h1>
        <h2>
          Mint, auction, transfer NFTs & tokens using <b>Internet Identity & open standards</b>.
        </h2>
        <p>
          This dapp uses ICRC-7 (NFT), ICRC-37 (approvals), and ICRC-1 (token)—all ICP-native.<br/>
          Experience security, decentralization, and UX <b>without compromises</b>.
        </p>
        <a href="#market" className="btn btn-cta" style={{marginTop:'1.2em'}}>Go to Marketplace</a>
      </div>
    </section>
  );
}
