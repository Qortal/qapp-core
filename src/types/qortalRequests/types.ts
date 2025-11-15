import { Service } from "../interfaces/resources";

export enum Coin {
  ARRR = "ARRR",
  BTC = "BTC",
  DGB = "DGB",
  DOGE = "DOGE",
  LTC = "LTC",
  QORT = "QORT",
  RVN = "RVN",
}

export type ForeignCoin = "BTC" | "LTC" | "DOGE" | "DGB" | "RVN" | "ARRR";

export type CoinType = "QORT" | "BTC" | "LTC" | "DOGE" | "DGB" | "RVN" | "ARRR";

export type ForeignBlockchain =
  | "LITECOIN"
  | "DOGECOIN"
  | "BITCOIN"
  | "DIGIBYTE"
  | "RAVENCOIN"
  | "PIRATECHAIN";

export type FeeType = "feekb" | "feeceiling";
export type ConnectionType = "SSL" | "TCP";

export interface CrosschainAtInfo {
  qortalAtAddress: string;
}

export type ResourceToPublish =
  | {
      service: Service;
      identifier: string;
      name?: string;
      title?: string;
      description?: string;
      category?: string;
      tags?: string[];
      base64: string;
      filename?: string;
      disableEncrypt?: boolean;
    }
  | {
      service: Service;
      identifier: string;
      name?: string;
      title?: string;
      description?: string;
      category?: string;
      tags?: string[];
      data64: string;
      filename?: string;
      disableEncrypt?: boolean;
    }
  | {
      service: Service;
      identifier: string;
      name: string;
      title?: string;
      description?: string;
      category?: string;
      tags?: string[];
      file: File;
      filename?: string;
      disableEncrypt?: boolean;
    };

export interface ResourcePointer {
  service: Service;
  identifier: string;
  name: string;
}

export type ConfirmationStatus = "CONFIRMED" | "UNCONFIRMED" | "BOTH";

export type TxType =
  | "ACCOUNT_FLAGS"
  | "ACCOUNT_LEVEL"
  | "ADD_GROUP_ADMIN"
  | "AIRDROP"
  | "ARBITRARY"
  | "AT"
  | "BUY_NAME"
  | "CANCEL_ASSET_ORDER"
  | "CANCEL_GROUP_BAN"
  | "CANCEL_GROUP_INVITE"
  | "CANCEL_SELL_NAME"
  | "CHAT"
  | "CREATE_ASSET_ORDER"
  | "CREATE_GROUP"
  | "CREATE_POLL"
  | "DEPLOY_AT"
  | "ENABLE_FORGING"
  | "GENESIS"
  | "GROUP_APPROVAL"
  | "GROUP_BAN"
  | "GROUP_INVITE"
  | "GROUP_KICK"
  | "ISSUE_ASSET"
  | "JOIN_GROUP"
  | "LEAVE_GROUP"
  | "MESSAGE"
  | "MULTI_PAYMENT"
  | "PAYMENT"
  | "PRESENCE"
  | "PUBLICIZE"
  | "REGISTER_NAME"
  | "REMOVE_GROUP_ADMIN"
  | "REWARD_SHARE"
  | "SELL_NAME"
  | "SET_GROUP"
  | "TRANSFER_ASSET"
  | "TRANSFER_PRIVS"
  | "UPDATE_ASSET"
  | "UPDATE_GROUP"
  | "UPDATE_NAME"
  | "VOTE_ON_POLL";
