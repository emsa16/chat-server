/*eslint max-len: "off", no-unused-vars: "off"*/
/**
 * Server using Websockets and Express, supporting broadcast and echo
 * through use of subprotocols.
 */
"use strict";

let port, serverUrl, allowedClientUrl, auth, db, type;
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const URL = require('url').URL;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({
    server: server,
    clientTracking: true, // keep track on connected clients,
    verifyClient: verifyClient,
    handleProtocols: handleProtocols // Manage what subprotocol to use.
});



// Answer on all http requests
app.use(function (req, res) {
    console.log(`HTTP request on ${req.url}`);
    res.send({ msg: "hello" });
});



async function verifyClient(info, callback) {
    if ("sec-websocket-protocol" in info.req.headers && info.req.headers['sec-websocket-protocol'] == "broadcast") {
        if (allowedClientUrl && allowedClientUrl !== info.origin) {
            return callback(false, 403, 'Unauthorized: forbidden origin', '');
        }

        let parsedUrl = new URL(info.req.url, serverUrl);

        if (auth) {
            const token = parsedUrl.searchParams.get("token");
            const res = await auth.checkTokenDirect(token);

            if (!res['status']) {
                return callback(false, 401, 'Unauthorized: ' + res['message'], '');
            }
        }

        let nickname = parsedUrl.searchParams.get("nickname");

        if (!nickname) {
            return callback(false, 401, 'Unauthorized: missing nickname', '');
        }
    }
    return callback(true);
}



/**
 * Select subprotocol to use for connection.
 *
 * @param {Array} protocols              Subprotocols to choose from, sent
 *                                        by client request.
 * @param {http.IncomingMessage} request The client HTTP GET request.
 *
 * @return {void}
 */
function handleProtocols(protocols /*, request */) {
    console.log(`Incoming protocol requests '${protocols}'.`);
    for (var i=0; i < protocols.length; i++) {
        switch (protocols[i]) {
            case "broadcast":
                return "broadcast";
            case "echo":
                //Intentional fallthrough
            default:
                return "echo";
        }
    }
    return false;
}



function noop() {}



function heartbeat() {
    this.isAlive = true;
}



const interval = setInterval(function ping() {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            console.log("Disconnected broken connection");
            return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping(noop);
    });
}, 30000);



function sendMessage(ws, data, origin="server", nickname="Server") {
    let msg =  {
        timestamp: Date(),
        origin: origin,
        nickname: nickname,
        data: data
    };

    ws.send(JSON.stringify(msg));
}



/**
 * Broadcast data to everyone except one self (ws).
 *
 * @param {WebSocket} ws   The current websocket.
 * @param {string}    data The data to send.
 *
 * @return {void}
 */
function broadcastExcept(ws, data, origin = "user") {
    let clients = 0;

    wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            clients++;
            let nickname = ('nickname' in ws && ws.nickname) ? ws.nickname : "";

            sendMessage(client, data, origin, nickname);
        }
    });
    console.log(`Broadcasted data to ${clients} clients (total: ${wss.clients.size}).`);
}



function setNick(ws, nickname) {
    ws.nickname = nickname;
    console.log(`Set nick to ${nickname}`);
    sendMessage(ws, `Nickname set to ${nickname}`);
}



async function changeNick(ws, nickname) {
    let oldnick = ('nickname' in ws) ? ws.nickname : "";

    ws.nickname = nickname;

    console.log(`${oldnick} changed nick to ${nickname}`);
    broadcastExcept(ws, `${oldnick} changed nick to ${nickname}`, "server");
    sendMessage(ws, `Nick changed to ${nickname}`);

    //The game component of the app needs a separate update
    if ("game-chat" === type) {
        broadcastExcept(ws, {
            action: "update-nick",
            old_nickname: oldnick,
            new_nickname: ws.nickname
        }, "server");
    }
}



