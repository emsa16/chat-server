/**
 * To setup a websocket connection, and nothing more.
 */
(function () {
    "use strict";

    let ablyConnection;

    const HOST = 'http://localhost:8888';
    // const HOST = 'https://emsa-chat-api.netlify.app';
    
    const CHANNEL = "getting-started"; // TODO update

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
        } catch (error) {
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
        let re = /^\/([A-Za-z]+)\s*(\w*)/; // matches '/[COMMAND] [VALUE]', e.g. /nick emil
        let result = re.exec(messageText);

        if (result && result.length > 1) {
            let nick;
            let command = result[1];

            switch (command) {
                case 'nick':
                    nick = result[2] ? result[2]: "";
                    data = {"command": "nick", "params": {"nickname": nick}};
                    break;
                default:
                    data = {"command": command};
            }
        }
        return JSON.stringify(data);
    }



    /**
     * What to do when user clicks Connect
     */
    connectForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        if (ablyConnection && ablyConnection.connection && ['connected', 'connecting'].includes(ablyConnection.connection.state)) {
            console.log("Connection already established");
            return;
        }

        const optionalClientId = "optionalClientId"; 
        // When not provided in authUrl, a default will be used.
        ablyConnection = new Ably.Realtime.Promise({ authUrl: `${HOST}/api/ably-token-request?clientId=${optionalClientId}` });
        // TODO handle nickname on connection, old way: new WebSocket(`${serverUrl}?nickname=${nickname.value}`, 'broadcast')
        await ablyConnection.connection.once("connected");
        const channel = ablyConnection.channels.get(CHANNEL);
        outputLog("You are now connected to chat.");
        status.innerHTML = "Status: Connected";
        close.style.color = "#000";
        connect.style.color = "#D5DBDB";
        nickname.value = "";

        await channel.subscribe((msg) => {
            console.log("Received message", msg);
            if (msg.data) {
                parseIncomingMessage(msg.data);
            }
        });

        ablyConnection.connection.on('closed', () => {
            outputLog("Chat connection is now closed.");
            status.innerHTML = "Status: Disconnected";
            connect.style.color = "#000";
            close.style.color = "#D5DBDB";
        });
    }, false);




    messageForm.addEventListener('submit', function(event) {
        event.preventDefault();

        let messageText = message.value;

        if (!ablyConnection || !ablyConnection.connection || ablyConnection.connection.state !== 'connected') {
            outputLog("You are not connected to the chat.");
            return;
        }

        fetch(`${HOST}/api/send-message`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: formatMessageOut(messageText)
        })
            .then(() => {
                outputLog(`You: ${messageText}`);
                message.value = "";
            })
            .catch(error => { console.error(error) });
    });



    /**
     * What to do when user clicks Close connection.
     */
    close.addEventListener("click", function(/*event*/) {
        if (!ablyConnection || !ablyConnection.connection || !['connected', 'connecting'].includes(ablyConnection.connection.state)) {
            console.log("Chat connection is already closed");
            return;
        }

        ablyConnection.close();
        outputLog("Closing chat.");
    });
})();
