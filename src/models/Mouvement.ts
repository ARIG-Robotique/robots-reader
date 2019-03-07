import {
    AutoIncrement,
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
} from "sequelize-typescript";
import {Execs} from "./Execs";
import {EMouvementType} from "../enum/EMouvementType";
import {MouvementData} from "../dto/MouvementData";

@Table
export class Mouvement extends Model<Mouvement> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Execs)
    @Column
    execsId: number;

    @BelongsTo(() => Execs)
    execs: Execs;

    @Column(DataType.ENUM('PATH', 'TRANSLATION'))
    type: EMouvementType;

    @Column
    time: Date;

    @Column({
        type: DataType.JSON
    })
    data: MouvementData;

    @Column
    distance: number;

    @CreatedAt
    creationDate: Date;

    @UpdatedAt
    updatedOn: Date;
}

