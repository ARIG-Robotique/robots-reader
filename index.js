'use strict';

const program = require('commander');
require('colors');

const Reader = require('./Reader.js');
const pkg = require('./package.json');

function wrap(cb) {
    Reader.init()
        .then(cb)
        .catch((err) => {
            console.error(err);
        });
}

program
    .version(pkg.version);

program
    .command('robots')
    .description('Liste les robots disponibles')
    .action(() => {
        console.log('Robots disponibles :'.green.bold);

        wrap(() => {
            return Reader.listRobots()
                .then((robots) => {
                    robots.forEach((robot) => {
                        console.log(`    ${robot.id}`.red + `: ${robot.host || ''}${robot.dir || ''}`);
                    });
                });
        });
    });

program
    .command('execs <robot>')
    .description('Liste les executions disponibles sur un robot')
    .action((robot) => {
        console.log(('Executions disponibles pour ' + robot.red + ' :').green.bold);

        wrap(() => {
            return Reader.getRobot(robot)
                .then((robot) => {
                    return Reader.listExec(robot);
                })
                .then((execs) => {
                    execs.forEach((exec) => {
                        console.log(`    ${exec}`.blue);
                    });
                });
        });
    });

program
    .command('save <robot> <exec>')
    .description('Sauvegarde une execution en base')
    .action((robot, exec) => {
        console.log(('Sauvegarde l\'execution ' + exec.blue + ' du robot '.green + robot.red).green.bold);

        wrap(() => {
            return Reader.getRobot(robot)
                .then((robot) => {
                    return Reader.saveExec(robot, exec);
                });
        });
    });

program.parse(process.argv);