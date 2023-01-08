import { ethers } from "ethers";

export const RadFromWad = (wad: ethers.BigNumber) => {
  return wad.mul(ethers.utils.parseUnits("1", 27));
};
