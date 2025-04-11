import { AddForeignServerQortalRequest, AddListItemsQortalRequest, BuyNameQortalRequest, CancelSellNameQortalRequest, CancelTradeSellOrderQortalRequest, CreatePollQortalRequest, CreateTradeBuyOrderQortalRequest, CreateTradeSellOrderQortalRequest, DecryptDataQortalRequest, DecryptDataWithSharingKeyQortalRequest, DecryptQortalGroupDataQortalRequest, DeleteHostedDataQortalRequest, DeleteListItemQortalRequest, EncryptDataQortalRequest, EncryptDataWithSharingKeyQortalRequest, EncryptQortalGroupDataQortalRequest, FetchQdnResourceQortalRequest, GetAccountDataQortalRequest, GetAccountNamesQortalRequest, GetBalanceQortalRequest, GetCrosschainServerInfoQortalRequest, GetDaySummaryQortalRequest, GetForeignFeeQortalRequest, GetHostedDataQortalRequest, GetListItemsQortalRequest, GetNameDataQortalRequest, GetPriceQortalRequest, GetQdnResourceMetadataQortalRequest, GetQdnResourcePropertiesQortalRequest, GetQdnResourceStatusQortalRequest, GetQdnResourceUrlQortalRequest, GetServerConnectionHistoryQortalRequest, GetTxActivitySummaryQortalRequest, GetUserAccountQortalRequest, GetUserWalletInfoQortalRequest, GetUserWalletQortalRequest, GetWalletBalanceQortalRequest, LinkToQdnResourceQortalRequest, ListQdnResourcesQortalRequest, PublishMultipleQdnResourcesQortalRequest, PublishQdnResourceQortalRequest, RegisterNameQortalRequest, RemoveForeignServerQortalRequest, SearchNamesQortalRequest, SearchQdnResourcesQortalRequest, SellNameQortalRequest, SendCoinQortalRequest, SetCurrentForeignServerQortalRequest, UpdateForeignFeeQortalRequest, UpdateNameQortalRequest, VoteOnPollQortalRequest, SendChatMessageQortalRequest, SearchChatMessagesQortalRequest, JoinGroupQortalRequest, AddGroupAdminQortalRequest, UpdateGroupQortalRequest, ListGroupsQortalRequest, CreateGroupQortalRequest, RemoveGroupAdminQortalRequest, BanFromGroupQortalRequest, CancelGroupBanQortalRequest, KickFromGroupQortalRequest, InviteToGroupQortalRequest, CancelGroupInviteQortalRequest, LeaveGroupQortalRequest, DeployAtQortalRequest, GetAtQortalRequest, GetAtDataQortalRequest, ListAtsQortalRequest, FetchBlockQortalRequest, FetchBlockRangeQortalRequest, SearchTransactionsQortalRequest, IsUsingPublicNodeQortalRequest, AdminActionQortalRequest, OpenNewTabQortalRequest, ShowActionsQortalRequest, SignTransactionQortalRequest,  } from "./types/qortalRequests/interfaces"

export {} // mark this file as a module

