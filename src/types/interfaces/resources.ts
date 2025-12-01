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

export interface QortalGetMetadata {
  name: string;
  identifier: string;
  service: Service;
}

export interface QortalSearchParams {
  after?: number;
  before?: number;
  description?: string;
  exactMatchNames?: boolean;
  excludeBlocked?: boolean;
  followedOnly?: boolean;
  identifier: string;
  includemetadata?: boolean;
  keywords?: string[];
  limit?: number;
  minLevel?: number;
  mode?: 'ALL' | 'LATEST';
  name?: string;
  nameListFilter?: string;
  names?: string[];
  offset?: number;
  prefix?: boolean;
  query?: string;
  reverse?: boolean;
  service: Service;
  title?: string;
}

export interface QortalPreloadedParams {
  limit: number;
  offset: number;
}

export interface EntityParams {
  entityType: string;
  parentId?: string | null;
}

export interface SecondaryDataSource {
  priority: number; // Weight for distribution (higher = more items from this source)
  params: QortalSearchParams | { entityParams: EntityParams };
}
