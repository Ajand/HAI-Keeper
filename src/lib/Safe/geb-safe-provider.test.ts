import { ethers } from "ethers";
import { Geb } from "@hai-on-op/sdk";
import { GebSafeProvider } from "./geb-safe-provider";

jest.mock("@hai-on-op/sdk");

describe("GebSafeProvider", () => {
  let gebSafeProvider: GebSafeProvider;
  let mockGeb: jest.Mocked<Geb>;
  let mockSafes: jest.Mock;
  let mockLiquidateSAFE: jest.Mock;

  beforeEach(() => {
    // Create mock functions
    mockSafes = jest.fn();
    mockLiquidateSAFE = jest.fn();

    // Create a mock Geb instance
    mockGeb = {
      contracts: {
        safeEngine: {
          safes: mockSafes,
        },
        liquidationEngine: {
          liquidateSAFE: mockLiquidateSAFE,
        },
      },
    } as unknown as jest.Mocked<Geb>;

    // Instantiate GebSafeProvider with the mock Geb
    gebSafeProvider = new GebSafeProvider(mockGeb);
  });

  describe("getSafeInfo", () => {
    it("should return SafeInfo for a given safe address and collateral type", async () => {
      const mockSafeParams = {
        lockedCollateral: ethers.BigNumber.from(100),
        generatedDebt: ethers.BigNumber.from(50),
      };
      mockSafes.mockResolvedValue(mockSafeParams);

      const result = await gebSafeProvider.getSafeInfo(
        "0x123",
        ethers.utils.formatBytes32String("ETH-A")
      );

      expect(result).toEqual(mockSafeParams);
      expect(mockSafes).toHaveBeenCalledWith(
        ethers.utils.formatBytes32String("ETH-A"),
        "0x123"
      );
    });

    it("should throw an error if fetching safe info fails", async () => {
      mockSafes.mockRejectedValue(new Error("Failed to fetch safe info"));

      await expect(
        gebSafeProvider.getSafeInfo(
          "0x123",
          ethers.utils.formatBytes32String("ETH-A")
        )
      ).rejects.toThrow("Failed to fetch safe info");
    });
  });

  describe("liquidateSafe", () => {
    it("should liquidate a safe and return the transaction receipt", async () => {
      const mockTx = {
        wait: jest.fn().mockResolvedValue({ transactionHash: "0x456" }),
      };
      mockLiquidateSAFE.mockResolvedValue(mockTx);

      const result = await gebSafeProvider.liquidateSafe(
        "0x123",
        ethers.utils.formatBytes32String("ETH-A")
      );

      expect(result).toEqual({ transactionHash: "0x456" });
      expect(mockLiquidateSAFE).toHaveBeenCalledWith(
        ethers.utils.formatBytes32String("ETH-A"),
        "0x123"
      );
    });

    it("should throw an error if liquidation fails", async () => {
      mockLiquidateSAFE.mockRejectedValue(new Error("Liquidation failed"));

      await expect(
        gebSafeProvider.liquidateSafe(
          "0x123",
          ethers.utils.formatBytes32String("ETH-A")
        )
      ).rejects.toThrow("Liquidation failed");
    });
  });
});
