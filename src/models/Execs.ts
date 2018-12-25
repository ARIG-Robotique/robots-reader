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

    @CreatedAt
    creationDate: Date;

    @UpdatedAt
    updatedOn: Date;
}
