// useNFT.js - NFT Hook
import { useEffect, useState, useCallback } from "react";
import { getActors } from "../utils/ic";
import { Principal } from "@dfinity/principal";
import { useBank } from "./useBank";

export function useNFT() {
  const { getBalance} = useBank();
  const [nftCanister, setNftCanister] = useState(null);
  const [marketplace, setMarketplace] = useState(null);
  const [principal, setPrincipal] = useState(null);

  useEffect(() => {
    getActors().then(({ nft, market, principal }) => {
      setNftCanister(nft);
      setMarketplace(market);
      setPrincipal(principal);
    });
  }, []);

const mintNFT = useCallback(
  async (metadata) => {
    if (!marketplace) {
      console.log("Marketplace canister not loaded yet!");
      return { success: false, error: "Marketplace not ready" };
    }
    const bal = await getBalance();
    console.log(bal);
    if(bal === "Error"){
      console.log("Error connecting to backend!");
      return{success: false, error: "Error connecting to backend"};
    }
    const deductableAmount = (BigInt(metadata.desiredPrice) * 60n) / 100n;

    if(bal < deductableAmount){
      console.log("Insufficient Balance")
      return{success: false, error: "Insufficient Balance"}
    }

    try {
      // Call the backend Motoko function
      const response = await marketplace.mintNFT(metadata);

      // The backend currently returns a text message, parse ID from it
      const match = response.match(/NFT minted with ID (\d+)/);
      const tokenId = match ? parseInt(match[1]) : null;

      return {
        success: true,
        error: null,
        tokenId,
        message: response, // optional full message from backend
      };
    } catch (err) {
      console.error("Minting error:", err);
      return { success: false, error: err.message || "Minting failed" };
    }
  },
  [marketplace]
);

  // Get NFT details
  const getNFTDetails = useCallback(async (nftId) => {
    if (!marketplace) return null;
    try {
      const nft = await marketplace.getNFT(BigInt(nftId));
      return nft ?? null;
    } catch (err) {
      console.error("Get NFT details error:", err);
      return null;
    }
  }, [marketplace]);

  // Get all marketplace NFTs with auction details
  const getAllNFTs = useCallback(async () => {
    if (!marketplace) return [];
    try {
      const nfts = await marketplace.getAllNFTs();
      
      // Fetch auction details for each NFT that's on auction
      const nftsWithAuctionData = await Promise.all(
        nfts.map(async (nft) => {
          const baseNft = {
            id: nft.id.toString(),
            owner: nft.owner.toString(),
            name: nft.name,
            image: nft.image,
            price: nft.price.toString(),
            status: nft.status
          };

          // If NFT is on auction, fetch auction details
          if (nft.status === "isOnBid") {
            try {
              const auctionInfo = await marketplace.getAuctionInfo(nft.id);
              if (auctionInfo && auctionInfo.length > 0) {
                const auction = auctionInfo[0];
                return {
                  ...baseNft,
                  price: auction.highestBid.toString(), // Use highest bid as price
                  bidEndTime: auction.endTime.toString(),
                  startPrice: auction.startPrice.toString(),
                  highestBidder: auction.highestBidder.length > 0 ? auction.highestBidder[0].toString() : null
                };
              }
            } catch (err) {
              console.error(`Error fetching auction info for NFT ${nft.id}:`, err);
            }
          }

          return baseNft;
        })
      );

      return nftsWithAuctionData;
    } catch (err) {
      console.error("Get all NFTs error:", err);
      return [];
    }
  }, [marketplace]);


  const getUserNFTs = useCallback(async () => {
    if (!marketplace || !principal) return [];
    const all = await getAllNFTs();

    // Make sure both sides are compared as strings
    return all.filter(nft => nft.owner === principal.toString());
  }, [marketplace, principal, getAllNFTs]);



  // Place bid on NFT
  const placeBid = useCallback(async (nftId, bidAmount) => {
    if (!marketplace) return { success: false, error: "Marketplace not ready" };
    try {
      const res = await marketplace.placeBid(BigInt(nftId), BigInt(bidAmount));
      return { success: true, message: res };
    } catch (err) {
      console.error("Place bid error:", err);
      return { success: false, error: err.message };
    }
  }, [marketplace]);

  // Finalize auction
  const finalizeBid = useCallback(async (nftId) => {
    if (!marketplace) return { success: false, error: "Marketplace not ready" };
    try {
      const res = await marketplace.finalizeAuction(BigInt(nftId));
      return { success: true, message: res };
    } catch (err) {
      console.error("Finalize auction error:", err);
      return { success: false, error: err.message };
    }
  }, [marketplace]);

  // List NFT for sale
  const listForSale = useCallback(async (nftId, price) => {
    if (!marketplace) return { success: false, error: "Marketplace not ready" };
    try {
      const res = await marketplace.placeForSale(BigInt(nftId), BigInt(price));
      return { success: true, message: res };
    } catch (err) {
      console.error("List for sale error:", err);
      return { success: false, error: err.message };
    }
  }, [marketplace]);

  // List NFT for auction
  const listForAuction = useCallback(async (nftId, startingPrice, duration) => {
    if (!marketplace) return { success: false, error: "Marketplace not ready" };
    try {
      const res = await marketplace.listForAuction(BigInt(nftId), BigInt(startingPrice), BigInt(duration));
      return { success: true, message: res };
    } catch (err) {
      console.error("List for auction error:", err);
      return { success: false, error: err.message };
    }
  }, [marketplace]);

  // Withdraw NFT from sale/auction
  const withdrawNFT = useCallback(async (nftId) => {
    if (!marketplace) return { success: false, error: "Marketplace not ready" };
    try {
      const res = await marketplace.withdrawAuction(BigInt(nftId));
      return { success: true, message: res };
    } catch (err) {
      console.error("Withdraw NFT error:", err);
      return { success: false, error: err.message };
    }
  }, [marketplace]);

  // Buy NFT directly
  const buyNFT = useCallback(async (nftId) => {
    if (!marketplace) return { success: false, error: "Marketplace not ready" };
    try {
      const res = await marketplace.buyNFT(BigInt(nftId));
      return { success: true, message: res };
    } catch (err) {
      console.error("Buy NFT error:", err);
      return { success: false, error: err.message };
    }
  }, [marketplace]);

  return {
    nftCanister,
    marketplace,
    principal,
    mintNFT,
    getNFTDetails,
    getAllNFTs,
    getUserNFTs,
    placeBid,
    finalizeBid,
    listForSale,
    listForAuction,
    withdrawNFT,
    buyNFT
  };
}
