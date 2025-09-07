import React, { useEffect, useState } from "react";
import { AuthClient } from "@dfinity/auth-client";
export default function Login({ onAuth }) {
  const [auth, setAuth] = useState(null);
  useEffect(() => { AuthClient.create().then(setAuth); }, []);
  if (!auth) return <div>Loading...</div>;
  return(
    <div style={{margin:"2em auto", maxWidth:320, textAlign:"center"}}>
      <button onClick={() => {
        auth.login({
          identityProvider: "https://identity.ic0.app/#authorize",
          onSuccess: onAuth,
        });
      }}>Sign in with Internet Identity</button>
    </div>
  );
}
