module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1689135067503, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.protocol = exports.Transport = exports.Socket = exports.uServer = exports.parser = exports.attach = exports.listen = exports.transports = exports.Server = void 0;
const http_1 = require("http");
const server_1 = require("./server");
Object.defineProperty(exports, "Server", { enumerable: true, get: function () { return server_1.Server; } });
const index_1 = require("./transports/index");
exports.transports = index_1.default;
const parser = require("engine.io-parser");
exports.parser = parser;
var userver_1 = require("./userver");
Object.defineProperty(exports, "uServer", { enumerable: true, get: function () { return userver_1.uServer; } });
var socket_1 = require("./socket");
Object.defineProperty(exports, "Socket", { enumerable: true, get: function () { return socket_1.Socket; } });
var transport_1 = require("./transport");
Object.defineProperty(exports, "Transport", { enumerable: true, get: function () { return transport_1.Transport; } });
exports.protocol = parser.protocol;
/**
 * Creates an http.Server exclusively used for WS upgrades.
 *
 * @param {Number} port
 * @param {Function} callback
 * @param {Object} options
 * @return {Server} websocket.io server
 * @api public
 */
function listen(port, options, fn) {
    if ("function" === typeof options) {
        fn = options;
        options = {};
    }
    const server = (0, http_1.createServer)(function (req, res) {
        res.writeHead(501);
        res.end("Not Implemented");
    });
    // create engine server
    const engine = attach(server, options);
    engine.httpServer = server;
    server.listen(port, fn);
    return engine;
}
exports.listen = listen;
/**
 * Captures upgrade requests for a http.Server.
 *
 * @param {http.Server} server
 * @param {Object} options
 * @return {Server} engine server
 * @api public
 */
