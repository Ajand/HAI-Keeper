import {
  getProvider,
  resetNetwork,
  createFixtureWallet,
  gebUtils,
} from "../utils";
import { ethers } from "ethers";

export async function mintHai() {
  const provider = getProvider();
  resetNetwork();
  const fixtureWallet = await createFixtureWallet(provider);

  const { openSafeAndGenerateDebt, geb, getUserHaiBalance } =
    gebUtils(fixtureWallet);

  const collateralAmount = ethers.utils.parseEther("5").toHexString();
  const haiAmount = ethers.utils.parseEther("5000").toHexString();

  await openSafeAndGenerateDebt(collateralAmount, haiAmount);

  console.log(
    "Fixture wallet system coin balance after minting fixture: ",
    ethers.utils.formatEther(await getUserHaiBalance())
  );

  return { fixtureWallet, geb };
}
