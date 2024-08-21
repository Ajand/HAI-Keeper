import { ICollateral } from "../Collateral";
import { Safe } from "../Safe/t"; // Make sure this import is correct

import { ISafeProvider, SafeInfrastructure } from "./interfaces";

export class SafeProvider implements ISafeProvider {
  private readonly infrastructure: SafeInfrastructure;
  private readonly collateral: ICollateral;

  constructor(infrastructure: SafeInfrastructure, collateral: ICollateral) {
    this.infrastructure = infrastructure;
    this.collateral = collateral;
  }

  async getSafe(address: string): Promise<Safe> {
    const safe = new Safe(
      this.infrastructure,
      this.collateral,
      address,
      this.infrastructure.keeperAddress
    );
    await safe.init();
    return safe;
  }
}
