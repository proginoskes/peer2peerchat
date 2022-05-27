/**
 * MessageHandshake is the initial handshake sent by both peers 
 * immediately after creating a connection.
 */
export type MessageHandshake = { type: 'handshake', name: string}

/**
 * MessagePost contains the content of the posts written by users, 
 * signed by its author and uniquely identified by a randomly 
 * generated UUID.
 */
export type MessagePost = {
  type: 'post',
  author: string,
  content: string,
  sent_time: number,
  refresh_time: number,
  custom_timeout: number,
  uuid: string
}

/**
 * MessageDelete is a "death certificate" indicating that the post 
 * corresponding to its post_uuid has been deleted by its author.
 */
export type MessageDelete = {
  type: 'delete',
  author: string,
  post_uuid: string,
  sent_time: number,
  // refresh_time: number,
  // custom_timeout: number,
  uuid: string
}

/**
 * SyncReq requests the contents of the local database from another 
 * node. has_uuids contains the UUIDs of the messages that the sender 
 * already has.
 */
export type SyncReq = { type: 'syncrequest', has_uuids: string[] }

/**
 * SyncResp is a reply to a SyncReq containing an array of messages 
 * in any order.
 */
export type SyncResp = { type: 'syncresponse', messages: Message[] }

/**
 * PreserveMessages indicates that the author wishes to update the 
 * refresh_time of all their posts in order to extend their expiration.
 */
export type PreserveMessages = { type: 'messagepreserve', author: string, sent_time: number}

/**
 * A Message is a tagged union of every type of message supported by 
 * the protocol. Different types of messages can be told apart by 
 * their `type` field.
 */
export type Message =
  | MessageHandshake
  | MessagePost
  | MessageDelete
  | SyncReq
  | SyncResp
  | PreserveMessages
