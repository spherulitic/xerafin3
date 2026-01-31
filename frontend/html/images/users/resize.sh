#!/bin/bash

convert $1 -resize 128x128 -background black -gravity center -extent 128x128 $1
