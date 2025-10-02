import React, { useState, useEffect } from "react";
import { useNFT } from "../hooks/useNFT";
import { useBank } from "../hooks/useBank";

export default function BidNFT({ nft, isOpen, onClose, onSuccess }) {
  const { placeBid } = useNFT();
  const { getBalance } = useBank();
  const [bidAmount, setBidAmount] = useState("");
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const currentPrice = parseInt(nft?.currentPrice || "0");
  const minBidAmount = Math.ceil(currentPrice * 1.05); // 5% minimum
  const maxBidAmount = Math.floor(currentPrice * 2.2); // 220% maximum

  useEffect(() => {
    if (isOpen && nft) {
      setBidAmount(minBidAmount.toString());
      loadBalance();
    }
  }, [isOpen, nft, minBidAmount]);

  const loadBalance = async () => {
    const bal = await getBalance();
    setBalance(bal);
  };

  const handleBidChange = (e) => {
    const value = e.target.value;
    setBidAmount(value);
    const bid = parseInt(value);
    if (!value || isNaN(bid)) {
      setMessage("");
      return;
    }
    if (bid < minBidAmount) setMessage(`Minimum bid is ${minBidAmount.toLocaleString()} DAMN`);
    else if (bid > maxBidAmount) setMessage(`Maximum bid is ${maxBidAmount.toLocaleString()} DAMN`);
    else if (bid > parseInt(balance)) setMessage(`Insufficient balance. You have ${parseInt(balance).toLocaleString()} DAMN`);
    else setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const bid = parseInt(bidAmount);
    if (bid < minBidAmount || bid > maxBidAmount || bid > parseInt(balance)) return;

    setLoading(true);
    setMessage("Placing bid...");

    try {
      const result = await placeBid(nft.id, bid);
      if (result.success) {
        setMessage("Bid placed successfully!");
        onSuccess?.();
        setTimeout(() => { onClose(); setMessage(""); }, 1500);
      } else {
        setMessage(`Failed: ${result.error}`);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
    setLoading(false);
  };

  const isValidBid = () => {
    const bid = parseInt(bidAmount);
    return bidAmount && !isNaN(bid) && bid >= minBidAmount && bid <= maxBidAmount && bid <= parseInt(balance) && !loading;
  };

  const calculateFreezeAmount = () => parseInt(bidAmount) || 0;

  if (!isOpen || !nft) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bid-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Place Bid</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="nft-summary">
          {nft.metadata?.uri && <img src={nft.metadata.uri} alt={nft.metadata?.name} />}
          <h4>{nft.metadata?.name || `NFT #${nft.id}`}</h4>
          <div>Current Price: {currentPrice.toLocaleString()} DAMN</div>
        </div>

        <form className="bid-form" onSubmit={handleSubmit}>
          <div className="bid-constraints">
            <div>Min: {minBidAmount.toLocaleString()} DAMN</div>
            <div>Max: {maxBidAmount.toLocaleString()} DAMN</div>
            <div>Balance: {parseInt(balance).toLocaleString()} DAMN</div>
          </div>

          <input
            type="number"
            value={bidAmount}
            onChange={handleBidChange}
            min={minBidAmount}
            max={Math.min(maxBidAmount, parseInt(balance))}
            required
          />

          <div className="freeze-notice">
            🔒 {calculateFreezeAmount().toLocaleString()} DAMN will be frozen until auction ends.
          </div>

          <div className="bid-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={!isValidBid()}>
              {loading ? "Placing Bid..." : `Place Bid: ${parseInt(bidAmount).toLocaleString()} DAMN`}
            </button>
          </div>
        </form>

        {message && <div className={`modal-message ${message.includes("successfully") ? "success" : "error"}`}>{message}</div>}
      </div>
    </div>
  );
}



// import React, { useState } from "react";

// export default function BidNFT({ nft, placeBid, onClose }) {
//   const [bid, setBid] = useState("");
//   const [loading, setLoading] = useState(false);

//   const handleBid = async (e) => {
//     e.preventDefault();
//     if (!bid) return;
//     setLoading(true);
//     await placeBid(nft.id, Number(bid));
//     setBid("");
//     setLoading(false);
//     onClose();
//   };

//   const minBid = Math.ceil(nft.price * 1.05);
//   const maxBid = Math.ceil(nft.price * 2.2);

//   return (
//     <div className="modal">
//       <div className="modal-content">
//         <h4>Bid on NFT #{nft.id}</h4>
//         <form onSubmit={handleBid}>
//           <input
//             type="number"
//             min={minBid}
//             max={maxBid}
//             value={bid}
//             onChange={(e) => setBid(e.target.value)}
//             placeholder={`Bid between ${minBid} - ${maxBid} DAMN`}
//             required
//           />
//           <button className="btn btn-cta" disabled={loading}>
//             {loading ? "Bidding..." : "Place Bid"}
//           </button>
//           <button className="btn btn-cancel" onClick={onClose} type="button">
//             Cancel
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }
