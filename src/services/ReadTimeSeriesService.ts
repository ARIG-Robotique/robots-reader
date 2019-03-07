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
    readTimeseries(dir, url, onData) {
        return new Promise((resolve) => {
            const timeseriesPath = path.join(dir, url);
            const stream = StreamArray.make();
            const fileStream = fs.createReadStream(timeseriesPath);

            stream.output.on('data', (item) => {
                onData(item.value, fileStream);
            });

            stream.output.on('end', () => resolve());

            fileStream.pipe(stream.input);
        });
    }

    /**
     *
     * @param dir
     * @param exec
     * @param onData
     */
    readMouvementSeriesBatch(dir, exec, onData) {
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
    readTimeseriesBatch(dir, exec, onData) {
        const url = `${exec}-timeseries.json`;
        return this.readSeriesFile(dir, url, onData);
    }

    readSeriesFile(dir, url, onData) {
        let items = [];
        return new Promise((resolve, reject) => {
            this.readTimeseries(dir, url, (item, stream) => {
                items.push(item);

                if (items.length >= 100) {
                    onData(items.slice(0), stream);
                    items.length = 0;
                }
            })
                .then(() => {
                    if (items.length > 0) {
                        onData(items);
                    }
                    resolve();
                }, error => reject(error));
        });
    }
}
