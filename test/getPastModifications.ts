import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "dotenv/config";

import hre, { ethers } from "hardhat";
import { expect } from "chai";

import { mintHai, generateTwentySafe } from "./fixtures";
import { getPastSafeModifications } from "../src/Keeper/EventHandlers";

describe("Get Past Modifications Logs", () => {
  it("Should find a single log", async () => {
    const { provider, geb, fixtureWallet } = await loadFixture(mintHai);

    const startingBlock = Number(process.env.FORK_BLOCK_NUMBER);
    const endBlock = (await provider.getBlock("latest")).number;

    const logs = await getPastSafeModifications({ geb, provider })(
      startingBlock,
      endBlock,
      "",
      1
    );

    expect(logs.length).to.be.equal(1);
  });

  it("Should find a hundred logs", async () => {
    const { provider, geb } = await loadFixture(generateTwentySafe);

    const startingBlock = Number(process.env.FORK_BLOCK_NUMBER);
    const endBlock = (await provider.getBlock("latest")).number;

    const logs = await getPastSafeModifications({ geb, provider })(
      startingBlock,
      endBlock,
      "",
      50
    );

    expect(logs.length).to.be.equal(10);
  });
});
