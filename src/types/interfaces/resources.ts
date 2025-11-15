export type Service =
  | 'APP'
  | 'ARBITRARY_DATA'
  | 'ATTACHMENT'
  | 'AUDIO'
  | 'BLOG_COMMENT'
  | 'BLOG_POST'
  | 'BLOG'
  | 'CHAIN_COMMENT'
  | 'CHAIN_DATA'
  | 'CODE'
  | 'COMMENT'
  | 'COUPON'
  | 'DATABASE'
  | 'DOCUMENT'
  | 'EXTENSION'
  | 'FILE'
  | 'FILES'
  | 'GAME'
  | 'GIF_REPOSITORY'
  | 'IMAGE'
  | 'ITEM'
  | 'JSON'
  | 'LIST'
  | 'MAIL'
  | 'MESSAGE'
  | 'METADATA'
  | 'NFT'
  | 'OFFER'
  | 'PLAYLIST'
  | 'PLUGIN'
  | 'PODCAST'
  | 'PRODUCT'
  | 'QCHAT_ATTACHMENT'
  | 'QCHAT_AUDIO'
  | 'QCHAT_IMAGE'
  | 'QCHAT_VOICE'
  | 'SNAPSHOT'
  | 'STORE'
  | 'THUMBNAIL'
  | 'VIDEO'
  | 'VOICE'
  | 'WEBSITE'
  // Newly added private types
  | 'AUTO_UPDATE'
  | 'ATTACHMENT_PRIVATE'
  | 'AUDIO_PRIVATE'
  | 'DOCUMENT_PRIVATE'
  | 'FILE_PRIVATE'
  | 'IMAGE_PRIVATE'
  | 'MAIL_PRIVATE'
  | 'MESSAGE_PRIVATE'
  | 'QCHAT_ATTACHMENT_PRIVATE'
  | 'VIDEO_PRIVATE'
  | 'VOICE_PRIVATE';

export interface QortalMetadata {
  size: number;
  created: number;
  name: string;
  identifier: string;
  service: Service;
  metadata?: {
    title?: string;
    category?: number;
    categoryName?: string;
    tags?: string[];
    description?: string;
  };
  updated?: number;
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
