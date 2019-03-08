import {AutoIncrement, Column, DataType, ForeignKey, Model, PrimaryKey, Table} from "sequelize-typescript";
import {Execs} from "./Execs";

@Table
export class Log extends Model<Log> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Execs)
    @Column
    idExecs: number;

    @Column
    date: Date;

    @Column
    level: string;

    @Column
    thread: string;

    @Column
    clazz: string;

    @Column({
        type: DataType.TEXT
    })
    message: string;

    @Column
    idExec: string;
}
