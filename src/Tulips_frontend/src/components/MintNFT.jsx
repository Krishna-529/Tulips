import React, { useState, useEffect } from "react";
import { useNFT } from "../hooks/useNFT";

export default function MintNFT() {
  const { mintNFT } = useNFT();
  const [formData, setFormData] = useState({ name: "", image: "", desiredPrice: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [feePreview, setFeePreview] = useState(null);

  // Dynamic fee preview (40-60%)
  useEffect(() => {
    if (formData.desiredPrice && !isNaN(formData.desiredPrice)) {
      const price = parseInt(formData.desiredPrice);
      const minFee = Math.floor(price * 0.4);
      const maxFee = Math.floor(price * 0.6);
      const avgFee = Math.floor((minFee + maxFee) / 2);

      setFeePreview({
        min: minFee,
        max: maxFee,
        avg: avgFee,
        finalPriceMin: price - maxFee,
        finalPriceMax: price - minFee,
      });
    } else {
      setFeePreview(null);
    }
  }, [formData.desiredPrice]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Special handler for file input
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, image: reader.result })); // Base64 string
    };
    reader.readAsDataURL(file); // convert to Base64
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("Minting NFT...");

    try {
      // send base64 image to backend
      let deductableAmount = (60*(parseInt(formData.desiredPrice)))/100;
      const metadata = { name: formData.name, image: formData.image, desiredPrice: parseInt(formData.desiredPrice) };
      const result = await mintNFT(metadata);

      if (result.success) {
        setMessage(`NFT successfully minted! Token ID: ${result.tokenId}`);
        setFormData({ name: "", image: "", desiredPrice: "" });
        setFeePreview(null);
      } else {
        setMessage(`Minting failed: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }

    setLoading(false);

    setTimeout(() => {
      if (message.includes("successfully")) setMessage("");
    }, 3000);
  };

  const isValid = formData.name && formData.image && formData.desiredPrice && !loading;

  return (
    <div className="mint-nft-container">
      <h2>Create New NFT</h2>
      <p>Mint your unique digital asset on the DAMN blockchain</p>

      <form className="mint-form" onSubmit={handleSubmit}>
        <label>NFT Name</label>
        <input
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="NFT Name"
          required
        />

        <label>Image</label>
        <input
          name="nft-image"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          required
        />
        {formData.image && (
          <img
            src={formData.image}
            alt="NFT Preview"
            style={{ maxWidth: "200px", marginTop: "10px", display: "block" }}
          />
        )}

        <label>Desired Price (DAMN)</label>
        <input
          name="desiredPrice"
          type="number"
          min="1"
          value={formData.desiredPrice}
          onChange={handleChange}
          required
        />

        {feePreview && (
          <div className="fee-preview">
            <div>Fee Range: {feePreview.min.toLocaleString()} - {feePreview.max.toLocaleString()} DAMN</div>
            <div>Average Fee: {feePreview.avg.toLocaleString()} DAMN</div>
            <div>Final Price Range: {feePreview.finalPriceMin.toLocaleString()} - {feePreview.finalPriceMax.toLocaleString()} DAMN</div>
            <small>The exact fee (40-60%) is randomly determined during minting</small>
          </div>
        )}

        <button type="submit" disabled={!isValid}>
          {loading ? <>Minting...</> : "Create NFT"}
        </button>
      </form>

      {message && <div className={`notif ${message.includes("successfully") ? "" : "notif-disabled"}`}>{message}</div>}
    </div>
  );
}


// import React, { useState, useEffect } from "react";
// import { useNFT } from "../hooks/useNFT";

// export default function MintNFT() {
//   const { mintNFT } = useNFT();
//   const [formData, setFormData] = useState({ name: "", image: "", desiredPrice: "" });
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState("");
//   const [feePreview, setFeePreview] = useState(null);

//   // Dynamic fee preview (40-60%)
//   useEffect(() => {
//     if (formData.desiredPrice && !isNaN(formData.desiredPrice)) {
//       const price = parseInt(formData.desiredPrice);
//       const minFee = Math.floor(price * 0.4);
//       const maxFee = Math.floor(price * 0.6);
//       const avgFee = Math.floor((minFee + maxFee) / 2);

//       setFeePreview({
//         min: minFee,
//         max: maxFee,
//         avg: avgFee,
//         finalPriceMin: price - maxFee,
//         finalPriceMax: price - minFee,
//       });
//     } else {
//       setFeePreview(null);
//     }
//   }, [formData.desiredPrice]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setMessage("Minting NFT...");

//     try {
//       const metadata = { name: formData.name, uri: formData.uri };
//       const result = await mintNFT(metadata, parseInt(formData.desiredPrice));

//       if (result.success) {
//         setMessage(`NFT successfully minted! Token ID: ${result.tokenId}`);
//         setFormData({ name: "", uri: "", desiredPrice: "" });
//         setFeePreview(null);
//       } else {
//         setMessage(`Minting failed: ${result.error}`);
//       }
//     } catch (error) {
//       setMessage(`Error: ${error.message}`);
//     }

//     setLoading(false);

//     setTimeout(() => {
//       if (message.includes("successfully")) setMessage("");
//     }, 3000);
//   };

//   const isValid = formData.name && formData.uri && formData.desiredPrice && !loading;

//   return (
//     <div className="mint-nft-container">
//       <h2>Create New NFT</h2>
//       <p>Mint your unique digital asset on the DAMN blockchain</p>

//       <form className="mint-form" onSubmit={handleSubmit}>
//         <label>NFT Name</label>
//         <input
//           name="name"
//           value={formData.name}
//           onChange={handleChange}
//           placeholder="NFT Name"
//           required
//         />

//         <label>Image</label>
//         <input
//           name="nft-image"
//           type="file"
//           value={formData.image}
//           onChange={handleChange}
//           placeholder="https://example.com/image.png"
//           required
//         />
//         {formData.uri && (
//           <img
//             src={formData.uri}
//             alt="NFT Preview"
//             onError={(e) => (e.target.style.display = "none")}
//             onLoad={(e) => (e.target.style.display = "block")}
//           />
//         )}

//         <label>Desired Price (DAMN)</label>
//         <input
//           name="desiredPrice"
//           type="number"
//           min="1"
//           value={formData.desiredPrice}
//           onChange={handleChange}
//           required
//         />

//         {feePreview && (
//           <div className="fee-preview">
//             <div>Fee Range: {feePreview.min.toLocaleString()} - {feePreview.max.toLocaleString()} DAMN</div>
//             <div>Average Fee: {feePreview.avg.toLocaleString()} DAMN</div>
//             <div>Final Price Range: {feePreview.finalPriceMin.toLocaleString()} - {feePreview.finalPriceMax.toLocaleString()} DAMN</div>
//             <small>The exact fee (40-60%) is randomly determined during minting</small>
//           </div>
//         )}

//         <button type="submit" disabled={!isValid}>
//           {loading ? <>Minting...</> : "Create NFT"}
//         </button>
//       </form>

//       {message && <div className={`notif ${message.includes("successfully") ? "" : "notif-disabled"}`}>{message}</div>}
//     </div>
//   );
// }
