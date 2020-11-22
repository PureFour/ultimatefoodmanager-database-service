#!/bin/bash
set -e

readonly FOXX_ZIP_PATH=database-service.zip
readonly FOXX_MOUNT_NAME=database-service
readonly FOXX_DBNAME_NAME=database-service
readonly DATABASE_NAME=default-database
readonly REQUEST_TIMEOUT=900 #15min
readonly FOXX_MOUNT_PATH=/$FOXX_MOUNT_NAME

if /usr/bin/arangosh --server.endpoint tcp://127.0.0.1:8529 --server.database=$DATABASE_NAME --server.password $ARANGO_ROOT_PASSWORD --server.request-timeout $REQUEST_TIMEOUT ; then
    echo "--> Database is already created, skipping initialization"
else
    echo "--> initialize database and update root user"
    echo "db._createDatabase(\""$DATABASE_NAME"\"); db._useDatabase(\""$DATABASE_NAME"\"); require(\"org/arangodb/users\").replace(\"root\", \"$ARANGO_ROOT_PASSWORD\")" | /usr/bin/arangosh --server.endpoint tcp://127.0.0.1:8529 --server.password "" --server.request-timeout $REQUEST_TIMEOUT
fi

echo $ARANGO_ROOT_PASSWORD > password-file

if foxx list --database $DATABASE_NAME --password-file password-file | grep --quiet $FOXX_MOUNT_PATH ;
then
    echo "--> Updating foxx service"
    foxx upgrade $FOXX_MOUNT_PATH $FOXX_ZIP_PATH --database $DATABASE_NAME --password-file password-file
else
    echo "--> installing foxx service"
    foxx install $FOXX_MOUNT_PATH $FOXX_ZIP_PATH --database $DATABASE_NAME --password-file password-file
fi

rm password-file