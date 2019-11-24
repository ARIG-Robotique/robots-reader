import {AutoIncrement, Column, CreatedAt, DataType, ForeignKey, Model, PrimaryKey, Table, UpdatedAt} from 'sequelize-typescript';
import {Exec} from './Exec';
import {EMouvementType} from '../enum/EMouvementType';
import {MouvementData} from '../dto/MouvementData';

@Table
export class Mouvement extends Model<Mouvement> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Exec)
    @Column
    idExec: string;

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

    static fromData(item: any, idExec: string): Mouvement {
        const mouvement = new Mouvement();
        mouvement.idExec = idExec;
        mouvement.type = item.type;
        mouvement.distance = item.distance;
        mouvement.time = new Date(item.time);
        mouvement.data = new MouvementData();

        if (item.type === 'PATH') {
            mouvement.data.path = JSON.parse(JSON.stringify(item.path));
        } else {
            mouvement.data.fromPoint = JSON.parse(JSON.stringify(item.fromPoint));
            mouvement.data.toPoint = JSON.parse(JSON.stringify(item.toPoint));
        }

        return mouvement;
    }
}

