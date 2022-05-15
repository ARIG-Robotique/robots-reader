import {Column, CreatedAt, ForeignKey, Model, PrimaryKey, Table, UpdatedAt} from 'sequelize-typescript';
import {Robot} from './Robot';

@Table
export class Exec extends Model<Exec> {
    @PrimaryKey
    @Column
    id: string;

    @ForeignKey(() => Robot)
    @Column
    idRobot: number;

    @Column
    dateStart: Date;

    @Column
    dateEnd: Date;

    @CreatedAt
    creationDate: Date;

    @UpdatedAt
    updatedOn: Date;

    public static execFile(robotDir: string, idExec: Exec['id']) {
        return `${robotDir}/${idExec}.exec`;
    }

    public static pathDirectory(robotDir: string, idExec: Exec['id']) {
        return `${robotDir}/path/${idExec}`;
    }

    public static mouvementsFile(robotDir: string, idExec: Exec['id']) {
        return `${robotDir}/${idExec}-mouvement.json`;
    }

    public static timeseriesFile(robotDir: string, idExec: Exec['id']) {
        return `${robotDir}/${idExec}-timeseries.json`;
    }

    public static tracesFile(robotDir: string, idExec: Exec['id']) {
        return `${robotDir}/${idExec}-traces.log`;
    }
}
