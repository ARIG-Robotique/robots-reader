import fs, {ReadStream} from 'fs';
import {Inject, Singleton} from 'typescript-ioc';
import {Logger} from './Logger';
import path from 'path';

const StreamArray = require('stream-json/streamers/StreamArray');

@Singleton
export class ReadTimeSeriesService {

    @Inject
    private log: Logger;

    /**
     * Lit un fichier *-mouvement.json en batch de 100 lignes.
     */
    readMouvementSeriesBatch(dir: string, idExec: string, onData: (items: any[]) => Promise<unknown>): Promise<void> {
        const url = `${idExec}-mouvement.json`;
        return this.readSeriesFile(dir, url, onData);
    }

    /**
     * Lire le fichier *-timeseries.json en batch de 100 lignes.
     */
    readTimeseriesBatch(dir: string, idExec: string, onData: (items: any[]) => Promise<unknown>): Promise<void> {
        const url = `${idExec}-timeseries.json`;
        return this.readSeriesFile(dir, url, onData);
    }

    private readSeriesFile(dir: string, url: string, onData: (items: any[]) => Promise<unknown>): Promise<void> {
        let items = [];
        return this.readTimeseries(dir, url, (item: any, stream: ReadStream) => {
            items.push(item);

            if (items.length >= 100) {
                stream.pause();

                onData(items.slice(0))
                    .then(() => {
                        stream.resume();
                    }, (err: Error) => {
                        items.length = 0;
                        stream.destroy();
                        this.log.error(`Error while processing file ${dir} ${url} with error : ${err.stack}`);
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
    private readTimeseries(dir: string, url: string, onData: (item: any, readStream: ReadStream) => void): Promise<void> {
        const timeseriesPath = path.join(dir, url);

        this.log.info(`Read timeseries file ${timeseriesPath}`);

        return new Promise((resolve) => {
            fs.access(timeseriesPath, (err) => {
                if (err) {
                    this.log.warn(`${timeseriesPath} does not exists`);
                    resolve();
                    return;
                }

                const fileStream: ReadStream = fs.createReadStream(timeseriesPath);
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
