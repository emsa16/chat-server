# Chat server

[![npm](https://img.shields.io/npm/v/@emsa16/chat-server.svg)](https://www.npmjs.com/package/@emsa16/chat-server)
[![Build Status](https://travis-ci.org/emsa16/chat-server.svg?branch=master)](https://travis-ci.org/emsa16/chat-server)
[![Maintainability](https://api.codeclimate.com/v1/badges/fb770235fdbaa11416bf/maintainability)](https://codeclimate.com/github/emsa16/chat-server/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/fb770235fdbaa11416bf/test_coverage)](https://codeclimate.com/github/emsa16/chat-server/test_coverage)

A broadcast chat server that uses Express and Websocket through ws.

The chat uses a broadcast subprotocol, however there is also a simple echo subprotocol available (which is also the default protocol).

Using the broadcast subprotocol requires that a nickname is added in the URL when connecting to the server, in the form of '?nickname=NICK'.


### Installation

    $ git clone https://github.com/emsa16/chat-server
    $ cd chat-server
    $ npm install


### Running the server

    $ npm start                 # Runs server in development mode
    $ npm run production        # Runs server in production mode

The following environment variables can be set by adding these before above commands:
- DBWEBB_PORT=XXXX - Set server port (default: 1337)
- SERVER_URL="URL" - Set server URL (default: ws://localhost:1337)
- LIMIT_CLIENT_TO="URL" - Set if wanting to block connections from anywhere else than specific client URL (default: "")


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
        "timestamp": TIMESTAMP,        # server timestamp
        "origin": "user" or "server"   # was the message sent from a user or the server?
        "nickname": NICKNAME           # nickname of message author
        "data": DATA                   # message content
    }    


### Testing

The following command runs the test suite, which consists of *TEMP WHATTTTTT*:

    $ npm test

wscat is a command line tool that can be used to test the server functionality:

    # Has to be installed globally
    $ npm install -g wscat                            

    # Broadcast subprotocol
    # Requires that a nickname is provided as a URL query
    $ wscat -c ws://[ADDRESS]?nickname=[NICK] -s 'broadcast'

    # Echo subprotocol
    $ wscat -c ws://[ADDRESS] -s 'echo'


### Client

The client/ folder contains an example for a simple client using plain Javascript.
