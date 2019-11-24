import {AutoIncrement, Column, DataType, ForeignKey, Model, PrimaryKey, Table} from "sequelize-typescript";
import {Exec} from "./Exec";
import {LogDTO} from '../dto/LogDTO';

@Table
export class Log extends Model<Log> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Exec)
    @Column
    idExec: string;

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

    static fromData(item: LogDTO, idExec: string): Log {
        const log = new Log();
        log.clazz = item.clazz;
        log.date = item.date;
        log.level = item.level;
        log.thread = item.thread;
        log.message = item.message;
        log.idExec = idExec;
        return log;
    }
}
