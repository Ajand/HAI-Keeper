import { ethers } from "ethers";
import { Geb } from "@hai-on-op/sdk";
import { GebCollateralFetcher } from "./geb-collateral-fetcher";

jest.mock("@hai-on-op/sdk");

describe("GebCollateralFetcher", () => {
  let gebCollateralFetcher: GebCollateralFetcher;
  let mockGeb: jest.Mocked<Geb>;
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

    // Instantiate GebCollateralFetcher with the mock Geb
    gebCollateralFetcher = new GebCollateralFetcher(mockGeb);
  });

  describe("fetchParams", () => {
    it("should fetch collateral parameters correctly", async () => {
      const mockParams = {
        debtCeiling: ethers.utils.parseUnits("1000", 45),
        debtFloor: ethers.utils.parseUnits("100", 45),
      };

      mockCParams.mockResolvedValue(mockParams);

      const result = await gebCollateralFetcher.fetchParams(
        ethers.utils.formatBytes32String("TEST")
      );

      expect(result).toEqual(mockParams);
      expect(mockCParams).toHaveBeenCalledWith(
        ethers.utils.formatBytes32String("TEST")
      );
    });

    it("should throw an error if fetching params fails", async () => {
      mockCParams.mockRejectedValue(new Error("Fetch failed"));

      await expect(
        gebCollateralFetcher.fetchParams(
          ethers.utils.formatBytes32String("TEST")
        )
      ).rejects.toThrow("Fetch failed");
    });
  });

  describe("fetchData", () => {
    it("should fetch collateral data correctly", async () => {
      const mockData = {
        debtAmount: ethers.utils.parseUnits("500", 18),
        lockedAmount: ethers.utils.parseUnits("1000", 18),
        accumulatedRate: ethers.utils.parseUnits("1", 27),
        safetyPrice: ethers.utils.parseUnits("100", 27),
        liquidationPrice: ethers.utils.parseUnits("80", 27),
      };

      mockCData.mockResolvedValue(mockData);

      const result = await gebCollateralFetcher.fetchData(
        ethers.utils.formatBytes32String("TEST")
      );

      expect(result).toEqual(mockData);
      expect(mockCData).toHaveBeenCalledWith(
        ethers.utils.formatBytes32String("TEST")
      );
    });

    it("should throw an error if fetching data fails", async () => {
      mockCData.mockRejectedValue(new Error("Fetch failed"));

      await expect(
        gebCollateralFetcher.fetchData(ethers.utils.formatBytes32String("TEST"))
      ).rejects.toThrow("Fetch failed");
    });
  });
});
