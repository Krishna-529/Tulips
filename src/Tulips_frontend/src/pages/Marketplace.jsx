import React, { useEffect, useState } from "react";
import { useNFT } from "../hooks/useNFT";
import { useMarketplace } from "../hooks/useMarketplace";
import NFTCard from "../components/NFTCard";
import MintNFTForm from "../components/MintNFTForm";

export default function Marketplace() {
  const { principal, getMyTokens, approveForMarket, mintNFT } = useNFT();
  const { market, listForAuction, getAuctions, bid, settle } = useMarketplace();
  const [myNFTs, setMyNFTs] = useState([]);
  const [auctions, setAuctions] = useState([]);

  useEffect(() => { getMyTokens().then(setMyNFTs); }, [getMyTokens]);
  useEffect(() => { getAuctions().then(setAuctions); }, [getAuctions]);

  return (
    <div>
      <h2>Marketplace</h2>
      <MintNFTForm onMint={async meta => { await mintNFT(meta); setTimeout(()=>getMyTokens().then(setMyNFTs), 1000); }} />
      <h3>Your NFTs</h3>
      <div>
        {myNFTs.map(({id, metadata, owner, approved}) =>
          <NFTCard
            key={id}
            tokenId={id}
            metadata={metadata}
            owner={owner}
            principal={principal}
            approved={approved}
            onApprove={tokenId => approveForMarket(tokenId, market.actorPrincipal)}
            onList={tokenId => listForAuction(tokenId, 1, 86400)}
          />
        )}
      </div>
      <h3>Active Auctions</h3>
      <div>
        {auctions.map(a => 
          <div key={a.tokenId} className="nft-card" style={{borderColor:"#f2b575"}}>
            <h4>{a.metadata.name}</h4>
            <img src={a.metadata.uri} alt={a.metadata.name} height={120}/>
            <div>Min: {a.minBid}, Highest: {a.highestBid}, Owner: {a.owner.slice(0,8)}...</div>
            <button onClick={() => bid(a.tokenId, a.highestBid + Math.ceil(a.highestBid*0.05) + 1 )}>Bid +5%</button>
            {a.owner === principal && <button onClick={() => settle(a.tokenId)}>Settle</button>}
          </div>
        )}
      </div>
    </div>
  );
}
