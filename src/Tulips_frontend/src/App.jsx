import React, { useEffect, useState, Suspense } from "react";
import { getActors } from "./utils/ic";
import Login from "./components/Login";
import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import Bank from "./pages/Bank";
import "./main.css";

export default function App() {
  const [actors, setActors] = useState(null);
  const [page, setPage] = useState("home");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    getActors()
      .then(({ nft, market, bank, principal, authClient }) => {
        if (mounted) {
          setActors({ nft, market, bank, principal, authClient });
          window.marketplacePrincipal = market.actorPrincipal;
        }
      })
      .catch(e => setError("Failed to load actors: " + e));
    return () => { mounted = false; };
  }, []);

  if (error) return <div className="notif">{error}</div>;

  if (!actors)
    return (
      <div className="app-startup">
        <div className="spinner" /><span>Loading App...</span>
      </div>
    );

  if (!actors.principal)
    return <Login onAuth={() => window.location.reload()} />;

  return (
    <div className="app-shell">
      <nav>
        <button aria-label="Home" onClick={() => setPage("home")}>Home</button>
        <button aria-label="Marketplace" onClick={() => setPage("market")}>Marketplace</button>
        <button aria-label="Bank" onClick={() => setPage("bank")}>Bank</button>
        <button aria-label="Logout" onClick={async () => {
          await actors.authClient.logout();
          window.location.reload();
        }}>Logout</button>
        <span className="user-principal">{actors.principal.substring(0,12)}…</span>
      </nav>
      <main>
        <Suspense fallback={<div className="notif">Loading...</div>}>
          {page === "home" && <Home />}
          {page === "market" && <Marketplace />}
          {page === "bank" && <Bank />}
        </Suspense>
      </main>
    </div>
  );
}
