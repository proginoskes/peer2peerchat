import arg from 'arg'
import readline from 'readline'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'
import { PeerClient } from './peer'
import { JsonStore } from './storage'


/************************************************
 *
 *  |||| CLIENT SCRIPT ||||
 *
 *  this script implements the client-user
 *  interface for the command line/terminal
 *  based user.
 *
 *  @mkoucky1; @jli2; 
 *  CS87 Fall2021
 *  Prof. Tia Newhall, Swarthmore College
 *
 *
 **/

/**
 *
 * these are the arguments for initializing a
 * chat session from the command line using
 * 'npm start --'
 *  
 *     --name <name>    (defines the name for this node)
 *                      (default: OS host name ex: "butter")
 *     --port <0000>    (defines the port used by this node)
 *                      (default: 8080)
 *     --file <fi>.json (defines the name of the json database file)
 *                      (default: name + port + .json)
 **/
const args = arg({
  '--name': String,
  '--port': Number,
  '--peer': [String],
  '--file': String,
  '--tout': Number,
  '--sendtout': Number
})

const name = args['--name'] ?? os.hostname()
const port = args['--port'] ?? 8080
const initialPeers = args['--peer'] ?? []
const filename = args['--file'] ?? `./${name}${port}.json`
const timeout = args['--tout'] ?? 30000000
let messagetimeout = args ['--sendtout'] ?? 30000000

console.log(`Saving data to ${filename}`)

// declare the client
const client = new PeerClient(port, name, initialPeers, new JsonStore(filename), timeout)

const rl = readline.createInterface({
  input: process.stdin
})

/**
 *
 * Reads and processes lines from stdin every "loop" of the program. 
 * Acts out commands on '/<command>" and broadcasts messages on 
 * '<msg>' (press enter to act on message or command)
 *
 **/
rl.on('line', async function(line: string) {
  line = line.trim()

  // close peer on '/exit'
  if (line === '/exit') {
    rl.close()
    client.close()
    return
  }

  // list current connected peers on '/peers'
  if (line === '/peers') {
    for (const [connectionUuid, peer] of Object.entries(client.peers)) {
      console.log(`${connectionUuid}\t${peer.status}\t${peer.name}`)
    }
    return
  }

  // list full contents of .json database, in JSON format on 
  // '/mymessages'
  if (line === '/mymessages') {
    console.log(client.store.list())
    return
  }

  // print out usage info on '/usage'
  if (line === '/usage'){
    console.log("to initiate session:\n npm start -- --port <port> --name <name> --file <json storage file>")
    console.log("\t\t--tout <storage timeout> --sendtout <message timeout>")
    console.log("commands:\n/exit\t\t\t\t stop peer session")
    console.log("/peers\t\t\t\t list peers and connection ID's")
    console.log("/mymessages\t\t\t list messages sent by this peer")
    console.log("/delete <post_uuid>\t\t send a delete request for a post")
    console.log("/connect <IP:port>\t\t connect to another peer")
    console.log("/disconnect <connect_ID>\t disconnect from a peer by connection ID")
    console.log("/sync <connect_ID>\t\t request messages from a peer by\n\t\t\t\t connection ID")
    console.log("/preservemymessages\t\t preserve your messages on peers")
    console.log("/settimeout\t\t\t set message timeout (seconds) for this peer's storage")
    console.log("/exit\t\t\t\t close all connections and quit")
    console.log("press enter to send a message")
    return
  }

  // delete a message by uuid from self and connected peers when line
  // is '/delete <uuid>'
  const del = line.match(/^\/delete (.+)$/)
  if (del) {
    await client.broadcastMessage({
      type: 'delete',
      author: name, 
      post_uuid: del[1],
      sent_time: Date.now(),
      // refresh_time: Date.now(),
      // custom_timeout: client.store.getTimeout(del[1], messagetimeout),
      uuid: uuidv4()
    })
    client.store.delete(del[1])
    console.log(`Deleting message ${del[1]}`)
    return
  }

  // manual timeout the messages stored on this node with '/timeout'
  if(line === '/timeout') {
    console.log(`timing out messages with ${Date.now() + timeout}`)
    client.store.deletePostsOlderThan(Date.now() - timeout)
    return
  }
 
  // manually update the timeouts on the messages this node has written
  // to the network by typing '/preservemymessages'
  if(line === '/preservemymessages') {
    console.log(`updating timeouts for ${name}`)
    await client.broadcastMessage({
      type: 'messagepreserve',
      author: name,
      sent_time: Date.now()
    })
    return
  }

  // connects this node to a peer by IP adress and port. On 
  // Swarthmore CS network this works with <OSNAME>:<portnumber>
  // command runs on line '/connect <IP>:<portnum>'
  const conn = line.match(/^\/connect (.+)$/)
  if (conn) {
    await client.connectTo(conn[1])
    return
  }

  // disconnects this node from a peer identified by a given
  // connectionUUID, accessible by entering '/peers'. this command
  // runs on '/disconnect <connectionUuid>'
  const disconnectUuid = line.match(/^\/disconnect (.+)$/)
  if (disconnectUuid) {
    client.disconnectFrom(disconnectUuid[1])
    return
  }

  // sends out a synchronization request to a given peer identifies
  // by a connectionUUID, accesible by entering '/peers'. this
  // command runs on '/sync <connectionUuid>'
  const syncUuid = line.match(/^\/sync (.+)$/)
  if (syncUuid) {
    await client.syncWith(syncUuid[1])
    return
  }

  // sets the timeout on storage for this node to another length
  // so that node user may save messages for longer or remove messages
  // from their storage sooner. command runs on '/settimeout <seconds>'. 
  const newtimeout = line.match(/^\/settimeout (\d+)$/)
  if (newtimeout) {
    messagetimeout = parseInt(newtimeout[1]) * 1000
    console.log(`Set message timeout to ${messagetimeout} milliseconds`)
    return
  }

  // broadcasts message on enter if no other command is run
  await client.broadcastMessage({
    type: 'post',
    author: name,
    content: line,
    sent_time: Date.now(),
    refresh_time: Date.now(),
    custom_timeout: messagetimeout,
    uuid: uuidv4()
  })
})
