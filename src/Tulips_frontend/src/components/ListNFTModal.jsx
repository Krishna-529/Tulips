import React, { useState } from "react";
import { useNFT } from "../hooks/useNFT";

export default function ListNFTModal({ nft, isOpen, onClose, onSuccess }) {
  const { listForSale, listForAuction } = useNFT();
  const [listType, setListType] = useState("sale");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("24");
  const [durationUnit, setDurationUnit] = useState("hours"); // "minutes" or "hours"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !nft) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let result;
      if (listType === "sale") {
        result = await listForSale(nft.id, parseInt(price));
      } else {
        // Convert to nanoseconds for auction duration
        const multiplier = durationUnit === "minutes" ? 60 : 3600;
        const durationNs = parseInt(duration) * multiplier * 1_000_000_000;
        result = await listForAuction(nft.id, parseInt(price), durationNs);
      }

      if (result.success) {
        setPrice("");
        setDuration("24");
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setError(result.error || "Failed to list NFT");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    }

    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>List NFT</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="nft-info" style={{ marginBottom: '1.5rem' }}>
          <h3>{nft.name || `NFT #${nft.id}`}</h3>
          <div className="nft-price">
            Current Value: {parseInt(nft.price).toLocaleString()} <span className="token">DAMN</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Listing Type</label>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button
                type="button"
                className={`btn ${listType === "sale" ? "" : "btn-secondary"}`}
                onClick={() => setListType("sale")}
                style={{ flex: 1 }}
              >
                Direct Sale
              </button>
              <button
                type="button"
                className={`btn ${listType === "auction" ? "" : "btn-secondary"}`}
                onClick={() => setListType("auction")}
                style={{ flex: 1 }}
              >
                Auction
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>{listType === "sale" ? "Sale Price" : "Starting Bid"}</label>
            <input
              type="number"
              min="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price in DAMN"
              required
            />
          </div>

          {listType === "auction" && (
            <>
              <div className="form-group">
                <label>Duration Unit</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    className={`btn ${durationUnit === "minutes" ? "" : "btn-secondary"}`}
                    onClick={() => {
                      setDurationUnit("minutes");
                      setDuration("60");
                    }}
                    style={{ flex: 1, fontSize: '0.9rem', padding: '0.5rem' }}
                  >
                    Minutes
                  </button>
                  <button
                    type="button"
                    className={`btn ${durationUnit === "hours" ? "" : "btn-secondary"}`}
                    onClick={() => {
                      setDurationUnit("hours");
                      setDuration("24");
                    }}
                    style={{ flex: 1, fontSize: '0.9rem', padding: '0.5rem' }}
                  >
                    Hours
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Auction Duration ({durationUnit})</label>
                {durationUnit === "minutes" ? (
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    required
                  >
                    <option value="1">1 minute</option>
                    <option value="5">5 minutes</option>
                    <option value="10">10 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">60 minutes</option>
                  </select>
                ) : (
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    required
                  >
                    <option value="1">1 hour</option>
                    <option value="6">6 hours</option>
                    <option value="12">12 hours</option>
                    <option value="24">24 hours</option>
                    <option value="48">48 hours</option>
                    <option value="72">72 hours</option>
                    <option value="168">7 days</option>
                  </select>
                )}
              </div>
            </>
          )}

          {error && (
            <div className="notif notif-disabled" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? <span className="spinner"></span> : `List for ${listType === "sale" ? "Sale" : "Auction"}`}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
