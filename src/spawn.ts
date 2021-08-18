/* eslint-disable no-mixed-spaces-and-tabs */
/* eslint-disable no-useless-constructor */
import execa from 'execa';
import process from 'process';
import UserConfig from './config';
import BinPath from '@edge-less/bot-prebuilt';

export default class Spawn {
  public process = <execa.ExecaChildProcess[]>[];
  constructor(protected _config: UserConfig) {}
  all() {
  	this.process.push(
  		execa(
  			BinPath?.[process.platform]?.[process.arch].aria2 ?? 'aria2c',
  			this._config.resolved.aria2SpawnArgs,
  			{
  				cwd: process.cwd(),
  			},
  		),
  	);
  }

  promise() {
  	return Promise.all(this.process);
  }
}
