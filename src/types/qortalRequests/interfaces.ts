import { Service } from "../interfaces/resources";
import {
  Coin,
  ConfirmationStatus,
  ConnectionType,
  CrosschainAtInfo,
  FeeType,
  ForeignBlockchain,
  ForeignCoin,
  ResourcePointer,
  ResourceToPublish,
  TxType,
} from "./types";

interface BaseRequest {
  action: string;
}

export interface SendCoinQortalRequest extends BaseRequest {
  action: "SEND_COIN";
  coin: Coin;
  recipient: string;
  amount: number;
}

export interface GetCrosschainServerInfoQortalRequest extends BaseRequest {
  action: "GET_CROSSCHAIN_SERVER_INFO";
  coin: ForeignCoin;
}

export interface GetTxActivitySummaryQortalRequest extends BaseRequest {
  action: "GET_TX_ACTIVITY_SUMMARY";
  coin: ForeignBlockchain;
}

export interface GetForeignFeeQortalRequest extends BaseRequest {
  action: "GET_FOREIGN_FEE";
  coin: ForeignCoin;
  type: FeeType;
}

export interface UpdateForeignFeeQortalRequest extends BaseRequest {
  action: "UPDATE_FOREIGN_FEE";
  coin: ForeignCoin;
  type: FeeType;
  value: number;
}

export interface GetServerConnectionHistoryQortalRequest extends BaseRequest {
  action: "GET_SERVER_CONNECTION_HISTORY";
  coin: ForeignCoin;
}

export interface SetCurrentForeignServerQortalRequest extends BaseRequest {
  action: "SET_CURRENT_FOREIGN_SERVER";
  coin: ForeignCoin;
  type: ConnectionType;
  host: string;
  port: number;
}

export interface AddForeignServerQortalRequest extends BaseRequest {
  action: "ADD_FOREIGN_SERVER";
  coin: ForeignCoin;
  type: ConnectionType;
  host: string;
  port: number;
}

export interface RemoveForeignServerQortalRequest extends BaseRequest {
  action: "REMOVE_FOREIGN_SERVER";
  coin: ForeignCoin;
  type: ConnectionType;
  host: string;
  port: number;
}

export interface GetDaySummaryQortalRequest extends BaseRequest {
  action: "GET_DAY_SUMMARY";
}

export interface CreateTradeBuyOrderQortalRequest extends BaseRequest {
  action: "CREATE_TRADE_BUY_ORDER";
  foreignBlockchain: ForeignBlockchain;
  crosschainAtInfo: CrosschainAtInfo[];
}

export interface CreateTradeSellOrderQortalRequest extends BaseRequest {
  action: "CREATE_TRADE_SELL_ORDER";
  foreignBlockchain: ForeignBlockchain;
  qortAmount: number;
  foreignAmount: number;
}

export interface CancelTradeSellOrderQortalRequest extends BaseRequest {
  action: "CANCEL_TRADE_SELL_ORDER";
  atAddress: string;
}

export interface GetPriceQortalRequest extends BaseRequest {
  action: "GET_PRICE";
  blockchain: ForeignBlockchain;
  inverse?: boolean;
  maxtrades?: number;
}

export interface GetUserAccountQortalRequest extends BaseRequest {
  action: "GET_USER_ACCOUNT";
}

export interface GetUserWalletQortalRequest extends BaseRequest {
  action: "GET_USER_WALLET";
  coin: Coin;
}

export interface GetWalletBalanceQortalRequest extends BaseRequest {
  action: "GET_WALLET_BALANCE";
  coin: Coin;
}

export interface GetUserWalletInfoQortalRequest extends BaseRequest {
  action: "GET_USER_WALLET_INFO";
  coin: Coin;
}

export interface GetAccountDataQortalRequest extends BaseRequest {
  action: "GET_ACCOUNT_DATA";
  address: string;
}

export interface GetAccountNamesQortalRequest extends BaseRequest {
  action: "GET_ACCOUNT_NAMES";
  address: string;
  limit?: number;
  offset?: number;
  reverse?: boolean;
}
export interface GetPrimaryNameQortalRequest extends BaseRequest {
  action: "GET_PRIMARY_NAME";
  address: string;
}

export interface SearchNamesQortalRequest extends BaseRequest {
  action: "SEARCH_NAMES";
  query: string;
  limit?: number;
  offset?: number;
  reverse?: boolean;
  prefix?: boolean;
}

export interface GetNameDataQortalRequest extends BaseRequest {
  action: "GET_NAME_DATA";
  name: string;
}

export interface GetBalanceQortalRequest extends BaseRequest {
  action: "GET_BALANCE";
  address: string;
}

