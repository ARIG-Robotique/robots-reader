import fs, { ReadStream } from 'fs';
import { Inject, Singleton } from 'typescript-ioc';
import { Exec } from '../models/Exec';
import { Logger } from './Logger';
import StreamArray = require('stream-json/streamers/StreamArray');

@Singleton
export class ReadTimeSeriesService {

    @Inject
    private log: Logger;

    /**
     * Lit un fichier *-mouvement.json en batch de 100 lignes.
     */
    readMouvementSeriesBatch(dir: string, idExec: string, onData: (items: any[]) => Promise<unknown>): Promise<void> {
        return this.readSeriesFile(Exec.mouvementsFile(dir, idExec), onData);
    }

    /**
     * Lire le fichier *-timeseries.json en batch de 100 lignes.
     */
    readTimeseriesBatch(dir: string, idExec: string, onData: (items: any[]) => Promise<unknown>): Promise<void> {
        return this.readSeriesFile(Exec.timeseriesFile(dir, idExec), onData);
    }

    private readSeriesFile(file: string, onData: (items: any[]) => Promise<unknown>): Promise<void> {
        const items = [];
        return this.readTimeseries(file, (item: any, stream: ReadStream) => {
            items.push(item);

            if (items.length >= 100) {
                stream.pause();

                onData(items.slice(0))
                    .then(() => {
                        stream.resume();
                    }, (err: Error) => {
                        items.length = 0;
                        stream.destroy();
                        this.log.error(`Error while processing file ${file} with error : ${err.stack}`);
                    });

                items.length = 0;
            }
        })
            .then(() => onData(items))
            .then(() => null);
    }

    /**
     * Lecture d'un fichier timeseries en stream
     */
    private readTimeseries(file: string, onData: (item: any, readStream: ReadStream) => void): Promise<void> {
        this.log.info(`Read timeseries file ${file}`);

        return new Promise((resolve) => {
            fs.access(file, (err) => {
                if (err) {
                    this.log.warn(`${file} does not exists`);
                    resolve();
                    return;
                }

                const fileStream: ReadStream = fs.createReadStream(file);
                const stream = fileStream.pipe(StreamArray.withParser());

                stream.on('data', (item) => {
                    onData(item.value, fileStream);
                });

                stream.on('end', () => {
                    fileStream.close();
                    resolve();
                });
            });
        });
    }
}
