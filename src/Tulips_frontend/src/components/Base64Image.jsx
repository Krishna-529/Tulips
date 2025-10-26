  import React from "react";

  export default function Base64Image({ base64String, alt = "NFT Image" }) {
    // console.log(base64String);
    if (!base64String) {
      return <div style={{ color: "#999", textAlign: "center" }}>No image available</div>;
    }

    let src = base64String.trim();

    if (src.startsWith("Qm") || src.startsWith("bafy")) {
      src = `https://ipfs.io/ipfs/${src}`;
    }

    else if (!src.startsWith("data:image")) {
      src = `data:image/png;base64,${src}`;
    }

    return (
      <img
        src={src}
        alt={alt}
        style={{
          width: "200px",
          height: "200px",
          objectFit: "cover",
          borderRadius: "8px",
          border: "1px solid #ccc",
        }}
        onError={(e) => (e.target.src = "https://via.placeholder.com/200?text=No+Image")}
      />
    );
  }
