#!/bin/bash
node web-svr.js &
webSvr=$!
node --debug game-svr.js --port=3000 --name=Test\ Game01\(debug\) TurtlePark &
gameSvr[0]=$! 
node game-svr.js --port=3001 --name=Test\ Game02 TurtlePark &
gameSvr[1]=$!
node game-svr.js --port=3002 --name=Test\ Game03 TurtlePark &
gameSvr[2]=$!
node game-svr.js --port=3003 --name=Test\ Game04 TurtlePark &
gameSvr[3]=$!

node-inspector

nodeDebug=$!

for i in "${gameSvr[@]}"
    do
        kill $i
    done

kill $webSvr

kill $nodeDebug

