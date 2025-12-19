import {
  AddForeignServerQortalRequest,
  AddGroupAdminQortalRequest,
  AddListItemsQortalRequest,
  AdminActionQortalRequest,
  BanFromGroupQortalRequest,
  BuyNameQortalRequest,
  CancelGroupBanQortalRequest,
  CancelGroupInviteQortalRequest,
  CancelSellNameQortalRequest,
  CancelTradeSellOrderQortalRequest,
  CreateAndCopyEmbedLinkQortalRequest,
  CreateGroupQortalRequest,
  CreatePollQortalRequest,
  CreateTradeBuyOrderQortalRequest,
  CreateTradeSellOrderQortalRequest,
  DecryptDataQortalRequest,
  DecryptDataWithSharingKeyQortalRequest,
  DecryptQortalGroupDataQortalRequest,
  DeleteHostedDataQortalRequest,
  DeleteListItemQortalRequest,
  DeployAtQortalRequest,
  EncryptDataQortalRequest,
  EncryptDataWithSharingKeyQortalRequest,
  EncryptQortalGroupDataQortalRequest,
  FetchBlockQortalRequest,
  FetchBlockRangeQortalRequest,
  FetchQdnResourceQortalRequest,
  GetAccountDataQortalRequest,
  GetAccountNamesQortalRequest,
  GetAtDataQortalRequest,
  GetAtQortalRequest,
  GetBalanceQortalRequest,
  GetCrosschainServerInfoQortalRequest,
  GetDaySummaryQortalRequest,
  GetForeignFeeQortalRequest,
  GetHostedDataQortalRequest,
  GetListItemsQortalRequest,
  GetNameDataQortalRequest,
  GetNodeInfoQortalRequest,
  GetNodeStatusQortalRequest,
  GetPriceQortalRequest,
  GetPrimaryNameQortalRequest,
  GetQdnResourceMetadataQortalRequest,
  GetQdnResourcePropertiesQortalRequest,
  GetQdnResourceStatusQortalRequest,
  GetQdnResourceUrlQortalRequest,
  GetServerConnectionHistoryQortalRequest,
  GetTxActivitySummaryQortalRequest,
  GetUserAccountQortalRequest,
  GetUserWalletInfoQortalRequest,
  GetUserWalletQortalRequest,
  GetWalletBalanceQortalRequest,
  InviteToGroupQortalRequest,
  IsUsingPublicNodeQortalRequest,
  JoinGroupQortalRequest,
  KickFromGroupQortalRequest,
  LeaveGroupQortalRequest,
  LinkToQdnResourceQortalRequest,
  ListAtsQortalRequest,
  ListGroupsQortalRequest,
  ListQdnResourcesQortalRequest,
  MultiAssetPaymentWithPrivateData,
  OpenNewTabQortalRequest,
  PlayEncryptedMediaQortalRequest,
  PublishMultipleQdnResourcesQortalRequest,
  PublishQdnResourceQortalRequest,
  RegisterNameQortalRequest,
  RemoveForeignServerQortalRequest,
  RemoveGroupAdminQortalRequest,
  SaveFileQortalRequest,
  ScreenOrientation,
  SearchChatMessagesQortalRequest,
  SearchNamesQortalRequest,
  SearchQdnResourcesQortalRequest,
  SearchTransactionsQortalRequest,
  SellNameQortalRequest,
  SendChatMessageQortalRequest,
  SendCoinQortalRequest,
  SetCurrentForeignServerQortalRequest,
  ShowActionsQortalRequest,
  ShowPdfReaderQortalRequest,
  SignTransactionQortalRequest,
  TransferAssetQortalRequest,
  UpdateForeignFeeQortalRequest,
  UpdateGroupQortalRequest,
  UpdateNameQortalRequest,
  VoteOnPollQortalRequest,
} from './types/qortalRequests/interfaces';

