/*eslint no-undef: "off"*/
const WebSocket = require("ws");

require('../server');

describe('Testing chat server', () => {
    beforeAll(() => {
        require('../server').start(1338, "", 'http://unreachabledomain.com');
    });

    afterAll(() => {
        require('../server').stop();
    });

    test('Websocket server - Not calling from valid client', done => {
        let client = new WebSocket(`ws://localhost:1338?nickname=emil`, 'broadcast');

        client.on('error', (data) => {
            expect(data.message).toBe("Unexpected server response: 403");
        });

        client.on('close', (code) => {
            expect(code).toEqual(1006);
            done();
        });
    });
});
