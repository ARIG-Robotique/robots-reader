import {
    AutoIncrement,
    Column,
    CreatedAt,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    Unique,
    UpdatedAt
} from "sequelize-typescript";
import {Robot} from "./Robot";
import {ExecStateEnum} from "../enum/ExecState.enum";

@Table
export class Execs extends Model<Execs> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Robot)
    @Column
    robotId: number;

    @Column
    dateStart: Date;

    @Column
    dateEnd: Date;

    @Column
    state: ExecStateEnum;

    @CreatedAt
    creationDate: Date;

    @UpdatedAt
    updatedOn: Date;
}
