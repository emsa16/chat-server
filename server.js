/**
 * Server using websockets and express supporting broadcase and echo
 * through use of subprotocols.
 */
"use strict";

const port = process.env.DBWEBB_PORT || 1337;
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({
    server: server,
    clientTracking: true, // keep track on connected clients,
    handleProtocols: handleProtocols // Manage what subprotocol to use.
});



// Answer on all http requests
app.use(function (req, res) {
    console.log("HTTP request on " + req.url);
    res.send({ msg: "hello" });
});



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
        if (protocols[i] === "broadcast") {
            return "broadcast";
        } else if (protocols[i] === "echo") {
            return "echo";
        } else {
            return "echo";
        }
    }
    return false;
}



/**
 * Broadcast data to everyone except one self (ws).
 *
 * @param {WebSocket} ws   The current websocket.
 * @param {string}    data The data to send.
 *
 * @return {void}
 */
function broadcastExcept(ws, data) {
    let clients = 0;

    wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            clients++;
            let nickname = ('nickname' in ws) ? ws.nickname : "";
            let msg = {
                timestamp: Date(),
                nickname: nickname,
                data: data
            };

            client.send(JSON.stringify(msg));
        }
    });
    console.log(`Broadcasted data to ${clients} clients (total: ${wss.clients.size}).`);
}



function sendMessage(ws, message) {
    let data =  {
        message: message
    }
    ws.send(JSON.stringify(data));
}



function changeNick(ws, nickname) {
    console.log("Changing nickname");

    wss.clients.forEach((client) => {
        if (client === ws) {
            if ('nickname' in client) {
                console.log("Old nickname: " + client.nickname);
            }
            client.nickname = nickname;
            console.log("New nickname: " + client.nickname);
        }
    });

    sendMessage(ws, `Nick changed to ${nickname}`);
}



function parseMessage(ws, message) {
    let obj;
    try {
        obj = JSON.parse(message);
    }
    catch(error) {
        console.log("Invalid JSON: " + error);
        sendMessage(ws, "Error: Invalid message format");
        return;
    }

    switch (obj.command) {
        case "nick":
            if ('nickname' in obj.params) {
                changeNick(ws, obj.params.nickname);
            } else {
                console.log("Missing nickname");
                sendMessage(ws, "Error: Missing nickname");
            }
            break;
        case "message":
            if ('message' in obj.params) {
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



function manageBroadCastConn(ws) {
    console.log(`Connection received. Adding client using '${ws.protocol}' (total: ${wss.clients.size}).`);

    broadcastExcept(ws, `New client connected.`);

    ws.on("message", (message) => {
        console.log("Received: %s", message);
        parseMessage(ws, message);
    });

    ws.on("error", (error) => {
        console.log(`Server error: ${error}`);
    });

    ws.on("close", (code, reason) => {
        console.log(`Closing connection (remaining: ${wss.clients.size}): ${code} ${reason}`);
        broadcastExcept(ws, `Client disconnected.`);
    });
}



function manageEchoConn(ws) {
    console.log("Connection received.");

    ws.on("message", (message) => {
        console.log("Received: %s", message);
        sendMessage(ws, message);
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
wss.on("connection", (ws/*, req*/) => {
    if (ws.protocol === "broadcast") {
        manageBroadCastConn(ws);
    } else if (ws.protocol === "echo") {
        manageEchoConn(ws);
    } else {
        manageEchoConn(ws);
    }
});


// Startup server
server.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
