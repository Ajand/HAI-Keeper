import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "dotenv/config";

import { expect } from "chai";

import { mintHai } from "./fixtures";

import { Collateral, Safe } from "../src/lib";
import { getPastSafeModifications } from "../src/Keeper/EventHandlers";

describe("Safe class", () => {
  it("Should have proper safe data after initialization", async () => {
    const { geb, provider } = await loadFixture(mintHai);

    const startingBlock = Number(process.env.FORK_BLOCK_NUMBER);
    const endBlock = (await provider.getBlock("latest")).number;

    const wethCollateral = new Collateral(
      { provider, geb },
      geb.tokenList.WETH
    );

    await wethCollateral.init();

    const pastModifications = await getPastSafeModifications({ geb, provider })(
      startingBlock,
      endBlock,
      "",
      1
    );

    const safe = new Safe(
      { provider, geb },
      wethCollateral,
      pastModifications[0].args._safe
    );

    await safe.init();

    expect(safe.lockedCollateral).to.not.be.undefined;
    expect(safe.generatedDebt).to.not.be.undefined;
  });
});