declare global {

  // interface QortalRequestOptions {
  //   action: string
  //   name?: string
  //   service?: string
  //   data64?: string
  //   title?: string
  //   description?: string
  //   category?: string
  //   tags?: string[]
  //   identifier?: string
  //   address?: string
  //   metaData?: string
  //   encoding?: string
  //   includeMetadata?: boolean
  //   limit?: number
  //   offset?: number
  //   reverse?: boolean
  //   resources?: any[]
  //   filename?: string
  //   list_name?: string
  //   item?: string
  //   items?: string[]
  //   tag1?: string
  //   tag2?: string
  //   tag3?: string
  //   tag4?: string
  //   tag5?: string
  //   coin?: string
  //   destinationAddress?: string
  //   amount?: number
  //   blob?: Blob
  //   mimeType?: string
  //   file?: File
  //   encryptedData?: string
  //   prefix?: boolean
  //   exactMatchNames?: boolean
  //   base64?: string
  //   groupId?: number | string
  //   isAdmins?: boolean
  //   payments?: any[]
  //   assetId?: number
  //   publicKeys?: string[]
  //   recipient?: string
  //   before?: number | null
  //   qortalLink?: string
  // }

  type QortalRequestOptions =
  SendCoinQortalRequest | 
  GetCrosschainServerInfoQortalRequest | 
  GetTxActivitySummaryQortalRequest | 
  GetForeignFeeQortalRequest |
  UpdateForeignFeeQortalRequest |
  GetServerConnectionHistoryQortalRequest | 
  SetCurrentForeignServerQortalRequest |
  AddForeignServerQortalRequest |
  RemoveForeignServerQortalRequest |
  GetDaySummaryQortalRequest |
  CreateTradeBuyOrderQortalRequest |
  CreateTradeSellOrderQortalRequest |
  CancelTradeSellOrderQortalRequest |
  GetPriceQortalRequest |
  GetUserAccountQortalRequest |
  GetUserWalletQortalRequest |
  GetWalletBalanceQortalRequest |
  GetUserWalletInfoQortalRequest |
  GetAccountDataQortalRequest |
  GetAccountNamesQortalRequest |
  SearchNamesQortalRequest |
  GetNameDataQortalRequest |
  GetBalanceQortalRequest |
  RegisterNameQortalRequest |
  SellNameQortalRequest |
  CancelSellNameQortalRequest |
  BuyNameQortalRequest |
  UpdateNameQortalRequest |
  VoteOnPollQortalRequest |
  CreatePollQortalRequest |
  GetListItemsQortalRequest |
  AddListItemsQortalRequest |
  DeleteListItemQortalRequest |
  DecryptDataQortalRequest |
  PublishMultipleQdnResourcesQortalRequest |
  PublishQdnResourceQortalRequest |
  EncryptDataQortalRequest |
  DecryptQortalGroupDataQortalRequest |
  EncryptQortalGroupDataQortalRequest |
  DecryptDataWithSharingKeyQortalRequest |
  EncryptDataWithSharingKeyQortalRequest |
  GetHostedDataQortalRequest |
  DeleteHostedDataQortalRequest |
  GetQdnResourceUrlQortalRequest |
  LinkToQdnResourceQortalRequest |
  ListQdnResourcesQortalRequest |
  SearchQdnResourcesQortalRequest |
  FetchQdnResourceQortalRequest |
  GetQdnResourceStatusQortalRequest |
  GetQdnResourcePropertiesQortalRequest |
  GetQdnResourceMetadataQortalRequest |
  SendChatMessageQortalRequest |
  SearchChatMessagesQortalRequest |
  JoinGroupQortalRequest |
  ListGroupsQortalRequest |
  CreateGroupQortalRequest |
  UpdateGroupQortalRequest |
  AddGroupAdminQortalRequest |
  RemoveGroupAdminQortalRequest |
  BanFromGroupQortalRequest |
  CancelGroupBanQortalRequest |
  KickFromGroupQortalRequest |
  InviteToGroupQortalRequest |
  CancelGroupInviteQortalRequest |
  LeaveGroupQortalRequest |
  DeployAtQortalRequest |
  GetAtQortalRequest |
  GetAtDataQortalRequest |
  ListAtsQortalRequest |
  FetchBlockQortalRequest |
  FetchBlockRangeQortalRequest |
  SearchTransactionsQortalRequest |
  IsUsingPublicNodeQortalRequest |
  AdminActionQortalRequest |
  OpenNewTabQortalRequest |
  ShowActionsQortalRequest |
  SignTransactionQortalRequest


  function qortalRequest(options: QortalRequestOptions): Promise<any>
  function qortalRequestWithTimeout(
    options: QortalRequestOptions,
    time: number
  ): Promise<any>

  interface Window {
    _qdnBase: any
    _qdnTheme: string
  }
}
