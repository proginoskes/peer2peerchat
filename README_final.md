# Deletion on peer-to-peer social networks

## Install dependencies
```
npm install
```

It will install the following dependencies:
* [`typescript`](https://www.npmjs.com/package/typescript) which is required in
  order to use TypeScript
* [`ts-node`](https://www.npmjs.com/package/ts-node) a TypeScript execution
  engine that can compile and run TypeScript programs
* [`arg`](https://www.npmjs.com/package/arg) a CLI argument parser
* [`uuid`](https://www.npmjs.com/package/uuid) a library for generating UUIDs
* [`json-socket`](https://www.npmjs.com/package/json-socket) a thin wrapper over
  TCP sockets for sending JSON messages as length-prefixed strings

## Basic usage
```
npm start
```

## Usage
```
to initiate session:
 npm start -- --port <port> --name <name> --file <json storage file>
		--tout <storage timeout> --sendtout <message timeout>
commands:
/exit				 stop peer session
/peers				 list peers and connection ID's
/mymessages			 list messages sent by this peer
/delete <post_uuid>		 send a delete request for a post
/connect <IP:port>		 connect to another peer
/disconnect <connect_ID>	 disconnect from a peer by connection ID
/sync <connect_ID>		 request messages from a peer by
				 connection ID
/preservemymessages		 preserve your messages on peers
/settimeout			 set message timeout (seconds)
/exit				 close all connections and quit
press enter to send a message
```

Note the two dashes between `npm start` and the actual arguments. If they are
omitted, then the arguments will be interpreted for `npm` and not our program,
and will not achieve the expected behavior.

All flags are optional:

| Flag         | Description                             | Default value         |
| ------------ | --------------------------------------- | --------------------- |
| `--port`     | TCP port to listen on                   | `8080`                |
| `--name`     | Display name shown to other peers       | Machine hostname      |
| `--file`     | File name to persist messages to        | `./<name><port>.json` |
| `--tout`     | Storage timeout duration (milliseconds) | `30000000` (8h 20m)   |
| `--sendtout` | Message timeout duration (milliseconds) | `30000000` (8h 20m)   |
| `--peer`     | A peer to connect to automatically      | (none)                |

The `--peer` flag may be repeated in order to connect to multiple peers
automatically. See the examples below.

The port is optional in connection strings (used by the `--peer` flag and the
`/connect` command) and will default to port `8080`. IP addresses or DNS names
are acceptable. Hence these are all equivalent: `130.58.68.61:8080`,
`130.58.68.61`, `cheese:8080`, or `cheese`.

## Examples

* Run on a different port: `npm start -- --port 1234`
* Different port and name: `npm start -- --port 1235 --name extreme_lizard`
* Do not persist data: `npm start -- --file /dev/null`
* Custom storage timeout: `npm start -- --tout 60000`
* Custom message timeout: `npm start -- --sendtout 60000`
* Automatically connect to multiple peers: `npm start -- --peer butter --peer coconut:1234`

## Experiments
Experiments are located in the `src/tests` folder. Some of them require certain
folders to exist on the filesystem, and will crash if they are not present.
All experiments assume that their cwd is `src/tests`. To run a test, use
`ts-node`, which will compile and run it. For example, to run the partition
test:

```
cd src/tests
mkdir test-dbs
npx ts-node partition-test.ts
```
