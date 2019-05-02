import {ReadStream} from "fs";

const Promise = require('promise');
const path = require('path');
const fs = require('fs');
const StreamArray = require('stream-json/utils/StreamArray');

export class ReadTimeSeriesService {
    /**
     * Lecture d'un fichier timeseries en stream
     * @param {object} robot
     * @param {string} exec
     * @param {function} onData appelé pour chaque objet du fichier
     * @returns {Promise}
     */
    readTimeseries(dir: string, url: string, onData: (item: any, stream: ReadStream) => void): Promise<any> {
        return new Promise((resolve) => {
            const timeseriesPath = path.join(dir, url);

            fs.access(timeseriesPath, (err) => {
                if (err) {
                    console.log(`${timeseriesPath} does not exists`);
                    resolve();
                }

                const stream = StreamArray.make();
                const fileStream = fs.createReadStream(timeseriesPath);

                stream.output.on('data', (item) => {
                    onData(item.value, fileStream);
                });

                stream.output.on('end', () => resolve());

                fileStream.pipe(stream.input);
            });
        });
    }

    /**
     *
     * @param dir
     * @param exec
     * @param onData
     */
    readMouvementSeriesBatch(dir, exec, onData): Promise<any> {
        const url = `${exec}-mouvement.json`;
        return this.readSeriesFile(dir, url, onData);
    }

    /**
     * Lecture d'un fichier timeseries en batch de 100 objets
     * @param {object} robot
     * @param {string} exec
     * @param {function} onData appelé pour chaque groupe de 100 objets du fichier
     * @returns {Promise}
     */
    readTimeseriesBatch(dir: string, exec: string, onData: (items: any[]) => Promise<any>) {
        const url = `${exec}-timeseries.json`;
        return this.readSeriesFile(dir, url, onData);
    }

    readSeriesFile(dir: string, url: string, onData: (items: any[]) => Promise<any>): Promise<any> {
        let items = [];
        return this.readTimeseries(dir, url, (item, stream) => {
            items.push(item);

            if (items.length >= 100) {
                stream && stream.pause();

                onData(items.slice(0))
                    .then(() => {
                        stream && stream.resume();
                    }, (err) => {
                        stream.destroy();
                        return Promise.reject(err);
                    });

                items.length = 0;
            }
        })
            .then(() => {
                return onData(items);
            });
    }
}
