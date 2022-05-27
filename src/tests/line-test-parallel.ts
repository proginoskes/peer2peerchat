import { v4 as uuidv4 } from 'uuid'
import { PeerClient } from '../peer'
import { JsonStore } from '../storage'
import fs from 'fs'
import * as child_process from 'child_process' 
/**

this tests how our code functions in a line

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

async function experiment1(lenth : number) {
  const timeout = 6500000000000
  const line_len = lenth
  let children : any = []
  const client0: PeerClient = new PeerClient(2000, 
    "client0", 
    [],
    new JsonStore(filenames("line-client0")),
    timeout
    )
  
  const endclient: PeerClient = new PeerClient(2000+line_len, 
    "end", 
    [],
    new JsonStore(filenames("line-end"+(line_len).toString())),
    timeout
    ) 

  const uuids: string[] = []

  for(let i=0; i < 10; i++){
    uuids.push(uuidv4())
  }

  const listenfor : string = uuids[0]
    
  for(let clientnum = 1; clientnum < line_len; clientnum ++) {
    let newcild : any = child_process.fork("./strand.ts", 
                       [ "client"+clientnum.toString(),
                         (2000 + clientnum).toString(),
                         (65000000000).toString(),
                         (65000000000).toString(),
                         listenfor
                       ])
    children.push(newcild)
    await sleep(500)
  }

  await sleep(5000)
  endclient.connectTo('localhost:' + (2000 + line_len - 1).toString())


  const start_broadcast = Date.now()
  client0.broadcastMessage({
    type: 'post',
    author: "client0",
    content: "hi i am client0",
    sent_time: Date.now(),
    refresh_time: Date.now(),
    custom_timeout: timeout,
    uuid: uuids[0]
  })
  await endclient.untilReceivedMessage(uuids[0])
  let elapsed_broadcast = Date.now() - start_broadcast


  for(let i = 0; i < line_len - 1; i++){
    children[i].kill()
  }
  await sleep(300)
  let rundata = {
      "size": (line_len+1).toString(),
      "latency": elapsed_broadcast.toString()
  }
  runMetaData("line",rundata)
  console.log("it took " + elapsed_broadcast.toString() + "msecs for message to reach end")

  endclient.close()
  client0.close()
}

async function experiment_loop() {
  for (let i = 5; i < 40 ; i = i * 2) {
    await experiment1(i)
  }
}

experiment_loop()