export interface RegisterNameQortalRequest extends BaseRequest {
  action: "REGISTER_NAME";
  name: string;
  description?: string;
}

export interface SellNameQortalRequest extends BaseRequest {
  action: "SELL_NAME";
  salePrice: number;
  nameForSale: string;
}

export interface CancelSellNameQortalRequest extends BaseRequest {
  action: "CANCEL_SELL_NAME";
  nameForSale: string;
}

export interface BuyNameQortalRequest extends BaseRequest {
  action: "BUY_NAME";
  nameForSale: string;
}

export interface UpdateNameQortalRequest extends BaseRequest {
  action: "UPDATE_NAME";
  oldName: string;
  newName: string;
  description?: string;
}

export interface VoteOnPollQortalRequest extends BaseRequest {
  action: "VOTE_ON_POLL";
  pollName: string;
  optionIndex: number;
}

export interface CreatePollQortalRequest extends BaseRequest {
  action: "CREATE_POLL";
  pollName: string;
  pollDescription: string;
  pollOptions: string[];
  pollOwnerAddress: string;
}

export interface GetListItemsQortalRequest extends BaseRequest {
  action: "GET_LIST_ITEMS";
  list_name: string;
}

export interface AddListItemsQortalRequest extends BaseRequest {
  action: "ADD_LIST_ITEMS";
  list_name: string;
  items: string[];
}

export interface DeleteListItemQortalRequest extends BaseRequest {
  action: "DELETE_LIST_ITEM";
  list_name: string;
  items: string[];
}

export interface DecryptDataQortalRequest extends BaseRequest {
  action: "DECRYPT_DATA";
  encryptedData: string;
}

export type PublishMultipleQdnResourcesQortalRequest =
  | (BaseRequest & {
      action: "PUBLISH_MULTIPLE_QDN_RESOURCES";
      resources: ResourceToPublish[];
      encrypt?: false | undefined;
    })
  | (BaseRequest & {
      action: "PUBLISH_MULTIPLE_QDN_RESOURCES";
      resources: ResourceToPublish[];
      encrypt: true;
      publicKeys?: string[];
    });

export interface PublishQdnResourceQortalRequestBase extends BaseRequest {
  action: "PUBLISH_QDN_RESOURCE";
  service: Service;
  name?: string;
  identifier: string;
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  filename?: string;
}

export type PublishQdnResourceQortalRequest =
  | (PublishQdnResourceQortalRequestBase & {
      base64: string;
      encrypt?: false | undefined;
    })
  | (PublishQdnResourceQortalRequestBase & {
      data64: string;
      encrypt?: false | undefined;
    })
  | (PublishQdnResourceQortalRequestBase & {
      file: File;
      encrypt?: false | undefined;
    })
  | (PublishQdnResourceQortalRequestBase & {
      file: File;
      encrypt: true;
      publicKeys?: string[];
    });

export type EncryptDataQortalRequest =
  | {
      action: "ENCRYPT_DATA";
      file: File;
      publicKeys?: string[];
    }
  | {
      action: "ENCRYPT_DATA";
      base64: string;
      publicKeys?: string[];
    };

export interface DecryptQortalGroupDataQortalRequest extends BaseRequest {
  action: "DECRYPT_QORTAL_GROUP_DATA";
  base64: string;
  groupId: number;
  isAdmins?: boolean;
}

export type EncryptQortalGroupDataQortalRequest =
  | {
      action: "ENCRYPT_QORTAL_GROUP_DATA";
      file: File;
      groupId: number;
      isAdmins?: boolean;
    }
  | {
      action: "ENCRYPT_QORTAL_GROUP_DATA";
      base64: string;
      groupId: number;
      isAdmins?: boolean;
    };

export interface DecryptDataWithSharingKeyQortalRequest extends BaseRequest {
  action: "DECRYPT_DATA_WITH_SHARING_KEY";
  encryptedData: string;
  key: string;
}

export type EncryptDataWithSharingKeyQortalRequest =
  | {
      action: "ENCRYPT_DATA_WITH_SHARING_KEY";
      file: File;
      publicKeys?: string[];
    }
  | {
      action: "ENCRYPT_DATA_WITH_SHARING_KEY";
      base64: string;
      publicKeys?: string[];
    };

export interface GetHostedDataQortalRequest extends BaseRequest {
  action: "GET_HOSTED_DATA";
  limit?: number;
  offset?: number;
  query?: string;
}

export interface DeleteHostedDataQortalRequest extends BaseRequest {
  action: "DELETE_HOSTED_DATA";
  hostedData: ResourcePointer[];
}

export interface GetQdnResourceUrlQortalRequest extends BaseRequest {
  action: "GET_QDN_RESOURCE_URL";
  service: Service;
  identifier?: string;
  name: string;
  path?: string;
}

