#!/bin/sh

ROBOT_HOST=$1
ROBOT_NAME=$2
LOGIN=$4
PWD=$5
LOG_DIR=$3/$ROBOT_NAME

echo "Création répertoire de stockage des logs du robot"
mkdir -p $LOG_DIR

echo "Récupération logs ..."

sshpass -p $PWD scp -rv $LOGIN@$ROBOT_HOST:/home/pi/$ROBOT_NAME/logs/* $LOG_DIR

echo "Suppression des logs du robots ..."
sshpass -p $PWD ssh $LOGIN@$ROBOT_HOST sudo rm -Rvf /home/pi/$1/logs/*
