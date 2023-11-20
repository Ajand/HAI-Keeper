import { ethers } from "ethers";
import keythereum from "keythereum";
import fs from "fs";
import path from "path";

interface KeyPass {
  key_file: string;
  pass_file: string;
}

export const KeyPassSplitter = (walletPath: string): KeyPass => {
  const keyValuePairs = walletPath.split(",");

  const keyPass = {
    key_file: "",
    pass_file: "",
  };

  keyValuePairs.forEach((pair) => {
    const [key, value] = pair.split("=");

    if (key === "key_file") {
      keyPass.key_file = value;
    }
    if (key === "pass_file") {
      keyPass.pass_file = value;
    }
  });

  if (!keyPass.key_file) {
    throw new Error("Missing key_file path");
  }
  if (!keyPass.pass_file) {
    throw new Error("Missing pass_file path");
  }

  return keyPass;
};

export const createWallet = (keyPass: KeyPass): ethers.Wallet => {
  const keyFile = fs.readFileSync(keyPass.key_file, "utf-8");
  const keyObject = JSON.parse(keyFile);
  const password = fs.readFileSync(keyPass.pass_file, "utf-8");

  //@ts-ignore
  const privateKey = keythereum.recover(password, keyObject);
  const consumablePrivateKey = privateKey.toString("hex");
  const wallet = new ethers.Wallet(consumablePrivateKey);
  return wallet;
};
