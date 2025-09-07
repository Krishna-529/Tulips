import { useState, useEffect } from "react";
import { AuthClient } from "@dfinity/auth-client";

export function useIdentity() {
  const [principal, setPrincipal] = useState(null);

  useEffect(() => {
    AuthClient.create().then(client => {
      client.isAuthenticated().then(authenticated => {
        if (authenticated) setPrincipal(client.getIdentity().getPrincipal().toText());
      });
    });
  }, []);

  return { principal };
}
