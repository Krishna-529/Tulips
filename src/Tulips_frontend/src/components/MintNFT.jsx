import React, { useState, useEffect } from "react";
import { useNFT } from "../hooks/useNFT";
import { useBank } from "../hooks/useBank";

export default function MintNFT() {
  const { mintNFT } = useNFT();
  const { getBalance } = useBank();
  const [formData, setFormData] = useState({ name: "", image: "", desiredPrice: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [feePreview, setFeePreview] = useState(null);

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("Minting NFT...");

    try {
      const balance = await getBalance();
      const deductableAmount = (60 * parseInt(formData.desiredPrice)) / 100;
      
      if (balance === "Error") {
        setMessage("Error connecting to backend");
        setLoading(false);
        return;
      }
      
      if (parseInt(balance) < deductableAmount) {
        setMessage("Insufficient balance");
        setLoading(false);
        setTimeout(() => setMessage(""), 5000);
        return;
      }

      const metadata = { 
        name: formData.name, 
        image: formData.image, 
        desiredPrice: parseInt(formData.desiredPrice) 
      };
      
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
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2>Create New NFT</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Mint your unique digital asset on the DAMN blockchain
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>NFT Name</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter NFT name"
              required
              data-testid="nft-name-input"
            />
          </div>

          <div className="form-group">
            <label>Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              required
              data-testid="nft-image-input"
            />
            {formData.image && (
              <img
                src={formData.image}
                alt="NFT Preview"
                style={{ 
                  maxWidth: '200px', 
                  marginTop: '1rem', 
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-color)'
                }}
              />
            )}
          </div>

          <div className="form-group">
            <label>Desired Price (DAMN)</label>
            <input
              name="desiredPrice"
              type="number"
              min="1"
              value={formData.desiredPrice}
              onChange={handleChange}
              placeholder="Enter desired price"
              required
              data-testid="nft-price-input"
            />
          </div>

          {feePreview && (
            <div className="fee-preview">
              <div>Fee Range: {feePreview.min.toLocaleString()} - {feePreview.max.toLocaleString()} DAMN</div>
              <div>Average Fee: {feePreview.avg.toLocaleString()} DAMN</div>
              <div>Final Price Range: {feePreview.finalPriceMin.toLocaleString()} - {feePreview.finalPriceMax.toLocaleString()} DAMN</div>
              <small>The exact fee (40-60%) is randomly determined during minting</small>
            </div>
          )}

          <button 
            type="submit" 
            className="btn" 
            disabled={!isValid}
            style={{ width: '100%', marginTop: '1rem' }}
            data-testid="mint-nft-button"
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Minting...
              </>
            ) : (
              "Create NFT"
            )}
          </button>
        </form>

        {message && (
          <div className={`notif ${message.includes("successfully") ? "" : "notif-disabled"}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
