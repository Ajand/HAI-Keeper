import { ethers } from "ethers";
import { Geb, TokenData } from "@hai-on-op/sdk";
import {
  BehaviorSubject,
  combineLatest,
  map,
  Observable,
  distinctUntilChanged,
} from "rxjs";

interface CollateralInfrastructure {
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;
}

interface CollateralParams {
  // collateral params;
  debtCeiling: ethers.BigNumber; // RAD
  debtFloor: ethers.BigNumber; // RAD
}

interface CollateralData {
  debtAmount: ethers.BigNumber; // WAD
  lockedAmount: ethers.BigNumber; // WAD
  accumulatedRate: ethers.BigNumber; // RAY
  safetyPrice: ethers.BigNumber; // RAY
  liquidationPrice: ethers.BigNumber; // RAY
}

interface NormalizedData {
  debtCeiling: string;
  debtFloor: string;
  debtAmount: string;
  lockedAmount: string;
  accumulatedRate: string;
  safetyPrice: string;
  liquidationPrice: string;
}

export class Collateral {
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;

  initialized: boolean = false;

  // collateral bytes string;
  tokenData: TokenData;

  // collateral params;
  debtCeiling: ethers.BigNumber | undefined; // RAD
  debtFloor: ethers.BigNumber | undefined; // RAD

  // collateral data
  debtAmount: ethers.BigNumber | undefined; // WAD
  lockedAmount: ethers.BigNumber | undefined; // WAD
  accumulatedRate: ethers.BigNumber | undefined; // RAY
  safetyPrice: ethers.BigNumber | undefined; // RAY
  liquidationPrice: ethers.BigNumber | undefined; // RAY

  collateralParams$: BehaviorSubject<CollateralParams | null> =
    new BehaviorSubject<CollateralParams | null>(null);
  collateralData$: BehaviorSubject<CollateralData | null> =
    new BehaviorSubject<CollateralData | null>(null);

  initialized$: Observable<boolean> = combineLatest([
    this.collateralParams$,
    this.collateralData$,
  ]).pipe(
    map(([collateralParams, collateralData]) => {
      if (!collateralParams || !collateralData) return false;
      console.info(`Collateral ${this.tokenData.symbol} is initialized`);
      return true;
    }),
    distinctUntilChanged()
  );

  normalizedData$: Observable<NormalizedData | null> = combineLatest([
    this.collateralParams$,
    this.collateralData$,
  ]).pipe(
    map(([collateralParams, collateralData]) => {
      if (!collateralParams || !collateralData) return null;
      const { debtCeiling, debtFloor } = collateralParams;
      const {
        debtAmount,
        lockedAmount,
        accumulatedRate,
        safetyPrice,
        liquidationPrice,
      } = collateralData;

      return {
        debtCeiling: ethers.utils.formatUnits(debtCeiling, 45),
        debtFloor: ethers.utils.formatUnits(debtFloor, 45),
        debtAmount: ethers.utils.formatUnits(debtAmount, 18),
        lockedAmount: ethers.utils.formatUnits(lockedAmount, 18),
        accumulatedRate: ethers.utils.formatUnits(accumulatedRate, 27),
        safetyPrice: ethers.utils.formatUnits(safetyPrice, 27),
        liquidationPrice: ethers.utils.formatUnits(liquidationPrice, 27),
      };
    }),
    distinctUntilChanged()
  );

  constructor(
    { provider, geb }: CollateralInfrastructure,
    tokenData: TokenData
  ) {
    this.provider = provider;
    this.geb = geb;
    this.tokenData = tokenData;
  }

  async init() {
    try {
      console.info(`Collateral ${this.tokenData.symbol} is initializing.`);
      await this.getCollateralInfo();
    } catch (err) {
      console.error(err);
    }
  }

  async update() {
    try {
      console.info(`Updating ${this.tokenData.symbol} collateral.`);
      await this.getCollateralInfo();
      console.info(`Collateral ${this.tokenData.symbol} got updated.`);
    } catch (err) {
      console.error(err);
    }
  }

  async getCollateralInfo() {
    try {
      await this.getCollateralParams();
      await this.getCollateralData();
    } catch (err) {
      console.error(err);
    }
  }

  async getCollateralParams() {
    const collateralParams = await this.geb.contracts.safeEngine.cParams(
      this.tokenData.bytes32String
    );
    this.collateralParams$.next({
      debtCeiling: collateralParams.debtCeiling,
      debtFloor: collateralParams.debtFloor,
    });
  }

  async getCollateralData() {
    const collateralData = await this.geb.contracts.safeEngine.cData(
      this.tokenData.bytes32String
    );
    this.collateralData$.next({
      debtAmount: collateralData.debtAmount,
      lockedAmount: collateralData.lockedAmount,
      accumulatedRate: collateralData.accumulatedRate,
      safetyPrice: collateralData.safetyPrice,
      liquidationPrice: collateralData.liquidationPrice,
    });
  }
}
