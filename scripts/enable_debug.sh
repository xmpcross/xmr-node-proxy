#!/bin/bash

DEBUG_COLORS=true DEBUG=*,-axm:*,-require-in-the-middle pm2 restart all -a
