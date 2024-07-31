// Define the proxy configuration type
type FlashSwapProxyConfigItem = {
  address: string;
  type: "MultiCollateral" | "MultiHop";
  payload?: Array<string>;
};

export type FlashSwapProxiesConfig = {
  [key: string]: FlashSwapProxyConfigItem;
};

export type FlashSwapProxiesConfigForNetworks = {
  [key: string]: FlashSwapProxiesConfig;
};

export const flashSwpaProxyConfigurations: FlashSwapProxiesConfigForNetworks = {
  mainnet: {
    // MultiCollateral proxy (for WETH)
    WETH: {
      address: "0x890B58171345e098dA78f94c483b6F3564e9CD8f",
      type: "MultiCollateral",
      payload: [
        "0x146b020399769339509c98B7B353d19130C150EC", // pool
        "0xbE57D71e81F83a536937f07E0B3f48dd6f55376B", // collateral join
      ],
    },

    // MultiHop proxies
    WSTETH: {
      address: "0xb78f8aB20AcB52117D6ef5c9c91C39A8B0cDC3Ab",
      type: "MultiHop",
    },
    OP: {
      address: "0xBe775bb4b344FF04196D109E13ce4060b0d839c2",
      type: "MultiHop",
    },
    SNX: {
      address: "0x442e4B4cd2Fa2ccd1C5E1A25dd1144F683feb569",
      type: "MultiHop",
    },
    WBTC: {
      address: "0x8aa2D91Bb6d5D668641914875B55df1d62c10518",
      type: "MultiHop",
    },
    TBTC: {
      address: "0xb15Dc3142858Dc3cc0577EB6B79CdBd0F7E3DCB9",
      type: "MultiHop",
    },
    RETH: {
      address: "0x0191D85BA390adEA4194e81a0827e1E2dA050532",
      type: "MultiHop",
    },
    "LUSD-A": {
      address: "0x8209AfFaA29aE510e8e3D82eCdd184bC98c258cc",
      type: "MultiHop",
    },
    LINK: {
      address: "0x9Fff2A6dBc884c90ffdbbcD48926329F7A4a23F4",
      type: "MultiHop",
    },
    VELO: {
      address: "0x97937992E91815791Cb8D53054170Cdd6823AcfD",
      type: "MultiHop",
    },
  },
};
