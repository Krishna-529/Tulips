import React, { useState, useEffect } from "react";

export default function NFTCard({ nft, currentUser, onBid, onFinalize, showBidButton = true }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  
  const isOwner = nft.owner === currentUser;
  const canBid = showBidButton && !isOwner && nft.forSale && !isExpired;
  const canFinalize = isOwner && nft.forSale && isExpired;

  // Auction timer
  useEffect(() => {
    if (!nft.bidEndTime) return;

    const updateTimer = () => {
      const now = Date.now() * 1_000_000; // convert ms → ns
      const endTime = BigInt(nft.bidEndTime);
      const remaining = endTime - BigInt(now);

      if (remaining <= 0) {
        setTimeLeft("Auction Ended");
        setIsExpired(true);
        return;
      }

      const seconds = Number(remaining / 1_000_000_000n);
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      setTimeLeft(`${hours}h ${minutes}m ${secs}s`);
      setIsExpired(false);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nft.bidEndTime]);

  const handleBidClick = () => {
    if (onBid && canBid) onBid(nft);
  };

  const handleFinalizeClick = () => {
    if (onFinalize && canFinalize) onFinalize(nft.id);
  };

  const formatPrice = (price) => parseInt(price).toLocaleString();

  const getMinBidAmount = () => {
    const currentPrice = parseInt(nft.price);
    return Math.ceil(currentPrice * 1.05);
  };

  return (
    <div className="nft-card">
      <div className="nft-image">
        {nft.metadata?.uri ? (
          <img
            src={nft.metadata.uri}
            alt={nft.metadata?.name || `NFT ${nft.id}`}
            onError={(e) => { e.target.src = "/placeholder-nft.png"; }}
          />
        ) : (
          <div className="nft-placeholder">NFT #{nft.id}</div>
        )}
      </div>

      <div className="nft-info">
        <h3>{nft.metadata?.name || `NFT #${nft.id}`}</h3>

        <div className="nft-owner">
          Owner: {isOwner ? "You" : `${nft.owner.slice(0, 8)}...`}
        </div>

        <div className="nft-price">
          Price: {formatPrice(nft.price)} <span className="token">DAMN</span>
        </div>

        {nft.forSale && (
          <div className="auction-info">
            <div className="time-left">Time Left: {timeLeft}</div>
            <div className="min-bid">Min Next Bid: {formatPrice(getMinBidAmount())} DAMN</div>
          </div>
        )}

        <div className="nft-actions">
          {canBid && <button className="btn btn-bid" onClick={handleBidClick}>🏆 Place Bid</button>}
          {canFinalize && <button className="btn btn-finalize" onClick={handleFinalizeClick}>✅ Finalize Auction</button>}
          {isOwner && !nft.forSale && <button className="btn btn-owned" disabled>✓ Owned by You</button>}
        </div>
      </div>
    </div>
  );
}



// import React, { useState, useEffect } from "react";
// import { useMarketplace } from "../hooks/useMarketplace";
// import NFTCard from "../components/NFTCard";
// import OwnedNFTs from "../components/OwnedNFTs";
// import MintNFT from "../components/MintNFT";

// export default function Marketplace({ nftActor, marketActor, principal }) {
//   const { nfts, loading, txMsg, fetchNFTs, mintNFT, placeBid, finalizeSale } =
//     useMarketplace(nftActor, marketActor, principal);

//   useEffect(() => {
//     fetchNFTs();
//   }, [fetchNFTs]);

//   const ownedNFTs = nfts.filter((n) => n.owner === principal);
//   const forSaleNFTs = nfts.filter((n) => n.owner !== principal && n.forSale);

//   return (
//     <div className="dashboard marketplace-dashboard">
//       <h2>🌷 NFT Marketplace</h2>

//       <MintNFT mintNFT={mintNFT} />

//       {txMsg && <div className="notif">{txMsg}</div>}

//       <h3>🎨 Owned NFTs</h3>
//       <OwnedNFTs nfts={ownedNFTs} />

//       <h3>🛒 NFTs for Sale/Auction</h3>
//       {loading ? (
//         <div>Loading NFTs...</div>
//       ) : forSaleNFTs.length === 0 ? (
//         <div>No NFTs available</div>
//       ) : (
//         <div className="nft-grid">
//           {forSaleNFTs.map((nft) => (
//             <NFTCard
//               key={nft.id}
//               nft={nft}
//               principal={principal}
//               placeBid={placeBid}
//               finalizeSale={finalizeSale}
//             />
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
