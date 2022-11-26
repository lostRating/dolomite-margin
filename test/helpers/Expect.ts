import BigNumber from 'bignumber.js';
import { address } from '../../src';

const REQUIRE_MSG = 'Returned error: VM Exception while processing transaction: revert';
const ASSERT_MSG = 'Returned error: VM Exception while processing transaction: invalid opcode';
const OOG_MSG = 'Returned error: VM Exception while processing transaction: out of gas';

// For solidity function calls that violate require()
export async function expectThrow(promise: Promise<any>, reason?: string) {
  try {
    await promise;
    throw new Error('Did not throw');
  } catch (e) {
    assertCertainError(e, REQUIRE_MSG);
    if (reason && process.env.COVERAGE !== 'true') {
      assertCertainError(e, `${REQUIRE_MSG} ${reason}`);
    }
  }
}

// For solidity function calls that violate verifyBalanceIsNonNegative()
export async function expectThrowInvalidBalance(
  promise: Promise<any>,
  account: address,
  accountIndex: BigNumber | string | number,
  marketId: BigNumber | string | number,
) {
  try {
    await promise;
    throw new Error('Did not throw');
  } catch (e) {
    assertCertainError(e, REQUIRE_MSG);
    const accountIndexString = accountIndex instanceof BigNumber ? accountIndex.toFixed() : accountIndex.toString;
    const marketIdString = marketId instanceof BigNumber ? marketId.toFixed() : marketId.toString;
    const reason = `AccountBalanceHelper: account cannot go negative <${account.toLowerCase()}, ${accountIndexString}, ${marketIdString}>`;
    if (process.env.COVERAGE !== 'true') {
      assertCertainError(e, `${REQUIRE_MSG} ${reason}`);
    }
  }
}

// For solidity function calls that violate assert()
export async function expectAssertFailure(promise: Promise<any>) {
  try {
    await promise;
    throw new Error('Did not throw');
  } catch (e) {
    assertCertainError(e, ASSERT_MSG);
  }
}

// For solidity function calls that runs out of gas()
export async function expectOutOfGasFailure(promise: Promise<any>) {
  try {
    await promise;
    throw new Error('Did not throw');
  } catch (e) {
    assertCertainError(e, OOG_MSG);
  }
}

// Helper function
function assertCertainError(error: Error, expected_error_msg?: string) {
  // This complication is so that the actual error will appear in truffle test output
  const message = error.message;
  const matchedIndex = message.search(expected_error_msg);
  let matchedString = message;
  if (matchedIndex === 0) {
    matchedString = message.substring(
      matchedIndex,
      matchedIndex + expected_error_msg.length,
    );
  }
  expect(matchedString).to.eql(expected_error_msg);
}
