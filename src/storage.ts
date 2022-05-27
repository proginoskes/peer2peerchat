import fs from 'fs'
import { Message } from './message'
/************************************************
 *
 *  |||| STORAGE LIBRARY ||||
 *
 *  this script implements the storage-level 
 *  functionalities of our system.  
 *
 *  @mkoucky1; @jli2; 
 *  CS87 Fall2021
 *  Prof. Tia Newhall, Swarthmore College
 *
 *
 **/


/**
 * StoredMessage is a subset of the types of messages that 
 * can be persisted.
 **/
export type StoredMessage = Extract<Message, { type: 'post' | 'delete' }>

/**
 * canStore returns true if the message in its argument is one of the 
 * types of messages that can be stored.
 *
 *         args: message, of one of the types in message.ts
 *
 *      returns: true if message is of type StoredMessage and is a
 *               'post' or a 'delete'
 *
 **/
export function canStore(message: Message): message is StoredMessage {
  return message.type === 'post' || message.type === 'delete'
}

/**
 * Store is an interface that defines the set of functionality 
 * expected from objects that can persistently store messages.
 **/
export interface Store {
  /**
   * saveIfNotDeleted saves a message to the store, but is a no-op 
   * if there is a death certificate corresponding to the provided 
   * message.
   * 
   *        args: message of type StoredMessage
   **/
  saveIfNotDeleted: (message: StoredMessage) => void

  /**
   * delete removes the message with the provided UUID from the 
   * store, but does not create a death certificate.
   * 
   *       args: uuid of a message
   **/
  delete: (messageUuid: string) => void

  /**
   * deletePostsOlderThan removes all messages from storage that 
   * are older than peer_timeout milliseconds.
   *  
   *        args: timeout for the storage system, node specific 
   **/
  deletePostsOlderThan: (peer_timeout: number) => void

  /**
   * refreshAuthor updates the refresh_time to the provided 
   * sent_time for every message authored by the provided name.
   *
   *        args: author; new time for messages to timeout from   
   **/
  refreshAuthor: (auth: string, sent_time: number) => void

  /**
   * list returns a map containing every stored message, keyed by UUID.
   *
   *        args: none
   *     returns: record of stored messages
   **/
  list: () => Record<string, StoredMessage>

  /**
   * get returns the message corresponding to the provided 
   * UUID, or null if no message with that UUID is stored.
   *        
   *        args: uuid of a message
   *     returns: the message with the arg as uuid, or nothing
   **/
  get: (messageUuid: string) => StoredMessage | null

  /**
   *  gets the timeout of a message for storing a delete
   *  in the worst case scenario, we have lost the message
   *  somehow, and return the timeout for the peer. if the
   *  peer's storage has a timeout greater than the time 
   *  the original message was sent plus the time between
   *  sending it and the delete, we may lose the delete
   *  before the message is offline. it would be a good idea to
   *  try implementing something more rigorous.
   */
  //getTimeout: (messageUuid: string, peer_timeout: number) => number

  /**
   * hasDeleted returns true if the store has a death 
   * certificate corresponding to the provided message, 
   * or false if not.
   *
   *        args: a message of type StoredMessage
   *     returns: true if the node has deleted this message
   *              false if the node has not
   **/
  hasDeleted(message: StoredMessage): boolean
}

/**
 * JsonStore persists its data to a JSON file stored at the path 
 * provided to its constructor. It rewrites the entire file after 
 * every operation, so it is quite inefficient, but it suffices 
 * for small tests.
 * 
 * this is where all the declared interface functions above are 
 * implemented
 **/
export class JsonStore implements Store {
  filename: string
  messages: Record<string, StoredMessage>

  constructor(filename: string) {
    this.filename = filename
    try {
      this.messages = JSON.parse(fs.readFileSync(filename, 'utf-8') || '{}')
    } catch (err) {
      this.messages = {}
    }
  }
  
  // saves a message if not deleted
  saveIfNotDeleted(message: StoredMessage) {
    if (this.hasDeleted(message)) {
      console.log(`Received message ${message.uuid} which was already deleted`)
      return
    }

    this.messages[message.uuid] = message
    fs.writeFileSync(this.filename, JSON.stringify(this.messages))
  }

  // deletes a message by uuid
  delete(messageUuid: string) {
    delete this.messages[messageUuid]
    fs.writeFileSync(this.filename, JSON.stringify(this.messages))
  }
  
  // periodically times out post by least timeout amount
  // (message or storage)
  deletePostsOlderThan(peer_timeout: number) {
    for (const [msg_id, msg] of Object.entries(this.messages)) {
      const t = Date.now()
      if ((msg.type === 'post') && 
          (t - peer_timeout > msg.refresh_time 
            || t - msg.custom_timeout > msg.refresh_time )) {

        delete this.messages[msg_id]   
      }
    }
    fs.writeFileSync(this.filename, JSON.stringify(this.messages))
  }
  
  // refreshes the basis on which timeouts expire fo the messages of 
  // arg1: author; to
  // arg2: the current time
  refreshAuthor(auth: string, sent_time: number) {
    for (const [msg_id, msg] of Object.entries(this.messages)) {
      if ((msg.type === 'post') && msg.author === auth &&
          msg.refresh_time < sent_time) {
        msg.refresh_time = sent_time 
      }
      fs.writeFileSync(this.filename, JSON.stringify(this.messages))
    }
  }
 
  // list the messages stored on this peer
  list() {
    return this.messages
  }

  // get a specific message by id on this peer
  get(messageUuid: string) {
    return this.messages[messageUuid] ?? null
  }

  // get the timeout of a message and if dne, the timeout of this peer
  // getTimeout(messageUuid: string, peer_timeout: number){
  //   return this.messages[messageUuid].custom_timeout ?? peer_timeout
  // }

  // returns true if arg1 has been deleted and false if not
  // returns false also if we have a delete stored signed by 
  // a different author for the same message
  hasDeleted(message: StoredMessage): boolean {
    // Slow O(n) search could be faster but okay for now
    return Object.values(this.messages).some((deletion) =>
      deletion.type === 'delete' &&
      deletion.post_uuid === message.uuid &&
      deletion.author === message.author
    )
  }
}
