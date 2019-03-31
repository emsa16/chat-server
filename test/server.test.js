/*eslint no-undef: "off"*/
"use strict";

const request = require('supertest');
const WebSocket = require("ws");
let server = require('../server');

describe('Testing chat server', () => {
    afterAll(() => {
        require('../server').stop();
    });

    test('HTTP request root path', async () => {
        const response = await request(server).get('/');

        expect(response.statusCode).toBe(200);
        expect(response.body.msg).toBe('hello');
    });

    test('HTTP request random path', async () => {
        const response = await request(server).get('/foo/bar');

        expect(response.statusCode).toBe(200);
        expect(response.body.msg).toBe('hello');
    });

    test('Websocket echo server - message echoes back', done => {
        let client = new WebSocket(`ws://localhost:1337`, 'echo');

        client.on('open', () => {
            client.send('test message');
        });

        client.on('message', (data) => {
            expect(data).toBe('test message');
            client.close(1000);
        });

        client.on('close', (code) => {
            expect(code).toEqual(1000);
            done();
        });
    });

    test('Websocket broadcast server - Nickname is registered', done => {
        let client = new WebSocket(`ws://localhost:1337?nickname=emil`, 'broadcast');

        client.on('message', (data) => {
            const msg = JSON.parse(data);

            expect(msg.data).toBe('Nickname set to emil');
            client.close(1000);
        });

        client.on('close', (code) => {
            expect(code).toEqual(1000);
            done();
        });
    });

    test('Websocket broadcast server - Change nickname', done => {
        let receivedMessages = 0;
        let client = new WebSocket(`ws://localhost:1337?nickname=emil`, 'broadcast');

        client.on('message', (data) => {
            const msg = JSON.parse(data);

            if (0 === receivedMessages) {
                expect(msg.data).toBe('Nickname set to emil');

                client.send(JSON.stringify({
                    command: "nick",
                    params: {
                        nickname: "joel"
                    }
                }));
            } else {
                expect(msg.data).toBe('Nick changed to joel');
                client.close(1000);
            }

            receivedMessages++;
        });

        client.on('close', (code) => {
            expect(code).toEqual(1000);
            done();
        });
    });

    test('Websocket broadcast server - error messages', done => {
        let receivedMessages = 0;
        let client = new WebSocket(`ws://localhost:1337?nickname=emil`, 'broadcast');

        client.on('message', (data) => {
            const msg = JSON.parse(data);

            switch (receivedMessages) {
                case 0:
                    expect(msg.data).toBe('Nickname set to emil');

                    client.send("Not JSON formatted");
                    break;
                case 1:
                    expect(msg.data).toBe('Error: Invalid message format');

                    client.send(JSON.stringify({
                        command: "wrong command",
                        params: {
                            message: "test1"
                        }
                    }));
                    break;
                case 2:
                    expect(msg.data).toBe('Error: Invalid command.');

                    client.send(JSON.stringify({
                        command: "nick",
                        params: {
                        }
                    }));
                    break;
                case 3:
                    expect(msg.data).toBe('Error: Missing nickname');

                    client.send(JSON.stringify({
                        command: "message",
                        params: {
                            message: ""
                        }
                    }));
                    break;
                case 4:
                    expect(msg.data).toBe('Error: Empty message');
                    client.close(1000);
                    break;
            }
            receivedMessages++;
        });

        client.on('close', (code) => {
            expect(code).toEqual(1000);
            done();
        });
    });

    test('Websocket broadcast server - sending messages between two clients', done => {
        let receivedMessagesClient1 = 0;
        let receivedMessagesClient2 = 0;
        let client1 = new WebSocket(`ws://localhost:1337?nickname=emil`, 'broadcast');
        let client2;

        client1.on('message', (data) => {
            const msg = JSON.parse(data);

            if (0 === receivedMessagesClient1) {
                expect(msg.data).toBe('Nickname set to emil');
                client2 = new WebSocket(`ws://localhost:1337?nickname=joel`, 'broadcast');

                client2.on('message', (data) => {
                    const msg = JSON.parse(data);

                    if (0 === receivedMessagesClient2) {
                        expect(msg.data).toBe('Nickname set to joel');
                    } else {
                        expect(msg.data).toBe('test1');

                        client2.send(JSON.stringify({
                            command: "message",
                            params: {
                                message: "test2"
                            }
                        }));
                    }

                    receivedMessagesClient2++;
                });

                client2.on('close', (code) => {
                    expect(code).toEqual(1000);
                    done();
                });
            } else if (1 === receivedMessagesClient1) {
                expect(msg.data).toBe('joel has connected');

                client1.send(JSON.stringify({
                    command: "message",
                    params: {
                        message: "test1"
                    }
                }));
            } else {
                expect(msg.data).toBe('test2');
                client1.close(1000);
            }

            receivedMessagesClient1++;
        });

        client1.on('close', (code) => {
            expect(code).toEqual(1000);
            client2.close(1000);
        });
    });
});
