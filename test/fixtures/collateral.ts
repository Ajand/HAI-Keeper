import {
  getProvider,
  resetNetwork,
  createFixtureWallet,
  gebUtils,
  mineBlocks,
} from "../utils";
import { ethers } from "ethers";

export async function basicCollateralFixture() {
  const provider = getProvider();
  resetNetwork();
  const fixtureWallet = await createFixtureWallet(provider);

  const gebUtilsResult = gebUtils(fixtureWallet);

  return { ...gebUtilsResult, provider, fixtureWallet };
}
