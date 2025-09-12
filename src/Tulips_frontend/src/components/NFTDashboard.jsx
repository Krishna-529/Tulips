import React, { useEffect, useState } from "react";
import MintNFTForm from "./MintNFTForm";
import NFTCard from "./NFTCard";
// import "../main.css";


export default function NFTDashboard({ nft, marketPrincipal, principal, getMyTokens, approveForMarket, mintNFT, listForAuction }) {
  const [myNFTs, setMyNFTs] = useState([]);
  const [mintMsg, setMintMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getMyTokens)
      getMyTokens().then(data => {
        setMyNFTs(data);
        setLoading(false);
      });
  }, [getMyTokens]);

  return (
    <div className="dashboard">
      <div className="dash-header">
        <h2>
          <span role="img" aria-label="gallery">🖼️</span> My NFTs
        </h2>
      </div>
      <MintNFTForm
        onMint={async meta => {
          setMintMsg("Minting...");
          await mintNFT(meta);
          setMintMsg("Minted!");
          setTimeout(() => {
            setMintMsg("");
            setLoading(true);
            getMyTokens().then(data => {
              setMyNFTs(data);
              setLoading(false);
            });
          }, 900);
        }}
      />
      {mintMsg && <div className="notif notify-green">{mintMsg}</div>}

      <div className="nft-list-grid">
        {loading
          ? Array(2).fill(0).map((_,i)=>
              <div className="nft-card skeleton" key={i} />
            )
          : (myNFTs.length === 0)
            ? <div className="empty-state">No NFTs minted yet.</div>
            : myNFTs.map(({ id, metadata, owner, approved }) =>
              <NFTCard
                key={id}
                tokenId={id}
                metadata={metadata}
                owner={owner}
                principal={principal}
                approved={approved}
                onApprove={tokenId => approveForMarket(tokenId, marketPrincipal)}
                onList={tokenId => listForAuction(tokenId, 1, 86400)}
              />
            )
        }
      </div>
    </div>
  );
}
