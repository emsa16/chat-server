/**
 * To setup a websocket connection, and nothing more.
 */
(function () {
    "use strict";

    let ably;

    const HOST = 'http://localhost:8888';
    // const HOST = 'https://emsa-chat-api.netlify.app';
    
    const CHANNEL = "getting-started"; // TODO update

    let user;

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
            msg = typeof message == 'string' ? JSON.parse(message) : message;
        } catch (error) {
            console.log(`Invalid JSON: ${error}`);
            return;
        }    

        let data = ("data" in msg) ? msg.data : "";
        let nick = ("nickname" in msg && msg.nickname) ? msg.nickname : "anonymous";
        let origin = ("origin" in msg && msg.origin) ? msg.origin : "server";

        if (data && user !== nick) {
            if ("server" == origin) {
                outputLog(`Server: ${data}`);
            } else {
                outputLog(`${nick}: ${data}`);
            }
        }
    }



    function formatMessageOut(messageText) {
        let data = {command: "message", params: {message: messageText}, sender: user};
        let re = /^\/([A-Za-z]+)\s*(\w*)/; // matches '/[COMMAND] [VALUE]', e.g. /nick emil
        let result = re.exec(messageText);

        if (result && result.length > 1) {
            let nick;
            let command = result[1];

            switch (command) {
                case 'nick':
                    nick = result[2] ? result[2]: "";
                    data = {"command": "nick", "params": {"nickname": nick}, sender: user};
                    user = nick;
                    break;
                default:
                    data = {command, sender: user};
            }
        }
        return JSON.stringify(data);
    }



    /**
     * What to do when user clicks Connect
     */
    connectForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        if (ably && ably.connection && ['connected', 'connecting'].includes(ably.connection.state)) {
            console.log("Connection already established");
            return;
        }

        const optionalClientId = "optionalClientId"; 
        // When not provided in authUrl, a default will be used.
        ably = new Ably.Realtime.Promise({ authUrl: `${HOST}/api/ably-token-request?clientId=${optionalClientId}` });
        // TODO handle nickname on connection, old way: new WebSocket(`${serverUrl}?nickname=${nickname.value}`, 'broadcast')
        await ably.connection.once("connected");
        const channel = ably.channels.get(CHANNEL);
        outputLog("You are now connected to chat.");
        status.innerHTML = "Status: Connected";
        close.style.color = "#000";
        connect.style.color = "#D5DBDB";
        user = nickname.value;
        nickname.value = "";

        await channel.subscribe((msg) => {
            console.log("Received message", msg);
            if (msg.data) {
                parseIncomingMessage(msg.data);
            }
        });

        ably.connection.on('closed', () => {
            outputLog("Chat connection is now closed.");
            status.innerHTML = "Status: Disconnected";
            connect.style.color = "#000";
            close.style.color = "#D5DBDB";
        });
    }, false);




    messageForm.addEventListener('submit', function(event) {
        event.preventDefault();

        let messageText = message.value;

        if (!ably || !ably.connection || ably.connection.state !== 'connected') {
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
            .then((response) => response.json())
            .then((response) => {
                outputLog(`You: ${messageText}`);
                parseIncomingMessage(response);
                message.value = "";
            })
            .catch(error => { console.error(error) });
    });



    /**
     * What to do when user clicks Close connection.
     */
    close.addEventListener("click", function(/*event*/) {
        if (!ably || !ably.connection || !['connected', 'connecting'].includes(ably.connection.state)) {
            console.log("Chat connection is already closed");
            return;
        }

        ably.close();
        outputLog("Closing chat.");
    });
})();
