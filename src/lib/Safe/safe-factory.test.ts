import { ethers } from "ethers";
import { Geb } from "@hai-on-op/sdk";
import { SafeFactory } from "./safe-factory";
import { Safe } from "./safe";
import { GebSafeProvider } from "./geb-safe-provider";
import { Collateral, FlashSwapStrategy, ILogger } from "./types";
import { TransactionQueue, QueStatus } from "../TransactionQueue";
import { BehaviorSubject, Subject } from "rxjs";
import { TransactionManager } from "../TransactionQueue/transaction-manager";

//
jest.mock("@hai-on-op/sdk");
jest.mock("./safe");
jest.mock("./geb-safe-provider");

jest.mock("fs/promises");

const testDir = "./test_data";
const mockTransactionManager = new TransactionManager(testDir);

describe("SafeFactory", () => {
  let safeFactory: SafeFactory;
  let mockGeb: jest.Mocked<Geb>;
  let mockProvider: jest.Mocked<ethers.providers.JsonRpcProvider>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockFlashSwapStrategy: jest.Mocked<FlashSwapStrategy>;

  beforeEach(() => {
    // Mock Geb
    mockGeb = {
      contracts: {
        safeEngine: {},
        liquidationEngine: {},
      },
    } as unknown as jest.Mocked<Geb>;

    // Mock provider
    mockProvider = {} as jest.Mocked<ethers.providers.JsonRpcProvider>;


    mockLogger = { debug: jest.fn(), error: jest.fn(), info: jest.fn() };
    mockFlashSwapStrategy = { liquidateAndSettleSafe: jest.fn() };

    safeFactory = new SafeFactory(
      mockGeb,
      mockProvider,
      mockTransactionManager,
      mockLogger,
      mockFlashSwapStrategy
    );
  });

  describe("createSafe", () => {
    it("should create and return a new Safe instance", () => {
      const mockCollateral: Collateral = {
        tokenData: {
          address: "0x123",
          decimals: 18,
          symbol: "TEST",
          label: "Test Token",
          bytes32String: ethers.utils.formatBytes32String("TEST"),
          collateralJoin: "0x456",
          collateralAuctionHouse: "0x789",
          isCollateral: true,
          hasRewards: false,
        },
        initialized: true,
        init: jest.fn(),
        updateInfo: jest.fn(),
        getNormalizedInfo: jest.fn(),
        getParams: jest.fn(),
        getData: jest.fn(),
      };
      const safeAddress = "0xabc";
      const keeperAddress = "0xdef";

      const result = safeFactory.createSafe(
        mockCollateral,
        safeAddress,
        keeperAddress
      );

      expect(result).toBeInstanceOf(Safe);
      expect(Safe).toHaveBeenCalledWith(
        expect.any(GebSafeProvider),
        mockLogger,
        mockTransactionManager,
        safeAddress,
        mockCollateral,
        mockFlashSwapStrategy
      );
    });

    it("should create a Safe without flash swap strategy if not provided", () => {
      const safeFactoryWithoutFlashSwap = new SafeFactory(
        mockGeb,
        mockProvider,
        mockTransactionManager,
        mockLogger
      );

      const mockCollateral: Collateral = {
        tokenData: {
          address: "0x123",
          decimals: 18,
          symbol: "TEST",
          label: "Test Token",
          bytes32String: ethers.utils.formatBytes32String("TEST"),
          collateralJoin: "0x456",
          collateralAuctionHouse: "0x789",
          isCollateral: true,
          hasRewards: false,
        },
        initialized: true,
        init: jest.fn(),
        updateInfo: jest.fn(),
        getNormalizedInfo: jest.fn(),
        getParams: jest.fn(),
        getData: jest.fn(),
      };
      const safeAddress = "0xabc";
      const keeperAddress = "0xdef";

      const result = safeFactoryWithoutFlashSwap.createSafe(
        mockCollateral,
        safeAddress,
        keeperAddress
      );

      expect(result).toBeInstanceOf(Safe);
      expect(Safe).toHaveBeenCalledWith(
        expect.any(GebSafeProvider),
        mockLogger,
        mockTransactionManager,
        safeAddress,
        mockCollateral,
        undefined
      );
    });
  });
});
