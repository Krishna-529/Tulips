import React, { useEffect, useState } from "react";

export default function BankDashboard({ principal, getBalance, transfer, payout }) {
  const [balance, setBalance] = useState("0");
  const [dest, setDest] = useState("");
  const [amt, setAmt] = useState("");
  const [msg, setMsg] = useState("");
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => { getBalance && getBalance().then(setBalance); }, [getBalance]);

  if (!principal || !getBalance) return <div className="dashboard"><div className="skeleton" style={{height:100}}/></div>;

  return (
    <div className="dashboard">
      <div className="dash-header">
        <h2>
          <span role="img" aria-label="bank">🏦</span> DAMN Bank
        </h2>
      </div>
      <div className="account-card">
        <div className="mono">Principal:<br/>{principal}</div>
        <div className="balance-big">{balance} <span className="token">DAMN</span></div>
      </div>
      <button className="btn btn-cta" style={{marginBottom:"1em"}} onClick={async () => {
        setMsg("Claiming initial payout...");
        setTxLoading(true);
        await payout();
        setMsg("Claimed! Refreshing balance...");
        setTimeout(() => { setTxLoading(false); setMsg(""); getBalance().then(setBalance); }, 1300);
      }} disabled={txLoading}>
        <span role="img" aria-label="gift">🎁</span> Claim 1,000 DAMN
      </button>

      <form className="transfer-form" onSubmit={async e => {
        e.preventDefault();
        setTxLoading(true);
        setMsg("Transferring...");
        await transfer(dest, amt);
        setMsg("Transferred! Refreshing balance...");
        setDest(""); setAmt("");
        setTimeout(() => { setTxLoading(false); setMsg(""); getBalance().then(setBalance); }, 1400);
      }}>
        <h4><span role="img" aria-label="send">🔁</span> Transfer</h4>
        <input value={dest} onChange={e => setDest(e.target.value)} placeholder="Recipient Principal" className="input" required />
        <input value={amt} onChange={e => setAmt(e.target.value)} placeholder="Amount" className="input" type="number" min={1} required />
        <button className="btn"><span role="img" aria-label="send">📤</span> Send</button>
      </form>
      {msg && <div className="notif">{msg}</div>}
    </div>
  );
}
