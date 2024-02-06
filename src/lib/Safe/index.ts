import { ethers } from "ethers";
import { Geb } from "@hai-on-op/sdk";
import {
  BehaviorSubject,
  combineLatest,
  map,
  Observable,
  distinctUntilChanged,
} from "rxjs";

import { Collateral } from "../Collateral";
import { TransactionQueue } from "../TransactionQueue";

interface SafeInfrustructure {
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;
  transactionQueue: TransactionQueue;
}

interface CriticalAssesmentParams {
  accumulatedRate: ethers.BigNumber;
  liquidationPrice: ethers.BigNumber;
  generatedDebt: ethers.BigNumber;
  lockedCollateral: ethers.BigNumber;
}

export class Safe {
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;
  transactionQueue: TransactionQueue;

  initialized: boolean = false;

  collateral: Collateral;
  address: string;

  // safe params
  //lockedCollateral: ethers.BigNumber | undefined; // Wad
  //generatedDebt: ethers.BigNumber | undefined; // Wad

  lockedCollateral$: BehaviorSubject<ethers.BigNumber | null>;
  generatedDebt$: BehaviorSubject<ethers.BigNumber | null>;

  initalized$: Observable<boolean>;

  criticalAssessmentParams$: Observable<CriticalAssesmentParams | null>;
  criticalityRatio$: Observable<number | null>;
  isCritical$: Observable<boolean | null>;

  canLiquidate$: Observable<boolean>;

  isLiquidated$ = new BehaviorSubject<boolean>(false);

  constructor(
    { provider, geb, transactionQueue }: SafeInfrustructure,
    collateral: Collateral,
    address: string
  ) {
    this.provider = provider;
    this.geb = geb;
    this.transactionQueue = transactionQueue;
    this.collateral = collateral;
    this.address = address;

    this.lockedCollateral$ = new BehaviorSubject<ethers.BigNumber | null>(null);
    this.generatedDebt$ = new BehaviorSubject<ethers.BigNumber | null>(null);

    this.initalized$ = combineLatest([
      this.lockedCollateral$,
      this.generatedDebt$,
    ]).pipe(
      map(([lockedCollateral, generatedDebt]) => {
        if (
          lockedCollateral instanceof ethers.BigNumber &&
          generatedDebt instanceof ethers.BigNumber
        ) {
          return true;
        } else {
          return false;
        }
      }),
      distinctUntilChanged()
    );

    this.criticalAssessmentParams$ = combineLatest([
      this.lockedCollateral$,
      this.generatedDebt$,
      this.collateral.collateralData$,
    ]).pipe(
      map(([lockedCollateral, generatedDebt, collateralData]) => {
        if (!collateralData) return null;

        const { accumulatedRate, liquidationPrice } = collateralData;

        if (generatedDebt === null || lockedCollateral === null) {
          // safe not initialized
          return null;
        }

        return {
          accumulatedRate,
          liquidationPrice,
          generatedDebt,
          lockedCollateral,
        };
      }),
      distinctUntilChanged()
    );

    this.criticalityRatio$ = this.criticalAssessmentParams$.pipe(
      map((params) => {
        if (params === null) return null;

        const {
          accumulatedRate,
          liquidationPrice,
          generatedDebt,
          lockedCollateral,
        } = params;

        const ratio =
          Number(
            ethers.utils.formatUnits(lockedCollateral.mul(liquidationPrice), 45)
          ) /
          Number(
            ethers.utils.formatUnits(generatedDebt.mul(accumulatedRate), 45)
          );

        // Ratio less than 1 means the safe is critical
        return ratio;
      }),
      distinctUntilChanged()
    );

    this.isCritical$ = this.criticalAssessmentParams$.pipe(
      map((params) => {
        if (params === null) return null;

        const {
          accumulatedRate,
          liquidationPrice,
          generatedDebt,
          lockedCollateral,
        } = params;

        return lockedCollateral
          .mul(liquidationPrice)
          .lt(generatedDebt.mul(accumulatedRate));
      }),
      distinctUntilChanged()
    );

    this.canLiquidate$ = this.isCritical$.pipe(
      map((isCritical) => isCritical === true),
      distinctUntilChanged()
    );

    this.canLiquidate$.subscribe((canLiquidate) => {
      console.log(canLiquidate);

      if (canLiquidate) {
        const liquidationEngine = this.geb.contracts.liquidationEngine;

        this.transactionQueue.addTransaction({
          label: `Safe Liquidation`,
          task: async () => {
            console.info(`Liquidating Safe ${this.address}`);
            const tx = await liquidationEngine.liquidateSAFE(
              this.collateral.tokenData.bytes32String,
              this.address
            );
            await tx.wait();
            console.info(`Liquidating Safe ${this.address}`);
            this.isLiquidated$.next(true);
          },
        });
      }
    });

    this.getSafeParams();
  }

  async update() {
    try {
      await this.getSafeInfo();
    } catch (err) {
      console.error(err);
    }
  }

  async getSafeInfo() {
    try {
      await this.getSafeParams();
    } catch (err) {
      console.error(err);
    }
  }

