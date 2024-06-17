'use strict';

const Throttle = require('../index');
const should = require('should');
const {setTimeout} = require('node:timers/promises');
const allSettled = require('promise.allsettled');

allSettled.shim();

describe('Strict throttle', () => {
    it('warm up', async () => {
        const limit = 1;
        const interval = 10;
        const throttle = Throttle({limit: limit, interval: interval});
        const fn = process.hrtime.bigint;
        const promises = [];

        promises.push(throttle(fn));
        promises.push(throttle(fn));
        promises.push(throttle(fn));

        await Promise.all(promises);
    });

    it('throttles calls to a function', async () => {
        const limit = 1;
        const interval = 20;
        const intervalNanos = interval * 1000000;
        const throttle = Throttle({limit: limit, interval: interval});
        const fn = process.hrtime.bigint;
        const promises = [];
        const start = fn();

        promises.push(throttle(fn));
        promises.push(throttle(fn));

        const results = await Promise.all(promises);

        should.exist(results);
        results.should.have.length(2);
        should.exist(results[0]);
        should.exist(results[1]);

        const errorNanos = 900000; // 0.9ms

        Number(results[0] - start).should.be.within(0, errorNanos);
        Number(results[1] - results[0]).should.be.within(intervalNanos, intervalNanos + errorNanos);
    });

    it('returns promise', async () => {
        const limit = 1;
        const interval = 10;
        const throttle = Throttle({limit: limit, interval: interval});
        const fn = () => Promise.resolve(Date.now());
        const promises = [];

        promises.push(throttle(fn));
        promises.push(throttle(fn));
        promises.push(throttle(fn));

        const results = await Promise.all(promises);

        should.exist(results);
        results.should.have.length(3);
        results[0].should.be.Number();
        results[1].should.be.Number();
        results[2].should.be.Number();
    });

    it('handles large limit', async () => {
        const limit = 100;
        const interval = 20;
        const throttle = Throttle({limit: limit, interval: interval});
        const fn = Date.now;

        const promises = [];
        const start = Date.now();

        for (let i = 0; i <= limit * 2; i++) {
            promises.push(throttle(fn));
        }

        const results = await Promise.all(promises);

        results.forEach((result, index) => {
            const elapsed = result - start;
            const expected = Math.floor(index / limit) * interval;

            elapsed.should.be.within(expected, expected + 9);
        });
    });

    it('is performant with large queue', async function () {
        this.timeout(20000);

        const limit = 1;
        const interval = 9;
        const count = 1000;
        const throttle = Throttle({limit: limit, interval: interval});
        const fn = () => {};

        const promises = [];
        const start = Date.now();

        for (let i = 0; i < count; i++) {
            promises.push(throttle(fn));
        }

        await Promise.all(promises);

        const elapsed = Date.now() - start;
        const expected = (count - 1) * interval;

        elapsed.should.be.within(expected, expected + 100);
    });

    it('always respects the interval with pauses', async () => {
        const limit = 5;
        const interval = 50;
        const maxPause = 10;
        const throttle = Throttle({limit: limit, interval: interval});
        const fn = Date.now;

        const promises = [];

        for (let i = 0; i <= limit * 3; i++) {
            await setTimeout(Math.round(Math.random() * maxPause));
            promises.push(throttle(fn));
        }

        const results = await Promise.all(promises);

        results.forEach((result, index) => {
            if (index < limit) {
                return;
            }

            const wait = result - results[index - limit];
            wait.should.be.within(interval - 1, interval + maxPause);
        });
    });

    it('rejects if the function throws an Error', async () => {
        const limit = 1;
        const interval = 10;
        const throttle = Throttle({limit: limit, interval: interval});

        const firstPromise = throttle(() => { throw new Error('first thing went wrong'); });
        const secondPromise = throttle(() => { throw new Error('second thing went wrong'); });

        let firstError = {};
        let secondError = {};

        try {
            await firstPromise;
        } catch (err) {
            firstError = err;
        }

        try {
            await secondPromise;
        } catch (err) {
            secondError = err;
        }

        firstError.should.be.Error();
        firstError.message.should.equal('first thing went wrong');

        secondError.should.be.Error();
        secondError.message.should.equal('second thing went wrong');
    });

    it('throws an Error if the options are missing', () => {
        let expectedErr = {};
        try {
            Throttle();
        } catch (err) {
            expectedErr = err;
        }

        expectedErr.should.be.Error();
        expectedErr.message.should.startWith('Cannot destructure property')
    });

    it('throws an Error if the limit is missing', () => {
        let expectedErr = {};
        try {
            Throttle({});
        } catch (err) {
            expectedErr = err;
        }

        expectedErr.should.be.Error();
        expectedErr.message.should.startWith('Expected `limit` to be a positive integer');
    });

    it('throws an Error if the limit not a number', () => {
        let expectedErr = {};
        try {
            Throttle({limit: '1', interval: 100});
        } catch (err) {
            expectedErr = err;
        }

        expectedErr.should.be.Error();
        expectedErr.message.should.startWith('Expected `limit` to be a positive integer');
    });

    it('throws an Error if the limit is zero', () => {
        let expectedErr = {};
        try {
            Throttle({limit: 0, interval: 100});
        } catch (err) {
            expectedErr = err;
        }

        expectedErr.should.be.Error();
        expectedErr.message.should.startWith('Expected `limit` to be a positive integer');
    });

    it('throws an Error if the limit is a negative number', () => {
        let expectedErr = {};
        try {
            Throttle({limit: -5, interval: 100});
        } catch (err) {
            expectedErr = err;
        }

        expectedErr.should.be.Error();
        expectedErr.message.should.startWith('Expected `limit` to be a positive integer');
    });

    it('throws an Error if the limit is a decimal number', () => {
        let expectedErr = {};
        try {
            Throttle({limit: 1.1, interval: 100});
        } catch (err) {
            expectedErr = err;
        }

        expectedErr.should.be.Error();
        expectedErr.message.should.startWith('Expected `limit` to be a positive integer');
    });

    it('throws an Error if the interval is missing', () => {
        let expectedErr = {};
        try {
            Throttle({limit: 1});
        } catch (err) {
            expectedErr = err;
        }

        expectedErr.should.be.Error();
        expectedErr.message.should.startWith('Expected `interval` to be a positive integer');
    });

    it('throws an Error if the interval not a number', () => {
        let expectedErr = {};
        try {
            Throttle({limit: 1, interval: '100'});
        } catch (err) {
            expectedErr = err;
        }

        expectedErr.should.be.Error();
        expectedErr.message.should.startWith('Expected `interval` to be a positive integer');
    });

    it('throws an Error if the interval is zero', () => {
        let expectedErr = {};
        try {
            Throttle({limit: 1, interval: 0});
        } catch (err) {
            expectedErr = err;
        }

        expectedErr.should.be.Error();
        expectedErr.message.should.startWith('Expected `interval` to be a positive integer');
    });

    it('throws an Error if the interval is a negative number', () => {
        let expectedErr = {};
        try {
            Throttle({limit: 1, interval: -100});
        } catch (err) {
            expectedErr = err;
        }

        expectedErr.should.be.Error();
        expectedErr.message.should.startWith('Expected `interval` to be a positive integer');
    });

    it('throws an Error if the interval is a decimal number', () => {
        let expectedErr = {};
        try {
            Throttle({limit: 1, interval: 100.1});
        } catch (err) {
            expectedErr = err;
        }

        expectedErr.should.be.Error();
        expectedErr.message.should.startWith('Expected `interval` to be a positive integer');
    });

    it('throws an Error if the throttle is called without a function', () => {
        const throttle = Throttle({limit: 1, interval: 100});
        let expectedErr = {};

        try {
            throttle();
        } catch (err) {
            expectedErr = err;
        }

        expectedErr.should.be.Error();
        expectedErr.message.should.startWith('Expected `fn` to be a function');
    });

    it('throws an Error if the throttle is called with a value', () => {
        const throttle = Throttle({limit: 1, interval: 100});
        let expectedErr = {};

        try {
            throttle(Date.now());
        } catch (err) {
            expectedErr = err;
        }

        expectedErr.should.be.Error();
        expectedErr.message.should.startWith('Expected `fn` to be a function');
    });

    it('gets the number of waiting calls', async () => {
        const throttle = Throttle({limit: 1, interval: 10});
        const promises = [];
        const fn = () => {};

        throttle.waitingCount().should.equal(0);
        promises.push(throttle(fn));
        throttle.waitingCount().should.equal(0);
        promises.push(throttle(fn));
        throttle.waitingCount().should.equal(1);
        promises.push(throttle(fn));
        throttle.waitingCount().should.equal(2);

        await Promise.all(promises);

        throttle.waitingCount().should.equal(0);
    });

    it('aborts pending calls', async () => {
        const throttle = Throttle({limit: 1, interval: 100});
        const promises = [];
        const fn = () => {};

        promises.push(throttle(fn));
        promises.push(throttle(fn));
        promises.push(throttle(fn));

        throttle.waitingCount().should.equal(2);

        const start = Date.now();

        throttle.abort();

        const results = await Promise.allSettled(promises);

        (Date.now() - start).should.be.within(0, 10); // Rejects waiting promises immediately

        results[0].status.should.equal('fulfilled');
        results[1].status.should.equal('rejected');
        results[1].reason.should.be.Error();
        results[1].reason.message.should.equal('Aborted');
        results[2].status.should.equal('rejected');

        throttle.waitingCount().should.equal(0);
    });
});