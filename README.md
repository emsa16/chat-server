# Chat server

A broadcast chat server that uses Express and Websocket through ws.

The chat uses a broadcast subprotocol, however there is also a simple echo subprotocol available, and it is also the default protocol.

Using the broadcast subprotocol requires that a nickname is added in the connection request URL, in the form of '?nickname=NICK'.



### Running the server
Adding DBWEBB_PORT=XXXX before any command sets server port, default is 1337.

    $ npm start                 # Runs server in development mode
    $ npm run production        # Runs server in production mode



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
    - Sends a message to all other users connected to chat
    - parameters: message
- nick
    - Changes nickname
    - parameters: nickname

#### Response format:
    {
        "timestamp": TIMESTAMP,     # server timestamp
        "origin": "user"/"server"   # was the message sent from a user or the server?
        "nickname": NICKNAME        # nickname of message author
        "data": DATA                # message content
    }    



### Testing

wscat can be used to test that the server works:

    # Has to be installed globally
    npm install -g wscat                            

    # Broadcast subprotocol
    # Requires that a nickname is provided as a URL query
    wscat -c ws://[ADDRESS]?nickname=[NICK] -s 'broadcast'

    # Echo subprotocol
    wscat -c ws://[ADDRESS] -s 'echo'



### Client

There is an example for a simple client using plain Javascript, in the client/ folder.
