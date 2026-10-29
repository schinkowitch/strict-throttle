'use strict';

const {performance} = require('node:perf_hooks');

// Waits of at least this many ms sleep with setTimeout until about 1 ms before the deadline; shorter
// waits, and the rest of a long one, are covered by setImmediate, re-checking the clock on each wake-up.
const IMMEDIATE_THRESHOLD_MS = 2;

module.exports = function StrictThrottle ({limit, interval}) {
    checkOptions(limit, interval);

    const starts = []; // performance.now() of recent executions, oldest first; those before `head` have expired
    let head = 0;
    const queue = [];
    let timeout = null;
    let immediate = null;

    function throttle (fn) {
        if (typeof fn !== 'function') {
            throw new Error('Expected `fn` to be a function');
        }

        if (queue.length === 0 && remainingWait(performance.now()) === 0) {
            return execute(fn);
        }

        return new Promise((resolve, reject) => {
            queue.push({fn, resolve, reject});

            if (timeout === null && immediate === null) {
                schedule(remainingWait(performance.now()));
            }
        });
    }

    throttle.waitingCount = waitingCount;
    throttle.abort = abort;

    return throttle;

    // Milliseconds until another execution is allowed, or 0 if one is allowed now
    function remainingWait (now) {
        while (head < starts.length && now - starts[head] >= interval) {
            head++;
        }

        // Drop expired entries once they are at least half the array, so each start is copied O(1) times on
        // average (shift() copies the whole array when it is large)
        if (head > 0 && head * 2 >= starts.length) {
            starts.splice(0, head);
            head = 0;
        }

        if (starts.length - head < limit) {
            return 0;
        }

        return interval - (now - starts[head]);
    }

    function execute (fn) {
        return new Promise((resolve, reject) => {
            starts.push(performance.now());

            try {
                resolve(fn());
            } catch (err) {
                reject(err);
            }
        });
    }

    // Queued entries only ever run from here, in a timer or immediate callback, never synchronously
    // inside throttle() or schedule(), so they always run in FIFO order.
    function onWake () {
        timeout = null;
        immediate = null;

        if (queue.length === 0) {
            return;
        }

        const wait = remainingWait(performance.now());

        if (wait > 0) {
            schedule(wait); // Too early: setTimeout can fire before its delay in real time
            return;
        }

        const entry = queue.shift();

        starts.push(performance.now());

        if (queue.length > 0) {
            schedule(remainingWait(performance.now()));
        }

        try {
            entry.resolve(entry.fn());
        } catch (err) {
            entry.reject(err);
        }
    }

    function schedule (wait) {
        if (wait >= IMMEDIATE_THRESHOLD_MS) {
            timeout = setTimeout(onWake, Math.floor(wait) - 1);
        } else {
            immediate = setImmediate(onWake);
        }
    }

    function waitingCount () {
        return queue.length;
    }

    function abort () {
        if (queue.length === 0) {
            return;
        }

        // Remove scheduled execution of next queue member
        clearTimeout(timeout);
        clearImmediate(immediate);
        timeout = null;
        immediate = null;

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
