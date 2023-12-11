import { ethers } from "ethers";
import { Geb } from "@hai-on-op/sdk";

interface EventFetchingInfra {
  geb: Geb;
  provider: ethers.providers.JsonRpcProvider;
}

interface LogWithDescription
  extends ethers.utils.LogDescription,
    ethers.providers.Log {}

export const getPastSafeModifications =
  ({ geb, provider }: EventFetchingInfra) =>
  async (
    from: number,
    to: number,
    collateral: string,
    chunk: number = 2000
  ) => {
    console.debug(
      `Consumer requested safe modification data from block ${from} to ${to}`
    );
    let start = from;
    let end = null;
    let chunks_queried = 0;
    const retval: Array<LogWithDescription> = [];
    const hashStore = new Set();
    while (end === null || start <= to) {
      end = Math.min(to, start + chunk);
      chunks_queried += 1;

      console.debug(
        `Querying safe modifications from block ${start} to ${end} (${
          end - start
        } blocks) \naccumulated ${retval.length} safe modification in ${
          chunks_queried - 1
        } requests`
      );

      const logs = await provider.getLogs({
        ...geb.contracts.safeEngine.filters[
          "ModifySAFECollateralization(bytes32,address,address,address,int256,int256)"
        ](),
        fromBlock: start,
        toBlock: end,
      });

      let iface = new ethers.utils.Interface([
        `
        event ModifySAFECollateralization(
            bytes32 indexed _cType,
            address indexed _safe,
            address _collateralSource,
            address _debtDestination,
            int256 _deltaCollateral,
            int256 _deltaDebt
        );
        `,
      ]);

      console.debug(
        `Found ${logs.length} total logs from block ${start} to ${end}`
      );

      logs.forEach((log) => {
        const logHash = ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes(JSON.stringify(log))
        );
        if (!hashStore.has(logHash)) {
          retval.push({ ...log, ...iface.parseLog(log) });
          hashStore.add(logHash);
        }
      });

      start += chunk;
    }
    return retval;
  };
