import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { PeerClient } from '../peer'
import { JsonStore } from '../storage'


/**

this is our partition test, no expiration, reconnect
  - client 3 syncs on reconnect
**/


//this function makes our code asynchronous
function sleep(ms: number){
  return new Promise(resolve => setTimeout(resolve, ms));
}

//make file names
function filenames(auth: string){
  return './test-dbs/' + auth + '_' + (new Date()).toISOString() + '.json'
}
function runMetaData(runtype: string, dat: any){
  const runkey : string = runtype + "_" + (new Date()).toISOString()
  fs.writeFileSync(
    "./test-data/" + runkey + ".json", 
    JSON.stringify({dat}, null, 2)
  )
  return
}


async function experiment1(
  subtest: string,
  reconnect: boolean,
  recSync: boolean, 
  storage_tout: number, 
  message_tout: number,
) {
  let rundata : any = {}

  const client3fi = filenames("part-client3-rec")

  rundata['storage_timeout'] = storage_tout
  rundata['message_timeout'] = message_tout
  rundata['num_nodes'] = 5
  rundata['reconnect'] = reconnect
  rundata['sync_on_recon'] = recSync

  const client1 = new PeerClient(1111, "client1", [], 
          new JsonStore(filenames("part-client1-rec")), storage_tout)
  rundata[client1.name] = {}
  const client2 = new PeerClient(2020, "client2", [], 
          new JsonStore(filenames("part-client2-rec")), storage_tout)
  rundata[client2.name] = {}
  const client3 = new PeerClient(3030, "client3", [], 
          new JsonStore(client3fi), storage_tout)
  rundata[client3.name] = {}
  const client4 = new PeerClient(4040, "client4", [], 
          new JsonStore(filenames("part-client4-rec")), storage_tout)
  rundata[client4.name] = {}
  const client5 = new PeerClient(5050, "client5", [], 
          new JsonStore(filenames("part-client5-rec")), storage_tout)
  rundata[client5.name] = {}
  await sleep(400)

  client2.connectTo("localhost:1111")
  await client1.untilConnectedWith('client2')
  rundata.client1['neighbor'] = ['client2']
  rundata.client2['neighbor'] = ['client1']

  client2.connectTo("localhost:3030")
  await client3.untilConnectedWith('client2')
  rundata.client3['neighbor'] = ['client2']
  rundata.client2['neighbor'].push('client3')

  client1.connectTo("localhost:3030")
  await client3.untilConnectedWith('client1')
  rundata.client1['neighbor'].push('client3')
  rundata.client3['neighbor'].push('client1')
 
  client4.connectTo("localhost:3030")
  await client3.untilConnectedWith('client1')
  rundata.client4['neighbor'] = ['client3']
  rundata.client3['neighbor'].push('client4')

  client5.connectTo("localhost:3030")
  await client3.untilConnectedWith('client5')
  rundata.client3['neighbor'].push('client5')
  rundata.client5['neighbor'] = ['client3']

  client5.connectTo("localhost:4040")
  await client4.untilConnectedWith('client5')
  rundata.client4['neighbor'].push('client5')
  rundata.client5['neighbor'].push('client4')


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
    custom_timeout: message_tout,
    uuid: uuids[0]
  })
  await client2.untilReceivedMessage(uuids[0])
  rundata.client1['messages_before_delete'] = JSON.parse(JSON.stringify(client1.store.list()))
  rundata.client2['messages_before_delete'] = JSON.parse(JSON.stringify(client2.store.list()))
  await client3.untilReceivedMessage(uuids[0])
  rundata.client3['messages_before_delete'] = JSON.parse(JSON.stringify(client3.store.list()))
  await client4.untilReceivedMessage(uuids[0])
  rundata.client4['messages_before_delete'] = JSON.parse(JSON.stringify(client4.store.list()))
  await client5.untilReceivedMessage(uuids[0])
  rundata.client5['messages_before_delete'] = JSON.parse(JSON.stringify(client5.store.list()))
  client3.close()
  await sleep(500) 

  client1.broadcastMessage({
    type: 'delete',
    author: "client1",
    post_uuid: uuids[0],
    sent_time: Date.now(),
    uuid: uuids[1]
  })
  await sleep(1000)
  await client2.untilReceivedMessage(uuids[1])
  rundata.client1['messages_after_delete'] = JSON.parse(JSON.stringify(client1.store.list()))
  rundata.client2['messages_after_delete'] = JSON.parse(JSON.stringify(client2.store.list()))
  await sleep(500) 
  rundata.client4['messages_after_delete'] = JSON.parse(JSON.stringify(client4.store.list()))
  rundata.client5['messages_after_delete'] = JSON.parse(JSON.stringify(client5.store.list()))
  await sleep(5000)
  const client3a = new PeerClient(3030, "client3", [], 
          new JsonStore(client3fi), storage_tout)
 
  if(reconnect){

  client3a.connectTo("localhost:4040")
  await client4.untilConnectedWith('client3')
  client3a.connectTo("localhost:5050")
  await client5.untilConnectedWith('client3')
  client3a.connectTo("localhost:2020")
  await client2.untilConnectedWith('client3')
  client3a.connectTo("localhost:1111")
  await client1.untilConnectedWith('client3')
  
    if(recSync){
      // client 3 syncs on reconnect
      client3a.syncWith(client3a.connectionUuidFor('client4'))
      await sleep(100)
      rundata.client3['messages_after_sync_cli4'] = JSON.parse(JSON.stringify(client3a.store.list()))
      client3a.syncWith(client3a.connectionUuidFor('client5'))
      await sleep(100)
      rundata.client3['messages_after_sync_cli5'] = JSON.parse(JSON.stringify(client3a.store.list()))
      client3a.syncWith(client3a.connectionUuidFor('client2'))
      await sleep(100)
      rundata.client3['messages_after_sync_cli2'] = JSON.parse(JSON.stringify(client3a.store.list()))
      client3a.syncWith(client3a.connectionUuidFor('client1'))
      await sleep(100)
      rundata.client3['messages_after_sync_cli1'] = JSON.parse(JSON.stringify(client3a.store.list()))
      await sleep(1000)
    }
  }

  rundata.client1['messages_final'] = JSON.parse(JSON.stringify(client1.store.list()))
  rundata.client2['messages_final'] = JSON.parse(JSON.stringify(client2.store.list()))
  rundata.client3['messages_final'] = JSON.parse(JSON.stringify(client3a.store.list()))
  rundata.client4['messages_final'] = JSON.parse(JSON.stringify(client4.store.list()))
  rundata.client5['messages_final'] = JSON.parse(JSON.stringify(client5.store.list()))
  await sleep(500)
  
  

  client1.close()
  client2.close()
  client3a.close()
  client4.close()
  client5.close()

  runMetaData("partitionrun-"+subtest, rundata)
}
async function nosync_sync(){
  // await experiment1(reconnect, recSync, storage_tout,message_tout)
  
  // without timeouts
  await experiment1(
    "orig",
    false, 
    false, 
    6500000000000,  
    6500000000000)
  await experiment1(
    "rec",
    true, 
    false, 
    6500000000000,  
    6500000000000)
  await experiment1(
    "recsync",
    true, 
    true, 
    6500000000000, 
    6500000000000)
  await experiment1(
    "messagetimeout",
    false, 
    false, 
    6500000000000,  
    4000)
  await experiment1(
    "storagetimeout",
    false, 
    false, 
    4000, 
    6500000000000)
}

nosync_sync()
