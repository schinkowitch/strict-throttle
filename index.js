'use strict';

module.exports = function StrictThrottle ({limit, interval}) {
    checkOptions(limit, interval);

    const recentTicks = new Array(limit).fill(0);
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
                scheduleNext(Date.now());
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

        return Date.now() - recentTicks[oldestIndex] >= interval;
    }

    function executeImmediately (fn) {
        return new Promise((resolve, reject) => {
            recordExecution(Date.now());

            try {
                resolve(fn());
            } catch (err) {
                reject(err);
            }
        });
    }

    function executeFirst () {
        const firstEntry = queue.shift();
        const now = Date.now();

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

        if (elapsed >= interval) {
            process.nextTick(executeFirst);
        } else {
            timerId = setTimeout(executeFirst, interval - elapsed);
        }
    }

    function waitingCount () {
        return queue.length;
    }

    function abort () {
        if (queue.length === 0) {
            return;
        }

        clearTimeout(timerId); // Remove scheduled execution of next queue member
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