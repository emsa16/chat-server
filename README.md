# Chat server

A broadcast chat server that uses Express and Websocket through ws.

The chat uses a broadcast subprotocol, however there is also an echo subprotocol available, and it is also the default protocol.



### Chat protocol

#### Example
    {
        "command": "message",
        "params": {
            "message": "My first message"
            }
    }    

#### Commands
- message
    - parameters: message
- nick
    - parameters: nickname

#### Broadcast response format:
    {
        "timestamp": TIMESTAMP,
        "data": DATA
    }    

#### Control message response format
    {
        "message": MESSAGE
    }    



### Testing

wscat can be used to test that the server works. The following examples assumes the server is running locally on port 1337:

    # Has to be installed globally
    npm install -g wscat                            

    # Broadcast subprotocol
    # Requires that a nickname is included in the header
    wscat -c ws://localhost:1337/ -s 'broadcast' -H nickname:NICK

    # Echo subprotocol
    wscat -c ws://localhost:1337/ -s 'echo'
