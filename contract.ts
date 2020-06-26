export declare type Currency = 'EUR' | 'GBP' | 'USD'
export declare type Direction = 'Long' | 'Short'

export interface AmountBrand {
    readonly Amount: unique symbol
}    
export type Amount = number & AmountBrand
const isAmount = (n: number): n is Amount => Number.isFinite(n)
export function makeAmount(n: number): Amount {
    if (isAmount(n)) {
        return n
    }    
    throw new Error (`Illegal amount: '${n}'`)
}    

export interface Payment {
    direction: Direction
    amount: Amount
    currency: Currency
}

// Contract Combinators
interface Zero {
    type: 'Zero'
}
interface One<Currency> {
    type: 'One'
    currency: Currency
}
interface Multiple<Amount, Contract> {
    type: 'Multiple'
    amount: Amount
    contract: Contract
}
interface Later<Date, Contract> {
    type: 'Later'
    date: Date
    contract: Contract
}
interface Give<Contract> {
    type: 'Give'
    contract: Contract
}
interface And<ContractA, ContractB> {
    type: 'And'
    contractA: ContractA
    contractB: ContractB
}

export declare type Contract =
    | Zero
    | One<Currency>
    | Multiple<Amount, Contract>
    | Later<Date, Contract>
    | Give<Contract>
    | And<Contract, Contract>


const isZero
: (c: Contract) => c is Zero
= (c): c is Zero => c.type === 'Zero'

// Smart Constructors

const zero
: () => Contract
= () => ({ type: 'Zero' })

const one
: (currency: Currency) => Contract
= (currency) => ({ type: 'One', currency })

const multiple
: (amount: Amount, contract: Contract) => Contract
= (amount, contract) => {
    switch (true) {
        case isZero(contract):
        case amount === 0:
        case amount === -0:
            return zero()
        case amount === 1:
            return contract
        default:
            return { type: 'Multiple', amount, contract }
    }

}

const later
: (date: Date, contract: Contract) => Contract
= (date, contract) => isZero(contract) ? zero() : ({ type: 'Later', date, contract })

const give
: (contract: Contract) => Contract
= (contract) => isZero(contract) ? zero() : ({ type: 'Give', contract })

export const and
: (contractA: Contract, contractB: Contract) => Contract
= (contractA, contractB) => {
    switch (true) {
        case isZero(contractA) && isZero(contractB):
            return zero()
        case isZero(contractA):
            return contractB
        case isZero(contractB):
            return contractA
        default:
            return { type: 'And', contractA, contractB }
    }
}

// Zero-Coupon Bond
export const zcb
: (date: Date, amount: Amount, currency: Currency) => Contract
= (date, amount, currency) => later(date, multiple(amount, one(currency)))


// 
const invertDirection
: (direction: Direction) => Direction 
= (direction) => direction === 'Short' ? 'Long' : 'Short'

const scalePayment
: (factor: Amount, payment: Payment) => Payment 
= (factor, { direction, amount, currency }) => ({ direction, amount: makeAmount(factor * amount), currency })

const invertPayment
: (payment: Payment) => Payment
= ({ direction, amount, currency }) => ({ direction: invertDirection(direction), amount, currency })

export const step
: (contract: Contract, date: Date) => [Array<Payment>, Contract]
= (contract, date) => {
    switch (contract.type) {
        case 'Zero':
            return [[], zero()]
        case 'One':
            return [[{ direction: 'Long', amount: makeAmount(1), currency: contract.currency }], zero()]
        case 'Multiple': {
            const [payments, residual] = step(contract.contract, date)
            return [payments.map(p => scalePayment(contract.amount, p)), multiple(contract.amount, residual)]
        }
        case 'Later':
            return date >= contract.date ? step(contract.contract, date) : [[], contract]
        case 'Give': {
            const [payments, residual] = step(contract.contract, date)
            return [payments.map(invertPayment), give(residual)]
        }
        case 'And': {
            const [paymentsA, residualA] = step(contract.contractA, date)
            const [paymentsB, residualB] = step(contract.contractB, date)
            return [paymentsA.concat(paymentsB), and(residualA, residualB)]
        }
        default:
            throw new Error(`Illegal Contract type`)
    }
}
