#!/bin/bash
set -e

yarn install
yarn build
docker build -t ultimate-food-manager/database-service .
