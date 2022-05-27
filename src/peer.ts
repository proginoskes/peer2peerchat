import net from 'net'
import JsonSocket from 'json-socket'
import { v4 as uuidv4 } from 'uuid'
import { Message } from './message'
import { Store, canStore } from './storage'

/************************************************
 *
 *  |||| PEER LIBRARY ||||
 *
 *  this script implements the peer-level methods
 *  of our system. Here is where we implement
 *  connection protocols and call storage 
 *  protocols from storage.ts
 *
 *  @mkoucky1; @jli2; 
 *  CS87 Fall2021
 *  Prof. Tia Newhall, Swarthmore College
 *
 *
 **/



/**
 * Peer stores the state associated with a single connected peer.
 **/
export type Peer = {
  /**
   * A randomly generated identifier for the peer's connection. 
   * It is different for every connection, even if the same peer 
   * disconnects and connects again.
   **/
  connectionUuid: string

  /**
   * The I/O descriptor for the TCP socket with the peer.
   **/
  socket: JsonSocket

  /**
   * The status of the connection with the peer. It starts out as 
   * 'handshaking' during which it is not safe to send messages to 
   * the peer, and it transitions to 'ready' after the handshake 
   * is completed.
   **/
  status: 'handshaking' | 'ready'

  /**
   * The name of the peer. It starts out undefined, and then is set 
   * to the name provided by the other peer in their handshake.
   **/
  name?: string

  /**
   * A set of the UUIDs of the messages that the peer is believed 
   * to have seen.
   **/
  seen: Set<string>
}

/**
 * A map of all connected peers, keyed by a randomly generated 
 * connection UUID.
 **/
type PeerMap = Record<string, Peer>

type Callback = () => void

/**
 * 
 * function that sends a message of any type to a peer.
 *   
 *      args: peer and message to send to said peer
 *
 *    return: error or success
 *
 **/
