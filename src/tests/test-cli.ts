import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { PeerClient } from '../peer'
import { JsonStore } from '../storage'


/**

this is our functionality test file. here we are
making sure our code runs as expected. we want to
make sure we can: 
  - connect two clients
  - send and receive messages
  - send and receive deletes
  - send preservations
  - perform timeouts
  - connect a third client
  - request sync from client3
  - send, recv, delte, timeout
  - disconnect

**/


//this function makes our code asynchronous
function sleep(ms: number){
  return new Promise(resolve => setTimeout(resolve, ms));
}

//make file names
function filenames(auth: string){
  return './test-dbs/' + auth + '_' + (new Date()).toISOString() + '.json'
}

//generate metadata for a run
function runMetaData(runtype: string, dat: any){
  const runkey : string = runtype + "_" + (new Date()).toISOString()
  fs.writeFileSync(
    "./test-data/" + runtype + ".json",
    JSON.stringify({[runkey]: dat}, null, 2)
  )
  return
}

async function experiment1() {
  let rundata : any = {}
  const timeout = 10000

  const client1 = new PeerClient(6060, "client1", [], 
          new JsonStore(filenames("client1")), timeout)
  const client2 = new PeerClient(4040, "client2", [], 
          new JsonStore(filenames("client2")), timeout)
  const client3 = new PeerClient(2020, "client3", [], 
          new JsonStore(filenames("client3")), timeout)

  rundata["timeout"] = timeout

  client2.connectTo("localhost:6060")
  await client1.untilConnectedWith('client2')
  
  const uuids: string[] = []

  for(let i=0; i < 10; i++){
    uuids.push(uuidv4())
  }

  client1.broadcastMessage({
    type: 'post',
    author: "client1",
    content: "hi i am client1",
    sent_time: Date.now(),
    refresh_time: Date.now(),
    custom_timeout: timeout,
    uuid: uuids[0]
  })
  await client2.untilReceivedMessage(uuids[0])

  client2.broadcastMessage({
    type: 'post',
    author: "client2",
    content: "hi i am client2",
    sent_time: Date.now(),
    refresh_time: Date.now(),
    custom_timeout: timeout,
    uuid: uuids[1]
  })
  await client1.untilReceivedMessage(uuids[1])

  client1.broadcastMessage({
    type: 'delete',
    author: "client1",
    post_uuid: uuids[0],
    sent_time: Date.now(),
    uuid: uuids[2]
  })
  await client2.untilReceivedMessage(uuids[2])

  client2.broadcastMessage({
    type: "messagepreserve",
    author: "client2",
    sent_time: Date.now()
  })

  client3.connectTo("localhost:6060")
  await client1.untilConnectedWith('client3')
  await client3.untilConnectedWith('client1')
  


  client3.syncWith(client3.connectionUuidFor('client1'))
  await client3.untilReceivedMessage(uuids[1])
  await client3.untilReceivedMessage(uuids[2])

  client3.broadcastMessage({
    type: 'post',
    author: "client3",
    content: "hi i am client3",
    sent_time: Date.now(),
    refresh_time: Date.now(),
    custom_timeout: timeout,
    uuid: uuids[3]
  })
  await client1.untilReceivedMessage(uuids[3])
  await client2.untilReceivedMessage(uuids[3])


  rundata["c1_neighbors"] = client1.serializedPeers()
  rundata["c2_neighbors"] = client2.serializedPeers()
  rundata["c3_neighbors"] = client3.serializedPeers()

  runMetaData("test",rundata)
  
  client1.close()
  client2.close()
  client3.close()
}

experiment1()
