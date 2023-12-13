import {
  getProvider,
  resetNetwork,
  createFixtureWallet,
  gebUtils,
  mineBlocks,
} from "../utils";
import { ethers } from "ethers";

export async function mintHai() {
  const provider = getProvider();
  await resetNetwork();
  const fixtureWallet = await createFixtureWallet(provider);

  const gebUtilsResult = gebUtils(fixtureWallet);

  const { openSafeAndGenerateDebt, geb, getUserHaiBalance } = gebUtilsResult;

  const collateralAmount = ethers.utils.parseEther("5").toHexString();
  const haiAmount = ethers.utils.parseEther("7445").toHexString();

  await openSafeAndGenerateDebt(collateralAmount, haiAmount);

  console.debug(
    "Fixture wallet system coin balance after minting fixture: ",
    ethers.utils.formatEther(await getUserHaiBalance())
  );

  return { ...gebUtilsResult, provider, fixtureWallet, geb };
}

export async function generateTwentySafe() {
  const provider = getProvider();
  resetNetwork();

  const fixtureWallet = await createFixtureWallet(provider);
  const { geb } = gebUtils(fixtureWallet);

  for (var i = 0; i < 10; i++) {
    await mineBlocks((i + 100) * (i + 1));

    const workingWallet = await createFixtureWallet(provider);
    const { openSafeAndGenerateDebt } = gebUtils(workingWallet);

    const collateralAmount = ethers.utils.parseEther("5").toHexString();
    const haiAmount = ethers.utils.parseEther("5000").toHexString();

    await openSafeAndGenerateDebt(collateralAmount, haiAmount);

    console.debug(`${i + 1} Safes has been opened.`);
  }

  return { provider, fixtureWallet, geb };
}
