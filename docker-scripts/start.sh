#!/bin/bash
set -e

readonly DATABASE_DIRECTORY_PATH=/var/lib/foxxdb
readonly VERSION_FILE_PATH="$DATABASE_DIRECTORY_PATH/VERSION-1"

get_new_version () {
    newVersion=$(arangod --version | head -n 1)
    index=0
    result=""
    export IFS="."

    for versionPart in $newVersion; do
        if [[ $index -eq 0 ]]; then
           result="$result$versionPart"
       else
           result="$result$(printf %02d "$versionPart")"
        fi
        index=$((index + 1))
    done

    return $result
}

get_current_version () {
    if test -f "$VERSION_FILE_PATH"; then
        return $(jq ".version" "$VERSION_FILE_PATH")
    fi
    return $(get_new_version)
}

if [[ $(get_new_version) -ne $(get_current_version) ]]; then
    arangod --database.directory $DATABASE_DIRECTORY_PATH --database.required-directory-state existing --database.auto-upgrade true
fi

../entrypoint.sh arangod --database.directory $DATABASE_DIRECTORY_PATH --database.required-directory-state existing --server.jwt-secret secret &

echo "--> start.sh processing start"

dockerize -timeout 15m -wait http://127.0.0.1:8529 sh scripts/foxx.sh

wait
