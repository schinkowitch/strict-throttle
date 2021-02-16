'use strict';

const NanoTimer = require('nanotimer');
const timer = new NanoTimer();

module.exports = function StrictThrottle ({limit, interval}) {
    checkOptions(limit, interval);

    const intervalNanos = BigInt(interval * 1000000);
    const recentTicks = new Array(limit).fill(0n);
    let oldestIndex = limit - 1;
    const queue = [];
    let timerId = null;

    function throttle (fn) {
        if (typeof fn !== 'function') {
            throw new Error('Expected `fn` to be a function');
        }

        if (shouldExecuteImmediately()) {
            return executeImmediately(fn);
        }

        return new Promise((resolve, reject) => {
            queue.push({fn, resolve, reject});

            if (queue.length === 1) {
                scheduleNext(process.hrtime.bigint());
            }
        });
    }

    throttle.waitingCount = waitingCount;
    throttle.abort = abort;

    return throttle;

    function shouldExecuteImmediately () {
        if (queue.length > 0) {
            return false;
        }

        return process.hrtime.bigint() - recentTicks[oldestIndex] >= intervalNanos;
    }

    function executeImmediately (fn) {
        return new Promise((resolve, reject) => {
            recordExecution(process.hrtime.bigint());

            try {
                resolve(fn());
            } catch (err) {
                reject(err);
            }
        });
    }

    function executeFirst () {
        const firstEntry = queue.shift();
        const now = process.hrtime.bigint();

        recordExecution(now);

        if (queue.length > 0) {
            scheduleNext(now);
        }

        try {
            firstEntry.resolve(firstEntry.fn());
        } catch (err) {
            firstEntry.reject(err);
        }
    }

    function recordExecution (now) {
        recentTicks[oldestIndex--] = now;

        if (oldestIndex < 0) {
            oldestIndex = limit - 1;
        }
    }

    function scheduleNext (now) {
        const elapsed = now - recentTicks[oldestIndex];

        if (elapsed >= intervalNanos) {
            setImmediate(executeFirst);
        } else {
            timerId = timer.setTimeout(executeFirst, '', (intervalNanos - elapsed) + 'n');
        }
    }

    function waitingCount () {
        return queue.length;
    }

    function abort () {
        if (queue.length === 0) {
            return;
        }

        timer.clearTimeout(timerId); // Remove scheduled execution of next queue member
        timerId = null;

        for (const entry of queue) {
            entry.reject(new Error('Aborted'));
        }

        queue.splice(0, queue.length);
    }
};

function checkOptions (limit, interval) {
    if (!(Number.isInteger(limit) && limit > 0)) {
        throw new Error('Expected `limit` to be a positive integer');
    }
    if (!(Number.isInteger(interval) && interval > 0)) {
        throw new Error('Expected `interval` to be a positive integer');
    }
}