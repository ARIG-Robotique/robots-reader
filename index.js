'use strict';

const program = require('commander');
require('colors');

const RobotsReader = require('./RobotsReader.js');
const pkg = require('./package.json');

program
    .version(pkg.version);

program
    .command('robots')
    .description('Liste les robots disponibles')
    .action(() => {
        console.log('Robots disponibles :'.green.bold);

        RobotsReader.listRobots()
            .then((robots) => {
                robots.forEach((robot) => {
                    console.log(` * ` + `${robot.name}`.blue + ` :`);
                    console.log(`    -> Id        : ` + `${robot.id}`.red);
                    console.log(`    -> Host      : ` + `${robot.host || 'empty'}`.red);
                    console.log(`    -> Directory : ` + `${robot.dir || 'empty'}`.red);
                });

                process.exit(0);
            })
            .catch((err) => {
                console.error(err);
                process.exit(1);
            });
    });

program
    .command('execs <robot>')
    .description('Liste les executions disponibles sur un robot')
    .action((robot) => {
        console.log(('Executions disponibles pour ' + robot.red + ' :').green.bold);

        RobotsReader.listRemoteExecs(robot)
            .then((execs) => {
                execs.forEach((exec) => {
                    console.log(`    ${exec}`.blue);
                });

                process.exit(0);
            })
            .catch((err) => {
                console.error(err);
                process.exit(1);
            });
    });

program
    .command('save <robot> <exec>')
    .description('Sauvegarde une execution en base')
    .action((robot, exec) => {
        console.log(('Sauvegarde l\'execution ' + exec.blue + ' du robot '.green + robot.red).green.bold);

        RobotsReader.saveExec(robot, exec)
            .then(() => {
                process.exit(0);
            })
            .catch((err) => {
                console.error(err);
                process.exit(1);
            });
    });

program.parse(process.argv);
