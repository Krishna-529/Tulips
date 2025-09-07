import React from "react";
export default function NFTCard({ tokenId, metadata, owner, principal, approved, onApprove, onList }) {
  const isOwner = owner === principal;
  return (
    <div className="nft-card">
      <div className="img-wrap">
        <img src={metadata.uri} alt={metadata.name} height={120} />
      </div>
      <div className="card-body">
        <h4>{metadata.name}</h4>
        <div className="chip">#{tokenId}</div>
        <div className="chip chip-outline">{owner?.substring(0, 8)}…</div>
        {isOwner && approved !== window.marketplacePrincipal && (
          <button className="btn btn-outline" onClick={() => onApprove(tokenId)}>
            <span role="img" aria-label="approve">📝</span> Approve Marketplace
          </button>
        )}
        {isOwner && <button className="btn" onClick={() => onList(tokenId)}>
          <span role="img" aria-label="list">📤</span> List/Auction
        </button>}
      </div>
    </div>
  );
}
