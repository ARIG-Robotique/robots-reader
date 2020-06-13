import {AutoIncrement, Column, CreatedAt, Model, PrimaryKey, Table, Unique, UpdatedAt} from 'sequelize-typescript';

@Table
export class Robot extends Model<Robot> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @Unique
    @Column
    host: string;

    @Column
    name: string;

    @Column
    simulateur: boolean;

    @Column
    login: string;

    @Column
    pwd: string;

    @CreatedAt
    creationDate: Date;

    @UpdatedAt
    updatedOn: Date;
}

