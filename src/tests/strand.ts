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
    "./test-data/" + runkey + ".json", 
    JSON.stringify({dat}, null, 2)
  )
  return
}
console.log(process.argv[3])

async function strand() {
  let nodename : string = process.argv[2]
  let port : number = Number(process.argv[3])
  let message_tout : number = Number(process.argv[4])
  let storage_tout : number = Number(process.argv[5])
  let message : string = process.argv[6]
  const client = new PeerClient(
    port,
    nodename,
    [],
    new JsonStore(filenames("line" + nodename)),
    storage_tout
  )
  await sleep(500)
  client.connectTo("localhost:" + (port-1).toString())
}

strand()
