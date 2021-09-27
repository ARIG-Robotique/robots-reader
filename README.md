# robots-reader

[![Build Status](https://img.shields.io/github/workflow/status/ARIG-Robotique/robots-reader/CI?logo=github)](https://github.com/ARIG-Robotique/robots-reader/actions)
[![Docker Status](https://img.shields.io/docker/build/arig/robots-reader?logo=docker)](https://hub.docker.com/r/arig/robots-reader/)

Récupération des logs/timeseries/pathfinding et backend pour robots-supervisor

## Pour développer en local :

```bash
$ yarn --production=false
$ yarn start
```
Application disponible sur `http://localhost:4100` (dev).

## Pour construire une image docker local

```bash
$ make build
$ make run
``` 
L'image portera le nom et tag `ghcr.io/arig-robotique/robots-reader:local`.

Un port disponible sera réservé. Il faut controler celui-ci avec `docker ps`.\
Une fois le port déterminé l'application est disponible sur `http://localhost:<mon_port>`
