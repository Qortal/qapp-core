export type Service  =
| "ARBITRARY_DATA"
| "QCHAT_ATTACHMENT"
| "ATTACHMENT"
| "FILE"
| "FILES"
| "CHAIN_DATA"
| "WEBSITE"
| "IMAGE"
| "THUMBNAIL"
| "QCHAT_IMAGE"
| "VIDEO"
| "AUDIO"
| "QCHAT_AUDIO"
| "QCHAT_VOICE"
| "VOICE"
| "PODCAST"
| "BLOG"
| "BLOG_POST"
| "BLOG_COMMENT"
| "DOCUMENT"
| "LIST"
| "PLAYLIST"
| "APP"
| "METADATA"
| "JSON"
| "GIF_REPOSITORY"
| "STORE"
| "PRODUCT"
| "OFFER"
| "COUPON"
| "CODE"
| "PLUGIN"
| "EXTENSION"
| "GAME"
| "ITEM"
| "NFT"
| "DATABASE"
| "SNAPSHOT"
| "COMMENT"
| "CHAIN_COMMENT"
| "MAIL"
| "MESSAGE"
// Newly added private types
| "QCHAT_ATTACHMENT_PRIVATE"
| "ATTACHMENT_PRIVATE"
| "FILE_PRIVATE"
| "IMAGE_PRIVATE"
| "VIDEO_PRIVATE"
| "AUDIO_PRIVATE"
| "VOICE_PRIVATE"
| "DOCUMENT_PRIVATE"
| "MAIL_PRIVATE"
| "MESSAGE_PRIVATE" | 'AUTO_UPDATE';


export interface QortalMetadata {
    size: number
    created: number
    name: string
    identifier: string
    service: Service
    metadata?: {
      title?: string
      category?: number
      categoryName?: string
      tags?: string[]
      description?: string
    }
    updated?: number
  }

  export interface QortalGetMetadata {
    name: string
    identifier: string
    service: Service
  }

 export interface QortalSearchParams {
    identifier: string;
    service: Service;
    query?: string;
    name?: string;
    names?: string[];
    keywords?: string[];
    title?: string;
    description?: string;
    prefix?: boolean;
    includemetadata?: boolean;
    exactMatchNames?: boolean;
    minLevel?: number;
    nameListFilter?: string;
    followedOnly?: boolean;
    excludeBlocked?: boolean;
    before?: number; 
    after?: number;  
    limit?: number;
    offset?: number;
    reverse?: boolean;
    mode?: 'ALL' | 'LATEST'
  }
  