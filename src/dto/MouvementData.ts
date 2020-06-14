import { Position } from './Position';

export interface MouvementData {
    path?: Position[];
    distance?: number;
    fromPoint?: Position;
    toPoint?: Position;
    angle?: number;
    fromAngle?: number;
    toAngle?: number;
}