async function parseBroadcastMessage(ws, message) {
    let obj;

    try {
        obj = JSON.parse(message);
    } catch (error) {
        console.log(`Invalid JSON: ${error}`);
        sendMessage(ws, "Error: Invalid message format");
        return;
    }

    switch (obj.command) {
        case "move":
            //This command is only usable in a game chat
            if ("game-chat" !== type) {
                break;
            }

            if ('position' in obj.params && obj.params.position) {
                let model = "";

                //Update position to and get model from database
                if (db) {
                    let nickname = ('nickname' in ws && ws.nickname) ? ws.nickname : "";

                    db.updateOne("users", {'nickname': nickname}, {'position': obj.params.position});
                    console.log("Position updated");

                    const user = await db.find("users", {nickname: nickname}, {'model': 1}, 1);

                    if (user.length) {
                        model = user[0].model;
                    }
                }

                let data = {
                    position: obj.params.position,
                    model: model,
                };

                broadcastExcept(ws, data);
            } else {
                console.log("Missing position");
                sendMessage(ws, "Error: Missing position");
            }
            break;
        case "nick":
            if ('nickname' in obj.params && obj.params.nickname) {
                changeNick(ws, obj.params.nickname);
            } else {
                console.log("Missing nickname");
                sendMessage(ws, "Error: Missing nickname");
            }
            break;
        case "message":
            if ('message' in obj.params && obj.params.message) {
                broadcastExcept(ws, obj.params.message);
            } else {
                console.log("Empty message");
                sendMessage(ws, "Error: Empty message");
            }
            break;
        default:
            console.log("Invalid command");
            sendMessage(ws, "Error: Invalid command.");
            break;
    }
}



async function broadCastNewPlayerPos(ws, nickname) {
    const result = await db.find("users", {nickname: nickname}, {}, 1);

    if (result.length) {
        let user = result[0];

        let data = {
            position: user.position,
            model: user.model
        };

        console.log("Sending out new player position to active players");
        broadcastExcept(ws, data);
    }
}



function sendPlayerRoster(ws) {
    wss.clients.forEach(async (client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            const nickname = ('nickname' in client && client.nickname) ? client.nickname : "";
            const result = await db.find("users", {nickname: nickname}, {}, 1);

            if (result.length) {
                const user = result[0];
                const data = {
                    position: user.position,
                    model: user.model
                };

                console.log("Sending active player positions to new player");
                sendMessage(ws, data, "server", nickname);
            }
        }
    });
}



function manageBroadCastConn(ws, request) {
    console.log(`Connection received. Adding client using '${ws.protocol}' (total: ${wss.clients.size}).`);

    let parsedUrl = new URL(request.url, serverUrl);
    let nickname = parsedUrl.searchParams.get("nickname");

    setNick(ws, nickname);

    broadcastExcept(ws, `${ws.nickname} has connected`, "server");

    if (db && "game-chat" === type) {
        broadCastNewPlayerPos(ws, nickname);
        sendPlayerRoster(ws);
    }

    ws.on("message", (message) => {
        console.log(`Received: ${message}`);
        parseBroadcastMessage(ws, message);
    });

    ws.on("error", (error) => {
        console.log(`Server error: ${error}`);
    });

    ws.on("close", (code, reason) => {
        console.log(`Closing connection (remaining: ${wss.clients.size}): ${code} ${reason}`);
        broadcastExcept(ws, `${ws.nickname} has disconnected`, "server");

        //The game component of the app needs a separate update
        if ("game-chat" === type) {
            broadcastExcept(ws, {
                action: "remove",
                nickname: ws.nickname
            }, "server");
        }
    });
}



function manageEchoConn(ws) {
    console.log("Connection received.");

    ws.on("message", (message) => {
        console.log(`Received: ${message}`);
        ws.send(message);
    });

    ws.on("error", (error) => {
        console.log(`Server error: ${error}`);
    });

    ws.on("close", (code, reason) => {
        console.log(`Closing connection: ${code} ${reason}`);
    });
}



// Setup for websocket requests.
// Docs: https://github.com/websockets/ws/blob/master/doc/ws.md
wss.on("connection", (ws, request) => {
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    switch (ws.protocol) {
        case "broadcast":
            manageBroadCastConn(ws, request);
            break;
        case "echo":
            //Intentional fallthrough
        default:
            manageEchoConn(ws);
            break;
    }
});



function start(dbwebbPort, wsServerUrl, wsLimitClientTo, authMod = "", dbMod = "", chatType = "default-chat") {
    port = dbwebbPort || process.env.WS_DBWEBB_PORT || 1337;
    serverUrl = wsServerUrl || process.env.WS_SERVER_URL || `ws://localhost:${port}`;
    allowedClientUrl = wsLimitClientTo || process.env.WS_LIMIT_CLIENT_TO || false;
    auth = authMod; //Sets optional token authentication module
    db = dbMod; //Sets optional database module
    type = chatType; //Needed to indicate the implementation of the module as it affects functionality

    // Start up server
    server.listen(port, () => {
        console.log(`chat-server is listening on port ${port}`);
    });
}



function stop() {
    clearInterval(interval);
    server.close();
}



module.exports = server;
module.exports.start = start;
module.exports.stop = stop;
