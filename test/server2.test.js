/*eslint no-undef: "off"*/
const WebSocket = require("ws");

process.env.WS_LIMIT_CLIENT_TO = 'http://unreachabledomain.com';
require('../server');

describe('Testing chat server', () => {
    afterAll(() => {
        require('../server').stop();
    });

    test('Websocket server - Not calling from valid client', done => {
        let client = new WebSocket(`ws://localhost:1337?nickname=emil`, 'broadcast');

        client.on('error', (data) => {
            expect(data.message).toBe("Unexpected server response: 403");
        });

        client.on('close', (code) => {
            expect(code).toEqual(1006);
            done();
        });
    });
});
