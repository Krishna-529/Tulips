import React, { useState, useEffect } from "react";
import { useNFT } from "../hooks/useNFT";

export default function AuctionModal({ nft, isOpen, onClose, onSuccess }) {
  const { startBid } = useNFT();
  const [formData, setFormData] = useState({ basePrice: "", duration: "24" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [maxBasePrice, setMaxBasePrice] = useState(0);

  useEffect(() => {
    if (nft) {
      const currentPrice = parseInt(nft.currentPrice || "0");
      setMaxBasePrice(Math.floor(currentPrice * 2.2));
    }
  }, [nft]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === "basePrice" && value) {
      const base = parseInt(value);
      if (base >= maxBasePrice) {
        setMessage(`Base price must be less than ${maxBasePrice.toLocaleString()} DAMN`);
      } else {
        setMessage("");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nft || !formData.basePrice || !formData.duration) return;

    const basePrice = parseInt(formData.basePrice);
    const durationSec = parseInt(formData.duration) * 3600;

    if (basePrice <= 0 || basePrice >= maxBasePrice) {
      setMessage(`Base price must be >0 and <${maxBasePrice.toLocaleString()} DAMN`);
      return;
    }
    if (durationSec <= 0) {
      setMessage("Duration must be greater than 0 hours");
      return;
    }

    setLoading(true);
    setMessage("Starting auction...");

    try {
      const result = await startBid(nft.id, durationSec, basePrice);
      if (result.success) {
        setMessage("Auction started successfully!");
        onSuccess?.();
        setTimeout(() => {
          onClose();
          setFormData({ basePrice: "", duration: "24" });
          setMessage("");
        }, 1500);
      } else {
        setMessage(`Failed to start auction: ${result.error || "Unknown error"}`);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }

    setLoading(false);
  };

  const isValidForm = () => {
    const base = parseInt(formData.basePrice);
    const dur = parseInt(formData.duration);
    return formData.basePrice &&
           formData.duration &&
           !isNaN(base) &&
           !isNaN(dur) &&
           base > 0 &&
           base < maxBasePrice &&
           dur > 0 &&
           !loading;
  };

  const calculateEndTime = () => {
    if (!formData.duration) return "";
    const endTime = new Date(Date.now() + parseInt(formData.duration) * 3600 * 1000);
    return endTime.toLocaleString();
  };

  if (!isOpen || !nft) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auction-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Start Auction</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="nft-summary">
          <div className="nft-preview">
            {nft.metadata?.uri && <img src={nft.metadata.uri} alt={nft.metadata?.name} />}
          </div>
          <div className="nft-details">
            <h4>{nft.metadata?.name || `NFT #${nft.id}`}</h4>
            <div className="current-price">
              Current Value: {parseInt(nft.currentPrice || "0").toLocaleString()} DAMN
            </div>
          </div>
        </div>

        <form className="auction-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="basePrice">Starting Bid Price</label>
            <input
              type="number"
              id="basePrice"
              name="basePrice"
              className="input"
              value={formData.basePrice}
              onChange={handleChange}
              min="1"
              max={maxBasePrice - 1}
              placeholder="Enter starting price..."
              required
            />
            <div className="field-help">
              Maximum allowed: {(maxBasePrice - 1).toLocaleString()} DAMN
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="duration">Auction Duration (Hours)</label>
            <select
              id="duration"
              name="duration"
              className="input"
              value={formData.duration}
              onChange={handleChange}
              required
            >
              <option value="1">1 Hour</option>
              <option value="6">6 Hours</option>
              <option value="12">12 Hours</option>
              <option value="24">24 Hours</option>
              <option value="48">48 Hours</option>
              <option value="72">72 Hours (3 days)</option>
              <option value="168">1 Week</option>
            </select>
            {formData.duration && (
              <div className="field-help">Auction ends on: {calculateEndTime()}</div>
            )}
          </div>

          <div className="auction-actions">
            <button type="button" className="btn btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-auction" disabled={!isValidForm()}>
              {loading ? <> <span className="spinner"></span> Starting... </> : "Start Auction"}
            </button>
          </div>
        </form>

        {message && (
          <div className={`modal-message ${message.includes("successfully") ? "success" : "error"}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}




// import React, { useState } from "react";
// import { useNFT } from "../hooks/useNFT";

// export default function AuctionModal({ nft, isOpen, onClose, onSuccess }) {
//   const { startBid } = useNFT();
//   const [formData, setFormData] = useState({
//     basePrice: "",
//     duration: "24" // Default 24 hours
//   });
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState("");

//   const currentPrice = parseInt(nft?.currentPrice || "0");
//   const maxBasePrice = Math.floor(currentPrice * 2.2); // 220% of current price

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({
//       ...prev,A?
//       [name]: value
//     }));

//     // Real-time validation for base price
//     if (name === "basePrice" && value) {
//       const basePrice = parseInt(value);
//       if (basePrice >= maxBasePrice) {
//         setMessage(`Base price must be less than ${maxBasePrice.toLocaleString()} DAMN (220% of current price)`);
//       } else {
//         setMessage("");
//       }
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!nft || !formData.basePrice || !formData.duration) return;

//     const basePrice = parseInt(formData.basePrice);
//     const durationHours = parseInt(formData.duration);
//     const durationSeconds = durationHours * 3600;

//     // Validation
//     if (basePrice >= maxBasePrice) {
//       setMessage(`Base price must be less than ${maxBasePrice.toLocaleString()} DAMN`);
//       return;
//     }

//     if (basePrice <= 0) {
//       setMessage("Base price must be greater than 0");
//       return;
//     }

//     if (durationSeconds <= 0) {
//       setMessage("Duration must be greater than 0 hours");
//       return;
//     }

//     setLoading(true);
//     setMessage("Starting auction...");

//     try {
//       const result = await startBid(nft.id, durationSeconds, basePrice);
      
//       if (result.success) {
//         setMessage("Auction started successfully!");
//         onSuccess && onSuccess();
//         setTimeout(() => {
//           onClose();
//           setMessage("");
//           setFormData({ basePrice: "", duration: "24" });
//         }, 1500);
//       } else {
//         setMessage(`Failed to start auction: ${result.error || "Unknown error"}`);
//       }
//     } catch (error) {
//       setMessage(`Error: ${error.message}`);
//     }
    
//     setLoading(false);
//   };

//   const isValidForm = () => {
//     const basePrice = parseInt(formData.basePrice);
//     const duration = parseInt(formData.duration);
//     return formData.basePrice && 
//            formData.duration &&
//            !isNaN(basePrice) && 
//            !isNaN(duration) &&
//            basePrice > 0 &&
//            basePrice < maxBasePrice &&
//            duration > 0 &&
//            !loading;
//   };

//   const calculateEndTime = () => {
//     if (!formData.duration) return "";
//     const hours = parseInt(formData.duration);
//     const endTime = new Date(Date.now() + (hours * 3600 * 1000));
//     return endTime.toLocaleString();
//   };

//   if (!isOpen || !nft) return null;

//   return (
//     <div className="modal-overlay" onClick={onClose}>
//       <div className="modal-content auction-modal" onClick={e => e.stopPropagation()}>
//         <div className="modal-header">
//           <h3>Start Auction</h3>
//           <button className="modal-close" onClick={onClose}>×</button>
//         </div>

//         <div className="nft-summary">
//           <div className="nft-preview">
//             {nft.metadata?.uri && (
//               <img src={nft.metadata.uri} alt={nft.metadata?.name} />
//             )}
//           </div>
//           <div className="nft-details">
//             <h4>{nft.metadata?.name || `NFT #${nft.id}`}</h4>
//             <div className="current-price">
//               Current Value: {currentPrice.toLocaleString()} DAMN
//             </div>
//           </div>
//         </div>

//         <form className="auction-form" onSubmit={handleSubmit}>
//           <div className="form-group">
//             <label htmlFor="basePrice">Starting Bid Price</label>
//             <input
//               type="number"
//               id="basePrice"
//               name="basePrice"
//               className="input"
//               value={formData.basePrice}
//               onChange={handleChange}
//               min="1"
//               max={maxBasePrice - 1}
//               placeholder="Enter starting price..."
//               required
//             />
//             <div className="field-help">
//               Maximum allowed: {(maxBasePrice - 1).toLocaleString()} DAMN
//             </div>
//           </div>

//           <div className="form-group">
//             <label htmlFor="duration">Auction Duration (Hours)</label>
//             <select
//               id="duration"
//               name="duration"
//               className="input"
//               value={formData.duration}
//               onChange={handleChange}
//               required
//             >
//               <option value="1">1 Hour</option>
//               <option value="6">6 Hours</option>
//               <option value="12">12 Hours</option>
//               <option value="24">24 Hours</option>
//               <option value="48">48 Hours</option>
//               <option value="72">72 Hours (3 days)</option>
//               <option value="168">1 Week</option>
//             </select>
//             {formData.duration && (
//               <div className="field-help">
//                 Auction will end on: {calculateEndTime()}
//               </div>
//             )}
//           </div>

//           <div className="auction-rules">
//             <h4>Auction Rules</h4>
//             <ul>
//               <li>Minimum bid increment: 5% of current highest bid</li>
//               <li>Maximum bid: 220% of starting price</li>
//               <li>Bidders' funds will be frozen until auction ends</li>
//               <li>5% fee on profit goes to marketplace</li>
//               <li>You cannot bid on your own NFT</li>
//             </ul>
//           </div>

//           <div className="auction-actions">
//             <button type="button" className="btn btn-cancel" onClick={onClose}>
//               Cancel
//             </button>
//             <button 
//               type="submit" 
//               className="btn btn-auction"
//               disabled={!isValidForm()}
//             >
//               {loading ? (
//                 <>
//                   <span className="spinner"></span>
//                   Starting...
//                 </>
//               ) : (
//                 "Start Auction"
//               )}
//             </button>
//           </div>
//         </form>

//         {message && (
//           <div className={`modal-message ${message.includes("successfully") ? "success" : "error"}`}>
//             {message}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }