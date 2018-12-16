import * as Sequelize from 'sequelize';
import { SequelizeAttributes } from 'typings/SequelizeAttributes';


export interface RobotModelAttributes {
    id?: number;
    host: string;
    name: string;
}

export interface RobotModelInstance extends Sequelize.Instance<RobotModelAttributes>, RobotModelAttributes{
}

export const RobotModelFactory = (sequelize: Sequelize.Sequelize, dataTypes: Sequelize.DataTypes): Sequelize.Model<RobotModelInstance, RobotModelAttributes> => {

};

