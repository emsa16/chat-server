/**
 * To setup a websocket connection, and nothing more.
 */
(function () {
    "use strict";

    let websocket;
    // let url         = "ws://localhost:1337";
    let url         = "wss://ws.emilsandberg.com/";

    let connect     = document.getElementById("connect");
    let connectForm = document.getElementById("connect_form");
    let nickname    = document.getElementById("nickname");
    let messageForm = document.getElementById("message_form");
    let message     = document.getElementById("message");
    let close       = document.getElementById("close");
    let output      = document.getElementById("output");
    let status      = document.getElementById("status");



    /**
     * Log output to web browser.
     *
     * @param  {string} message to output in the browser window.
     *
     * @return {void}
     */
    function outputLog(message) {
        let now = new Date();
        let timestamp = now.toLocaleTimeString();

        output.innerHTML += `${timestamp} ${message}<br>`;
        output.scrollTop = output.scrollHeight;
    }



    function parseIncomingMessage(message) {
        let msg;

        try {
            msg = JSON.parse(message);
        }
        catch(error) {
            console.log(`Invalid JSON: ${error}`);
            return;
        }

        let data = ("data" in msg) ? msg.data : "";
        let nick = ("nickname" in msg && msg.nickname) ? msg.nickname : "anonymous";
        let origin = ("origin" in msg && msg.origin) ? msg.origin : "server";

        if (data) {
            if ("server" == origin) {
                outputLog(`Server: ${data}`);
            } else {
                outputLog(`${nick}: ${data}`);
            }
        }
    }



    function formatMessageOut(messageText) {
        let data = {"command": "message", "params": {"message": messageText}};
        let re = /^\/([A-Za-z]+)\s*(\w*)/; // Regex matching '/' commands followed by text, e.g. /nick emil
        let result = re.exec(messageText);
        if (result && result.length > 1) {
            let command = result[1];
            switch (command) {
                case 'nick':
                    let nick = result[2] ? result[2]: "";
                    data = {"command": "nick", "params": {"nickname": nick}};
                    break;
                default:
                    data = {"command": command};
            }
        }
        websocket.send(JSON.stringify(data));
    }



    /**
     * What to do when user clicks Connect
     */
    connectForm.addEventListener("submit", function(event) {
        event.preventDefault();

        if (websocket && websocket.readyState !== 3) {
            console.log("Websocket is already connected");
            return;
        }

        let fullUrl = `${url}?nickname=${nickname.value}`;

        console.log(`Connecting to: ${fullUrl}`);
        websocket = new WebSocket(fullUrl, 'broadcast');

        websocket.onopen = function() {
            console.log("The websocket is now open.");
            console.log(websocket);
            outputLog("You are now connected to chat.");
            status.innerHTML = "Status: Connected";
            close.style.color = "#000";
            connect.style.color = "#D5DBDB";
            nickname.value = "";
        };

        websocket.onmessage = function(event) {
            console.log(`Receiving message: ${event.data}`);
            console.log(event);
            console.log(websocket);
            parseIncomingMessage(event.data);
        };

        websocket.onclose = function() {
            console.log("The websocket is now closed.");
            console.log(websocket);
            outputLog("Chat connection is now closed.");
            status.innerHTML = "Status: Disconnected";
            connect.style.color = "#000";
            close.style.color = "#D5DBDB";
        };
    }, false);




    messageForm.addEventListener('submit', function(event) {
        event.preventDefault();

        let messageText = message.value;

        if (!websocket || websocket.readyState === 3) {
            console.log("The websocket is not connected to a server.");
            outputLog("You are not connected to the chat.");
        } else {
            formatMessageOut(messageText);
            console.log(`Sending message: ${messageText}`);
            outputLog(`You: ${messageText}`);
            message.value = "";
        }
    });



    /**
     * What to do when user clicks Close connection.
     */
    close.addEventListener("click", function(/*event*/) {
        if (!websocket || websocket.readyState === 3) {
            console.log("Websocket is already closed");
            return;
        }

        console.log("Closing websocket.");
        websocket.close(1000, "Client closing connection by intention.");
        console.log(websocket);
        outputLog("Closing chat.");
    });
})();
