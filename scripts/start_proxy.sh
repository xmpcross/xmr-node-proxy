#!/bin/bash

SCRIPT_DIR=$(`command -v dirname` $0);
POOL_ROOT_DIR=$(`command -v dirname` $(`command -v realpath` $SCRIPT_DIR))
if [ -f $SCRIPT_DIR/proxy.js ]; then
    PROXY_JS=$(`command -v realpath` $SCRIPT_DIR/proxy.js);
elif [ -f $POOL_ROOT_DIR/proxy.js ]; then
    PROXY_JS=$(`command -v realpath` $POOL_ROOT_DIR/proxy.js);
else
    echo -e "\nERROR: Cannot find proxy.js\n";
    exit;
fi

DEBUG_COLORS=true DEBUG=*,-axm:profiling,-miners,-pool,-misc pm2 start $PROXY_JS --name=proxy -a
