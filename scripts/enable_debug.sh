#!/bin/bash

DEBUG_COLORS=true DEBUG=*,-axm:profiling pm2 restart all -a
