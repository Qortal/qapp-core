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
  DecryptAesgcmQortalRequest,
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
  GetArrrSyncStatusQortalRequest,
  GetAtDataQortalRequest,
  GetAtQortalRequest,
  GetBalanceQortalRequest,
  GetCrosschainServerInfoQortalRequest,
  StartCrosschainServerQortalRequest,
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
  GetUserWalletTransactionsQortalRequest,
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
  lockTabQortalRequest,
  MultiAssetPaymentWithPrivateDataQortalRequest,
  OpenNewTabQortalRequest,
  OpenUserLookupQortalRequest,
  PlayEncryptedMediaQortalRequest,
  PublishMultipleQdnResourcesQortalRequest,
  PublishQdnResourceQortalRequest,
  reencryptGroupKeysQortalRequest,
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
  sessionPermissionsQortalRequest,
  SetCurrentForeignServerQortalRequest,
  ShowActionsQortalRequest,
  ShowPdfReaderQortalRequest,
  SignForeignFeesQortalRequest,
  SignTransactionQortalRequest,
  TransferAssetQortalRequest,
  unlockTabQortalRequest,
  UpdateForeignFeeQortalRequest,
  UpdateGroupQortalRequest,
  UpdateNameQortalRequest,
  UpdateSubscriptionsQortalRequest,
  VoteOnPollQortalRequest,
  whichUIQortalRequest,
  ChromecastCastQortalRequest,
  NotificationPermissionQortalRequest,
  NotificationHasPermissionQortalRequest,
  NotificationAddQortalRequest,
  NotificationGetQortalRequest,
  NotificationMarkSeenQortalRequest,
  NotificationRemoveQortalRequest,
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
    | DecryptAesgcmQortalRequest
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
    | GetArrrSyncStatusQortalRequest
    | GetAtDataQortalRequest
    | GetAtQortalRequest
    | GetBalanceQortalRequest
    | GetCrosschainServerInfoQortalRequest
    | StartCrosschainServerQortalRequest
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
    | GetUserWalletTransactionsQortalRequest
    | GetWalletBalanceQortalRequest
    | InviteToGroupQortalRequest
    | IsUsingPublicNodeQortalRequest
    | whichUIQortalRequest
    | JoinGroupQortalRequest
    | KickFromGroupQortalRequest
    | LeaveGroupQortalRequest
    | LinkToQdnResourceQortalRequest
    | ListAtsQortalRequest
    | ListGroupsQortalRequest
    | ListQdnResourcesQortalRequest
    | MultiAssetPaymentWithPrivateDataQortalRequest
    | OpenNewTabQortalRequest
    | OpenUserLookupQortalRequest
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
    | SignForeignFeesQortalRequest
    | SignTransactionQortalRequest
    | TransferAssetQortalRequest
    | UpdateForeignFeeQortalRequest
    | UpdateGroupQortalRequest
    | UpdateNameQortalRequest
    | UpdateSubscriptionsQortalRequest
    | VoteOnPollQortalRequest
    | unlockTabQortalRequest
    | lockTabQortalRequest
    | reencryptGroupKeysQortalRequest
    | sessionPermissionsQortalRequest
    | ChromecastCastQortalRequest
    | NotificationPermissionQortalRequest
    | NotificationHasPermissionQortalRequest
    | NotificationAddQortalRequest
    | NotificationGetQortalRequest
    | NotificationMarkSeenQortalRequest
    | NotificationRemoveQortalRequest;

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
