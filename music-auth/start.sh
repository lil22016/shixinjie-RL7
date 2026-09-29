#!/bin/sh
set -eu
ncm-server &
exec node /app/server.mjs
