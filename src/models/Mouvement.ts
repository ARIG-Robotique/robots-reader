import { AutoIncrement, Column, CreatedAt, DataType, ForeignKey, Model, PrimaryKey, Table, UpdatedAt } from 'sequelize-typescript';
import { MouvementData } from '../dto/MouvementData';
import { EMouvementType } from '../enum/EMouvementType';
import { Exec } from './Exec';

@Table
export class Mouvement extends Model<Mouvement> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Exec)
    @Column
    idExec: string;

    @Column(DataType.ENUM('PATH', 'TRANSLATION', 'ROTATION'))
    type: EMouvementType;

    @Column
    time: Date;

    @Column(DataType.JSON)
    data: MouvementData;

    @CreatedAt
    creationDate: Date;

    @UpdatedAt
    updatedOn: Date;

    static fromData(item: any, idExec: string): Mouvement {
        const mouvement = new Mouvement();
        mouvement.idExec = idExec;
        mouvement.type = item.type;
        mouvement.time = new Date(item.time);
        mouvement.data = {};

        if (item.type === 'PATH') {
            mouvement.data.path = item.path;
        } else if (item.type === 'TRANSLATION') {
            mouvement.data.distance = item.distance;
            mouvement.data.fromPoint = item.fromPoint;
            mouvement.data.toPoint = item.toPoint;
        } else if (item.type === 'ROTATION') {
            mouvement.data.angle = item.angle;
            mouvement.data.fromAngle = item.fromAngle;
            mouvement.data.toAngle = item.toAngle;
        }

        return mouvement;
    }
}

