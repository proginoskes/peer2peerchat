# Basis and Background

This project arose out of work done in CS87: Parallel and Distributed 
Systems at Swarthmore College in Fall 2021. @veggiedefender and @proginoskes
found that there was a significant gap in many existing Peer-to-Peer messaging
apps, where deletion was rarely implemented in early stages of development, and
when it was implemented it was not particularly thorough. We wanted to make
a messaging system which emphasized temporary persistence of information, allowed
users a greater level of control over their information, and did so without
sacrificing reliable content delivery. We built a simple application to 
demonstrate that such a task was possible.

# Our Deletion Method

We implemented a two-way deletion method. Each message has a time to live, which
we call "timeout." In order to preserve a message on the network, this TTL
must be periodically extended. Otherwise, the message will disappear from the
network. If someone would like to delete a message, they can either wait for
the message to expire, or they can send out an active delete message, which is
passed by gossip protocol - in the same way as a content message - and which 
wipes the specified message from nodes that come in contact with said deletion
message.

# Risks

While we implement a system which allows for a deletion guarantee, there are
risks associated with our deletion system. In the case of partition, the only
possible deletion method is the "wait" or "passive" delete. This means that
messages must have a relatively short time to live in order for deletion to remain
partition-tolerant. When implementing a client or starting up a node, we advise
that users keep in mind that their messages must have a TTL long enough to
traverse the network but short enough so that information they share - and then
decide they wish they hadn't - doesn't stay up on inaccessible regions for too 
long.

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
