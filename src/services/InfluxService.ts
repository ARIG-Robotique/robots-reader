const Promise = require('promise');
const path = require('path');
const fs = require('fs');
const StreamArray = require('stream-json/utils/StreamArray');

export class InfluxService {
    /**
     * Lecture d'un fichier timeseries en stream
     * @param {object} robot
     * @param {string} exec
     * @param {function} onData appelé pour chaque objet du fichier
     * @returns {Promise}
     */
    readTimeseries(dir, exec, onData) {
        return new Promise((resolve) => {
            const timeseriesPath = path.join(dir, `${exec}-timeseries.json`);
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
     * Lecture d'un fichier timeseries en batch de 100 objets
     * @param {object} robot
     * @param {string} exec
     * @param {function} onData appelé pour chaque groupe de 100 objets du fichier
     * @returns {Promise}
     */
    readTimeseriesBatch(dir, exec, onData) {
        let items = [];

        return new Promise((resolve, reject) => {
            this.readTimeseries(dir, exec, (item, stream) => {
                items.push(item);

                if (items.length >= 100) {
                    onData(items.slice(0), stream);
                    items.length = 0;
                }
            })
                .then(() => {
                    if (items.length > 0) {
                        onData(items);
                        resolve();
                    }
                }, error => reject(error));
        });
    }
}