  async getSafeParams() {
    const safeParams = await this.geb.contracts.safeEngine.safes(
      this.collateral.tokenData.bytes32String,
      this.address
    );
    //this.lockedCollateral = safeParams.lockedCollateral;
    //this.generatedDebt = safeParams.generatedDebt;
    this.lockedCollateral$.next(safeParams.lockedCollateral);
    this.generatedDebt$.next(safeParams.generatedDebt);
  }

  async getSafeEngineParams() {}

  //getNormalizedInfo() {
  /*if (this.generatedDebt && this.lockedCollateral) {
      const lockedCollateral = ethers.utils.formatUnits(
        this.lockedCollateral,
        18
      );
      const generatedDebt = ethers.utils.formatUnits(this.generatedDebt, 18);

      return {
        lockedCollateral,
        generatedDebt,
      };
    } else {
      throw new Error("not initialized yet.");
    }*/
  //}

  /*getCriticalAssesmentParams() {
    const accumulatedRate = this.collateral.accumulatedRate;
    const liquidationPrice = this.collateral.liquidationPrice;

    if (!accumulatedRate || !liquidationPrice) {
      throw new Error("Collateral is not initialized.");
    }

    if (!this.generatedDebt || !this.lockedCollateral) {
      throw new Error("Safe is not initialized!");
    }

    return {
      accumulatedRate,
      liquidationPrice,
      generatedDebt: this.generatedDebt,
      lockedCollateral: this.lockedCollateral,
    };
  }

  /*getCriticalityRatio() {
    const {
      accumulatedRate,
      liquidationPrice,
      generatedDebt,
      lockedCollateral,
    } = this.getCriticalAssesmentParams();

    const ratio =
      Number(
        ethers.utils.formatUnits(lockedCollateral.mul(liquidationPrice), 45)
      ) /
      Number(ethers.utils.formatUnits(generatedDebt.mul(accumulatedRate), 45));

    // Ratio less than 1 means the safe is critical
    return ratio;
  }*/

  /*isCritical() {
    const {
      accumulatedRate,
      liquidationPrice,
      generatedDebt,
      lockedCollateral,
    } = this.getCriticalAssesmentParams();

    const isCrit =
      lockedCollateral.mul(liquidationPrice) <
      generatedDebt.mul(accumulatedRate);

    return isCrit;
  }*/

  /* minBigNumber(a: ethers.BigNumber, b: ethers.BigNumber): ethers.BigNumber {
    return a.lt(b) ? a : b;
  }*/

  /*getLimitAdjustedDebt(
    generatedDebt: ethers.BigNumber,
    accumulatedRate: ethers.BigNumber,
    liquidationQuantity: ethers.BigNumber,
    liquidationPenalty: ethers.BigNumber,
    debtFloor: ethers.BigNumber
  ): number {
    //const WAD = ethers.utils.parseUnits("1", 18);

    //console.log(WAD);

    return 5;
   let limitAdjustedDebt: ethers.BigNumber = this.minBigNumber(
      generatedDebt,
      liquidationQuantity / liquidationPenalty / accumulatedRate
    );

    // NOTE: If the SAFE is dusty afterwards, we liquidate the whole debt
    limitAdjustedDebt =
      limitAdjustedDebt !== generatedDebt &&
      generatedDebt - limitAdjustedDebt < debtFloor / accumulatedRate
        ? generatedDebt
        : limitAdjustedDebt;

    return limitAdjustedDebt;
  }*/

  /*canLiquidate() {
    // In the RAI system there was a check for liqudation that was about on auctioned system coin limit
    // In HAI code base that check is removed so it does not make sense to check it in the keeper as well
    // Also we have to add debt limits later to this
    // For now it just check if the safe is critical or not

    //this.getLimitAdjustedDebt(this.generatedDebt, this.collateral.accumulatedRate,);

    return this.isCritical();
  }*/

  /*async liquidate() {
    if (!this.canLiquidate) {
      throw new Error("Not liquidatable!");
    }
    //console.log(
    //  "we are ready to liquidate",
    //  this.collateral.tokenData.bytes32String,
    //  this.address
    //);

    const liquidationEngine = this.geb.contracts.liquidationEngine;

    //const liquidationEngineParams = await liquidationEngine._params();

    //console.log(
    //  "liquidation engine params: ",
    //  liquidationEngineParams.toString()
    //);
    //
    //console.log(
    //  "current on auction system coins",
    //  (await liquidationEngine.currentOnAuctionSystemCoins()).toString()
    //);

    try {
      const tx = await liquidationEngine.liquidateSAFE(
        this.collateral.tokenData.bytes32String,
        this.address
      );
      const receipt = await tx?.wait();

      return receipt;
    } catch (err) {
      // @ts-ignore
      console.error(err);
      // @ts-ignore
      //const revertData = "0x1baf9c1c";
      //console.log("revert data is: ", revertData);
      //const decodedError = liquidationEngine.interface.parseError(revertData);
      //console.log(`Transaction failed: ${decodedError.name}`);
    }
  }*/
}