function sendMessage(peer: Peer, message: Message): Promise<void> {
  return new Promise((resolve, reject) => {
    peer.socket.sendMessage(message, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

/**
 * calls each callback function (typically a Promise.resolve) registered
 * in the cbMap with the corresponding key
 * @param cbMap a map between keys and a list of callback functions
 * @param key the key corresponding to the callback functions that 
 *                    should be called
 */
function alertCallbacks(cbMap: Record<string, Callback[] | undefined>, key: string) {
  const callbacks = cbMap[key]
  if (callbacks) {
    for (const cb of callbacks) {
      cb()
    }
  }
}

/**
 * registers a callback function in the cbMap with the provided key
 * @param cbMap a map between keys and a list of callback functions
 * @param key the key to register the callback under
 * @param callback the callback function
 **/
function registerCallback(cbMap: Record<string, Callback[] | undefined>, key: string, callback: Callback) {
  const callbacks = cbMap[key]
  if (callbacks) {
    callbacks.push(callback)
  } else {
    cbMap[key] = [callback]
  }
}

/**
 * the class of this node. Established which port this node listens
 * on, the name of this node, the peers (PeerMap) of the node, the
 * TCP socket (net.Server) for connections, the storage (of type Store,
 * implemented in storage.ts), and the timer for our expirations.
 **/
export class PeerClient {
  port: number
  name: string
  peers: PeerMap
  server: net.Server
  store: Store
  timeoutTask: NodeJS.Timer

  peerCallbacks: Record<string, Callback[] | undefined>
  messageCallbacks: Record<string, Callback[] | undefined>

  constructor(port: number, name: string, initialPeers: string[], store: Store, timeout: number) {
    this.port = port
    this.name = name
    this.peers = {}
    this.store = store
    this.peerCallbacks = {}
    this.messageCallbacks = {}

    this.server = net.createServer()
    this.server.listen(port)
    console.log('Listening on port', port, 'as', name)

    this.server.on('connection', (rawSocket) => {
      const socket = new JsonSocket(rawSocket)
      this.setupConnection(socket)
    })

    for (const conn of initialPeers) {
      this.connectTo(conn)
    }

    this.timeoutTask = setInterval(() => {
      this.store.deletePostsOlderThan(timeout)
    }, 1000)
  }


  /**
   * returns a list of the peers minus their sockets, which can't be 
   * stringified into JSON
   **/
  serializedPeers() {
    const peersobj: Record<string, Partial<Peer>> = {}
    for (const [connectionUuid, peer] of Object.entries(this.peers)) {
      peersobj[connectionUuid] = {
        ...peer,
        socket: undefined
      }
    }
    return peersobj
  }

  /**
   * a library method that allows this node to connect to other peers
   * by IP address and port
   *     
   *    args: IP and Port as a string
   *
   *    return: handshake
   *
   **/
  async connectTo(conn: string) {
    const socket = new JsonSocket(new net.Socket())
    const [host, port = '8080'] = conn.split(':')
    socket.connect(parseInt(port), host)
    return this.setupConnection(socket)
  }

  /**
   *
   * a library method that disconnects this node from a given peer. 
   *
   *      args: connection uuid
   *
   **/
  disconnectFrom(connectionUuid: string) {
    this.peers[connectionUuid].socket.destroy()
  }

  /**
   *
   * a library method that allows this node to sync to its peers
   * by connection uuid. sends a SyncReq with this node's stored
   * message uuid's.
   *     
   *      args: connection uuid for a peer
   *
   *    return: error or succes of sendMessage
   *
   **/
  async syncWith(connectionUuid: string) {
    // find peer by connectionUuid to send request
    return sendMessage(this.peers[connectionUuid], {
      type: 'syncrequest',
      has_uuids: Object.keys(this.store.list())
    })
  }

  /**
   * a library method that handshakes with and sets up the state of 
   * a peer that has just connected.
   *     
   *      args: file descriptor for socket to send and receive JSON
   *            messages on
   **/
  async setupConnection(socket: JsonSocket) {
    const peer: Peer = {
      status: 'handshaking',
      socket,
      seen: new Set(),
      connectionUuid: uuidv4()
    }
    this.peers[peer.connectionUuid] = peer

    socket.on('message', (message: Message) => {
      this.handleMessage(peer, message)
    })

    socket.on('error', (error) => {
      console.error(error)
      delete this.peers[peer.connectionUuid]
    })

    socket.on('close', () => {
      console.log(`Closing connection with peer ${peer.name}`)
      delete this.peers[peer.connectionUuid]
    })

    return sendMessage(peer, {
      type: 'handshake',
      name: this.name
    })
  }

  /**
   * main handler for messages that are received from a connected peer.
   **/
  async handleMessage(peer: Peer, message: Message) {
    switch (message.type) {
      case 'handshake': {
        if (peer.status === 'handshaking') {
          peer.name = message.name
          peer.status = 'ready'
          console.log(`Handshaked with peer ${peer.name}`)
          alertCallbacks(this.peerCallbacks, peer.name)
        }
        break
      }

      case 'post': {
        peer.seen.add(message.uuid)

        if (this.store.hasDeleted(message)) {
          break
        }

        if (this.store.get(message.uuid) === null) {
          console.log(`${message.author}: ${message.content}`)
        }

        this.broadcastMessage(message)
        break
      }

      case 'delete': {
        peer.seen.add(message.uuid)

        if (this.store.get(message.uuid) !== null) {
          break
        }

        const target = this.store.get(message.post_uuid)

        if (target === null) {
          // Received the deletion before the actual message. 
          // Keep it around so that we know not to save that message 
          // if/when it comes.
          break
        }

        if (target.author !== message.author) {
          console.log(`Peer ${message.author} cannot delete ${target.author}'s message'`)
          return
        }

        console.log(`Deleting message ${message.post_uuid}$ from ${target.author}`) 
        this.store.delete(message.post_uuid)
        this.broadcastMessage(message)
        break
      }

      case 'syncrequest': {
        peer.seen = new Set(message.has_uuids)
        const sync = Object.entries(this.store.list())
          .filter(([messageUuid, _]) => !peer.seen.has(messageUuid))
          .map(([_, message]) => message)
        await sendMessage(peer, {
          type: 'syncresponse',
          messages: sync
        })
        break
      }

      case 'syncresponse': {
        for (const msg of message.messages) {
          this.handleMessage(peer, msg)
        }
        break
      }

      case 'messagepreserve' : {
        this.store.refreshAuthor(message.author, message.sent_time)
        break
      }

      default: {
        console.log('Got unknown message', message)
      }
    }

    if (canStore(message)) {
      this.store.saveIfNotDeleted(message)
      alertCallbacks(this.messageCallbacks, message.uuid)
    }
  }

  /**
   * a library method that broadcasts a message from this node to
   * its peers, and stores it if applicable.
   **/
  async broadcastMessage(message: Message) {
    if (canStore(message)) {
      this.store.saveIfNotDeleted(message)
      alertCallbacks(this.messageCallbacks, message.uuid)
    }

    await Promise.all(Object.values(this.peers).map(
      async (peer) => {
        if (peer.status !== 'ready') {
          return
        }

        if (message.type === 'post') {
          if (peer.seen.has(message.uuid)) {
            return
          }
          peer.seen.add(message.uuid)
        }

        if (message.type === 'delete') {
          
          peer.seen.add(message.uuid)
          this.store.delete(message.post_uuid)
        }

        await sendMessage(peer, message)
      }
    ))
  }

  /**
   *
   * a library method that disconnects from each peer and stops 
   * listening for
   * new connections.
   **/
  close() {
    clearTimeout(this.timeoutTask)
    this.server.close()
    for (const connectionUuid of Object.keys(this.peers)) {
      this.disconnectFrom(connectionUuid)
    }
    this.peers = {}
  }

  /**
   * untilConnectedWith returns a Promise that resolves after the client
   * connects with a peer who has the specified name. If a peer with that
   * name is already connected, then the Promise resolves immediately.
   **/
  async untilConnectedWith(name: string): Promise<void> {
    return new Promise((resolve) => {
      if (Object.values(this.peers).some(peer => peer.name === name)) {
        resolve()
      } else {
        registerCallback(this.peerCallbacks, name, resolve)
      }
    })
  }

  /**
   * untilReceivedMessage returns a Promise that resolves after the client
   * receives a message with the specified UUID. If the client has already
   * received it, then the Promise resolves immediately.
   **/
  async untilReceivedMessage(messageUuid: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.store.get(messageUuid) !== null) {
        resolve()
      } else {
        registerCallback(this.messageCallbacks, messageUuid, resolve)
      }
    })
  }

  /**
   * connectionUuid returns the connection UUID of a connected peer with
   * the specified name, or raises an exception if there is no such peer.
   * If multiple peers have the same name, one will be chosen arbitrarily.
   **/
  connectionUuidFor(name: string): string {
    for (const [connectionUuid, peer] of Object.entries(this.peers)) {
      if (peer.name === name) {
        return connectionUuid
      }
    }

    throw new Error(`not connected with any peer named ${name}`)
  }
}
