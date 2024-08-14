import { ethers } from "ethers";
import { Geb, TokenData } from "@hai-on-op/sdk";
import { Collateral } from "./collateral";
import { GebCollateralFetcher } from "./geb-collateral-fetcher";
import { ILogger } from "./types";
import {
  CollateralFactory,
  GebCollateralFetcherFactory,
  CollateralFetcherType,
  createCollateralFetcherFactory,
} from "./collateral-factory";

jest.mock("@hai-on-op/sdk");
jest.mock("./collateral");
jest.mock("./geb-collateral-fetcher");

describe("Collateral Factory", () => {
  let mockGeb: jest.Mocked<Geb>;
  let mockLogger: ILogger;
  let mockTokenData: TokenData;
  let mockCParams: jest.Mock;
  let mockCData: jest.Mock;

  beforeEach(() => {
    // Create mock functions
    mockCParams = jest.fn();
    mockCData = jest.fn();

    // Create a mock Geb instance
    mockGeb = {
      contracts: {
        safeEngine: {
          cParams: mockCParams,
          cData: mockCData,
        },
      },
    } as unknown as jest.Mocked<Geb>;

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
    };

    mockTokenData = {
      symbol: "TEST",
      name: "Test Token",
      decimals: 18,
      address: "0x1234567890123456789012345678901234567890",
      bytes32String: ethers.utils.formatBytes32String("TEST"),
      label: "Test Label",
      collateralJoin: "0x0987654321098765432109876543210987654321",
      collateralAuctionHouse: "0x1111111111111111111111111111111111111111",
      isCollateral: true,
      hasRewards: false,
      // Add any other required properties here
    } as TokenData;
  });

  describe("GebCollateralFetcherFactory", () => {
    it("should create a GebCollateralFetcher", () => {
      const factory = new GebCollateralFetcherFactory(mockGeb);
      const fetcher = factory.createFetcher();
      expect(fetcher).toBeInstanceOf(GebCollateralFetcher);
      expect(GebCollateralFetcher).toHaveBeenCalledWith(mockGeb);
    });
  });

  describe("CollateralFactory", () => {
    it("should create a Collateral instance", () => {
      const fetcherFactory = new GebCollateralFetcherFactory(mockGeb);
      const factory = new CollateralFactory(fetcherFactory, mockLogger);
      const collateral = factory.createCollateral(mockTokenData);

      expect(collateral).toBeInstanceOf(Collateral);
      expect(Collateral).toHaveBeenCalledWith(
        mockTokenData,
        expect.any(GebCollateralFetcher),
        mockLogger
      );
    });
  });

  describe("createCollateralFetcherFactory", () => {
    it("should create a GebCollateralFetcherFactory for GEB type", () => {
      const factory = createCollateralFetcherFactory(
        CollateralFetcherType.GEB,
        mockGeb
      );
      expect(factory).toBeInstanceOf(GebCollateralFetcherFactory);
    });

    it("should throw an error for unsupported type", () => {
      expect(() => {
        createCollateralFetcherFactory(
          "UNSUPPORTED" as CollateralFetcherType,
          mockGeb
        );
      }).toThrow("Unsupported collateral fetcher type: UNSUPPORTED");
    });
  });

  describe("Integration test", () => {
    it("should create a Collateral instance with GebCollateralFetcher", () => {
      const fetcherFactory = createCollateralFetcherFactory(
        CollateralFetcherType.GEB,
        mockGeb
      );
      const factory = new CollateralFactory(fetcherFactory, mockLogger);
      const collateral = factory.createCollateral(mockTokenData);

      expect(collateral).toBeInstanceOf(Collateral);
      expect(Collateral).toHaveBeenCalledWith(
        mockTokenData,
        expect.any(GebCollateralFetcher),
        mockLogger
      );
      expect(GebCollateralFetcher).toHaveBeenCalledWith(mockGeb);
    });
  });
});
