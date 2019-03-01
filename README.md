# Chat server

Uses Express and WebSocket through ws.

Subprotocols available:
- Broadcast
- Echo (default)



### Chat protocol

Example:

    {
        "command": "message",
        "params": {
            "message": "test"
            }
    }    

Commands:
- message
    - parameters: message
- nick
    - parameters: nickname

Response format (control messages???):

    {
        "message": MESSAGE
    }    

Response format (broadcast):

    {
        "timestamp": TIMESTAMP,
        "data": DATA
    }    



### Testing

To test the server in the most simple way, use wscat:

    npm install -g wscat

Test the different subprotocols like this:

    wscat -c ws://localhost:1337/ -s 'broadcast'

    wscat -c ws://localhost:1337/ -s 'echo'
