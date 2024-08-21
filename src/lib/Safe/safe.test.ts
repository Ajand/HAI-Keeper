import { ethers } from "ethers";
import { TokenData } from "@hai-on-op/sdk";
import { EventEmitter } from "events";

import { Safe } from "./safe";
import {
  ISafeProvider,
  ILogger,
  Collateral,
  SafeInfo,
  FlashSwapStrategy,
} from "./types";

import { TransactionManager } from "../TransactionQueue/transaction-manager";

jest.mock("fs/promises");

// Mock dependencies
const mockSafeProvider: jest.Mocked<ISafeProvider> = {
  getSafeInfo: jest.fn(),
  liquidateSafe: jest.fn(),
};

const mockLogger: jest.Mocked<ILogger> = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

const testDir = "./test_data";

const mockTransactionManager = new TransactionManager(testDir);

const mockTokenData: TokenData = {
  address: "0x1234567890123456789012345678901234567890",
  decimals: 18,
  symbol: "MOCK",
  label: "Mock Token",
  bytes32String: "mockCollateralType",
  collateralJoin: "0x2345678901234567890123456789012345678901",
  collateralAuctionHouse: "0x3456789012345678901234567890123456789012",
  isCollateral: true,
  hasRewards: false,
};

const mockCollateral: jest.Mocked<Collateral> = {
  tokenData: mockTokenData,
  initialized: true,
  init: jest.fn(),
  updateInfo: jest.fn(),
  getNormalizedInfo: jest.fn(),
  getParams: jest.fn(),
  getData: jest.fn(),
};

const mockFlashSwapStrategy: jest.Mocked<FlashSwapStrategy> = {
  liquidateAndSettleSafe: jest.fn(),
};

describe("Safe", () => {
  let safe: Safe;
  const mockAddress = "0x1234567890123456789012345678901234567890";

  beforeEach(() => {
    jest.clearAllMocks();
    safe = new Safe(
      mockSafeProvider,
      mockLogger,
      mockTransactionManager,
      mockAddress,
      mockCollateral
    );
  });

  describe("init", () => {
    it("should initialize the safe successfully", async () => {
      mockSafeProvider.getSafeInfo.mockResolvedValue({
        lockedCollateral: ethers.BigNumber.from(100),
        generatedDebt: ethers.BigNumber.from(50),
      });

      await safe.init();

      expect(mockLogger.debug).toHaveBeenCalledWith("Initializing safe...");
      expect(mockSafeProvider.getSafeInfo).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Safe initialized successfully"
      );
    });

    it("should throw an error if initialization fails", async () => {
      mockSafeProvider.getSafeInfo.mockRejectedValue(new Error("API Error"));

      await expect(safe.init()).rejects.toThrow("Failed to initialize safe");
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("updateInfo", () => {
    it("should update safe info successfully", async () => {
      const mockSafeInfo: SafeInfo = {
        lockedCollateral: ethers.BigNumber.from(100),
        generatedDebt: ethers.BigNumber.from(50),
      };
      mockSafeProvider.getSafeInfo.mockResolvedValue(mockSafeInfo);

      await safe.updateInfo();

      expect(mockLogger.debug).toHaveBeenCalledWith("Updating safe info...");
      expect(mockSafeProvider.getSafeInfo).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith("Safe info updated", {
        safeInfo: mockSafeInfo,
      });
    });

    it("should throw an error if update fails", async () => {
      mockSafeProvider.getSafeInfo.mockRejectedValue(new Error("API Error"));

      await expect(safe.updateInfo()).rejects.toThrow(
        "Failed to update safe info"
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("isCritical", () => {
    beforeEach(async () => {
      // Mock successful initialization
      mockSafeProvider.getSafeInfo.mockResolvedValue({
        lockedCollateral: ethers.BigNumber.from(100),
        generatedDebt: ethers.BigNumber.from(50),
      });
      await safe.init();
    });

    it("should return true when safe is critical", async () => {
      await safe.init(); // Initialize the safe
      const mockSafeInfo: SafeInfo = {
        lockedCollateral: ethers.BigNumber.from(100),
        generatedDebt: ethers.BigNumber.from(50),
      };
      mockSafeProvider.getSafeInfo.mockResolvedValue(mockSafeInfo);
      mockCollateral.getData.mockReturnValue({
        liquidationPrice: ethers.BigNumber.from(1),
        accumulatedRate: ethers.BigNumber.from(2),
      } as any);

      expect(safe.isCritical()).toBe(true);
    });

    it("should return false when safe is not critical", async () => {
      await safe.init(); // Initialize the safe
      const mockSafeInfo: SafeInfo = {
        lockedCollateral: ethers.BigNumber.from(100),
        generatedDebt: ethers.BigNumber.from(50),
      };
      mockSafeProvider.getSafeInfo.mockResolvedValue(mockSafeInfo);
      mockCollateral.getData.mockReturnValue({
        liquidationPrice: ethers.BigNumber.from(2),
        accumulatedRate: ethers.BigNumber.from(1),
      } as any);

      expect(safe.isCritical()).toBe(false);
    });

    it("should throw an error if safe is not initialized", () => {
      const uninitializedSafe = new Safe(
        mockSafeProvider,
        mockLogger,
        mockTransactionManager,
        mockAddress,
        mockCollateral
      );
      expect(() => uninitializedSafe.isCritical()).toThrow(
        "Safe not initialized"
      );
    });
  });

  describe("canLiquidate", () => {
    it("should return true when safe can be liquidated", async () => {
      await safe.init(); // Initialize the safe
      jest.spyOn(safe, "isCritical").mockReturnValue(true);

      expect(safe.canLiquidate()).toBe(true);
    });

    it("should return false when safe cannot be liquidated", async () => {
      await safe.init(); // Initialize the safe
      jest.spyOn(safe, "isCritical").mockReturnValue(false);

      expect(safe.canLiquidate()).toBe(false);
    });
  });

  describe("liquidate", () => {
    it("should liquidate the safe successfully without flash swap", async () => {
      await safe.init(); // Initialize the safe
      jest.spyOn(safe, "canLiquidate").mockReturnValue(true);
      mockSafeProvider.liquidateSafe.mockResolvedValue({
        transactionHash: "mockHash",
      } as any);

      await safe.liquidate();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Liquidating safe",
        expect.any(Object)
      );
      expect(mockSafeProvider.liquidateSafe).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Safe liquidated successfully",
        expect.any(Object)
      );
    });

    it("should liquidate the safe successfully with flash swap", async () => {
      const safeWithFlashSwap = new Safe(
        mockSafeProvider,
        mockLogger,
        mockTransactionManager,
        mockAddress,
        mockCollateral,
        mockFlashSwapStrategy
      );
      await safeWithFlashSwap.init(); // Initialize the safe
      jest.spyOn(safeWithFlashSwap, "canLiquidate").mockReturnValue(true);

      await safeWithFlashSwap.liquidate();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Liquidating safe",
        expect.any(Object)
      );
      expect(mockFlashSwapStrategy.liquidateAndSettleSafe).toHaveBeenCalled();
    });

    it("should throw an error if safe cannot be liquidated", async () => {
      await safe.init(); // Initialize the safe
      jest.spyOn(safe, "canLiquidate").mockReturnValue(false);

      await expect(safe.liquidate()).rejects.toThrow(
        "Safe is not liquidatable"
      );
    });
  });
});
