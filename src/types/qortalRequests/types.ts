export type ForeignCoin =
  | 'BTC'
  | 'LTC'
  | 'DOGE'
  | 'DGB'
  | 'RVN'
  | 'ARRR'

  export type Coin =
  | 'QORT'
  | 'BTC'
  | 'LTC'
  | 'DOGE'
  | 'DGB'
  | 'RVN'
  | 'ARRR'


  export type ForeignBlockchain =
  | 'LITECOIN'
  | 'DOGECOIN'
  | 'BITCOIN'
  | 'DIGIBYTE'
  | 'RAVENCOIN'
  | 'PIRATECHAIN'

  export type FeeType = 'feekb' | 'feeceiling'
  export type ConnectionType = 'SSL' | 'TCP'

  export interface CrosschainAtInfo {
    qortalAtAddress: string;
  }

  export type Service =
  | 'AUTO_UPDATE'
  | 'ARBITRARY_DATA'
  | 'QCHAT_ATTACHMENT'
  | 'QCHAT_ATTACHMENT_PRIVATE'
  | 'ATTACHMENT'
  | 'ATTACHMENT_PRIVATE'
  | 'FILE'
  | 'FILE_PRIVATE'
  | 'FILES'
  | 'CHAIN_DATA'
  | 'WEBSITE'
  | 'GIT_REPOSITORY'
  | 'IMAGE'
  | 'IMAGE_PRIVATE'
  | 'THUMBNAIL'
  | 'QCHAT_IMAGE'
  | 'VIDEO'
  | 'VIDEO_PRIVATE'
  | 'AUDIO'
  | 'AUDIO_PRIVATE'
  | 'QCHAT_AUDIO'
  | 'QCHAT_VOICE'
  | 'VOICE'
  | 'VOICE_PRIVATE'
  | 'PODCAST'
  | 'BLOG'
  | 'BLOG_POST'
  | 'BLOG_COMMENT'
  | 'DOCUMENT'
  | 'DOCUMENT_PRIVATE'
  | 'LIST'
  | 'PLAYLIST'
  | 'APP'
  | 'METADATA'
  | 'JSON'
  | 'GIF_REPOSITORY'
  | 'STORE'
  | 'PRODUCT'
  | 'OFFER'
  | 'COUPON'
  | 'CODE'
  | 'PLUGIN'
  | 'EXTENSION'
  | 'GAME'
  | 'ITEM'
  | 'NFT'
  | 'DATABASE'
  | 'SNAPSHOT'
  | 'COMMENT'
  | 'CHAIN_COMMENT'
  | 'MAIL'
  | 'MAIL_PRIVATE'
  | 'MESSAGE'
  | 'MESSAGE_PRIVATE'


  export type ResourceToPublish =
  | {
      service: Service
      identifier: string
      name?: string
      title?: string
      description?: string
      category?: string
      tags?: string[]
      base64: string
      filename?: string
      disableEncrypt?: boolean
    }
  | {
      service: Service
      identifier: string
      name?: string
      title?: string
      description?: string
      category?: string
      tags?: string[]
      data64: string
      filename?: string
      disableEncrypt?: boolean
    }
  | {
      service: Service
      identifier: string
      name: string
      title?: string
      description?: string
      category?: string
      tags?: string[]
      file: File
      filename?: string
      disableEncrypt?: boolean
    }


  export interface ResourcePointer {
    service: Service
    identifier: string
    name: string
  }

  export type ConfirmationStatus = "CONFIRMED" | "UNCONFIRMED" | "BOTH"

  export type TxType =
  | 'GENESIS'
  | 'PAYMENT'
  | 'REGISTER_NAME'
  | 'UPDATE_NAME'
  | 'SELL_NAME'
  | 'CANCEL_SELL_NAME'
  | 'BUY_NAME'
  | 'CREATE_POLL'
  | 'VOTE_ON_POLL'
  | 'ARBITRARY'
  | 'ISSUE_ASSET'
  | 'TRANSFER_ASSET'
  | 'CREATE_ASSET_ORDER'
  | 'CANCEL_ASSET_ORDER'
  | 'MULTI_PAYMENT'
  | 'DEPLOY_AT'
  | 'MESSAGE'
  | 'CHAT'
  | 'PUBLICIZE'
  | 'AIRDROP'
  | 'AT'
  | 'CREATE_GROUP'
  | 'UPDATE_GROUP'
  | 'ADD_GROUP_ADMIN'
  | 'REMOVE_GROUP_ADMIN'
  | 'GROUP_BAN'
  | 'CANCEL_GROUP_BAN'
  | 'GROUP_KICK'
  | 'GROUP_INVITE'
  | 'CANCEL_GROUP_INVITE'
  | 'JOIN_GROUP'
  | 'LEAVE_GROUP'
  | 'GROUP_APPROVAL'
  | 'SET_GROUP'
  | 'UPDATE_ASSET'
  | 'ACCOUNT_FLAGS'
  | 'ENABLE_FORGING'
  | 'REWARD_SHARE'
  | 'ACCOUNT_LEVEL'
  | 'TRANSFER_PRIVS'
  | 'PRESENCE'
