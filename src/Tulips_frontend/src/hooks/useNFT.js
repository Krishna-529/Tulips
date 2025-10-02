// useNFT.js - NFT Hook
import { useEffect, useState, useCallback } from "react";
import { getActors } from "../utils/ic";
import { Principal } from "@dfinity/principal";
import { useBank } from "./useBank";


// async function uploadToPinata(base64Image, name) {
//   const pinataJWT = process.env.REACT_APP_PINATA_JWT; // Use JWT token

//   // Remove the "data:image/png;base64," prefix
//   const fileData = base64Image.split(",")[1];

//   const formData = new FormData();
//   formData.append(
//     "file",
//     new Blob([Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0))], {
//       type: "image/png",
//     }),
//     `${name}.png`
//   );

//   const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${pinataJWT}`,
//     },
//     body: formData,
//   });

//   if (!res.ok) throw new Error("Failed to upload to Pinata");

//   const data = await res.json();
//   return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
// }


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

  // useNFT.js
const mintNFT = useCallback(
  async (metadata) => {
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

    
    return {success: true, error: null};

  }
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

  // Get all marketplace NFTs
  const getAllNFTs = useCallback(async () => {
    if (!marketplace) return [];
    try {
      const nfts = await marketplace.getAllNFTs();
      return nfts.map(nft => ({
        id: nft.id.toString(),
        owner: nft.owner.toString(),
        price: nft.price.toString(),
        forSale: nft.forSale
      }));
    } catch (err) {
      console.error("Get all NFTs error:", err);
      return [];
    }
  }, [marketplace]);

  // Get NFTs owned by current user
  const getUserNFTs = useCallback(async () => {
    if (!marketplace || !principal) return [];
    const all = await getAllNFTs();
    return all.filter(nft => nft.owner === principal);
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

  // Finalize NFT sale
  const finalizeBid = useCallback(async (nftId) => {
    if (!marketplace) return { success: false, error: "Marketplace not ready" };
    try {
      const res = await marketplace.finalizeSale(BigInt(nftId));
      return { success: true, message: res };
    } catch (err) {
      console.error("Finalize bid error:", err);
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
    finalizeBid
  };
}
