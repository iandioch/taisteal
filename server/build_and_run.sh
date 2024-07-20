#! /usr/bin/bash

pwd
docker run --rm -p 127.0.0.1:1916:1916 -it $(docker build -q .)
