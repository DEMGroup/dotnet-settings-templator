# Package and use

You should run `npm i` & `npm run all`. This will lint, pretty, test, and package. The output to dist is what is used in the action (action.yml).

## Use

Default location it will find the appsettings.tmpl.json is `{root}/${repo_name}/appsettings.tmpl.json`

You should pass in your secrets, vars, and env to the templator to compile with.

```yml
- uses: DEMGroup/dotnet-settings-templator@v1.0.3
  id: new-settings
  with:
    secrets: "${{ toJSON(secrets) }}"
    vars: "${{ toJSON(vars) }}"
    env: "${{ toJSON(env) }}"
```

This would be an example template file that could be in the dotnet project:
```javascript
{
  "Logging": {
    "LogLevel": {
      "Default": "{{ LOGGING_LEVEL }}",
      "Microsoft": "{{ LOGGING_LEVEL_MS }}",
      "Microsoft.Hosting.Lifetime": "{{ LOGGING_LEVEL_HOSTING }}"
    }
  },
  "ConnectionStrings": {
    "AesirPostgres": "{{ POSTGRES_CONNECTION_STRING }}",
    "AesirRedis": "{{ REDIS_CONNECTION_STRING }}"
  },
  "SEQ": {
    "EndpointUrl": "{{ SEQ_EP }}",
    "ApiKey": "{{ SEQ_KEY }}"
  }
}
```

You would put these variables in your project as such:
env:
  EndpointUrl: 'https://seq.example.com'

github.com/{org}/{repo}/settings/secrets/actions
  SEQ_KEY: 'secret_key_don_t_tell'


### Verbose

Verbose example

```yml
- uses: DEMGroup/dotnet-settings-templator@v1.0.3
  id: new-settings
  with:
    pathToTemplate: "./src/Aesir.Heimdall/appsettings.tmpl.json"
    renameTo: "appsettings.Production.json"
    removeOtherSettingsFiles: false
    secrets: "${{ toJSON(secrets) }}"
    vars: "${{ toJSON(vars) }}"
    env: "${{ toJSON(env) }}"
```