function attach(server, options) {
    const engine = new server_1.Server(options);
    engine.attach(server, options);
    return engine;
}
exports.attach = attach;

}, function(modId) {var map = {"./server":1689135067504,"./transports/index":1689135067505,"./userver":1689135067514,"./socket":1689135067513,"./transport":1689135067507}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1689135067504, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = exports.BaseServer = void 0;
const qs = require("querystring");
const url_1 = require("url");
const base64id = require("base64id");
const transports_1 = require("./transports");
const events_1 = require("events");
const socket_1 = require("./socket");
const debug_1 = require("debug");
const cookie_1 = require("cookie");
const ws_1 = require("ws");
const webtransport_1 = require("./transports/webtransport");
const util_1 = require("util");
const debug = (0, debug_1.default)("engine");
const kResponseHeaders = Symbol("responseHeaders");
const TEXT_DECODER = new util_1.TextDecoder();
function parseSessionId(handshake) {
    if (handshake.startsWith("0{")) {
        try {
            const parsed = JSON.parse(handshake.substring(1));
            if (typeof parsed.sid === "string") {
                return parsed.sid;
            }
        }
        catch (e) { }
    }
}
class BaseServer extends events_1.EventEmitter {
    /**
     * Server constructor.
     *
     * @param {Object} opts - options
     * @api public
     */
    constructor(opts = {}) {
        super();
        this.middlewares = [];
        this.clients = {};
        this.clientsCount = 0;
        this.opts = Object.assign({
            wsEngine: ws_1.Server,
            pingTimeout: 20000,
            pingInterval: 25000,
            upgradeTimeout: 10000,
            maxHttpBufferSize: 1e6,
            transports: ["polling", "websocket"],
            allowUpgrades: true,
            httpCompression: {
                threshold: 1024,
            },
            cors: false,
            allowEIO3: false,
        }, opts);
        if (opts.cookie) {
            this.opts.cookie = Object.assign({
                name: "io",
                path: "/",
                // @ts-ignore
                httpOnly: opts.cookie.path !== false,
                sameSite: "lax",
            }, opts.cookie);
        }
        if (this.opts.cors) {
            this.use(require("cors")(this.opts.cors));
        }
        if (opts.perMessageDeflate) {
            this.opts.perMessageDeflate = Object.assign({
                threshold: 1024,
            }, opts.perMessageDeflate);
        }
        this.init();
    }
    /**
     * Compute the pathname of the requests that are handled by the server
     * @param options
     * @protected
     */
    _computePath(options) {
        let path = (options.path || "/engine.io").replace(/\/$/, "");
        if (options.addTrailingSlash !== false) {
            // normalize path
            path += "/";
        }
        return path;
    }
    /**
     * Returns a list of available transports for upgrade given a certain transport.
     *
     * @return {Array}
     * @api public
     */
    upgrades(transport) {
        if (!this.opts.allowUpgrades)
            return [];
        return transports_1.default[transport].upgradesTo || [];
    }
    /**
     * Verifies a request.
     *
     * @param {http.IncomingMessage}
     * @return {Boolean} whether the request is valid
     * @api private
     */
    verify(req, upgrade, fn) {
        // transport check
        const transport = req._query.transport;
        // WebTransport does not go through the verify() method, see the onWebTransportSession() method
        if (!~this.opts.transports.indexOf(transport) ||
            transport === "webtransport") {
            debug('unknown transport "%s"', transport);
            return fn(Server.errors.UNKNOWN_TRANSPORT, { transport });
        }
        // 'Origin' header check
        const isOriginInvalid = checkInvalidHeaderChar(req.headers.origin);
        if (isOriginInvalid) {
            const origin = req.headers.origin;
            req.headers.origin = null;
            debug("origin header invalid");
            return fn(Server.errors.BAD_REQUEST, {
                name: "INVALID_ORIGIN",
                origin,
            });
        }
        // sid check
        const sid = req._query.sid;
        if (sid) {
            if (!this.clients.hasOwnProperty(sid)) {
                debug('unknown sid "%s"', sid);
                return fn(Server.errors.UNKNOWN_SID, {
                    sid,
                });
            }
            const previousTransport = this.clients[sid].transport.name;
            if (!upgrade && previousTransport !== transport) {
                debug("bad request: unexpected transport without upgrade");
                return fn(Server.errors.BAD_REQUEST, {
                    name: "TRANSPORT_MISMATCH",
                    transport,
                    previousTransport,
                });
            }
        }
        else {
            // handshake is GET only
            if ("GET" !== req.method) {
                return fn(Server.errors.BAD_HANDSHAKE_METHOD, {
                    method: req.method,
                });
            }
            if (transport === "websocket" && !upgrade) {
                debug("invalid transport upgrade");
                return fn(Server.errors.BAD_REQUEST, {
                    name: "TRANSPORT_HANDSHAKE_ERROR",
                });
            }
            if (!this.opts.allowRequest)
                return fn();
            return this.opts.allowRequest(req, (message, success) => {
                if (!success) {
                    return fn(Server.errors.FORBIDDEN, {
                        message,
                    });
                }
                fn();
            });
        }
        fn();
    }
    /**
     * Adds a new middleware.
     *
     * @example
     * import helmet from "helmet";
     *
     * engine.use(helmet());
     *
     * @param fn
     */
    use(fn) {
        this.middlewares.push(fn);
    }
    /**
     * Apply the middlewares to the request.
     *
     * @param req
     * @param res
     * @param callback
     * @protected
     */
    _applyMiddlewares(req, res, callback) {
        if (this.middlewares.length === 0) {
            debug("no middleware to apply, skipping");
            return callback();
        }
        const apply = (i) => {
            debug("applying middleware n°%d", i + 1);
            this.middlewares[i](req, res, (err) => {
                if (err) {
                    return callback(err);
                }
                if (i + 1 < this.middlewares.length) {
                    apply(i + 1);
                }
                else {
                    callback();
                }
            });
        };
        apply(0);
    }
    /**
     * Closes all clients.
     *
     * @api public
     */
    close() {
        debug("closing all open clients");
        for (let i in this.clients) {
            if (this.clients.hasOwnProperty(i)) {
                this.clients[i].close(true);
            }
        }
        this.cleanup();
        return this;
    }
    /**
     * generate a socket id.
     * Overwrite this method to generate your custom socket id
     *
     * @param {Object} request object
     * @api public
     */
    generateId(req) {
        return base64id.generateId();
    }
    /**
     * Handshakes a new client.
     *
     * @param {String} transport name
     * @param {Object} request object
     * @param {Function} closeConnection
     *
     * @api protected
     */
    async handshake(transportName, req, closeConnection) {
        const protocol = req._query.EIO === "4" ? 4 : 3; // 3rd revision by default
        if (protocol === 3 && !this.opts.allowEIO3) {
            debug("unsupported protocol version");
            this.emit("connection_error", {
                req,
                code: Server.errors.UNSUPPORTED_PROTOCOL_VERSION,
                message: Server.errorMessages[Server.errors.UNSUPPORTED_PROTOCOL_VERSION],
                context: {
                    protocol,
                },
            });
            closeConnection(Server.errors.UNSUPPORTED_PROTOCOL_VERSION);
            return;
        }
        let id;
        try {
            id = await this.generateId(req);
        }
        catch (e) {
            debug("error while generating an id");
            this.emit("connection_error", {
                req,
                code: Server.errors.BAD_REQUEST,
                message: Server.errorMessages[Server.errors.BAD_REQUEST],
                context: {
                    name: "ID_GENERATION_ERROR",
                    error: e,
                },
            });
            closeConnection(Server.errors.BAD_REQUEST);
            return;
        }
        debug('handshaking client "%s"', id);
        try {
            var transport = this.createTransport(transportName, req);
            if ("polling" === transportName) {
                transport.maxHttpBufferSize = this.opts.maxHttpBufferSize;
                transport.httpCompression = this.opts.httpCompression;
            }
            else if ("websocket" === transportName) {
                transport.perMessageDeflate = this.opts.perMessageDeflate;
            }
            if (req._query && req._query.b64) {
                transport.supportsBinary = false;
            }
            else {
                transport.supportsBinary = true;
            }
        }
        catch (e) {
            debug('error handshaking to transport "%s"', transportName);
            this.emit("connection_error", {
                req,
                code: Server.errors.BAD_REQUEST,
                message: Server.errorMessages[Server.errors.BAD_REQUEST],
                context: {
                    name: "TRANSPORT_HANDSHAKE_ERROR",
                    error: e,
                },
            });
            closeConnection(Server.errors.BAD_REQUEST);
            return;
        }
        const socket = new socket_1.Socket(id, this, transport, req, protocol);
        transport.on("headers", (headers, req) => {
            const isInitialRequest = !req._query.sid;
            if (isInitialRequest) {
                if (this.opts.cookie) {
                    headers["Set-Cookie"] = [
                        // @ts-ignore
                        (0, cookie_1.serialize)(this.opts.cookie.name, id, this.opts.cookie),
                    ];
                }
                this.emit("initial_headers", headers, req);
            }
            this.emit("headers", headers, req);
        });
        transport.onRequest(req);
        this.clients[id] = socket;
        this.clientsCount++;
        socket.once("close", () => {
            delete this.clients[id];
            this.clientsCount--;
        });
        this.emit("connection", socket);
        return transport;
    }
    async onWebTransportSession(session) {
        const timeout = setTimeout(() => {
            debug("the client failed to establish a bidirectional stream in the given period");
            session.close();
        }, this.opts.upgradeTimeout);
        const streamReader = session.incomingBidirectionalStreams.getReader();
        const result = await streamReader.read();
        if (result.done) {
            debug("session is closed");
            return;
        }
        const stream = result.value;
        const reader = stream.readable.getReader();
        // reading the first packet of the stream
        const { value, done } = await reader.read();
        if (done) {
            debug("stream is closed");
            return;
        }
        clearTimeout(timeout);
        const handshake = TEXT_DECODER.decode(value);
        // handshake is either
        // "0" => new session
        // '0{"sid":"xxxx"}' => upgrade
        if (handshake === "0") {
            const transport = new webtransport_1.WebTransport(session, stream, reader);
            // note: we cannot use "this.generateId()", because there is no "req" argument
            const id = base64id.generateId();
            debug('handshaking client "%s" (WebTransport)', id);
            const socket = new socket_1.Socket(id, this, transport, null, 4);
            this.clients[id] = socket;
            this.clientsCount++;
            socket.once("close", () => {
                delete this.clients[id];
                this.clientsCount--;
            });
            this.emit("connection", socket);
            return;
        }
        const sid = parseSessionId(handshake);
        if (!sid) {
            debug("invalid WebTransport handshake");
            return session.close();
        }
        const client = this.clients[sid];
        if (!client) {
            debug("upgrade attempt for closed client");
            session.close();
        }
        else if (client.upgrading) {
            debug("transport has already been trying to upgrade");
            session.close();
        }
        else if (client.upgraded) {
            debug("transport had already been upgraded");
            session.close();
        }
        else {
            debug("upgrading existing transport");
            const transport = new webtransport_1.WebTransport(session, stream, reader);
            client.maybeUpgrade(transport);
        }
    }
}
exports.BaseServer = BaseServer;
/**
 * Protocol errors mappings.
 */
BaseServer.errors = {
    UNKNOWN_TRANSPORT: 0,
    UNKNOWN_SID: 1,
    BAD_HANDSHAKE_METHOD: 2,
    BAD_REQUEST: 3,
    FORBIDDEN: 4,
    UNSUPPORTED_PROTOCOL_VERSION: 5,
};
BaseServer.errorMessages = {
    0: "Transport unknown",
    1: "Session ID unknown",
    2: "Bad handshake method",
    3: "Bad request",
    4: "Forbidden",
    5: "Unsupported protocol version",
};
/**
 * Exposes a subset of the http.ServerResponse interface, in order to be able to apply the middlewares to an upgrade
 * request.
 *
 * @see https://nodejs.org/api/http.html#class-httpserverresponse
 */
class WebSocketResponse {
    constructor(req, socket) {
        this.req = req;
        this.socket = socket;
        // temporarily store the response headers on the req object (see the "headers" event)
        req[kResponseHeaders] = {};
    }
    setHeader(name, value) {
        this.req[kResponseHeaders][name] = value;
    }
    getHeader(name) {
        return this.req[kResponseHeaders][name];
    }
    removeHeader(name) {
        delete this.req[kResponseHeaders][name];
    }
    write() { }
    writeHead() { }
    end() {
        // we could return a proper error code, but the WebSocket client will emit an "error" event anyway.
        this.socket.destroy();
    }
}
class Server extends BaseServer {
    /**
     * Initialize websocket server
     *
     * @api protected
     */
    init() {
        if (!~this.opts.transports.indexOf("websocket"))
            return;
        if (this.ws)
            this.ws.close();
        this.ws = new this.opts.wsEngine({
            noServer: true,
            clientTracking: false,
            perMessageDeflate: this.opts.perMessageDeflate,
            maxPayload: this.opts.maxHttpBufferSize,
        });
        if (typeof this.ws.on === "function") {
            this.ws.on("headers", (headersArray, req) => {
                // note: 'ws' uses an array of headers, while Engine.IO uses an object (response.writeHead() accepts both formats)
                // we could also try to parse the array and then sync the values, but that will be error-prone
                const additionalHeaders = req[kResponseHeaders] || {};
                delete req[kResponseHeaders];
                const isInitialRequest = !req._query.sid;
                if (isInitialRequest) {
                    this.emit("initial_headers", additionalHeaders, req);
                }
                this.emit("headers", additionalHeaders, req);
                debug("writing headers: %j", additionalHeaders);
                Object.keys(additionalHeaders).forEach((key) => {
                    headersArray.push(`${key}: ${additionalHeaders[key]}`);
                });
            });
        }
    }
    cleanup() {
        if (this.ws) {
            debug("closing webSocketServer");
            this.ws.close();
            // don't delete this.ws because it can be used again if the http server starts listening again
        }
    }
    /**
     * Prepares a request by processing the query string.
     *
     * @api private
     */
    prepare(req) {
        // try to leverage pre-existing `req._query` (e.g: from connect)
        if (!req._query) {
            req._query = ~req.url.indexOf("?") ? qs.parse((0, url_1.parse)(req.url).query) : {};
        }
    }
    createTransport(transportName, req) {
        return new transports_1.default[transportName](req);
    }
    /**
     * Handles an Engine.IO HTTP request.
     *
     * @param {IncomingMessage} req
     * @param {ServerResponse} res
     * @api public
     */
    handleRequest(req, res) {
        debug('handling "%s" http request "%s"', req.method, req.url);
        this.prepare(req);
        // @ts-ignore
        req.res = res;
        const callback = (errorCode, errorContext) => {
            if (errorCode !== undefined) {
                this.emit("connection_error", {
                    req,
                    code: errorCode,
                    message: Server.errorMessages[errorCode],
                    context: errorContext,
                });
                abortRequest(res, errorCode, errorContext);
                return;
            }
            // @ts-ignore
            if (req._query.sid) {
                debug("setting new request for existing client");
                // @ts-ignore
                this.clients[req._query.sid].transport.onRequest(req);
            }
            else {
                const closeConnection = (errorCode, errorContext) => abortRequest(res, errorCode, errorContext);
                // @ts-ignore
                this.handshake(req._query.transport, req, closeConnection);
            }
        };
        this._applyMiddlewares(req, res, (err) => {
            if (err) {
                callback(Server.errors.BAD_REQUEST, { name: "MIDDLEWARE_FAILURE" });
            }
            else {
                this.verify(req, false, callback);
            }
        });
    }
    /**
     * Handles an Engine.IO HTTP Upgrade.
     *
     * @api public
     */
    handleUpgrade(req, socket, upgradeHead) {
        this.prepare(req);
        const res = new WebSocketResponse(req, socket);
        const callback = (errorCode, errorContext) => {
            if (errorCode !== undefined) {
                this.emit("connection_error", {
                    req,
                    code: errorCode,
                    message: Server.errorMessages[errorCode],
                    context: errorContext,
                });
                abortUpgrade(socket, errorCode, errorContext);
                return;
            }
            const head = Buffer.from(upgradeHead);
            upgradeHead = null;
            // some middlewares (like express-session) wait for the writeHead() call to flush their headers
            // see https://github.com/expressjs/session/blob/1010fadc2f071ddf2add94235d72224cf65159c6/index.js#L220-L244
            res.writeHead();
            // delegate to ws
            this.ws.handleUpgrade(req, socket, head, (websocket) => {
                this.onWebSocket(req, socket, websocket);
            });
        };
        this._applyMiddlewares(req, res, (err) => {
            if (err) {
                callback(Server.errors.BAD_REQUEST, { name: "MIDDLEWARE_FAILURE" });
            }
            else {
                this.verify(req, true, callback);
            }
        });
    }
    /**
     * Called upon a ws.io connection.
     *
     * @param {ws.Socket} websocket
     * @api private
     */
    onWebSocket(req, socket, websocket) {
        websocket.on("error", onUpgradeError);
        if (transports_1.default[req._query.transport] !== undefined &&
            !transports_1.default[req._query.transport].prototype.handlesUpgrades) {
            debug("transport doesnt handle upgraded requests");
            websocket.close();
            return;
        }
        // get client id
        const id = req._query.sid;
        // keep a reference to the ws.Socket
        req.websocket = websocket;
        if (id) {
            const client = this.clients[id];
            if (!client) {
                debug("upgrade attempt for closed client");
                websocket.close();
            }
            else if (client.upgrading) {
                debug("transport has already been trying to upgrade");
                websocket.close();
            }
            else if (client.upgraded) {
                debug("transport had already been upgraded");
                websocket.close();
            }
            else {
                debug("upgrading existing transport");
                // transport error handling takes over
                websocket.removeListener("error", onUpgradeError);
                const transport = this.createTransport(req._query.transport, req);
                if (req._query && req._query.b64) {
                    transport.supportsBinary = false;
                }
                else {
                    transport.supportsBinary = true;
                }
                transport.perMessageDeflate = this.opts.perMessageDeflate;
                client.maybeUpgrade(transport);
            }
        }
        else {
            const closeConnection = (errorCode, errorContext) => abortUpgrade(socket, errorCode, errorContext);
            this.handshake(req._query.transport, req, closeConnection);
        }
        function onUpgradeError() {
            debug("websocket error before upgrade");
            // websocket.close() not needed
        }
    }
    /**
     * Captures upgrade requests for a http.Server.
     *
     * @param {http.Server} server
     * @param {Object} options
     * @api public
     */
    attach(server, options = {}) {
        const path = this._computePath(options);
        const destroyUpgradeTimeout = options.destroyUpgradeTimeout || 1000;
        function check(req) {
            // TODO use `path === new URL(...).pathname` in the next major release (ref: https://nodejs.org/api/url.html)
            return path === req.url.slice(0, path.length);
        }
        // cache and clean up listeners
        const listeners = server.listeners("request").slice(0);
        server.removeAllListeners("request");
        server.on("close", this.close.bind(this));
        server.on("listening", this.init.bind(this));
        // add request handler
        server.on("request", (req, res) => {
            if (check(req)) {
                debug('intercepting request for path "%s"', path);
                this.handleRequest(req, res);
            }
            else {
                let i = 0;
                const l = listeners.length;
                for (; i < l; i++) {
                    listeners[i].call(server, req, res);
                }
            }
        });
        if (~this.opts.transports.indexOf("websocket")) {
            server.on("upgrade", (req, socket, head) => {
                if (check(req)) {
                    this.handleUpgrade(req, socket, head);
                }
                else if (false !== options.destroyUpgrade) {
                    // default node behavior is to disconnect when no handlers
                    // but by adding a handler, we prevent that
                    // and if no eio thing handles the upgrade
                    // then the socket needs to die!
                    setTimeout(function () {
                        // @ts-ignore
                        if (socket.writable && socket.bytesWritten <= 0) {
                            socket.on("error", (e) => {
                                debug("error while destroying upgrade: %s", e.message);
                            });
                            return socket.end();
                        }
                    }, destroyUpgradeTimeout);
                }
            });
        }
    }
}
exports.Server = Server;
/**
 * Close the HTTP long-polling request
 *
 * @param res - the response object
 * @param errorCode - the error code
 * @param errorContext - additional error context
 *
 * @api private
 */
function abortRequest(res, errorCode, errorContext) {
    const statusCode = errorCode === Server.errors.FORBIDDEN ? 403 : 400;
    const message = errorContext && errorContext.message
        ? errorContext.message
        : Server.errorMessages[errorCode];
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        code: errorCode,
        message,
    }));
}
/**
 * Close the WebSocket connection
 *
 * @param {net.Socket} socket
 * @param {string} errorCode - the error code
 * @param {object} errorContext - additional error context
 *
 * @api private
 */
function abortUpgrade(socket, errorCode, errorContext = {}) {
    socket.on("error", () => {
        debug("ignoring error from closed connection");
    });
    if (socket.writable) {
        const message = errorContext.message || Server.errorMessages[errorCode];
        const length = Buffer.byteLength(message);
        socket.write("HTTP/1.1 400 Bad Request\r\n" +
            "Connection: close\r\n" +
            "Content-type: text/html\r\n" +
            "Content-Length: " +
            length +
            "\r\n" +
            "\r\n" +
            message);
    }
    socket.destroy();
}
/* eslint-disable */
/**
 * From https://github.com/nodejs/node/blob/v8.4.0/lib/_http_common.js#L303-L354
 *
 * True if val contains an invalid field-vchar
 *  field-value    = *( field-content / obs-fold )
 *  field-content  = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 *  field-vchar    = VCHAR / obs-text
 *
 * checkInvalidHeaderChar() is currently designed to be inlinable by v8,
 * so take care when making changes to the implementation so that the source
 * code size does not exceed v8's default max_inlined_source_size setting.
 **/