export interface LinkToQdnResourceQortalRequest extends BaseRequest {
  action: "LINK_TO_QDN_RESOURCE";
  service: Service;
  identifier?: string;
  name: string;
  path?: string;
}

export interface ListQdnResourcesQortalRequest extends BaseRequest {
  action: "LIST_QDN_RESOURCES";
  name?: string;
  identifier?: string;
  default?: boolean;
  includeStatus?: boolean;
  includeMetadata?: boolean;
  followedOnly?: boolean;
  excludeBlocked?: boolean;
  limit?: number;
  offset?: number;
  reverse?: boolean;
}

export interface SearchQdnResourcesQortalRequest extends BaseRequest {
  action: "SEARCH_QDN_RESOURCES";
  service?: Service;
  name?: string;
  query?: string;
  identifier?: string;
  default?: boolean;
  includeStatus?: boolean;
  includeMetadata?: boolean;
  followedOnly?: boolean;
  excludeBlocked?: boolean;
  limit?: number;
  offset?: number;
  before?: number;
  after?: number;
  reverse?: boolean;
  names?: string[];
  keywords?: string[];
  exactMatchNames?: boolean;
  mode?: "ALL" | "LATEST";
  nameListFilter?: string;
  title?: string;
  description?: string;
  prefix?: boolean;
}

export interface FetchQdnResourceQortalRequest extends BaseRequest {
  action: "FETCH_QDN_RESOURCE";
  identifier: string;
  name: string;
  service: Service;
  encoding?: string;
  rebuild?: boolean;
}

export interface GetQdnResourceStatusQortalRequest extends BaseRequest {
  action: "GET_QDN_RESOURCE_STATUS";
  identifier?: string;
  name: string;
  service: Service;
  build?: boolean;
}

export interface GetQdnResourcePropertiesQortalRequest extends BaseRequest {
  action: "GET_QDN_RESOURCE_PROPERTIES";
  identifier?: string;
  name: string;
  service: Service;
}

export interface GetQdnResourceMetadataQortalRequest extends BaseRequest {
  action: "GET_QDN_RESOURCE_METADATA";
  identifier?: string;
  name: string;
  service: Service;
}

export interface SendChatMessageQortalRequest extends BaseRequest {
  action: "SEND_CHAT_MESSAGE";
  recipient: string;
  message?: string;
  groupId?: number;
  chatReference?: string;
  fullContent?: any;
}

export interface SearchChatMessagesQortalRequest extends BaseRequest {
  action: "SEARCH_CHAT_MESSAGES";
  offset?: number;
  limit?: number;
  reverse?: boolean;
  encoding: "BASE64" | "BASE58";
  haschatreference?: boolean;
  chatreference?: string;
  sender?: string;
  involving: string[];
  txGroupId: number;
  before?: number;
  after?: number;
}

export interface JoinGroupQortalRequest extends BaseRequest {
  action: "JOIN_GROUP";
  groupId: number;
}

export interface ListGroupsQortalRequest extends BaseRequest {
  action: "LIST_GROUPS";
  limit?: number;
  offset?: number;
  reverse?: boolean;
}

type GroupType = 1 | 0;

export interface CreateGroupQortalRequest extends BaseRequest {
  action: "CREATE_GROUP";
  groupName: string;
  description?: string;
  type: GroupType;
  approvalThreshold: number;
  minBlock: number;
  maxBlock: number;
}

export interface UpdateGroupQortalRequest extends BaseRequest {
  action: "UPDATE_GROUP";
  newOwner: string;
  groupId: number;
  description?: string;
  type: GroupType;
  approvalThreshold: number;
  minBlock: number;
  maxBlock: number;
}

export interface AddGroupAdminQortalRequest extends BaseRequest {
  action: "ADD_GROUP_ADMIN";
  groupId: number;
  qortalAddress: string;
}

export interface RemoveGroupAdminQortalRequest extends BaseRequest {
  action: "REMOVE_GROUP_ADMIN";
  groupId: number;
  qortalAddress: string;
}

export interface BanFromGroupQortalRequest extends BaseRequest {
  action: "BAN_FROM_GROUP";
  groupId: number;
  banTime: number;
  qortalAddress: string;
  reason?: string;
}

export interface CancelGroupBanQortalRequest extends BaseRequest {
  action: "CANCEL_GROUP_BAN";
  groupId: number;
  qortalAddress: string;
}

export interface KickFromGroupQortalRequest extends BaseRequest {
  action: "KICK_FROM_GROUP";
  groupId: number;
  qortalAddress: string;
  reason?: string;
}

