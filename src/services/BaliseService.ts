import { Socket } from 'net';
import { Subject, throwError } from 'rxjs';
import { filter, first, map } from 'rxjs/operators';
import { Robot } from '../models/Robot';
import { Logger } from './Logger';
import { Inject } from 'typescript-ioc';

class SocketWrapper {
    public data$ = new Subject<any>();

    constructor(private socket: Socket) {
        socket.on('data', (data) => {
            this.data$.next(JSON.parse(data.toString()));
        });
    }

    exchange(data: any): Promise<any> {
        const result$ = this.data$
            .pipe(
                filter(result => result.action === data.action),
                map(result => {
                    if (result.status !== 'OK') {
                        return throwError(result);
                    } else {
                        return result;
                    }
                }),
                first()
            )
            .toPromise();

        this.socket.write(JSON.stringify(data));

        return result$;
    }

}

export class BaliseService {
    @Inject
    private log: Logger;

    private sockets: Record<Robot['id'], SocketWrapper> = {};

    private getSocket(robot: Robot): Promise<SocketWrapper> {
        if (this.sockets[robot.id]) {
            return Promise.resolve(this.sockets[robot.id]);
        }

        return new Promise<SocketWrapper>((resolve, reject) => {
            const [host, port] = robot.host.split(':');
            const socket = new Socket();

            socket.connect({
                host: host,
                port: parseInt(port, 10)
            });

            socket.on('connect', () => {
                this.sockets[robot.id] = new SocketWrapper(socket);
                resolve(this.sockets[robot.id]);
            });

            socket.on('error', (err) => {
                delete this.sockets[robot.id];
                this.log.error(err);
                try {
                    socket.end();
                } catch (e) {
                }
            });

            socket.on('end', () => {
                delete this.sockets[robot.id];
            });

            socket.once('error', reject);
        });
    }

    async doAction(idBalise: number, action: string): Promise<any> {
        const robot = await Robot.findByPk(idBalise);
        const socket = await this.getSocket(robot);
        return socket.exchange({ action });
    }
}
