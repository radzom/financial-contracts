import { step, zcb, makeAmount, and } from './contract'
import * as assertionModule from 'assert'
const assert = assertionModule.strict;

const zcb1 = zcb(new Date(2020, 12, 24), makeAmount(100), 'EUR')
const zcb2 = zcb(new Date(2020, 12, 26), makeAmount(100), 'GBP')
const contract = and(zcb1, zcb2)

const [payments, residual] = step(contract, new Date(2020, 12, 24))

assert.deepEqual(payments, [{ direction: 'Long', amount: 100, currency: 'EUR' }])
assert.deepEqual(residual, zcb2)

console.log(JSON.stringify(payments, null, 2))
console.log(JSON.stringify(residual, null, 2))
