import WebSocket from 'ws';

export class WebSocketWrapper {

    constructor(private ws: WebSocket) {
    }

    send(action: string, data: any = null) {
        if (this.ws.readyState === 1) {
            this.ws.send(JSON.stringify({action, data}));
        }
    }

}
