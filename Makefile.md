# MAKEFILE
This is our "makefile". It instructs users on how to run our program.
The code blocks contained in this file may be copy-pasted from 
github onto the command line.

# Installing dependencies

to install dependencies, simply type:
```
npm install
```

# Start a session on one node
```
npm start
```

Type `/usage` into chat line for more information. Test out the 
interface by sending a few different messages/commands to yourself.
Some commands will not respond with anything. If you keep typing the
script will continue to act on your input.


# Start a session on two nodes

1. start a `tmux` session
2. break the session into two panes
3. on pane 1 start a session with `npm start`. This pane will be using
the same .json as before. Type `/mymessages` to see what is in your 
.json storage
4. on pane 2 start a session with 
`npm start -- --name <name> --port <port>`. 
Be sure to use a different name and a different port for your new
client. 
5. connect to the pane 1 node by typing `/connect <OSname>` or 
`/connect <IP-address>` in the pane 2 client. Alternatively, connect to
the pane 2 node by typing `/connect <OSname>:<port>` or 
`/connect <IP-address>:<port>` in the pane 1 client.
6. Send a few messages between these two nodes.
7. type `/exit` on each node to exit. 
8. databases will be stored at 
`Project-jli2-mkoucky1/source/<name><port>.json` unless otherwise specified.

# Start a session on N nodes

Repeat the steps from "Starting a session on two nodes" with as many 
nodes as you want. You could also try ssh-ing into multiple machines on 
the Swarthmore CS network (probably would also work on a home computer).

# Do some testing

In `peerchat/source/src/tests` there are some test files.
Try running these commands for the following tests

### partition
The command:
```
npx ts-node partition-test-multiple.ts
```
will run a variety of different partition scenarios. In all scenarios,
one client will be a bottleneck between four peers. This bottleneck will
disconnect, and then one side of the "bottle" not disconnected from the
other side will try to delete a message. 

In the first
scenario, there will be no timeouts, and the partition will not be
resolved. In the second scenario, there will be no timeouts and the
partition will resolve, but no attempt at consistency will be made.
In the third scenario, there will be no timeouts but the partition 
will be resolved and an attempt at consistency will be made. In the 
fourth scenario, there will be a timeout on each message send, and
the partition will not resolve. In the fifth scenario, there will be 
a storage timeout on each node of four seconds, and the partition 
will not resolve.

State information will be stored at key points throughout this test
in `tests/test-data/`. In .json files with titles that start with 
`partitionrun-`.

### line

Running
```
npx ts-node line-test-parallel.ts
```
Will run a number of different length chains of nodes, with run data 
stored as well in `tests/test-data`.
