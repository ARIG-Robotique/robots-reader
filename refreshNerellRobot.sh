#!/bin/bash
watch -d 'node index.js save 1 $(node index.js execs 1 | tail -1)'