// prettier-ignore
const validHdrChars = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 // ... 255
];
function checkInvalidHeaderChar(val) {
    val += "";
    if (val.length < 1)
        return false;
    if (!validHdrChars[val.charCodeAt(0)]) {
        debug('invalid header, index 0, char "%s"', val.charCodeAt(0));
        return true;
    }
    if (val.length < 2)
        return false;
    if (!validHdrChars[val.charCodeAt(1)]) {
        debug('invalid header, index 1, char "%s"', val.charCodeAt(1));
        return true;
    }
    if (val.length < 3)
        return false;
    if (!validHdrChars[val.charCodeAt(2)]) {
        debug('invalid header, index 2, char "%s"', val.charCodeAt(2));
        return true;
    }
    if (val.length < 4)
        return false;
    if (!validHdrChars[val.charCodeAt(3)]) {
        debug('invalid header, index 3, char "%s"', val.charCodeAt(3));
        return true;
    }
    for (let i = 4; i < val.length; ++i) {
        if (!validHdrChars[val.charCodeAt(i)]) {
            debug('invalid header, index "%i", char "%s"', i, val.charCodeAt(i));
            return true;
        }
    }
    return false;
}

}, function(modId) { var map = {"./transports":1689135067505,"./socket":1689135067513,"./transports/webtransport":1689135067512}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1689135067505, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
const polling_1 = require("./polling");
const polling_jsonp_1 = require("./polling-jsonp");
const websocket_1 = require("./websocket");
const webtransport_1 = require("./webtransport");
exports.default = {
    polling: polling,
    websocket: websocket_1.WebSocket,
    webtransport: webtransport_1.WebTransport,
};
/**
 * Polling polymorphic constructor.
 *
 * @api private
 */
function polling(req) {
    if ("string" === typeof req._query.j) {
        return new polling_jsonp_1.JSONP(req);
    }
    else {
        return new polling_1.Polling(req);
    }
}
polling.upgradesTo = ["websocket", "webtransport"];

}, function(modId) { var map = {"./polling":1689135067506,"./polling-jsonp":1689135067510,"./websocket":1689135067511,"./webtransport":1689135067512}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1689135067506, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.Polling = void 0;
const transport_1 = require("../transport");
const zlib_1 = require("zlib");
const accepts = require("accepts");
const debug_1 = require("debug");
const debug = (0, debug_1.default)("engine:polling");
const compressionMethods = {
    gzip: zlib_1.createGzip,
    deflate: zlib_1.createDeflate,
};
class Polling extends transport_1.Transport {
    /**
     * HTTP polling constructor.
     *
     * @api public.
     */
    constructor(req) {
        super(req);
        this.closeTimeout = 30 * 1000;
    }
    /**
     * Transport name
     *
     * @api public
     */
    get name() {
        return "polling";
    }
    get supportsFraming() {
        return false;
    }
    /**
     * Overrides onRequest.
     *
     * @param {http.IncomingMessage}
     * @api private
     */
    onRequest(req) {
        const res = req.res;
        if ("GET" === req.method) {
            this.onPollRequest(req, res);
        }
        else if ("POST" === req.method) {
            this.onDataRequest(req, res);
        }
        else {
            res.writeHead(500);
            res.end();
        }
    }
    /**
     * The client sends a request awaiting for us to send data.
     *
     * @api private
     */
    onPollRequest(req, res) {
        if (this.req) {
            debug("request overlap");
            // assert: this.res, '.req and .res should be (un)set together'
            this.onError("overlap from client");
            res.writeHead(400);
            res.end();
            return;
        }
        debug("setting request");
        this.req = req;
        this.res = res;
        const onClose = () => {
            this.onError("poll connection closed prematurely");
        };
        const cleanup = () => {
            req.removeListener("close", onClose);
            this.req = this.res = null;
        };
        req.cleanup = cleanup;
        req.on("close", onClose);
        this.writable = true;
        this.emit("drain");
        // if we're still writable but had a pending close, trigger an empty send
        if (this.writable && this.shouldClose) {
            debug("triggering empty send to append close packet");
            this.send([{ type: "noop" }]);
        }
    }
    /**
     * The client sends a request with data.
     *
     * @api private
     */
    onDataRequest(req, res) {
        if (this.dataReq) {
            // assert: this.dataRes, '.dataReq and .dataRes should be (un)set together'
            this.onError("data request overlap from client");
            res.writeHead(400);
            res.end();
            return;
        }
        const isBinary = "application/octet-stream" === req.headers["content-type"];
        if (isBinary && this.protocol === 4) {
            return this.onError("invalid content");
        }
        this.dataReq = req;
        this.dataRes = res;
        let chunks = isBinary ? Buffer.concat([]) : "";
        const cleanup = () => {
            req.removeListener("data", onData);
            req.removeListener("end", onEnd);
            req.removeListener("close", onClose);
            this.dataReq = this.dataRes = chunks = null;
        };
        const onClose = () => {
            cleanup();
            this.onError("data request connection closed prematurely");
        };
        const onData = (data) => {
            let contentLength;
            if (isBinary) {
                chunks = Buffer.concat([chunks, data]);
                contentLength = chunks.length;
            }
            else {
                chunks += data;
                contentLength = Buffer.byteLength(chunks);
            }
            if (contentLength > this.maxHttpBufferSize) {
                res.writeHead(413).end();
                cleanup();
            }
        };
        const onEnd = () => {
            this.onData(chunks);
            const headers = {
                // text/html is required instead of text/plain to avoid an
                // unwanted download dialog on certain user-agents (GH-43)
                "Content-Type": "text/html",
                "Content-Length": 2,
            };
            res.writeHead(200, this.headers(req, headers));
            res.end("ok");
            cleanup();
        };
        req.on("close", onClose);
        if (!isBinary)
            req.setEncoding("utf8");
        req.on("data", onData);
        req.on("end", onEnd);
    }
    /**
     * Processes the incoming data payload.
     *
     * @param {String} encoded payload
     * @api private
     */
    onData(data) {
        debug('received "%s"', data);
        const callback = (packet) => {
            if ("close" === packet.type) {
                debug("got xhr close packet");
                this.onClose();
                return false;
            }
            this.onPacket(packet);
        };
        if (this.protocol === 3) {
            this.parser.decodePayload(data, callback);
        }
        else {
            this.parser.decodePayload(data).forEach(callback);
        }
    }
    /**
     * Overrides onClose.
     *
     * @api private
     */
    onClose() {
        if (this.writable) {
            // close pending poll request
            this.send([{ type: "noop" }]);
        }
        super.onClose();
    }
    /**
     * Writes a packet payload.
     *
     * @param {Object} packet
     * @api private
     */
    send(packets) {
        this.writable = false;
        if (this.shouldClose) {
            debug("appending close packet to payload");
            packets.push({ type: "close" });
            this.shouldClose();
            this.shouldClose = null;
        }
        const doWrite = (data) => {
            const compress = packets.some((packet) => {
                return packet.options && packet.options.compress;
            });
            this.write(data, { compress });
        };
        if (this.protocol === 3) {
            this.parser.encodePayload(packets, this.supportsBinary, doWrite);
        }
        else {
            this.parser.encodePayload(packets, doWrite);
        }
    }
    /**
     * Writes data as response to poll request.
     *
     * @param {String} data
     * @param {Object} options
     * @api private
     */
    write(data, options) {
        debug('writing "%s"', data);
        this.doWrite(data, options, () => {
            this.req.cleanup();
        });
    }
    /**
     * Performs the write.
     *
     * @api private
     */
    doWrite(data, options, callback) {
        // explicit UTF-8 is required for pages not served under utf
        const isString = typeof data === "string";
        const contentType = isString
            ? "text/plain; charset=UTF-8"
            : "application/octet-stream";
        const headers = {
            "Content-Type": contentType,
        };
        const respond = (data) => {
            headers["Content-Length"] =
                "string" === typeof data ? Buffer.byteLength(data) : data.length;
            this.res.writeHead(200, this.headers(this.req, headers));
            this.res.end(data);
            callback();
        };
        if (!this.httpCompression || !options.compress) {
            respond(data);
            return;
        }
        const len = isString ? Buffer.byteLength(data) : data.length;
        if (len < this.httpCompression.threshold) {
            respond(data);
            return;
        }
        const encoding = accepts(this.req).encodings(["gzip", "deflate"]);
        if (!encoding) {
            respond(data);
            return;
        }
        this.compress(data, encoding, (err, data) => {
            if (err) {
                this.res.writeHead(500);
                this.res.end();
                callback(err);
                return;
            }
            headers["Content-Encoding"] = encoding;
            respond(data);
        });
    }
    /**
     * Compresses data.
     *
     * @api private
     */
    compress(data, encoding, callback) {
        debug("compressing");
        const buffers = [];
        let nread = 0;
        compressionMethods[encoding](this.httpCompression)
            .on("error", callback)
            .on("data", function (chunk) {
            buffers.push(chunk);
            nread += chunk.length;
        })
            .on("end", function () {
            callback(null, Buffer.concat(buffers, nread));
        })
            .end(data);
    }
    /**
     * Closes the transport.
     *
     * @api private
     */
    doClose(fn) {
        debug("closing");
        let closeTimeoutTimer;
        if (this.dataReq) {
            debug("aborting ongoing data request");
            this.dataReq.destroy();
        }
        const onClose = () => {
            clearTimeout(closeTimeoutTimer);
            fn();
            this.onClose();
        };
        if (this.writable) {
            debug("transport writable - closing right away");
            this.send([{ type: "close" }]);
            onClose();
        }
        else if (this.discarded) {
            debug("transport discarded - closing right away");
            onClose();
        }
        else {
            debug("transport not writable - buffering orderly close");
            this.shouldClose = onClose;
            closeTimeoutTimer = setTimeout(onClose, this.closeTimeout);
        }
    }
    /**
     * Returns headers for a response.
     *
     * @param {http.IncomingMessage} request
     * @param {Object} extra headers
     * @api private
     */
    headers(req, headers) {
        headers = headers || {};
        // prevent XSS warnings on IE
        // https://github.com/LearnBoost/socket.io/pull/1333
        const ua = req.headers["user-agent"];
        if (ua && (~ua.indexOf(";MSIE") || ~ua.indexOf("Trident/"))) {
            headers["X-XSS-Protection"] = "0";
        }
        this.emit("headers", headers, req);
        return headers;
    }
}
exports.Polling = Polling;

}, function(modId) { var map = {"../transport":1689135067507}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1689135067507, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.Transport = void 0;
const events_1 = require("events");
const parser_v4 = require("engine.io-parser");
const parser_v3 = require("./parser-v3/index");
const debug_1 = require("debug");
const debug = (0, debug_1.default)("engine:transport");
/**
 * Noop function.
 *
 * @api private
 */
function noop() { }
class Transport extends events_1.EventEmitter {
    /**
     * Transport constructor.
     *
     * @param {http.IncomingMessage} request
     * @api public
     */
    constructor(req) {
        super();
        this.readyState = "open";
        this.discarded = false;
        this.protocol = req._query.EIO === "4" ? 4 : 3; // 3rd revision by default
        this.parser = this.protocol === 4 ? parser_v4 : parser_v3;
    }
    get readyState() {
        return this._readyState;
    }
    set readyState(state) {
        debug("readyState updated from %s to %s (%s)", this._readyState, state, this.name);
        this._readyState = state;
    }
    /**
     * Flags the transport as discarded.
     *
     * @api private
     */
    discard() {
        this.discarded = true;
    }
    /**
     * Called with an incoming HTTP request.
     *
     * @param {http.IncomingMessage} request
     * @api protected
     */
    onRequest(req) {
        debug("setting request");
        this.req = req;
    }
    /**
     * Closes the transport.
     *
     * @api private
     */
    close(fn) {
        if ("closed" === this.readyState || "closing" === this.readyState)
            return;
        this.readyState = "closing";
        this.doClose(fn || noop);
    }
    /**
     * Called with a transport error.
     *
     * @param {String} message error
     * @param {Object} error description
     * @api protected
     */
    onError(msg, desc) {
        if (this.listeners("error").length) {
            const err = new Error(msg);
            // @ts-ignore
            err.type = "TransportError";
            // @ts-ignore
            err.description = desc;
            this.emit("error", err);
        }
        else {
            debug("ignored transport error %s (%s)", msg, desc);
        }
    }
    /**
     * Called with parsed out a packets from the data stream.
     *
     * @param {Object} packet
     * @api protected
     */
    onPacket(packet) {
        this.emit("packet", packet);
    }
    /**
     * Called with the encoded packet data.
     *
     * @param {String} data
     * @api protected
     */
    onData(data) {
        this.onPacket(this.parser.decodePacket(data));
    }
    /**
     * Called upon transport close.
     *
     * @api protected
     */
    onClose() {
        this.readyState = "closed";
        this.emit("close");
    }
}
exports.Transport = Transport;

}, function(modId) { var map = {"./parser-v3/index":1689135067508}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1689135067508, function(require, module, exports) {

// imported from https://github.com/socketio/engine.io-parser/tree/2.2.x
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodePayloadAsBinary = exports.encodePayloadAsBinary = exports.decodePayload = exports.encodePayload = exports.decodeBase64Packet = exports.decodePacket = exports.encodeBase64Packet = exports.encodePacket = exports.packets = exports.protocol = void 0;
/**
 * Module dependencies.
 */
var utf8 = require('./utf8');
/**
 * Current protocol version.
 */
exports.protocol = 3;
const hasBinary = (packets) => {
    for (const packet of packets) {
        if (packet.data instanceof ArrayBuffer || ArrayBuffer.isView(packet.data)) {
            return true;
        }
    }
    return false;
};
/**
 * Packet types.
 */
exports.packets = {
    open: 0 // non-ws
    ,
    close: 1 // non-ws
    ,
    ping: 2,
    pong: 3,
    message: 4,
    upgrade: 5,
    noop: 6
};
var packetslist = Object.keys(exports.packets);
/**
 * Premade error packet.
 */
var err = { type: 'error', data: 'parser error' };
const EMPTY_BUFFER = Buffer.concat([]);
/**
 * Encodes a packet.
 *
 *     <packet type id> [ <data> ]
 *
 * Example:
 *
 *     5hello world
 *     3
 *     4
 *
 * Binary is encoded in an identical principle
 *
 * @api private
 */
function encodePacket(packet, supportsBinary, utf8encode, callback) {
    if (typeof supportsBinary === 'function') {
        callback = supportsBinary;
        supportsBinary = null;
    }
    if (typeof utf8encode === 'function') {
        callback = utf8encode;
        utf8encode = null;
    }
    if (Buffer.isBuffer(packet.data)) {
        return encodeBuffer(packet, supportsBinary, callback);
    }
    else if (packet.data && (packet.data.buffer || packet.data) instanceof ArrayBuffer) {
        return encodeBuffer({ type: packet.type, data: arrayBufferToBuffer(packet.data) }, supportsBinary, callback);
    }
    // Sending data as a utf-8 string
    var encoded = exports.packets[packet.type];
    // data fragment is optional
    if (undefined !== packet.data) {
        encoded += utf8encode ? utf8.encode(String(packet.data), { strict: false }) : String(packet.data);
    }
    return callback('' + encoded);
}
exports.encodePacket = encodePacket;
;
/**
 * Encode Buffer data
 */
function encodeBuffer(packet, supportsBinary, callback) {
    if (!supportsBinary) {
        return encodeBase64Packet(packet, callback);
    }
    var data = packet.data;
    var typeBuffer = Buffer.allocUnsafe(1);
    typeBuffer[0] = exports.packets[packet.type];
    return callback(Buffer.concat([typeBuffer, data]));
}
/**
 * Encodes a packet with binary data in a base64 string
 *
 * @param {Object} packet, has `type` and `data`
 * @return {String} base64 encoded message
 */
function encodeBase64Packet(packet, callback) {
    var data = Buffer.isBuffer(packet.data) ? packet.data : arrayBufferToBuffer(packet.data);
    var message = 'b' + exports.packets[packet.type];
    message += data.toString('base64');
    return callback(message);
}
exports.encodeBase64Packet = encodeBase64Packet;
;
/**
 * Decodes a packet. Data also available as an ArrayBuffer if requested.
 *
 * @return {Object} with `type` and `data` (if any)
 * @api private
 */
function decodePacket(data, binaryType, utf8decode) {
    if (data === undefined) {
        return err;
    }
    var type;
    // String data
    if (typeof data === 'string') {
        type = data.charAt(0);
        if (type === 'b') {
            return decodeBase64Packet(data.slice(1), binaryType);
        }
        if (utf8decode) {
            data = tryDecode(data);
            if (data === false) {
                return err;
            }
        }
        if (Number(type) != type || !packetslist[type]) {
            return err;
        }
        if (data.length > 1) {
            return { type: packetslist[type], data: data.slice(1) };
        }
        else {
            return { type: packetslist[type] };
        }
    }
    // Binary data
    if (binaryType === 'arraybuffer') {
        // wrap Buffer/ArrayBuffer data into an Uint8Array
        var intArray = new Uint8Array(data);
        type = intArray[0];
        return { type: packetslist[type], data: intArray.buffer.slice(1) };
    }
    if (data instanceof ArrayBuffer) {
        data = arrayBufferToBuffer(data);
    }
    type = data[0];
    return { type: packetslist[type], data: data.slice(1) };
}
exports.decodePacket = decodePacket;
;
function tryDecode(data) {
    try {
        data = utf8.decode(data, { strict: false });
    }
    catch (e) {
        return false;
    }
    return data;
}
/**
 * Decodes a packet encoded in a base64 string.
 *
 * @param {String} base64 encoded message
 * @return {Object} with `type` and `data` (if any)
 */
function decodeBase64Packet(msg, binaryType) {
    var type = packetslist[msg.charAt(0)];
    var data = Buffer.from(msg.slice(1), 'base64');
    if (binaryType === 'arraybuffer') {
        var abv = new Uint8Array(data.length);
        for (var i = 0; i < abv.length; i++) {
            abv[i] = data[i];
        }
        // @ts-ignore
        data = abv.buffer;
    }
    return { type: type, data: data };
}
exports.decodeBase64Packet = decodeBase64Packet;
;
/**
 * Encodes multiple messages (payload).
 *
 *     <length>:data
 *
 * Example:
 *
 *     11:hello world2:hi
 *
 * If any contents are binary, they will be encoded as base64 strings. Base64
 * encoded strings are marked with a b before the length specifier
 *
 * @param {Array} packets
 * @api private
 */
function encodePayload(packets, supportsBinary, callback) {
    if (typeof supportsBinary === 'function') {
        callback = supportsBinary;
        supportsBinary = null;
    }
    if (supportsBinary && hasBinary(packets)) {
        return encodePayloadAsBinary(packets, callback);
    }
    if (!packets.length) {
        return callback('0:');
    }
    function encodeOne(packet, doneCallback) {
        encodePacket(packet, supportsBinary, false, function (message) {
            doneCallback(null, setLengthHeader(message));
        });
    }
    map(packets, encodeOne, function (err, results) {
        return callback(results.join(''));
    });
}
exports.encodePayload = encodePayload;
;
function setLengthHeader(message) {
    return message.length + ':' + message;
}
/**
 * Async array map using after
 */
function map(ary, each, done) {
    const results = new Array(ary.length);
    let count = 0;
    for (let i = 0; i < ary.length; i++) {
        each(ary[i], (error, msg) => {
            results[i] = msg;
            if (++count === ary.length) {
                done(null, results);
            }
        });
    }
}
/*
 * Decodes data when a payload is maybe expected. Possible binary contents are
 * decoded from their base64 representation
 *
 * @param {String} data, callback method
 * @api public
 */
function decodePayload(data, binaryType, callback) {
    if (typeof data !== 'string') {
        return decodePayloadAsBinary(data, binaryType, callback);
    }
    if (typeof binaryType === 'function') {
        callback = binaryType;
        binaryType = null;
    }
    if (data === '') {
        // parser error - ignoring payload
        return callback(err, 0, 1);
    }
    var length = '', n, msg, packet;
    for (var i = 0, l = data.length; i < l; i++) {
        var chr = data.charAt(i);
        if (chr !== ':') {
            length += chr;
            continue;
        }
        // @ts-ignore
        if (length === '' || (length != (n = Number(length)))) {
            // parser error - ignoring payload
            return callback(err, 0, 1);
        }
        msg = data.slice(i + 1, i + 1 + n);
        if (length != msg.length) {
            // parser error - ignoring payload
            return callback(err, 0, 1);
        }
        if (msg.length) {
            packet = decodePacket(msg, binaryType, false);
            if (err.type === packet.type && err.data === packet.data) {
                // parser error in individual packet - ignoring payload
                return callback(err, 0, 1);
            }
            var more = callback(packet, i + n, l);
            if (false === more)
                return;
        }
        // advance cursor
        i += n;
        length = '';
    }
    if (length !== '') {
        // parser error - ignoring payload
        return callback(err, 0, 1);
    }
}
exports.decodePayload = decodePayload;
;
/**
 *
 * Converts a buffer to a utf8.js encoded string
 *
 * @api private
 */
function bufferToString(buffer) {
    var str = '';
    for (var i = 0, l = buffer.length; i < l; i++) {
        str += String.fromCharCode(buffer[i]);
    }
    return str;
}
/**
 *
 * Converts a utf8.js encoded string to a buffer
 *
 * @api private
 */
function stringToBuffer(string) {
    var buf = Buffer.allocUnsafe(string.length);
    for (var i = 0, l = string.length; i < l; i++) {
        buf.writeUInt8(string.charCodeAt(i), i);
    }
    return buf;
}
/**
 *
 * Converts an ArrayBuffer to a Buffer
 *
 * @api private
 */
function arrayBufferToBuffer(data) {
    // data is either an ArrayBuffer or ArrayBufferView.
    var length = data.byteLength || data.length;
    var offset = data.byteOffset || 0;
    return Buffer.from(data.buffer || data, offset, length);
}
/**
 * Encodes multiple messages (payload) as binary.
 *
 * <1 = binary, 0 = string><number from 0-9><number from 0-9>[...]<number
 * 255><data>
 *
 * Example:
 * 1 3 255 1 2 3, if the binary contents are interpreted as 8 bit integers
 *
 * @param {Array} packets
 * @return {Buffer} encoded payload
 * @api private
 */
function encodePayloadAsBinary(packets, callback) {
    if (!packets.length) {
        return callback(EMPTY_BUFFER);
    }
    map(packets, encodeOneBinaryPacket, function (err, results) {
        return callback(Buffer.concat(results));
    });
}
exports.encodePayloadAsBinary = encodePayloadAsBinary;
;
function encodeOneBinaryPacket(p, doneCallback) {
    function onBinaryPacketEncode(packet) {
        var encodingLength = '' + packet.length;
        var sizeBuffer;
        if (typeof packet === 'string') {
            sizeBuffer = Buffer.allocUnsafe(encodingLength.length + 2);
            sizeBuffer[0] = 0; // is a string (not true binary = 0)
            for (var i = 0; i < encodingLength.length; i++) {
                sizeBuffer[i + 1] = parseInt(encodingLength[i], 10);
            }
            sizeBuffer[sizeBuffer.length - 1] = 255;
            return doneCallback(null, Buffer.concat([sizeBuffer, stringToBuffer(packet)]));
        }
        sizeBuffer = Buffer.allocUnsafe(encodingLength.length + 2);
        sizeBuffer[0] = 1; // is binary (true binary = 1)
        for (var i = 0; i < encodingLength.length; i++) {
            sizeBuffer[i + 1] = parseInt(encodingLength[i], 10);
        }
        sizeBuffer[sizeBuffer.length - 1] = 255;
        doneCallback(null, Buffer.concat([sizeBuffer, packet]));
    }
    encodePacket(p, true, true, onBinaryPacketEncode);
}
/*
 * Decodes data when a payload is maybe expected. Strings are decoded by
 * interpreting each byte as a key code for entries marked to start with 0. See
 * description of encodePayloadAsBinary

 * @param {Buffer} data, callback method
 * @api public
 */
function decodePayloadAsBinary(data, binaryType, callback) {
    if (typeof binaryType === 'function') {
        callback = binaryType;
        binaryType = null;
    }
    var bufferTail = data;
    var buffers = [];
    var i;
    while (bufferTail.length > 0) {
        var strLen = '';
        var isString = bufferTail[0] === 0;
        for (i = 1;; i++) {
            if (bufferTail[i] === 255)
                break;
            // 310 = char length of Number.MAX_VALUE
            if (strLen.length > 310) {
                return callback(err, 0, 1);
            }
            strLen += '' + bufferTail[i];
        }
        bufferTail = bufferTail.slice(strLen.length + 1);
        var msgLength = parseInt(strLen, 10);
        var msg = bufferTail.slice(1, msgLength + 1);
        if (isString)
            msg = bufferToString(msg);
        buffers.push(msg);
        bufferTail = bufferTail.slice(msgLength + 1);
    }
    var total = buffers.length;
    for (i = 0; i < total; i++) {
        var buffer = buffers[i];
        callback(decodePacket(buffer, binaryType, true), i, total);
    }
}
exports.decodePayloadAsBinary = decodePayloadAsBinary;
;

}, function(modId) { var map = {"./utf8":1689135067509}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1689135067509, function(require, module, exports) {
/*! https://mths.be/utf8js v2.1.2 by @mathias */
var stringFromCharCode = String.fromCharCode;
// Taken from https://mths.be/punycode
function ucs2decode(string) {
    var output = [];
    var counter = 0;
    var length = string.length;
    var value;
    var extra;
    while (counter < length) {
        value = string.charCodeAt(counter++);
        if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
            // high surrogate, and there is a next character
            extra = string.charCodeAt(counter++);
            if ((extra & 0xFC00) == 0xDC00) { // low surrogate
                output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
            }
            else {
                // unmatched surrogate; only append this code unit, in case the next
                // code unit is the high surrogate of a surrogate pair
                output.push(value);
                counter--;
            }
        }
        else {
            output.push(value);
        }
    }
    return output;
}
// Taken from https://mths.be/punycode
function ucs2encode(array) {
    var length = array.length;
    var index = -1;
    var value;
    var output = '';
    while (++index < length) {
        value = array[index];
        if (value > 0xFFFF) {
            value -= 0x10000;
            output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
            value = 0xDC00 | value & 0x3FF;
        }
        output += stringFromCharCode(value);
    }
    return output;
}
function checkScalarValue(codePoint, strict) {
    if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
        if (strict) {
            throw Error('Lone surrogate U+' + codePoint.toString(16).toUpperCase() +
                ' is not a scalar value');
        }
        return false;
    }
    return true;
}
/*--------------------------------------------------------------------------*/
function createByte(codePoint, shift) {
    return stringFromCharCode(((codePoint >> shift) & 0x3F) | 0x80);
}
function encodeCodePoint(codePoint, strict) {
    if ((codePoint & 0xFFFFFF80) == 0) { // 1-byte sequence
        return stringFromCharCode(codePoint);
    }
    var symbol = '';
    if ((codePoint & 0xFFFFF800) == 0) { // 2-byte sequence
        symbol = stringFromCharCode(((codePoint >> 6) & 0x1F) | 0xC0);
    }
    else if ((codePoint & 0xFFFF0000) == 0) { // 3-byte sequence
        if (!checkScalarValue(codePoint, strict)) {
            codePoint = 0xFFFD;
        }
        symbol = stringFromCharCode(((codePoint >> 12) & 0x0F) | 0xE0);
        symbol += createByte(codePoint, 6);
    }
    else if ((codePoint & 0xFFE00000) == 0) { // 4-byte sequence
        symbol = stringFromCharCode(((codePoint >> 18) & 0x07) | 0xF0);
        symbol += createByte(codePoint, 12);
        symbol += createByte(codePoint, 6);
    }
    symbol += stringFromCharCode((codePoint & 0x3F) | 0x80);
    return symbol;
}
function utf8encode(string, opts) {
    opts = opts || {};
    var strict = false !== opts.strict;
    var codePoints = ucs2decode(string);
    var length = codePoints.length;
    var index = -1;
    var codePoint;
    var byteString = '';
    while (++index < length) {
        codePoint = codePoints[index];
        byteString += encodeCodePoint(codePoint, strict);
    }
    return byteString;
}
/*--------------------------------------------------------------------------*/
function readContinuationByte() {
    if (byteIndex >= byteCount) {
        throw Error('Invalid byte index');
    }
    var continuationByte = byteArray[byteIndex] & 0xFF;
    byteIndex++;
    if ((continuationByte & 0xC0) == 0x80) {
        return continuationByte & 0x3F;
    }
    // If we end up here, it’s not a continuation byte
    throw Error('Invalid continuation byte');
}
function decodeSymbol(strict) {
    var byte1;
    var byte2;
    var byte3;
    var byte4;
    var codePoint;
    if (byteIndex > byteCount) {
        throw Error('Invalid byte index');
    }
    if (byteIndex == byteCount) {
        return false;
    }
    // Read first byte
    byte1 = byteArray[byteIndex] & 0xFF;
    byteIndex++;
    // 1-byte sequence (no continuation bytes)
    if ((byte1 & 0x80) == 0) {
        return byte1;
    }
    // 2-byte sequence
    if ((byte1 & 0xE0) == 0xC0) {
        byte2 = readContinuationByte();
        codePoint = ((byte1 & 0x1F) << 6) | byte2;
        if (codePoint >= 0x80) {
            return codePoint;
        }
        else {
            throw Error('Invalid continuation byte');
        }
    }
    // 3-byte sequence (may include unpaired surrogates)
    if ((byte1 & 0xF0) == 0xE0) {
        byte2 = readContinuationByte();
        byte3 = readContinuationByte();
        codePoint = ((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3;
        if (codePoint >= 0x0800) {
            return checkScalarValue(codePoint, strict) ? codePoint : 0xFFFD;
        }
        else {
            throw Error('Invalid continuation byte');
        }
    }
    // 4-byte sequence
    if ((byte1 & 0xF8) == 0xF0) {
        byte2 = readContinuationByte();
        byte3 = readContinuationByte();
        byte4 = readContinuationByte();
        codePoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0C) |
            (byte3 << 0x06) | byte4;
        if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
            return codePoint;
        }
    }
    throw Error('Invalid UTF-8 detected');
}
var byteArray;
var byteCount;
var byteIndex;
function utf8decode(byteString, opts) {
    opts = opts || {};
    var strict = false !== opts.strict;
    byteArray = ucs2decode(byteString);
    byteCount = byteArray.length;
    byteIndex = 0;
    var codePoints = [];
    var tmp;
    while ((tmp = decodeSymbol(strict)) !== false) {
        codePoints.push(tmp);
    }
    return ucs2encode(codePoints);
}
module.exports = {
    version: '2.1.2',
    encode: utf8encode,
    decode: utf8decode
};

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1689135067510, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONP = void 0;
const polling_1 = require("./polling");
const qs = require("querystring");
const rDoubleSlashes = /\\\\n/g;
const rSlashes = /(\\)?\\n/g;
class JSONP extends polling_1.Polling {
    /**
     * JSON-P polling transport.
     *
     * @api public
     */
    constructor(req) {
        super(req);
        this.head = "___eio[" + (req._query.j || "").replace(/[^0-9]/g, "") + "](";
        this.foot = ");";
    }
    /**
     * Handles incoming data.
     * Due to a bug in \n handling by browsers, we expect a escaped string.
     *
     * @api private
     */
    onData(data) {
        // we leverage the qs module so that we get built-in DoS protection
        // and the fast alternative to decodeURIComponent
        data = qs.parse(data).d;
        if ("string" === typeof data) {
            // client will send already escaped newlines as \\\\n and newlines as \\n
            // \\n must be replaced with \n and \\\\n with \\n
            data = data.replace(rSlashes, function (match, slashes) {
                return slashes ? match : "\n";
            });
            super.onData(data.replace(rDoubleSlashes, "\\n"));
        }
    }
    /**
     * Performs the write.
     *
     * @api private
     */
    doWrite(data, options, callback) {
        // we must output valid javascript, not valid json
        // see: http://timelessrepo.com/json-isnt-a-javascript-subset
        const js = JSON.stringify(data)
            .replace(/\u2028/g, "\\u2028")
            .replace(/\u2029/g, "\\u2029");
        // prepare response
        data = this.head + js + this.foot;
        super.doWrite(data, options, callback);
    }
}
exports.JSONP = JSONP;

}, function(modId) { var map = {"./polling":1689135067506}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1689135067511, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocket = void 0;
const transport_1 = require("../transport");
const debug_1 = require("debug");
const debug = (0, debug_1.default)("engine:ws");
class WebSocket extends transport_1.Transport {
    /**
     * WebSocket transport
     *
     * @param {http.IncomingMessage}
     * @api public
     */
    constructor(req) {
        super(req);
        this.socket = req.websocket;
        this.socket.on("message", (data, isBinary) => {
            const message = isBinary ? data : data.toString();
            debug('received "%s"', message);
            super.onData(message);
        });
        this.socket.once("close", this.onClose.bind(this));
        this.socket.on("error", this.onError.bind(this));
        this.writable = true;
        this.perMessageDeflate = null;
    }
    /**
     * Transport name
     *
     * @api public
     */
    get name() {
        return "websocket";
    }
    /**
     * Advertise upgrade support.
     *
     * @api public
     */
    get handlesUpgrades() {
        return true;
    }
    /**
     * Advertise framing support.
     *
     * @api public
     */
    get supportsFraming() {
        return true;
    }
    /**
     * Writes a packet payload.
     *
     * @param {Array} packets
     * @api private
     */
    send(packets) {
        this.writable = false;
        for (let i = 0; i < packets.length; i++) {
            const packet = packets[i];
            const isLast = i + 1 === packets.length;
            // always creates a new object since ws modifies it
            const opts = {};
            if (packet.options) {
                opts.compress = packet.options.compress;
            }
            const onSent = (err) => {
                if (err) {
                    return this.onError("write error", err.stack);
                }
                else if (isLast) {
                    this.writable = true;
                    this.emit("drain");
                }
            };
            const send = (data) => {
                if (this.perMessageDeflate) {
                    const len = "string" === typeof data ? Buffer.byteLength(data) : data.length;
                    if (len < this.perMessageDeflate.threshold) {
                        opts.compress = false;
                    }
                }
                debug('writing "%s"', data);
                this.socket.send(data, opts, onSent);
            };
            if (packet.options && typeof packet.options.wsPreEncoded === "string") {
                send(packet.options.wsPreEncoded);
            }
            else if (this._canSendPreEncodedFrame(packet)) {
                // the WebSocket frame was computed with WebSocket.Sender.frame()
                // see https://github.com/websockets/ws/issues/617#issuecomment-283002469
                this.socket._sender.sendFrame(packet.options.wsPreEncodedFrame, onSent);
            }
            else {
                this.parser.encodePacket(packet, this.supportsBinary, send);
            }
        }
    }
    /**
     * Whether the encoding of the WebSocket frame can be skipped.
     * @param packet
     * @private
     */
    _canSendPreEncodedFrame(packet) {
        var _a, _b, _c;
        return (!this.perMessageDeflate &&
            typeof ((_b = (_a = this.socket) === null || _a === void 0 ? void 0 : _a._sender) === null || _b === void 0 ? void 0 : _b.sendFrame) === "function" &&
            ((_c = packet.options) === null || _c === void 0 ? void 0 : _c.wsPreEncodedFrame) !== undefined);
    }
    /**
     * Closes the transport.
     *
     * @api private
     */
    doClose(fn) {
        debug("closing");
        this.socket.close();
        fn && fn();
    }
}
exports.WebSocket = WebSocket;

}, function(modId) { var map = {"../transport":1689135067507}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1689135067512, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.WebTransport = void 0;
const transport_1 = require("../transport");
const debug_1 = require("debug");
const debug = (0, debug_1.default)("engine:webtransport");
const BINARY_HEADER = Buffer.of(54);
function shouldIncludeBinaryHeader(packet, encoded) {
    // 48 === "0".charCodeAt(0) (OPEN packet type)
    // 54 === "6".charCodeAt(0) (NOOP packet type)
    return (packet.type === "message" &&
        typeof packet.data !== "string" &&
        encoded[0] >= 48 &&
        encoded[0] <= 54);
}
/**
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API
 */
class WebTransport extends transport_1.Transport {
    constructor(session, stream, reader) {
        super({ _query: { EIO: "4" } });
        this.session = session;
        this.writer = stream.writable.getWriter();
        (async () => {
            let binaryFlag = false;
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    debug("session is closed");
                    break;
                }
                debug("received chunk: %o", value);
                if (!binaryFlag && value.byteLength === 1 && value[0] === 54) {
                    binaryFlag = true;
                    continue;
                }
                this.onPacket(this.parser.decodePacketFromBinary(value, binaryFlag, "nodebuffer"));
                binaryFlag = false;
            }
        })();
        session.closed.then(() => this.onClose());
        this.writable = true;
    }
    get name() {
        return "webtransport";
    }
    get supportsFraming() {
        return true;
    }
    send(packets) {
        this.writable = false;
        for (let i = 0; i < packets.length; i++) {
            const packet = packets[i];
            const isLast = i + 1 === packets.length;
            this.parser.encodePacketToBinary(packet, (data) => {
                if (shouldIncludeBinaryHeader(packet, data)) {
                    debug("writing binary header");
                    this.writer.write(BINARY_HEADER);
                }
                debug("writing chunk: %o", data);
                this.writer.write(data);
                if (isLast) {
                    this.writable = true;
                    this.emit("drain");
                }
            });
        }
    }
    doClose(fn) {
        debug("closing WebTransport session");
        this.session.close();
        fn && fn();
    }
}
exports.WebTransport = WebTransport;

}, function(modId) { var map = {"../transport":1689135067507}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1689135067513, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.Socket = void 0;
const events_1 = require("events");
const debug_1 = require("debug");
const timers_1 = require("timers");
const debug = (0, debug_1.default)("engine:socket");
class Socket extends events_1.EventEmitter {
    /**
     * Client class (abstract).
     *
     * @api private
     */
    constructor(id, server, transport, req, protocol) {
        super();
        this.id = id;
        this.server = server;
        this.upgrading = false;
        this.upgraded = false;
        this.readyState = "opening";
        this.writeBuffer = [];
        this.packetsFn = [];
        this.sentCallbackFn = [];
        this.cleanupFn = [];
        this.request = req;
        this.protocol = protocol;
        // Cache IP since it might not be in the req later
        if (req) {
            if (req.websocket && req.websocket._socket) {
                this.remoteAddress = req.websocket._socket.remoteAddress;
            }
            else {
                this.remoteAddress = req.connection.remoteAddress;
            }
        }
        else {
            // TODO there is currently no way to get the IP address of the client when it connects with WebTransport
            //  see https://github.com/fails-components/webtransport/issues/114
        }
        this.checkIntervalTimer = null;
        this.upgradeTimeoutTimer = null;
        this.pingTimeoutTimer = null;
        this.pingIntervalTimer = null;
        this.setTransport(transport);
        this.onOpen();
    }
    get readyState() {
        return this._readyState;
    }
    set readyState(state) {
        debug("readyState updated from %s to %s", this._readyState, state);
        this._readyState = state;
    }
    /**
     * Called upon transport considered open.
     *
     * @api private
     */
    onOpen() {
        this.readyState = "open";
        // sends an `open` packet
        this.transport.sid = this.id;
        this.sendPacket("open", JSON.stringify({
            sid: this.id,
            upgrades: this.getAvailableUpgrades(),
            pingInterval: this.server.opts.pingInterval,
            pingTimeout: this.server.opts.pingTimeout,
            maxPayload: this.server.opts.maxHttpBufferSize,
        }));
        if (this.server.opts.initialPacket) {
            this.sendPacket("message", this.server.opts.initialPacket);
        }
        this.emit("open");
        if (this.protocol === 3) {
            // in protocol v3, the client sends a ping, and the server answers with a pong
            this.resetPingTimeout(this.server.opts.pingInterval + this.server.opts.pingTimeout);
        }
        else {
            // in protocol v4, the server sends a ping, and the client answers with a pong
            this.schedulePing();
        }
    }
    /**
     * Called upon transport packet.
     *
     * @param {Object} packet
     * @api private
     */
    onPacket(packet) {
        if ("open" !== this.readyState) {
            return debug("packet received with closed socket");
        }
        // export packet event
        debug(`received packet ${packet.type}`);
        this.emit("packet", packet);
        // Reset ping timeout on any packet, incoming data is a good sign of
        // other side's liveness
        this.resetPingTimeout(this.server.opts.pingInterval + this.server.opts.pingTimeout);
        switch (packet.type) {
            case "ping":
                if (this.transport.protocol !== 3) {
                    this.onError("invalid heartbeat direction");
                    return;
                }
                debug("got ping");
                this.sendPacket("pong");
                this.emit("heartbeat");
                break;
            case "pong":
                if (this.transport.protocol === 3) {
                    this.onError("invalid heartbeat direction");
                    return;
                }
                debug("got pong");
                this.pingIntervalTimer.refresh();
                this.emit("heartbeat");
                break;
            case "error":
                this.onClose("parse error");
                break;
            case "message":
                this.emit("data", packet.data);
                this.emit("message", packet.data);
                break;
        }
    }
    /**
     * Called upon transport error.
     *
     * @param {Error} error object
     * @api private
     */
    onError(err) {
        debug("transport error");
        this.onClose("transport error", err);
    }
    /**
     * Pings client every `this.pingInterval` and expects response
     * within `this.pingTimeout` or closes connection.
     *
     * @api private
     */
    schedulePing() {
        this.pingIntervalTimer = (0, timers_1.setTimeout)(() => {
            debug("writing ping packet - expecting pong within %sms", this.server.opts.pingTimeout);
            this.sendPacket("ping");
            this.resetPingTimeout(this.server.opts.pingTimeout);
        }, this.server.opts.pingInterval);
    }
    /**
     * Resets ping timeout.
     *
     * @api private
     */
    resetPingTimeout(timeout) {
        (0, timers_1.clearTimeout)(this.pingTimeoutTimer);
        this.pingTimeoutTimer = (0, timers_1.setTimeout)(() => {
            if (this.readyState === "closed")
                return;
            this.onClose("ping timeout");
        }, timeout);
    }
    /**
     * Attaches handlers for the given transport.
     *
     * @param {Transport} transport
     * @api private
     */
    setTransport(transport) {
        const onError = this.onError.bind(this);
        const onPacket = this.onPacket.bind(this);
        const flush = this.flush.bind(this);
        const onClose = this.onClose.bind(this, "transport close");
        this.transport = transport;
        this.transport.once("error", onError);
        this.transport.on("packet", onPacket);
        this.transport.on("drain", flush);
        this.transport.once("close", onClose);
        // this function will manage packet events (also message callbacks)
        this.setupSendCallback();
        this.cleanupFn.push(function () {
            transport.removeListener("error", onError);
            transport.removeListener("packet", onPacket);
            transport.removeListener("drain", flush);
            transport.removeListener("close", onClose);
        });
    }
    /**
     * Upgrades socket to the given transport
     *
     * @param {Transport} transport
     * @api private
     */
    maybeUpgrade(transport) {
        debug('might upgrade socket transport from "%s" to "%s"', this.transport.name, transport.name);
        this.upgrading = true;
        // set transport upgrade timer
        this.upgradeTimeoutTimer = (0, timers_1.setTimeout)(() => {
            debug("client did not complete upgrade - closing transport");
            cleanup();
            if ("open" === transport.readyState) {
                transport.close();
            }
        }, this.server.opts.upgradeTimeout);
        const onPacket = (packet) => {
            if ("ping" === packet.type && "probe" === packet.data) {
                debug("got probe ping packet, sending pong");
                transport.send([{ type: "pong", data: "probe" }]);
                this.emit("upgrading", transport);
                clearInterval(this.checkIntervalTimer);
                this.checkIntervalTimer = setInterval(check, 100);
            }
            else if ("upgrade" === packet.type && this.readyState !== "closed") {
                debug("got upgrade packet - upgrading");
                cleanup();
                this.transport.discard();
                this.upgraded = true;
                this.clearTransport();
                this.setTransport(transport);
                this.emit("upgrade", transport);
                this.flush();
                if (this.readyState === "closing") {
                    transport.close(() => {
                        this.onClose("forced close");
                    });
                }
            }
            else {
                cleanup();
                transport.close();
            }
        };
        // we force a polling cycle to ensure a fast upgrade
        const check = () => {
            if ("polling" === this.transport.name && this.transport.writable) {
                debug("writing a noop packet to polling for fast upgrade");
                this.transport.send([{ type: "noop" }]);
            }
        };
        const cleanup = () => {
            this.upgrading = false;
            clearInterval(this.checkIntervalTimer);
            this.checkIntervalTimer = null;
            (0, timers_1.clearTimeout)(this.upgradeTimeoutTimer);
            this.upgradeTimeoutTimer = null;
            transport.removeListener("packet", onPacket);
            transport.removeListener("close", onTransportClose);
            transport.removeListener("error", onError);
            this.removeListener("close", onClose);
        };
        const onError = (err) => {
            debug("client did not complete upgrade - %s", err);
            cleanup();
            transport.close();
            transport = null;
        };
        const onTransportClose = () => {
            onError("transport closed");
        };
        const onClose = () => {
            onError("socket closed");
        };
        transport.on("packet", onPacket);
        transport.once("close", onTransportClose);
        transport.once("error", onError);
        this.once("close", onClose);
    }
    /**
     * Clears listeners and timers associated with current transport.
     *
     * @api private
     */
    clearTransport() {
        let cleanup;
        const toCleanUp = this.cleanupFn.length;
        for (let i = 0; i < toCleanUp; i++) {
            cleanup = this.cleanupFn.shift();
            cleanup();
        }
        // silence further transport errors and prevent uncaught exceptions
        this.transport.on("error", function () {
            debug("error triggered by discarded transport");
        });
        // ensure transport won't stay open
        this.transport.close();
        (0, timers_1.clearTimeout)(this.pingTimeoutTimer);
    }
    /**
     * Called upon transport considered closed.
     * Possible reasons: `ping timeout`, `client error`, `parse error`,
     * `transport error`, `server close`, `transport close`
     */
    onClose(reason, description) {
        if ("closed" !== this.readyState) {
            this.readyState = "closed";
            // clear timers
            (0, timers_1.clearTimeout)(this.pingIntervalTimer);
            (0, timers_1.clearTimeout)(this.pingTimeoutTimer);
            clearInterval(this.checkIntervalTimer);
            this.checkIntervalTimer = null;
            (0, timers_1.clearTimeout)(this.upgradeTimeoutTimer);
            // clean writeBuffer in next tick, so developers can still
            // grab the writeBuffer on 'close' event
            process.nextTick(() => {
                this.writeBuffer = [];
            });
            this.packetsFn = [];
            this.sentCallbackFn = [];
            this.clearTransport();
            this.emit("close", reason, description);
        }
    }
    /**
     * Setup and manage send callback
     *
     * @api private
     */
    setupSendCallback() {
        // the message was sent successfully, execute the callback
        const onDrain = () => {
            if (this.sentCallbackFn.length > 0) {
                const seqFn = this.sentCallbackFn.splice(0, 1)[0];
                if ("function" === typeof seqFn) {
                    debug("executing send callback");
                    seqFn(this.transport);
                }
                else if (Array.isArray(seqFn)) {
                    debug("executing batch send callback");
                    const l = seqFn.length;
                    let i = 0;
                    for (; i < l; i++) {
                        if ("function" === typeof seqFn[i]) {
                            seqFn[i](this.transport);
                        }
                    }
                }
            }
        };
        this.transport.on("drain", onDrain);
        this.cleanupFn.push(() => {
            this.transport.removeListener("drain", onDrain);
        });
    }
    /**
     * Sends a message packet.
     *
     * @param {Object} data
     * @param {Object} options
     * @param {Function} callback
     * @return {Socket} for chaining
     * @api public
     */
    send(data, options, callback) {
        this.sendPacket("message", data, options, callback);
        return this;
    }
    /**
     * Alias of {@link send}.
     *
     * @param data
     * @param options
     * @param callback
     */
    write(data, options, callback) {
        this.sendPacket("message", data, options, callback);
        return this;
    }
    /**
     * Sends a packet.
     *
     * @param {String} type - packet type
     * @param {String} data
     * @param {Object} options
     * @param {Function} callback
     *
     * @api private
     */
    sendPacket(type, data, options = {}, callback) {
        if ("function" === typeof options) {
            callback = options;
            options = {};
        }
        if ("closing" !== this.readyState && "closed" !== this.readyState) {
            debug('sending packet "%s" (%s)', type, data);
            // compression is enabled by default
            options.compress = options.compress !== false;
            const packet = {
                type,
                options: options,
            };
            if (data)
                packet.data = data;
            // exports packetCreate event
            this.emit("packetCreate", packet);
            this.writeBuffer.push(packet);
            // add send callback to object, if defined
            if (callback)
                this.packetsFn.push(callback);
            this.flush();
        }
    }
    /**
     * Attempts to flush the packets buffer.
     *
     * @api private
     */
    flush() {
        if ("closed" !== this.readyState &&
            this.transport.writable &&
            this.writeBuffer.length) {
            debug("flushing buffer to transport");
            this.emit("flush", this.writeBuffer);
            this.server.emit("flush", this, this.writeBuffer);
            const wbuf = this.writeBuffer;
            this.writeBuffer = [];
            if (!this.transport.supportsFraming) {
                this.sentCallbackFn.push(this.packetsFn);
            }
            else {
                this.sentCallbackFn.push.apply(this.sentCallbackFn, this.packetsFn);
            }
            this.packetsFn = [];
            this.transport.send(wbuf);
            this.emit("drain");
            this.server.emit("drain", this);
        }
    }
    /**
     * Get available upgrades for this socket.
     *
     * @api private
     */
    getAvailableUpgrades() {
        const availableUpgrades = [];
        const allUpgrades = this.server.upgrades(this.transport.name);
        let i = 0;
        const l = allUpgrades.length;
        for (; i < l; ++i) {
            const upg = allUpgrades[i];
            if (this.server.opts.transports.indexOf(upg) !== -1) {
                availableUpgrades.push(upg);
            }
        }
        return availableUpgrades;
    }
    /**
     * Closes the socket and underlying transport.
     *
     * @param {Boolean} discard - optional, discard the transport
     * @return {Socket} for chaining
     * @api public
     */
    close(discard) {
        if ("open" !== this.readyState)
            return;
        this.readyState = "closing";
        if (this.writeBuffer.length) {
            debug("there are %d remaining packets in the buffer, waiting for the 'drain' event", this.writeBuffer.length);
            this.once("drain", () => {
                debug("all packets have been sent, closing the transport");
                this.closeTransport(discard);
            });
            return;
        }
        debug("the buffer is empty, closing the transport right away", discard);
        this.closeTransport(discard);
    }
    /**
     * Closes the underlying transport.
     *
     * @param {Boolean} discard
     * @api private
     */
    closeTransport(discard) {
        debug("closing the transport (discard? %s)", discard);
        if (discard)
            this.transport.discard();
        this.transport.close(this.onClose.bind(this, "forced close"));
    }
}
exports.Socket = Socket;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1689135067514, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.uServer = void 0;
const debug_1 = require("debug");
const server_1 = require("./server");
const transports_uws_1 = require("./transports-uws");
const debug = (0, debug_1.default)("engine:uws");
class uServer extends server_1.BaseServer {
    init() { }
    cleanup() { }
    /**
     * Prepares a request by processing the query string.
     *
     * @api private
     */
    prepare(req, res) {
        req.method = req.getMethod().toUpperCase();
        req.url = req.getUrl();
        const params = new URLSearchParams(req.getQuery());
        req._query = Object.fromEntries(params.entries());
        req.headers = {};
        req.forEach((key, value) => {
            req.headers[key] = value;
        });
        req.connection = {
            remoteAddress: Buffer.from(res.getRemoteAddressAsText()).toString(),
        };
        res.onAborted(() => {
            debug("response has been aborted");
        });
    }
    createTransport(transportName, req) {
        return new transports_uws_1.default[transportName](req);
    }
    /**
     * Attach the engine to a µWebSockets.js server
     * @param app
     * @param options
     */
    attach(app /* : TemplatedApp */, options = {}) {
        const path = this._computePath(options);
        app
            .any(path, this.handleRequest.bind(this))
            //
            .ws(path, {
            compression: options.compression,
            idleTimeout: options.idleTimeout,
            maxBackpressure: options.maxBackpressure,
            maxPayloadLength: this.opts.maxHttpBufferSize,
            upgrade: this.handleUpgrade.bind(this),
            open: (ws) => {
                const transport = ws.getUserData().transport;
                transport.socket = ws;
                transport.writable = true;
                transport.emit("drain");
            },
            message: (ws, message, isBinary) => {
                ws.getUserData().transport.onData(isBinary ? message : Buffer.from(message).toString());
            },
            close: (ws, code, message) => {
                ws.getUserData().transport.onClose(code, message);
            },
        });
    }
    _applyMiddlewares(req, res, callback) {
        if (this.middlewares.length === 0) {
            return callback();
        }
        // needed to buffer headers until the status is computed
        req.res = new ResponseWrapper(res);
        super._applyMiddlewares(req, req.res, (err) => {
            // some middlewares (like express-session) wait for the writeHead() call to flush their headers
            // see https://github.com/expressjs/session/blob/1010fadc2f071ddf2add94235d72224cf65159c6/index.js#L220-L244
            req.res.writeHead();
            callback(err);
        });
    }
    handleRequest(res, req) {
        debug('handling "%s" http request "%s"', req.getMethod(), req.getUrl());
        this.prepare(req, res);
        req.res = res;
        const callback = (errorCode, errorContext) => {
            if (errorCode !== undefined) {
                this.emit("connection_error", {
                    req,
                    code: errorCode,
                    message: server_1.Server.errorMessages[errorCode],
                    context: errorContext,
                });
                this.abortRequest(req.res, errorCode, errorContext);
                return;
            }
            if (req._query.sid) {
                debug("setting new request for existing client");
                this.clients[req._query.sid].transport.onRequest(req);
            }
            else {
                const closeConnection = (errorCode, errorContext) => this.abortRequest(res, errorCode, errorContext);
                this.handshake(req._query.transport, req, closeConnection);
            }
        };
        this._applyMiddlewares(req, res, (err) => {
            if (err) {
                callback(server_1.Server.errors.BAD_REQUEST, { name: "MIDDLEWARE_FAILURE" });
            }
            else {
                this.verify(req, false, callback);
            }
        });
    }
    handleUpgrade(res, req, context) {
        debug("on upgrade");
        this.prepare(req, res);
        req.res = res;
        const callback = async (errorCode, errorContext) => {
            if (errorCode !== undefined) {
                this.emit("connection_error", {
                    req,
                    code: errorCode,
                    message: server_1.Server.errorMessages[errorCode],
                    context: errorContext,
                });
                this.abortRequest(res, errorCode, errorContext);
                return;
            }
            const id = req._query.sid;
            let transport;
            if (id) {
                const client = this.clients[id];
                if (!client) {
                    debug("upgrade attempt for closed client");
                    res.close();
                }
                else if (client.upgrading) {
                    debug("transport has already been trying to upgrade");
                    res.close();
                }
                else if (client.upgraded) {
                    debug("transport had already been upgraded");
                    res.close();
                }
                else {
                    debug("upgrading existing transport");
                    transport = this.createTransport(req._query.transport, req);
                    client.maybeUpgrade(transport);
                }
            }
            else {
                transport = await this.handshake(req._query.transport, req, (errorCode, errorContext) => this.abortRequest(res, errorCode, errorContext));
                if (!transport) {
                    return;
                }
            }
            // calling writeStatus() triggers the flushing of any header added in a middleware
            req.res.writeStatus("101 Switching Protocols");
            res.upgrade({
                transport,
            }, req.getHeader("sec-websocket-key"), req.getHeader("sec-websocket-protocol"), req.getHeader("sec-websocket-extensions"), context);
        };
        this._applyMiddlewares(req, res, (err) => {
            if (err) {
                callback(server_1.Server.errors.BAD_REQUEST, { name: "MIDDLEWARE_FAILURE" });
            }
            else {
                this.verify(req, true, callback);
            }
        });
    }
    abortRequest(res, errorCode, errorContext) {
        const statusCode = errorCode === server_1.Server.errors.FORBIDDEN
            ? "403 Forbidden"
            : "400 Bad Request";
        const message = errorContext && errorContext.message
            ? errorContext.message
            : server_1.Server.errorMessages[errorCode];
        res.writeStatus(statusCode);
        res.writeHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
            code: errorCode,
            message,
        }));
    }
}
exports.uServer = uServer;
class ResponseWrapper {
    constructor(res) {
        this.res = res;
        this.statusWritten = false;
        this.headers = [];
        this.isAborted = false;
    }
    set statusCode(status) {
        if (!status) {
            return;
        }
        // FIXME: handle all status codes?
        this.writeStatus(status === 200 ? "200 OK" : "204 No Content");
    }
    writeHead(status) {
        this.statusCode = status;
    }
    setHeader(key, value) {
        if (Array.isArray(value)) {
            value.forEach((val) => {
                this.writeHeader(key, val);
            });
        }
        else {
            this.writeHeader(key, value);
        }
    }
    removeHeader() {
        // FIXME: not implemented
    }
    // needed by vary: https://github.com/jshttp/vary/blob/5d725d059b3871025cf753e9dfa08924d0bcfa8f/index.js#L134
    getHeader() { }
    writeStatus(status) {
        if (this.isAborted)
            return;
        this.res.writeStatus(status);
        this.statusWritten = true;
        this.writeBufferedHeaders();
        return this;
    }
    writeHeader(key, value) {
        if (this.isAborted)
            return;
        if (key === "Content-Length") {
            // the content length is automatically added by uWebSockets.js
            return;
        }
        if (this.statusWritten) {
            this.res.writeHeader(key, value);
        }
        else {
            this.headers.push([key, value]);
        }
    }
    writeBufferedHeaders() {
        this.headers.forEach(([key, value]) => {
            this.res.writeHeader(key, value);
        });
    }
    end(data) {
        if (this.isAborted)
            return;
        this.res.cork(() => {
            if (!this.statusWritten) {
                // status will be inferred as "200 OK"
                this.writeBufferedHeaders();
            }
            this.res.end(data);
        });
    }
    onData(fn) {
        if (this.isAborted)
            return;
        this.res.onData(fn);
    }
    onAborted(fn) {
        if (this.isAborted)
            return;
        this.res.onAborted(() => {
            // Any attempt to use the UWS response object after abort will throw!
            this.isAborted = true;
            fn();
        });
    }
    cork(fn) {
        if (this.isAborted)
            return;
        this.res.cork(fn);
    }
}

}, function(modId) { var map = {"./server":1689135067504,"./transports-uws":1689135067515}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1689135067515, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
const polling_1 = require("./polling");
const websocket_1 = require("./websocket");
exports.default = {
    polling: polling_1.Polling,
    websocket: websocket_1.WebSocket,
};

}, function(modId) { var map = {"./polling":1689135067516,"./websocket":1689135067517}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1689135067516, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.Polling = void 0;
const transport_1 = require("../transport");
const zlib_1 = require("zlib");
const accepts = require("accepts");
const debug_1 = require("debug");
const debug = (0, debug_1.default)("engine:polling");
const compressionMethods = {
    gzip: zlib_1.createGzip,
    deflate: zlib_1.createDeflate,
};
class Polling extends transport_1.Transport {
    /**
     * HTTP polling constructor.
     *
     * @api public.
     */
    constructor(req) {
        super(req);
        this.closeTimeout = 30 * 1000;
    }
    /**
     * Transport name
     *
     * @api public
     */
    get name() {
        return "polling";
    }
    get supportsFraming() {
        return false;
    }
    /**
     * Overrides onRequest.
     *
     * @param req
     *
     * @api private
     */
    onRequest(req) {
        const res = req.res;
        if (req.getMethod() === "get") {
            this.onPollRequest(req, res);
        }
        else if (req.getMethod() === "post") {
            this.onDataRequest(req, res);
        }
        else {
            res.writeStatus("500 Internal Server Error");
            res.end();
        }
    }
    /**
     * The client sends a request awaiting for us to send data.
     *
     * @api private
     */
    onPollRequest(req, res) {
        if (this.req) {
            debug("request overlap");
            // assert: this.res, '.req and .res should be (un)set together'
            this.onError("overlap from client");
            res.writeStatus("500 Internal Server Error");
            res.end();
            return;
        }
        debug("setting request");
        this.req = req;
        this.res = res;
        const onClose = () => {
            this.writable = false;
            this.onError("poll connection closed prematurely");
        };
        const cleanup = () => {
            this.req = this.res = null;
        };
        req.cleanup = cleanup;
        res.onAborted(onClose);
        this.writable = true;
        this.emit("drain");
        // if we're still writable but had a pending close, trigger an empty send
        if (this.writable && this.shouldClose) {
            debug("triggering empty send to append close packet");
            this.send([{ type: "noop" }]);
        }
    }
    /**
     * The client sends a request with data.
     *
     * @api private
     */
    onDataRequest(req, res) {
        if (this.dataReq) {
            // assert: this.dataRes, '.dataReq and .dataRes should be (un)set together'
            this.onError("data request overlap from client");
            res.writeStatus("500 Internal Server Error");
            res.end();
            return;
        }
        const expectedContentLength = Number(req.headers["content-length"]);
        if (!expectedContentLength) {
            this.onError("content-length header required");
            res.writeStatus("411 Length Required").end();
            return;
        }
        if (expectedContentLength > this.maxHttpBufferSize) {
            this.onError("payload too large");
            res.writeStatus("413 Payload Too Large").end();
            return;
        }
        const isBinary = "application/octet-stream" === req.headers["content-type"];
        if (isBinary && this.protocol === 4) {
            return this.onError("invalid content");
        }
        this.dataReq = req;
        this.dataRes = res;
        let buffer;
        let offset = 0;
        const headers = {
            // text/html is required instead of text/plain to avoid an
            // unwanted download dialog on certain user-agents (GH-43)
            "Content-Type": "text/html",
        };
        this.headers(req, headers);
        for (let key in headers) {
            res.writeHeader(key, String(headers[key]));
        }
        const onEnd = (buffer) => {
            this.onData(buffer.toString());
            this.onDataRequestCleanup();
            res.cork(() => {
                res.end("ok");
            });
        };
        res.onAborted(() => {
            this.onDataRequestCleanup();
            this.onError("data request connection closed prematurely");
        });
        res.onData((arrayBuffer, isLast) => {
            const totalLength = offset + arrayBuffer.byteLength;
            if (totalLength > expectedContentLength) {
                this.onError("content-length mismatch");
                res.close(); // calls onAborted
                return;
            }
            if (!buffer) {
                if (isLast) {
                    onEnd(Buffer.from(arrayBuffer));
                    return;
                }
                buffer = Buffer.allocUnsafe(expectedContentLength);
            }
            Buffer.from(arrayBuffer).copy(buffer, offset);
            if (isLast) {
                if (totalLength != expectedContentLength) {
                    this.onError("content-length mismatch");
                    res.writeStatus("400 Content-Length Mismatch").end();
                    this.onDataRequestCleanup();
                    return;
                }
                onEnd(buffer);
                return;
            }
            offset = totalLength;
        });
    }
    /**
     * Cleanup request.
     *
     * @api private
     */
    onDataRequestCleanup() {
        this.dataReq = this.dataRes = null;
    }
    /**
     * Processes the incoming data payload.
     *
     * @param {String} encoded payload
     * @api private
     */
    onData(data) {
        debug('received "%s"', data);
        const callback = (packet) => {
            if ("close" === packet.type) {
                debug("got xhr close packet");
                this.onClose();
                return false;
            }
            this.onPacket(packet);
        };
        if (this.protocol === 3) {
            this.parser.decodePayload(data, callback);
        }
        else {
            this.parser.decodePayload(data).forEach(callback);
        }
    }
    /**
     * Overrides onClose.
     *
     * @api private
     */
    onClose() {
        if (this.writable) {
            // close pending poll request
            this.send([{ type: "noop" }]);
        }
        super.onClose();
    }
    /**
     * Writes a packet payload.
     *
     * @param {Object} packet
     * @api private
     */
    send(packets) {
        this.writable = false;
        if (this.shouldClose) {
            debug("appending close packet to payload");
            packets.push({ type: "close" });
            this.shouldClose();
            this.shouldClose = null;
        }
        const doWrite = (data) => {
            const compress = packets.some((packet) => {
                return packet.options && packet.options.compress;
            });
            this.write(data, { compress });
        };
        if (this.protocol === 3) {
            this.parser.encodePayload(packets, this.supportsBinary, doWrite);
        }
        else {
            this.parser.encodePayload(packets, doWrite);
        }
    }
    /**
     * Writes data as response to poll request.
     *
     * @param {String} data
     * @param {Object} options
     * @api private
     */
    write(data, options) {
        debug('writing "%s"', data);
        this.doWrite(data, options, () => {
            this.req.cleanup();
        });
    }
    /**
     * Performs the write.
     *
     * @api private
     */
    doWrite(data, options, callback) {
        // explicit UTF-8 is required for pages not served under utf
        const isString = typeof data === "string";
        const contentType = isString
            ? "text/plain; charset=UTF-8"
            : "application/octet-stream";
        const headers = {
            "Content-Type": contentType,
        };
        const respond = (data) => {
            this.headers(this.req, headers);
            this.res.cork(() => {
                Object.keys(headers).forEach((key) => {
                    this.res.writeHeader(key, String(headers[key]));
                });
                this.res.end(data);
            });
            callback();
        };
        if (!this.httpCompression || !options.compress) {
            respond(data);
            return;
        }
        const len = isString ? Buffer.byteLength(data) : data.length;
        if (len < this.httpCompression.threshold) {
            respond(data);
            return;
        }
        const encoding = accepts(this.req).encodings(["gzip", "deflate"]);
        if (!encoding) {
            respond(data);
            return;
        }
        this.compress(data, encoding, (err, data) => {
            if (err) {
                this.res.writeStatus("500 Internal Server Error");
                this.res.end();
                callback(err);
                return;
            }
            headers["Content-Encoding"] = encoding;
            respond(data);
        });
    }
    /**
     * Compresses data.
     *
     * @api private
     */
    compress(data, encoding, callback) {
        debug("compressing");
        const buffers = [];
        let nread = 0;
        compressionMethods[encoding](this.httpCompression)
            .on("error", callback)
            .on("data", function (chunk) {
            buffers.push(chunk);
            nread += chunk.length;
        })
            .on("end", function () {
            callback(null, Buffer.concat(buffers, nread));
        })
            .end(data);
    }
    /**
     * Closes the transport.
     *
     * @api private
     */
    doClose(fn) {
        debug("closing");
        let closeTimeoutTimer;
        const onClose = () => {
            clearTimeout(closeTimeoutTimer);
            fn();
            this.onClose();
        };
        if (this.writable) {
            debug("transport writable - closing right away");
            this.send([{ type: "close" }]);
            onClose();
        }
        else if (this.discarded) {
            debug("transport discarded - closing right away");
            onClose();
        }
        else {
            debug("transport not writable - buffering orderly close");
            this.shouldClose = onClose;
            closeTimeoutTimer = setTimeout(onClose, this.closeTimeout);
        }
    }
    /**
     * Returns headers for a response.
     *
     * @param req - request
     * @param {Object} extra headers
     * @api private
     */
    headers(req, headers) {
        headers = headers || {};
        // prevent XSS warnings on IE
        // https://github.com/LearnBoost/socket.io/pull/1333
        const ua = req.headers["user-agent"];
        if (ua && (~ua.indexOf(";MSIE") || ~ua.indexOf("Trident/"))) {
            headers["X-XSS-Protection"] = "0";
        }
        this.emit("headers", headers, req);
        return headers;
    }
}
exports.Polling = Polling;

}, function(modId) { var map = {"../transport":1689135067507}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1689135067517, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocket = void 0;
const transport_1 = require("../transport");
const debug_1 = require("debug");
const debug = (0, debug_1.default)("engine:ws");
class WebSocket extends transport_1.Transport {
    /**
     * WebSocket transport
     *
     * @param req
     * @api public
     */
    constructor(req) {
        super(req);
        this.writable = false;
        this.perMessageDeflate = null;
    }
    /**
     * Transport name
     *
     * @api public
     */
    get name() {
        return "websocket";
    }
    /**
     * Advertise upgrade support.
     *
     * @api public
     */
    get handlesUpgrades() {
        return true;
    }
    /**
     * Advertise framing support.
     *
     * @api public
     */
    get supportsFraming() {
        return true;
    }
    /**
     * Writes a packet payload.
     *
     * @param {Array} packets
     * @api private
     */
    send(packets) {
        this.writable = false;
        for (let i = 0; i < packets.length; i++) {
            const packet = packets[i];
            const isLast = i + 1 === packets.length;
            const send = (data) => {
                const isBinary = typeof data !== "string";
                const compress = this.perMessageDeflate &&
                    Buffer.byteLength(data) > this.perMessageDeflate.threshold;
                debug('writing "%s"', data);
                this.socket.send(data, isBinary, compress);
                if (isLast) {
                    this.writable = true;
                    this.emit("drain");
                }
            };
            if (packet.options && typeof packet.options.wsPreEncoded === "string") {
                send(packet.options.wsPreEncoded);
            }
            else {
                this.parser.encodePacket(packet, this.supportsBinary, send);
            }
        }
    }
    /**
     * Closes the transport.
     *
     * @api private
     */
    doClose(fn) {
        debug("closing");
        fn && fn();
        // call fn first since socket.end() immediately emits a "close" event
        this.socket.end();
    }
}
exports.WebSocket = WebSocket;

}, function(modId) { var map = {"../transport":1689135067507}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1689135067503);
})()
//miniprogram-npm-outsideDeps=["http","engine.io-parser","querystring","url","base64id","events","debug","cookie","ws","util","cors","zlib","accepts","timers"]
//# sourceMappingURL=index.js.map