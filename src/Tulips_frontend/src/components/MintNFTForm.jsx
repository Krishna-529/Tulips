import React, { useState } from "react";

export default function MintNFTForm({ onMint }) {
  const [name, setName] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  const [imgPreview, setImgPreview] = useState("");
  const [err, setErr] = useState("");

  const handleDrop = e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = e2 => {
        setImgPreview(e2.target.result);
        setImgUrl(e2.target.result);
      };
      reader.readAsDataURL(file);
    } else setErr("Only image files allowed.");
  };

  const fileSelect = e => {
    const url = e.target.value;
    setImgUrl(url);
    setImgPreview(url.match(/^data:/) ? url : "");
  };

  return (
    <form
      className="mint-form"
      onSubmit={e => {
        e.preventDefault();
        if (!name) return setErr("Name required");
        if (!imgUrl) return setErr("Image required");
        setErr(""); onMint({ name, uri: imgUrl });
        setName(""); setImgUrl(""); setImgPreview("");
      }}
    >
      <div className="mint-form-row">
        <label htmlFor="mintname">NFT Name</label>
        <input className="input" autoFocus spellCheck={false} id="mintname" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} maxLength={64}/>
      </div>
      <div className="mint-form-row">
        <label htmlFor="mintimg">Image URL (or drag+drop):</label>
        <input
          className="input"
          id="mintimg"
          placeholder="https:// or data:..."
          value={imgUrl}
          onChange={fileSelect}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        />
        {imgPreview && (
          <div className="img-preview" aria-label="Image preview">
            <img src={imgPreview} alt="preview" height={72}/>
          </div>
        )}
      </div>
      {err && <div className="notif" style={{background:'#fde0e0',color:'#c90000'}}>{err}</div>}
      <button className="btn btn-cta" type="submit">Mint NFT</button>
    </form>
  );
}
