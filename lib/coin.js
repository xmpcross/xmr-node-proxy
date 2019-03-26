"use strict";
const multiHashing = require('cryptonight-hashing');
const cnUtil = require('cryptoforknote-util');
const bignum = require('bignum');
const support = require('./support.js')();
const crypto = require('crypto');

let debug = global.debug;

let baseDiff = bignum('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 16);

Buffer.prototype.toByteArray = function () {
    return Array.prototype.slice.call(this, 0);
};

function blockHeightCheck(nodeList, callback) {
    let randomNode = nodeList[Math.floor(Math.random() * nodeList.length)].split(':');

}

function getRemoteNodes() {
    let knownNodes = [
    ]; // Prefill the array with known good nodes for now.  Eventually will try to download them via DNS or http.
}

function parse_blob_type(blob_type_str) {
    if (typeof(blob_type_str) === 'undefined') return 0;
    switch (blob_type_str) {
        case 'cryptonote':  return 0; // Monero
        case 'forknote1':   return 1;
        case 'forknote2':
        case 'forknote' :   return 2; // Almost all Forknote coins
        case 'cryptonote2': return 3; // Masari
        case 'cryptonote_ryo':  return 4; // Ryo
        case 'cryptonote_loki': return 5; // Loki
    }
    return 0;
}

function BlockTemplate(template) {
    /*
     We receive something identical to the result portions of the monero GBT call.
     Functionally, this could act as a very light-weight solo pool, so we'll prep it as one.
     You know.  Just in case amirite?
     */
    this.id = template.id;
    this.blob = template.blocktemplate_blob;
    this.blob_type = template.blob_type;
    this.variant = template.variant;
    this.coin = template.coin;
    this.difficulty = template.difficulty;
    this.height = template.height;
    this.reservedOffset = template.reserved_offset;
    this.workerOffset = template.worker_offset; // clientNonceLocation
    this.targetDiff = template.target_diff;
    this.targetHex = template.target_diff_hex;
    this.buffer = Buffer.from(this.blob, 'hex');
    this.previousHash = Buffer.alloc(32);
    this.workerNonce = 0;
    this.solo = false;
    if (typeof(this.workerOffset) === 'undefined') {
        this.solo = true;
        global.instanceId.copy(this.buffer, this.reservedOffset + 4, 0, 3);
        this.buffer.copy(this.previousHash, 0, 7, 39);
    }
    this.nextBlob = function () {
        if (this.solo) {
            // This is running in solo mode.
            this.buffer.writeUInt32BE(++this.workerNonce, this.reservedOffset);
        } else {
            this.buffer.writeUInt32BE(++this.workerNonce, this.workerOffset);
        }
        return cnUtil.convert_blob(this.buffer, this.blob_type).toString('hex');
    };
}

function MasterBlockTemplate(template) {
    /*
     We receive something identical to the result portions of the monero GBT call.
     Functionally, this could act as a very light-weight solo pool, so we'll prep it as one.
     You know.  Just in case amirite?
     */
    this.blob = template.blocktemplate_blob;
    this.blob_type = parse_blob_type(template.blob_type);
    this.variant = template.variant;
    this.coin = template.coin;
    this.difficulty = template.difficulty;
    this.height = template.height;
    this.reservedOffset = template.reserved_offset;  // reserveOffset
    this.workerOffset = template.client_nonce_offset; // clientNonceLocation
    this.poolOffset = template.client_pool_offset; // clientPoolLocation
    this.targetDiff = template.target_diff;
    this.targetHex = template.target_diff_hex;
    this.buffer = Buffer.from(this.blob, 'hex');
    this.previousHash = Buffer.alloc(32);
    this.job_id = template.job_id;
    this.workerNonce = 0;
    this.poolNonce = 0;
    this.solo = false;
    if (typeof(this.workerOffset) === 'undefined') {
        this.solo = true;
        global.instanceId.copy(this.buffer, this.reservedOffset + 4, 0, 3);
        this.buffer.copy(this.previousHash, 0, 7, 39);
    }
    this.blobForWorker = function () {
        this.buffer.writeUInt32BE(++this.poolNonce, this.poolOffset);
        return this.buffer.toString('hex');
    };
}

function getJob(miner, activeBlockTemplate, bashCache) {
    if (miner.validJobs.size() >0 && miner.validJobs.get(0).templateID === activeBlockTemplate.id && !miner.newDiff && miner.cachedJob !== null && typeof bashCache === 'undefined') {
        return miner.cachedJob;
    }

    let blob = activeBlockTemplate.nextBlob();
    let target = getTargetHex(miner);
    miner.lastBlockHeight = activeBlockTemplate.height;

    let newJob = {
        id: crypto.pseudoRandomBytes(21).toString('base64'),
        extraNonce: activeBlockTemplate.workerNonce,
        height: activeBlockTemplate.height,
        difficulty: miner.difficulty,
        diffHex: miner.diffHex,
        submissions: [],
        templateID: activeBlockTemplate.id
    };

    miner.validJobs.enq(newJob);

    miner.cachedJob = {
        blob: blob,
        job_id: newJob.id,
        target: target,
        id: miner.id
    };
    if (typeof (activeBlockTemplate.variant) !== 'undefined') {
        miner.cachedJob.variant = activeBlockTemplate.variant;
    }
    if (typeof (activeBlockTemplate.algo) !== 'undefined') {
        miner.cachedJob.algo = activeBlockTemplate.algo;
    }	
    if (typeof (activeBlockTemplate.extensions) !== 'undefined') {
        miner.cachedJob.extensions = activeBlockTemplate.extensions.slice();
    }
    if (typeof miner.coinSettings.includeHeight !== 'undefined' && miner.coinSettings.includeHeight) {
        miner.cachedJob.height = activeBlockTemplate.height;
    }
    return miner.cachedJob;
}

function getMasterJob(pool, workerID) {
    let activeBlockTemplate = pool.activeBlocktemplate;
    let btBlob = activeBlockTemplate.blobForWorker();
    let workerData = {
        id: crypto.pseudoRandomBytes(21).toString('base64'),
        blocktemplate_blob: btBlob,
        blob_type: activeBlockTemplate.blob_type,
        variant: activeBlockTemplate.variant,
        coin: activeBlockTemplate.coin,
        difficulty: activeBlockTemplate.difficulty,
        height: activeBlockTemplate.height,
        reserved_offset: activeBlockTemplate.reservedOffset,
        worker_offset: activeBlockTemplate.workerOffset,
        target_diff: activeBlockTemplate.targetDiff,
        target_diff_hex: activeBlockTemplate.targetHex
    };
    let localData = {
        id: workerData.id,
        masterJobID: activeBlockTemplate.job_id,
        poolNonce: activeBlockTemplate.poolNonce
    };
    if (!(workerID in pool.poolJobs)) {
        pool.poolJobs[workerID] = support.circularBuffer(4);
    }
    pool.poolJobs[workerID].enq(localData);
    return workerData;
}

function getTargetHex(miner) {
    if (miner.newDiff) {
        miner.difficulty = miner.newDiff;
        miner.newDiff = null;
    }
    let padded = Buffer.alloc(32);
    let diffBuff = baseDiff.div(miner.difficulty).toBuffer();
    diffBuff.copy(padded, 32 - diffBuff.length);

    let buff = padded.slice(0, 4);
    let buffArray = buff.toByteArray().reverse();
    let buffReversed = Buffer.from(buffArray);
    miner.target = buffReversed.readUInt32BE(0);
    return buffReversed.toString('hex');
}

// MAX_VER_SHARES_PER_SEC is maximum amount of verified shares for VER_SHARES_PERIOD second period
// other shares are just dumped to the pool to avoid proxy CPU overload during low difficulty adjustement period
const MAX_VER_SHARES_PER_SEC = 10; // per thread
const VER_SHARES_PERIOD = 5;
let verified_share_start_period;
let verified_share_num;

function processShare(miner, job, blockTemplate, nonce, resultHash) {
    let template = Buffer.alloc(blockTemplate.buffer.length);
    blockTemplate.buffer.copy(template);
    if (blockTemplate.solo) {
        template.writeUInt32BE(job.extraNonce, blockTemplate.reservedOffset);
    } else {
        template.writeUInt32BE(job.extraNonce, blockTemplate.workerOffset);
    }

    let hash = Buffer.from(resultHash, 'hex');
    let hashArray = hash.toByteArray().reverse();
    let hashNum = bignum.fromBuffer(Buffer.from(hashArray));
    let hashDiff = baseDiff.div(hashNum);

    if (hashDiff.ge(blockTemplate.targetDiff)) {
        let time_now = Date.now();
        if (!verified_share_start_period || time_now - verified_share_start_period > VER_SHARES_PERIOD*1000) {
            verified_share_num = 0;
            verified_share_start_period = time_now;
        }
        if (++ verified_share_num <= MAX_VER_SHARES_PER_SEC*VER_SHARES_PERIOD) {
            // Validate share with CN hash, then if valid, blast it up to the master.
            let shareBuffer = cnUtil.construct_block_blob(template, Buffer.from(nonce, 'hex'), blockTemplate.blob_type);
            let convertedBlob = cnUtil.convert_blob(shareBuffer, blockTemplate.blob_type);
            hash = (typeof miner.coinSettings.includeHeight !== 'undefined' && miner.coinSettings.includeHeight)
                ? multiHashing[miner.coinSettings.algo](convertedBlob, miner.coinSettings.variant, job.height)
                : multiHashing[miner.coinSettings.algo](convertedBlob, miner.coinSettings.variant);
            if (hash.toString('hex') !== resultHash) {
                console.error(global.threadName + "Bad share from miner " + miner.identifier);
                miner.messageSender('job', miner.getJob(miner, blockTemplate, true));
                return false;
            }
        } else {
            console.error(global.threadName + "Throttling down miner share verification to avoid CPU overload " + miner.logString);
        }
        miner.blocks += 1;
        process.send({
            type: 'shareFind',
            host: miner.pool,
            data: {
                btID: blockTemplate.id,
                nonce: nonce,
                resultHash: resultHash,
                workerNonce: job.extraNonce
            }
        });
    }
    else if (hashDiff.lt(job.difficulty)) {
        process.send({type: 'invalidShare'});
        console.warn(global.threadName + "Rejected low diff share of " + hashDiff.toString() + " from: " + miner.address + " ID: " +
            miner.identifier + " IP: " + miner.ipAddress);
        return false;
    }
    miner.shares += 1;
    miner.hashes += job.difficulty;
    var shareDiff = hashDiff.toNumber();
    debug.shares(global.threadName + 'Accepted share at difficulty %d/%d - %s%% job %s%% block - from %s name: %s for %s',
        shareDiff, job.difficulty, (shareDiff*100/job.difficulty).toFixed(2), (shareDiff*100/blockTemplate.difficulty).toFixed(2), miner.remote.addr, miner.identifier, miner.pool
    );
    if (shareDiff >= blockTemplate.difficulty) {
        debug.blocks('##### FISHPY FOUND BLOCK ######## Block found with diff %d at height %d diff %d by miner %s ##### FISHPY FOUND BLOCK ########',
            shareDiff, job.height, blockTemplate.difficulty, miner.remote.addr
        );
    }
    return true;
}

module.exports = function () {
    return {
        blockHeightCheck: blockHeightCheck,
        getRemoteNodes: getRemoteNodes,
        BlockTemplate: BlockTemplate,
        getJob: getJob,
        processShare: processShare,
        MasterBlockTemplate: MasterBlockTemplate,
        getMasterJob: getMasterJob
    };
};
