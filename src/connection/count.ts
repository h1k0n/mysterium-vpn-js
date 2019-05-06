/*
 * Copyright (C) 2018 The "mysteriumnetwork/mysterium-vpn-js" Authors.
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

import { validateMultiple } from '../fmt/validation'

export interface ConnectionCount {
  success: number
  fail: number
  timeout: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseConnectionCount(data: any): ConnectionCount {
  validateMultiple('ConnectCount', data, [
    { name: 'success', type: 'number' },
    { name: 'fail', type: 'number' },
  ])
  return data
}