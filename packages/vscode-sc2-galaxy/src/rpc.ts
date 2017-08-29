import * as web from 'web-request';

const defaultConfig = {
    debug: false,
};

const defaultHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
};

export class JsonRpcClient {
    private lastId: number;
    private endpoint: string;
    private config: object;
    private headers: object;

    constructor({ endpoint = '/rpc', headers = {}}) {
        this.lastId = 0;
        this.endpoint = endpoint;
        // this.config = Object.assign({}, defaultConfig, config);
        this.headers = Object.assign({}, defaultHeaders, headers);
    }

    async request(method, params): Promise<any> {
        const id = this.lastId++;

        let req;
        try {
            req = await web.post(this.endpoint, {
                headers: this.headers,
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id,
                    method,
                    params: params,
                }),
            });
        }
        catch (err) {
            console.log(err);
        }

        // let res = new JsonRpcResult();

        // if (req.statusCode !== 200) {
        //     res.error = new JsonRpcError(req.statusMessage);
        // }

        let data = JSON.parse(req.content);

        if (data.error) {
            console.log(data.error);
        }
        else {
            // res.result = data.result;
        }

        return data.result;
    }
}

function parseJSON(response) {
    return response.json();
}

function checkError(data, req, debug = false) {
    if (data.error) {
        /* eslint-disable no-console */
        if (debug === true && console && console.error) {
            console.error(`Request ID ${data.id} failed: ${data.error}`);
        } else if (debug === true && console && console.log) {
            console.log(`Request ID ${data.id} failed: ${data.error}`);
        }
        /* eslint-enable no-console */

        const error = new RpcError(data.error, req, data);
        error.response = data;

        throw error;
    }

    return data;
}

function logResponse(response, debug = false) {
    if (debug === true) {
        /* eslint-disable no-console */
        console.log('Got response for id', response.id, 'with response', response.result);
        console.log('Response message for request', response.id, ':', response.result.message);
        /* eslint-enable no-console */
    }

    return response.result;
}

export class RpcError extends Error {
    // name: string;
    message: string;
    request: object;
    response: object;

    constructor(message, request, response) {
        super(message);

        this.name = 'RpcError';
        this.message = (message || '');
        this.request = request;
        this.response = response;
    }

    toString() {
        return this.message;
    }

    getRequest() {
        return this.request;
    }

    getResponse() {
        return this.response;
    }
}

export class JsonRpcError {
    code: number;
}

export class JsonRpcResult {
    error: JsonRpcError | null;
    result: object | null;
}