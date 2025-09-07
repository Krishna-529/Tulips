import React, { useEffect, useState } from "react";
import { useBank } from "../hooks/useBank";

export default function Bank() {
  const { principal, getBalance, transfer, payout } = useBank();
  const [balance, setBalance] = useState("0");
  const [dest, setDest] = useState("");
  const [amt, setAmt] = useState("");

  useEffect(() => { getBalance().then(setBalance); }, [getBalance]);

  return (
    <div>
      <h2>DAMN Token Bank</h2>
      <div>Principal: {principal}</div>
      <div>Balance: {balance}</div>
      <button onClick={payout}>Claim 1,000 DAMN Payout</button>
      <div>
        <input placeholder="Recipient Principal" value={dest} onChange={e=>setDest(e.target.value)}/>
        <input placeholder="Amount" value={amt} onChange={e=>setAmt(e.target.value)}/>
        <button onClick={() => transfer(dest, amt)}>Send</button>
      </div>
    </div>
  );
}
