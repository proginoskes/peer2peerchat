import { v4 as uuidv4 } from 'uuid'
import { PeerClient } from '../peer'
import { JsonStore } from '../storage'
import fs from 'fs'

/**

this tests how our code functions in a line

**/


//this function makes our code asynchronous
function sleep(ms: number){
  return new Promise(resolve => setTimeout(resolve, ms));
}

//make file names
function filenames(auth: string){
  return './test-dbs/line/' + auth + '_' + (new Date()).toISOString() + '.json'
}

function runMetaData(runtype: string, dat: any){
  const runkey : string = runtype + "_" + (new Date()).toISOString()
  fs.writeFileSync(
    "./test-data/line-9oclock/" + runkey + ".json", 
    JSON.stringify({dat}, null, 2)
  )
  return
}

async function experiment1(lenth : number) {
  const timeout = 6500000000000
  const line_len = lenth
  let clients : PeerClient[] = []
  let ports : number[] = []
  let newclient: PeerClient = new PeerClient(2000, 
    "client0", 
    [],
    new JsonStore(filenames("line-client0")),
    timeout
    )
  ports.push(2000)
  clients.push(newclient)
 
  const uuids: string[] = []

  for(let i=0; i < 10; i++){
    uuids.push(uuidv4())
  }

               
  for(let clientnum = 1; clientnum < line_len; clientnum ++) {
    let clientname = "client" + clientnum.toString()
    ports.push(2000 + clientnum)
    newclient = new PeerClient(
      2000 + clientnum, 
      "client"+clientnum.toString(),
      [], 
      new JsonStore(filenames("line-"+clientname)),
      timeout  
      )
    clients.push(newclient)
    clients[clientnum-1].connectTo("localhost:" + ports[clientnum].toString())
    await clients[clientnum-1].untilConnectedWith(clientname)
    //console.log("connected " + clients[clientnum].name + " to " +  clients[clientnum-1].name)
  }

  const start_broadcast = Date.now()
  clients[0].broadcastMessage({
    type: 'post',
    author: "client0",
    content: "hi i am client0",
    sent_time: Date.now(),
    refresh_time: Date.now(),
    custom_timeout: timeout,
    uuid: uuids[0]
  })
  await clients[line_len-1].untilReceivedMessage(uuids[0])
  let elapsed_broadcast = Date.now() - start_broadcast


  for(let i = 0; i < line_len ; i++){
    clients[i].close()
  }
  await sleep(300)
  let rundata = {
      "size": line_len.toString(),
      "latency": elapsed_broadcast.toString()
  }
  runMetaData("line",rundata)
  console.log("it took " + elapsed_broadcast.toString() + "msecs for message to reach end")
}

async function experiment_loop() {
  for (let i = 25; i < 1000 ; i = i + 25) {
    await experiment1(i)
  }
}

experiment_loop()
