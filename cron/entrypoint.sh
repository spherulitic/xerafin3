#!/bin/bash

declare -p > /container.env

cron -f
