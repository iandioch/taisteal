#! /usr/bin/bash

pwd
docker run --mount type=volume,src=taisteal-data,dst=/app -p 127.0.0.1:1916:1916 -it $(docker build -q .)