declare global {
  type QortalRequestOptions =
    | AddForeignServerQortalRequest
    | AddGroupAdminQortalRequest
    | AddListItemsQortalRequest
    | AdminActionQortalRequest
    | BanFromGroupQortalRequest
    | BuyNameQortalRequest
    | CancelGroupBanQortalRequest
    | CancelGroupInviteQortalRequest
    | CancelSellNameQortalRequest
    | CancelTradeSellOrderQortalRequest
    | CreateAndCopyEmbedLinkQortalRequest
    | CreateGroupQortalRequest
    | CreatePollQortalRequest
    | CreateTradeBuyOrderQortalRequest
    | CreateTradeSellOrderQortalRequest
    | DecryptDataQortalRequest
    | DecryptDataWithSharingKeyQortalRequest
    | DecryptQortalGroupDataQortalRequest
    | DeleteHostedDataQortalRequest
    | DeleteListItemQortalRequest
    | DeployAtQortalRequest
    | EncryptDataQortalRequest
    | EncryptDataWithSharingKeyQortalRequest
    | EncryptQortalGroupDataQortalRequest
    | FetchBlockQortalRequest
    | FetchBlockRangeQortalRequest
    | FetchQdnResourceQortalRequest
    | GetAccountDataQortalRequest
    | GetAccountNamesQortalRequest
    | GetAtDataQortalRequest
    | GetAtQortalRequest
    | GetBalanceQortalRequest
    | GetCrosschainServerInfoQortalRequest
    | GetDaySummaryQortalRequest
    | GetForeignFeeQortalRequest
    | GetHostedDataQortalRequest
    | GetListItemsQortalRequest
    | GetNameDataQortalRequest
    | GetNodeInfoQortalRequest
    | GetNodeStatusQortalRequest
    | GetPriceQortalRequest
    | GetPrimaryNameQortalRequest
    | GetQdnResourceMetadataQortalRequest
    | GetQdnResourcePropertiesQortalRequest
    | GetQdnResourceStatusQortalRequest
    | GetQdnResourceUrlQortalRequest
    | GetServerConnectionHistoryQortalRequest
    | GetTxActivitySummaryQortalRequest
    | GetUserAccountQortalRequest
    | GetUserWalletInfoQortalRequest
    | GetUserWalletQortalRequest
    | GetWalletBalanceQortalRequest
    | InviteToGroupQortalRequest
    | IsUsingPublicNodeQortalRequest
    | JoinGroupQortalRequest
    | KickFromGroupQortalRequest
    | LeaveGroupQortalRequest
    | LinkToQdnResourceQortalRequest
    | ListAtsQortalRequest
    | ListGroupsQortalRequest
    | ListQdnResourcesQortalRequest
    | MultiAssetPaymentWithPrivateData
    | OpenNewTabQortalRequest
    | PlayEncryptedMediaQortalRequest
    | PublishMultipleQdnResourcesQortalRequest
    | PublishQdnResourceQortalRequest
    | RegisterNameQortalRequest
    | RemoveForeignServerQortalRequest
    | RemoveGroupAdminQortalRequest
    | SaveFileQortalRequest
    | ScreenOrientation
    | SearchChatMessagesQortalRequest
    | SearchNamesQortalRequest
    | SearchQdnResourcesQortalRequest
    | SearchTransactionsQortalRequest
    | SellNameQortalRequest
    | SendChatMessageQortalRequest
    | SendCoinQortalRequest
    | SetCurrentForeignServerQortalRequest
    | ShowActionsQortalRequest
    | ShowPdfReaderQortalRequest
    | SignTransactionQortalRequest
    | TransferAssetQortalRequest
    | UpdateForeignFeeQortalRequest
    | UpdateGroupQortalRequest
    | UpdateNameQortalRequest
    | VoteOnPollQortalRequest;

  function qortalRequest(options: QortalRequestOptions): Promise<any>;

  function qortalRequestWithTimeout(
    options: QortalRequestOptions,
    time: number
  ): Promise<any>;

  interface Window {
    _qdnBase: any;
    _qdnTheme: string;
  }
}

export const __keepGlobalModule = true;
