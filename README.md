# Chat server

[![npm](https://img.shields.io/npm/v/@emsa16/chat-server.svg)](https://www.npmjs.com/package/@emsa16/chat-server)
[![Build Status](https://travis-ci.org/emsa16/chat-server.svg?branch=master)](https://travis-ci.org/emsa16/chat-server)
[![Maintainability](https://api.codeclimate.com/v1/badges/fb770235fdbaa11416bf/maintainability)](https://codeclimate.com/github/emsa16/chat-server/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/fb770235fdbaa11416bf/test_coverage)](https://codeclimate.com/github/emsa16/chat-server/test_coverage)

A broadcast chat server that uses Express and Websocket through ws.

The chat uses a broadcast subprotocol, however there is also a simple echo subprotocol available (which is also the default protocol).

Using the broadcast subprotocol requires that a nickname is added in the URL when connecting to the server, in the form of '?nickname=NICK'.


### Installation

    $ npm install @emsa16/chat-server


### Running the server
Include the following lines to run the chat server in your application:

    var chatServer = require('@emsa16/chat-server');
    chatServer.start([dbwebbPort] [, wsServerUrl] [, wsLimitClientTo] [, authMod] [, dbMod] [, chatType]);

The arguments to chatServer.start() are all optional and can be used to set the following:
- `dbwebbPort` - Set server port (default: 1337)
- `wsServerUrl` - Set server URL (default: ws://localhost:1337)
- `wsLimitClientTo` - Set if wanting to block connections from anywhere else than specific client URL (default: false - allows all client URLs)
- `authMod` - inject authentication module (default: empty)
- `dbMod` - inject database module (default: empty)
- `chatType` - indicate what kind of chat server is needed. Currently implemented types are "default-chat" and "game-chat" (default: "default-chat")

To run it as a separate process and with its output in a separate terminal, the above code can be put in a separate file, e.g. `chat-server.js` and run by executing a command like `node chat-server.js`.

When starting the process from the command line, the following environment variables can be set by adding these:
- WS_DBWEBB_PORT=XXXX - Set server port (default: 1337)
- WS_SERVER_URL="URL" - Set server URL (default: ws://localhost:1337)
- WS_LIMIT_CLIENT_TO="URL" - Set if wanting to block connections from anywhere else than specific client URL (default: "")

Another option for running the chat server as a separate service is to install it from the Github repo directly:

    $ git clone https://github.com/emsa16/chat-server
    $ cd chat-server
    $ npm install

Now one of the following commands can be entered:

    $ npm start                 # Runs server in development mode
    $ npm run production        # Runs server in production mode


### Chat protocol

#### Commands
- message
    - Sends a message to all other users connected to chat
    - parameters: message
- nick
    - Changes nickname
    - parameters: nickname
- move (for game chats only)
    - Sends updated position
    - Also sends user image model if a database is being used to store that
    - parameters: position

#### Example message
    {
        "command": "message",
        "params": {
            "message": "My first message"
            }
    }    

#### Response format:
    {
        "timestamp": TIMESTAMP,        # server timestamp
        "origin": "user" or "server"   # was the message sent from a user or the server?
        "nickname": NICKNAME           # nickname of message author
        "data": DATA                   # message content
    }    


### Authentication
It is possible to add an optional authentication module which checks during connection attempts if the user's token is valid. It is done during the startup phase of the chat server (see [Running the server](#running-the-server) above).

To be compatible with this chat module, the auth module has to be a token-based authentication system, needs to have an asynchronous function called `checkTokenDirect(token)` that returns an object containing a `status` key indicating authentication status, and tokens must be sent as a URL parameter named token, i.e. `?token=TOKEN`.


### Database suppport
It is also possible to add a database module during the startup of the server, which is used if additional data about the chat users should be stored in a database. This is currently only used in game chats.

To be compatible with this chat module, the db module needs to have asynchronous `find` and `updateOne` methods. It is strongly recommended to use a Mongo database module.


### Testing

The following command runs the test suite, which consists of linters (stylelint and eslint) and Jest unit tests:

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
