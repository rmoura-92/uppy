(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * cuid.js
 * Collision-resistant UID generator for browsers and node.
 * Sequential for fast db lookups and recency sorting.
 * Safe for element IDs and server-side lookups.
 *
 * Extracted from CLCTR
 *
 * Copyright (c) Eric Elliott 2012
 * MIT License
 */

var fingerprint = require('./lib/fingerprint.js');
var pad = require('./lib/pad.js');

var c = 0,
  blockSize = 4,
  base = 36,
  discreteValues = Math.pow(base, blockSize);

function randomBlock () {
  return pad((Math.random() *
    discreteValues << 0)
    .toString(base), blockSize);
}

function safeCounter () {
  c = c < discreteValues ? c : 0;
  c++; // this is not subliminal
  return c - 1;
}

function cuid () {
  // Starting with a lowercase letter makes
  // it HTML element ID friendly.
  var letter = 'c', // hard-coded allows for sequential access

    // timestamp
    // warning: this exposes the exact date and time
    // that the uid was created.
    timestamp = (new Date().getTime()).toString(base),

    // Prevent same-machine collisions.
    counter = pad(safeCounter().toString(base), blockSize),

    // A few chars to generate distinct ids for different
    // clients (so different computers are far less
    // likely to generate the same id)
    print = fingerprint(),

    // Grab some more chars from Math.random()
    random = randomBlock() + randomBlock();

  return letter + timestamp + counter + print + random;
}

cuid.slug = function slug () {
  var date = new Date().getTime().toString(36),
    counter = safeCounter().toString(36).slice(-4),
    print = fingerprint().slice(0, 1) +
      fingerprint().slice(-1),
    random = randomBlock().slice(-2);

  return date.slice(-2) +
    counter + print + random;
};

cuid.fingerprint = fingerprint;

module.exports = cuid;

},{"./lib/fingerprint.js":2,"./lib/pad.js":3}],2:[function(require,module,exports){
var pad = require('./pad.js');

var env = typeof window === 'object' ? window : self;
var globalCount = Object.keys(env);
var mimeTypesLength = navigator.mimeTypes ? navigator.mimeTypes.length : 0;
var clientId = pad((mimeTypesLength +
  navigator.userAgent.length).toString(36) +
  globalCount.toString(36), 4);

module.exports = function fingerprint () {
  return clientId;
};

},{"./pad.js":3}],3:[function(require,module,exports){
module.exports = function pad (num, size) {
  var s = '000000000' + num;
  return s.substr(s.length - size);
};

},{}],4:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
 * @version   v4.2.2+97478eb6
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.ES6Promise = factory());
}(this, (function () { 'use strict';

function objectOrFunction(x) {
  var type = typeof x;
  return x !== null && (type === 'object' || type === 'function');
}

function isFunction(x) {
  return typeof x === 'function';
}



var _isArray = void 0;
if (Array.isArray) {
  _isArray = Array.isArray;
} else {
  _isArray = function (x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  };
}

var isArray = _isArray;

var len = 0;
var vertxNext = void 0;
var customSchedulerFn = void 0;

var asap = function asap(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    // If len is 2, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    if (customSchedulerFn) {
      customSchedulerFn(flush);
    } else {
      scheduleFlush();
    }
  }
};

function setScheduler(scheduleFn) {
  customSchedulerFn = scheduleFn;
}

function setAsap(asapFn) {
  asap = asapFn;
}

var browserWindow = typeof window !== 'undefined' ? window : undefined;
var browserGlobal = browserWindow || {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

// test for web worker but not in IE10
var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

// node
function useNextTick() {
  // node version 0.10.x displays a deprecation warning when nextTick is used recursively
  // see https://github.com/cujojs/when/issues/410 for details
  return function () {
    return process.nextTick(flush);
  };
}

// vertx
function useVertxTimer() {
  if (typeof vertxNext !== 'undefined') {
    return function () {
      vertxNext(flush);
    };
  }

  return useSetTimeout();
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function () {
    node.data = iterations = ++iterations % 2;
  };
}

// web worker
function useMessageChannel() {
  var channel = new MessageChannel();
  channel.port1.onmessage = flush;
  return function () {
    return channel.port2.postMessage(0);
  };
}

function useSetTimeout() {
  // Store setTimeout reference so es6-promise will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var globalSetTimeout = setTimeout;
  return function () {
    return globalSetTimeout(flush, 1);
  };
}

var queue = new Array(1000);
function flush() {
  for (var i = 0; i < len; i += 2) {
    var callback = queue[i];
    var arg = queue[i + 1];

    callback(arg);

    queue[i] = undefined;
    queue[i + 1] = undefined;
  }

  len = 0;
}

function attemptVertx() {
  try {
    var r = require;
    var vertx = r('vertx');
    vertxNext = vertx.runOnLoop || vertx.runOnContext;
    return useVertxTimer();
  } catch (e) {
    return useSetTimeout();
  }
}

var scheduleFlush = void 0;
// Decide what async method to use to triggering processing of queued callbacks:
if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && typeof require === 'function') {
  scheduleFlush = attemptVertx();
} else {
  scheduleFlush = useSetTimeout();
}

function then(onFulfillment, onRejection) {
  var parent = this;

  var child = new this.constructor(noop);

  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }

  var _state = parent._state;


  if (_state) {
    var callback = arguments[_state - 1];
    asap(function () {
      return invokeCallback(_state, child, callback, parent._result);
    });
  } else {
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

/**
  `Promise.resolve` returns a promise that will become resolved with the
  passed `value`. It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    resolve(1);
  });

  promise.then(function(value){
    // value === 1
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.resolve(1);

  promise.then(function(value){
    // value === 1
  });
  ```

  @method resolve
  @static
  @param {Any} value value that the returned promise will be resolved with
  Useful for tooling.
  @return {Promise} a promise that will become fulfilled with the given
  `value`
*/
function resolve$1(object) {
  /*jshint validthis:true */
  var Constructor = this;

  if (object && typeof object === 'object' && object.constructor === Constructor) {
    return object;
  }

  var promise = new Constructor(noop);
  resolve(promise, object);
  return promise;
}

var PROMISE_ID = Math.random().toString(36).substring(16);

function noop() {}

var PENDING = void 0;
var FULFILLED = 1;
var REJECTED = 2;

var GET_THEN_ERROR = new ErrorObject();

function selfFulfillment() {
  return new TypeError("You cannot resolve a promise with itself");
}

function cannotReturnOwn() {
  return new TypeError('A promises callback cannot return that same promise.');
}

function getThen(promise) {
  try {
    return promise.then;
  } catch (error) {
    GET_THEN_ERROR.error = error;
    return GET_THEN_ERROR;
  }
}

function tryThen(then$$1, value, fulfillmentHandler, rejectionHandler) {
  try {
    then$$1.call(value, fulfillmentHandler, rejectionHandler);
  } catch (e) {
    return e;
  }
}

function handleForeignThenable(promise, thenable, then$$1) {
  asap(function (promise) {
    var sealed = false;
    var error = tryThen(then$$1, thenable, function (value) {
      if (sealed) {
        return;
      }
      sealed = true;
      if (thenable !== value) {
        resolve(promise, value);
      } else {
        fulfill(promise, value);
      }
    }, function (reason) {
      if (sealed) {
        return;
      }
      sealed = true;

      reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      reject(promise, error);
    }
  }, promise);
}

function handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, function (value) {
      return resolve(promise, value);
    }, function (reason) {
      return reject(promise, reason);
    });
  }
}

function handleMaybeThenable(promise, maybeThenable, then$$1) {
  if (maybeThenable.constructor === promise.constructor && then$$1 === then && maybeThenable.constructor.resolve === resolve$1) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    if (then$$1 === GET_THEN_ERROR) {
      reject(promise, GET_THEN_ERROR.error);
      GET_THEN_ERROR.error = null;
    } else if (then$$1 === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then$$1)) {
      handleForeignThenable(promise, maybeThenable, then$$1);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}

function resolve(promise, value) {
  if (promise === value) {
    reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    handleMaybeThenable(promise, value, getThen(value));
  } else {
    fulfill(promise, value);
  }
}

function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) {
    return;
  }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}

function reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._state = REJECTED;
  promise._result = reason;

  asap(publishRejection, promise);
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var _subscribers = parent._subscribers;
  var length = _subscribers.length;


  parent._onerror = null;

  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED] = onRejection;

  if (length === 0 && parent._state) {
    asap(publish, parent);
  }
}

function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) {
    return;
  }

  var child = void 0,
      callback = void 0,
      detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}

function ErrorObject() {
  this.error = null;
}

var TRY_CATCH_ERROR = new ErrorObject();

function tryCatch(callback, detail) {
  try {
    return callback(detail);
  } catch (e) {
    TRY_CATCH_ERROR.error = e;
    return TRY_CATCH_ERROR;
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value = void 0,
      error = void 0,
      succeeded = void 0,
      failed = void 0;

  if (hasCallback) {
    value = tryCatch(callback, detail);

    if (value === TRY_CATCH_ERROR) {
      failed = true;
      error = value.error;
      value.error = null;
    } else {
      succeeded = true;
    }

    if (promise === value) {
      reject(promise, cannotReturnOwn());
      return;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
    resolve(promise, value);
  } else if (failed) {
    reject(promise, error);
  } else if (settled === FULFILLED) {
    fulfill(promise, value);
  } else if (settled === REJECTED) {
    reject(promise, value);
  }
}

function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value) {
      resolve(promise, value);
    }, function rejectPromise(reason) {
      reject(promise, reason);
    });
  } catch (e) {
    reject(promise, e);
  }
}

var id = 0;
function nextId() {
  return id++;
}

function makePromise(promise) {
  promise[PROMISE_ID] = id++;
  promise._state = undefined;
  promise._result = undefined;
  promise._subscribers = [];
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
}

var Enumerator = function () {
  function Enumerator(Constructor, input) {
    this._instanceConstructor = Constructor;
    this.promise = new Constructor(noop);

    if (!this.promise[PROMISE_ID]) {
      makePromise(this.promise);
    }

    if (isArray(input)) {
      this.length = input.length;
      this._remaining = input.length;

      this._result = new Array(this.length);

      if (this.length === 0) {
        fulfill(this.promise, this._result);
      } else {
        this.length = this.length || 0;
        this._enumerate(input);
        if (this._remaining === 0) {
          fulfill(this.promise, this._result);
        }
      }
    } else {
      reject(this.promise, validationError());
    }
  }

  Enumerator.prototype._enumerate = function _enumerate(input) {
    for (var i = 0; this._state === PENDING && i < input.length; i++) {
      this._eachEntry(input[i], i);
    }
  };

  Enumerator.prototype._eachEntry = function _eachEntry(entry, i) {
    var c = this._instanceConstructor;
    var resolve$$1 = c.resolve;


    if (resolve$$1 === resolve$1) {
      var _then = getThen(entry);

      if (_then === then && entry._state !== PENDING) {
        this._settledAt(entry._state, i, entry._result);
      } else if (typeof _then !== 'function') {
        this._remaining--;
        this._result[i] = entry;
      } else if (c === Promise$1) {
        var promise = new c(noop);
        handleMaybeThenable(promise, entry, _then);
        this._willSettleAt(promise, i);
      } else {
        this._willSettleAt(new c(function (resolve$$1) {
          return resolve$$1(entry);
        }), i);
      }
    } else {
      this._willSettleAt(resolve$$1(entry), i);
    }
  };

  Enumerator.prototype._settledAt = function _settledAt(state, i, value) {
    var promise = this.promise;


    if (promise._state === PENDING) {
      this._remaining--;

      if (state === REJECTED) {
        reject(promise, value);
      } else {
        this._result[i] = value;
      }
    }

    if (this._remaining === 0) {
      fulfill(promise, this._result);
    }
  };

  Enumerator.prototype._willSettleAt = function _willSettleAt(promise, i) {
    var enumerator = this;

    subscribe(promise, undefined, function (value) {
      return enumerator._settledAt(FULFILLED, i, value);
    }, function (reason) {
      return enumerator._settledAt(REJECTED, i, reason);
    });
  };

  return Enumerator;
}();

/**
  `Promise.all` accepts an array of promises, and returns a new promise which
  is fulfilled with an array of fulfillment values for the passed promises, or
  rejected with the reason of the first passed promise to be rejected. It casts all
  elements of the passed iterable to promises as it runs this algorithm.

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = resolve(2);
  let promise3 = resolve(3);
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = reject(new Error("2"));
  let promise3 = reject(new Error("3"));
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @static
  @param {Array} entries array of promises
  @param {String} label optional string for labeling the promise.
  Useful for tooling.
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
  @static
*/
function all(entries) {
  return new Enumerator(this, entries).promise;
}

/**
  `Promise.race` returns a new promise which is settled in the same way as the
  first passed promise to settle.

  Example:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 2');
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // result === 'promise 2' because it was resolved before promise1
    // was resolved.
  });
  ```

  `Promise.race` is deterministic in that only the state of the first
  settled promise matters. For example, even if other promises given to the
  `promises` array argument are resolved, but the first settled promise has
  become rejected before the other promises became fulfilled, the returned
  promise will become rejected:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error('promise 2'));
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // Code here never runs
  }, function(reason){
    // reason.message === 'promise 2' because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  An example real-world use case is implementing timeouts:

  ```javascript
  Promise.race([ajax('foo.json'), timeout(5000)])
  ```

  @method race
  @static
  @param {Array} promises array of promises to observe
  Useful for tooling.
  @return {Promise} a promise which settles in the same way as the first passed
  promise to settle.
*/
function race(entries) {
  /*jshint validthis:true */
  var Constructor = this;

  if (!isArray(entries)) {
    return new Constructor(function (_, reject) {
      return reject(new TypeError('You must pass an array to race.'));
    });
  } else {
    return new Constructor(function (resolve, reject) {
      var length = entries.length;
      for (var i = 0; i < length; i++) {
        Constructor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
}

/**
  `Promise.reject` returns a promise rejected with the passed `reason`.
  It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @static
  @param {Any} reason value that the returned promise will be rejected with.
  Useful for tooling.
  @return {Promise} a promise rejected with the given `reason`.
*/
function reject$1(reason) {
  /*jshint validthis:true */
  var Constructor = this;
  var promise = new Constructor(noop);
  reject(promise, reason);
  return promise;
}

function needsResolver() {
  throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
}

function needsNew() {
  throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
}

/**
  Promise objects represent the eventual result of an asynchronous operation. The
  primary way of interacting with a promise is through its `then` method, which
  registers callbacks to receive either a promise's eventual value or the reason
  why the promise cannot be fulfilled.

  Terminology
  -----------

  - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
  - `thenable` is an object or function that defines a `then` method.
  - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
  - `exception` is a value that is thrown using the throw statement.
  - `reason` is a value that indicates why a promise was rejected.
  - `settled` the final resting state of a promise, fulfilled or rejected.

  A promise can be in one of three states: pending, fulfilled, or rejected.

  Promises that are fulfilled have a fulfillment value and are in the fulfilled
  state.  Promises that are rejected have a rejection reason and are in the
  rejected state.  A fulfillment value is never a thenable.

  Promises can also be said to *resolve* a value.  If this value is also a
  promise, then the original promise's settled state will match the value's
  settled state.  So a promise that *resolves* a promise that rejects will
  itself reject, and a promise that *resolves* a promise that fulfills will
  itself fulfill.


  Basic Usage:
  ------------

  ```js
  let promise = new Promise(function(resolve, reject) {
    // on success
    resolve(value);

    // on failure
    reject(reason);
  });

  promise.then(function(value) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Advanced Usage:
  ---------------

  Promises shine when abstracting away asynchronous interactions such as
  `XMLHttpRequest`s.

  ```js
  function getJSON(url) {
    return new Promise(function(resolve, reject){
      let xhr = new XMLHttpRequest();

      xhr.open('GET', url);
      xhr.onreadystatechange = handler;
      xhr.responseType = 'json';
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();

      function handler() {
        if (this.readyState === this.DONE) {
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
          }
        }
      };
    });
  }

  getJSON('/posts.json').then(function(json) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Unlike callbacks, promises are great composable primitives.

  ```js
  Promise.all([
    getJSON('/posts'),
    getJSON('/comments')
  ]).then(function(values){
    values[0] // => postsJSON
    values[1] // => commentsJSON

    return values;
  });
  ```

  @class Promise
  @param {Function} resolver
  Useful for tooling.
  @constructor
*/

var Promise$1 = function () {
  function Promise(resolver) {
    this[PROMISE_ID] = nextId();
    this._result = this._state = undefined;
    this._subscribers = [];

    if (noop !== resolver) {
      typeof resolver !== 'function' && needsResolver();
      this instanceof Promise ? initializePromise(this, resolver) : needsNew();
    }
  }

  /**
  The primary way of interacting with a promise is through its `then` method,
  which registers callbacks to receive either a promise's eventual value or the
  reason why the promise cannot be fulfilled.
   ```js
  findUser().then(function(user){
    // user is available
  }, function(reason){
    // user is unavailable, and you are given the reason why
  });
  ```
   Chaining
  --------
   The return value of `then` is itself a promise.  This second, 'downstream'
  promise is resolved with the return value of the first promise's fulfillment
  or rejection handler, or rejected if the handler throws an exception.
   ```js
  findUser().then(function (user) {
    return user.name;
  }, function (reason) {
    return 'default name';
  }).then(function (userName) {
    // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
    // will be `'default name'`
  });
   findUser().then(function (user) {
    throw new Error('Found user, but still unhappy');
  }, function (reason) {
    throw new Error('`findUser` rejected and we're unhappy');
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
    // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
  });
  ```
  If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.
   ```js
  findUser().then(function (user) {
    throw new PedagogicalException('Upstream error');
  }).then(function (value) {
    // never reached
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // The `PedgagocialException` is propagated all the way down to here
  });
  ```
   Assimilation
  ------------
   Sometimes the value you want to propagate to a downstream promise can only be
  retrieved asynchronously. This can be achieved by returning a promise in the
  fulfillment or rejection handler. The downstream promise will then be pending
  until the returned promise is settled. This is called *assimilation*.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // The user's comments are now available
  });
  ```
   If the assimliated promise rejects, then the downstream promise will also reject.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // If `findCommentsByAuthor` fulfills, we'll have the value here
  }, function (reason) {
    // If `findCommentsByAuthor` rejects, we'll have the reason here
  });
  ```
   Simple Example
  --------------
   Synchronous Example
   ```javascript
  let result;
   try {
    result = findResult();
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
  findResult(function(result, err){
    if (err) {
      // failure
    } else {
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findResult().then(function(result){
    // success
  }, function(reason){
    // failure
  });
  ```
   Advanced Example
  --------------
   Synchronous Example
   ```javascript
  let author, books;
   try {
    author = findAuthor();
    books  = findBooksByAuthor(author);
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
   function foundBooks(books) {
   }
   function failure(reason) {
   }
   findAuthor(function(author, err){
    if (err) {
      failure(err);
      // failure
    } else {
      try {
        findBoooksByAuthor(author, function(books, err) {
          if (err) {
            failure(err);
          } else {
            try {
              foundBooks(books);
            } catch(reason) {
              failure(reason);
            }
          }
        });
      } catch(error) {
        failure(err);
      }
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findAuthor().
    then(findBooksByAuthor).
    then(function(books){
      // found books
  }).catch(function(reason){
    // something went wrong
  });
  ```
   @method then
  @param {Function} onFulfilled
  @param {Function} onRejected
  Useful for tooling.
  @return {Promise}
  */

  /**
  `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
  as the catch block of a try/catch statement.
  ```js
  function findAuthor(){
  throw new Error('couldn't find that author');
  }
  // synchronous
  try {
  findAuthor();
  } catch(reason) {
  // something went wrong
  }
  // async with promises
  findAuthor().catch(function(reason){
  // something went wrong
  });
  ```
  @method catch
  @param {Function} onRejection
  Useful for tooling.
  @return {Promise}
  */


  Promise.prototype.catch = function _catch(onRejection) {
    return this.then(null, onRejection);
  };

  /**
    `finally` will be invoked regardless of the promise's fate just as native
    try/catch/finally behaves
  
    Synchronous example:
  
    ```js
    findAuthor() {
      if (Math.random() > 0.5) {
        throw new Error();
      }
      return new Author();
    }
  
    try {
      return findAuthor(); // succeed or fail
    } catch(error) {
      return findOtherAuther();
    } finally {
      // always runs
      // doesn't affect the return value
    }
    ```
  
    Asynchronous example:
  
    ```js
    findAuthor().catch(function(reason){
      return findOtherAuther();
    }).finally(function(){
      // author was either found, or not
    });
    ```
  
    @method finally
    @param {Function} callback
    @return {Promise}
  */


  Promise.prototype.finally = function _finally(callback) {
    var promise = this;
    var constructor = promise.constructor;

    return promise.then(function (value) {
      return constructor.resolve(callback()).then(function () {
        return value;
      });
    }, function (reason) {
      return constructor.resolve(callback()).then(function () {
        throw reason;
      });
    });
  };

  return Promise;
}();

Promise$1.prototype.then = then;
Promise$1.all = all;
Promise$1.race = race;
Promise$1.resolve = resolve$1;
Promise$1.reject = reject$1;
Promise$1._setScheduler = setScheduler;
Promise$1._setAsap = setAsap;
Promise$1._asap = asap;

/*global self*/
function polyfill() {
    var local = void 0;

    if (typeof global !== 'undefined') {
        local = global;
    } else if (typeof self !== 'undefined') {
        local = self;
    } else {
        try {
            local = Function('return this')();
        } catch (e) {
            throw new Error('polyfill failed because global object is unavailable in this environment');
        }
    }

    var P = local.Promise;

    if (P) {
        var promiseToString = null;
        try {
            promiseToString = Object.prototype.toString.call(P.resolve());
        } catch (e) {
            // silently ignored
        }

        if (promiseToString === '[object Promise]' && !P.cast) {
            return;
        }
    }

    local.Promise = Promise$1;
}

// Strange compat..
Promise$1.polyfill = polyfill;
Promise$1.Promise = Promise$1;

return Promise$1;

})));





}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":33}],5:[function(require,module,exports){
'use strict';

var hasOwn = Object.prototype.hasOwnProperty;
var toStr = Object.prototype.toString;

var isArray = function isArray(arr) {
	if (typeof Array.isArray === 'function') {
		return Array.isArray(arr);
	}

	return toStr.call(arr) === '[object Array]';
};

var isPlainObject = function isPlainObject(obj) {
	if (!obj || toStr.call(obj) !== '[object Object]') {
		return false;
	}

	var hasOwnConstructor = hasOwn.call(obj, 'constructor');
	var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) { /**/ }

	return typeof key === 'undefined' || hasOwn.call(obj, key);
};

module.exports = function extend() {
	var options, name, src, copy, copyIsArray, clone;
	var target = arguments[0];
	var i = 1;
	var length = arguments.length;
	var deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}
	if (target == null || (typeof target !== 'object' && typeof target !== 'function')) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target !== copy) {
					// Recurse if we're merging plain objects or arrays
					if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
						if (copyIsArray) {
							copyIsArray = false;
							clone = src && isArray(src) ? src : [];
						} else {
							clone = src && isPlainObject(src) ? src : {};
						}

						// Never move original objects, clone them
						target[name] = extend(deep, clone, copy);

					// Don't bring in undefined values
					} else if (typeof copy !== 'undefined') {
						target[name] = copy;
					}
				}
			}
		}
	}

	// Return the modified object
	return target;
};

},{}],6:[function(require,module,exports){
(function (global){
/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max,
    nativeMin = Math.min;

/**
 * Gets the timestamp of the number of milliseconds that have elapsed since
 * the Unix epoch (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Date
 * @returns {number} Returns the timestamp.
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => Logs the number of milliseconds it took for the deferred invocation.
 */
var now = function() {
  return root.Date.now();
};

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed `func` invocations and a `flush` method to immediately invoke them.
 * Provide `options` to indicate whether `func` should be invoked on the
 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
 * with the last arguments provided to the debounced function. Subsequent
 * calls to the debounced function return the result of the last `func`
 * invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the debounced function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.debounce` and `_.throttle`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {number} [wait=0] The number of milliseconds to delay.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=false]
 *  Specify invoking on the leading edge of the timeout.
 * @param {number} [options.maxWait]
 *  The maximum time `func` is allowed to be delayed before it's invoked.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // Avoid costly calculations while the window size is in flux.
 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
 *
 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
 * jQuery(element).on('click', _.debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }));
 *
 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
 * var source = new EventSource('/stream');
 * jQuery(source).on('message', debounced);
 *
 * // Cancel the trailing debounced invocation.
 * jQuery(window).on('popstate', debounced.cancel);
 */
function debounce(func, wait, options) {
  var lastArgs,
      lastThis,
      maxWait,
      result,
      timerId,
      lastCallTime,
      lastInvokeTime = 0,
      leading = false,
      maxing = false,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = toNumber(wait) || 0;
  if (isObject(options)) {
    leading = !!options.leading;
    maxing = 'maxWait' in options;
    maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function invokeFunc(time) {
    var args = lastArgs,
        thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time) {
    // Reset any `maxWait` timer.
    lastInvokeTime = time;
    // Start the timer for the trailing edge.
    timerId = setTimeout(timerExpired, wait);
    // Invoke the leading edge.
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime,
        result = wait - timeSinceLastCall;

    return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
  }

  function shouldInvoke(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime;

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
      (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
  }

  function timerExpired() {
    var time = now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Restart the timer.
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time) {
    timerId = undefined;

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(now());
  }

  function debounced() {
    var time = now(),
        isInvoking = shouldInvoke(time);

    lastArgs = arguments;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

/**
 * Creates a throttled function that only invokes `func` at most once per
 * every `wait` milliseconds. The throttled function comes with a `cancel`
 * method to cancel delayed `func` invocations and a `flush` method to
 * immediately invoke them. Provide `options` to indicate whether `func`
 * should be invoked on the leading and/or trailing edge of the `wait`
 * timeout. The `func` is invoked with the last arguments provided to the
 * throttled function. Subsequent calls to the throttled function return the
 * result of the last `func` invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the throttled function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.throttle` and `_.debounce`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to throttle.
 * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=true]
 *  Specify invoking on the leading edge of the timeout.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new throttled function.
 * @example
 *
 * // Avoid excessively updating the position while scrolling.
 * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
 *
 * // Invoke `renewToken` when the click event is fired, but not more than once every 5 minutes.
 * var throttled = _.throttle(renewToken, 300000, { 'trailing': false });
 * jQuery(element).on('click', throttled);
 *
 * // Cancel the trailing throttled invocation.
 * jQuery(window).on('popstate', throttled.cancel);
 */
function throttle(func, wait, options) {
  var leading = true,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  if (isObject(options)) {
    leading = 'leading' in options ? !!options.leading : leading;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }
  return debounce(func, wait, {
    'leading': leading,
    'maxWait': wait,
    'trailing': trailing
  });
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

module.exports = throttle;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],7:[function(require,module,exports){
var wildcard = require('wildcard');
var reMimePartSplit = /[\/\+\.]/;

/**
  # mime-match

  A simple function to checker whether a target mime type matches a mime-type
  pattern (e.g. image/jpeg matches image/jpeg OR image/*).

  ## Example Usage

  <<< example.js

**/
module.exports = function(target, pattern) {
  function test(pattern) {
    var result = wildcard(pattern, target, reMimePartSplit);

    // ensure that we have a valid mime type (should have two parts)
    return result && result.length >= 2;
  }

  return pattern ? test(pattern.split(';')[0]) : test;
};

},{"wildcard":21}],8:[function(require,module,exports){
/**
* Create an event emitter with namespaces
* @name createNamespaceEmitter
* @example
* var emitter = require('./index')()
*
* emitter.on('*', function () {
*   console.log('all events emitted', this.event)
* })
*
* emitter.on('example', function () {
*   console.log('example event emitted')
* })
*/
module.exports = function createNamespaceEmitter () {
  var emitter = {}
  var _fns = emitter._fns = {}

  /**
  * Emit an event. Optionally namespace the event. Handlers are fired in the order in which they were added with exact matches taking precedence. Separate the namespace and event with a `:`
  * @name emit
  * @param {String} event – the name of the event, with optional namespace
  * @param {...*} data – up to 6 arguments that are passed to the event listener
  * @example
  * emitter.emit('example')
  * emitter.emit('demo:test')
  * emitter.emit('data', { example: true}, 'a string', 1)
  */
  emitter.emit = function emit (event, arg1, arg2, arg3, arg4, arg5, arg6) {
    var toEmit = getListeners(event)

    if (toEmit.length) {
      emitAll(event, toEmit, [arg1, arg2, arg3, arg4, arg5, arg6])
    }
  }

  /**
  * Create en event listener.
  * @name on
  * @param {String} event
  * @param {Function} fn
  * @example
  * emitter.on('example', function () {})
  * emitter.on('demo', function () {})
  */
  emitter.on = function on (event, fn) {
    if (!_fns[event]) {
      _fns[event] = []
    }

    _fns[event].push(fn)
  }

  /**
  * Create en event listener that fires once.
  * @name once
  * @param {String} event
  * @param {Function} fn
  * @example
  * emitter.once('example', function () {})
  * emitter.once('demo', function () {})
  */
  emitter.once = function once (event, fn) {
    function one () {
      fn.apply(this, arguments)
      emitter.off(event, one)
    }
    this.on(event, one)
  }

  /**
  * Stop listening to an event. Stop all listeners on an event by only passing the event name. Stop a single listener by passing that event handler as a callback.
  * You must be explicit about what will be unsubscribed: `emitter.off('demo')` will unsubscribe an `emitter.on('demo')` listener,
  * `emitter.off('demo:example')` will unsubscribe an `emitter.on('demo:example')` listener
  * @name off
  * @param {String} event
  * @param {Function} [fn] – the specific handler
  * @example
  * emitter.off('example')
  * emitter.off('demo', function () {})
  */
  emitter.off = function off (event, fn) {
    var keep = []

    if (event && fn) {
      var fns = this._fns[event]
      var i = 0
      var l = fns.length

      for (i; i < l; i++) {
        if (fns[i] !== fn) {
          keep.push(fns[i])
        }
      }
    }

    keep.length ? this._fns[event] = keep : delete this._fns[event]
  }

  function getListeners (e) {
    var out = _fns[e] ? _fns[e] : []
    var idx = e.indexOf(':')
    var args = (idx === -1) ? [e] : [e.substring(0, idx), e.substring(idx + 1)]

    var keys = Object.keys(_fns)
    var i = 0
    var l = keys.length

    for (i; i < l; i++) {
      var key = keys[i]
      if (key === '*') {
        out = out.concat(_fns[key])
      }

      if (args.length === 2 && args[0] === key) {
        out = out.concat(_fns[key])
        break
      }
    }

    return out
  }

  function emitAll (e, fns, args) {
    var i = 0
    var l = fns.length

    for (i; i < l; i++) {
      if (!fns[i]) break
      fns[i].event = e
      fns[i].apply(fns[i], args)
    }
  }

  return emitter
}

},{}],9:[function(require,module,exports){
!function() {
    'use strict';
    function VNode() {}
    function h(nodeName, attributes) {
        var lastSimple, child, simple, i, children = EMPTY_CHILDREN;
        for (i = arguments.length; i-- > 2; ) stack.push(arguments[i]);
        if (attributes && null != attributes.children) {
            if (!stack.length) stack.push(attributes.children);
            delete attributes.children;
        }
        while (stack.length) if ((child = stack.pop()) && void 0 !== child.pop) for (i = child.length; i--; ) stack.push(child[i]); else {
            if ('boolean' == typeof child) child = null;
            if (simple = 'function' != typeof nodeName) if (null == child) child = ''; else if ('number' == typeof child) child = String(child); else if ('string' != typeof child) simple = !1;
            if (simple && lastSimple) children[children.length - 1] += child; else if (children === EMPTY_CHILDREN) children = [ child ]; else children.push(child);
            lastSimple = simple;
        }
        var p = new VNode();
        p.nodeName = nodeName;
        p.children = children;
        p.attributes = null == attributes ? void 0 : attributes;
        p.key = null == attributes ? void 0 : attributes.key;
        if (void 0 !== options.vnode) options.vnode(p);
        return p;
    }
    function extend(obj, props) {
        for (var i in props) obj[i] = props[i];
        return obj;
    }
    function cloneElement(vnode, props) {
        return h(vnode.nodeName, extend(extend({}, vnode.attributes), props), arguments.length > 2 ? [].slice.call(arguments, 2) : vnode.children);
    }
    function enqueueRender(component) {
        if (!component.__d && (component.__d = !0) && 1 == items.push(component)) (options.debounceRendering || defer)(rerender);
    }
    function rerender() {
        var p, list = items;
        items = [];
        while (p = list.pop()) if (p.__d) renderComponent(p);
    }
    function isSameNodeType(node, vnode, hydrating) {
        if ('string' == typeof vnode || 'number' == typeof vnode) return void 0 !== node.splitText;
        if ('string' == typeof vnode.nodeName) return !node._componentConstructor && isNamedNode(node, vnode.nodeName); else return hydrating || node._componentConstructor === vnode.nodeName;
    }
    function isNamedNode(node, nodeName) {
        return node.__n === nodeName || node.nodeName.toLowerCase() === nodeName.toLowerCase();
    }
    function getNodeProps(vnode) {
        var props = extend({}, vnode.attributes);
        props.children = vnode.children;
        var defaultProps = vnode.nodeName.defaultProps;
        if (void 0 !== defaultProps) for (var i in defaultProps) if (void 0 === props[i]) props[i] = defaultProps[i];
        return props;
    }
    function createNode(nodeName, isSvg) {
        var node = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', nodeName) : document.createElement(nodeName);
        node.__n = nodeName;
        return node;
    }
    function removeNode(node) {
        var parentNode = node.parentNode;
        if (parentNode) parentNode.removeChild(node);
    }
    function setAccessor(node, name, old, value, isSvg) {
        if ('className' === name) name = 'class';
        if ('key' === name) ; else if ('ref' === name) {
            if (old) old(null);
            if (value) value(node);
        } else if ('class' === name && !isSvg) node.className = value || ''; else if ('style' === name) {
            if (!value || 'string' == typeof value || 'string' == typeof old) node.style.cssText = value || '';
            if (value && 'object' == typeof value) {
                if ('string' != typeof old) for (var i in old) if (!(i in value)) node.style[i] = '';
                for (var i in value) node.style[i] = 'number' == typeof value[i] && !1 === IS_NON_DIMENSIONAL.test(i) ? value[i] + 'px' : value[i];
            }
        } else if ('dangerouslySetInnerHTML' === name) {
            if (value) node.innerHTML = value.__html || '';
        } else if ('o' == name[0] && 'n' == name[1]) {
            var useCapture = name !== (name = name.replace(/Capture$/, ''));
            name = name.toLowerCase().substring(2);
            if (value) {
                if (!old) node.addEventListener(name, eventProxy, useCapture);
            } else node.removeEventListener(name, eventProxy, useCapture);
            (node.__l || (node.__l = {}))[name] = value;
        } else if ('list' !== name && 'type' !== name && !isSvg && name in node) {
            setProperty(node, name, null == value ? '' : value);
            if (null == value || !1 === value) node.removeAttribute(name);
        } else {
            var ns = isSvg && name !== (name = name.replace(/^xlink\:?/, ''));
            if (null == value || !1 === value) if (ns) node.removeAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase()); else node.removeAttribute(name); else if ('function' != typeof value) if (ns) node.setAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase(), value); else node.setAttribute(name, value);
        }
    }
    function setProperty(node, name, value) {
        try {
            node[name] = value;
        } catch (e) {}
    }
    function eventProxy(e) {
        return this.__l[e.type](options.event && options.event(e) || e);
    }
    function flushMounts() {
        var c;
        while (c = mounts.pop()) {
            if (options.afterMount) options.afterMount(c);
            if (c.componentDidMount) c.componentDidMount();
        }
    }
    function diff(dom, vnode, context, mountAll, parent, componentRoot) {
        if (!diffLevel++) {
            isSvgMode = null != parent && void 0 !== parent.ownerSVGElement;
            hydrating = null != dom && !('__preactattr_' in dom);
        }
        var ret = idiff(dom, vnode, context, mountAll, componentRoot);
        if (parent && ret.parentNode !== parent) parent.appendChild(ret);
        if (!--diffLevel) {
            hydrating = !1;
            if (!componentRoot) flushMounts();
        }
        return ret;
    }
    function idiff(dom, vnode, context, mountAll, componentRoot) {
        var out = dom, prevSvgMode = isSvgMode;
        if (null == vnode || 'boolean' == typeof vnode) vnode = '';
        if ('string' == typeof vnode || 'number' == typeof vnode) {
            if (dom && void 0 !== dom.splitText && dom.parentNode && (!dom._component || componentRoot)) {
                if (dom.nodeValue != vnode) dom.nodeValue = vnode;
            } else {
                out = document.createTextNode(vnode);
                if (dom) {
                    if (dom.parentNode) dom.parentNode.replaceChild(out, dom);
                    recollectNodeTree(dom, !0);
                }
            }
            out.__preactattr_ = !0;
            return out;
        }
        var vnodeName = vnode.nodeName;
        if ('function' == typeof vnodeName) return buildComponentFromVNode(dom, vnode, context, mountAll);
        isSvgMode = 'svg' === vnodeName ? !0 : 'foreignObject' === vnodeName ? !1 : isSvgMode;
        vnodeName = String(vnodeName);
        if (!dom || !isNamedNode(dom, vnodeName)) {
            out = createNode(vnodeName, isSvgMode);
            if (dom) {
                while (dom.firstChild) out.appendChild(dom.firstChild);
                if (dom.parentNode) dom.parentNode.replaceChild(out, dom);
                recollectNodeTree(dom, !0);
            }
        }
        var fc = out.firstChild, props = out.__preactattr_, vchildren = vnode.children;
        if (null == props) {
            props = out.__preactattr_ = {};
            for (var a = out.attributes, i = a.length; i--; ) props[a[i].name] = a[i].value;
        }
        if (!hydrating && vchildren && 1 === vchildren.length && 'string' == typeof vchildren[0] && null != fc && void 0 !== fc.splitText && null == fc.nextSibling) {
            if (fc.nodeValue != vchildren[0]) fc.nodeValue = vchildren[0];
        } else if (vchildren && vchildren.length || null != fc) innerDiffNode(out, vchildren, context, mountAll, hydrating || null != props.dangerouslySetInnerHTML);
        diffAttributes(out, vnode.attributes, props);
        isSvgMode = prevSvgMode;
        return out;
    }
    function innerDiffNode(dom, vchildren, context, mountAll, isHydrating) {
        var j, c, f, vchild, child, originalChildren = dom.childNodes, children = [], keyed = {}, keyedLen = 0, min = 0, len = originalChildren.length, childrenLen = 0, vlen = vchildren ? vchildren.length : 0;
        if (0 !== len) for (var i = 0; i < len; i++) {
            var _child = originalChildren[i], props = _child.__preactattr_, key = vlen && props ? _child._component ? _child._component.__k : props.key : null;
            if (null != key) {
                keyedLen++;
                keyed[key] = _child;
            } else if (props || (void 0 !== _child.splitText ? isHydrating ? _child.nodeValue.trim() : !0 : isHydrating)) children[childrenLen++] = _child;
        }
        if (0 !== vlen) for (var i = 0; i < vlen; i++) {
            vchild = vchildren[i];
            child = null;
            var key = vchild.key;
            if (null != key) {
                if (keyedLen && void 0 !== keyed[key]) {
                    child = keyed[key];
                    keyed[key] = void 0;
                    keyedLen--;
                }
            } else if (!child && min < childrenLen) for (j = min; j < childrenLen; j++) if (void 0 !== children[j] && isSameNodeType(c = children[j], vchild, isHydrating)) {
                child = c;
                children[j] = void 0;
                if (j === childrenLen - 1) childrenLen--;
                if (j === min) min++;
                break;
            }
            child = idiff(child, vchild, context, mountAll);
            f = originalChildren[i];
            if (child && child !== dom && child !== f) if (null == f) dom.appendChild(child); else if (child === f.nextSibling) removeNode(f); else dom.insertBefore(child, f);
        }
        if (keyedLen) for (var i in keyed) if (void 0 !== keyed[i]) recollectNodeTree(keyed[i], !1);
        while (min <= childrenLen) if (void 0 !== (child = children[childrenLen--])) recollectNodeTree(child, !1);
    }
    function recollectNodeTree(node, unmountOnly) {
        var component = node._component;
        if (component) unmountComponent(component); else {
            if (null != node.__preactattr_ && node.__preactattr_.ref) node.__preactattr_.ref(null);
            if (!1 === unmountOnly || null == node.__preactattr_) removeNode(node);
            removeChildren(node);
        }
    }
    function removeChildren(node) {
        node = node.lastChild;
        while (node) {
            var next = node.previousSibling;
            recollectNodeTree(node, !0);
            node = next;
        }
    }
    function diffAttributes(dom, attrs, old) {
        var name;
        for (name in old) if ((!attrs || null == attrs[name]) && null != old[name]) setAccessor(dom, name, old[name], old[name] = void 0, isSvgMode);
        for (name in attrs) if (!('children' === name || 'innerHTML' === name || name in old && attrs[name] === ('value' === name || 'checked' === name ? dom[name] : old[name]))) setAccessor(dom, name, old[name], old[name] = attrs[name], isSvgMode);
    }
    function collectComponent(component) {
        var name = component.constructor.name;
        (components[name] || (components[name] = [])).push(component);
    }
    function createComponent(Ctor, props, context) {
        var inst, list = components[Ctor.name];
        if (Ctor.prototype && Ctor.prototype.render) {
            inst = new Ctor(props, context);
            Component.call(inst, props, context);
        } else {
            inst = new Component(props, context);
            inst.constructor = Ctor;
            inst.render = doRender;
        }
        if (list) for (var i = list.length; i--; ) if (list[i].constructor === Ctor) {
            inst.__b = list[i].__b;
            list.splice(i, 1);
            break;
        }
        return inst;
    }
    function doRender(props, state, context) {
        return this.constructor(props, context);
    }
    function setComponentProps(component, props, opts, context, mountAll) {
        if (!component.__x) {
            component.__x = !0;
            if (component.__r = props.ref) delete props.ref;
            if (component.__k = props.key) delete props.key;
            if (!component.base || mountAll) {
                if (component.componentWillMount) component.componentWillMount();
            } else if (component.componentWillReceiveProps) component.componentWillReceiveProps(props, context);
            if (context && context !== component.context) {
                if (!component.__c) component.__c = component.context;
                component.context = context;
            }
            if (!component.__p) component.__p = component.props;
            component.props = props;
            component.__x = !1;
            if (0 !== opts) if (1 === opts || !1 !== options.syncComponentUpdates || !component.base) renderComponent(component, 1, mountAll); else enqueueRender(component);
            if (component.__r) component.__r(component);
        }
    }
    function renderComponent(component, opts, mountAll, isChild) {
        if (!component.__x) {
            var rendered, inst, cbase, props = component.props, state = component.state, context = component.context, previousProps = component.__p || props, previousState = component.__s || state, previousContext = component.__c || context, isUpdate = component.base, nextBase = component.__b, initialBase = isUpdate || nextBase, initialChildComponent = component._component, skip = !1;
            if (isUpdate) {
                component.props = previousProps;
                component.state = previousState;
                component.context = previousContext;
                if (2 !== opts && component.shouldComponentUpdate && !1 === component.shouldComponentUpdate(props, state, context)) skip = !0; else if (component.componentWillUpdate) component.componentWillUpdate(props, state, context);
                component.props = props;
                component.state = state;
                component.context = context;
            }
            component.__p = component.__s = component.__c = component.__b = null;
            component.__d = !1;
            if (!skip) {
                rendered = component.render(props, state, context);
                if (component.getChildContext) context = extend(extend({}, context), component.getChildContext());
                var toUnmount, base, childComponent = rendered && rendered.nodeName;
                if ('function' == typeof childComponent) {
                    var childProps = getNodeProps(rendered);
                    inst = initialChildComponent;
                    if (inst && inst.constructor === childComponent && childProps.key == inst.__k) setComponentProps(inst, childProps, 1, context, !1); else {
                        toUnmount = inst;
                        component._component = inst = createComponent(childComponent, childProps, context);
                        inst.__b = inst.__b || nextBase;
                        inst.__u = component;
                        setComponentProps(inst, childProps, 0, context, !1);
                        renderComponent(inst, 1, mountAll, !0);
                    }
                    base = inst.base;
                } else {
                    cbase = initialBase;
                    toUnmount = initialChildComponent;
                    if (toUnmount) cbase = component._component = null;
                    if (initialBase || 1 === opts) {
                        if (cbase) cbase._component = null;
                        base = diff(cbase, rendered, context, mountAll || !isUpdate, initialBase && initialBase.parentNode, !0);
                    }
                }
                if (initialBase && base !== initialBase && inst !== initialChildComponent) {
                    var baseParent = initialBase.parentNode;
                    if (baseParent && base !== baseParent) {
                        baseParent.replaceChild(base, initialBase);
                        if (!toUnmount) {
                            initialBase._component = null;
                            recollectNodeTree(initialBase, !1);
                        }
                    }
                }
                if (toUnmount) unmountComponent(toUnmount);
                component.base = base;
                if (base && !isChild) {
                    var componentRef = component, t = component;
                    while (t = t.__u) (componentRef = t).base = base;
                    base._component = componentRef;
                    base._componentConstructor = componentRef.constructor;
                }
            }
            if (!isUpdate || mountAll) mounts.unshift(component); else if (!skip) {
                if (component.componentDidUpdate) component.componentDidUpdate(previousProps, previousState, previousContext);
                if (options.afterUpdate) options.afterUpdate(component);
            }
            if (null != component.__h) while (component.__h.length) component.__h.pop().call(component);
            if (!diffLevel && !isChild) flushMounts();
        }
    }
    function buildComponentFromVNode(dom, vnode, context, mountAll) {
        var c = dom && dom._component, originalComponent = c, oldDom = dom, isDirectOwner = c && dom._componentConstructor === vnode.nodeName, isOwner = isDirectOwner, props = getNodeProps(vnode);
        while (c && !isOwner && (c = c.__u)) isOwner = c.constructor === vnode.nodeName;
        if (c && isOwner && (!mountAll || c._component)) {
            setComponentProps(c, props, 3, context, mountAll);
            dom = c.base;
        } else {
            if (originalComponent && !isDirectOwner) {
                unmountComponent(originalComponent);
                dom = oldDom = null;
            }
            c = createComponent(vnode.nodeName, props, context);
            if (dom && !c.__b) {
                c.__b = dom;
                oldDom = null;
            }
            setComponentProps(c, props, 1, context, mountAll);
            dom = c.base;
            if (oldDom && dom !== oldDom) {
                oldDom._component = null;
                recollectNodeTree(oldDom, !1);
            }
        }
        return dom;
    }
    function unmountComponent(component) {
        if (options.beforeUnmount) options.beforeUnmount(component);
        var base = component.base;
        component.__x = !0;
        if (component.componentWillUnmount) component.componentWillUnmount();
        component.base = null;
        var inner = component._component;
        if (inner) unmountComponent(inner); else if (base) {
            if (base.__preactattr_ && base.__preactattr_.ref) base.__preactattr_.ref(null);
            component.__b = base;
            removeNode(base);
            collectComponent(component);
            removeChildren(base);
        }
        if (component.__r) component.__r(null);
    }
    function Component(props, context) {
        this.__d = !0;
        this.context = context;
        this.props = props;
        this.state = this.state || {};
    }
    function render(vnode, parent, merge) {
        return diff(merge, vnode, {}, !1, parent, !1);
    }
    var options = {};
    var stack = [];
    var EMPTY_CHILDREN = [];
    var defer = 'function' == typeof Promise ? Promise.resolve().then.bind(Promise.resolve()) : setTimeout;
    var IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i;
    var items = [];
    var mounts = [];
    var diffLevel = 0;
    var isSvgMode = !1;
    var hydrating = !1;
    var components = {};
    extend(Component.prototype, {
        setState: function(state, callback) {
            var s = this.state;
            if (!this.__s) this.__s = extend({}, s);
            extend(s, 'function' == typeof state ? state(s, this.props) : state);
            if (callback) (this.__h = this.__h || []).push(callback);
            enqueueRender(this);
        },
        forceUpdate: function(callback) {
            if (callback) (this.__h = this.__h || []).push(callback);
            renderComponent(this, 2);
        },
        render: function() {}
    });
    var preact = {
        h: h,
        createElement: h,
        cloneElement: cloneElement,
        Component: Component,
        render: render,
        rerender: rerender,
        options: options
    };
    if ('undefined' != typeof module) module.exports = preact; else self.preact = preact;
}();

},{}],10:[function(require,module,exports){
module.exports = prettierBytes

function prettierBytes (num) {
  if (typeof num !== 'number' || isNaN(num)) {
    throw new TypeError('Expected a number, got ' + typeof num)
  }

  var neg = num < 0
  var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  if (neg) {
    num = -num
  }

  if (num < 1) {
    return (neg ? '-' : '') + num + ' B'
  }

  var exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1)
  num = Number(num / Math.pow(1000, exponent))
  var unit = units[exponent]

  if (num >= 10 || num % 1 === 0) {
    // Do not show decimals when the number is two-digit, or if the number has no
    // decimal component.
    return (neg ? '-' : '') + num.toFixed(0) + ' ' + unit
  } else {
    return (neg ? '-' : '') + num.toFixed(1) + ' ' + unit
  }
}

},{}],11:[function(require,module,exports){
// Copyright 2014 Simon Lydell
// X11 (“MIT”) Licensed. (See LICENSE.)

void (function(root, factory) {
  if (typeof define === "function" && define.amd) {
    define(factory)
  } else if (typeof exports === "object") {
    module.exports = factory()
  } else {
    root.resolveUrl = factory()
  }
}(this, function() {

  function resolveUrl(/* ...urls */) {
    var numUrls = arguments.length

    if (numUrls === 0) {
      throw new Error("resolveUrl requires at least one argument; got none.")
    }

    var base = document.createElement("base")
    base.href = arguments[0]

    if (numUrls === 1) {
      return base.href
    }

    var head = document.getElementsByTagName("head")[0]
    head.insertBefore(base, head.firstChild)

    var a = document.createElement("a")
    var resolved

    for (var index = 1; index < numUrls; index++) {
      a.href = arguments[index]
      resolved = a.href
      base.href = resolved
    }

    head.removeChild(base)

    return resolved
  }

  return resolveUrl

}));

},{}],12:[function(require,module,exports){
// Generated by Babel
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encode = encode;
/* global: window */

var _window = window;
var btoa = _window.btoa;
function encode(data) {
  return btoa(unescape(encodeURIComponent(data)));
}

var isSupported = exports.isSupported = "btoa" in window;
},{}],13:[function(require,module,exports){
// Generated by Babel
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.newRequest = newRequest;
exports.resolveUrl = resolveUrl;

var _resolveUrl = require("resolve-url");

var _resolveUrl2 = _interopRequireDefault(_resolveUrl);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function newRequest() {
  return new window.XMLHttpRequest();
} /* global window */


function resolveUrl(origin, link) {
  return (0, _resolveUrl2.default)(origin, link);
}
},{"resolve-url":11}],14:[function(require,module,exports){
// Generated by Babel
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getSource = getSource;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var FileSource = function () {
  function FileSource(file) {
    _classCallCheck(this, FileSource);

    this._file = file;
    this.size = file.size;
  }

  _createClass(FileSource, [{
    key: "slice",
    value: function slice(start, end) {
      return this._file.slice(start, end);
    }
  }, {
    key: "close",
    value: function close() {}
  }]);

  return FileSource;
}();

function getSource(input) {
  // Since we emulate the Blob type in our tests (not all target browsers
  // support it), we cannot use `instanceof` for testing whether the input value
  // can be handled. Instead, we simply check is the slice() function and the
  // size property are available.
  if (typeof input.slice === "function" && typeof input.size !== "undefined") {
    return new FileSource(input);
  }

  throw new Error("source object may only be an instance of File or Blob in this environment");
}
},{}],15:[function(require,module,exports){
// Generated by Babel
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setItem = setItem;
exports.getItem = getItem;
exports.removeItem = removeItem;
/* global window, localStorage */

var hasStorage = false;
try {
  hasStorage = "localStorage" in window;

  // Attempt to store and read entries from the local storage to detect Private
  // Mode on Safari on iOS (see #49)
  var key = "tusSupport";
  localStorage.setItem(key, localStorage.getItem(key));
} catch (e) {
  // If we try to access localStorage inside a sandboxed iframe, a SecurityError
  // is thrown. When in private mode on iOS Safari, a QuotaExceededError is
  // thrown (see #49)
  if (e.code === e.SECURITY_ERR || e.code === e.QUOTA_EXCEEDED_ERR) {
    hasStorage = false;
  } else {
    throw e;
  }
}

var canStoreURLs = exports.canStoreURLs = hasStorage;

function setItem(key, value) {
  if (!hasStorage) return;
  return localStorage.setItem(key, value);
}

function getItem(key) {
  if (!hasStorage) return;
  return localStorage.getItem(key);
}

function removeItem(key) {
  if (!hasStorage) return;
  return localStorage.removeItem(key);
}
},{}],16:[function(require,module,exports){
// Generated by Babel
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DetailedError = function (_Error) {
  _inherits(DetailedError, _Error);

  function DetailedError(error) {
    var causingErr = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
    var xhr = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

    _classCallCheck(this, DetailedError);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(DetailedError).call(this, error.message));

    _this.originalRequest = xhr;
    _this.causingError = causingErr;

    var message = error.message;
    if (causingErr != null) {
      message += ", caused by " + causingErr.toString();
    }
    if (xhr != null) {
      message += ", originated from request (response code: " + xhr.status + ", response text: " + xhr.responseText + ")";
    }
    _this.message = message;
    return _this;
  }

  return DetailedError;
}(Error);

exports.default = DetailedError;
},{}],17:[function(require,module,exports){
// Generated by Babel
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = fingerprint;
/**
 * Generate a fingerprint for a file which will be used the store the endpoint
 *
 * @param {File} file
 * @return {String}
 */
function fingerprint(file) {
  return ["tus", file.name, file.type, file.size, file.lastModified].join("-");
}
},{}],18:[function(require,module,exports){
// Generated by Babel
"use strict";

var _upload = require("./upload");

var _upload2 = _interopRequireDefault(_upload);

var _storage = require("./node/storage");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* global window */
var defaultOptions = _upload2.default.defaultOptions;


if (typeof window !== "undefined") {
  // Browser environment using XMLHttpRequest
  var _window = window;
  var XMLHttpRequest = _window.XMLHttpRequest;
  var Blob = _window.Blob;


  var isSupported = XMLHttpRequest && Blob && typeof Blob.prototype.slice === "function";
} else {
  // Node.js environment using http module
  var isSupported = true;
}

// The usage of the commonjs exporting syntax instead of the new ECMAScript
// one is actually inteded and prevents weird behaviour if we are trying to
// import this module in another module using Babel.
module.exports = {
  Upload: _upload2.default,
  isSupported: isSupported,
  canStoreURLs: _storage.canStoreURLs,
  defaultOptions: defaultOptions
};
},{"./node/storage":15,"./upload":19}],19:[function(require,module,exports){
// Generated by Babel
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /* global window */


// We import the files used inside the Node environment which are rewritten
// for browsers using the rules defined in the package.json


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _fingerprint = require("./fingerprint");

var _fingerprint2 = _interopRequireDefault(_fingerprint);

var _error = require("./error");

var _error2 = _interopRequireDefault(_error);

var _extend = require("extend");

var _extend2 = _interopRequireDefault(_extend);

var _request = require("./node/request");

var _source = require("./node/source");

var _base = require("./node/base64");

var Base64 = _interopRequireWildcard(_base);

var _storage = require("./node/storage");

var Storage = _interopRequireWildcard(_storage);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var defaultOptions = {
  endpoint: "",
  fingerprint: _fingerprint2.default,
  resume: true,
  onProgress: null,
  onChunkComplete: null,
  onSuccess: null,
  onError: null,
  headers: {},
  chunkSize: Infinity,
  withCredentials: false,
  uploadUrl: null,
  uploadSize: null,
  overridePatchMethod: false,
  retryDelays: null
};

var Upload = function () {
  function Upload(file, options) {
    _classCallCheck(this, Upload);

    this.options = (0, _extend2.default)(true, {}, defaultOptions, options);

    // The underlying File/Blob object
    this.file = file;

    // The URL against which the file will be uploaded
    this.url = null;

    // The underlying XHR object for the current PATCH request
    this._xhr = null;

    // The fingerpinrt for the current file (set after start())
    this._fingerprint = null;

    // The offset used in the current PATCH request
    this._offset = null;

    // True if the current PATCH request has been aborted
    this._aborted = false;

    // The file's size in bytes
    this._size = null;

    // The Source object which will wrap around the given file and provides us
    // with a unified interface for getting its size and slice chunks from its
    // content allowing us to easily handle Files, Blobs, Buffers and Streams.
    this._source = null;

    // The current count of attempts which have been made. Null indicates none.
    this._retryAttempt = 0;

    // The timeout's ID which is used to delay the next retry
    this._retryTimeout = null;

    // The offset of the remote upload before the latest attempt was started.
    this._offsetBeforeRetry = 0;
  }

  _createClass(Upload, [{
    key: "start",
    value: function start() {
      var _this = this;

      var file = this.file;

      if (!file) {
        this._emitError(new Error("tus: no file or stream to upload provided"));
        return;
      }

      if (!this.options.endpoint) {
        this._emitError(new Error("tus: no endpoint provided"));
        return;
      }

      var source = this._source = (0, _source.getSource)(file, this.options.chunkSize);

      // Firstly, check if the caller has supplied a manual upload size or else
      // we will use the calculated size by the source object.
      if (this.options.uploadSize != null) {
        var size = +this.options.uploadSize;
        if (isNaN(size)) {
          throw new Error("tus: cannot convert `uploadSize` option into a number");
        }

        this._size = size;
      } else {
        var size = source.size;

        // The size property will be null if we cannot calculate the file's size,
        // for example if you handle a stream.
        if (size == null) {
          throw new Error("tus: cannot automatically derive upload's size from input and must be specified manually using the `uploadSize` option");
        }

        this._size = size;
      }

      var retryDelays = this.options.retryDelays;
      if (retryDelays != null) {
        if (Object.prototype.toString.call(retryDelays) !== "[object Array]") {
          throw new Error("tus: the `retryDelays` option must either be an array or null");
        } else {
          (function () {
            var errorCallback = _this.options.onError;
            _this.options.onError = function (err) {
              // Restore the original error callback which may have been set.
              _this.options.onError = errorCallback;

              // We will reset the attempt counter if
              // - we were already able to connect to the server (offset != null) and
              // - we were able to upload a small chunk of data to the server
              var shouldResetDelays = _this._offset != null && _this._offset > _this._offsetBeforeRetry;
              if (shouldResetDelays) {
                _this._retryAttempt = 0;
              }

              var isOnline = true;
              if (typeof window !== "undefined" && "navigator" in window && window.navigator.onLine === false) {
                isOnline = false;
              }

              // We only attempt a retry if
              // - we didn't exceed the maxium number of retries, yet, and
              // - this error was caused by a request or it's response and
              // - the error is not a client error (status 4xx) and
              // - the browser does not indicate that we are offline
              var shouldRetry = _this._retryAttempt < retryDelays.length && err.originalRequest != null && !inStatusCategory(err.originalRequest.status, 400) && isOnline;

              if (!shouldRetry) {
                _this._emitError(err);
                return;
              }

              var delay = retryDelays[_this._retryAttempt++];

              _this._offsetBeforeRetry = _this._offset;
              _this.options.uploadUrl = _this.url;

              _this._retryTimeout = setTimeout(function () {
                _this.start();
              }, delay);
            };
          })();
        }
      }

      // Reset the aborted flag when the upload is started or else the
      // _startUpload will stop before sending a request if the upload has been
      // aborted previously.
      this._aborted = false;

      // The upload had been started previously and we should reuse this URL.
      if (this.url != null) {
        this._resumeUpload();
        return;
      }

      // A URL has manually been specified, so we try to resume
      if (this.options.uploadUrl != null) {
        this.url = this.options.uploadUrl;
        this._resumeUpload();
        return;
      }

      // Try to find the endpoint for the file in the storage
      if (this.options.resume) {
        this._fingerprint = this.options.fingerprint(file);
        var resumedUrl = Storage.getItem(this._fingerprint);

        if (resumedUrl != null) {
          this.url = resumedUrl;
          this._resumeUpload();
          return;
        }
      }

      // An upload has not started for the file yet, so we start a new one
      this._createUpload();
    }
  }, {
    key: "abort",
    value: function abort() {
      if (this._xhr !== null) {
        this._xhr.abort();
        this._source.close();
        this._aborted = true;
      }

      if (this._retryTimeout != null) {
        clearTimeout(this._retryTimeout);
        this._retryTimeout = null;
      }
    }
  }, {
    key: "_emitXhrError",
    value: function _emitXhrError(xhr, err, causingErr) {
      this._emitError(new _error2.default(err, causingErr, xhr));
    }
  }, {
    key: "_emitError",
    value: function _emitError(err) {
      if (typeof this.options.onError === "function") {
        this.options.onError(err);
      } else {
        throw err;
      }
    }
  }, {
    key: "_emitSuccess",
    value: function _emitSuccess() {
      if (typeof this.options.onSuccess === "function") {
        this.options.onSuccess();
      }
    }

    /**
     * Publishes notification when data has been sent to the server. This
     * data may not have been accepted by the server yet.
     * @param  {number} bytesSent  Number of bytes sent to the server.
     * @param  {number} bytesTotal Total number of bytes to be sent to the server.
     */

  }, {
    key: "_emitProgress",
    value: function _emitProgress(bytesSent, bytesTotal) {
      if (typeof this.options.onProgress === "function") {
        this.options.onProgress(bytesSent, bytesTotal);
      }
    }

    /**
     * Publishes notification when a chunk of data has been sent to the server
     * and accepted by the server.
     * @param  {number} chunkSize  Size of the chunk that was accepted by the
     *                             server.
     * @param  {number} bytesAccepted Total number of bytes that have been
     *                                accepted by the server.
     * @param  {number} bytesTotal Total number of bytes to be sent to the server.
     */

  }, {
    key: "_emitChunkComplete",
    value: function _emitChunkComplete(chunkSize, bytesAccepted, bytesTotal) {
      if (typeof this.options.onChunkComplete === "function") {
        this.options.onChunkComplete(chunkSize, bytesAccepted, bytesTotal);
      }
    }

    /**
     * Set the headers used in the request and the withCredentials property
     * as defined in the options
     *
     * @param {XMLHttpRequest} xhr
     */

  }, {
    key: "_setupXHR",
    value: function _setupXHR(xhr) {
      this._xhr = xhr;

      xhr.setRequestHeader("Tus-Resumable", "1.0.0");
      var headers = this.options.headers;

      for (var name in headers) {
        xhr.setRequestHeader(name, headers[name]);
      }

      xhr.withCredentials = this.options.withCredentials;
    }

    /**
     * Create a new upload using the creation extension by sending a POST
     * request to the endpoint. After successful creation the file will be
     * uploaded
     *
     * @api private
     */

  }, {
    key: "_createUpload",
    value: function _createUpload() {
      var _this2 = this;

      var xhr = (0, _request.newRequest)();
      xhr.open("POST", this.options.endpoint, true);

      xhr.onload = function () {
        if (!inStatusCategory(xhr.status, 200)) {
          _this2._emitXhrError(xhr, new Error("tus: unexpected response while creating upload"));
          return;
        }

        var location = xhr.getResponseHeader("Location");
        if (location == null) {
          _this2._emitXhrError(xhr, new Error("tus: invalid or missing Location header"));
          return;
        }

        _this2.url = (0, _request.resolveUrl)(_this2.options.endpoint, location);

        if (_this2.options.resume) {
          Storage.setItem(_this2._fingerprint, _this2.url);
        }

        _this2._offset = 0;
        _this2._startUpload();
      };

      xhr.onerror = function (err) {
        _this2._emitXhrError(xhr, new Error("tus: failed to create upload"), err);
      };

      this._setupXHR(xhr);
      xhr.setRequestHeader("Upload-Length", this._size);

      // Add metadata if values have been added
      var metadata = encodeMetadata(this.options.metadata);
      if (metadata !== "") {
        xhr.setRequestHeader("Upload-Metadata", metadata);
      }

      xhr.send(null);
    }

    /*
     * Try to resume an existing upload. First a HEAD request will be sent
     * to retrieve the offset. If the request fails a new upload will be
     * created. In the case of a successful response the file will be uploaded.
     *
     * @api private
     */

  }, {
    key: "_resumeUpload",
    value: function _resumeUpload() {
      var _this3 = this;

      var xhr = (0, _request.newRequest)();
      xhr.open("HEAD", this.url, true);

      xhr.onload = function () {
        if (!inStatusCategory(xhr.status, 200)) {
          if (_this3.options.resume && inStatusCategory(xhr.status, 400)) {
            // Remove stored fingerprint and corresponding endpoint,
            // on client errors since the file can not be found
            Storage.removeItem(_this3._fingerprint);
          }

          // If the upload is locked (indicated by the 423 Locked status code), we
          // emit an error instead of directly starting a new upload. This way the
          // retry logic can catch the error and will retry the upload. An upload
          // is usually locked for a short period of time and will be available
          // afterwards.
          if (xhr.status === 423) {
            _this3._emitXhrError(xhr, new Error("tus: upload is currently locked; retry later"));
            return;
          }

          // Try to create a new upload
          _this3.url = null;
          _this3._createUpload();
          return;
        }

        var offset = parseInt(xhr.getResponseHeader("Upload-Offset"), 10);
        if (isNaN(offset)) {
          _this3._emitXhrError(xhr, new Error("tus: invalid or missing offset value"));
          return;
        }

        var length = parseInt(xhr.getResponseHeader("Upload-Length"), 10);
        if (isNaN(length)) {
          _this3._emitXhrError(xhr, new Error("tus: invalid or missing length value"));
          return;
        }

        // Upload has already been completed and we do not need to send additional
        // data to the server
        if (offset === length) {
          _this3._emitProgress(length, length);
          _this3._emitSuccess();
          return;
        }

        _this3._offset = offset;
        _this3._startUpload();
      };

      xhr.onerror = function (err) {
        _this3._emitXhrError(xhr, new Error("tus: failed to resume upload"), err);
      };

      this._setupXHR(xhr);
      xhr.send(null);
    }

    /**
     * Start uploading the file using PATCH requests. The file will be divided
     * into chunks as specified in the chunkSize option. During the upload
     * the onProgress event handler may be invoked multiple times.
     *
     * @api private
     */

  }, {
    key: "_startUpload",
    value: function _startUpload() {
      var _this4 = this;

      // If the upload has been aborted, we will not send the next PATCH request.
      // This is important if the abort method was called during a callback, such
      // as onChunkComplete or onProgress.
      if (this._aborted) {
        return;
      }

      var xhr = (0, _request.newRequest)();

      // Some browser and servers may not support the PATCH method. For those
      // cases, you can tell tus-js-client to use a POST request with the
      // X-HTTP-Method-Override header for simulating a PATCH request.
      if (this.options.overridePatchMethod) {
        xhr.open("POST", this.url, true);
        xhr.setRequestHeader("X-HTTP-Method-Override", "PATCH");
      } else {
        xhr.open("PATCH", this.url, true);
      }

      xhr.onload = function () {
        if (!inStatusCategory(xhr.status, 200)) {
          _this4._emitXhrError(xhr, new Error("tus: unexpected response while uploading chunk"));
          return;
        }

        var offset = parseInt(xhr.getResponseHeader("Upload-Offset"), 10);
        if (isNaN(offset)) {
          _this4._emitXhrError(xhr, new Error("tus: invalid or missing offset value"));
          return;
        }

        _this4._emitProgress(offset, _this4._size);
        _this4._emitChunkComplete(offset - _this4._offset, offset, _this4._size);

        _this4._offset = offset;

        if (offset == _this4._size) {
          // Yay, finally done :)
          _this4._emitSuccess();
          _this4._source.close();
          return;
        }

        _this4._startUpload();
      };

      xhr.onerror = function (err) {
        // Don't emit an error if the upload was aborted manually
        if (_this4._aborted) {
          return;
        }

        _this4._emitXhrError(xhr, new Error("tus: failed to upload chunk at offset " + _this4._offset), err);
      };

      // Test support for progress events before attaching an event listener
      if ("upload" in xhr) {
        xhr.upload.onprogress = function (e) {
          if (!e.lengthComputable) {
            return;
          }

          _this4._emitProgress(start + e.loaded, _this4._size);
        };
      }

      this._setupXHR(xhr);

      xhr.setRequestHeader("Upload-Offset", this._offset);
      xhr.setRequestHeader("Content-Type", "application/offset+octet-stream");

      var start = this._offset;
      var end = this._offset + this.options.chunkSize;

      // The specified chunkSize may be Infinity or the calcluated end position
      // may exceed the file's size. In both cases, we limit the end position to
      // the input's total size for simpler calculations and correctness.
      if (end === Infinity || end > this._size) {
        end = this._size;
      }

      xhr.send(this._source.slice(start, end));

      // Emit an progress event when a new chunk begins being uploaded.
      this._emitProgress(this._offset, this._size);
    }
  }]);

  return Upload;
}();

function encodeMetadata(metadata) {
  if (!Base64.isSupported) {
    return "";
  }

  var encoded = [];

  for (var key in metadata) {
    encoded.push(key + " " + Base64.encode(metadata[key]));
  }

  return encoded.join(",");
}

/**
 * Checks whether a given status is in the range of the expected category.
 * For example, only a status between 200 and 299 will satisfy the category 200.
 *
 * @api private
 */
function inStatusCategory(status, category) {
  return status >= category && status < category + 100;
}

Upload.defaultOptions = defaultOptions;

exports.default = Upload;
},{"./error":16,"./fingerprint":17,"./node/base64":12,"./node/request":13,"./node/source":14,"./node/storage":15,"extend":5}],20:[function(require,module,exports){
(function(self) {
  'use strict';

  if (self.fetch) {
    return
  }

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob()
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ]

    var isDataView = function(obj) {
      return obj && DataView.prototype.isPrototypeOf(obj)
    }

    var isArrayBufferView = ArrayBuffer.isView || function(obj) {
      return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
    }
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name)
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value)
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift()
        return {done: value === undefined, value: value}
      }
    }

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      }
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {}

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value)
      }, this)
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1])
      }, this)
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name])
      }, this)
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var oldValue = this.map[name]
    this.map[name] = oldValue ? oldValue+','+value : value
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    name = normalizeName(name)
    return this.has(name) ? this.map[name] : null
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value)
  }

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this)
      }
    }
  }

  Headers.prototype.keys = function() {
    var items = []
    this.forEach(function(value, name) { items.push(name) })
    return iteratorFor(items)
  }

  Headers.prototype.values = function() {
    var items = []
    this.forEach(function(value) { items.push(value) })
    return iteratorFor(items)
  }

  Headers.prototype.entries = function() {
    var items = []
    this.forEach(function(value, name) { items.push([name, value]) })
    return iteratorFor(items)
  }

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsArrayBuffer(blob)
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsText(blob)
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf)
    var chars = new Array(view.length)

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i])
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength)
      view.set(new Uint8Array(buf))
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false

    this._initBody = function(body) {
      this._bodyInit = body
      if (!body) {
        this._bodyText = ''
      } else if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString()
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer)
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer])
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body)
      } else {
        throw new Error('unsupported BodyInit type')
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8')
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type)
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
        }
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      }
    }

    this.text = function() {
      var rejected = consumed(this)
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(input, options) {
    options = options || {}
    var body = options.body

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url
      this.credentials = input.credentials
      if (!options.headers) {
        this.headers = new Headers(input.headers)
      }
      this.method = input.method
      this.mode = input.mode
      if (!body && input._bodyInit != null) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      this.url = String(input)
    }

    this.credentials = options.credentials || this.credentials || 'omit'
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers)
    }
    this.method = normalizeMethod(options.method || this.method || 'GET')
    this.mode = options.mode || this.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body)
  }

  Request.prototype.clone = function() {
    return new Request(this, { body: this._bodyInit })
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers()
    rawHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':')
      var key = parts.shift().trim()
      if (key) {
        var value = parts.join(':').trim()
        headers.append(key, value)
      }
    })
    return headers
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this.type = 'default'
    this.status = 'status' in options ? options.status : 200
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = 'statusText' in options ? options.statusText : 'OK'
    this.headers = new Headers(options.headers)
    this.url = options.url || ''
    this._initBody(bodyInit)
  }

  Body.call(Response.prototype)

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  }

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''})
    response.type = 'error'
    return response
  }

  var redirectStatuses = [301, 302, 303, 307, 308]

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  }

  self.Headers = Headers
  self.Request = Request
  self.Response = Response

  self.fetch = function(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init)
      var xhr = new XMLHttpRequest()

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        }
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL')
        var body = 'response' in xhr ? xhr.response : xhr.responseText
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if (request.credentials === 'include') {
        xhr.withCredentials = true
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value)
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})(typeof self !== 'undefined' ? self : this);

},{}],21:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  # wildcard

  Very simple wildcard matching, which is designed to provide the same
  functionality that is found in the
  [eve](https://github.com/adobe-webplatform/eve) eventing library.

  ## Usage

  It works with strings:

  <<< examples/strings.js

  Arrays:

  <<< examples/arrays.js

  Objects (matching against keys):

  <<< examples/objects.js

  While the library works in Node, if you are are looking for file-based
  wildcard matching then you should have a look at:

  <https://github.com/isaacs/node-glob>
**/

function WildcardMatcher(text, separator) {
  this.text = text = text || '';
  this.hasWild = ~text.indexOf('*');
  this.separator = separator;
  this.parts = text.split(separator);
}

WildcardMatcher.prototype.match = function(input) {
  var matches = true;
  var parts = this.parts;
  var ii;
  var partsCount = parts.length;
  var testParts;

  if (typeof input == 'string' || input instanceof String) {
    if (!this.hasWild && this.text != input) {
      matches = false;
    } else {
      testParts = (input || '').split(this.separator);
      for (ii = 0; matches && ii < partsCount; ii++) {
        if (parts[ii] === '*')  {
          continue;
        } else if (ii < testParts.length) {
          matches = parts[ii] === testParts[ii];
        } else {
          matches = false;
        }
      }

      // If matches, then return the component parts
      matches = matches && testParts;
    }
  }
  else if (typeof input.splice == 'function') {
    matches = [];

    for (ii = input.length; ii--; ) {
      if (this.match(input[ii])) {
        matches[matches.length] = input[ii];
      }
    }
  }
  else if (typeof input == 'object') {
    matches = {};

    for (var key in input) {
      if (this.match(key)) {
        matches[key] = input[key];
      }
    }
  }

  return matches;
};

module.exports = function(text, test, separator) {
  var matcher = new WildcardMatcher(text, separator || /[\/\.]/);
  if (typeof test != 'undefined') {
    return matcher.match(test);
  }

  return matcher;
};

},{}],22:[function(require,module,exports){
(function (global){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _Promise = typeof Promise === 'undefined' ? require('es6-promise').Promise : Promise;

var Utils = require('../core/Utils');
var Translator = require('../core/Translator');
var ee = require('namespace-emitter');
var cuid = require('cuid');
var throttle = require('lodash.throttle');
var prettyBytes = require('prettier-bytes');
var match = require('mime-match');
var DefaultStore = require('../store/DefaultStore');

/**
 * Uppy Core module.
 * Manages plugins, state updates, acts as an event bus,
 * adds/removes files and metadata.
 *
 * @param {object} opts — Uppy options
 */

var Uppy = function () {
  function Uppy(opts) {
    var _this = this;

    _classCallCheck(this, Uppy);

    var defaultLocale = {
      strings: {
        youCanOnlyUploadX: {
          0: 'You can only upload %{smart_count} file',
          1: 'You can only upload %{smart_count} files'
        },
        youHaveToAtLeastSelectX: {
          0: 'You have to select at least %{smart_count} file',
          1: 'You have to select at least %{smart_count} files'
        },
        exceedsSize: 'This file exceeds maximum allowed size of',
        youCanOnlyUploadFileTypes: 'You can only upload:',
        uppyServerError: 'Connection with Uppy Server failed'
      }

      // set default options
    };var defaultOptions = {
      id: 'uppy',
      autoProceed: true,
      debug: false,
      restrictions: {
        maxFileSize: false,
        maxNumberOfFiles: false,
        minNumberOfFiles: false,
        allowedFileTypes: false
      },
      meta: {},
      onBeforeFileAdded: function onBeforeFileAdded(currentFile, files) {
        return _Promise.resolve();
      },
      onBeforeUpload: function onBeforeUpload(files) {
        return _Promise.resolve();
      },
      locale: defaultLocale,
      store: new DefaultStore()

      // Merge default options with the ones set by user
    };this.opts = _extends({}, defaultOptions, opts);
    this.opts.restrictions = _extends({}, defaultOptions.restrictions, this.opts.restrictions);

    this.locale = _extends({}, defaultLocale, this.opts.locale);
    this.locale.strings = _extends({}, defaultLocale.strings, this.opts.locale.strings);

    // i18n
    this.translator = new Translator({ locale: this.locale });
    this.i18n = this.translator.translate.bind(this.translator);

    // Container for different types of plugins
    this.plugins = {};

    this.getState = this.getState.bind(this);
    this.getPlugin = this.getPlugin.bind(this);
    this.setFileMeta = this.setFileMeta.bind(this);
    this.setFileState = this.setFileState.bind(this);
    this.log = this.log.bind(this);
    this.info = this.info.bind(this);
    this.hideInfo = this.hideInfo.bind(this);
    this.addFile = this.addFile.bind(this);
    this.removeFile = this.removeFile.bind(this);
    this.pauseResume = this.pauseResume.bind(this);
    this._calculateProgress = this._calculateProgress.bind(this);
    this.updateOnlineStatus = this.updateOnlineStatus.bind(this);
    this.resetProgress = this.resetProgress.bind(this);

    this.pauseAll = this.pauseAll.bind(this);
    this.resumeAll = this.resumeAll.bind(this);
    this.retryAll = this.retryAll.bind(this);
    this.cancelAll = this.cancelAll.bind(this);
    this.retryUpload = this.retryUpload.bind(this);
    this.upload = this.upload.bind(this);

    this.emitter = ee();
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    this.once = this.emitter.once.bind(this.emitter);
    this.emit = this.emitter.emit.bind(this.emitter);

    this.preProcessors = [];
    this.uploaders = [];
    this.postProcessors = [];

    this.store = this.opts.store;
    this.setState({
      plugins: {},
      files: {},
      currentUploads: {},
      capabilities: {
        resumableUploads: false
      },
      totalProgress: 0,
      meta: _extends({}, this.opts.meta),
      info: {
        isHidden: true,
        type: 'info',
        message: ''
      }
    });

    this._storeUnsubscribe = this.store.subscribe(function (prevState, nextState, patch) {
      _this.emit('state-update', prevState, nextState, patch);
      _this.updateAll(nextState);
    });

    // for debugging and testing
    // this.updateNum = 0
    if (this.opts.debug) {
      global.uppyLog = '';
      global[this.opts.id] = this;
    }
  }

  Uppy.prototype.on = function on(event, callback) {
    this.emitter.on(event, callback);
    return this;
  };

  Uppy.prototype.off = function off(event, callback) {
    this.emitter.off(event, callback);
    return this;
  };

  /**
   * Iterate on all plugins and run `update` on them.
   * Called each time state changes.
   *
   */


  Uppy.prototype.updateAll = function updateAll(state) {
    this.iteratePlugins(function (plugin) {
      plugin.update(state);
    });
  };

  /**
   * Updates state
   *
   * @param {patch} object
   */


  Uppy.prototype.setState = function setState(patch) {
    this.store.setState(patch);
  };

  /**
   * Returns current state.
   */


  Uppy.prototype.getState = function getState() {
    return this.store.getState();
  };

  /**
  * Back compat for when this.state is used instead of this.getState().
  */


  /**
  * Shorthand to set state for a specific file.
  */
  Uppy.prototype.setFileState = function setFileState(fileID, state) {
    var _extends2;

    this.setState({
      files: _extends({}, this.getState().files, (_extends2 = {}, _extends2[fileID] = _extends({}, this.getState().files[fileID], state), _extends2))
    });
  };

  Uppy.prototype.resetProgress = function resetProgress() {
    var defaultProgress = {
      percentage: 0,
      bytesUploaded: 0,
      uploadComplete: false,
      uploadStarted: false
    };
    var files = _extends({}, this.getState().files);
    var updatedFiles = {};
    Object.keys(files).forEach(function (fileID) {
      var updatedFile = _extends({}, files[fileID]);
      updatedFile.progress = _extends({}, updatedFile.progress, defaultProgress);
      updatedFiles[fileID] = updatedFile;
    });

    this.setState({
      files: updatedFiles,
      totalProgress: 0
    });

    // TODO Document on the website
    this.emit('reset-progress');
  };

  Uppy.prototype.addPreProcessor = function addPreProcessor(fn) {
    this.preProcessors.push(fn);
  };

  Uppy.prototype.removePreProcessor = function removePreProcessor(fn) {
    var i = this.preProcessors.indexOf(fn);
    if (i !== -1) {
      this.preProcessors.splice(i, 1);
    }
  };

  Uppy.prototype.addPostProcessor = function addPostProcessor(fn) {
    this.postProcessors.push(fn);
  };

  Uppy.prototype.removePostProcessor = function removePostProcessor(fn) {
    var i = this.postProcessors.indexOf(fn);
    if (i !== -1) {
      this.postProcessors.splice(i, 1);
    }
  };

  Uppy.prototype.addUploader = function addUploader(fn) {
    this.uploaders.push(fn);
  };

  Uppy.prototype.removeUploader = function removeUploader(fn) {
    var i = this.uploaders.indexOf(fn);
    if (i !== -1) {
      this.uploaders.splice(i, 1);
    }
  };

  Uppy.prototype.setMeta = function setMeta(data) {
    var updatedMeta = _extends({}, this.getState().meta, data);
    var updatedFiles = _extends({}, this.getState().files);

    Object.keys(updatedFiles).forEach(function (fileID) {
      updatedFiles[fileID] = _extends({}, updatedFiles[fileID], {
        meta: _extends({}, updatedFiles[fileID].meta, data)
      });
    });

    this.log('Adding metadata:');
    this.log(data);

    this.setState({
      meta: updatedMeta,
      files: updatedFiles
    });
  };

  Uppy.prototype.setFileMeta = function setFileMeta(fileID, data) {
    var updatedFiles = _extends({}, this.getState().files);
    if (!updatedFiles[fileID]) {
      this.log('Was trying to set metadata for a file that’s not with us anymore: ', fileID);
      return;
    }
    var newMeta = _extends({}, updatedFiles[fileID].meta, data);
    updatedFiles[fileID] = _extends({}, updatedFiles[fileID], {
      meta: newMeta
    });
    this.setState({ files: updatedFiles });
  };

  /**
   * Get a file object.
   *
   * @param {string} fileID The ID of the file object to return.
   */


  Uppy.prototype.getFile = function getFile(fileID) {
    return this.getState().files[fileID];
  };

  /**
  * Check if minNumberOfFiles restriction is reached before uploading.
  *
  * @return {boolean}
  * @private
  */


  Uppy.prototype._checkMinNumberOfFiles = function _checkMinNumberOfFiles() {
    var minNumberOfFiles = this.opts.restrictions.minNumberOfFiles;

    if (Object.keys(this.getState().files).length < minNumberOfFiles) {
      throw new Error('' + this.i18n('youHaveToAtLeastSelectX', { smart_count: minNumberOfFiles }));
    }
  };

  /**
  * Check if file passes a set of restrictions set in options: maxFileSize,
  * maxNumberOfFiles and allowedFileTypes.
  *
  * @param {object} file object to check
  * @private
  */


  Uppy.prototype._checkRestrictions = function _checkRestrictions(file) {
    var _opts$restrictions = this.opts.restrictions,
        maxFileSize = _opts$restrictions.maxFileSize,
        maxNumberOfFiles = _opts$restrictions.maxNumberOfFiles,
        allowedFileTypes = _opts$restrictions.allowedFileTypes;


    if (maxNumberOfFiles) {
      if (Object.keys(this.getState().files).length + 1 > maxNumberOfFiles) {
        throw new Error('' + this.i18n('youCanOnlyUploadX', { smart_count: maxNumberOfFiles }));
      }
    }

    if (allowedFileTypes) {
      var isCorrectFileType = allowedFileTypes.filter(function (type) {
        if (!file.type) return false;
        return match(file.type, type);
      }).length > 0;

      if (!isCorrectFileType) {
        var allowedFileTypesString = allowedFileTypes.join(', ');
        throw new Error(this.i18n('youCanOnlyUploadFileTypes') + ' ' + allowedFileTypesString);
      }
    }

    if (maxFileSize) {
      if (file.data.size > maxFileSize) {
        throw new Error(this.i18n('exceedsSize') + ' ' + prettyBytes(maxFileSize));
      }
    }
  };

  /**
  * Add a new file to `state.files`. This will run `onBeforeFileAdded`,
  * try to guess file type in a clever way, check file against restrictions,
  * and start an upload if `autoProceed === true`.
  *
  * @param {object} file object to add
  */


  Uppy.prototype.addFile = function addFile(file) {
    var _this2 = this;

    return _Promise.resolve()
    // Wrap this in a Promise `.then()` handler so errors will reject the Promise
    // instead of throwing.
    .then(function () {
      return _this2.opts.onBeforeFileAdded(file, _this2.getState().files);
    }).then(function () {
      return Utils.getFileType(file);
    }).then(function (fileType) {
      var updatedFiles = _extends({}, _this2.getState().files);
      var fileName = void 0;
      if (file.name) {
        fileName = file.name;
      } else if (fileType.split('/')[0] === 'image') {
        fileName = fileType.split('/')[0] + '.' + fileType.split('/')[1];
      } else {
        fileName = 'noname';
      }
      var fileExtension = Utils.getFileNameAndExtension(fileName).extension;
      var isRemote = file.isRemote || false;

      var fileID = Utils.generateFileID(file);

      var newFile = {
        source: file.source || '',
        id: fileID,
        name: fileName,
        extension: fileExtension || '',
        meta: _extends({}, _this2.getState().meta, {
          name: fileName,
          type: fileType
        }),
        type: fileType,
        data: file.data,
        progress: {
          percentage: 0,
          bytesUploaded: 0,
          bytesTotal: file.data.size || 0,
          uploadComplete: false,
          uploadStarted: false
        },
        size: file.data.size || 0,
        isRemote: isRemote,
        remote: file.remote || '',
        preview: file.preview
      };

      _this2._checkRestrictions(newFile);

      updatedFiles[fileID] = newFile;
      _this2.setState({ files: updatedFiles });

      _this2.emit('file-added', newFile);
      _this2.log('Added file: ' + fileName + ', ' + fileID + ', mime type: ' + fileType);

      if (_this2.opts.autoProceed && !_this2.scheduledAutoProceed) {
        _this2.scheduledAutoProceed = setTimeout(function () {
          _this2.scheduledAutoProceed = null;
          _this2.upload().catch(function (err) {
            console.error(err.stack || err.message || err);
          });
        }, 4);
      }
    }).catch(function (err) {
      var message = (typeof err === 'undefined' ? 'undefined' : _typeof(err)) === 'object' ? err.message : err;
      _this2.log(message);
      _this2.info(message, 'error', 5000);
      return _Promise.reject((typeof err === 'undefined' ? 'undefined' : _typeof(err)) === 'object' ? err : new Error(err));
    });
  };

  Uppy.prototype.removeFile = function removeFile(fileID) {
    var _this3 = this;

    var _state = this.state,
        files = _state.files,
        currentUploads = _state.currentUploads;

    var updatedFiles = _extends({}, files);
    var removedFile = updatedFiles[fileID];
    delete updatedFiles[fileID];

    // Remove this file from its `currentUpload`.
    var updatedUploads = _extends({}, currentUploads);
    var removeUploads = [];
    Object.keys(updatedUploads).forEach(function (uploadID) {
      var newFileIDs = currentUploads[uploadID].fileIDs.filter(function (uploadFileID) {
        return uploadFileID !== fileID;
      });
      // Remove the upload if no files are associated with it anymore.
      if (newFileIDs.length === 0) {
        removeUploads.push(uploadID);
        return;
      }

      updatedUploads[uploadID] = _extends({}, currentUploads[uploadID], {
        fileIDs: newFileIDs
      });
    });

    this.setState({
      currentUploads: updatedUploads,
      files: updatedFiles
    });

    removeUploads.forEach(function (uploadID) {
      _this3._removeUpload(uploadID);
    });

    this._calculateTotalProgress();
    this.emit('file-removed', removedFile);
    this.log('File removed: ' + removedFile.id);

    // Clean up object URLs.
    if (removedFile.preview && Utils.isObjectURL(removedFile.preview)) {
      URL.revokeObjectURL(removedFile.preview);
    }

    this.log('Removed file: ' + fileID);
  };

  Uppy.prototype.pauseResume = function pauseResume(fileID) {
    var updatedFiles = _extends({}, this.getState().files);

    if (updatedFiles[fileID].uploadComplete) return;

    var wasPaused = updatedFiles[fileID].isPaused || false;
    var isPaused = !wasPaused;

    var updatedFile = _extends({}, updatedFiles[fileID], {
      isPaused: isPaused
    });

    updatedFiles[fileID] = updatedFile;
    this.setState({ files: updatedFiles });

    this.emit('upload-pause', fileID, isPaused);

    return isPaused;
  };

  Uppy.prototype.pauseAll = function pauseAll() {
    var updatedFiles = _extends({}, this.getState().files);
    var inProgressUpdatedFiles = Object.keys(updatedFiles).filter(function (file) {
      return !updatedFiles[file].progress.uploadComplete && updatedFiles[file].progress.uploadStarted;
    });

    inProgressUpdatedFiles.forEach(function (file) {
      var updatedFile = _extends({}, updatedFiles[file], {
        isPaused: true
      });
      updatedFiles[file] = updatedFile;
    });
    this.setState({ files: updatedFiles });

    this.emit('pause-all');
  };

  Uppy.prototype.resumeAll = function resumeAll() {
    var updatedFiles = _extends({}, this.getState().files);
    var inProgressUpdatedFiles = Object.keys(updatedFiles).filter(function (file) {
      return !updatedFiles[file].progress.uploadComplete && updatedFiles[file].progress.uploadStarted;
    });

    inProgressUpdatedFiles.forEach(function (file) {
      var updatedFile = _extends({}, updatedFiles[file], {
        isPaused: false,
        error: null
      });
      updatedFiles[file] = updatedFile;
    });
    this.setState({ files: updatedFiles });

    this.emit('resume-all');
  };

  Uppy.prototype.retryAll = function retryAll() {
    var updatedFiles = _extends({}, this.getState().files);
    var filesToRetry = Object.keys(updatedFiles).filter(function (file) {
      return updatedFiles[file].error;
    });

    filesToRetry.forEach(function (file) {
      var updatedFile = _extends({}, updatedFiles[file], {
        isPaused: false,
        error: null
      });
      updatedFiles[file] = updatedFile;
    });
    this.setState({
      files: updatedFiles,
      error: null
    });

    this.emit('retry-all', filesToRetry);

    var uploadID = this._createUpload(filesToRetry);
    return this._runUpload(uploadID);
  };

  Uppy.prototype.cancelAll = function cancelAll() {
    var _this4 = this;

    this.emit('cancel-all');

    // TODO Or should we just call removeFile on all files?

    var _getState = this.getState(),
        currentUploads = _getState.currentUploads;

    var uploadIDs = Object.keys(currentUploads);

    uploadIDs.forEach(function (id) {
      _this4._removeUpload(id);
    });

    this.setState({
      files: {},
      totalProgress: 0
    });
  };

  Uppy.prototype.retryUpload = function retryUpload(fileID) {
    var updatedFiles = _extends({}, this.getState().files);
    var updatedFile = _extends({}, updatedFiles[fileID], { error: null, isPaused: false });
    updatedFiles[fileID] = updatedFile;
    this.setState({
      files: updatedFiles
    });

    this.emit('upload-retry', fileID);

    var uploadID = this._createUpload([fileID]);
    return this._runUpload(uploadID);
  };

  Uppy.prototype.reset = function reset() {
    this.cancelAll();
  };

  Uppy.prototype._calculateProgress = function _calculateProgress(file, data) {
    if (!this.getFile(file.id)) {
      this.log('Not setting progress for a file that has been removed: ' + file.id);
      return;
    }

    this.setFileState(file.id, {
      progress: _extends({}, this.getFile(file.id).progress, {
        bytesUploaded: data.bytesUploaded,
        bytesTotal: data.bytesTotal,
        percentage: Math.floor((data.bytesUploaded / data.bytesTotal * 100).toFixed(2))
      })
    });

    this._calculateTotalProgress();
  };

  Uppy.prototype._calculateTotalProgress = function _calculateTotalProgress() {
    // calculate total progress, using the number of files currently uploading,
    // multiplied by 100 and the summ of individual progress of each file
    var files = _extends({}, this.getState().files);

    var inProgress = Object.keys(files).filter(function (file) {
      return files[file].progress.uploadStarted;
    });
    var progressMax = inProgress.length * 100;
    var progressAll = 0;
    inProgress.forEach(function (file) {
      progressAll = progressAll + files[file].progress.percentage;
    });

    var totalProgress = progressMax === 0 ? 0 : Math.floor((progressAll * 100 / progressMax).toFixed(2));

    this.setState({
      totalProgress: totalProgress
    });
  };

  /**
   * Registers listeners for all global actions, like:
   * `error`, `file-removed`, `upload-progress`
   *
   */


  Uppy.prototype.actions = function actions() {
    var _this5 = this;

    // const log = this.log
    // this.on('*', function (payload) {
    //   log(`[Core] Event: ${this.event}`)
    //   log(payload)
    // })

    // stress-test re-rendering
    // setInterval(() => {
    //   this.setState({bla: 'bla'})
    // }, 20)

    this.on('error', function (error) {
      _this5.setState({ error: error.message });
    });

    this.on('upload-error', function (file, error) {
      _this5.setFileState(file.id, { error: error.message });
      _this5.setState({ error: error.message });

      var message = 'Failed to upload ' + file.name;
      if ((typeof error === 'undefined' ? 'undefined' : _typeof(error)) === 'object' && error.message) {
        message = { message: message, details: error.message };
      }
      _this5.info(message, 'error', 5000);
    });

    this.on('upload', function () {
      _this5.setState({ error: null });
    });

    this.on('upload-started', function (file, upload) {
      if (!_this5.getFile(file.id)) {
        _this5.log('Not setting progress for a file that has been removed: ' + file.id);
        return;
      }
      _this5.setFileState(file.id, {
        progress: _extends({}, _this5.getFile(file.id), {
          uploadStarted: Date.now(),
          uploadComplete: false,
          percentage: 0,
          bytesUploaded: 0,
          bytesTotal: file.size
        })
      });
    });

    // upload progress events can occur frequently, especially when you have a good
    // connection to the remote server. Therefore, we are throtteling them to
    // prevent accessive function calls.
    // see also: https://github.com/tus/tus-js-client/commit/9940f27b2361fd7e10ba58b09b60d82422183bbb
    var _throttledCalculateProgress = throttle(this._calculateProgress, 100, { leading: true, trailing: true });

    this.on('upload-progress', _throttledCalculateProgress);

    this.on('upload-success', function (file, uploadResp, uploadURL) {
      _this5.setFileState(file.id, {
        progress: _extends({}, _this5.getFile(file.id).progress, {
          uploadComplete: true,
          percentage: 100
        }),
        uploadURL: uploadURL,
        isPaused: false
      });

      _this5._calculateTotalProgress();
    });

    this.on('preprocess-progress', function (file, progress) {
      if (!_this5.getFile(file.id)) {
        _this5.log('Not setting progress for a file that has been removed: ' + file.id);
        return;
      }
      _this5.setFileState(file.id, {
        progress: _extends({}, _this5.getFile(file.id).progress, {
          preprocess: progress
        })
      });
    });

    this.on('preprocess-complete', function (file) {
      if (!_this5.getFile(file.id)) {
        _this5.log('Not setting progress for a file that has been removed: ' + file.id);
        return;
      }
      var files = _extends({}, _this5.getState().files);
      files[file.id] = _extends({}, files[file.id], {
        progress: _extends({}, files[file.id].progress)
      });
      delete files[file.id].progress.preprocess;

      _this5.setState({ files: files });
    });

    this.on('postprocess-progress', function (file, progress) {
      if (!_this5.getFile(file.id)) {
        _this5.log('Not setting progress for a file that has been removed: ' + file.id);
        return;
      }
      _this5.setFileState(file.id, {
        progress: _extends({}, _this5.getState().files[file.id].progress, {
          postprocess: progress
        })
      });
    });

    this.on('postprocess-complete', function (file) {
      if (!_this5.getFile(file.id)) {
        _this5.log('Not setting progress for a file that has been removed: ' + file.id);
        return;
      }
      var files = _extends({}, _this5.getState().files);
      files[file.id] = _extends({}, files[file.id], {
        progress: _extends({}, files[file.id].progress)
      });
      delete files[file.id].progress.postprocess;
      // TODO should we set some kind of `fullyComplete` property on the file object
      // so it's easier to see that the file is upload…fully complete…rather than
      // what we have to do now (`uploadComplete && !postprocess`)

      _this5.setState({ files: files });
    });

    this.on('restored', function () {
      // Files may have changed--ensure progress is still accurate.
      _this5._calculateTotalProgress();
    });

    // show informer if offline
    if (typeof window !== 'undefined') {
      window.addEventListener('online', function () {
        return _this5.updateOnlineStatus();
      });
      window.addEventListener('offline', function () {
        return _this5.updateOnlineStatus();
      });
      setTimeout(function () {
        return _this5.updateOnlineStatus();
      }, 3000);
    }
  };

  Uppy.prototype.updateOnlineStatus = function updateOnlineStatus() {
    var online = typeof window.navigator.onLine !== 'undefined' ? window.navigator.onLine : true;
    if (!online) {
      this.emit('is-offline');
      this.info('No internet connection', 'error', 0);
      this.wasOffline = true;
    } else {
      this.emit('is-online');
      if (this.wasOffline) {
        this.emit('back-online');
        this.info('Connected!', 'success', 3000);
        this.wasOffline = false;
      }
    }
  };

  Uppy.prototype.getID = function getID() {
    return this.opts.id;
  };

  /**
   * Registers a plugin with Core.
   *
   * @param {Class} Plugin object
   * @param {Object} options object that will be passed to Plugin later
   * @return {Object} self for chaining
   */


  Uppy.prototype.use = function use(Plugin, opts) {
    if (typeof Plugin !== 'function') {
      var msg = 'Expected a plugin class, but got ' + (Plugin === null ? 'null' : typeof Plugin === 'undefined' ? 'undefined' : _typeof(Plugin)) + '.' + ' Please verify that the plugin was imported and spelled correctly.';
      throw new TypeError(msg);
    }

    // Instantiate
    var plugin = new Plugin(this, opts);
    var pluginId = plugin.id;
    this.plugins[plugin.type] = this.plugins[plugin.type] || [];

    if (!pluginId) {
      throw new Error('Your plugin must have an id');
    }

    if (!plugin.type) {
      throw new Error('Your plugin must have a type');
    }

    var existsPluginAlready = this.getPlugin(pluginId);
    if (existsPluginAlready) {
      var _msg = 'Already found a plugin named \'' + existsPluginAlready.id + '\'.\n        Tried to use: \'' + pluginId + '\'.\n        Uppy is currently limited to running one of every plugin.\n        Share your use case with us over at\n        https://github.com/transloadit/uppy/issues/\n        if you want us to reconsider.';
      throw new Error(_msg);
    }

    this.plugins[plugin.type].push(plugin);
    plugin.install();

    return this;
  };

  /**
   * Find one Plugin by name.
   *
   * @param string name description
   */


  Uppy.prototype.getPlugin = function getPlugin(name) {
    var foundPlugin = false;
    this.iteratePlugins(function (plugin) {
      var pluginName = plugin.id;
      if (pluginName === name) {
        foundPlugin = plugin;
        return false;
      }
    });
    return foundPlugin;
  };

  /**
   * Iterate through all `use`d plugins.
   *
   * @param function method description
   */


  Uppy.prototype.iteratePlugins = function iteratePlugins(method) {
    var _this6 = this;

    Object.keys(this.plugins).forEach(function (pluginType) {
      _this6.plugins[pluginType].forEach(method);
    });
  };

  /**
   * Uninstall and remove a plugin.
   *
   * @param {Plugin} instance The plugin instance to remove.
   */


  Uppy.prototype.removePlugin = function removePlugin(instance) {
    var list = this.plugins[instance.type];

    if (instance.uninstall) {
      instance.uninstall();
    }

    var index = list.indexOf(instance);
    if (index !== -1) {
      list.splice(index, 1);
    }
  };

  /**
   * Uninstall all plugins and close down this Uppy instance.
   */


  Uppy.prototype.close = function close() {
    this.reset();

    this._storeUnsubscribe();

    this.iteratePlugins(function (plugin) {
      plugin.uninstall();
    });
  };

  /**
  * Set info message in `state.info`, so that UI plugins like `Informer`
  * can display the message.
  *
  * @param {string} msg Message to be displayed by the informer
  */

  Uppy.prototype.info = function info(message) {
    var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'info';
    var duration = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 3000;

    var isComplexMessage = (typeof message === 'undefined' ? 'undefined' : _typeof(message)) === 'object';

    this.setState({
      info: {
        isHidden: false,
        type: type,
        message: isComplexMessage ? message.message : message,
        details: isComplexMessage ? message.details : null
      }
    });

    this.emit('info-visible');

    window.clearTimeout(this.infoTimeoutID);
    if (duration === 0) {
      this.infoTimeoutID = undefined;
      return;
    }

    // hide the informer after `duration` milliseconds
    this.infoTimeoutID = setTimeout(this.hideInfo, duration);
  };

  Uppy.prototype.hideInfo = function hideInfo() {
    var newInfo = _extends({}, this.getState().info, {
      isHidden: true
    });
    this.setState({
      info: newInfo
    });
    this.emit('info-hidden');
  };

  /**
   * Logs stuff to console, only if `debug` is set to true. Silent in production.
   *
   * @param {String|Object} msg to log
   * @param {String} type optional `error` or `warning`
   */


  Uppy.prototype.log = function log(msg, type) {
    if (!this.opts.debug) {
      return;
    }

    var message = '[Uppy] [' + Utils.getTimeStamp() + '] ' + msg;

    global.uppyLog = global.uppyLog + '\n' + 'DEBUG LOG: ' + msg;

    if (type === 'error') {
      console.error(message);
      return;
    }

    if (type === 'warning') {
      console.warn(message);
      return;
    }

    if (msg === '' + msg) {
      console.log(message);
    } else {
      message = '[Uppy] [' + Utils.getTimeStamp() + ']';
      console.log(message);
      console.dir(msg);
    }
  };

  /**
   * Initializes actions.
   *
   */


  Uppy.prototype.run = function run() {
    this.log('Core is run, initializing actions...');
    this.actions();

    return this;
  };

  /**
   * Restore an upload by its ID.
   */


  Uppy.prototype.restore = function restore(uploadID) {
    this.log('Core: attempting to restore upload "' + uploadID + '"');

    if (!this.getState().currentUploads[uploadID]) {
      this._removeUpload(uploadID);
      return _Promise.reject(new Error('Nonexistent upload'));
    }

    return this._runUpload(uploadID);
  };

  /**
   * Create an upload for a bunch of files.
   *
   * @param {Array<string>} fileIDs File IDs to include in this upload.
   * @return {string} ID of this upload.
   */


  Uppy.prototype._createUpload = function _createUpload(fileIDs) {
    var _extends3;

    var uploadID = cuid();

    this.emit('upload', {
      id: uploadID,
      fileIDs: fileIDs
    });

    this.setState({
      currentUploads: _extends({}, this.getState().currentUploads, (_extends3 = {}, _extends3[uploadID] = {
        fileIDs: fileIDs,
        step: 0,
        result: {}
      }, _extends3))
    });

    return uploadID;
  };

  Uppy.prototype._getUpload = function _getUpload(uploadID) {
    return this.getState().currentUploads[uploadID];
  };

  /**
   * Add data to an upload's result object.
   *
   * @param {string} uploadID The ID of the upload.
   * @param {object} data Data properties to add to the result object.
   */


  Uppy.prototype.addResultData = function addResultData(uploadID, data) {
    var _extends4;

    if (!this._getUpload(uploadID)) {
      this.log('Not setting result for an upload that has been removed: ' + uploadID);
      return;
    }
    var currentUploads = this.getState().currentUploads;
    var currentUpload = _extends({}, currentUploads[uploadID], {
      result: _extends({}, currentUploads[uploadID].result, data)
    });
    this.setState({
      currentUploads: _extends({}, currentUploads, (_extends4 = {}, _extends4[uploadID] = currentUpload, _extends4))
    });
  };

  /**
   * Remove an upload, eg. if it has been canceled or completed.
   *
   * @param {string} uploadID The ID of the upload.
   */


  Uppy.prototype._removeUpload = function _removeUpload(uploadID) {
    var currentUploads = _extends({}, this.getState().currentUploads);
    delete currentUploads[uploadID];

    this.setState({
      currentUploads: currentUploads
    });
  };

  /**
   * Run an upload. This picks up where it left off in case the upload is being restored.
   *
   * @private
   */


  Uppy.prototype._runUpload = function _runUpload(uploadID) {
    var _this7 = this;

    var uploadData = this.getState().currentUploads[uploadID];
    var fileIDs = uploadData.fileIDs;
    var restoreStep = uploadData.step;

    var steps = [].concat(this.preProcessors, this.uploaders, this.postProcessors);
    var lastStep = _Promise.resolve();
    steps.forEach(function (fn, step) {
      // Skip this step if we are restoring and have already completed this step before.
      if (step < restoreStep) {
        return;
      }

      lastStep = lastStep.then(function () {
        var _extends5;

        var _getState2 = _this7.getState(),
            currentUploads = _getState2.currentUploads;

        var currentUpload = _extends({}, currentUploads[uploadID], {
          step: step
        });
        _this7.setState({
          currentUploads: _extends({}, currentUploads, (_extends5 = {}, _extends5[uploadID] = currentUpload, _extends5))
        });
        // TODO give this the `currentUpload` object as its only parameter maybe?
        // Otherwise when more metadata may be added to the upload this would keep getting more parameters
        return fn(fileIDs, uploadID);
      }).then(function (result) {
        return null;
      });
    });

    // Not returning the `catch`ed promise, because we still want to return a rejected
    // promise from this method if the upload failed.
    lastStep.catch(function (err) {
      _this7.emit('error', err);

      _this7._removeUpload(uploadID);
    });

    return lastStep.then(function () {
      var files = fileIDs.map(function (fileID) {
        return _this7.getFile(fileID);
      });
      var successful = files.filter(function (file) {
        return file && !file.error;
      });
      var failed = files.filter(function (file) {
        return file && file.error;
      });
      _this7.addResultData(uploadID, { successful: successful, failed: failed, uploadID: uploadID });

      var _getState3 = _this7.getState(),
          currentUploads = _getState3.currentUploads;

      if (!currentUploads[uploadID]) {
        _this7.log('Not setting result for an upload that has been removed: ' + uploadID);
        return;
      }

      var result = currentUploads[uploadID].result;
      _this7.emit('complete', result);

      _this7._removeUpload(uploadID);

      return result;
    });
  };

  /**
  * Start an upload for all the files that are not currently being uploaded.
  *
  * @return {Promise}
  */


  Uppy.prototype.upload = function upload() {
    var _this8 = this;

    if (!this.plugins.uploader) {
      this.log('No uploader type plugins are used', 'warning');
    }

    return _Promise.resolve().then(function () {
      return _this8.opts.onBeforeUpload(_this8.getState().files);
    }).then(function () {
      return _this8._checkMinNumberOfFiles();
    }).then(function () {
      var _getState4 = _this8.getState(),
          currentUploads = _getState4.currentUploads;
      // get a list of files that are currently assigned to uploads


      var currentlyUploadingFiles = Object.keys(currentUploads).reduce(function (prev, curr) {
        return prev.concat(currentUploads[curr].fileIDs);
      }, []);

      var waitingFileIDs = [];
      Object.keys(_this8.getState().files).forEach(function (fileID) {
        var file = _this8.getFile(fileID);
        // if the file hasn't started uploading and hasn't already been assigned to an upload..
        if (!file.progress.uploadStarted && currentlyUploadingFiles.indexOf(fileID) === -1) {
          waitingFileIDs.push(file.id);
        }
      });

      var uploadID = _this8._createUpload(waitingFileIDs);
      return _this8._runUpload(uploadID);
    }).catch(function (err) {
      var message = (typeof err === 'undefined' ? 'undefined' : _typeof(err)) === 'object' ? err.message : err;
      _this8.log(message);
      _this8.info(message, 'error', 4000);
      return _Promise.reject((typeof err === 'undefined' ? 'undefined' : _typeof(err)) === 'object' ? err : new Error(err));
    });
  };

  _createClass(Uppy, [{
    key: 'state',
    get: function get() {
      return this.getState();
    }
  }]);

  return Uppy;
}();

module.exports = function (opts) {
  return new Uppy(opts);
};
// Expose class constructor.
module.exports.Uppy = Uppy;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../core/Translator":24,"../core/Utils":26,"../store/DefaultStore":31,"cuid":1,"es6-promise":4,"lodash.throttle":6,"mime-match":7,"namespace-emitter":8,"prettier-bytes":10}],23:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var preact = require('preact');

var _require = require('../core/Utils'),
    findDOMElement = _require.findDOMElement;

/**
 * Boilerplate that all Plugins share - and should not be used
 * directly. It also shows which methods final plugins should implement/override,
 * this deciding on structure.
 *
 * @param {object} main Uppy core object
 * @param {object} object with plugin options
 * @return {array | string} files or success/fail message
 */


module.exports = function () {
  function Plugin(uppy, opts) {
    _classCallCheck(this, Plugin);

    this.uppy = uppy;
    this.opts = opts || {};

    this.update = this.update.bind(this);
    this.mount = this.mount.bind(this);
    this.install = this.install.bind(this);
    this.uninstall = this.uninstall.bind(this);
  }

  Plugin.prototype.getPluginState = function getPluginState() {
    return this.uppy.state.plugins[this.id];
  };

  Plugin.prototype.setPluginState = function setPluginState(update) {
    var plugins = _extends({}, this.uppy.state.plugins);
    plugins[this.id] = _extends({}, plugins[this.id], update);

    this.uppy.setState({
      plugins: plugins
    });
  };

  Plugin.prototype.update = function update(state) {
    if (typeof this.el === 'undefined') {
      return;
    }

    if (this.updateUI) {
      this.updateUI(state);
    }
  };

  /**
   * Check if supplied `target` is a DOM element or an `object`.
   * If it’s an object — target is a plugin, and we search `plugins`
   * for a plugin with same name and return its target.
   *
   * @param {String|Object} target
   *
   */


  Plugin.prototype.mount = function mount(target, plugin) {
    var _this = this;

    var callerPluginName = plugin.id;

    var targetElement = findDOMElement(target);

    if (targetElement) {
      this.updateUI = function (state) {
        _this.el = preact.render(_this.render(state), targetElement, _this.el);
      };

      this.uppy.log('Installing ' + callerPluginName + ' to a DOM element');

      // clear everything inside the target container
      if (this.opts.replaceTargetContent) {
        targetElement.innerHTML = '';
      }

      this.el = preact.render(this.render(this.uppy.state), targetElement);

      return this.el;
    }

    var targetPlugin = void 0;
    if ((typeof target === 'undefined' ? 'undefined' : _typeof(target)) === 'object' && target instanceof Plugin) {
      // Targeting a plugin *instance*
      targetPlugin = target;
    } else if (typeof target === 'function') {
      // Targeting a plugin type
      var Target = target;
      // Find the target plugin instance.
      this.uppy.iteratePlugins(function (plugin) {
        if (plugin instanceof Target) {
          targetPlugin = plugin;
          return false;
        }
      });
    }

    if (targetPlugin) {
      var targetPluginName = targetPlugin.id;
      this.uppy.log('Installing ' + callerPluginName + ' to ' + targetPluginName);
      this.el = targetPlugin.addTarget(plugin);
      return this.el;
    }

    this.uppy.log('Not installing ' + callerPluginName);
    throw new Error('Invalid target option given to ' + callerPluginName);
  };

  Plugin.prototype.render = function render(state) {
    throw new Error('Extend the render method to add your plugin to a DOM element');
  };

  Plugin.prototype.addTarget = function addTarget(plugin) {
    throw new Error('Extend the addTarget method to add your plugin to another plugin\'s target');
  };

  Plugin.prototype.unmount = function unmount() {
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    // this.target = null
  };

  Plugin.prototype.install = function install() {};

  Plugin.prototype.uninstall = function uninstall() {
    this.unmount();
  };

  return Plugin;
}();

},{"../core/Utils":26,"preact":9}],24:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Translates strings with interpolation & pluralization support.
 * Extensible with custom dictionaries and pluralization functions.
 *
 * Borrows heavily from and inspired by Polyglot https://github.com/airbnb/polyglot.js,
 * basically a stripped-down version of it. Differences: pluralization functions are not hardcoded
 * and can be easily added among with dictionaries, nested objects are used for pluralization
 * as opposed to `||||` delimeter
 *
 * Usage example: `translator.translate('files_chosen', {smart_count: 3})`
 *
 * @param {object} opts
 */
module.exports = function () {
  function Translator(opts) {
    _classCallCheck(this, Translator);

    var defaultOptions = {
      locale: {
        strings: {},
        pluralize: function pluralize(n) {
          if (n === 1) {
            return 0;
          }
          return 1;
        }
      }
    };

    this.opts = _extends({}, defaultOptions, opts);
    this.locale = _extends({}, defaultOptions.locale, opts.locale);

    // console.log(this.opts.locale)

    // this.locale.pluralize = this.locale ? this.locale.pluralize : defaultPluralize
    // this.locale.strings = Object.assign({}, en_US.strings, this.opts.locale.strings)
  }

  /**
   * Takes a string with placeholder variables like `%{smart_count} file selected`
   * and replaces it with values from options `{smart_count: 5}`
   *
   * @license https://github.com/airbnb/polyglot.js/blob/master/LICENSE
   * taken from https://github.com/airbnb/polyglot.js/blob/master/lib/polyglot.js#L299
   *
   * @param {string} phrase that needs interpolation, with placeholders
   * @param {object} options with values that will be used to replace placeholders
   * @return {string} interpolated
   */


  Translator.prototype.interpolate = function interpolate(phrase, options) {
    var replace = String.prototype.replace;
    var dollarRegex = /\$/g;
    var dollarBillsYall = '$$$$';

    for (var arg in options) {
      if (arg !== '_' && options.hasOwnProperty(arg)) {
        // Ensure replacement value is escaped to prevent special $-prefixed
        // regex replace tokens. the "$$$$" is needed because each "$" needs to
        // be escaped with "$" itself, and we need two in the resulting output.
        var replacement = options[arg];
        if (typeof replacement === 'string') {
          replacement = replace.call(options[arg], dollarRegex, dollarBillsYall);
        }
        // We create a new `RegExp` each time instead of using a more-efficient
        // string replace so that the same argument can be replaced multiple times
        // in the same phrase.
        phrase = replace.call(phrase, new RegExp('%\\{' + arg + '\\}', 'g'), replacement);
      }
    }
    return phrase;
  };

  /**
   * Public translate method
   *
   * @param {string} key
   * @param {object} options with values that will be used later to replace placeholders in string
   * @return {string} translated (and interpolated)
   */


  Translator.prototype.translate = function translate(key, options) {
    if (options && options.smart_count) {
      var plural = this.locale.pluralize(options.smart_count);
      return this.interpolate(this.opts.locale.strings[key][plural], options);
    }

    return this.interpolate(this.opts.locale.strings[key], options);
  };

  return Translator;
}();

},{}],25:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ee = require('namespace-emitter');

module.exports = function () {
  function UppySocket(opts) {
    var _this = this;

    _classCallCheck(this, UppySocket);

    this.queued = [];
    this.isOpen = false;
    this.socket = new WebSocket(opts.target);
    this.emitter = ee();

    this.socket.onopen = function (e) {
      _this.isOpen = true;

      while (_this.queued.length > 0 && _this.isOpen) {
        var first = _this.queued[0];
        _this.send(first.action, first.payload);
        _this.queued = _this.queued.slice(1);
      }
    };

    this.socket.onclose = function (e) {
      _this.isOpen = false;
    };

    this._handleMessage = this._handleMessage.bind(this);

    this.socket.onmessage = this._handleMessage;

    this.close = this.close.bind(this);
    this.emit = this.emit.bind(this);
    this.on = this.on.bind(this);
    this.once = this.once.bind(this);
    this.send = this.send.bind(this);
  }

  UppySocket.prototype.close = function close() {
    return this.socket.close();
  };

  UppySocket.prototype.send = function send(action, payload) {
    // attach uuid

    if (!this.isOpen) {
      this.queued.push({ action: action, payload: payload });
      return;
    }

    this.socket.send(JSON.stringify({
      action: action,
      payload: payload
    }));
  };

  UppySocket.prototype.on = function on(action, handler) {
    console.log(action);
    this.emitter.on(action, handler);
  };

  UppySocket.prototype.emit = function emit(action, payload) {
    console.log(action);
    this.emitter.emit(action, payload);
  };

  UppySocket.prototype.once = function once(action, handler) {
    this.emitter.once(action, handler);
  };

  UppySocket.prototype._handleMessage = function _handleMessage(e) {
    try {
      var message = JSON.parse(e.data);
      console.log(message);
      this.emit(message.action, message.payload);
    } catch (err) {
      console.log(err);
    }
  };

  return UppySocket;
}();

},{"namespace-emitter":8}],26:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _Promise = typeof Promise === 'undefined' ? require('es6-promise').Promise : Promise;

var throttle = require('lodash.throttle');
// we inline file-type module, as opposed to using the NPM version,
// because of this https://github.com/sindresorhus/file-type/issues/78
// and https://github.com/sindresorhus/copy-text-to-clipboard/issues/5
var fileType = require('../vendor/file-type');

/**
 * A collection of small utility functions that help with dom manipulation, adding listeners,
 * promises and other good things.
 *
 * @module Utils
 */

function isTouchDevice() {
  return 'ontouchstart' in window || // works on most browsers
  navigator.maxTouchPoints; // works on IE10/11 and Surface
}

function truncateString(str, length) {
  if (str.length > length) {
    return str.substr(0, length / 2) + '...' + str.substr(str.length - length / 4, str.length);
  }
  return str;

  // more precise version if needed
  // http://stackoverflow.com/a/831583
}

function secondsToTime(rawSeconds) {
  var hours = Math.floor(rawSeconds / 3600) % 24;
  var minutes = Math.floor(rawSeconds / 60) % 60;
  var seconds = Math.floor(rawSeconds % 60);

  return { hours: hours, minutes: minutes, seconds: seconds };
}

/**
 * Converts list into array
*/
function toArray(list) {
  return Array.prototype.slice.call(list || [], 0);
}

/**
 * Returns a timestamp in the format of `hours:minutes:seconds`
*/
function getTimeStamp() {
  var date = new Date();
  var hours = pad(date.getHours().toString());
  var minutes = pad(date.getMinutes().toString());
  var seconds = pad(date.getSeconds().toString());
  return hours + ':' + minutes + ':' + seconds;
}

/**
 * Adds zero to strings shorter than two characters
*/
function pad(str) {
  return str.length !== 2 ? 0 + str : str;
}

/**
 * Takes a file object and turns it into fileID, by converting file.name to lowercase,
 * removing extra characters and adding type, size and lastModified
 *
 * @param {Object} file
 * @return {String} the fileID
 *
 */
function generateFileID(file) {
  // filter is needed to not join empty values with `-`
  return ['uppy', file.name ? file.name.toLowerCase().replace(/[^A-Z0-9]/ig, '') : '', file.type, file.data.size, file.data.lastModified].filter(function (val) {
    return val;
  }).join('-');
}

/**
 * Runs an array of promise-returning functions in sequence.
 */
function runPromiseSequence(functions) {
  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  var promise = _Promise.resolve();
  functions.forEach(function (func) {
    promise = promise.then(function () {
      return func.apply(undefined, args);
    });
  });
  return promise;
}

function isPreviewSupported(fileType) {
  if (!fileType) return false;
  var fileTypeSpecific = fileType.split('/')[1];
  // list of images that browsers can preview
  if (/^(jpeg|gif|png|svg|svg\+xml|bmp)$/.test(fileTypeSpecific)) {
    return true;
  }
  return false;
}

function getArrayBuffer(chunk) {
  return new _Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.addEventListener('load', function (e) {
      // e.target.result is an ArrayBuffer
      resolve(e.target.result);
    });
    reader.addEventListener('error', function (err) {
      console.error('FileReader error' + err);
      reject(err);
    });
    // file-type only needs the first 4100 bytes
    reader.readAsArrayBuffer(chunk);
  });
}

function getFileType(file) {
  var extensionsToMime = {
    'md': 'text/markdown',
    'markdown': 'text/markdown',
    'mp4': 'video/mp4',
    'mp3': 'audio/mp3',
    'svg': 'image/svg+xml',
    'jpg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif'
  };

  var fileExtension = file.name ? getFileNameAndExtension(file.name).extension : null;

  if (file.isRemote) {
    // some remote providers do not support file types
    var mime = file.type ? file.type : extensionsToMime[fileExtension];
    return _Promise.resolve(mime);
  }

  // 1. try to determine file type from magic bytes with file-type module
  // this should be the most trustworthy way
  var chunk = file.data.slice(0, 4100);
  return getArrayBuffer(chunk).then(function (buffer) {
    var type = fileType(buffer);
    if (type && type.mime) {
      return type.mime;
    }

    // 2. if that’s no good, check if mime type is set in the file object
    if (file.type) {
      return file.type;
    }

    // 3. if that’s no good, see if we can map extension to a mime type
    if (fileExtension && extensionsToMime[fileExtension]) {
      return extensionsToMime[fileExtension];
    }

    // if all fails, well, return empty
    return null;
  }).catch(function () {
    return null;
  });
}

// TODO Check which types are actually supported in browsers. Chrome likes webm
// from my testing, but we may need more.
// We could use a library but they tend to contain dozens of KBs of mappings,
// most of which will go unused, so not sure if that's worth it.
var mimeToExtensions = {
  'video/ogg': 'ogv',
  'audio/ogg': 'ogg',
  'video/webm': 'webm',
  'audio/webm': 'webm',
  'video/mp4': 'mp4',
  'audio/mp3': 'mp3'
};

function getFileTypeExtension(mimeType) {
  return mimeToExtensions[mimeType] || null;
}

/**
* Takes a full filename string and returns an object {name, extension}
*
* @param {string} fullFileName
* @return {object} {name, extension}
*/
function getFileNameAndExtension(fullFileName) {
  var re = /(?:\.([^.]+))?$/;
  var fileExt = re.exec(fullFileName)[1];
  var fileName = fullFileName.replace('.' + fileExt, '');
  return {
    name: fileName,
    extension: fileExt
  };
}

/**
 * Check if a URL string is an object URL from `URL.createObjectURL`.
 *
 * @param {string} url
 * @return {boolean}
 */
function isObjectURL(url) {
  return url.indexOf('blob:') === 0;
}

function getProportionalHeight(img, width) {
  var aspect = img.width / img.height;
  return Math.round(width / aspect);
}

/**
 * Create a thumbnail for the given Uppy file object.
 *
 * @param {{data: Blob}} file
 * @param {number} width
 * @return {Promise}
 */
function createThumbnail(file, targetWidth) {
  var originalUrl = URL.createObjectURL(file.data);
  var onload = new _Promise(function (resolve, reject) {
    var image = new Image();
    image.src = originalUrl;
    image.onload = function () {
      URL.revokeObjectURL(originalUrl);
      resolve(image);
    };
    image.onerror = function () {
      // The onerror event is totally useless unfortunately, as far as I know
      URL.revokeObjectURL(originalUrl);
      reject(new Error('Could not create thumbnail'));
    };
  });

  return onload.then(function (image) {
    var targetHeight = getProportionalHeight(image, targetWidth);
    var canvas = resizeImage(image, targetWidth, targetHeight);
    return canvasToBlob(canvas, 'image/png');
  }).then(function (blob) {
    return URL.createObjectURL(blob);
  });
}

/**
 * Resize an image to the target `width` and `height`.
 *
 * Returns a Canvas with the resized image on it.
 */
function resizeImage(image, targetWidth, targetHeight) {
  var sourceWidth = image.width;
  var sourceHeight = image.height;

  if (targetHeight < image.height / 2) {
    var steps = Math.floor(Math.log(image.width / targetWidth) / Math.log(2));
    var stepScaled = downScaleInSteps(image, steps);
    image = stepScaled.image;
    sourceWidth = stepScaled.sourceWidth;
    sourceHeight = stepScaled.sourceHeight;
  }

  var canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  var context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);

  return canvas;
}

/**
 * Downscale an image by 50% `steps` times.
 */
function downScaleInSteps(image, steps) {
  var source = image;
  var currentWidth = source.width;
  var currentHeight = source.height;

  for (var i = 0; i < steps; i += 1) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = currentWidth / 2;
    canvas.height = currentHeight / 2;
    context.drawImage(source,
    // The entire source image. We pass width and height here,
    // because we reuse this canvas, and should only scale down
    // the part of the canvas that contains the previous scale step.
    0, 0, currentWidth, currentHeight,
    // Draw to 50% size
    0, 0, currentWidth / 2, currentHeight / 2);
    currentWidth /= 2;
    currentHeight /= 2;
    source = canvas;
  }

  return {
    image: source,
    sourceWidth: currentWidth,
    sourceHeight: currentHeight
  };
}

/**
 * Save a <canvas> element's content to a Blob object.
 *
 * @param {HTMLCanvasElement} canvas
 * @return {Promise}
 */
function canvasToBlob(canvas, type, quality) {
  if (canvas.toBlob) {
    return new _Promise(function (resolve) {
      canvas.toBlob(resolve, type, quality);
    });
  }
  return _Promise.resolve().then(function () {
    return dataURItoBlob(canvas.toDataURL(type, quality), {});
  });
}

function dataURItoBlob(dataURI, opts, toFile) {
  // get the base64 data
  var data = dataURI.split(',')[1];

  // user may provide mime type, if not get it from data URI
  var mimeType = opts.mimeType || dataURI.split(',')[0].split(':')[1].split(';')[0];

  // default to plain/text if data URI has no mimeType
  if (mimeType == null) {
    mimeType = 'plain/text';
  }

  var binary = atob(data);
  var array = [];
  for (var i = 0; i < binary.length; i++) {
    array.push(binary.charCodeAt(i));
  }

  // Convert to a File?
  if (toFile) {
    return new File([new Uint8Array(array)], opts.name || '', { type: mimeType });
  }

  return new Blob([new Uint8Array(array)], { type: mimeType });
}

function dataURItoFile(dataURI, opts) {
  return dataURItoBlob(dataURI, opts, true);
}

/**
 * Copies text to clipboard by creating an almost invisible textarea,
 * adding text there, then running execCommand('copy').
 * Falls back to prompt() when the easy way fails (hello, Safari!)
 * From http://stackoverflow.com/a/30810322
 *
 * @param {String} textToCopy
 * @param {String} fallbackString
 * @return {Promise}
 */
function copyToClipboard(textToCopy, fallbackString) {
  fallbackString = fallbackString || 'Copy the URL below';

  return new _Promise(function (resolve) {
    var textArea = document.createElement('textarea');
    textArea.setAttribute('style', {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '2em',
      height: '2em',
      padding: 0,
      border: 'none',
      outline: 'none',
      boxShadow: 'none',
      background: 'transparent'
    });

    textArea.value = textToCopy;
    document.body.appendChild(textArea);
    textArea.select();

    var magicCopyFailed = function magicCopyFailed() {
      document.body.removeChild(textArea);
      window.prompt(fallbackString, textToCopy);
      resolve();
    };

    try {
      var successful = document.execCommand('copy');
      if (!successful) {
        return magicCopyFailed('copy command unavailable');
      }
      document.body.removeChild(textArea);
      return resolve();
    } catch (err) {
      document.body.removeChild(textArea);
      return magicCopyFailed(err);
    }
  });
}

function getSpeed(fileProgress) {
  if (!fileProgress.bytesUploaded) return 0;

  var timeElapsed = new Date() - fileProgress.uploadStarted;
  var uploadSpeed = fileProgress.bytesUploaded / (timeElapsed / 1000);
  return uploadSpeed;
}

function getBytesRemaining(fileProgress) {
  return fileProgress.bytesTotal - fileProgress.bytesUploaded;
}

function getETA(fileProgress) {
  if (!fileProgress.bytesUploaded) return 0;

  var uploadSpeed = getSpeed(fileProgress);
  var bytesRemaining = getBytesRemaining(fileProgress);
  var secondsRemaining = Math.round(bytesRemaining / uploadSpeed * 10) / 10;

  return secondsRemaining;
}

function prettyETA(seconds) {
  var time = secondsToTime(seconds);

  // Only display hours and minutes if they are greater than 0 but always
  // display minutes if hours is being displayed
  // Display a leading zero if the there is a preceding unit: 1m 05s, but 5s
  var hoursStr = time.hours ? time.hours + 'h ' : '';
  var minutesVal = time.hours ? ('0' + time.minutes).substr(-2) : time.minutes;
  var minutesStr = minutesVal ? minutesVal + 'm ' : '';
  var secondsVal = minutesVal ? ('0' + time.seconds).substr(-2) : time.seconds;
  var secondsStr = secondsVal + 's';

  return '' + hoursStr + minutesStr + secondsStr;
}

/**
 * Check if an object is a DOM element. Duck-typing based on `nodeType`.
 *
 * @param {*} obj
 */
function isDOMElement(obj) {
  return obj && (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' && obj.nodeType === Node.ELEMENT_NODE;
}

/**
 * Find a DOM element.
 *
 * @param {Node|string} element
 * @return {Node|null}
 */
function findDOMElement(element) {
  if (typeof element === 'string') {
    return document.querySelector(element);
  }

  if ((typeof element === 'undefined' ? 'undefined' : _typeof(element)) === 'object' && isDOMElement(element)) {
    return element;
  }
}

/**
 * Find one or more DOM elements.
 *
 * @param {string} element
 * @return {Array|null}
 */
function findAllDOMElements(element) {
  if (typeof element === 'string') {
    var elements = [].slice.call(document.querySelectorAll(element));
    return elements.length > 0 ? elements : null;
  }

  if ((typeof element === 'undefined' ? 'undefined' : _typeof(element)) === 'object' && isDOMElement(element)) {
    return [element];
  }
}

function getSocketHost(url) {
  // get the host domain
  var regex = /^(?:https?:\/\/|\/\/)?(?:[^@\n]+@)?(?:www\.)?([^\n]+)/;
  var host = regex.exec(url)[1];
  var socketProtocol = location.protocol === 'https:' ? 'wss' : 'ws';

  return socketProtocol + '://' + host;
}

function _emitSocketProgress(uploader, progressData, file) {
  var progress = progressData.progress,
      bytesUploaded = progressData.bytesUploaded,
      bytesTotal = progressData.bytesTotal;

  if (progress) {
    uploader.uppy.log('Upload progress: ' + progress);
    uploader.uppy.emit('upload-progress', file, {
      uploader: uploader,
      bytesUploaded: bytesUploaded,
      bytesTotal: bytesTotal
    });
  }
}

var emitSocketProgress = throttle(_emitSocketProgress, 300, { leading: true, trailing: true });

function settle(promises) {
  var resolutions = [];
  var rejections = [];
  function resolved(value) {
    resolutions.push(value);
  }
  function rejected(error) {
    rejections.push(error);
  }

  var wait = _Promise.all(promises.map(function (promise) {
    return promise.then(resolved, rejected);
  }));

  return wait.then(function () {
    return {
      successful: resolutions,
      failed: rejections
    };
  });
}

/**
 * Limit the amount of simultaneously pending Promises.
 * Returns a function that, when passed a function `fn`,
 * will make sure that at most `limit` calls to `fn` are pending.
 *
 * @param {number} limit
 * @return {function()}
 */
function limitPromises(limit) {
  var pending = 0;
  var queue = [];
  return function (fn) {
    return function () {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      var call = function call() {
        pending++;
        var promise = fn.apply(undefined, args);
        promise.then(onfinish, onfinish);
        return promise;
      };

      if (pending >= limit) {
        return new _Promise(function (resolve, reject) {
          queue.push(function () {
            call().then(resolve, reject);
          });
        });
      }
      return call();
    };
  };
  function onfinish() {
    pending--;
    var next = queue.shift();
    if (next) next();
  }
}

module.exports = {
  generateFileID: generateFileID,
  toArray: toArray,
  getTimeStamp: getTimeStamp,
  runPromiseSequence: runPromiseSequence,
  isTouchDevice: isTouchDevice,
  getFileNameAndExtension: getFileNameAndExtension,
  truncateString: truncateString,
  getFileTypeExtension: getFileTypeExtension,
  getFileType: getFileType,
  getArrayBuffer: getArrayBuffer,
  isPreviewSupported: isPreviewSupported,
  isObjectURL: isObjectURL,
  createThumbnail: createThumbnail,
  secondsToTime: secondsToTime,
  dataURItoBlob: dataURItoBlob,
  dataURItoFile: dataURItoFile,
  canvasToBlob: canvasToBlob,
  getSpeed: getSpeed,
  getBytesRemaining: getBytesRemaining,
  getETA: getETA,
  copyToClipboard: copyToClipboard,
  prettyETA: prettyETA,
  findDOMElement: findDOMElement,
  findAllDOMElements: findAllDOMElements,
  getSocketHost: getSocketHost,
  emitSocketProgress: emitSocketProgress,
  settle: settle,
  limitPromises: limitPromises
};

},{"../vendor/file-type":32,"es6-promise":4,"lodash.throttle":6}],27:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Plugin = require('../core/Plugin');

var _require = require('../core/Utils'),
    toArray = _require.toArray;

var Translator = require('../core/Translator');

var _require2 = require('preact'),
    h = _require2.h;

module.exports = function (_Plugin) {
  _inherits(FileInput, _Plugin);

  function FileInput(uppy, opts) {
    _classCallCheck(this, FileInput);

    var _this = _possibleConstructorReturn(this, _Plugin.call(this, uppy, opts));

    _this.id = _this.opts.id || 'FileInput';
    _this.title = 'File Input';
    _this.type = 'acquirer';

    var defaultLocale = {
      strings: {
        chooseFiles: 'Choose files'
      }

      // Default options
    };var defaultOptions = {
      target: null,
      allowMultipleFiles: true,
      pretty: true,
      inputName: 'files[]',
      locale: defaultLocale

      // Merge default options with the ones set by user
    };_this.opts = _extends({}, defaultOptions, opts);

    _this.locale = _extends({}, defaultLocale, _this.opts.locale);
    _this.locale.strings = _extends({}, defaultLocale.strings, _this.opts.locale.strings);

    // i18n
    _this.translator = new Translator({ locale: _this.locale });
    _this.i18n = _this.translator.translate.bind(_this.translator);

    _this.render = _this.render.bind(_this);
    _this.handleInputChange = _this.handleInputChange.bind(_this);
    _this.handleClick = _this.handleClick.bind(_this);
    return _this;
  }

  FileInput.prototype.handleInputChange = function handleInputChange(ev) {
    var _this2 = this;

    this.uppy.log('[FileInput] Something selected through input...');

    var files = toArray(ev.target.files);

    files.forEach(function (file) {
      _this2.uppy.addFile({
        source: _this2.id,
        name: file.name,
        type: file.type,
        data: file
      }).catch(function () {
        // Ignore
      });
    });
  };

  FileInput.prototype.handleClick = function handleClick(ev) {
    this.input.click();
  };

  FileInput.prototype.render = function render(state) {
    var _this3 = this;

    var hiddenInputStyle = {
      width: '0.1px',
      height: '0.1px',
      opacity: 0,
      overflow: 'hidden',
      position: 'absolute',
      zIndex: -1
    };

    return h(
      'div',
      { 'class': 'uppy uppy-FileInput-container' },
      h('input', { 'class': 'uppy-FileInput-input',
        style: this.opts.pretty && hiddenInputStyle,
        type: 'file',
        name: this.opts.inputName,
        onchange: this.handleInputChange,
        multiple: this.opts.allowMultipleFiles,
        ref: function ref(input) {
          _this3.input = input;
        } }),
      this.opts.pretty && h(
        'button',
        { 'class': 'uppy-FileInput-btn', type: 'button', onclick: this.handleClick },
        this.i18n('chooseFiles')
      )
    );
  };

  FileInput.prototype.install = function install() {
    var target = this.opts.target;
    if (target) {
      this.mount(target, this);
    }
  };

  FileInput.prototype.uninstall = function uninstall() {
    this.unmount();
  };

  return FileInput;
}(Plugin);

},{"../core/Plugin":23,"../core/Translator":24,"../core/Utils":26,"preact":9}],28:[function(require,module,exports){
'use strict';

var throttle = require('lodash.throttle');

var _require = require('preact'),
    h = _require.h;

function progressDetails(props) {
  return h(
    'span',
    null,
    props.totalProgress || 0,
    '%\u30FB',
    props.complete,
    ' / ',
    props.inProgress,
    '\u30FB',
    props.totalUploadedSize,
    ' / ',
    props.totalSize,
    '\u30FB\u2191 ',
    props.totalSpeed,
    '/s\u30FB',
    props.totalETA
  );
}

var ThrottledProgressDetails = throttle(progressDetails, 500, { leading: true, trailing: true });

var STATE_ERROR = 'error';
var STATE_WAITING = 'waiting';
var STATE_PREPROCESSING = 'preprocessing';
var STATE_UPLOADING = 'uploading';
var STATE_POSTPROCESSING = 'postprocessing';
var STATE_COMPLETE = 'complete';

function getUploadingState(props, files) {
  if (props.isAllErrored) {
    return STATE_ERROR;
  }

  // If ALL files have been completed, show the completed state.
  if (props.isAllComplete) {
    return STATE_COMPLETE;
  }

  var state = STATE_WAITING;
  var fileIDs = Object.keys(files);
  for (var i = 0; i < fileIDs.length; i++) {
    var progress = files[fileIDs[i]].progress;
    // If ANY files are being uploaded right now, show the uploading state.
    if (progress.uploadStarted && !progress.uploadComplete) {
      return STATE_UPLOADING;
    }
    // If files are being preprocessed AND postprocessed at this time, we show the
    // preprocess state. If any files are being uploaded we show uploading.
    if (progress.preprocess && state !== STATE_UPLOADING) {
      state = STATE_PREPROCESSING;
    }
    // If NO files are being preprocessed or uploaded right now, but some files are
    // being postprocessed, show the postprocess state.
    if (progress.postprocess && state !== STATE_UPLOADING && state !== STATE_PREPROCESSING) {
      state = STATE_POSTPROCESSING;
    }
  }
  return state;
}

function calculateProcessingProgress(files) {
  // Collect pre or postprocessing progress states.
  var progresses = [];
  Object.keys(files).forEach(function (fileID) {
    var progress = files[fileID].progress;

    if (progress.preprocess) {
      progresses.push(progress.preprocess);
    }
    if (progress.postprocess) {
      progresses.push(progress.postprocess);
    }
  });

  // In the future we should probably do this differently. For now we'll take the
  // mode and message from the first file…
  var _progresses$ = progresses[0],
      mode = _progresses$.mode,
      message = _progresses$.message;

  var value = progresses.filter(isDeterminate).reduce(function (total, progress, index, all) {
    return total + progress.value / all.length;
  }, 0);
  function isDeterminate(progress) {
    return progress.mode === 'determinate';
  }

  return {
    mode: mode,
    message: message,
    value: value
  };
}

function togglePauseResume(props) {
  if (props.isAllComplete) return;

  if (!props.resumableUploads) {
    return props.cancelAll();
  }

  if (props.isAllPaused) {
    return props.resumeAll();
  }

  return props.pauseAll();
}

module.exports = function (props) {
  props = props || {};

  var uploadState = getUploadingState(props, props.files || {});

  var progressValue = props.totalProgress;
  var progressMode = void 0;
  var progressBarContent = void 0;
  if (uploadState === STATE_PREPROCESSING || uploadState === STATE_POSTPROCESSING) {
    var progress = calculateProcessingProgress(props.files);
    progressMode = progress.mode;
    if (progressMode === 'determinate') {
      progressValue = progress.value * 100;
    }

    progressBarContent = ProgressBarProcessing(progress);
  } else if (uploadState === STATE_COMPLETE) {
    progressBarContent = ProgressBarComplete(props);
  } else if (uploadState === STATE_UPLOADING) {
    progressBarContent = ProgressBarUploading(props);
  } else if (uploadState === STATE_ERROR) {
    progressValue = undefined;
    progressBarContent = ProgressBarError(props);
  }

  var width = typeof progressValue === 'number' ? progressValue : 100;
  var isHidden = uploadState === STATE_WAITING && props.hideUploadButton || uploadState === STATE_WAITING && !props.newFiles > 0 || uploadState === STATE_COMPLETE && props.hideAfterFinish;

  var progressClasses = 'uppy-StatusBar-progress\n                           ' + (progressMode ? 'is-' + progressMode : '');

  return h(
    'div',
    { 'class': 'uppy uppy-StatusBar is-' + uploadState, 'aria-hidden': isHidden },
    h('div', { 'class': progressClasses,
      style: { width: width + '%' },
      role: 'progressbar',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': progressValue }),
    progressBarContent,
    h(
      'div',
      { 'class': 'uppy-StatusBar-actions' },
      props.newFiles && !props.hideUploadButton ? h(UploadBtn, props) : null,
      props.error ? h(RetryBtn, props) : null
    )
  );
};

var UploadBtn = function UploadBtn(props) {
  return h(
    'button',
    { type: 'button',
      'class': 'uppy-StatusBar-actionBtn uppy-StatusBar-actionBtn--upload',
      'aria-label': props.i18n('uploadXFiles', { smart_count: props.newFiles }),
      onclick: props.startUpload },
    props.inProgress ? props.i18n('uploadXNewFiles', { smart_count: props.newFiles }) : props.i18n('uploadXFiles', { smart_count: props.newFiles })
  );
};

var RetryBtn = function RetryBtn(props) {
  return h(
    'button',
    { type: 'button',
      'class': 'uppy-StatusBar-actionBtn uppy-StatusBar-actionBtn--retry',
      'aria-label': props.i18n('retryUpload'),
      onclick: props.retryAll },
    props.i18n('retry')
  );
};

var ProgressBarProcessing = function ProgressBarProcessing(props) {
  var value = Math.round(props.value * 100);

  return h(
    'div',
    { 'class': 'uppy-StatusBar-content' },
    props.mode === 'determinate' ? value + '%\u30FB' : '',
    props.message
  );
};

var ProgressBarUploading = function ProgressBarUploading(props) {
  var i18n = props.i18n;

  return h(
    'div',
    { 'class': 'uppy-StatusBar-content' },
    props.isUploadStarted && !props.isAllComplete ? !props.isAllPaused ? h(
      'div',
      { title: 'Uploading' },
      h(PauseResumeButtons, props),
      ' ',
      i18n('uploading'),
      ' ',
      h(ThrottledProgressDetails, props)
    ) : h(
      'div',
      { title: 'Paused' },
      h(PauseResumeButtons, props),
      ' ',
      i18n('paused'),
      '\u30FB',
      props.totalProgress,
      '%'
    ) : null
  );
};

var ProgressBarComplete = function ProgressBarComplete(_ref) {
  var totalProgress = _ref.totalProgress,
      i18n = _ref.i18n;

  return h(
    'div',
    { 'class': 'uppy-StatusBar-content', role: 'status' },
    h(
      'span',
      { title: 'Complete' },
      h(
        'svg',
        { 'aria-hidden': 'true', 'class': 'uppy-StatusBar-statusIndicator UppyIcon', width: '18', height: '17', viewBox: '0 0 23 17' },
        h('path', { d: 'M8.944 17L0 7.865l2.555-2.61 6.39 6.525L20.41 0 23 2.645z' })
      ),
      i18n('uploadComplete'),
      '\u30FB',
      totalProgress,
      '%'
    )
  );
};

var ProgressBarError = function ProgressBarError(_ref2) {
  var error = _ref2.error,
      retryAll = _ref2.retryAll,
      i18n = _ref2.i18n;

  return h(
    'div',
    { 'class': 'uppy-StatusBar-content', role: 'alert' },
    h(
      'strong',
      null,
      i18n('uploadFailed'),
      '.'
    ),
    ' ',
    h(
      'span',
      null,
      i18n('pleasePressRetry')
    ),
    h(
      'span',
      { 'class': 'uppy-StatusBar-details',
        'aria-label': error,
        'data-microtip-position': 'top',
        'data-microtip-size': 'large',
        role: 'tooltip' },
      '?'
    )
  );
};

var PauseResumeButtons = function PauseResumeButtons(props) {
  var resumableUploads = props.resumableUploads,
      isAllPaused = props.isAllPaused,
      i18n = props.i18n;

  var title = resumableUploads ? isAllPaused ? i18n('resumeUpload') : i18n('pauseUpload') : i18n('cancelUpload');

  return h(
    'button',
    { title: title, 'class': 'uppy-StatusBar-statusIndicator', type: 'button', onclick: function onclick() {
        return togglePauseResume(props);
      } },
    resumableUploads ? isAllPaused ? h(
      'svg',
      { 'aria-hidden': 'true', 'class': 'UppyIcon', width: '15', height: '17', viewBox: '0 0 11 13' },
      h('path', { d: 'M1.26 12.534a.67.67 0 0 1-.674.012.67.67 0 0 1-.336-.583v-11C.25.724.38.5.586.382a.658.658 0 0 1 .673.012l9.165 5.5a.66.66 0 0 1 .325.57.66.66 0 0 1-.325.573l-9.166 5.5z' })
    ) : h(
      'svg',
      { 'aria-hidden': 'true', 'class': 'UppyIcon', width: '16', height: '17', viewBox: '0 0 12 13' },
      h('path', { d: 'M4.888.81v11.38c0 .446-.324.81-.722.81H2.722C2.324 13 2 12.636 2 12.19V.81c0-.446.324-.81.722-.81h1.444c.398 0 .722.364.722.81zM9.888.81v11.38c0 .446-.324.81-.722.81H7.722C7.324 13 7 12.636 7 12.19V.81c0-.446.324-.81.722-.81h1.444c.398 0 .722.364.722.81z' })
    ) : h(
      'svg',
      { 'aria-hidden': 'true', 'class': 'UppyIcon', width: '16px', height: '16px', viewBox: '0 0 19 19' },
      h('path', { d: 'M17.318 17.232L9.94 9.854 9.586 9.5l-.354.354-7.378 7.378h.707l-.62-.62v.706L9.318 9.94l.354-.354-.354-.354L1.94 1.854v.707l.62-.62h-.706l7.378 7.378.354.354.354-.354 7.378-7.378h-.707l.622.62v-.706L9.854 9.232l-.354.354.354.354 7.378 7.378.708-.707-7.38-7.378v.708l7.38-7.38.353-.353-.353-.353-.622-.622-.353-.353-.354.352-7.378 7.38h.708L2.56 1.23 2.208.88l-.353.353-.622.62-.353.355.352.353 7.38 7.38v-.708l-7.38 7.38-.353.353.352.353.622.622.353.353.354-.353 7.38-7.38h-.708l7.38 7.38z' })
    )
  );
};

},{"lodash.throttle":6,"preact":9}],29:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Plugin = require('../../core/Plugin');
var Translator = require('../../core/Translator');
var StatusBarUI = require('./StatusBar');

var _require = require('../../core/Utils'),
    getSpeed = _require.getSpeed;

var _require2 = require('../../core/Utils'),
    getBytesRemaining = _require2.getBytesRemaining;

var _require3 = require('../../core/Utils'),
    prettyETA = _require3.prettyETA;

var prettyBytes = require('prettier-bytes');

/**
 * A status bar.
 */
module.exports = function (_Plugin) {
  _inherits(StatusBar, _Plugin);

  function StatusBar(uppy, opts) {
    _classCallCheck(this, StatusBar);

    var _this = _possibleConstructorReturn(this, _Plugin.call(this, uppy, opts));

    _this.id = _this.opts.id || 'StatusBar';
    _this.title = 'StatusBar';
    _this.type = 'progressindicator';

    var defaultLocale = {
      strings: {
        uploading: 'Uploading...',
        uploadComplete: 'Upload complete',
        uploadFailed: 'Upload failed',
        pleasePressRetry: 'Please press Retry to upload again',
        paused: 'Paused',
        error: 'Error',
        retry: 'Retry',
        pressToRetry: 'Press to retry',
        retryUpload: 'Retry upload',
        resumeUpload: 'Resume upload',
        cancelUpload: 'Cancel upload',
        pauseUpload: 'Pause upload',
        uploadXFiles: {
          0: 'Upload %{smart_count} file',
          1: 'Upload %{smart_count} files'
        },
        uploadXNewFiles: {
          0: 'Upload +%{smart_count} file',
          1: 'Upload +%{smart_count} files'
        }
      }

      // set default options
    };var defaultOptions = {
      target: 'body',
      hideUploadButton: false,
      showProgressDetails: false,
      locale: defaultLocale,
      hideAfterFinish: true

      // merge default options with the ones set by user
    };_this.opts = _extends({}, defaultOptions, opts);

    _this.locale = _extends({}, defaultLocale, _this.opts.locale);
    _this.locale.strings = _extends({}, defaultLocale.strings, _this.opts.locale.strings);

    _this.translator = new Translator({ locale: _this.locale });
    _this.i18n = _this.translator.translate.bind(_this.translator);

    _this.startUpload = _this.startUpload.bind(_this);
    _this.render = _this.render.bind(_this);
    _this.install = _this.install.bind(_this);
    return _this;
  }

  StatusBar.prototype.getTotalSpeed = function getTotalSpeed(files) {
    var totalSpeed = 0;
    files.forEach(function (file) {
      totalSpeed = totalSpeed + getSpeed(file.progress);
    });
    return totalSpeed;
  };

  StatusBar.prototype.getTotalETA = function getTotalETA(files) {
    var totalSpeed = this.getTotalSpeed(files);
    if (totalSpeed === 0) {
      return 0;
    }

    var totalBytesRemaining = files.reduce(function (total, file) {
      return total + getBytesRemaining(file.progress);
    }, 0);

    return Math.round(totalBytesRemaining / totalSpeed * 10) / 10;
  };

  StatusBar.prototype.startUpload = function startUpload() {
    return this.uppy.upload().catch(function () {
      // Ignore
    });
  };

  StatusBar.prototype.render = function render(state) {
    var files = state.files;

    var uploadStartedFiles = Object.keys(files).filter(function (file) {
      return files[file].progress.uploadStarted;
    });
    var newFiles = Object.keys(files).filter(function (file) {
      return !files[file].progress.uploadStarted && !files[file].progress.preprocess && !files[file].progress.postprocess;
    });
    var completeFiles = Object.keys(files).filter(function (file) {
      return files[file].progress.uploadComplete;
    });
    var erroredFiles = Object.keys(files).filter(function (file) {
      return files[file].error;
    });
    var inProgressFiles = Object.keys(files).filter(function (file) {
      return !files[file].progress.uploadComplete && files[file].progress.uploadStarted && !files[file].isPaused;
    });
    var processingFiles = Object.keys(files).filter(function (file) {
      return files[file].progress.preprocess || files[file].progress.postprocess;
    });

    var inProgressFilesArray = [];
    inProgressFiles.forEach(function (file) {
      inProgressFilesArray.push(files[file]);
    });

    var totalSpeed = prettyBytes(this.getTotalSpeed(inProgressFilesArray));
    var totalETA = prettyETA(this.getTotalETA(inProgressFilesArray));

    // total size and uploaded size
    var totalSize = 0;
    var totalUploadedSize = 0;
    inProgressFilesArray.forEach(function (file) {
      totalSize = totalSize + (file.progress.bytesTotal || 0);
      totalUploadedSize = totalUploadedSize + (file.progress.bytesUploaded || 0);
    });
    totalSize = prettyBytes(totalSize);
    totalUploadedSize = prettyBytes(totalUploadedSize);

    var isUploadStarted = uploadStartedFiles.length > 0;

    var isAllComplete = state.totalProgress === 100 && completeFiles.length === Object.keys(files).length && processingFiles.length === 0;

    var isAllErrored = isUploadStarted && erroredFiles.length === uploadStartedFiles.length;

    var isAllPaused = inProgressFiles.length === 0 && !isAllComplete && !isAllErrored && uploadStartedFiles.length > 0;

    var resumableUploads = this.uppy.getState().capabilities.resumableUploads || false;

    return StatusBarUI({
      error: state.error,
      totalProgress: state.totalProgress,
      totalSize: totalSize,
      totalUploadedSize: totalUploadedSize,
      uploadStartedFiles: uploadStartedFiles,
      isAllComplete: isAllComplete,
      isAllPaused: isAllPaused,
      isAllErrored: isAllErrored,
      isUploadStarted: isUploadStarted,
      i18n: this.i18n,
      pauseAll: this.uppy.pauseAll,
      resumeAll: this.uppy.resumeAll,
      retryAll: this.uppy.retryAll,
      cancelAll: this.uppy.cancelAll,
      startUpload: this.startUpload,
      complete: completeFiles.length,
      newFiles: newFiles.length,
      inProgress: uploadStartedFiles.length,
      totalSpeed: totalSpeed,
      totalETA: totalETA,
      files: state.files,
      resumableUploads: resumableUploads,
      hideUploadButton: this.opts.hideUploadButton,
      hideAfterFinish: this.opts.hideAfterFinish
    });
  };

  StatusBar.prototype.install = function install() {
    var target = this.opts.target;
    if (target) {
      this.mount(target, this);
    }
  };

  StatusBar.prototype.uninstall = function uninstall() {
    this.unmount();
  };

  return StatusBar;
}(Plugin);

},{"../../core/Plugin":23,"../../core/Translator":24,"../../core/Utils":26,"./StatusBar":28,"prettier-bytes":10}],30:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _Promise = typeof Promise === 'undefined' ? require('es6-promise').Promise : Promise;

var Plugin = require('../core/Plugin');
var tus = require('tus-js-client');
var UppySocket = require('../core/UppySocket');

var _require = require('../core/Utils'),
    emitSocketProgress = _require.emitSocketProgress,
    getSocketHost = _require.getSocketHost,
    settle = _require.settle;

require('whatwg-fetch');

// Extracted from https://github.com/tus/tus-js-client/blob/master/lib/upload.js#L13
// excepted we removed 'fingerprint' key to avoid adding more dependencies
var tusDefaultOptions = {
  endpoint: '',
  resume: true,
  onProgress: null,
  onChunkComplete: null,
  onSuccess: null,
  onError: null,
  headers: {},
  chunkSize: Infinity,
  withCredentials: false,
  uploadUrl: null,
  uploadSize: null,
  overridePatchMethod: false,
  retryDelays: null

  /**
   * Create a wrapper around an event emitter with a `remove` method to remove
   * all events that were added using the wrapped emitter.
   */
};function createEventTracker(emitter) {
  var events = [];
  return {
    on: function on(event, fn) {
      events.push([event, fn]);
      return emitter.on(event, fn);
    },
    remove: function remove() {
      events.forEach(function (_ref) {
        var event = _ref[0],
            fn = _ref[1];

        emitter.off(event, fn);
      });
    }
  };
}

/**
 * Tus resumable file uploader
 *
 */
module.exports = function (_Plugin) {
  _inherits(Tus, _Plugin);

  function Tus(uppy, opts) {
    _classCallCheck(this, Tus);

    var _this = _possibleConstructorReturn(this, _Plugin.call(this, uppy, opts));

    _this.type = 'uploader';
    _this.id = 'Tus';
    _this.title = 'Tus';

    // set default options
    var defaultOptions = {
      resume: true,
      autoRetry: true,
      retryDelays: [0, 1000, 3000, 5000]

      // merge default options with the ones set by user
    };_this.opts = _extends({}, defaultOptions, opts);

    _this.uploaders = Object.create(null);
    _this.uploaderEvents = Object.create(null);
    _this.uploaderSockets = Object.create(null);

    _this.handleResetProgress = _this.handleResetProgress.bind(_this);
    _this.handleUpload = _this.handleUpload.bind(_this);
    return _this;
  }

  Tus.prototype.handleResetProgress = function handleResetProgress() {
    var files = _extends({}, this.uppy.state.files);
    Object.keys(files).forEach(function (fileID) {
      // Only clone the file object if it has a Tus `uploadUrl` attached.
      if (files[fileID].tus && files[fileID].tus.uploadUrl) {
        var tusState = _extends({}, files[fileID].tus);
        delete tusState.uploadUrl;
        files[fileID] = _extends({}, files[fileID], { tus: tusState });
      }
    });

    this.uppy.setState({ files: files });
  };

  /**
   * Clean up all references for a file's upload: the tus.Upload instance,
   * any events related to the file, and the uppy-server WebSocket connection.
   */


  Tus.prototype.resetUploaderReferences = function resetUploaderReferences(fileID) {
    if (this.uploaders[fileID]) {
      this.uploaders[fileID].abort();
      this.uploaders[fileID] = null;
    }
    if (this.uploaderEvents[fileID]) {
      this.uploaderEvents[fileID].remove();
      this.uploaderEvents[fileID] = null;
    }
    if (this.uploaderSockets[fileID]) {
      this.uploaderSockets[fileID].close();
      this.uploaderSockets[fileID] = null;
    }
  };

  /**
   * Create a new Tus upload
   *
   * @param {object} file for use with upload
   * @param {integer} current file in a queue
   * @param {integer} total number of files in a queue
   * @returns {Promise}
   */


  Tus.prototype.upload = function upload(file, current, total) {
    var _this2 = this;

    this.resetUploaderReferences(file.id);

    // Create a new tus upload
    return new _Promise(function (resolve, reject) {
      var optsTus = _extends({}, tusDefaultOptions, _this2.opts,
      // Install file-specific upload overrides.
      file.tus || {});

      optsTus.onError = function (err) {
        _this2.uppy.log(err);
        _this2.uppy.emit('upload-error', file, err);
        err.message = 'Failed because: ' + err.message;

        _this2.resetUploaderReferences(file.id);
        reject(err);
      };

      optsTus.onProgress = function (bytesUploaded, bytesTotal) {
        _this2.onReceiveUploadUrl(file, upload.url);
        _this2.uppy.emit('upload-progress', file, {
          uploader: _this2,
          bytesUploaded: bytesUploaded,
          bytesTotal: bytesTotal
        });
      };

      optsTus.onSuccess = function () {
        _this2.uppy.emit('upload-success', file, upload, upload.url);

        if (upload.url) {
          _this2.uppy.log('Download ' + upload.file.name + ' from ' + upload.url);
        }

        _this2.resetUploaderReferences(file.id);
        resolve(upload);
      };
      optsTus.metadata = file.meta;

      var upload = new tus.Upload(file.data, optsTus);
      _this2.uploaders[file.id] = upload;
      _this2.uploaderEvents[file.id] = createEventTracker(_this2.uppy);

      _this2.onFileRemove(file.id, function (targetFileID) {
        _this2.resetUploaderReferences(file.id);
        resolve('upload ' + targetFileID + ' was removed');
      });

      _this2.onPause(file.id, function (isPaused) {
        if (isPaused) {
          upload.abort();
        } else {
          upload.start();
        }
      });

      _this2.onPauseAll(file.id, function () {
        upload.abort();
      });

      _this2.onCancelAll(file.id, function () {
        _this2.resetUploaderReferences(file.id);
      });

      _this2.onResumeAll(file.id, function () {
        if (file.error) {
          upload.abort();
        }
        upload.start();
      });

      if (!file.isPaused) {
        upload.start();
      }
      if (!file.isRestored) {
        _this2.uppy.emit('upload-started', file, upload);
      }
    });
  };

  Tus.prototype.uploadRemote = function uploadRemote(file, current, total) {
    var _this3 = this;

    this.resetUploaderReferences(file.id);

    var opts = _extends({}, this.opts,
    // Install file-specific upload overrides.
    file.tus || {});

    return new _Promise(function (resolve, reject) {
      _this3.uppy.log(file.remote.url);
      if (file.serverToken) {
        return _this3.connectToServerSocket(file).then(function () {
          return resolve();
        }).catch(reject);
      }

      _this3.uppy.emit('upload-started', file);

      fetch(file.remote.url, {
        method: 'post',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(_extends({}, file.remote.body, {
          endpoint: opts.endpoint,
          uploadUrl: opts.uploadUrl,
          protocol: 'tus',
          size: file.data.size,
          metadata: file.meta
        }))
      }).then(function (res) {
        if (res.status < 200 || res.status > 300) {
          return reject(res.statusText);
        }

        return res.json().then(function (data) {
          _this3.uppy.setFileState(file.id, { serverToken: data.token });
          file = _this3.getFile(file.id);
          return file;
        });
      }).then(function (file) {
        return _this3.connectToServerSocket(file);
      }).then(function () {
        resolve();
      }).catch(function (err) {
        reject(new Error(err));
      });
    });
  };

  Tus.prototype.connectToServerSocket = function connectToServerSocket(file) {
    var _this4 = this;

    return new _Promise(function (resolve, reject) {
      var token = file.serverToken;
      var host = getSocketHost(file.remote.host);
      var socket = new UppySocket({ target: host + '/api/' + token });
      _this4.uploaderSockets[file.id] = socket;
      _this4.uploaderEvents[file.id] = createEventTracker(_this4.uppy);

      _this4.onFileRemove(file.id, function () {
        socket.send('pause', {});
        resolve('upload ' + file.id + ' was removed');
      });

      _this4.onPause(file.id, function (isPaused) {
        isPaused ? socket.send('pause', {}) : socket.send('resume', {});
      });

      _this4.onPauseAll(file.id, function () {
        return socket.send('pause', {});
      });

      _this4.onCancelAll(file.id, function () {
        return socket.send('pause', {});
      });

      _this4.onResumeAll(file.id, function () {
        if (file.error) {
          socket.send('pause', {});
        }
        socket.send('resume', {});
      });

      _this4.onRetry(file.id, function () {
        socket.send('pause', {});
        socket.send('resume', {});
      });

      _this4.onRetryAll(file.id, function () {
        socket.send('pause', {});
        socket.send('resume', {});
      });

      if (file.isPaused) {
        socket.send('pause', {});
      }

      socket.on('progress', function (progressData) {
        return emitSocketProgress(_this4, progressData, file);
      });

      socket.on('error', function (errData) {
        _this4.uppy.emit('upload-error', file, new Error(errData.error));
        reject(new Error(errData.error));
      });

      socket.on('success', function (data) {
        _this4.uppy.emit('upload-success', file, data, data.url);
        _this4.resetUploaderReferences(file.id);
        resolve();
      });
    });
  };

  Tus.prototype.getFile = function getFile(fileID) {
    return this.uppy.state.files[fileID];
  };

  Tus.prototype.updateFile = function updateFile(file) {
    var _extends2;

    var files = _extends({}, this.uppy.state.files, (_extends2 = {}, _extends2[file.id] = file, _extends2));
    this.uppy.setState({ files: files });
  };

  Tus.prototype.onReceiveUploadUrl = function onReceiveUploadUrl(file, uploadURL) {
    var currentFile = this.getFile(file.id);
    if (!currentFile) return;
    // Only do the update if we didn't have an upload URL yet,
    // or resume: false in options
    if ((!currentFile.tus || currentFile.tus.uploadUrl !== uploadURL) && this.opts.resume) {
      this.uppy.log('[Tus] Storing upload url');
      var newFile = _extends({}, currentFile, {
        tus: _extends({}, currentFile.tus, {
          uploadUrl: uploadURL
        })
      });
      this.updateFile(newFile);
    }
  };

  Tus.prototype.onFileRemove = function onFileRemove(fileID, cb) {
    this.uploaderEvents[fileID].on('file-removed', function (file) {
      if (fileID === file.id) cb(file.id);
    });
  };

  Tus.prototype.onPause = function onPause(fileID, cb) {
    this.uploaderEvents[fileID].on('upload-pause', function (targetFileID, isPaused) {
      if (fileID === targetFileID) {
        // const isPaused = this.uppy.pauseResume(fileID)
        cb(isPaused);
      }
    });
  };

  Tus.prototype.onRetry = function onRetry(fileID, cb) {
    this.uploaderEvents[fileID].on('upload-retry', function (targetFileID) {
      if (fileID === targetFileID) {
        cb();
      }
    });
  };

  Tus.prototype.onRetryAll = function onRetryAll(fileID, cb) {
    var _this5 = this;

    this.uploaderEvents[fileID].on('retry-all', function (filesToRetry) {
      if (!_this5.uppy.getFile(fileID)) return;
      cb();
    });
  };

  Tus.prototype.onPauseAll = function onPauseAll(fileID, cb) {
    var _this6 = this;

    this.uploaderEvents[fileID].on('pause-all', function () {
      if (!_this6.uppy.getFile(fileID)) return;
      cb();
    });
  };

  Tus.prototype.onCancelAll = function onCancelAll(fileID, cb) {
    var _this7 = this;

    this.uploaderEvents[fileID].on('cancel-all', function () {
      if (!_this7.uppy.getFile(fileID)) return;
      cb();
    });
  };

  Tus.prototype.onResumeAll = function onResumeAll(fileID, cb) {
    var _this8 = this;

    this.uploaderEvents[fileID].on('resume-all', function () {
      if (!_this8.uppy.getFile(fileID)) return;
      cb();
    });
  };

  Tus.prototype.uploadFiles = function uploadFiles(files) {
    var _this9 = this;

    var promises = files.map(function (file, index) {
      var current = parseInt(index, 10) + 1;
      var total = files.length;

      if (file.error) {
        return _Promise.reject(new Error(file.error));
      }

      _this9.uppy.log('uploading ' + current + ' of ' + total);

      if (file.isRemote) {
        return _this9.uploadRemote(file, current, total);
      } else {
        return _this9.upload(file, current, total);
      }
    });

    return settle(promises);
  };

  Tus.prototype.handleUpload = function handleUpload(fileIDs) {
    var _this10 = this;

    if (fileIDs.length === 0) {
      this.uppy.log('Tus: no files to upload!');
      return _Promise.resolve();
    }

    this.uppy.log('Tus is uploading...');
    var filesToUpload = fileIDs.map(function (fileID) {
      return _this10.uppy.getFile(fileID);
    });

    return this.uploadFiles(filesToUpload).then(function () {
      return null;
    });
  };

  Tus.prototype.addResumableUploadsCapabilityFlag = function addResumableUploadsCapabilityFlag() {
    var newCapabilities = _extends({}, this.uppy.getState().capabilities);
    newCapabilities.resumableUploads = true;
    this.uppy.setState({
      capabilities: newCapabilities
    });
  };

  Tus.prototype.install = function install() {
    this.addResumableUploadsCapabilityFlag();
    this.uppy.addUploader(this.handleUpload);

    this.uppy.on('reset-progress', this.handleResetProgress);

    if (this.opts.autoRetry) {
      this.uppy.on('back-online', this.uppy.retryAll);
    }
  };

  Tus.prototype.uninstall = function uninstall() {
    this.uppy.removeUploader(this.handleUpload);

    if (this.opts.autoRetry) {
      this.uppy.off('back-online', this.uppy.retryAll);
    }
  };

  return Tus;
}(Plugin);

},{"../core/Plugin":23,"../core/UppySocket":25,"../core/Utils":26,"es6-promise":4,"tus-js-client":18,"whatwg-fetch":20}],31:[function(require,module,exports){
"use strict";

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Default store that keeps state in a simple object.
 */
var DefaultStore = function () {
  function DefaultStore() {
    _classCallCheck(this, DefaultStore);

    this.state = {};
    this.callbacks = [];
  }

  DefaultStore.prototype.getState = function getState() {
    return this.state;
  };

  DefaultStore.prototype.setState = function setState(patch) {
    var prevState = _extends({}, this.state);
    var nextState = _extends({}, this.state, patch);

    this.state = nextState;
    this._publish(prevState, nextState, patch);
  };

  DefaultStore.prototype.subscribe = function subscribe(listener) {
    var _this = this;

    this.callbacks.push(listener);
    return function () {
      // Remove the listener.
      _this.callbacks.splice(_this.callbacks.indexOf(listener), 1);
    };
  };

  DefaultStore.prototype._publish = function _publish() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    this.callbacks.forEach(function (listener) {
      listener.apply(undefined, args);
    });
  };

  return DefaultStore;
}();

module.exports = function defaultStore() {
  return new DefaultStore();
};

},{}],32:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

module.exports = function (input) {
	var buf = new Uint8Array(input);

	if (!(buf && buf.length > 1)) {
		return null;
	}

	var check = function check(header, opts) {
		opts = _extends({
			offset: 0
		}, opts);

		for (var i = 0; i < header.length; i++) {
			if (header[i] !== buf[i + opts.offset]) {
				return false;
			}
		}

		return true;
	};

	if (check([0xFF, 0xD8, 0xFF])) {
		return {
			ext: 'jpg',
			mime: 'image/jpeg'
		};
	}

	if (check([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
		return {
			ext: 'png',
			mime: 'image/png'
		};
	}

	if (check([0x47, 0x49, 0x46])) {
		return {
			ext: 'gif',
			mime: 'image/gif'
		};
	}

	if (check([0x57, 0x45, 0x42, 0x50], { offset: 8 })) {
		return {
			ext: 'webp',
			mime: 'image/webp'
		};
	}

	if (check([0x46, 0x4C, 0x49, 0x46])) {
		return {
			ext: 'flif',
			mime: 'image/flif'
		};
	}

	// Needs to be before `tif` check
	if ((check([0x49, 0x49, 0x2A, 0x0]) || check([0x4D, 0x4D, 0x0, 0x2A])) && check([0x43, 0x52], { offset: 8 })) {
		return {
			ext: 'cr2',
			mime: 'image/x-canon-cr2'
		};
	}

	if (check([0x49, 0x49, 0x2A, 0x0]) || check([0x4D, 0x4D, 0x0, 0x2A])) {
		return {
			ext: 'tif',
			mime: 'image/tiff'
		};
	}

	if (check([0x42, 0x4D])) {
		return {
			ext: 'bmp',
			mime: 'image/bmp'
		};
	}

	if (check([0x49, 0x49, 0xBC])) {
		return {
			ext: 'jxr',
			mime: 'image/vnd.ms-photo'
		};
	}

	if (check([0x38, 0x42, 0x50, 0x53])) {
		return {
			ext: 'psd',
			mime: 'image/vnd.adobe.photoshop'
		};
	}

	// Needs to be before the `zip` check
	if (check([0x50, 0x4B, 0x3, 0x4]) && check([0x6D, 0x69, 0x6D, 0x65, 0x74, 0x79, 0x70, 0x65, 0x61, 0x70, 0x70, 0x6C, 0x69, 0x63, 0x61, 0x74, 0x69, 0x6F, 0x6E, 0x2F, 0x65, 0x70, 0x75, 0x62, 0x2B, 0x7A, 0x69, 0x70], { offset: 30 })) {
		return {
			ext: 'epub',
			mime: 'application/epub+zip'
		};
	}

	// Needs to be before `zip` check
	// Assumes signed `.xpi` from addons.mozilla.org
	if (check([0x50, 0x4B, 0x3, 0x4]) && check([0x4D, 0x45, 0x54, 0x41, 0x2D, 0x49, 0x4E, 0x46, 0x2F, 0x6D, 0x6F, 0x7A, 0x69, 0x6C, 0x6C, 0x61, 0x2E, 0x72, 0x73, 0x61], { offset: 30 })) {
		return {
			ext: 'xpi',
			mime: 'application/x-xpinstall'
		};
	}

	if (check([0x50, 0x4B]) && (buf[2] === 0x3 || buf[2] === 0x5 || buf[2] === 0x7) && (buf[3] === 0x4 || buf[3] === 0x6 || buf[3] === 0x8)) {
		return {
			ext: 'zip',
			mime: 'application/zip'
		};
	}

	if (check([0x75, 0x73, 0x74, 0x61, 0x72], { offset: 257 })) {
		return {
			ext: 'tar',
			mime: 'application/x-tar'
		};
	}

	if (check([0x52, 0x61, 0x72, 0x21, 0x1A, 0x7]) && (buf[6] === 0x0 || buf[6] === 0x1)) {
		return {
			ext: 'rar',
			mime: 'application/x-rar-compressed'
		};
	}

	if (check([0x1F, 0x8B, 0x8])) {
		return {
			ext: 'gz',
			mime: 'application/gzip'
		};
	}

	if (check([0x42, 0x5A, 0x68])) {
		return {
			ext: 'bz2',
			mime: 'application/x-bzip2'
		};
	}

	if (check([0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C])) {
		return {
			ext: '7z',
			mime: 'application/x-7z-compressed'
		};
	}

	if (check([0x78, 0x01])) {
		return {
			ext: 'dmg',
			mime: 'application/x-apple-diskimage'
		};
	}

	if (check([0x0, 0x0, 0x0]) && (buf[3] === 0x18 || buf[3] === 0x20) && check([0x66, 0x74, 0x79, 0x70], { offset: 4 }) || check([0x33, 0x67, 0x70, 0x35]) || check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32]) && check([0x6D, 0x70, 0x34, 0x31, 0x6D, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6F, 0x6D], { offset: 16 }) || check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D]) || check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32, 0x0, 0x0, 0x0, 0x0])) {
		return {
			ext: 'mp4',
			mime: 'video/mp4'
		};
	}

	if (check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x56])) {
		return {
			ext: 'm4v',
			mime: 'video/x-m4v'
		};
	}

	if (check([0x4D, 0x54, 0x68, 0x64])) {
		return {
			ext: 'mid',
			mime: 'audio/midi'
		};
	}

	// https://github.com/threatstack/libmagic/blob/master/magic/Magdir/matroska
	if (check([0x1A, 0x45, 0xDF, 0xA3])) {
		var sliced = buf.subarray(4, 4 + 4096);
		var idPos = sliced.findIndex(function (el, i, arr) {
			return arr[i] === 0x42 && arr[i + 1] === 0x82;
		});

		if (idPos >= 0) {
			var docTypePos = idPos + 3;
			var findDocType = function findDocType(type) {
				return Array.from(type).every(function (c, i) {
					return sliced[docTypePos + i] === c.charCodeAt(0);
				});
			};

			if (findDocType('matroska')) {
				return {
					ext: 'mkv',
					mime: 'video/x-matroska'
				};
			}

			if (findDocType('webm')) {
				return {
					ext: 'webm',
					mime: 'video/webm'
				};
			}
		}
	}

	if (check([0x0, 0x0, 0x0, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20]) || check([0x66, 0x72, 0x65, 0x65], { offset: 4 }) || check([0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20], { offset: 4 }) || check([0x6D, 0x64, 0x61, 0x74], { offset: 4 }) || // MJPEG
	check([0x77, 0x69, 0x64, 0x65], { offset: 4 })) {
		return {
			ext: 'mov',
			mime: 'video/quicktime'
		};
	}

	if (check([0x52, 0x49, 0x46, 0x46]) && check([0x41, 0x56, 0x49], { offset: 8 })) {
		return {
			ext: 'avi',
			mime: 'video/x-msvideo'
		};
	}

	if (check([0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11, 0xA6, 0xD9])) {
		return {
			ext: 'wmv',
			mime: 'video/x-ms-wmv'
		};
	}

	if (check([0x0, 0x0, 0x1, 0xBA])) {
		return {
			ext: 'mpg',
			mime: 'video/mpeg'
		};
	}

	if (check([0x49, 0x44, 0x33]) || check([0xFF, 0xFB])) {
		return {
			ext: 'mp3',
			mime: 'audio/mpeg'
		};
	}

	if (check([0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x41], { offset: 4 }) || check([0x4D, 0x34, 0x41, 0x20])) {
		return {
			ext: 'm4a',
			mime: 'audio/m4a'
		};
	}

	// Needs to be before `ogg` check
	if (check([0x4F, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64], { offset: 28 })) {
		return {
			ext: 'opus',
			mime: 'audio/opus'
		};
	}

	if (check([0x4F, 0x67, 0x67, 0x53])) {
		return {
			ext: 'ogg',
			mime: 'audio/ogg'
		};
	}

	if (check([0x66, 0x4C, 0x61, 0x43])) {
		return {
			ext: 'flac',
			mime: 'audio/x-flac'
		};
	}

	if (check([0x52, 0x49, 0x46, 0x46]) && check([0x57, 0x41, 0x56, 0x45], { offset: 8 })) {
		return {
			ext: 'wav',
			mime: 'audio/x-wav'
		};
	}

	if (check([0x23, 0x21, 0x41, 0x4D, 0x52, 0x0A])) {
		return {
			ext: 'amr',
			mime: 'audio/amr'
		};
	}

	if (check([0x25, 0x50, 0x44, 0x46])) {
		return {
			ext: 'pdf',
			mime: 'application/pdf'
		};
	}

	if (check([0x4D, 0x5A])) {
		return {
			ext: 'exe',
			mime: 'application/x-msdownload'
		};
	}

	if ((buf[0] === 0x43 || buf[0] === 0x46) && check([0x57, 0x53], { offset: 1 })) {
		return {
			ext: 'swf',
			mime: 'application/x-shockwave-flash'
		};
	}

	if (check([0x7B, 0x5C, 0x72, 0x74, 0x66])) {
		return {
			ext: 'rtf',
			mime: 'application/rtf'
		};
	}

	if (check([0x00, 0x61, 0x73, 0x6D])) {
		return {
			ext: 'wasm',
			mime: 'application/wasm'
		};
	}

	if (check([0x77, 0x4F, 0x46, 0x46]) && (check([0x00, 0x01, 0x00, 0x00], { offset: 4 }) || check([0x4F, 0x54, 0x54, 0x4F], { offset: 4 }))) {
		return {
			ext: 'woff',
			mime: 'font/woff'
		};
	}

	if (check([0x77, 0x4F, 0x46, 0x32]) && (check([0x00, 0x01, 0x00, 0x00], { offset: 4 }) || check([0x4F, 0x54, 0x54, 0x4F], { offset: 4 }))) {
		return {
			ext: 'woff2',
			mime: 'font/woff2'
		};
	}

	if (check([0x4C, 0x50], { offset: 34 }) && (check([0x00, 0x00, 0x01], { offset: 8 }) || check([0x01, 0x00, 0x02], { offset: 8 }) || check([0x02, 0x00, 0x02], { offset: 8 }))) {
		return {
			ext: 'eot',
			mime: 'application/octet-stream'
		};
	}

	if (check([0x00, 0x01, 0x00, 0x00, 0x00])) {
		return {
			ext: 'ttf',
			mime: 'font/ttf'
		};
	}

	if (check([0x4F, 0x54, 0x54, 0x4F, 0x00])) {
		return {
			ext: 'otf',
			mime: 'font/otf'
		};
	}

	if (check([0x00, 0x00, 0x01, 0x00])) {
		return {
			ext: 'ico',
			mime: 'image/x-icon'
		};
	}

	if (check([0x46, 0x4C, 0x56, 0x01])) {
		return {
			ext: 'flv',
			mime: 'video/x-flv'
		};
	}

	if (check([0x25, 0x21])) {
		return {
			ext: 'ps',
			mime: 'application/postscript'
		};
	}

	if (check([0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00])) {
		return {
			ext: 'xz',
			mime: 'application/x-xz'
		};
	}

	if (check([0x53, 0x51, 0x4C, 0x69])) {
		return {
			ext: 'sqlite',
			mime: 'application/x-sqlite3'
		};
	}

	if (check([0x4E, 0x45, 0x53, 0x1A])) {
		return {
			ext: 'nes',
			mime: 'application/x-nintendo-nes-rom'
		};
	}

	if (check([0x43, 0x72, 0x32, 0x34])) {
		return {
			ext: 'crx',
			mime: 'application/x-google-chrome-extension'
		};
	}

	if (check([0x4D, 0x53, 0x43, 0x46]) || check([0x49, 0x53, 0x63, 0x28])) {
		return {
			ext: 'cab',
			mime: 'application/vnd.ms-cab-compressed'
		};
	}

	// Needs to be before `ar` check
	if (check([0x21, 0x3C, 0x61, 0x72, 0x63, 0x68, 0x3E, 0x0A, 0x64, 0x65, 0x62, 0x69, 0x61, 0x6E, 0x2D, 0x62, 0x69, 0x6E, 0x61, 0x72, 0x79])) {
		return {
			ext: 'deb',
			mime: 'application/x-deb'
		};
	}

	if (check([0x21, 0x3C, 0x61, 0x72, 0x63, 0x68, 0x3E])) {
		return {
			ext: 'ar',
			mime: 'application/x-unix-archive'
		};
	}

	if (check([0xED, 0xAB, 0xEE, 0xDB])) {
		return {
			ext: 'rpm',
			mime: 'application/x-rpm'
		};
	}

	if (check([0x1F, 0xA0]) || check([0x1F, 0x9D])) {
		return {
			ext: 'Z',
			mime: 'application/x-compress'
		};
	}

	if (check([0x4C, 0x5A, 0x49, 0x50])) {
		return {
			ext: 'lz',
			mime: 'application/x-lzip'
		};
	}

	if (check([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])) {
		return {
			ext: 'msi',
			mime: 'application/x-msi'
		};
	}

	if (check([0x06, 0x0E, 0x2B, 0x34, 0x02, 0x05, 0x01, 0x01, 0x0D, 0x01, 0x02, 0x01, 0x01, 0x02])) {
		return {
			ext: 'mxf',
			mime: 'application/mxf'
		};
	}

	if (check([0x47], { offset: 4 }) && (check([0x47], { offset: 192 }) || check([0x47], { offset: 196 }))) {
		return {
			ext: 'mts',
			mime: 'video/mp2t'
		};
	}

	if (check([0x42, 0x4C, 0x45, 0x4E, 0x44, 0x45, 0x52])) {
		return {
			ext: 'blend',
			mime: 'application/x-blender'
		};
	}

	if (check([0x42, 0x50, 0x47, 0xFB])) {
		return {
			ext: 'bpg',
			mime: 'image/bpg'
		};
	}

	return null;
};

},{}],33:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],34:[function(require,module,exports){
'use strict';

var Uppy = require('/home/travis/build/transloadit/uppy/src/core/Core');
var FileInput = require('/home/travis/build/transloadit/uppy/src/plugins/FileInput');
var StatusBar = require('/home/travis/build/transloadit/uppy/src/plugins/StatusBar');
var Tus = require('/home/travis/build/transloadit/uppy/src/plugins/Tus');

var uppyOne = new Uppy({ debug: true });
uppyOne.use(FileInput, { target: '.UppyInput', pretty: false }).use(Tus, { endpoint: '//master.tus.io/files/' }).use(StatusBar, { target: '.UppyInput-Progress', hideUploadButton: true }).run();

},{"/home/travis/build/transloadit/uppy/src/core/Core":22,"/home/travis/build/transloadit/uppy/src/plugins/FileInput":27,"/home/travis/build/transloadit/uppy/src/plugins/StatusBar":29,"/home/travis/build/transloadit/uppy/src/plugins/Tus":30}]},{},[34])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9ub2RlX21vZHVsZXMvY3VpZC9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9jdWlkL2xpYi9maW5nZXJwcmludC5icm93c2VyLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2N1aWQvbGliL3BhZC5qcyIsIi4uL25vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2VzNi1wcm9taXNlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2V4dGVuZC9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMvbWltZS1tYXRjaC9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9uYW1lc3BhY2UtZW1pdHRlci9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9wcmVhY3QvZGlzdC9wcmVhY3QuanMiLCIuLi9ub2RlX21vZHVsZXMvcHJldHRpZXItYnl0ZXMvaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMvcmVzb2x2ZS11cmwvcmVzb2x2ZS11cmwuanMiLCIuLi9ub2RlX21vZHVsZXMvdHVzLWpzLWNsaWVudC9saWIuZXM1L2Jyb3dzZXIvYmFzZTY0LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3R1cy1qcy1jbGllbnQvbGliLmVzNS9icm93c2VyL3JlcXVlc3QuanMiLCIuLi9ub2RlX21vZHVsZXMvdHVzLWpzLWNsaWVudC9saWIuZXM1L2Jyb3dzZXIvc291cmNlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3R1cy1qcy1jbGllbnQvbGliLmVzNS9icm93c2VyL3N0b3JhZ2UuanMiLCIuLi9ub2RlX21vZHVsZXMvdHVzLWpzLWNsaWVudC9saWIuZXM1L2Vycm9yLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3R1cy1qcy1jbGllbnQvbGliLmVzNS9maW5nZXJwcmludC5qcyIsIi4uL25vZGVfbW9kdWxlcy90dXMtanMtY2xpZW50L2xpYi5lczUvaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMvdHVzLWpzLWNsaWVudC9saWIuZXM1L3VwbG9hZC5qcyIsIi4uL25vZGVfbW9kdWxlcy93aGF0d2ctZmV0Y2gvZmV0Y2guanMiLCIuLi9ub2RlX21vZHVsZXMvd2lsZGNhcmQvaW5kZXguanMiLCIuLi9zcmMvY29yZS9Db3JlLmpzIiwiLi4vc3JjL2NvcmUvUGx1Z2luLmpzIiwiLi4vc3JjL2NvcmUvVHJhbnNsYXRvci5qcyIsIi4uL3NyYy9jb3JlL1VwcHlTb2NrZXQuanMiLCIuLi9zcmMvY29yZS9VdGlscy5qcyIsIi4uL3NyYy9wbHVnaW5zL0ZpbGVJbnB1dC5qcyIsIi4uL3NyYy9wbHVnaW5zL1N0YXR1c0Jhci9TdGF0dXNCYXIuanMiLCIuLi9zcmMvcGx1Z2lucy9TdGF0dXNCYXIvaW5kZXguanMiLCIuLi9zcmMvcGx1Z2lucy9UdXMuanMiLCIuLi9zcmMvc3RvcmUvRGVmYXVsdFN0b3JlLmpzIiwiLi4vc3JjL3ZlbmRvci9maWxlLXR5cGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjL2V4YW1wbGVzL3N0YXR1c2Jhci9hcHAuZXM2Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdHFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdmJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7QUM3RkEsSUFBTSxRQUFRLFFBQVEsZUFBUixDQUFkO0FBQ0EsSUFBTSxhQUFhLFFBQVEsb0JBQVIsQ0FBbkI7QUFDQSxJQUFNLEtBQUssUUFBUSxtQkFBUixDQUFYO0FBQ0EsSUFBTSxPQUFPLFFBQVEsTUFBUixDQUFiO0FBQ0EsSUFBTSxXQUFXLFFBQVEsaUJBQVIs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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3hMQSxJQUFNLE9BQU8sUUFBUSxvQkFBUixDQUFiO0FBQ0EsSUFBTSxZQUFZLFFBQVEsNEJBQVIsQ0FBbEI7QUFDQSxJQUFNLFlBQVksUUFBUSw0QkFBUixDQUFsQjtBQUNBLElBQU0sTUFBTSxRQUFRLHNCQUFSLENBQVo7O0FBRUEsSUFBTSxVQUFVLElBQUksSUFBSixDQUFTLEVBQUMsT0FBTyxJQUFSLEVBQVQsQ0FBaEI7QUFDQSxRQUNHLEdBREgsQ0FDTyxTQURQLEVBQ2tCLEVBQUUsUUFBUSxZQUFWLEVBQXdCLFFBQVEsS0FBaEMsRUFEbEIsRUFFRyxHQUZILENBRU8sR0FGUCxFQUVZLEVBQUUsVUFBVSx3QkFBWixFQUZaLEVBR0csR0FISCxDQUdPLFNBSFAsRUFHa0IsRUFBRSxRQUFRLHFCQUFWLEVBQWlDLGtCQUFrQixJQUFuRCxFQUhsQixFQUlHLEdBSkgiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBjdWlkLmpzXG4gKiBDb2xsaXNpb24tcmVzaXN0YW50IFVJRCBnZW5lcmF0b3IgZm9yIGJyb3dzZXJzIGFuZCBub2RlLlxuICogU2VxdWVudGlhbCBmb3IgZmFzdCBkYiBsb29rdXBzIGFuZCByZWNlbmN5IHNvcnRpbmcuXG4gKiBTYWZlIGZvciBlbGVtZW50IElEcyBhbmQgc2VydmVyLXNpZGUgbG9va3Vwcy5cbiAqXG4gKiBFeHRyYWN0ZWQgZnJvbSBDTENUUlxuICpcbiAqIENvcHlyaWdodCAoYykgRXJpYyBFbGxpb3R0IDIwMTJcbiAqIE1JVCBMaWNlbnNlXG4gKi9cblxudmFyIGZpbmdlcnByaW50ID0gcmVxdWlyZSgnLi9saWIvZmluZ2VycHJpbnQuanMnKTtcbnZhciBwYWQgPSByZXF1aXJlKCcuL2xpYi9wYWQuanMnKTtcblxudmFyIGMgPSAwLFxuICBibG9ja1NpemUgPSA0LFxuICBiYXNlID0gMzYsXG4gIGRpc2NyZXRlVmFsdWVzID0gTWF0aC5wb3coYmFzZSwgYmxvY2tTaXplKTtcblxuZnVuY3Rpb24gcmFuZG9tQmxvY2sgKCkge1xuICByZXR1cm4gcGFkKChNYXRoLnJhbmRvbSgpICpcbiAgICBkaXNjcmV0ZVZhbHVlcyA8PCAwKVxuICAgIC50b1N0cmluZyhiYXNlKSwgYmxvY2tTaXplKTtcbn1cblxuZnVuY3Rpb24gc2FmZUNvdW50ZXIgKCkge1xuICBjID0gYyA8IGRpc2NyZXRlVmFsdWVzID8gYyA6IDA7XG4gIGMrKzsgLy8gdGhpcyBpcyBub3Qgc3VibGltaW5hbFxuICByZXR1cm4gYyAtIDE7XG59XG5cbmZ1bmN0aW9uIGN1aWQgKCkge1xuICAvLyBTdGFydGluZyB3aXRoIGEgbG93ZXJjYXNlIGxldHRlciBtYWtlc1xuICAvLyBpdCBIVE1MIGVsZW1lbnQgSUQgZnJpZW5kbHkuXG4gIHZhciBsZXR0ZXIgPSAnYycsIC8vIGhhcmQtY29kZWQgYWxsb3dzIGZvciBzZXF1ZW50aWFsIGFjY2Vzc1xuXG4gICAgLy8gdGltZXN0YW1wXG4gICAgLy8gd2FybmluZzogdGhpcyBleHBvc2VzIHRoZSBleGFjdCBkYXRlIGFuZCB0aW1lXG4gICAgLy8gdGhhdCB0aGUgdWlkIHdhcyBjcmVhdGVkLlxuICAgIHRpbWVzdGFtcCA9IChuZXcgRGF0ZSgpLmdldFRpbWUoKSkudG9TdHJpbmcoYmFzZSksXG5cbiAgICAvLyBQcmV2ZW50IHNhbWUtbWFjaGluZSBjb2xsaXNpb25zLlxuICAgIGNvdW50ZXIgPSBwYWQoc2FmZUNvdW50ZXIoKS50b1N0cmluZyhiYXNlKSwgYmxvY2tTaXplKSxcblxuICAgIC8vIEEgZmV3IGNoYXJzIHRvIGdlbmVyYXRlIGRpc3RpbmN0IGlkcyBmb3IgZGlmZmVyZW50XG4gICAgLy8gY2xpZW50cyAoc28gZGlmZmVyZW50IGNvbXB1dGVycyBhcmUgZmFyIGxlc3NcbiAgICAvLyBsaWtlbHkgdG8gZ2VuZXJhdGUgdGhlIHNhbWUgaWQpXG4gICAgcHJpbnQgPSBmaW5nZXJwcmludCgpLFxuXG4gICAgLy8gR3JhYiBzb21lIG1vcmUgY2hhcnMgZnJvbSBNYXRoLnJhbmRvbSgpXG4gICAgcmFuZG9tID0gcmFuZG9tQmxvY2soKSArIHJhbmRvbUJsb2NrKCk7XG5cbiAgcmV0dXJuIGxldHRlciArIHRpbWVzdGFtcCArIGNvdW50ZXIgKyBwcmludCArIHJhbmRvbTtcbn1cblxuY3VpZC5zbHVnID0gZnVuY3Rpb24gc2x1ZyAoKSB7XG4gIHZhciBkYXRlID0gbmV3IERhdGUoKS5nZXRUaW1lKCkudG9TdHJpbmcoMzYpLFxuICAgIGNvdW50ZXIgPSBzYWZlQ291bnRlcigpLnRvU3RyaW5nKDM2KS5zbGljZSgtNCksXG4gICAgcHJpbnQgPSBmaW5nZXJwcmludCgpLnNsaWNlKDAsIDEpICtcbiAgICAgIGZpbmdlcnByaW50KCkuc2xpY2UoLTEpLFxuICAgIHJhbmRvbSA9IHJhbmRvbUJsb2NrKCkuc2xpY2UoLTIpO1xuXG4gIHJldHVybiBkYXRlLnNsaWNlKC0yKSArXG4gICAgY291bnRlciArIHByaW50ICsgcmFuZG9tO1xufTtcblxuY3VpZC5maW5nZXJwcmludCA9IGZpbmdlcnByaW50O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGN1aWQ7XG4iLCJ2YXIgcGFkID0gcmVxdWlyZSgnLi9wYWQuanMnKTtcblxudmFyIGVudiA9IHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnID8gd2luZG93IDogc2VsZjtcbnZhciBnbG9iYWxDb3VudCA9IE9iamVjdC5rZXlzKGVudik7XG52YXIgbWltZVR5cGVzTGVuZ3RoID0gbmF2aWdhdG9yLm1pbWVUeXBlcyA/IG5hdmlnYXRvci5taW1lVHlwZXMubGVuZ3RoIDogMDtcbnZhciBjbGllbnRJZCA9IHBhZCgobWltZVR5cGVzTGVuZ3RoICtcbiAgbmF2aWdhdG9yLnVzZXJBZ2VudC5sZW5ndGgpLnRvU3RyaW5nKDM2KSArXG4gIGdsb2JhbENvdW50LnRvU3RyaW5nKDM2KSwgNCk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZmluZ2VycHJpbnQgKCkge1xuICByZXR1cm4gY2xpZW50SWQ7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBwYWQgKG51bSwgc2l6ZSkge1xuICB2YXIgcyA9ICcwMDAwMDAwMDAnICsgbnVtO1xuICByZXR1cm4gcy5zdWJzdHIocy5sZW5ndGggLSBzaXplKTtcbn07XG4iLCIvKiFcbiAqIEBvdmVydmlldyBlczYtcHJvbWlzZSAtIGEgdGlueSBpbXBsZW1lbnRhdGlvbiBvZiBQcm9taXNlcy9BKy5cbiAqIEBjb3B5cmlnaHQgQ29weXJpZ2h0IChjKSAyMDE0IFllaHVkYSBLYXR6LCBUb20gRGFsZSwgU3RlZmFuIFBlbm5lciBhbmQgY29udHJpYnV0b3JzIChDb252ZXJzaW9uIHRvIEVTNiBBUEkgYnkgSmFrZSBBcmNoaWJhbGQpXG4gKiBAbGljZW5zZSAgIExpY2Vuc2VkIHVuZGVyIE1JVCBsaWNlbnNlXG4gKiAgICAgICAgICAgIFNlZSBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vc3RlZmFucGVubmVyL2VzNi1wcm9taXNlL21hc3Rlci9MSUNFTlNFXG4gKiBAdmVyc2lvbiAgIHY0LjIuMis5NzQ3OGViNlxuICovXG5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG5cdHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpIDpcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKGZhY3RvcnkpIDpcblx0KGdsb2JhbC5FUzZQcm9taXNlID0gZmFjdG9yeSgpKTtcbn0odGhpcywgKGZ1bmN0aW9uICgpIHsgJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBvYmplY3RPckZ1bmN0aW9uKHgpIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgeDtcbiAgcmV0dXJuIHggIT09IG51bGwgJiYgKHR5cGUgPT09ICdvYmplY3QnIHx8IHR5cGUgPT09ICdmdW5jdGlvbicpO1xufVxuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xufVxuXG5cblxudmFyIF9pc0FycmF5ID0gdm9pZCAwO1xuaWYgKEFycmF5LmlzQXJyYXkpIHtcbiAgX2lzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xufSBlbHNlIHtcbiAgX2lzQXJyYXkgPSBmdW5jdGlvbiAoeCkge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG59XG5cbnZhciBpc0FycmF5ID0gX2lzQXJyYXk7XG5cbnZhciBsZW4gPSAwO1xudmFyIHZlcnR4TmV4dCA9IHZvaWQgMDtcbnZhciBjdXN0b21TY2hlZHVsZXJGbiA9IHZvaWQgMDtcblxudmFyIGFzYXAgPSBmdW5jdGlvbiBhc2FwKGNhbGxiYWNrLCBhcmcpIHtcbiAgcXVldWVbbGVuXSA9IGNhbGxiYWNrO1xuICBxdWV1ZVtsZW4gKyAxXSA9IGFyZztcbiAgbGVuICs9IDI7XG4gIGlmIChsZW4gPT09IDIpIHtcbiAgICAvLyBJZiBsZW4gaXMgMiwgdGhhdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gc2NoZWR1bGUgYW4gYXN5bmMgZmx1c2guXG4gICAgLy8gSWYgYWRkaXRpb25hbCBjYWxsYmFja3MgYXJlIHF1ZXVlZCBiZWZvcmUgdGhlIHF1ZXVlIGlzIGZsdXNoZWQsIHRoZXlcbiAgICAvLyB3aWxsIGJlIHByb2Nlc3NlZCBieSB0aGlzIGZsdXNoIHRoYXQgd2UgYXJlIHNjaGVkdWxpbmcuXG4gICAgaWYgKGN1c3RvbVNjaGVkdWxlckZuKSB7XG4gICAgICBjdXN0b21TY2hlZHVsZXJGbihmbHVzaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNjaGVkdWxlRmx1c2goKTtcbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHNldFNjaGVkdWxlcihzY2hlZHVsZUZuKSB7XG4gIGN1c3RvbVNjaGVkdWxlckZuID0gc2NoZWR1bGVGbjtcbn1cblxuZnVuY3Rpb24gc2V0QXNhcChhc2FwRm4pIHtcbiAgYXNhcCA9IGFzYXBGbjtcbn1cblxudmFyIGJyb3dzZXJXaW5kb3cgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHVuZGVmaW5lZDtcbnZhciBicm93c2VyR2xvYmFsID0gYnJvd3NlcldpbmRvdyB8fCB7fTtcbnZhciBCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9IGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCBicm93c2VyR2xvYmFsLldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG52YXIgaXNOb2RlID0gdHlwZW9mIHNlbGYgPT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXSc7XG5cbi8vIHRlc3QgZm9yIHdlYiB3b3JrZXIgYnV0IG5vdCBpbiBJRTEwXG52YXIgaXNXb3JrZXIgPSB0eXBlb2YgVWludDhDbGFtcGVkQXJyYXkgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBpbXBvcnRTY3JpcHRzICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgTWVzc2FnZUNoYW5uZWwgIT09ICd1bmRlZmluZWQnO1xuXG4vLyBub2RlXG5mdW5jdGlvbiB1c2VOZXh0VGljaygpIHtcbiAgLy8gbm9kZSB2ZXJzaW9uIDAuMTAueCBkaXNwbGF5cyBhIGRlcHJlY2F0aW9uIHdhcm5pbmcgd2hlbiBuZXh0VGljayBpcyB1c2VkIHJlY3Vyc2l2ZWx5XG4gIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vY3Vqb2pzL3doZW4vaXNzdWVzLzQxMCBmb3IgZGV0YWlsc1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBwcm9jZXNzLm5leHRUaWNrKGZsdXNoKTtcbiAgfTtcbn1cblxuLy8gdmVydHhcbmZ1bmN0aW9uIHVzZVZlcnR4VGltZXIoKSB7XG4gIGlmICh0eXBlb2YgdmVydHhOZXh0ICE9PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICB2ZXJ0eE5leHQoZmx1c2gpO1xuICAgIH07XG4gIH1cblxuICByZXR1cm4gdXNlU2V0VGltZW91dCgpO1xufVxuXG5mdW5jdGlvbiB1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gIHZhciBvYnNlcnZlciA9IG5ldyBCcm93c2VyTXV0YXRpb25PYnNlcnZlcihmbHVzaCk7XG4gIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICBvYnNlcnZlci5vYnNlcnZlKG5vZGUsIHsgY2hhcmFjdGVyRGF0YTogdHJ1ZSB9KTtcblxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIG5vZGUuZGF0YSA9IGl0ZXJhdGlvbnMgPSArK2l0ZXJhdGlvbnMgJSAyO1xuICB9O1xufVxuXG4vLyB3ZWIgd29ya2VyXG5mdW5jdGlvbiB1c2VNZXNzYWdlQ2hhbm5lbCgpIHtcbiAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmbHVzaDtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZSgwKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXNlU2V0VGltZW91dCgpIHtcbiAgLy8gU3RvcmUgc2V0VGltZW91dCByZWZlcmVuY2Ugc28gZXM2LXByb21pc2Ugd2lsbCBiZSB1bmFmZmVjdGVkIGJ5XG4gIC8vIG90aGVyIGNvZGUgbW9kaWZ5aW5nIHNldFRpbWVvdXQgKGxpa2Ugc2lub24udXNlRmFrZVRpbWVycygpKVxuICB2YXIgZ2xvYmFsU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGdsb2JhbFNldFRpbWVvdXQoZmx1c2gsIDEpO1xuICB9O1xufVxuXG52YXIgcXVldWUgPSBuZXcgQXJyYXkoMTAwMCk7XG5mdW5jdGlvbiBmbHVzaCgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgIHZhciBjYWxsYmFjayA9IHF1ZXVlW2ldO1xuICAgIHZhciBhcmcgPSBxdWV1ZVtpICsgMV07XG5cbiAgICBjYWxsYmFjayhhcmcpO1xuXG4gICAgcXVldWVbaV0gPSB1bmRlZmluZWQ7XG4gICAgcXVldWVbaSArIDFdID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgbGVuID0gMDtcbn1cblxuZnVuY3Rpb24gYXR0ZW1wdFZlcnR4KCkge1xuICB0cnkge1xuICAgIHZhciByID0gcmVxdWlyZTtcbiAgICB2YXIgdmVydHggPSByKCd2ZXJ0eCcpO1xuICAgIHZlcnR4TmV4dCA9IHZlcnR4LnJ1bk9uTG9vcCB8fCB2ZXJ0eC5ydW5PbkNvbnRleHQ7XG4gICAgcmV0dXJuIHVzZVZlcnR4VGltZXIoKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiB1c2VTZXRUaW1lb3V0KCk7XG4gIH1cbn1cblxudmFyIHNjaGVkdWxlRmx1c2ggPSB2b2lkIDA7XG4vLyBEZWNpZGUgd2hhdCBhc3luYyBtZXRob2QgdG8gdXNlIHRvIHRyaWdnZXJpbmcgcHJvY2Vzc2luZyBvZiBxdWV1ZWQgY2FsbGJhY2tzOlxuaWYgKGlzTm9kZSkge1xuICBzY2hlZHVsZUZsdXNoID0gdXNlTmV4dFRpY2soKTtcbn0gZWxzZSBpZiAoQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZU11dGF0aW9uT2JzZXJ2ZXIoKTtcbn0gZWxzZSBpZiAoaXNXb3JrZXIpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZU1lc3NhZ2VDaGFubmVsKCk7XG59IGVsc2UgaWYgKGJyb3dzZXJXaW5kb3cgPT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgcmVxdWlyZSA9PT0gJ2Z1bmN0aW9uJykge1xuICBzY2hlZHVsZUZsdXNoID0gYXR0ZW1wdFZlcnR4KCk7XG59IGVsc2Uge1xuICBzY2hlZHVsZUZsdXNoID0gdXNlU2V0VGltZW91dCgpO1xufVxuXG5mdW5jdGlvbiB0aGVuKG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gIHZhciBwYXJlbnQgPSB0aGlzO1xuXG4gIHZhciBjaGlsZCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKG5vb3ApO1xuXG4gIGlmIChjaGlsZFtQUk9NSVNFX0lEXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbWFrZVByb21pc2UoY2hpbGQpO1xuICB9XG5cbiAgdmFyIF9zdGF0ZSA9IHBhcmVudC5fc3RhdGU7XG5cblxuICBpZiAoX3N0YXRlKSB7XG4gICAgdmFyIGNhbGxiYWNrID0gYXJndW1lbnRzW19zdGF0ZSAtIDFdO1xuICAgIGFzYXAoZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIGludm9rZUNhbGxiYWNrKF9zdGF0ZSwgY2hpbGQsIGNhbGxiYWNrLCBwYXJlbnQuX3Jlc3VsdCk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgc3Vic2NyaWJlKHBhcmVudCwgY2hpbGQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKTtcbiAgfVxuXG4gIHJldHVybiBjaGlsZDtcbn1cblxuLyoqXG4gIGBQcm9taXNlLnJlc29sdmVgIHJldHVybnMgYSBwcm9taXNlIHRoYXQgd2lsbCBiZWNvbWUgcmVzb2x2ZWQgd2l0aCB0aGVcbiAgcGFzc2VkIGB2YWx1ZWAuIEl0IGlzIHNob3J0aGFuZCBmb3IgdGhlIGZvbGxvd2luZzpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICByZXNvbHZlKDEpO1xuICB9KTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIHZhbHVlID09PSAxXG4gIH0pO1xuICBgYGBcblxuICBJbnN0ZWFkIG9mIHdyaXRpbmcgdGhlIGFib3ZlLCB5b3VyIGNvZGUgbm93IHNpbXBseSBiZWNvbWVzIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgxKTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIHZhbHVlID09PSAxXG4gIH0pO1xuICBgYGBcblxuICBAbWV0aG9kIHJlc29sdmVcbiAgQHN0YXRpY1xuICBAcGFyYW0ge0FueX0gdmFsdWUgdmFsdWUgdGhhdCB0aGUgcmV0dXJuZWQgcHJvbWlzZSB3aWxsIGJlIHJlc29sdmVkIHdpdGhcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2UgdGhhdCB3aWxsIGJlY29tZSBmdWxmaWxsZWQgd2l0aCB0aGUgZ2l2ZW5cbiAgYHZhbHVlYFxuKi9cbmZ1bmN0aW9uIHJlc29sdmUkMShvYmplY3QpIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICBpZiAob2JqZWN0ICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnICYmIG9iamVjdC5jb25zdHJ1Y3RvciA9PT0gQ29uc3RydWN0b3IpIHtcbiAgICByZXR1cm4gb2JqZWN0O1xuICB9XG5cbiAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3Iobm9vcCk7XG4gIHJlc29sdmUocHJvbWlzZSwgb2JqZWN0KTtcbiAgcmV0dXJuIHByb21pc2U7XG59XG5cbnZhciBQUk9NSVNFX0lEID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDE2KTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnZhciBQRU5ESU5HID0gdm9pZCAwO1xudmFyIEZVTEZJTExFRCA9IDE7XG52YXIgUkVKRUNURUQgPSAyO1xuXG52YXIgR0VUX1RIRU5fRVJST1IgPSBuZXcgRXJyb3JPYmplY3QoKTtcblxuZnVuY3Rpb24gc2VsZkZ1bGZpbGxtZW50KCkge1xuICByZXR1cm4gbmV3IFR5cGVFcnJvcihcIllvdSBjYW5ub3QgcmVzb2x2ZSBhIHByb21pc2Ugd2l0aCBpdHNlbGZcIik7XG59XG5cbmZ1bmN0aW9uIGNhbm5vdFJldHVybk93bigpIHtcbiAgcmV0dXJuIG5ldyBUeXBlRXJyb3IoJ0EgcHJvbWlzZXMgY2FsbGJhY2sgY2Fubm90IHJldHVybiB0aGF0IHNhbWUgcHJvbWlzZS4nKTtcbn1cblxuZnVuY3Rpb24gZ2V0VGhlbihwcm9taXNlKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHByb21pc2UudGhlbjtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBHRVRfVEhFTl9FUlJPUi5lcnJvciA9IGVycm9yO1xuICAgIHJldHVybiBHRVRfVEhFTl9FUlJPUjtcbiAgfVxufVxuXG5mdW5jdGlvbiB0cnlUaGVuKHRoZW4kJDEsIHZhbHVlLCBmdWxmaWxsbWVudEhhbmRsZXIsIHJlamVjdGlvbkhhbmRsZXIpIHtcbiAgdHJ5IHtcbiAgICB0aGVuJCQxLmNhbGwodmFsdWUsIGZ1bGZpbGxtZW50SGFuZGxlciwgcmVqZWN0aW9uSGFuZGxlcik7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVGb3JlaWduVGhlbmFibGUocHJvbWlzZSwgdGhlbmFibGUsIHRoZW4kJDEpIHtcbiAgYXNhcChmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgIHZhciBzZWFsZWQgPSBmYWxzZTtcbiAgICB2YXIgZXJyb3IgPSB0cnlUaGVuKHRoZW4kJDEsIHRoZW5hYmxlLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIGlmIChzZWFsZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgc2VhbGVkID0gdHJ1ZTtcbiAgICAgIGlmICh0aGVuYWJsZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICBpZiAoc2VhbGVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHNlYWxlZCA9IHRydWU7XG5cbiAgICAgIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgIH0sICdTZXR0bGU6ICcgKyAocHJvbWlzZS5fbGFiZWwgfHwgJyB1bmtub3duIHByb21pc2UnKSk7XG5cbiAgICBpZiAoIXNlYWxlZCAmJiBlcnJvcikge1xuICAgICAgc2VhbGVkID0gdHJ1ZTtcbiAgICAgIHJlamVjdChwcm9taXNlLCBlcnJvcik7XG4gICAgfVxuICB9LCBwcm9taXNlKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlT3duVGhlbmFibGUocHJvbWlzZSwgdGhlbmFibGUpIHtcbiAgaWYgKHRoZW5hYmxlLl9zdGF0ZSA9PT0gRlVMRklMTEVEKSB7XG4gICAgZnVsZmlsbChwcm9taXNlLCB0aGVuYWJsZS5fcmVzdWx0KTtcbiAgfSBlbHNlIGlmICh0aGVuYWJsZS5fc3RhdGUgPT09IFJFSkVDVEVEKSB7XG4gICAgcmVqZWN0KHByb21pc2UsIHRoZW5hYmxlLl9yZXN1bHQpO1xuICB9IGVsc2Uge1xuICAgIHN1YnNjcmliZSh0aGVuYWJsZSwgdW5kZWZpbmVkLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiByZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICByZXR1cm4gcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlTWF5YmVUaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlLCB0aGVuJCQxKSB7XG4gIGlmIChtYXliZVRoZW5hYmxlLmNvbnN0cnVjdG9yID09PSBwcm9taXNlLmNvbnN0cnVjdG9yICYmIHRoZW4kJDEgPT09IHRoZW4gJiYgbWF5YmVUaGVuYWJsZS5jb25zdHJ1Y3Rvci5yZXNvbHZlID09PSByZXNvbHZlJDEpIHtcbiAgICBoYW5kbGVPd25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAodGhlbiQkMSA9PT0gR0VUX1RIRU5fRVJST1IpIHtcbiAgICAgIHJlamVjdChwcm9taXNlLCBHRVRfVEhFTl9FUlJPUi5lcnJvcik7XG4gICAgICBHRVRfVEhFTl9FUlJPUi5lcnJvciA9IG51bGw7XG4gICAgfSBlbHNlIGlmICh0aGVuJCQxID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGZ1bGZpbGwocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gICAgfSBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoZW4kJDEpKSB7XG4gICAgICBoYW5kbGVGb3JlaWduVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSwgdGhlbiQkMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZ1bGZpbGwocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpIHtcbiAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgcmVqZWN0KHByb21pc2UsIHNlbGZGdWxmaWxsbWVudCgpKTtcbiAgfSBlbHNlIGlmIChvYmplY3RPckZ1bmN0aW9uKHZhbHVlKSkge1xuICAgIGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgdmFsdWUsIGdldFRoZW4odmFsdWUpKTtcbiAgfSBlbHNlIHtcbiAgICBmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwdWJsaXNoUmVqZWN0aW9uKHByb21pc2UpIHtcbiAgaWYgKHByb21pc2UuX29uZXJyb3IpIHtcbiAgICBwcm9taXNlLl9vbmVycm9yKHByb21pc2UuX3Jlc3VsdCk7XG4gIH1cblxuICBwdWJsaXNoKHByb21pc2UpO1xufVxuXG5mdW5jdGlvbiBmdWxmaWxsKHByb21pc2UsIHZhbHVlKSB7XG4gIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gUEVORElORykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHByb21pc2UuX3Jlc3VsdCA9IHZhbHVlO1xuICBwcm9taXNlLl9zdGF0ZSA9IEZVTEZJTExFRDtcblxuICBpZiAocHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoICE9PSAwKSB7XG4gICAgYXNhcChwdWJsaXNoLCBwcm9taXNlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWplY3QocHJvbWlzZSwgcmVhc29uKSB7XG4gIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gUEVORElORykge1xuICAgIHJldHVybjtcbiAgfVxuICBwcm9taXNlLl9zdGF0ZSA9IFJFSkVDVEVEO1xuICBwcm9taXNlLl9yZXN1bHQgPSByZWFzb247XG5cbiAgYXNhcChwdWJsaXNoUmVqZWN0aW9uLCBwcm9taXNlKTtcbn1cblxuZnVuY3Rpb24gc3Vic2NyaWJlKHBhcmVudCwgY2hpbGQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gIHZhciBfc3Vic2NyaWJlcnMgPSBwYXJlbnQuX3N1YnNjcmliZXJzO1xuICB2YXIgbGVuZ3RoID0gX3N1YnNjcmliZXJzLmxlbmd0aDtcblxuXG4gIHBhcmVudC5fb25lcnJvciA9IG51bGw7XG5cbiAgX3N1YnNjcmliZXJzW2xlbmd0aF0gPSBjaGlsZDtcbiAgX3N1YnNjcmliZXJzW2xlbmd0aCArIEZVTEZJTExFRF0gPSBvbkZ1bGZpbGxtZW50O1xuICBfc3Vic2NyaWJlcnNbbGVuZ3RoICsgUkVKRUNURURdID0gb25SZWplY3Rpb247XG5cbiAgaWYgKGxlbmd0aCA9PT0gMCAmJiBwYXJlbnQuX3N0YXRlKSB7XG4gICAgYXNhcChwdWJsaXNoLCBwYXJlbnQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHB1Ymxpc2gocHJvbWlzZSkge1xuICB2YXIgc3Vic2NyaWJlcnMgPSBwcm9taXNlLl9zdWJzY3JpYmVycztcbiAgdmFyIHNldHRsZWQgPSBwcm9taXNlLl9zdGF0ZTtcblxuICBpZiAoc3Vic2NyaWJlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIGNoaWxkID0gdm9pZCAwLFxuICAgICAgY2FsbGJhY2sgPSB2b2lkIDAsXG4gICAgICBkZXRhaWwgPSBwcm9taXNlLl9yZXN1bHQ7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdWJzY3JpYmVycy5sZW5ndGg7IGkgKz0gMykge1xuICAgIGNoaWxkID0gc3Vic2NyaWJlcnNbaV07XG4gICAgY2FsbGJhY2sgPSBzdWJzY3JpYmVyc1tpICsgc2V0dGxlZF07XG5cbiAgICBpZiAoY2hpbGQpIHtcbiAgICAgIGludm9rZUNhbGxiYWNrKHNldHRsZWQsIGNoaWxkLCBjYWxsYmFjaywgZGV0YWlsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2soZGV0YWlsKTtcbiAgICB9XG4gIH1cblxuICBwcm9taXNlLl9zdWJzY3JpYmVycy5sZW5ndGggPSAwO1xufVxuXG5mdW5jdGlvbiBFcnJvck9iamVjdCgpIHtcbiAgdGhpcy5lcnJvciA9IG51bGw7XG59XG5cbnZhciBUUllfQ0FUQ0hfRVJST1IgPSBuZXcgRXJyb3JPYmplY3QoKTtcblxuZnVuY3Rpb24gdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCkge1xuICB0cnkge1xuICAgIHJldHVybiBjYWxsYmFjayhkZXRhaWwpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgVFJZX0NBVENIX0VSUk9SLmVycm9yID0gZTtcbiAgICByZXR1cm4gVFJZX0NBVENIX0VSUk9SO1xuICB9XG59XG5cbmZ1bmN0aW9uIGludm9rZUNhbGxiYWNrKHNldHRsZWQsIHByb21pc2UsIGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgdmFyIGhhc0NhbGxiYWNrID0gaXNGdW5jdGlvbihjYWxsYmFjayksXG4gICAgICB2YWx1ZSA9IHZvaWQgMCxcbiAgICAgIGVycm9yID0gdm9pZCAwLFxuICAgICAgc3VjY2VlZGVkID0gdm9pZCAwLFxuICAgICAgZmFpbGVkID0gdm9pZCAwO1xuXG4gIGlmIChoYXNDYWxsYmFjaykge1xuICAgIHZhbHVlID0gdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCk7XG5cbiAgICBpZiAodmFsdWUgPT09IFRSWV9DQVRDSF9FUlJPUikge1xuICAgICAgZmFpbGVkID0gdHJ1ZTtcbiAgICAgIGVycm9yID0gdmFsdWUuZXJyb3I7XG4gICAgICB2YWx1ZS5lcnJvciA9IG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICByZWplY3QocHJvbWlzZSwgY2Fubm90UmV0dXJuT3duKCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YWx1ZSA9IGRldGFpbDtcbiAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICB9XG5cbiAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBQRU5ESU5HKSB7XG4gICAgLy8gbm9vcFxuICB9IGVsc2UgaWYgKGhhc0NhbGxiYWNrICYmIHN1Y2NlZWRlZCkge1xuICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICB9IGVsc2UgaWYgKGZhaWxlZCkge1xuICAgIHJlamVjdChwcm9taXNlLCBlcnJvcik7XG4gIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gRlVMRklMTEVEKSB7XG4gICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gUkVKRUNURUQpIHtcbiAgICByZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGluaXRpYWxpemVQcm9taXNlKHByb21pc2UsIHJlc29sdmVyKSB7XG4gIHRyeSB7XG4gICAgcmVzb2x2ZXIoZnVuY3Rpb24gcmVzb2x2ZVByb21pc2UodmFsdWUpIHtcbiAgICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgIH0sIGZ1bmN0aW9uIHJlamVjdFByb21pc2UocmVhc29uKSB7XG4gICAgICByZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJlamVjdChwcm9taXNlLCBlKTtcbiAgfVxufVxuXG52YXIgaWQgPSAwO1xuZnVuY3Rpb24gbmV4dElkKCkge1xuICByZXR1cm4gaWQrKztcbn1cblxuZnVuY3Rpb24gbWFrZVByb21pc2UocHJvbWlzZSkge1xuICBwcm9taXNlW1BST01JU0VfSURdID0gaWQrKztcbiAgcHJvbWlzZS5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gIHByb21pc2UuX3Jlc3VsdCA9IHVuZGVmaW5lZDtcbiAgcHJvbWlzZS5fc3Vic2NyaWJlcnMgPSBbXTtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGlvbkVycm9yKCkge1xuICByZXR1cm4gbmV3IEVycm9yKCdBcnJheSBNZXRob2RzIG11c3QgYmUgcHJvdmlkZWQgYW4gQXJyYXknKTtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGlvbkVycm9yKCkge1xuICByZXR1cm4gbmV3IEVycm9yKCdBcnJheSBNZXRob2RzIG11c3QgYmUgcHJvdmlkZWQgYW4gQXJyYXknKTtcbn1cblxudmFyIEVudW1lcmF0b3IgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIEVudW1lcmF0b3IoQ29uc3RydWN0b3IsIGlucHV0KSB7XG4gICAgdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuICAgIHRoaXMucHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3Rvcihub29wKTtcblxuICAgIGlmICghdGhpcy5wcm9taXNlW1BST01JU0VfSURdKSB7XG4gICAgICBtYWtlUHJvbWlzZSh0aGlzLnByb21pc2UpO1xuICAgIH1cblxuICAgIGlmIChpc0FycmF5KGlucHV0KSkge1xuICAgICAgdGhpcy5sZW5ndGggPSBpbnB1dC5sZW5ndGg7XG4gICAgICB0aGlzLl9yZW1haW5pbmcgPSBpbnB1dC5sZW5ndGg7XG5cbiAgICAgIHRoaXMuX3Jlc3VsdCA9IG5ldyBBcnJheSh0aGlzLmxlbmd0aCk7XG5cbiAgICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBmdWxmaWxsKHRoaXMucHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gdGhpcy5sZW5ndGggfHwgMDtcbiAgICAgICAgdGhpcy5fZW51bWVyYXRlKGlucHV0KTtcbiAgICAgICAgaWYgKHRoaXMuX3JlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAgIGZ1bGZpbGwodGhpcy5wcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlamVjdCh0aGlzLnByb21pc2UsIHZhbGlkYXRpb25FcnJvcigpKTtcbiAgICB9XG4gIH1cblxuICBFbnVtZXJhdG9yLnByb3RvdHlwZS5fZW51bWVyYXRlID0gZnVuY3Rpb24gX2VudW1lcmF0ZShpbnB1dCkge1xuICAgIGZvciAodmFyIGkgPSAwOyB0aGlzLl9zdGF0ZSA9PT0gUEVORElORyAmJiBpIDwgaW5wdXQubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuX2VhY2hFbnRyeShpbnB1dFtpXSwgaSk7XG4gICAgfVxuICB9O1xuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl9lYWNoRW50cnkgPSBmdW5jdGlvbiBfZWFjaEVudHJ5KGVudHJ5LCBpKSB7XG4gICAgdmFyIGMgPSB0aGlzLl9pbnN0YW5jZUNvbnN0cnVjdG9yO1xuICAgIHZhciByZXNvbHZlJCQxID0gYy5yZXNvbHZlO1xuXG5cbiAgICBpZiAocmVzb2x2ZSQkMSA9PT0gcmVzb2x2ZSQxKSB7XG4gICAgICB2YXIgX3RoZW4gPSBnZXRUaGVuKGVudHJ5KTtcblxuICAgICAgaWYgKF90aGVuID09PSB0aGVuICYmIGVudHJ5Ll9zdGF0ZSAhPT0gUEVORElORykge1xuICAgICAgICB0aGlzLl9zZXR0bGVkQXQoZW50cnkuX3N0YXRlLCBpLCBlbnRyeS5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIF90aGVuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuICAgICAgICB0aGlzLl9yZXN1bHRbaV0gPSBlbnRyeTtcbiAgICAgIH0gZWxzZSBpZiAoYyA9PT0gUHJvbWlzZSQxKSB7XG4gICAgICAgIHZhciBwcm9taXNlID0gbmV3IGMobm9vcCk7XG4gICAgICAgIGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgZW50cnksIF90aGVuKTtcbiAgICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KHByb21pc2UsIGkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KG5ldyBjKGZ1bmN0aW9uIChyZXNvbHZlJCQxKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc29sdmUkJDEoZW50cnkpO1xuICAgICAgICB9KSwgaSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3dpbGxTZXR0bGVBdChyZXNvbHZlJCQxKGVudHJ5KSwgaSk7XG4gICAgfVxuICB9O1xuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl9zZXR0bGVkQXQgPSBmdW5jdGlvbiBfc2V0dGxlZEF0KHN0YXRlLCBpLCB2YWx1ZSkge1xuICAgIHZhciBwcm9taXNlID0gdGhpcy5wcm9taXNlO1xuXG5cbiAgICBpZiAocHJvbWlzZS5fc3RhdGUgPT09IFBFTkRJTkcpIHtcbiAgICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuXG4gICAgICBpZiAoc3RhdGUgPT09IFJFSkVDVEVEKSB7XG4gICAgICAgIHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9yZXN1bHRbaV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICBmdWxmaWxsKHByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgfVxuICB9O1xuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl93aWxsU2V0dGxlQXQgPSBmdW5jdGlvbiBfd2lsbFNldHRsZUF0KHByb21pc2UsIGkpIHtcbiAgICB2YXIgZW51bWVyYXRvciA9IHRoaXM7XG5cbiAgICBzdWJzY3JpYmUocHJvbWlzZSwgdW5kZWZpbmVkLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiBlbnVtZXJhdG9yLl9zZXR0bGVkQXQoRlVMRklMTEVELCBpLCB2YWx1ZSk7XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgcmV0dXJuIGVudW1lcmF0b3IuX3NldHRsZWRBdChSRUpFQ1RFRCwgaSwgcmVhc29uKTtcbiAgICB9KTtcbiAgfTtcblxuICByZXR1cm4gRW51bWVyYXRvcjtcbn0oKTtcblxuLyoqXG4gIGBQcm9taXNlLmFsbGAgYWNjZXB0cyBhbiBhcnJheSBvZiBwcm9taXNlcywgYW5kIHJldHVybnMgYSBuZXcgcHJvbWlzZSB3aGljaFxuICBpcyBmdWxmaWxsZWQgd2l0aCBhbiBhcnJheSBvZiBmdWxmaWxsbWVudCB2YWx1ZXMgZm9yIHRoZSBwYXNzZWQgcHJvbWlzZXMsIG9yXG4gIHJlamVjdGVkIHdpdGggdGhlIHJlYXNvbiBvZiB0aGUgZmlyc3QgcGFzc2VkIHByb21pc2UgdG8gYmUgcmVqZWN0ZWQuIEl0IGNhc3RzIGFsbFxuICBlbGVtZW50cyBvZiB0aGUgcGFzc2VkIGl0ZXJhYmxlIHRvIHByb21pc2VzIGFzIGl0IHJ1bnMgdGhpcyBhbGdvcml0aG0uXG5cbiAgRXhhbXBsZTpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlMSA9IHJlc29sdmUoMSk7XG4gIGxldCBwcm9taXNlMiA9IHJlc29sdmUoMik7XG4gIGxldCBwcm9taXNlMyA9IHJlc29sdmUoMyk7XG4gIGxldCBwcm9taXNlcyA9IFsgcHJvbWlzZTEsIHByb21pc2UyLCBwcm9taXNlMyBdO1xuXG4gIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uKGFycmF5KXtcbiAgICAvLyBUaGUgYXJyYXkgaGVyZSB3b3VsZCBiZSBbIDEsIDIsIDMgXTtcbiAgfSk7XG4gIGBgYFxuXG4gIElmIGFueSBvZiB0aGUgYHByb21pc2VzYCBnaXZlbiB0byBgYWxsYCBhcmUgcmVqZWN0ZWQsIHRoZSBmaXJzdCBwcm9taXNlXG4gIHRoYXQgaXMgcmVqZWN0ZWQgd2lsbCBiZSBnaXZlbiBhcyBhbiBhcmd1bWVudCB0byB0aGUgcmV0dXJuZWQgcHJvbWlzZXMnc1xuICByZWplY3Rpb24gaGFuZGxlci4gRm9yIGV4YW1wbGU6XG5cbiAgRXhhbXBsZTpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlMSA9IHJlc29sdmUoMSk7XG4gIGxldCBwcm9taXNlMiA9IHJlamVjdChuZXcgRXJyb3IoXCIyXCIpKTtcbiAgbGV0IHByb21pc2UzID0gcmVqZWN0KG5ldyBFcnJvcihcIjNcIikpO1xuICBsZXQgcHJvbWlzZXMgPSBbIHByb21pc2UxLCBwcm9taXNlMiwgcHJvbWlzZTMgXTtcblxuICBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbihhcnJheSl7XG4gICAgLy8gQ29kZSBoZXJlIG5ldmVyIHJ1bnMgYmVjYXVzZSB0aGVyZSBhcmUgcmVqZWN0ZWQgcHJvbWlzZXMhXG4gIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgLy8gZXJyb3IubWVzc2FnZSA9PT0gXCIyXCJcbiAgfSk7XG4gIGBgYFxuXG4gIEBtZXRob2QgYWxsXG4gIEBzdGF0aWNcbiAgQHBhcmFtIHtBcnJheX0gZW50cmllcyBhcnJheSBvZiBwcm9taXNlc1xuICBAcGFyYW0ge1N0cmluZ30gbGFiZWwgb3B0aW9uYWwgc3RyaW5nIGZvciBsYWJlbGluZyB0aGUgcHJvbWlzZS5cbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdoZW4gYWxsIGBwcm9taXNlc2AgaGF2ZSBiZWVuXG4gIGZ1bGZpbGxlZCwgb3IgcmVqZWN0ZWQgaWYgYW55IG9mIHRoZW0gYmVjb21lIHJlamVjdGVkLlxuICBAc3RhdGljXG4qL1xuZnVuY3Rpb24gYWxsKGVudHJpZXMpIHtcbiAgcmV0dXJuIG5ldyBFbnVtZXJhdG9yKHRoaXMsIGVudHJpZXMpLnByb21pc2U7XG59XG5cbi8qKlxuICBgUHJvbWlzZS5yYWNlYCByZXR1cm5zIGEgbmV3IHByb21pc2Ugd2hpY2ggaXMgc2V0dGxlZCBpbiB0aGUgc2FtZSB3YXkgYXMgdGhlXG4gIGZpcnN0IHBhc3NlZCBwcm9taXNlIHRvIHNldHRsZS5cblxuICBFeGFtcGxlOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UxID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZXNvbHZlKCdwcm9taXNlIDEnKTtcbiAgICB9LCAyMDApO1xuICB9KTtcblxuICBsZXQgcHJvbWlzZTIgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoJ3Byb21pc2UgMicpO1xuICAgIH0sIDEwMCk7XG4gIH0pO1xuXG4gIFByb21pc2UucmFjZShbcHJvbWlzZTEsIHByb21pc2UyXSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIHJlc3VsdCA9PT0gJ3Byb21pc2UgMicgYmVjYXVzZSBpdCB3YXMgcmVzb2x2ZWQgYmVmb3JlIHByb21pc2UxXG4gICAgLy8gd2FzIHJlc29sdmVkLlxuICB9KTtcbiAgYGBgXG5cbiAgYFByb21pc2UucmFjZWAgaXMgZGV0ZXJtaW5pc3RpYyBpbiB0aGF0IG9ubHkgdGhlIHN0YXRlIG9mIHRoZSBmaXJzdFxuICBzZXR0bGVkIHByb21pc2UgbWF0dGVycy4gRm9yIGV4YW1wbGUsIGV2ZW4gaWYgb3RoZXIgcHJvbWlzZXMgZ2l2ZW4gdG8gdGhlXG4gIGBwcm9taXNlc2AgYXJyYXkgYXJndW1lbnQgYXJlIHJlc29sdmVkLCBidXQgdGhlIGZpcnN0IHNldHRsZWQgcHJvbWlzZSBoYXNcbiAgYmVjb21lIHJlamVjdGVkIGJlZm9yZSB0aGUgb3RoZXIgcHJvbWlzZXMgYmVjYW1lIGZ1bGZpbGxlZCwgdGhlIHJldHVybmVkXG4gIHByb21pc2Ugd2lsbCBiZWNvbWUgcmVqZWN0ZWQ6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZTEgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoJ3Byb21pc2UgMScpO1xuICAgIH0sIDIwMCk7XG4gIH0pO1xuXG4gIGxldCBwcm9taXNlMiA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmVqZWN0KG5ldyBFcnJvcigncHJvbWlzZSAyJykpO1xuICAgIH0sIDEwMCk7XG4gIH0pO1xuXG4gIFByb21pc2UucmFjZShbcHJvbWlzZTEsIHByb21pc2UyXSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIENvZGUgaGVyZSBuZXZlciBydW5zXG4gIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gcmVhc29uLm1lc3NhZ2UgPT09ICdwcm9taXNlIDInIGJlY2F1c2UgcHJvbWlzZSAyIGJlY2FtZSByZWplY3RlZCBiZWZvcmVcbiAgICAvLyBwcm9taXNlIDEgYmVjYW1lIGZ1bGZpbGxlZFxuICB9KTtcbiAgYGBgXG5cbiAgQW4gZXhhbXBsZSByZWFsLXdvcmxkIHVzZSBjYXNlIGlzIGltcGxlbWVudGluZyB0aW1lb3V0czpcblxuICBgYGBqYXZhc2NyaXB0XG4gIFByb21pc2UucmFjZShbYWpheCgnZm9vLmpzb24nKSwgdGltZW91dCg1MDAwKV0pXG4gIGBgYFxuXG4gIEBtZXRob2QgcmFjZVxuICBAc3RhdGljXG4gIEBwYXJhbSB7QXJyYXl9IHByb21pc2VzIGFycmF5IG9mIHByb21pc2VzIHRvIG9ic2VydmVcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2Ugd2hpY2ggc2V0dGxlcyBpbiB0aGUgc2FtZSB3YXkgYXMgdGhlIGZpcnN0IHBhc3NlZFxuICBwcm9taXNlIHRvIHNldHRsZS5cbiovXG5mdW5jdGlvbiByYWNlKGVudHJpZXMpIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICBpZiAoIWlzQXJyYXkoZW50cmllcykpIHtcbiAgICByZXR1cm4gbmV3IENvbnN0cnVjdG9yKGZ1bmN0aW9uIChfLCByZWplY3QpIHtcbiAgICAgIHJldHVybiByZWplY3QobmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhbiBhcnJheSB0byByYWNlLicpKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IENvbnN0cnVjdG9yKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciBsZW5ndGggPSBlbnRyaWVzLmxlbmd0aDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgQ29uc3RydWN0b3IucmVzb2x2ZShlbnRyaWVzW2ldKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gIGBQcm9taXNlLnJlamVjdGAgcmV0dXJucyBhIHByb21pc2UgcmVqZWN0ZWQgd2l0aCB0aGUgcGFzc2VkIGByZWFzb25gLlxuICBJdCBpcyBzaG9ydGhhbmQgZm9yIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgcmVqZWN0KG5ldyBFcnJvcignV0hPT1BTJykpO1xuICB9KTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIENvZGUgaGVyZSBkb2Vzbid0IHJ1biBiZWNhdXNlIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICB9KTtcbiAgYGBgXG5cbiAgSW5zdGVhZCBvZiB3cml0aW5nIHRoZSBhYm92ZSwgeW91ciBjb2RlIG5vdyBzaW1wbHkgYmVjb21lcyB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UgPSBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ1dIT09QUycpKTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIENvZGUgaGVyZSBkb2Vzbid0IHJ1biBiZWNhdXNlIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICB9KTtcbiAgYGBgXG5cbiAgQG1ldGhvZCByZWplY3RcbiAgQHN0YXRpY1xuICBAcGFyYW0ge0FueX0gcmVhc29uIHZhbHVlIHRoYXQgdGhlIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZWplY3RlZCB3aXRoLlxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSByZWplY3RlZCB3aXRoIHRoZSBnaXZlbiBgcmVhc29uYC5cbiovXG5mdW5jdGlvbiByZWplY3QkMShyZWFzb24pIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcbiAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3Iobm9vcCk7XG4gIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICByZXR1cm4gcHJvbWlzZTtcbn1cblxuZnVuY3Rpb24gbmVlZHNSZXNvbHZlcigpIHtcbiAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhIHJlc29sdmVyIGZ1bmN0aW9uIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xufVxuXG5mdW5jdGlvbiBuZWVkc05ldygpIHtcbiAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtcbn1cblxuLyoqXG4gIFByb21pc2Ugb2JqZWN0cyByZXByZXNlbnQgdGhlIGV2ZW50dWFsIHJlc3VsdCBvZiBhbiBhc3luY2hyb25vdXMgb3BlcmF0aW9uLiBUaGVcbiAgcHJpbWFyeSB3YXkgb2YgaW50ZXJhY3Rpbmcgd2l0aCBhIHByb21pc2UgaXMgdGhyb3VnaCBpdHMgYHRoZW5gIG1ldGhvZCwgd2hpY2hcbiAgcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2UncyBldmVudHVhbCB2YWx1ZSBvciB0aGUgcmVhc29uXG4gIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gIFRlcm1pbm9sb2d5XG4gIC0tLS0tLS0tLS0tXG5cbiAgLSBgcHJvbWlzZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHdpdGggYSBgdGhlbmAgbWV0aG9kIHdob3NlIGJlaGF2aW9yIGNvbmZvcm1zIHRvIHRoaXMgc3BlY2lmaWNhdGlvbi5cbiAgLSBgdGhlbmFibGVgIGlzIGFuIG9iamVjdCBvciBmdW5jdGlvbiB0aGF0IGRlZmluZXMgYSBgdGhlbmAgbWV0aG9kLlxuICAtIGB2YWx1ZWAgaXMgYW55IGxlZ2FsIEphdmFTY3JpcHQgdmFsdWUgKGluY2x1ZGluZyB1bmRlZmluZWQsIGEgdGhlbmFibGUsIG9yIGEgcHJvbWlzZSkuXG4gIC0gYGV4Y2VwdGlvbmAgaXMgYSB2YWx1ZSB0aGF0IGlzIHRocm93biB1c2luZyB0aGUgdGhyb3cgc3RhdGVtZW50LlxuICAtIGByZWFzb25gIGlzIGEgdmFsdWUgdGhhdCBpbmRpY2F0ZXMgd2h5IGEgcHJvbWlzZSB3YXMgcmVqZWN0ZWQuXG4gIC0gYHNldHRsZWRgIHRoZSBmaW5hbCByZXN0aW5nIHN0YXRlIG9mIGEgcHJvbWlzZSwgZnVsZmlsbGVkIG9yIHJlamVjdGVkLlxuXG4gIEEgcHJvbWlzZSBjYW4gYmUgaW4gb25lIG9mIHRocmVlIHN0YXRlczogcGVuZGluZywgZnVsZmlsbGVkLCBvciByZWplY3RlZC5cblxuICBQcm9taXNlcyB0aGF0IGFyZSBmdWxmaWxsZWQgaGF2ZSBhIGZ1bGZpbGxtZW50IHZhbHVlIGFuZCBhcmUgaW4gdGhlIGZ1bGZpbGxlZFxuICBzdGF0ZS4gIFByb21pc2VzIHRoYXQgYXJlIHJlamVjdGVkIGhhdmUgYSByZWplY3Rpb24gcmVhc29uIGFuZCBhcmUgaW4gdGhlXG4gIHJlamVjdGVkIHN0YXRlLiAgQSBmdWxmaWxsbWVudCB2YWx1ZSBpcyBuZXZlciBhIHRoZW5hYmxlLlxuXG4gIFByb21pc2VzIGNhbiBhbHNvIGJlIHNhaWQgdG8gKnJlc29sdmUqIGEgdmFsdWUuICBJZiB0aGlzIHZhbHVlIGlzIGFsc28gYVxuICBwcm9taXNlLCB0aGVuIHRoZSBvcmlnaW5hbCBwcm9taXNlJ3Mgc2V0dGxlZCBzdGF0ZSB3aWxsIG1hdGNoIHRoZSB2YWx1ZSdzXG4gIHNldHRsZWQgc3RhdGUuICBTbyBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IHJlamVjdHMgd2lsbFxuICBpdHNlbGYgcmVqZWN0LCBhbmQgYSBwcm9taXNlIHRoYXQgKnJlc29sdmVzKiBhIHByb21pc2UgdGhhdCBmdWxmaWxscyB3aWxsXG4gIGl0c2VsZiBmdWxmaWxsLlxuXG5cbiAgQmFzaWMgVXNhZ2U6XG4gIC0tLS0tLS0tLS0tLVxuXG4gIGBgYGpzXG4gIGxldCBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgLy8gb24gc3VjY2Vzc1xuICAgIHJlc29sdmUodmFsdWUpO1xuXG4gICAgLy8gb24gZmFpbHVyZVxuICAgIHJlamVjdChyZWFzb24pO1xuICB9KTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAvLyBvbiBmdWxmaWxsbWVudFxuICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAvLyBvbiByZWplY3Rpb25cbiAgfSk7XG4gIGBgYFxuXG4gIEFkdmFuY2VkIFVzYWdlOlxuICAtLS0tLS0tLS0tLS0tLS1cblxuICBQcm9taXNlcyBzaGluZSB3aGVuIGFic3RyYWN0aW5nIGF3YXkgYXN5bmNocm9ub3VzIGludGVyYWN0aW9ucyBzdWNoIGFzXG4gIGBYTUxIdHRwUmVxdWVzdGBzLlxuXG4gIGBgYGpzXG4gIGZ1bmN0aW9uIGdldEpTT04odXJsKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICBsZXQgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgIHhoci5vcGVuKCdHRVQnLCB1cmwpO1xuICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGhhbmRsZXI7XG4gICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2pzb24nO1xuICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICB4aHIuc2VuZCgpO1xuXG4gICAgICBmdW5jdGlvbiBoYW5kbGVyKCkge1xuICAgICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09PSB0aGlzLkRPTkUpIHtcbiAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgcmVzb2x2ZSh0aGlzLnJlc3BvbnNlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignZ2V0SlNPTjogYCcgKyB1cmwgKyAnYCBmYWlsZWQgd2l0aCBzdGF0dXM6IFsnICsgdGhpcy5zdGF0dXMgKyAnXScpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBnZXRKU09OKCcvcG9zdHMuanNvbicpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgIC8vIG9uIGZ1bGZpbGxtZW50XG4gIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgIC8vIG9uIHJlamVjdGlvblxuICB9KTtcbiAgYGBgXG5cbiAgVW5saWtlIGNhbGxiYWNrcywgcHJvbWlzZXMgYXJlIGdyZWF0IGNvbXBvc2FibGUgcHJpbWl0aXZlcy5cblxuICBgYGBqc1xuICBQcm9taXNlLmFsbChbXG4gICAgZ2V0SlNPTignL3Bvc3RzJyksXG4gICAgZ2V0SlNPTignL2NvbW1lbnRzJylcbiAgXSkudGhlbihmdW5jdGlvbih2YWx1ZXMpe1xuICAgIHZhbHVlc1swXSAvLyA9PiBwb3N0c0pTT05cbiAgICB2YWx1ZXNbMV0gLy8gPT4gY29tbWVudHNKU09OXG5cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9KTtcbiAgYGBgXG5cbiAgQGNsYXNzIFByb21pc2VcbiAgQHBhcmFtIHtGdW5jdGlvbn0gcmVzb2x2ZXJcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAY29uc3RydWN0b3JcbiovXG5cbnZhciBQcm9taXNlJDEgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIFByb21pc2UocmVzb2x2ZXIpIHtcbiAgICB0aGlzW1BST01JU0VfSURdID0gbmV4dElkKCk7XG4gICAgdGhpcy5fcmVzdWx0ID0gdGhpcy5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fc3Vic2NyaWJlcnMgPSBbXTtcblxuICAgIGlmIChub29wICE9PSByZXNvbHZlcikge1xuICAgICAgdHlwZW9mIHJlc29sdmVyICE9PSAnZnVuY3Rpb24nICYmIG5lZWRzUmVzb2x2ZXIoKTtcbiAgICAgIHRoaXMgaW5zdGFuY2VvZiBQcm9taXNlID8gaW5pdGlhbGl6ZVByb21pc2UodGhpcywgcmVzb2x2ZXIpIDogbmVlZHNOZXcoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgVGhlIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsXG4gIHdoaWNoIHJlZ2lzdGVycyBjYWxsYmFja3MgdG8gcmVjZWl2ZSBlaXRoZXIgYSBwcm9taXNlJ3MgZXZlbnR1YWwgdmFsdWUgb3IgdGhlXG4gIHJlYXNvbiB3aHkgdGhlIHByb21pc2UgY2Fubm90IGJlIGZ1bGZpbGxlZC5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAvLyB1c2VyIGlzIGF2YWlsYWJsZVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHVzZXIgaXMgdW5hdmFpbGFibGUsIGFuZCB5b3UgYXJlIGdpdmVuIHRoZSByZWFzb24gd2h5XG4gIH0pO1xuICBgYGBcbiAgIENoYWluaW5nXG4gIC0tLS0tLS0tXG4gICBUaGUgcmV0dXJuIHZhbHVlIG9mIGB0aGVuYCBpcyBpdHNlbGYgYSBwcm9taXNlLiAgVGhpcyBzZWNvbmQsICdkb3duc3RyZWFtJ1xuICBwcm9taXNlIGlzIHJlc29sdmVkIHdpdGggdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZmlyc3QgcHJvbWlzZSdzIGZ1bGZpbGxtZW50XG4gIG9yIHJlamVjdGlvbiBoYW5kbGVyLCBvciByZWplY3RlZCBpZiB0aGUgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uLlxuICAgYGBganNcbiAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgcmV0dXJuIHVzZXIubmFtZTtcbiAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHJldHVybiAnZGVmYXVsdCBuYW1lJztcbiAgfSkudGhlbihmdW5jdGlvbiAodXNlck5hbWUpIHtcbiAgICAvLyBJZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHVzZXJOYW1lYCB3aWxsIGJlIHRoZSB1c2VyJ3MgbmFtZSwgb3RoZXJ3aXNlIGl0XG4gICAgLy8gd2lsbCBiZSBgJ2RlZmF1bHQgbmFtZSdgXG4gIH0pO1xuICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScpO1xuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jyk7XG4gIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgLy8gbmV2ZXIgcmVhY2hlZFxuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgLy8gaWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGByZWFzb25gIHdpbGwgYmUgJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jy5cbiAgICAvLyBJZiBgZmluZFVzZXJgIHJlamVjdGVkLCBgcmVhc29uYCB3aWxsIGJlICdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jy5cbiAgfSk7XG4gIGBgYFxuICBJZiB0aGUgZG93bnN0cmVhbSBwcm9taXNlIGRvZXMgbm90IHNwZWNpZnkgYSByZWplY3Rpb24gaGFuZGxlciwgcmVqZWN0aW9uIHJlYXNvbnMgd2lsbCBiZSBwcm9wYWdhdGVkIGZ1cnRoZXIgZG93bnN0cmVhbS5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgIHRocm93IG5ldyBQZWRhZ29naWNhbEV4Y2VwdGlvbignVXBzdHJlYW0gZXJyb3InKTtcbiAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAvLyBuZXZlciByZWFjaGVkXG4gIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgLy8gbmV2ZXIgcmVhY2hlZFxuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgLy8gVGhlIGBQZWRnYWdvY2lhbEV4Y2VwdGlvbmAgaXMgcHJvcGFnYXRlZCBhbGwgdGhlIHdheSBkb3duIHRvIGhlcmVcbiAgfSk7XG4gIGBgYFxuICAgQXNzaW1pbGF0aW9uXG4gIC0tLS0tLS0tLS0tLVxuICAgU29tZXRpbWVzIHRoZSB2YWx1ZSB5b3Ugd2FudCB0byBwcm9wYWdhdGUgdG8gYSBkb3duc3RyZWFtIHByb21pc2UgY2FuIG9ubHkgYmVcbiAgcmV0cmlldmVkIGFzeW5jaHJvbm91c2x5LiBUaGlzIGNhbiBiZSBhY2hpZXZlZCBieSByZXR1cm5pbmcgYSBwcm9taXNlIGluIHRoZVxuICBmdWxmaWxsbWVudCBvciByZWplY3Rpb24gaGFuZGxlci4gVGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIHRoZW4gYmUgcGVuZGluZ1xuICB1bnRpbCB0aGUgcmV0dXJuZWQgcHJvbWlzZSBpcyBzZXR0bGVkLiBUaGlzIGlzIGNhbGxlZCAqYXNzaW1pbGF0aW9uKi5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgIHJldHVybiBmaW5kQ29tbWVudHNCeUF1dGhvcih1c2VyKTtcbiAgfSkudGhlbihmdW5jdGlvbiAoY29tbWVudHMpIHtcbiAgICAvLyBUaGUgdXNlcidzIGNvbW1lbnRzIGFyZSBub3cgYXZhaWxhYmxlXG4gIH0pO1xuICBgYGBcbiAgIElmIHRoZSBhc3NpbWxpYXRlZCBwcm9taXNlIHJlamVjdHMsIHRoZW4gdGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIGFsc28gcmVqZWN0LlxuICAgYGBganNcbiAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgcmV0dXJuIGZpbmRDb21tZW50c0J5QXV0aG9yKHVzZXIpO1xuICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgZnVsZmlsbHMsIHdlJ2xsIGhhdmUgdGhlIHZhbHVlIGhlcmVcbiAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgcmVqZWN0cywgd2UnbGwgaGF2ZSB0aGUgcmVhc29uIGhlcmVcbiAgfSk7XG4gIGBgYFxuICAgU2ltcGxlIEV4YW1wbGVcbiAgLS0tLS0tLS0tLS0tLS1cbiAgIFN5bmNocm9ub3VzIEV4YW1wbGVcbiAgIGBgYGphdmFzY3JpcHRcbiAgbGV0IHJlc3VsdDtcbiAgIHRyeSB7XG4gICAgcmVzdWx0ID0gZmluZFJlc3VsdCgpO1xuICAgIC8vIHN1Y2Nlc3NcbiAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAvLyBmYWlsdXJlXG4gIH1cbiAgYGBgXG4gICBFcnJiYWNrIEV4YW1wbGVcbiAgIGBgYGpzXG4gIGZpbmRSZXN1bHQoZnVuY3Rpb24ocmVzdWx0LCBlcnIpe1xuICAgIGlmIChlcnIpIHtcbiAgICAgIC8vIGZhaWx1cmVcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gc3VjY2Vzc1xuICAgIH1cbiAgfSk7XG4gIGBgYFxuICAgUHJvbWlzZSBFeGFtcGxlO1xuICAgYGBgamF2YXNjcmlwdFxuICBmaW5kUmVzdWx0KCkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIHN1Y2Nlc3NcbiAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyBmYWlsdXJlXG4gIH0pO1xuICBgYGBcbiAgIEFkdmFuY2VkIEV4YW1wbGVcbiAgLS0tLS0tLS0tLS0tLS1cbiAgIFN5bmNocm9ub3VzIEV4YW1wbGVcbiAgIGBgYGphdmFzY3JpcHRcbiAgbGV0IGF1dGhvciwgYm9va3M7XG4gICB0cnkge1xuICAgIGF1dGhvciA9IGZpbmRBdXRob3IoKTtcbiAgICBib29rcyAgPSBmaW5kQm9va3NCeUF1dGhvcihhdXRob3IpO1xuICAgIC8vIHN1Y2Nlc3NcbiAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAvLyBmYWlsdXJlXG4gIH1cbiAgYGBgXG4gICBFcnJiYWNrIEV4YW1wbGVcbiAgIGBgYGpzXG4gICBmdW5jdGlvbiBmb3VuZEJvb2tzKGJvb2tzKSB7XG4gICB9XG4gICBmdW5jdGlvbiBmYWlsdXJlKHJlYXNvbikge1xuICAgfVxuICAgZmluZEF1dGhvcihmdW5jdGlvbihhdXRob3IsIGVycil7XG4gICAgaWYgKGVycikge1xuICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgLy8gZmFpbHVyZVxuICAgIH0gZWxzZSB7XG4gICAgICB0cnkge1xuICAgICAgICBmaW5kQm9vb2tzQnlBdXRob3IoYXV0aG9yLCBmdW5jdGlvbihib29rcywgZXJyKSB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBmb3VuZEJvb2tzKGJvb2tzKTtcbiAgICAgICAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgICAgICAgIGZhaWx1cmUocmVhc29uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICB9XG4gICAgICAvLyBzdWNjZXNzXG4gICAgfVxuICB9KTtcbiAgYGBgXG4gICBQcm9taXNlIEV4YW1wbGU7XG4gICBgYGBqYXZhc2NyaXB0XG4gIGZpbmRBdXRob3IoKS5cbiAgICB0aGVuKGZpbmRCb29rc0J5QXV0aG9yKS5cbiAgICB0aGVuKGZ1bmN0aW9uKGJvb2tzKXtcbiAgICAgIC8vIGZvdW5kIGJvb2tzXG4gIH0pLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgfSk7XG4gIGBgYFxuICAgQG1ldGhvZCB0aGVuXG4gIEBwYXJhbSB7RnVuY3Rpb259IG9uRnVsZmlsbGVkXG4gIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0ZWRcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfVxuICAqL1xuXG4gIC8qKlxuICBgY2F0Y2hgIGlzIHNpbXBseSBzdWdhciBmb3IgYHRoZW4odW5kZWZpbmVkLCBvblJlamVjdGlvbilgIHdoaWNoIG1ha2VzIGl0IHRoZSBzYW1lXG4gIGFzIHRoZSBjYXRjaCBibG9jayBvZiBhIHRyeS9jYXRjaCBzdGF0ZW1lbnQuXG4gIGBgYGpzXG4gIGZ1bmN0aW9uIGZpbmRBdXRob3IoKXtcbiAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZG4ndCBmaW5kIHRoYXQgYXV0aG9yJyk7XG4gIH1cbiAgLy8gc3luY2hyb25vdXNcbiAgdHJ5IHtcbiAgZmluZEF1dGhvcigpO1xuICB9IGNhdGNoKHJlYXNvbikge1xuICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICB9XG4gIC8vIGFzeW5jIHdpdGggcHJvbWlzZXNcbiAgZmluZEF1dGhvcigpLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gIH0pO1xuICBgYGBcbiAgQG1ldGhvZCBjYXRjaFxuICBAcGFyYW0ge0Z1bmN0aW9ufSBvblJlamVjdGlvblxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9XG4gICovXG5cblxuICBQcm9taXNlLnByb3RvdHlwZS5jYXRjaCA9IGZ1bmN0aW9uIF9jYXRjaChvblJlamVjdGlvbikge1xuICAgIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3Rpb24pO1xuICB9O1xuXG4gIC8qKlxuICAgIGBmaW5hbGx5YCB3aWxsIGJlIGludm9rZWQgcmVnYXJkbGVzcyBvZiB0aGUgcHJvbWlzZSdzIGZhdGUganVzdCBhcyBuYXRpdmVcbiAgICB0cnkvY2F0Y2gvZmluYWxseSBiZWhhdmVzXG4gIFxuICAgIFN5bmNocm9ub3VzIGV4YW1wbGU6XG4gIFxuICAgIGBgYGpzXG4gICAgZmluZEF1dGhvcigpIHtcbiAgICAgIGlmIChNYXRoLnJhbmRvbSgpID4gMC41KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBBdXRob3IoKTtcbiAgICB9XG4gIFxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZmluZEF1dGhvcigpOyAvLyBzdWNjZWVkIG9yIGZhaWxcbiAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICByZXR1cm4gZmluZE90aGVyQXV0aGVyKCk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIC8vIGFsd2F5cyBydW5zXG4gICAgICAvLyBkb2Vzbid0IGFmZmVjdCB0aGUgcmV0dXJuIHZhbHVlXG4gICAgfVxuICAgIGBgYFxuICBcbiAgICBBc3luY2hyb25vdXMgZXhhbXBsZTpcbiAgXG4gICAgYGBganNcbiAgICBmaW5kQXV0aG9yKCkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgIHJldHVybiBmaW5kT3RoZXJBdXRoZXIoKTtcbiAgICB9KS5maW5hbGx5KGZ1bmN0aW9uKCl7XG4gICAgICAvLyBhdXRob3Igd2FzIGVpdGhlciBmb3VuZCwgb3Igbm90XG4gICAgfSk7XG4gICAgYGBgXG4gIFxuICAgIEBtZXRob2QgZmluYWxseVxuICAgIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgQHJldHVybiB7UHJvbWlzZX1cbiAgKi9cblxuXG4gIFByb21pc2UucHJvdG90eXBlLmZpbmFsbHkgPSBmdW5jdGlvbiBfZmluYWxseShjYWxsYmFjaykge1xuICAgIHZhciBwcm9taXNlID0gdGhpcztcbiAgICB2YXIgY29uc3RydWN0b3IgPSBwcm9taXNlLmNvbnN0cnVjdG9yO1xuXG4gICAgcmV0dXJuIHByb21pc2UudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiBjb25zdHJ1Y3Rvci5yZXNvbHZlKGNhbGxiYWNrKCkpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9KTtcbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICByZXR1cm4gY29uc3RydWN0b3IucmVzb2x2ZShjYWxsYmFjaygpKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhyb3cgcmVhc29uO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgcmV0dXJuIFByb21pc2U7XG59KCk7XG5cblByb21pc2UkMS5wcm90b3R5cGUudGhlbiA9IHRoZW47XG5Qcm9taXNlJDEuYWxsID0gYWxsO1xuUHJvbWlzZSQxLnJhY2UgPSByYWNlO1xuUHJvbWlzZSQxLnJlc29sdmUgPSByZXNvbHZlJDE7XG5Qcm9taXNlJDEucmVqZWN0ID0gcmVqZWN0JDE7XG5Qcm9taXNlJDEuX3NldFNjaGVkdWxlciA9IHNldFNjaGVkdWxlcjtcblByb21pc2UkMS5fc2V0QXNhcCA9IHNldEFzYXA7XG5Qcm9taXNlJDEuX2FzYXAgPSBhc2FwO1xuXG4vKmdsb2JhbCBzZWxmKi9cbmZ1bmN0aW9uIHBvbHlmaWxsKCkge1xuICAgIHZhciBsb2NhbCA9IHZvaWQgMDtcblxuICAgIGlmICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBsb2NhbCA9IGdsb2JhbDtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBsb2NhbCA9IHNlbGY7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxvY2FsID0gRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdwb2x5ZmlsbCBmYWlsZWQgYmVjYXVzZSBnbG9iYWwgb2JqZWN0IGlzIHVuYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnQnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBQID0gbG9jYWwuUHJvbWlzZTtcblxuICAgIGlmIChQKSB7XG4gICAgICAgIHZhciBwcm9taXNlVG9TdHJpbmcgPSBudWxsO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcHJvbWlzZVRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKFAucmVzb2x2ZSgpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gc2lsZW50bHkgaWdub3JlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb21pc2VUb1N0cmluZyA9PT0gJ1tvYmplY3QgUHJvbWlzZV0nICYmICFQLmNhc3QpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGxvY2FsLlByb21pc2UgPSBQcm9taXNlJDE7XG59XG5cbi8vIFN0cmFuZ2UgY29tcGF0Li5cblByb21pc2UkMS5wb2x5ZmlsbCA9IHBvbHlmaWxsO1xuUHJvbWlzZSQxLlByb21pc2UgPSBQcm9taXNlJDE7XG5cbnJldHVybiBQcm9taXNlJDE7XG5cbn0pKSk7XG5cblxuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1lczYtcHJvbWlzZS5tYXBcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgdG9TdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG52YXIgaXNBcnJheSA9IGZ1bmN0aW9uIGlzQXJyYXkoYXJyKSB7XG5cdGlmICh0eXBlb2YgQXJyYXkuaXNBcnJheSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdHJldHVybiBBcnJheS5pc0FycmF5KGFycik7XG5cdH1cblxuXHRyZXR1cm4gdG9TdHIuY2FsbChhcnIpID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcblxudmFyIGlzUGxhaW5PYmplY3QgPSBmdW5jdGlvbiBpc1BsYWluT2JqZWN0KG9iaikge1xuXHRpZiAoIW9iaiB8fCB0b1N0ci5jYWxsKG9iaikgIT09ICdbb2JqZWN0IE9iamVjdF0nKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0dmFyIGhhc093bkNvbnN0cnVjdG9yID0gaGFzT3duLmNhbGwob2JqLCAnY29uc3RydWN0b3InKTtcblx0dmFyIGhhc0lzUHJvdG90eXBlT2YgPSBvYmouY29uc3RydWN0b3IgJiYgb2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSAmJiBoYXNPd24uY2FsbChvYmouY29uc3RydWN0b3IucHJvdG90eXBlLCAnaXNQcm90b3R5cGVPZicpO1xuXHQvLyBOb3Qgb3duIGNvbnN0cnVjdG9yIHByb3BlcnR5IG11c3QgYmUgT2JqZWN0XG5cdGlmIChvYmouY29uc3RydWN0b3IgJiYgIWhhc093bkNvbnN0cnVjdG9yICYmICFoYXNJc1Byb3RvdHlwZU9mKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gT3duIHByb3BlcnRpZXMgYXJlIGVudW1lcmF0ZWQgZmlyc3RseSwgc28gdG8gc3BlZWQgdXAsXG5cdC8vIGlmIGxhc3Qgb25lIGlzIG93biwgdGhlbiBhbGwgcHJvcGVydGllcyBhcmUgb3duLlxuXHR2YXIga2V5O1xuXHRmb3IgKGtleSBpbiBvYmopIHsgLyoqLyB9XG5cblx0cmV0dXJuIHR5cGVvZiBrZXkgPT09ICd1bmRlZmluZWQnIHx8IGhhc093bi5jYWxsKG9iaiwga2V5KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZXh0ZW5kKCkge1xuXHR2YXIgb3B0aW9ucywgbmFtZSwgc3JjLCBjb3B5LCBjb3B5SXNBcnJheSwgY2xvbmU7XG5cdHZhciB0YXJnZXQgPSBhcmd1bWVudHNbMF07XG5cdHZhciBpID0gMTtcblx0dmFyIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7XG5cdHZhciBkZWVwID0gZmFsc2U7XG5cblx0Ly8gSGFuZGxlIGEgZGVlcCBjb3B5IHNpdHVhdGlvblxuXHRpZiAodHlwZW9mIHRhcmdldCA9PT0gJ2Jvb2xlYW4nKSB7XG5cdFx0ZGVlcCA9IHRhcmdldDtcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMV0gfHwge307XG5cdFx0Ly8gc2tpcCB0aGUgYm9vbGVhbiBhbmQgdGhlIHRhcmdldFxuXHRcdGkgPSAyO1xuXHR9XG5cdGlmICh0YXJnZXQgPT0gbnVsbCB8fCAodHlwZW9mIHRhcmdldCAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIHRhcmdldCAhPT0gJ2Z1bmN0aW9uJykpIHtcblx0XHR0YXJnZXQgPSB7fTtcblx0fVxuXG5cdGZvciAoOyBpIDwgbGVuZ3RoOyArK2kpIHtcblx0XHRvcHRpb25zID0gYXJndW1lbnRzW2ldO1xuXHRcdC8vIE9ubHkgZGVhbCB3aXRoIG5vbi1udWxsL3VuZGVmaW5lZCB2YWx1ZXNcblx0XHRpZiAob3B0aW9ucyAhPSBudWxsKSB7XG5cdFx0XHQvLyBFeHRlbmQgdGhlIGJhc2Ugb2JqZWN0XG5cdFx0XHRmb3IgKG5hbWUgaW4gb3B0aW9ucykge1xuXHRcdFx0XHRzcmMgPSB0YXJnZXRbbmFtZV07XG5cdFx0XHRcdGNvcHkgPSBvcHRpb25zW25hbWVdO1xuXG5cdFx0XHRcdC8vIFByZXZlbnQgbmV2ZXItZW5kaW5nIGxvb3Bcblx0XHRcdFx0aWYgKHRhcmdldCAhPT0gY29weSkge1xuXHRcdFx0XHRcdC8vIFJlY3Vyc2UgaWYgd2UncmUgbWVyZ2luZyBwbGFpbiBvYmplY3RzIG9yIGFycmF5c1xuXHRcdFx0XHRcdGlmIChkZWVwICYmIGNvcHkgJiYgKGlzUGxhaW5PYmplY3QoY29weSkgfHwgKGNvcHlJc0FycmF5ID0gaXNBcnJheShjb3B5KSkpKSB7XG5cdFx0XHRcdFx0XHRpZiAoY29weUlzQXJyYXkpIHtcblx0XHRcdFx0XHRcdFx0Y29weUlzQXJyYXkgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgaXNBcnJheShzcmMpID8gc3JjIDogW107XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBpc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Ly8gTmV2ZXIgbW92ZSBvcmlnaW5hbCBvYmplY3RzLCBjbG9uZSB0aGVtXG5cdFx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBleHRlbmQoZGVlcCwgY2xvbmUsIGNvcHkpO1xuXG5cdFx0XHRcdFx0Ly8gRG9uJ3QgYnJpbmcgaW4gdW5kZWZpbmVkIHZhbHVlc1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodHlwZW9mIGNvcHkgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBjb3B5O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIFJldHVybiB0aGUgbW9kaWZpZWQgb2JqZWN0XG5cdHJldHVybiB0YXJnZXQ7XG59O1xuIiwiLyoqXG4gKiBsb2Rhc2ggKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAqIENvcHlyaWdodCBqUXVlcnkgRm91bmRhdGlvbiBhbmQgb3RoZXIgY29udHJpYnV0b3JzIDxodHRwczovL2pxdWVyeS5vcmcvPlxuICogUmVsZWFzZWQgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICovXG5cbi8qKiBVc2VkIGFzIHRoZSBgVHlwZUVycm9yYCBtZXNzYWdlIGZvciBcIkZ1bmN0aW9uc1wiIG1ldGhvZHMuICovXG52YXIgRlVOQ19FUlJPUl9URVhUID0gJ0V4cGVjdGVkIGEgZnVuY3Rpb24nO1xuXG4vKiogVXNlZCBhcyByZWZlcmVuY2VzIGZvciB2YXJpb3VzIGBOdW1iZXJgIGNvbnN0YW50cy4gKi9cbnZhciBOQU4gPSAwIC8gMDtcblxuLyoqIGBPYmplY3QjdG9TdHJpbmdgIHJlc3VsdCByZWZlcmVuY2VzLiAqL1xudmFyIHN5bWJvbFRhZyA9ICdbb2JqZWN0IFN5bWJvbF0nO1xuXG4vKiogVXNlZCB0byBtYXRjaCBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlLiAqL1xudmFyIHJlVHJpbSA9IC9eXFxzK3xcXHMrJC9nO1xuXG4vKiogVXNlZCB0byBkZXRlY3QgYmFkIHNpZ25lZCBoZXhhZGVjaW1hbCBzdHJpbmcgdmFsdWVzLiAqL1xudmFyIHJlSXNCYWRIZXggPSAvXlstK10weFswLTlhLWZdKyQvaTtcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IGJpbmFyeSBzdHJpbmcgdmFsdWVzLiAqL1xudmFyIHJlSXNCaW5hcnkgPSAvXjBiWzAxXSskL2k7XG5cbi8qKiBVc2VkIHRvIGRldGVjdCBvY3RhbCBzdHJpbmcgdmFsdWVzLiAqL1xudmFyIHJlSXNPY3RhbCA9IC9eMG9bMC03XSskL2k7XG5cbi8qKiBCdWlsdC1pbiBtZXRob2QgcmVmZXJlbmNlcyB3aXRob3V0IGEgZGVwZW5kZW5jeSBvbiBgcm9vdGAuICovXG52YXIgZnJlZVBhcnNlSW50ID0gcGFyc2VJbnQ7XG5cbi8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgZ2xvYmFsYCBmcm9tIE5vZGUuanMuICovXG52YXIgZnJlZUdsb2JhbCA9IHR5cGVvZiBnbG9iYWwgPT0gJ29iamVjdCcgJiYgZ2xvYmFsICYmIGdsb2JhbC5PYmplY3QgPT09IE9iamVjdCAmJiBnbG9iYWw7XG5cbi8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgc2VsZmAuICovXG52YXIgZnJlZVNlbGYgPSB0eXBlb2Ygc2VsZiA9PSAnb2JqZWN0JyAmJiBzZWxmICYmIHNlbGYuT2JqZWN0ID09PSBPYmplY3QgJiYgc2VsZjtcblxuLyoqIFVzZWQgYXMgYSByZWZlcmVuY2UgdG8gdGhlIGdsb2JhbCBvYmplY3QuICovXG52YXIgcm9vdCA9IGZyZWVHbG9iYWwgfHwgZnJlZVNlbGYgfHwgRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcblxuLyoqIFVzZWQgZm9yIGJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzLiAqL1xudmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcblxuLyoqXG4gKiBVc2VkIHRvIHJlc29sdmUgdGhlXG4gKiBbYHRvU3RyaW5nVGFnYF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNy4wLyNzZWMtb2JqZWN0LnByb3RvdHlwZS50b3N0cmluZylcbiAqIG9mIHZhbHVlcy5cbiAqL1xudmFyIG9iamVjdFRvU3RyaW5nID0gb2JqZWN0UHJvdG8udG9TdHJpbmc7XG5cbi8qIEJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cbnZhciBuYXRpdmVNYXggPSBNYXRoLm1heCxcbiAgICBuYXRpdmVNaW4gPSBNYXRoLm1pbjtcblxuLyoqXG4gKiBHZXRzIHRoZSB0aW1lc3RhbXAgb2YgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdGhhdCBoYXZlIGVsYXBzZWQgc2luY2VcbiAqIHRoZSBVbml4IGVwb2NoICgxIEphbnVhcnkgMTk3MCAwMDowMDowMCBVVEMpLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMi40LjBcbiAqIEBjYXRlZ29yeSBEYXRlXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBSZXR1cm5zIHRoZSB0aW1lc3RhbXAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uZGVmZXIoZnVuY3Rpb24oc3RhbXApIHtcbiAqICAgY29uc29sZS5sb2coXy5ub3coKSAtIHN0YW1wKTtcbiAqIH0sIF8ubm93KCkpO1xuICogLy8gPT4gTG9ncyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBpdCB0b29rIGZvciB0aGUgZGVmZXJyZWQgaW52b2NhdGlvbi5cbiAqL1xudmFyIG5vdyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gcm9vdC5EYXRlLm5vdygpO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgZGVib3VuY2VkIGZ1bmN0aW9uIHRoYXQgZGVsYXlzIGludm9raW5nIGBmdW5jYCB1bnRpbCBhZnRlciBgd2FpdGBcbiAqIG1pbGxpc2Vjb25kcyBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIGxhc3QgdGltZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHdhc1xuICogaW52b2tlZC4gVGhlIGRlYm91bmNlZCBmdW5jdGlvbiBjb21lcyB3aXRoIGEgYGNhbmNlbGAgbWV0aG9kIHRvIGNhbmNlbFxuICogZGVsYXllZCBgZnVuY2AgaW52b2NhdGlvbnMgYW5kIGEgYGZsdXNoYCBtZXRob2QgdG8gaW1tZWRpYXRlbHkgaW52b2tlIHRoZW0uXG4gKiBQcm92aWRlIGBvcHRpb25zYCB0byBpbmRpY2F0ZSB3aGV0aGVyIGBmdW5jYCBzaG91bGQgYmUgaW52b2tlZCBvbiB0aGVcbiAqIGxlYWRpbmcgYW5kL29yIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIGB3YWl0YCB0aW1lb3V0LiBUaGUgYGZ1bmNgIGlzIGludm9rZWRcbiAqIHdpdGggdGhlIGxhc3QgYXJndW1lbnRzIHByb3ZpZGVkIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24uIFN1YnNlcXVlbnRcbiAqIGNhbGxzIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3QgYGZ1bmNgXG4gKiBpbnZvY2F0aW9uLlxuICpcbiAqICoqTm90ZToqKiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgLCBgZnVuY2AgaXNcbiAqIGludm9rZWQgb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uXG4gKiBpcyBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXG4gKlxuICogSWYgYHdhaXRgIGlzIGAwYCBhbmQgYGxlYWRpbmdgIGlzIGBmYWxzZWAsIGBmdW5jYCBpbnZvY2F0aW9uIGlzIGRlZmVycmVkXG4gKiB1bnRpbCB0byB0aGUgbmV4dCB0aWNrLCBzaW1pbGFyIHRvIGBzZXRUaW1lb3V0YCB3aXRoIGEgdGltZW91dCBvZiBgMGAuXG4gKlxuICogU2VlIFtEYXZpZCBDb3JiYWNobydzIGFydGljbGVdKGh0dHBzOi8vY3NzLXRyaWNrcy5jb20vZGVib3VuY2luZy10aHJvdHRsaW5nLWV4cGxhaW5lZC1leGFtcGxlcy8pXG4gKiBmb3IgZGV0YWlscyBvdmVyIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGBfLmRlYm91bmNlYCBhbmQgYF8udGhyb3R0bGVgLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBjYXRlZ29yeSBGdW5jdGlvblxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXG4gKiBAcGFyYW0ge251bWJlcn0gW3dhaXQ9MF0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkuXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnM9e31dIFRoZSBvcHRpb25zIG9iamVjdC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz1mYWxzZV1cbiAqICBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSBsZWFkaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMubWF4V2FpdF1cbiAqICBUaGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlIGRlbGF5ZWQgYmVmb3JlIGl0J3MgaW52b2tlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV1cbiAqICBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBBdm9pZCBjb3N0bHkgY2FsY3VsYXRpb25zIHdoaWxlIHRoZSB3aW5kb3cgc2l6ZSBpcyBpbiBmbHV4LlxuICogalF1ZXJ5KHdpbmRvdykub24oJ3Jlc2l6ZScsIF8uZGVib3VuY2UoY2FsY3VsYXRlTGF5b3V0LCAxNTApKTtcbiAqXG4gKiAvLyBJbnZva2UgYHNlbmRNYWlsYCB3aGVuIGNsaWNrZWQsIGRlYm91bmNpbmcgc3Vic2VxdWVudCBjYWxscy5cbiAqIGpRdWVyeShlbGVtZW50KS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcbiAqICAgJ2xlYWRpbmcnOiB0cnVlLFxuICogICAndHJhaWxpbmcnOiBmYWxzZVxuICogfSkpO1xuICpcbiAqIC8vIEVuc3VyZSBgYmF0Y2hMb2dgIGlzIGludm9rZWQgb25jZSBhZnRlciAxIHNlY29uZCBvZiBkZWJvdW5jZWQgY2FsbHMuXG4gKiB2YXIgZGVib3VuY2VkID0gXy5kZWJvdW5jZShiYXRjaExvZywgMjUwLCB7ICdtYXhXYWl0JzogMTAwMCB9KTtcbiAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcbiAqIGpRdWVyeShzb3VyY2UpLm9uKCdtZXNzYWdlJywgZGVib3VuY2VkKTtcbiAqXG4gKiAvLyBDYW5jZWwgdGhlIHRyYWlsaW5nIGRlYm91bmNlZCBpbnZvY2F0aW9uLlxuICogalF1ZXJ5KHdpbmRvdykub24oJ3BvcHN0YXRlJywgZGVib3VuY2VkLmNhbmNlbCk7XG4gKi9cbmZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgdmFyIGxhc3RBcmdzLFxuICAgICAgbGFzdFRoaXMsXG4gICAgICBtYXhXYWl0LFxuICAgICAgcmVzdWx0LFxuICAgICAgdGltZXJJZCxcbiAgICAgIGxhc3RDYWxsVGltZSxcbiAgICAgIGxhc3RJbnZva2VUaW1lID0gMCxcbiAgICAgIGxlYWRpbmcgPSBmYWxzZSxcbiAgICAgIG1heGluZyA9IGZhbHNlLFxuICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuXG4gIGlmICh0eXBlb2YgZnVuYyAhPSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGVU5DX0VSUk9SX1RFWFQpO1xuICB9XG4gIHdhaXQgPSB0b051bWJlcih3YWl0KSB8fCAwO1xuICBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcbiAgICBsZWFkaW5nID0gISFvcHRpb25zLmxlYWRpbmc7XG4gICAgbWF4aW5nID0gJ21heFdhaXQnIGluIG9wdGlvbnM7XG4gICAgbWF4V2FpdCA9IG1heGluZyA/IG5hdGl2ZU1heCh0b051bWJlcihvcHRpb25zLm1heFdhaXQpIHx8IDAsIHdhaXQpIDogbWF4V2FpdDtcbiAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/ICEhb3B0aW9ucy50cmFpbGluZyA6IHRyYWlsaW5nO1xuICB9XG5cbiAgZnVuY3Rpb24gaW52b2tlRnVuYyh0aW1lKSB7XG4gICAgdmFyIGFyZ3MgPSBsYXN0QXJncyxcbiAgICAgICAgdGhpc0FyZyA9IGxhc3RUaGlzO1xuXG4gICAgbGFzdEFyZ3MgPSBsYXN0VGhpcyA9IHVuZGVmaW5lZDtcbiAgICBsYXN0SW52b2tlVGltZSA9IHRpbWU7XG4gICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gbGVhZGluZ0VkZ2UodGltZSkge1xuICAgIC8vIFJlc2V0IGFueSBgbWF4V2FpdGAgdGltZXIuXG4gICAgbGFzdEludm9rZVRpbWUgPSB0aW1lO1xuICAgIC8vIFN0YXJ0IHRoZSB0aW1lciBmb3IgdGhlIHRyYWlsaW5nIGVkZ2UuXG4gICAgdGltZXJJZCA9IHNldFRpbWVvdXQodGltZXJFeHBpcmVkLCB3YWl0KTtcbiAgICAvLyBJbnZva2UgdGhlIGxlYWRpbmcgZWRnZS5cbiAgICByZXR1cm4gbGVhZGluZyA/IGludm9rZUZ1bmModGltZSkgOiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiByZW1haW5pbmdXYWl0KHRpbWUpIHtcbiAgICB2YXIgdGltZVNpbmNlTGFzdENhbGwgPSB0aW1lIC0gbGFzdENhbGxUaW1lLFxuICAgICAgICB0aW1lU2luY2VMYXN0SW52b2tlID0gdGltZSAtIGxhc3RJbnZva2VUaW1lLFxuICAgICAgICByZXN1bHQgPSB3YWl0IC0gdGltZVNpbmNlTGFzdENhbGw7XG5cbiAgICByZXR1cm4gbWF4aW5nID8gbmF0aXZlTWluKHJlc3VsdCwgbWF4V2FpdCAtIHRpbWVTaW5jZUxhc3RJbnZva2UpIDogcmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvdWxkSW52b2tlKHRpbWUpIHtcbiAgICB2YXIgdGltZVNpbmNlTGFzdENhbGwgPSB0aW1lIC0gbGFzdENhbGxUaW1lLFxuICAgICAgICB0aW1lU2luY2VMYXN0SW52b2tlID0gdGltZSAtIGxhc3RJbnZva2VUaW1lO1xuXG4gICAgLy8gRWl0aGVyIHRoaXMgaXMgdGhlIGZpcnN0IGNhbGwsIGFjdGl2aXR5IGhhcyBzdG9wcGVkIGFuZCB3ZSdyZSBhdCB0aGVcbiAgICAvLyB0cmFpbGluZyBlZGdlLCB0aGUgc3lzdGVtIHRpbWUgaGFzIGdvbmUgYmFja3dhcmRzIGFuZCB3ZSdyZSB0cmVhdGluZ1xuICAgIC8vIGl0IGFzIHRoZSB0cmFpbGluZyBlZGdlLCBvciB3ZSd2ZSBoaXQgdGhlIGBtYXhXYWl0YCBsaW1pdC5cbiAgICByZXR1cm4gKGxhc3RDYWxsVGltZSA9PT0gdW5kZWZpbmVkIHx8ICh0aW1lU2luY2VMYXN0Q2FsbCA+PSB3YWl0KSB8fFxuICAgICAgKHRpbWVTaW5jZUxhc3RDYWxsIDwgMCkgfHwgKG1heGluZyAmJiB0aW1lU2luY2VMYXN0SW52b2tlID49IG1heFdhaXQpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRpbWVyRXhwaXJlZCgpIHtcbiAgICB2YXIgdGltZSA9IG5vdygpO1xuICAgIGlmIChzaG91bGRJbnZva2UodGltZSkpIHtcbiAgICAgIHJldHVybiB0cmFpbGluZ0VkZ2UodGltZSk7XG4gICAgfVxuICAgIC8vIFJlc3RhcnQgdGhlIHRpbWVyLlxuICAgIHRpbWVySWQgPSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgcmVtYWluaW5nV2FpdCh0aW1lKSk7XG4gIH1cblxuICBmdW5jdGlvbiB0cmFpbGluZ0VkZ2UodGltZSkge1xuICAgIHRpbWVySWQgPSB1bmRlZmluZWQ7XG5cbiAgICAvLyBPbmx5IGludm9rZSBpZiB3ZSBoYXZlIGBsYXN0QXJnc2Agd2hpY2ggbWVhbnMgYGZ1bmNgIGhhcyBiZWVuXG4gICAgLy8gZGVib3VuY2VkIGF0IGxlYXN0IG9uY2UuXG4gICAgaWYgKHRyYWlsaW5nICYmIGxhc3RBcmdzKSB7XG4gICAgICByZXR1cm4gaW52b2tlRnVuYyh0aW1lKTtcbiAgICB9XG4gICAgbGFzdEFyZ3MgPSBsYXN0VGhpcyA9IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gY2FuY2VsKCkge1xuICAgIGlmICh0aW1lcklkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lcklkKTtcbiAgICB9XG4gICAgbGFzdEludm9rZVRpbWUgPSAwO1xuICAgIGxhc3RBcmdzID0gbGFzdENhbGxUaW1lID0gbGFzdFRoaXMgPSB0aW1lcklkID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgZnVuY3Rpb24gZmx1c2goKSB7XG4gICAgcmV0dXJuIHRpbWVySWQgPT09IHVuZGVmaW5lZCA/IHJlc3VsdCA6IHRyYWlsaW5nRWRnZShub3coKSk7XG4gIH1cblxuICBmdW5jdGlvbiBkZWJvdW5jZWQoKSB7XG4gICAgdmFyIHRpbWUgPSBub3coKSxcbiAgICAgICAgaXNJbnZva2luZyA9IHNob3VsZEludm9rZSh0aW1lKTtcblxuICAgIGxhc3RBcmdzID0gYXJndW1lbnRzO1xuICAgIGxhc3RUaGlzID0gdGhpcztcbiAgICBsYXN0Q2FsbFRpbWUgPSB0aW1lO1xuXG4gICAgaWYgKGlzSW52b2tpbmcpIHtcbiAgICAgIGlmICh0aW1lcklkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIGxlYWRpbmdFZGdlKGxhc3RDYWxsVGltZSk7XG4gICAgICB9XG4gICAgICBpZiAobWF4aW5nKSB7XG4gICAgICAgIC8vIEhhbmRsZSBpbnZvY2F0aW9ucyBpbiBhIHRpZ2h0IGxvb3AuXG4gICAgICAgIHRpbWVySWQgPSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgd2FpdCk7XG4gICAgICAgIHJldHVybiBpbnZva2VGdW5jKGxhc3RDYWxsVGltZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aW1lcklkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRpbWVySWQgPSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgd2FpdCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgZGVib3VuY2VkLmNhbmNlbCA9IGNhbmNlbDtcbiAgZGVib3VuY2VkLmZsdXNoID0gZmx1c2g7XG4gIHJldHVybiBkZWJvdW5jZWQ7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIHRocm90dGxlZCBmdW5jdGlvbiB0aGF0IG9ubHkgaW52b2tlcyBgZnVuY2AgYXQgbW9zdCBvbmNlIHBlclxuICogZXZlcnkgYHdhaXRgIG1pbGxpc2Vjb25kcy4gVGhlIHRocm90dGxlZCBmdW5jdGlvbiBjb21lcyB3aXRoIGEgYGNhbmNlbGBcbiAqIG1ldGhvZCB0byBjYW5jZWwgZGVsYXllZCBgZnVuY2AgaW52b2NhdGlvbnMgYW5kIGEgYGZsdXNoYCBtZXRob2QgdG9cbiAqIGltbWVkaWF0ZWx5IGludm9rZSB0aGVtLiBQcm92aWRlIGBvcHRpb25zYCB0byBpbmRpY2F0ZSB3aGV0aGVyIGBmdW5jYFxuICogc2hvdWxkIGJlIGludm9rZWQgb24gdGhlIGxlYWRpbmcgYW5kL29yIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIGB3YWl0YFxuICogdGltZW91dC4gVGhlIGBmdW5jYCBpcyBpbnZva2VkIHdpdGggdGhlIGxhc3QgYXJndW1lbnRzIHByb3ZpZGVkIHRvIHRoZVxuICogdGhyb3R0bGVkIGZ1bmN0aW9uLiBTdWJzZXF1ZW50IGNhbGxzIHRvIHRoZSB0aHJvdHRsZWQgZnVuY3Rpb24gcmV0dXJuIHRoZVxuICogcmVzdWx0IG9mIHRoZSBsYXN0IGBmdW5jYCBpbnZvY2F0aW9uLlxuICpcbiAqICoqTm90ZToqKiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgLCBgZnVuY2AgaXNcbiAqIGludm9rZWQgb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgdGhyb3R0bGVkIGZ1bmN0aW9uXG4gKiBpcyBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXG4gKlxuICogSWYgYHdhaXRgIGlzIGAwYCBhbmQgYGxlYWRpbmdgIGlzIGBmYWxzZWAsIGBmdW5jYCBpbnZvY2F0aW9uIGlzIGRlZmVycmVkXG4gKiB1bnRpbCB0byB0aGUgbmV4dCB0aWNrLCBzaW1pbGFyIHRvIGBzZXRUaW1lb3V0YCB3aXRoIGEgdGltZW91dCBvZiBgMGAuXG4gKlxuICogU2VlIFtEYXZpZCBDb3JiYWNobydzIGFydGljbGVdKGh0dHBzOi8vY3NzLXRyaWNrcy5jb20vZGVib3VuY2luZy10aHJvdHRsaW5nLWV4cGxhaW5lZC1leGFtcGxlcy8pXG4gKiBmb3IgZGV0YWlscyBvdmVyIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGBfLnRocm90dGxlYCBhbmQgYF8uZGVib3VuY2VgLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBjYXRlZ29yeSBGdW5jdGlvblxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gdGhyb3R0bGUuXG4gKiBAcGFyYW0ge251bWJlcn0gW3dhaXQ9MF0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gdGhyb3R0bGUgaW52b2NhdGlvbnMgdG8uXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnM9e31dIFRoZSBvcHRpb25zIG9iamVjdC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz10cnVlXVxuICogIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIGxlYWRpbmcgZWRnZSBvZiB0aGUgdGltZW91dC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV1cbiAqICBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgdGhyb3R0bGVkIGZ1bmN0aW9uLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBBdm9pZCBleGNlc3NpdmVseSB1cGRhdGluZyB0aGUgcG9zaXRpb24gd2hpbGUgc2Nyb2xsaW5nLlxuICogalF1ZXJ5KHdpbmRvdykub24oJ3Njcm9sbCcsIF8udGhyb3R0bGUodXBkYXRlUG9zaXRpb24sIDEwMCkpO1xuICpcbiAqIC8vIEludm9rZSBgcmVuZXdUb2tlbmAgd2hlbiB0aGUgY2xpY2sgZXZlbnQgaXMgZmlyZWQsIGJ1dCBub3QgbW9yZSB0aGFuIG9uY2UgZXZlcnkgNSBtaW51dGVzLlxuICogdmFyIHRocm90dGxlZCA9IF8udGhyb3R0bGUocmVuZXdUb2tlbiwgMzAwMDAwLCB7ICd0cmFpbGluZyc6IGZhbHNlIH0pO1xuICogalF1ZXJ5KGVsZW1lbnQpLm9uKCdjbGljaycsIHRocm90dGxlZCk7XG4gKlxuICogLy8gQ2FuY2VsIHRoZSB0cmFpbGluZyB0aHJvdHRsZWQgaW52b2NhdGlvbi5cbiAqIGpRdWVyeSh3aW5kb3cpLm9uKCdwb3BzdGF0ZScsIHRocm90dGxlZC5jYW5jZWwpO1xuICovXG5mdW5jdGlvbiB0aHJvdHRsZShmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gIHZhciBsZWFkaW5nID0gdHJ1ZSxcbiAgICAgIHRyYWlsaW5nID0gdHJ1ZTtcblxuICBpZiAodHlwZW9mIGZ1bmMgIT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoRlVOQ19FUlJPUl9URVhUKTtcbiAgfVxuICBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcbiAgICBsZWFkaW5nID0gJ2xlYWRpbmcnIGluIG9wdGlvbnMgPyAhIW9wdGlvbnMubGVhZGluZyA6IGxlYWRpbmc7XG4gICAgdHJhaWxpbmcgPSAndHJhaWxpbmcnIGluIG9wdGlvbnMgPyAhIW9wdGlvbnMudHJhaWxpbmcgOiB0cmFpbGluZztcbiAgfVxuICByZXR1cm4gZGVib3VuY2UoZnVuYywgd2FpdCwge1xuICAgICdsZWFkaW5nJzogbGVhZGluZyxcbiAgICAnbWF4V2FpdCc6IHdhaXQsXG4gICAgJ3RyYWlsaW5nJzogdHJhaWxpbmdcbiAgfSk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlXG4gKiBbbGFuZ3VhZ2UgdHlwZV0oaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzcuMC8jc2VjLWVjbWFzY3JpcHQtbGFuZ3VhZ2UtdHlwZXMpXG4gKiBvZiBgT2JqZWN0YC4gKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAwLjEuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3Qoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KF8ubm9vcCk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdChudWxsKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xuICByZXR1cm4gISF2YWx1ZSAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLiBBIHZhbHVlIGlzIG9iamVjdC1saWtlIGlmIGl0J3Mgbm90IGBudWxsYFxuICogYW5kIGhhcyBhIGB0eXBlb2ZgIHJlc3VsdCBvZiBcIm9iamVjdFwiLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4wLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0TGlrZShbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKF8ubm9vcCk7XG4gKiAvLyA9PiBmYWxzZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKG51bGwpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3RMaWtlKHZhbHVlKSB7XG4gIHJldHVybiAhIXZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0Jztcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGEgYFN5bWJvbGAgcHJpbWl0aXZlIG9yIG9iamVjdC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDQuMC4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIHN5bWJvbCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzU3ltYm9sKFN5bWJvbC5pdGVyYXRvcik7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc1N5bWJvbCgnYWJjJyk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc1N5bWJvbCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICdzeW1ib2wnIHx8XG4gICAgKGlzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgb2JqZWN0VG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT0gc3ltYm9sVGFnKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBgdmFsdWVgIHRvIGEgbnVtYmVyLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4wLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBwcm9jZXNzLlxuICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgbnVtYmVyLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLnRvTnVtYmVyKDMuMik7XG4gKiAvLyA9PiAzLjJcbiAqXG4gKiBfLnRvTnVtYmVyKE51bWJlci5NSU5fVkFMVUUpO1xuICogLy8gPT4gNWUtMzI0XG4gKlxuICogXy50b051bWJlcihJbmZpbml0eSk7XG4gKiAvLyA9PiBJbmZpbml0eVxuICpcbiAqIF8udG9OdW1iZXIoJzMuMicpO1xuICogLy8gPT4gMy4yXG4gKi9cbmZ1bmN0aW9uIHRvTnVtYmVyKHZhbHVlKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgaWYgKGlzU3ltYm9sKHZhbHVlKSkge1xuICAgIHJldHVybiBOQU47XG4gIH1cbiAgaWYgKGlzT2JqZWN0KHZhbHVlKSkge1xuICAgIHZhciBvdGhlciA9IHR5cGVvZiB2YWx1ZS52YWx1ZU9mID09ICdmdW5jdGlvbicgPyB2YWx1ZS52YWx1ZU9mKCkgOiB2YWx1ZTtcbiAgICB2YWx1ZSA9IGlzT2JqZWN0KG90aGVyKSA/IChvdGhlciArICcnKSA6IG90aGVyO1xuICB9XG4gIGlmICh0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gdmFsdWUgPT09IDAgPyB2YWx1ZSA6ICt2YWx1ZTtcbiAgfVxuICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UocmVUcmltLCAnJyk7XG4gIHZhciBpc0JpbmFyeSA9IHJlSXNCaW5hcnkudGVzdCh2YWx1ZSk7XG4gIHJldHVybiAoaXNCaW5hcnkgfHwgcmVJc09jdGFsLnRlc3QodmFsdWUpKVxuICAgID8gZnJlZVBhcnNlSW50KHZhbHVlLnNsaWNlKDIpLCBpc0JpbmFyeSA/IDIgOiA4KVxuICAgIDogKHJlSXNCYWRIZXgudGVzdCh2YWx1ZSkgPyBOQU4gOiArdmFsdWUpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRocm90dGxlO1xuIiwidmFyIHdpbGRjYXJkID0gcmVxdWlyZSgnd2lsZGNhcmQnKTtcbnZhciByZU1pbWVQYXJ0U3BsaXQgPSAvW1xcL1xcK1xcLl0vO1xuXG4vKipcbiAgIyBtaW1lLW1hdGNoXG5cbiAgQSBzaW1wbGUgZnVuY3Rpb24gdG8gY2hlY2tlciB3aGV0aGVyIGEgdGFyZ2V0IG1pbWUgdHlwZSBtYXRjaGVzIGEgbWltZS10eXBlXG4gIHBhdHRlcm4gKGUuZy4gaW1hZ2UvanBlZyBtYXRjaGVzIGltYWdlL2pwZWcgT1IgaW1hZ2UvKikuXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIDw8PCBleGFtcGxlLmpzXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQsIHBhdHRlcm4pIHtcbiAgZnVuY3Rpb24gdGVzdChwYXR0ZXJuKSB7XG4gICAgdmFyIHJlc3VsdCA9IHdpbGRjYXJkKHBhdHRlcm4sIHRhcmdldCwgcmVNaW1lUGFydFNwbGl0KTtcblxuICAgIC8vIGVuc3VyZSB0aGF0IHdlIGhhdmUgYSB2YWxpZCBtaW1lIHR5cGUgKHNob3VsZCBoYXZlIHR3byBwYXJ0cylcbiAgICByZXR1cm4gcmVzdWx0ICYmIHJlc3VsdC5sZW5ndGggPj0gMjtcbiAgfVxuXG4gIHJldHVybiBwYXR0ZXJuID8gdGVzdChwYXR0ZXJuLnNwbGl0KCc7JylbMF0pIDogdGVzdDtcbn07XG4iLCIvKipcbiogQ3JlYXRlIGFuIGV2ZW50IGVtaXR0ZXIgd2l0aCBuYW1lc3BhY2VzXG4qIEBuYW1lIGNyZWF0ZU5hbWVzcGFjZUVtaXR0ZXJcbiogQGV4YW1wbGVcbiogdmFyIGVtaXR0ZXIgPSByZXF1aXJlKCcuL2luZGV4JykoKVxuKlxuKiBlbWl0dGVyLm9uKCcqJywgZnVuY3Rpb24gKCkge1xuKiAgIGNvbnNvbGUubG9nKCdhbGwgZXZlbnRzIGVtaXR0ZWQnLCB0aGlzLmV2ZW50KVxuKiB9KVxuKlxuKiBlbWl0dGVyLm9uKCdleGFtcGxlJywgZnVuY3Rpb24gKCkge1xuKiAgIGNvbnNvbGUubG9nKCdleGFtcGxlIGV2ZW50IGVtaXR0ZWQnKVxuKiB9KVxuKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY3JlYXRlTmFtZXNwYWNlRW1pdHRlciAoKSB7XG4gIHZhciBlbWl0dGVyID0ge31cbiAgdmFyIF9mbnMgPSBlbWl0dGVyLl9mbnMgPSB7fVxuXG4gIC8qKlxuICAqIEVtaXQgYW4gZXZlbnQuIE9wdGlvbmFsbHkgbmFtZXNwYWNlIHRoZSBldmVudC4gSGFuZGxlcnMgYXJlIGZpcmVkIGluIHRoZSBvcmRlciBpbiB3aGljaCB0aGV5IHdlcmUgYWRkZWQgd2l0aCBleGFjdCBtYXRjaGVzIHRha2luZyBwcmVjZWRlbmNlLiBTZXBhcmF0ZSB0aGUgbmFtZXNwYWNlIGFuZCBldmVudCB3aXRoIGEgYDpgXG4gICogQG5hbWUgZW1pdFxuICAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCDigJMgdGhlIG5hbWUgb2YgdGhlIGV2ZW50LCB3aXRoIG9wdGlvbmFsIG5hbWVzcGFjZVxuICAqIEBwYXJhbSB7Li4uKn0gZGF0YSDigJMgdXAgdG8gNiBhcmd1bWVudHMgdGhhdCBhcmUgcGFzc2VkIHRvIHRoZSBldmVudCBsaXN0ZW5lclxuICAqIEBleGFtcGxlXG4gICogZW1pdHRlci5lbWl0KCdleGFtcGxlJylcbiAgKiBlbWl0dGVyLmVtaXQoJ2RlbW86dGVzdCcpXG4gICogZW1pdHRlci5lbWl0KCdkYXRhJywgeyBleGFtcGxlOiB0cnVlfSwgJ2Egc3RyaW5nJywgMSlcbiAgKi9cbiAgZW1pdHRlci5lbWl0ID0gZnVuY3Rpb24gZW1pdCAoZXZlbnQsIGFyZzEsIGFyZzIsIGFyZzMsIGFyZzQsIGFyZzUsIGFyZzYpIHtcbiAgICB2YXIgdG9FbWl0ID0gZ2V0TGlzdGVuZXJzKGV2ZW50KVxuXG4gICAgaWYgKHRvRW1pdC5sZW5ndGgpIHtcbiAgICAgIGVtaXRBbGwoZXZlbnQsIHRvRW1pdCwgW2FyZzEsIGFyZzIsIGFyZzMsIGFyZzQsIGFyZzUsIGFyZzZdKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAqIENyZWF0ZSBlbiBldmVudCBsaXN0ZW5lci5cbiAgKiBAbmFtZSBvblxuICAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICogQGV4YW1wbGVcbiAgKiBlbWl0dGVyLm9uKCdleGFtcGxlJywgZnVuY3Rpb24gKCkge30pXG4gICogZW1pdHRlci5vbignZGVtbycsIGZ1bmN0aW9uICgpIHt9KVxuICAqL1xuICBlbWl0dGVyLm9uID0gZnVuY3Rpb24gb24gKGV2ZW50LCBmbikge1xuICAgIGlmICghX2Zuc1tldmVudF0pIHtcbiAgICAgIF9mbnNbZXZlbnRdID0gW11cbiAgICB9XG5cbiAgICBfZm5zW2V2ZW50XS5wdXNoKGZuKVxuICB9XG5cbiAgLyoqXG4gICogQ3JlYXRlIGVuIGV2ZW50IGxpc3RlbmVyIHRoYXQgZmlyZXMgb25jZS5cbiAgKiBAbmFtZSBvbmNlXG4gICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgKiBAZXhhbXBsZVxuICAqIGVtaXR0ZXIub25jZSgnZXhhbXBsZScsIGZ1bmN0aW9uICgpIHt9KVxuICAqIGVtaXR0ZXIub25jZSgnZGVtbycsIGZ1bmN0aW9uICgpIHt9KVxuICAqL1xuICBlbWl0dGVyLm9uY2UgPSBmdW5jdGlvbiBvbmNlIChldmVudCwgZm4pIHtcbiAgICBmdW5jdGlvbiBvbmUgKCkge1xuICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgICAgZW1pdHRlci5vZmYoZXZlbnQsIG9uZSlcbiAgICB9XG4gICAgdGhpcy5vbihldmVudCwgb25lKVxuICB9XG5cbiAgLyoqXG4gICogU3RvcCBsaXN0ZW5pbmcgdG8gYW4gZXZlbnQuIFN0b3AgYWxsIGxpc3RlbmVycyBvbiBhbiBldmVudCBieSBvbmx5IHBhc3NpbmcgdGhlIGV2ZW50IG5hbWUuIFN0b3AgYSBzaW5nbGUgbGlzdGVuZXIgYnkgcGFzc2luZyB0aGF0IGV2ZW50IGhhbmRsZXIgYXMgYSBjYWxsYmFjay5cbiAgKiBZb3UgbXVzdCBiZSBleHBsaWNpdCBhYm91dCB3aGF0IHdpbGwgYmUgdW5zdWJzY3JpYmVkOiBgZW1pdHRlci5vZmYoJ2RlbW8nKWAgd2lsbCB1bnN1YnNjcmliZSBhbiBgZW1pdHRlci5vbignZGVtbycpYCBsaXN0ZW5lcixcbiAgKiBgZW1pdHRlci5vZmYoJ2RlbW86ZXhhbXBsZScpYCB3aWxsIHVuc3Vic2NyaWJlIGFuIGBlbWl0dGVyLm9uKCdkZW1vOmV4YW1wbGUnKWAgbGlzdGVuZXJcbiAgKiBAbmFtZSBvZmZcbiAgKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dIOKAkyB0aGUgc3BlY2lmaWMgaGFuZGxlclxuICAqIEBleGFtcGxlXG4gICogZW1pdHRlci5vZmYoJ2V4YW1wbGUnKVxuICAqIGVtaXR0ZXIub2ZmKCdkZW1vJywgZnVuY3Rpb24gKCkge30pXG4gICovXG4gIGVtaXR0ZXIub2ZmID0gZnVuY3Rpb24gb2ZmIChldmVudCwgZm4pIHtcbiAgICB2YXIga2VlcCA9IFtdXG5cbiAgICBpZiAoZXZlbnQgJiYgZm4pIHtcbiAgICAgIHZhciBmbnMgPSB0aGlzLl9mbnNbZXZlbnRdXG4gICAgICB2YXIgaSA9IDBcbiAgICAgIHZhciBsID0gZm5zLmxlbmd0aFxuXG4gICAgICBmb3IgKGk7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYgKGZuc1tpXSAhPT0gZm4pIHtcbiAgICAgICAgICBrZWVwLnB1c2goZm5zW2ldKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAga2VlcC5sZW5ndGggPyB0aGlzLl9mbnNbZXZlbnRdID0ga2VlcCA6IGRlbGV0ZSB0aGlzLl9mbnNbZXZlbnRdXG4gIH1cblxuICBmdW5jdGlvbiBnZXRMaXN0ZW5lcnMgKGUpIHtcbiAgICB2YXIgb3V0ID0gX2Zuc1tlXSA/IF9mbnNbZV0gOiBbXVxuICAgIHZhciBpZHggPSBlLmluZGV4T2YoJzonKVxuICAgIHZhciBhcmdzID0gKGlkeCA9PT0gLTEpID8gW2VdIDogW2Uuc3Vic3RyaW5nKDAsIGlkeCksIGUuc3Vic3RyaW5nKGlkeCArIDEpXVxuXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhfZm5zKVxuICAgIHZhciBpID0gMFxuICAgIHZhciBsID0ga2V5cy5sZW5ndGhcblxuICAgIGZvciAoaTsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIGtleSA9IGtleXNbaV1cbiAgICAgIGlmIChrZXkgPT09ICcqJykge1xuICAgICAgICBvdXQgPSBvdXQuY29uY2F0KF9mbnNba2V5XSlcbiAgICAgIH1cblxuICAgICAgaWYgKGFyZ3MubGVuZ3RoID09PSAyICYmIGFyZ3NbMF0gPT09IGtleSkge1xuICAgICAgICBvdXQgPSBvdXQuY29uY2F0KF9mbnNba2V5XSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb3V0XG4gIH1cblxuICBmdW5jdGlvbiBlbWl0QWxsIChlLCBmbnMsIGFyZ3MpIHtcbiAgICB2YXIgaSA9IDBcbiAgICB2YXIgbCA9IGZucy5sZW5ndGhcblxuICAgIGZvciAoaTsgaSA8IGw7IGkrKykge1xuICAgICAgaWYgKCFmbnNbaV0pIGJyZWFrXG4gICAgICBmbnNbaV0uZXZlbnQgPSBlXG4gICAgICBmbnNbaV0uYXBwbHkoZm5zW2ldLCBhcmdzKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBlbWl0dGVyXG59XG4iLCIhZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIGZ1bmN0aW9uIFZOb2RlKCkge31cbiAgICBmdW5jdGlvbiBoKG5vZGVOYW1lLCBhdHRyaWJ1dGVzKSB7XG4gICAgICAgIHZhciBsYXN0U2ltcGxlLCBjaGlsZCwgc2ltcGxlLCBpLCBjaGlsZHJlbiA9IEVNUFRZX0NISUxEUkVOO1xuICAgICAgICBmb3IgKGkgPSBhcmd1bWVudHMubGVuZ3RoOyBpLS0gPiAyOyApIHN0YWNrLnB1c2goYXJndW1lbnRzW2ldKTtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXMgJiYgbnVsbCAhPSBhdHRyaWJ1dGVzLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBpZiAoIXN0YWNrLmxlbmd0aCkgc3RhY2sucHVzaChhdHRyaWJ1dGVzLmNoaWxkcmVuKTtcbiAgICAgICAgICAgIGRlbGV0ZSBhdHRyaWJ1dGVzLmNoaWxkcmVuO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChzdGFjay5sZW5ndGgpIGlmICgoY2hpbGQgPSBzdGFjay5wb3AoKSkgJiYgdm9pZCAwICE9PSBjaGlsZC5wb3ApIGZvciAoaSA9IGNoaWxkLmxlbmd0aDsgaS0tOyApIHN0YWNrLnB1c2goY2hpbGRbaV0pOyBlbHNlIHtcbiAgICAgICAgICAgIGlmICgnYm9vbGVhbicgPT0gdHlwZW9mIGNoaWxkKSBjaGlsZCA9IG51bGw7XG4gICAgICAgICAgICBpZiAoc2ltcGxlID0gJ2Z1bmN0aW9uJyAhPSB0eXBlb2Ygbm9kZU5hbWUpIGlmIChudWxsID09IGNoaWxkKSBjaGlsZCA9ICcnOyBlbHNlIGlmICgnbnVtYmVyJyA9PSB0eXBlb2YgY2hpbGQpIGNoaWxkID0gU3RyaW5nKGNoaWxkKTsgZWxzZSBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIGNoaWxkKSBzaW1wbGUgPSAhMTtcbiAgICAgICAgICAgIGlmIChzaW1wbGUgJiYgbGFzdFNpbXBsZSkgY2hpbGRyZW5bY2hpbGRyZW4ubGVuZ3RoIC0gMV0gKz0gY2hpbGQ7IGVsc2UgaWYgKGNoaWxkcmVuID09PSBFTVBUWV9DSElMRFJFTikgY2hpbGRyZW4gPSBbIGNoaWxkIF07IGVsc2UgY2hpbGRyZW4ucHVzaChjaGlsZCk7XG4gICAgICAgICAgICBsYXN0U2ltcGxlID0gc2ltcGxlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwID0gbmV3IFZOb2RlKCk7XG4gICAgICAgIHAubm9kZU5hbWUgPSBub2RlTmFtZTtcbiAgICAgICAgcC5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuICAgICAgICBwLmF0dHJpYnV0ZXMgPSBudWxsID09IGF0dHJpYnV0ZXMgPyB2b2lkIDAgOiBhdHRyaWJ1dGVzO1xuICAgICAgICBwLmtleSA9IG51bGwgPT0gYXR0cmlidXRlcyA/IHZvaWQgMCA6IGF0dHJpYnV0ZXMua2V5O1xuICAgICAgICBpZiAodm9pZCAwICE9PSBvcHRpb25zLnZub2RlKSBvcHRpb25zLnZub2RlKHApO1xuICAgICAgICByZXR1cm4gcDtcbiAgICB9XG4gICAgZnVuY3Rpb24gZXh0ZW5kKG9iaiwgcHJvcHMpIHtcbiAgICAgICAgZm9yICh2YXIgaSBpbiBwcm9wcykgb2JqW2ldID0gcHJvcHNbaV07XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNsb25lRWxlbWVudCh2bm9kZSwgcHJvcHMpIHtcbiAgICAgICAgcmV0dXJuIGgodm5vZGUubm9kZU5hbWUsIGV4dGVuZChleHRlbmQoe30sIHZub2RlLmF0dHJpYnV0ZXMpLCBwcm9wcyksIGFyZ3VtZW50cy5sZW5ndGggPiAyID8gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpIDogdm5vZGUuY2hpbGRyZW4pO1xuICAgIH1cbiAgICBmdW5jdGlvbiBlbnF1ZXVlUmVuZGVyKGNvbXBvbmVudCkge1xuICAgICAgICBpZiAoIWNvbXBvbmVudC5fX2QgJiYgKGNvbXBvbmVudC5fX2QgPSAhMCkgJiYgMSA9PSBpdGVtcy5wdXNoKGNvbXBvbmVudCkpIChvcHRpb25zLmRlYm91bmNlUmVuZGVyaW5nIHx8IGRlZmVyKShyZXJlbmRlcik7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlcmVuZGVyKCkge1xuICAgICAgICB2YXIgcCwgbGlzdCA9IGl0ZW1zO1xuICAgICAgICBpdGVtcyA9IFtdO1xuICAgICAgICB3aGlsZSAocCA9IGxpc3QucG9wKCkpIGlmIChwLl9fZCkgcmVuZGVyQ29tcG9uZW50KHApO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpc1NhbWVOb2RlVHlwZShub2RlLCB2bm9kZSwgaHlkcmF0aW5nKSB7XG4gICAgICAgIGlmICgnc3RyaW5nJyA9PSB0eXBlb2Ygdm5vZGUgfHwgJ251bWJlcicgPT0gdHlwZW9mIHZub2RlKSByZXR1cm4gdm9pZCAwICE9PSBub2RlLnNwbGl0VGV4dDtcbiAgICAgICAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiB2bm9kZS5ub2RlTmFtZSkgcmV0dXJuICFub2RlLl9jb21wb25lbnRDb25zdHJ1Y3RvciAmJiBpc05hbWVkTm9kZShub2RlLCB2bm9kZS5ub2RlTmFtZSk7IGVsc2UgcmV0dXJuIGh5ZHJhdGluZyB8fCBub2RlLl9jb21wb25lbnRDb25zdHJ1Y3RvciA9PT0gdm5vZGUubm9kZU5hbWU7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlzTmFtZWROb2RlKG5vZGUsIG5vZGVOYW1lKSB7XG4gICAgICAgIHJldHVybiBub2RlLl9fbiA9PT0gbm9kZU5hbWUgfHwgbm9kZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXROb2RlUHJvcHModm5vZGUpIHtcbiAgICAgICAgdmFyIHByb3BzID0gZXh0ZW5kKHt9LCB2bm9kZS5hdHRyaWJ1dGVzKTtcbiAgICAgICAgcHJvcHMuY2hpbGRyZW4gPSB2bm9kZS5jaGlsZHJlbjtcbiAgICAgICAgdmFyIGRlZmF1bHRQcm9wcyA9IHZub2RlLm5vZGVOYW1lLmRlZmF1bHRQcm9wcztcbiAgICAgICAgaWYgKHZvaWQgMCAhPT0gZGVmYXVsdFByb3BzKSBmb3IgKHZhciBpIGluIGRlZmF1bHRQcm9wcykgaWYgKHZvaWQgMCA9PT0gcHJvcHNbaV0pIHByb3BzW2ldID0gZGVmYXVsdFByb3BzW2ldO1xuICAgICAgICByZXR1cm4gcHJvcHM7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNyZWF0ZU5vZGUobm9kZU5hbWUsIGlzU3ZnKSB7XG4gICAgICAgIHZhciBub2RlID0gaXNTdmcgPyBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgbm9kZU5hbWUpIDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudChub2RlTmFtZSk7XG4gICAgICAgIG5vZGUuX19uID0gbm9kZU5hbWU7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgICBmdW5jdGlvbiByZW1vdmVOb2RlKG5vZGUpIHtcbiAgICAgICAgdmFyIHBhcmVudE5vZGUgPSBub2RlLnBhcmVudE5vZGU7XG4gICAgICAgIGlmIChwYXJlbnROb2RlKSBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzZXRBY2Nlc3Nvcihub2RlLCBuYW1lLCBvbGQsIHZhbHVlLCBpc1N2Zykge1xuICAgICAgICBpZiAoJ2NsYXNzTmFtZScgPT09IG5hbWUpIG5hbWUgPSAnY2xhc3MnO1xuICAgICAgICBpZiAoJ2tleScgPT09IG5hbWUpIDsgZWxzZSBpZiAoJ3JlZicgPT09IG5hbWUpIHtcbiAgICAgICAgICAgIGlmIChvbGQpIG9sZChudWxsKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZSkgdmFsdWUobm9kZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoJ2NsYXNzJyA9PT0gbmFtZSAmJiAhaXNTdmcpIG5vZGUuY2xhc3NOYW1lID0gdmFsdWUgfHwgJyc7IGVsc2UgaWYgKCdzdHlsZScgPT09IG5hbWUpIHtcbiAgICAgICAgICAgIGlmICghdmFsdWUgfHwgJ3N0cmluZycgPT0gdHlwZW9mIHZhbHVlIHx8ICdzdHJpbmcnID09IHR5cGVvZiBvbGQpIG5vZGUuc3R5bGUuY3NzVGV4dCA9IHZhbHVlIHx8ICcnO1xuICAgICAgICAgICAgaWYgKHZhbHVlICYmICdvYmplY3QnID09IHR5cGVvZiB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmICgnc3RyaW5nJyAhPSB0eXBlb2Ygb2xkKSBmb3IgKHZhciBpIGluIG9sZCkgaWYgKCEoaSBpbiB2YWx1ZSkpIG5vZGUuc3R5bGVbaV0gPSAnJztcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIHZhbHVlKSBub2RlLnN0eWxlW2ldID0gJ251bWJlcicgPT0gdHlwZW9mIHZhbHVlW2ldICYmICExID09PSBJU19OT05fRElNRU5TSU9OQUwudGVzdChpKSA/IHZhbHVlW2ldICsgJ3B4JyA6IHZhbHVlW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCdkYW5nZXJvdXNseVNldElubmVySFRNTCcgPT09IG5hbWUpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSkgbm9kZS5pbm5lckhUTUwgPSB2YWx1ZS5fX2h0bWwgfHwgJyc7XG4gICAgICAgIH0gZWxzZSBpZiAoJ28nID09IG5hbWVbMF0gJiYgJ24nID09IG5hbWVbMV0pIHtcbiAgICAgICAgICAgIHZhciB1c2VDYXB0dXJlID0gbmFtZSAhPT0gKG5hbWUgPSBuYW1lLnJlcGxhY2UoL0NhcHR1cmUkLywgJycpKTtcbiAgICAgICAgICAgIG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCkuc3Vic3RyaW5nKDIpO1xuICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFvbGQpIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBldmVudFByb3h5LCB1c2VDYXB0dXJlKTtcbiAgICAgICAgICAgIH0gZWxzZSBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgZXZlbnRQcm94eSwgdXNlQ2FwdHVyZSk7XG4gICAgICAgICAgICAobm9kZS5fX2wgfHwgKG5vZGUuX19sID0ge30pKVtuYW1lXSA9IHZhbHVlO1xuICAgICAgICB9IGVsc2UgaWYgKCdsaXN0JyAhPT0gbmFtZSAmJiAndHlwZScgIT09IG5hbWUgJiYgIWlzU3ZnICYmIG5hbWUgaW4gbm9kZSkge1xuICAgICAgICAgICAgc2V0UHJvcGVydHkobm9kZSwgbmFtZSwgbnVsbCA9PSB2YWx1ZSA/ICcnIDogdmFsdWUpO1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gdmFsdWUgfHwgITEgPT09IHZhbHVlKSBub2RlLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBucyA9IGlzU3ZnICYmIG5hbWUgIT09IChuYW1lID0gbmFtZS5yZXBsYWNlKC9eeGxpbmtcXDo/LywgJycpKTtcbiAgICAgICAgICAgIGlmIChudWxsID09IHZhbHVlIHx8ICExID09PSB2YWx1ZSkgaWYgKG5zKSBub2RlLnJlbW92ZUF0dHJpYnV0ZU5TKCdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJywgbmFtZS50b0xvd2VyQ2FzZSgpKTsgZWxzZSBub2RlLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTsgZWxzZSBpZiAoJ2Z1bmN0aW9uJyAhPSB0eXBlb2YgdmFsdWUpIGlmIChucykgbm9kZS5zZXRBdHRyaWJ1dGVOUygnaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluaycsIG5hbWUudG9Mb3dlckNhc2UoKSwgdmFsdWUpOyBlbHNlIG5vZGUuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBzZXRQcm9wZXJ0eShub2RlLCBuYW1lLCB2YWx1ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbm9kZVtuYW1lXSA9IHZhbHVlO1xuICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgIH1cbiAgICBmdW5jdGlvbiBldmVudFByb3h5KGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX19sW2UudHlwZV0ob3B0aW9ucy5ldmVudCAmJiBvcHRpb25zLmV2ZW50KGUpIHx8IGUpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBmbHVzaE1vdW50cygpIHtcbiAgICAgICAgdmFyIGM7XG4gICAgICAgIHdoaWxlIChjID0gbW91bnRzLnBvcCgpKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5hZnRlck1vdW50KSBvcHRpb25zLmFmdGVyTW91bnQoYyk7XG4gICAgICAgICAgICBpZiAoYy5jb21wb25lbnREaWRNb3VudCkgYy5jb21wb25lbnREaWRNb3VudCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGRpZmYoZG9tLCB2bm9kZSwgY29udGV4dCwgbW91bnRBbGwsIHBhcmVudCwgY29tcG9uZW50Um9vdCkge1xuICAgICAgICBpZiAoIWRpZmZMZXZlbCsrKSB7XG4gICAgICAgICAgICBpc1N2Z01vZGUgPSBudWxsICE9IHBhcmVudCAmJiB2b2lkIDAgIT09IHBhcmVudC5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgICAgICBoeWRyYXRpbmcgPSBudWxsICE9IGRvbSAmJiAhKCdfX3ByZWFjdGF0dHJfJyBpbiBkb20pO1xuICAgICAgICB9XG4gICAgICAgIHZhciByZXQgPSBpZGlmZihkb20sIHZub2RlLCBjb250ZXh0LCBtb3VudEFsbCwgY29tcG9uZW50Um9vdCk7XG4gICAgICAgIGlmIChwYXJlbnQgJiYgcmV0LnBhcmVudE5vZGUgIT09IHBhcmVudCkgcGFyZW50LmFwcGVuZENoaWxkKHJldCk7XG4gICAgICAgIGlmICghLS1kaWZmTGV2ZWwpIHtcbiAgICAgICAgICAgIGh5ZHJhdGluZyA9ICExO1xuICAgICAgICAgICAgaWYgKCFjb21wb25lbnRSb290KSBmbHVzaE1vdW50cygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlkaWZmKGRvbSwgdm5vZGUsIGNvbnRleHQsIG1vdW50QWxsLCBjb21wb25lbnRSb290KSB7XG4gICAgICAgIHZhciBvdXQgPSBkb20sIHByZXZTdmdNb2RlID0gaXNTdmdNb2RlO1xuICAgICAgICBpZiAobnVsbCA9PSB2bm9kZSB8fCAnYm9vbGVhbicgPT0gdHlwZW9mIHZub2RlKSB2bm9kZSA9ICcnO1xuICAgICAgICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHZub2RlIHx8ICdudW1iZXInID09IHR5cGVvZiB2bm9kZSkge1xuICAgICAgICAgICAgaWYgKGRvbSAmJiB2b2lkIDAgIT09IGRvbS5zcGxpdFRleHQgJiYgZG9tLnBhcmVudE5vZGUgJiYgKCFkb20uX2NvbXBvbmVudCB8fCBjb21wb25lbnRSb290KSkge1xuICAgICAgICAgICAgICAgIGlmIChkb20ubm9kZVZhbHVlICE9IHZub2RlKSBkb20ubm9kZVZhbHVlID0gdm5vZGU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHZub2RlKTtcbiAgICAgICAgICAgICAgICBpZiAoZG9tKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkb20ucGFyZW50Tm9kZSkgZG9tLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG91dCwgZG9tKTtcbiAgICAgICAgICAgICAgICAgICAgcmVjb2xsZWN0Tm9kZVRyZWUoZG9tLCAhMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0Ll9fcHJlYWN0YXR0cl8gPSAhMDtcbiAgICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHZub2RlTmFtZSA9IHZub2RlLm5vZGVOYW1lO1xuICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygdm5vZGVOYW1lKSByZXR1cm4gYnVpbGRDb21wb25lbnRGcm9tVk5vZGUoZG9tLCB2bm9kZSwgY29udGV4dCwgbW91bnRBbGwpO1xuICAgICAgICBpc1N2Z01vZGUgPSAnc3ZnJyA9PT0gdm5vZGVOYW1lID8gITAgOiAnZm9yZWlnbk9iamVjdCcgPT09IHZub2RlTmFtZSA/ICExIDogaXNTdmdNb2RlO1xuICAgICAgICB2bm9kZU5hbWUgPSBTdHJpbmcodm5vZGVOYW1lKTtcbiAgICAgICAgaWYgKCFkb20gfHwgIWlzTmFtZWROb2RlKGRvbSwgdm5vZGVOYW1lKSkge1xuICAgICAgICAgICAgb3V0ID0gY3JlYXRlTm9kZSh2bm9kZU5hbWUsIGlzU3ZnTW9kZSk7XG4gICAgICAgICAgICBpZiAoZG9tKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGRvbS5maXJzdENoaWxkKSBvdXQuYXBwZW5kQ2hpbGQoZG9tLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIGlmIChkb20ucGFyZW50Tm9kZSkgZG9tLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG91dCwgZG9tKTtcbiAgICAgICAgICAgICAgICByZWNvbGxlY3ROb2RlVHJlZShkb20sICEwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgZmMgPSBvdXQuZmlyc3RDaGlsZCwgcHJvcHMgPSBvdXQuX19wcmVhY3RhdHRyXywgdmNoaWxkcmVuID0gdm5vZGUuY2hpbGRyZW47XG4gICAgICAgIGlmIChudWxsID09IHByb3BzKSB7XG4gICAgICAgICAgICBwcm9wcyA9IG91dC5fX3ByZWFjdGF0dHJfID0ge307XG4gICAgICAgICAgICBmb3IgKHZhciBhID0gb3V0LmF0dHJpYnV0ZXMsIGkgPSBhLmxlbmd0aDsgaS0tOyApIHByb3BzW2FbaV0ubmFtZV0gPSBhW2ldLnZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGlmICghaHlkcmF0aW5nICYmIHZjaGlsZHJlbiAmJiAxID09PSB2Y2hpbGRyZW4ubGVuZ3RoICYmICdzdHJpbmcnID09IHR5cGVvZiB2Y2hpbGRyZW5bMF0gJiYgbnVsbCAhPSBmYyAmJiB2b2lkIDAgIT09IGZjLnNwbGl0VGV4dCAmJiBudWxsID09IGZjLm5leHRTaWJsaW5nKSB7XG4gICAgICAgICAgICBpZiAoZmMubm9kZVZhbHVlICE9IHZjaGlsZHJlblswXSkgZmMubm9kZVZhbHVlID0gdmNoaWxkcmVuWzBdO1xuICAgICAgICB9IGVsc2UgaWYgKHZjaGlsZHJlbiAmJiB2Y2hpbGRyZW4ubGVuZ3RoIHx8IG51bGwgIT0gZmMpIGlubmVyRGlmZk5vZGUob3V0LCB2Y2hpbGRyZW4sIGNvbnRleHQsIG1vdW50QWxsLCBoeWRyYXRpbmcgfHwgbnVsbCAhPSBwcm9wcy5kYW5nZXJvdXNseVNldElubmVySFRNTCk7XG4gICAgICAgIGRpZmZBdHRyaWJ1dGVzKG91dCwgdm5vZGUuYXR0cmlidXRlcywgcHJvcHMpO1xuICAgICAgICBpc1N2Z01vZGUgPSBwcmV2U3ZnTW9kZTtcbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9XG4gICAgZnVuY3Rpb24gaW5uZXJEaWZmTm9kZShkb20sIHZjaGlsZHJlbiwgY29udGV4dCwgbW91bnRBbGwsIGlzSHlkcmF0aW5nKSB7XG4gICAgICAgIHZhciBqLCBjLCBmLCB2Y2hpbGQsIGNoaWxkLCBvcmlnaW5hbENoaWxkcmVuID0gZG9tLmNoaWxkTm9kZXMsIGNoaWxkcmVuID0gW10sIGtleWVkID0ge30sIGtleWVkTGVuID0gMCwgbWluID0gMCwgbGVuID0gb3JpZ2luYWxDaGlsZHJlbi5sZW5ndGgsIGNoaWxkcmVuTGVuID0gMCwgdmxlbiA9IHZjaGlsZHJlbiA/IHZjaGlsZHJlbi5sZW5ndGggOiAwO1xuICAgICAgICBpZiAoMCAhPT0gbGVuKSBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgX2NoaWxkID0gb3JpZ2luYWxDaGlsZHJlbltpXSwgcHJvcHMgPSBfY2hpbGQuX19wcmVhY3RhdHRyXywga2V5ID0gdmxlbiAmJiBwcm9wcyA/IF9jaGlsZC5fY29tcG9uZW50ID8gX2NoaWxkLl9jb21wb25lbnQuX19rIDogcHJvcHMua2V5IDogbnVsbDtcbiAgICAgICAgICAgIGlmIChudWxsICE9IGtleSkge1xuICAgICAgICAgICAgICAgIGtleWVkTGVuKys7XG4gICAgICAgICAgICAgICAga2V5ZWRba2V5XSA9IF9jaGlsZDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcHMgfHwgKHZvaWQgMCAhPT0gX2NoaWxkLnNwbGl0VGV4dCA/IGlzSHlkcmF0aW5nID8gX2NoaWxkLm5vZGVWYWx1ZS50cmltKCkgOiAhMCA6IGlzSHlkcmF0aW5nKSkgY2hpbGRyZW5bY2hpbGRyZW5MZW4rK10gPSBfY2hpbGQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKDAgIT09IHZsZW4pIGZvciAodmFyIGkgPSAwOyBpIDwgdmxlbjsgaSsrKSB7XG4gICAgICAgICAgICB2Y2hpbGQgPSB2Y2hpbGRyZW5baV07XG4gICAgICAgICAgICBjaGlsZCA9IG51bGw7XG4gICAgICAgICAgICB2YXIga2V5ID0gdmNoaWxkLmtleTtcbiAgICAgICAgICAgIGlmIChudWxsICE9IGtleSkge1xuICAgICAgICAgICAgICAgIGlmIChrZXllZExlbiAmJiB2b2lkIDAgIT09IGtleWVkW2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGQgPSBrZXllZFtrZXldO1xuICAgICAgICAgICAgICAgICAgICBrZXllZFtrZXldID0gdm9pZCAwO1xuICAgICAgICAgICAgICAgICAgICBrZXllZExlbi0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIWNoaWxkICYmIG1pbiA8IGNoaWxkcmVuTGVuKSBmb3IgKGogPSBtaW47IGogPCBjaGlsZHJlbkxlbjsgaisrKSBpZiAodm9pZCAwICE9PSBjaGlsZHJlbltqXSAmJiBpc1NhbWVOb2RlVHlwZShjID0gY2hpbGRyZW5bal0sIHZjaGlsZCwgaXNIeWRyYXRpbmcpKSB7XG4gICAgICAgICAgICAgICAgY2hpbGQgPSBjO1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuW2pdID0gdm9pZCAwO1xuICAgICAgICAgICAgICAgIGlmIChqID09PSBjaGlsZHJlbkxlbiAtIDEpIGNoaWxkcmVuTGVuLS07XG4gICAgICAgICAgICAgICAgaWYgKGogPT09IG1pbikgbWluKys7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjaGlsZCA9IGlkaWZmKGNoaWxkLCB2Y2hpbGQsIGNvbnRleHQsIG1vdW50QWxsKTtcbiAgICAgICAgICAgIGYgPSBvcmlnaW5hbENoaWxkcmVuW2ldO1xuICAgICAgICAgICAgaWYgKGNoaWxkICYmIGNoaWxkICE9PSBkb20gJiYgY2hpbGQgIT09IGYpIGlmIChudWxsID09IGYpIGRvbS5hcHBlbmRDaGlsZChjaGlsZCk7IGVsc2UgaWYgKGNoaWxkID09PSBmLm5leHRTaWJsaW5nKSByZW1vdmVOb2RlKGYpOyBlbHNlIGRvbS5pbnNlcnRCZWZvcmUoY2hpbGQsIGYpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChrZXllZExlbikgZm9yICh2YXIgaSBpbiBrZXllZCkgaWYgKHZvaWQgMCAhPT0ga2V5ZWRbaV0pIHJlY29sbGVjdE5vZGVUcmVlKGtleWVkW2ldLCAhMSk7XG4gICAgICAgIHdoaWxlIChtaW4gPD0gY2hpbGRyZW5MZW4pIGlmICh2b2lkIDAgIT09IChjaGlsZCA9IGNoaWxkcmVuW2NoaWxkcmVuTGVuLS1dKSkgcmVjb2xsZWN0Tm9kZVRyZWUoY2hpbGQsICExKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcmVjb2xsZWN0Tm9kZVRyZWUobm9kZSwgdW5tb3VudE9ubHkpIHtcbiAgICAgICAgdmFyIGNvbXBvbmVudCA9IG5vZGUuX2NvbXBvbmVudDtcbiAgICAgICAgaWYgKGNvbXBvbmVudCkgdW5tb3VudENvbXBvbmVudChjb21wb25lbnQpOyBlbHNlIHtcbiAgICAgICAgICAgIGlmIChudWxsICE9IG5vZGUuX19wcmVhY3RhdHRyXyAmJiBub2RlLl9fcHJlYWN0YXR0cl8ucmVmKSBub2RlLl9fcHJlYWN0YXR0cl8ucmVmKG51bGwpO1xuICAgICAgICAgICAgaWYgKCExID09PSB1bm1vdW50T25seSB8fCBudWxsID09IG5vZGUuX19wcmVhY3RhdHRyXykgcmVtb3ZlTm9kZShub2RlKTtcbiAgICAgICAgICAgIHJlbW92ZUNoaWxkcmVuKG5vZGUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlbW92ZUNoaWxkcmVuKG5vZGUpIHtcbiAgICAgICAgbm9kZSA9IG5vZGUubGFzdENoaWxkO1xuICAgICAgICB3aGlsZSAobm9kZSkge1xuICAgICAgICAgICAgdmFyIG5leHQgPSBub2RlLnByZXZpb3VzU2libGluZztcbiAgICAgICAgICAgIHJlY29sbGVjdE5vZGVUcmVlKG5vZGUsICEwKTtcbiAgICAgICAgICAgIG5vZGUgPSBuZXh0O1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGRpZmZBdHRyaWJ1dGVzKGRvbSwgYXR0cnMsIG9sZCkge1xuICAgICAgICB2YXIgbmFtZTtcbiAgICAgICAgZm9yIChuYW1lIGluIG9sZCkgaWYgKCghYXR0cnMgfHwgbnVsbCA9PSBhdHRyc1tuYW1lXSkgJiYgbnVsbCAhPSBvbGRbbmFtZV0pIHNldEFjY2Vzc29yKGRvbSwgbmFtZSwgb2xkW25hbWVdLCBvbGRbbmFtZV0gPSB2b2lkIDAsIGlzU3ZnTW9kZSk7XG4gICAgICAgIGZvciAobmFtZSBpbiBhdHRycykgaWYgKCEoJ2NoaWxkcmVuJyA9PT0gbmFtZSB8fCAnaW5uZXJIVE1MJyA9PT0gbmFtZSB8fCBuYW1lIGluIG9sZCAmJiBhdHRyc1tuYW1lXSA9PT0gKCd2YWx1ZScgPT09IG5hbWUgfHwgJ2NoZWNrZWQnID09PSBuYW1lID8gZG9tW25hbWVdIDogb2xkW25hbWVdKSkpIHNldEFjY2Vzc29yKGRvbSwgbmFtZSwgb2xkW25hbWVdLCBvbGRbbmFtZV0gPSBhdHRyc1tuYW1lXSwgaXNTdmdNb2RlKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gY29sbGVjdENvbXBvbmVudChjb21wb25lbnQpIHtcbiAgICAgICAgdmFyIG5hbWUgPSBjb21wb25lbnQuY29uc3RydWN0b3IubmFtZTtcbiAgICAgICAgKGNvbXBvbmVudHNbbmFtZV0gfHwgKGNvbXBvbmVudHNbbmFtZV0gPSBbXSkpLnB1c2goY29tcG9uZW50KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gY3JlYXRlQ29tcG9uZW50KEN0b3IsIHByb3BzLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBpbnN0LCBsaXN0ID0gY29tcG9uZW50c1tDdG9yLm5hbWVdO1xuICAgICAgICBpZiAoQ3Rvci5wcm90b3R5cGUgJiYgQ3Rvci5wcm90b3R5cGUucmVuZGVyKSB7XG4gICAgICAgICAgICBpbnN0ID0gbmV3IEN0b3IocHJvcHMsIGNvbnRleHQpO1xuICAgICAgICAgICAgQ29tcG9uZW50LmNhbGwoaW5zdCwgcHJvcHMsIGNvbnRleHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5zdCA9IG5ldyBDb21wb25lbnQocHJvcHMsIGNvbnRleHQpO1xuICAgICAgICAgICAgaW5zdC5jb25zdHJ1Y3RvciA9IEN0b3I7XG4gICAgICAgICAgICBpbnN0LnJlbmRlciA9IGRvUmVuZGVyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsaXN0KSBmb3IgKHZhciBpID0gbGlzdC5sZW5ndGg7IGktLTsgKSBpZiAobGlzdFtpXS5jb25zdHJ1Y3RvciA9PT0gQ3Rvcikge1xuICAgICAgICAgICAgaW5zdC5fX2IgPSBsaXN0W2ldLl9fYjtcbiAgICAgICAgICAgIGxpc3Quc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGluc3Q7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGRvUmVuZGVyKHByb3BzLCBzdGF0ZSwgY29udGV4dCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvcihwcm9wcywgY29udGV4dCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHNldENvbXBvbmVudFByb3BzKGNvbXBvbmVudCwgcHJvcHMsIG9wdHMsIGNvbnRleHQsIG1vdW50QWxsKSB7XG4gICAgICAgIGlmICghY29tcG9uZW50Ll9feCkge1xuICAgICAgICAgICAgY29tcG9uZW50Ll9feCA9ICEwO1xuICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5fX3IgPSBwcm9wcy5yZWYpIGRlbGV0ZSBwcm9wcy5yZWY7XG4gICAgICAgICAgICBpZiAoY29tcG9uZW50Ll9fayA9IHByb3BzLmtleSkgZGVsZXRlIHByb3BzLmtleTtcbiAgICAgICAgICAgIGlmICghY29tcG9uZW50LmJhc2UgfHwgbW91bnRBbGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50LmNvbXBvbmVudFdpbGxNb3VudCkgY29tcG9uZW50LmNvbXBvbmVudFdpbGxNb3VudCgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjb21wb25lbnQuY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcykgY29tcG9uZW50LmNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMocHJvcHMsIGNvbnRleHQpO1xuICAgICAgICAgICAgaWYgKGNvbnRleHQgJiYgY29udGV4dCAhPT0gY29tcG9uZW50LmNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWNvbXBvbmVudC5fX2MpIGNvbXBvbmVudC5fX2MgPSBjb21wb25lbnQuY29udGV4dDtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudC5fX3ApIGNvbXBvbmVudC5fX3AgPSBjb21wb25lbnQucHJvcHM7XG4gICAgICAgICAgICBjb21wb25lbnQucHJvcHMgPSBwcm9wcztcbiAgICAgICAgICAgIGNvbXBvbmVudC5fX3ggPSAhMTtcbiAgICAgICAgICAgIGlmICgwICE9PSBvcHRzKSBpZiAoMSA9PT0gb3B0cyB8fCAhMSAhPT0gb3B0aW9ucy5zeW5jQ29tcG9uZW50VXBkYXRlcyB8fCAhY29tcG9uZW50LmJhc2UpIHJlbmRlckNvbXBvbmVudChjb21wb25lbnQsIDEsIG1vdW50QWxsKTsgZWxzZSBlbnF1ZXVlUmVuZGVyKGNvbXBvbmVudCk7XG4gICAgICAgICAgICBpZiAoY29tcG9uZW50Ll9fcikgY29tcG9uZW50Ll9fcihjb21wb25lbnQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlbmRlckNvbXBvbmVudChjb21wb25lbnQsIG9wdHMsIG1vdW50QWxsLCBpc0NoaWxkKSB7XG4gICAgICAgIGlmICghY29tcG9uZW50Ll9feCkge1xuICAgICAgICAgICAgdmFyIHJlbmRlcmVkLCBpbnN0LCBjYmFzZSwgcHJvcHMgPSBjb21wb25lbnQucHJvcHMsIHN0YXRlID0gY29tcG9uZW50LnN0YXRlLCBjb250ZXh0ID0gY29tcG9uZW50LmNvbnRleHQsIHByZXZpb3VzUHJvcHMgPSBjb21wb25lbnQuX19wIHx8IHByb3BzLCBwcmV2aW91c1N0YXRlID0gY29tcG9uZW50Ll9fcyB8fCBzdGF0ZSwgcHJldmlvdXNDb250ZXh0ID0gY29tcG9uZW50Ll9fYyB8fCBjb250ZXh0LCBpc1VwZGF0ZSA9IGNvbXBvbmVudC5iYXNlLCBuZXh0QmFzZSA9IGNvbXBvbmVudC5fX2IsIGluaXRpYWxCYXNlID0gaXNVcGRhdGUgfHwgbmV4dEJhc2UsIGluaXRpYWxDaGlsZENvbXBvbmVudCA9IGNvbXBvbmVudC5fY29tcG9uZW50LCBza2lwID0gITE7XG4gICAgICAgICAgICBpZiAoaXNVcGRhdGUpIHtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQucHJvcHMgPSBwcmV2aW91c1Byb3BzO1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5zdGF0ZSA9IHByZXZpb3VzU3RhdGU7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LmNvbnRleHQgPSBwcmV2aW91c0NvbnRleHQ7XG4gICAgICAgICAgICAgICAgaWYgKDIgIT09IG9wdHMgJiYgY29tcG9uZW50LnNob3VsZENvbXBvbmVudFVwZGF0ZSAmJiAhMSA9PT0gY29tcG9uZW50LnNob3VsZENvbXBvbmVudFVwZGF0ZShwcm9wcywgc3RhdGUsIGNvbnRleHQpKSBza2lwID0gITA7IGVsc2UgaWYgKGNvbXBvbmVudC5jb21wb25lbnRXaWxsVXBkYXRlKSBjb21wb25lbnQuY29tcG9uZW50V2lsbFVwZGF0ZShwcm9wcywgc3RhdGUsIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5wcm9wcyA9IHByb3BzO1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5zdGF0ZSA9IHN0YXRlO1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5jb250ZXh0ID0gY29udGV4dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbXBvbmVudC5fX3AgPSBjb21wb25lbnQuX19zID0gY29tcG9uZW50Ll9fYyA9IGNvbXBvbmVudC5fX2IgPSBudWxsO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9fZCA9ICExO1xuICAgICAgICAgICAgaWYgKCFza2lwKSB7XG4gICAgICAgICAgICAgICAgcmVuZGVyZWQgPSBjb21wb25lbnQucmVuZGVyKHByb3BzLCBzdGF0ZSwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5nZXRDaGlsZENvbnRleHQpIGNvbnRleHQgPSBleHRlbmQoZXh0ZW5kKHt9LCBjb250ZXh0KSwgY29tcG9uZW50LmdldENoaWxkQ29udGV4dCgpKTtcbiAgICAgICAgICAgICAgICB2YXIgdG9Vbm1vdW50LCBiYXNlLCBjaGlsZENvbXBvbmVudCA9IHJlbmRlcmVkICYmIHJlbmRlcmVkLm5vZGVOYW1lO1xuICAgICAgICAgICAgICAgIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBjaGlsZENvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2hpbGRQcm9wcyA9IGdldE5vZGVQcm9wcyhyZW5kZXJlZCk7XG4gICAgICAgICAgICAgICAgICAgIGluc3QgPSBpbml0aWFsQ2hpbGRDb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnN0ICYmIGluc3QuY29uc3RydWN0b3IgPT09IGNoaWxkQ29tcG9uZW50ICYmIGNoaWxkUHJvcHMua2V5ID09IGluc3QuX19rKSBzZXRDb21wb25lbnRQcm9wcyhpbnN0LCBjaGlsZFByb3BzLCAxLCBjb250ZXh0LCAhMSk7IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdG9Vbm1vdW50ID0gaW5zdDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5fY29tcG9uZW50ID0gaW5zdCA9IGNyZWF0ZUNvbXBvbmVudChjaGlsZENvbXBvbmVudCwgY2hpbGRQcm9wcywgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0Ll9fYiA9IGluc3QuX19iIHx8IG5leHRCYXNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdC5fX3UgPSBjb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRDb21wb25lbnRQcm9wcyhpbnN0LCBjaGlsZFByb3BzLCAwLCBjb250ZXh0LCAhMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJDb21wb25lbnQoaW5zdCwgMSwgbW91bnRBbGwsICEwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBiYXNlID0gaW5zdC5iYXNlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNiYXNlID0gaW5pdGlhbEJhc2U7XG4gICAgICAgICAgICAgICAgICAgIHRvVW5tb3VudCA9IGluaXRpYWxDaGlsZENvbXBvbmVudDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRvVW5tb3VudCkgY2Jhc2UgPSBjb21wb25lbnQuX2NvbXBvbmVudCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbml0aWFsQmFzZSB8fCAxID09PSBvcHRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2Jhc2UpIGNiYXNlLl9jb21wb25lbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgYmFzZSA9IGRpZmYoY2Jhc2UsIHJlbmRlcmVkLCBjb250ZXh0LCBtb3VudEFsbCB8fCAhaXNVcGRhdGUsIGluaXRpYWxCYXNlICYmIGluaXRpYWxCYXNlLnBhcmVudE5vZGUsICEwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaW5pdGlhbEJhc2UgJiYgYmFzZSAhPT0gaW5pdGlhbEJhc2UgJiYgaW5zdCAhPT0gaW5pdGlhbENoaWxkQ29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBiYXNlUGFyZW50ID0gaW5pdGlhbEJhc2UucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJhc2VQYXJlbnQgJiYgYmFzZSAhPT0gYmFzZVBhcmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYmFzZVBhcmVudC5yZXBsYWNlQ2hpbGQoYmFzZSwgaW5pdGlhbEJhc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0b1VubW91bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbml0aWFsQmFzZS5fY29tcG9uZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvbGxlY3ROb2RlVHJlZShpbml0aWFsQmFzZSwgITEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0b1VubW91bnQpIHVubW91bnRDb21wb25lbnQodG9Vbm1vdW50KTtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQuYmFzZSA9IGJhc2U7XG4gICAgICAgICAgICAgICAgaWYgKGJhc2UgJiYgIWlzQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbXBvbmVudFJlZiA9IGNvbXBvbmVudCwgdCA9IGNvbXBvbmVudDtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHQgPSB0Ll9fdSkgKGNvbXBvbmVudFJlZiA9IHQpLmJhc2UgPSBiYXNlO1xuICAgICAgICAgICAgICAgICAgICBiYXNlLl9jb21wb25lbnQgPSBjb21wb25lbnRSZWY7XG4gICAgICAgICAgICAgICAgICAgIGJhc2UuX2NvbXBvbmVudENvbnN0cnVjdG9yID0gY29tcG9uZW50UmVmLmNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghaXNVcGRhdGUgfHwgbW91bnRBbGwpIG1vdW50cy51bnNoaWZ0KGNvbXBvbmVudCk7IGVsc2UgaWYgKCFza2lwKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5jb21wb25lbnREaWRVcGRhdGUpIGNvbXBvbmVudC5jb21wb25lbnREaWRVcGRhdGUocHJldmlvdXNQcm9wcywgcHJldmlvdXNTdGF0ZSwgcHJldmlvdXNDb250ZXh0KTtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5hZnRlclVwZGF0ZSkgb3B0aW9ucy5hZnRlclVwZGF0ZShjb21wb25lbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG51bGwgIT0gY29tcG9uZW50Ll9faCkgd2hpbGUgKGNvbXBvbmVudC5fX2gubGVuZ3RoKSBjb21wb25lbnQuX19oLnBvcCgpLmNhbGwoY29tcG9uZW50KTtcbiAgICAgICAgICAgIGlmICghZGlmZkxldmVsICYmICFpc0NoaWxkKSBmbHVzaE1vdW50cygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGJ1aWxkQ29tcG9uZW50RnJvbVZOb2RlKGRvbSwgdm5vZGUsIGNvbnRleHQsIG1vdW50QWxsKSB7XG4gICAgICAgIHZhciBjID0gZG9tICYmIGRvbS5fY29tcG9uZW50LCBvcmlnaW5hbENvbXBvbmVudCA9IGMsIG9sZERvbSA9IGRvbSwgaXNEaXJlY3RPd25lciA9IGMgJiYgZG9tLl9jb21wb25lbnRDb25zdHJ1Y3RvciA9PT0gdm5vZGUubm9kZU5hbWUsIGlzT3duZXIgPSBpc0RpcmVjdE93bmVyLCBwcm9wcyA9IGdldE5vZGVQcm9wcyh2bm9kZSk7XG4gICAgICAgIHdoaWxlIChjICYmICFpc093bmVyICYmIChjID0gYy5fX3UpKSBpc093bmVyID0gYy5jb25zdHJ1Y3RvciA9PT0gdm5vZGUubm9kZU5hbWU7XG4gICAgICAgIGlmIChjICYmIGlzT3duZXIgJiYgKCFtb3VudEFsbCB8fCBjLl9jb21wb25lbnQpKSB7XG4gICAgICAgICAgICBzZXRDb21wb25lbnRQcm9wcyhjLCBwcm9wcywgMywgY29udGV4dCwgbW91bnRBbGwpO1xuICAgICAgICAgICAgZG9tID0gYy5iYXNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKG9yaWdpbmFsQ29tcG9uZW50ICYmICFpc0RpcmVjdE93bmVyKSB7XG4gICAgICAgICAgICAgICAgdW5tb3VudENvbXBvbmVudChvcmlnaW5hbENvbXBvbmVudCk7XG4gICAgICAgICAgICAgICAgZG9tID0gb2xkRG9tID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGMgPSBjcmVhdGVDb21wb25lbnQodm5vZGUubm9kZU5hbWUsIHByb3BzLCBjb250ZXh0KTtcbiAgICAgICAgICAgIGlmIChkb20gJiYgIWMuX19iKSB7XG4gICAgICAgICAgICAgICAgYy5fX2IgPSBkb207XG4gICAgICAgICAgICAgICAgb2xkRG9tID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldENvbXBvbmVudFByb3BzKGMsIHByb3BzLCAxLCBjb250ZXh0LCBtb3VudEFsbCk7XG4gICAgICAgICAgICBkb20gPSBjLmJhc2U7XG4gICAgICAgICAgICBpZiAob2xkRG9tICYmIGRvbSAhPT0gb2xkRG9tKSB7XG4gICAgICAgICAgICAgICAgb2xkRG9tLl9jb21wb25lbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgIHJlY29sbGVjdE5vZGVUcmVlKG9sZERvbSwgITEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkb207XG4gICAgfVxuICAgIGZ1bmN0aW9uIHVubW91bnRDb21wb25lbnQoY29tcG9uZW50KSB7XG4gICAgICAgIGlmIChvcHRpb25zLmJlZm9yZVVubW91bnQpIG9wdGlvbnMuYmVmb3JlVW5tb3VudChjb21wb25lbnQpO1xuICAgICAgICB2YXIgYmFzZSA9IGNvbXBvbmVudC5iYXNlO1xuICAgICAgICBjb21wb25lbnQuX194ID0gITA7XG4gICAgICAgIGlmIChjb21wb25lbnQuY29tcG9uZW50V2lsbFVubW91bnQpIGNvbXBvbmVudC5jb21wb25lbnRXaWxsVW5tb3VudCgpO1xuICAgICAgICBjb21wb25lbnQuYmFzZSA9IG51bGw7XG4gICAgICAgIHZhciBpbm5lciA9IGNvbXBvbmVudC5fY29tcG9uZW50O1xuICAgICAgICBpZiAoaW5uZXIpIHVubW91bnRDb21wb25lbnQoaW5uZXIpOyBlbHNlIGlmIChiYXNlKSB7XG4gICAgICAgICAgICBpZiAoYmFzZS5fX3ByZWFjdGF0dHJfICYmIGJhc2UuX19wcmVhY3RhdHRyXy5yZWYpIGJhc2UuX19wcmVhY3RhdHRyXy5yZWYobnVsbCk7XG4gICAgICAgICAgICBjb21wb25lbnQuX19iID0gYmFzZTtcbiAgICAgICAgICAgIHJlbW92ZU5vZGUoYmFzZSk7XG4gICAgICAgICAgICBjb2xsZWN0Q29tcG9uZW50KGNvbXBvbmVudCk7XG4gICAgICAgICAgICByZW1vdmVDaGlsZHJlbihiYXNlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29tcG9uZW50Ll9fcikgY29tcG9uZW50Ll9fcihudWxsKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gQ29tcG9uZW50KHByb3BzLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX19kID0gITA7XG4gICAgICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgIHRoaXMucHJvcHMgPSBwcm9wcztcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuc3RhdGUgfHwge307XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlbmRlcih2bm9kZSwgcGFyZW50LCBtZXJnZSkge1xuICAgICAgICByZXR1cm4gZGlmZihtZXJnZSwgdm5vZGUsIHt9LCAhMSwgcGFyZW50LCAhMSk7XG4gICAgfVxuICAgIHZhciBvcHRpb25zID0ge307XG4gICAgdmFyIHN0YWNrID0gW107XG4gICAgdmFyIEVNUFRZX0NISUxEUkVOID0gW107XG4gICAgdmFyIGRlZmVyID0gJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgUHJvbWlzZSA/IFByb21pc2UucmVzb2x2ZSgpLnRoZW4uYmluZChQcm9taXNlLnJlc29sdmUoKSkgOiBzZXRUaW1lb3V0O1xuICAgIHZhciBJU19OT05fRElNRU5TSU9OQUwgPSAvYWNpdHxleCg/OnN8Z3xufHB8JCl8cnBofG93c3xtbmN8bnR3fGluZVtjaF18em9vfF5vcmQvaTtcbiAgICB2YXIgaXRlbXMgPSBbXTtcbiAgICB2YXIgbW91bnRzID0gW107XG4gICAgdmFyIGRpZmZMZXZlbCA9IDA7XG4gICAgdmFyIGlzU3ZnTW9kZSA9ICExO1xuICAgIHZhciBoeWRyYXRpbmcgPSAhMTtcbiAgICB2YXIgY29tcG9uZW50cyA9IHt9O1xuICAgIGV4dGVuZChDb21wb25lbnQucHJvdG90eXBlLCB7XG4gICAgICAgIHNldFN0YXRlOiBmdW5jdGlvbihzdGF0ZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBzID0gdGhpcy5zdGF0ZTtcbiAgICAgICAgICAgIGlmICghdGhpcy5fX3MpIHRoaXMuX19zID0gZXh0ZW5kKHt9LCBzKTtcbiAgICAgICAgICAgIGV4dGVuZChzLCAnZnVuY3Rpb24nID09IHR5cGVvZiBzdGF0ZSA/IHN0YXRlKHMsIHRoaXMucHJvcHMpIDogc3RhdGUpO1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSAodGhpcy5fX2ggPSB0aGlzLl9faCB8fCBbXSkucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICBlbnF1ZXVlUmVuZGVyKHRoaXMpO1xuICAgICAgICB9LFxuICAgICAgICBmb3JjZVVwZGF0ZTogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykgKHRoaXMuX19oID0gdGhpcy5fX2ggfHwgW10pLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgcmVuZGVyQ29tcG9uZW50KHRoaXMsIDIpO1xuICAgICAgICB9LFxuICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKCkge31cbiAgICB9KTtcbiAgICB2YXIgcHJlYWN0ID0ge1xuICAgICAgICBoOiBoLFxuICAgICAgICBjcmVhdGVFbGVtZW50OiBoLFxuICAgICAgICBjbG9uZUVsZW1lbnQ6IGNsb25lRWxlbWVudCxcbiAgICAgICAgQ29tcG9uZW50OiBDb21wb25lbnQsXG4gICAgICAgIHJlbmRlcjogcmVuZGVyLFxuICAgICAgICByZXJlbmRlcjogcmVyZW5kZXIsXG4gICAgICAgIG9wdGlvbnM6IG9wdGlvbnNcbiAgICB9O1xuICAgIGlmICgndW5kZWZpbmVkJyAhPSB0eXBlb2YgbW9kdWxlKSBtb2R1bGUuZXhwb3J0cyA9IHByZWFjdDsgZWxzZSBzZWxmLnByZWFjdCA9IHByZWFjdDtcbn0oKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXByZWFjdC5qcy5tYXAiLCJtb2R1bGUuZXhwb3J0cyA9IHByZXR0aWVyQnl0ZXNcblxuZnVuY3Rpb24gcHJldHRpZXJCeXRlcyAobnVtKSB7XG4gIGlmICh0eXBlb2YgbnVtICE9PSAnbnVtYmVyJyB8fCBpc05hTihudW0pKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgYSBudW1iZXIsIGdvdCAnICsgdHlwZW9mIG51bSlcbiAgfVxuXG4gIHZhciBuZWcgPSBudW0gPCAwXG4gIHZhciB1bml0cyA9IFsnQicsICdLQicsICdNQicsICdHQicsICdUQicsICdQQicsICdFQicsICdaQicsICdZQiddXG5cbiAgaWYgKG5lZykge1xuICAgIG51bSA9IC1udW1cbiAgfVxuXG4gIGlmIChudW0gPCAxKSB7XG4gICAgcmV0dXJuIChuZWcgPyAnLScgOiAnJykgKyBudW0gKyAnIEInXG4gIH1cblxuICB2YXIgZXhwb25lbnQgPSBNYXRoLm1pbihNYXRoLmZsb29yKE1hdGgubG9nKG51bSkgLyBNYXRoLmxvZygxMDAwKSksIHVuaXRzLmxlbmd0aCAtIDEpXG4gIG51bSA9IE51bWJlcihudW0gLyBNYXRoLnBvdygxMDAwLCBleHBvbmVudCkpXG4gIHZhciB1bml0ID0gdW5pdHNbZXhwb25lbnRdXG5cbiAgaWYgKG51bSA+PSAxMCB8fCBudW0gJSAxID09PSAwKSB7XG4gICAgLy8gRG8gbm90IHNob3cgZGVjaW1hbHMgd2hlbiB0aGUgbnVtYmVyIGlzIHR3by1kaWdpdCwgb3IgaWYgdGhlIG51bWJlciBoYXMgbm9cbiAgICAvLyBkZWNpbWFsIGNvbXBvbmVudC5cbiAgICByZXR1cm4gKG5lZyA/ICctJyA6ICcnKSArIG51bS50b0ZpeGVkKDApICsgJyAnICsgdW5pdFxuICB9IGVsc2Uge1xuICAgIHJldHVybiAobmVnID8gJy0nIDogJycpICsgbnVtLnRvRml4ZWQoMSkgKyAnICcgKyB1bml0XG4gIH1cbn1cbiIsIi8vIENvcHlyaWdodCAyMDE0IFNpbW9uIEx5ZGVsbFxyXG4vLyBYMTEgKOKAnE1JVOKAnSkgTGljZW5zZWQuIChTZWUgTElDRU5TRS4pXHJcblxyXG52b2lkIChmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XHJcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICBkZWZpbmUoZmFjdG9yeSlcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSBcIm9iamVjdFwiKSB7XHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKVxyXG4gIH0gZWxzZSB7XHJcbiAgICByb290LnJlc29sdmVVcmwgPSBmYWN0b3J5KClcclxuICB9XHJcbn0odGhpcywgZnVuY3Rpb24oKSB7XHJcblxyXG4gIGZ1bmN0aW9uIHJlc29sdmVVcmwoLyogLi4udXJscyAqLykge1xyXG4gICAgdmFyIG51bVVybHMgPSBhcmd1bWVudHMubGVuZ3RoXHJcblxyXG4gICAgaWYgKG51bVVybHMgPT09IDApIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwicmVzb2x2ZVVybCByZXF1aXJlcyBhdCBsZWFzdCBvbmUgYXJndW1lbnQ7IGdvdCBub25lLlwiKVxyXG4gICAgfVxyXG5cclxuICAgIHZhciBiYXNlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJhc2VcIilcclxuICAgIGJhc2UuaHJlZiA9IGFyZ3VtZW50c1swXVxyXG5cclxuICAgIGlmIChudW1VcmxzID09PSAxKSB7XHJcbiAgICAgIHJldHVybiBiYXNlLmhyZWZcclxuICAgIH1cclxuXHJcbiAgICB2YXIgaGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaGVhZFwiKVswXVxyXG4gICAgaGVhZC5pbnNlcnRCZWZvcmUoYmFzZSwgaGVhZC5maXJzdENoaWxkKVxyXG5cclxuICAgIHZhciBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIilcclxuICAgIHZhciByZXNvbHZlZFxyXG5cclxuICAgIGZvciAodmFyIGluZGV4ID0gMTsgaW5kZXggPCBudW1VcmxzOyBpbmRleCsrKSB7XHJcbiAgICAgIGEuaHJlZiA9IGFyZ3VtZW50c1tpbmRleF1cclxuICAgICAgcmVzb2x2ZWQgPSBhLmhyZWZcclxuICAgICAgYmFzZS5ocmVmID0gcmVzb2x2ZWRcclxuICAgIH1cclxuXHJcbiAgICBoZWFkLnJlbW92ZUNoaWxkKGJhc2UpXHJcblxyXG4gICAgcmV0dXJuIHJlc29sdmVkXHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVzb2x2ZVVybFxyXG5cclxufSkpO1xyXG4iLCIvLyBHZW5lcmF0ZWQgYnkgQmFiZWxcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5lbmNvZGUgPSBlbmNvZGU7XG4vKiBnbG9iYWw6IHdpbmRvdyAqL1xuXG52YXIgX3dpbmRvdyA9IHdpbmRvdztcbnZhciBidG9hID0gX3dpbmRvdy5idG9hO1xuZnVuY3Rpb24gZW5jb2RlKGRhdGEpIHtcbiAgcmV0dXJuIGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KGRhdGEpKSk7XG59XG5cbnZhciBpc1N1cHBvcnRlZCA9IGV4cG9ydHMuaXNTdXBwb3J0ZWQgPSBcImJ0b2FcIiBpbiB3aW5kb3c7IiwiLy8gR2VuZXJhdGVkIGJ5IEJhYmVsXG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMubmV3UmVxdWVzdCA9IG5ld1JlcXVlc3Q7XG5leHBvcnRzLnJlc29sdmVVcmwgPSByZXNvbHZlVXJsO1xuXG52YXIgX3Jlc29sdmVVcmwgPSByZXF1aXJlKFwicmVzb2x2ZS11cmxcIik7XG5cbnZhciBfcmVzb2x2ZVVybDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZXNvbHZlVXJsKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gbmV3UmVxdWVzdCgpIHtcbiAgcmV0dXJuIG5ldyB3aW5kb3cuWE1MSHR0cFJlcXVlc3QoKTtcbn0gLyogZ2xvYmFsIHdpbmRvdyAqL1xuXG5cbmZ1bmN0aW9uIHJlc29sdmVVcmwob3JpZ2luLCBsaW5rKSB7XG4gIHJldHVybiAoMCwgX3Jlc29sdmVVcmwyLmRlZmF1bHQpKG9yaWdpbiwgbGluayk7XG59IiwiLy8gR2VuZXJhdGVkIGJ5IEJhYmVsXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF9jcmVhdGVDbGFzcyA9IGZ1bmN0aW9uICgpIHsgZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHsgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTsgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlOyBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7IGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGRlc2NyaXB0b3Iua2V5LCBkZXNjcmlwdG9yKTsgfSB9IHJldHVybiBmdW5jdGlvbiAoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7IGlmIChwcm90b1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7IGlmIChzdGF0aWNQcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH07IH0oKTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZ2V0U291cmNlID0gZ2V0U291cmNlO1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG52YXIgRmlsZVNvdXJjZSA9IGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gRmlsZVNvdXJjZShmaWxlKSB7XG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIEZpbGVTb3VyY2UpO1xuXG4gICAgdGhpcy5fZmlsZSA9IGZpbGU7XG4gICAgdGhpcy5zaXplID0gZmlsZS5zaXplO1xuICB9XG5cbiAgX2NyZWF0ZUNsYXNzKEZpbGVTb3VyY2UsIFt7XG4gICAga2V5OiBcInNsaWNlXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHNsaWNlKHN0YXJ0LCBlbmQpIHtcbiAgICAgIHJldHVybiB0aGlzLl9maWxlLnNsaWNlKHN0YXJ0LCBlbmQpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJjbG9zZVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBjbG9zZSgpIHt9XG4gIH1dKTtcblxuICByZXR1cm4gRmlsZVNvdXJjZTtcbn0oKTtcblxuZnVuY3Rpb24gZ2V0U291cmNlKGlucHV0KSB7XG4gIC8vIFNpbmNlIHdlIGVtdWxhdGUgdGhlIEJsb2IgdHlwZSBpbiBvdXIgdGVzdHMgKG5vdCBhbGwgdGFyZ2V0IGJyb3dzZXJzXG4gIC8vIHN1cHBvcnQgaXQpLCB3ZSBjYW5ub3QgdXNlIGBpbnN0YW5jZW9mYCBmb3IgdGVzdGluZyB3aGV0aGVyIHRoZSBpbnB1dCB2YWx1ZVxuICAvLyBjYW4gYmUgaGFuZGxlZC4gSW5zdGVhZCwgd2Ugc2ltcGx5IGNoZWNrIGlzIHRoZSBzbGljZSgpIGZ1bmN0aW9uIGFuZCB0aGVcbiAgLy8gc2l6ZSBwcm9wZXJ0eSBhcmUgYXZhaWxhYmxlLlxuICBpZiAodHlwZW9mIGlucHV0LnNsaWNlID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIGlucHV0LnNpemUgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICByZXR1cm4gbmV3IEZpbGVTb3VyY2UoaW5wdXQpO1xuICB9XG5cbiAgdGhyb3cgbmV3IEVycm9yKFwic291cmNlIG9iamVjdCBtYXkgb25seSBiZSBhbiBpbnN0YW5jZSBvZiBGaWxlIG9yIEJsb2IgaW4gdGhpcyBlbnZpcm9ubWVudFwiKTtcbn0iLCIvLyBHZW5lcmF0ZWQgYnkgQmFiZWxcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5zZXRJdGVtID0gc2V0SXRlbTtcbmV4cG9ydHMuZ2V0SXRlbSA9IGdldEl0ZW07XG5leHBvcnRzLnJlbW92ZUl0ZW0gPSByZW1vdmVJdGVtO1xuLyogZ2xvYmFsIHdpbmRvdywgbG9jYWxTdG9yYWdlICovXG5cbnZhciBoYXNTdG9yYWdlID0gZmFsc2U7XG50cnkge1xuICBoYXNTdG9yYWdlID0gXCJsb2NhbFN0b3JhZ2VcIiBpbiB3aW5kb3c7XG5cbiAgLy8gQXR0ZW1wdCB0byBzdG9yZSBhbmQgcmVhZCBlbnRyaWVzIGZyb20gdGhlIGxvY2FsIHN0b3JhZ2UgdG8gZGV0ZWN0IFByaXZhdGVcbiAgLy8gTW9kZSBvbiBTYWZhcmkgb24gaU9TIChzZWUgIzQ5KVxuICB2YXIga2V5ID0gXCJ0dXNTdXBwb3J0XCI7XG4gIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGtleSwgbG9jYWxTdG9yYWdlLmdldEl0ZW0oa2V5KSk7XG59IGNhdGNoIChlKSB7XG4gIC8vIElmIHdlIHRyeSB0byBhY2Nlc3MgbG9jYWxTdG9yYWdlIGluc2lkZSBhIHNhbmRib3hlZCBpZnJhbWUsIGEgU2VjdXJpdHlFcnJvclxuICAvLyBpcyB0aHJvd24uIFdoZW4gaW4gcHJpdmF0ZSBtb2RlIG9uIGlPUyBTYWZhcmksIGEgUXVvdGFFeGNlZWRlZEVycm9yIGlzXG4gIC8vIHRocm93biAoc2VlICM0OSlcbiAgaWYgKGUuY29kZSA9PT0gZS5TRUNVUklUWV9FUlIgfHwgZS5jb2RlID09PSBlLlFVT1RBX0VYQ0VFREVEX0VSUikge1xuICAgIGhhc1N0b3JhZ2UgPSBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBlO1xuICB9XG59XG5cbnZhciBjYW5TdG9yZVVSTHMgPSBleHBvcnRzLmNhblN0b3JlVVJMcyA9IGhhc1N0b3JhZ2U7XG5cbmZ1bmN0aW9uIHNldEl0ZW0oa2V5LCB2YWx1ZSkge1xuICBpZiAoIWhhc1N0b3JhZ2UpIHJldHVybjtcbiAgcmV0dXJuIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGtleSwgdmFsdWUpO1xufVxuXG5mdW5jdGlvbiBnZXRJdGVtKGtleSkge1xuICBpZiAoIWhhc1N0b3JhZ2UpIHJldHVybjtcbiAgcmV0dXJuIGxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUl0ZW0oa2V5KSB7XG4gIGlmICghaGFzU3RvcmFnZSkgcmV0dXJuO1xuICByZXR1cm4gbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oa2V5KTtcbn0iLCIvLyBHZW5lcmF0ZWQgYnkgQmFiZWxcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG5mdW5jdGlvbiBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybihzZWxmLCBjYWxsKSB7IGlmICghc2VsZikgeyB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJ0aGlzIGhhc24ndCBiZWVuIGluaXRpYWxpc2VkIC0gc3VwZXIoKSBoYXNuJ3QgYmVlbiBjYWxsZWRcIik7IH0gcmV0dXJuIGNhbGwgJiYgKHR5cGVvZiBjYWxsID09PSBcIm9iamVjdFwiIHx8IHR5cGVvZiBjYWxsID09PSBcImZ1bmN0aW9uXCIpID8gY2FsbCA6IHNlbGY7IH1cblxuZnVuY3Rpb24gX2luaGVyaXRzKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7IGlmICh0eXBlb2Ygc3VwZXJDbGFzcyAhPT0gXCJmdW5jdGlvblwiICYmIHN1cGVyQ2xhc3MgIT09IG51bGwpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uLCBub3QgXCIgKyB0eXBlb2Ygc3VwZXJDbGFzcyk7IH0gc3ViQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckNsYXNzICYmIHN1cGVyQ2xhc3MucHJvdG90eXBlLCB7IGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBzdWJDbGFzcywgZW51bWVyYWJsZTogZmFsc2UsIHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUgfSB9KTsgaWYgKHN1cGVyQ2xhc3MpIE9iamVjdC5zZXRQcm90b3R5cGVPZiA/IE9iamVjdC5zZXRQcm90b3R5cGVPZihzdWJDbGFzcywgc3VwZXJDbGFzcykgOiBzdWJDbGFzcy5fX3Byb3RvX18gPSBzdXBlckNsYXNzOyB9XG5cbnZhciBEZXRhaWxlZEVycm9yID0gZnVuY3Rpb24gKF9FcnJvcikge1xuICBfaW5oZXJpdHMoRGV0YWlsZWRFcnJvciwgX0Vycm9yKTtcblxuICBmdW5jdGlvbiBEZXRhaWxlZEVycm9yKGVycm9yKSB7XG4gICAgdmFyIGNhdXNpbmdFcnIgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBudWxsIDogYXJndW1lbnRzWzFdO1xuICAgIHZhciB4aHIgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyBudWxsIDogYXJndW1lbnRzWzJdO1xuXG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIERldGFpbGVkRXJyb3IpO1xuXG4gICAgdmFyIF90aGlzID0gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4odGhpcywgT2JqZWN0LmdldFByb3RvdHlwZU9mKERldGFpbGVkRXJyb3IpLmNhbGwodGhpcywgZXJyb3IubWVzc2FnZSkpO1xuXG4gICAgX3RoaXMub3JpZ2luYWxSZXF1ZXN0ID0geGhyO1xuICAgIF90aGlzLmNhdXNpbmdFcnJvciA9IGNhdXNpbmdFcnI7XG5cbiAgICB2YXIgbWVzc2FnZSA9IGVycm9yLm1lc3NhZ2U7XG4gICAgaWYgKGNhdXNpbmdFcnIgIT0gbnVsbCkge1xuICAgICAgbWVzc2FnZSArPSBcIiwgY2F1c2VkIGJ5IFwiICsgY2F1c2luZ0Vyci50b1N0cmluZygpO1xuICAgIH1cbiAgICBpZiAoeGhyICE9IG51bGwpIHtcbiAgICAgIG1lc3NhZ2UgKz0gXCIsIG9yaWdpbmF0ZWQgZnJvbSByZXF1ZXN0IChyZXNwb25zZSBjb2RlOiBcIiArIHhoci5zdGF0dXMgKyBcIiwgcmVzcG9uc2UgdGV4dDogXCIgKyB4aHIucmVzcG9uc2VUZXh0ICsgXCIpXCI7XG4gICAgfVxuICAgIF90aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgIHJldHVybiBfdGhpcztcbiAgfVxuXG4gIHJldHVybiBEZXRhaWxlZEVycm9yO1xufShFcnJvcik7XG5cbmV4cG9ydHMuZGVmYXVsdCA9IERldGFpbGVkRXJyb3I7IiwiLy8gR2VuZXJhdGVkIGJ5IEJhYmVsXG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IGZpbmdlcnByaW50O1xuLyoqXG4gKiBHZW5lcmF0ZSBhIGZpbmdlcnByaW50IGZvciBhIGZpbGUgd2hpY2ggd2lsbCBiZSB1c2VkIHRoZSBzdG9yZSB0aGUgZW5kcG9pbnRcbiAqXG4gKiBAcGFyYW0ge0ZpbGV9IGZpbGVcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZmluZ2VycHJpbnQoZmlsZSkge1xuICByZXR1cm4gW1widHVzXCIsIGZpbGUubmFtZSwgZmlsZS50eXBlLCBmaWxlLnNpemUsIGZpbGUubGFzdE1vZGlmaWVkXS5qb2luKFwiLVwiKTtcbn0iLCIvLyBHZW5lcmF0ZWQgYnkgQmFiZWxcblwidXNlIHN0cmljdFwiO1xuXG52YXIgX3VwbG9hZCA9IHJlcXVpcmUoXCIuL3VwbG9hZFwiKTtcblxudmFyIF91cGxvYWQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfdXBsb2FkKTtcblxudmFyIF9zdG9yYWdlID0gcmVxdWlyZShcIi4vbm9kZS9zdG9yYWdlXCIpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG4vKiBnbG9iYWwgd2luZG93ICovXG52YXIgZGVmYXVsdE9wdGlvbnMgPSBfdXBsb2FkMi5kZWZhdWx0LmRlZmF1bHRPcHRpb25zO1xuXG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gIC8vIEJyb3dzZXIgZW52aXJvbm1lbnQgdXNpbmcgWE1MSHR0cFJlcXVlc3RcbiAgdmFyIF93aW5kb3cgPSB3aW5kb3c7XG4gIHZhciBYTUxIdHRwUmVxdWVzdCA9IF93aW5kb3cuWE1MSHR0cFJlcXVlc3Q7XG4gIHZhciBCbG9iID0gX3dpbmRvdy5CbG9iO1xuXG5cbiAgdmFyIGlzU3VwcG9ydGVkID0gWE1MSHR0cFJlcXVlc3QgJiYgQmxvYiAmJiB0eXBlb2YgQmxvYi5wcm90b3R5cGUuc2xpY2UgPT09IFwiZnVuY3Rpb25cIjtcbn0gZWxzZSB7XG4gIC8vIE5vZGUuanMgZW52aXJvbm1lbnQgdXNpbmcgaHR0cCBtb2R1bGVcbiAgdmFyIGlzU3VwcG9ydGVkID0gdHJ1ZTtcbn1cblxuLy8gVGhlIHVzYWdlIG9mIHRoZSBjb21tb25qcyBleHBvcnRpbmcgc3ludGF4IGluc3RlYWQgb2YgdGhlIG5ldyBFQ01BU2NyaXB0XG4vLyBvbmUgaXMgYWN0dWFsbHkgaW50ZWRlZCBhbmQgcHJldmVudHMgd2VpcmQgYmVoYXZpb3VyIGlmIHdlIGFyZSB0cnlpbmcgdG9cbi8vIGltcG9ydCB0aGlzIG1vZHVsZSBpbiBhbm90aGVyIG1vZHVsZSB1c2luZyBCYWJlbC5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBVcGxvYWQ6IF91cGxvYWQyLmRlZmF1bHQsXG4gIGlzU3VwcG9ydGVkOiBpc1N1cHBvcnRlZCxcbiAgY2FuU3RvcmVVUkxzOiBfc3RvcmFnZS5jYW5TdG9yZVVSTHMsXG4gIGRlZmF1bHRPcHRpb25zOiBkZWZhdWx0T3B0aW9uc1xufTsiLCIvLyBHZW5lcmF0ZWQgYnkgQmFiZWxcblwidXNlIHN0cmljdFwiO1xuXG52YXIgX2NyZWF0ZUNsYXNzID0gZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH0gcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfTsgfSgpOyAvKiBnbG9iYWwgd2luZG93ICovXG5cblxuLy8gV2UgaW1wb3J0IHRoZSBmaWxlcyB1c2VkIGluc2lkZSB0aGUgTm9kZSBlbnZpcm9ubWVudCB3aGljaCBhcmUgcmV3cml0dGVuXG4vLyBmb3IgYnJvd3NlcnMgdXNpbmcgdGhlIHJ1bGVzIGRlZmluZWQgaW4gdGhlIHBhY2thZ2UuanNvblxuXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfZmluZ2VycHJpbnQgPSByZXF1aXJlKFwiLi9maW5nZXJwcmludFwiKTtcblxudmFyIF9maW5nZXJwcmludDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9maW5nZXJwcmludCk7XG5cbnZhciBfZXJyb3IgPSByZXF1aXJlKFwiLi9lcnJvclwiKTtcblxudmFyIF9lcnJvcjIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9lcnJvcik7XG5cbnZhciBfZXh0ZW5kID0gcmVxdWlyZShcImV4dGVuZFwiKTtcblxudmFyIF9leHRlbmQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfZXh0ZW5kKTtcblxudmFyIF9yZXF1ZXN0ID0gcmVxdWlyZShcIi4vbm9kZS9yZXF1ZXN0XCIpO1xuXG52YXIgX3NvdXJjZSA9IHJlcXVpcmUoXCIuL25vZGUvc291cmNlXCIpO1xuXG52YXIgX2Jhc2UgPSByZXF1aXJlKFwiLi9ub2RlL2Jhc2U2NFwiKTtcblxudmFyIEJhc2U2NCA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9iYXNlKTtcblxudmFyIF9zdG9yYWdlID0gcmVxdWlyZShcIi4vbm9kZS9zdG9yYWdlXCIpO1xuXG52YXIgU3RvcmFnZSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9zdG9yYWdlKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQob2JqKSB7IGlmIChvYmogJiYgb2JqLl9fZXNNb2R1bGUpIHsgcmV0dXJuIG9iajsgfSBlbHNlIHsgdmFyIG5ld09iaiA9IHt9OyBpZiAob2JqICE9IG51bGwpIHsgZm9yICh2YXIga2V5IGluIG9iaikgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KSkgbmV3T2JqW2tleV0gPSBvYmpba2V5XTsgfSB9IG5ld09iai5kZWZhdWx0ID0gb2JqOyByZXR1cm4gbmV3T2JqOyB9IH1cblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxudmFyIGRlZmF1bHRPcHRpb25zID0ge1xuICBlbmRwb2ludDogXCJcIixcbiAgZmluZ2VycHJpbnQ6IF9maW5nZXJwcmludDIuZGVmYXVsdCxcbiAgcmVzdW1lOiB0cnVlLFxuICBvblByb2dyZXNzOiBudWxsLFxuICBvbkNodW5rQ29tcGxldGU6IG51bGwsXG4gIG9uU3VjY2VzczogbnVsbCxcbiAgb25FcnJvcjogbnVsbCxcbiAgaGVhZGVyczoge30sXG4gIGNodW5rU2l6ZTogSW5maW5pdHksXG4gIHdpdGhDcmVkZW50aWFsczogZmFsc2UsXG4gIHVwbG9hZFVybDogbnVsbCxcbiAgdXBsb2FkU2l6ZTogbnVsbCxcbiAgb3ZlcnJpZGVQYXRjaE1ldGhvZDogZmFsc2UsXG4gIHJldHJ5RGVsYXlzOiBudWxsXG59O1xuXG52YXIgVXBsb2FkID0gZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBVcGxvYWQoZmlsZSwgb3B0aW9ucykge1xuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBVcGxvYWQpO1xuXG4gICAgdGhpcy5vcHRpb25zID0gKDAsIF9leHRlbmQyLmRlZmF1bHQpKHRydWUsIHt9LCBkZWZhdWx0T3B0aW9ucywgb3B0aW9ucyk7XG5cbiAgICAvLyBUaGUgdW5kZXJseWluZyBGaWxlL0Jsb2Igb2JqZWN0XG4gICAgdGhpcy5maWxlID0gZmlsZTtcblxuICAgIC8vIFRoZSBVUkwgYWdhaW5zdCB3aGljaCB0aGUgZmlsZSB3aWxsIGJlIHVwbG9hZGVkXG4gICAgdGhpcy51cmwgPSBudWxsO1xuXG4gICAgLy8gVGhlIHVuZGVybHlpbmcgWEhSIG9iamVjdCBmb3IgdGhlIGN1cnJlbnQgUEFUQ0ggcmVxdWVzdFxuICAgIHRoaXMuX3hociA9IG51bGw7XG5cbiAgICAvLyBUaGUgZmluZ2VycGlucnQgZm9yIHRoZSBjdXJyZW50IGZpbGUgKHNldCBhZnRlciBzdGFydCgpKVxuICAgIHRoaXMuX2ZpbmdlcnByaW50ID0gbnVsbDtcblxuICAgIC8vIFRoZSBvZmZzZXQgdXNlZCBpbiB0aGUgY3VycmVudCBQQVRDSCByZXF1ZXN0XG4gICAgdGhpcy5fb2Zmc2V0ID0gbnVsbDtcblxuICAgIC8vIFRydWUgaWYgdGhlIGN1cnJlbnQgUEFUQ0ggcmVxdWVzdCBoYXMgYmVlbiBhYm9ydGVkXG4gICAgdGhpcy5fYWJvcnRlZCA9IGZhbHNlO1xuXG4gICAgLy8gVGhlIGZpbGUncyBzaXplIGluIGJ5dGVzXG4gICAgdGhpcy5fc2l6ZSA9IG51bGw7XG5cbiAgICAvLyBUaGUgU291cmNlIG9iamVjdCB3aGljaCB3aWxsIHdyYXAgYXJvdW5kIHRoZSBnaXZlbiBmaWxlIGFuZCBwcm92aWRlcyB1c1xuICAgIC8vIHdpdGggYSB1bmlmaWVkIGludGVyZmFjZSBmb3IgZ2V0dGluZyBpdHMgc2l6ZSBhbmQgc2xpY2UgY2h1bmtzIGZyb20gaXRzXG4gICAgLy8gY29udGVudCBhbGxvd2luZyB1cyB0byBlYXNpbHkgaGFuZGxlIEZpbGVzLCBCbG9icywgQnVmZmVycyBhbmQgU3RyZWFtcy5cbiAgICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXG4gICAgLy8gVGhlIGN1cnJlbnQgY291bnQgb2YgYXR0ZW1wdHMgd2hpY2ggaGF2ZSBiZWVuIG1hZGUuIE51bGwgaW5kaWNhdGVzIG5vbmUuXG4gICAgdGhpcy5fcmV0cnlBdHRlbXB0ID0gMDtcblxuICAgIC8vIFRoZSB0aW1lb3V0J3MgSUQgd2hpY2ggaXMgdXNlZCB0byBkZWxheSB0aGUgbmV4dCByZXRyeVxuICAgIHRoaXMuX3JldHJ5VGltZW91dCA9IG51bGw7XG5cbiAgICAvLyBUaGUgb2Zmc2V0IG9mIHRoZSByZW1vdGUgdXBsb2FkIGJlZm9yZSB0aGUgbGF0ZXN0IGF0dGVtcHQgd2FzIHN0YXJ0ZWQuXG4gICAgdGhpcy5fb2Zmc2V0QmVmb3JlUmV0cnkgPSAwO1xuICB9XG5cbiAgX2NyZWF0ZUNsYXNzKFVwbG9hZCwgW3tcbiAgICBrZXk6IFwic3RhcnRcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gc3RhcnQoKSB7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICB2YXIgZmlsZSA9IHRoaXMuZmlsZTtcblxuICAgICAgaWYgKCFmaWxlKSB7XG4gICAgICAgIHRoaXMuX2VtaXRFcnJvcihuZXcgRXJyb3IoXCJ0dXM6IG5vIGZpbGUgb3Igc3RyZWFtIHRvIHVwbG9hZCBwcm92aWRlZFwiKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuZW5kcG9pbnQpIHtcbiAgICAgICAgdGhpcy5fZW1pdEVycm9yKG5ldyBFcnJvcihcInR1czogbm8gZW5kcG9pbnQgcHJvdmlkZWRcIikpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBzb3VyY2UgPSB0aGlzLl9zb3VyY2UgPSAoMCwgX3NvdXJjZS5nZXRTb3VyY2UpKGZpbGUsIHRoaXMub3B0aW9ucy5jaHVua1NpemUpO1xuXG4gICAgICAvLyBGaXJzdGx5LCBjaGVjayBpZiB0aGUgY2FsbGVyIGhhcyBzdXBwbGllZCBhIG1hbnVhbCB1cGxvYWQgc2l6ZSBvciBlbHNlXG4gICAgICAvLyB3ZSB3aWxsIHVzZSB0aGUgY2FsY3VsYXRlZCBzaXplIGJ5IHRoZSBzb3VyY2Ugb2JqZWN0LlxuICAgICAgaWYgKHRoaXMub3B0aW9ucy51cGxvYWRTaXplICE9IG51bGwpIHtcbiAgICAgICAgdmFyIHNpemUgPSArdGhpcy5vcHRpb25zLnVwbG9hZFNpemU7XG4gICAgICAgIGlmIChpc05hTihzaXplKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInR1czogY2Fubm90IGNvbnZlcnQgYHVwbG9hZFNpemVgIG9wdGlvbiBpbnRvIGEgbnVtYmVyXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fc2l6ZSA9IHNpemU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgc2l6ZSA9IHNvdXJjZS5zaXplO1xuXG4gICAgICAgIC8vIFRoZSBzaXplIHByb3BlcnR5IHdpbGwgYmUgbnVsbCBpZiB3ZSBjYW5ub3QgY2FsY3VsYXRlIHRoZSBmaWxlJ3Mgc2l6ZSxcbiAgICAgICAgLy8gZm9yIGV4YW1wbGUgaWYgeW91IGhhbmRsZSBhIHN0cmVhbS5cbiAgICAgICAgaWYgKHNpemUgPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInR1czogY2Fubm90IGF1dG9tYXRpY2FsbHkgZGVyaXZlIHVwbG9hZCdzIHNpemUgZnJvbSBpbnB1dCBhbmQgbXVzdCBiZSBzcGVjaWZpZWQgbWFudWFsbHkgdXNpbmcgdGhlIGB1cGxvYWRTaXplYCBvcHRpb25cIik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9zaXplID0gc2l6ZTtcbiAgICAgIH1cblxuICAgICAgdmFyIHJldHJ5RGVsYXlzID0gdGhpcy5vcHRpb25zLnJldHJ5RGVsYXlzO1xuICAgICAgaWYgKHJldHJ5RGVsYXlzICE9IG51bGwpIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChyZXRyeURlbGF5cykgIT09IFwiW29iamVjdCBBcnJheV1cIikge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInR1czogdGhlIGByZXRyeURlbGF5c2Agb3B0aW9uIG11c3QgZWl0aGVyIGJlIGFuIGFycmF5IG9yIG51bGxcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBlcnJvckNhbGxiYWNrID0gX3RoaXMub3B0aW9ucy5vbkVycm9yO1xuICAgICAgICAgICAgX3RoaXMub3B0aW9ucy5vbkVycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAvLyBSZXN0b3JlIHRoZSBvcmlnaW5hbCBlcnJvciBjYWxsYmFjayB3aGljaCBtYXkgaGF2ZSBiZWVuIHNldC5cbiAgICAgICAgICAgICAgX3RoaXMub3B0aW9ucy5vbkVycm9yID0gZXJyb3JDYWxsYmFjaztcblxuICAgICAgICAgICAgICAvLyBXZSB3aWxsIHJlc2V0IHRoZSBhdHRlbXB0IGNvdW50ZXIgaWZcbiAgICAgICAgICAgICAgLy8gLSB3ZSB3ZXJlIGFscmVhZHkgYWJsZSB0byBjb25uZWN0IHRvIHRoZSBzZXJ2ZXIgKG9mZnNldCAhPSBudWxsKSBhbmRcbiAgICAgICAgICAgICAgLy8gLSB3ZSB3ZXJlIGFibGUgdG8gdXBsb2FkIGEgc21hbGwgY2h1bmsgb2YgZGF0YSB0byB0aGUgc2VydmVyXG4gICAgICAgICAgICAgIHZhciBzaG91bGRSZXNldERlbGF5cyA9IF90aGlzLl9vZmZzZXQgIT0gbnVsbCAmJiBfdGhpcy5fb2Zmc2V0ID4gX3RoaXMuX29mZnNldEJlZm9yZVJldHJ5O1xuICAgICAgICAgICAgICBpZiAoc2hvdWxkUmVzZXREZWxheXMpIHtcbiAgICAgICAgICAgICAgICBfdGhpcy5fcmV0cnlBdHRlbXB0ID0gMDtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHZhciBpc09ubGluZSA9IHRydWU7XG4gICAgICAgICAgICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIFwibmF2aWdhdG9yXCIgaW4gd2luZG93ICYmIHdpbmRvdy5uYXZpZ2F0b3Iub25MaW5lID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIGlzT25saW5lID0gZmFsc2U7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAvLyBXZSBvbmx5IGF0dGVtcHQgYSByZXRyeSBpZlxuICAgICAgICAgICAgICAvLyAtIHdlIGRpZG4ndCBleGNlZWQgdGhlIG1heGl1bSBudW1iZXIgb2YgcmV0cmllcywgeWV0LCBhbmRcbiAgICAgICAgICAgICAgLy8gLSB0aGlzIGVycm9yIHdhcyBjYXVzZWQgYnkgYSByZXF1ZXN0IG9yIGl0J3MgcmVzcG9uc2UgYW5kXG4gICAgICAgICAgICAgIC8vIC0gdGhlIGVycm9yIGlzIG5vdCBhIGNsaWVudCBlcnJvciAoc3RhdHVzIDR4eCkgYW5kXG4gICAgICAgICAgICAgIC8vIC0gdGhlIGJyb3dzZXIgZG9lcyBub3QgaW5kaWNhdGUgdGhhdCB3ZSBhcmUgb2ZmbGluZVxuICAgICAgICAgICAgICB2YXIgc2hvdWxkUmV0cnkgPSBfdGhpcy5fcmV0cnlBdHRlbXB0IDwgcmV0cnlEZWxheXMubGVuZ3RoICYmIGVyci5vcmlnaW5hbFJlcXVlc3QgIT0gbnVsbCAmJiAhaW5TdGF0dXNDYXRlZ29yeShlcnIub3JpZ2luYWxSZXF1ZXN0LnN0YXR1cywgNDAwKSAmJiBpc09ubGluZTtcblxuICAgICAgICAgICAgICBpZiAoIXNob3VsZFJldHJ5KSB7XG4gICAgICAgICAgICAgICAgX3RoaXMuX2VtaXRFcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHZhciBkZWxheSA9IHJldHJ5RGVsYXlzW190aGlzLl9yZXRyeUF0dGVtcHQrK107XG5cbiAgICAgICAgICAgICAgX3RoaXMuX29mZnNldEJlZm9yZVJldHJ5ID0gX3RoaXMuX29mZnNldDtcbiAgICAgICAgICAgICAgX3RoaXMub3B0aW9ucy51cGxvYWRVcmwgPSBfdGhpcy51cmw7XG5cbiAgICAgICAgICAgICAgX3RoaXMuX3JldHJ5VGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIF90aGlzLnN0YXJ0KCk7XG4gICAgICAgICAgICAgIH0sIGRlbGF5KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSkoKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBSZXNldCB0aGUgYWJvcnRlZCBmbGFnIHdoZW4gdGhlIHVwbG9hZCBpcyBzdGFydGVkIG9yIGVsc2UgdGhlXG4gICAgICAvLyBfc3RhcnRVcGxvYWQgd2lsbCBzdG9wIGJlZm9yZSBzZW5kaW5nIGEgcmVxdWVzdCBpZiB0aGUgdXBsb2FkIGhhcyBiZWVuXG4gICAgICAvLyBhYm9ydGVkIHByZXZpb3VzbHkuXG4gICAgICB0aGlzLl9hYm9ydGVkID0gZmFsc2U7XG5cbiAgICAgIC8vIFRoZSB1cGxvYWQgaGFkIGJlZW4gc3RhcnRlZCBwcmV2aW91c2x5IGFuZCB3ZSBzaG91bGQgcmV1c2UgdGhpcyBVUkwuXG4gICAgICBpZiAodGhpcy51cmwgIT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9yZXN1bWVVcGxvYWQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBBIFVSTCBoYXMgbWFudWFsbHkgYmVlbiBzcGVjaWZpZWQsIHNvIHdlIHRyeSB0byByZXN1bWVcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMudXBsb2FkVXJsICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy51cmwgPSB0aGlzLm9wdGlvbnMudXBsb2FkVXJsO1xuICAgICAgICB0aGlzLl9yZXN1bWVVcGxvYWQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBUcnkgdG8gZmluZCB0aGUgZW5kcG9pbnQgZm9yIHRoZSBmaWxlIGluIHRoZSBzdG9yYWdlXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnJlc3VtZSkge1xuICAgICAgICB0aGlzLl9maW5nZXJwcmludCA9IHRoaXMub3B0aW9ucy5maW5nZXJwcmludChmaWxlKTtcbiAgICAgICAgdmFyIHJlc3VtZWRVcmwgPSBTdG9yYWdlLmdldEl0ZW0odGhpcy5fZmluZ2VycHJpbnQpO1xuXG4gICAgICAgIGlmIChyZXN1bWVkVXJsICE9IG51bGwpIHtcbiAgICAgICAgICB0aGlzLnVybCA9IHJlc3VtZWRVcmw7XG4gICAgICAgICAgdGhpcy5fcmVzdW1lVXBsb2FkKCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEFuIHVwbG9hZCBoYXMgbm90IHN0YXJ0ZWQgZm9yIHRoZSBmaWxlIHlldCwgc28gd2Ugc3RhcnQgYSBuZXcgb25lXG4gICAgICB0aGlzLl9jcmVhdGVVcGxvYWQoKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwiYWJvcnRcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gYWJvcnQoKSB7XG4gICAgICBpZiAodGhpcy5feGhyICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuX3hoci5hYm9ydCgpO1xuICAgICAgICB0aGlzLl9zb3VyY2UuY2xvc2UoKTtcbiAgICAgICAgdGhpcy5fYWJvcnRlZCA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9yZXRyeVRpbWVvdXQgIT0gbnVsbCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5fcmV0cnlUaW1lb3V0KTtcbiAgICAgICAgdGhpcy5fcmV0cnlUaW1lb3V0ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwiX2VtaXRYaHJFcnJvclwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBfZW1pdFhockVycm9yKHhociwgZXJyLCBjYXVzaW5nRXJyKSB7XG4gICAgICB0aGlzLl9lbWl0RXJyb3IobmV3IF9lcnJvcjIuZGVmYXVsdChlcnIsIGNhdXNpbmdFcnIsIHhocikpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJfZW1pdEVycm9yXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIF9lbWl0RXJyb3IoZXJyKSB7XG4gICAgICBpZiAodHlwZW9mIHRoaXMub3B0aW9ucy5vbkVycm9yID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zLm9uRXJyb3IoZXJyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwiX2VtaXRTdWNjZXNzXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIF9lbWl0U3VjY2VzcygpIHtcbiAgICAgIGlmICh0eXBlb2YgdGhpcy5vcHRpb25zLm9uU3VjY2VzcyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucy5vblN1Y2Nlc3MoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQdWJsaXNoZXMgbm90aWZpY2F0aW9uIHdoZW4gZGF0YSBoYXMgYmVlbiBzZW50IHRvIHRoZSBzZXJ2ZXIuIFRoaXNcbiAgICAgKiBkYXRhIG1heSBub3QgaGF2ZSBiZWVuIGFjY2VwdGVkIGJ5IHRoZSBzZXJ2ZXIgeWV0LlxuICAgICAqIEBwYXJhbSAge251bWJlcn0gYnl0ZXNTZW50ICBOdW1iZXIgb2YgYnl0ZXMgc2VudCB0byB0aGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSAge251bWJlcn0gYnl0ZXNUb3RhbCBUb3RhbCBudW1iZXIgb2YgYnl0ZXMgdG8gYmUgc2VudCB0byB0aGUgc2VydmVyLlxuICAgICAqL1xuXG4gIH0sIHtcbiAgICBrZXk6IFwiX2VtaXRQcm9ncmVzc1wiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBfZW1pdFByb2dyZXNzKGJ5dGVzU2VudCwgYnl0ZXNUb3RhbCkge1xuICAgICAgaWYgKHR5cGVvZiB0aGlzLm9wdGlvbnMub25Qcm9ncmVzcyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucy5vblByb2dyZXNzKGJ5dGVzU2VudCwgYnl0ZXNUb3RhbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHVibGlzaGVzIG5vdGlmaWNhdGlvbiB3aGVuIGEgY2h1bmsgb2YgZGF0YSBoYXMgYmVlbiBzZW50IHRvIHRoZSBzZXJ2ZXJcbiAgICAgKiBhbmQgYWNjZXB0ZWQgYnkgdGhlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0gIHtudW1iZXJ9IGNodW5rU2l6ZSAgU2l6ZSBvZiB0aGUgY2h1bmsgdGhhdCB3YXMgYWNjZXB0ZWQgYnkgdGhlXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlci5cbiAgICAgKiBAcGFyYW0gIHtudW1iZXJ9IGJ5dGVzQWNjZXB0ZWQgVG90YWwgbnVtYmVyIG9mIGJ5dGVzIHRoYXQgaGF2ZSBiZWVuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdGVkIGJ5IHRoZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtICB7bnVtYmVyfSBieXRlc1RvdGFsIFRvdGFsIG51bWJlciBvZiBieXRlcyB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gICAgICovXG5cbiAgfSwge1xuICAgIGtleTogXCJfZW1pdENodW5rQ29tcGxldGVcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gX2VtaXRDaHVua0NvbXBsZXRlKGNodW5rU2l6ZSwgYnl0ZXNBY2NlcHRlZCwgYnl0ZXNUb3RhbCkge1xuICAgICAgaWYgKHR5cGVvZiB0aGlzLm9wdGlvbnMub25DaHVua0NvbXBsZXRlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zLm9uQ2h1bmtDb21wbGV0ZShjaHVua1NpemUsIGJ5dGVzQWNjZXB0ZWQsIGJ5dGVzVG90YWwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldCB0aGUgaGVhZGVycyB1c2VkIGluIHRoZSByZXF1ZXN0IGFuZCB0aGUgd2l0aENyZWRlbnRpYWxzIHByb3BlcnR5XG4gICAgICogYXMgZGVmaW5lZCBpbiB0aGUgb3B0aW9uc1xuICAgICAqXG4gICAgICogQHBhcmFtIHtYTUxIdHRwUmVxdWVzdH0geGhyXG4gICAgICovXG5cbiAgfSwge1xuICAgIGtleTogXCJfc2V0dXBYSFJcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gX3NldHVwWEhSKHhocikge1xuICAgICAgdGhpcy5feGhyID0geGhyO1xuXG4gICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihcIlR1cy1SZXN1bWFibGVcIiwgXCIxLjAuMFwiKTtcbiAgICAgIHZhciBoZWFkZXJzID0gdGhpcy5vcHRpb25zLmhlYWRlcnM7XG5cbiAgICAgIGZvciAodmFyIG5hbWUgaW4gaGVhZGVycykge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCBoZWFkZXJzW25hbWVdKTtcbiAgICAgIH1cblxuICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IHRoaXMub3B0aW9ucy53aXRoQ3JlZGVudGlhbHM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgbmV3IHVwbG9hZCB1c2luZyB0aGUgY3JlYXRpb24gZXh0ZW5zaW9uIGJ5IHNlbmRpbmcgYSBQT1NUXG4gICAgICogcmVxdWVzdCB0byB0aGUgZW5kcG9pbnQuIEFmdGVyIHN1Y2Nlc3NmdWwgY3JlYXRpb24gdGhlIGZpbGUgd2lsbCBiZVxuICAgICAqIHVwbG9hZGVkXG4gICAgICpcbiAgICAgKiBAYXBpIHByaXZhdGVcbiAgICAgKi9cblxuICB9LCB7XG4gICAga2V5OiBcIl9jcmVhdGVVcGxvYWRcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gX2NyZWF0ZVVwbG9hZCgpIHtcbiAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICB2YXIgeGhyID0gKDAsIF9yZXF1ZXN0Lm5ld1JlcXVlc3QpKCk7XG4gICAgICB4aHIub3BlbihcIlBPU1RcIiwgdGhpcy5vcHRpb25zLmVuZHBvaW50LCB0cnVlKTtcblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFpblN0YXR1c0NhdGVnb3J5KHhoci5zdGF0dXMsIDIwMCkpIHtcbiAgICAgICAgICBfdGhpczIuX2VtaXRYaHJFcnJvcih4aHIsIG5ldyBFcnJvcihcInR1czogdW5leHBlY3RlZCByZXNwb25zZSB3aGlsZSBjcmVhdGluZyB1cGxvYWRcIikpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBsb2NhdGlvbiA9IHhoci5nZXRSZXNwb25zZUhlYWRlcihcIkxvY2F0aW9uXCIpO1xuICAgICAgICBpZiAobG9jYXRpb24gPT0gbnVsbCkge1xuICAgICAgICAgIF90aGlzMi5fZW1pdFhockVycm9yKHhociwgbmV3IEVycm9yKFwidHVzOiBpbnZhbGlkIG9yIG1pc3NpbmcgTG9jYXRpb24gaGVhZGVyXCIpKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBfdGhpczIudXJsID0gKDAsIF9yZXF1ZXN0LnJlc29sdmVVcmwpKF90aGlzMi5vcHRpb25zLmVuZHBvaW50LCBsb2NhdGlvbik7XG5cbiAgICAgICAgaWYgKF90aGlzMi5vcHRpb25zLnJlc3VtZSkge1xuICAgICAgICAgIFN0b3JhZ2Uuc2V0SXRlbShfdGhpczIuX2ZpbmdlcnByaW50LCBfdGhpczIudXJsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIF90aGlzMi5fb2Zmc2V0ID0gMDtcbiAgICAgICAgX3RoaXMyLl9zdGFydFVwbG9hZCgpO1xuICAgICAgfTtcblxuICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIF90aGlzMi5fZW1pdFhockVycm9yKHhociwgbmV3IEVycm9yKFwidHVzOiBmYWlsZWQgdG8gY3JlYXRlIHVwbG9hZFwiKSwgZXJyKTtcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuX3NldHVwWEhSKHhocik7XG4gICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihcIlVwbG9hZC1MZW5ndGhcIiwgdGhpcy5fc2l6ZSk7XG5cbiAgICAgIC8vIEFkZCBtZXRhZGF0YSBpZiB2YWx1ZXMgaGF2ZSBiZWVuIGFkZGVkXG4gICAgICB2YXIgbWV0YWRhdGEgPSBlbmNvZGVNZXRhZGF0YSh0aGlzLm9wdGlvbnMubWV0YWRhdGEpO1xuICAgICAgaWYgKG1ldGFkYXRhICE9PSBcIlwiKSB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKFwiVXBsb2FkLU1ldGFkYXRhXCIsIG1ldGFkYXRhKTtcbiAgICAgIH1cblxuICAgICAgeGhyLnNlbmQobnVsbCk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiBUcnkgdG8gcmVzdW1lIGFuIGV4aXN0aW5nIHVwbG9hZC4gRmlyc3QgYSBIRUFEIHJlcXVlc3Qgd2lsbCBiZSBzZW50XG4gICAgICogdG8gcmV0cmlldmUgdGhlIG9mZnNldC4gSWYgdGhlIHJlcXVlc3QgZmFpbHMgYSBuZXcgdXBsb2FkIHdpbGwgYmVcbiAgICAgKiBjcmVhdGVkLiBJbiB0aGUgY2FzZSBvZiBhIHN1Y2Nlc3NmdWwgcmVzcG9uc2UgdGhlIGZpbGUgd2lsbCBiZSB1cGxvYWRlZC5cbiAgICAgKlxuICAgICAqIEBhcGkgcHJpdmF0ZVxuICAgICAqL1xuXG4gIH0sIHtcbiAgICBrZXk6IFwiX3Jlc3VtZVVwbG9hZFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBfcmVzdW1lVXBsb2FkKCkge1xuICAgICAgdmFyIF90aGlzMyA9IHRoaXM7XG5cbiAgICAgIHZhciB4aHIgPSAoMCwgX3JlcXVlc3QubmV3UmVxdWVzdCkoKTtcbiAgICAgIHhoci5vcGVuKFwiSEVBRFwiLCB0aGlzLnVybCwgdHJ1ZSk7XG5cbiAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghaW5TdGF0dXNDYXRlZ29yeSh4aHIuc3RhdHVzLCAyMDApKSB7XG4gICAgICAgICAgaWYgKF90aGlzMy5vcHRpb25zLnJlc3VtZSAmJiBpblN0YXR1c0NhdGVnb3J5KHhoci5zdGF0dXMsIDQwMCkpIHtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBzdG9yZWQgZmluZ2VycHJpbnQgYW5kIGNvcnJlc3BvbmRpbmcgZW5kcG9pbnQsXG4gICAgICAgICAgICAvLyBvbiBjbGllbnQgZXJyb3JzIHNpbmNlIHRoZSBmaWxlIGNhbiBub3QgYmUgZm91bmRcbiAgICAgICAgICAgIFN0b3JhZ2UucmVtb3ZlSXRlbShfdGhpczMuX2ZpbmdlcnByaW50KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBJZiB0aGUgdXBsb2FkIGlzIGxvY2tlZCAoaW5kaWNhdGVkIGJ5IHRoZSA0MjMgTG9ja2VkIHN0YXR1cyBjb2RlKSwgd2VcbiAgICAgICAgICAvLyBlbWl0IGFuIGVycm9yIGluc3RlYWQgb2YgZGlyZWN0bHkgc3RhcnRpbmcgYSBuZXcgdXBsb2FkLiBUaGlzIHdheSB0aGVcbiAgICAgICAgICAvLyByZXRyeSBsb2dpYyBjYW4gY2F0Y2ggdGhlIGVycm9yIGFuZCB3aWxsIHJldHJ5IHRoZSB1cGxvYWQuIEFuIHVwbG9hZFxuICAgICAgICAgIC8vIGlzIHVzdWFsbHkgbG9ja2VkIGZvciBhIHNob3J0IHBlcmlvZCBvZiB0aW1lIGFuZCB3aWxsIGJlIGF2YWlsYWJsZVxuICAgICAgICAgIC8vIGFmdGVyd2FyZHMuXG4gICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQyMykge1xuICAgICAgICAgICAgX3RoaXMzLl9lbWl0WGhyRXJyb3IoeGhyLCBuZXcgRXJyb3IoXCJ0dXM6IHVwbG9hZCBpcyBjdXJyZW50bHkgbG9ja2VkOyByZXRyeSBsYXRlclwiKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gVHJ5IHRvIGNyZWF0ZSBhIG5ldyB1cGxvYWRcbiAgICAgICAgICBfdGhpczMudXJsID0gbnVsbDtcbiAgICAgICAgICBfdGhpczMuX2NyZWF0ZVVwbG9hZCgpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBvZmZzZXQgPSBwYXJzZUludCh4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoXCJVcGxvYWQtT2Zmc2V0XCIpLCAxMCk7XG4gICAgICAgIGlmIChpc05hTihvZmZzZXQpKSB7XG4gICAgICAgICAgX3RoaXMzLl9lbWl0WGhyRXJyb3IoeGhyLCBuZXcgRXJyb3IoXCJ0dXM6IGludmFsaWQgb3IgbWlzc2luZyBvZmZzZXQgdmFsdWVcIikpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBsZW5ndGggPSBwYXJzZUludCh4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoXCJVcGxvYWQtTGVuZ3RoXCIpLCAxMCk7XG4gICAgICAgIGlmIChpc05hTihsZW5ndGgpKSB7XG4gICAgICAgICAgX3RoaXMzLl9lbWl0WGhyRXJyb3IoeGhyLCBuZXcgRXJyb3IoXCJ0dXM6IGludmFsaWQgb3IgbWlzc2luZyBsZW5ndGggdmFsdWVcIikpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwbG9hZCBoYXMgYWxyZWFkeSBiZWVuIGNvbXBsZXRlZCBhbmQgd2UgZG8gbm90IG5lZWQgdG8gc2VuZCBhZGRpdGlvbmFsXG4gICAgICAgIC8vIGRhdGEgdG8gdGhlIHNlcnZlclxuICAgICAgICBpZiAob2Zmc2V0ID09PSBsZW5ndGgpIHtcbiAgICAgICAgICBfdGhpczMuX2VtaXRQcm9ncmVzcyhsZW5ndGgsIGxlbmd0aCk7XG4gICAgICAgICAgX3RoaXMzLl9lbWl0U3VjY2VzcygpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIF90aGlzMy5fb2Zmc2V0ID0gb2Zmc2V0O1xuICAgICAgICBfdGhpczMuX3N0YXJ0VXBsb2FkKCk7XG4gICAgICB9O1xuXG4gICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgX3RoaXMzLl9lbWl0WGhyRXJyb3IoeGhyLCBuZXcgRXJyb3IoXCJ0dXM6IGZhaWxlZCB0byByZXN1bWUgdXBsb2FkXCIpLCBlcnIpO1xuICAgICAgfTtcblxuICAgICAgdGhpcy5fc2V0dXBYSFIoeGhyKTtcbiAgICAgIHhoci5zZW5kKG51bGwpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFN0YXJ0IHVwbG9hZGluZyB0aGUgZmlsZSB1c2luZyBQQVRDSCByZXF1ZXN0cy4gVGhlIGZpbGUgd2lsbCBiZSBkaXZpZGVkXG4gICAgICogaW50byBjaHVua3MgYXMgc3BlY2lmaWVkIGluIHRoZSBjaHVua1NpemUgb3B0aW9uLiBEdXJpbmcgdGhlIHVwbG9hZFxuICAgICAqIHRoZSBvblByb2dyZXNzIGV2ZW50IGhhbmRsZXIgbWF5IGJlIGludm9rZWQgbXVsdGlwbGUgdGltZXMuXG4gICAgICpcbiAgICAgKiBAYXBpIHByaXZhdGVcbiAgICAgKi9cblxuICB9LCB7XG4gICAga2V5OiBcIl9zdGFydFVwbG9hZFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBfc3RhcnRVcGxvYWQoKSB7XG4gICAgICB2YXIgX3RoaXM0ID0gdGhpcztcblxuICAgICAgLy8gSWYgdGhlIHVwbG9hZCBoYXMgYmVlbiBhYm9ydGVkLCB3ZSB3aWxsIG5vdCBzZW5kIHRoZSBuZXh0IFBBVENIIHJlcXVlc3QuXG4gICAgICAvLyBUaGlzIGlzIGltcG9ydGFudCBpZiB0aGUgYWJvcnQgbWV0aG9kIHdhcyBjYWxsZWQgZHVyaW5nIGEgY2FsbGJhY2ssIHN1Y2hcbiAgICAgIC8vIGFzIG9uQ2h1bmtDb21wbGV0ZSBvciBvblByb2dyZXNzLlxuICAgICAgaWYgKHRoaXMuX2Fib3J0ZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgeGhyID0gKDAsIF9yZXF1ZXN0Lm5ld1JlcXVlc3QpKCk7XG5cbiAgICAgIC8vIFNvbWUgYnJvd3NlciBhbmQgc2VydmVycyBtYXkgbm90IHN1cHBvcnQgdGhlIFBBVENIIG1ldGhvZC4gRm9yIHRob3NlXG4gICAgICAvLyBjYXNlcywgeW91IGNhbiB0ZWxsIHR1cy1qcy1jbGllbnQgdG8gdXNlIGEgUE9TVCByZXF1ZXN0IHdpdGggdGhlXG4gICAgICAvLyBYLUhUVFAtTWV0aG9kLU92ZXJyaWRlIGhlYWRlciBmb3Igc2ltdWxhdGluZyBhIFBBVENIIHJlcXVlc3QuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJyaWRlUGF0Y2hNZXRob2QpIHtcbiAgICAgICAgeGhyLm9wZW4oXCJQT1NUXCIsIHRoaXMudXJsLCB0cnVlKTtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoXCJYLUhUVFAtTWV0aG9kLU92ZXJyaWRlXCIsIFwiUEFUQ0hcIik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB4aHIub3BlbihcIlBBVENIXCIsIHRoaXMudXJsLCB0cnVlKTtcbiAgICAgIH1cblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFpblN0YXR1c0NhdGVnb3J5KHhoci5zdGF0dXMsIDIwMCkpIHtcbiAgICAgICAgICBfdGhpczQuX2VtaXRYaHJFcnJvcih4aHIsIG5ldyBFcnJvcihcInR1czogdW5leHBlY3RlZCByZXNwb25zZSB3aGlsZSB1cGxvYWRpbmcgY2h1bmtcIikpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBvZmZzZXQgPSBwYXJzZUludCh4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoXCJVcGxvYWQtT2Zmc2V0XCIpLCAxMCk7XG4gICAgICAgIGlmIChpc05hTihvZmZzZXQpKSB7XG4gICAgICAgICAgX3RoaXM0Ll9lbWl0WGhyRXJyb3IoeGhyLCBuZXcgRXJyb3IoXCJ0dXM6IGludmFsaWQgb3IgbWlzc2luZyBvZmZzZXQgdmFsdWVcIikpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIF90aGlzNC5fZW1pdFByb2dyZXNzKG9mZnNldCwgX3RoaXM0Ll9zaXplKTtcbiAgICAgICAgX3RoaXM0Ll9lbWl0Q2h1bmtDb21wbGV0ZShvZmZzZXQgLSBfdGhpczQuX29mZnNldCwgb2Zmc2V0LCBfdGhpczQuX3NpemUpO1xuXG4gICAgICAgIF90aGlzNC5fb2Zmc2V0ID0gb2Zmc2V0O1xuXG4gICAgICAgIGlmIChvZmZzZXQgPT0gX3RoaXM0Ll9zaXplKSB7XG4gICAgICAgICAgLy8gWWF5LCBmaW5hbGx5IGRvbmUgOilcbiAgICAgICAgICBfdGhpczQuX2VtaXRTdWNjZXNzKCk7XG4gICAgICAgICAgX3RoaXM0Ll9zb3VyY2UuY2xvc2UoKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBfdGhpczQuX3N0YXJ0VXBsb2FkKCk7XG4gICAgICB9O1xuXG4gICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgLy8gRG9uJ3QgZW1pdCBhbiBlcnJvciBpZiB0aGUgdXBsb2FkIHdhcyBhYm9ydGVkIG1hbnVhbGx5XG4gICAgICAgIGlmIChfdGhpczQuX2Fib3J0ZWQpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBfdGhpczQuX2VtaXRYaHJFcnJvcih4aHIsIG5ldyBFcnJvcihcInR1czogZmFpbGVkIHRvIHVwbG9hZCBjaHVuayBhdCBvZmZzZXQgXCIgKyBfdGhpczQuX29mZnNldCksIGVycik7XG4gICAgICB9O1xuXG4gICAgICAvLyBUZXN0IHN1cHBvcnQgZm9yIHByb2dyZXNzIGV2ZW50cyBiZWZvcmUgYXR0YWNoaW5nIGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICBpZiAoXCJ1cGxvYWRcIiBpbiB4aHIpIHtcbiAgICAgICAgeGhyLnVwbG9hZC5vbnByb2dyZXNzID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICBpZiAoIWUubGVuZ3RoQ29tcHV0YWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIF90aGlzNC5fZW1pdFByb2dyZXNzKHN0YXJ0ICsgZS5sb2FkZWQsIF90aGlzNC5fc2l6ZSk7XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3NldHVwWEhSKHhocik7XG5cbiAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKFwiVXBsb2FkLU9mZnNldFwiLCB0aGlzLl9vZmZzZXQpO1xuICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9vZmZzZXQrb2N0ZXQtc3RyZWFtXCIpO1xuXG4gICAgICB2YXIgc3RhcnQgPSB0aGlzLl9vZmZzZXQ7XG4gICAgICB2YXIgZW5kID0gdGhpcy5fb2Zmc2V0ICsgdGhpcy5vcHRpb25zLmNodW5rU2l6ZTtcblxuICAgICAgLy8gVGhlIHNwZWNpZmllZCBjaHVua1NpemUgbWF5IGJlIEluZmluaXR5IG9yIHRoZSBjYWxjbHVhdGVkIGVuZCBwb3NpdGlvblxuICAgICAgLy8gbWF5IGV4Y2VlZCB0aGUgZmlsZSdzIHNpemUuIEluIGJvdGggY2FzZXMsIHdlIGxpbWl0IHRoZSBlbmQgcG9zaXRpb24gdG9cbiAgICAgIC8vIHRoZSBpbnB1dCdzIHRvdGFsIHNpemUgZm9yIHNpbXBsZXIgY2FsY3VsYXRpb25zIGFuZCBjb3JyZWN0bmVzcy5cbiAgICAgIGlmIChlbmQgPT09IEluZmluaXR5IHx8IGVuZCA+IHRoaXMuX3NpemUpIHtcbiAgICAgICAgZW5kID0gdGhpcy5fc2l6ZTtcbiAgICAgIH1cblxuICAgICAgeGhyLnNlbmQodGhpcy5fc291cmNlLnNsaWNlKHN0YXJ0LCBlbmQpKTtcblxuICAgICAgLy8gRW1pdCBhbiBwcm9ncmVzcyBldmVudCB3aGVuIGEgbmV3IGNodW5rIGJlZ2lucyBiZWluZyB1cGxvYWRlZC5cbiAgICAgIHRoaXMuX2VtaXRQcm9ncmVzcyh0aGlzLl9vZmZzZXQsIHRoaXMuX3NpemUpO1xuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBVcGxvYWQ7XG59KCk7XG5cbmZ1bmN0aW9uIGVuY29kZU1ldGFkYXRhKG1ldGFkYXRhKSB7XG4gIGlmICghQmFzZTY0LmlzU3VwcG9ydGVkKSB7XG4gICAgcmV0dXJuIFwiXCI7XG4gIH1cblxuICB2YXIgZW5jb2RlZCA9IFtdO1xuXG4gIGZvciAodmFyIGtleSBpbiBtZXRhZGF0YSkge1xuICAgIGVuY29kZWQucHVzaChrZXkgKyBcIiBcIiArIEJhc2U2NC5lbmNvZGUobWV0YWRhdGFba2V5XSkpO1xuICB9XG5cbiAgcmV0dXJuIGVuY29kZWQuam9pbihcIixcIik7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSBnaXZlbiBzdGF0dXMgaXMgaW4gdGhlIHJhbmdlIG9mIHRoZSBleHBlY3RlZCBjYXRlZ29yeS5cbiAqIEZvciBleGFtcGxlLCBvbmx5IGEgc3RhdHVzIGJldHdlZW4gMjAwIGFuZCAyOTkgd2lsbCBzYXRpc2Z5IHRoZSBjYXRlZ29yeSAyMDAuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGluU3RhdHVzQ2F0ZWdvcnkoc3RhdHVzLCBjYXRlZ29yeSkge1xuICByZXR1cm4gc3RhdHVzID49IGNhdGVnb3J5ICYmIHN0YXR1cyA8IGNhdGVnb3J5ICsgMTAwO1xufVxuXG5VcGxvYWQuZGVmYXVsdE9wdGlvbnMgPSBkZWZhdWx0T3B0aW9ucztcblxuZXhwb3J0cy5kZWZhdWx0ID0gVXBsb2FkOyIsIihmdW5jdGlvbihzZWxmKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICBpZiAoc2VsZi5mZXRjaCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIHN1cHBvcnQgPSB7XG4gICAgc2VhcmNoUGFyYW1zOiAnVVJMU2VhcmNoUGFyYW1zJyBpbiBzZWxmLFxuICAgIGl0ZXJhYmxlOiAnU3ltYm9sJyBpbiBzZWxmICYmICdpdGVyYXRvcicgaW4gU3ltYm9sLFxuICAgIGJsb2I6ICdGaWxlUmVhZGVyJyBpbiBzZWxmICYmICdCbG9iJyBpbiBzZWxmICYmIChmdW5jdGlvbigpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG5ldyBCbG9iKClcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9KSgpLFxuICAgIGZvcm1EYXRhOiAnRm9ybURhdGEnIGluIHNlbGYsXG4gICAgYXJyYXlCdWZmZXI6ICdBcnJheUJ1ZmZlcicgaW4gc2VsZlxuICB9XG5cbiAgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIpIHtcbiAgICB2YXIgdmlld0NsYXNzZXMgPSBbXG4gICAgICAnW29iamVjdCBJbnQ4QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQ4QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQ4Q2xhbXBlZEFycmF5XScsXG4gICAgICAnW29iamVjdCBJbnQxNkFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50MTZBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgSW50MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgRmxvYXQ2NEFycmF5XSdcbiAgICBdXG5cbiAgICB2YXIgaXNEYXRhVmlldyA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9iaiAmJiBEYXRhVmlldy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihvYmopXG4gICAgfVxuXG4gICAgdmFyIGlzQXJyYXlCdWZmZXJWaWV3ID0gQXJyYXlCdWZmZXIuaXNWaWV3IHx8IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9iaiAmJiB2aWV3Q2xhc3Nlcy5pbmRleE9mKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopKSA+IC0xXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTmFtZShuYW1lKSB7XG4gICAgaWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgbmFtZSA9IFN0cmluZyhuYW1lKVxuICAgIH1cbiAgICBpZiAoL1teYS16MC05XFwtIyQlJicqKy5cXF5fYHx+XS9pLnRlc3QobmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgY2hhcmFjdGVyIGluIGhlYWRlciBmaWVsZCBuYW1lJylcbiAgICB9XG4gICAgcmV0dXJuIG5hbWUudG9Mb3dlckNhc2UoKVxuICB9XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplVmFsdWUodmFsdWUpIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgdmFsdWUgPSBTdHJpbmcodmFsdWUpXG4gICAgfVxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgLy8gQnVpbGQgYSBkZXN0cnVjdGl2ZSBpdGVyYXRvciBmb3IgdGhlIHZhbHVlIGxpc3RcbiAgZnVuY3Rpb24gaXRlcmF0b3JGb3IoaXRlbXMpIHtcbiAgICB2YXIgaXRlcmF0b3IgPSB7XG4gICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gaXRlbXMuc2hpZnQoKVxuICAgICAgICByZXR1cm4ge2RvbmU6IHZhbHVlID09PSB1bmRlZmluZWQsIHZhbHVlOiB2YWx1ZX1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5pdGVyYWJsZSkge1xuICAgICAgaXRlcmF0b3JbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gaXRlcmF0b3JcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaXRlcmF0b3JcbiAgfVxuXG4gIGZ1bmN0aW9uIEhlYWRlcnMoaGVhZGVycykge1xuICAgIHRoaXMubWFwID0ge31cblxuICAgIGlmIChoZWFkZXJzIGluc3RhbmNlb2YgSGVhZGVycykge1xuICAgICAgaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKG5hbWUsIHZhbHVlKVxuICAgICAgfSwgdGhpcylcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoaGVhZGVycykpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbihoZWFkZXIpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQoaGVhZGVyWzBdLCBoZWFkZXJbMV0pXG4gICAgICB9LCB0aGlzKVxuICAgIH0gZWxzZSBpZiAoaGVhZGVycykge1xuICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoaGVhZGVycykuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKG5hbWUsIGhlYWRlcnNbbmFtZV0pXG4gICAgICB9LCB0aGlzKVxuICAgIH1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgbmFtZSA9IG5vcm1hbGl6ZU5hbWUobmFtZSlcbiAgICB2YWx1ZSA9IG5vcm1hbGl6ZVZhbHVlKHZhbHVlKVxuICAgIHZhciBvbGRWYWx1ZSA9IHRoaXMubWFwW25hbWVdXG4gICAgdGhpcy5tYXBbbmFtZV0gPSBvbGRWYWx1ZSA/IG9sZFZhbHVlKycsJyt2YWx1ZSA6IHZhbHVlXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgbmFtZSA9IG5vcm1hbGl6ZU5hbWUobmFtZSlcbiAgICByZXR1cm4gdGhpcy5oYXMobmFtZSkgPyB0aGlzLm1hcFtuYW1lXSA6IG51bGxcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAuaGFzT3duUHJvcGVydHkobm9ybWFsaXplTmFtZShuYW1lKSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV0gPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIGZvciAodmFyIG5hbWUgaW4gdGhpcy5tYXApIHtcbiAgICAgIGlmICh0aGlzLm1hcC5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHRoaXMubWFwW25hbWVdLCBuYW1lLCB0aGlzKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkgeyBpdGVtcy5wdXNoKG5hbWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUudmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHsgaXRlbXMucHVzaCh2YWx1ZSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChbbmFtZSwgdmFsdWVdKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgSGVhZGVycy5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXSA9IEhlYWRlcnMucHJvdG90eXBlLmVudHJpZXNcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnN1bWVkKGJvZHkpIHtcbiAgICBpZiAoYm9keS5ib2R5VXNlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpKVxuICAgIH1cbiAgICBib2R5LmJvZHlVc2VkID0gdHJ1ZVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVJlYWRlclJlYWR5KHJlYWRlcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KVxuICAgICAgfVxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc0FycmF5QnVmZmVyKGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHZhciBwcm9taXNlID0gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoYmxvYilcbiAgICByZXR1cm4gcHJvbWlzZVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc1RleHQoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgdmFyIHByb21pc2UgPSBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICAgIHJlYWRlci5yZWFkQXNUZXh0KGJsb2IpXG4gICAgcmV0dXJuIHByb21pc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRBcnJheUJ1ZmZlckFzVGV4dChidWYpIHtcbiAgICB2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1ZilcbiAgICB2YXIgY2hhcnMgPSBuZXcgQXJyYXkodmlldy5sZW5ndGgpXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZpZXcubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNoYXJzW2ldID0gU3RyaW5nLmZyb21DaGFyQ29kZSh2aWV3W2ldKVxuICAgIH1cbiAgICByZXR1cm4gY2hhcnMuam9pbignJylcbiAgfVxuXG4gIGZ1bmN0aW9uIGJ1ZmZlckNsb25lKGJ1Zikge1xuICAgIGlmIChidWYuc2xpY2UpIHtcbiAgICAgIHJldHVybiBidWYuc2xpY2UoMClcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWYuYnl0ZUxlbmd0aClcbiAgICAgIHZpZXcuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZikpXG4gICAgICByZXR1cm4gdmlldy5idWZmZXJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBCb2R5KCkge1xuICAgIHRoaXMuYm9keVVzZWQgPSBmYWxzZVxuXG4gICAgdGhpcy5faW5pdEJvZHkgPSBmdW5jdGlvbihib2R5KSB7XG4gICAgICB0aGlzLl9ib2R5SW5pdCA9IGJvZHlcbiAgICAgIGlmICghYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5ibG9iICYmIEJsb2IucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUJsb2IgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5LnRvU3RyaW5nKClcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlciAmJiBzdXBwb3J0LmJsb2IgJiYgaXNEYXRhVmlldyhib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5QXJyYXlCdWZmZXIgPSBidWZmZXJDbG9uZShib2R5LmJ1ZmZlcilcbiAgICAgICAgLy8gSUUgMTAtMTEgY2FuJ3QgaGFuZGxlIGEgRGF0YVZpZXcgYm9keS5cbiAgICAgICAgdGhpcy5fYm9keUluaXQgPSBuZXcgQmxvYihbdGhpcy5fYm9keUFycmF5QnVmZmVyXSlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlciAmJiAoQXJyYXlCdWZmZXIucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkgfHwgaXNBcnJheUJ1ZmZlclZpZXcoYm9keSkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlBcnJheUJ1ZmZlciA9IGJ1ZmZlckNsb25lKGJvZHkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIEJvZHlJbml0IHR5cGUnKVxuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAndGV4dC9wbGFpbjtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QmxvYiAmJiB0aGlzLl9ib2R5QmxvYi50eXBlKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgdGhpcy5fYm9keUJsb2IudHlwZSlcbiAgICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkO2NoYXJzZXQ9VVRGLTgnKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuYmxvYikge1xuICAgICAgdGhpcy5ibG9iID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBCbG9iKFt0aGlzLl9ib2R5QXJyYXlCdWZmZXJdKSlcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgYmxvYicpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keVRleHRdKSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLmFycmF5QnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgICByZXR1cm4gY29uc3VtZWQodGhpcykgfHwgUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5ibG9iKCkudGhlbihyZWFkQmxvYkFzQXJyYXlCdWZmZXIpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICByZXR1cm4gcmVhZEJsb2JBc1RleHQodGhpcy5fYm9keUJsb2IpXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlYWRBcnJheUJ1ZmZlckFzVGV4dCh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpKVxuICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIHRleHQnKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5mb3JtRGF0YSkge1xuICAgICAgdGhpcy5mb3JtRGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihkZWNvZGUpXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5qc29uID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihKU09OLnBhcnNlKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvLyBIVFRQIG1ldGhvZHMgd2hvc2UgY2FwaXRhbGl6YXRpb24gc2hvdWxkIGJlIG5vcm1hbGl6ZWRcbiAgdmFyIG1ldGhvZHMgPSBbJ0RFTEVURScsICdHRVQnLCAnSEVBRCcsICdPUFRJT05TJywgJ1BPU1QnLCAnUFVUJ11cblxuICBmdW5jdGlvbiBub3JtYWxpemVNZXRob2QobWV0aG9kKSB7XG4gICAgdmFyIHVwY2FzZWQgPSBtZXRob2QudG9VcHBlckNhc2UoKVxuICAgIHJldHVybiAobWV0aG9kcy5pbmRleE9mKHVwY2FzZWQpID4gLTEpID8gdXBjYXNlZCA6IG1ldGhvZFxuICB9XG5cbiAgZnVuY3Rpb24gUmVxdWVzdChpbnB1dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gICAgdmFyIGJvZHkgPSBvcHRpb25zLmJvZHlcblxuICAgIGlmIChpbnB1dCBpbnN0YW5jZW9mIFJlcXVlc3QpIHtcbiAgICAgIGlmIChpbnB1dC5ib2R5VXNlZCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKVxuICAgICAgfVxuICAgICAgdGhpcy51cmwgPSBpbnB1dC51cmxcbiAgICAgIHRoaXMuY3JlZGVudGlhbHMgPSBpbnB1dC5jcmVkZW50aWFsc1xuICAgICAgaWYgKCFvcHRpb25zLmhlYWRlcnMpIHtcbiAgICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMoaW5wdXQuaGVhZGVycylcbiAgICAgIH1cbiAgICAgIHRoaXMubWV0aG9kID0gaW5wdXQubWV0aG9kXG4gICAgICB0aGlzLm1vZGUgPSBpbnB1dC5tb2RlXG4gICAgICBpZiAoIWJvZHkgJiYgaW5wdXQuX2JvZHlJbml0ICE9IG51bGwpIHtcbiAgICAgICAgYm9keSA9IGlucHV0Ll9ib2R5SW5pdFxuICAgICAgICBpbnB1dC5ib2R5VXNlZCA9IHRydWVcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy51cmwgPSBTdHJpbmcoaW5wdXQpXG4gICAgfVxuXG4gICAgdGhpcy5jcmVkZW50aWFscyA9IG9wdGlvbnMuY3JlZGVudGlhbHMgfHwgdGhpcy5jcmVkZW50aWFscyB8fCAnb21pdCdcbiAgICBpZiAob3B0aW9ucy5oZWFkZXJzIHx8ICF0aGlzLmhlYWRlcnMpIHtcbiAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycylcbiAgICB9XG4gICAgdGhpcy5tZXRob2QgPSBub3JtYWxpemVNZXRob2Qob3B0aW9ucy5tZXRob2QgfHwgdGhpcy5tZXRob2QgfHwgJ0dFVCcpXG4gICAgdGhpcy5tb2RlID0gb3B0aW9ucy5tb2RlIHx8IHRoaXMubW9kZSB8fCBudWxsXG4gICAgdGhpcy5yZWZlcnJlciA9IG51bGxcblxuICAgIGlmICgodGhpcy5tZXRob2QgPT09ICdHRVQnIHx8IHRoaXMubWV0aG9kID09PSAnSEVBRCcpICYmIGJvZHkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JvZHkgbm90IGFsbG93ZWQgZm9yIEdFVCBvciBIRUFEIHJlcXVlc3RzJylcbiAgICB9XG4gICAgdGhpcy5faW5pdEJvZHkoYm9keSlcbiAgfVxuXG4gIFJlcXVlc3QucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXF1ZXN0KHRoaXMsIHsgYm9keTogdGhpcy5fYm9keUluaXQgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlY29kZShib2R5KSB7XG4gICAgdmFyIGZvcm0gPSBuZXcgRm9ybURhdGEoKVxuICAgIGJvZHkudHJpbSgpLnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbihieXRlcykge1xuICAgICAgaWYgKGJ5dGVzKSB7XG4gICAgICAgIHZhciBzcGxpdCA9IGJ5dGVzLnNwbGl0KCc9JylcbiAgICAgICAgdmFyIG5hbWUgPSBzcGxpdC5zaGlmdCgpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJz0nKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICBmb3JtLmFwcGVuZChkZWNvZGVVUklDb21wb25lbnQobmFtZSksIGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gZm9ybVxuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VIZWFkZXJzKHJhd0hlYWRlcnMpIHtcbiAgICB2YXIgaGVhZGVycyA9IG5ldyBIZWFkZXJzKClcbiAgICByYXdIZWFkZXJzLnNwbGl0KC9cXHI/XFxuLykuZm9yRWFjaChmdW5jdGlvbihsaW5lKSB7XG4gICAgICB2YXIgcGFydHMgPSBsaW5lLnNwbGl0KCc6JylcbiAgICAgIHZhciBrZXkgPSBwYXJ0cy5zaGlmdCgpLnRyaW0oKVxuICAgICAgaWYgKGtleSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBwYXJ0cy5qb2luKCc6JykudHJpbSgpXG4gICAgICAgIGhlYWRlcnMuYXBwZW5kKGtleSwgdmFsdWUpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gaGVhZGVyc1xuICB9XG5cbiAgQm9keS5jYWxsKFJlcXVlc3QucHJvdG90eXBlKVxuXG4gIGZ1bmN0aW9uIFJlc3BvbnNlKGJvZHlJbml0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge31cbiAgICB9XG5cbiAgICB0aGlzLnR5cGUgPSAnZGVmYXVsdCdcbiAgICB0aGlzLnN0YXR1cyA9ICdzdGF0dXMnIGluIG9wdGlvbnMgPyBvcHRpb25zLnN0YXR1cyA6IDIwMFxuICAgIHRoaXMub2sgPSB0aGlzLnN0YXR1cyA+PSAyMDAgJiYgdGhpcy5zdGF0dXMgPCAzMDBcbiAgICB0aGlzLnN0YXR1c1RleHQgPSAnc3RhdHVzVGV4dCcgaW4gb3B0aW9ucyA/IG9wdGlvbnMuc3RhdHVzVGV4dCA6ICdPSydcbiAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgdGhpcy51cmwgPSBvcHRpb25zLnVybCB8fCAnJ1xuICAgIHRoaXMuX2luaXRCb2R5KGJvZHlJbml0KVxuICB9XG5cbiAgQm9keS5jYWxsKFJlc3BvbnNlLnByb3RvdHlwZSlcblxuICBSZXNwb25zZS5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKHRoaXMuX2JvZHlJbml0LCB7XG4gICAgICBzdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgc3RhdHVzVGV4dDogdGhpcy5zdGF0dXNUZXh0LFxuICAgICAgaGVhZGVyczogbmV3IEhlYWRlcnModGhpcy5oZWFkZXJzKSxcbiAgICAgIHVybDogdGhpcy51cmxcbiAgICB9KVxuICB9XG5cbiAgUmVzcG9uc2UuZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogMCwgc3RhdHVzVGV4dDogJyd9KVxuICAgIHJlc3BvbnNlLnR5cGUgPSAnZXJyb3InXG4gICAgcmV0dXJuIHJlc3BvbnNlXG4gIH1cblxuICB2YXIgcmVkaXJlY3RTdGF0dXNlcyA9IFszMDEsIDMwMiwgMzAzLCAzMDcsIDMwOF1cblxuICBSZXNwb25zZS5yZWRpcmVjdCA9IGZ1bmN0aW9uKHVybCwgc3RhdHVzKSB7XG4gICAgaWYgKHJlZGlyZWN0U3RhdHVzZXMuaW5kZXhPZihzdGF0dXMpID09PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgc3RhdHVzIGNvZGUnKVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogc3RhdHVzLCBoZWFkZXJzOiB7bG9jYXRpb246IHVybH19KVxuICB9XG5cbiAgc2VsZi5IZWFkZXJzID0gSGVhZGVyc1xuICBzZWxmLlJlcXVlc3QgPSBSZXF1ZXN0XG4gIHNlbGYuUmVzcG9uc2UgPSBSZXNwb25zZVxuXG4gIHNlbGYuZmV0Y2ggPSBmdW5jdGlvbihpbnB1dCwgaW5pdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFJlcXVlc3QoaW5wdXQsIGluaXQpXG4gICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICBzdGF0dXM6IHhoci5zdGF0dXMsXG4gICAgICAgICAgc3RhdHVzVGV4dDogeGhyLnN0YXR1c1RleHQsXG4gICAgICAgICAgaGVhZGVyczogcGFyc2VIZWFkZXJzKHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSB8fCAnJylcbiAgICAgICAgfVxuICAgICAgICBvcHRpb25zLnVybCA9ICdyZXNwb25zZVVSTCcgaW4geGhyID8geGhyLnJlc3BvbnNlVVJMIDogb3B0aW9ucy5oZWFkZXJzLmdldCgnWC1SZXF1ZXN0LVVSTCcpXG4gICAgICAgIHZhciBib2R5ID0gJ3Jlc3BvbnNlJyBpbiB4aHIgPyB4aHIucmVzcG9uc2UgOiB4aHIucmVzcG9uc2VUZXh0XG4gICAgICAgIHJlc29sdmUobmV3IFJlc3BvbnNlKGJvZHksIG9wdGlvbnMpKVxuICAgICAgfVxuXG4gICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vcGVuKHJlcXVlc3QubWV0aG9kLCByZXF1ZXN0LnVybCwgdHJ1ZSlcblxuICAgICAgaWYgKHJlcXVlc3QuY3JlZGVudGlhbHMgPT09ICdpbmNsdWRlJykge1xuICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZVxuICAgICAgfVxuXG4gICAgICBpZiAoJ3Jlc3BvbnNlVHlwZScgaW4geGhyICYmIHN1cHBvcnQuYmxvYikge1xuICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2Jsb2InXG4gICAgICB9XG5cbiAgICAgIHJlcXVlc3QuaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKG5hbWUsIHZhbHVlKVxuICAgICAgfSlcblxuICAgICAgeGhyLnNlbmQodHlwZW9mIHJlcXVlc3QuX2JvZHlJbml0ID09PSAndW5kZWZpbmVkJyA/IG51bGwgOiByZXF1ZXN0Ll9ib2R5SW5pdClcbiAgICB9KVxuICB9XG4gIHNlbGYuZmV0Y2gucG9seWZpbGwgPSB0cnVlXG59KSh0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgPyBzZWxmIDogdGhpcyk7XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyB3aWxkY2FyZFxuXG4gIFZlcnkgc2ltcGxlIHdpbGRjYXJkIG1hdGNoaW5nLCB3aGljaCBpcyBkZXNpZ25lZCB0byBwcm92aWRlIHRoZSBzYW1lXG4gIGZ1bmN0aW9uYWxpdHkgdGhhdCBpcyBmb3VuZCBpbiB0aGVcbiAgW2V2ZV0oaHR0cHM6Ly9naXRodWIuY29tL2Fkb2JlLXdlYnBsYXRmb3JtL2V2ZSkgZXZlbnRpbmcgbGlicmFyeS5cblxuICAjIyBVc2FnZVxuXG4gIEl0IHdvcmtzIHdpdGggc3RyaW5nczpcblxuICA8PDwgZXhhbXBsZXMvc3RyaW5ncy5qc1xuXG4gIEFycmF5czpcblxuICA8PDwgZXhhbXBsZXMvYXJyYXlzLmpzXG5cbiAgT2JqZWN0cyAobWF0Y2hpbmcgYWdhaW5zdCBrZXlzKTpcblxuICA8PDwgZXhhbXBsZXMvb2JqZWN0cy5qc1xuXG4gIFdoaWxlIHRoZSBsaWJyYXJ5IHdvcmtzIGluIE5vZGUsIGlmIHlvdSBhcmUgYXJlIGxvb2tpbmcgZm9yIGZpbGUtYmFzZWRcbiAgd2lsZGNhcmQgbWF0Y2hpbmcgdGhlbiB5b3Ugc2hvdWxkIGhhdmUgYSBsb29rIGF0OlxuXG4gIDxodHRwczovL2dpdGh1Yi5jb20vaXNhYWNzL25vZGUtZ2xvYj5cbioqL1xuXG5mdW5jdGlvbiBXaWxkY2FyZE1hdGNoZXIodGV4dCwgc2VwYXJhdG9yKSB7XG4gIHRoaXMudGV4dCA9IHRleHQgPSB0ZXh0IHx8ICcnO1xuICB0aGlzLmhhc1dpbGQgPSB+dGV4dC5pbmRleE9mKCcqJyk7XG4gIHRoaXMuc2VwYXJhdG9yID0gc2VwYXJhdG9yO1xuICB0aGlzLnBhcnRzID0gdGV4dC5zcGxpdChzZXBhcmF0b3IpO1xufVxuXG5XaWxkY2FyZE1hdGNoZXIucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgdmFyIG1hdGNoZXMgPSB0cnVlO1xuICB2YXIgcGFydHMgPSB0aGlzLnBhcnRzO1xuICB2YXIgaWk7XG4gIHZhciBwYXJ0c0NvdW50ID0gcGFydHMubGVuZ3RoO1xuICB2YXIgdGVzdFBhcnRzO1xuXG4gIGlmICh0eXBlb2YgaW5wdXQgPT0gJ3N0cmluZycgfHwgaW5wdXQgaW5zdGFuY2VvZiBTdHJpbmcpIHtcbiAgICBpZiAoIXRoaXMuaGFzV2lsZCAmJiB0aGlzLnRleHQgIT0gaW5wdXQpIHtcbiAgICAgIG1hdGNoZXMgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGVzdFBhcnRzID0gKGlucHV0IHx8ICcnKS5zcGxpdCh0aGlzLnNlcGFyYXRvcik7XG4gICAgICBmb3IgKGlpID0gMDsgbWF0Y2hlcyAmJiBpaSA8IHBhcnRzQ291bnQ7IGlpKyspIHtcbiAgICAgICAgaWYgKHBhcnRzW2lpXSA9PT0gJyonKSAge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKGlpIDwgdGVzdFBhcnRzLmxlbmd0aCkge1xuICAgICAgICAgIG1hdGNoZXMgPSBwYXJ0c1tpaV0gPT09IHRlc3RQYXJ0c1tpaV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbWF0Y2hlcyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIElmIG1hdGNoZXMsIHRoZW4gcmV0dXJuIHRoZSBjb21wb25lbnQgcGFydHNcbiAgICAgIG1hdGNoZXMgPSBtYXRjaGVzICYmIHRlc3RQYXJ0cztcbiAgICB9XG4gIH1cbiAgZWxzZSBpZiAodHlwZW9mIGlucHV0LnNwbGljZSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgbWF0Y2hlcyA9IFtdO1xuXG4gICAgZm9yIChpaSA9IGlucHV0Lmxlbmd0aDsgaWktLTsgKSB7XG4gICAgICBpZiAodGhpcy5tYXRjaChpbnB1dFtpaV0pKSB7XG4gICAgICAgIG1hdGNoZXNbbWF0Y2hlcy5sZW5ndGhdID0gaW5wdXRbaWldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBlbHNlIGlmICh0eXBlb2YgaW5wdXQgPT0gJ29iamVjdCcpIHtcbiAgICBtYXRjaGVzID0ge307XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gaW5wdXQpIHtcbiAgICAgIGlmICh0aGlzLm1hdGNoKGtleSkpIHtcbiAgICAgICAgbWF0Y2hlc1trZXldID0gaW5wdXRba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbWF0Y2hlcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGV4dCwgdGVzdCwgc2VwYXJhdG9yKSB7XG4gIHZhciBtYXRjaGVyID0gbmV3IFdpbGRjYXJkTWF0Y2hlcih0ZXh0LCBzZXBhcmF0b3IgfHwgL1tcXC9cXC5dLyk7XG4gIGlmICh0eXBlb2YgdGVzdCAhPSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBtYXRjaGVyLm1hdGNoKHRlc3QpO1xuICB9XG5cbiAgcmV0dXJuIG1hdGNoZXI7XG59O1xuIiwiY29uc3QgVXRpbHMgPSByZXF1aXJlKCcuLi9jb3JlL1V0aWxzJylcbmNvbnN0IFRyYW5zbGF0b3IgPSByZXF1aXJlKCcuLi9jb3JlL1RyYW5zbGF0b3InKVxuY29uc3QgZWUgPSByZXF1aXJlKCduYW1lc3BhY2UtZW1pdHRlcicpXG5jb25zdCBjdWlkID0gcmVxdWlyZSgnY3VpZCcpXG5jb25zdCB0aHJvdHRsZSA9IHJlcXVpcmUoJ2xvZGFzaC50aHJvdHRsZScpXG5jb25zdCBwcmV0dHlCeXRlcyA9IHJlcXVpcmUoJ3ByZXR0aWVyLWJ5dGVzJylcbmNvbnN0IG1hdGNoID0gcmVxdWlyZSgnbWltZS1tYXRjaCcpXG5jb25zdCBEZWZhdWx0U3RvcmUgPSByZXF1aXJlKCcuLi9zdG9yZS9EZWZhdWx0U3RvcmUnKVxuXG4vKipcbiAqIFVwcHkgQ29yZSBtb2R1bGUuXG4gKiBNYW5hZ2VzIHBsdWdpbnMsIHN0YXRlIHVwZGF0ZXMsIGFjdHMgYXMgYW4gZXZlbnQgYnVzLFxuICogYWRkcy9yZW1vdmVzIGZpbGVzIGFuZCBtZXRhZGF0YS5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0cyDigJQgVXBweSBvcHRpb25zXG4gKi9cbmNsYXNzIFVwcHkge1xuICBjb25zdHJ1Y3RvciAob3B0cykge1xuICAgIGNvbnN0IGRlZmF1bHRMb2NhbGUgPSB7XG4gICAgICBzdHJpbmdzOiB7XG4gICAgICAgIHlvdUNhbk9ubHlVcGxvYWRYOiB7XG4gICAgICAgICAgMDogJ1lvdSBjYW4gb25seSB1cGxvYWQgJXtzbWFydF9jb3VudH0gZmlsZScsXG4gICAgICAgICAgMTogJ1lvdSBjYW4gb25seSB1cGxvYWQgJXtzbWFydF9jb3VudH0gZmlsZXMnXG4gICAgICAgIH0sXG4gICAgICAgIHlvdUhhdmVUb0F0TGVhc3RTZWxlY3RYOiB7XG4gICAgICAgICAgMDogJ1lvdSBoYXZlIHRvIHNlbGVjdCBhdCBsZWFzdCAle3NtYXJ0X2NvdW50fSBmaWxlJyxcbiAgICAgICAgICAxOiAnWW91IGhhdmUgdG8gc2VsZWN0IGF0IGxlYXN0ICV7c21hcnRfY291bnR9IGZpbGVzJ1xuICAgICAgICB9LFxuICAgICAgICBleGNlZWRzU2l6ZTogJ1RoaXMgZmlsZSBleGNlZWRzIG1heGltdW0gYWxsb3dlZCBzaXplIG9mJyxcbiAgICAgICAgeW91Q2FuT25seVVwbG9hZEZpbGVUeXBlczogJ1lvdSBjYW4gb25seSB1cGxvYWQ6JyxcbiAgICAgICAgdXBweVNlcnZlckVycm9yOiAnQ29ubmVjdGlvbiB3aXRoIFVwcHkgU2VydmVyIGZhaWxlZCdcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gICAgY29uc3QgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgICBpZDogJ3VwcHknLFxuICAgICAgYXV0b1Byb2NlZWQ6IHRydWUsXG4gICAgICBkZWJ1ZzogZmFsc2UsXG4gICAgICByZXN0cmljdGlvbnM6IHtcbiAgICAgICAgbWF4RmlsZVNpemU6IGZhbHNlLFxuICAgICAgICBtYXhOdW1iZXJPZkZpbGVzOiBmYWxzZSxcbiAgICAgICAgbWluTnVtYmVyT2ZGaWxlczogZmFsc2UsXG4gICAgICAgIGFsbG93ZWRGaWxlVHlwZXM6IGZhbHNlXG4gICAgICB9LFxuICAgICAgbWV0YToge30sXG4gICAgICBvbkJlZm9yZUZpbGVBZGRlZDogKGN1cnJlbnRGaWxlLCBmaWxlcykgPT4gUHJvbWlzZS5yZXNvbHZlKCksXG4gICAgICBvbkJlZm9yZVVwbG9hZDogKGZpbGVzKSA9PiBQcm9taXNlLnJlc29sdmUoKSxcbiAgICAgIGxvY2FsZTogZGVmYXVsdExvY2FsZSxcbiAgICAgIHN0b3JlOiBuZXcgRGVmYXVsdFN0b3JlKClcbiAgICB9XG5cbiAgICAvLyBNZXJnZSBkZWZhdWx0IG9wdGlvbnMgd2l0aCB0aGUgb25lcyBzZXQgYnkgdXNlclxuICAgIHRoaXMub3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRPcHRpb25zLCBvcHRzKVxuICAgIHRoaXMub3B0cy5yZXN0cmljdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucy5yZXN0cmljdGlvbnMsIHRoaXMub3B0cy5yZXN0cmljdGlvbnMpXG5cbiAgICB0aGlzLmxvY2FsZSA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRMb2NhbGUsIHRoaXMub3B0cy5sb2NhbGUpXG4gICAgdGhpcy5sb2NhbGUuc3RyaW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRMb2NhbGUuc3RyaW5ncywgdGhpcy5vcHRzLmxvY2FsZS5zdHJpbmdzKVxuXG4gICAgLy8gaTE4blxuICAgIHRoaXMudHJhbnNsYXRvciA9IG5ldyBUcmFuc2xhdG9yKHtsb2NhbGU6IHRoaXMubG9jYWxlfSlcbiAgICB0aGlzLmkxOG4gPSB0aGlzLnRyYW5zbGF0b3IudHJhbnNsYXRlLmJpbmQodGhpcy50cmFuc2xhdG9yKVxuXG4gICAgLy8gQ29udGFpbmVyIGZvciBkaWZmZXJlbnQgdHlwZXMgb2YgcGx1Z2luc1xuICAgIHRoaXMucGx1Z2lucyA9IHt9XG5cbiAgICB0aGlzLmdldFN0YXRlID0gdGhpcy5nZXRTdGF0ZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5nZXRQbHVnaW4gPSB0aGlzLmdldFBsdWdpbi5iaW5kKHRoaXMpXG4gICAgdGhpcy5zZXRGaWxlTWV0YSA9IHRoaXMuc2V0RmlsZU1ldGEuYmluZCh0aGlzKVxuICAgIHRoaXMuc2V0RmlsZVN0YXRlID0gdGhpcy5zZXRGaWxlU3RhdGUuYmluZCh0aGlzKVxuICAgIHRoaXMubG9nID0gdGhpcy5sb2cuYmluZCh0aGlzKVxuICAgIHRoaXMuaW5mbyA9IHRoaXMuaW5mby5iaW5kKHRoaXMpXG4gICAgdGhpcy5oaWRlSW5mbyA9IHRoaXMuaGlkZUluZm8uYmluZCh0aGlzKVxuICAgIHRoaXMuYWRkRmlsZSA9IHRoaXMuYWRkRmlsZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5yZW1vdmVGaWxlID0gdGhpcy5yZW1vdmVGaWxlLmJpbmQodGhpcylcbiAgICB0aGlzLnBhdXNlUmVzdW1lID0gdGhpcy5wYXVzZVJlc3VtZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5fY2FsY3VsYXRlUHJvZ3Jlc3MgPSB0aGlzLl9jYWxjdWxhdGVQcm9ncmVzcy5iaW5kKHRoaXMpXG4gICAgdGhpcy51cGRhdGVPbmxpbmVTdGF0dXMgPSB0aGlzLnVwZGF0ZU9ubGluZVN0YXR1cy5iaW5kKHRoaXMpXG4gICAgdGhpcy5yZXNldFByb2dyZXNzID0gdGhpcy5yZXNldFByb2dyZXNzLmJpbmQodGhpcylcblxuICAgIHRoaXMucGF1c2VBbGwgPSB0aGlzLnBhdXNlQWxsLmJpbmQodGhpcylcbiAgICB0aGlzLnJlc3VtZUFsbCA9IHRoaXMucmVzdW1lQWxsLmJpbmQodGhpcylcbiAgICB0aGlzLnJldHJ5QWxsID0gdGhpcy5yZXRyeUFsbC5iaW5kKHRoaXMpXG4gICAgdGhpcy5jYW5jZWxBbGwgPSB0aGlzLmNhbmNlbEFsbC5iaW5kKHRoaXMpXG4gICAgdGhpcy5yZXRyeVVwbG9hZCA9IHRoaXMucmV0cnlVcGxvYWQuYmluZCh0aGlzKVxuICAgIHRoaXMudXBsb2FkID0gdGhpcy51cGxvYWQuYmluZCh0aGlzKVxuXG4gICAgdGhpcy5lbWl0dGVyID0gZWUoKVxuICAgIHRoaXMub24gPSB0aGlzLm9uLmJpbmQodGhpcylcbiAgICB0aGlzLm9mZiA9IHRoaXMub2ZmLmJpbmQodGhpcylcbiAgICB0aGlzLm9uY2UgPSB0aGlzLmVtaXR0ZXIub25jZS5iaW5kKHRoaXMuZW1pdHRlcilcbiAgICB0aGlzLmVtaXQgPSB0aGlzLmVtaXR0ZXIuZW1pdC5iaW5kKHRoaXMuZW1pdHRlcilcblxuICAgIHRoaXMucHJlUHJvY2Vzc29ycyA9IFtdXG4gICAgdGhpcy51cGxvYWRlcnMgPSBbXVxuICAgIHRoaXMucG9zdFByb2Nlc3NvcnMgPSBbXVxuXG4gICAgdGhpcy5zdG9yZSA9IHRoaXMub3B0cy5zdG9yZVxuICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgcGx1Z2luczoge30sXG4gICAgICBmaWxlczoge30sXG4gICAgICBjdXJyZW50VXBsb2Fkczoge30sXG4gICAgICBjYXBhYmlsaXRpZXM6IHtcbiAgICAgICAgcmVzdW1hYmxlVXBsb2FkczogZmFsc2VcbiAgICAgIH0sXG4gICAgICB0b3RhbFByb2dyZXNzOiAwLFxuICAgICAgbWV0YTogT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5vcHRzLm1ldGEpLFxuICAgICAgaW5mbzoge1xuICAgICAgICBpc0hpZGRlbjogdHJ1ZSxcbiAgICAgICAgdHlwZTogJ2luZm8nLFxuICAgICAgICBtZXNzYWdlOiAnJ1xuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGlzLl9zdG9yZVVuc3Vic2NyaWJlID0gdGhpcy5zdG9yZS5zdWJzY3JpYmUoKHByZXZTdGF0ZSwgbmV4dFN0YXRlLCBwYXRjaCkgPT4ge1xuICAgICAgdGhpcy5lbWl0KCdzdGF0ZS11cGRhdGUnLCBwcmV2U3RhdGUsIG5leHRTdGF0ZSwgcGF0Y2gpXG4gICAgICB0aGlzLnVwZGF0ZUFsbChuZXh0U3RhdGUpXG4gICAgfSlcblxuICAgIC8vIGZvciBkZWJ1Z2dpbmcgYW5kIHRlc3RpbmdcbiAgICAvLyB0aGlzLnVwZGF0ZU51bSA9IDBcbiAgICBpZiAodGhpcy5vcHRzLmRlYnVnKSB7XG4gICAgICBnbG9iYWwudXBweUxvZyA9ICcnXG4gICAgICBnbG9iYWxbdGhpcy5vcHRzLmlkXSA9IHRoaXNcbiAgICB9XG4gIH1cblxuICBvbiAoZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5lbWl0dGVyLm9uKGV2ZW50LCBjYWxsYmFjaylcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgb2ZmIChldmVudCwgY2FsbGJhY2spIHtcbiAgICB0aGlzLmVtaXR0ZXIub2ZmKGV2ZW50LCBjYWxsYmFjaylcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLyoqXG4gICAqIEl0ZXJhdGUgb24gYWxsIHBsdWdpbnMgYW5kIHJ1biBgdXBkYXRlYCBvbiB0aGVtLlxuICAgKiBDYWxsZWQgZWFjaCB0aW1lIHN0YXRlIGNoYW5nZXMuXG4gICAqXG4gICAqL1xuICB1cGRhdGVBbGwgKHN0YXRlKSB7XG4gICAgdGhpcy5pdGVyYXRlUGx1Z2lucyhwbHVnaW4gPT4ge1xuICAgICAgcGx1Z2luLnVwZGF0ZShzdGF0ZSlcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgc3RhdGVcbiAgICpcbiAgICogQHBhcmFtIHtwYXRjaH0gb2JqZWN0XG4gICAqL1xuICBzZXRTdGF0ZSAocGF0Y2gpIHtcbiAgICB0aGlzLnN0b3JlLnNldFN0YXRlKHBhdGNoKVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgY3VycmVudCBzdGF0ZS5cbiAgICovXG4gIGdldFN0YXRlICgpIHtcbiAgICByZXR1cm4gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpXG4gIH1cblxuICAvKipcbiAgKiBCYWNrIGNvbXBhdCBmb3Igd2hlbiB0aGlzLnN0YXRlIGlzIHVzZWQgaW5zdGVhZCBvZiB0aGlzLmdldFN0YXRlKCkuXG4gICovXG4gIGdldCBzdGF0ZSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U3RhdGUoKVxuICB9XG5cbiAgLyoqXG4gICogU2hvcnRoYW5kIHRvIHNldCBzdGF0ZSBmb3IgYSBzcGVjaWZpYyBmaWxlLlxuICAqL1xuICBzZXRGaWxlU3RhdGUgKGZpbGVJRCwgc3RhdGUpIHtcbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGZpbGVzOiBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXMsIHtcbiAgICAgICAgW2ZpbGVJRF06IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlc1tmaWxlSURdLCBzdGF0ZSlcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIHJlc2V0UHJvZ3Jlc3MgKCkge1xuICAgIGNvbnN0IGRlZmF1bHRQcm9ncmVzcyA9IHtcbiAgICAgIHBlcmNlbnRhZ2U6IDAsXG4gICAgICBieXRlc1VwbG9hZGVkOiAwLFxuICAgICAgdXBsb2FkQ29tcGxldGU6IGZhbHNlLFxuICAgICAgdXBsb2FkU3RhcnRlZDogZmFsc2VcbiAgICB9XG4gICAgY29uc3QgZmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXMpXG4gICAgY29uc3QgdXBkYXRlZEZpbGVzID0ge31cbiAgICBPYmplY3Qua2V5cyhmaWxlcykuZm9yRWFjaChmaWxlSUQgPT4ge1xuICAgICAgY29uc3QgdXBkYXRlZEZpbGUgPSBPYmplY3QuYXNzaWduKHt9LCBmaWxlc1tmaWxlSURdKVxuICAgICAgdXBkYXRlZEZpbGUucHJvZ3Jlc3MgPSBPYmplY3QuYXNzaWduKHt9LCB1cGRhdGVkRmlsZS5wcm9ncmVzcywgZGVmYXVsdFByb2dyZXNzKVxuICAgICAgdXBkYXRlZEZpbGVzW2ZpbGVJRF0gPSB1cGRhdGVkRmlsZVxuICAgIH0pXG5cbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGZpbGVzOiB1cGRhdGVkRmlsZXMsXG4gICAgICB0b3RhbFByb2dyZXNzOiAwXG4gICAgfSlcblxuICAgIC8vIFRPRE8gRG9jdW1lbnQgb24gdGhlIHdlYnNpdGVcbiAgICB0aGlzLmVtaXQoJ3Jlc2V0LXByb2dyZXNzJylcbiAgfVxuXG4gIGFkZFByZVByb2Nlc3NvciAoZm4pIHtcbiAgICB0aGlzLnByZVByb2Nlc3NvcnMucHVzaChmbilcbiAgfVxuXG4gIHJlbW92ZVByZVByb2Nlc3NvciAoZm4pIHtcbiAgICBjb25zdCBpID0gdGhpcy5wcmVQcm9jZXNzb3JzLmluZGV4T2YoZm4pXG4gICAgaWYgKGkgIT09IC0xKSB7XG4gICAgICB0aGlzLnByZVByb2Nlc3NvcnMuc3BsaWNlKGksIDEpXG4gICAgfVxuICB9XG5cbiAgYWRkUG9zdFByb2Nlc3NvciAoZm4pIHtcbiAgICB0aGlzLnBvc3RQcm9jZXNzb3JzLnB1c2goZm4pXG4gIH1cblxuICByZW1vdmVQb3N0UHJvY2Vzc29yIChmbikge1xuICAgIGNvbnN0IGkgPSB0aGlzLnBvc3RQcm9jZXNzb3JzLmluZGV4T2YoZm4pXG4gICAgaWYgKGkgIT09IC0xKSB7XG4gICAgICB0aGlzLnBvc3RQcm9jZXNzb3JzLnNwbGljZShpLCAxKVxuICAgIH1cbiAgfVxuXG4gIGFkZFVwbG9hZGVyIChmbikge1xuICAgIHRoaXMudXBsb2FkZXJzLnB1c2goZm4pXG4gIH1cblxuICByZW1vdmVVcGxvYWRlciAoZm4pIHtcbiAgICBjb25zdCBpID0gdGhpcy51cGxvYWRlcnMuaW5kZXhPZihmbilcbiAgICBpZiAoaSAhPT0gLTEpIHtcbiAgICAgIHRoaXMudXBsb2FkZXJzLnNwbGljZShpLCAxKVxuICAgIH1cbiAgfVxuXG4gIHNldE1ldGEgKGRhdGEpIHtcbiAgICBjb25zdCB1cGRhdGVkTWV0YSA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5tZXRhLCBkYXRhKVxuICAgIGNvbnN0IHVwZGF0ZWRGaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlcylcblxuICAgIE9iamVjdC5rZXlzKHVwZGF0ZWRGaWxlcykuZm9yRWFjaCgoZmlsZUlEKSA9PiB7XG4gICAgICB1cGRhdGVkRmlsZXNbZmlsZUlEXSA9IE9iamVjdC5hc3NpZ24oe30sIHVwZGF0ZWRGaWxlc1tmaWxlSURdLCB7XG4gICAgICAgIG1ldGE6IE9iamVjdC5hc3NpZ24oe30sIHVwZGF0ZWRGaWxlc1tmaWxlSURdLm1ldGEsIGRhdGEpXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICB0aGlzLmxvZygnQWRkaW5nIG1ldGFkYXRhOicpXG4gICAgdGhpcy5sb2coZGF0YSlcblxuICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgbWV0YTogdXBkYXRlZE1ldGEsXG4gICAgICBmaWxlczogdXBkYXRlZEZpbGVzXG4gICAgfSlcbiAgfVxuXG4gIHNldEZpbGVNZXRhIChmaWxlSUQsIGRhdGEpIHtcbiAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXMpXG4gICAgaWYgKCF1cGRhdGVkRmlsZXNbZmlsZUlEXSkge1xuICAgICAgdGhpcy5sb2coJ1dhcyB0cnlpbmcgdG8gc2V0IG1ldGFkYXRhIGZvciBhIGZpbGUgdGhhdOKAmXMgbm90IHdpdGggdXMgYW55bW9yZTogJywgZmlsZUlEKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGNvbnN0IG5ld01ldGEgPSBPYmplY3QuYXNzaWduKHt9LCB1cGRhdGVkRmlsZXNbZmlsZUlEXS5tZXRhLCBkYXRhKVxuICAgIHVwZGF0ZWRGaWxlc1tmaWxlSURdID0gT2JqZWN0LmFzc2lnbih7fSwgdXBkYXRlZEZpbGVzW2ZpbGVJRF0sIHtcbiAgICAgIG1ldGE6IG5ld01ldGFcbiAgICB9KVxuICAgIHRoaXMuc2V0U3RhdGUoe2ZpbGVzOiB1cGRhdGVkRmlsZXN9KVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhIGZpbGUgb2JqZWN0LlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZUlEIFRoZSBJRCBvZiB0aGUgZmlsZSBvYmplY3QgdG8gcmV0dXJuLlxuICAgKi9cbiAgZ2V0RmlsZSAoZmlsZUlEKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U3RhdGUoKS5maWxlc1tmaWxlSURdXG4gIH1cblxuICAvKipcbiAgKiBDaGVjayBpZiBtaW5OdW1iZXJPZkZpbGVzIHJlc3RyaWN0aW9uIGlzIHJlYWNoZWQgYmVmb3JlIHVwbG9hZGluZy5cbiAgKlxuICAqIEByZXR1cm4ge2Jvb2xlYW59XG4gICogQHByaXZhdGVcbiAgKi9cbiAgX2NoZWNrTWluTnVtYmVyT2ZGaWxlcyAoKSB7XG4gICAgY29uc3Qge21pbk51bWJlck9mRmlsZXN9ID0gdGhpcy5vcHRzLnJlc3RyaWN0aW9uc1xuICAgIGlmIChPYmplY3Qua2V5cyh0aGlzLmdldFN0YXRlKCkuZmlsZXMpLmxlbmd0aCA8IG1pbk51bWJlck9mRmlsZXMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgJHt0aGlzLmkxOG4oJ3lvdUhhdmVUb0F0TGVhc3RTZWxlY3RYJywgeyBzbWFydF9jb3VudDogbWluTnVtYmVyT2ZGaWxlcyB9KX1gKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAqIENoZWNrIGlmIGZpbGUgcGFzc2VzIGEgc2V0IG9mIHJlc3RyaWN0aW9ucyBzZXQgaW4gb3B0aW9uczogbWF4RmlsZVNpemUsXG4gICogbWF4TnVtYmVyT2ZGaWxlcyBhbmQgYWxsb3dlZEZpbGVUeXBlcy5cbiAgKlxuICAqIEBwYXJhbSB7b2JqZWN0fSBmaWxlIG9iamVjdCB0byBjaGVja1xuICAqIEBwcml2YXRlXG4gICovXG4gIF9jaGVja1Jlc3RyaWN0aW9ucyAoZmlsZSkge1xuICAgIGNvbnN0IHttYXhGaWxlU2l6ZSwgbWF4TnVtYmVyT2ZGaWxlcywgYWxsb3dlZEZpbGVUeXBlc30gPSB0aGlzLm9wdHMucmVzdHJpY3Rpb25zXG5cbiAgICBpZiAobWF4TnVtYmVyT2ZGaWxlcykge1xuICAgICAgaWYgKE9iamVjdC5rZXlzKHRoaXMuZ2V0U3RhdGUoKS5maWxlcykubGVuZ3RoICsgMSA+IG1heE51bWJlck9mRmlsZXMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3RoaXMuaTE4bigneW91Q2FuT25seVVwbG9hZFgnLCB7IHNtYXJ0X2NvdW50OiBtYXhOdW1iZXJPZkZpbGVzIH0pfWApXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGFsbG93ZWRGaWxlVHlwZXMpIHtcbiAgICAgIGNvbnN0IGlzQ29ycmVjdEZpbGVUeXBlID0gYWxsb3dlZEZpbGVUeXBlcy5maWx0ZXIoKHR5cGUpID0+IHtcbiAgICAgICAgaWYgKCFmaWxlLnR5cGUpIHJldHVybiBmYWxzZVxuICAgICAgICByZXR1cm4gbWF0Y2goZmlsZS50eXBlLCB0eXBlKVxuICAgICAgfSkubGVuZ3RoID4gMFxuXG4gICAgICBpZiAoIWlzQ29ycmVjdEZpbGVUeXBlKSB7XG4gICAgICAgIGNvbnN0IGFsbG93ZWRGaWxlVHlwZXNTdHJpbmcgPSBhbGxvd2VkRmlsZVR5cGVzLmpvaW4oJywgJylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3RoaXMuaTE4bigneW91Q2FuT25seVVwbG9hZEZpbGVUeXBlcycpfSAke2FsbG93ZWRGaWxlVHlwZXNTdHJpbmd9YClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobWF4RmlsZVNpemUpIHtcbiAgICAgIGlmIChmaWxlLmRhdGEuc2l6ZSA+IG1heEZpbGVTaXplKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgJHt0aGlzLmkxOG4oJ2V4Y2VlZHNTaXplJyl9ICR7cHJldHR5Qnl0ZXMobWF4RmlsZVNpemUpfWApXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogQWRkIGEgbmV3IGZpbGUgdG8gYHN0YXRlLmZpbGVzYC4gVGhpcyB3aWxsIHJ1biBgb25CZWZvcmVGaWxlQWRkZWRgLFxuICAqIHRyeSB0byBndWVzcyBmaWxlIHR5cGUgaW4gYSBjbGV2ZXIgd2F5LCBjaGVjayBmaWxlIGFnYWluc3QgcmVzdHJpY3Rpb25zLFxuICAqIGFuZCBzdGFydCBhbiB1cGxvYWQgaWYgYGF1dG9Qcm9jZWVkID09PSB0cnVlYC5cbiAgKlxuICAqIEBwYXJhbSB7b2JqZWN0fSBmaWxlIG9iamVjdCB0byBhZGRcbiAgKi9cbiAgYWRkRmlsZSAoZmlsZSkge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgLy8gV3JhcCB0aGlzIGluIGEgUHJvbWlzZSBgLnRoZW4oKWAgaGFuZGxlciBzbyBlcnJvcnMgd2lsbCByZWplY3QgdGhlIFByb21pc2VcbiAgICAgIC8vIGluc3RlYWQgb2YgdGhyb3dpbmcuXG4gICAgICAudGhlbigoKSA9PiB0aGlzLm9wdHMub25CZWZvcmVGaWxlQWRkZWQoZmlsZSwgdGhpcy5nZXRTdGF0ZSgpLmZpbGVzKSlcbiAgICAgIC50aGVuKCgpID0+IFV0aWxzLmdldEZpbGVUeXBlKGZpbGUpKVxuICAgICAgLnRoZW4oKGZpbGVUeXBlKSA9PiB7XG4gICAgICAgIGNvbnN0IHVwZGF0ZWRGaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlcylcbiAgICAgICAgbGV0IGZpbGVOYW1lXG4gICAgICAgIGlmIChmaWxlLm5hbWUpIHtcbiAgICAgICAgICBmaWxlTmFtZSA9IGZpbGUubmFtZVxuICAgICAgICB9IGVsc2UgaWYgKGZpbGVUeXBlLnNwbGl0KCcvJylbMF0gPT09ICdpbWFnZScpIHtcbiAgICAgICAgICBmaWxlTmFtZSA9IGZpbGVUeXBlLnNwbGl0KCcvJylbMF0gKyAnLicgKyBmaWxlVHlwZS5zcGxpdCgnLycpWzFdXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZmlsZU5hbWUgPSAnbm9uYW1lJ1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGZpbGVFeHRlbnNpb24gPSBVdGlscy5nZXRGaWxlTmFtZUFuZEV4dGVuc2lvbihmaWxlTmFtZSkuZXh0ZW5zaW9uXG4gICAgICAgIGNvbnN0IGlzUmVtb3RlID0gZmlsZS5pc1JlbW90ZSB8fCBmYWxzZVxuXG4gICAgICAgIGNvbnN0IGZpbGVJRCA9IFV0aWxzLmdlbmVyYXRlRmlsZUlEKGZpbGUpXG5cbiAgICAgICAgY29uc3QgbmV3RmlsZSA9IHtcbiAgICAgICAgICBzb3VyY2U6IGZpbGUuc291cmNlIHx8ICcnLFxuICAgICAgICAgIGlkOiBmaWxlSUQsXG4gICAgICAgICAgbmFtZTogZmlsZU5hbWUsXG4gICAgICAgICAgZXh0ZW5zaW9uOiBmaWxlRXh0ZW5zaW9uIHx8ICcnLFxuICAgICAgICAgIG1ldGE6IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5tZXRhLCB7XG4gICAgICAgICAgICBuYW1lOiBmaWxlTmFtZSxcbiAgICAgICAgICAgIHR5cGU6IGZpbGVUeXBlXG4gICAgICAgICAgfSksXG4gICAgICAgICAgdHlwZTogZmlsZVR5cGUsXG4gICAgICAgICAgZGF0YTogZmlsZS5kYXRhLFxuICAgICAgICAgIHByb2dyZXNzOiB7XG4gICAgICAgICAgICBwZXJjZW50YWdlOiAwLFxuICAgICAgICAgICAgYnl0ZXNVcGxvYWRlZDogMCxcbiAgICAgICAgICAgIGJ5dGVzVG90YWw6IGZpbGUuZGF0YS5zaXplIHx8IDAsXG4gICAgICAgICAgICB1cGxvYWRDb21wbGV0ZTogZmFsc2UsXG4gICAgICAgICAgICB1cGxvYWRTdGFydGVkOiBmYWxzZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgc2l6ZTogZmlsZS5kYXRhLnNpemUgfHwgMCxcbiAgICAgICAgICBpc1JlbW90ZTogaXNSZW1vdGUsXG4gICAgICAgICAgcmVtb3RlOiBmaWxlLnJlbW90ZSB8fCAnJyxcbiAgICAgICAgICBwcmV2aWV3OiBmaWxlLnByZXZpZXdcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2NoZWNrUmVzdHJpY3Rpb25zKG5ld0ZpbGUpXG5cbiAgICAgICAgdXBkYXRlZEZpbGVzW2ZpbGVJRF0gPSBuZXdGaWxlXG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe2ZpbGVzOiB1cGRhdGVkRmlsZXN9KVxuXG4gICAgICAgIHRoaXMuZW1pdCgnZmlsZS1hZGRlZCcsIG5ld0ZpbGUpXG4gICAgICAgIHRoaXMubG9nKGBBZGRlZCBmaWxlOiAke2ZpbGVOYW1lfSwgJHtmaWxlSUR9LCBtaW1lIHR5cGU6ICR7ZmlsZVR5cGV9YClcblxuICAgICAgICBpZiAodGhpcy5vcHRzLmF1dG9Qcm9jZWVkICYmICF0aGlzLnNjaGVkdWxlZEF1dG9Qcm9jZWVkKSB7XG4gICAgICAgICAgdGhpcy5zY2hlZHVsZWRBdXRvUHJvY2VlZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZWRBdXRvUHJvY2VlZCA9IG51bGxcbiAgICAgICAgICAgIHRoaXMudXBsb2FkKCkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVyci5zdGFjayB8fCBlcnIubWVzc2FnZSB8fCBlcnIpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0sIDQpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gdHlwZW9mIGVyciA9PT0gJ29iamVjdCcgPyBlcnIubWVzc2FnZSA6IGVyclxuICAgICAgICB0aGlzLmxvZyhtZXNzYWdlKVxuICAgICAgICB0aGlzLmluZm8obWVzc2FnZSwgJ2Vycm9yJywgNTAwMClcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KHR5cGVvZiBlcnIgPT09ICdvYmplY3QnID8gZXJyIDogbmV3IEVycm9yKGVycikpXG4gICAgICB9KVxuICB9XG5cbiAgcmVtb3ZlRmlsZSAoZmlsZUlEKSB7XG4gICAgY29uc3QgeyBmaWxlcywgY3VycmVudFVwbG9hZHMgfSA9IHRoaXMuc3RhdGVcbiAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCBmaWxlcylcbiAgICBjb25zdCByZW1vdmVkRmlsZSA9IHVwZGF0ZWRGaWxlc1tmaWxlSURdXG4gICAgZGVsZXRlIHVwZGF0ZWRGaWxlc1tmaWxlSURdXG5cbiAgICAvLyBSZW1vdmUgdGhpcyBmaWxlIGZyb20gaXRzIGBjdXJyZW50VXBsb2FkYC5cbiAgICBjb25zdCB1cGRhdGVkVXBsb2FkcyA9IE9iamVjdC5hc3NpZ24oe30sIGN1cnJlbnRVcGxvYWRzKVxuICAgIGNvbnN0IHJlbW92ZVVwbG9hZHMgPSBbXVxuICAgIE9iamVjdC5rZXlzKHVwZGF0ZWRVcGxvYWRzKS5mb3JFYWNoKCh1cGxvYWRJRCkgPT4ge1xuICAgICAgY29uc3QgbmV3RmlsZUlEcyA9IGN1cnJlbnRVcGxvYWRzW3VwbG9hZElEXS5maWxlSURzLmZpbHRlcigodXBsb2FkRmlsZUlEKSA9PiB1cGxvYWRGaWxlSUQgIT09IGZpbGVJRClcbiAgICAgIC8vIFJlbW92ZSB0aGUgdXBsb2FkIGlmIG5vIGZpbGVzIGFyZSBhc3NvY2lhdGVkIHdpdGggaXQgYW55bW9yZS5cbiAgICAgIGlmIChuZXdGaWxlSURzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZW1vdmVVcGxvYWRzLnB1c2godXBsb2FkSUQpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICB1cGRhdGVkVXBsb2Fkc1t1cGxvYWRJRF0gPSBPYmplY3QuYXNzaWduKHt9LCBjdXJyZW50VXBsb2Fkc1t1cGxvYWRJRF0sIHtcbiAgICAgICAgZmlsZUlEczogbmV3RmlsZUlEc1xuICAgICAgfSlcbiAgICB9KVxuXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBjdXJyZW50VXBsb2FkczogdXBkYXRlZFVwbG9hZHMsXG4gICAgICBmaWxlczogdXBkYXRlZEZpbGVzXG4gICAgfSlcblxuICAgIHJlbW92ZVVwbG9hZHMuZm9yRWFjaCgodXBsb2FkSUQpID0+IHtcbiAgICAgIHRoaXMuX3JlbW92ZVVwbG9hZCh1cGxvYWRJRClcbiAgICB9KVxuXG4gICAgdGhpcy5fY2FsY3VsYXRlVG90YWxQcm9ncmVzcygpXG4gICAgdGhpcy5lbWl0KCdmaWxlLXJlbW92ZWQnLCByZW1vdmVkRmlsZSlcbiAgICB0aGlzLmxvZyhgRmlsZSByZW1vdmVkOiAke3JlbW92ZWRGaWxlLmlkfWApXG5cbiAgICAvLyBDbGVhbiB1cCBvYmplY3QgVVJMcy5cbiAgICBpZiAocmVtb3ZlZEZpbGUucHJldmlldyAmJiBVdGlscy5pc09iamVjdFVSTChyZW1vdmVkRmlsZS5wcmV2aWV3KSkge1xuICAgICAgVVJMLnJldm9rZU9iamVjdFVSTChyZW1vdmVkRmlsZS5wcmV2aWV3KVxuICAgIH1cblxuICAgIHRoaXMubG9nKGBSZW1vdmVkIGZpbGU6ICR7ZmlsZUlEfWApXG4gIH1cblxuICBwYXVzZVJlc3VtZSAoZmlsZUlEKSB7XG4gICAgY29uc3QgdXBkYXRlZEZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLmZpbGVzKVxuXG4gICAgaWYgKHVwZGF0ZWRGaWxlc1tmaWxlSURdLnVwbG9hZENvbXBsZXRlKSByZXR1cm5cblxuICAgIGNvbnN0IHdhc1BhdXNlZCA9IHVwZGF0ZWRGaWxlc1tmaWxlSURdLmlzUGF1c2VkIHx8IGZhbHNlXG4gICAgY29uc3QgaXNQYXVzZWQgPSAhd2FzUGF1c2VkXG5cbiAgICBjb25zdCB1cGRhdGVkRmlsZSA9IE9iamVjdC5hc3NpZ24oe30sIHVwZGF0ZWRGaWxlc1tmaWxlSURdLCB7XG4gICAgICBpc1BhdXNlZDogaXNQYXVzZWRcbiAgICB9KVxuXG4gICAgdXBkYXRlZEZpbGVzW2ZpbGVJRF0gPSB1cGRhdGVkRmlsZVxuICAgIHRoaXMuc2V0U3RhdGUoe2ZpbGVzOiB1cGRhdGVkRmlsZXN9KVxuXG4gICAgdGhpcy5lbWl0KCd1cGxvYWQtcGF1c2UnLCBmaWxlSUQsIGlzUGF1c2VkKVxuXG4gICAgcmV0dXJuIGlzUGF1c2VkXG4gIH1cblxuICBwYXVzZUFsbCAoKSB7XG4gICAgY29uc3QgdXBkYXRlZEZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLmZpbGVzKVxuICAgIGNvbnN0IGluUHJvZ3Jlc3NVcGRhdGVkRmlsZXMgPSBPYmplY3Qua2V5cyh1cGRhdGVkRmlsZXMpLmZpbHRlcigoZmlsZSkgPT4ge1xuICAgICAgcmV0dXJuICF1cGRhdGVkRmlsZXNbZmlsZV0ucHJvZ3Jlc3MudXBsb2FkQ29tcGxldGUgJiZcbiAgICAgICAgICAgICB1cGRhdGVkRmlsZXNbZmlsZV0ucHJvZ3Jlc3MudXBsb2FkU3RhcnRlZFxuICAgIH0pXG5cbiAgICBpblByb2dyZXNzVXBkYXRlZEZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgIGNvbnN0IHVwZGF0ZWRGaWxlID0gT2JqZWN0LmFzc2lnbih7fSwgdXBkYXRlZEZpbGVzW2ZpbGVdLCB7XG4gICAgICAgIGlzUGF1c2VkOiB0cnVlXG4gICAgICB9KVxuICAgICAgdXBkYXRlZEZpbGVzW2ZpbGVdID0gdXBkYXRlZEZpbGVcbiAgICB9KVxuICAgIHRoaXMuc2V0U3RhdGUoe2ZpbGVzOiB1cGRhdGVkRmlsZXN9KVxuXG4gICAgdGhpcy5lbWl0KCdwYXVzZS1hbGwnKVxuICB9XG5cbiAgcmVzdW1lQWxsICgpIHtcbiAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXMpXG4gICAgY29uc3QgaW5Qcm9ncmVzc1VwZGF0ZWRGaWxlcyA9IE9iamVjdC5rZXlzKHVwZGF0ZWRGaWxlcykuZmlsdGVyKChmaWxlKSA9PiB7XG4gICAgICByZXR1cm4gIXVwZGF0ZWRGaWxlc1tmaWxlXS5wcm9ncmVzcy51cGxvYWRDb21wbGV0ZSAmJlxuICAgICAgICAgICAgIHVwZGF0ZWRGaWxlc1tmaWxlXS5wcm9ncmVzcy51cGxvYWRTdGFydGVkXG4gICAgfSlcblxuICAgIGluUHJvZ3Jlc3NVcGRhdGVkRmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgY29uc3QgdXBkYXRlZEZpbGUgPSBPYmplY3QuYXNzaWduKHt9LCB1cGRhdGVkRmlsZXNbZmlsZV0sIHtcbiAgICAgICAgaXNQYXVzZWQ6IGZhbHNlLFxuICAgICAgICBlcnJvcjogbnVsbFxuICAgICAgfSlcbiAgICAgIHVwZGF0ZWRGaWxlc1tmaWxlXSA9IHVwZGF0ZWRGaWxlXG4gICAgfSlcbiAgICB0aGlzLnNldFN0YXRlKHtmaWxlczogdXBkYXRlZEZpbGVzfSlcblxuICAgIHRoaXMuZW1pdCgncmVzdW1lLWFsbCcpXG4gIH1cblxuICByZXRyeUFsbCAoKSB7XG4gICAgY29uc3QgdXBkYXRlZEZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLmZpbGVzKVxuICAgIGNvbnN0IGZpbGVzVG9SZXRyeSA9IE9iamVjdC5rZXlzKHVwZGF0ZWRGaWxlcykuZmlsdGVyKGZpbGUgPT4ge1xuICAgICAgcmV0dXJuIHVwZGF0ZWRGaWxlc1tmaWxlXS5lcnJvclxuICAgIH0pXG5cbiAgICBmaWxlc1RvUmV0cnkuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgY29uc3QgdXBkYXRlZEZpbGUgPSBPYmplY3QuYXNzaWduKHt9LCB1cGRhdGVkRmlsZXNbZmlsZV0sIHtcbiAgICAgICAgaXNQYXVzZWQ6IGZhbHNlLFxuICAgICAgICBlcnJvcjogbnVsbFxuICAgICAgfSlcbiAgICAgIHVwZGF0ZWRGaWxlc1tmaWxlXSA9IHVwZGF0ZWRGaWxlXG4gICAgfSlcbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGZpbGVzOiB1cGRhdGVkRmlsZXMsXG4gICAgICBlcnJvcjogbnVsbFxuICAgIH0pXG5cbiAgICB0aGlzLmVtaXQoJ3JldHJ5LWFsbCcsIGZpbGVzVG9SZXRyeSlcblxuICAgIGNvbnN0IHVwbG9hZElEID0gdGhpcy5fY3JlYXRlVXBsb2FkKGZpbGVzVG9SZXRyeSlcbiAgICByZXR1cm4gdGhpcy5fcnVuVXBsb2FkKHVwbG9hZElEKVxuICB9XG5cbiAgY2FuY2VsQWxsICgpIHtcbiAgICB0aGlzLmVtaXQoJ2NhbmNlbC1hbGwnKVxuXG4gICAgLy8gVE9ETyBPciBzaG91bGQgd2UganVzdCBjYWxsIHJlbW92ZUZpbGUgb24gYWxsIGZpbGVzP1xuICAgIGNvbnN0IHsgY3VycmVudFVwbG9hZHMgfSA9IHRoaXMuZ2V0U3RhdGUoKVxuICAgIGNvbnN0IHVwbG9hZElEcyA9IE9iamVjdC5rZXlzKGN1cnJlbnRVcGxvYWRzKVxuXG4gICAgdXBsb2FkSURzLmZvckVhY2goKGlkKSA9PiB7XG4gICAgICB0aGlzLl9yZW1vdmVVcGxvYWQoaWQpXG4gICAgfSlcblxuICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgZmlsZXM6IHt9LFxuICAgICAgdG90YWxQcm9ncmVzczogMFxuICAgIH0pXG4gIH1cblxuICByZXRyeVVwbG9hZCAoZmlsZUlEKSB7XG4gICAgY29uc3QgdXBkYXRlZEZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLmZpbGVzKVxuICAgIGNvbnN0IHVwZGF0ZWRGaWxlID0gT2JqZWN0LmFzc2lnbih7fSwgdXBkYXRlZEZpbGVzW2ZpbGVJRF0sXG4gICAgICB7IGVycm9yOiBudWxsLCBpc1BhdXNlZDogZmFsc2UgfVxuICAgIClcbiAgICB1cGRhdGVkRmlsZXNbZmlsZUlEXSA9IHVwZGF0ZWRGaWxlXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBmaWxlczogdXBkYXRlZEZpbGVzXG4gICAgfSlcblxuICAgIHRoaXMuZW1pdCgndXBsb2FkLXJldHJ5JywgZmlsZUlEKVxuXG4gICAgY29uc3QgdXBsb2FkSUQgPSB0aGlzLl9jcmVhdGVVcGxvYWQoWyBmaWxlSUQgXSlcbiAgICByZXR1cm4gdGhpcy5fcnVuVXBsb2FkKHVwbG9hZElEKVxuICB9XG5cbiAgcmVzZXQgKCkge1xuICAgIHRoaXMuY2FuY2VsQWxsKClcbiAgfVxuXG4gIF9jYWxjdWxhdGVQcm9ncmVzcyAoZmlsZSwgZGF0YSkge1xuICAgIGlmICghdGhpcy5nZXRGaWxlKGZpbGUuaWQpKSB7XG4gICAgICB0aGlzLmxvZyhgTm90IHNldHRpbmcgcHJvZ3Jlc3MgZm9yIGEgZmlsZSB0aGF0IGhhcyBiZWVuIHJlbW92ZWQ6ICR7ZmlsZS5pZH1gKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdGhpcy5zZXRGaWxlU3RhdGUoZmlsZS5pZCwge1xuICAgICAgcHJvZ3Jlc3M6IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0RmlsZShmaWxlLmlkKS5wcm9ncmVzcywge1xuICAgICAgICBieXRlc1VwbG9hZGVkOiBkYXRhLmJ5dGVzVXBsb2FkZWQsXG4gICAgICAgIGJ5dGVzVG90YWw6IGRhdGEuYnl0ZXNUb3RhbCxcbiAgICAgICAgcGVyY2VudGFnZTogTWF0aC5mbG9vcigoZGF0YS5ieXRlc1VwbG9hZGVkIC8gZGF0YS5ieXRlc1RvdGFsICogMTAwKS50b0ZpeGVkKDIpKVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgdGhpcy5fY2FsY3VsYXRlVG90YWxQcm9ncmVzcygpXG4gIH1cblxuICBfY2FsY3VsYXRlVG90YWxQcm9ncmVzcyAoKSB7XG4gICAgLy8gY2FsY3VsYXRlIHRvdGFsIHByb2dyZXNzLCB1c2luZyB0aGUgbnVtYmVyIG9mIGZpbGVzIGN1cnJlbnRseSB1cGxvYWRpbmcsXG4gICAgLy8gbXVsdGlwbGllZCBieSAxMDAgYW5kIHRoZSBzdW1tIG9mIGluZGl2aWR1YWwgcHJvZ3Jlc3Mgb2YgZWFjaCBmaWxlXG4gICAgY29uc3QgZmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXMpXG5cbiAgICBjb25zdCBpblByb2dyZXNzID0gT2JqZWN0LmtleXMoZmlsZXMpLmZpbHRlcigoZmlsZSkgPT4ge1xuICAgICAgcmV0dXJuIGZpbGVzW2ZpbGVdLnByb2dyZXNzLnVwbG9hZFN0YXJ0ZWRcbiAgICB9KVxuICAgIGNvbnN0IHByb2dyZXNzTWF4ID0gaW5Qcm9ncmVzcy5sZW5ndGggKiAxMDBcbiAgICBsZXQgcHJvZ3Jlc3NBbGwgPSAwXG4gICAgaW5Qcm9ncmVzcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICBwcm9ncmVzc0FsbCA9IHByb2dyZXNzQWxsICsgZmlsZXNbZmlsZV0ucHJvZ3Jlc3MucGVyY2VudGFnZVxuICAgIH0pXG5cbiAgICBjb25zdCB0b3RhbFByb2dyZXNzID0gcHJvZ3Jlc3NNYXggPT09IDAgPyAwIDogTWF0aC5mbG9vcigocHJvZ3Jlc3NBbGwgKiAxMDAgLyBwcm9ncmVzc01heCkudG9GaXhlZCgyKSlcblxuICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgdG90YWxQcm9ncmVzczogdG90YWxQcm9ncmVzc1xuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXJzIGxpc3RlbmVycyBmb3IgYWxsIGdsb2JhbCBhY3Rpb25zLCBsaWtlOlxuICAgKiBgZXJyb3JgLCBgZmlsZS1yZW1vdmVkYCwgYHVwbG9hZC1wcm9ncmVzc2BcbiAgICpcbiAgICovXG4gIGFjdGlvbnMgKCkge1xuICAgIC8vIGNvbnN0IGxvZyA9IHRoaXMubG9nXG4gICAgLy8gdGhpcy5vbignKicsIGZ1bmN0aW9uIChwYXlsb2FkKSB7XG4gICAgLy8gICBsb2coYFtDb3JlXSBFdmVudDogJHt0aGlzLmV2ZW50fWApXG4gICAgLy8gICBsb2cocGF5bG9hZClcbiAgICAvLyB9KVxuXG4gICAgLy8gc3RyZXNzLXRlc3QgcmUtcmVuZGVyaW5nXG4gICAgLy8gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgIC8vICAgdGhpcy5zZXRTdGF0ZSh7YmxhOiAnYmxhJ30pXG4gICAgLy8gfSwgMjApXG5cbiAgICB0aGlzLm9uKCdlcnJvcicsIChlcnJvcikgPT4ge1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pXG4gICAgfSlcblxuICAgIHRoaXMub24oJ3VwbG9hZC1lcnJvcicsIChmaWxlLCBlcnJvcikgPT4ge1xuICAgICAgdGhpcy5zZXRGaWxlU3RhdGUoZmlsZS5pZCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KVxuICAgICAgdGhpcy5zZXRTdGF0ZSh7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pXG5cbiAgICAgIGxldCBtZXNzYWdlID0gYEZhaWxlZCB0byB1cGxvYWQgJHtmaWxlLm5hbWV9YFxuICAgICAgaWYgKHR5cGVvZiBlcnJvciA9PT0gJ29iamVjdCcgJiYgZXJyb3IubWVzc2FnZSkge1xuICAgICAgICBtZXNzYWdlID0geyBtZXNzYWdlOiBtZXNzYWdlLCBkZXRhaWxzOiBlcnJvci5tZXNzYWdlIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuaW5mbyhtZXNzYWdlLCAnZXJyb3InLCA1MDAwKVxuICAgIH0pXG5cbiAgICB0aGlzLm9uKCd1cGxvYWQnLCAoKSA9PiB7XG4gICAgICB0aGlzLnNldFN0YXRlKHsgZXJyb3I6IG51bGwgfSlcbiAgICB9KVxuXG4gICAgdGhpcy5vbigndXBsb2FkLXN0YXJ0ZWQnLCAoZmlsZSwgdXBsb2FkKSA9PiB7XG4gICAgICBpZiAoIXRoaXMuZ2V0RmlsZShmaWxlLmlkKSkge1xuICAgICAgICB0aGlzLmxvZyhgTm90IHNldHRpbmcgcHJvZ3Jlc3MgZm9yIGEgZmlsZSB0aGF0IGhhcyBiZWVuIHJlbW92ZWQ6ICR7ZmlsZS5pZH1gKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHRoaXMuc2V0RmlsZVN0YXRlKGZpbGUuaWQsIHtcbiAgICAgICAgcHJvZ3Jlc3M6IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0RmlsZShmaWxlLmlkKSwge1xuICAgICAgICAgIHVwbG9hZFN0YXJ0ZWQ6IERhdGUubm93KCksXG4gICAgICAgICAgdXBsb2FkQ29tcGxldGU6IGZhbHNlLFxuICAgICAgICAgIHBlcmNlbnRhZ2U6IDAsXG4gICAgICAgICAgYnl0ZXNVcGxvYWRlZDogMCxcbiAgICAgICAgICBieXRlc1RvdGFsOiBmaWxlLnNpemVcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIC8vIHVwbG9hZCBwcm9ncmVzcyBldmVudHMgY2FuIG9jY3VyIGZyZXF1ZW50bHksIGVzcGVjaWFsbHkgd2hlbiB5b3UgaGF2ZSBhIGdvb2RcbiAgICAvLyBjb25uZWN0aW9uIHRvIHRoZSByZW1vdGUgc2VydmVyLiBUaGVyZWZvcmUsIHdlIGFyZSB0aHJvdHRlbGluZyB0aGVtIHRvXG4gICAgLy8gcHJldmVudCBhY2Nlc3NpdmUgZnVuY3Rpb24gY2FsbHMuXG4gICAgLy8gc2VlIGFsc286IGh0dHBzOi8vZ2l0aHViLmNvbS90dXMvdHVzLWpzLWNsaWVudC9jb21taXQvOTk0MGYyN2IyMzYxZmQ3ZTEwYmE1OGIwOWI2MGQ4MjQyMjE4M2JiYlxuICAgIGNvbnN0IF90aHJvdHRsZWRDYWxjdWxhdGVQcm9ncmVzcyA9IHRocm90dGxlKHRoaXMuX2NhbGN1bGF0ZVByb2dyZXNzLCAxMDAsIHsgbGVhZGluZzogdHJ1ZSwgdHJhaWxpbmc6IHRydWUgfSlcblxuICAgIHRoaXMub24oJ3VwbG9hZC1wcm9ncmVzcycsIF90aHJvdHRsZWRDYWxjdWxhdGVQcm9ncmVzcylcblxuICAgIHRoaXMub24oJ3VwbG9hZC1zdWNjZXNzJywgKGZpbGUsIHVwbG9hZFJlc3AsIHVwbG9hZFVSTCkgPT4ge1xuICAgICAgdGhpcy5zZXRGaWxlU3RhdGUoZmlsZS5pZCwge1xuICAgICAgICBwcm9ncmVzczogT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRGaWxlKGZpbGUuaWQpLnByb2dyZXNzLCB7XG4gICAgICAgICAgdXBsb2FkQ29tcGxldGU6IHRydWUsXG4gICAgICAgICAgcGVyY2VudGFnZTogMTAwXG4gICAgICAgIH0pLFxuICAgICAgICB1cGxvYWRVUkw6IHVwbG9hZFVSTCxcbiAgICAgICAgaXNQYXVzZWQ6IGZhbHNlXG4gICAgICB9KVxuXG4gICAgICB0aGlzLl9jYWxjdWxhdGVUb3RhbFByb2dyZXNzKClcbiAgICB9KVxuXG4gICAgdGhpcy5vbigncHJlcHJvY2Vzcy1wcm9ncmVzcycsIChmaWxlLCBwcm9ncmVzcykgPT4ge1xuICAgICAgaWYgKCF0aGlzLmdldEZpbGUoZmlsZS5pZCkpIHtcbiAgICAgICAgdGhpcy5sb2coYE5vdCBzZXR0aW5nIHByb2dyZXNzIGZvciBhIGZpbGUgdGhhdCBoYXMgYmVlbiByZW1vdmVkOiAke2ZpbGUuaWR9YClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB0aGlzLnNldEZpbGVTdGF0ZShmaWxlLmlkLCB7XG4gICAgICAgIHByb2dyZXNzOiBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldEZpbGUoZmlsZS5pZCkucHJvZ3Jlc3MsIHtcbiAgICAgICAgICBwcmVwcm9jZXNzOiBwcm9ncmVzc1xuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgdGhpcy5vbigncHJlcHJvY2Vzcy1jb21wbGV0ZScsIChmaWxlKSA9PiB7XG4gICAgICBpZiAoIXRoaXMuZ2V0RmlsZShmaWxlLmlkKSkge1xuICAgICAgICB0aGlzLmxvZyhgTm90IHNldHRpbmcgcHJvZ3Jlc3MgZm9yIGEgZmlsZSB0aGF0IGhhcyBiZWVuIHJlbW92ZWQ6ICR7ZmlsZS5pZH1gKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIGNvbnN0IGZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLmZpbGVzKVxuICAgICAgZmlsZXNbZmlsZS5pZF0gPSBPYmplY3QuYXNzaWduKHt9LCBmaWxlc1tmaWxlLmlkXSwge1xuICAgICAgICBwcm9ncmVzczogT2JqZWN0LmFzc2lnbih7fSwgZmlsZXNbZmlsZS5pZF0ucHJvZ3Jlc3MpXG4gICAgICB9KVxuICAgICAgZGVsZXRlIGZpbGVzW2ZpbGUuaWRdLnByb2dyZXNzLnByZXByb2Nlc3NcblxuICAgICAgdGhpcy5zZXRTdGF0ZSh7IGZpbGVzOiBmaWxlcyB9KVxuICAgIH0pXG5cbiAgICB0aGlzLm9uKCdwb3N0cHJvY2Vzcy1wcm9ncmVzcycsIChmaWxlLCBwcm9ncmVzcykgPT4ge1xuICAgICAgaWYgKCF0aGlzLmdldEZpbGUoZmlsZS5pZCkpIHtcbiAgICAgICAgdGhpcy5sb2coYE5vdCBzZXR0aW5nIHByb2dyZXNzIGZvciBhIGZpbGUgdGhhdCBoYXMgYmVlbiByZW1vdmVkOiAke2ZpbGUuaWR9YClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB0aGlzLnNldEZpbGVTdGF0ZShmaWxlLmlkLCB7XG4gICAgICAgIHByb2dyZXNzOiBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXNbZmlsZS5pZF0ucHJvZ3Jlc3MsIHtcbiAgICAgICAgICBwb3N0cHJvY2VzczogcHJvZ3Jlc3NcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIHRoaXMub24oJ3Bvc3Rwcm9jZXNzLWNvbXBsZXRlJywgKGZpbGUpID0+IHtcbiAgICAgIGlmICghdGhpcy5nZXRGaWxlKGZpbGUuaWQpKSB7XG4gICAgICAgIHRoaXMubG9nKGBOb3Qgc2V0dGluZyBwcm9ncmVzcyBmb3IgYSBmaWxlIHRoYXQgaGFzIGJlZW4gcmVtb3ZlZDogJHtmaWxlLmlkfWApXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgY29uc3QgZmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXMpXG4gICAgICBmaWxlc1tmaWxlLmlkXSA9IE9iamVjdC5hc3NpZ24oe30sIGZpbGVzW2ZpbGUuaWRdLCB7XG4gICAgICAgIHByb2dyZXNzOiBPYmplY3QuYXNzaWduKHt9LCBmaWxlc1tmaWxlLmlkXS5wcm9ncmVzcylcbiAgICAgIH0pXG4gICAgICBkZWxldGUgZmlsZXNbZmlsZS5pZF0ucHJvZ3Jlc3MucG9zdHByb2Nlc3NcbiAgICAgIC8vIFRPRE8gc2hvdWxkIHdlIHNldCBzb21lIGtpbmQgb2YgYGZ1bGx5Q29tcGxldGVgIHByb3BlcnR5IG9uIHRoZSBmaWxlIG9iamVjdFxuICAgICAgLy8gc28gaXQncyBlYXNpZXIgdG8gc2VlIHRoYXQgdGhlIGZpbGUgaXMgdXBsb2Fk4oCmZnVsbHkgY29tcGxldGXigKZyYXRoZXIgdGhhblxuICAgICAgLy8gd2hhdCB3ZSBoYXZlIHRvIGRvIG5vdyAoYHVwbG9hZENvbXBsZXRlICYmICFwb3N0cHJvY2Vzc2ApXG5cbiAgICAgIHRoaXMuc2V0U3RhdGUoeyBmaWxlczogZmlsZXMgfSlcbiAgICB9KVxuXG4gICAgdGhpcy5vbigncmVzdG9yZWQnLCAoKSA9PiB7XG4gICAgICAvLyBGaWxlcyBtYXkgaGF2ZSBjaGFuZ2VkLS1lbnN1cmUgcHJvZ3Jlc3MgaXMgc3RpbGwgYWNjdXJhdGUuXG4gICAgICB0aGlzLl9jYWxjdWxhdGVUb3RhbFByb2dyZXNzKClcbiAgICB9KVxuXG4gICAgLy8gc2hvdyBpbmZvcm1lciBpZiBvZmZsaW5lXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb25saW5lJywgKCkgPT4gdGhpcy51cGRhdGVPbmxpbmVTdGF0dXMoKSlcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvZmZsaW5lJywgKCkgPT4gdGhpcy51cGRhdGVPbmxpbmVTdGF0dXMoKSlcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy51cGRhdGVPbmxpbmVTdGF0dXMoKSwgMzAwMClcbiAgICB9XG4gIH1cblxuICB1cGRhdGVPbmxpbmVTdGF0dXMgKCkge1xuICAgIGNvbnN0IG9ubGluZSA9XG4gICAgICB0eXBlb2Ygd2luZG93Lm5hdmlnYXRvci5vbkxpbmUgIT09ICd1bmRlZmluZWQnXG4gICAgICAgID8gd2luZG93Lm5hdmlnYXRvci5vbkxpbmVcbiAgICAgICAgOiB0cnVlXG4gICAgaWYgKCFvbmxpbmUpIHtcbiAgICAgIHRoaXMuZW1pdCgnaXMtb2ZmbGluZScpXG4gICAgICB0aGlzLmluZm8oJ05vIGludGVybmV0IGNvbm5lY3Rpb24nLCAnZXJyb3InLCAwKVxuICAgICAgdGhpcy53YXNPZmZsaW5lID0gdHJ1ZVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmVtaXQoJ2lzLW9ubGluZScpXG4gICAgICBpZiAodGhpcy53YXNPZmZsaW5lKSB7XG4gICAgICAgIHRoaXMuZW1pdCgnYmFjay1vbmxpbmUnKVxuICAgICAgICB0aGlzLmluZm8oJ0Nvbm5lY3RlZCEnLCAnc3VjY2VzcycsIDMwMDApXG4gICAgICAgIHRoaXMud2FzT2ZmbGluZSA9IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0SUQgKCkge1xuICAgIHJldHVybiB0aGlzLm9wdHMuaWRcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgYSBwbHVnaW4gd2l0aCBDb3JlLlxuICAgKlxuICAgKiBAcGFyYW0ge0NsYXNzfSBQbHVnaW4gb2JqZWN0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIG9iamVjdCB0aGF0IHdpbGwgYmUgcGFzc2VkIHRvIFBsdWdpbiBsYXRlclxuICAgKiBAcmV0dXJuIHtPYmplY3R9IHNlbGYgZm9yIGNoYWluaW5nXG4gICAqL1xuICB1c2UgKFBsdWdpbiwgb3B0cykge1xuICAgIGlmICh0eXBlb2YgUGx1Z2luICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBsZXQgbXNnID0gYEV4cGVjdGVkIGEgcGx1Z2luIGNsYXNzLCBidXQgZ290ICR7UGx1Z2luID09PSBudWxsID8gJ251bGwnIDogdHlwZW9mIFBsdWdpbn0uYCArXG4gICAgICAgICcgUGxlYXNlIHZlcmlmeSB0aGF0IHRoZSBwbHVnaW4gd2FzIGltcG9ydGVkIGFuZCBzcGVsbGVkIGNvcnJlY3RseS4nXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1zZylcbiAgICB9XG5cbiAgICAvLyBJbnN0YW50aWF0ZVxuICAgIGNvbnN0IHBsdWdpbiA9IG5ldyBQbHVnaW4odGhpcywgb3B0cylcbiAgICBjb25zdCBwbHVnaW5JZCA9IHBsdWdpbi5pZFxuICAgIHRoaXMucGx1Z2luc1twbHVnaW4udHlwZV0gPSB0aGlzLnBsdWdpbnNbcGx1Z2luLnR5cGVdIHx8IFtdXG5cbiAgICBpZiAoIXBsdWdpbklkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdXIgcGx1Z2luIG11c3QgaGF2ZSBhbiBpZCcpXG4gICAgfVxuXG4gICAgaWYgKCFwbHVnaW4udHlwZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3VyIHBsdWdpbiBtdXN0IGhhdmUgYSB0eXBlJylcbiAgICB9XG5cbiAgICBsZXQgZXhpc3RzUGx1Z2luQWxyZWFkeSA9IHRoaXMuZ2V0UGx1Z2luKHBsdWdpbklkKVxuICAgIGlmIChleGlzdHNQbHVnaW5BbHJlYWR5KSB7XG4gICAgICBsZXQgbXNnID0gYEFscmVhZHkgZm91bmQgYSBwbHVnaW4gbmFtZWQgJyR7ZXhpc3RzUGx1Z2luQWxyZWFkeS5pZH0nLlxuICAgICAgICBUcmllZCB0byB1c2U6ICcke3BsdWdpbklkfScuXG4gICAgICAgIFVwcHkgaXMgY3VycmVudGx5IGxpbWl0ZWQgdG8gcnVubmluZyBvbmUgb2YgZXZlcnkgcGx1Z2luLlxuICAgICAgICBTaGFyZSB5b3VyIHVzZSBjYXNlIHdpdGggdXMgb3ZlciBhdFxuICAgICAgICBodHRwczovL2dpdGh1Yi5jb20vdHJhbnNsb2FkaXQvdXBweS9pc3N1ZXMvXG4gICAgICAgIGlmIHlvdSB3YW50IHVzIHRvIHJlY29uc2lkZXIuYFxuICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZylcbiAgICB9XG5cbiAgICB0aGlzLnBsdWdpbnNbcGx1Z2luLnR5cGVdLnB1c2gocGx1Z2luKVxuICAgIHBsdWdpbi5pbnN0YWxsKClcblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvKipcbiAgICogRmluZCBvbmUgUGx1Z2luIGJ5IG5hbWUuXG4gICAqXG4gICAqIEBwYXJhbSBzdHJpbmcgbmFtZSBkZXNjcmlwdGlvblxuICAgKi9cbiAgZ2V0UGx1Z2luIChuYW1lKSB7XG4gICAgbGV0IGZvdW5kUGx1Z2luID0gZmFsc2VcbiAgICB0aGlzLml0ZXJhdGVQbHVnaW5zKChwbHVnaW4pID0+IHtcbiAgICAgIGNvbnN0IHBsdWdpbk5hbWUgPSBwbHVnaW4uaWRcbiAgICAgIGlmIChwbHVnaW5OYW1lID09PSBuYW1lKSB7XG4gICAgICAgIGZvdW5kUGx1Z2luID0gcGx1Z2luXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvdW5kUGx1Z2luXG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZSB0aHJvdWdoIGFsbCBgdXNlYGQgcGx1Z2lucy5cbiAgICpcbiAgICogQHBhcmFtIGZ1bmN0aW9uIG1ldGhvZCBkZXNjcmlwdGlvblxuICAgKi9cbiAgaXRlcmF0ZVBsdWdpbnMgKG1ldGhvZCkge1xuICAgIE9iamVjdC5rZXlzKHRoaXMucGx1Z2lucykuZm9yRWFjaChwbHVnaW5UeXBlID0+IHtcbiAgICAgIHRoaXMucGx1Z2luc1twbHVnaW5UeXBlXS5mb3JFYWNoKG1ldGhvZClcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIFVuaW5zdGFsbCBhbmQgcmVtb3ZlIGEgcGx1Z2luLlxuICAgKlxuICAgKiBAcGFyYW0ge1BsdWdpbn0gaW5zdGFuY2UgVGhlIHBsdWdpbiBpbnN0YW5jZSB0byByZW1vdmUuXG4gICAqL1xuICByZW1vdmVQbHVnaW4gKGluc3RhbmNlKSB7XG4gICAgY29uc3QgbGlzdCA9IHRoaXMucGx1Z2luc1tpbnN0YW5jZS50eXBlXVxuXG4gICAgaWYgKGluc3RhbmNlLnVuaW5zdGFsbCkge1xuICAgICAgaW5zdGFuY2UudW5pbnN0YWxsKClcbiAgICB9XG5cbiAgICBjb25zdCBpbmRleCA9IGxpc3QuaW5kZXhPZihpbnN0YW5jZSlcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICBsaXN0LnNwbGljZShpbmRleCwgMSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVW5pbnN0YWxsIGFsbCBwbHVnaW5zIGFuZCBjbG9zZSBkb3duIHRoaXMgVXBweSBpbnN0YW5jZS5cbiAgICovXG4gIGNsb3NlICgpIHtcbiAgICB0aGlzLnJlc2V0KClcblxuICAgIHRoaXMuX3N0b3JlVW5zdWJzY3JpYmUoKVxuXG4gICAgdGhpcy5pdGVyYXRlUGx1Z2lucygocGx1Z2luKSA9PiB7XG4gICAgICBwbHVnaW4udW5pbnN0YWxsKClcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICogU2V0IGluZm8gbWVzc2FnZSBpbiBgc3RhdGUuaW5mb2AsIHNvIHRoYXQgVUkgcGx1Z2lucyBsaWtlIGBJbmZvcm1lcmBcbiAgKiBjYW4gZGlzcGxheSB0aGUgbWVzc2FnZS5cbiAgKlxuICAqIEBwYXJhbSB7c3RyaW5nfSBtc2cgTWVzc2FnZSB0byBiZSBkaXNwbGF5ZWQgYnkgdGhlIGluZm9ybWVyXG4gICovXG5cbiAgaW5mbyAobWVzc2FnZSwgdHlwZSA9ICdpbmZvJywgZHVyYXRpb24gPSAzMDAwKSB7XG4gICAgY29uc3QgaXNDb21wbGV4TWVzc2FnZSA9IHR5cGVvZiBtZXNzYWdlID09PSAnb2JqZWN0J1xuXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBpbmZvOiB7XG4gICAgICAgIGlzSGlkZGVuOiBmYWxzZSxcbiAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgbWVzc2FnZTogaXNDb21wbGV4TWVzc2FnZSA/IG1lc3NhZ2UubWVzc2FnZSA6IG1lc3NhZ2UsXG4gICAgICAgIGRldGFpbHM6IGlzQ29tcGxleE1lc3NhZ2UgPyBtZXNzYWdlLmRldGFpbHMgOiBudWxsXG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoaXMuZW1pdCgnaW5mby12aXNpYmxlJylcblxuICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGhpcy5pbmZvVGltZW91dElEKVxuICAgIGlmIChkdXJhdGlvbiA9PT0gMCkge1xuICAgICAgdGhpcy5pbmZvVGltZW91dElEID0gdW5kZWZpbmVkXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBoaWRlIHRoZSBpbmZvcm1lciBhZnRlciBgZHVyYXRpb25gIG1pbGxpc2Vjb25kc1xuICAgIHRoaXMuaW5mb1RpbWVvdXRJRCA9IHNldFRpbWVvdXQodGhpcy5oaWRlSW5mbywgZHVyYXRpb24pXG4gIH1cblxuICBoaWRlSW5mbyAoKSB7XG4gICAgY29uc3QgbmV3SW5mbyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5pbmZvLCB7XG4gICAgICBpc0hpZGRlbjogdHJ1ZVxuICAgIH0pXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBpbmZvOiBuZXdJbmZvXG4gICAgfSlcbiAgICB0aGlzLmVtaXQoJ2luZm8taGlkZGVuJylcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIHN0dWZmIHRvIGNvbnNvbGUsIG9ubHkgaWYgYGRlYnVnYCBpcyBzZXQgdG8gdHJ1ZS4gU2lsZW50IGluIHByb2R1Y3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gbXNnIHRvIGxvZ1xuICAgKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBvcHRpb25hbCBgZXJyb3JgIG9yIGB3YXJuaW5nYFxuICAgKi9cbiAgbG9nIChtc2csIHR5cGUpIHtcbiAgICBpZiAoIXRoaXMub3B0cy5kZWJ1Zykge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgbGV0IG1lc3NhZ2UgPSBgW1VwcHldIFske1V0aWxzLmdldFRpbWVTdGFtcCgpfV0gJHttc2d9YFxuXG4gICAgZ2xvYmFsLnVwcHlMb2cgPSBnbG9iYWwudXBweUxvZyArICdcXG4nICsgJ0RFQlVHIExPRzogJyArIG1zZ1xuXG4gICAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IobWVzc2FnZSlcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmICh0eXBlID09PSAnd2FybmluZycpIHtcbiAgICAgIGNvbnNvbGUud2FybihtZXNzYWdlKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYgKG1zZyA9PT0gYCR7bXNnfWApIHtcbiAgICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UpXG4gICAgfSBlbHNlIHtcbiAgICAgIG1lc3NhZ2UgPSBgW1VwcHldIFske1V0aWxzLmdldFRpbWVTdGFtcCgpfV1gXG4gICAgICBjb25zb2xlLmxvZyhtZXNzYWdlKVxuICAgICAgY29uc29sZS5kaXIobXNnKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBhY3Rpb25zLlxuICAgKlxuICAgKi9cbiAgcnVuICgpIHtcbiAgICB0aGlzLmxvZygnQ29yZSBpcyBydW4sIGluaXRpYWxpemluZyBhY3Rpb25zLi4uJylcbiAgICB0aGlzLmFjdGlvbnMoKVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXN0b3JlIGFuIHVwbG9hZCBieSBpdHMgSUQuXG4gICAqL1xuICByZXN0b3JlICh1cGxvYWRJRCkge1xuICAgIHRoaXMubG9nKGBDb3JlOiBhdHRlbXB0aW5nIHRvIHJlc3RvcmUgdXBsb2FkIFwiJHt1cGxvYWRJRH1cImApXG5cbiAgICBpZiAoIXRoaXMuZ2V0U3RhdGUoKS5jdXJyZW50VXBsb2Fkc1t1cGxvYWRJRF0pIHtcbiAgICAgIHRoaXMuX3JlbW92ZVVwbG9hZCh1cGxvYWRJRClcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ05vbmV4aXN0ZW50IHVwbG9hZCcpKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9ydW5VcGxvYWQodXBsb2FkSUQpXG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGFuIHVwbG9hZCBmb3IgYSBidW5jaCBvZiBmaWxlcy5cbiAgICpcbiAgICogQHBhcmFtIHtBcnJheTxzdHJpbmc+fSBmaWxlSURzIEZpbGUgSURzIHRvIGluY2x1ZGUgaW4gdGhpcyB1cGxvYWQuXG4gICAqIEByZXR1cm4ge3N0cmluZ30gSUQgb2YgdGhpcyB1cGxvYWQuXG4gICAqL1xuICBfY3JlYXRlVXBsb2FkIChmaWxlSURzKSB7XG4gICAgY29uc3QgdXBsb2FkSUQgPSBjdWlkKClcblxuICAgIHRoaXMuZW1pdCgndXBsb2FkJywge1xuICAgICAgaWQ6IHVwbG9hZElELFxuICAgICAgZmlsZUlEczogZmlsZUlEc1xuICAgIH0pXG5cbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGN1cnJlbnRVcGxvYWRzOiBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuY3VycmVudFVwbG9hZHMsIHtcbiAgICAgICAgW3VwbG9hZElEXToge1xuICAgICAgICAgIGZpbGVJRHM6IGZpbGVJRHMsXG4gICAgICAgICAgc3RlcDogMCxcbiAgICAgICAgICByZXN1bHQ6IHt9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSlcblxuICAgIHJldHVybiB1cGxvYWRJRFxuICB9XG5cbiAgX2dldFVwbG9hZCAodXBsb2FkSUQpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRTdGF0ZSgpLmN1cnJlbnRVcGxvYWRzW3VwbG9hZElEXVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBkYXRhIHRvIGFuIHVwbG9hZCdzIHJlc3VsdCBvYmplY3QuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cGxvYWRJRCBUaGUgSUQgb2YgdGhlIHVwbG9hZC5cbiAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgRGF0YSBwcm9wZXJ0aWVzIHRvIGFkZCB0byB0aGUgcmVzdWx0IG9iamVjdC5cbiAgICovXG4gIGFkZFJlc3VsdERhdGEgKHVwbG9hZElELCBkYXRhKSB7XG4gICAgaWYgKCF0aGlzLl9nZXRVcGxvYWQodXBsb2FkSUQpKSB7XG4gICAgICB0aGlzLmxvZyhgTm90IHNldHRpbmcgcmVzdWx0IGZvciBhbiB1cGxvYWQgdGhhdCBoYXMgYmVlbiByZW1vdmVkOiAke3VwbG9hZElEfWApXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uc3QgY3VycmVudFVwbG9hZHMgPSB0aGlzLmdldFN0YXRlKCkuY3VycmVudFVwbG9hZHNcbiAgICBjb25zdCBjdXJyZW50VXBsb2FkID0gT2JqZWN0LmFzc2lnbih7fSwgY3VycmVudFVwbG9hZHNbdXBsb2FkSURdLCB7XG4gICAgICByZXN1bHQ6IE9iamVjdC5hc3NpZ24oe30sIGN1cnJlbnRVcGxvYWRzW3VwbG9hZElEXS5yZXN1bHQsIGRhdGEpXG4gICAgfSlcbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGN1cnJlbnRVcGxvYWRzOiBPYmplY3QuYXNzaWduKHt9LCBjdXJyZW50VXBsb2Fkcywge1xuICAgICAgICBbdXBsb2FkSURdOiBjdXJyZW50VXBsb2FkXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGFuIHVwbG9hZCwgZWcuIGlmIGl0IGhhcyBiZWVuIGNhbmNlbGVkIG9yIGNvbXBsZXRlZC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVwbG9hZElEIFRoZSBJRCBvZiB0aGUgdXBsb2FkLlxuICAgKi9cbiAgX3JlbW92ZVVwbG9hZCAodXBsb2FkSUQpIHtcbiAgICBjb25zdCBjdXJyZW50VXBsb2FkcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5jdXJyZW50VXBsb2FkcylcbiAgICBkZWxldGUgY3VycmVudFVwbG9hZHNbdXBsb2FkSURdXG5cbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGN1cnJlbnRVcGxvYWRzOiBjdXJyZW50VXBsb2Fkc1xuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogUnVuIGFuIHVwbG9hZC4gVGhpcyBwaWNrcyB1cCB3aGVyZSBpdCBsZWZ0IG9mZiBpbiBjYXNlIHRoZSB1cGxvYWQgaXMgYmVpbmcgcmVzdG9yZWQuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcnVuVXBsb2FkICh1cGxvYWRJRCkge1xuICAgIGNvbnN0IHVwbG9hZERhdGEgPSB0aGlzLmdldFN0YXRlKCkuY3VycmVudFVwbG9hZHNbdXBsb2FkSURdXG4gICAgY29uc3QgZmlsZUlEcyA9IHVwbG9hZERhdGEuZmlsZUlEc1xuICAgIGNvbnN0IHJlc3RvcmVTdGVwID0gdXBsb2FkRGF0YS5zdGVwXG5cbiAgICBjb25zdCBzdGVwcyA9IFtcbiAgICAgIC4uLnRoaXMucHJlUHJvY2Vzc29ycyxcbiAgICAgIC4uLnRoaXMudXBsb2FkZXJzLFxuICAgICAgLi4udGhpcy5wb3N0UHJvY2Vzc29yc1xuICAgIF1cbiAgICBsZXQgbGFzdFN0ZXAgPSBQcm9taXNlLnJlc29sdmUoKVxuICAgIHN0ZXBzLmZvckVhY2goKGZuLCBzdGVwKSA9PiB7XG4gICAgICAvLyBTa2lwIHRoaXMgc3RlcCBpZiB3ZSBhcmUgcmVzdG9yaW5nIGFuZCBoYXZlIGFscmVhZHkgY29tcGxldGVkIHRoaXMgc3RlcCBiZWZvcmUuXG4gICAgICBpZiAoc3RlcCA8IHJlc3RvcmVTdGVwKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBsYXN0U3RlcCA9IGxhc3RTdGVwLnRoZW4oKCkgPT4ge1xuICAgICAgICBjb25zdCB7IGN1cnJlbnRVcGxvYWRzIH0gPSB0aGlzLmdldFN0YXRlKClcbiAgICAgICAgY29uc3QgY3VycmVudFVwbG9hZCA9IE9iamVjdC5hc3NpZ24oe30sIGN1cnJlbnRVcGxvYWRzW3VwbG9hZElEXSwge1xuICAgICAgICAgIHN0ZXA6IHN0ZXBcbiAgICAgICAgfSlcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgY3VycmVudFVwbG9hZHM6IE9iamVjdC5hc3NpZ24oe30sIGN1cnJlbnRVcGxvYWRzLCB7XG4gICAgICAgICAgICBbdXBsb2FkSURdOiBjdXJyZW50VXBsb2FkXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgLy8gVE9ETyBnaXZlIHRoaXMgdGhlIGBjdXJyZW50VXBsb2FkYCBvYmplY3QgYXMgaXRzIG9ubHkgcGFyYW1ldGVyIG1heWJlP1xuICAgICAgICAvLyBPdGhlcndpc2Ugd2hlbiBtb3JlIG1ldGFkYXRhIG1heSBiZSBhZGRlZCB0byB0aGUgdXBsb2FkIHRoaXMgd291bGQga2VlcCBnZXR0aW5nIG1vcmUgcGFyYW1ldGVyc1xuICAgICAgICByZXR1cm4gZm4oZmlsZUlEcywgdXBsb2FkSUQpXG4gICAgICB9KS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIC8vIE5vdCByZXR1cm5pbmcgdGhlIGBjYXRjaGBlZCBwcm9taXNlLCBiZWNhdXNlIHdlIHN0aWxsIHdhbnQgdG8gcmV0dXJuIGEgcmVqZWN0ZWRcbiAgICAvLyBwcm9taXNlIGZyb20gdGhpcyBtZXRob2QgaWYgdGhlIHVwbG9hZCBmYWlsZWQuXG4gICAgbGFzdFN0ZXAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIGVycilcblxuICAgICAgdGhpcy5fcmVtb3ZlVXBsb2FkKHVwbG9hZElEKVxuICAgIH0pXG5cbiAgICByZXR1cm4gbGFzdFN0ZXAudGhlbigoKSA9PiB7XG4gICAgICBjb25zdCBmaWxlcyA9IGZpbGVJRHMubWFwKChmaWxlSUQpID0+IHRoaXMuZ2V0RmlsZShmaWxlSUQpKVxuICAgICAgY29uc3Qgc3VjY2Vzc2Z1bCA9IGZpbGVzLmZpbHRlcigoZmlsZSkgPT4gZmlsZSAmJiAhZmlsZS5lcnJvcilcbiAgICAgIGNvbnN0IGZhaWxlZCA9IGZpbGVzLmZpbHRlcigoZmlsZSkgPT4gZmlsZSAmJiBmaWxlLmVycm9yKVxuICAgICAgdGhpcy5hZGRSZXN1bHREYXRhKHVwbG9hZElELCB7IHN1Y2Nlc3NmdWwsIGZhaWxlZCwgdXBsb2FkSUQgfSlcblxuICAgICAgY29uc3QgeyBjdXJyZW50VXBsb2FkcyB9ID0gdGhpcy5nZXRTdGF0ZSgpXG4gICAgICBpZiAoIWN1cnJlbnRVcGxvYWRzW3VwbG9hZElEXSkge1xuICAgICAgICB0aGlzLmxvZyhgTm90IHNldHRpbmcgcmVzdWx0IGZvciBhbiB1cGxvYWQgdGhhdCBoYXMgYmVlbiByZW1vdmVkOiAke3VwbG9hZElEfWApXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBjb25zdCByZXN1bHQgPSBjdXJyZW50VXBsb2Fkc1t1cGxvYWRJRF0ucmVzdWx0XG4gICAgICB0aGlzLmVtaXQoJ2NvbXBsZXRlJywgcmVzdWx0KVxuXG4gICAgICB0aGlzLl9yZW1vdmVVcGxvYWQodXBsb2FkSUQpXG5cbiAgICAgIHJldHVybiByZXN1bHRcbiAgICB9KVxuICB9XG5cbiAgICAvKipcbiAgICogU3RhcnQgYW4gdXBsb2FkIGZvciBhbGwgdGhlIGZpbGVzIHRoYXQgYXJlIG5vdCBjdXJyZW50bHkgYmVpbmcgdXBsb2FkZWQuXG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAqL1xuICB1cGxvYWQgKCkge1xuICAgIGlmICghdGhpcy5wbHVnaW5zLnVwbG9hZGVyKSB7XG4gICAgICB0aGlzLmxvZygnTm8gdXBsb2FkZXIgdHlwZSBwbHVnaW5zIGFyZSB1c2VkJywgJ3dhcm5pbmcnKVxuICAgIH1cblxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgLnRoZW4oKCkgPT4gdGhpcy5vcHRzLm9uQmVmb3JlVXBsb2FkKHRoaXMuZ2V0U3RhdGUoKS5maWxlcykpXG4gICAgICAudGhlbigoKSA9PiB0aGlzLl9jaGVja01pbk51bWJlck9mRmlsZXMoKSlcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgY29uc3QgeyBjdXJyZW50VXBsb2FkcyB9ID0gdGhpcy5nZXRTdGF0ZSgpXG4gICAgICAgIC8vIGdldCBhIGxpc3Qgb2YgZmlsZXMgdGhhdCBhcmUgY3VycmVudGx5IGFzc2lnbmVkIHRvIHVwbG9hZHNcbiAgICAgICAgY29uc3QgY3VycmVudGx5VXBsb2FkaW5nRmlsZXMgPSBPYmplY3Qua2V5cyhjdXJyZW50VXBsb2FkcykucmVkdWNlKChwcmV2LCBjdXJyKSA9PiBwcmV2LmNvbmNhdChjdXJyZW50VXBsb2Fkc1tjdXJyXS5maWxlSURzKSwgW10pXG5cbiAgICAgICAgY29uc3Qgd2FpdGluZ0ZpbGVJRHMgPSBbXVxuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLmdldFN0YXRlKCkuZmlsZXMpLmZvckVhY2goKGZpbGVJRCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmdldEZpbGUoZmlsZUlEKVxuICAgICAgICAgIC8vIGlmIHRoZSBmaWxlIGhhc24ndCBzdGFydGVkIHVwbG9hZGluZyBhbmQgaGFzbid0IGFscmVhZHkgYmVlbiBhc3NpZ25lZCB0byBhbiB1cGxvYWQuLlxuICAgICAgICAgIGlmICgoIWZpbGUucHJvZ3Jlc3MudXBsb2FkU3RhcnRlZCkgJiYgKGN1cnJlbnRseVVwbG9hZGluZ0ZpbGVzLmluZGV4T2YoZmlsZUlEKSA9PT0gLTEpKSB7XG4gICAgICAgICAgICB3YWl0aW5nRmlsZUlEcy5wdXNoKGZpbGUuaWQpXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIGNvbnN0IHVwbG9hZElEID0gdGhpcy5fY3JlYXRlVXBsb2FkKHdhaXRpbmdGaWxlSURzKVxuICAgICAgICByZXR1cm4gdGhpcy5fcnVuVXBsb2FkKHVwbG9hZElEKVxuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0eXBlb2YgZXJyID09PSAnb2JqZWN0JyA/IGVyci5tZXNzYWdlIDogZXJyXG4gICAgICAgIHRoaXMubG9nKG1lc3NhZ2UpXG4gICAgICAgIHRoaXMuaW5mbyhtZXNzYWdlLCAnZXJyb3InLCA0MDAwKVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QodHlwZW9mIGVyciA9PT0gJ29iamVjdCcgPyBlcnIgOiBuZXcgRXJyb3IoZXJyKSlcbiAgICAgIH0pXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0cykge1xuICByZXR1cm4gbmV3IFVwcHkob3B0cylcbn1cbi8vIEV4cG9zZSBjbGFzcyBjb25zdHJ1Y3Rvci5cbm1vZHVsZS5leHBvcnRzLlVwcHkgPSBVcHB5XG4iLCJjb25zdCBwcmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKVxuY29uc3QgeyBmaW5kRE9NRWxlbWVudCB9ID0gcmVxdWlyZSgnLi4vY29yZS9VdGlscycpXG5cbi8qKlxuICogQm9pbGVycGxhdGUgdGhhdCBhbGwgUGx1Z2lucyBzaGFyZSAtIGFuZCBzaG91bGQgbm90IGJlIHVzZWRcbiAqIGRpcmVjdGx5LiBJdCBhbHNvIHNob3dzIHdoaWNoIG1ldGhvZHMgZmluYWwgcGx1Z2lucyBzaG91bGQgaW1wbGVtZW50L292ZXJyaWRlLFxuICogdGhpcyBkZWNpZGluZyBvbiBzdHJ1Y3R1cmUuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG1haW4gVXBweSBjb3JlIG9iamVjdFxuICogQHBhcmFtIHtvYmplY3R9IG9iamVjdCB3aXRoIHBsdWdpbiBvcHRpb25zXG4gKiBAcmV0dXJuIHthcnJheSB8IHN0cmluZ30gZmlsZXMgb3Igc3VjY2Vzcy9mYWlsIG1lc3NhZ2VcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBQbHVnaW4ge1xuICBjb25zdHJ1Y3RvciAodXBweSwgb3B0cykge1xuICAgIHRoaXMudXBweSA9IHVwcHlcbiAgICB0aGlzLm9wdHMgPSBvcHRzIHx8IHt9XG5cbiAgICB0aGlzLnVwZGF0ZSA9IHRoaXMudXBkYXRlLmJpbmQodGhpcylcbiAgICB0aGlzLm1vdW50ID0gdGhpcy5tb3VudC5iaW5kKHRoaXMpXG4gICAgdGhpcy5pbnN0YWxsID0gdGhpcy5pbnN0YWxsLmJpbmQodGhpcylcbiAgICB0aGlzLnVuaW5zdGFsbCA9IHRoaXMudW5pbnN0YWxsLmJpbmQodGhpcylcbiAgfVxuXG4gIGdldFBsdWdpblN0YXRlICgpIHtcbiAgICByZXR1cm4gdGhpcy51cHB5LnN0YXRlLnBsdWdpbnNbdGhpcy5pZF1cbiAgfVxuXG4gIHNldFBsdWdpblN0YXRlICh1cGRhdGUpIHtcbiAgICBjb25zdCBwbHVnaW5zID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy51cHB5LnN0YXRlLnBsdWdpbnMpXG4gICAgcGx1Z2luc1t0aGlzLmlkXSA9IE9iamVjdC5hc3NpZ24oe30sIHBsdWdpbnNbdGhpcy5pZF0sIHVwZGF0ZSlcblxuICAgIHRoaXMudXBweS5zZXRTdGF0ZSh7XG4gICAgICBwbHVnaW5zOiBwbHVnaW5zXG4gICAgfSlcbiAgfVxuXG4gIHVwZGF0ZSAoc3RhdGUpIHtcbiAgICBpZiAodHlwZW9mIHRoaXMuZWwgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAodGhpcy51cGRhdGVVSSkge1xuICAgICAgdGhpcy51cGRhdGVVSShzdGF0ZSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgaWYgc3VwcGxpZWQgYHRhcmdldGAgaXMgYSBET00gZWxlbWVudCBvciBhbiBgb2JqZWN0YC5cbiAgICogSWYgaXTigJlzIGFuIG9iamVjdCDigJQgdGFyZ2V0IGlzIGEgcGx1Z2luLCBhbmQgd2Ugc2VhcmNoIGBwbHVnaW5zYFxuICAgKiBmb3IgYSBwbHVnaW4gd2l0aCBzYW1lIG5hbWUgYW5kIHJldHVybiBpdHMgdGFyZ2V0LlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IHRhcmdldFxuICAgKlxuICAgKi9cbiAgbW91bnQgKHRhcmdldCwgcGx1Z2luKSB7XG4gICAgY29uc3QgY2FsbGVyUGx1Z2luTmFtZSA9IHBsdWdpbi5pZFxuXG4gICAgY29uc3QgdGFyZ2V0RWxlbWVudCA9IGZpbmRET01FbGVtZW50KHRhcmdldClcblxuICAgIGlmICh0YXJnZXRFbGVtZW50KSB7XG4gICAgICB0aGlzLnVwZGF0ZVVJID0gKHN0YXRlKSA9PiB7XG4gICAgICAgIHRoaXMuZWwgPSBwcmVhY3QucmVuZGVyKHRoaXMucmVuZGVyKHN0YXRlKSwgdGFyZ2V0RWxlbWVudCwgdGhpcy5lbClcbiAgICAgIH1cblxuICAgICAgdGhpcy51cHB5LmxvZyhgSW5zdGFsbGluZyAke2NhbGxlclBsdWdpbk5hbWV9IHRvIGEgRE9NIGVsZW1lbnRgKVxuXG4gICAgICAvLyBjbGVhciBldmVyeXRoaW5nIGluc2lkZSB0aGUgdGFyZ2V0IGNvbnRhaW5lclxuICAgICAgaWYgKHRoaXMub3B0cy5yZXBsYWNlVGFyZ2V0Q29udGVudCkge1xuICAgICAgICB0YXJnZXRFbGVtZW50LmlubmVySFRNTCA9ICcnXG4gICAgICB9XG5cbiAgICAgIHRoaXMuZWwgPSBwcmVhY3QucmVuZGVyKHRoaXMucmVuZGVyKHRoaXMudXBweS5zdGF0ZSksIHRhcmdldEVsZW1lbnQpXG5cbiAgICAgIHJldHVybiB0aGlzLmVsXG4gICAgfVxuXG4gICAgbGV0IHRhcmdldFBsdWdpblxuICAgIGlmICh0eXBlb2YgdGFyZ2V0ID09PSAnb2JqZWN0JyAmJiB0YXJnZXQgaW5zdGFuY2VvZiBQbHVnaW4pIHtcbiAgICAgIC8vIFRhcmdldGluZyBhIHBsdWdpbiAqaW5zdGFuY2UqXG4gICAgICB0YXJnZXRQbHVnaW4gPSB0YXJnZXRcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0YXJnZXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIFRhcmdldGluZyBhIHBsdWdpbiB0eXBlXG4gICAgICBjb25zdCBUYXJnZXQgPSB0YXJnZXRcbiAgICAgIC8vIEZpbmQgdGhlIHRhcmdldCBwbHVnaW4gaW5zdGFuY2UuXG4gICAgICB0aGlzLnVwcHkuaXRlcmF0ZVBsdWdpbnMoKHBsdWdpbikgPT4ge1xuICAgICAgICBpZiAocGx1Z2luIGluc3RhbmNlb2YgVGFyZ2V0KSB7XG4gICAgICAgICAgdGFyZ2V0UGx1Z2luID0gcGx1Z2luXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuXG4gICAgaWYgKHRhcmdldFBsdWdpbikge1xuICAgICAgY29uc3QgdGFyZ2V0UGx1Z2luTmFtZSA9IHRhcmdldFBsdWdpbi5pZFxuICAgICAgdGhpcy51cHB5LmxvZyhgSW5zdGFsbGluZyAke2NhbGxlclBsdWdpbk5hbWV9IHRvICR7dGFyZ2V0UGx1Z2luTmFtZX1gKVxuICAgICAgdGhpcy5lbCA9IHRhcmdldFBsdWdpbi5hZGRUYXJnZXQocGx1Z2luKVxuICAgICAgcmV0dXJuIHRoaXMuZWxcbiAgICB9XG5cbiAgICB0aGlzLnVwcHkubG9nKGBOb3QgaW5zdGFsbGluZyAke2NhbGxlclBsdWdpbk5hbWV9YClcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgdGFyZ2V0IG9wdGlvbiBnaXZlbiB0byAke2NhbGxlclBsdWdpbk5hbWV9YClcbiAgfVxuXG4gIHJlbmRlciAoc3RhdGUpIHtcbiAgICB0aHJvdyAobmV3IEVycm9yKCdFeHRlbmQgdGhlIHJlbmRlciBtZXRob2QgdG8gYWRkIHlvdXIgcGx1Z2luIHRvIGEgRE9NIGVsZW1lbnQnKSlcbiAgfVxuXG4gIGFkZFRhcmdldCAocGx1Z2luKSB7XG4gICAgdGhyb3cgKG5ldyBFcnJvcignRXh0ZW5kIHRoZSBhZGRUYXJnZXQgbWV0aG9kIHRvIGFkZCB5b3VyIHBsdWdpbiB0byBhbm90aGVyIHBsdWdpblxcJ3MgdGFyZ2V0JykpXG4gIH1cblxuICB1bm1vdW50ICgpIHtcbiAgICBpZiAodGhpcy5lbCAmJiB0aGlzLmVsLnBhcmVudE5vZGUpIHtcbiAgICAgIHRoaXMuZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmVsKVxuICAgIH1cbiAgICAvLyB0aGlzLnRhcmdldCA9IG51bGxcbiAgfVxuXG4gIGluc3RhbGwgKCkge1xuXG4gIH1cblxuICB1bmluc3RhbGwgKCkge1xuICAgIHRoaXMudW5tb3VudCgpXG4gIH1cbn1cbiIsIi8qKlxuICogVHJhbnNsYXRlcyBzdHJpbmdzIHdpdGggaW50ZXJwb2xhdGlvbiAmIHBsdXJhbGl6YXRpb24gc3VwcG9ydC5cbiAqIEV4dGVuc2libGUgd2l0aCBjdXN0b20gZGljdGlvbmFyaWVzIGFuZCBwbHVyYWxpemF0aW9uIGZ1bmN0aW9ucy5cbiAqXG4gKiBCb3Jyb3dzIGhlYXZpbHkgZnJvbSBhbmQgaW5zcGlyZWQgYnkgUG9seWdsb3QgaHR0cHM6Ly9naXRodWIuY29tL2FpcmJuYi9wb2x5Z2xvdC5qcyxcbiAqIGJhc2ljYWxseSBhIHN0cmlwcGVkLWRvd24gdmVyc2lvbiBvZiBpdC4gRGlmZmVyZW5jZXM6IHBsdXJhbGl6YXRpb24gZnVuY3Rpb25zIGFyZSBub3QgaGFyZGNvZGVkXG4gKiBhbmQgY2FuIGJlIGVhc2lseSBhZGRlZCBhbW9uZyB3aXRoIGRpY3Rpb25hcmllcywgbmVzdGVkIG9iamVjdHMgYXJlIHVzZWQgZm9yIHBsdXJhbGl6YXRpb25cbiAqIGFzIG9wcG9zZWQgdG8gYHx8fHxgIGRlbGltZXRlclxuICpcbiAqIFVzYWdlIGV4YW1wbGU6IGB0cmFuc2xhdG9yLnRyYW5zbGF0ZSgnZmlsZXNfY2hvc2VuJywge3NtYXJ0X2NvdW50OiAzfSlgXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9wdHNcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBUcmFuc2xhdG9yIHtcbiAgY29uc3RydWN0b3IgKG9wdHMpIHtcbiAgICBjb25zdCBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgIGxvY2FsZToge1xuICAgICAgICBzdHJpbmdzOiB7fSxcbiAgICAgICAgcGx1cmFsaXplOiBmdW5jdGlvbiAobikge1xuICAgICAgICAgIGlmIChuID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gMFxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gMVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5vcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdHMpXG4gICAgdGhpcy5sb2NhbGUgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucy5sb2NhbGUsIG9wdHMubG9jYWxlKVxuXG4gICAgLy8gY29uc29sZS5sb2codGhpcy5vcHRzLmxvY2FsZSlcblxuICAgIC8vIHRoaXMubG9jYWxlLnBsdXJhbGl6ZSA9IHRoaXMubG9jYWxlID8gdGhpcy5sb2NhbGUucGx1cmFsaXplIDogZGVmYXVsdFBsdXJhbGl6ZVxuICAgIC8vIHRoaXMubG9jYWxlLnN0cmluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBlbl9VUy5zdHJpbmdzLCB0aGlzLm9wdHMubG9jYWxlLnN0cmluZ3MpXG4gIH1cblxuLyoqXG4gKiBUYWtlcyBhIHN0cmluZyB3aXRoIHBsYWNlaG9sZGVyIHZhcmlhYmxlcyBsaWtlIGAle3NtYXJ0X2NvdW50fSBmaWxlIHNlbGVjdGVkYFxuICogYW5kIHJlcGxhY2VzIGl0IHdpdGggdmFsdWVzIGZyb20gb3B0aW9ucyBge3NtYXJ0X2NvdW50OiA1fWBcbiAqXG4gKiBAbGljZW5zZSBodHRwczovL2dpdGh1Yi5jb20vYWlyYm5iL3BvbHlnbG90LmpzL2Jsb2IvbWFzdGVyL0xJQ0VOU0VcbiAqIHRha2VuIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2FpcmJuYi9wb2x5Z2xvdC5qcy9ibG9iL21hc3Rlci9saWIvcG9seWdsb3QuanMjTDI5OVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBwaHJhc2UgdGhhdCBuZWVkcyBpbnRlcnBvbGF0aW9uLCB3aXRoIHBsYWNlaG9sZGVyc1xuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgd2l0aCB2YWx1ZXMgdGhhdCB3aWxsIGJlIHVzZWQgdG8gcmVwbGFjZSBwbGFjZWhvbGRlcnNcbiAqIEByZXR1cm4ge3N0cmluZ30gaW50ZXJwb2xhdGVkXG4gKi9cbiAgaW50ZXJwb2xhdGUgKHBocmFzZSwgb3B0aW9ucykge1xuICAgIGNvbnN0IHJlcGxhY2UgPSBTdHJpbmcucHJvdG90eXBlLnJlcGxhY2VcbiAgICBjb25zdCBkb2xsYXJSZWdleCA9IC9cXCQvZ1xuICAgIGNvbnN0IGRvbGxhckJpbGxzWWFsbCA9ICckJCQkJ1xuXG4gICAgZm9yIChsZXQgYXJnIGluIG9wdGlvbnMpIHtcbiAgICAgIGlmIChhcmcgIT09ICdfJyAmJiBvcHRpb25zLmhhc093blByb3BlcnR5KGFyZykpIHtcbiAgICAgICAgLy8gRW5zdXJlIHJlcGxhY2VtZW50IHZhbHVlIGlzIGVzY2FwZWQgdG8gcHJldmVudCBzcGVjaWFsICQtcHJlZml4ZWRcbiAgICAgICAgLy8gcmVnZXggcmVwbGFjZSB0b2tlbnMuIHRoZSBcIiQkJCRcIiBpcyBuZWVkZWQgYmVjYXVzZSBlYWNoIFwiJFwiIG5lZWRzIHRvXG4gICAgICAgIC8vIGJlIGVzY2FwZWQgd2l0aCBcIiRcIiBpdHNlbGYsIGFuZCB3ZSBuZWVkIHR3byBpbiB0aGUgcmVzdWx0aW5nIG91dHB1dC5cbiAgICAgICAgdmFyIHJlcGxhY2VtZW50ID0gb3B0aW9uc1thcmddXG4gICAgICAgIGlmICh0eXBlb2YgcmVwbGFjZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgcmVwbGFjZW1lbnQgPSByZXBsYWNlLmNhbGwob3B0aW9uc1thcmddLCBkb2xsYXJSZWdleCwgZG9sbGFyQmlsbHNZYWxsKVxuICAgICAgICB9XG4gICAgICAgIC8vIFdlIGNyZWF0ZSBhIG5ldyBgUmVnRXhwYCBlYWNoIHRpbWUgaW5zdGVhZCBvZiB1c2luZyBhIG1vcmUtZWZmaWNpZW50XG4gICAgICAgIC8vIHN0cmluZyByZXBsYWNlIHNvIHRoYXQgdGhlIHNhbWUgYXJndW1lbnQgY2FuIGJlIHJlcGxhY2VkIG11bHRpcGxlIHRpbWVzXG4gICAgICAgIC8vIGluIHRoZSBzYW1lIHBocmFzZS5cbiAgICAgICAgcGhyYXNlID0gcmVwbGFjZS5jYWxsKHBocmFzZSwgbmV3IFJlZ0V4cCgnJVxcXFx7JyArIGFyZyArICdcXFxcfScsICdnJyksIHJlcGxhY2VtZW50KVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGhyYXNlXG4gIH1cblxuLyoqXG4gKiBQdWJsaWMgdHJhbnNsYXRlIG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIHdpdGggdmFsdWVzIHRoYXQgd2lsbCBiZSB1c2VkIGxhdGVyIHRvIHJlcGxhY2UgcGxhY2Vob2xkZXJzIGluIHN0cmluZ1xuICogQHJldHVybiB7c3RyaW5nfSB0cmFuc2xhdGVkIChhbmQgaW50ZXJwb2xhdGVkKVxuICovXG4gIHRyYW5zbGF0ZSAoa2V5LCBvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5zbWFydF9jb3VudCkge1xuICAgICAgdmFyIHBsdXJhbCA9IHRoaXMubG9jYWxlLnBsdXJhbGl6ZShvcHRpb25zLnNtYXJ0X2NvdW50KVxuICAgICAgcmV0dXJuIHRoaXMuaW50ZXJwb2xhdGUodGhpcy5vcHRzLmxvY2FsZS5zdHJpbmdzW2tleV1bcGx1cmFsXSwgb3B0aW9ucylcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5pbnRlcnBvbGF0ZSh0aGlzLm9wdHMubG9jYWxlLnN0cmluZ3Nba2V5XSwgb3B0aW9ucylcbiAgfVxufVxuIiwiY29uc3QgZWUgPSByZXF1aXJlKCduYW1lc3BhY2UtZW1pdHRlcicpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgVXBweVNvY2tldCB7XG4gIGNvbnN0cnVjdG9yIChvcHRzKSB7XG4gICAgdGhpcy5xdWV1ZWQgPSBbXVxuICAgIHRoaXMuaXNPcGVuID0gZmFsc2VcbiAgICB0aGlzLnNvY2tldCA9IG5ldyBXZWJTb2NrZXQob3B0cy50YXJnZXQpXG4gICAgdGhpcy5lbWl0dGVyID0gZWUoKVxuXG4gICAgdGhpcy5zb2NrZXQub25vcGVuID0gKGUpID0+IHtcbiAgICAgIHRoaXMuaXNPcGVuID0gdHJ1ZVxuXG4gICAgICB3aGlsZSAodGhpcy5xdWV1ZWQubGVuZ3RoID4gMCAmJiB0aGlzLmlzT3Blbikge1xuICAgICAgICBjb25zdCBmaXJzdCA9IHRoaXMucXVldWVkWzBdXG4gICAgICAgIHRoaXMuc2VuZChmaXJzdC5hY3Rpb24sIGZpcnN0LnBheWxvYWQpXG4gICAgICAgIHRoaXMucXVldWVkID0gdGhpcy5xdWV1ZWQuc2xpY2UoMSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnNvY2tldC5vbmNsb3NlID0gKGUpID0+IHtcbiAgICAgIHRoaXMuaXNPcGVuID0gZmFsc2VcbiAgICB9XG5cbiAgICB0aGlzLl9oYW5kbGVNZXNzYWdlID0gdGhpcy5faGFuZGxlTWVzc2FnZS5iaW5kKHRoaXMpXG5cbiAgICB0aGlzLnNvY2tldC5vbm1lc3NhZ2UgPSB0aGlzLl9oYW5kbGVNZXNzYWdlXG5cbiAgICB0aGlzLmNsb3NlID0gdGhpcy5jbG9zZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5lbWl0ID0gdGhpcy5lbWl0LmJpbmQodGhpcylcbiAgICB0aGlzLm9uID0gdGhpcy5vbi5iaW5kKHRoaXMpXG4gICAgdGhpcy5vbmNlID0gdGhpcy5vbmNlLmJpbmQodGhpcylcbiAgICB0aGlzLnNlbmQgPSB0aGlzLnNlbmQuYmluZCh0aGlzKVxuICB9XG5cbiAgY2xvc2UgKCkge1xuICAgIHJldHVybiB0aGlzLnNvY2tldC5jbG9zZSgpXG4gIH1cblxuICBzZW5kIChhY3Rpb24sIHBheWxvYWQpIHtcbiAgICAvLyBhdHRhY2ggdXVpZFxuXG4gICAgaWYgKCF0aGlzLmlzT3Blbikge1xuICAgICAgdGhpcy5xdWV1ZWQucHVzaCh7YWN0aW9uLCBwYXlsb2FkfSlcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMuc29ja2V0LnNlbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgYWN0aW9uLFxuICAgICAgcGF5bG9hZFxuICAgIH0pKVxuICB9XG5cbiAgb24gKGFjdGlvbiwgaGFuZGxlcikge1xuICAgIGNvbnNvbGUubG9nKGFjdGlvbilcbiAgICB0aGlzLmVtaXR0ZXIub24oYWN0aW9uLCBoYW5kbGVyKVxuICB9XG5cbiAgZW1pdCAoYWN0aW9uLCBwYXlsb2FkKSB7XG4gICAgY29uc29sZS5sb2coYWN0aW9uKVxuICAgIHRoaXMuZW1pdHRlci5lbWl0KGFjdGlvbiwgcGF5bG9hZClcbiAgfVxuXG4gIG9uY2UgKGFjdGlvbiwgaGFuZGxlcikge1xuICAgIHRoaXMuZW1pdHRlci5vbmNlKGFjdGlvbiwgaGFuZGxlcilcbiAgfVxuXG4gIF9oYW5kbGVNZXNzYWdlIChlKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBKU09OLnBhcnNlKGUuZGF0YSlcbiAgICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UpXG4gICAgICB0aGlzLmVtaXQobWVzc2FnZS5hY3Rpb24sIG1lc3NhZ2UucGF5bG9hZClcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICB9XG4gIH1cbn1cbiIsImNvbnN0IHRocm90dGxlID0gcmVxdWlyZSgnbG9kYXNoLnRocm90dGxlJylcbi8vIHdlIGlubGluZSBmaWxlLXR5cGUgbW9kdWxlLCBhcyBvcHBvc2VkIHRvIHVzaW5nIHRoZSBOUE0gdmVyc2lvbixcbi8vIGJlY2F1c2Ugb2YgdGhpcyBodHRwczovL2dpdGh1Yi5jb20vc2luZHJlc29yaHVzL2ZpbGUtdHlwZS9pc3N1ZXMvNzhcbi8vIGFuZCBodHRwczovL2dpdGh1Yi5jb20vc2luZHJlc29yaHVzL2NvcHktdGV4dC10by1jbGlwYm9hcmQvaXNzdWVzLzVcbmNvbnN0IGZpbGVUeXBlID0gcmVxdWlyZSgnLi4vdmVuZG9yL2ZpbGUtdHlwZScpXG5cbi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIHNtYWxsIHV0aWxpdHkgZnVuY3Rpb25zIHRoYXQgaGVscCB3aXRoIGRvbSBtYW5pcHVsYXRpb24sIGFkZGluZyBsaXN0ZW5lcnMsXG4gKiBwcm9taXNlcyBhbmQgb3RoZXIgZ29vZCB0aGluZ3MuXG4gKlxuICogQG1vZHVsZSBVdGlsc1xuICovXG5cbmZ1bmN0aW9uIGlzVG91Y2hEZXZpY2UgKCkge1xuICByZXR1cm4gJ29udG91Y2hzdGFydCcgaW4gd2luZG93IHx8IC8vIHdvcmtzIG9uIG1vc3QgYnJvd3NlcnNcbiAgICAgICAgICBuYXZpZ2F0b3IubWF4VG91Y2hQb2ludHMgICAvLyB3b3JrcyBvbiBJRTEwLzExIGFuZCBTdXJmYWNlXG59XG5cbmZ1bmN0aW9uIHRydW5jYXRlU3RyaW5nIChzdHIsIGxlbmd0aCkge1xuICBpZiAoc3RyLmxlbmd0aCA+IGxlbmd0aCkge1xuICAgIHJldHVybiBzdHIuc3Vic3RyKDAsIGxlbmd0aCAvIDIpICsgJy4uLicgKyBzdHIuc3Vic3RyKHN0ci5sZW5ndGggLSBsZW5ndGggLyA0LCBzdHIubGVuZ3RoKVxuICB9XG4gIHJldHVybiBzdHJcblxuICAvLyBtb3JlIHByZWNpc2UgdmVyc2lvbiBpZiBuZWVkZWRcbiAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvODMxNTgzXG59XG5cbmZ1bmN0aW9uIHNlY29uZHNUb1RpbWUgKHJhd1NlY29uZHMpIHtcbiAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKHJhd1NlY29uZHMgLyAzNjAwKSAlIDI0XG4gIGNvbnN0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKHJhd1NlY29uZHMgLyA2MCkgJSA2MFxuICBjb25zdCBzZWNvbmRzID0gTWF0aC5mbG9vcihyYXdTZWNvbmRzICUgNjApXG5cbiAgcmV0dXJuIHsgaG91cnMsIG1pbnV0ZXMsIHNlY29uZHMgfVxufVxuXG4vKipcbiAqIENvbnZlcnRzIGxpc3QgaW50byBhcnJheVxuKi9cbmZ1bmN0aW9uIHRvQXJyYXkgKGxpc3QpIHtcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGxpc3QgfHwgW10sIDApXG59XG5cbi8qKlxuICogUmV0dXJucyBhIHRpbWVzdGFtcCBpbiB0aGUgZm9ybWF0IG9mIGBob3VyczptaW51dGVzOnNlY29uZHNgXG4qL1xuZnVuY3Rpb24gZ2V0VGltZVN0YW1wICgpIHtcbiAgdmFyIGRhdGUgPSBuZXcgRGF0ZSgpXG4gIHZhciBob3VycyA9IHBhZChkYXRlLmdldEhvdXJzKCkudG9TdHJpbmcoKSlcbiAgdmFyIG1pbnV0ZXMgPSBwYWQoZGF0ZS5nZXRNaW51dGVzKCkudG9TdHJpbmcoKSlcbiAgdmFyIHNlY29uZHMgPSBwYWQoZGF0ZS5nZXRTZWNvbmRzKCkudG9TdHJpbmcoKSlcbiAgcmV0dXJuIGhvdXJzICsgJzonICsgbWludXRlcyArICc6JyArIHNlY29uZHNcbn1cblxuLyoqXG4gKiBBZGRzIHplcm8gdG8gc3RyaW5ncyBzaG9ydGVyIHRoYW4gdHdvIGNoYXJhY3RlcnNcbiovXG5mdW5jdGlvbiBwYWQgKHN0cikge1xuICByZXR1cm4gc3RyLmxlbmd0aCAhPT0gMiA/IDAgKyBzdHIgOiBzdHJcbn1cblxuLyoqXG4gKiBUYWtlcyBhIGZpbGUgb2JqZWN0IGFuZCB0dXJucyBpdCBpbnRvIGZpbGVJRCwgYnkgY29udmVydGluZyBmaWxlLm5hbWUgdG8gbG93ZXJjYXNlLFxuICogcmVtb3ZpbmcgZXh0cmEgY2hhcmFjdGVycyBhbmQgYWRkaW5nIHR5cGUsIHNpemUgYW5kIGxhc3RNb2RpZmllZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHRoZSBmaWxlSURcbiAqXG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlRmlsZUlEIChmaWxlKSB7XG4gIC8vIGZpbHRlciBpcyBuZWVkZWQgdG8gbm90IGpvaW4gZW1wdHkgdmFsdWVzIHdpdGggYC1gXG4gIHJldHVybiBbXG4gICAgJ3VwcHknLFxuICAgIGZpbGUubmFtZSA/IGZpbGUubmFtZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teQS1aMC05XS9pZywgJycpIDogJycsXG4gICAgZmlsZS50eXBlLFxuICAgIGZpbGUuZGF0YS5zaXplLFxuICAgIGZpbGUuZGF0YS5sYXN0TW9kaWZpZWRcbiAgXS5maWx0ZXIodmFsID0+IHZhbCkuam9pbignLScpXG59XG5cbi8qKlxuICogUnVucyBhbiBhcnJheSBvZiBwcm9taXNlLXJldHVybmluZyBmdW5jdGlvbnMgaW4gc2VxdWVuY2UuXG4gKi9cbmZ1bmN0aW9uIHJ1blByb21pc2VTZXF1ZW5jZSAoZnVuY3Rpb25zLCAuLi5hcmdzKSB7XG4gIGxldCBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKClcbiAgZnVuY3Rpb25zLmZvckVhY2goKGZ1bmMpID0+IHtcbiAgICBwcm9taXNlID0gcHJvbWlzZS50aGVuKCgpID0+IGZ1bmMoLi4uYXJncykpXG4gIH0pXG4gIHJldHVybiBwcm9taXNlXG59XG5cbmZ1bmN0aW9uIGlzUHJldmlld1N1cHBvcnRlZCAoZmlsZVR5cGUpIHtcbiAgaWYgKCFmaWxlVHlwZSkgcmV0dXJuIGZhbHNlXG4gIGNvbnN0IGZpbGVUeXBlU3BlY2lmaWMgPSBmaWxlVHlwZS5zcGxpdCgnLycpWzFdXG4gIC8vIGxpc3Qgb2YgaW1hZ2VzIHRoYXQgYnJvd3NlcnMgY2FuIHByZXZpZXdcbiAgaWYgKC9eKGpwZWd8Z2lmfHBuZ3xzdmd8c3ZnXFwreG1sfGJtcCkkLy50ZXN0KGZpbGVUeXBlU3BlY2lmaWMpKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuZnVuY3Rpb24gZ2V0QXJyYXlCdWZmZXIgKGNodW5rKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICByZWFkZXIuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAvLyBlLnRhcmdldC5yZXN1bHQgaXMgYW4gQXJyYXlCdWZmZXJcbiAgICAgIHJlc29sdmUoZS50YXJnZXQucmVzdWx0KVxuICAgIH0pXG4gICAgcmVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZnVuY3Rpb24gKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcignRmlsZVJlYWRlciBlcnJvcicgKyBlcnIpXG4gICAgICByZWplY3QoZXJyKVxuICAgIH0pXG4gICAgLy8gZmlsZS10eXBlIG9ubHkgbmVlZHMgdGhlIGZpcnN0IDQxMDAgYnl0ZXNcbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoY2h1bmspXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGdldEZpbGVUeXBlIChmaWxlKSB7XG4gIGNvbnN0IGV4dGVuc2lvbnNUb01pbWUgPSB7XG4gICAgJ21kJzogJ3RleHQvbWFya2Rvd24nLFxuICAgICdtYXJrZG93bic6ICd0ZXh0L21hcmtkb3duJyxcbiAgICAnbXA0JzogJ3ZpZGVvL21wNCcsXG4gICAgJ21wMyc6ICdhdWRpby9tcDMnLFxuICAgICdzdmcnOiAnaW1hZ2Uvc3ZnK3htbCcsXG4gICAgJ2pwZyc6ICdpbWFnZS9qcGVnJyxcbiAgICAncG5nJzogJ2ltYWdlL3BuZycsXG4gICAgJ2dpZic6ICdpbWFnZS9naWYnXG4gIH1cblxuICBjb25zdCBmaWxlRXh0ZW5zaW9uID0gZmlsZS5uYW1lID8gZ2V0RmlsZU5hbWVBbmRFeHRlbnNpb24oZmlsZS5uYW1lKS5leHRlbnNpb24gOiBudWxsXG5cbiAgaWYgKGZpbGUuaXNSZW1vdGUpIHtcbiAgICAvLyBzb21lIHJlbW90ZSBwcm92aWRlcnMgZG8gbm90IHN1cHBvcnQgZmlsZSB0eXBlc1xuICAgIGNvbnN0IG1pbWUgPSBmaWxlLnR5cGUgPyBmaWxlLnR5cGUgOiBleHRlbnNpb25zVG9NaW1lW2ZpbGVFeHRlbnNpb25dXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShtaW1lKVxuICB9XG5cbiAgLy8gMS4gdHJ5IHRvIGRldGVybWluZSBmaWxlIHR5cGUgZnJvbSBtYWdpYyBieXRlcyB3aXRoIGZpbGUtdHlwZSBtb2R1bGVcbiAgLy8gdGhpcyBzaG91bGQgYmUgdGhlIG1vc3QgdHJ1c3R3b3J0aHkgd2F5XG4gIGNvbnN0IGNodW5rID0gZmlsZS5kYXRhLnNsaWNlKDAsIDQxMDApXG4gIHJldHVybiBnZXRBcnJheUJ1ZmZlcihjaHVuaylcbiAgICAudGhlbigoYnVmZmVyKSA9PiB7XG4gICAgICBjb25zdCB0eXBlID0gZmlsZVR5cGUoYnVmZmVyKVxuICAgICAgaWYgKHR5cGUgJiYgdHlwZS5taW1lKSB7XG4gICAgICAgIHJldHVybiB0eXBlLm1pbWVcbiAgICAgIH1cblxuICAgICAgLy8gMi4gaWYgdGhhdOKAmXMgbm8gZ29vZCwgY2hlY2sgaWYgbWltZSB0eXBlIGlzIHNldCBpbiB0aGUgZmlsZSBvYmplY3RcbiAgICAgIGlmIChmaWxlLnR5cGUpIHtcbiAgICAgICAgcmV0dXJuIGZpbGUudHlwZVxuICAgICAgfVxuXG4gICAgICAvLyAzLiBpZiB0aGF04oCZcyBubyBnb29kLCBzZWUgaWYgd2UgY2FuIG1hcCBleHRlbnNpb24gdG8gYSBtaW1lIHR5cGVcbiAgICAgIGlmIChmaWxlRXh0ZW5zaW9uICYmIGV4dGVuc2lvbnNUb01pbWVbZmlsZUV4dGVuc2lvbl0pIHtcbiAgICAgICAgcmV0dXJuIGV4dGVuc2lvbnNUb01pbWVbZmlsZUV4dGVuc2lvbl1cbiAgICAgIH1cblxuICAgICAgLy8gaWYgYWxsIGZhaWxzLCB3ZWxsLCByZXR1cm4gZW1wdHlcbiAgICAgIHJldHVybiBudWxsXG4gICAgfSlcbiAgICAuY2F0Y2goKCkgPT4ge1xuICAgICAgcmV0dXJuIG51bGxcbiAgICB9KVxufVxuXG4vLyBUT0RPIENoZWNrIHdoaWNoIHR5cGVzIGFyZSBhY3R1YWxseSBzdXBwb3J0ZWQgaW4gYnJvd3NlcnMuIENocm9tZSBsaWtlcyB3ZWJtXG4vLyBmcm9tIG15IHRlc3RpbmcsIGJ1dCB3ZSBtYXkgbmVlZCBtb3JlLlxuLy8gV2UgY291bGQgdXNlIGEgbGlicmFyeSBidXQgdGhleSB0ZW5kIHRvIGNvbnRhaW4gZG96ZW5zIG9mIEtCcyBvZiBtYXBwaW5ncyxcbi8vIG1vc3Qgb2Ygd2hpY2ggd2lsbCBnbyB1bnVzZWQsIHNvIG5vdCBzdXJlIGlmIHRoYXQncyB3b3J0aCBpdC5cbmNvbnN0IG1pbWVUb0V4dGVuc2lvbnMgPSB7XG4gICd2aWRlby9vZ2cnOiAnb2d2JyxcbiAgJ2F1ZGlvL29nZyc6ICdvZ2cnLFxuICAndmlkZW8vd2VibSc6ICd3ZWJtJyxcbiAgJ2F1ZGlvL3dlYm0nOiAnd2VibScsXG4gICd2aWRlby9tcDQnOiAnbXA0JyxcbiAgJ2F1ZGlvL21wMyc6ICdtcDMnXG59XG5cbmZ1bmN0aW9uIGdldEZpbGVUeXBlRXh0ZW5zaW9uIChtaW1lVHlwZSkge1xuICByZXR1cm4gbWltZVRvRXh0ZW5zaW9uc1ttaW1lVHlwZV0gfHwgbnVsbFxufVxuXG4vKipcbiogVGFrZXMgYSBmdWxsIGZpbGVuYW1lIHN0cmluZyBhbmQgcmV0dXJucyBhbiBvYmplY3Qge25hbWUsIGV4dGVuc2lvbn1cbipcbiogQHBhcmFtIHtzdHJpbmd9IGZ1bGxGaWxlTmFtZVxuKiBAcmV0dXJuIHtvYmplY3R9IHtuYW1lLCBleHRlbnNpb259XG4qL1xuZnVuY3Rpb24gZ2V0RmlsZU5hbWVBbmRFeHRlbnNpb24gKGZ1bGxGaWxlTmFtZSkge1xuICB2YXIgcmUgPSAvKD86XFwuKFteLl0rKSk/JC9cbiAgdmFyIGZpbGVFeHQgPSByZS5leGVjKGZ1bGxGaWxlTmFtZSlbMV1cbiAgdmFyIGZpbGVOYW1lID0gZnVsbEZpbGVOYW1lLnJlcGxhY2UoJy4nICsgZmlsZUV4dCwgJycpXG4gIHJldHVybiB7XG4gICAgbmFtZTogZmlsZU5hbWUsXG4gICAgZXh0ZW5zaW9uOiBmaWxlRXh0XG4gIH1cbn1cblxuLyoqXG4gKiBDaGVjayBpZiBhIFVSTCBzdHJpbmcgaXMgYW4gb2JqZWN0IFVSTCBmcm9tIGBVUkwuY3JlYXRlT2JqZWN0VVJMYC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdXJsXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc09iamVjdFVSTCAodXJsKSB7XG4gIHJldHVybiB1cmwuaW5kZXhPZignYmxvYjonKSA9PT0gMFxufVxuXG5mdW5jdGlvbiBnZXRQcm9wb3J0aW9uYWxIZWlnaHQgKGltZywgd2lkdGgpIHtcbiAgY29uc3QgYXNwZWN0ID0gaW1nLndpZHRoIC8gaW1nLmhlaWdodFxuICByZXR1cm4gTWF0aC5yb3VuZCh3aWR0aCAvIGFzcGVjdClcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSB0aHVtYm5haWwgZm9yIHRoZSBnaXZlbiBVcHB5IGZpbGUgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7e2RhdGE6IEJsb2J9fSBmaWxlXG4gKiBAcGFyYW0ge251bWJlcn0gd2lkdGhcbiAqIEByZXR1cm4ge1Byb21pc2V9XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVRodW1ibmFpbCAoZmlsZSwgdGFyZ2V0V2lkdGgpIHtcbiAgY29uc3Qgb3JpZ2luYWxVcmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUuZGF0YSlcbiAgY29uc3Qgb25sb2FkID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IGltYWdlID0gbmV3IEltYWdlKClcbiAgICBpbWFnZS5zcmMgPSBvcmlnaW5hbFVybFxuICAgIGltYWdlLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwob3JpZ2luYWxVcmwpXG4gICAgICByZXNvbHZlKGltYWdlKVxuICAgIH1cbiAgICBpbWFnZS5vbmVycm9yID0gKCkgPT4ge1xuICAgICAgLy8gVGhlIG9uZXJyb3IgZXZlbnQgaXMgdG90YWxseSB1c2VsZXNzIHVuZm9ydHVuYXRlbHksIGFzIGZhciBhcyBJIGtub3dcbiAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwob3JpZ2luYWxVcmwpXG4gICAgICByZWplY3QobmV3IEVycm9yKCdDb3VsZCBub3QgY3JlYXRlIHRodW1ibmFpbCcpKVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gb25sb2FkLnRoZW4oKGltYWdlKSA9PiB7XG4gICAgY29uc3QgdGFyZ2V0SGVpZ2h0ID0gZ2V0UHJvcG9ydGlvbmFsSGVpZ2h0KGltYWdlLCB0YXJnZXRXaWR0aClcbiAgICBjb25zdCBjYW52YXMgPSByZXNpemVJbWFnZShpbWFnZSwgdGFyZ2V0V2lkdGgsIHRhcmdldEhlaWdodClcbiAgICByZXR1cm4gY2FudmFzVG9CbG9iKGNhbnZhcywgJ2ltYWdlL3BuZycpXG4gIH0pLnRoZW4oKGJsb2IpID0+IHtcbiAgICByZXR1cm4gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKVxuICB9KVxufVxuXG4vKipcbiAqIFJlc2l6ZSBhbiBpbWFnZSB0byB0aGUgdGFyZ2V0IGB3aWR0aGAgYW5kIGBoZWlnaHRgLlxuICpcbiAqIFJldHVybnMgYSBDYW52YXMgd2l0aCB0aGUgcmVzaXplZCBpbWFnZSBvbiBpdC5cbiAqL1xuZnVuY3Rpb24gcmVzaXplSW1hZ2UgKGltYWdlLCB0YXJnZXRXaWR0aCwgdGFyZ2V0SGVpZ2h0KSB7XG4gIGxldCBzb3VyY2VXaWR0aCA9IGltYWdlLndpZHRoXG4gIGxldCBzb3VyY2VIZWlnaHQgPSBpbWFnZS5oZWlnaHRcblxuICBpZiAodGFyZ2V0SGVpZ2h0IDwgaW1hZ2UuaGVpZ2h0IC8gMikge1xuICAgIGNvbnN0IHN0ZXBzID0gTWF0aC5mbG9vcihNYXRoLmxvZyhpbWFnZS53aWR0aCAvIHRhcmdldFdpZHRoKSAvIE1hdGgubG9nKDIpKVxuICAgIGNvbnN0IHN0ZXBTY2FsZWQgPSBkb3duU2NhbGVJblN0ZXBzKGltYWdlLCBzdGVwcylcbiAgICBpbWFnZSA9IHN0ZXBTY2FsZWQuaW1hZ2VcbiAgICBzb3VyY2VXaWR0aCA9IHN0ZXBTY2FsZWQuc291cmNlV2lkdGhcbiAgICBzb3VyY2VIZWlnaHQgPSBzdGVwU2NhbGVkLnNvdXJjZUhlaWdodFxuICB9XG5cbiAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJylcbiAgY2FudmFzLndpZHRoID0gdGFyZ2V0V2lkdGhcbiAgY2FudmFzLmhlaWdodCA9IHRhcmdldEhlaWdodFxuXG4gIGNvbnN0IGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICBjb250ZXh0LmRyYXdJbWFnZShpbWFnZSxcbiAgICAwLCAwLCBzb3VyY2VXaWR0aCwgc291cmNlSGVpZ2h0LFxuICAgIDAsIDAsIHRhcmdldFdpZHRoLCB0YXJnZXRIZWlnaHQpXG5cbiAgcmV0dXJuIGNhbnZhc1xufVxuXG4vKipcbiAqIERvd25zY2FsZSBhbiBpbWFnZSBieSA1MCUgYHN0ZXBzYCB0aW1lcy5cbiAqL1xuZnVuY3Rpb24gZG93blNjYWxlSW5TdGVwcyAoaW1hZ2UsIHN0ZXBzKSB7XG4gIGxldCBzb3VyY2UgPSBpbWFnZVxuICBsZXQgY3VycmVudFdpZHRoID0gc291cmNlLndpZHRoXG4gIGxldCBjdXJyZW50SGVpZ2h0ID0gc291cmNlLmhlaWdodFxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc3RlcHM7IGkgKz0gMSkge1xuICAgIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpXG4gICAgY29uc3QgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG4gICAgY2FudmFzLndpZHRoID0gY3VycmVudFdpZHRoIC8gMlxuICAgIGNhbnZhcy5oZWlnaHQgPSBjdXJyZW50SGVpZ2h0IC8gMlxuICAgIGNvbnRleHQuZHJhd0ltYWdlKHNvdXJjZSxcbiAgICAgIC8vIFRoZSBlbnRpcmUgc291cmNlIGltYWdlLiBXZSBwYXNzIHdpZHRoIGFuZCBoZWlnaHQgaGVyZSxcbiAgICAgIC8vIGJlY2F1c2Ugd2UgcmV1c2UgdGhpcyBjYW52YXMsIGFuZCBzaG91bGQgb25seSBzY2FsZSBkb3duXG4gICAgICAvLyB0aGUgcGFydCBvZiB0aGUgY2FudmFzIHRoYXQgY29udGFpbnMgdGhlIHByZXZpb3VzIHNjYWxlIHN0ZXAuXG4gICAgICAwLCAwLCBjdXJyZW50V2lkdGgsIGN1cnJlbnRIZWlnaHQsXG4gICAgICAvLyBEcmF3IHRvIDUwJSBzaXplXG4gICAgICAwLCAwLCBjdXJyZW50V2lkdGggLyAyLCBjdXJyZW50SGVpZ2h0IC8gMilcbiAgICBjdXJyZW50V2lkdGggLz0gMlxuICAgIGN1cnJlbnRIZWlnaHQgLz0gMlxuICAgIHNvdXJjZSA9IGNhbnZhc1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbWFnZTogc291cmNlLFxuICAgIHNvdXJjZVdpZHRoOiBjdXJyZW50V2lkdGgsXG4gICAgc291cmNlSGVpZ2h0OiBjdXJyZW50SGVpZ2h0XG4gIH1cbn1cblxuLyoqXG4gKiBTYXZlIGEgPGNhbnZhcz4gZWxlbWVudCdzIGNvbnRlbnQgdG8gYSBCbG9iIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge0hUTUxDYW52YXNFbGVtZW50fSBjYW52YXNcbiAqIEByZXR1cm4ge1Byb21pc2V9XG4gKi9cbmZ1bmN0aW9uIGNhbnZhc1RvQmxvYiAoY2FudmFzLCB0eXBlLCBxdWFsaXR5KSB7XG4gIGlmIChjYW52YXMudG9CbG9iKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICBjYW52YXMudG9CbG9iKHJlc29sdmUsIHR5cGUsIHF1YWxpdHkpXG4gICAgfSlcbiAgfVxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG4gICAgcmV0dXJuIGRhdGFVUkl0b0Jsb2IoY2FudmFzLnRvRGF0YVVSTCh0eXBlLCBxdWFsaXR5KSwge30pXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGRhdGFVUkl0b0Jsb2IgKGRhdGFVUkksIG9wdHMsIHRvRmlsZSkge1xuICAvLyBnZXQgdGhlIGJhc2U2NCBkYXRhXG4gIHZhciBkYXRhID0gZGF0YVVSSS5zcGxpdCgnLCcpWzFdXG5cbiAgLy8gdXNlciBtYXkgcHJvdmlkZSBtaW1lIHR5cGUsIGlmIG5vdCBnZXQgaXQgZnJvbSBkYXRhIFVSSVxuICB2YXIgbWltZVR5cGUgPSBvcHRzLm1pbWVUeXBlIHx8IGRhdGFVUkkuc3BsaXQoJywnKVswXS5zcGxpdCgnOicpWzFdLnNwbGl0KCc7JylbMF1cblxuICAvLyBkZWZhdWx0IHRvIHBsYWluL3RleHQgaWYgZGF0YSBVUkkgaGFzIG5vIG1pbWVUeXBlXG4gIGlmIChtaW1lVHlwZSA9PSBudWxsKSB7XG4gICAgbWltZVR5cGUgPSAncGxhaW4vdGV4dCdcbiAgfVxuXG4gIHZhciBiaW5hcnkgPSBhdG9iKGRhdGEpXG4gIHZhciBhcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYmluYXJ5Lmxlbmd0aDsgaSsrKSB7XG4gICAgYXJyYXkucHVzaChiaW5hcnkuY2hhckNvZGVBdChpKSlcbiAgfVxuXG4gIC8vIENvbnZlcnQgdG8gYSBGaWxlP1xuICBpZiAodG9GaWxlKSB7XG4gICAgcmV0dXJuIG5ldyBGaWxlKFtuZXcgVWludDhBcnJheShhcnJheSldLCBvcHRzLm5hbWUgfHwgJycsIHt0eXBlOiBtaW1lVHlwZX0pXG4gIH1cblxuICByZXR1cm4gbmV3IEJsb2IoW25ldyBVaW50OEFycmF5KGFycmF5KV0sIHt0eXBlOiBtaW1lVHlwZX0pXG59XG5cbmZ1bmN0aW9uIGRhdGFVUkl0b0ZpbGUgKGRhdGFVUkksIG9wdHMpIHtcbiAgcmV0dXJuIGRhdGFVUkl0b0Jsb2IoZGF0YVVSSSwgb3B0cywgdHJ1ZSlcbn1cblxuLyoqXG4gKiBDb3BpZXMgdGV4dCB0byBjbGlwYm9hcmQgYnkgY3JlYXRpbmcgYW4gYWxtb3N0IGludmlzaWJsZSB0ZXh0YXJlYSxcbiAqIGFkZGluZyB0ZXh0IHRoZXJlLCB0aGVuIHJ1bm5pbmcgZXhlY0NvbW1hbmQoJ2NvcHknKS5cbiAqIEZhbGxzIGJhY2sgdG8gcHJvbXB0KCkgd2hlbiB0aGUgZWFzeSB3YXkgZmFpbHMgKGhlbGxvLCBTYWZhcmkhKVxuICogRnJvbSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8zMDgxMDMyMlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0VG9Db3B5XG4gKiBAcGFyYW0ge1N0cmluZ30gZmFsbGJhY2tTdHJpbmdcbiAqIEByZXR1cm4ge1Byb21pc2V9XG4gKi9cbmZ1bmN0aW9uIGNvcHlUb0NsaXBib2FyZCAodGV4dFRvQ29weSwgZmFsbGJhY2tTdHJpbmcpIHtcbiAgZmFsbGJhY2tTdHJpbmcgPSBmYWxsYmFja1N0cmluZyB8fCAnQ29weSB0aGUgVVJMIGJlbG93J1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IHRleHRBcmVhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGV4dGFyZWEnKVxuICAgIHRleHRBcmVhLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCB7XG4gICAgICBwb3NpdGlvbjogJ2ZpeGVkJyxcbiAgICAgIHRvcDogMCxcbiAgICAgIGxlZnQ6IDAsXG4gICAgICB3aWR0aDogJzJlbScsXG4gICAgICBoZWlnaHQ6ICcyZW0nLFxuICAgICAgcGFkZGluZzogMCxcbiAgICAgIGJvcmRlcjogJ25vbmUnLFxuICAgICAgb3V0bGluZTogJ25vbmUnLFxuICAgICAgYm94U2hhZG93OiAnbm9uZScsXG4gICAgICBiYWNrZ3JvdW5kOiAndHJhbnNwYXJlbnQnXG4gICAgfSlcblxuICAgIHRleHRBcmVhLnZhbHVlID0gdGV4dFRvQ29weVxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGV4dEFyZWEpXG4gICAgdGV4dEFyZWEuc2VsZWN0KClcblxuICAgIGNvbnN0IG1hZ2ljQ29weUZhaWxlZCA9ICgpID0+IHtcbiAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGV4dEFyZWEpXG4gICAgICB3aW5kb3cucHJvbXB0KGZhbGxiYWNrU3RyaW5nLCB0ZXh0VG9Db3B5KVxuICAgICAgcmVzb2x2ZSgpXG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN1Y2Nlc3NmdWwgPSBkb2N1bWVudC5leGVjQ29tbWFuZCgnY29weScpXG4gICAgICBpZiAoIXN1Y2Nlc3NmdWwpIHtcbiAgICAgICAgcmV0dXJuIG1hZ2ljQ29weUZhaWxlZCgnY29weSBjb21tYW5kIHVuYXZhaWxhYmxlJylcbiAgICAgIH1cbiAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGV4dEFyZWEpXG4gICAgICByZXR1cm4gcmVzb2x2ZSgpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRleHRBcmVhKVxuICAgICAgcmV0dXJuIG1hZ2ljQ29weUZhaWxlZChlcnIpXG4gICAgfVxuICB9KVxufVxuXG5mdW5jdGlvbiBnZXRTcGVlZCAoZmlsZVByb2dyZXNzKSB7XG4gIGlmICghZmlsZVByb2dyZXNzLmJ5dGVzVXBsb2FkZWQpIHJldHVybiAwXG5cbiAgY29uc3QgdGltZUVsYXBzZWQgPSAobmV3IERhdGUoKSkgLSBmaWxlUHJvZ3Jlc3MudXBsb2FkU3RhcnRlZFxuICBjb25zdCB1cGxvYWRTcGVlZCA9IGZpbGVQcm9ncmVzcy5ieXRlc1VwbG9hZGVkIC8gKHRpbWVFbGFwc2VkIC8gMTAwMClcbiAgcmV0dXJuIHVwbG9hZFNwZWVkXG59XG5cbmZ1bmN0aW9uIGdldEJ5dGVzUmVtYWluaW5nIChmaWxlUHJvZ3Jlc3MpIHtcbiAgcmV0dXJuIGZpbGVQcm9ncmVzcy5ieXRlc1RvdGFsIC0gZmlsZVByb2dyZXNzLmJ5dGVzVXBsb2FkZWRcbn1cblxuZnVuY3Rpb24gZ2V0RVRBIChmaWxlUHJvZ3Jlc3MpIHtcbiAgaWYgKCFmaWxlUHJvZ3Jlc3MuYnl0ZXNVcGxvYWRlZCkgcmV0dXJuIDBcblxuICBjb25zdCB1cGxvYWRTcGVlZCA9IGdldFNwZWVkKGZpbGVQcm9ncmVzcylcbiAgY29uc3QgYnl0ZXNSZW1haW5pbmcgPSBnZXRCeXRlc1JlbWFpbmluZyhmaWxlUHJvZ3Jlc3MpXG4gIGNvbnN0IHNlY29uZHNSZW1haW5pbmcgPSBNYXRoLnJvdW5kKGJ5dGVzUmVtYWluaW5nIC8gdXBsb2FkU3BlZWQgKiAxMCkgLyAxMFxuXG4gIHJldHVybiBzZWNvbmRzUmVtYWluaW5nXG59XG5cbmZ1bmN0aW9uIHByZXR0eUVUQSAoc2Vjb25kcykge1xuICBjb25zdCB0aW1lID0gc2Vjb25kc1RvVGltZShzZWNvbmRzKVxuXG4gIC8vIE9ubHkgZGlzcGxheSBob3VycyBhbmQgbWludXRlcyBpZiB0aGV5IGFyZSBncmVhdGVyIHRoYW4gMCBidXQgYWx3YXlzXG4gIC8vIGRpc3BsYXkgbWludXRlcyBpZiBob3VycyBpcyBiZWluZyBkaXNwbGF5ZWRcbiAgLy8gRGlzcGxheSBhIGxlYWRpbmcgemVybyBpZiB0aGUgdGhlcmUgaXMgYSBwcmVjZWRpbmcgdW5pdDogMW0gMDVzLCBidXQgNXNcbiAgY29uc3QgaG91cnNTdHIgPSB0aW1lLmhvdXJzID8gdGltZS5ob3VycyArICdoICcgOiAnJ1xuICBjb25zdCBtaW51dGVzVmFsID0gdGltZS5ob3VycyA/ICgnMCcgKyB0aW1lLm1pbnV0ZXMpLnN1YnN0cigtMikgOiB0aW1lLm1pbnV0ZXNcbiAgY29uc3QgbWludXRlc1N0ciA9IG1pbnV0ZXNWYWwgPyBtaW51dGVzVmFsICsgJ20gJyA6ICcnXG4gIGNvbnN0IHNlY29uZHNWYWwgPSBtaW51dGVzVmFsID8gKCcwJyArIHRpbWUuc2Vjb25kcykuc3Vic3RyKC0yKSA6IHRpbWUuc2Vjb25kc1xuICBjb25zdCBzZWNvbmRzU3RyID0gc2Vjb25kc1ZhbCArICdzJ1xuXG4gIHJldHVybiBgJHtob3Vyc1N0cn0ke21pbnV0ZXNTdHJ9JHtzZWNvbmRzU3RyfWBcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBhbiBvYmplY3QgaXMgYSBET00gZWxlbWVudC4gRHVjay10eXBpbmcgYmFzZWQgb24gYG5vZGVUeXBlYC5cbiAqXG4gKiBAcGFyYW0geyp9IG9ialxuICovXG5mdW5jdGlvbiBpc0RPTUVsZW1lbnQgKG9iaikge1xuICByZXR1cm4gb2JqICYmIHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIG9iai5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREVcbn1cblxuLyoqXG4gKiBGaW5kIGEgRE9NIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtOb2RlfHN0cmluZ30gZWxlbWVudFxuICogQHJldHVybiB7Tm9kZXxudWxsfVxuICovXG5mdW5jdGlvbiBmaW5kRE9NRWxlbWVudCAoZWxlbWVudCkge1xuICBpZiAodHlwZW9mIGVsZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZWxlbWVudClcbiAgfVxuXG4gIGlmICh0eXBlb2YgZWxlbWVudCA9PT0gJ29iamVjdCcgJiYgaXNET01FbGVtZW50KGVsZW1lbnQpKSB7XG4gICAgcmV0dXJuIGVsZW1lbnRcbiAgfVxufVxuXG4vKipcbiAqIEZpbmQgb25lIG9yIG1vcmUgRE9NIGVsZW1lbnRzLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBlbGVtZW50XG4gKiBAcmV0dXJuIHtBcnJheXxudWxsfVxuICovXG5mdW5jdGlvbiBmaW5kQWxsRE9NRWxlbWVudHMgKGVsZW1lbnQpIHtcbiAgaWYgKHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJykge1xuICAgIGNvbnN0IGVsZW1lbnRzID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGVsZW1lbnQpKVxuICAgIHJldHVybiBlbGVtZW50cy5sZW5ndGggPiAwID8gZWxlbWVudHMgOiBudWxsXG4gIH1cblxuICBpZiAodHlwZW9mIGVsZW1lbnQgPT09ICdvYmplY3QnICYmIGlzRE9NRWxlbWVudChlbGVtZW50KSkge1xuICAgIHJldHVybiBbZWxlbWVudF1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRTb2NrZXRIb3N0ICh1cmwpIHtcbiAgLy8gZ2V0IHRoZSBob3N0IGRvbWFpblxuICB2YXIgcmVnZXggPSAvXig/Omh0dHBzPzpcXC9cXC98XFwvXFwvKT8oPzpbXkBcXG5dK0ApPyg/Ond3d1xcLik/KFteXFxuXSspL1xuICB2YXIgaG9zdCA9IHJlZ2V4LmV4ZWModXJsKVsxXVxuICB2YXIgc29ja2V0UHJvdG9jb2wgPSBsb2NhdGlvbi5wcm90b2NvbCA9PT0gJ2h0dHBzOicgPyAnd3NzJyA6ICd3cydcblxuICByZXR1cm4gYCR7c29ja2V0UHJvdG9jb2x9Oi8vJHtob3N0fWBcbn1cblxuZnVuY3Rpb24gX2VtaXRTb2NrZXRQcm9ncmVzcyAodXBsb2FkZXIsIHByb2dyZXNzRGF0YSwgZmlsZSkge1xuICBjb25zdCB7IHByb2dyZXNzLCBieXRlc1VwbG9hZGVkLCBieXRlc1RvdGFsIH0gPSBwcm9ncmVzc0RhdGFcbiAgaWYgKHByb2dyZXNzKSB7XG4gICAgdXBsb2FkZXIudXBweS5sb2coYFVwbG9hZCBwcm9ncmVzczogJHtwcm9ncmVzc31gKVxuICAgIHVwbG9hZGVyLnVwcHkuZW1pdCgndXBsb2FkLXByb2dyZXNzJywgZmlsZSwge1xuICAgICAgdXBsb2FkZXIsXG4gICAgICBieXRlc1VwbG9hZGVkOiBieXRlc1VwbG9hZGVkLFxuICAgICAgYnl0ZXNUb3RhbDogYnl0ZXNUb3RhbFxuICAgIH0pXG4gIH1cbn1cblxuY29uc3QgZW1pdFNvY2tldFByb2dyZXNzID0gdGhyb3R0bGUoX2VtaXRTb2NrZXRQcm9ncmVzcywgMzAwLCB7bGVhZGluZzogdHJ1ZSwgdHJhaWxpbmc6IHRydWV9KVxuXG5mdW5jdGlvbiBzZXR0bGUgKHByb21pc2VzKSB7XG4gIGNvbnN0IHJlc29sdXRpb25zID0gW11cbiAgY29uc3QgcmVqZWN0aW9ucyA9IFtdXG4gIGZ1bmN0aW9uIHJlc29sdmVkICh2YWx1ZSkge1xuICAgIHJlc29sdXRpb25zLnB1c2godmFsdWUpXG4gIH1cbiAgZnVuY3Rpb24gcmVqZWN0ZWQgKGVycm9yKSB7XG4gICAgcmVqZWN0aW9ucy5wdXNoKGVycm9yKVxuICB9XG5cbiAgY29uc3Qgd2FpdCA9IFByb21pc2UuYWxsKFxuICAgIHByb21pc2VzLm1hcCgocHJvbWlzZSkgPT4gcHJvbWlzZS50aGVuKHJlc29sdmVkLCByZWplY3RlZCkpXG4gIClcblxuICByZXR1cm4gd2FpdC50aGVuKCgpID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2Vzc2Z1bDogcmVzb2x1dGlvbnMsXG4gICAgICBmYWlsZWQ6IHJlamVjdGlvbnNcbiAgICB9XG4gIH0pXG59XG5cbi8qKlxuICogTGltaXQgdGhlIGFtb3VudCBvZiBzaW11bHRhbmVvdXNseSBwZW5kaW5nIFByb21pc2VzLlxuICogUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQsIHdoZW4gcGFzc2VkIGEgZnVuY3Rpb24gYGZuYCxcbiAqIHdpbGwgbWFrZSBzdXJlIHRoYXQgYXQgbW9zdCBgbGltaXRgIGNhbGxzIHRvIGBmbmAgYXJlIHBlbmRpbmcuXG4gKlxuICogQHBhcmFtIHtudW1iZXJ9IGxpbWl0XG4gKiBAcmV0dXJuIHtmdW5jdGlvbigpfVxuICovXG5mdW5jdGlvbiBsaW1pdFByb21pc2VzIChsaW1pdCkge1xuICBsZXQgcGVuZGluZyA9IDBcbiAgY29uc3QgcXVldWUgPSBbXVxuICByZXR1cm4gKGZuKSA9PiB7XG4gICAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgICBjb25zdCBjYWxsID0gKCkgPT4ge1xuICAgICAgICBwZW5kaW5nKytcbiAgICAgICAgY29uc3QgcHJvbWlzZSA9IGZuKC4uLmFyZ3MpXG4gICAgICAgIHByb21pc2UudGhlbihvbmZpbmlzaCwgb25maW5pc2gpXG4gICAgICAgIHJldHVybiBwcm9taXNlXG4gICAgICB9XG5cbiAgICAgIGlmIChwZW5kaW5nID49IGxpbWl0KSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgcXVldWUucHVzaCgoKSA9PiB7XG4gICAgICAgICAgICBjYWxsKCkudGhlbihyZXNvbHZlLCByZWplY3QpXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIHJldHVybiBjYWxsKClcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gb25maW5pc2ggKCkge1xuICAgIHBlbmRpbmctLVxuICAgIGNvbnN0IG5leHQgPSBxdWV1ZS5zaGlmdCgpXG4gICAgaWYgKG5leHQpIG5leHQoKVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBnZW5lcmF0ZUZpbGVJRCxcbiAgdG9BcnJheSxcbiAgZ2V0VGltZVN0YW1wLFxuICBydW5Qcm9taXNlU2VxdWVuY2UsXG4gIGlzVG91Y2hEZXZpY2UsXG4gIGdldEZpbGVOYW1lQW5kRXh0ZW5zaW9uLFxuICB0cnVuY2F0ZVN0cmluZyxcbiAgZ2V0RmlsZVR5cGVFeHRlbnNpb24sXG4gIGdldEZpbGVUeXBlLFxuICBnZXRBcnJheUJ1ZmZlcixcbiAgaXNQcmV2aWV3U3VwcG9ydGVkLFxuICBpc09iamVjdFVSTCxcbiAgY3JlYXRlVGh1bWJuYWlsLFxuICBzZWNvbmRzVG9UaW1lLFxuICBkYXRhVVJJdG9CbG9iLFxuICBkYXRhVVJJdG9GaWxlLFxuICBjYW52YXNUb0Jsb2IsXG4gIGdldFNwZWVkLFxuICBnZXRCeXRlc1JlbWFpbmluZyxcbiAgZ2V0RVRBLFxuICBjb3B5VG9DbGlwYm9hcmQsXG4gIHByZXR0eUVUQSxcbiAgZmluZERPTUVsZW1lbnQsXG4gIGZpbmRBbGxET01FbGVtZW50cyxcbiAgZ2V0U29ja2V0SG9zdCxcbiAgZW1pdFNvY2tldFByb2dyZXNzLFxuICBzZXR0bGUsXG4gIGxpbWl0UHJvbWlzZXNcbn1cbiIsImNvbnN0IFBsdWdpbiA9IHJlcXVpcmUoJy4uL2NvcmUvUGx1Z2luJylcbmNvbnN0IHsgdG9BcnJheSB9ID0gcmVxdWlyZSgnLi4vY29yZS9VdGlscycpXG5jb25zdCBUcmFuc2xhdG9yID0gcmVxdWlyZSgnLi4vY29yZS9UcmFuc2xhdG9yJylcbmNvbnN0IHsgaCB9ID0gcmVxdWlyZSgncHJlYWN0JylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBGaWxlSW5wdXQgZXh0ZW5kcyBQbHVnaW4ge1xuICBjb25zdHJ1Y3RvciAodXBweSwgb3B0cykge1xuICAgIHN1cGVyKHVwcHksIG9wdHMpXG4gICAgdGhpcy5pZCA9IHRoaXMub3B0cy5pZCB8fCAnRmlsZUlucHV0J1xuICAgIHRoaXMudGl0bGUgPSAnRmlsZSBJbnB1dCdcbiAgICB0aGlzLnR5cGUgPSAnYWNxdWlyZXInXG5cbiAgICBjb25zdCBkZWZhdWx0TG9jYWxlID0ge1xuICAgICAgc3RyaW5nczoge1xuICAgICAgICBjaG9vc2VGaWxlczogJ0Nob29zZSBmaWxlcydcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEZWZhdWx0IG9wdGlvbnNcbiAgICBjb25zdCBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgIHRhcmdldDogbnVsbCxcbiAgICAgIGFsbG93TXVsdGlwbGVGaWxlczogdHJ1ZSxcbiAgICAgIHByZXR0eTogdHJ1ZSxcbiAgICAgIGlucHV0TmFtZTogJ2ZpbGVzW10nLFxuICAgICAgbG9jYWxlOiBkZWZhdWx0TG9jYWxlXG4gICAgfVxuXG4gICAgLy8gTWVyZ2UgZGVmYXVsdCBvcHRpb25zIHdpdGggdGhlIG9uZXMgc2V0IGJ5IHVzZXJcbiAgICB0aGlzLm9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucywgb3B0cylcblxuICAgIHRoaXMubG9jYWxlID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdExvY2FsZSwgdGhpcy5vcHRzLmxvY2FsZSlcbiAgICB0aGlzLmxvY2FsZS5zdHJpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdExvY2FsZS5zdHJpbmdzLCB0aGlzLm9wdHMubG9jYWxlLnN0cmluZ3MpXG5cbiAgICAvLyBpMThuXG4gICAgdGhpcy50cmFuc2xhdG9yID0gbmV3IFRyYW5zbGF0b3Ioe2xvY2FsZTogdGhpcy5sb2NhbGV9KVxuICAgIHRoaXMuaTE4biA9IHRoaXMudHJhbnNsYXRvci50cmFuc2xhdGUuYmluZCh0aGlzLnRyYW5zbGF0b3IpXG5cbiAgICB0aGlzLnJlbmRlciA9IHRoaXMucmVuZGVyLmJpbmQodGhpcylcbiAgICB0aGlzLmhhbmRsZUlucHV0Q2hhbmdlID0gdGhpcy5oYW5kbGVJbnB1dENoYW5nZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5oYW5kbGVDbGljayA9IHRoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzKVxuICB9XG5cbiAgaGFuZGxlSW5wdXRDaGFuZ2UgKGV2KSB7XG4gICAgdGhpcy51cHB5LmxvZygnW0ZpbGVJbnB1dF0gU29tZXRoaW5nIHNlbGVjdGVkIHRocm91Z2ggaW5wdXQuLi4nKVxuXG4gICAgY29uc3QgZmlsZXMgPSB0b0FycmF5KGV2LnRhcmdldC5maWxlcylcblxuICAgIGZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgIHRoaXMudXBweS5hZGRGaWxlKHtcbiAgICAgICAgc291cmNlOiB0aGlzLmlkLFxuICAgICAgICBuYW1lOiBmaWxlLm5hbWUsXG4gICAgICAgIHR5cGU6IGZpbGUudHlwZSxcbiAgICAgICAgZGF0YTogZmlsZVxuICAgICAgfSkuY2F0Y2goKCkgPT4ge1xuICAgICAgICAvLyBJZ25vcmVcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIGhhbmRsZUNsaWNrIChldikge1xuICAgIHRoaXMuaW5wdXQuY2xpY2soKVxuICB9XG5cbiAgcmVuZGVyIChzdGF0ZSkge1xuICAgIGNvbnN0IGhpZGRlbklucHV0U3R5bGUgPSB7XG4gICAgICB3aWR0aDogJzAuMXB4JyxcbiAgICAgIGhlaWdodDogJzAuMXB4JyxcbiAgICAgIG9wYWNpdHk6IDAsXG4gICAgICBvdmVyZmxvdzogJ2hpZGRlbicsXG4gICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcbiAgICAgIHpJbmRleDogLTFcbiAgICB9XG5cbiAgICByZXR1cm4gPGRpdiBjbGFzcz1cInVwcHkgdXBweS1GaWxlSW5wdXQtY29udGFpbmVyXCI+XG4gICAgICA8aW5wdXQgY2xhc3M9XCJ1cHB5LUZpbGVJbnB1dC1pbnB1dFwiXG4gICAgICAgIHN0eWxlPXt0aGlzLm9wdHMucHJldHR5ICYmIGhpZGRlbklucHV0U3R5bGV9XG4gICAgICAgIHR5cGU9XCJmaWxlXCJcbiAgICAgICAgbmFtZT17dGhpcy5vcHRzLmlucHV0TmFtZX1cbiAgICAgICAgb25jaGFuZ2U9e3RoaXMuaGFuZGxlSW5wdXRDaGFuZ2V9XG4gICAgICAgIG11bHRpcGxlPXt0aGlzLm9wdHMuYWxsb3dNdWx0aXBsZUZpbGVzfVxuICAgICAgICByZWY9eyhpbnB1dCkgPT4geyB0aGlzLmlucHV0ID0gaW5wdXQgfX0gLz5cbiAgICAgIHt0aGlzLm9wdHMucHJldHR5ICYmXG4gICAgICAgIDxidXR0b24gY2xhc3M9XCJ1cHB5LUZpbGVJbnB1dC1idG5cIiB0eXBlPVwiYnV0dG9uXCIgb25jbGljaz17dGhpcy5oYW5kbGVDbGlja30+XG4gICAgICAgICAge3RoaXMuaTE4bignY2hvb3NlRmlsZXMnKX1cbiAgICAgICAgPC9idXR0b24+XG4gICAgICB9XG4gICAgPC9kaXY+XG4gIH1cblxuICBpbnN0YWxsICgpIHtcbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLm9wdHMudGFyZ2V0XG4gICAgaWYgKHRhcmdldCkge1xuICAgICAgdGhpcy5tb3VudCh0YXJnZXQsIHRoaXMpXG4gICAgfVxuICB9XG5cbiAgdW5pbnN0YWxsICgpIHtcbiAgICB0aGlzLnVubW91bnQoKVxuICB9XG59XG4iLCJjb25zdCB0aHJvdHRsZSA9IHJlcXVpcmUoJ2xvZGFzaC50aHJvdHRsZScpXG5jb25zdCB7IGggfSA9IHJlcXVpcmUoJ3ByZWFjdCcpXG5cbmZ1bmN0aW9uIHByb2dyZXNzRGV0YWlscyAocHJvcHMpIHtcbiAgcmV0dXJuIDxzcGFuPntwcm9wcy50b3RhbFByb2dyZXNzIHx8IDB9JeODu3twcm9wcy5jb21wbGV0ZX0gLyB7cHJvcHMuaW5Qcm9ncmVzc33jg7t7cHJvcHMudG90YWxVcGxvYWRlZFNpemV9IC8ge3Byb3BzLnRvdGFsU2l6ZX3jg7vihpEge3Byb3BzLnRvdGFsU3BlZWR9L3Pjg7t7cHJvcHMudG90YWxFVEF9PC9zcGFuPlxufVxuXG5jb25zdCBUaHJvdHRsZWRQcm9ncmVzc0RldGFpbHMgPSB0aHJvdHRsZShwcm9ncmVzc0RldGFpbHMsIDUwMCwge2xlYWRpbmc6IHRydWUsIHRyYWlsaW5nOiB0cnVlfSlcblxuY29uc3QgU1RBVEVfRVJST1IgPSAnZXJyb3InXG5jb25zdCBTVEFURV9XQUlUSU5HID0gJ3dhaXRpbmcnXG5jb25zdCBTVEFURV9QUkVQUk9DRVNTSU5HID0gJ3ByZXByb2Nlc3NpbmcnXG5jb25zdCBTVEFURV9VUExPQURJTkcgPSAndXBsb2FkaW5nJ1xuY29uc3QgU1RBVEVfUE9TVFBST0NFU1NJTkcgPSAncG9zdHByb2Nlc3NpbmcnXG5jb25zdCBTVEFURV9DT01QTEVURSA9ICdjb21wbGV0ZSdcblxuZnVuY3Rpb24gZ2V0VXBsb2FkaW5nU3RhdGUgKHByb3BzLCBmaWxlcykge1xuICBpZiAocHJvcHMuaXNBbGxFcnJvcmVkKSB7XG4gICAgcmV0dXJuIFNUQVRFX0VSUk9SXG4gIH1cblxuICAvLyBJZiBBTEwgZmlsZXMgaGF2ZSBiZWVuIGNvbXBsZXRlZCwgc2hvdyB0aGUgY29tcGxldGVkIHN0YXRlLlxuICBpZiAocHJvcHMuaXNBbGxDb21wbGV0ZSkge1xuICAgIHJldHVybiBTVEFURV9DT01QTEVURVxuICB9XG5cbiAgbGV0IHN0YXRlID0gU1RBVEVfV0FJVElOR1xuICBjb25zdCBmaWxlSURzID0gT2JqZWN0LmtleXMoZmlsZXMpXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgZmlsZUlEcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHByb2dyZXNzID0gZmlsZXNbZmlsZUlEc1tpXV0ucHJvZ3Jlc3NcbiAgICAvLyBJZiBBTlkgZmlsZXMgYXJlIGJlaW5nIHVwbG9hZGVkIHJpZ2h0IG5vdywgc2hvdyB0aGUgdXBsb2FkaW5nIHN0YXRlLlxuICAgIGlmIChwcm9ncmVzcy51cGxvYWRTdGFydGVkICYmICFwcm9ncmVzcy51cGxvYWRDb21wbGV0ZSkge1xuICAgICAgcmV0dXJuIFNUQVRFX1VQTE9BRElOR1xuICAgIH1cbiAgICAvLyBJZiBmaWxlcyBhcmUgYmVpbmcgcHJlcHJvY2Vzc2VkIEFORCBwb3N0cHJvY2Vzc2VkIGF0IHRoaXMgdGltZSwgd2Ugc2hvdyB0aGVcbiAgICAvLyBwcmVwcm9jZXNzIHN0YXRlLiBJZiBhbnkgZmlsZXMgYXJlIGJlaW5nIHVwbG9hZGVkIHdlIHNob3cgdXBsb2FkaW5nLlxuICAgIGlmIChwcm9ncmVzcy5wcmVwcm9jZXNzICYmIHN0YXRlICE9PSBTVEFURV9VUExPQURJTkcpIHtcbiAgICAgIHN0YXRlID0gU1RBVEVfUFJFUFJPQ0VTU0lOR1xuICAgIH1cbiAgICAvLyBJZiBOTyBmaWxlcyBhcmUgYmVpbmcgcHJlcHJvY2Vzc2VkIG9yIHVwbG9hZGVkIHJpZ2h0IG5vdywgYnV0IHNvbWUgZmlsZXMgYXJlXG4gICAgLy8gYmVpbmcgcG9zdHByb2Nlc3NlZCwgc2hvdyB0aGUgcG9zdHByb2Nlc3Mgc3RhdGUuXG4gICAgaWYgKHByb2dyZXNzLnBvc3Rwcm9jZXNzICYmIHN0YXRlICE9PSBTVEFURV9VUExPQURJTkcgJiYgc3RhdGUgIT09IFNUQVRFX1BSRVBST0NFU1NJTkcpIHtcbiAgICAgIHN0YXRlID0gU1RBVEVfUE9TVFBST0NFU1NJTkdcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0YXRlXG59XG5cbmZ1bmN0aW9uIGNhbGN1bGF0ZVByb2Nlc3NpbmdQcm9ncmVzcyAoZmlsZXMpIHtcbiAgLy8gQ29sbGVjdCBwcmUgb3IgcG9zdHByb2Nlc3NpbmcgcHJvZ3Jlc3Mgc3RhdGVzLlxuICBjb25zdCBwcm9ncmVzc2VzID0gW11cbiAgT2JqZWN0LmtleXMoZmlsZXMpLmZvckVhY2goKGZpbGVJRCkgPT4ge1xuICAgIGNvbnN0IHsgcHJvZ3Jlc3MgfSA9IGZpbGVzW2ZpbGVJRF1cbiAgICBpZiAocHJvZ3Jlc3MucHJlcHJvY2Vzcykge1xuICAgICAgcHJvZ3Jlc3Nlcy5wdXNoKHByb2dyZXNzLnByZXByb2Nlc3MpXG4gICAgfVxuICAgIGlmIChwcm9ncmVzcy5wb3N0cHJvY2Vzcykge1xuICAgICAgcHJvZ3Jlc3Nlcy5wdXNoKHByb2dyZXNzLnBvc3Rwcm9jZXNzKVxuICAgIH1cbiAgfSlcblxuICAvLyBJbiB0aGUgZnV0dXJlIHdlIHNob3VsZCBwcm9iYWJseSBkbyB0aGlzIGRpZmZlcmVudGx5LiBGb3Igbm93IHdlJ2xsIHRha2UgdGhlXG4gIC8vIG1vZGUgYW5kIG1lc3NhZ2UgZnJvbSB0aGUgZmlyc3QgZmlsZeKAplxuICBjb25zdCB7IG1vZGUsIG1lc3NhZ2UgfSA9IHByb2dyZXNzZXNbMF1cbiAgY29uc3QgdmFsdWUgPSBwcm9ncmVzc2VzLmZpbHRlcihpc0RldGVybWluYXRlKS5yZWR1Y2UoKHRvdGFsLCBwcm9ncmVzcywgaW5kZXgsIGFsbCkgPT4ge1xuICAgIHJldHVybiB0b3RhbCArIHByb2dyZXNzLnZhbHVlIC8gYWxsLmxlbmd0aFxuICB9LCAwKVxuICBmdW5jdGlvbiBpc0RldGVybWluYXRlIChwcm9ncmVzcykge1xuICAgIHJldHVybiBwcm9ncmVzcy5tb2RlID09PSAnZGV0ZXJtaW5hdGUnXG4gIH1cblxuICByZXR1cm4ge1xuICAgIG1vZGUsXG4gICAgbWVzc2FnZSxcbiAgICB2YWx1ZVxuICB9XG59XG5cbmZ1bmN0aW9uIHRvZ2dsZVBhdXNlUmVzdW1lIChwcm9wcykge1xuICBpZiAocHJvcHMuaXNBbGxDb21wbGV0ZSkgcmV0dXJuXG5cbiAgaWYgKCFwcm9wcy5yZXN1bWFibGVVcGxvYWRzKSB7XG4gICAgcmV0dXJuIHByb3BzLmNhbmNlbEFsbCgpXG4gIH1cblxuICBpZiAocHJvcHMuaXNBbGxQYXVzZWQpIHtcbiAgICByZXR1cm4gcHJvcHMucmVzdW1lQWxsKClcbiAgfVxuXG4gIHJldHVybiBwcm9wcy5wYXVzZUFsbCgpXG59XG5cbm1vZHVsZS5leHBvcnRzID0gKHByb3BzKSA9PiB7XG4gIHByb3BzID0gcHJvcHMgfHwge31cblxuICBjb25zdCB1cGxvYWRTdGF0ZSA9IGdldFVwbG9hZGluZ1N0YXRlKHByb3BzLCBwcm9wcy5maWxlcyB8fCB7fSlcblxuICBsZXQgcHJvZ3Jlc3NWYWx1ZSA9IHByb3BzLnRvdGFsUHJvZ3Jlc3NcbiAgbGV0IHByb2dyZXNzTW9kZVxuICBsZXQgcHJvZ3Jlc3NCYXJDb250ZW50XG4gIGlmICh1cGxvYWRTdGF0ZSA9PT0gU1RBVEVfUFJFUFJPQ0VTU0lORyB8fCB1cGxvYWRTdGF0ZSA9PT0gU1RBVEVfUE9TVFBST0NFU1NJTkcpIHtcbiAgICBjb25zdCBwcm9ncmVzcyA9IGNhbGN1bGF0ZVByb2Nlc3NpbmdQcm9ncmVzcyhwcm9wcy5maWxlcylcbiAgICBwcm9ncmVzc01vZGUgPSBwcm9ncmVzcy5tb2RlXG4gICAgaWYgKHByb2dyZXNzTW9kZSA9PT0gJ2RldGVybWluYXRlJykge1xuICAgICAgcHJvZ3Jlc3NWYWx1ZSA9IHByb2dyZXNzLnZhbHVlICogMTAwXG4gICAgfVxuXG4gICAgcHJvZ3Jlc3NCYXJDb250ZW50ID0gUHJvZ3Jlc3NCYXJQcm9jZXNzaW5nKHByb2dyZXNzKVxuICB9IGVsc2UgaWYgKHVwbG9hZFN0YXRlID09PSBTVEFURV9DT01QTEVURSkge1xuICAgIHByb2dyZXNzQmFyQ29udGVudCA9IFByb2dyZXNzQmFyQ29tcGxldGUocHJvcHMpXG4gIH0gZWxzZSBpZiAodXBsb2FkU3RhdGUgPT09IFNUQVRFX1VQTE9BRElORykge1xuICAgIHByb2dyZXNzQmFyQ29udGVudCA9IFByb2dyZXNzQmFyVXBsb2FkaW5nKHByb3BzKVxuICB9IGVsc2UgaWYgKHVwbG9hZFN0YXRlID09PSBTVEFURV9FUlJPUikge1xuICAgIHByb2dyZXNzVmFsdWUgPSB1bmRlZmluZWRcbiAgICBwcm9ncmVzc0JhckNvbnRlbnQgPSBQcm9ncmVzc0JhckVycm9yKHByb3BzKVxuICB9XG5cbiAgY29uc3Qgd2lkdGggPSB0eXBlb2YgcHJvZ3Jlc3NWYWx1ZSA9PT0gJ251bWJlcicgPyBwcm9ncmVzc1ZhbHVlIDogMTAwXG4gIGNvbnN0IGlzSGlkZGVuID0gKHVwbG9hZFN0YXRlID09PSBTVEFURV9XQUlUSU5HICYmIHByb3BzLmhpZGVVcGxvYWRCdXR0b24pIHx8XG4gICAgKHVwbG9hZFN0YXRlID09PSBTVEFURV9XQUlUSU5HICYmICFwcm9wcy5uZXdGaWxlcyA+IDApIHx8XG4gICAgKHVwbG9hZFN0YXRlID09PSBTVEFURV9DT01QTEVURSAmJiBwcm9wcy5oaWRlQWZ0ZXJGaW5pc2gpXG5cbiAgY29uc3QgcHJvZ3Jlc3NDbGFzc2VzID0gYHVwcHktU3RhdHVzQmFyLXByb2dyZXNzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAke3Byb2dyZXNzTW9kZSA/ICdpcy0nICsgcHJvZ3Jlc3NNb2RlIDogJyd9YFxuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzcz17YHVwcHkgdXBweS1TdGF0dXNCYXIgaXMtJHt1cGxvYWRTdGF0ZX1gfSBhcmlhLWhpZGRlbj17aXNIaWRkZW59PlxuICAgICAgPGRpdiBjbGFzcz17cHJvZ3Jlc3NDbGFzc2VzfVxuICAgICAgICBzdHlsZT17eyB3aWR0aDogd2lkdGggKyAnJScgfX1cbiAgICAgICAgcm9sZT1cInByb2dyZXNzYmFyXCJcbiAgICAgICAgYXJpYS12YWx1ZW1pbj1cIjBcIlxuICAgICAgICBhcmlhLXZhbHVlbWF4PVwiMTAwXCJcbiAgICAgICAgYXJpYS12YWx1ZW5vdz17cHJvZ3Jlc3NWYWx1ZX0gLz5cbiAgICAgIHtwcm9ncmVzc0JhckNvbnRlbnR9XG4gICAgICA8ZGl2IGNsYXNzPVwidXBweS1TdGF0dXNCYXItYWN0aW9uc1wiPlxuICAgICAgICB7IHByb3BzLm5ld0ZpbGVzICYmICFwcm9wcy5oaWRlVXBsb2FkQnV0dG9uID8gPFVwbG9hZEJ0biB7Li4ucHJvcHN9IC8+IDogbnVsbCB9XG4gICAgICAgIHsgcHJvcHMuZXJyb3IgPyA8UmV0cnlCdG4gey4uLnByb3BzfSAvPiA6IG51bGwgfVxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gIClcbn1cblxuY29uc3QgVXBsb2FkQnRuID0gKHByb3BzKSA9PiB7XG4gIHJldHVybiA8YnV0dG9uIHR5cGU9XCJidXR0b25cIlxuICAgIGNsYXNzPVwidXBweS1TdGF0dXNCYXItYWN0aW9uQnRuIHVwcHktU3RhdHVzQmFyLWFjdGlvbkJ0bi0tdXBsb2FkXCJcbiAgICBhcmlhLWxhYmVsPXtwcm9wcy5pMThuKCd1cGxvYWRYRmlsZXMnLCB7IHNtYXJ0X2NvdW50OiBwcm9wcy5uZXdGaWxlcyB9KX1cbiAgICBvbmNsaWNrPXtwcm9wcy5zdGFydFVwbG9hZH0+XG4gICAge3Byb3BzLmluUHJvZ3Jlc3NcbiAgICAgID8gcHJvcHMuaTE4bigndXBsb2FkWE5ld0ZpbGVzJywgeyBzbWFydF9jb3VudDogcHJvcHMubmV3RmlsZXMgfSlcbiAgICAgIDogcHJvcHMuaTE4bigndXBsb2FkWEZpbGVzJywgeyBzbWFydF9jb3VudDogcHJvcHMubmV3RmlsZXMgfSlcbiAgICB9XG4gIDwvYnV0dG9uPlxufVxuXG5jb25zdCBSZXRyeUJ0biA9IChwcm9wcykgPT4ge1xuICByZXR1cm4gPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCJcbiAgICBjbGFzcz1cInVwcHktU3RhdHVzQmFyLWFjdGlvbkJ0biB1cHB5LVN0YXR1c0Jhci1hY3Rpb25CdG4tLXJldHJ5XCJcbiAgICBhcmlhLWxhYmVsPXtwcm9wcy5pMThuKCdyZXRyeVVwbG9hZCcpfVxuICAgIG9uY2xpY2s9e3Byb3BzLnJldHJ5QWxsfT57cHJvcHMuaTE4bigncmV0cnknKX08L2J1dHRvbj5cbn1cblxuY29uc3QgUHJvZ3Jlc3NCYXJQcm9jZXNzaW5nID0gKHByb3BzKSA9PiB7XG4gIGNvbnN0IHZhbHVlID0gTWF0aC5yb3VuZChwcm9wcy52YWx1ZSAqIDEwMClcblxuICByZXR1cm4gPGRpdiBjbGFzcz1cInVwcHktU3RhdHVzQmFyLWNvbnRlbnRcIj5cbiAgICB7cHJvcHMubW9kZSA9PT0gJ2RldGVybWluYXRlJyA/IGAke3ZhbHVlfSXjg7tgIDogJyd9XG4gICAge3Byb3BzLm1lc3NhZ2V9XG4gIDwvZGl2PlxufVxuXG5jb25zdCBQcm9ncmVzc0JhclVwbG9hZGluZyA9IChwcm9wcykgPT4ge1xuICBjb25zdCB7IGkxOG4gfSA9IHByb3BzXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzcz1cInVwcHktU3RhdHVzQmFyLWNvbnRlbnRcIj5cbiAgICAgIHtwcm9wcy5pc1VwbG9hZFN0YXJ0ZWQgJiYgIXByb3BzLmlzQWxsQ29tcGxldGVcbiAgICAgICAgPyAhcHJvcHMuaXNBbGxQYXVzZWRcbiAgICAgICAgICA/IDxkaXYgdGl0bGU9XCJVcGxvYWRpbmdcIj57IDxQYXVzZVJlc3VtZUJ1dHRvbnMgey4uLnByb3BzfSAvPiB9IHtpMThuKCd1cGxvYWRpbmcnKX0geyA8VGhyb3R0bGVkUHJvZ3Jlc3NEZXRhaWxzIHsuLi5wcm9wc30gLz4gfTwvZGl2PlxuICAgICAgICAgIDogPGRpdiB0aXRsZT1cIlBhdXNlZFwiPnsgPFBhdXNlUmVzdW1lQnV0dG9ucyB7Li4ucHJvcHN9IC8+IH0ge2kxOG4oJ3BhdXNlZCcpfeODu3twcm9wcy50b3RhbFByb2dyZXNzfSU8L2Rpdj5cbiAgICAgICAgOiBudWxsXG4gICAgICB9XG4gICAgPC9kaXY+XG4gIClcbn1cblxuY29uc3QgUHJvZ3Jlc3NCYXJDb21wbGV0ZSA9ICh7IHRvdGFsUHJvZ3Jlc3MsIGkxOG4gfSkgPT4ge1xuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3M9XCJ1cHB5LVN0YXR1c0Jhci1jb250ZW50XCIgcm9sZT1cInN0YXR1c1wiPlxuICAgICAgPHNwYW4gdGl0bGU9XCJDb21wbGV0ZVwiPlxuICAgICAgICA8c3ZnIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIGNsYXNzPVwidXBweS1TdGF0dXNCYXItc3RhdHVzSW5kaWNhdG9yIFVwcHlJY29uXCIgd2lkdGg9XCIxOFwiIGhlaWdodD1cIjE3XCIgdmlld0JveD1cIjAgMCAyMyAxN1wiPlxuICAgICAgICAgIDxwYXRoIGQ9XCJNOC45NDQgMTdMMCA3Ljg2NWwyLjU1NS0yLjYxIDYuMzkgNi41MjVMMjAuNDEgMCAyMyAyLjY0NXpcIiAvPlxuICAgICAgICA8L3N2Zz5cbiAgICAgICAge2kxOG4oJ3VwbG9hZENvbXBsZXRlJyl944O7e3RvdGFsUHJvZ3Jlc3N9JVxuICAgICAgPC9zcGFuPlxuICAgIDwvZGl2PlxuICApXG59XG5cbmNvbnN0IFByb2dyZXNzQmFyRXJyb3IgPSAoeyBlcnJvciwgcmV0cnlBbGwsIGkxOG4gfSkgPT4ge1xuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3M9XCJ1cHB5LVN0YXR1c0Jhci1jb250ZW50XCIgcm9sZT1cImFsZXJ0XCI+XG4gICAgICA8c3Ryb25nPntpMThuKCd1cGxvYWRGYWlsZWQnKX0uPC9zdHJvbmc+IDxzcGFuPntpMThuKCdwbGVhc2VQcmVzc1JldHJ5Jyl9PC9zcGFuPlxuICAgICAgPHNwYW4gY2xhc3M9XCJ1cHB5LVN0YXR1c0Jhci1kZXRhaWxzXCJcbiAgICAgICAgYXJpYS1sYWJlbD17ZXJyb3J9XG4gICAgICAgIGRhdGEtbWljcm90aXAtcG9zaXRpb249XCJ0b3BcIlxuICAgICAgICBkYXRhLW1pY3JvdGlwLXNpemU9XCJsYXJnZVwiXG4gICAgICAgIHJvbGU9XCJ0b29sdGlwXCI+Pzwvc3Bhbj5cbiAgICA8L2Rpdj5cbiAgKVxufVxuXG5jb25zdCBQYXVzZVJlc3VtZUJ1dHRvbnMgPSAocHJvcHMpID0+IHtcbiAgY29uc3QgeyByZXN1bWFibGVVcGxvYWRzLCBpc0FsbFBhdXNlZCwgaTE4biB9ID0gcHJvcHNcbiAgY29uc3QgdGl0bGUgPSByZXN1bWFibGVVcGxvYWRzXG4gICAgICAgICAgICAgICAgPyBpc0FsbFBhdXNlZFxuICAgICAgICAgICAgICAgICAgPyBpMThuKCdyZXN1bWVVcGxvYWQnKVxuICAgICAgICAgICAgICAgICAgOiBpMThuKCdwYXVzZVVwbG9hZCcpXG4gICAgICAgICAgICAgICAgOiBpMThuKCdjYW5jZWxVcGxvYWQnKVxuXG4gIHJldHVybiA8YnV0dG9uIHRpdGxlPXt0aXRsZX0gY2xhc3M9XCJ1cHB5LVN0YXR1c0Jhci1zdGF0dXNJbmRpY2F0b3JcIiB0eXBlPVwiYnV0dG9uXCIgb25jbGljaz17KCkgPT4gdG9nZ2xlUGF1c2VSZXN1bWUocHJvcHMpfT5cbiAgICB7cmVzdW1hYmxlVXBsb2Fkc1xuICAgICAgPyBpc0FsbFBhdXNlZFxuICAgICAgICA/IDxzdmcgYXJpYS1oaWRkZW49XCJ0cnVlXCIgY2xhc3M9XCJVcHB5SWNvblwiIHdpZHRoPVwiMTVcIiBoZWlnaHQ9XCIxN1wiIHZpZXdCb3g9XCIwIDAgMTEgMTNcIj5cbiAgICAgICAgICA8cGF0aCBkPVwiTTEuMjYgMTIuNTM0YS42Ny42NyAwIDAgMS0uNjc0LjAxMi42Ny42NyAwIDAgMS0uMzM2LS41ODN2LTExQy4yNS43MjQuMzguNS41ODYuMzgyYS42NTguNjU4IDAgMCAxIC42NzMuMDEybDkuMTY1IDUuNWEuNjYuNjYgMCAwIDEgLjMyNS41Ny42Ni42NiAwIDAgMS0uMzI1LjU3M2wtOS4xNjYgNS41elwiIC8+XG4gICAgICAgIDwvc3ZnPlxuICAgICAgICA6IDxzdmcgYXJpYS1oaWRkZW49XCJ0cnVlXCIgY2xhc3M9XCJVcHB5SWNvblwiIHdpZHRoPVwiMTZcIiBoZWlnaHQ9XCIxN1wiIHZpZXdCb3g9XCIwIDAgMTIgMTNcIj5cbiAgICAgICAgICA8cGF0aCBkPVwiTTQuODg4LjgxdjExLjM4YzAgLjQ0Ni0uMzI0LjgxLS43MjIuODFIMi43MjJDMi4zMjQgMTMgMiAxMi42MzYgMiAxMi4xOVYuODFjMC0uNDQ2LjMyNC0uODEuNzIyLS44MWgxLjQ0NGMuMzk4IDAgLjcyMi4zNjQuNzIyLjgxek05Ljg4OC44MXYxMS4zOGMwIC40NDYtLjMyNC44MS0uNzIyLjgxSDcuNzIyQzcuMzI0IDEzIDcgMTIuNjM2IDcgMTIuMTlWLjgxYzAtLjQ0Ni4zMjQtLjgxLjcyMi0uODFoMS40NDRjLjM5OCAwIC43MjIuMzY0LjcyMi44MXpcIiAvPlxuICAgICAgICA8L3N2Zz5cbiAgICAgIDogPHN2ZyBhcmlhLWhpZGRlbj1cInRydWVcIiBjbGFzcz1cIlVwcHlJY29uXCIgd2lkdGg9XCIxNnB4XCIgaGVpZ2h0PVwiMTZweFwiIHZpZXdCb3g9XCIwIDAgMTkgMTlcIj5cbiAgICAgICAgPHBhdGggZD1cIk0xNy4zMTggMTcuMjMyTDkuOTQgOS44NTQgOS41ODYgOS41bC0uMzU0LjM1NC03LjM3OCA3LjM3OGguNzA3bC0uNjItLjYydi43MDZMOS4zMTggOS45NGwuMzU0LS4zNTQtLjM1NC0uMzU0TDEuOTQgMS44NTR2LjcwN2wuNjItLjYyaC0uNzA2bDcuMzc4IDcuMzc4LjM1NC4zNTQuMzU0LS4zNTQgNy4zNzgtNy4zNzhoLS43MDdsLjYyMi42MnYtLjcwNkw5Ljg1NCA5LjIzMmwtLjM1NC4zNTQuMzU0LjM1NCA3LjM3OCA3LjM3OC43MDgtLjcwNy03LjM4LTcuMzc4di43MDhsNy4zOC03LjM4LjM1My0uMzUzLS4zNTMtLjM1My0uNjIyLS42MjItLjM1My0uMzUzLS4zNTQuMzUyLTcuMzc4IDcuMzhoLjcwOEwyLjU2IDEuMjMgMi4yMDguODhsLS4zNTMuMzUzLS42MjIuNjItLjM1My4zNTUuMzUyLjM1MyA3LjM4IDcuMzh2LS43MDhsLTcuMzggNy4zOC0uMzUzLjM1My4zNTIuMzUzLjYyMi42MjIuMzUzLjM1My4zNTQtLjM1MyA3LjM4LTcuMzhoLS43MDhsNy4zOCA3LjM4elwiIC8+XG4gICAgICA8L3N2Zz5cbiAgICB9XG4gIDwvYnV0dG9uPlxufVxuIiwiY29uc3QgUGx1Z2luID0gcmVxdWlyZSgnLi4vLi4vY29yZS9QbHVnaW4nKVxuY29uc3QgVHJhbnNsYXRvciA9IHJlcXVpcmUoJy4uLy4uL2NvcmUvVHJhbnNsYXRvcicpXG5jb25zdCBTdGF0dXNCYXJVSSA9IHJlcXVpcmUoJy4vU3RhdHVzQmFyJylcbmNvbnN0IHsgZ2V0U3BlZWQgfSA9IHJlcXVpcmUoJy4uLy4uL2NvcmUvVXRpbHMnKVxuY29uc3QgeyBnZXRCeXRlc1JlbWFpbmluZyB9ID0gcmVxdWlyZSgnLi4vLi4vY29yZS9VdGlscycpXG5jb25zdCB7IHByZXR0eUVUQSB9ID0gcmVxdWlyZSgnLi4vLi4vY29yZS9VdGlscycpXG5jb25zdCBwcmV0dHlCeXRlcyA9IHJlcXVpcmUoJ3ByZXR0aWVyLWJ5dGVzJylcblxuLyoqXG4gKiBBIHN0YXR1cyBiYXIuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgU3RhdHVzQmFyIGV4dGVuZHMgUGx1Z2luIHtcbiAgY29uc3RydWN0b3IgKHVwcHksIG9wdHMpIHtcbiAgICBzdXBlcih1cHB5LCBvcHRzKVxuICAgIHRoaXMuaWQgPSB0aGlzLm9wdHMuaWQgfHwgJ1N0YXR1c0JhcidcbiAgICB0aGlzLnRpdGxlID0gJ1N0YXR1c0JhcidcbiAgICB0aGlzLnR5cGUgPSAncHJvZ3Jlc3NpbmRpY2F0b3InXG5cbiAgICBjb25zdCBkZWZhdWx0TG9jYWxlID0ge1xuICAgICAgc3RyaW5nczoge1xuICAgICAgICB1cGxvYWRpbmc6ICdVcGxvYWRpbmcuLi4nLFxuICAgICAgICB1cGxvYWRDb21wbGV0ZTogJ1VwbG9hZCBjb21wbGV0ZScsXG4gICAgICAgIHVwbG9hZEZhaWxlZDogJ1VwbG9hZCBmYWlsZWQnLFxuICAgICAgICBwbGVhc2VQcmVzc1JldHJ5OiAnUGxlYXNlIHByZXNzIFJldHJ5IHRvIHVwbG9hZCBhZ2FpbicsXG4gICAgICAgIHBhdXNlZDogJ1BhdXNlZCcsXG4gICAgICAgIGVycm9yOiAnRXJyb3InLFxuICAgICAgICByZXRyeTogJ1JldHJ5JyxcbiAgICAgICAgcHJlc3NUb1JldHJ5OiAnUHJlc3MgdG8gcmV0cnknLFxuICAgICAgICByZXRyeVVwbG9hZDogJ1JldHJ5IHVwbG9hZCcsXG4gICAgICAgIHJlc3VtZVVwbG9hZDogJ1Jlc3VtZSB1cGxvYWQnLFxuICAgICAgICBjYW5jZWxVcGxvYWQ6ICdDYW5jZWwgdXBsb2FkJyxcbiAgICAgICAgcGF1c2VVcGxvYWQ6ICdQYXVzZSB1cGxvYWQnLFxuICAgICAgICB1cGxvYWRYRmlsZXM6IHtcbiAgICAgICAgICAwOiAnVXBsb2FkICV7c21hcnRfY291bnR9IGZpbGUnLFxuICAgICAgICAgIDE6ICdVcGxvYWQgJXtzbWFydF9jb3VudH0gZmlsZXMnXG4gICAgICAgIH0sXG4gICAgICAgIHVwbG9hZFhOZXdGaWxlczoge1xuICAgICAgICAgIDA6ICdVcGxvYWQgKyV7c21hcnRfY291bnR9IGZpbGUnLFxuICAgICAgICAgIDE6ICdVcGxvYWQgKyV7c21hcnRfY291bnR9IGZpbGVzJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICAgIGNvbnN0IGRlZmF1bHRPcHRpb25zID0ge1xuICAgICAgdGFyZ2V0OiAnYm9keScsXG4gICAgICBoaWRlVXBsb2FkQnV0dG9uOiBmYWxzZSxcbiAgICAgIHNob3dQcm9ncmVzc0RldGFpbHM6IGZhbHNlLFxuICAgICAgbG9jYWxlOiBkZWZhdWx0TG9jYWxlLFxuICAgICAgaGlkZUFmdGVyRmluaXNoOiB0cnVlXG4gICAgfVxuXG4gICAgLy8gbWVyZ2UgZGVmYXVsdCBvcHRpb25zIHdpdGggdGhlIG9uZXMgc2V0IGJ5IHVzZXJcbiAgICB0aGlzLm9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucywgb3B0cylcblxuICAgIHRoaXMubG9jYWxlID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdExvY2FsZSwgdGhpcy5vcHRzLmxvY2FsZSlcbiAgICB0aGlzLmxvY2FsZS5zdHJpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdExvY2FsZS5zdHJpbmdzLCB0aGlzLm9wdHMubG9jYWxlLnN0cmluZ3MpXG5cbiAgICB0aGlzLnRyYW5zbGF0b3IgPSBuZXcgVHJhbnNsYXRvcih7bG9jYWxlOiB0aGlzLmxvY2FsZX0pXG4gICAgdGhpcy5pMThuID0gdGhpcy50cmFuc2xhdG9yLnRyYW5zbGF0ZS5iaW5kKHRoaXMudHJhbnNsYXRvcilcblxuICAgIHRoaXMuc3RhcnRVcGxvYWQgPSB0aGlzLnN0YXJ0VXBsb2FkLmJpbmQodGhpcylcbiAgICB0aGlzLnJlbmRlciA9IHRoaXMucmVuZGVyLmJpbmQodGhpcylcbiAgICB0aGlzLmluc3RhbGwgPSB0aGlzLmluc3RhbGwuYmluZCh0aGlzKVxuICB9XG5cbiAgZ2V0VG90YWxTcGVlZCAoZmlsZXMpIHtcbiAgICBsZXQgdG90YWxTcGVlZCA9IDBcbiAgICBmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICB0b3RhbFNwZWVkID0gdG90YWxTcGVlZCArIGdldFNwZWVkKGZpbGUucHJvZ3Jlc3MpXG4gICAgfSlcbiAgICByZXR1cm4gdG90YWxTcGVlZFxuICB9XG5cbiAgZ2V0VG90YWxFVEEgKGZpbGVzKSB7XG4gICAgY29uc3QgdG90YWxTcGVlZCA9IHRoaXMuZ2V0VG90YWxTcGVlZChmaWxlcylcbiAgICBpZiAodG90YWxTcGVlZCA9PT0gMCkge1xuICAgICAgcmV0dXJuIDBcbiAgICB9XG5cbiAgICBjb25zdCB0b3RhbEJ5dGVzUmVtYWluaW5nID0gZmlsZXMucmVkdWNlKCh0b3RhbCwgZmlsZSkgPT4ge1xuICAgICAgcmV0dXJuIHRvdGFsICsgZ2V0Qnl0ZXNSZW1haW5pbmcoZmlsZS5wcm9ncmVzcylcbiAgICB9LCAwKVxuXG4gICAgcmV0dXJuIE1hdGgucm91bmQodG90YWxCeXRlc1JlbWFpbmluZyAvIHRvdGFsU3BlZWQgKiAxMCkgLyAxMFxuICB9XG5cbiAgc3RhcnRVcGxvYWQgKCkge1xuICAgIHJldHVybiB0aGlzLnVwcHkudXBsb2FkKCkuY2F0Y2goKCkgPT4ge1xuICAgICAgLy8gSWdub3JlXG4gICAgfSlcbiAgfVxuXG4gIHJlbmRlciAoc3RhdGUpIHtcbiAgICBjb25zdCBmaWxlcyA9IHN0YXRlLmZpbGVzXG5cbiAgICBjb25zdCB1cGxvYWRTdGFydGVkRmlsZXMgPSBPYmplY3Qua2V5cyhmaWxlcykuZmlsdGVyKChmaWxlKSA9PiB7XG4gICAgICByZXR1cm4gZmlsZXNbZmlsZV0ucHJvZ3Jlc3MudXBsb2FkU3RhcnRlZFxuICAgIH0pXG4gICAgY29uc3QgbmV3RmlsZXMgPSBPYmplY3Qua2V5cyhmaWxlcykuZmlsdGVyKChmaWxlKSA9PiB7XG4gICAgICByZXR1cm4gIWZpbGVzW2ZpbGVdLnByb2dyZXNzLnVwbG9hZFN0YXJ0ZWQgJiZcbiAgICAgICAgIWZpbGVzW2ZpbGVdLnByb2dyZXNzLnByZXByb2Nlc3MgJiZcbiAgICAgICAgIWZpbGVzW2ZpbGVdLnByb2dyZXNzLnBvc3Rwcm9jZXNzXG4gICAgfSlcbiAgICBjb25zdCBjb21wbGV0ZUZpbGVzID0gT2JqZWN0LmtleXMoZmlsZXMpLmZpbHRlcigoZmlsZSkgPT4ge1xuICAgICAgcmV0dXJuIGZpbGVzW2ZpbGVdLnByb2dyZXNzLnVwbG9hZENvbXBsZXRlXG4gICAgfSlcbiAgICBjb25zdCBlcnJvcmVkRmlsZXMgPSBPYmplY3Qua2V5cyhmaWxlcykuZmlsdGVyKChmaWxlKSA9PiB7XG4gICAgICByZXR1cm4gZmlsZXNbZmlsZV0uZXJyb3JcbiAgICB9KVxuICAgIGNvbnN0IGluUHJvZ3Jlc3NGaWxlcyA9IE9iamVjdC5rZXlzKGZpbGVzKS5maWx0ZXIoKGZpbGUpID0+IHtcbiAgICAgIHJldHVybiAhZmlsZXNbZmlsZV0ucHJvZ3Jlc3MudXBsb2FkQ29tcGxldGUgJiZcbiAgICAgICAgICAgICBmaWxlc1tmaWxlXS5wcm9ncmVzcy51cGxvYWRTdGFydGVkICYmXG4gICAgICAgICAgICAgIWZpbGVzW2ZpbGVdLmlzUGF1c2VkXG4gICAgfSlcbiAgICBjb25zdCBwcm9jZXNzaW5nRmlsZXMgPSBPYmplY3Qua2V5cyhmaWxlcykuZmlsdGVyKChmaWxlKSA9PiB7XG4gICAgICByZXR1cm4gZmlsZXNbZmlsZV0ucHJvZ3Jlc3MucHJlcHJvY2VzcyB8fCBmaWxlc1tmaWxlXS5wcm9ncmVzcy5wb3N0cHJvY2Vzc1xuICAgIH0pXG5cbiAgICBsZXQgaW5Qcm9ncmVzc0ZpbGVzQXJyYXkgPSBbXVxuICAgIGluUHJvZ3Jlc3NGaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICBpblByb2dyZXNzRmlsZXNBcnJheS5wdXNoKGZpbGVzW2ZpbGVdKVxuICAgIH0pXG5cbiAgICBjb25zdCB0b3RhbFNwZWVkID0gcHJldHR5Qnl0ZXModGhpcy5nZXRUb3RhbFNwZWVkKGluUHJvZ3Jlc3NGaWxlc0FycmF5KSlcbiAgICBjb25zdCB0b3RhbEVUQSA9IHByZXR0eUVUQSh0aGlzLmdldFRvdGFsRVRBKGluUHJvZ3Jlc3NGaWxlc0FycmF5KSlcblxuICAgIC8vIHRvdGFsIHNpemUgYW5kIHVwbG9hZGVkIHNpemVcbiAgICBsZXQgdG90YWxTaXplID0gMFxuICAgIGxldCB0b3RhbFVwbG9hZGVkU2l6ZSA9IDBcbiAgICBpblByb2dyZXNzRmlsZXNBcnJheS5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICB0b3RhbFNpemUgPSB0b3RhbFNpemUgKyAoZmlsZS5wcm9ncmVzcy5ieXRlc1RvdGFsIHx8IDApXG4gICAgICB0b3RhbFVwbG9hZGVkU2l6ZSA9IHRvdGFsVXBsb2FkZWRTaXplICsgKGZpbGUucHJvZ3Jlc3MuYnl0ZXNVcGxvYWRlZCB8fCAwKVxuICAgIH0pXG4gICAgdG90YWxTaXplID0gcHJldHR5Qnl0ZXModG90YWxTaXplKVxuICAgIHRvdGFsVXBsb2FkZWRTaXplID0gcHJldHR5Qnl0ZXModG90YWxVcGxvYWRlZFNpemUpXG5cbiAgICBjb25zdCBpc1VwbG9hZFN0YXJ0ZWQgPSB1cGxvYWRTdGFydGVkRmlsZXMubGVuZ3RoID4gMFxuXG4gICAgY29uc3QgaXNBbGxDb21wbGV0ZSA9IHN0YXRlLnRvdGFsUHJvZ3Jlc3MgPT09IDEwMCAmJlxuICAgICAgY29tcGxldGVGaWxlcy5sZW5ndGggPT09IE9iamVjdC5rZXlzKGZpbGVzKS5sZW5ndGggJiZcbiAgICAgIHByb2Nlc3NpbmdGaWxlcy5sZW5ndGggPT09IDBcblxuICAgIGNvbnN0IGlzQWxsRXJyb3JlZCA9IGlzVXBsb2FkU3RhcnRlZCAmJlxuICAgICAgZXJyb3JlZEZpbGVzLmxlbmd0aCA9PT0gdXBsb2FkU3RhcnRlZEZpbGVzLmxlbmd0aFxuXG4gICAgY29uc3QgaXNBbGxQYXVzZWQgPSBpblByb2dyZXNzRmlsZXMubGVuZ3RoID09PSAwICYmXG4gICAgICAhaXNBbGxDb21wbGV0ZSAmJlxuICAgICAgIWlzQWxsRXJyb3JlZCAmJlxuICAgICAgdXBsb2FkU3RhcnRlZEZpbGVzLmxlbmd0aCA+IDBcblxuICAgIGNvbnN0IHJlc3VtYWJsZVVwbG9hZHMgPSB0aGlzLnVwcHkuZ2V0U3RhdGUoKS5jYXBhYmlsaXRpZXMucmVzdW1hYmxlVXBsb2FkcyB8fCBmYWxzZVxuXG4gICAgcmV0dXJuIFN0YXR1c0JhclVJKHtcbiAgICAgIGVycm9yOiBzdGF0ZS5lcnJvcixcbiAgICAgIHRvdGFsUHJvZ3Jlc3M6IHN0YXRlLnRvdGFsUHJvZ3Jlc3MsXG4gICAgICB0b3RhbFNpemU6IHRvdGFsU2l6ZSxcbiAgICAgIHRvdGFsVXBsb2FkZWRTaXplOiB0b3RhbFVwbG9hZGVkU2l6ZSxcbiAgICAgIHVwbG9hZFN0YXJ0ZWRGaWxlczogdXBsb2FkU3RhcnRlZEZpbGVzLFxuICAgICAgaXNBbGxDb21wbGV0ZTogaXNBbGxDb21wbGV0ZSxcbiAgICAgIGlzQWxsUGF1c2VkOiBpc0FsbFBhdXNlZCxcbiAgICAgIGlzQWxsRXJyb3JlZDogaXNBbGxFcnJvcmVkLFxuICAgICAgaXNVcGxvYWRTdGFydGVkOiBpc1VwbG9hZFN0YXJ0ZWQsXG4gICAgICBpMThuOiB0aGlzLmkxOG4sXG4gICAgICBwYXVzZUFsbDogdGhpcy51cHB5LnBhdXNlQWxsLFxuICAgICAgcmVzdW1lQWxsOiB0aGlzLnVwcHkucmVzdW1lQWxsLFxuICAgICAgcmV0cnlBbGw6IHRoaXMudXBweS5yZXRyeUFsbCxcbiAgICAgIGNhbmNlbEFsbDogdGhpcy51cHB5LmNhbmNlbEFsbCxcbiAgICAgIHN0YXJ0VXBsb2FkOiB0aGlzLnN0YXJ0VXBsb2FkLFxuICAgICAgY29tcGxldGU6IGNvbXBsZXRlRmlsZXMubGVuZ3RoLFxuICAgICAgbmV3RmlsZXM6IG5ld0ZpbGVzLmxlbmd0aCxcbiAgICAgIGluUHJvZ3Jlc3M6IHVwbG9hZFN0YXJ0ZWRGaWxlcy5sZW5ndGgsXG4gICAgICB0b3RhbFNwZWVkOiB0b3RhbFNwZWVkLFxuICAgICAgdG90YWxFVEE6IHRvdGFsRVRBLFxuICAgICAgZmlsZXM6IHN0YXRlLmZpbGVzLFxuICAgICAgcmVzdW1hYmxlVXBsb2FkczogcmVzdW1hYmxlVXBsb2FkcyxcbiAgICAgIGhpZGVVcGxvYWRCdXR0b246IHRoaXMub3B0cy5oaWRlVXBsb2FkQnV0dG9uLFxuICAgICAgaGlkZUFmdGVyRmluaXNoOiB0aGlzLm9wdHMuaGlkZUFmdGVyRmluaXNoXG4gICAgfSlcbiAgfVxuXG4gIGluc3RhbGwgKCkge1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMub3B0cy50YXJnZXRcbiAgICBpZiAodGFyZ2V0KSB7XG4gICAgICB0aGlzLm1vdW50KHRhcmdldCwgdGhpcylcbiAgICB9XG4gIH1cblxuICB1bmluc3RhbGwgKCkge1xuICAgIHRoaXMudW5tb3VudCgpXG4gIH1cbn1cbiIsImNvbnN0IFBsdWdpbiA9IHJlcXVpcmUoJy4uL2NvcmUvUGx1Z2luJylcbmNvbnN0IHR1cyA9IHJlcXVpcmUoJ3R1cy1qcy1jbGllbnQnKVxuY29uc3QgVXBweVNvY2tldCA9IHJlcXVpcmUoJy4uL2NvcmUvVXBweVNvY2tldCcpXG5jb25zdCB7XG4gIGVtaXRTb2NrZXRQcm9ncmVzcyxcbiAgZ2V0U29ja2V0SG9zdCxcbiAgc2V0dGxlXG59ID0gcmVxdWlyZSgnLi4vY29yZS9VdGlscycpXG5yZXF1aXJlKCd3aGF0d2ctZmV0Y2gnKVxuXG4vLyBFeHRyYWN0ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vdHVzL3R1cy1qcy1jbGllbnQvYmxvYi9tYXN0ZXIvbGliL3VwbG9hZC5qcyNMMTNcbi8vIGV4Y2VwdGVkIHdlIHJlbW92ZWQgJ2ZpbmdlcnByaW50JyBrZXkgdG8gYXZvaWQgYWRkaW5nIG1vcmUgZGVwZW5kZW5jaWVzXG5jb25zdCB0dXNEZWZhdWx0T3B0aW9ucyA9IHtcbiAgZW5kcG9pbnQ6ICcnLFxuICByZXN1bWU6IHRydWUsXG4gIG9uUHJvZ3Jlc3M6IG51bGwsXG4gIG9uQ2h1bmtDb21wbGV0ZTogbnVsbCxcbiAgb25TdWNjZXNzOiBudWxsLFxuICBvbkVycm9yOiBudWxsLFxuICBoZWFkZXJzOiB7fSxcbiAgY2h1bmtTaXplOiBJbmZpbml0eSxcbiAgd2l0aENyZWRlbnRpYWxzOiBmYWxzZSxcbiAgdXBsb2FkVXJsOiBudWxsLFxuICB1cGxvYWRTaXplOiBudWxsLFxuICBvdmVycmlkZVBhdGNoTWV0aG9kOiBmYWxzZSxcbiAgcmV0cnlEZWxheXM6IG51bGxcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSB3cmFwcGVyIGFyb3VuZCBhbiBldmVudCBlbWl0dGVyIHdpdGggYSBgcmVtb3ZlYCBtZXRob2QgdG8gcmVtb3ZlXG4gKiBhbGwgZXZlbnRzIHRoYXQgd2VyZSBhZGRlZCB1c2luZyB0aGUgd3JhcHBlZCBlbWl0dGVyLlxuICovXG5mdW5jdGlvbiBjcmVhdGVFdmVudFRyYWNrZXIgKGVtaXR0ZXIpIHtcbiAgY29uc3QgZXZlbnRzID0gW11cbiAgcmV0dXJuIHtcbiAgICBvbiAoZXZlbnQsIGZuKSB7XG4gICAgICBldmVudHMucHVzaChbIGV2ZW50LCBmbiBdKVxuICAgICAgcmV0dXJuIGVtaXR0ZXIub24oZXZlbnQsIGZuKVxuICAgIH0sXG4gICAgcmVtb3ZlICgpIHtcbiAgICAgIGV2ZW50cy5mb3JFYWNoKChbIGV2ZW50LCBmbiBdKSA9PiB7XG4gICAgICAgIGVtaXR0ZXIub2ZmKGV2ZW50LCBmbilcbiAgICAgIH0pXG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogVHVzIHJlc3VtYWJsZSBmaWxlIHVwbG9hZGVyXG4gKlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFR1cyBleHRlbmRzIFBsdWdpbiB7XG4gIGNvbnN0cnVjdG9yICh1cHB5LCBvcHRzKSB7XG4gICAgc3VwZXIodXBweSwgb3B0cylcbiAgICB0aGlzLnR5cGUgPSAndXBsb2FkZXInXG4gICAgdGhpcy5pZCA9ICdUdXMnXG4gICAgdGhpcy50aXRsZSA9ICdUdXMnXG5cbiAgICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gICAgY29uc3QgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgICByZXN1bWU6IHRydWUsXG4gICAgICBhdXRvUmV0cnk6IHRydWUsXG4gICAgICByZXRyeURlbGF5czogWzAsIDEwMDAsIDMwMDAsIDUwMDBdXG4gICAgfVxuXG4gICAgLy8gbWVyZ2UgZGVmYXVsdCBvcHRpb25zIHdpdGggdGhlIG9uZXMgc2V0IGJ5IHVzZXJcbiAgICB0aGlzLm9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucywgb3B0cylcblxuICAgIHRoaXMudXBsb2FkZXJzID0gT2JqZWN0LmNyZWF0ZShudWxsKVxuICAgIHRoaXMudXBsb2FkZXJFdmVudHMgPSBPYmplY3QuY3JlYXRlKG51bGwpXG4gICAgdGhpcy51cGxvYWRlclNvY2tldHMgPSBPYmplY3QuY3JlYXRlKG51bGwpXG5cbiAgICB0aGlzLmhhbmRsZVJlc2V0UHJvZ3Jlc3MgPSB0aGlzLmhhbmRsZVJlc2V0UHJvZ3Jlc3MuYmluZCh0aGlzKVxuICAgIHRoaXMuaGFuZGxlVXBsb2FkID0gdGhpcy5oYW5kbGVVcGxvYWQuYmluZCh0aGlzKVxuICB9XG5cbiAgaGFuZGxlUmVzZXRQcm9ncmVzcyAoKSB7XG4gICAgY29uc3QgZmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLnVwcHkuc3RhdGUuZmlsZXMpXG4gICAgT2JqZWN0LmtleXMoZmlsZXMpLmZvckVhY2goKGZpbGVJRCkgPT4ge1xuICAgICAgLy8gT25seSBjbG9uZSB0aGUgZmlsZSBvYmplY3QgaWYgaXQgaGFzIGEgVHVzIGB1cGxvYWRVcmxgIGF0dGFjaGVkLlxuICAgICAgaWYgKGZpbGVzW2ZpbGVJRF0udHVzICYmIGZpbGVzW2ZpbGVJRF0udHVzLnVwbG9hZFVybCkge1xuICAgICAgICBjb25zdCB0dXNTdGF0ZSA9IE9iamVjdC5hc3NpZ24oe30sIGZpbGVzW2ZpbGVJRF0udHVzKVxuICAgICAgICBkZWxldGUgdHVzU3RhdGUudXBsb2FkVXJsXG4gICAgICAgIGZpbGVzW2ZpbGVJRF0gPSBPYmplY3QuYXNzaWduKHt9LCBmaWxlc1tmaWxlSURdLCB7IHR1czogdHVzU3RhdGUgfSlcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhpcy51cHB5LnNldFN0YXRlKHsgZmlsZXMgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhbiB1cCBhbGwgcmVmZXJlbmNlcyBmb3IgYSBmaWxlJ3MgdXBsb2FkOiB0aGUgdHVzLlVwbG9hZCBpbnN0YW5jZSxcbiAgICogYW55IGV2ZW50cyByZWxhdGVkIHRvIHRoZSBmaWxlLCBhbmQgdGhlIHVwcHktc2VydmVyIFdlYlNvY2tldCBjb25uZWN0aW9uLlxuICAgKi9cbiAgcmVzZXRVcGxvYWRlclJlZmVyZW5jZXMgKGZpbGVJRCkge1xuICAgIGlmICh0aGlzLnVwbG9hZGVyc1tmaWxlSURdKSB7XG4gICAgICB0aGlzLnVwbG9hZGVyc1tmaWxlSURdLmFib3J0KClcbiAgICAgIHRoaXMudXBsb2FkZXJzW2ZpbGVJRF0gPSBudWxsXG4gICAgfVxuICAgIGlmICh0aGlzLnVwbG9hZGVyRXZlbnRzW2ZpbGVJRF0pIHtcbiAgICAgIHRoaXMudXBsb2FkZXJFdmVudHNbZmlsZUlEXS5yZW1vdmUoKVxuICAgICAgdGhpcy51cGxvYWRlckV2ZW50c1tmaWxlSURdID0gbnVsbFxuICAgIH1cbiAgICBpZiAodGhpcy51cGxvYWRlclNvY2tldHNbZmlsZUlEXSkge1xuICAgICAgdGhpcy51cGxvYWRlclNvY2tldHNbZmlsZUlEXS5jbG9zZSgpXG4gICAgICB0aGlzLnVwbG9hZGVyU29ja2V0c1tmaWxlSURdID0gbnVsbFxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgVHVzIHVwbG9hZFxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gZmlsZSBmb3IgdXNlIHdpdGggdXBsb2FkXG4gICAqIEBwYXJhbSB7aW50ZWdlcn0gY3VycmVudCBmaWxlIGluIGEgcXVldWVcbiAgICogQHBhcmFtIHtpbnRlZ2VyfSB0b3RhbCBudW1iZXIgb2YgZmlsZXMgaW4gYSBxdWV1ZVxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICovXG4gIHVwbG9hZCAoZmlsZSwgY3VycmVudCwgdG90YWwpIHtcbiAgICB0aGlzLnJlc2V0VXBsb2FkZXJSZWZlcmVuY2VzKGZpbGUuaWQpXG5cbiAgICAvLyBDcmVhdGUgYSBuZXcgdHVzIHVwbG9hZFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBvcHRzVHVzID0gT2JqZWN0LmFzc2lnbihcbiAgICAgICAge30sXG4gICAgICAgIHR1c0RlZmF1bHRPcHRpb25zLFxuICAgICAgICB0aGlzLm9wdHMsXG4gICAgICAgIC8vIEluc3RhbGwgZmlsZS1zcGVjaWZpYyB1cGxvYWQgb3ZlcnJpZGVzLlxuICAgICAgICBmaWxlLnR1cyB8fCB7fVxuICAgICAgKVxuXG4gICAgICBvcHRzVHVzLm9uRXJyb3IgPSAoZXJyKSA9PiB7XG4gICAgICAgIHRoaXMudXBweS5sb2coZXJyKVxuICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLWVycm9yJywgZmlsZSwgZXJyKVxuICAgICAgICBlcnIubWVzc2FnZSA9IGBGYWlsZWQgYmVjYXVzZTogJHtlcnIubWVzc2FnZX1gXG5cbiAgICAgICAgdGhpcy5yZXNldFVwbG9hZGVyUmVmZXJlbmNlcyhmaWxlLmlkKVxuICAgICAgICByZWplY3QoZXJyKVxuICAgICAgfVxuXG4gICAgICBvcHRzVHVzLm9uUHJvZ3Jlc3MgPSAoYnl0ZXNVcGxvYWRlZCwgYnl0ZXNUb3RhbCkgPT4ge1xuICAgICAgICB0aGlzLm9uUmVjZWl2ZVVwbG9hZFVybChmaWxlLCB1cGxvYWQudXJsKVxuICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLXByb2dyZXNzJywgZmlsZSwge1xuICAgICAgICAgIHVwbG9hZGVyOiB0aGlzLFxuICAgICAgICAgIGJ5dGVzVXBsb2FkZWQ6IGJ5dGVzVXBsb2FkZWQsXG4gICAgICAgICAgYnl0ZXNUb3RhbDogYnl0ZXNUb3RhbFxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICBvcHRzVHVzLm9uU3VjY2VzcyA9ICgpID0+IHtcbiAgICAgICAgdGhpcy51cHB5LmVtaXQoJ3VwbG9hZC1zdWNjZXNzJywgZmlsZSwgdXBsb2FkLCB1cGxvYWQudXJsKVxuXG4gICAgICAgIGlmICh1cGxvYWQudXJsKSB7XG4gICAgICAgICAgdGhpcy51cHB5LmxvZygnRG93bmxvYWQgJyArIHVwbG9hZC5maWxlLm5hbWUgKyAnIGZyb20gJyArIHVwbG9hZC51cmwpXG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJlc2V0VXBsb2FkZXJSZWZlcmVuY2VzKGZpbGUuaWQpXG4gICAgICAgIHJlc29sdmUodXBsb2FkKVxuICAgICAgfVxuICAgICAgb3B0c1R1cy5tZXRhZGF0YSA9IGZpbGUubWV0YVxuXG4gICAgICBjb25zdCB1cGxvYWQgPSBuZXcgdHVzLlVwbG9hZChmaWxlLmRhdGEsIG9wdHNUdXMpXG4gICAgICB0aGlzLnVwbG9hZGVyc1tmaWxlLmlkXSA9IHVwbG9hZFxuICAgICAgdGhpcy51cGxvYWRlckV2ZW50c1tmaWxlLmlkXSA9IGNyZWF0ZUV2ZW50VHJhY2tlcih0aGlzLnVwcHkpXG5cbiAgICAgIHRoaXMub25GaWxlUmVtb3ZlKGZpbGUuaWQsICh0YXJnZXRGaWxlSUQpID0+IHtcbiAgICAgICAgdGhpcy5yZXNldFVwbG9hZGVyUmVmZXJlbmNlcyhmaWxlLmlkKVxuICAgICAgICByZXNvbHZlKGB1cGxvYWQgJHt0YXJnZXRGaWxlSUR9IHdhcyByZW1vdmVkYClcbiAgICAgIH0pXG5cbiAgICAgIHRoaXMub25QYXVzZShmaWxlLmlkLCAoaXNQYXVzZWQpID0+IHtcbiAgICAgICAgaWYgKGlzUGF1c2VkKSB7XG4gICAgICAgICAgdXBsb2FkLmFib3J0KClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB1cGxvYWQuc3RhcnQoKVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICB0aGlzLm9uUGF1c2VBbGwoZmlsZS5pZCwgKCkgPT4ge1xuICAgICAgICB1cGxvYWQuYWJvcnQoKVxuICAgICAgfSlcblxuICAgICAgdGhpcy5vbkNhbmNlbEFsbChmaWxlLmlkLCAoKSA9PiB7XG4gICAgICAgIHRoaXMucmVzZXRVcGxvYWRlclJlZmVyZW5jZXMoZmlsZS5pZClcbiAgICAgIH0pXG5cbiAgICAgIHRoaXMub25SZXN1bWVBbGwoZmlsZS5pZCwgKCkgPT4ge1xuICAgICAgICBpZiAoZmlsZS5lcnJvcikge1xuICAgICAgICAgIHVwbG9hZC5hYm9ydCgpXG4gICAgICAgIH1cbiAgICAgICAgdXBsb2FkLnN0YXJ0KClcbiAgICAgIH0pXG5cbiAgICAgIGlmICghZmlsZS5pc1BhdXNlZCkge1xuICAgICAgICB1cGxvYWQuc3RhcnQoKVxuICAgICAgfVxuICAgICAgaWYgKCFmaWxlLmlzUmVzdG9yZWQpIHtcbiAgICAgICAgdGhpcy51cHB5LmVtaXQoJ3VwbG9hZC1zdGFydGVkJywgZmlsZSwgdXBsb2FkKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICB1cGxvYWRSZW1vdGUgKGZpbGUsIGN1cnJlbnQsIHRvdGFsKSB7XG4gICAgdGhpcy5yZXNldFVwbG9hZGVyUmVmZXJlbmNlcyhmaWxlLmlkKVxuXG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oXG4gICAgICB7fSxcbiAgICAgIHRoaXMub3B0cyxcbiAgICAgIC8vIEluc3RhbGwgZmlsZS1zcGVjaWZpYyB1cGxvYWQgb3ZlcnJpZGVzLlxuICAgICAgZmlsZS50dXMgfHwge31cbiAgICApXG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy51cHB5LmxvZyhmaWxlLnJlbW90ZS51cmwpXG4gICAgICBpZiAoZmlsZS5zZXJ2ZXJUb2tlbikge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25uZWN0VG9TZXJ2ZXJTb2NrZXQoZmlsZSlcbiAgICAgICAgICAudGhlbigoKSA9PiByZXNvbHZlKCkpXG4gICAgICAgICAgLmNhdGNoKHJlamVjdClcbiAgICAgIH1cblxuICAgICAgdGhpcy51cHB5LmVtaXQoJ3VwbG9hZC1zdGFydGVkJywgZmlsZSlcblxuICAgICAgZmV0Y2goZmlsZS5yZW1vdGUudXJsLCB7XG4gICAgICAgIG1ldGhvZDogJ3Bvc3QnLFxuICAgICAgICBjcmVkZW50aWFsczogJ2luY2x1ZGUnLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KE9iamVjdC5hc3NpZ24oe30sIGZpbGUucmVtb3RlLmJvZHksIHtcbiAgICAgICAgICBlbmRwb2ludDogb3B0cy5lbmRwb2ludCxcbiAgICAgICAgICB1cGxvYWRVcmw6IG9wdHMudXBsb2FkVXJsLFxuICAgICAgICAgIHByb3RvY29sOiAndHVzJyxcbiAgICAgICAgICBzaXplOiBmaWxlLmRhdGEuc2l6ZSxcbiAgICAgICAgICBtZXRhZGF0YTogZmlsZS5tZXRhXG4gICAgICAgIH0pKVxuICAgICAgfSlcbiAgICAgIC50aGVuKChyZXMpID0+IHtcbiAgICAgICAgaWYgKHJlcy5zdGF0dXMgPCAyMDAgfHwgcmVzLnN0YXR1cyA+IDMwMCkge1xuICAgICAgICAgIHJldHVybiByZWplY3QocmVzLnN0YXR1c1RleHQpXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzLmpzb24oKS50aGVuKChkYXRhKSA9PiB7XG4gICAgICAgICAgdGhpcy51cHB5LnNldEZpbGVTdGF0ZShmaWxlLmlkLCB7IHNlcnZlclRva2VuOiBkYXRhLnRva2VuIH0pXG4gICAgICAgICAgZmlsZSA9IHRoaXMuZ2V0RmlsZShmaWxlLmlkKVxuICAgICAgICAgIHJldHVybiBmaWxlXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgICAgLnRoZW4oKGZpbGUpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29ubmVjdFRvU2VydmVyU29ja2V0KGZpbGUpXG4gICAgICB9KVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICByZXNvbHZlKClcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICByZWplY3QobmV3IEVycm9yKGVycikpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICBjb25uZWN0VG9TZXJ2ZXJTb2NrZXQgKGZpbGUpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgdG9rZW4gPSBmaWxlLnNlcnZlclRva2VuXG4gICAgICBjb25zdCBob3N0ID0gZ2V0U29ja2V0SG9zdChmaWxlLnJlbW90ZS5ob3N0KVxuICAgICAgY29uc3Qgc29ja2V0ID0gbmV3IFVwcHlTb2NrZXQoeyB0YXJnZXQ6IGAke2hvc3R9L2FwaS8ke3Rva2VufWAgfSlcbiAgICAgIHRoaXMudXBsb2FkZXJTb2NrZXRzW2ZpbGUuaWRdID0gc29ja2V0XG4gICAgICB0aGlzLnVwbG9hZGVyRXZlbnRzW2ZpbGUuaWRdID0gY3JlYXRlRXZlbnRUcmFja2VyKHRoaXMudXBweSlcblxuICAgICAgdGhpcy5vbkZpbGVSZW1vdmUoZmlsZS5pZCwgKCkgPT4ge1xuICAgICAgICBzb2NrZXQuc2VuZCgncGF1c2UnLCB7fSlcbiAgICAgICAgcmVzb2x2ZShgdXBsb2FkICR7ZmlsZS5pZH0gd2FzIHJlbW92ZWRgKVxuICAgICAgfSlcblxuICAgICAgdGhpcy5vblBhdXNlKGZpbGUuaWQsIChpc1BhdXNlZCkgPT4ge1xuICAgICAgICBpc1BhdXNlZCA/IHNvY2tldC5zZW5kKCdwYXVzZScsIHt9KSA6IHNvY2tldC5zZW5kKCdyZXN1bWUnLCB7fSlcbiAgICAgIH0pXG5cbiAgICAgIHRoaXMub25QYXVzZUFsbChmaWxlLmlkLCAoKSA9PiBzb2NrZXQuc2VuZCgncGF1c2UnLCB7fSkpXG5cbiAgICAgIHRoaXMub25DYW5jZWxBbGwoZmlsZS5pZCwgKCkgPT4gc29ja2V0LnNlbmQoJ3BhdXNlJywge30pKVxuXG4gICAgICB0aGlzLm9uUmVzdW1lQWxsKGZpbGUuaWQsICgpID0+IHtcbiAgICAgICAgaWYgKGZpbGUuZXJyb3IpIHtcbiAgICAgICAgICBzb2NrZXQuc2VuZCgncGF1c2UnLCB7fSlcbiAgICAgICAgfVxuICAgICAgICBzb2NrZXQuc2VuZCgncmVzdW1lJywge30pXG4gICAgICB9KVxuXG4gICAgICB0aGlzLm9uUmV0cnkoZmlsZS5pZCwgKCkgPT4ge1xuICAgICAgICBzb2NrZXQuc2VuZCgncGF1c2UnLCB7fSlcbiAgICAgICAgc29ja2V0LnNlbmQoJ3Jlc3VtZScsIHt9KVxuICAgICAgfSlcblxuICAgICAgdGhpcy5vblJldHJ5QWxsKGZpbGUuaWQsICgpID0+IHtcbiAgICAgICAgc29ja2V0LnNlbmQoJ3BhdXNlJywge30pXG4gICAgICAgIHNvY2tldC5zZW5kKCdyZXN1bWUnLCB7fSlcbiAgICAgIH0pXG5cbiAgICAgIGlmIChmaWxlLmlzUGF1c2VkKSB7XG4gICAgICAgIHNvY2tldC5zZW5kKCdwYXVzZScsIHt9KVxuICAgICAgfVxuXG4gICAgICBzb2NrZXQub24oJ3Byb2dyZXNzJywgKHByb2dyZXNzRGF0YSkgPT4gZW1pdFNvY2tldFByb2dyZXNzKHRoaXMsIHByb2dyZXNzRGF0YSwgZmlsZSkpXG5cbiAgICAgIHNvY2tldC5vbignZXJyb3InLCAoZXJyRGF0YSkgPT4ge1xuICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLWVycm9yJywgZmlsZSwgbmV3IEVycm9yKGVyckRhdGEuZXJyb3IpKVxuICAgICAgICByZWplY3QobmV3IEVycm9yKGVyckRhdGEuZXJyb3IpKVxuICAgICAgfSlcblxuICAgICAgc29ja2V0Lm9uKCdzdWNjZXNzJywgKGRhdGEpID0+IHtcbiAgICAgICAgdGhpcy51cHB5LmVtaXQoJ3VwbG9hZC1zdWNjZXNzJywgZmlsZSwgZGF0YSwgZGF0YS51cmwpXG4gICAgICAgIHRoaXMucmVzZXRVcGxvYWRlclJlZmVyZW5jZXMoZmlsZS5pZClcbiAgICAgICAgcmVzb2x2ZSgpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICBnZXRGaWxlIChmaWxlSUQpIHtcbiAgICByZXR1cm4gdGhpcy51cHB5LnN0YXRlLmZpbGVzW2ZpbGVJRF1cbiAgfVxuXG4gIHVwZGF0ZUZpbGUgKGZpbGUpIHtcbiAgICBjb25zdCBmaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMudXBweS5zdGF0ZS5maWxlcywge1xuICAgICAgW2ZpbGUuaWRdOiBmaWxlXG4gICAgfSlcbiAgICB0aGlzLnVwcHkuc2V0U3RhdGUoeyBmaWxlcyB9KVxuICB9XG5cbiAgb25SZWNlaXZlVXBsb2FkVXJsIChmaWxlLCB1cGxvYWRVUkwpIHtcbiAgICBjb25zdCBjdXJyZW50RmlsZSA9IHRoaXMuZ2V0RmlsZShmaWxlLmlkKVxuICAgIGlmICghY3VycmVudEZpbGUpIHJldHVyblxuICAgIC8vIE9ubHkgZG8gdGhlIHVwZGF0ZSBpZiB3ZSBkaWRuJ3QgaGF2ZSBhbiB1cGxvYWQgVVJMIHlldCxcbiAgICAvLyBvciByZXN1bWU6IGZhbHNlIGluIG9wdGlvbnNcbiAgICBpZiAoKCFjdXJyZW50RmlsZS50dXMgfHwgY3VycmVudEZpbGUudHVzLnVwbG9hZFVybCAhPT0gdXBsb2FkVVJMKSAmJiB0aGlzLm9wdHMucmVzdW1lKSB7XG4gICAgICB0aGlzLnVwcHkubG9nKCdbVHVzXSBTdG9yaW5nIHVwbG9hZCB1cmwnKVxuICAgICAgY29uc3QgbmV3RmlsZSA9IE9iamVjdC5hc3NpZ24oe30sIGN1cnJlbnRGaWxlLCB7XG4gICAgICAgIHR1czogT2JqZWN0LmFzc2lnbih7fSwgY3VycmVudEZpbGUudHVzLCB7XG4gICAgICAgICAgdXBsb2FkVXJsOiB1cGxvYWRVUkxcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgICB0aGlzLnVwZGF0ZUZpbGUobmV3RmlsZSlcbiAgICB9XG4gIH1cblxuICBvbkZpbGVSZW1vdmUgKGZpbGVJRCwgY2IpIHtcbiAgICB0aGlzLnVwbG9hZGVyRXZlbnRzW2ZpbGVJRF0ub24oJ2ZpbGUtcmVtb3ZlZCcsIChmaWxlKSA9PiB7XG4gICAgICBpZiAoZmlsZUlEID09PSBmaWxlLmlkKSBjYihmaWxlLmlkKVxuICAgIH0pXG4gIH1cblxuICBvblBhdXNlIChmaWxlSUQsIGNiKSB7XG4gICAgdGhpcy51cGxvYWRlckV2ZW50c1tmaWxlSURdLm9uKCd1cGxvYWQtcGF1c2UnLCAodGFyZ2V0RmlsZUlELCBpc1BhdXNlZCkgPT4ge1xuICAgICAgaWYgKGZpbGVJRCA9PT0gdGFyZ2V0RmlsZUlEKSB7XG4gICAgICAgIC8vIGNvbnN0IGlzUGF1c2VkID0gdGhpcy51cHB5LnBhdXNlUmVzdW1lKGZpbGVJRClcbiAgICAgICAgY2IoaXNQYXVzZWQpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIG9uUmV0cnkgKGZpbGVJRCwgY2IpIHtcbiAgICB0aGlzLnVwbG9hZGVyRXZlbnRzW2ZpbGVJRF0ub24oJ3VwbG9hZC1yZXRyeScsICh0YXJnZXRGaWxlSUQpID0+IHtcbiAgICAgIGlmIChmaWxlSUQgPT09IHRhcmdldEZpbGVJRCkge1xuICAgICAgICBjYigpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIG9uUmV0cnlBbGwgKGZpbGVJRCwgY2IpIHtcbiAgICB0aGlzLnVwbG9hZGVyRXZlbnRzW2ZpbGVJRF0ub24oJ3JldHJ5LWFsbCcsIChmaWxlc1RvUmV0cnkpID0+IHtcbiAgICAgIGlmICghdGhpcy51cHB5LmdldEZpbGUoZmlsZUlEKSkgcmV0dXJuXG4gICAgICBjYigpXG4gICAgfSlcbiAgfVxuXG4gIG9uUGF1c2VBbGwgKGZpbGVJRCwgY2IpIHtcbiAgICB0aGlzLnVwbG9hZGVyRXZlbnRzW2ZpbGVJRF0ub24oJ3BhdXNlLWFsbCcsICgpID0+IHtcbiAgICAgIGlmICghdGhpcy51cHB5LmdldEZpbGUoZmlsZUlEKSkgcmV0dXJuXG4gICAgICBjYigpXG4gICAgfSlcbiAgfVxuXG4gIG9uQ2FuY2VsQWxsIChmaWxlSUQsIGNiKSB7XG4gICAgdGhpcy51cGxvYWRlckV2ZW50c1tmaWxlSURdLm9uKCdjYW5jZWwtYWxsJywgKCkgPT4ge1xuICAgICAgaWYgKCF0aGlzLnVwcHkuZ2V0RmlsZShmaWxlSUQpKSByZXR1cm5cbiAgICAgIGNiKClcbiAgICB9KVxuICB9XG5cbiAgb25SZXN1bWVBbGwgKGZpbGVJRCwgY2IpIHtcbiAgICB0aGlzLnVwbG9hZGVyRXZlbnRzW2ZpbGVJRF0ub24oJ3Jlc3VtZS1hbGwnLCAoKSA9PiB7XG4gICAgICBpZiAoIXRoaXMudXBweS5nZXRGaWxlKGZpbGVJRCkpIHJldHVyblxuICAgICAgY2IoKVxuICAgIH0pXG4gIH1cblxuICB1cGxvYWRGaWxlcyAoZmlsZXMpIHtcbiAgICBjb25zdCBwcm9taXNlcyA9IGZpbGVzLm1hcCgoZmlsZSwgaW5kZXgpID0+IHtcbiAgICAgIGNvbnN0IGN1cnJlbnQgPSBwYXJzZUludChpbmRleCwgMTApICsgMVxuICAgICAgY29uc3QgdG90YWwgPSBmaWxlcy5sZW5ndGhcblxuICAgICAgaWYgKGZpbGUuZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihmaWxlLmVycm9yKSlcbiAgICAgIH1cblxuICAgICAgdGhpcy51cHB5LmxvZyhgdXBsb2FkaW5nICR7Y3VycmVudH0gb2YgJHt0b3RhbH1gKVxuXG4gICAgICBpZiAoZmlsZS5pc1JlbW90ZSkge1xuICAgICAgICByZXR1cm4gdGhpcy51cGxvYWRSZW1vdGUoZmlsZSwgY3VycmVudCwgdG90YWwpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy51cGxvYWQoZmlsZSwgY3VycmVudCwgdG90YWwpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHJldHVybiBzZXR0bGUocHJvbWlzZXMpXG4gIH1cblxuICBoYW5kbGVVcGxvYWQgKGZpbGVJRHMpIHtcbiAgICBpZiAoZmlsZUlEcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRoaXMudXBweS5sb2coJ1R1czogbm8gZmlsZXMgdG8gdXBsb2FkIScpXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgICB9XG5cbiAgICB0aGlzLnVwcHkubG9nKCdUdXMgaXMgdXBsb2FkaW5nLi4uJylcbiAgICBjb25zdCBmaWxlc1RvVXBsb2FkID0gZmlsZUlEcy5tYXAoKGZpbGVJRCkgPT4gdGhpcy51cHB5LmdldEZpbGUoZmlsZUlEKSlcblxuICAgIHJldHVybiB0aGlzLnVwbG9hZEZpbGVzKGZpbGVzVG9VcGxvYWQpXG4gICAgICAudGhlbigoKSA9PiBudWxsKVxuICB9XG5cbiAgYWRkUmVzdW1hYmxlVXBsb2Fkc0NhcGFiaWxpdHlGbGFnICgpIHtcbiAgICBjb25zdCBuZXdDYXBhYmlsaXRpZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLnVwcHkuZ2V0U3RhdGUoKS5jYXBhYmlsaXRpZXMpXG4gICAgbmV3Q2FwYWJpbGl0aWVzLnJlc3VtYWJsZVVwbG9hZHMgPSB0cnVlXG4gICAgdGhpcy51cHB5LnNldFN0YXRlKHtcbiAgICAgIGNhcGFiaWxpdGllczogbmV3Q2FwYWJpbGl0aWVzXG4gICAgfSlcbiAgfVxuXG4gIGluc3RhbGwgKCkge1xuICAgIHRoaXMuYWRkUmVzdW1hYmxlVXBsb2Fkc0NhcGFiaWxpdHlGbGFnKClcbiAgICB0aGlzLnVwcHkuYWRkVXBsb2FkZXIodGhpcy5oYW5kbGVVcGxvYWQpXG5cbiAgICB0aGlzLnVwcHkub24oJ3Jlc2V0LXByb2dyZXNzJywgdGhpcy5oYW5kbGVSZXNldFByb2dyZXNzKVxuXG4gICAgaWYgKHRoaXMub3B0cy5hdXRvUmV0cnkpIHtcbiAgICAgIHRoaXMudXBweS5vbignYmFjay1vbmxpbmUnLCB0aGlzLnVwcHkucmV0cnlBbGwpXG4gICAgfVxuICB9XG5cbiAgdW5pbnN0YWxsICgpIHtcbiAgICB0aGlzLnVwcHkucmVtb3ZlVXBsb2FkZXIodGhpcy5oYW5kbGVVcGxvYWQpXG5cbiAgICBpZiAodGhpcy5vcHRzLmF1dG9SZXRyeSkge1xuICAgICAgdGhpcy51cHB5Lm9mZignYmFjay1vbmxpbmUnLCB0aGlzLnVwcHkucmV0cnlBbGwpXG4gICAgfVxuICB9XG59XG4iLCIvKipcbiAqIERlZmF1bHQgc3RvcmUgdGhhdCBrZWVwcyBzdGF0ZSBpbiBhIHNpbXBsZSBvYmplY3QuXG4gKi9cbmNsYXNzIERlZmF1bHRTdG9yZSB7XG4gIGNvbnN0cnVjdG9yICgpIHtcbiAgICB0aGlzLnN0YXRlID0ge31cbiAgICB0aGlzLmNhbGxiYWNrcyA9IFtdXG4gIH1cblxuICBnZXRTdGF0ZSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVcbiAgfVxuXG4gIHNldFN0YXRlIChwYXRjaCkge1xuICAgIGNvbnN0IHByZXZTdGF0ZSA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuc3RhdGUpXG4gICAgY29uc3QgbmV4dFN0YXRlID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5zdGF0ZSwgcGF0Y2gpXG5cbiAgICB0aGlzLnN0YXRlID0gbmV4dFN0YXRlXG4gICAgdGhpcy5fcHVibGlzaChwcmV2U3RhdGUsIG5leHRTdGF0ZSwgcGF0Y2gpXG4gIH1cblxuICBzdWJzY3JpYmUgKGxpc3RlbmVyKSB7XG4gICAgdGhpcy5jYWxsYmFja3MucHVzaChsaXN0ZW5lcilcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgLy8gUmVtb3ZlIHRoZSBsaXN0ZW5lci5cbiAgICAgIHRoaXMuY2FsbGJhY2tzLnNwbGljZShcbiAgICAgICAgdGhpcy5jYWxsYmFja3MuaW5kZXhPZihsaXN0ZW5lciksXG4gICAgICAgIDFcbiAgICAgIClcbiAgICB9XG4gIH1cblxuICBfcHVibGlzaCAoLi4uYXJncykge1xuICAgIHRoaXMuY2FsbGJhY2tzLmZvckVhY2goKGxpc3RlbmVyKSA9PiB7XG4gICAgICBsaXN0ZW5lciguLi5hcmdzKVxuICAgIH0pXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBkZWZhdWx0U3RvcmUgKCkge1xuICByZXR1cm4gbmV3IERlZmF1bHRTdG9yZSgpXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gaW5wdXQgPT4ge1xuXHRjb25zdCBidWYgPSBuZXcgVWludDhBcnJheShpbnB1dCk7XG5cblx0aWYgKCEoYnVmICYmIGJ1Zi5sZW5ndGggPiAxKSkge1xuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cblx0Y29uc3QgY2hlY2sgPSAoaGVhZGVyLCBvcHRzKSA9PiB7XG5cdFx0b3B0cyA9IE9iamVjdC5hc3NpZ24oe1xuXHRcdFx0b2Zmc2V0OiAwXG5cdFx0fSwgb3B0cyk7XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGhlYWRlci5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKGhlYWRlcltpXSAhPT0gYnVmW2kgKyBvcHRzLm9mZnNldF0pIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXHR9O1xuXG5cdGlmIChjaGVjayhbMHhGRiwgMHhEOCwgMHhGRl0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2pwZycsXG5cdFx0XHRtaW1lOiAnaW1hZ2UvanBlZydcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDg5LCAweDUwLCAweDRFLCAweDQ3LCAweDBELCAweDBBLCAweDFBLCAweDBBXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAncG5nJyxcblx0XHRcdG1pbWU6ICdpbWFnZS9wbmcnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg0NywgMHg0OSwgMHg0Nl0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2dpZicsXG5cdFx0XHRtaW1lOiAnaW1hZ2UvZ2lmJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4NTcsIDB4NDUsIDB4NDIsIDB4NTBdLCB7b2Zmc2V0OiA4fSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnd2VicCcsXG5cdFx0XHRtaW1lOiAnaW1hZ2Uvd2VicCdcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDQ2LCAweDRDLCAweDQ5LCAweDQ2XSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnZmxpZicsXG5cdFx0XHRtaW1lOiAnaW1hZ2UvZmxpZidcblx0XHR9O1xuXHR9XG5cblx0Ly8gTmVlZHMgdG8gYmUgYmVmb3JlIGB0aWZgIGNoZWNrXG5cdGlmIChcblx0XHQoY2hlY2soWzB4NDksIDB4NDksIDB4MkEsIDB4MF0pIHx8IGNoZWNrKFsweDRELCAweDRELCAweDAsIDB4MkFdKSkgJiZcblx0XHRjaGVjayhbMHg0MywgMHg1Ml0sIHtvZmZzZXQ6IDh9KVxuXHQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnY3IyJyxcblx0XHRcdG1pbWU6ICdpbWFnZS94LWNhbm9uLWNyMidcblx0XHR9O1xuXHR9XG5cblx0aWYgKFxuXHRcdGNoZWNrKFsweDQ5LCAweDQ5LCAweDJBLCAweDBdKSB8fFxuXHRcdGNoZWNrKFsweDRELCAweDRELCAweDAsIDB4MkFdKVxuXHQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAndGlmJyxcblx0XHRcdG1pbWU6ICdpbWFnZS90aWZmJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4NDIsIDB4NERdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdibXAnLFxuXHRcdFx0bWltZTogJ2ltYWdlL2JtcCdcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDQ5LCAweDQ5LCAweEJDXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnanhyJyxcblx0XHRcdG1pbWU6ICdpbWFnZS92bmQubXMtcGhvdG8nXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHgzOCwgMHg0MiwgMHg1MCwgMHg1M10pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3BzZCcsXG5cdFx0XHRtaW1lOiAnaW1hZ2Uvdm5kLmFkb2JlLnBob3Rvc2hvcCdcblx0XHR9O1xuXHR9XG5cblx0Ly8gTmVlZHMgdG8gYmUgYmVmb3JlIHRoZSBgemlwYCBjaGVja1xuXHRpZiAoXG5cdFx0Y2hlY2soWzB4NTAsIDB4NEIsIDB4MywgMHg0XSkgJiZcblx0XHRjaGVjayhbMHg2RCwgMHg2OSwgMHg2RCwgMHg2NSwgMHg3NCwgMHg3OSwgMHg3MCwgMHg2NSwgMHg2MSwgMHg3MCwgMHg3MCwgMHg2QywgMHg2OSwgMHg2MywgMHg2MSwgMHg3NCwgMHg2OSwgMHg2RiwgMHg2RSwgMHgyRiwgMHg2NSwgMHg3MCwgMHg3NSwgMHg2MiwgMHgyQiwgMHg3QSwgMHg2OSwgMHg3MF0sIHtvZmZzZXQ6IDMwfSlcblx0KSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2VwdWInLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL2VwdWIremlwJ1xuXHRcdH07XG5cdH1cblxuXHQvLyBOZWVkcyB0byBiZSBiZWZvcmUgYHppcGAgY2hlY2tcblx0Ly8gQXNzdW1lcyBzaWduZWQgYC54cGlgIGZyb20gYWRkb25zLm1vemlsbGEub3JnXG5cdGlmIChcblx0XHRjaGVjayhbMHg1MCwgMHg0QiwgMHgzLCAweDRdKSAmJlxuXHRcdGNoZWNrKFsweDRELCAweDQ1LCAweDU0LCAweDQxLCAweDJELCAweDQ5LCAweDRFLCAweDQ2LCAweDJGLCAweDZELCAweDZGLCAweDdBLCAweDY5LCAweDZDLCAweDZDLCAweDYxLCAweDJFLCAweDcyLCAweDczLCAweDYxXSwge29mZnNldDogMzB9KVxuXHQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAneHBpJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LXhwaW5zdGFsbCdcblx0XHR9O1xuXHR9XG5cblx0aWYgKFxuXHRcdGNoZWNrKFsweDUwLCAweDRCXSkgJiZcblx0XHQoYnVmWzJdID09PSAweDMgfHwgYnVmWzJdID09PSAweDUgfHwgYnVmWzJdID09PSAweDcpICYmXG5cdFx0KGJ1ZlszXSA9PT0gMHg0IHx8IGJ1ZlszXSA9PT0gMHg2IHx8IGJ1ZlszXSA9PT0gMHg4KVxuXHQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnemlwJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi96aXAnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg3NSwgMHg3MywgMHg3NCwgMHg2MSwgMHg3Ml0sIHtvZmZzZXQ6IDI1N30pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3RhcicsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC10YXInXG5cdFx0fTtcblx0fVxuXG5cdGlmIChcblx0XHRjaGVjayhbMHg1MiwgMHg2MSwgMHg3MiwgMHgyMSwgMHgxQSwgMHg3XSkgJiZcblx0XHQoYnVmWzZdID09PSAweDAgfHwgYnVmWzZdID09PSAweDEpXG5cdCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdyYXInLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtcmFyLWNvbXByZXNzZWQnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHgxRiwgMHg4QiwgMHg4XSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnZ3onLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL2d6aXAnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg0MiwgMHg1QSwgMHg2OF0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2J6MicsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1iemlwMidcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDM3LCAweDdBLCAweEJDLCAweEFGLCAweDI3LCAweDFDXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnN3onLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtN3otY29tcHJlc3NlZCdcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDc4LCAweDAxXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnZG1nJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LWFwcGxlLWRpc2tpbWFnZSdcblx0XHR9O1xuXHR9XG5cblx0aWYgKFxuXHRcdChcblx0XHRcdGNoZWNrKFsweDAsIDB4MCwgMHgwXSkgJiZcblx0XHRcdChidWZbM10gPT09IDB4MTggfHwgYnVmWzNdID09PSAweDIwKSAmJlxuXHRcdFx0Y2hlY2soWzB4NjYsIDB4NzQsIDB4NzksIDB4NzBdLCB7b2Zmc2V0OiA0fSlcblx0XHQpIHx8XG5cdFx0Y2hlY2soWzB4MzMsIDB4NjcsIDB4NzAsIDB4MzVdKSB8fFxuXHRcdChcblx0XHRcdGNoZWNrKFsweDAsIDB4MCwgMHgwLCAweDFDLCAweDY2LCAweDc0LCAweDc5LCAweDcwLCAweDZELCAweDcwLCAweDM0LCAweDMyXSkgJiZcblx0XHRcdGNoZWNrKFsweDZELCAweDcwLCAweDM0LCAweDMxLCAweDZELCAweDcwLCAweDM0LCAweDMyLCAweDY5LCAweDczLCAweDZGLCAweDZEXSwge29mZnNldDogMTZ9KVxuXHRcdCkgfHxcblx0XHRjaGVjayhbMHgwLCAweDAsIDB4MCwgMHgxQywgMHg2NiwgMHg3NCwgMHg3OSwgMHg3MCwgMHg2OSwgMHg3MywgMHg2RiwgMHg2RF0pIHx8XG5cdFx0Y2hlY2soWzB4MCwgMHgwLCAweDAsIDB4MUMsIDB4NjYsIDB4NzQsIDB4NzksIDB4NzAsIDB4NkQsIDB4NzAsIDB4MzQsIDB4MzIsIDB4MCwgMHgwLCAweDAsIDB4MF0pXG5cdCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdtcDQnLFxuXHRcdFx0bWltZTogJ3ZpZGVvL21wNCdcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDAsIDB4MCwgMHgwLCAweDFDLCAweDY2LCAweDc0LCAweDc5LCAweDcwLCAweDRELCAweDM0LCAweDU2XSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnbTR2Jyxcblx0XHRcdG1pbWU6ICd2aWRlby94LW00didcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDRELCAweDU0LCAweDY4LCAweDY0XSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnbWlkJyxcblx0XHRcdG1pbWU6ICdhdWRpby9taWRpJ1xuXHRcdH07XG5cdH1cblxuXHQvLyBodHRwczovL2dpdGh1Yi5jb20vdGhyZWF0c3RhY2svbGlibWFnaWMvYmxvYi9tYXN0ZXIvbWFnaWMvTWFnZGlyL21hdHJvc2thXG5cdGlmIChjaGVjayhbMHgxQSwgMHg0NSwgMHhERiwgMHhBM10pKSB7XG5cdFx0Y29uc3Qgc2xpY2VkID0gYnVmLnN1YmFycmF5KDQsIDQgKyA0MDk2KTtcblx0XHRjb25zdCBpZFBvcyA9IHNsaWNlZC5maW5kSW5kZXgoKGVsLCBpLCBhcnIpID0+IGFycltpXSA9PT0gMHg0MiAmJiBhcnJbaSArIDFdID09PSAweDgyKTtcblxuXHRcdGlmIChpZFBvcyA+PSAwKSB7XG5cdFx0XHRjb25zdCBkb2NUeXBlUG9zID0gaWRQb3MgKyAzO1xuXHRcdFx0Y29uc3QgZmluZERvY1R5cGUgPSB0eXBlID0+IEFycmF5LmZyb20odHlwZSkuZXZlcnkoKGMsIGkpID0+IHNsaWNlZFtkb2NUeXBlUG9zICsgaV0gPT09IGMuY2hhckNvZGVBdCgwKSk7XG5cblx0XHRcdGlmIChmaW5kRG9jVHlwZSgnbWF0cm9za2EnKSkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGV4dDogJ21rdicsXG5cdFx0XHRcdFx0bWltZTogJ3ZpZGVvL3gtbWF0cm9za2EnXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cblx0XHRcdGlmIChmaW5kRG9jVHlwZSgnd2VibScpKSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0ZXh0OiAnd2VibScsXG5cdFx0XHRcdFx0bWltZTogJ3ZpZGVvL3dlYm0nXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aWYgKGNoZWNrKFsweDAsIDB4MCwgMHgwLCAweDE0LCAweDY2LCAweDc0LCAweDc5LCAweDcwLCAweDcxLCAweDc0LCAweDIwLCAweDIwXSkgfHxcblx0XHRjaGVjayhbMHg2NiwgMHg3MiwgMHg2NSwgMHg2NV0sIHtvZmZzZXQ6IDR9KSB8fFxuXHRcdGNoZWNrKFsweDY2LCAweDc0LCAweDc5LCAweDcwLCAweDcxLCAweDc0LCAweDIwLCAweDIwXSwge29mZnNldDogNH0pIHx8XG5cdFx0Y2hlY2soWzB4NkQsIDB4NjQsIDB4NjEsIDB4NzRdLCB7b2Zmc2V0OiA0fSkgfHwgLy8gTUpQRUdcblx0XHRjaGVjayhbMHg3NywgMHg2OSwgMHg2NCwgMHg2NV0sIHtvZmZzZXQ6IDR9KSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdtb3YnLFxuXHRcdFx0bWltZTogJ3ZpZGVvL3F1aWNrdGltZSdcblx0XHR9O1xuXHR9XG5cblx0aWYgKFxuXHRcdGNoZWNrKFsweDUyLCAweDQ5LCAweDQ2LCAweDQ2XSkgJiZcblx0XHRjaGVjayhbMHg0MSwgMHg1NiwgMHg0OV0sIHtvZmZzZXQ6IDh9KVxuXHQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnYXZpJyxcblx0XHRcdG1pbWU6ICd2aWRlby94LW1zdmlkZW8nXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHgzMCwgMHgyNiwgMHhCMiwgMHg3NSwgMHg4RSwgMHg2NiwgMHhDRiwgMHgxMSwgMHhBNiwgMHhEOV0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3dtdicsXG5cdFx0XHRtaW1lOiAndmlkZW8veC1tcy13bXYnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHgwLCAweDAsIDB4MSwgMHhCQV0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ21wZycsXG5cdFx0XHRtaW1lOiAndmlkZW8vbXBlZydcblx0XHR9O1xuXHR9XG5cblx0aWYgKFxuXHRcdGNoZWNrKFsweDQ5LCAweDQ0LCAweDMzXSkgfHxcblx0XHRjaGVjayhbMHhGRiwgMHhGQl0pXG5cdCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdtcDMnLFxuXHRcdFx0bWltZTogJ2F1ZGlvL21wZWcnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChcblx0XHRjaGVjayhbMHg2NiwgMHg3NCwgMHg3OSwgMHg3MCwgMHg0RCwgMHgzNCwgMHg0MV0sIHtvZmZzZXQ6IDR9KSB8fFxuXHRcdGNoZWNrKFsweDRELCAweDM0LCAweDQxLCAweDIwXSlcblx0KSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ200YScsXG5cdFx0XHRtaW1lOiAnYXVkaW8vbTRhJ1xuXHRcdH07XG5cdH1cblxuXHQvLyBOZWVkcyB0byBiZSBiZWZvcmUgYG9nZ2AgY2hlY2tcblx0aWYgKGNoZWNrKFsweDRGLCAweDcwLCAweDc1LCAweDczLCAweDQ4LCAweDY1LCAweDYxLCAweDY0XSwge29mZnNldDogMjh9KSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdvcHVzJyxcblx0XHRcdG1pbWU6ICdhdWRpby9vcHVzJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4NEYsIDB4NjcsIDB4NjcsIDB4NTNdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdvZ2cnLFxuXHRcdFx0bWltZTogJ2F1ZGlvL29nZydcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDY2LCAweDRDLCAweDYxLCAweDQzXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnZmxhYycsXG5cdFx0XHRtaW1lOiAnYXVkaW8veC1mbGFjJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoXG5cdFx0Y2hlY2soWzB4NTIsIDB4NDksIDB4NDYsIDB4NDZdKSAmJlxuXHRcdGNoZWNrKFsweDU3LCAweDQxLCAweDU2LCAweDQ1XSwge29mZnNldDogOH0pXG5cdCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICd3YXYnLFxuXHRcdFx0bWltZTogJ2F1ZGlvL3gtd2F2J1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4MjMsIDB4MjEsIDB4NDEsIDB4NEQsIDB4NTIsIDB4MEFdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdhbXInLFxuXHRcdFx0bWltZTogJ2F1ZGlvL2Ftcidcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDI1LCAweDUwLCAweDQ0LCAweDQ2XSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAncGRmJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi9wZGYnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg0RCwgMHg1QV0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2V4ZScsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1tc2Rvd25sb2FkJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoXG5cdFx0KGJ1ZlswXSA9PT0gMHg0MyB8fCBidWZbMF0gPT09IDB4NDYpICYmXG5cdFx0Y2hlY2soWzB4NTcsIDB4NTNdLCB7b2Zmc2V0OiAxfSlcblx0KSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3N3ZicsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1zaG9ja3dhdmUtZmxhc2gnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg3QiwgMHg1QywgMHg3MiwgMHg3NCwgMHg2Nl0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3J0ZicsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24vcnRmJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4MDAsIDB4NjEsIDB4NzMsIDB4NkRdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICd3YXNtJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi93YXNtJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoXG5cdFx0Y2hlY2soWzB4NzcsIDB4NEYsIDB4NDYsIDB4NDZdKSAmJlxuXHRcdChcblx0XHRcdGNoZWNrKFsweDAwLCAweDAxLCAweDAwLCAweDAwXSwge29mZnNldDogNH0pIHx8XG5cdFx0XHRjaGVjayhbMHg0RiwgMHg1NCwgMHg1NCwgMHg0Rl0sIHtvZmZzZXQ6IDR9KVxuXHRcdClcblx0KSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3dvZmYnLFxuXHRcdFx0bWltZTogJ2ZvbnQvd29mZidcblx0XHR9O1xuXHR9XG5cblx0aWYgKFxuXHRcdGNoZWNrKFsweDc3LCAweDRGLCAweDQ2LCAweDMyXSkgJiZcblx0XHQoXG5cdFx0XHRjaGVjayhbMHgwMCwgMHgwMSwgMHgwMCwgMHgwMF0sIHtvZmZzZXQ6IDR9KSB8fFxuXHRcdFx0Y2hlY2soWzB4NEYsIDB4NTQsIDB4NTQsIDB4NEZdLCB7b2Zmc2V0OiA0fSlcblx0XHQpXG5cdCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICd3b2ZmMicsXG5cdFx0XHRtaW1lOiAnZm9udC93b2ZmMidcblx0XHR9O1xuXHR9XG5cblx0aWYgKFxuXHRcdGNoZWNrKFsweDRDLCAweDUwXSwge29mZnNldDogMzR9KSAmJlxuXHRcdChcblx0XHRcdGNoZWNrKFsweDAwLCAweDAwLCAweDAxXSwge29mZnNldDogOH0pIHx8XG5cdFx0XHRjaGVjayhbMHgwMSwgMHgwMCwgMHgwMl0sIHtvZmZzZXQ6IDh9KSB8fFxuXHRcdFx0Y2hlY2soWzB4MDIsIDB4MDAsIDB4MDJdLCB7b2Zmc2V0OiA4fSlcblx0XHQpXG5cdCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdlb3QnLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSdcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDAwLCAweDAxLCAweDAwLCAweDAwLCAweDAwXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAndHRmJyxcblx0XHRcdG1pbWU6ICdmb250L3R0Zidcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDRGLCAweDU0LCAweDU0LCAweDRGLCAweDAwXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnb3RmJyxcblx0XHRcdG1pbWU6ICdmb250L290Zidcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDAwLCAweDAwLCAweDAxLCAweDAwXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnaWNvJyxcblx0XHRcdG1pbWU6ICdpbWFnZS94LWljb24nXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg0NiwgMHg0QywgMHg1NiwgMHgwMV0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2ZsdicsXG5cdFx0XHRtaW1lOiAndmlkZW8veC1mbHYnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHgyNSwgMHgyMV0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3BzJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi9wb3N0c2NyaXB0J1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4RkQsIDB4MzcsIDB4N0EsIDB4NTgsIDB4NUEsIDB4MDBdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICd4eicsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC14eidcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDUzLCAweDUxLCAweDRDLCAweDY5XSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnc3FsaXRlJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LXNxbGl0ZTMnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg0RSwgMHg0NSwgMHg1MywgMHgxQV0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ25lcycsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1uaW50ZW5kby1uZXMtcm9tJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4NDMsIDB4NzIsIDB4MzIsIDB4MzRdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdjcngnLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtZ29vZ2xlLWNocm9tZS1leHRlbnNpb24nXG5cdFx0fTtcblx0fVxuXG5cdGlmIChcblx0XHRjaGVjayhbMHg0RCwgMHg1MywgMHg0MywgMHg0Nl0pIHx8XG5cdFx0Y2hlY2soWzB4NDksIDB4NTMsIDB4NjMsIDB4MjhdKVxuXHQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnY2FiJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi92bmQubXMtY2FiLWNvbXByZXNzZWQnXG5cdFx0fTtcblx0fVxuXG5cdC8vIE5lZWRzIHRvIGJlIGJlZm9yZSBgYXJgIGNoZWNrXG5cdGlmIChjaGVjayhbMHgyMSwgMHgzQywgMHg2MSwgMHg3MiwgMHg2MywgMHg2OCwgMHgzRSwgMHgwQSwgMHg2NCwgMHg2NSwgMHg2MiwgMHg2OSwgMHg2MSwgMHg2RSwgMHgyRCwgMHg2MiwgMHg2OSwgMHg2RSwgMHg2MSwgMHg3MiwgMHg3OV0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2RlYicsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1kZWInXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHgyMSwgMHgzQywgMHg2MSwgMHg3MiwgMHg2MywgMHg2OCwgMHgzRV0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2FyJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LXVuaXgtYXJjaGl2ZSdcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweEVELCAweEFCLCAweEVFLCAweERCXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAncnBtJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LXJwbSdcblx0XHR9O1xuXHR9XG5cblx0aWYgKFxuXHRcdGNoZWNrKFsweDFGLCAweEEwXSkgfHxcblx0XHRjaGVjayhbMHgxRiwgMHg5RF0pXG5cdCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdaJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LWNvbXByZXNzJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4NEMsIDB4NUEsIDB4NDksIDB4NTBdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdseicsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1semlwJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4RDAsIDB4Q0YsIDB4MTEsIDB4RTAsIDB4QTEsIDB4QjEsIDB4MUEsIDB4RTFdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdtc2knLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtbXNpJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4MDYsIDB4MEUsIDB4MkIsIDB4MzQsIDB4MDIsIDB4MDUsIDB4MDEsIDB4MDEsIDB4MEQsIDB4MDEsIDB4MDIsIDB4MDEsIDB4MDEsIDB4MDJdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdteGYnLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL214Zidcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDQ3XSwge29mZnNldDogNH0pICYmIChjaGVjayhbMHg0N10sIHtvZmZzZXQ6IDE5Mn0pIHx8IGNoZWNrKFsweDQ3XSwge29mZnNldDogMTk2fSkpKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ210cycsXG5cdFx0XHRtaW1lOiAndmlkZW8vbXAydCdcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDQyLCAweDRDLCAweDQ1LCAweDRFLCAweDQ0LCAweDQ1LCAweDUyXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnYmxlbmQnLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtYmxlbmRlcidcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDQyLCAweDUwLCAweDQ3LCAweEZCXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnYnBnJyxcblx0XHRcdG1pbWU6ICdpbWFnZS9icGcnXG5cdFx0fTtcblx0fVxuXG5cdHJldHVybiBudWxsO1xufTsiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBub29wO1xuXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiY29uc3QgVXBweSA9IHJlcXVpcmUoJ3VwcHkvbGliL2NvcmUvQ29yZScpXG5jb25zdCBGaWxlSW5wdXQgPSByZXF1aXJlKCd1cHB5L2xpYi9wbHVnaW5zL0ZpbGVJbnB1dCcpXG5jb25zdCBTdGF0dXNCYXIgPSByZXF1aXJlKCd1cHB5L2xpYi9wbHVnaW5zL1N0YXR1c0JhcicpXG5jb25zdCBUdXMgPSByZXF1aXJlKCd1cHB5L2xpYi9wbHVnaW5zL1R1cycpXG5cbmNvbnN0IHVwcHlPbmUgPSBuZXcgVXBweSh7ZGVidWc6IHRydWV9KVxudXBweU9uZVxuICAudXNlKEZpbGVJbnB1dCwgeyB0YXJnZXQ6ICcuVXBweUlucHV0JywgcHJldHR5OiBmYWxzZSB9KVxuICAudXNlKFR1cywgeyBlbmRwb2ludDogJy8vbWFzdGVyLnR1cy5pby9maWxlcy8nIH0pXG4gIC51c2UoU3RhdHVzQmFyLCB7IHRhcmdldDogJy5VcHB5SW5wdXQtUHJvZ3Jlc3MnLCBoaWRlVXBsb2FkQnV0dG9uOiB0cnVlIH0pXG4gIC5ydW4oKVxuIl19
