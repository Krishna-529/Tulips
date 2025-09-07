import React, { useEffect, useState } from "react";

export default function AuctionList({ getAuctions, principal, bid, settle }) {
  const [auctions, setAuctions] = useState([]);
  const [bidVals, setBidVals] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getAuctions) {
      setLoading(true);
      getAuctions().then(data => {
        setAuctions(data);
        setLoading(false);
      });
    }
  }, [getAuctions]);

  return (
    <div className="auction-list">
      <h2>
        <span role="img" aria-label="auction">🎯</span> Live NFT Auctions
      </h2>
      {loading ? (
        <div className="auction-card skeleton" />
      ) : auctions.length === 0 ? (
        <div className="empty-state">No live auctions yet.</div>
      ) : (
        auctions.map(a => {
          const isOwner = a.owner === principal;
          const minBid = a.highestBid === 0 ? a.minBid : Math.ceil(a.highestBid * 1.05);
          const timeLeftMin = a.endTime ? Math.max(0, Math.round((a.endTime - Date.now() * 1e6) / 1e9 / 60)) : 0;
          return (
            <div key={a.tokenId} className="auction-card">
              <img src={a.metadata.uri} alt={a.metadata.name} width="150" />
              <div className="card-body">
                <h4>{a.metadata.name}</h4>
                <div className="chip chip-orange">Min: {a.minBid}</div>
                <div className="chip">{a.highestBid ? `Highest: ${a.highestBid}` : "No bids yet"}</div>
                <div><span className="timer">⏳</span> <span>{timeLeftMin > 0 ? `${timeLeftMin} min left` : "Ended"}</span></div>
                {!isOwner ? (
                  <form className="bid-form" onSubmit={e => {e.preventDefault();bid(a.tokenId,bidVals[a.tokenId]||minBid);}}>
                    <input
                      className="input"
                      min={minBid}
                      type="number"
                      inputMode="numeric"
                      placeholder={`≥ ${minBid}`}
                      value={bidVals[a.tokenId]||""}
                      onChange={e => setBidVals(val => ({ ...val, [a.tokenId]: e.target.value }))}
                      required
                    />
                    <button disabled={(bidVals[a.tokenId]||0) < minBid} className="btn btn-cta"><span role="img" aria-label="bid">💸</span> Bid</button>
                  </form>
                ) : (
                  <button className="btn btn-outline" onClick={() => settle(a.tokenId)}><span role="img" aria-label="settle">✅</span> Settle</button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
