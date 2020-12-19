#!/bin/bash
set -e

yarn install
yarn lintFixAll
yarn build
docker build -t ultimate-food-manager/database-service .
