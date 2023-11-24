import { ethers } from "ethers";

export const createFixtureWallet = async (
  provider: ethers.providers.Provider
) => {
  const fixtureWallet = ethers.Wallet.createRandom().connect(provider);
  //@ts-ignore
  await provider.send("hardhat_setBalance", [
    fixtureWallet.address,
    ethers.utils.parseEther("1000000").toHexString(),
  ]);
  return fixtureWallet;
};
