import axios, { AxiosRequestConfig } from 'axios'

import { ContextType } from './ContextType'
import { RequestOptions } from '../configuration/Config'

import RateManager from '../util/RateManager'

class RequestContext<T> {

    key: string
    context: ContextType
    options: RequestOptions

    constructor(context: ContextType, apiKey: string, requestOptions: RequestOptions) {
        this.context = context
        this.key = apiKey
        this.options = requestOptions
    }

    public dataRequest(): Promise<T> {
        const context = this.context
        const baseURL = `https://${context.regionType.host}`

        // Putting api key to params
        const params = context.params || {}
        params.api_key = this.key

        const axiosConfig: AxiosRequestConfig = {
            url: context.path,
            baseURL: baseURL,
            method: context.method,
            params: params,
            timeout: this.options.retryDelay
        }

        return this.onNext(axiosConfig)
    }

    private onNext(config: AxiosRequestConfig, retries?: number): Promise<T> {
        const guardRetries = retries || 0
        // Check recursion parameter
        const numberOfRetries = retries === undefined ?
            this.options.numberOfRetries : guardRetries

        return new Promise<T>((resolve, reject) => {
            axios(config).then((response) => {
                
                const rateManager = new RateManager(response.headers)

                console.log(rateManager.getUsage())

                // Binding to model
                const result: T = <T>response.data

                resolve(result)
            }).catch((error) => {
                // Retry counting
                const reducedRetries = numberOfRetries - 1
                const isRetry = numberOfRetries > 0 && this.options.shouldRetry

                isRetry ? this.onNext(config, reducedRetries) : reject(error)
            })
        })
    }
}

export default RequestContext