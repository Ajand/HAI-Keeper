import { ethers } from "ethers";

export const WadFromRad = (rad: ethers.BigNumber) => {
  return rad.div(ethers.utils.parseUnits("1", 27));
};

export const FormatWad = (wad: ethers.BigNumber) => {
  return ethers.utils.formatUnits(wad, 18);
};
