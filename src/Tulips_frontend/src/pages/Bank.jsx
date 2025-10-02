import React, { useState } from "react";
import { useBank } from "../hooks/useBank";

export default function Bank() {
  const { principal, getBalance, transfer, payout } = useBank();
  const [balance, setBalance] = useState("");
  const [dest, setDest] = useState("");
  const [amt, setAmt] = useState("");
  const [msg, setMsg] = useState("");
  const [txLoading, setTxLoading] = useState(false);
  const [balanceVis, setBalanceVis] = useState(false);
  const [payoutClaimed, setPayoutClaimed] = useState(false);

  // "Check balance" handler
  async function handleCheckBalance() {
    setBalance("...");
    const bal = await getBalance();
    setBalance(bal);
    setBalanceVis(true);
  }

  // "Claim payout" handler
  async function handlePayout() {
    setTxLoading(true);
    setMsg("Processing payout...");
    const result = await payout();
    if (result === "Already Claimed") {
      setPayoutClaimed(true);
      setMsg("Payout already claimed.");
    } else if (result === "Payout Successful") {
      setMsg("🎉 Payout successful! Refreshing...");
      setTimeout(() => {
        setMsg("");
      }, 1200);
    } else {
      setMsg(result ?? "Unknown error");
    }
    setTxLoading(false);
  }

  // "Transfer" handler
  async function handleTransfer(e) {
    e.preventDefault();
    setTxLoading(true);
    setMsg("Transferring...");

    const result = await transfer(dest, amt);

    if (!result.ok) {
      setMsg(`❌ Transfer failed: ${result.error}`);
    } else {
      setMsg("✅ Transferred! Updating balance...");
      setDest("");
      setAmt("");
    }

    setTimeout(() => {
      setTxLoading(false);
      // only clear message if success, errors stay visible a bit longer
      if (result.ok) setMsg("");
    }, result.ok ? 1200 : 3000);
  }

  if (!principal)
    return (
      <div className="dashboard bank-dashboard">
        <div
          className="skeleton"
          style={{ minHeight: 120, marginTop: "3em" }}
        ></div>
      </div>
    );

  return (
    <div className="dashboard bank-dashboard">
      {/* ACCOUNT SECTION */}
      <div className="account-card">
        <span className="account-title">🪪 Your Account</span>
        <div className="account-principal">{principal}</div>
        <button
          className="btn btn-cta"
          onClick={handleCheckBalance}
          style={{ marginTop: "0.7em" }}
        >
          Check Balance
        </button>
        {balanceVis && (
          <div className="balance-display">
            {balance} <span className="token">DAMN</span>
          </div>
        )}
      </div>

      {/* PAYOUT SECTION */}
      <div className="payout-card">
        <span className="payout-title">🎁 Initial Payout</span>
        <div className="payout-desc">
          Get a free <b>10,000 DAMN</b> starter balance!
        </div>
        <button
          className={`btn payout-btn${
            payoutClaimed ? " payout-btn-disabled" : ""
          }`}
          disabled={txLoading || payoutClaimed}
          onClick={handlePayout}
        >
          {txLoading ? <span className="spinner"></span> : "🎁 Claim 10,000 DAMN"}
        </button>
        {payoutClaimed && (
          <div className="notif notif-disabled">Payout already claimed.</div>
        )}
      </div>

      {/* TRANSFER SECTION */}
      <div className="transfer-card">
        <span className="transfer-title">Transfer DAMN</span>
        <form
          className="transfer-form"
          autoComplete="off"
          onSubmit={handleTransfer}
        >
          <label>Recipient Principal:</label>
          <input
            className="input"
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            required
            placeholder="Principal..."
          />
          <label>Amount:</label>
          <input
            className="input"
            value={amt}
            onChange={(e) => setAmt(e.target.value)}
            type="number"
            min={1}
            required
            placeholder="Amount..."
          />
          <div className="transfer-fee">
            <span>⚠️ 3% fee applies to each transfer</span>
          </div>
          <button
            className="btn"
            type="submit"
            disabled={txLoading}
            style={{ width: "100%" }}
          >
            {txLoading ? <span className="spinner"></span> : "📤 Send"}
          </button>
        </form>
      </div>

      {/* NOTIFICATION BAR */}
      {msg && <div className="notif">{msg}</div>}
    </div>
  );
}
