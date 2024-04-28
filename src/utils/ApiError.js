class ApiErrro extends Error {
    constructor(
        statusCode,
        message= "Something went wrong",
        errors = [],
        stack = ''
    ){
        super(message)
        this.statusCode = statusCode,
        this.date = null
        this.message = message
        this.success = false;
        this.errros = errors

        if(stack) {
            this.stack = stack
        }else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export {ApiErrro}