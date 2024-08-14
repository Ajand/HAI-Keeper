// collateral.test.ts
import { ethers } from "ethers";
import { TokenData } from "@hai-on-op/sdk";

import { Collateral } from "./collateral";
import {
  ICollateralFetcher,
  ILogger,
  CollateralParams,
  CollateralData,
} from "./types";

jest.mock("@hai-on-op/sdk", () => ({
  TokenData: jest
    .fn()
    .mockImplementation((symbol, name, decimals, address, bytes32String) => ({
      symbol,
      name,
      decimals,
      address,
      bytes32String,
    })),
}));

describe("Collateral", () => {
  let collateral: Collateral;
  let mockFetcher: jest.Mocked<ICollateralFetcher>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockTokenData: TokenData;

  beforeEach(() => {
    mockFetcher = {
      fetchParams: jest.fn(),
      fetchData: jest.fn(),
    };

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
    };

    mockTokenData = {
      bytes32String: ethers.utils.formatBytes32String("TEST"),
      symbol: "TEST",
    } as TokenData;

    collateral = new Collateral(mockTokenData, mockFetcher, mockLogger);
  });

  describe("init", () => {
    it("should initialize collateral successfully", async () => {
      const mockParams: CollateralParams = {
        debtCeiling: ethers.utils.parseUnits("1000", 45),
        debtFloor: ethers.utils.parseUnits("100", 45),
      };

      const mockData: CollateralData = {
        debtAmount: ethers.utils.parseUnits("500", 18),
        lockedAmount: ethers.utils.parseUnits("1000", 18),
        accumulatedRate: ethers.utils.parseUnits("1", 27),
        safetyPrice: ethers.utils.parseUnits("100", 27),
        liquidationPrice: ethers.utils.parseUnits("80", 27),
      };

      mockFetcher.fetchParams.mockResolvedValue(mockParams);
      mockFetcher.fetchData.mockResolvedValue(mockData);

      await collateral.init();

      expect(collateral.initialized).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith("Initializing collateral.");
      expect(mockLogger.debug).toHaveBeenCalledWith("Collateral initialized.");
    });

    it("should throw error when initialization fails", async () => {
      mockFetcher.fetchParams.mockRejectedValue(new Error("Fetch failed"));

      await expect(collateral.init()).rejects.toThrow(
        "Failed to initialize collateral"
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("updateInfo", () => {
    it("should update collateral info successfully", async () => {
      const mockParams: CollateralParams = {
        debtCeiling: ethers.utils.parseUnits("1000", 45),
        debtFloor: ethers.utils.parseUnits("100", 45),
      };

      const mockData: CollateralData = {
        debtAmount: ethers.utils.parseUnits("500", 18),
        lockedAmount: ethers.utils.parseUnits("1000", 18),
        accumulatedRate: ethers.utils.parseUnits("1", 27),
        safetyPrice: ethers.utils.parseUnits("100", 27),
        liquidationPrice: ethers.utils.parseUnits("80", 27),
      };

      mockFetcher.fetchParams.mockResolvedValue(mockParams);
      mockFetcher.fetchData.mockResolvedValue(mockData);

      await collateral.updateInfo();

      expect(mockLogger.debug).toHaveBeenCalledWith("Updating collateral.");
      expect(mockLogger.debug).toHaveBeenCalledWith("Collateral updated.");
    });

    it("should throw error when update fails", async () => {
      mockFetcher.fetchData.mockRejectedValue(new Error("Fetch failed"));

      await expect(collateral.updateInfo()).rejects.toThrow(
        "Failed to update collateral information"
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("getNormalizedInfo", () => {
    it("should return normalized info when initialized", async () => {
      const mockParams: CollateralParams = {
        debtCeiling: ethers.utils.parseUnits("1000", 45),
        debtFloor: ethers.utils.parseUnits("100", 45),
      };

      const mockData: CollateralData = {
        debtAmount: ethers.utils.parseUnits("500", 18),
        lockedAmount: ethers.utils.parseUnits("1000", 18),
        accumulatedRate: ethers.utils.parseUnits("1", 27),
        safetyPrice: ethers.utils.parseUnits("100", 27),
        liquidationPrice: ethers.utils.parseUnits("80", 27),
      };

      mockFetcher.fetchParams.mockResolvedValue(mockParams);
      mockFetcher.fetchData.mockResolvedValue(mockData);

      await collateral.init();

      const normalizedInfo = collateral.getNormalizedInfo();

      expect(normalizedInfo).toEqual({
        debtCeiling: "1000.0",
        debtFloor: "100.0",
        debtAmount: "500.0",
        lockedAmount: "1000.0",
        accumulatedRate: "1.0",
        safetyPrice: "100.0",
        liquidationPrice: "80.0",
      });
    });

    it("should throw error when not initialized", () => {
      expect(() => collateral.getNormalizedInfo()).toThrow(
        "Collateral is not initialized yet."
      );
    });

    describe("getParams", () => {
      it("should return collateral params when initialized", async () => {
        const mockParams: CollateralParams = {
          debtCeiling: ethers.utils.parseUnits("1000", 45),
          debtFloor: ethers.utils.parseUnits("100", 45),
        };

        mockFetcher.fetchParams.mockResolvedValue(mockParams);
        mockFetcher.fetchData.mockResolvedValue({} as CollateralData);

        await collateral.init();

        const params = collateral.getParams();

        expect(params).toEqual(mockParams);
      });

      it("should throw error when not initialized", () => {
        expect(() => collateral.getParams()).toThrow(
          "Collateral is not initialized yet."
        );
      });
    });

    describe("getData", () => {
      it("should return collateral data when initialized", async () => {
        const mockData: CollateralData = {
          debtAmount: ethers.utils.parseUnits("500", 18),
          lockedAmount: ethers.utils.parseUnits("1000", 18),
          accumulatedRate: ethers.utils.parseUnits("1", 27),
          safetyPrice: ethers.utils.parseUnits("100", 27),
          liquidationPrice: ethers.utils.parseUnits("80", 27),
        };

        mockFetcher.fetchParams.mockResolvedValue({} as CollateralParams);
        mockFetcher.fetchData.mockResolvedValue(mockData);

        await collateral.init();

        const data = collateral.getData();

        expect(data).toEqual(mockData);
      });

      it("should throw error when not initialized", () => {
        expect(() => collateral.getData()).toThrow(
          "Collateral is not initialized yet."
        );
      });
    });
  });
});
