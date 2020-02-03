#!/bin/sh

ROBOT_HOST=$1
ROBOT_NAME=$2
LOGIN=$4
PWD=$5
LOG_DIR=$3

echo "Création répertoire de stockage des logs du robot"
mkdir -p $LOG_DIR

echo "Récupération logs ..."
#rsync -ratlz --rsh="/usr/bin/sshpass -p $PWD ssh -o StrictHostKeyChecking=no -l $LOGIN" $LOGIN@$ROBOT_HOST:/home/pi/$ROBOT_NAME/logs/*  $LOG_DIR
sshpass -p $PWD scp -rv $LOGIN@$ROBOT_HOST:/home/pi/$ROBOT_NAME/logs/* $LOG_DIR 2>&1

if [[ $? != 0 ]]; then
  exit 1
fi

echo "Suppression des logs du robots ..."
sshpass -p $PWD ssh $LOGIN@$ROBOT_HOST sudo rm -Rvf /home/pi/$ROBOT_NAME/logs/* 2>&1

if [[ $? != 0 ]]; then
  exit 1
fi
