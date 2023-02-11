import { debug, getInput, info, setFailed, setOutput, warning } from '@actions/core';
import { summary, SummaryTableRow } from '@actions/core/lib/summary';
import { context as githubContext } from '@actions/github';
import { readFile, unlink, writeFile } from 'fs/promises';
import Handlebars from 'handlebars';
import path from 'path';
import glob from 'glob';

import Utils from './lib/utils';

export default async function run() {
  try {
    let utils;
    const removeOtherSettingsFiles = Utils.isBooleanTrue(getInput('removeOtherSettingsFiles'));
    const rawSecrets = getInput('secrets');
    const rawVars = getInput('vars');
    const rawEnv = getInput('env');
    let fullReplacement;
    try {
      let secrets;
      let vars;
      let env;
      if (!Utils.isNullEmptyOrUndefined(rawSecrets)) {
        secrets = JSON.parse(rawSecrets);
      }
      if (!Utils.isNullEmptyOrUndefined(rawVars)) {
        vars = JSON.parse(rawVars);
      }
      if (!Utils.isNullEmptyOrUndefined(rawEnv)) {
        env = JSON.parse(rawEnv);
      }
      fullReplacement = { ...vars, ...env, ...secrets };
      if (Utils.isNullEmptyOrUndefined(fullReplacement)) {
        setFailed(
          'We had trouble getting your secrets, vars, and/or env. Please check that they are either valid json or you provided **at least** one of them'
        );
        return;
      }
      utils = new Utils(fullReplacement);
    } catch (e) {
      setFailed(`We had trouble parsing your secrets, vars, and env ${e}`);
      return;
    }
    let templatePath = getInput('pathToTemplate');
    let renameTo = getInput('renameTo');
    if (renameTo === '' || renameTo === undefined || renameTo === null) {
      renameTo = 'appsettings.json';
    }
    let repo;
    if (!templatePath) {
      repo = githubContext.repo.repo;
      info(`We need to create the template path based on the repo using ./${repo}/appsettings.tmpl.json as the template path`);
      templatePath = `./${repo}/appsettings.tmpl.json`;
    }

    debug('Read all the inputs');
    debug(`rename ${renameTo} org ${getInput('renameTo')}`);
    debug(`tmpl ${templatePath} org ${getInput('pathToTemplate')}`);
    debug(`repo ${repo} org ${githubContext.repo.repo}`);
    debug(`removeOtherSettingsFiles ${removeOtherSettingsFiles} org ${getInput('removeOtherSettingsFiles')}`);

    info('Delete old appsettings to overwrite');
    try {
      await unlink(`${path.parse(templatePath).dir}/appsettings.json`);
    } catch (e) {
      info('Delete failed, the file may have not been there to begin with. Ignoring');
    }

    let originalAppSettingsJson;
    if (removeOtherSettingsFiles) {
      const files = glob.sync('./**/appsettings.*.json');
      for (const file of files) {
        if (file.indexOf('appsettings.json') !== -1) {
          try {
            originalAppSettingsJson = JSON.parse(await readFile(file, 'utf8'));
            info(`We found the original appsettings.json (${file})`);
          } catch (e) {
            debug(`Couldn't find original AppSettings.json file. We'll skip the template vs original checks`);
          }
        }
        if (templatePath.indexOf(file) === -1) {
          info(`Deleting ${file}`);
          try {
            await unlink(file);
          } catch (e) {
            warning(`Error deleting ${file}`);
          }
        } else {
          debug(`Didn't deleting ${file} it matched our template file ${templatePath}`);
        }
      }
    }

    info(`Reading and modifying: ${templatePath}. We will rename to: ${renameTo}`);

    let templateAsString;
    let templateJson;
    try {
      const fileContents = await readFile(templatePath, 'utf8');
      templateJson = JSON.parse(fileContents);
      templateAsString = JSON.stringify(templateJson);
      info(`Yay, this file, ${templatePath} worked`);
    } catch (e) {
      setFailed(`error on ${templatePath}, ${e}`);
      return;
    }

    if (Utils.isNullEmptyOrUndefined(templateAsString)) {
      setFailed(`Could not retrieve and read ${templatePath}`);
      return;
    }

    if (originalAppSettingsJson) {
      if (Object.keys(originalAppSettingsJson) !== Object.keys(templateJson)) {
        setFailed(
          `Your appsettings.json key count (${Object.keys(originalAppSettingsJson).length}) doesn't equal your template (${Object.keys(templateJson).length})`
        );
        return;
      }
    }

    const outputTable: SummaryTableRow[] = [
      [
        {
          header: true,
          data: ':hammer_and_wrench: Config :wrench:'
        },
        {
          header: true,
          data: ':white_check_mark: Replaced :x:'
        },
        {
          header: true,
          data: 'Value'
        }
      ]
      /* [
        {
          header: true,
          data: ":---",
        },
        {
          header: true,
          data: ":---:", // this _should_ center
        },
        {
          header: true,
          data: ":---",
        },
      ], */
    ];

    const templateVariables = utils.getHandlebarsVariables(templateAsString);

    let failedVariableValueCheck = false;
    for (const vari of templateVariables) {
      const value = utils.getValueForTemplateVariable(vari);
      if (Utils.isNullEmptyOrUndefined(value)) {
        warning(`Your template expects ${vari} but we could not find that setting in your secrets, vars, or env.`);
        failedVariableValueCheck = true;
      } else {
        outputTable.push([
          { header: false, data: vari },
          { header: false, data: ':white_check_mark:' },
          {
            header: false,
            data: value || '***'
          }
        ]);
      }
    }
    if (failedVariableValueCheck) {
      setFailed(
        `You are missing variables in your secrets, variables, env. Please check ${templatePath} and the [secrets store](https://github.com/${githubContext.repo.owner}/${githubContext.repo.repo}/settings/secrets/actions) for the values.`
      );
      return;
    }

    const template = Handlebars.compile(templateAsString, {
      compat: true
    });

    const renderedTemplate = template(fullReplacement);
    const stringOfTender = JSON.stringify(JSON.parse(renderedTemplate));

    const filePath = `${path.parse(templatePath).dir}/${renameTo}`;
    try {
      await writeFile(filePath, stringOfTender);
    } catch (e) {
      setFailed('Writing the new settings failed, punt');
    }
    try {
      // clean up the tmpl
      await unlink(templatePath);
    } catch (e) {
      info(`Deleting the tmpl failed, that is fine it should match appsettings.json anyway`);
    }

    setOutput('settingsJsonString', JSON.parse(renderedTemplate));

    debug(`After all the settin'! There are ${templateVariables.length} keys in the settings file.`);

    summary.addHeading('Appsettings Configuration').addTable(outputTable).write();
  } catch (error: any) {
    setFailed(error.message);
  }
}
