import {
    AutoIncrement,
    BelongsTo,
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

    @BelongsTo(() => Robot)
    robot: Robot;

    @Column
    dateStart: Date;

    @Column
    dateEnd: Date;

    @Unique
    @Column
    numberExec: string;

    @CreatedAt
    creationDate: Date;

    @UpdatedAt
    updatedOn: Date;
}
