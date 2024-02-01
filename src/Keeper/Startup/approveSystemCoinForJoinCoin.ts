import { Geb } from "@hai-on-op/sdk";
import { JoinCoinSystemCoinAllowance, TransactionQueue } from "../../lib";
import { ethers } from "ethers";

export interface approveSystemCoinForJoinCoinFactoryDependencies {
  geb: Geb;
  joinCoinSystemCoinAllowance: JoinCoinSystemCoinAllowance;
  transactionQueue: TransactionQueue;
}

export const approveSystemCoinForJoinCoinFactory =
  ({
    geb,
    transactionQueue,
    joinCoinSystemCoinAllowance,
  }: approveSystemCoinForJoinCoinFactoryDependencies) =>
  async () => {
    const joinCoin = geb.contracts.joinCoin;
    const systemCoin = geb.contracts.systemCoin;
    joinCoinSystemCoinAllowance.value$.subscribe((allowance) => {
      if (
        allowance?.lt(
          ethers.BigNumber.from(ethers.constants.MaxUint256).div(10)
        )
      ) {
        transactionQueue.addTransaction({
          label: "System Coin Approval",
          task: async () => {
            console.info("Approving system coin to be used by coin join.");
            const tx = await systemCoin.approve(
              joinCoin.address,
              ethers.constants.MaxUint256
            );
            await tx.wait();
            console.info(
              "Approved keeper's system coins to be used by coin join."
            );
            joinCoinSystemCoinAllowance.updateBalance();
          },
        });
      }
    });
  };
