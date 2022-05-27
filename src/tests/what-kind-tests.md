# tests to do
- [x] basic functionality 3 nodes
- [ ] line test n nodes
- [x] partition 5 nodes, no expiration
- [x] partition 5 nodes, message timeout > peer timeout
- [x] partition 5 nodes, message timeout < peer timeout
- [x] partition 5 nodes, message timeout = peer timeout
- [x] partition 5 nodes, no expiration, reconnecting center node
- [ ] partition 5 nodes, message timeout > peer timeout, reconnecting center node
- [ ] partition 5 nodes, message timeout < peer timeout, reconnecting center node
- [ ] peers don't store deletes, only send and act on
  - one node leaves, doesn't get delete. reconnects (count re-receives)
- [ ] 


# partition metadata
- preamble/section1: 
```
{
  "nodes" : "5",
  "peer_timeout" : "0000000",
  "message_timeout" : "0000000",
  "reconnecting center node" : "y/n"
```

- we are measuring:
  - how many times do we "re-recieve" a deleted message
  - do we re-send deleted messages
  - number of peers that have message at end
  - 

