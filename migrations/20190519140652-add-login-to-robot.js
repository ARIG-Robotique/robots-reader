'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        /*
          Add altering commands here.
          Return a promise to correctly handle asynchronicity.

          Example:
          return queryInterface.createTable('users', { id: Sequelize.INTEGER });
        */
        return Promise.all([
            queryInterface.addColumn('Robot', 'login', Sequelize.STRING),
            queryInterface.addColumn('Robot', 'pwd', Sequelize.STRING)
        ]);

    },

    down: (queryInterface, Sequelize) => {
        /*
          Add reverting commands here.
          Return a promise to correctly handle asynchronicity.

          Example:
          return queryInterface.dropTable('users');
        */

        return Promise.all([
            queryInterface.removeColumn('Robot', 'login'),
            queryInterface.removeColumn('Robot', 'pwd')
        ]);
    }
};
