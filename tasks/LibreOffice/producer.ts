import {ProducerParameters, ProducerReturned} from '../../src/class';
import {Ok, Result} from 'ts-results';
import {log, writeGBK} from '../../src/utils';
import path from 'path';
import { release } from "../../src/p7zip";


const shell = require('shelljs');

export default async function (p: ProducerParameters): Promise<Result<ProducerReturned, string>> {
	const {taskName, downloadedFile, workshop} = p;

	const readyDir = path.join(workshop, '_ready', taskName);
	shell.mkdir("-p",path.join(workshop, '_ready'))
	log(`Info: ${downloadedFile}`)
	release(path.join(workshop, downloadedFile), readyDir)
	shell.mv(
		path.join(workshop, downloadedFile.split(".")[0]), 
		readyDir
		)
	shell.rm("-rf", path.join(readyDir, "$PLUGINSDIR"))
	shell.rm("-rf", path.join(readyDir, "Other"))
	writeGBK(
		path.join(workshop, "_ready", taskName + ".wcs"),
		"FILE X:\\Program Files\\Edgeless\\LibreOffice->X:\\Users\\PortableApps\\LibreOffice\n"+
		"LINK X:\\Users\\Default\\Desktop\\LibreOfficeBase,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficeBasePortable.exe\n"+
		"LINK X:\\Users\\Default\\Desktop\\LibreOfficeCalc,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficeCalcPortable.exe\n"+
		"LINK X:\\Users\\Default\\Desktop\\LibreOfficeDraw,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficeDrawPortable.exe"+
		"LINK X:\\Users\\Default\\Desktop\\LibreOfficeImpress,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficeImpressPortable.exe"+
		"LINK X:\\Users\\Default\\Desktop\\LibreOfficeMath,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficeMathPortable.exe"+
		"LINK X:\\Users\\Default\\Desktop\\LibreOffice,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficePortable.exe"+
		"LINK X:\\Users\\Default\\Desktop\\LibreOfficeWriter,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficeWriterPortable.exe"
		)
	//Return ready directory
	return new Ok({
		readyRelativePath: '_ready',
	});
}