export interface InviteToGroupQortalRequest extends BaseRequest {
  action: "INVITE_TO_GROUP";
  groupId: number;
  inviteeAddress: string;
  inviteTime: number;
}

export interface CancelGroupInviteQortalRequest extends BaseRequest {
  action: "CANCEL_GROUP_INVITE";
  groupId: number;
  qortalAddress: string;
}

export interface LeaveGroupQortalRequest extends BaseRequest {
  action: "LEAVE_GROUP";
  groupId: number;
}

export interface DeployAtQortalRequest extends BaseRequest {
  action: "DEPLOY_AT";
  name: string;
  description: string;
  tags: string;
  creationBytes: string;
  amount: number;
  assetId: number;
  type: string;
}

export interface GetAtQortalRequest extends BaseRequest {
  action: "GET_AT";
  atAddress: string;
}

export interface GetAtDataQortalRequest extends BaseRequest {
  action: "GET_AT_DATA";
  atAddress: string;
}

export interface ListAtsQortalRequest extends BaseRequest {
  action: "LIST_ATS";
  limit?: number;
  offset?: number;
  reverse?: boolean;
  isExecutable?: boolean;
  codeHash58?: string;
}

export interface FetchBlockQortalRequest extends BaseRequest {
  action: "FETCH_BLOCK";
  signature: string;
  includeOnlineSignatures?: boolean;
}

export interface FetchBlockRangeQortalRequest extends BaseRequest {
  action: "FETCH_BLOCK_RANGE";
  height: number;
  count: number;
  includeOnlineSignatures?: boolean;
  reverse?: boolean;
}

export interface SearchTransactionsQortalRequest extends BaseRequest {
  action: "SEARCH_TRANSACTIONS";
  startBlock?: number;
  blockLimit?: number;
  txGroupId?: number;
  txType?: TxType[];
  address?: string;
  confirmationStatus?: ConfirmationStatus;
  limit?: number;
  offset?: number;
  reverse?: boolean;
}

export interface IsUsingPublicNodeQortalRequest extends BaseRequest {
  action: "IS_USING_PUBLIC_NODE";
}

export type AdminActionType =
  | "stop"
  | "restart"
  | "bootstrap"
  | "addmintingaccount"
  | "removemintingaccount"
  | "forcesync"
  | "addpeer"
  | "removepeer";

export interface AdminActionQortalRequest extends BaseRequest {
  action: "ADMIN_ACTION";
  type: AdminActionType;
}

export interface OpenNewTabQortalRequest extends BaseRequest {
  action: "OPEN_NEW_TAB";
  qortalLink: string;
}

export interface ShowActionsQortalRequest extends BaseRequest {
  action: "SHOW_ACTIONS";
}

export interface ScreenOrientation extends BaseRequest {
  action: "SCREEN_ORIENTATION";
  mode:
    | "portrait"
    | "landscape"
    | "portrait-primary"
    | "portrait-secondary"
    | "landscape-primary"
    | "landscape-secondary"
    | "unlock";
}

export interface SignTransactionQortalRequest extends BaseRequest {
  action: "SIGN_TRANSACTION";
  unsignedBytes: string;
  process?: boolean;
}

export interface GetNodeStatusQortalRequest extends BaseRequest {
  action: "GET_NODE_STATUS";
}
export interface GetNodeInfoQortalRequest extends BaseRequest {
  action: "GET_NODE_INFO";
}

export interface CreateAndCopyEmbedLinkQortalRequest extends BaseRequest {
  action: "CREATE_AND_COPY_EMBED_LINK";
  type: string;
  identifier: string;
  service: Service;
  encryptionType: "public" | "private" | "group";
  name: string;
}

export interface TransferAssetQortalRequest extends BaseRequest {
  action: "TRANSFER_ASSET";
  amount: number;
  assetId: number;
  recipient: string;
}

export interface ShowPdfReaderQortalRequest extends BaseRequest {
  action: "SHOW_PDF_READER";
  blob: Blob | File;
}

export type Payment = {
  amount: number;
  recipient: string;
  arbitraryTxs: ResourceToPublish[];
};

export interface MultiAssetPaymentWithPrivateData extends BaseRequest {
  action: "MULTI_ASSET_PAYMENT_WITH_PRIVATE_DATA";
  payments: Payment[];
  assetId: number;
}

export type SaveFileQortalRequest =
  | ({
      action: "SAVE_FILE";
      blob: Blob | File;
      location?: never;
    } & BaseRequest & { filename: string })
  | ({
      action: "SAVE_FILE";
      location: {
        identifier?: string;
        service: Service;
        name: string;
      };
      blob?: never;
    } & BaseRequest & { filename: string });
