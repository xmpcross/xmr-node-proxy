"use strict";
const http = require('http');
const moment = require('moment');

const PROXY_VERSION = "MiningPools.Space";

let proxyCB = null;
let proxyData = null;

function getServer(pcb) {
    proxyCB = pcb;
    
    let httpServer = http.createServer((req, res) => {
        if (global.config.httpUser && global.config.httpPass) {
            var auth = req.headers['authorization'];  // auth is in base64(username:password)  so we need to decode the base64
            if (!auth) {
                res.statusCode = 401;
                res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
                res.end('<html><body>Unauthorized XNP access.</body></html>');
                return;
            }
            debug.misc("Authorization Header is: ", auth);
            var tmp = auth.split(' ');
                    var buf = new Buffer(tmp[1], 'base64');
                    var plain_auth = buf.toString();
            debug.misc("Decoded Authorization ", plain_auth);
            var creds = plain_auth.split(':');
            var username = creds[0];
            var password = creds[1];
            if (username !== global.config.httpUser || password !== global.config.httpPass) {
                res.statusCode = 401;
                res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
                res.end('<html><body>Wrong login.</body></html>');
                return;
            }
        }

        if (req.url == "/") {
            proxyData = proxyCB.getData();
            let activeWorkers = proxyData.activeWorkers;
            let activePools = proxyData.activePools;

            let totalWorkers = 0, totalHashrate = 0;
            let poolHashrate = [];
            let tablePool = "";
            let tableBody = "";
            let tablePorts = "";
            for (let workerID in activeWorkers) {
                if (!activeWorkers.hasOwnProperty(workerID)) continue;
                for (let minerID in activeWorkers[workerID]){
                            if (!activeWorkers[workerID].hasOwnProperty(minerID)) continue;
                    let miner = activeWorkers[workerID][minerID];
                    if (typeof(miner) === 'undefined' || !miner) continue;	
                    let name = (miner.identifier && miner.identifier != "x") ? miner.identifier + " (" + miner.ip + ")" : miner.ip;
                    ++ totalWorkers;
                    totalHashrate += miner.avgSpeed;
                    if (!poolHashrate[miner.pool]) poolHashrate[miner.pool] = 0;
                    poolHashrate[miner.pool] += miner.avgSpeed;
                    tableBody += `
                    <tr>
                        <td><TAB TO=t1>${name}</td>
                        <td><TAB TO=t2>${miner.avgSpeed}</td>
                        <td><TAB TO=t3>${miner.diff}</td>
                        <td><TAB TO=t4>${miner.shares}</td>
                        <td><TAB TO=t5>${miner.hashes}</td>
                        <td><TAB TO=t6>${moment.unix(miner.lastShare).fromNow(true)}</td>
                        <td><TAB TO=t7>${moment.unix(miner.lastContact).fromNow(true)}</td>
                        <td><TAB TO=t8>${moment(miner.connectTime).fromNow(true)}</td>
                        <td><TAB TO=t9>${miner.pool}</td>
                        <td><TAB TO=t10>${miner.agent}</td>
                    </tr>
                    `;
                }
            }
            for (let poolName in poolHashrate) {
                let poolPercentage = (100*poolHashrate[poolName]/totalHashrate).toFixed(2);
                let targetDiff = activePools[poolName].activeBlocktemplate ? activePools[poolName].activeBlocktemplate.targetDiff : "?";
                tablePool += `<h2> ${poolName}: ${poolHashrate[poolName]} H/s or ${poolPercentage}% (${targetDiff} diff)</h2>
                `;
            }
            for (let proxyPort of global.config.listeningPorts) {
                tablePorts += `
                <tr>
                    <td><TAB TO=t21>${proxyPort.port}</td>
                    <td><TAB TO=t22>${proxyPort.coin}</td>
                    <td><TAB TO=t23>${proxyPort.diff}</td>
                    <td><TAB TO=t24>${proxyPort.ssl}</td>
                </tr>
                `;
            }
            res.writeHead(200, {'Content-type':'text/html'});
            res.write(`
    <html lang="en"><head>
    <title>XNP ${PROXY_VERSION} Hashrate Monitor</title>
    <meta charset="utf-8">
    <meta http-equiv="refresh" content="15">
    <style>
      html, body {
        font-family: 'Saira Semi Condensed', sans-serif;
        font-size: 14px;
        text-align: center;
      }

      .sorted-table {
        margin: auto;
        width: 60%;
        text-align: center;
      }

      .sorted-table td, .sorted-table th {
        border-bottom: 1px solid #d9d9d9;
      }

      .hover {
        background-color: #eeeeee;
        cursor: pointer;
      }
    </style>
    </head><body>
    <h1>XNP ${PROXY_VERSION} Hashrate Monitor</h1>
    <h2>Workers: ${totalWorkers}, Hashrate: ${totalHashrate}</h2>
    ${tablePool}
    <table id="tblMiners" class="sorted-table">
        <thead>
            <th><TAB INDENT=0  ID=t1>Name</th>
            <th><TAB INDENT=60 ID=t2>Hashrate</th>
            <th><TAB INDENT=80 ID=t3>Difficulty</th>
            <th><TAB INDENT=100 ID=t4>Shares</th>
            <th><TAB INDENT=120 ID=t5>Hashes</th>
            <th><TAB INDENT=140 ID=t6>Share Ago</th>
            <th><TAB INDENT=180 ID=t7>Ping Ago</th>
            <th><TAB INDENT=220 ID=t8>Connected Ago</th>
            <th><TAB INDENT=260 ID=t9>Pool</th>
            <th><TAB INDENT=320 ID=t10>Agent</th>
        </thead>
        <tbody>
            ${tableBody}
        </tbody>
    </table>
    <h2>Listening Ports</h2>
    <table id="tblPorts" class="sorted-table">
        <thead>
            <th><TAB INDENT=0  ID=t21>Port</th>
            <th><TAB INDENT=60 ID=t22>Algo</th>
            <th><TAB INDENT=80 ID=t23>Difficulty</th>
            <th><TAB INDENT=100 ID=t24>SSL</th>
        </thead>
        <tbody>
            ${tablePorts}
        </tbody>
    </table>
    <script src='https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.3/jquery.min.js'></script>
    <script>
        $('table.sorted-table thead th').on("mouseover", function() {
          var el = $(this),
          p = el.parents('table').attr('id'),
          pos = el.index();
          el.addClass("hover");
          $('#' + p + ' > tbody > tr > td').filter(":nth-child(" + (pos+1) + ")").addClass("hover");
        }).on("mouseout", function() {
          $("td, th").removeClass("hover");
        });

        var thIndex = 0, thInc = 1, curThIndex = null;

        $(function() {
          $('table.sorted-table thead th').click(function() {
            thIndex = $(this).index();
            var p = $(this).parents('table').attr('id');
            sorting = [];
            tbodyHtml = null;
            $('#' + p + ' > tbody > tr').each(function() {
              var str = $(this).children('td').eq(thIndex).html();
              var re1 = /^<.+>(\\d+)<\\/.+>$/;
              var m;
              if (m = re1.exec(str)) {
                var pad = "000000000000";
                str = (pad + Number(m[1])).slice(-pad.length);
              }
              sorting.push(str + ', ' + $(this).index());
            });

            if (thIndex != curThIndex || thInc == 1) {
              sorting = sorting.sort();
            } else {
              sorting = sorting.sort(function(a, b){return b.localeCompare(a)});
            }

            if (thIndex == curThIndex) {
              thInc = 1 - thInc;
            } else {
              thInc = 0;
            }
            
            curThIndex = thIndex;
            sortIt(p);
          });
        })

        function sortIt(p) {
          for (var sortingIndex = 0; sortingIndex < sorting.length; sortingIndex++) {
            rowId = parseInt(sorting[sortingIndex].split(', ')[1]);
            tbodyHtml = tbodyHtml + $('#' + p + ' > tbody > tr').eq(rowId)[0].outerHTML;
          }
          $('#' + p + ' > tbody').html(tbodyHtml);
        }
    </script>
    </body></html>
    `);
            res.end();
        } else if(req.url.substring(0, 5) == "/json") {
            res.writeHead(200, {'Content-type':'application/json'});
            res.write(JSON.stringify(activeWorkers) + "\r\n");
            res.end();
        } else {
            res.writeHead(404);
            res.end();
        }
    }).listen(global.config.httpPort || "8181", global.config.httpAddress || "localhost");
    return httpServer;
}

module.exports = function () {
    return {
        getServer: getServer,
    };
};
