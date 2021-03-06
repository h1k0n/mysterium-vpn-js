/*
 * Copyright (C) 2019 The "mysteriumnetwork/mysterium-vpn-js" Authors.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import lolex, { InstalledClock, NodeClock } from 'lolex'
import { nextTick } from '../test-utils/utils'
import { ThresholdExecutor } from './threshold-executor'

describe('ThresholdExecutor', () => {
  let funcDone: boolean
  let thresholdDone: boolean
  let clock: InstalledClock<NodeClock>

  beforeAll(() => {
    clock = lolex.install()
  })

  afterAll(() => {
    clock.uninstall()
  })

  async function tickWithDelay(duration: number): Promise<void> {
    clock.tick(duration)
    await nextTick()
  }

  const syncFunc = async () => {
    funcDone = true
  }

  const asyncFunc = (duration: number) => async () => {
    return new Promise(resolve => {
      setTimeout(() => {
        funcDone = true
        resolve()
      }, duration)
    })
  }

  beforeEach(() => {
    funcDone = false
    thresholdDone = false
  })

  function markThresholdDone() {
    thresholdDone = true
  }

  describe('with sync function', () => {
    it('executes function', async () => {
      const executor = new ThresholdExecutor(syncFunc, 10000)
      executor.execute().then(markThresholdDone)
      await nextTick()

      // not complete after 9s
      await tickWithDelay(9000)
      expect(funcDone).toEqual(true)
      expect(thresholdDone).toEqual(false)

      // complete after 10s
      await tickWithDelay(1000)
      expect(thresholdDone).toEqual(true)
    })
  })

  describe('with async function', () => {
    const fastAsyncFunc = asyncFunc(5000)

    it('executes function', async () => {
      const executor = new ThresholdExecutor(fastAsyncFunc, 10000)
      executor.execute().then(markThresholdDone)

      // not complete after 9s
      await tickWithDelay(9000)
      expect(funcDone).toEqual(true)
      expect(thresholdDone).toEqual(false)

      // complete after 10s
      await tickWithDelay(1000)
      expect(thresholdDone).toEqual(true)
    })

    it('allows canceling sleep', async () => {
      const executor = new ThresholdExecutor(fastAsyncFunc, 10000)
      executor.execute().then(markThresholdDone)

      executor.cancel()

      // complete after 5s
      await tickWithDelay(5000)
      expect(thresholdDone).toEqual(true)
    })

    // TODO: canceling in the middle of sleep?
  })

  describe('with slow async function', () => {
    const slowAsyncFunc = asyncFunc(50000)

    it('executes function', async () => {
      const executor = new ThresholdExecutor(slowAsyncFunc, 10000)
      executor.execute().then(markThresholdDone)

      // not complete after 40s
      await tickWithDelay(40000)
      expect(funcDone).toEqual(false)
      expect(thresholdDone).toEqual(false)

      // complete after 60s
      await tickWithDelay(60000)
      expect(funcDone).toEqual(true)
      expect(thresholdDone).toEqual(true)
    })
  })

  describe('with function throwing error', () => {
    let executor: ThresholdExecutor

    const mockError = new Error('Mock error')
    async function errorFunc() {
      throw mockError
    }

    let capturedError: Error | null = null

    const captureError = (err: Error) => {
      capturedError = err
    }

    beforeEach(() => {
      executor = new ThresholdExecutor(errorFunc, 1000, captureError)
      capturedError = null
    })

    it('invokes error callback at next tick', async () => {
      executor.execute().then(markThresholdDone)

      // no error initially
      expect(thresholdDone).toBe(false)
      expect(capturedError).toEqual(null)

      // error is returned at next tick
      await nextTick()
      expect(thresholdDone).toBe(false)
      expect(capturedError).toEqual(mockError)
    })

    it('sleeps and throws error', async () => {
      executor.execute().then(markThresholdDone)

      // no error initially
      expect(thresholdDone).toBe(false)
      expect(capturedError).toEqual(null)

      // promise is done after sleeping
      await tickWithDelay(1000)
      expect(thresholdDone).toBe(true)
      expect(capturedError).toEqual(mockError)
    })
  })
})
