#!/bin/sh

ROBOT_HOST=$1
ROBOT_NAME=$2
LOG_DIR=$3

echo "Création répertoire de stockage des logs du robot"
mkdir -p $LOG_DIR

echo "Récupération logs ..."
scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -rv pi@$ROBOT_HOST:/home/pi/$ROBOT_NAME/logs/* $LOG_DIR 2>&1

if [[ $? != 0 ]]; then
  echo "Pas de log a copier"
  exit 0
fi

echo "Suppression des logs du robot ..."
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null pi@$ROBOT_HOST sudo rm -Rvf /home/pi/$ROBOT_NAME/logs/* 2>&1

if [[ $? != 0 ]]; then
  exit 1
fi
