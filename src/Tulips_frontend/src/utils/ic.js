import { HttpAgent, Actor } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { idlFactory as nft_idl, canisterId as nft_id } from "../../../declarations/nft";
import { idlFactory as market_idl, canisterId as market_id } from "../../../declarations/marketplace";
import { idlFactory as bank_idl, canisterId as bank_id } from "../../../declarations/dbank";

export async function getActors() {
  const auth = await AuthClient.create();
  let identity;
  if (await auth.isAuthenticated()) identity = auth.getIdentity();
  else {
    await auth.login({ identityProvider: "https://identity.ic0.app/#authorize" });
    identity = auth.getIdentity();
  }
  const agent = new HttpAgent({ identity });
  if (process.env.DFX_NETWORK === "local") await agent.fetchRootKey();

  const nft = Actor.createActor(nft_idl, { agent, canisterId: nft_id });
  const market = Actor.createActor(market_idl, { agent, canisterId: market_id });
  const bank = Actor.createActor(bank_idl, { agent, canisterId: bank_id });
  const principal = identity.getPrincipal().toText();
  return { nft, market, bank, principal, authClient: auth };
}
