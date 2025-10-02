import React, { useState } from "react";
import { useBank } from "./hooks/useBank";
import Bank from "./pages/Bank";
import NFTDashboard from "./components/NFTDashboard";
import "./index.scss";
import "./nft-style.css";

export default function App() {
  const { principal } = useBank();
  const [currentSection, setCurrentSection] = useState("bank");

  const sections = [
    { id: "bank", label: "Banking", icon: "🏦" },
    { id: "nft", label: "NFT Marketplace", icon: "🎨" }
  ];

  const renderCurrentSection = () => {
    switch (currentSection) {
      case "bank":
        return <Bank />;
      case "nft":
        return <NFTDashboard />;
      default:
        return <Bank />;
    }
  };

  return (
    <div className="app">
      <nav className="main-navbar">
        <div className="brand-logo">
          <span className="brand-icon">💎</span>
          <span className="brand-name">DAMN Protocol</span>
        </div>

        <div className="nav-links">
          {sections.map(section => (
            <button
              key={section.id}
              className={currentSection === section.id ? "nav-active" : ""}
              onClick={() => setCurrentSection(section.id)}
            >
              {section.icon} {section.label}
            </button>
          ))}
        </div>

        <div className="nav-user">
          {principal ? (
            <div className="user-principal">
              {principal.slice(0, 8)}...{principal.slice(-4)}
            </div>
          ) : (
            <div className="user-principal">Connecting...</div>
          )}
        </div>
      </nav>

      <main className="main-content">
        {renderCurrentSection()}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>DAMN Protocol - Decentralized NFT Marketplace</p>
          <div className="footer-links">
            <span>Built on Internet Computer</span>
            <span>•</span>
            <span>ICRC-1 Token Standard</span>
          </div>
        </div>
      </footer>
    </div>
  );
}



// import React, { useEffect, useState, Suspense } from "react";
// import { getActors } from "./utils/ic";
// import Login from "./components/Login";
// import Home from "./pages/Home";
// import Marketplace from "./pages/Marketplace";
// import Bank from "./pages/Bank";
// import "./main.css"; // Make sure it's imported

// export default function App() {
//   const [actors, setActors] = useState(null);
//   const [page, setPage] = useState("home");
//   const [error, setError] = useState("");

//   useEffect(() => {
//     let mounted = true;
//     getActors()
//       .then(({ nft, market, bank, principal, authClient }) => {
//         if (mounted) {
//           setActors({ nft, market, bank, principal, authClient });
//           window.marketplacePrincipal = market.actorPrincipal;
//         }
//       })
//       .catch(e => setError("Failed to load actors: " + e));
//     return () => { mounted = false; };
//   }, []);

//   if (error) return <div className="notif">{error}</div>;

//   if (!actors)
//     return (
//       <div className="app-startup">
//         <div className="spinner" /><span>Loading App...</span>
//       </div>
//     );

//   if (!actors.principal)
//     return <Login onAuth={() => window.location.reload()} />;

//   return (
//     <div className="app-shell">
//       <nav className="main-navbar">
//         <div className="brand-logo">
//           <span role="img" aria-label="flower" style={{marginRight: 8}}>🌷</span>
//           <span className="brand-name">Tulips NFT Bank</span>
//         </div>
//         <div className="nav-links">
//           <button className={page==="home"?"nav-active":""} onClick={()=>setPage("home")}>Home</button>
//           <button className={page==="market"?"nav-active":""} onClick={()=>setPage("market")}>Marketplace</button>
//           <button className={page==="bank"?"nav-active":""} onClick={()=>setPage("bank")}>Bank</button>
//         </div>
//         <div className="nav-user">
//           <span className="user-principal">{actors.principal.substring(0,12)}…</span>
//           <button className="btn btn-cta" onClick={async () => {
//             await actors.authClient.logout();
//             window.location.reload();
//           }}>Logout</button>
//         </div>
//       </nav>
//       <main>
//         <Suspense fallback={<div className="notif">Loading...</div>}>
//           {page === "home" && <Home />}
//           {page === "market" && <Marketplace />}
//           {page === "bank" && <Bank />}
//         </Suspense>
//       </main>
//     </div>
//   );
// }
