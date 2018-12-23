import {AutoIncrement, Column, CreatedAt, Model, PrimaryKey, Table, UpdatedAt} from 'sequelize-typescript';

@Table
export class Robot extends Model<Robot> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;
    @Column
    host: string;
    @Column
    name: string;
    @CreatedAt
    creationDate: Date;
    @UpdatedAt
    updatedOn: Date;
}

