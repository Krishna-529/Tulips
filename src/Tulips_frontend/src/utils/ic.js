import { HttpAgent, Actor } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
// import { idlFactory as nft_idl, canisterId as nft_id } from "../../../declarations/nft";
import { idlFactory as market_idl, canisterId as market_id } from "../../../declarations/marketplace";
import { idlFactory as bank_idl, canisterId as bank_id } from "../../../declarations/dbank";

export async function getActors() {
  const auth = await AuthClient.create();

  // Ensure login if not authenticated
  if (!(await auth.isAuthenticated())) {
    await auth.login({ identityProvider: "https://identity.ic0.app/#authorize" });
  }

  const identity = auth.getIdentity();
  const agent = new HttpAgent({ identity });

  // Required for local development
  if (process.env.DFX_NETWORK !== "ic") {
    await agent.fetchRootKey();
  }

  // const nft = Actor.createActor(nft_idl, { agent, canisterId: nft_id });
  const market = Actor.createActor(market_idl, { agent, canisterId: market_id });
  const bank = Actor.createActor(bank_idl, { agent, canisterId: bank_id });

  // Safe principal extraction
  const principal = identity.getPrincipal ? identity.getPrincipal().toText() : "anonymous";

  return { market, bank, principal, authClient: auth };
}
