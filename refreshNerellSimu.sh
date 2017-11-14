#!/bin/bash
watch -d 'node index.js save 2 $(node index.js execs 2 | tail -1)'
